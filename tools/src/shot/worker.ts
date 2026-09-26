import { parentPort, workerData } from 'node:worker_threads'
import * as THREE from 'three'
import { blocks } from '../../../lib/blocks/index'
import { mulberry32, type Lot } from '../../../lib/ctx'
import { AMBIANTS, deriveCameras, renderView, type TriSoup, type ViewName } from './render'
import { encodePng } from './png'

interface BlockEntry { name: string; moduleUrl: string; position: [number, number]; lot: Lot; seed: number }
interface BlockContext { lots: Array<[number, number]>; grid: { blocks: number; blockPitch: number; roadWidth: number } }

const msg = workerData as {
  moduleUrl?: string                                   // 单建筑模式
  lot?: Lot
  seed?: number
  entries?: BlockEntry[]                               // 街区模式：多建筑按宗地中心摆位
  context?: BlockContext | null                        // 街区底图：全城草皮瓦 + 道路
  views: ViewName[]
  ambs: Array<'day' | 'dusk' | 'night'>
  width: number
  custom?: { eye: [number, number, number]; target: [number, number, number]; fov?: number }
}

try {
  // ---- 建筑摆放：单建筑或街区多建筑统一挂到建筑根（相机推导只用建筑包围盒） ----
  const sceneRoot = new THREE.Group()
  const contextRoot = new THREE.Group()   // 街区底图独立成根：不参与包围盒/机位推导
  if (msg.entries) {
    for (const e of msg.entries) {
      const mod = await import(e.moduleUrl)
      const build = mod.default
      if (typeof build !== 'function') throw new Error(`${e.name}：默认导出必须是 build(ctx) 函数`)
      const root = build({ lot: e.lot, rng: mulberry32(e.seed), blocks })
      if (!(root instanceof THREE.Object3D)) throw new Error(`${e.name}：build() 必须返回 THREE.Object3D`)
      root.position.set(e.position[0], 0, e.position[1])   // 宗地中心摆位（与查看页 BuildingManager 同一约定）
      sceneRoot.add(root)
    }
  } else {
    const mod = await import(msg.moduleUrl!)
    const build = mod.default
    if (typeof build !== 'function') throw new Error('默认导出必须是 build(ctx) 函数')
    sceneRoot.add(build({ lot: msg.lot!, rng: mulberry32(msg.seed!), blocks }))
  }

  // ---- 街区底图：草皮瓦 + 道路网格（与查看页 scene.ts 同款配色/尺寸，给总图自评以邻域上下文） ----
  if (msg.context) {
    const { lots, grid } = msg.context
    const grass = new THREE.MeshStandardMaterial({ color: '#8AA662', roughness: 0.95 })
    for (const [x, z] of lots) {
      const tile = new THREE.Mesh(new THREE.BoxGeometry(19.6, 0.16, 19.6), grass)
      tile.position.set(x, 0.08, z)
      contextRoot.add(tile)
    }
    const roadMat = new THREE.MeshStandardMaterial({ color: '#6E7276', roughness: 0.9 })
    const { blocks: n, blockPitch, roadWidth } = grid
    const span = n * blockPitch
    const half = (n - 1) / 2
    for (let i = 0; i <= n; i++) {
      const c = (i - half) * blockPitch - blockPitch / 2
      const rx = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, span + roadWidth), roadMat)
      rx.rotation.x = -Math.PI / 2; rx.position.set(c, 0.05, 0)
      const rz = new THREE.Mesh(new THREE.PlaneGeometry(span + roadWidth, roadWidth), roadMat)
      rz.rotation.x = -Math.PI / 2; rz.position.set(0, 0.05, c)
      contextRoot.add(rx, rz)
    }
  }
  sceneRoot.updateMatrixWorld(true)
  contextRoot.updateMatrixWorld(true)

  // ---- 场景抽取：世界空间三角形汤（含每顶点反照率与自发光）；建筑与底图分开抽再拼接 ----
  const extract = (root: THREE.Object3D): { pos: number[]; alb: number[]; emi: number[] } => {
    const pos: number[] = [], alb: number[] = [], emi: number[] = []
    root.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!(mesh as THREE.Mesh).isMesh || !mesh.geometry || mesh.visible === false) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      const groups = Array.isArray(mesh.material) && mesh.geometry.groups.length
        ? mesh.geometry.groups
        : [{ start: 0, count: Infinity, materialIndex: 0 }]
      const m: THREE.Matrix4 = mesh.matrixWorld
      const e = m.elements

      for (const g of groups) {
        const mat = mats[g.materialIndex ?? 0] as THREE.Material | undefined
        if (!mat || mat.visible === false) return
        const std = mat as THREE.MeshStandardMaterial
        const basic = mat as THREE.MeshBasicMaterial
        const opacity = (std as THREE.Material).opacity ?? 1
        if (opacity < 0.15) return
        const mc = (std.color ?? basic.color) as THREE.Color | undefined
        const useVc = (std as THREE.MeshStandardMaterial).vertexColors === true && !!mesh.geometry.attributes.color
        const cAttr = mesh.geometry.attributes.color
        const base: [number, number, number] = mc ? [mc.r, mc.g, mc.b] : [0.75, 0.75, 0.75]
        const isBasic = (basic as unknown as { isMeshBasicMaterial?: boolean }).isMeshBasicMaterial === true
        const em = (std.emissive as THREE.Color | undefined)
        const emi0: [number, number, number] = em
          ? [em.r * (std.emissiveIntensity ?? 1), em.g * (std.emissiveIntensity ?? 1), em.b * (std.emissiveIntensity ?? 1)]
          : isBasic ? base : [0, 0, 0]
        const alb0: [number, number, number] = isBasic ? [0, 0, 0] : base

        const geo = mesh.geometry as THREE.BufferGeometry
        const pAttr = geo.attributes.position
        const idx = geo.index
        const lo = idx ? g.start : g.start / 3
        const hi = idx ? Math.min(g.start + g.count, idx.count) : Math.min((g.start + g.count) / 3, pAttr.count)
        const readV = (i: number, out: [number, number, number]) => {
          out[0] = pAttr.getX(i); out[1] = pAttr.getY(i); out[2] = pAttr.getZ(i)
        }
        const va: [number, number, number] = [0, 0, 0], vb: [number, number, number] = [0, 0, 0], vc: [number, number, number] = [0, 0, 0]
        const triCount = Math.floor((hi - lo) / 3)
        for (let t = 0; t < triCount; t++) {
          const i0 = idx ? idx.getX(lo + t * 3) : lo + t * 3
          const i1 = idx ? idx.getX(lo + t * 3 + 1) : lo + t * 3
          const i2 = idx ? idx.getX(lo + t * 3 + 2) : lo + t * 3
          readV(i0, va); readV(i1, vb); readV(i2, vc)
          // 顶点色：material.color × vertexColor（three 语义）；取三顶点各自值
          const colOf = (i: number): [number, number, number] =>
            useVc ? [base[0] * cAttr.getX(i), base[1] * cAttr.getY(i), base[2] * cAttr.getZ(i)] : alb0
          const ca = colOf(i0), cb = colOf(i1), cc = colOf(i2)
          // 手工矩阵变换（性能：避免每顶点 new Vector3）
          const tp = (v: [number, number, number]): [number, number, number] => [
            e[0] * v[0] + e[4] * v[1] + e[8] * v[2] + e[12],
            e[1] * v[0] + e[5] * v[1] + e[9] * v[2] + e[13],
            e[2] * v[0] + e[6] * v[1] + e[10] * v[2] + e[14],
          ]
          const wa = tp(va), wb = tp(vb), wc = tp(vc)
          pos.push(...wa, ...wb, ...wc)
          alb.push(...ca, ...cb, ...cc)
          emi.push(...emi0, ...emi0, ...emi0)
        }
      }
    })
    return { pos, alb, emi }
  }

  const buildArr = extract(sceneRoot)
  const ctxArr = msg.context ? extract(contextRoot) : null
  const concatF32 = (a: Float32Array, b: Float32Array | null): Float32Array => {
    if (!b) return a
    const out = new Float32Array(a.length + b.length)
    out.set(a); out.set(b, a.length)
    return out
  }
  const soup: TriSoup = {
    pos: concatF32(Float32Array.from(buildArr.pos), ctxArr && Float32Array.from(ctxArr.pos)),
    alb: concatF32(Float32Array.from(buildArr.alb), ctxArr && Float32Array.from(ctxArr.alb)),
    emi: concatF32(Float32Array.from(buildArr.emi), ctxArr && Float32Array.from(ctxArr.emi)),
    count: 0,
  }
  soup.count = soup.pos.length / 9
  if (!buildArr.pos.length) throw new Error('场景为空：无可渲染几何')

  // 包围盒只取建筑（底图是背景延伸，不参与机位推导——否则机位漂向全城中心）
  const bmin: [number, number, number] = [Infinity, Infinity, Infinity]
  const bmax: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < buildArr.pos.length; i += 3) {
    for (let a = 0; a < 3; a++) {
      const v = buildArr.pos[i + a]
      if (Number.isFinite(v)) {
        if (v < bmin[a]) bmin[a] = v
        if (v > bmax[a]) bmax[a] = v
      }
    }
  }

  // ---- 渲染各视角 × 各环境 ----
  const cams = deriveCameras({ min: bmin, max: bmax }, msg.views)
  // 自定义机位：调用方给的相机三件套直接生效（与 deriveCameras 同一渲染路径）；先剔除再追加防重复渲染
  const viewList: ViewName[] = [...msg.views]
  {
    const i = viewList.indexOf('custom')
    if (i >= 0) viewList.splice(i, 1)
  }
  if (msg.custom) {
    cams.custom = { eye: msg.custom.eye, target: msg.custom.target, up: [0, 1, 0], fovDeg: msg.custom.fov ?? 50, orthoH: 0 }
    viewList.push('custom')
  }
  const shots: Array<{ view: string; amb: string; png: Buffer }> = []
  for (const ambName of msg.ambs) {
    const amb = AMBIANTS[ambName]
    if (!amb) throw new Error(`未知环境：${ambName}（可选 day/dusk/night）`)
    for (const viewName of viewList) {
      const cam = cams[viewName]
      if (!cam) throw new Error(`未知视角：${viewName}（可选 street/corner/aerial/top/front/back/left/right）`)
      const rgb = renderView(soup, cam, amb, msg.width, Math.round(msg.width * 0.667))
      shots.push({ view: viewName, amb: ambName, png: encodePng(rgb, msg.width, Math.round(msg.width * 0.667)) })
    }
  }

  parentPort!.postMessage({
    ok: true,
    triangles: soup.count,
    bbox: { min: bmin, max: bmax },
    size: [(bmax[0] - bmin[0]).toFixed(1), (bmax[1] - bmin[1]).toFixed(1), (bmax[2] - bmin[2]).toFixed(1)],
    shots,
  })
} catch (e) {
  const err = e as Error
  parentPort!.postMessage({ ok: false, error: err.message ?? String(e), stack: err.stack })
}

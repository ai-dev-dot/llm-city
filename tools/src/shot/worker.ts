import { parentPort, workerData } from 'node:worker_threads'
import * as THREE from 'three'
import { blocks } from '../../../lib/blocks/index'
import { mulberry32, type Lot } from '../../../lib/ctx'
import { AMBIANTS, deriveCameras, renderView, type TriSoup, type ViewName } from './render'
import { encodePng } from './png'

const msg = workerData as {
  moduleUrl: string
  lot: Lot
  seed: number
  views: ViewName[]
  ambs: Array<'day' | 'dusk' | 'night'>
  width: number
}

try {
  const mod = await import(msg.moduleUrl)
  const build = mod.default
  if (typeof build !== 'function') throw new Error('默认导出必须是 build(ctx) 函数')
  const root = build({ lot: msg.lot, rng: mulberry32(msg.seed), blocks })
  if (!(root instanceof THREE.Object3D)) throw new Error('build() 必须返回 THREE.Object3D')
  root.updateMatrixWorld(true)

  // ---- 场景抽取：世界空间三角形汤（含每顶点反照率与自发光） ----
  const posArr: number[] = []
  const albArr: number[] = []
  const emiArr: number[] = []

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
        const i1 = idx ? idx.getX(lo + t * 3 + 1) : lo + t * 3 + 1
        const i2 = idx ? idx.getX(lo + t * 3 + 2) : lo + t * 3 + 2
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
        posArr.push(...wa, ...wb, ...wc)
        albArr.push(...ca, ...cb, ...cc)
        emiArr.push(...emi0, ...emi0, ...emi0)
      }
    }
  })

  const soup: TriSoup = {
    pos: Float32Array.from(posArr),
    alb: Float32Array.from(albArr),
    emi: Float32Array.from(emiArr),
    count: posArr.length / 9,
  }
  if (!soup.count) throw new Error('建筑为空：无可渲染几何')

  const bmin: [number, number, number] = [Infinity, Infinity, Infinity]
  const bmax: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < soup.count * 9; i += 3) {
    for (let a = 0; a < 3; a++) {
      const v = soup.pos[i + a]
      if (Number.isFinite(v)) {
        if (v < bmin[a]) bmin[a] = v
        if (v > bmax[a]) bmax[a] = v
      }
    }
  }

  // ---- 渲染各视角 × 各环境 ----
  const cams = deriveCameras({ min: bmin, max: bmax }, msg.views)
  const shots: Array<{ view: string; amb: string; png: Buffer }> = []
  for (const ambName of msg.ambs) {
    const amb = AMBIANTS[ambName]
    if (!amb) throw new Error(`未知环境：${ambName}（可选 day/dusk/night）`)
    for (const viewName of msg.views) {
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

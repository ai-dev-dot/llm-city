import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { healingTree } from '../../blocks/space-bunny/healing-tree'
import { greenWall } from '../../blocks/space-bunny/green-wall'
import { planter } from '../../blocks/space-bunny/planter'

/**
 * b-000029 静息塔 · D5 模都医枢 二期住院塔
 * 母题：愈 · 光 · 庭（承一期愈光楼）
 *
 * 立意《住进来的病人夜里怎么睡》。塔楼的命题不是更高，是让病房有朝向、有树、有天。
 * 20×40m 的板式塔身贴 D5 东缘而立——东立面一整排通长病房窗，隔 12m 城市道路正对 E5
 * 原点塔（~211m）；每四层退一道 6m 深的西向「呼吸廊」，病人推着轮椅出病房门就进到
 * 一条 6m 深、3.1m 净高、36m 长的空中庭园廊，头顶是楼板、脚下是 36m 外的愈光庭。
 * 四道廊分别在 16.8 / 31.2 / 45.6 / 60.0m，等距 14.4m，像四次深呼吸。
 *
 * 退台层（L5/L9/L13/L17）整体西退 6m，只剩 10m 进深的双走廊病房；退台层西面是落地玻璃，
 * 对着自己的空中庭园。塔基西立面（L2–L4）是 36m 长的实体绿墙——从一期愈光庭望过来，
 * 先是 31m 高的愈光楼玻璃照壁，再是这面绿墙，然后四道空中庭园一路上到 67m。
 */

/** 体量：宗地 20×40m，局部原点 = 宗地中心，x ∈ [-10,10] / z ∈ [-20,20]；本体退线内落于 x ±8 / z ±18。
 *  BX/BZ 是**玻璃面**的位置，出挑件（遮阳鳍 0.4 / 檐口线脚 0.48 / 深窗洞窗台 0.46）都从这条线往外长，
 *  最外恰好落在 ±8 / ±18 的退线内——立面出挑必须计入退线，这条最容易踩。 */
const BX = 7.5
const BZ = 17.5
const SET = 6 // 西向退台深度
const SW = BX - SET // 1.5 退台层的西界（退台层净宽 9m，双走廊病房）
const H1 = 6.0 // 门厅层高
const FH = 3.6 // 标准层高
const LV = 18 // L2–L18 共 17 个标准层
const EAVE = H1 + (LV - 1) * FH // 67.2 檐口
const CROWN = EAVE + 4.8 // 72.0 塔冠顶
/** 每四层退一道：L5 / L9 / L13 / L17 */
const SETBACK = new Set([5, 9, 13, 17])

const lb = (i: number): number => (i === 1 ? 0 : H1 + (i - 2) * FH)
const lt = (i: number): number => (i === 1 ? H1 : H1 + (i - 1) * FH)
const westOf = (i: number): number => (SETBACK.has(i) ? SW : -BX)

const C = {
  panel: '#F2F0EA', // 白预制板
  mint: '#BCD6C9', // 薄荷绿层间带（街区识别色）
  wood: '#B08A5A', // 木色暖檐
  woodLite: '#C6BFB2', // 浅暖灰遮阳鳍
  conc: '#C7C4BC', // 清水混凝土
  glass: '#9EC5DD', // 幕墙玻璃
  frame: '#93A0A6', // 金属框架
  steel: '#7C8A90', // 钢构
  green: '#7FA07A',
  green2: '#5E7F5C',
  green3: '#9BB58E',
  pave: '#D8D5CE',
  paveDark: '#B2AFA7',
  grass: '#8C9E8B',
  glow: '#FFF1CE',
  pad: '#E4E1D6',
}

// 材质在本栋内共享：AGENTS 规约要求材质只在单栋建筑内共享，滤镜按建筑整体换色
const matCache = new Map<string, THREE.MeshStandardMaterial>()
function M(color: string, o?: Parameters<typeof stdMaterial>[1]): THREE.MeshStandardMaterial {
  const k = `${color}|${JSON.stringify(o ?? {})}`
  let m = matCache.get(k)
  if (!m) {
    m = stdMaterial(color, o)
    matCache.set(k, m)
  }
  return m
}

function box(w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, rotY = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
  mesh.position.set(x, y, z)
  mesh.rotation.y = rotY
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

/** 由对角坐标生成定心盒 */
function slab(x0: number, x1: number, z0: number, z1: number, yTop: number, thick: number, m: THREE.Material): THREE.Mesh {
  return box(x1 - x0, thick, z1 - z0, m, (x0 + x1) / 2, yTop - thick / 2, (z0 + z1) / 2)
}

const siteTag = (o: THREE.Object3D): THREE.Object3D => {
  o.userData.site = true
  return o
}

/**
 * 幕墙：玻璃面 + 竖梃 + 深窗洞双层窗台 + 窗楣
 * 局部约定：+X 沿面展开，+Z 为外法向
 */
function curtain(o: { len: number; h: number; bays: number; color?: string }): THREE.Object3D {
  const grp = new THREE.Group()
  const h = o.h
  const glass = box(o.len, h, 0.12, M(o.color ?? C.glass, { metalness: 0.5, roughness: 0.18, emissive: '#E6E1CE', emissiveIntensity: 0.26 }), o.len / 2, h / 2, 0)
  glass.castShadow = false
  grp.add(glass)
  const fm = M(C.frame, { metalness: 0.55, roughness: 0.36 })
  const cm = M(C.conc, { roughness: 0.85 })
  for (let b = 0; b <= o.bays; b++) grp.add(box(0.14, h + 0.1, 0.3, fm, (o.len * b) / o.bays, h / 2, 0.07))
  const bw = o.len / o.bays
  for (let b = 0; b < o.bays; b++) {
    const x = bw * (b + 0.5)
    grp.add(box(bw - 0.36, 0.2, 0.46, cm, x, 0.1, 0.2))
    grp.add(box(bw - 0.36, 0.12, 0.9, M(C.panel, { roughness: 0.7 }), x, -0.14, -0.28))
  }
  grp.add(box(o.len, 0.3, 0.4, M(C.panel, { roughness: 0.7 }), o.len / 2, h + 0.15, 0.14))
  return grp
}

/** 檐口线脚：剖面朝 -x 生长、挤出 +z，转 90 度后沿局部 +X 展开、挑向局部 +Z */
function cornice(o: { len: number; x: number; y: number; z: number; rotY: number; color?: string }): THREE.Object3D {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.lineTo(-0.4, 0)
  s.lineTo(-0.48, 0.13)
  s.lineTo(-0.48, 0.26)
  s.lineTo(-0.28, 0.3)
  s.lineTo(-0.28, 0.46)
  s.lineTo(0, 0.46)
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, {
    depth: o.len, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.018, bevelSegments: 1, curveSegments: 3, steps: 1,
  })
  const m = new THREE.Mesh(g, M(o.color ?? C.panel, { roughness: 0.7 }))
  m.rotation.y = Math.PI / 2
  m.castShadow = true
  m.receiveShadow = true
  const grp = new THREE.Group()
  grp.add(m)
  grp.position.set(o.x, o.y, o.z)
  grp.rotation.y = o.rotY
  return grp
}

/** 竖向遮阳鳍阵列：一排立着的薄叶片，替病房挡住低角度日晒 */
function finWall(o: {
  len: number; h: number; count: number; x: number; y: number; z: number
  rotY: number; reach?: number; color?: string
}): THREE.Object3D {
  const reach = o.reach ?? 0.4
  const t = Math.min(0.11, reach * 0.3)
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.lineTo(-reach, 0)
  s.lineTo(-reach, o.h - t)
  s.lineTo(-reach + t, o.h)
  s.lineTo(0, o.h)
  s.closePath()
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.16, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.014, bevelSegments: 1, curveSegments: 4, steps: 1,
  })
  const g = new THREE.Group()
  g.position.set(o.x, o.y, o.z)
  g.rotation.y = o.rotY
  const mat = M(o.color ?? C.woodLite, { roughness: 0.7 })
  for (let k = 0; k < o.count; k++) {
    const m = new THREE.Mesh(geo, mat)
    m.castShadow = true
    m.receiveShadow = true
    m.rotation.y = Math.PI / 2
    m.position.set((o.len * (k + 0.5)) / o.count, 0, 0)
    g.add(m)
  }
  return g
}

export default function build(ctx: BuildCtx): THREE.Object3D {
  const rng = ctx.rng
  const root = new THREE.Group()

  const panelM = M(C.panel, { roughness: 0.68 })
  const woodM = M(C.wood, { roughness: 0.74 })
  const concM = M(C.conc, { roughness: 0.88 })
  const frameM = M(C.frame, { metalness: 0.55, roughness: 0.36 })
  const steelM = M(C.steel, { metalness: 0.6, roughness: 0.34 })
  const paveM = M(C.pave, { roughness: 0.92 })

  // ═══════════ 0 · 宗地地面：草皮满铺至宗地边缘，四面退线环带做场地 ═══════════
  root.add(siteTag(box(20, 0.3, 40, M(C.grass, { roughness: 1 }), 0, -0.15, 0)))
  const pave = (x0: number, x1: number, z0: number, z1: number, step = 1.3, y = 0.02): void => {
    const nx = Math.max(1, Math.round((x1 - x0) / step))
    const nz = Math.max(1, Math.round((z1 - z0) / step))
    const tw = (x1 - x0) / nx
    const td = (z1 - z0) / nz
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        const t = siteTag(box(tw - 0.07, 0.12, td - 0.07, (i + j) % 3 === 0 ? M(C.paveDark, { roughness: 0.94 }) : paveM,
          x0 + tw * (i + 0.5), y, z0 + td * (j + 0.5)))
        t.castShadow = false
      }
    }
  }
  pave(-10, 10, -20, -18) // 南：接三期愈光庭的步行带
  pave(-10, 10, 18, 20) // 北：接 D4 烟火街的人行道
  pave(-10, -8, -18, 18) // 西：静息塔与一期愈光楼之间的 5m 缝，做林带
  pave(8, 10, -18, 18) // 东：落客带，正对 E5 原点塔
  // 退线环带的树池与绿篱
  for (const z of [-16, -8, 0, 8, 16]) {
    root.add(siteTag(planter({ w: 1.8, d: 1.8, h: 0.5, x: -8.8, y: 0, z, site: true, soil: true })))
    root.add(siteTag(healingTree({ rand: rng, h: 5.6, crown: 1.05, blobs: 5, x: -8.8, y: 0.5, z, site: true, leafColor: C.green3 })))
  }
  for (const z of [-16.5, -11, -5.5, 0, 5.5, 11, 16.5]) {
    root.add(siteTag(healingTree({ rand: rng, h: 5.2, crown: 1.05, blobs: 5, x: 8.8, y: 0, z, site: true, leafColor: C.green3 })))
  }
  for (let k = 0; k < 26; k++) {
    const x = -9.4 + rng() * 1.6
    const z = -18 + rng() * 36
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 + rng() * 0.26, 1), M(rng() > 0.5 ? C.green : C.green3, { roughness: 0.95 }))
    s.position.set(x, 0.36, z)
    s.castShadow = true
    root.add(siteTag(s))
  }
  for (const z of [-14, -4, 6, 15]) root.add(siteTag(ctx.blocks.streetLamp({ x: 9.4, z, h: 5 })))
  for (const z of [-12, -2, 8]) root.add(siteTag(ctx.blocks.bench({ x: 9.1, z, rotY: -Math.PI / 2 })))
  for (const z of [-10, 0, 10]) root.add(siteTag(ctx.blocks.bench({ x: -9.1, z, rotY: Math.PI / 2 })))

  // ═══════════ 1 · L1 门厅（6m）：内缩 1.5m 的架空柱廊 + 发光圆环吊顶 ═══════════
  const colM = M(C.conc, { roughness: 0.8 })
  for (const [x, z] of [
    [-6.5, -16.5], [-6.5, -11], [-6.5, -5.5], [-6.5, 0], [-6.5, 5.5], [-6.5, 11], [-6.5, 16.5],
    [6.5, -16.5], [6.5, -11], [6.5, -5.5], [6.5, 0], [6.5, 5.5], [6.5, 11], [6.5, 16.5],
    [-6.5, -16.5], [6.5, -16.5], [-6.5, 16.5], [6.5, 16.5],
  ] as Array<[number, number]>) {
    if (Math.abs(x) === 6.5 && Math.abs(z) !== 16.5 && (x === -6.5 || z === 0)) continue
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.46, H1, 20), colM)
    c.position.set(x, H1 / 2, z)
    c.castShadow = true
    c.receiveShadow = true
    root.add(c)
  }
  // L1 楼板（外挑到全宽，形成 1.5m 深柱廊）
  root.add(slab(-BX, BX, -BZ, BZ, H1, 0.6, concM))
  root.add(slab(-BX, BX, -BZ, -16.5, 0.15, 0.3, paveM))
  root.add(slab(-BX, BX, 16.5, BZ, 0.15, 0.3, paveM))
  // 木色暖檐：门厅外缘一圈
  root.add(box(2 * BX + 0.5, 0.9, 0.45, woodM, 0, H1 - 0.5, BZ + 0.2))
  root.add(box(2 * BX + 0.5, 0.9, 0.45, woodM, 0, H1 - 0.5, -BZ - 0.2))
  root.add(box(0.45, 0.9, 2 * BZ + 0.5, woodM, BX + 0.2, H1 - 0.5, 0))
  root.add(box(0.45, 0.9, 2 * BZ + 0.5, woodM, -BX - 0.2, H1 - 0.5, 0))
  // 门厅玻璃（四面通高）
  for (const [len, px, pz, rot] of [
    [2 * BX, -BX, BZ, 0], [2 * BX, BX, -BZ, Math.PI],
    [2 * BZ, BX, BZ, Math.PI / 2], [2 * BZ, -BX, -BZ, -Math.PI / 2],
  ] as Array<[number, number, number, number]>) {
    const cg = curtain({ len, h: 4.6, bays: Math.max(6, Math.round(len / 2.2)) })
    cg.position.set(px, 0.6, pz)
    cg.rotation.y = rot
    root.add(cg)
  }
  // 门厅内景：发光圆环吊顶 + 接待台 + 挂号架
  const halo = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.22, 8, 44), M(C.glow, { emissive: C.glow, emissiveIntensity: 1.5, roughness: 0.4 }))
  halo.position.set(0, 5.2, 0)
  halo.rotation.x = Math.PI / 2
  root.add(halo)
  const halo2 = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.16, 8, 36), M(C.glow, { emissive: C.glow, emissiveIntensity: 1.2, roughness: 0.4 }))
  halo2.position.set(0, 4.6, 0)
  halo2.rotation.x = Math.PI / 2
  root.add(halo2)
  root.add(box(9, 1.15, 1.5, M(C.wood, { roughness: 0.72 }), 0, 0.58, -4.5))
  root.add(box(9.4, 0.16, 1.8, M(C.panel, { roughness: 0.7 }), 0, 1.22, -4.5))
  for (let k = 0; k < 5; k++) {
    root.add(box(0.6, 2.6, 0.5, M(C.frame, { metalness: 0.5, roughness: 0.4 }), -6.2 + k * 3.1, 1.3, 6))
    root.add(box(0.5, 1.1, 0.14, M(C.glow, { emissive: C.glow, emissiveIntensity: 1.3, roughness: 0.5 }), -6.2 + k * 3.1, 1.9, 6.28))
  }
  // 门斗 + 旋转门（东面落客）
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.9, 20, 1, true),
    M(C.glass, { metalness: 0.5, roughness: 0.14, emissive: '#C4DFF0', emissiveIntensity: 0.35, side: THREE.DoubleSide }))
  drum.position.set(0, 1.45, 6.5)
  root.add(drum)
  for (let k = 0; k < 3; k++) {
    const piv = new THREE.Group()
    piv.position.set(0, 0, 6.5)
    piv.rotation.y = (k / 3) * Math.PI * 2
    piv.add(box(1.5, 2.8, 0.1, M(C.glass, { metalness: 0.45, roughness: 0.15, emissive: '#C4DFF0', emissiveIntensity: 0.3, side: THREE.DoubleSide }), 0, 1.4, 1.55))
    root.add(piv)
  }
  // 无障碍坡道（自东落客带升向门厅地坪）
  const ramp = new THREE.Shape()
  ramp.moveTo(0, 0)
  ramp.lineTo(2.1, 0)
  ramp.lineTo(2.1, 0.42)
  ramp.lineTo(0, 0)
  const rampMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(ramp, { depth: 2.2, bevelEnabled: false }), M(C.paveDark, { roughness: 0.92 }))
  rampMesh.rotation.y = Math.PI / 2
  rampMesh.position.set(7.8, 0.06, 9)
  rampMesh.receiveShadow = true
  root.add(siteTag(rampMesh))

  // ═══════════ 2 · L2–L18：楼板 + 三面幕墙 + 西面绿墙/玻璃 + 四道呼吸退台 ═══════════
  for (let i = 2; i <= LV; i++) {
    const y0 = lb(i)
    const y1 = lt(i)
    const wx = westOf(i)
    root.add(slab(wx, BX, -BZ, BZ, y1, 0.5, concM))

    // 结构柱：四角外露
    for (const x of [wx + 1.2, BX - 1.2]) {
      for (const z of [-BZ + 1.2, 0, BZ - 1.2]) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, FH, 24), colM)
        c.position.set(x, y0 + FH / 2, z)
        c.castShadow = true
        c.receiveShadow = true
        root.add(c)
      }
    }

    const bandH = 0.7
    const gy = y0 + bandH
    const gh = FH - bandH - 0.34

    // 东立面：通长病房窗，隔路正对 E5 原点塔——全塔最贵的一排窗
    const east = curtain({ len: 2 * BZ, h: gh, bays: 22 })
    east.position.set(BX, gy, BZ)
    east.rotation.y = Math.PI / 2
    root.add(east)
    root.add(finWall({ len: 2 * BZ, h: gh + bandH - 0.24, count: 16, x: BX, y: y0 + 0.14, z: BZ, rotY: Math.PI / 2 }))
    root.add(cornice({ len: 2 * BZ, x: BX, y: y1 - 0.36, z: BZ, rotY: Math.PI / 2 }))
    // 南北立面
    const wlen = BX - wx
    for (const [pz, rot] of [[BZ, 0], [-BZ, Math.PI]] as Array<[number, number]>) {
      const cgx = rot === 0 ? wx : BX
      const cg = curtain({ len: wlen, h: gh, bays: Math.max(5, Math.round(wlen / 1.6)) })
      cg.position.set(cgx, gy, pz)
      cg.rotation.y = rot
      root.add(cg)
      root.add(finWall({ len: wlen, h: gh + bandH - 0.24, count: Math.max(4, Math.round(wlen / 2.6)), x: cgx, y: y0 + 0.14, z: pz, rotY: rot }))
      root.add(cornice({ len: wlen, x: cgx, y: y1 - 0.36, z: pz, rotY: rot }))
    }
    // 薄荷绿层间带（东西面）
    for (const [px, len, rot] of [[BX, 2 * BZ, Math.PI / 2], [wx, 2 * BZ, -Math.PI / 2]] as Array<[number, number, number]>) {
      const bg = new THREE.Group()
      bg.position.set(px, 0, rot === Math.PI / 2 ? BZ : -BZ)
      bg.rotation.y = rot
      bg.add(box(len, bandH, 0.34, M(C.mint, { roughness: 0.66 }), len / 2, y0 + bandH / 2, 0.04))
      root.add(bg)
    }
    // 西立面：L2–L4 是实体绿墙（面向一期愈光庭）；其余为玻璃病房
    if (!SETBACK.has(i)) {
      if (i >= 2 && i <= 4) {
        // 塔基绿墙：不用玻璃，用一整面实体绿——从愈光庭望过来，静息塔先是一面绿
        root.add(box(0.3, FH - 0.2, 2 * BZ, M(C.green2, { roughness: 0.95 }), wx + 0.15, y0 + FH / 2, 0))
        root.add(greenWall({
          w: 2 * BZ - 1.2, h: FH - 0.6, rand: rng, cols: 30, rows: 9, leaf: 0.26, detail: 0,
          x: wx + 0.1, y: y0 + 0.3, z: 0, rotY: -Math.PI / 2,
          panelColor: C.green2, leafColor: C.green, leafColor2: C.green3,
        }))
        root.add(finWall({ len: 2 * BZ, h: FH - 0.6, count: 13, x: wx, y: y0 + 0.2, z: -BZ, rotY: -Math.PI / 2, reach: 0.46, color: C.wood }))
      } else {
        const west = curtain({ len: 2 * BZ, h: gh, bays: 18 })
        west.position.set(wx, gy, -BZ)
        west.rotation.y = -Math.PI / 2
        root.add(west)
        root.add(finWall({ len: 2 * BZ, h: gh + bandH - 0.24, count: 14, x: wx, y: y0 + 0.14, z: -BZ, rotY: -Math.PI / 2 }))
      }
      root.add(cornice({ len: 2 * BZ, x: wx, y: y1 - 0.36, z: -BZ, rotY: -Math.PI / 2 }))
    }

    // 退台层：退台层的西面是落地玻璃（对着自己的空中庭园）+ 门前小挑檐
    if (SETBACK.has(i)) {
      const gw = box(2 * BZ, FH - 0.6, 0.14, M(C.glass, { metalness: 0.5, roughness: 0.16, emissive: '#E6E1CE', emissiveIntensity: 0.3 }), SW, y0 + FH / 2, 0)
      gw.rotation.y = Math.PI / 2
      gw.castShadow = false
      root.add(gw)
      for (let k = 0; k <= 12; k++) root.add(box(0.14, FH - 0.5, 0.34, frameM, SW - 0.05, y0 + FH / 2, -BZ + (k / 12) * 2 * BZ))
      for (let k = 0; k < 4; k++) root.add(box(0.5, 0.22, 2.2, M(C.wood, { roughness: 0.72 }), SW - 0.3, y1 - 0.3, -12 + k * 8))
    }

    // 呼吸退台：本层之上一层为退台层时，本层西侧屋顶成 6m 深空中庭园廊
    if (SETBACK.has(i + 1)) {
      const fy = y1
      const ceil = lb(i + 2) - 0.5
      // 廊柱（承托上层外挑楼板）
      for (const z of [-15, -9, -3, 3, 9, 15]) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, ceil - fy, 20), colM)
        c.position.set(-BX + 0.9, fy + (ceil - fy) / 2, z)
        c.castShadow = true
        root.add(c)
      }
      // 栏板：西边 36m + 南北两端 6m（端头沿 x 展开，故不转轴）
      const rw = ctx.blocks.railing({ w: 2 * BZ, h: 1.1, color: C.frame, x: -BX + 0.15, y: fy, z: 0 })
      rw.rotation.y = Math.PI / 2
      root.add(rw)
      for (const z of [-BZ + 0.15, BZ - 0.15]) {
        root.add(ctx.blocks.railing({ w: SET, h: 1.1, color: C.frame, x: -BX + SET / 2, y: fy, z }))
      }
      // 庭园：六道种植池 + 灌木 + 小树 + 座椅 + 顶部木梁架
      for (let k = 0; k < 6; k++) {
        const pz = -15 + k * 6
        root.add(planter({ w: SET - 0.8, d: 4.2, h: 0.55, x: -BX + SET / 2, y: fy, z: pz, soil: true }))
        for (let j = 0; j < 7; j++) {
          const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 + rng() * 0.28, 1), M(rng() > 0.5 ? C.green : C.green3, { roughness: 0.95 }))
          s.position.set(-BX + SET / 2 + (rng() - 0.5) * (SET - 1.6), fy + 0.82 + rng() * 0.34, pz - 1.6 + rng() * 3.2)
          s.castShadow = true
          root.add(s)
        }
      }
      for (const z of [-12, 0, 12]) {
        root.add(healingTree({ rand: rng, h: 2.5, crown: 0.78, blobs: 5, x: -BX + SET / 2, y: fy + 0.55, z, leafColor: C.green3 }))
        root.add(ctx.blocks.bench({ x: -BX + 0.7, z: z + 2.6, rotY: Math.PI / 2 }))
      }
      for (let k = 0; k < 12; k++) root.add(box(0.26, 0.3, 2 * BZ - 0.6, woodM, -BX + SET - 0.4, ceil - 0.28, 0))
      root.add(box(SET - 0.6, 0.12, 2 * BZ - 0.4, M(C.glow, { emissive: C.glow, emissiveIntensity: 0.9, roughness: 0.5 }), -BX + SET / 2, ceil - 0.12, 0))
    }
  }

  // ═══════════ 3 · 塔冠（67.2–72.0m）：停机坪 + 设备层 + 桅杆 + 观景栏台 ═══════════
  const crown = new THREE.Group()
  crown.position.y = EAVE
  // 女儿墙
  const rcx = 0
  const rcz = 0
  for (const [len, px, pz, rot] of [
    [2 * BX, rcx, BZ, 0], [2 * BX, rcx, -BZ, 0], [2 * BZ, BX, rcz, Math.PI / 2], [2 * BZ, -BX, rcz, Math.PI / 2],
  ] as Array<[number, number, number, number]>) {
    const r = ctx.blocks.railing({ w: len, h: 1.15, color: C.frame, x: px, y: 0, z: pz })
    r.rotation.y = rot
    crown.add(r)
  }
  // 停机坪：9m 圆盘 + H 标 + 发光环 + 安全网
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.28, 40), M(C.pad, { roughness: 0.9 }))
  pad.position.set(2, 0.14, -4)
  pad.receiveShadow = true
  crown.add(pad)
  const padRing = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.14, 8, 44), M(C.glow, { emissive: C.glow, emissiveIntensity: 1.3, roughness: 0.5 }))
  padRing.position.set(2, 0.3, -4)
  padRing.rotation.x = Math.PI / 2
  crown.add(padRing)
  crown.add(box(0.42, 0.1, 4.4, M(C.frame, { metalness: 0.3, roughness: 0.6 }), 2, 0.33, -4))
  crown.add(box(2.6, 0.1, 0.42, M(C.frame, { metalness: 0.3, roughness: 0.6 }), 2, 0.33, -4))
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2
    const n = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.12), steelM)
    n.position.set(2 + Math.cos(a) * 4.7, 0.2, -4 + Math.sin(a) * 4.7)
    n.rotation.y = -a
    n.castShadow = true
    crown.add(n)
  }
  // 设备层
  crown.add(box(11, 4.8, 7.5, M(C.panel, { roughness: 0.72 }), -1, 2.4, 12))
  crown.add(box(11.6, 0.3, 8.1, concM, -1, 4.95, 12))
  for (let k = 0; k < 3; k++) crown.add(ctx.blocks.latticePanel({ w: 3.4, h: 3.4, cols: 8, rows: 7, bar: 0.09, color: C.frame, x: -4.5 + k * 3.5, y: 0.7, z: 8.2 }))
  for (const [ux, uz] of [[6, 2], [6, -2]] as const) {
    crown.add(box(3, 1.5, 2.6, M(C.frame, { metalness: 0.5, roughness: 0.4 }), ux, 0.75, uz))
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 0.7, 16), steelM)
    cap.position.set(ux, 1.8, uz)
    cap.castShadow = true
    crown.add(cap)
  }
  // 桅杆与航空障碍灯（塔冠顶 72.0m，与总图档位一致）
  crown.add(box(0.34, 4.8, 0.34, steelM, 6, 2.4, -14))
  for (let k = 0; k < 3; k++) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), M('#FF5A5A', { emissive: '#FF5A5A', emissiveIntensity: 2.2, roughness: 0.4 }))
    lamp.position.set(6, 1.5 + k * 1.5, -14)
    crown.add(lamp)
  }
  // 观景绿带（护士与后勤的屋顶休息处）
  for (const [px, pz, pw, pd] of [[-5.4, -12.8, 4.4, 7], [5.4, -13.4, 4.4, 7]] as Array<[number, number, number, number]>) {
    crown.add(planter({ w: pw, d: pd, h: 0.6, x: px, y: 0, z: pz, soil: true }))
    for (let j = 0; j < 12; j++) {
      const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 + rng() * 0.28, 1), M(rng() > 0.5 ? C.green : C.green3, { roughness: 0.95 }))
      s.position.set(px - pw / 2 + 0.5 + rng() * (pw - 1), 0.88 + rng() * 0.32, pz - pd / 2 + 0.5 + rng() * (pd - 1))
      s.castShadow = true
      crown.add(s)
    }
    crown.add(healingTree({ rand: rng, h: 3.6, crown: 1.05, blobs: 5, x: px, y: 0.6, z: pz + 2.2, leafColor: C.green3 }))
    crown.add(ctx.blocks.bench({ x: px, z: pz - pd / 2 + 0.7, rotY: 0 }))
  }
  root.add(crown)

  return root
}

import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { lantern } from '../../blocks/official/lantern'

/**
 * b-000031 愈光庭养护所 · 模都第一栋市政建筑（builder.model_id = official）
 *
 * 立意《一间看得见的市政》。养护所不该是后院——它是一间小工坊：门朝东对着愈光庭，
 * 堆肥台和苗圃摆在院外让人看见，工具挂在墙上。城市里其他地方的绿都是干净的，
 * 只有这里承认绿会消耗：堆肥槽里躺着分层的落叶、草屑与熟肥，全城唯一一处「脏」的市政构筑物。
 *
 * 选址 C5-06+09（1×2 两排，20×40m，C5 东列南段），与愈光庭（D5-07+08+09）共享 20m 前缘、
 * 中隔 12m 城市道路——推门出来过条街就是庭园。刻意压低：除水塔外全部 ≤8.4m，
 * 低于愈光庭的树阵（8.8m）。维护者不该比被照顾的树高。
 *
 * 本栋为 official 市政配套：豁免街区主权（R15）、品质下限（R11）、设计文档（R12）与退线（R13），
 * 但走完全相同的代码约定与校验流程（R5/R6/R8/R14/R2/R3/R4/R9 全部适用）。
 * **因 R14 只认官方 `lib/*` 与 `blocks/official/`，本栋不 import 任何模型的私建积木**，
 * 种植畦与行道树两件自建工具就地写在下面——市政建筑自包含，天经地义。
 * 也因 R13 豁免，本栋的退线自洽由 layout 常量保证，不靠校验器兜底。
 */

/** 宗地 20×40m，局部原点 = 宗地中心；+x 为东（隔路正对愈光庭），+z 为北
 *  本体退线内落于 x ±8 / z ±18（coreHalfX = 20/2-2，coreHalfZ = 40/2-2）。
 *  三带布局：**南带 z −18..−4 共享前缘**（前院·大门·公示牌·堆肥台，正对愈光庭）、
 *  **中带 z −8..4 工坊与值班室**、**北带 z 6..19 后勤**（泵房·水塔·工具房·车棚·苗圃·卸货）。 */
const BX = 7.5 // 东侧玻璃面位置（出挑件收在此线内）
const WX = -7.5 // 西侧墙面位置
const HALL = 5.4 // 工坊车间净高
const MEZZ = 3.0 // 夹层高
const EAVE = HALL + MEZZ // 8.4 檐口
const HZ0 = -8, HZ1 = 4 // 工坊主楼 z 界
const DZ0 = -5, DZ1 = 2 // 值班室 z 界

const C = {
  conc: '#C7C4BC', // 清水混凝土
  concDeep: '#A9A69E',
  wood: '#B08A5A',
  woodDeep: '#8E6E45',
  woodPale: '#CDB08A',
  steel: '#7C8A90',
  metal: '#93A0A6',
  glass: '#9EC5DD',
  mint: '#BCD6C9',
  grass: '#8C9E8B',
  grassDeep: '#7B8F76',
  weed: '#6F8A5E',
  pave: '#D8D5CE',
  paveDark: '#B2AFA7',
  soil: '#6B4A2F',
  leaf: '#A98247', // 堆肥落叶层
  chaff: '#C4A863', // 草屑层
  compost: '#4A3A28', // 熟肥层
  glow: '#FFF1CE',
}

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

/** 管状构件：桁架、栏杆、水塔腿 */
function tube(points: THREE.Vector3[], r: number, m: THREE.Material, radial = 5, seg?: number): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points)
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, seg ?? Math.max(8, points.length * 4), r, radial, false), m)
  mesh.castShadow = true
  return mesh
}

/** 抬高种植畦（本地自建，见文件头 R14 说明）：圆角矩形槽体 + 内凹土面 */
function bed(o: { w: number; d: number; h: number; x: number; y: number; z: number; round?: number }): THREE.Object3D {
  const grp = new THREE.Group()
  const wall = 0.15
  const r = o.round ?? Math.min(0.28, Math.min(o.w, o.d) * 0.22)
  const outer = new THREE.Shape()
  const ow = o.w / 2, od = o.d / 2
  outer.moveTo(-ow + r, -od)
  outer.lineTo(ow - r, -od)
  outer.absarc(ow - r, -od + r, r, -Math.PI / 2, 0, false)
  outer.lineTo(ow, od - r)
  outer.absarc(ow - r, od - r, r, 0, Math.PI / 2, false)
  outer.lineTo(-ow + r, od)
  outer.absarc(-ow + r, od - r, r, Math.PI / 2, Math.PI, false)
  outer.lineTo(-ow, -od + r)
  outer.absarc(-ow + r, -od + r, r, Math.PI, Math.PI * 1.5, false)
  outer.closePath()
  const inner = new THREE.Path()
  const iw = ow - wall, id = od - wall, ir = Math.max(0.02, r - wall * 0.6)
  inner.moveTo(-iw + ir, -id)
  inner.lineTo(iw - ir, -id)
  inner.absarc(iw - ir, -id + ir, ir, -Math.PI / 2, 0, false)
  inner.lineTo(iw, id - ir)
  inner.absarc(iw - ir, id - ir, ir, 0, Math.PI / 2, false)
  inner.lineTo(-iw + ir, id)
  inner.absarc(-iw + ir, id - ir, ir, Math.PI / 2, Math.PI, false)
  inner.lineTo(-iw, -id + ir)
  inner.absarc(-iw + ir, -id + ir, ir, Math.PI, Math.PI * 1.5, false)
  inner.closePath()
  outer.holes.push(inner)
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: o.h, bevelEnabled: false, curveSegments: 4, steps: 1 }), M(C.conc, { roughness: 0.9 }))
  body.rotation.x = -Math.PI / 2
  body.castShadow = true
  body.receiveShadow = true
  grp.add(body)
  const soil = new THREE.Mesh(new THREE.BoxGeometry(o.w - wall * 2.1, 0.06, o.d - wall * 2.1), M(C.soil, { roughness: 1 }))
  soil.position.y = o.h - 0.06
  soil.receiveShadow = true
  grp.add(soil)
  grp.position.set(o.x, o.y, o.z)
  return grp
}

/** 行道树（本地自建）：细干 + 三根主枝 + 多团圆冠 */
function tree(o: { rand: () => number; h: number; crown: number; blobs: number; x: number; z: number; leaf: string }): THREE.Object3D {
  const rand = o.rand
  const grp = new THREE.Group()
  const trunkH = o.h * 0.44
  const trunkMat = M('#8A7A66', { roughness: 0.92 })
  const leafMat = M(o.leaf, { roughness: 0.95 })
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.28, trunkH, 10), trunkMat)
  trunk.position.y = trunkH / 2
  trunk.castShadow = true
  grp.add(trunk)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + rand() * 0.7
    const len = o.h * (0.16 + rand() * 0.08)
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.12, len, 8), trunkMat)
    branch.position.set(Math.cos(a) * len * 0.24, trunkH + len * 0.3, Math.sin(a) * len * 0.24)
    branch.rotation.z = -Math.cos(a) * 0.58
    branch.rotation.x = Math.sin(a) * 0.58
    branch.castShadow = true
    grp.add(branch)
  }
  for (let i = 0; i < o.blobs; i++) {
    const a = (i / o.blobs) * Math.PI * 2 + rand() * 0.9
    const first = i === 0
    const r = o.crown * 0.62 * (0.7 + rand() * 0.6) * (first ? 0.4 : 1)
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(first ? o.crown : o.crown * (0.36 + rand() * 0.24), 1), leafMat)
    leaf.position.set(Math.cos(a) * r, trunkH + o.h * (first ? 0.32 : 0.16 + rand() * 0.34), Math.sin(a) * r)
    leaf.castShadow = true
    grp.add(leaf)
  }
  grp.position.set(o.x, 0, o.z)
  return grp
}

export default function build(ctx: BuildCtx): THREE.Object3D {
  const rng = ctx.rng
  const root = new THREE.Group()

  const concM = M(C.conc, { roughness: 0.88 })
  const concDeepM = M(C.concDeep, { roughness: 0.9 })
  const woodM = M(C.wood, { roughness: 0.76 })
  const woodDeepM = M(C.woodDeep, { roughness: 0.78 })
  const woodPaleM = M(C.woodPale, { roughness: 0.74 })
  const steelM = M(C.steel, { metalness: 0.6, roughness: 0.34 })
  const metalM = M(C.metal, { metalness: 0.55, roughness: 0.36 })

  /** 一丛杂草/小苗：二十面体，随机转角 */
  const clump = (parent: THREE.Object3D, x: number, y: number, z: number, r: number, colors: string[], site = false): THREE.Mesh => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), M(colors[Math.floor(rng() * colors.length)], { roughness: 0.95 }))
    m.position.set(x, y, z)
    m.rotation.y = rng() * Math.PI
    m.castShadow = true
    parent.add(site ? siteTag(m) : m)
    return m
  }

  /** 铺装片（景观件豁免）：双色间插 */
  const pave = (x0: number, x1: number, z0: number, z1: number, step = 0.95, y = 0.04): void => {
    const nx = Math.max(1, Math.round((x1 - x0) / step))
    const nz = Math.max(1, Math.round((z1 - z0) / step))
    const tw = (x1 - x0) / nx
    const td = (z1 - z0) / nz
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        const t = siteTag(box(tw - 0.06, 0.14, td - 0.06, (i + j) % 2 === 0 ? M(C.pave, { roughness: 0.92 }) : M(C.paveDark, { roughness: 0.94 }),
          x0 + tw * (i + 0.5), y, z0 + td * (j + 0.5)))
        t.castShadow = false
      }
    }
  }

  // ═══════════ 0 · 底子：草皮满铺至宗地边缘 ═══════════
  root.add(siteTag(box(20, 0.3, 40, M(C.grass, { roughness: 1 }), 0, -0.15, 0)))
  pave(1, 10, -18, -4) // 南带前院（共享前缘，正对愈光庭）
  pave(1, 10, 15, 19.5) // 北带卸货场
  pave(-10, WX, -18, 18, 1.4) // 西侧步道
  pave(WX, BX, 6, 10) // 中带与北带之间的通道

  // ═══════════ 1 · 工坊主楼（x −7.5..1，z −8..4，檐口 8.4m） ═══════════
  const hall = new THREE.Group()
  hall.add(box(0.34, EAVE, HZ1 - HZ0, concM, WX, EAVE / 2, (HZ0 + HZ1) / 2))
  hall.add(box(0.34, EAVE, HZ1 - HZ0, concM, WX + 0.2, EAVE / 2, (HZ0 + HZ1) / 2))
  hall.add(box(8.5, EAVE, 0.34, concM, (WX + 1) / 2, EAVE / 2, HZ1))
  hall.add(box(8.5, EAVE, 0.34, concM, (WX + 1) / 2, EAVE / 2, HZ0))
  const colGeo = new THREE.CylinderGeometry(0.2, 0.24, HALL, 16)
  for (let k = 0; k <= 4; k++) {
    const z = HZ0 + 0.5 + (k / 4) * (HZ1 - HZ0 - 1)
    for (const x of [WX + 0.7, 0.3]) {
      const c = new THREE.Mesh(colGeo, woodM)
      c.position.set(x, HALL / 2, z)
      c.castShadow = true
      c.receiveShadow = true
      hall.add(c)
    }
  }
  // 12 榀木桁架（上下弦 + 每榀 5 根腹杆）
  for (let k = 0; k <= 11; k++) {
    const z = HZ0 + 0.35 + (k / 11) * (HZ1 - HZ0 - 0.7)
    hall.add(tube([new THREE.Vector3(WX + 0.7, HALL, z), new THREE.Vector3(0.3, HALL, z)], 0.11, woodDeepM, 5, 4))
    hall.add(tube([new THREE.Vector3(WX + 0.7, HALL + MEZZ - 0.35, z), new THREE.Vector3(0.3, HALL + MEZZ - 0.35, z)], 0.11, woodDeepM, 5, 4))
    for (let j = 0; j < 5; j++) {
      const x0 = WX + 0.7 + (j / 5) * 7.4
      const x1 = WX + 0.7 + ((j + 1) / 5) * 7.4
      hall.add(tube([
        new THREE.Vector3(x0, j % 2 === 0 ? HALL : HALL + MEZZ - 0.35, z),
        new THREE.Vector3(x1, j % 2 === 0 ? HALL + MEZZ - 0.35 : HALL, z),
      ], 0.055, woodDeepM, 4, 3))
    }
  }
  // 单坡钢屋面（东高西低，剖面在局部 XY，extrude 沿 +Z 即进深方向——不旋转）
  const roofGeo = new THREE.Shape()
  roofGeo.moveTo(WX, 0); roofGeo.lineTo(0.6, 0); roofGeo.lineTo(0.6, -0.9); roofGeo.lineTo(WX, -1.1); roofGeo.closePath()
  const roofMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(roofGeo, { depth: HZ1 - HZ0 + 0.5, bevelEnabled: false }), M(C.steel, { metalness: 0.5, roughness: 0.5 }))
  roofMesh.position.set(0, HALL + MEZZ, HZ0 - 0.25)
  roofMesh.castShadow = true
  roofMesh.receiveShadow = true
  hall.add(roofMesh)
  // 夹层楼板（西半：工具间在上）
  hall.add(slab(WX + 0.4, -2.6, HZ0 + 0.4, HZ1 - 0.4, HALL, 0.32, concM))
  hall.add(box(0.2, 1.05, HZ1 - HZ0 - 0.8, woodDeepM, -2.6, HALL + 0.68, (HZ0 + HZ1) / 2))
  // 东立面：整排大玻璃门（能看见里面在修花剪枝）
  hall.add(box(0.14, HALL - 0.4, HZ1 - HZ0 - 0.8, M(C.glass, { metalness: 0.5, roughness: 0.16, emissive: '#E6E1CE', emissiveIntensity: 0.24 }), 0.86, HALL / 2, (HZ0 + HZ1) / 2))
  for (let k = 0; k <= 4; k++) {
    hall.add(box(0.3, HALL - 0.4, 0.16, metalM, 0.9, HALL / 2, HZ0 + 0.4 + (k / 4) * (HZ1 - HZ0 - 0.8)))
  }
  hall.add(box(0.4, 0.24, HZ1 - HZ0 - 0.6, woodDeepM, 0.94, HALL - 0.32, (HZ0 + HZ1) / 2))
  hall.add(box(0.12, MEZZ - 0.5, HZ1 - HZ0 - 1.2, M(C.glass, { metalness: 0.5, roughness: 0.16, emissive: '#E6E1CE', emissiveIntensity: 0.3 }), 0.86, HALL + MEZZ / 2, (HZ0 + HZ1) / 2))
  for (let k = 0; k < 14; k++) {
    hall.add(box(0.2, MEZZ - 0.4, 0.12, woodM, 0.94, HALL + MEZZ / 2, HZ0 + 0.6 + (k / 13) * (HZ1 - HZ0 - 1.2)))
  }
  // 南山墙高窗 + 卸货推拉门（朝前院）
  hall.add(box(6.4, 1.1, 0.16, M(C.glass, { metalness: 0.5, roughness: 0.2 }), -3.4, HALL - 0.9, HZ0 - 0.1))
  hall.add(box(2.6, 3.2, 0.16, M(C.steel, { metalness: 0.5, roughness: 0.44 }), -5.4, 1.6, HZ0 - 0.12))
  // 北山墙设备百叶
  hall.add(ctx.blocks.latticePanel({ w: 4, h: 2.2, cols: 12, rows: 5, bar: 0.09, color: C.steel, x: -3.5, y: HALL - 2.6, z: HZ1 + 0.1 }))
  root.add(hall)

  // 工具挂墙：40 件工具挂在西山墙内面（开门就看见）
  const tools = new THREE.Group()
  tools.position.set(WX + 0.5, 0, HZ0 + 1)
  for (let k = 0; k < 40; k++) {
    const z = 0.4 + (k / 39) * (HZ1 - HZ0 - 1.6)
    const y = 1.1 + (k % 3) * 0.85
    const kind = k % 4
    if (kind === 0) {
      tools.add(box(0.08, 1.5, 0.08, woodM, 0, y, z))
      tools.add(box(0.08, 0.1, 0.42, metalM, 0, y + 0.75, z))
      tools.add(box(0.06, 0.3, 0.06, metalM, 0, y + 0.6, z - 0.12))
      tools.add(box(0.06, 0.3, 0.06, metalM, 0, y + 0.6, z + 0.12))
    } else if (kind === 1) {
      tools.add(box(0.08, 1.2, 0.08, woodM, 0, y, z))
      tools.add(box(0.06, 0.34, 0.26, metalM, 0, y - 0.62, z))
    } else if (kind === 2) {
      tools.add(box(0.1, 0.34, 0.06, M(C.metal, { metalness: 0.7, roughness: 0.3 }), 0, y, z))
      tools.add(box(0.06, 0.4, 0.05, M(C.metal, { metalness: 0.7, roughness: 0.3 }), 0, y - 0.3, z - 0.08))
      tools.add(box(0.06, 0.4, 0.05, M(C.metal, { metalness: 0.7, roughness: 0.3 }), 0, y - 0.3, z + 0.08))
    } else {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.28, 12), M(C.metal, { metalness: 0.5, roughness: 0.42 }))
      pot.position.set(0, y, z)
      pot.castShadow = true
      tools.add(pot)
      tools.add(box(0.06, 0.34, 0.06, M(C.metal, { metalness: 0.5, roughness: 0.42 }), 0, y + 0.14, z))
      tools.add(box(0.2, 0.06, 0.06, M(C.metal, { metalness: 0.5, roughness: 0.42 }), -0.14, y + 0.02, z))
    }
  }
  root.add(tools)

  // ═══════════ 2 · 值班室「窗」：三柱托出的满窗盒子，隔路正对愈光楼西端绿谷 ═══════════
  const duty = new THREE.Group()
  for (const z of [DZ0 + 0.4, (DZ0 + DZ1) / 2, DZ1 - 0.4]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, EAVE, 16), woodM)
    c.position.set(7.1, EAVE / 2, z)
    c.castShadow = true
    c.receiveShadow = true
    duty.add(c)
    duty.add(box(0.5, 0.28, 0.5, concM, 7.1, EAVE - 0.14, z))
  }
  duty.add(slab(1, 7.4, DZ0, DZ1, HALL, 0.34, concM))
  duty.add(box(6.4, MEZZ - 0.3, DZ1 - DZ0, concM, 4.2, HALL + MEZZ / 2 - 0.15, (DZ0 + DZ1) / 2))
  duty.add(box(6.6, 0.26, DZ1 - DZ0 + 0.2, concDeepM, 4.2, EAVE - 0.13, (DZ0 + DZ1) / 2))
  duty.add(box(0.12, MEZZ - 0.7, DZ1 - DZ0 - 0.4, M(C.glass, { metalness: 0.5, roughness: 0.14, emissive: '#E6E1CE', emissiveIntensity: 0.42 }), BX - 0.05, HALL + MEZZ / 2 - 0.2, (DZ0 + DZ1) / 2))
  for (let k = 0; k <= 5; k++) {
    duty.add(box(0.28, MEZZ - 0.6, 0.14, metalM, BX - 0.02, HALL + MEZZ / 2 - 0.2, DZ0 + 0.3 + (k / 5) * (DZ1 - DZ0 - 0.6)))
  }
  // 内部：桌、椅、发光顶灯与管养周期挂牌
  duty.add(box(1.7, 0.1, 0.9, woodPaleM, 4.4, HALL + 0.75, (DZ0 + DZ1) / 2))
  for (const [dx, dz] of [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]] as const) {
    duty.add(box(0.1, 0.75, 0.1, woodDeepM, 4.4 + dx, HALL + 0.37, (DZ0 + DZ1) / 2 + dz))
  }
  const chair = new THREE.Group()
  chair.position.set(4.4, 0, (DZ0 + DZ1) / 2 + 1.1)
  chair.add(box(0.5, 0.08, 0.5, woodM, 0, HALL + 0.48, 0))
  chair.add(box(0.5, 0.6, 0.08, woodM, 0, HALL + 0.78, -0.21))
  for (const [dx, dz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]] as const) {
    chair.add(box(0.07, 0.48, 0.07, woodDeepM, dx, HALL + 0.24, dz))
  }
  duty.add(chair)
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), M(C.glow, { emissive: C.glow, emissiveIntensity: 1.9, roughness: 0.4 }))
  lamp.position.set(4.4, EAVE - 0.6, (DZ0 + DZ1) / 2)
  duty.add(lamp)
  duty.add(box(0.08, 1.5, 2.6, woodDeepM, 1.15, HALL + 1.35, (DZ0 + DZ1) / 2))
  duty.add(box(0.04, 1.3, 2.4, M(C.glow, { emissive: C.glow, emissiveIntensity: 0.9, roughness: 0.5 }), 1.2, HALL + 1.35, (DZ0 + DZ1) / 2))
  for (let k = 0; k < 7; k++) {
    duty.add(box(0.03, 0.05, 2.2, woodDeepM, 1.24, HALL + 0.82 + k * 0.18, (DZ0 + DZ1) / 2))
  }
  // 值班室东檐牌：makeNeonSign 的 w 走 X、面法线朝 ±Z，故转 π/2 让牌面朝东面对愈光庭
  const dutySign = ctx.blocks.neonSign({ w: 2.6, h: 0.5, color: '#8FD9C4', x: 7.4, y: EAVE + 0.2, z: (DZ0 + DZ1) / 2 })
  dutySign.rotation.y = Math.PI / 2
  duty.add(dutySign)
  root.add(duty)

  // ═══════════ 3 · 大门与铁艺门扇（朝东，正对愈光庭；门位 z=−14，让开南侧堆肥台） ═══════════
  const gate = new THREE.Group()
  gate.position.set(BX - 0.3, 0, -14)
  for (const z of [-1.9, 1.9]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 3.2, 14), woodDeepM)
    p.position.set(0.4, 1.6, z)
    p.castShadow = true
    gate.add(p)
    gate.add(box(0.5, 0.2, 0.5, concDeepM, 0.4, 3.28, z))
  }
  gate.add(box(0.3, 0.34, 4.4, woodDeepM, 0.4, 3.05, 0))
  for (const z of [-0.95, 0.95]) {
    // 铁艺门扇：只留竖棂与横档，不加实心底板——加了就成了实心灰板，不是门
    const leaf = new THREE.Group()
    leaf.position.set(0.4, 0, z)
    for (let k = 0; k <= 7; k++) {
      leaf.add(box(0.05, 2.6, 0.05, M(C.metal, { metalness: 0.5, roughness: 0.44 }), 0, 1.3, -0.85 + (k / 7) * 1.7))
    }
    leaf.add(box(0.06, 0.06, 1.8, M(C.metal, { metalness: 0.5, roughness: 0.44 }), 0, 2.2, 0))
    leaf.add(box(0.06, 0.06, 1.8, M(C.metal, { metalness: 0.5, roughness: 0.44 }), 0, 0.6, 0))
    leaf.add(box(0.05, 0.5, 0.05, M(C.metal, { metalness: 0.5, roughness: 0.44 }), 0, 1.3, 0))
    gate.add(leaf)
  }
  // 标题牌同 neonSign：转 π/2 令牌面朝东
  const gateSign = ctx.blocks.neonSign({ w: 3.4, h: 0.6, color: '#E9C88F', x: 0.62, y: 3.45, z: 0 })
  gateSign.rotation.y = Math.PI / 2
  gate.add(gateSign)
  root.add(gate)
  // 前院行道树：种在前院西缘（x≈1.8），**不种在东缘**——种在东缘就把公示牌与堆肥台遮死了，
  // 而这两样正是本栋要给人看的东西。树在这儿的任务是给铺装荫，不是挡脸。
  for (const z of [-12.5, -6]) {
    root.add(siteTag(tree({ rand: rng, h: 5.4, crown: 1.25, blobs: 6, x: 1.8, z, leaf: C.grass })))
  }

  // ═══════════ 4 · 公示牌石墙：把管养周期表刻上墙（南带东缘，面向愈光庭） ═══════════
  // 墙体厚 0.9，局部 x ∈ [−0.45, 0.45]；刻线格、发光刻线与标题牌一律贴在**东面** x = +0.5 一侧——
  // 刻在墙里就等于没刻，市政的第一件事是把承诺挂在朝人的那面墙上。
  // z 位选 −8 而非贴着大门：公示牌 2.8m 高，堆肥台只有 1.4m，两者同处东缘时高者会把低者挡死。
  const board = new THREE.Group()
  board.position.set(7.1, 0, -8)
  board.add(box(0.9, 2.8, 7, concM, 0, 1.4, 0))
  board.add(box(1.05, 0.24, 7.3, concDeepM, 0, 2.94, 0))
  // 刻线格：竖棂要够粗才读得出「表」——14 根 0.07 的竖棂在 7m 宽上等于没有，只剩七道横条看着像百叶窗
  const engraved = ctx.blocks.latticePanel({ w: 7, h: 2.1, cols: 6, rows: 6, bar: 0.12, color: C.concDeep, x: 0.5, y: 0.35, z: 0 })
  engraved.rotation.y = Math.PI / 2
  board.add(engraved)
  for (let k = 0; k < 7; k++) {
    board.add(box(0.08, 0.06, 6.4, M(C.glow, { emissive: C.glow, emissiveIntensity: 0.8, roughness: 0.5 }), 0.56, 0.62 + k * 0.28, 0))
  }
  const boardSign = ctx.blocks.neonSign({ w: 3.2, h: 0.55, color: '#8FD9C4', x: 0.56, y: 3.28, z: 0 })
  boardSign.rotation.y = Math.PI / 2
  board.add(boardSign)
  root.add(board)

  // ═══════════ 5 · 堆肥台 3 联：全城唯一「脏」的市政构筑物（南带，愈光庭看得见） ═══════════
  const heap = new THREE.Group()
  heap.position.set(4.6, 0, -16)
  for (let i = 0; i < 3; i++) {
    const x = -1.9 + i * 1.9
    heap.add(box(1.75, 1.4, 0.24, concM, x, 0.7, -1.5))
    heap.add(box(1.75, 1.4, 0.24, concM, x, 0.7, 1.5))
    heap.add(box(0.24, 1.4, 3.0, concM, x - 0.87, 0.7, 0))
    heap.add(box(0.24, 1.4, 3.0, concM, x + 0.87, 0.7, 0))
    heap.add(box(1.75, 0.16, 3.0, concM, x, 0.08, 0))
    heap.add(box(1.35, 0.34, 2.5, M(C.leaf, { roughness: 1 }), x, 1.35, 0))
    heap.add(box(1.4, 0.3, 2.55, M(C.chaff, { roughness: 1 }), x, 1.16, 0))
    heap.add(box(1.45, 0.26, 2.6, M(C.compost, { roughness: 1 }), x, 0.99, 0))
    for (let k = 0; k < 9; k++) clump(heap, x - 0.6 + rng() * 1.2, 1.6 + rng() * 0.16, -1.1 + rng() * 2.2, 0.13 + rng() * 0.1, [C.leaf, C.chaff])
    for (let k = 0; k < 3; k++) heap.add(box(1.6, 0.09, 0.2, woodDeepM, x, 1.72, -1.05 + k * 1.05))
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.5, 8), M(C.metal, { metalness: 0.5, roughness: 0.42 }))
    pipe.position.set(x + 0.6, 1.95, 0.8)
    pipe.castShadow = true
    heap.add(pipe)
  }
  root.add(heap)
  // 插在堆里的铁铲
  const spade = new THREE.Group()
  spade.position.set(4.6, 0, -17.4)
  spade.rotation.z = 0.32
  spade.add(box(0.08, 1.9, 0.08, woodPaleM, 0, 1.5, 0))
  spade.add(box(0.06, 0.36, 0.28, M(C.metal, { metalness: 0.6, roughness: 0.36 }), 0, 0.62, 0))
  root.add(spade)
  // 堆肥台边的杂草：这里不整齐，是故意的
  for (let k = 0; k < 60; k++) clump(root, 1.4 + rng() * 6.4, 0.24, -19.4 + rng() * 6.4, 0.16 + rng() * 0.16, [C.weed, C.grassDeep], true)

  // ═══════════ 6 · 泵房与水塔（北带，承接愈光庭雨水花园的循环水） ═══════════
  const pump = new THREE.Group()
  pump.position.set(-5, 0, 8)
  pump.add(box(5, 3.2, 4, concM, 0, 1.6, 0))
  pump.add(box(5.3, 0.26, 4.3, concDeepM, 0, 3.33, 0))
  pump.add(box(1.1, 2.1, 0.14, M(C.woodDeep, { roughness: 0.78 }), 1.4, 1.05, 2.05))
  for (let k = 0; k < 2; k++) pump.add(ctx.blocks.latticePanel({ w: 1.4, h: 1, cols: 6, rows: 3, bar: 0.06, color: C.steel, x: -1.2 + k * 2.2, y: 1.4, z: 2.06 }))
  root.add(pump)
  const tower = new THREE.Group()
  tower.position.set(-5, 0, 8)
  for (const [dx, dz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]] as const) {
    tower.add(tube([new THREE.Vector3(dx, 0, dz), new THREE.Vector3(dx * 0.55, 7.2, dz * 0.55)], 0.09, steelM, 5, 6))
  }
  for (let k = 0; k < 3; k++) {
    const y = 1.6 + k * 2.3
    const r = 1.2 - (y / 7.2) * 0.53
    tower.add(tube([new THREE.Vector3(-r, y, -r), new THREE.Vector3(r, y, -r)], 0.05, steelM, 4, 3))
    tower.add(tube([new THREE.Vector3(-r, y, r), new THREE.Vector3(r, y, r)], 0.05, steelM, 4, 3))
    tower.add(tube([new THREE.Vector3(-r, y, -r), new THREE.Vector3(-r, y, r)], 0.05, steelM, 4, 3))
    tower.add(tube([new THREE.Vector3(r, y, -r), new THREE.Vector3(r, y, r)], 0.05, steelM, 4, 3))
  }
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 2, 20), M(C.metal, { metalness: 0.5, roughness: 0.42 }))
  tank.position.y = 8.1
  tank.castShadow = true
  tower.add(tank)
  const tankTop = new THREE.Mesh(new THREE.ConeGeometry(1.45, 0.7, 20), M(C.steel, { metalness: 0.5, roughness: 0.4 }))
  tankTop.position.y = 9.55
  tankTop.castShadow = true
  tower.add(tankTop)
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), M('#FF5A5A', { emissive: '#FF5A5A', emissiveIntensity: 2, roughness: 0.4 }))
  beacon.position.y = 10.05
  tower.add(beacon)
  root.add(tower)

  // ═══════════ 7 · 工具房 + 车棚（北带临路） ═══════════
  const shed = new THREE.Group()
  shed.position.set(4.85, 0, 7.6)
  shed.add(box(6, 3.6, 3, concM, 0, 1.8, 0))
  shed.add(box(6.3, 0.26, 3.3, concDeepM, 0, 3.73, 0))
  shed.add(box(1.4, 2.4, 0.16, M(C.woodDeep, { roughness: 0.78 }), 1.8, 1.2, -1.56))
  shed.add(ctx.blocks.latticePanel({ w: 1.6, h: 1.1, cols: 7, rows: 3, bar: 0.06, color: C.steel, x: -1.8, y: 1.5, z: -1.56 }))
  for (let k = 0; k < 16; k++) {
    const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.3, 12), M(C.soil, { roughness: 1 }))
    bag.position.set(-2.5 + (k % 8) * 0.7, 4.0, k < 8 ? -0.7 : 0.7)
    bag.castShadow = true
    shed.add(bag)
    clump(shed, -2.5 + (k % 8) * 0.7, 4.22, k < 8 ? -0.7 : 0.7, 0.24 + rng() * 0.12, [C.grassDeep, C.mint])
  }
  root.add(shed)
  const canopy = new THREE.Group()
  canopy.position.set(5, 0, 13)
  for (const [cx, cz] of [[-2.6, -1.5], [2.6, -1.5], [-2.6, 1.5], [2.6, 1.5]] as const) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 4.2, 12), steelM)
    c.position.set(cx, 2.1, cz)
    c.castShadow = true
    canopy.add(c)
  }
  canopy.add(box(6, 0.2, 3.6, M(C.steel, { metalness: 0.5, roughness: 0.46 }), 0, 4.25, 0))
  for (let k = 0; k < 7; k++) canopy.add(box(0.14, 0.3, 3.6, M(C.steel, { metalness: 0.5, roughness: 0.46 }), -2.5 + k * 0.85, 4.05, 0))
  canopy.add(box(1.7, 0.9, 1.1, M(C.metal, { metalness: 0.45, roughness: 0.5 }), -1.4, 0.45, 0))
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 6, 16), M(C.metal, { metalness: 0.45, roughness: 0.5 }))
  wheel.position.set(-2.3, 0.3, 0)
  wheel.rotation.y = Math.PI / 2
  canopy.add(wheel)
  for (let k = 0; k < 3; k++) canopy.add(box(0.8, 0.6, 0.7, M(C.woodDeep, { roughness: 0.8 }), 1.2 + k * 0.95, 0.3, 0.6))
  root.add(canopy)

  // ═══════════ 8 · 苗圃：给愈光庭补种的工厂（北带西侧，4 畦 224 株 + 竹架） ═══════════
  const nursery = new THREE.Group()
  nursery.position.set(-3.5, 0, 14.6)
  for (let i = 0; i < 4; i++) {
    const z = -2.55 + i * 1.7
    nursery.add(bed({ w: 8.4, d: 1.25, h: 0.4, x: 0, y: 0, z, round: 0.24 }))
    for (let k = 0; k < 56; k++) {
      clump(nursery, -3.9 + rng() * 7.8, 0.5 + rng() * 0.16, z - 0.42 + rng() * 0.84, 0.11 + rng() * 0.09, [C.grassDeep, C.mint, C.grass])
    }
    for (let k = 0; k < 8; k++) {
      const x = -3.7 + (k / 7) * 7.4
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.15, 6), M(C.woodPale, { roughness: 0.8 }))
      pole.position.set(x, 0.98, z)
      pole.castShadow = true
      nursery.add(pole)
    }
    for (const dy of [0.72, 1.12]) nursery.add(box(7.6, 0.035, 0.035, M(C.woodPale, { roughness: 0.8 }), 0, dy, z))
  }
  nursery.add(box(1.2, 1.8, 0.1, woodDeepM, -3.9, 0.9, -3.4))
  nursery.add(box(1, 1.5, 0.05, M(C.glow, { emissive: C.glow, emissiveIntensity: 0.75, roughness: 0.5 }), -3.9, 0.9, -3.32))
  root.add(nursery)

  // ═══════════ 9 · 零碎绿化、灯与卸货场杂物 ═══════════
  for (let k = 0; k < 46; k++) clump(root, -9.6, 0.3, -18 + rng() * 36, 0.16 + rng() * 0.16, [C.grassDeep, C.weed], true)
  for (let k = 0; k < 22; k++) clump(root, -9.8 + rng() * 1.4, 0.28, -18 + rng() * 36, 0.18 + rng() * 0.16, [C.grass, C.grassDeep], true)
  // 庭园灯：官方积木件的须弥座石灯（示范件，正是官方建筑该用的东西）+ 两盏高杆路灯照后场
  for (const z of [-17, -11, -5, 1, 7, 13, 18]) {
    root.add(lantern({ x: -8.3, z, scale: 1.1, glow: C.glow }))
  }
  for (const z of [4, 16]) root.add(ctx.blocks.streetLamp({ x: -8.5, z, h: 6 }))
  // 西侧步道边的矮绿篱：把 40m 长的院子切出段落，不然是一条空带
  for (const [z, d] of [[-16, 5], [-6, 6], [4, 6], [14, 6]] as const) {
    root.add(ctx.blocks.hedge({ w: 0.7, d, h: 0.8, x: -9.5, z }))
  }
  // 值班室窗下两张长椅：面朝愈光庭，休息时看得见被照顾的树
  for (const z of [-6.4, -1.6]) root.add(ctx.blocks.bench({ x: 3.4, z, rotY: Math.PI / 2 }))
  for (let k = 0; k < 5; k++) {
    root.add(siteTag(box(1.2, 0.14, 1.0, woodDeepM, 2.4 + (k % 3) * 1.4, 0.11, 17.6 + Math.floor(k / 3) * 1.2)))
  }
  for (let k = 0; k < 9; k++) {
    const sack = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.6, 12), M(C.chaff, { roughness: 1 }))
    sack.position.set(3.2 + (k % 3) * 0.7, 0.4 + Math.floor(k / 6) * 0.6, 16.2 + Math.floor(k / 3) * 0.7)
    sack.castShadow = true
    root.add(siteTag(sack))
  }

  return root
}

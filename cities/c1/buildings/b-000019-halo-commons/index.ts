import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { gardenTree } from '../../blocks/glm-5.3/garden-tree'
import { modernLamp, bollardLight, planterBench } from '../../blocks/glm-5.3/modern-site'

/**
 * 光环广场 Halo Commons · E5「原点街区」二期市民南广场（宗地 E5-08+09，40×20m）
 *
 * 「原点三重奏」的地面终章：塔心下沉光庭（原点本体）→ 塔冠空中原点环（原点升空）→
 * 本广场地面光环（原点荡回地面成涟漪）。中心原点盘是落水点，环形镜水是最强一圈波纹，
 * 柱廊环是荡开的水痕，同心铺装涟漪荡至宗地边界——第一栋楼落成时，城市从这里荡开。
 *
 * 坐标：局部原点 = 宗地中心地面，+x 东、+z 北（与原点塔局部系同约定）。
 * 全城原点（全局 0,0）在本宗地局部 (-10,+20) 方向界外；其正南轴线 = 局部 x=-10，
 * 光环核心中心 C=(-9,0) 沿该轴线落位（西让 1m 保柱廊环收进 R13 本体线 |x|≤18/|z|≤8）。
 *
 * 角度约定：方位角 φ = atan2(z,x)（N=+z → π/2，E=+x → 0）。
 * RingGeometry 经 rotateX(-π/2) 后 φ = -thetaStart；CylinderGeometry θ = π/2 - φ；
 * TorusGeometry 弧段用 rotateZ(起始方位角)+rotateX(π/2)（与原点塔同款工具）。
 */

/* ---------- 常量 ---------- */

const C = { x: -9, z: 0 }              // 光环核心中心（沿原点正南轴线）
const R_PLINTH = 2.4                   // 下沉底盘半径
const R_T2_OUT = 3.56                  // 第一级弧阶外缘（两级各宽 0.58、级高 0.42=坐高）
const R_POOL_IN = 4.5, R_POOL_OUT = 5.75   // 环形镜水内外半径
const R_SEAT = 6.35                    // 环形坐墙
const R_COL = 7.6                      // 柱廊环（R13 本体线内）
const GAPS: Array<{ a: number; half: number }> = [   // 四方位人行口（中心方位角 + 半角宽）
  { a: -Math.PI / 2, half: 0.2 },      // 南（城市界面主入口）
  { a: 0, half: 0.2 },                 // 东
  { a: Math.PI / 2, half: 0.2 },       // 北（对塔前广场）
  { a: Math.PI, half: 0.2 },           // 西
]
const GROUND = 0.05                    // 地面铺装面标高

/** 全周扣除四口后的弧段列表 [a0,a1]（含收缩边距 margin，供带缺口的环件复用）。
 *  切点配对算法：起点取任一非口角度，口界规范化到 [起点, 起点+2π) 后按左右界成对断开
 *  ——正确处理跨 ±π 的口（西口），线性顺扫会漏掉跨界半口。 */
function gapSegs(margin = 0): Array<[number, number]> {
  const segs: Array<[number, number]> = []
  const a = Math.PI / 7                                 // 扫描起点（不在任何口内）
  const end = a + Math.PI * 2
  const cuts = GAPS.flatMap(g => [g.a - g.half - margin, g.a + g.half + margin])
    .map(c => (c < a ? c + Math.PI * 2 : c))
    .sort((p, q) => p - q)
  let cur = a
  for (let i = 0; i < cuts.length; i += 2) {
    const d0 = cuts[i], d1 = cuts[i + 1]
    if (d0 > cur) segs.push([cur, d0])
    cur = d1
  }
  if (cur < end) segs.push([cur, end])
  return segs
}
const FULL_SEGS = gapSegs()            // 常用：全周四段（+尾段，共五段）

/** 方位角 a、半径 r 处的点是否在宗地安全框内（留 0.2m 余量） */
const inPlot = (a: number, r: number): boolean =>
  Math.abs(C.x + Math.cos(a) * r) <= 19.8 && Math.abs(C.z + Math.sin(a) * r) <= 9.8

/** 涟漪圈被宗地边界「裁岸」后的弧段（圆与矩形求交，解析解）：
 *  r≤9.8 全周；否则 z 向 |sinφ|≤9.8/r 截出东/西两带，西带再被西界 |cosφ|≥10.8/r 截。 */
function rippleSegs(r: number): Array<[number, number]> {
  if (r <= 9.8) return [[0, Math.PI * 2]]
  const zm = Math.asin(9.8 / r)
  const ax = -10.8 / r <= -1 ? Math.PI : Math.acos(-10.8 / r)
  const segs: Array<[number, number]> = []
  segs.push([-zm, zm])                                    // 东带（东向 x 恒界内）
  const wLo = Math.PI - zm, wHi = Math.PI + zm            // 西带（可能被西界截）
  if (ax >= Math.PI) segs.push([wLo, wHi])
  else {
    const a0 = Math.max(wLo, Math.PI * 2 - ax), a1 = Math.min(wHi, Math.PI * 2 + ax)
    if (a1 > a0) segs.push([a0, a1])
  }
  return segs
}

/* ---------- 顶点合并 Sink（与原点塔同工艺） ---------- */

interface Sink { pos: number[]; nor: number[]; col: number[]; idx: number[] }
const newSink = (): Sink => ({ pos: [], nor: [], col: [], idx: [] })

function pushGeo(s: Sink, g: THREE.BufferGeometry, c: THREE.Color, m?: THREE.Matrix4): void {
  if (m) g.applyMatrix4(m)
  const p = g.attributes.position, n = g.attributes.normal, ix = g.index!
  const base = s.pos.length / 3
  for (let i = 0; i < p.count; i++) {
    s.pos.push(p.getX(i), p.getY(i), p.getZ(i))
    s.nor.push(n.getX(i), n.getY(i), n.getZ(i))
    s.col.push(c.r, c.g, c.b)
  }
  for (let i = 0; i < ix.count; i++) s.idx.push(ix.getX(i) + base)
  g.dispose()
}

function box(s: Sink, w: number, h: number, d: number, x: number, y: number, z: number, c: THREE.Color, rotY = 0): void {
  const g = new THREE.BoxGeometry(w, h, d)
  if (rotY) g.rotateY(rotY)
  g.translate(x, y, z)
  pushGeo(s, g, c)
}

const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => { const o = new THREE.Mesh(g, m); o.castShadow = true; return o }

function sinkMesh(s: Sink, mat: THREE.Material): THREE.Mesh {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(s.pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(s.nor, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(s.col, 3))
  g.setIndex(s.idx)
  return mesh(g, mat)
}

/** 水平圆环弧段（φ∈[a0,a0+len]，TorusGeometry 定缺口方位，与塔同款） */
function arcTorus(r: number, tube: number, a0: number, len: number, radSeg = 10, tubSeg = 48): THREE.TorusGeometry {
  const g = new THREE.TorusGeometry(r, tube, radSeg, tubSeg, len)
  g.rotateZ(a0)
  g.rotateX(Math.PI / 2)
  return g
}

/** 水平环形面弧段（φ∈[a0,a0+len]）：RingGeometry rotateX(-π/2) 后 φ = -thetaStart */
function arcRing(r0: number, r1: number, a0: number, len: number, y: number, c: THREE.Color, s: Sink): void {
  const seg = Math.max(8, Math.ceil(len * 40))
  const g = new THREE.RingGeometry(r0, r1, seg, 1, -a0 - len, len)
  g.rotateX(-Math.PI / 2)
  g.translate(C.x, y, C.z)
  pushGeo(s, g, c)
}

/** 竖直圆柱弧面（φ∈[a0,a0+len]）：CylinderGeometry θ = π/2 - φ */
function arcCyl(r: number, h: number, a0: number, len: number, y: number, c: THREE.Color, s: Sink): void {
  const g = new THREE.CylinderGeometry(r, r, h, Math.max(12, Math.ceil(len * 32)), 1, true, Math.PI / 2 - a0 - len, len)
  g.translate(C.x, y, C.z)
  pushGeo(s, g, c)
}

/** 方位角 a 是否落在某个口的范围内（留 margin 边） */
const inGap = (a: number, margin = 0): boolean =>
  GAPS.some(g => {
    let d = a - g.a
    while (d > Math.PI) d -= Math.PI * 2
    while (d < -Math.PI) d += Math.PI * 2
    return Math.abs(d) < g.half + margin
  })

/* ---------- 材质（原点塔同谱系：银蓝缎面 + 金点睛） ---------- */

const COL = (h: string) => new THREE.Color(h)
const matSolid = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.75, roughness: 0.15, envMapIntensity: 1.35 })
const matPave = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.06, roughness: 0.92 })
const matWater = new THREE.MeshStandardMaterial({ color: '#4E86A0', metalness: 0.35, roughness: 0.06, transparent: true, opacity: 0.82 })
const matGlow = new THREE.MeshStandardMaterial({ color: '#FFD9A0', emissive: '#FFC878', emissiveIntensity: 2.5 })
const matGlowW = new THREE.MeshStandardMaterial({ color: '#FFF3DC', emissive: '#FFEED2', emissiveIntensity: 2.1 })
const matWood = stdMaterial('#8A6E4E', { roughness: 0.8 })
const matGold = stdMaterial('#C9AE8A', { metalness: 0.72, roughness: 0.25 })
const matBall = stdMaterial('#D8DADE', { metalness: 0.9, roughness: 0.05, envMapIntensity: 1.6 })

const SILVER_L = COL('#E8E9EB'), SILVER = COL('#C4C7CB'), SILVER_M = COL('#9EA3A9')
const STEEL_D = COL('#2A2E34'), GOLD_D = COL('#8F7452')
const PAVE_L = COL('#9C9890'), PAVE_M = COL('#7E7A73'), PAVE_D = COL('#5E5B56')
const GRASS_C = COL('#667A54'), WOOD = COL('#8A6E4E')

/* ---------- 场地：基底 + 涟漪铺装 + 金色子午线 + 四口台阶 ---------- */

function paving(parent: THREE.Object3D): void {
  const base = newSink()                                  // 深灰基底满铺（缝透底色）
  box(base, 39.9, 0.04, 19.9, 0, 0.02, 0, COL('#4B4B49'))
  parent.add(sinkMesh(base, matPave))
  const main = newSink()                                  // 主铺装大面（浅花岗岩）
  box(main, 39.7, 0.04, 19.7, 0, 0.045, 0, PAVE_L)
  parent.add(sinkMesh(main, matPave))

  // 涟漪环带：自核心向外交替明暗（涟漪从原点荡开，被宗地岸线裁断——荡到界为止）
  const bands: Array<[number, number]> = [
    [R_POOL_OUT + 0.35, 8.4], [8.4, 9.5], [9.5, 10.7], [10.7, 12.0], [12.0, 13.5], [13.5, 15.2], [15.2, 17.0],
  ]
  const ringS = newSink()
  const bandC = [PAVE_L, PAVE_M, PAVE_D]
  bands.forEach(([r0, r1], i) => {
    for (const [a0, a1] of rippleSegs(r1))   // 裁剪角按外缘 r1 算，防环带外缘在裁剪角处越界
      arcRing(r0, r1, a0, a1 - a0, GROUND + 0.005, bandC[i % 3], ringS)
  })
  parent.add(sinkMesh(ringS, matPave))

  // 涟漪立体缝环（凹缝感）：8 圈高分段窄 Torus 叠在环带界线上（同样裁岸）
  const seams = newSink()
  for (const r of [R_POOL_OUT + 0.35, 8.4, 9.5, 10.7, 12.0, 13.5, 15.2, 17.0])
    for (const [a0, a1] of rippleSegs(r))
      pushGeo(seams, arcTorus(r, 0.06, a0, a1 - a0, 6, 96).translate(C.x, GROUND + 0.014, C.z), PAVE_D)
  parent.add(sinkMesh(seams, matPave))

  // 中圈放射刻度缝（r∈[8.4,12.0]，涟漪区里带放射引导；口内与岸外不布）
  const rad = newSink()
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2 + Math.PI / 64
    if (inGap(a, 0.06) || !inPlot(a, 8.4) || !inPlot(a, 12.0)) continue
    const g = new THREE.BoxGeometry(0.09, 0.05, 3.6)
    g.rotateY(-a)
    g.translate(C.x + Math.cos(a) * 10.2, GROUND + 0.012, C.z + Math.sin(a) * 10.2)
    pushGeo(rad, g, PAVE_D)
  }
  parent.add(sinkMesh(rad, matPave))

  // 东翼树阵方格缝（与涟漪叠加成方圆交织）
  const grid = newSink()
  for (const gx of [2.5, 7.0, 11.5, 16.0]) box(grid, 0.08, 0.05, 18.8, gx, GROUND + 0.012, 0, PAVE_D)
  for (const gz of [-7.5, -3.75, 0, 3.75, 7.5]) box(grid, 19.2, 0.05, 0.08, 9.6, GROUND + 0.012, gz, PAVE_D)
  parent.add(sinkMesh(grid, matPave))

  // 金色子午线（原点正南轴线 x=-10）：南北两段 + 端头收点圆盘
  const goldL = newSink()
  box(goldL, 0.9, 0.05, 2.3, -10, GROUND + 0.018, 8.75, COL('#C9AE8A'))
  box(goldL, 0.9, 0.05, 2.3, -10, GROUND + 0.018, -8.75, COL('#C9AE8A'))
  parent.add(sinkMesh(goldL, matGold))
  for (const ez of [9.35, -9.35]) {
    const dot = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 24), matGold)
    dot.position.set(-10, GROUND + 0.02, ez); parent.add(dot)
  }

  // 四口小台阶（薄板件）：每口 3 级落到底盘（级高 0.28，径向每步 0.5）
  const steps = newSink()
  for (const g of GAPS) {
    const dirX = Math.cos(g.a), dirZ = Math.sin(g.a)
    for (let k = 0; k < 3; k++) {
      const rC = R_T2_OUT - 0.25 - k * 0.5
      box(steps, 3.0, 0.26, 0.5, C.x + dirX * rC, GROUND - 0.28 * (k + 1) - 0.13, C.z + dirZ * rC, k % 2 === 0 ? PAVE_M : PAVE_L, Math.PI / 2 - g.a)
    }
  }
  parent.add(sinkMesh(steps, matPave))
}

/* ---------- 光环核心：微下沉弧阶圆广场 + 原点盘 ---------- */

function haloCore(parent: THREE.Object3D): void {
  const s = newSink()
  // 两级弧阶踏面（96 分段，四口断开；级高 0.42 = 坐高，弧阶即看台阶；两级明暗交替强化下沉可读）
  const treads: Array<[number, number, number, THREE.Color]> = [
    [R_PLINTH, R_PLINTH + 0.58, GROUND - 0.84, PAVE_M],   // 第二级踏面
    [R_PLINTH + 0.58, R_T2_OUT, GROUND - 0.42, PAVE_L],   // 第一级踏面
  ]
  for (const [r0, r1, y, cc] of treads)
    for (const [a0, a1] of FULL_SEGS) arcRing(r0, r1, a0, a1 - a0, y, cc, s)
  // 阶外立沿（竖直面 ×2）
  for (const [r, y0, y1] of [
    [R_T2_OUT, GROUND - 0.42, GROUND], [R_PLINTH + 0.58, GROUND - 0.84, GROUND - 0.42],
  ] as Array<[number, number, number]>)
    for (const [a0, a1] of FULL_SEGS) arcCyl(r, y1 - y0, a0, a1 - a0, (y0 + y1) / 2, PAVE_D, s)
  // 底盘（整圆，与第二级踏面同标高相接）
  arcRing(0, R_PLINTH, 0, Math.PI * 2, GROUND - 0.84, PAVE_M, s)
  parent.add(sinkMesh(s, matPave))

  // 中心原点盘（落水点）：强发光盘 + 双金环 + 24 放射刻度 + 刻度圈
  const disk = mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.14, 48), matGlowW)
  disk.position.set(C.x, GROUND - 0.87, C.z); parent.add(disk)
  const ring1 = mesh(arcTorus(1.9, 0.06, 0, Math.PI * 2, 8, 96), matGlow)
  ring1.position.set(C.x, GROUND - 0.89, C.z); parent.add(ring1)
  const ring2 = mesh(arcTorus(2.2, 0.035, 0, Math.PI * 2, 6, 96), matGold)
  ring2.position.set(C.x, GROUND - 0.89, C.z); parent.add(ring2)
  const dial = newSink()
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    const g = new THREE.BoxGeometry(0.08, 0.04, 0.62)
    g.rotateY(-a)
    g.translate(C.x + Math.cos(a) * 1.15, GROUND - 0.9, C.z + Math.sin(a) * 1.15)
    pushGeo(dial, g, GOLD_D)
  }
  pushGeo(dial, arcTorus(1.62, 0.03, 0, Math.PI * 2, 5, 72).translate(C.x, GROUND - 0.9, C.z), PAVE_D)
  pushGeo(dial, arcTorus(2.36, 0.03, 0, Math.PI * 2, 5, 72).translate(C.x, GROUND - 0.9, C.z), PAVE_D)
  parent.add(sinkMesh(dial, matPave))
}

/* ---------- 环形镜水（annulus 浅池：壁/压顶/马赛克底/水面/灯带/涌泉/汀步） ---------- */

function waterRing(parent: THREE.Object3D, rng: () => number): void {
  const TOP = GROUND + 0.12, BOT = GROUND - 0.23          // 壁顶 / 池底
  const s = newSink()
  // 内外壁（四口断开）
  for (const r of [R_POOL_IN, R_POOL_OUT])
    for (const [a0, a1] of FULL_SEGS) arcCyl(r, TOP - BOT, a0, a1 - a0, (TOP + BOT) / 2, PAVE_D, s)
  // 池底马赛克：每段扇形厚砖（交替色）
  for (const [a0, a1] of FULL_SEGS) {
    const n = Math.max(4, Math.round(((a1 - a0) / (Math.PI * 2)) * 88))
    for (let i = 0; i < n; i++) {
      const b0 = a0 + ((a1 - a0) * i) / n, len = ((a1 - a0) * 1.02) / n
      arcRing(R_POOL_IN + 0.05, R_POOL_OUT - 0.05, b0, len, BOT, i % 2 === 0 ? PAVE_D : COL('#6A665F'), s)
    }
  }
  // 压顶双圈（窄 Torus 高分段）
  pushGeo(s, arcTorus(R_POOL_IN, 0.05, 0, Math.PI * 2, 6, 160), PAVE_L)
  pushGeo(s, arcTorus(R_POOL_OUT, 0.05, 0, Math.PI * 2, 6, 192), PAVE_L)
  parent.add(sinkMesh(s, matPave))

  // 水面（四段 Ring，挂镜面水材质）
  for (const [a0, a1] of FULL_SEGS) {
    const wm = mesh(new THREE.RingGeometry(R_POOL_IN + 0.04, R_POOL_OUT - 0.04, 96, 1, -a0 - (a1 - a0), a1 - a0), matWater)
    wm.rotation.x = -Math.PI / 2
    wm.position.set(C.x, GROUND - 0.07, C.z)
    parent.add(wm)
  }

  // 池底灯带（中圈微光，夜晕开）
  const glowRing = mesh(arcTorus((R_POOL_IN + R_POOL_OUT) / 2, 0.03, 0, Math.PI * 2, 5, 192), matGlowW)
  glowRing.position.set(C.x, BOT + 0.06, C.z); parent.add(glowRing)

  // 涌泉阵：每段 5 组（水柱 + 溅盘 + 泡球），位置确定性微扰
  const jets = newSink()
  for (const [a0, a1] of FULL_SEGS) {
    for (let i = 0; i < 5; i++) {
      const a = a0 + ((a1 - a0) * (i + 0.5)) / 5 + (rng() - 0.5) * 0.06
      const r = (R_POOL_IN + R_POOL_OUT) / 2 + (i % 2 ? 0.22 : -0.22)
      const jx = C.x + Math.cos(a) * r, jz = C.z + Math.sin(a) * r
      const col = new THREE.CylinderGeometry(0.035, 0.05, 0.3, 8)
      col.translate(jx, GROUND + 0.02, jz)
      pushGeo(jets, col, COL('#6FA8BC'))
      const splash = new THREE.ConeGeometry(0.22, 0.06, 12)
      splash.rotateX(Math.PI)
      splash.translate(jx, GROUND - 0.16, jz)
      pushGeo(jets, splash, COL('#5E8CA0'))
      for (let b = 0; b < 3; b++) {
        const bub = new THREE.SphereGeometry(0.05 + b * 0.02, 8, 6)
        bub.translate(jx + (b - 1) * 0.09, GROUND + 0.09 + b * 0.07, jz + (b - 1) * 0.05)
        pushGeo(jets, bub, COL('#8FC0D2'))
      }
    }
  }
  parent.add(sinkMesh(jets, matPave))

  // 四口汀步（北口金板对金色子午线、其余石板）
  const fordG = newSink(), fordS = newSink()
  for (const g of GAPS) {
    const dirX = Math.cos(g.a), dirZ = Math.sin(g.a)
    const gold = Math.abs(g.a - Math.PI / 2) < 0.01
    for (let k = 0; k < 2; k++) {
      const r = R_POOL_IN + 0.32 + k * 0.66
      box(gold ? fordG : fordS, 1.0, 0.12, 0.62, C.x + dirX * r, TOP - 0.06, C.z + dirZ * r, COL('#C9AE8A'), Math.PI / 2 - g.a)
    }
  }
  parent.add(sinkMesh(fordG, matGold))
  parent.add(sinkMesh(fordS, matPave))
}

/* ---------- 柱廊环：银柱列 + 双环梁 + 金线 + 银肋竖杆 + 环形坐墙 ---------- */

function colonnade(parent: THREE.Object3D): void {
  const s = newSink()
  const colAngles: number[] = []
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2 + Math.PI / 28
    if (inGap(a, 0.1)) continue                           // 口内不立柱
    colAngles.push(a)
  }
  for (const a of colAngles) {
    const px = C.x + Math.cos(a) * R_COL, pz = C.z + Math.sin(a) * R_COL
    const col = new THREE.CylinderGeometry(0.11, 0.13, 3.6, 10)
    col.translate(px, 1.8, pz)
    pushGeo(s, col, SILVER)
    const base = new THREE.CylinderGeometry(0.2, 0.24, 0.2, 10)
    base.translate(px, 0.1, pz)
    pushGeo(s, base, SILVER_M)
    const cap = new THREE.BoxGeometry(0.36, 0.2, 0.36)
    cap.rotateY(-a)
    cap.translate(px, 3.7, pz)
    pushGeo(s, cap, SILVER_L)
  }
  // 主环梁双道（四段拼整环，高分段）
  for (const [y, tube] of [[3.9, 0.16], [3.5, 0.12]] as Array<[number, number]>)
    for (const [a0, a1] of FULL_SEGS)
      pushGeo(s, arcTorus(R_COL, tube, a0, a1 - a0, 10, 192).translate(C.x, y, C.z), SILVER)
  // 柱间银肋竖杆（塔身银肋语言：每跨 3 根细杆；口侧大跨不布）
  for (let i = 0; i < colAngles.length; i++) {
    const a0 = colAngles[i], a1 = colAngles[(i + 1) % colAngles.length]
    let span = a1 - a0
    if (span < 0) span += Math.PI * 2
    if (span > 0.6) continue
    for (let k = 1; k <= 3; k++) {
      const a = a0 + (span * k) / 4
      const rod = new THREE.CylinderGeometry(0.028, 0.028, 2.7, 6)
      rod.translate(C.x + Math.cos(a) * R_COL, 1.62, C.z + Math.sin(a) * R_COL)
      pushGeo(s, rod, SILVER_M)
    }
  }
  parent.add(sinkMesh(s, matSolid))

  // 金线副梁（金点睛：一圈细金环，呼应塔冠金边）
  const g2 = new THREE.Group()
  for (const [a0, a1] of FULL_SEGS) {
    const t = mesh(arcTorus(R_COL, 0.045, a0, a1 - a0, 5, 224), matGold)
    t.position.set(C.x, 3.3, C.z)
    g2.add(t)
  }
  parent.add(g2)
  // 环梁下灯带（微光晕）
  const g3 = new THREE.Group()
  for (const [a0, a1] of FULL_SEGS) {
    const t = mesh(arcTorus(R_COL - 0.14, 0.04, a0, a1 - a0, 5, 192), matGlowW)
    t.position.set(C.x, 3.68, C.z)
    g3.add(t)
  }
  parent.add(g3)

  // 柱冠下缘光环（每柱一圈小发光环）
  const halos = newSink()
  for (const a of colAngles) {
    const t = arcTorus(0.17, 0.028, 0, Math.PI * 2, 6, 24)
    t.translate(C.x + Math.cos(a) * R_COL, 3.56, C.z + Math.sin(a) * R_COL)
    pushGeo(halos, t, COL('#FFF3DC'))
  }
  parent.add(sinkMesh(halos, matGlowW))

  // 环形坐墙（r6.35，四段：木质坐沿 Torus + 外圈低脚凳环）
  const seat = newSink()
  for (const [a0, a1] of gapSegs(0.12)) {
    pushGeo(seat, arcTorus(R_SEAT, 0.24, a0, a1 - a0, 8, 160).translate(C.x, 0.26, C.z), WOOD)
    pushGeo(seat, arcTorus(R_SEAT + 0.55, 0.11, a0 + 0.05, a1 - a0 - 0.1, 6, 120).translate(C.x, 0.12, C.z), PAVE_M)
  }
  parent.add(sinkMesh(seat, matPave))
}

/* ---------- 东翼树阵客厅 + 三镜珠 + 西带 ---------- */

function wings(parent: THREE.Object3D, rng: () => number): void {
  // 树阵 4×2（树池坐凳 + 修剪树 + 树下地灯）
  const spots: Array<[number, number]> = [
    [2.5, 3.8], [7.0, 3.8], [11.5, 3.8], [16.0, 3.8],
    [2.5, -3.8], [7.0, -3.8], [11.5, -3.8], [16.0, -3.8],
  ]
  spots.forEach(([tx, tz], i) => {
    parent.add(planterBench({ x: tx, z: tz, size: 2.2 }))
    parent.add(gardenTree({ x: tx, z: tz, scale: i % 3 === 0 ? 1.1 : 0.95, seed: 23 + i * 9 }))
    // 树下地灯放背离中线一侧（北行朝北、南行朝南），避开中央镜珠走位
    parent.add(bollardLight({ x: tx, z: tz + (tz > 0 ? 2.0 : -2.0), h: 0.35 }))
  })
  const shrub = newSink()                                 // 树池边灌木球阵（确定性散点；半径内收防超 R13 退线）
  for (let i = 0; i < 24; i++) {
    const [tx, tz] = spots[i % 8]
    const ang = (i / 8) * Math.PI * 2 + rng()
    const g = new THREE.SphereGeometry(0.24 + rng() * 0.14, 10, 8)
    g.translate(tx + Math.cos(ang) * 1.5, 0.3, tz + Math.sin(ang) * 1.5)
    pushGeo(shrub, g, GRASS_C)
  }
  parent.add(sinkMesh(shrub, matPave))

  // 三颗镜面圆珠（球=三维的圆，对角渐大）：走树阵网格间隙中线，避让树池/长凳
  const orbs: Array<[number, number, number]> = [[4.75, -5.8, 0.75], [9.6, 0, 1.05], [13.75, 5.8, 1.4]]
  for (const [ox, oz, r] of orbs) {
    const ped = mesh(new THREE.CylinderGeometry(r + 0.35, r + 0.5, 0.14, 32), matPave)
    ped.position.set(ox, GROUND + 0.02, oz); parent.add(ped)
    const ball = mesh(new THREE.SphereGeometry(r, 48, 32), matBall)
    ball.position.set(ox, r + 0.14, oz); parent.add(ball)
  }

  // 树阵间长凳两组（与镜珠走位错开）
  const bench = newSink()
  for (const [bx, bz] of [[7.0, 1.4], [13.0, -1.2]] as Array<[number, number]>) {
    box(bench, 2.6, 0.12, 0.65, bx, 0.5, bz, WOOD)
    box(bench, 0.16, 0.42, 0.55, bx - 1.1, 0.24, bz, STEEL_D)
    box(bench, 0.16, 0.42, 0.55, bx + 1.1, 0.24, bz, STEEL_D)
  }
  parent.add(sinkMesh(bench, matPave))

  // 西带：草皮 + 步道 + 4 树（衔接塔宗地西环带语言）
  const west = newSink()
  box(west, 2.3, 0.05, 19.7, -18.8, 0.03, 0, GRASS_C)
  box(west, 0.9, 0.05, 19.7, -17.6, 0.055, 0, PAVE_M)
  parent.add(sinkMesh(west, matPave))
  for (let i = 0; i < 4; i++)
    parent.add(gardenTree({ x: -18.8, z: -7.5 + i * 5, scale: 0.8, seed: 71 + i * 7 }))
}

/* ---------- 灯阵 ---------- */

function lighting(parent: THREE.Object3D): void {
  // 广场周界现代灯柱 ×8（灯头朝心）
  const lampSpots: Array<[number, number]> = [
    [-17.9, 9.2], [19.1, 9.2], [19.1, -9.2], [-17.9, -9.2],
    [19.1, 0], [-13.5, -9.2], [-6.5, -9.2], [3.0, -9.2],
  ]
  for (const [lx, lz] of lampSpots)
    parent.add(modernLamp({ x: lx, z: lz, rotY: Math.atan2(-(lz - C.z), -(lx - C.x)) }))
  // 涟漪灯阵：r9.6 整圈 ×8（最西 -18.6 界内）+ 东向弧 r12.8 ×5（|φ|≤0.75 防越 z 界）+ 南缘横排 ×4 + 东缘 ×2
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8
    parent.add(bollardLight({ x: C.x + Math.cos(a) * 9.6, z: C.z + Math.sin(a) * 9.6 }))
  }
  for (let i = 0; i < 5; i++) {
    const a = -0.75 + (1.5 * i) / 4
    parent.add(bollardLight({ x: C.x + Math.cos(a) * 12.8, z: C.z + Math.sin(a) * 12.8 }))
  }
  for (let i = 0; i < 4; i++) parent.add(bollardLight({ x: -4.5 - i * 3.2, z: -9.55 }))
  for (const bz of [-4.5, 4.5]) parent.add(bollardLight({ x: 19.4, z: bz }))
}

/* ---------- 装配 ---------- */

export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()
  const rng = ctx.rng
  paving(g)
  haloCore(g)
  waterRing(g, rng)
  colonnade(g)
  wings(g, rng)
  lighting(g)
  return g
}

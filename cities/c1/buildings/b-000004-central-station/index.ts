import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { Asm, mat4, hash01 } from '../../blocks/qwen3.8-max/asm'
import {
  archRib, vaultGlazing, ironColumn, latticeGirder, ironRailing, ridgeCresting,
  tieRod, hangingLamp, bracket, type ArchSpec, archY,
} from '../../blocks/qwen3.8-max/ironwork'
import {
  voussoirArch, oculus, cornice, balustrade, quoins, rusticatedBase, stringCourse,
  spireScales, louvre, plaque, archedWindow,
} from '../../blocks/qwen3.8-max/masonry'
import {
  trackRun, bufferStop, semaphore, locomotive, tender, carriage, luggageTrolley,
} from '../../blocks/qwen3.8-max/railway'
import { clockFace, hangingClock, departureBoard, platformSign } from '../../blocks/qwen3.8-max/clock'
import {
  paving, kerbRun, grassBed, victorianLamp, bollard, planter, flagpole, bench,
  planeTree, steps, fenceRun, waterCrane, coalStack, hydrant, manhole, wasteBin,
} from '../../blocks/qwen3.8-max/site'

const BAR = new THREE.BoxGeometry(1, 1, 1)

/* ============ 全局标高与平面控制线（局部原点＝地块中心地面，Y 向上，正立面朝 -Z 即朝向城市原点） ============ */
const G = 0.18        // 场地基准（场景草皮瓦顶 0.16 之上）
const PLAZA = 0.32    // 站前广场铺装面
const HALL = 0.8      // 站房室内地坪（三级台阶上）
const SHEDY = 0.32    // 棚内地面 / 道砟底
const PLAT = 1.2      // 站台面
const RAILTOP = SHEDY + 0.51

// 站房（head house）
const HH = { zS: -6.6, zN: -2.4, xW: -8, xE: 8, wall: 14.0, cx: 1.8 }
// 钟楼（西端，与站房正立面齐平）
const TW = { xW: -8, xE: -4.4, zS: -6.6, zN: -3.0, cx: -6.2, cz: -4.8, w: 3.6 }
// 正立面开间
const PORTAL = { x: HH.cx, w: 5.0, spring: 6.0 }
const WIN = { xw: -2.4, xe: 6.0, w: 1.9, sill: 3.2, spring: 5.5 }
const OCULI = { y: 11.4, r: 0.72, xs: [-2.4, HH.cx, 6.0] }

// 列车棚（三拱：中央高拱 + 两侧低拱）
const SHED = { zS: -2.4, zN: 8.0 }
const CENTRAL: ArchSpec = { halfSpan: 3.2, springY: 10.5, rise: 8.0 }
const SIDE: ArchSpec = { halfSpan: 2.3, springY: 10.0, rise: 4.6 }
const SIDE_CX = 5.65
const RIB_Z = [7.7, 5.6, 3.5, 1.4, -0.7, -2.2]
const TRACKS = [-5.2, 0, 5.2]

/** 棚顶轮廓高度（端屏与檩条裁剪共用） */
function shedTop(x: number): number {
  const ax = Math.abs(x)
  if (ax > 7.95) return 0
  if (ax <= 3.2) return archY(CENTRAL, x)
  if (ax <= 3.42) return 10.1
  return archY(SIDE, ax - SIDE_CX)
}

export default function build(ctx: BuildCtx): THREE.Object3D {
  const root = new THREE.Group()
  const site = new Asm({ site: true, name: 'site' })
  const body = new Asm({ name: 'headhouse' })
  const tower = new Asm({ name: 'tower' })
  const shed = new Asm({ name: 'trainshed' })
  const rail = new Asm({ name: 'railway' })
  const stock = new Asm({ name: 'rollingstock' })
  const furn = new Asm({ name: 'furniture' })

  siteWorks(site)
  headHouse(body)
  clockTower(tower)
  trainShed(shed)
  railworks(rail)
  rollingStock(stock)
  furniture(furn)

  for (const a of [site, body, tower, shed, rail, stock, furn]) {
    a.flush()
    root.add(a.root)
  }
  // 官方积木点缀（长椅/绿篱/石盆按场地需要补位）
  root.add(ctx.blocks.hedge({ w: 3.2, d: 0.8, h: 0.8, x: -6.2, z: 9.2 }))
  root.add(ctx.blocks.hedge({ w: 3.2, d: 0.8, h: 0.8, x: 6.2, z: 9.2 }))
  root.add(ctx.blocks.urn({ scale: 1.3, x: -3.1, z: -9.3 }))
  root.add(ctx.blocks.urn({ scale: 1.3, x: 3.1, z: -9.3 }))
  root.userData.name = 'b-000004 模都中央車站'
  return root
}

/* ============================== 1. 场地（退线环带全域 Site Plan） ============================== */
function siteWorks(a: Asm): void {
  // 满铺草皮至红线（地块 20×20）
  a.box('grass', 20, 0.12, 20, 0, G + 0.06, 0)
  // 站前广场（-Z 侧）：铺装 + 分缝 + 缘石 + 三级台阶
  paving(a, { x: 0, z: -9.0, w: 19.6, d: 2.0, y: PLAZA - 0.14, rows: 2, cols: 14 })
  kerbRun(a, { x: 0, z: -9.94, len: 19.6, axis: 'x', y: PLAZA - 0.14, h: 0.26 })
  steps(a, { x: HH.cx, z: HH.zS, w: 7.4, y: PLAZA, n: 3, riser: 0.16, tread: 0.36, dir: -1 })
  steps(a, { x: -6.2, z: HH.zS, w: 2.6, y: PLAZA, n: 3, riser: 0.16, tread: 0.36, dir: -1 })
  // 广场上的车行道（东端）与人行道分隔
  paving(a, { x: 6.6, z: -9.0, w: 6.4, d: 2.0, y: PLAZA - 0.1, rows: 2, cols: 5, key: 'asphalt', jointKey: 'pavingDark' })
  for (let i = 0; i < 9; i++) a.q('white', BAR, mat4(3.6 + i * 0.72, PLAZA + 0.06, -9.0, 0, 0, 0, 0.4, 0.02, 0.14))
  // 四盏维多利亚路灯 + 六护柱 + 两旗杆
  for (const x of [-8.6, -4.2, 4.2, 8.6]) victorianLamp(a, { x, z: -9.1, y: PLAZA - 0.14, h: 5.4 })
  for (let i = 0; i < 6; i++) bollard(a, { x: -1.6 + i * 0.9, z: -8.5, y: PLAZA - 0.14 })
  flagpole(a, { x: -9.0, z: -8.6, y: PLAZA - 0.14, h: 9.5, flagKey: 'signalRed' })
  flagpole(a, { x: 9.0, z: -8.6, y: PLAZA - 0.14, h: 9.5, flagKey: 'locoGreen' })
  // 两花池 + 两消防栓 + 检查井 + 垃圾箱
  planter(a, { x: -6.4, z: -8.9, w: 2.4, d: 1.0, y: PLAZA - 0.14 })
  planter(a, { x: 1.6, z: -8.9, w: 2.4, d: 1.0, y: PLAZA - 0.14 })
  hydrant(a, { x: -8.9, z: -6.0, y: G })
  hydrant(a, { x: 8.9, z: -6.0, y: G })
  manhole(a, { x: 5.4, z: -9.4, y: PLAZA - 0.12 })
  wasteBin(a, { x: -2.6, z: -8.7, y: PLAZA - 0.14 })
  wasteBin(a, { x: 5.8, z: -8.7, y: PLAZA - 0.14, rotY: 0.4 })

  // 东西两侧：草坛 + 悬铃木列 + 灯 + 长椅
  for (const sx of [-1, 1]) {
    grassBed(a, { x: sx * 9.0, z: -3.4, w: 1.8, d: 5.4, y: G, tufts: 34 })
    grassBed(a, { x: sx * 9.0, z: 4.2, w: 1.8, d: 7.0, y: G, tufts: 44 })
    for (let i = 0; i < 3; i++) {
      planeTree(a, { x: sx * 9.0, z: -5.6 + i * 3.4, y: G, scale: 0.86 + hash01(i, 3) * 0.2, seed: i * 13 + (sx > 0 ? 5 : 9), pit: false })
    }
    for (let i = 0; i < 2; i++) {
      planeTree(a, { x: sx * 9.0, z: 2.2 + i * 3.8, y: G, scale: 0.9 + hash01(i, 11) * 0.22, seed: i * 17 + (sx > 0 ? 21 : 31), pit: false })
    }
    victorianLamp(a, { x: sx * 8.6, z: -0.6, y: G, h: 4.8 })
    victorianLamp(a, { x: sx * 8.6, z: 6.4, y: G, h: 4.8 })
    bench(a, { x: sx * 8.5, z: 1.6, y: G, rotY: sx > 0 ? -Math.PI / 2 : Math.PI / 2 })
    bench(a, { x: sx * 8.5, z: -2.4, y: G, rotY: sx > 0 ? -Math.PI / 2 : Math.PI / 2 })
    fenceRun(a, { x: sx * 9.7, z: 0, len: 19.2, y: G, h: 1.2 })
  }
  // 北端（+Z，铁路后院）：碎石道 + 煤堆 + 水鹤 + 砂箱 + 栅栏
  a.box('ballast', 19.6, 0.1, 2.0, 0, G + 0.05, 9.0)
  for (let i = 0; i < 140; i++) {
    const u = hash01(i, 51), v = hash01(i, 53)
    a.q('ballast', new THREE.IcosahedronGeometry(0.1, 0), mat4((u - 0.5) * 19, G + 0.14, 8.2 + v * 1.7, u * 5, v * 5, u * 3, 0.8 + u, 0.7, 0.8 + v))
  }
  coalStack(a, { x: -5.4, z: 9.0, y: G + 0.06, w: 3.4, d: 1.5, h: 1.1 })
  waterCrane(a, { x: 5.2, z: 9.0, y: G + 0.06, h: 4.6, rotY: Math.PI })
  for (const sx of [-1, 1]) a.box('woodDark', 1.1, 0.5, 0.9, sx * 8.4, G + 0.3, 9.0)
  for (const sx of [-1, 1]) a.box('sand', 1.0, 0.12, 0.8, sx * 8.4, G + 0.6, 9.0)
  fenceRun(a, { x: 0, z: 9.86, len: 19.2, y: G, h: 1.2 })
  // 北端两树 + 灯
  planeTree(a, { x: -8.8, z: 8.9, y: G, scale: 0.8, seed: 77, pit: false })
  planeTree(a, { x: 8.8, z: 8.9, y: G, scale: 0.8, seed: 91, pit: false })
  victorianLamp(a, { x: -1.6, z: 9.2, y: G, h: 4.6 })
  victorianLamp(a, { x: 1.6, z: 9.2, y: G, h: 4.6 })
}

/* ============================== 2. 站房（砖石门厅 + 内厅） ============================== */
function headHouse(a: Asm): void {
  const zS = HH.zS
  const zN = HH.zN
  const d = zN - zS

  // 台基（粗砌石工）
  rusticatedBase(a, { w: 16, d, h: HALL - G + 0.3, x: 0, y: G, z: (zS + zN) / 2, rows: 2, perRow: 11 })
  // 正立面墙身（带门洞/窗洞/圆窗洞的挤出墙）
  const s = new THREE.Shape()
  s.moveTo(-4.4, HALL)
  s.lineTo(8, HALL)
  s.lineTo(8, HH.wall)
  s.lineTo(-4.4, HH.wall)
  s.closePath()
  const portal = new THREE.Path()
  portal.moveTo(PORTAL.x - PORTAL.w / 2, HALL)
  portal.lineTo(PORTAL.x - PORTAL.w / 2, PORTAL.spring)
  portal.absarc(PORTAL.x, PORTAL.spring, PORTAL.w / 2, Math.PI, 0, true)
  portal.lineTo(PORTAL.x + PORTAL.w / 2, HALL)
  portal.closePath()
  s.holes.push(portal)
  for (const wx of [WIN.xw, WIN.xe]) {
    const p = new THREE.Path()
    p.moveTo(wx - WIN.w / 2, WIN.sill)
    p.lineTo(wx - WIN.w / 2, WIN.spring)
    p.absarc(wx, WIN.spring, WIN.w / 2, Math.PI, 0, true)
    p.lineTo(wx + WIN.w / 2, WIN.sill)
    p.closePath()
    s.holes.push(p)
  }
  for (const ox of OCULI.xs) {
    const p = new THREE.Path()
    p.moveTo(ox + OCULI.r, OCULI.y)
    p.absarc(ox, OCULI.y, OCULI.r, 0, Math.PI * 2, false)
    s.holes.push(p)
  }
  const wall = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false, curveSegments: 16, steps: 1 })
  a.mesh(wall, 'brick', 0, 0, zS)

  // 砖砌竖带壁柱（分隔开间）+ 腰线
  for (const bx of [-4.2, -0.5, 4.1, 7.7]) {
    a.box('brickLight', 0.5, HH.wall - HALL - 1.2, 0.16, bx, (HH.wall + HALL) / 2 + 0.2, zS - 0.08)
    quoins(a, { x: bx, z: zS - 0.1, y0: HALL, y1: HH.wall - 1.0, axis: 'z', d: 0.22, n: 16, key: 'brickLight' })
  }
  stringCourse(a, { len: 12.4, x: 1.8, y: 9.9, z: zS - 0.06, axis: 'x', proj: 0.2, sign: -1, key: 'stone' })
  stringCourse(a, { len: 12.4, x: 1.8, y: 2.9, z: zS - 0.06, axis: 'x', proj: 0.16, sign: -1, key: 'stoneDark' })

  // 正门：券石 + 拱心石 + 门套线 + 双扇铆钉门 + 门环 + 门槛 + 上方铭牌
  voussoirArch(a, {
    x: PORTAL.x, ySpring: PORTAL.spring, z: zS - 0.06, r: PORTAL.w / 2, rIn: PORTAL.w / 2 - 0.04,
    stones: 15, depth: 0.56, key: 'stone', reveal: 0.26,
  })
  for (const sx of [-1, 1]) {
    a.box('stone', 0.56, PORTAL.spring - HALL, 0.62, PORTAL.x + sx * (PORTAL.w / 2 + 0.28), (PORTAL.spring + HALL) / 2, zS - 0.06)
    a.box('stoneDark', 0.7, 0.22, 0.76, PORTAL.x + sx * (PORTAL.w / 2 + 0.28), PORTAL.spring - 0.1, zS - 0.06)
    a.box('stone', 0.62, 0.5, 0.68, PORTAL.x + sx * (PORTAL.w / 2 + 0.28), HALL + 0.25, zS - 0.06)
  }
  a.box('stoneDark', PORTAL.w + 1.2, 0.16, 0.8, PORTAL.x, HALL + 0.08, zS - 0.1)
  for (const sx of [-1, 1]) {
    a.box('woodDark', PORTAL.w / 2 - 0.1, PORTAL.spring - HALL - 0.1, 0.14, PORTAL.x + sx * PORTAL.w / 4, (PORTAL.spring + HALL) / 2 - 0.05, zS - 0.2)
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 4; c++) {
        a.q('gold', new THREE.SphereGeometry(0.07, 6, 5), mat4(
          PORTAL.x + sx * (0.45 + c * 0.52), 1.6 + r * 0.85, zS - 0.3))
      }
    }
    a.q('iron', BAR, mat4(PORTAL.x + sx * 0.3, (PORTAL.spring + HALL) / 2, zS - 0.3, 0, 0, 0, 0.1, 0.9, 0.08))
    a.q('gold', new THREE.TorusGeometry(0.22, 0.045, 6, 14), mat4(PORTAL.x + sx * 0.3, (PORTAL.spring + HALL) / 2 - 0.1, zS - 0.36))
    a.q('iron', BAR, mat4(PORTAL.x + sx * (PORTAL.w / 4), PORTAL.spring + 0.5, zS - 0.3, 0, 0, 0, PORTAL.w / 2 - 0.2, 0.08, 0.06))
  }
  // 门楣上的扇形亮子（放射铁棂 + 玻璃）
  a.q('glassDeep', new THREE.CircleGeometry(PORTAL.w / 2 - 0.12, 20, 0, Math.PI), mat4(PORTAL.x, PORTAL.spring, zS - 0.34))
  for (let i = 0; i <= 10; i++) {
    const t = Math.PI - (Math.PI * i) / 10
    a.q('iron', BAR, mat4(PORTAL.x + Math.cos(t) * (PORTAL.w / 4 - 0.06), PORTAL.spring + Math.sin(t) * (PORTAL.w / 4 - 0.06), zS - 0.3,
      0, 0, t, PORTAL.w / 2 - 0.2, 0.06, 0.07))
  }
  for (const rr of [1.0, 1.7]) {
    for (let i = 0; i < 12; i++) {
      const t = Math.PI - (Math.PI * i) / 11
      a.q('iron', BAR, mat4(PORTAL.x + Math.cos(t) * rr, PORTAL.spring + Math.sin(t) * rr, zS - 0.3,
        0, 0, t + Math.PI / 2, 0.055, 0.05, rr * 0.3))
    }
  }
  a.q('gold', new THREE.CylinderGeometry(0.2, 0.2, 0.12, 12), mat4(PORTAL.x, PORTAL.spring, zS - 0.3, Math.PI / 2, 0, 0))
  plaque(a, { w: 3.6, h: 1.1, x: PORTAL.x, y: 9.05, z: zS - 0.2, rows: 2, cols: 8 })

  // 两樘拱窗 + 三圆窗
  for (const wx of [WIN.xw, WIN.xe]) {
    archedWindow(a, { w: WIN.w, h: WIN.spring + WIN.w / 2 - WIN.sill, x: wx, y: WIN.sill, z: zS - 0.04, voussoirs: 11 })
  }
  for (const ox of OCULI.xs) oculus(a, { x: ox, y: OCULI.y, z: zS - 0.04, r: OCULI.r, spokes: 8 })

  // 檐口 + 女儿墙石栏杆 + 石盆
  cornice(a, { len: 12.6, x: 1.7, y: HH.wall, z: zS - 0.1, axis: 'x', proj: 0.66, sign: -1, modillions: 11 })
  a.box('stone', 12.6, 0.2, 0.7, 1.7, HH.wall + 1.3, zS - 0.2)
  balustrade(a, { len: 12.2, x: 1.7, y: HH.wall + 1.4, z: zS - 0.24, axis: 'x', h: 1.0, n: 26, urn: true, pierEvery: 6 })
  // 东西山墙
  a.box('brick', 0.5, HH.wall - HALL, d, 7.75, (HH.wall + HALL) / 2, (zS + zN) / 2)
  quoins(a, { x: 7.9, z: (zS + zN) / 2, y0: HALL, y1: HH.wall, axis: 'z', d: 0.3, n: 14 })
  for (const wz of [-5.6, -3.6]) {
    archedWindow(a, { w: 1.3, h: 3.4, x: 8.02, y: 4.4, z: wz, ry: Math.PI / 2, voussoirs: 9 })
  }
  stringCourse(a, { len: d, x: 8.02, y: 9.9, z: (zS + zN) / 2, axis: 'z', proj: 0.18, sign: 1, key: 'stone' })
  cornice(a, { len: d + 0.4, x: 8.0, y: HH.wall, z: (zS + zN) / 2, axis: 'z', proj: 0.5, sign: 1, modillions: 4 })
  // 北墙（朝列车棚）：砖墙 + 三盲拱 + 腰线 + 站台层门洞
  a.box('brick', 16, HH.wall - HALL, 0.5, 0, (HH.wall + HALL) / 2, zN + 0.25)
  for (const tx of TRACKS) {
    voussoirArch(a, { x: tx, ySpring: 6.4, z: zN + 0.52, r: 1.5, rIn: 1.46, stones: 11, depth: 0.3, key: 'stoneDark', reveal: 0.16, keystone: false })
    a.q('brickDark', BAR, mat4(tx, 4.6, zN + 0.54, 0, 0, 0, 2.6, 3.4, 0.08))
    a.box('stone', 3.2, 0.18, 0.34, tx, 2.86, zN + 0.56)
  }
  stringCourse(a, { len: 16, x: 0, y: 8.6, z: zN + 0.5, axis: 'x', proj: 0.18, sign: 1, key: 'stoneDark' })
  for (const dx of [-6.6, 6.6]) {
    a.box('woodDark', 1.1, 2.2, 0.12, dx, HALL + 1.1, zN + 0.54)
    a.q('iron', BAR, mat4(dx + 0.4, HALL + 1.1, zN + 0.62, 0, 0, 0, 0.06, 0.3, 0.06))
    a.box('stone', 1.4, 0.16, 0.3, dx, HALL - 0.02, zN + 0.6)
  }

  // 屋面：屋面板 + 双坡 + 铅泛水 + 东端大烟囱 + 通风塔
  a.box('stoneDark', 12.2, 0.3, d - 0.2, 1.7, HH.wall + 0.15, (zS + zN) / 2)
  for (const sz of [-1, 1]) {
    a.box('patina', 12.0, 0.16, 2.5, 1.7, HH.wall + 0.9, (zS + zN) / 2 + sz * 1.0, sz * -0.42, 0, 0)
  }
  a.box('patinaLight', 12.0, 0.2, 0.4, 1.7, HH.wall + 1.5, (zS + zN) / 2)
  for (let i = 0; i < 22; i++) a.q('patina', BAR, mat4(-4.2 + i * 0.58, HH.wall + 1.62, (zS + zN) / 2, 0, 0, 0, 0.5, 0.06, 0.44))
  // 大烟囱（东侧，穿出侧拱之上）
  const ch = a.sub(6.6, HH.wall + 0.3, -4.6)
  ch.box('brick', 1.3, 4.6, 1.3, 0, 2.3, 0)
  quoins(ch, { x: -0.66, z: 0, y0: 0.2, y1: 4.4, axis: 'z', d: 0.26, n: 8 })
  quoins(ch, { x: 0.66, z: 0, y0: 0.2, y1: 4.4, axis: 'z', d: 0.26, n: 8 })
  stringCourse(ch, { len: 1.3, x: 0, y: 2.2, z: -0.66, axis: 'x', proj: 0.14, sign: -1, key: 'stoneDark' })
  ch.box('stone', 1.6, 0.24, 1.6, 0, 4.7, 0)
  ch.box('stoneDark', 1.44, 0.5, 1.44, 0, 5.06, 0)
  for (const dx of [-0.34, 0.34]) for (const dz of [-0.34, 0.34]) {
    ch.cyl('brickDark', 0.2, 0.22, 0.7, 10, dx, 5.6, dz)
    ch.cyl('stoneDark', 0.24, 0.24, 0.1, 10, dx, 5.98, dz)
  }
  ch.flush()
  // 八边形通风塔
  const vt = a.sub(4.6, HH.wall + 0.3, -5.2)
  vt.cyl('stone', 0.62, 0.68, 1.5, 8, 0, 0.75, 0)
  for (let i = 0; i < 8; i++) {
    const t = (Math.PI * 2 * i) / 8
    vt.q('ironDark', BAR, mat4(Math.cos(t) * 0.6, 0.9, Math.sin(t) * 0.6, 0, -t, 0, 0.34, 0.9, 0.06))
  }
  vt.cyl('patina', 0.05, 0.78, 0.66, 8, 0, 1.8, 0)
  vt.sph('gold', 0.1, 8, 6, 0, 2.18, 0)
  vt.flush()

  // 内厅：地坪铺装 + 桶形拱顶 + 藻井 + 售票亭 + 排队栏 + 长椅 + 吊灯 + 挂钟
  paving(a, { x: 1.8, z: (zS + zN) / 2 + 0.2, w: 11.6, d: 3.4, y: HALL, rows: 3, cols: 9 })
  a.box('stoneDark', 11.6, 0.16, 0.3, 1.8, HALL + 0.08, zS + 0.7)
  const vaultR = 2.1
  const vault = new THREE.CylinderGeometry(vaultR, vaultR, 11.4, 18, 1, true, -Math.asin(1.9 / vaultR), Math.asin(1.9 / vaultR) * 2)
  a.mesh(vault, 'chalk', 1.8, HH.wall - 0.5 - vaultR * Math.cos(Math.asin(1.9 / vaultR)), (zS + zN) / 2 + 0.2, -Math.PI / 2, 0, 0)
  for (let i = 0; i < 9; i++) {
    a.q('stone', BAR, mat4(-3.6 + i * 1.35, HH.wall - 0.55, (zS + zN) / 2 + 0.2, 0, 0, 0, 0.16, 0.1, 3.9))
  }
  for (let i = 0; i < 5; i++) {
    a.q('goldPale', BAR, mat4(1.8, HH.wall - 0.62, zS + 0.9 + i * 0.7, 0, 0, 0, 11.2, 0.05, 0.06))
  }
  // 内墙面：壁柱 + 挂镜线 + 踢脚
  for (const bx of [-3.6, -0.4, 4.0, 7.2]) {
    a.box('stone', 0.4, HH.wall - HALL - 1.6, 0.2, bx, (HH.wall + HALL) / 2, zS + 0.62)
    a.box('stoneDark', 0.56, 0.2, 0.3, bx, HH.wall - 1.2, zS + 0.66)
  }
  a.box('stoneDark', 11.6, 0.24, 0.1, 1.8, HALL + 0.12, zS + 0.56)
  a.box('stone', 11.6, 0.12, 0.14, 1.8, 2.9, zS + 0.58)
  // 售票亭（东端）：木柜 + 铜格栅 + 拱口 + 台面 + 牌号
  const bk = a.sub(5.6, HALL, zN - 0.8)
  bk.box('wood', 4.4, 2.6, 0.9, 0, 1.3, 0)
  bk.box('woodDark', 4.6, 0.14, 1.1, 0, 2.66, 0)
  bk.box('gold', 4.66, 0.05, 1.14, 0, 2.75, 0)
  for (let i = 0; i < 3; i++) {
    bk.box('woodDark', 1.1, 1.0, 0.1, -1.4 + i * 1.4, 1.9, -0.46)
    bk.q('gold', BAR, mat4(-1.4 + i * 1.4, 1.9, -0.52, 0, 0, 0, 1.0, 0.9, 0.04))
    for (let k = 0; k < 7; k++) bk.q('gold', BAR, mat4(-1.4 + i * 1.4, 1.5 + k * 0.13, -0.54, 0, 0, 0, 0.96, 0.035, 0.035))
    for (let k = 0; k < 5; k++) bk.q('gold', BAR, mat4(-1.84 + i * 1.4 + k * 0.22, 1.9, -0.54, 0, 0, 0, 0.035, 0.94, 0.035))
    bk.q('gold', new THREE.TorusGeometry(0.5, 0.04, 6, 14, Math.PI), mat4(-1.4 + i * 1.4, 2.4, -0.52))
  }
  bk.box('wood', 4.4, 0.5, 0.86, 0, 0.25, 0)
  for (let i = 0; i < 8; i++) bk.q('woodDark', BAR, mat4(-1.9 + i * 0.54, 0.85, -0.46, 0, 0, 0, 0.4, 0.5, 0.06))
  plaque(bk, { w: 1.6, h: 0.4, x: 0, y: 3.0, z: -0.5, rows: 1, cols: 6 })
  bk.flush()
  // 排队铜栏 + 长椅 + 行李车 + 吊灯 + 北墙挂钟（面向内厅）
  for (let i = 0; i < 5; i++) {
    a.cyl('gold', 0.05, 0.07, 0.9, 8, 3.4 + i * 0.9, HALL + 0.45, zN - 1.9)
    a.cyl('gold', 0.12, 0.14, 0.08, 10, 3.4 + i * 0.9, HALL + 0.04, zN - 1.9)
    a.sph('gold', 0.07, 8, 6, 3.4 + i * 0.9, HALL + 0.92, zN - 1.9)
    if (i < 4) a.cyl('gold', 0.02, 0.02, 0.9, 6, 3.85 + i * 0.9, HALL + 0.78, zN - 1.9, 0, 0, Math.PI / 2)
  }
  for (const bx of [-2.6, -0.6]) bench(a, { x: bx, z: zN - 1.0, y: HALL, rotY: Math.PI, len: 1.8 })
  luggageTrolley(a, { x: -3.2, z: zS + 1.2, y: HALL, rotY: 0.6, boxes: 3 })
  luggageTrolley(a, { x: 7.0, z: zS + 1.4, y: HALL, rotY: -0.4, boxes: 2 })
  for (const lx of [-1.6, 1.8, 5.2]) hangingLamp(a, { x: lx, y: HH.wall - 1.0, z: (zS + zN) / 2 + 0.2, drop: 2.2, scale: 1.1 })
  clockFace(a, { x: 1.8, y: 10.4, z: zN + 0.3, r: 1.1, ry: Math.PI, hour: 10, minute: 10, caseKey: 'woodDark' })
  a.box('woodDark', 0.2, 2.4, 0.2, 1.8, 9.0, zN + 0.34)
  // 内厅东侧行李房与西侧问询处隔断
  for (const gx of [-1.2, 6.9]) {
    a.box('wood', 0.12, 3.0, 2.4, gx, HALL + 1.5, zN - 1.4)
    for (let i = 0; i < 5; i++) a.q('glass', BAR, mat4(gx, HALL + 2.2, zN - 2.4 + i * 0.5, 0, 0, 0, 0.04, 0.7, 0.4))
    a.box('woodDark', 0.2, 0.16, 2.5, gx, HALL + 3.06, zN - 1.4)
  }
}

/* ============================== 3. 钟楼（砖身 + 钟层 + 铜绿鱼鳞尖顶） ============================== */
function clockTower(a: Asm): void {
  const cx = TW.cx
  const cz = TW.cz
  const w = TW.w
  const shaftTop = 33.0
  const clockTop = 39.4

  // 塔基（与站房台基连续的粗砌石工）
  rusticatedBase(a, { w: w + 0.2, d: w + 0.2, h: HALL - G + 0.4, x: cx, y: G, z: cz, rows: 2, perRow: 3 })
  // 塔身砖砌（四壁）
  for (const [wx, wz, ww, dd] of [
    [cx, TW.zS + 0.25, w, 0.5], [cx, TW.zN - 0.25, w, 0.5],
    [TW.xW + 0.25, cz, 0.5, w - 1.0], [TW.xE - 0.25, cz, 0.5, w - 1.0],
  ] as const) {
    a.box('brick', ww, shaftTop - HALL, dd, wx, (shaftTop + HALL) / 2, wz)
  }
  // 四角隅石 + 三道腰线
  for (const [qx, qz] of [[TW.xW, TW.zS], [TW.xE, TW.zS], [TW.xW, TW.zN], [TW.xE, TW.zN]] as const) {
    quoins(a, { x: qx, z: qz, y0: HALL, y1: shaftTop, axis: 'x', d: 0.5, n: 22 })
  }
  for (const yy of [8.0, 17.0, 26.0]) {
    for (const sz of [-1, 1]) stringCourse(a, { len: w, x: cx, y: yy, z: cz + sz * (w / 2), axis: 'x', proj: 0.22, sign: sz as 1 | -1, key: 'stone' })
    for (const sx of [-1, 1]) stringCourse(a, { len: w, x: cx + sx * (w / 2), y: yy, z: cz, axis: 'z', proj: 0.22, sign: sx as 1 | -1, key: 'stone' })
  }
  // 塔身狭长百叶窗（每面每段两樘）
  for (const sz of [-1, 1]) {
    for (const yy of [9.4, 18.4, 27.2]) {
      for (const dx of [-0.72, 0.72]) {
        louvre(a, { w: 0.62, h: 2.5, x: cx + dx, y: yy, z: cz + sz * (w / 2 + 0.02), ry: sz > 0 ? 0 : Math.PI, slats: 10 })
      }
    }
  }
  for (const sx of [-1, 1]) {
    for (const yy of [9.4, 18.4, 27.2]) {
      for (const dz of [-0.72, 0.72]) {
        louvre(a, { w: 0.62, h: 2.5, x: cx + sx * (w / 2 + 0.02), y: yy, z: cz + dz, ry: sx > 0 ? Math.PI / 2 : -Math.PI / 2, slats: 10 })
      }
    }
  }
  // 钟层：石砌 + 四向大钟 + 角柱 + 小栏杆阳台
  a.box('stone', w + 0.36, 0.3, w + 0.36, cx, shaftTop + 0.15, cz)
  for (const [wx, wz, ww, dd] of [
    [cx, TW.zS + 0.1, w + 0.2, 0.42], [cx, TW.zN - 0.1, w + 0.2, 0.42],
    [TW.xW + 0.1, cz, 0.42, w - 0.2], [TW.xE - 0.1, cz, 0.42, w - 0.2],
  ] as const) {
    a.box('stoneWarm', ww, clockTop - shaftTop - 0.3, dd, wx, (clockTop + shaftTop) / 2, wz)
  }
  for (const [qx, qz] of [[TW.xW, TW.zS], [TW.xE, TW.zS], [TW.xW, TW.zN], [TW.xE, TW.zN]] as const) {
    a.box('stone', 0.5, clockTop - shaftTop, 0.5, qx, (clockTop + shaftTop) / 2, qz)
    a.box('stoneDark', 0.62, 0.16, 0.62, qx, clockTop - 0.2, qz)
    a.sph('stone', 0.2, 8, 6, qx, clockTop + 0.05, qz)
  }
  for (let f = 0; f < 4; f++) {
    const ry = (Math.PI * f) / 2
    const nx = Math.sin(ry)
    const nz = Math.cos(ry)
    clockFace(a, {
      x: cx + nx * (w / 2 + 0.12), y: shaftTop + 3.2, z: cz + nz * (w / 2 + 0.12),
      r: 1.28, ry, hour: 10, minute: 10, caseKey: 'stone', ringKey: 'gold',
    })
  }
  for (const sz of [-1, 1]) {
    for (const sx of [-1, 1]) {
      a.box('stone', 0.34, 0.9, 0.34, cx + sx * 1.0, shaftTop + 0.75, cz + sz * (w / 2 + 0.02))
    }
  }
  // 钟层檐口 + 栏杆 + 尖顶基座
  cornice(a, { len: w + 0.9, x: cx, y: clockTop, z: TW.zS - 0.2, axis: 'x', proj: 0.6, sign: -1, modillions: 4 })
  cornice(a, { len: w + 0.9, x: cx, y: clockTop, z: TW.zN + 0.2, axis: 'x', proj: 0.6, sign: 1, modillions: 4 })
  cornice(a, { len: w + 0.5, x: TW.xW - 0.2, y: clockTop, z: cz, axis: 'z', proj: 0.6, sign: -1, modillions: 4 })
  cornice(a, { len: w + 0.5, x: TW.xE + 0.2, y: clockTop, z: cz, axis: 'z', proj: 0.6, sign: 1, modillions: 4 })
  a.box('stoneDark', w + 0.5, 0.24, w + 0.5, cx, clockTop + 1.4, cz)
  for (const sz of [-1, 1]) {
    balustrade(a, { len: w + 0.2, x: cx, y: clockTop + 1.52, z: cz + sz * (w / 2 + 0.1), axis: 'x', h: 0.8, n: 8, urn: true, pierEvery: 4 })
  }
  for (const sx of [-1, 1]) {
    balustrade(a, { len: w + 0.2, x: cx + sx * (w / 2 + 0.1), y: clockTop + 1.52, z: cz, axis: 'z', h: 0.8, n: 8, urn: true, pierEvery: 4 })
  }
  // 尖顶：铜绿鱼鳞瓦四坡 + 四角小尖塔 + 顶饰与风向标
  const spireBase = clockTop + 2.3
  a.box('stone', w + 0.3, 0.7, w + 0.3, cx, spireBase - 0.35, cz)
  a.box('patinaLight', w + 0.1, 0.16, w + 0.1, cx, spireBase + 0.08, cz)
  const spireTop = 47.8
  const core = new THREE.CylinderGeometry(0.02, w * 0.72, spireTop - spireBase, 4, 1, false)
  a.mesh(core, 'patina', cx, spireBase + (spireTop - spireBase) / 2, cz, 0, Math.PI / 4, 0)
  spireScales(a, { w: w * 0.72, y0: spireBase + 0.1, y1: spireTop - 0.2, x: cx, z: cz, rowH: 0.3, scaleW: 0.32, faces: 4, eave: true })
  for (let f = 0; f < 4; f++) {
    const ry = (Math.PI * f) / 2 + Math.PI / 4
    const ex = cx + Math.sin(ry) * w * 0.62
    const ez = cz + Math.cos(ry) * w * 0.62
    a.box('stone', 0.4, 1.1, 0.4, ex, spireBase + 0.5, ez)
    a.cyl('patina', 0.02, 0.3, 1.0, 8, ex, spireBase + 1.5, ez)
    a.sph('gold', 0.1, 8, 6, ex, spireBase + 2.06, ez)
    a.cyl('gold', 0.03, 0.03, 0.3, 6, ex, spireBase + 2.28, ez)
  }
  // 顶饰：宝珠 + 尖针 + 风向标（罗盘十字 + 箭）
  a.cyl('gold', 0.16, 0.22, 0.4, 10, cx, spireTop + 0.1, cz)
  a.sph('gold', 0.26, 12, 10, cx, spireTop + 0.44, cz)
  a.sph('gold', 0.16, 10, 8, cx, spireTop + 0.82, cz)
  a.cyl('gold', 0.045, 0.045, 1.0, 8, cx, spireTop + 1.4, cz)
  const van = a.sub(cx, spireTop + 1.95, cz, 0, 0.6, 0)
  for (let i = 0; i < 4; i++) {
    const t = (Math.PI * i) / 2
    van.q('gold', BAR, mat4(Math.sin(t) * 0.42, 0, Math.cos(t) * 0.42, 0, -t, 0, 0.05, 0.05, 0.8))
    van.q('gold', new THREE.ConeGeometry(0.1, 0.26, 4), mat4(Math.sin(t) * 0.86, 0, Math.cos(t) * 0.86, 0, 0, -t + Math.PI / 2))
  }
  van.box('gold', 1.5, 0.05, 0.05, 0, 0.28, 0)
  van.q('gold', new THREE.ConeGeometry(0.16, 0.5, 4), mat4(0.9, 0.28, 0, 0, 0, -Math.PI / 2))
  van.q('gold', BAR, mat4(-0.6, 0.28, 0, 0, 0, 0, 0.5, 0.34, 0.04))
  van.sph('gold', 0.09, 8, 6, 0, 0.28, 0)
  van.flush()
}

/* ============================== 4. 列车棚（三拱钢玻璃棚） ============================== */
function trainShed(a: Asm): void {
  // 中央高拱：六榀双片桁架肋
  for (const z of RIB_Z) archRib(a, { ...CENTRAL, z, bays: 10, depth: 0.34, twin: true })
  // 两侧低拱：单片桁架肋
  for (const sx of [-1, 1]) {
    const w = a.sub(sx * SIDE_CX, 0, 0)
    for (const z of RIB_Z) archRib(w, { ...SIDE, z, bays: 6, depth: 0.26, twin: false })
    w.flush()
  }
  // 玻璃屋面 + 檩条 + 压条网格
  vaultGlazing(a, { spec: CENTRAL, z0: SHED.zS + 0.1, z1: SHED.zN - 0.2, ribZs: RIB_Z, segs: 12, subArc: 3, subZ: 5 })
  for (const sx of [-1, 1]) {
    const w = a.sub(sx * SIDE_CX, 0, 0)
    vaultGlazing(w, { spec: SIDE, z0: SHED.zS + 0.1, z1: SHED.zN - 0.2, ribZs: RIB_Z, segs: 8, subArc: 3, subZ: 5 })
    w.flush()
  }
  // 脊饰 + 天沟 + 拉杆
  ridgeCresting(a, { x: 0, y: archY(CENTRAL, 0), z0: SHED.zS + 0.2, z1: SHED.zN - 0.3, pitch: 0.9 })
  for (const sx of [-1, 1]) {
    ridgeCresting(a, { x: sx * SIDE_CX, y: archY(SIDE, 0), z0: SHED.zS + 0.2, z1: SHED.zN - 0.3, pitch: 1.1 })
    a.box('iron', 0.34, 0.2, SHED.zN - SHED.zS - 0.4, sx * 3.3, 10.0, (SHED.zS + SHED.zN) / 2)
    a.box('patinaLight', 0.44, 0.06, SHED.zN - SHED.zS - 0.4, sx * 3.3, 10.12, (SHED.zS + SHED.zN) / 2)
    for (let i = 0; i < 7; i++) {
      a.q('iron', BAR, mat4(sx * 3.3, 9.86, SHED.zS + 0.6 + i * 1.5, 0, 0, 0, 0.3, 0.05, 0.12))
      a.cyl('iron', 0.06, 0.06, 0.5, 8, sx * 3.44, 9.7, SHED.zS + 1.2 + i * 1.5)
    }
  }
  for (const z of [6.6, 2.4, -1.6]) {
    tieRod(a, { x0: -7.6, x1: 7.6, y: 9.7, z })
  }
  // 铸铁柱阵：天沟柱 + 檐柱
  for (const z of [7.4, 5.3, 3.2, 1.1, -1.0]) {
    for (const sx of [-1, 1]) {
      ironColumn(a, { x: sx * 3.35, z, y0: PLAT, h: 10.0 - PLAT, r: 0.26, rings: 3 })
      ironColumn(a, { x: sx * 7.62, z, y0: SHEDY, h: 10.0 - SHEDY, r: 0.24, rings: 2 })
    }
  }
  // 侧墙（砖 + 扶壁 + 拱形通风口 + 压顶）
  for (const sx of [-1, 1]) {
    const x = sx * 7.95
    a.box('brick', 0.5, 10.0, SHED.zN - SHED.zS, x - sx * 0.25, 5.0, (SHED.zS + SHED.zN) / 2)
    a.box('stoneDark', 0.62, 0.3, SHED.zN - SHED.zS + 0.1, x - sx * 0.28, 0.15, (SHED.zS + SHED.zN) / 2)
    for (const z of [7.4, 5.3, 3.2, 1.1, -1.0]) {
      a.box('brickDark', 0.7, 10.0, 0.7, x - sx * 0.6, 5.0, z)
      a.box('stone', 0.86, 0.24, 0.86, x - sx * 0.6, 10.1, z)
      a.box('stone', 0.7, 0.5, 0.7, x - sx * 0.6, 10.4, z)
      a.q('stone', new THREE.ConeGeometry(0.24, 0.5, 4), mat4(x - sx * 0.6, 10.9, z, 0, Math.PI / 4, 0))
    }
    for (const z of [6.4, 4.3, 2.2, 0.1, -1.9]) {
      louvre(a, { w: 1.1, h: 1.8, x: x - sx * 0.02, y: 6.4, z, ry: sx > 0 ? Math.PI / 2 : -Math.PI / 2, slats: 8 })
      a.box('stoneDark', 1.5, 0.16, 0.2, x - sx * 0.04, 6.2, z)
    }
    stringCourse(a, { len: SHED.zN - SHED.zS, x: x - sx * 0.02, y: 9.6, z: (SHED.zS + SHED.zN) / 2, axis: 'z', proj: 0.2, sign: -sx as 1 | -1, key: 'stone' })
    a.box('stone', 0.7, 0.22, SHED.zN - SHED.zS, x - sx * 0.3, 10.12, (SHED.zS + SHED.zN) / 2)
  }
  // 北端铁玻璃端屏：轮廓随三拱 + 三券门洞 + 竖横压条网格 + 玻璃
  endScreen(a)
  // 南端（站房北墙之上）封山玻璃 + 大扇形亮子
  a.box('ironDark', 16, 0.4, 0.2, 0, 9.8, SHED.zS + 0.1)
  for (const tx of TRACKS) {
    voussoirArch(a, { x: tx, ySpring: 7.4, z: SHED.zS + 0.2, r: 1.3, rIn: 1.26, stones: 9, depth: 0.24, key: 'iron', reveal: 0.12, keystone: false })
  }
}

/** 北端屏墙：下段砖石（三券门洞）+ 上段随拱轮廓的铁玻璃幕墙 */
function endScreen(a: Asm): void {
  const z = SHED.zN - 0.05
  const low = 6.6
  // 下段：带三个拱洞的墙
  const s = new THREE.Shape()
  s.moveTo(-7.95, 0)
  s.lineTo(7.95, 0)
  s.lineTo(7.95, low)
  s.lineTo(-7.95, low)
  s.closePath()
  for (const tx of TRACKS) {
    const p = new THREE.Path()
    p.moveTo(tx - 1.8, 0)
    p.lineTo(tx - 1.8, 3.6)
    p.absarc(tx, 3.6, 1.8, Math.PI, 0, true)
    p.lineTo(tx + 1.8, 0)
    p.closePath()
    s.holes.push(p)
  }
  const wallGeo = new THREE.ExtrudeGeometry(s, { depth: 0.42, bevelEnabled: false, curveSegments: 14, steps: 1 })
  a.mesh(wallGeo, 'brickDark', 0, 0, z - 0.21)
  for (const tx of TRACKS) {
    voussoirArch(a, { x: tx, ySpring: 3.6, z: z - 0.24, r: 1.8, rIn: 1.76, stones: 13, depth: 0.5, key: 'stone', reveal: 0.22 })
    a.box('stoneDark', 4.0, 0.2, 0.5, tx, 0.1, z - 0.24)
  }
  a.box('stone', 16, 0.28, 0.62, 0, low + 0.14, z - 0.24)
  for (let i = 0; i < 32; i++) {
    a.q('stoneDark', BAR, mat4(-7.7 + i * 0.5, low - 0.16, z - 0.5, 0, 0, 0, 0.2, 0.3, 0.12))
  }
  // 上段：随拱轮廓的铁玻璃幕墙
  const xs: number[] = []
  for (let i = 0; i <= 24; i++) xs.push(-7.8 + (15.6 * i) / 24)
  for (const x of xs) {
    const yt = shedTop(x)
    if (yt <= low + 0.5) continue
    a.q('iron', BAR, mat4(x, (low + 0.4 + yt - 0.14) / 2, z - 0.1, 0, 0, 0, 0.1, yt - low - 0.54, 0.14))
  }
  for (let j = 0; j < 14; j++) {
    const yy = low + 0.7 + j * 0.9
    let run0: number | null = null
    for (let i = 0; i <= xs.length; i++) {
      const x = i < xs.length ? xs[i] : 99
      const ok = i < xs.length && shedTop(x) > yy + 0.12
      if (ok && run0 === null) run0 = x
      if ((!ok || i === xs.length) && run0 !== null) {
        const prev = xs[i - 1]
        if (prev - run0 > 0.4) a.q('iron', BAR, mat4((run0 + prev) / 2, yy, z - 0.1, 0, 0, 0, prev - run0, 0.1, 0.14))
        run0 = null
      }
    }
    if (yy > 18.6) break
  }
  // 玻璃片（逐格填充）
  for (let i = 0; i < xs.length - 1; i++) {
    const xm = (xs[i] + xs[i + 1]) / 2
    const yt = shedTop(xm)
    if (yt <= low + 0.6) continue
    for (let j = 0; j < 14; j++) {
      const y0 = low + 0.7 + j * 0.9
      if (y0 + 0.8 > yt - 0.1) break
      a.q('glass', BAR, mat4(xm, y0 + 0.4, z - 0.1, 0, 0, 0, xs[i + 1] - xs[i] - 0.1, 0.76, 0.05))
    }
  }
  // 端屏外框与三拱脊端饰
  for (const sx of [-1, 1]) a.box('iron', 0.34, low + 3.6, 0.34, sx * 7.78, (low + 3.6) / 2, z - 0.1)
  a.box('iron', 0.3, 0.3, 0.3, 0, archY(CENTRAL, 0) - 0.2, z - 0.1)
  for (const tx of TRACKS) {
    voussoirArch(a, { x: tx, ySpring: low + 0.3, z: z - 0.12, r: 1.5, rIn: 1.46, stones: 11, depth: 0.26, key: 'iron', reveal: 0.14, keystone: false })
  }
  a.q('gold', new THREE.ConeGeometry(0.2, 0.6, 4), mat4(0, archY(CENTRAL, 0) + 0.3, z - 0.1))
}

/* ============================== 5. 轨道 · 站台 · 天桥 · 信号 ============================== */
function railworks(a: Asm): void {
  // 棚内地面
  a.box('pavingDark', 15.6, 0.14, SHED.zN - SHED.zS, 0, SHEDY - 0.07, (SHED.zS + SHED.zN) / 2)
  for (let i = 0; i < 24; i++) {
    a.q('asphalt', BAR, mat4(-7.4 + i * 0.65, SHEDY + 0.01, (SHED.zS + SHED.zN) / 2, 0, 0, 0, 0.06, 0.02, SHED.zN - SHED.zS))
  }
  // 三股道
  for (const tx of TRACKS) trackRun(a, { x: tx, z0: -1.2, z1: SHED.zN - 0.15, y: SHEDY })
  for (const tx of TRACKS) bufferStop(a, { x: tx, z: -1.4, y: SHEDY })
  // 岛式站台 ×2 + 侧站台 ×2
  for (const sx of [-1, 1]) {
    platform(a, sx * 2.6, 2.6, sx)
  }
  platform(a, -7.2, 1.4, -1)
  platform(a, 7.2, 1.4, 1)
  // 天桥
  footbridge(a)
  // 信号机
  semaphore(a, { x: -6.5, z: 6.6, y: PLAT, h: 4.2, armUp: true })
  semaphore(a, { x: 6.5, z: 6.6, y: PLAT, h: 4.2, armUp: false })
  semaphore(a, { x: 1.5, z: 7.3, y: SHEDY, h: 5.2, armUp: true })
  // 站台端部栏杆与栅门
  for (const sx of [-1, 1]) {
    const g = a.sub(sx * 2.6, PLAT, -1.9)
    ironRailing(g, { len: 2.4, h: 1.05, pitch: 0.15 })
    g.flush()
  }
}

/** 站台：砌体 + 压顶石 + 盲道白线 + 端部斜坡 + 边缘铸铁护条 */
function platform(a: Asm, cx: number, w: number, side: -1 | 0 | 1): void {
  const z0 = -1.9
  const z1 = 7.2
  const len = z1 - z0
  const zc = (z0 + z1) / 2
  a.box('brickDark', w, PLAT - SHEDY - 0.1, len, cx, SHEDY + (PLAT - SHEDY) / 2, zc)
  a.box('stone', w + 0.1, 0.16, len, cx, PLAT - 0.08, zc)
  for (let i = 0; i < Math.round(len / 1.2); i++) {
    const zz = z0 + 0.6 + i * 1.2
    a.q('stoneDark', BAR, mat4(cx, PLAT + 0.01, zz, 0, 0, 0, w + 0.12, 0.02, 0.08))
    if (i % 2 === 0) a.q('paving', BAR, mat4(cx, PLAT + 0.005, zz, 0, 0, 0, w - 0.3, 0.015, 1.1))
  }
  for (const sx of [-1, 1]) {
    a.q('white', BAR, mat4(cx + sx * (w / 2 - 0.24), PLAT + 0.012, zc, 0, 0, 0, 0.14, 0.02, len - 0.2))
    a.q('iron', BAR, mat4(cx + sx * (w / 2 + 0.02), PLAT - 0.1, zc, 0, 0, 0, 0.06, 0.2, len))
  }
  // 端部斜坡与踏步
  for (const sz of [z0, z1]) {
    const dir = sz === z0 ? -1 : 1
    a.box('stone', w, 0.2, 0.5, cx, PLAT - 0.1, sz + dir * 0.25)
    for (let i = 0; i < 4; i++) {
      a.box('stone', w - 0.1, 0.22, 0.34, cx, SHEDY + 0.11 + i * ((PLAT - SHEDY - 0.22) / 3), sz + dir * (0.6 + i * 0.34))
    }
  }
  // 站台面排水沟与铸铁篦子
  a.q('ironDark', BAR, mat4(cx, PLAT + 0.006, zc, 0, 0, 0, 0.3, 0.012, len - 1.0))
  for (let i = 0; i < 12; i++) {
    a.q('iron', BAR, mat4(cx, PLAT + 0.014, z0 + 0.9 + i * ((len - 1.8) / 11), 0, 0, 0, 0.28, 0.02, 0.05))
  }
}

/** 天桥：格构主梁 ×2 + 桥面 + 铁栏 + 玻璃雨棚 + 两座下站台楼梯 + 支撑牛腿 + 吊灯与吊钟 */
function footbridge(a: Asm): void {
  const deckY = 5.2
  const z = 0.6
  const halfL = 7.6
  a.box('ironDark', halfL * 2, 0.24, 2.4, 0, deckY - 0.12, z)
  a.box('wood', halfL * 2 - 0.2, 0.08, 2.2, 0, deckY + 0.04, z)
  for (let i = 0; i < 26; i++) a.q('woodDark', BAR, mat4(-halfL + 0.4 + i * 0.58, deckY + 0.09, z, 0, 0, 0, 0.5, 0.03, 2.1))
  for (const sz of [-1, 1]) {
    const g = a.sub(0, deckY + 0.75, z + sz * 1.14)
    latticeGirder(g, { len: halfL * 2, h: 1.3, depth: 0.22, bays: 16, web: false })
    g.flush()
    const r = a.sub(0, deckY + 1.5, z + sz * 1.14)
    ironRailing(r, { len: halfL * 2 - 0.4, h: 1.0, pitch: 0.14 })
    r.flush()
  }
  // 玻璃雨棚（三拱铁架 + 玻璃 + 脊饰）
  for (let i = 0; i <= 8; i++) {
    const x = -halfL + (halfL * 2 * i) / 8
    const arch = a.sub(x, deckY + 1.4, z, 0, Math.PI / 2, 0)
    archRib(arch, { halfSpan: 1.3, springY: 0, rise: 1.0, z: 0, bays: 4, depth: 0.14, twin: false, rivet: false })
    arch.flush()
  }
  for (let i = 0; i < 8; i++) {
    const x0 = -halfL + (halfL * 2 * i) / 8
    const xm = x0 + halfL / 4
    for (let k = 0; k < 5; k++) {
      const t = -1.2 + k * 0.6
      const yy = deckY + 1.4 + 1.0 * (1 - (t / 1.3) ** 2)
      a.q('glass', BAR, mat4(xm, yy + 0.06, z + t, 0, 0, Math.atan2(-2 * t, 2.6), halfL / 4 - 0.1, 0.04, 0.62))
    }
  }
  ridgeCresting(a, { x: 0, y: deckY + 2.42, z0: z - halfL, z1: z + halfL, pitch: 1.4 })
  // 楼梯（两座，下至岛式站台）
  for (const sx of [-1, 1]) {
    stair(a, sx * 2.6, deckY, z + 1.3, 1)
    stair(a, sx * 2.6, deckY, z - 1.3, -1)
  }
  // 支撑：天沟柱上的牛腿 + 斜撑
  for (const sx of [-1, 1]) {
    for (const dz of [-1.0, 1.0]) {
      bracket(a, { x: sx * 3.35, y: deckY - 0.2, z: z + dz * 0.9, len: 1.0, rotY: dz > 0 ? 0 : Math.PI })
    }
    a.cyl('iron', 0.09, 0.09, 2.2, 8, sx * 3.3, deckY - 1.2, z, 0, 0, sx * 0.5)
  }
  for (const x of [-6.4, 6.4]) a.cyl('cast', 0.16, 0.2, deckY - 0.2, 10, x, (deckY - 0.2) / 2 + SHEDY, z)
  // 桥下吊钟 ×2 + 时刻牌
  hangingClock(a, { x: -2.6, y: deckY - 0.3, z: z + 1.2, r: 0.46, rotY: Math.PI / 2, hour: 10, minute: 10 })
  hangingClock(a, { x: 2.6, y: deckY - 0.3, z: z - 1.2, r: 0.46, rotY: -Math.PI / 2, hour: 10, minute: 10 })
  departureBoard(a, { x: 0, y: deckY - 1.9, z: z, w: 3.0, h: 1.1, rows: 4 })
}

/** 楼梯：踏步 + 双侧墙板 + 铁栏 + 扶手 + 柱础 */
function stair(a: Asm, cx: number, topY: number, z0: number, dir: 1 | -1): void {
  const n = 20
  const rise = (topY - PLAT) / n
  const tread = 0.27
  for (let i = 0; i < n; i++) {
    const yy = topY - rise * i
    const zz = z0 + dir * (i * tread + tread / 2)
    a.box('stone', 1.7, rise, tread, cx, yy - rise / 2, zz)
    a.q('stoneDark', BAR, mat4(cx, yy - 0.01, zz + dir * tread * 0.4, 0, 0, 0, 1.7, 0.02, tread * 0.24))
  }
  for (const sx of [-1, 1]) {
    const len = n * tread
    const g = a.sub(cx + sx * 0.9, 0, z0 + dir * len / 2, 0, 0, dir * sx * -Math.atan2(topY - PLAT, len))
    ironRailing(g, { len: Math.hypot(len, topY - PLAT), h: 1.0, pitch: 0.13 })
    g.flush()
    a.box('wood', 0.12, 0.12, Math.hypot(len, topY - PLAT) + 0.2, cx + sx * 0.9,
      PLAT + (topY - PLAT) / 2 + 1.02, z0 + dir * len / 2, dir * -Math.atan2(topY - PLAT, len) * sx * sx, 0, 0)
    for (let i = 0; i <= 4; i++) {
      const t = i / 4
      a.cyl('cast', 0.06, 0.08, 1.0 + t * 0, 8, cx + sx * 0.9, PLAT + (topY - PLAT) * t + 0.5, z0 + dir * len * t)
    }
  }
  a.box('stoneDark', 2.1, 0.24, 0.5, cx, PLAT - 0.12, z0 + dir * (n * tread + 0.25))
}

/* ============================== 6. 机车车辆 ============================== */
function rollingStock(a: Asm): void {
  // 中央股道（正对站房）：机车 + 煤水车，车头朝南抵车挡
  locomotive(a, { x: 0, z: 1.3, y: RAILTOP, len: 5.0, facing: -1, livery: 'locoGreen' })
  tender(a, { x: 0, z: 5.3, y: RAILTOP, len: 2.6 })
  // 西股道：两节客车
  carriage(a, { x: -5.2, z: 0.6, y: RAILTOP, len: 4.6, windows: 6 })
  carriage(a, { x: -5.2, z: 5.4, y: RAILTOP, len: 4.4, windows: 6, body: 'locoGreen' })
  // 东股道：客车 + 行李车
  carriage(a, { x: 5.2, z: 0.8, y: RAILTOP, len: 4.6, windows: 6 })
  parcelVan(a, 5.2, 5.2)
  // 站台上行李车
  luggageTrolley(a, { x: -2.6, z: 4.4, y: PLAT, rotY: 0.5, boxes: 3 })
  luggageTrolley(a, { x: 2.9, z: 2.4, y: PLAT, rotY: -0.7, boxes: 2 })
  luggageTrolley(a, { x: -7.2, z: 5.6, y: PLAT, rotY: 1.2, boxes: 2 })
}

/** 行李车（短身、大滑门、无窗、带瞭望窗） */
function parcelVan(a: Asm, x: number, z: number): void {
  const L = 3.4
  const g = a.sub(x, RAILTOP, z)
  const floorY = 0.86
  g.box('locoBlack', 1.9, 0.14, L, 0, 0.62, 0)
  for (const wz of [-L / 2 + 0.8, L / 2 - 0.8]) {
    g.box('locoBlack', 1.5, 0.16, 1.3, 0, 0.42, wz)
    for (const dz of [-0.45, 0.45]) {
      for (const sx of [-0.82, 0.82]) {
        g.box('ironDark', 0.12, 0.2, 0.16, sx * 0.76, 0.34, wz + dz)
        g.cyl('ironDark', 0.32, 0.32, 0.08, 14, sx * 0.82, 0.32, wz + dz, 0, 0, Math.PI / 2)
        g.cyl('steel', 0.06, 0.06, 1.7, 8, 0, 0.32, wz + dz, 0, 0, Math.PI / 2)
      }
    }
  }
  g.box('carriageCream', 2.1, 1.9, L - 0.1, 0, floorY + 0.95, 0)
  g.box('locoGreen', 2.14, 0.6, L - 0.14, 0, floorY + 0.35, 0)
  g.box('ironDark', 2.2, 0.08, L - 0.05, 0, floorY + 1.92, 0)
  for (const sx of [-1, 1]) {
    g.box('woodDark', 0.08, 1.5, 1.5, sx * 1.06, floorY + 1.0, 0)
    for (let i = 0; i < 6; i++) g.q('steel', BAR, mat4(sx * 1.11, floorY + 1.0, -0.7 + i * 0.28, 0, 0, 0, 0.03, 1.44, 0.06))
    g.q('glassDeep', BAR, mat4(sx * 1.08, floorY + 1.5, -1.2, 0, 0, 0, 0.04, 0.4, 0.4))
    g.q('glassDeep', BAR, mat4(sx * 1.08, floorY + 1.5, 1.2, 0, 0, 0, 0.04, 0.4, 0.4))
    g.q('gold', BAR, mat4(sx * 1.1, floorY + 0.62, 0, 0, 0, 0, 0.02, 0.05, L - 0.3))
  }
  for (const sz of [-1, 1]) {
    g.box('ironDark', 1.9, 1.7, 0.08, 0, floorY + 0.9, sz * (L / 2))
    g.box('signalRed', 1.8, 0.28, 0.14, 0, 0.56, sz * (L / 2 + 0.06))
    for (const sx of [-0.66, 0.66]) {
      g.cyl('cast', 0.09, 0.09, 0.22, 10, sx, 0.56, sz * (L / 2 + 0.18), Math.PI / 2, 0, 0)
      g.cyl('cast', 0.17, 0.17, 0.06, 12, sx, 0.56, sz * (L / 2 + 0.3), Math.PI / 2, 0, 0)
    }
    g.q('white', BAR, mat4(0, floorY + 1.5, sz * (L / 2 + 0.05), 0, 0, 0, 1.4, 0.24, 0.02))
  }
  g.flush()
}

/* ============================== 7. 站内家具与灯具 ============================== */
function furniture(a: Asm): void {
  // 棚内吊灯（挂于桁架肋下）
  for (const z of [6.6, 4.4, 2.2, 0.0]) {
    hangingLamp(a, { x: 0, y: archY(CENTRAL, 0) - 0.4, z, drop: 2.6, scale: 1.3 })
    for (const sx of [-1, 1]) {
      hangingLamp(a, { x: sx * SIDE_CX, y: archY(SIDE, 0) - 0.3, z, drop: 1.8, scale: 1.0 })
    }
  }
  // 站台灯柱（铸铁细柱 + 双臂灯）
  for (const sx of [-1, 1]) {
    for (const z of [5.8, 1.6, -1.2]) {
      const g = a.sub(sx * 2.6, PLAT, z)
      g.box('stoneDark', 0.4, 0.16, 0.4, 0, 0.08, 0)
      g.cyl('cast', 0.09, 0.13, 3.4, 10, 0, 1.8, 0)
      g.cyl('gold', 0.11, 0.11, 0.07, 10, 0, 2.6, 0)
      for (const sz of [-1, 1]) {
        g.cyl('iron', 0.04, 0.04, 0.5, 6, 0, 3.4, sz * 0.2, sz * 0.9, 0, 0)
        g.box('iron', 0.22, 0.28, 0.22, 0, 3.56, sz * 0.42)
        g.box('glass', 0.18, 0.24, 0.18, 0, 3.56, sz * 0.42)
        g.sph('glow', 0.09, 8, 6, 0, 3.56, sz * 0.42)
        g.cyl('iron', 0.02, 0.14, 0.16, 4, 0, 3.78, sz * 0.42)
      }
      g.sph('gold', 0.08, 8, 6, 0, 3.62, 0)
      g.flush()
    }
  }
  // 站台长椅（铸铁 + 木条）、垃圾箱、号牌
  for (const sx of [-1, 1]) {
    for (const z of [4.6, 6.4]) bench(a, { x: sx * 2.6, z, y: PLAT, rotY: 0, len: 1.8 })
    wasteBin(a, { x: sx * 3.4, z: 3.4, y: PLAT })
    platformSign(a, { x: sx * 2.6, z: -1.2, y: PLAT, h: 3.0, digits: sx < 0 ? [2] : [3] })
  }
  platformSign(a, { x: -7.2, z: 3.0, y: PLAT, h: 2.8, digits: [1] })
  platformSign(a, { x: 7.2, z: 3.0, y: PLAT, h: 2.8, digits: [4] })
  wasteBin(a, { x: -7.0, z: 5.4, y: PLAT })
  wasteBin(a, { x: 7.0, z: 5.4, y: PLAT })
  bench(a, { x: -7.2, z: 6.2, y: PLAT, rotY: Math.PI / 2, len: 1.6 })
  bench(a, { x: 7.2, z: 6.2, y: PLAT, rotY: Math.PI / 2, len: 1.6 })
  // 站台层小件：站牌、时钟、告示牌、饮水池
  departureBoard(a, { x: -5.6, y: 6.2, z: SHED.zS + 0.6, w: 2.8, h: 1.1, rows: 4 })
  departureBoard(a, { x: 5.6, y: 6.2, z: SHED.zS + 0.6, w: 2.8, h: 1.1, rows: 4 })
  clockFace(a, { x: 0, y: 7.6, z: SHED.zS + 0.5, r: 1.0, ry: 0, hour: 10, minute: 10, caseKey: 'iron' })
  for (const sx of [-1, 1]) {
    a.box('woodDark', 0.9, 1.3, 0.1, sx * 6.4, PLAT + 1.4, 2.0, 0, sx * 0.3, 0)
    a.cyl('cast', 0.06, 0.08, 1.4, 8, sx * 6.4, PLAT + 0.7, 2.0)
    for (let i = 0; i < 4; i++) a.q('white', BAR, mat4(sx * 6.4, PLAT + 1.0 + i * 0.28, 1.94, 0, sx * 0.3, 0, 0.7, 0.1, 0.02))
  }
  hydrant(a, { x: -3.4, z: 6.9, y: PLAT })
  manhole(a, { x: 0, z: 6.8, y: SHEDY })
}

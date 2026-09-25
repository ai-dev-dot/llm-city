import * as THREE from 'three'
import { Asm, mat4, on, hash01 } from './asm'

const BAR = new THREE.BoxGeometry(1, 1, 1)
const CHIP = new THREE.IcosahedronGeometry(0.09, 0)
const COAL = new THREE.IcosahedronGeometry(0.13, 0)

/** 钢轨横断面（轨底—轨腰—轨头），沿 +Z 挤出成轨条 */
function railProfile(): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(-0.075, 0)
  s.lineTo(0.075, 0)
  s.lineTo(0.075, 0.03)
  s.lineTo(0.026, 0.052)
  s.lineTo(0.026, 0.116)
  s.lineTo(0.048, 0.13)
  s.lineTo(0.048, 0.17)
  s.lineTo(-0.048, 0.17)
  s.lineTo(-0.048, 0.13)
  s.lineTo(-0.026, 0.116)
  s.lineTo(-0.026, 0.052)
  s.lineTo(-0.075, 0.03)
  s.closePath()
  return s
}
const RAIL = railProfile()

/** 轮对：轮箍 + 踏面 + 轮毂 + 辐条 + （可选）曲柄销与平衡梁。轴沿局部 X。 */
export function spokeWheel(a: Asm, o: {
  r: number; x: number; y: number; z: number; spokes?: number
  key?: string; pin?: boolean; flange?: boolean; width?: number
}): void {
  const r = o.r
  const key = o.key ?? 'ironDark'
  const w = o.width ?? 0.1
  const spokes = o.spokes ?? 10
  const c = mat4(o.x, o.y, o.z, 0, 0, Math.PI / 2)
  a.q(key, new THREE.CylinderGeometry(r, r, w, 22, 1, true), c)
  if (o.flange !== false) a.q(key, new THREE.CylinderGeometry(r * 1.07, r * 1.07, w * 0.34, 22), on(c, 0, -w * 0.34, 0))
  a.q(key, new THREE.CylinderGeometry(r * 0.9, r * 0.9, w * 0.5, 20), on(c, 0, 0.02, 0))
  a.q(key, new THREE.CylinderGeometry(r * 0.24, r * 0.24, w * 1.7, 12), c)
  a.q('steel', new THREE.CylinderGeometry(r * 0.1, r * 0.1, w * 2.4, 8), c)
  for (let i = 0; i < spokes; i++) {
    const t = (Math.PI * 2 * i) / spokes
    a.q(key, BAR, on(c, 0, Math.sin(t) * r * 0.55, Math.cos(t) * r * 0.55, t, 0, 0, w * 0.62, r * 0.09, r * 0.94))
  }
  a.q(key, new THREE.CylinderGeometry(r * 0.34, r * 0.34, w * 0.4, 12), on(c, 0, w * 0.5, 0))
  if (o.pin) a.q('steel', new THREE.CylinderGeometry(0.05, 0.05, 0.16, 8), on(c, 0, w * 0.72, r * 0.42, Math.PI / 2, 0, 0))
}

/** 一条股道：道砟床 + 散砟 + 枕木 + 双轨（挤出断面）+ 鱼尾板接头 + 轨撑
 *  y = 道砟底标高；轨面 = y + 0.49 */
export function trackRun(a: Asm, o: { x: number; z0: number; z1: number; y: number; gauge?: number; sleepers?: boolean }): void {
  const g = o.gauge ?? 1.435
  const len = o.z1 - o.z0
  const zc = (o.z0 + o.z1) / 2
  a.box('ballast', 3.1, 0.22, len, o.x, o.y + 0.11, zc)
  a.box('ballast', 3.5, 0.08, len, o.x, o.y + 0.04, zc)
  // 散砟（确定性抖动）
  const chips = Math.round(len * 7)
  for (let i = 0; i < chips; i++) {
    const u = hash01(i, 1)
    const v = hash01(i, 2)
    const s = 0.7 + hash01(i, 3) * 0.9
    a.q('ballast', CHIP, mat4(
      o.x + (u - 0.5) * 3.2, o.y + 0.2 + v * 0.04, o.z0 + ((i + 0.5) * len) / chips,
      u * 3, v * 3, u * 2, s, s, s))
  }
  if (o.sleepers !== false) {
    const n = Math.max(4, Math.round(len / 0.62))
    for (let i = 0; i < n; i++) {
      const z = o.z0 + ((i + 0.5) * len) / n
      a.q('sleeper', BAR, mat4(o.x, o.y + 0.26, z, 0, 0, 0, 2.72, 0.16, 0.26))
      a.q('sleeper', BAR, mat4(o.x, o.y + 0.26, z, 0, 0, 0, 2.5, 0.2, 0.2))
      for (const sx of [-1, 1]) {
        a.q('iron', BAR, mat4(o.x + sx * (g / 2), o.y + 0.36, z, 0, 0, 0, 0.24, 0.05, 0.2))
        a.q('iron', BAR, mat4(o.x + sx * (g / 2 + 0.1), o.y + 0.35, z, 0, 0, 0, 0.04, 0.1, 0.1))
      }
    }
  }
  for (const sx of [-1, 1]) {
    a.qExtrude('rail', RAIL, len, o.x + sx * (g / 2), o.y + 0.34, zc)
    const joints = Math.max(1, Math.round(len / 5.5))
    for (let j = 1; j < joints; j++) {
      const z = o.z0 + (len * j) / joints
      for (const side of [-1, 1]) {
        a.q('steel', BAR, mat4(o.x + sx * (g / 2) + side * 0.075, o.y + 0.42, z, 0, 0, 0, 0.05, 0.14, 0.5))
        for (const dz of [-0.16, 0.16]) a.q('steel', new THREE.CylinderGeometry(0.028, 0.028, 0.06, 6), mat4(o.x + sx * (g / 2) + side * 0.1, o.y + 0.42, z + dz, 0, 0, Math.PI / 2))
      }
    }
  }
}

/** 尽头车挡：枕木垛（z 起向北 +Z 三级）+ 缓冲梁 + 双缓冲盘（朝 +Z 迎车）+ 条纹挡板 */
export function bufferStop(a: Asm, o: { x: number; z: number; y: number; gauge?: number; dir?: 1 | -1 }): void {
  const g = o.gauge ?? 1.435
  const d = o.dir ?? 1
  const Z = (v: number) => o.z + v * d
  for (const dz of [0, 0.42, 0.84]) {
    a.box('woodDark', 2.6, 0.22, 0.34, o.x, o.y + 0.34 + dz * 0.02, Z(dz))
    a.box('wood', 2.3, 0.18, 0.3, o.x, o.y + 0.5, Z(dz + 0.02))
  }
  a.box('iron', 2.2, 0.44, 0.2, o.x, o.y + 0.72, Z(1.0))
  for (const sx of [-1, 1]) {
    a.cyl('cast', 0.13, 0.13, 0.42, 12, o.x + sx * (g / 2 - 0.12), o.y + 0.72, Z(1.2), Math.PI / 2, 0, 0)
    a.cyl('cast', 0.24, 0.24, 0.08, 14, o.x + sx * (g / 2 - 0.12), o.y + 0.72, Z(1.42), Math.PI / 2, 0, 0)
    a.box('iron', 0.16, 0.5, 0.5, o.x + sx * 1.0, o.y + 0.55, Z(0.6))
  }
  a.box('woodDark', 0.14, 1.1, 0.1, o.x - 0.9, o.y + 1.05, Z(1.1))
  a.box('woodDark', 0.14, 1.1, 0.1, o.x + 0.9, o.y + 1.05, Z(1.1))
  for (let i = 0; i < 6; i++) {
    a.q(i % 2 ? 'signalRed' : 'white', BAR, mat4(o.x, o.y + 1.5 - i * 0.13, Z(1.12), 0, 0, 0, 1.8, 0.11, 0.05))
  }
  a.box('ballast', 2.4, 0.2, 0.6, o.x, o.y + 0.32, Z(-0.5))
  a.q('iron', BAR, mat4(o.x, o.y + 0.5, Z(0.9), 0, 0, 0, 2.2, 0.1, 0.1))
}

/** 臂板信号机：基座 + 桁架柱 + 臂板（红底白条，扬起 22°）+ 色灯 +  spectacles + 爬梯 + 平衡重 + 传动杆 */
export function semaphore(a: Asm, o: { x: number; z: number; y?: number; h?: number; armUp?: boolean; lamp?: boolean }): void {
  const y = o.y ?? 0.3
  const h = o.h ?? 4.6
  const g = a.sub(o.x, y, o.z)
  g.box('stoneDark', 0.7, 0.26, 0.7, 0, 0.13, 0)
  g.cyl('cast', 0.11, 0.15, 0.5, 10, 0, 0.5, 0)
  g.cyl('iron', 0.085, 0.1, h, 10, 0, 0.75 + h / 2, 0)
  for (const yy of [1.6, 2.8]) g.cyl('cast', 0.13, 0.13, 0.1, 10, 0, yy, 0)
  g.sph('gold', 0.12, 8, 6, 0, h + 0.85, 0)
  g.cyl('iron', 0.03, 0.03, 0.34, 6, 0, h + 0.6, 0)
  // 臂板
  const arm = g.sub(0, h + 0.35, 0, 0, 0, o.armUp === false ? 0 : -0.38)
  arm.box('signalRed', 1.5, 0.3, 0.06, 0.78, 0, 0)
  arm.box('white', 1.5, 0.08, 0.07, 0.78, 0, 0)
  arm.box('ironDark', 0.1, 0.44, 0.1, 0.06, 0, 0)
  arm.q('iron', BAR, mat4(1.5, 0, 0, 0, 0, 0, 0.08, 0.4, 0.08))
  // 色灯与 spectacles
  if (o.lamp !== false) {
    g.box('ironDark', 0.26, 0.34, 0.22, 0.16, h + 0.02, 0)
    g.cyl('glow', 0.09, 0.09, 0.05, 10, 0.28, h + 0.02, 0, 0, 0, Math.PI / 2)
    g.cyl('iron', 0.12, 0.12, 0.03, 10, 0.31, h + 0.02, 0, 0, 0, Math.PI / 2)
  }
  g.box('ironDark', 0.34, 0.5, 0.05, 0, h - 0.1, 0.16)
  // 爬梯
  for (const sz of [-0.14, 0.14]) g.q('iron', BAR, mat4(sz, 1.5, 0.2, 0, 0, 0, 0.05, h - 1.6, 0.05))
  for (let i = 0; i < 10; i++) g.q('iron', BAR, mat4(0, 1.0 + i * 0.42, 0.2, 0, 0, 0, 0.32, 0.04, 0.04))
  // 平衡重与传动杆
  g.cyl('iron', 0.025, 0.025, h - 0.6, 6, -0.16, 0.9 + (h - 0.6) / 2, 0)
  g.box('cast', 0.22, 0.4, 0.14, -0.16, 1.1, 0)
  g.cyl('iron', 0.02, 0.02, 1.4, 6, 0, 0.42, 0.72, Math.PI / 2 - 0.1, 0, 0)
  g.flush()
}

/** 蒸汽机车（本地坐标：轨面 y=0，车头朝 +Z，长沿 Z；facing=-1 时整体掉头）。
 *  锅炉 + 烟箱 + 双 dome + 驾驶室 + 走台 + 半圆轮罩 + 三对动轮 + 导轮转向架 +
 *  连杆机构 + 缓冲梁 + 前照灯 + 扶手杆 + 鎏金线脚 + 号牌 + 排障器 */
export function locomotive(a: Asm, o: { x: number; z: number; y?: number; len?: number; livery?: string; facing?: 1 | -1 }): void {
  const y = o.y ?? 0
  const liv = o.livery ?? 'locoGreen'
  const f = o.facing ?? 1
  const L = o.len ?? 5.0
  const g = a.sub(o.x, y, o.z, 0, f === 1 ? 0 : Math.PI, 0, 'loco')
  // 纵向站点
  const zBuffer = L / 2          // 缓冲梁
  const zSmoke = 1.8             // 烟箱中心
  const zBoilerC = 0.2           // 锅炉中心
  const boilerL = 2.6
  const zCab = -1.78             // 驾驶室中心
  const zCabFront = -1.1
  const boilerY = 1.34
  const boilerR = 0.6
  const dwheels = [-0.8, 0.1, 1.0]
  const lwheels = [1.62, 2.12]

  // 车架
  for (const sx of [-1, 1]) g.box('locoBlack', 0.12, 0.46, L - 0.4, sx * 0.74, 0.42, 0)
  for (const dz of [-2.0, -1.0, 0, 1.0, 2.0]) g.box('locoBlack', 1.6, 0.14, 0.18, 0, 0.28, dz)
  g.box('locoBlack', 1.7, 0.1, L - 0.5, 0, 0.66, 0)

  // 锅炉 + 环箍 + 鎏金线
  g.cyl(liv, boilerR, boilerR * 0.98, boilerL, 26, 0, boilerY, zBoilerC, Math.PI / 2, 0, 0)
  for (const dz of [zBoilerC - 0.85, zBoilerC, zBoilerC + 0.85]) {
    g.cyl('locoBlack', boilerR + 0.035, boilerR + 0.035, 0.1, 26, 0, boilerY, dz, Math.PI / 2, 0, 0)
    g.cyl('gold', boilerR + 0.05, boilerR + 0.05, 0.03, 26, 0, boilerY, dz + 0.07, Math.PI / 2, 0, 0)
  }
  // 烟箱 + 门 + 铰链 + 手轮 + 门圈螺栓
  g.cyl('locoBlack', boilerR + 0.02, boilerR + 0.02, 0.6, 26, 0, boilerY, zSmoke, Math.PI / 2, 0, 0)
  g.cyl('ironDark', boilerR + 0.06, boilerR + 0.06, 0.06, 26, 0, boilerY, zSmoke + 0.32, Math.PI / 2, 0, 0)
  g.cyl('locoBlack', boilerR * 0.86, boilerR * 0.86, 0.05, 24, 0, boilerY, zSmoke + 0.35, Math.PI / 2, 0, 0)
  g.cyl('steel', 0.05, 0.05, 0.52, 8, boilerR * 0.5, boilerY, zSmoke + 0.36, 0, 0, 0.4)
  g.sph('steel', 0.07, 8, 6, boilerR * 0.5, boilerY + 0.25, zSmoke + 0.38)
  g.cyl('steel', 0.09, 0.09, 0.1, 10, 0, boilerY, zSmoke + 0.4, Math.PI / 2, 0, 0)
  for (let i = 0; i < 10; i++) {
    const t = (Math.PI * 2 * i) / 10
    g.q('steel', BAR, mat4(Math.cos(t) * boilerR * 0.8, boilerY + Math.sin(t) * boilerR * 0.8, zSmoke + 0.38, 0, 0, t, 0.06, 0.15, 0.05))
  }
  // 烟囱（喇叭口）+ 鎏金盖沿
  g.cyl('locoBlack', 0.2, 0.24, 0.6, 18, 0, boilerY + 0.85, zSmoke)
  g.cyl('locoBlack', 0.33, 0.2, 0.26, 18, 0, boilerY + 1.25, zSmoke)
  g.cyl('gold', 0.345, 0.345, 0.05, 18, 0, boilerY + 1.39, zSmoke)
  g.cyl('ironDark', 0.31, 0.31, 0.04, 18, 0, boilerY + 1.43, zSmoke)
  // 汽包 + 砂包 + 安全阀 + 汽笛
  g.sph(liv, 0.3, 16, 10, 0, boilerY + 0.42, zBoilerC + 0.35)
  g.cyl('gold', 0.3, 0.26, 0.1, 16, 0, boilerY + 0.66, zBoilerC + 0.35)
  g.cyl(liv, 0.22, 0.24, 0.3, 16, 0, boilerY + 0.5, zBoilerC - 0.55)
  g.cyl('gold', 0.22, 0.2, 0.07, 16, 0, boilerY + 0.68, zBoilerC - 0.55)
  for (const dx of [-0.14, 0.14]) {
    g.cyl('gold', 0.06, 0.07, 0.26, 10, dx, boilerY + 0.62, zCabFront + 0.15)
    g.sph('gold', 0.07, 8, 6, dx, boilerY + 0.78, zCabFront + 0.15)
  }
  g.cyl('gold', 0.05, 0.05, 0.3, 8, 0.3, boilerY + 0.6, zCabFront + 0.4)
  g.cyl('gold', 0.03, 0.03, 0.16, 8, 0.3, boilerY + 0.8, zCabFront + 0.4, 0, 0, 0.5)

  // 火箱与驾驶室
  g.box(liv, 1.72, 1.5, 1.4, 0, 1.35, zCab)
  g.box('locoBlack', 1.8, 0.16, 1.52, 0, 2.16, zCab)
  g.box(liv, 1.86, 0.1, 1.6, 0, 2.3, zCab)
  g.box('gold', 1.9, 0.05, 1.64, 0, 2.37, zCab)
  for (const sx of [-1, 1]) {
    g.box(liv, 0.08, 1.05, 1.4, sx * 0.88, 1.55, zCab)
    g.box('glassDeep', 0.06, 0.5, 0.62, sx * 0.93, 1.78, zCab + 0.1)
    for (const dy of [-0.28, 0.28]) g.q('gold', BAR, mat4(sx * 0.95, 1.78 + dy, zCab + 0.1, 0, 0, 0, 0.04, 0.05, 0.68))
    for (const dz of [-0.34, 0.34]) g.q('gold', BAR, mat4(sx * 0.95, 1.78, zCab + 0.1 + dz, 0, 0, 0, 0.04, 0.56, 0.05))
    g.box('ironDark', 0.05, 0.7, 0.5, sx * 0.94, 1.0, zCab - 0.4)
  }
  g.box(liv, 1.72, 0.95, 0.1, 0, 1.62, zCabFront)
  for (const sx of [-0.42, 0.42]) {
    g.cyl('glassDeep', 0.2, 0.2, 0.08, 14, sx, 1.74, zCabFront + 0.06, Math.PI / 2, 0, 0)
    g.cyl('gold', 0.24, 0.24, 0.06, 14, sx, 1.74, zCabFront + 0.04, Math.PI / 2, 0, 0)
  }
  // 司机室内：火炉门发光 + 座椅 + 操纵杆
  g.box('glow', 0.42, 0.42, 0.06, 0, 1.2, zCabFront - 0.06)
  g.box('ironDark', 0.52, 0.06, 0.5, 0, 1.43, zCabFront - 0.06)
  g.box('wood', 0.5, 0.08, 0.42, 0.5, 1.05, zCab + 0.3)
  g.box('ironDark', 0.08, 0.5, 0.08, 0.5, 1.3, zCab + 0.5)
  g.cyl('steel', 0.03, 0.03, 0.5, 6, -0.5, 1.5, zCab + 0.2, 0.3, 0, 0)

  // 走台 + 裙板 + 扶手杆 + 半圆轮罩
  const SPLASH = new THREE.CylinderGeometry(0.74, 0.74, 0.17, 18, 1, true, 0, Math.PI)
  const SPLASH_RIM = new THREE.CylinderGeometry(0.77, 0.77, 0.05, 18, 1, true, 0, Math.PI)
  for (const sx of [-1, 1]) {
    g.box('locoBlack', 0.36, 0.08, L - 1.7, sx * 0.98, 0.92, 0.2)
    g.box(liv, 0.1, 0.34, L - 1.7, sx * 1.06, 0.76, 0.2)
    g.box('gold', 0.12, 0.04, L - 1.7, sx * 1.06, 0.94, 0.2)
    g.cyl('steel', 0.025, 0.025, L - 2.2, 6, sx * 1.04, 1.62, 0.3, Math.PI / 2, 0, 0)
    for (const dz of [-0.9, 0.3, 1.5]) g.cyl('steel', 0.03, 0.03, 0.72, 6, sx * 1.04, 1.28, dz)
    for (const wz of dwheels) {
      g.mesh(SPLASH, liv, sx * 0.92, 0.62, wz, 0, 0, Math.PI / 2)
      g.mesh(SPLASH_RIM, 'gold', sx * 0.92, 0.62, wz, 0, 0, Math.PI / 2)
      g.box(liv, 0.17, 0.7, 0.1, sx * 0.92, 0.95, wz - 0.68)
      g.box(liv, 0.17, 0.7, 0.1, sx * 0.92, 0.95, wz + 0.68)
    }
  }
  // 动轮 + 导轮 + 转向架框
  for (const wz of dwheels) {
    for (const sx of [-0.86, 0.86]) spokeWheel(g, { r: 0.56, x: sx, y: 0.56, z: wz, spokes: 12, pin: true, width: 0.11 })
    g.box('steel', 0.1, 0.1, 0.24, 0, 0.56, wz)
  }
  g.box('locoBlack', 1.5, 0.42, 1.0, 0, 0.56, 1.87)
  for (const wz of lwheels) {
    for (const sx of [-0.8, 0.8]) spokeWheel(g, { r: 0.34, x: sx, y: 0.34, z: wz, spokes: 10, width: 0.09 })
  }
  // 连杆：耦合杆 + 主连杆 + 活塞杆 + 汽缸
  for (const sx of [-1, 1]) {
    g.box('steel', 0.07, 0.14, 2.1, sx * 1.04, 0.8, 0.1)
    g.box('locoBlack', 0.06, 0.12, 1.6, sx * 1.08, 0.9, 0.6)
    g.box('steel', 0.09, 0.09, 1.2, sx * 0.96, 0.74, 1.9, 0.12, 0, 0)
    g.box('locoBlack', 0.3, 0.42, 0.74, sx * 0.8, 0.74, 2.05)
    g.cyl('steel', 0.16, 0.16, 0.3, 12, sx * 0.8, 0.74, 2.44, Math.PI / 2, 0, 0)
    for (const pin of dwheels) g.cyl('steel', 0.07, 0.07, 0.14, 8, sx * 1.1, 0.8, pin, 0, 0, Math.PI / 2)
  }
  // 缓冲梁 + 缓冲器 + 车钩 + 砂管 + 排障器
  g.box('signalRed', 2.0, 0.36, 0.18, 0, 0.62, zBuffer - 0.06)
  g.box('white', 2.0, 0.08, 0.19, 0, 0.78, zBuffer - 0.06)
  for (const sx of [-0.7, 0.7]) {
    g.cyl('cast', 0.1, 0.1, 0.3, 12, sx, 0.62, zBuffer + 0.1, Math.PI / 2, 0, 0)
    g.cyl('cast', 0.2, 0.2, 0.07, 14, sx, 0.62, zBuffer + 0.26, Math.PI / 2, 0, 0)
  }
  g.box('ironDark', 0.16, 0.3, 0.4, 0, 0.5, zBuffer + 0.14)
  g.cyl('ironDark', 0.11, 0.11, 0.1, 10, 0, 0.5, zBuffer + 0.36, Math.PI / 2, 0, 0)
  for (const sx of [-0.55, 0.55]) g.cyl('locoBlack', 0.05, 0.07, 0.9, 8, sx, 0.5, zBuffer - 0.2, 0.6, 0, 0)
  for (let i = 0; i < 7; i++) {
    g.q('locoBlack', BAR, mat4(-0.6 + i * 0.2, 0.36, zBuffer + 0.06, 0.5, 0, 0, 0.06, 0.5, 0.06))
  }
  g.box('locoBlack', 1.4, 0.1, 0.12, 0, 0.58, zBuffer)
  // 前照灯 + 灯架
  g.box('ironDark', 0.44, 0.44, 0.36, 0, boilerY + 0.98, zSmoke + 0.42)
  g.cyl('glow', 0.17, 0.17, 0.06, 14, 0, boilerY + 0.98, zSmoke + 0.62, Math.PI / 2, 0, 0)
  g.cyl('gold', 0.21, 0.21, 0.05, 14, 0, boilerY + 0.98, zSmoke + 0.6, Math.PI / 2, 0, 0)
  g.box('ironDark', 0.5, 0.06, 0.42, 0, boilerY + 1.23, zSmoke + 0.42)
  // 号牌（抽象字符）
  for (const sx of [-1, 1]) {
    g.q('gold', BAR, mat4(sx * 0.94, 1.35, zCab - 0.2, 0, 0, 0, 0.03, 0.3, 0.52))
    for (let i = 0; i < 3; i++) g.q('locoBlack', BAR, mat4(sx * 0.97, 1.35, zCab - 0.38 + i * 0.18, 0, 0, 0, 0.02, 0.16, 0.1))
  }
  g.flush()
}

/** 煤水车（tender）：铆接水槽 + 煤堆（确定性碎块）+ 转向架 8 轮 + 缓冲梁 + 扶手 + 编号 */
export function tender(a: Asm, o: { x: number; z: number; y?: number; len?: number; livery?: string }): void {
  const y = o.y ?? 0
  const liv = o.livery ?? 'locoGreen'
  const L = o.len ?? 2.5
  const g = a.sub(o.x, y, o.z, 0, 0, 0, 'tender')
  g.box('locoBlack', 1.6, 0.12, L - 0.1, 0, 0.5, 0)
  for (const sx of [-1, 1]) g.box('ironDark', 0.1, 0.3, L - 0.2, sx * 0.72, 0.36, 0)
  g.box(liv, 1.72, 1.0, L, 0, 1.1, 0)
  g.box('locoBlack', 1.78, 0.1, L + 0.06, 0, 1.64, 0)
  g.box('gold', 1.8, 0.04, L + 0.08, 0, 1.7, 0)
  for (const sx of [-1, 1]) {
    g.box(liv, 0.08, 0.7, L - 0.2, sx * 0.88, 1.25, 0)
    for (let i = 0; i < 5; i++) g.q('iron', BAR, mat4(sx * 0.93, 1.25, -L / 2 + 0.3 + i * ((L - 0.6) / 4), 0, 0, 0, 0.03, 0.66, 0.08))
  }
  // 铆钉带
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      g.q('iron', BAR, mat4(sx * 0.9, 0.78, -L / 2 + 0.2 + i * ((L - 0.4) / 7), 0, 0, 0, 0.04, 0.05, 0.06))
    }
  }
  // 煤堆
  for (let i = 0; i < 60; i++) {
    const u = hash01(i, 11), v = hash01(i, 12), w = hash01(i, 13)
    const s = 0.7 + w * 0.8
    g.q('locoBlack', COAL, mat4((u - 0.5) * 1.3, 1.7 + v * 0.16, -L / 2 + 0.25 + w * (L - 0.5), u * 3, v * 3, w * 3, s, s, s))
  }
  g.box('ironDark', 1.3, 0.4, 0.08, 0, 1.85, -L / 2 + 0.1)
  for (const sz of [-1, 1]) {
    g.box('signalRed', 1.7, 0.3, 0.14, 0, 0.56, sz * (L / 2 + 0.02))
    for (const sx of [-0.66, 0.66]) {
      g.cyl('cast', 0.09, 0.09, 0.24, 10, sx, 0.56, sz * (L / 2 + 0.16), Math.PI / 2, 0, 0)
      g.cyl('cast', 0.17, 0.17, 0.06, 12, sx, 0.56, sz * (L / 2 + 0.3), Math.PI / 2, 0, 0)
    }
  }
  for (const wz of [-0.72, 0.72]) {
    for (const sx of [-0.78, 0.78]) spokeWheel(g, { r: 0.33, x: sx, y: 0.33, z: wz, spokes: 10, width: 0.09 })
    for (const sx of [-1, 1]) g.box('ironDark', 0.16, 0.24, 0.5, sx * 0.64, 0.42, wz)
  }
  for (const sx of [-1, 1]) g.cyl('steel', 0.022, 0.022, L - 0.4, 6, sx * 0.9, 1.82, 0, Math.PI / 2, 0, 0)
  g.flush()
}

/** 客车车厢：底架 + 双转向架 + 圆拱车顶 + 车窗阵（框+玻璃+棂）+ 车门 + 腰线鎏金 + 车顶通风器 + 端部风挡 */
export function carriage(a: Asm, o: {
  x: number; z: number; y?: number; len?: number; body?: string; roofKey?: string; windows?: number
}): void {
  const y = o.y ?? 0
  const L = o.len ?? 5.2
  const body = o.body ?? 'carriageRed'
  const g = a.sub(o.x, y, o.z, 0, 0, 0, 'carriage')
  const floorY = 0.86
  const bodyH = 2.05
  // 底架
  g.box('locoBlack', 1.9, 0.14, L, 0, 0.62, 0)
  for (const sx of [-1, 1]) g.box('ironDark', 0.12, 0.22, L - 0.1, sx * 0.9, 0.5, 0)
  for (const dz of [-L / 2 + 0.4, -0.8, 0.8, L / 2 - 0.4]) g.box('ironDark', 1.9, 0.16, 0.12, 0, 0.5, dz)
  // 转向架
  for (const wz of [-L / 2 + 1.15, L / 2 - 1.15]) {
    g.box('locoBlack', 1.5, 0.16, 1.6, 0, 0.42, wz)
    for (const sx of [-1, 1]) {
      g.box('ironDark', 0.1, 0.3, 1.5, sx * 0.74, 0.32, wz)
      g.box('steel', 0.14, 0.12, 0.5, sx * 0.7, 0.52, wz)
      for (const dz of [-0.4, 0.4]) g.cyl('steel', 0.09, 0.09, 0.2, 8, sx * 0.78, 0.34, wz + dz, 0, 0, Math.PI / 2)
    }
    for (const dz of [-0.55, 0.55]) {
      for (const sx of [-0.82, 0.82]) spokeWheel(g, { r: 0.32, x: sx, y: 0.32, z: wz + dz, spokes: 10, width: 0.08 })
    }
  }
  // 车体
  g.box(body, 2.1, bodyH, L - 0.1, 0, floorY + bodyH / 2, 0)
  g.box('carriageCream', 2.14, 0.5, L - 0.14, 0, floorY + bodyH - 0.26, 0)
  g.box('carriageCream', 2.14, 0.34, L - 0.14, 0, floorY + 0.18, 0)
  for (const sx of [-1, 1]) {
    g.q('gold', BAR, mat4(sx * 1.07, floorY + bodyH - 0.54, 0, 0, 0, 0, 0.02, 0.05, L - 0.3))
    g.q('gold', BAR, mat4(sx * 1.07, floorY + 0.38, 0, 0, 0, 0, 0.02, 0.04, L - 0.3))
  }
  // 车顶（浅拱半圆筒）+ 顶缝 + 通风器 + 顶栏
  const roofR = 2.4
  const roofHalf = Math.asin(1.12 / roofR)
  const roof = new THREE.CylinderGeometry(roofR, roofR, L - 0.05, 16, 1, false, -roofHalf, roofHalf * 2)
  const roofY = floorY + bodyH - roofR * Math.cos(roofHalf)
  g.mesh(roof, o.roofKey ?? 'chalk', 0, roofY, 0, -Math.PI / 2, 0, 0)
  g.box('ironDark', 2.26, 0.06, L - 0.05, 0, floorY + bodyH - 0.02, 0)
  const crown = roofY + roofR
  for (let i = 0; i < 9; i++) {
    const zz = -L / 2 + 0.4 + (i * (L - 0.8)) / 8
    g.q('ironDark', BAR, mat4(0, crown + 0.02, zz, 0, 0, 0, 0.14, 0.05, 0.18))
  }
  for (const zz of [-L / 2 + 1.2, 0, L / 2 - 1.2]) {
    g.cyl('ironDark', 0.16, 0.2, 0.24, 12, 0, crown + 0.1, zz)
    g.box('ironDark', 0.4, 0.06, 0.3, 0, crown + 0.24, zz)
    for (let i = 0; i < 4; i++) g.q('ironDark', BAR, mat4(0, crown + 0.18, zz - 0.1 + i * 0.07, 0, 0, 0, 0.34, 0.03, 0.03))
  }
  for (const sx of [-1, 1]) g.cyl('steel', 0.022, 0.022, L - 0.8, 6, sx * 0.5, crown + 0.14, 0, Math.PI / 2, 0, 0)
  // 车窗阵 + 车门
  const nWin = o.windows ?? 7
  for (const sx of [-1, 1]) {
    for (let i = 0; i < nWin; i++) {
      const zz = -L / 2 + 0.75 + (i * (L - 1.5)) / Math.max(1, nWin - 1)
      const wy = floorY + bodyH * 0.58
      g.q('glassDeep', BAR, mat4(sx * 1.06, wy, zz, 0, 0, 0, 0.04, 0.72, 0.86))
      g.q('carriageCream', BAR, mat4(sx * 1.09, wy, zz, 0, 0, 0, 0.04, 0.84, 0.98))
      g.q('gold', BAR, mat4(sx * 1.11, wy, zz, 0, 0, 0, 0.02, 0.9, 1.04))
      g.q('iron', BAR, mat4(sx * 1.11, wy, zz, 0, 0, 0, 0.02, 0.05, 0.9))
      for (const dz of [-0.28, 0.28]) g.q('iron', BAR, mat4(sx * 1.11, wy, zz + dz, 0, 0, 0, 0.02, 0.76, 0.04))
      g.q('wood', BAR, mat4(sx * 1.1, wy - 0.5, zz, 0, 0, 0, 0.06, 0.1, 1.0))
    }
    for (const dz of [-L / 2 + 0.32, L / 2 - 0.32]) {
      g.box('carriageCream', 0.06, 1.7, 0.78, sx * 1.06, floorY + 0.95, dz)
      g.q('glassDeep', BAR, mat4(sx * 1.1, floorY + 1.5, dz, 0, 0, 0, 0.03, 0.5, 0.5))
      g.q('gold', BAR, mat4(sx * 1.12, floorY + 1.5, dz, 0, 0, 0, 0.02, 0.58, 0.58))
      g.q('steel', new THREE.CylinderGeometry(0.03, 0.03, 0.18, 6), mat4(sx * 1.14, floorY + 0.9, dz + 0.28, 0, 0, Math.PI / 2))
      g.q('iron', BAR, mat4(sx * 1.1, floorY + 0.2, dz, 0, 0, 0, 0.03, 0.1, 0.8))
    }
  }
  // 端部风挡 + 缓冲 + 车钩 + 端栏
  for (const sz of [-1, 1]) {
    g.box('ironDark', 1.9, 1.9, 0.08, 0, floorY + 1.0, sz * (L / 2 + 0.02))
    g.box('locoBlack', 1.5, 1.5, 0.14, 0, floorY + 1.0, sz * (L / 2 + 0.12))
    g.box('ironDark', 2.0, 0.12, 0.5, 0, floorY - 0.1, sz * (L / 2 + 0.1))
    for (const sx of [-0.68, 0.68]) {
      g.cyl('cast', 0.09, 0.09, 0.22, 10, sx, 0.56, sz * (L / 2 + 0.22), Math.PI / 2, 0, 0)
      g.cyl('cast', 0.17, 0.17, 0.06, 12, sx, 0.56, sz * (L / 2 + 0.34), Math.PI / 2, 0, 0)
    }
    g.box('ironDark', 0.14, 0.26, 0.34, 0, 0.5, sz * (L / 2 + 0.3))
    for (const sx of [-0.86, 0.86]) g.cyl('steel', 0.025, 0.025, 0.7, 6, sx, floorY + 0.3, sz * (L / 2 + 0.2))
    g.box('carriageCream', 0.6, 0.5, 0.05, 0, floorY + 1.5, sz * (L / 2 + 0.06))
  }
  // 车内座席（窗下可见的靠背阵）
  for (let i = 0; i < nWin; i++) {
    const zz = -L / 2 + 0.75 + (i * (L - 1.5)) / Math.max(1, nWin - 1)
    for (const sx of [-0.62, 0.62]) {
      g.box('wood', 0.6, 0.5, 0.14, sx, floorY + 0.62, zz)
      g.box('carriageCream', 0.56, 0.12, 0.5, sx, floorY + 0.42, zz + (sx > 0 ? -0.2 : 0.2))
    }
  }
  g.flush()
}

/** 行李推车：铸铁框架 + 木台面 + 4 小轮 + 推手 + 堆叠皮箱（确定性） */
export function luggageTrolley(a: Asm, o: { x: number; z: number; y?: number; rotY?: number; boxes?: number }): void {
  const g = a.sub(o.x, o.y ?? 0, o.z, 0, o.rotY ?? 0, 0)
  g.box('wood', 1.1, 0.08, 0.7, 0, 0.52, 0)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.box('ironDark', 0.06, 0.4, 0.06, sx * 0.5, 0.3, sz * 0.3)
  g.box('ironDark', 1.16, 0.06, 0.76, 0, 0.46, 0)
  for (const sz of [-1, 1]) {
    g.cyl('ironDark', 0.14, 0.14, 0.06, 10, 0, 0.14, sz * 0.36, 0, 0, Math.PI / 2)
    g.box('ironDark', 0.9, 0.05, 0.05, 0, 0.2, sz * 0.36)
  }
  g.cyl('ironDark', 0.035, 0.035, 0.7, 6, 0, 0.86, -0.32, 0, 0, 0)
  g.cyl('ironDark', 0.035, 0.035, 0.9, 6, 0, 1.0, 0.1, 1.2, 0, 0)
  g.box('wood', 0.5, 0.05, 0.05, 0, 1.28, 0.42)
  const n = o.boxes ?? 3
  for (let i = 0; i < n; i++) {
    const u = hash01(i, 21)
    g.box(i % 2 ? 'woodDark' : 'carriageRed', 0.5 + u * 0.24, 0.28, 0.36 + u * 0.14,
      (u - 0.5) * 0.24, 0.7 + i * 0.28, (hash01(i, 22) - 0.5) * 0.16, 0, u * 0.3, 0)
    g.q('gold', BAR, mat4(0, 0.7 + i * 0.28, 0, 0, 0, 0, 0.52, 0.04, 0.38))
  }
  g.flush()
}

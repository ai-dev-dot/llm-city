import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'

/**
 * 求索塔 · G5 求索智谷街区一期（宗地 G5-01+02+04+05，2×2，40×40m，局部原点=宗地中心）
 * 螺旋扭转玻璃探针塔 ~95m（23 层八角楼板收分逐层旋转 + 密梃亮青幕墙 + 层间算力蓝灯带）
 * + 双螺旋光轨 + 塔冠「算力之眼」+ 30×30m 玻璃研究院裙房（屋顶花园）
 * + 场地：草皮满铺至红线、西广场双螺旋雕塑一对对学府东门、东带镜池与 ∞ 环雕塑、环带树阵。
 * 约定：随机全部走 ctx.rng()（确定性）；材质仅在单栋内共享；景观件打 userData.site 参与 R13 退线豁免。
 * 布局：裙房 ±15m（30×30，退线留 5m 环带做场地）；塔身在裙房屋顶中央，总高 ~95m。
 */

const mesh = (g: THREE.BufferGeometry, m: THREE.Material): THREE.Mesh => {
  const o = new THREE.Mesh(g, m)
  o.castShadow = true
  return o
}
const box = (w: number, h: number, d: number, m: THREE.Material): THREE.Mesh => mesh(new THREE.BoxGeometry(w, h, d), m)
const cyl = (rt: number, rb: number, h: number, seg: number, m: THREE.Material): THREE.Mesh =>
  mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m)
const site = <T extends THREE.Object3D>(o: T): T => {
  o.userData.site = true
  return o
}

/** 螺旋曲线（双螺旋光轨 / 广场雕塑 / 大堂楼梯共用） */
class HelixCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private radius: number,
    private turns: number,
    private height: number,
    private phase: number,
  ) {
    super()
  }
  getPoint(t: number, target: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
    const a = this.phase + t * this.turns * Math.PI * 2
    return target.set(Math.cos(a) * this.radius, t * this.height, Math.sin(a) * this.radius)
  }
}

export default function build(ctx: BuildCtx): THREE.Object3D {
  const rng = ctx.rng

  // ---- 材质（单栋内共享）----
  const M = {
    glass: stdMaterial('#9EC5DD', { metalness: 0.5, roughness: 0.18, emissive: '#C4DFF0', emissiveIntensity: 0.3 }),
    glassTube: stdMaterial('#9EC5DD', { metalness: 0.5, roughness: 0.2, emissive: '#3FA9F5', emissiveIntensity: 0.3, transparent: true, opacity: 0.55 }),
    silver: stdMaterial('#B8BCC2', { metalness: 0.8, roughness: 0.35 }),
    silverDark: stdMaterial('#8A9098', { metalness: 0.7, roughness: 0.4 }),
    graphite: stdMaterial('#2A2E33', { metalness: 0.5, roughness: 0.5 }),
    stone: stdMaterial('#C4C1BA', { roughness: 0.85 }),
    stoneLight: stdMaterial('#D9D6CF', { roughness: 0.8 }),
    stoneDark: stdMaterial('#A8A5A0', { roughness: 0.85 }),
    paver: stdMaterial('#B4B1AB', { roughness: 0.9 }),
    path: stdMaterial('#A8AD96', { roughness: 0.95 }),
    grass: stdMaterial('#7B8A6F', { roughness: 0.95 }),
    soil: stdMaterial('#4A3E32', { roughness: 0.95 }),
    wood: stdMaterial('#8C6A4A', { roughness: 0.8 }),
    trunk: stdMaterial('#6B4A2F', { roughness: 0.9 }),
    leafA: stdMaterial('#6E8F63', { roughness: 0.9 }),
    leafB: stdMaterial('#5C7F55', { roughness: 0.9 }),
    leafC: stdMaterial('#7FA06E', { roughness: 0.9 }),
    water: stdMaterial('#5E8CB4', { metalness: 0.9, roughness: 0.06, emissive: '#2E5A80', emissiveIntensity: 0.25 }),
    jet: stdMaterial('#BFE3F5', { emissive: '#BFE3F5', emissiveIntensity: 1.2, roughness: 0.3 }),
    blue: stdMaterial('#3FA9F5', { emissive: '#3FA9F5', emissiveIntensity: 2.0, roughness: 0.4 }),
    blueSoft: stdMaterial('#2E7FBF', { emissive: '#2E7FBF', emissiveIntensity: 1.2, roughness: 0.4 }),
    warm: stdMaterial('#FFE9A8', { emissive: '#FFE9A8', emissiveIntensity: 1.5, roughness: 0.4 }),
    floorDark: stdMaterial('#3E3C3A', { metalness: 0.6, roughness: 0.25 }),
  }

  /** 浓荫树：3 叶 detail-2 + 1 叶 detail-1，冠形微偏走 rng（确定性） */
  const denseTree = (x: number, z: number, scale: number): THREE.Group => {
    const g = new THREE.Group()
    const trunk = cyl(0.16 * scale, 0.24 * scale, 1.7 * scale, 8, M.trunk)
    trunk.position.y = 0.85 * scale
    g.add(trunk)
    const leaves = [M.leafA, M.leafB, M.leafC, M.leafB]
    const details = [2, 2, 2, 1]
    for (let i = 0; i < 4; i++) {
      const r = (0.62 + rng() * 0.38) * scale
      const leaf = mesh(new THREE.IcosahedronGeometry(r, details[i]), leaves[i])
      leaf.position.set((rng() - 0.5) * 0.9 * scale, (1.75 + i * 0.62 + rng() * 0.25) * scale, (rng() - 0.5) * 0.9 * scale)
      g.add(leaf)
    }
    g.position.set(x, 0, z)
    return site(g)
  }

  /** 植槽（石壁 + 土 + 三丛灌木） */
  const planterAt = (x: number, z: number, rot: number): THREE.Group => {
    const g = new THREE.Group()
    const wall = box(2.6, 0.55, 1.2, M.stone)
    wall.position.y = 0.275
    g.add(wall)
    const soil = box(2.4, 0.3, 1.0, M.soil)
    soil.position.y = 0.62
    g.add(soil)
    const shrubs = [M.leafA, M.leafC, M.leafB]
    for (let i = 0; i < 3; i++) {
      const shrub = mesh(new THREE.IcosahedronGeometry(0.42, 1), shrubs[i])
      shrub.position.set(-0.65 + i * 0.65, 1.02, 0)
      g.add(shrub)
    }
    g.position.set(x, 0, z)
    g.rotation.y = rot
    return site(g)
  }

  const root = new THREE.Group()

  // ================= 场地（40×40，草皮满铺至红线；退线 5m 环带全做场地） =================
  const siteG = new THREE.Group()
  const grass = box(40, 0.4, 40, M.grass)
  grass.position.y = 0.2
  siteG.add(grass)

  // 铺装（0.1 高薄板，地被层豁免退线；座落在草皮上）
  const pave = (x: number, z: number): void => {
    const p = box(0.98, 0.1, 0.98, M.paver)
    p.position.set(x, 0.46, z)
    siteG.add(p)
  }
  for (let ix = 0; ix < 4; ix++) for (let iz = 0; iz < 31; iz++) pave(-15.5 - ix, -15 + iz) // 西广场 4×31
  for (let ix = 0; ix < 5; ix++) for (let iz = 0; iz < 10; iz++) pave(15.5 + ix, -14.5 + iz) // 东南街角广场 5×10
  for (let ix = 0; ix < 5; ix++) {
    pave(15.6 + ix, 2.6) // 镜池南沿
    pave(15.6 + ix, 13.8) // 镜池北沿
  }

  // 环带步道（薄板豁免）
  const walkN = box(36, 0.06, 1.6, M.path)
  walkN.position.set(0, 0.43, 18.3)
  siteG.add(walkN)
  const walkS = box(36, 0.06, 1.6, M.path)
  walkS.position.set(0, 0.43, -18.3)
  siteG.add(walkS)
  const walkEn = box(1.6, 0.06, 4, M.path)
  walkEn.position.set(18.3, 0.43, 16)
  siteG.add(walkEn)
  const walkEs = box(1.6, 0.06, 11, M.path)
  walkEs.position.set(18.3, 0.43, -8.5)
  siteG.add(walkEs)

  // 环带树阵（30 株，含入口两侧）
  const treeSpots: Array<[number, number]> = []
  for (const z of [-18, 18]) for (let x = -15; x <= 15; x += 6) treeSpots.push([x, z])
  for (const x of [-18, 18]) for (const z of [-12, -9, -6, -3, 3, 6, 9, 12]) treeSpots.push([x, z])
  treeSpots.push([-17.3, 5], [-17.3, -5])
  for (const [tx, tz] of treeSpots) siteG.add(denseTree(tx, tz, 0.95 + rng() * 0.25))

  // 西广场：双螺旋雕塑一对（夹入口轴线，对学府东门）
  for (const sz of [4.6, -4.6]) {
    const sc = new THREE.Group()
    const scBase = cyl(1.5, 1.8, 0.45, 12, M.stone)
    scBase.position.y = 0.225
    sc.add(scBase)
    for (const ph of [0, Math.PI]) {
      const tube = mesh(new THREE.TubeGeometry(new HelixCurve(1.0, 2.5, 6.0, ph), 220, 0.15, 10), M.silver)
      tube.position.y = 0.45
      sc.add(tube)
    }
    const scBeacon = mesh(new THREE.SphereGeometry(0.26, 10, 8), M.blue)
    scBeacon.position.y = 6.75
    sc.add(scBeacon)
    for (let k = 0; k < 15; k++) {
      const a = k * Math.PI / 7.5
      const rung = box(2.0, 0.05, 0.05, M.blueSoft)
      rung.position.set(Math.cos(a) * 1.0, 0.45 + (k * 6.0) / 15, Math.sin(a) * 1.0)
      rung.rotation.y = a
      sc.add(rung)
    }
    sc.position.set(-17.6, 0, sz)
    siteG.add(site(sc))
    const scRing = mesh(new THREE.TorusGeometry(2.3, 0.3, 8, 48), M.stoneDark)
    scRing.rotation.x = Math.PI / 2
    scRing.position.set(-17.6, 0.5, sz)
    siteG.add(site(scRing))
  }

  // 东南角：∞ 环雕塑
  const inf = new THREE.Group()
  const infBase = cyl(1.7, 1.9, 0.5, 12, M.stone)
  infBase.position.y = 0.25
  inf.add(infBase)
  const knot = mesh(new THREE.TorusKnotGeometry(1.6, 0.42, 160, 24, 2, 3), M.silverDark)
  knot.position.y = 1.35
  knot.rotation.y = Math.PI / 2
  knot.rotation.x = -0.18
  inf.add(knot)
  const infRing = mesh(new THREE.TorusGeometry(1.75, 0.06, 8, 64), M.blue)
  infRing.rotation.x = Math.PI / 2
  infRing.position.y = 0.55
  inf.add(infRing)
  inf.position.set(17.3, 0, -11.5)
  siteG.add(site(inf))

  // 东带：镜池（涌泉 + 水下灯带）
  const poolG = new THREE.Group()
  const water = box(4.4, 0.3, 10, M.water)
  water.position.y = 0.15
  poolG.add(water)
  for (const dz of [5.18, -5.18]) {
    const r = box(4.8, 0.45, 0.35, M.stone)
    r.position.set(0, 0.225, dz)
    poolG.add(r)
  }
  for (const dx of [-2.55, 2.55]) {
    const r = box(0.35, 0.45, 10.7, M.stone)
    r.position.set(dx, 0.225, 0)
    poolG.add(r)
  }
  for (const dz of [-3.2, -1.6, 0, 1.6, 3.2]) {
    const jet = cyl(0.05, 0.09, 1.25, 8, M.jet)
    jet.position.set(0, 0.75, dz)
    poolG.add(jet)
  }
  for (const dz of [4.4, -4.4]) {
    const led = box(3.6, 0.05, 0.35, M.blue)
    led.position.set(0, 0.12, dz)
    poolG.add(led)
  }
  poolG.position.set(17.4, 0, 8.2)
  siteG.add(site(poolG))

  // 灯柱 / 坐凳 / 石球灯 / 绿篱 / 植槽 / 旗杆 / 自行车架
  const lampPos: Array<[number, number]> = [
    [-17.5, 11.5], [-17.5, -11.5], [-17.8, 6.8], [-17.8, -6.8],
    [15.5, 15.5], [15.5, -15.5], [17.9, 1.6], [17.9, 14.8],
  ]
  for (const [lx, lz] of lampPos) siteG.add(ctx.blocks.streetLamp({ x: lx, z: lz }))
  const benchPos: Array<[number, number, number]> = [
    [-16.4, 9.5, Math.PI / 2], [-16.4, -9.5, Math.PI / 2], [-16.4, 1.8, Math.PI / 2], [-16.4, -1.8, Math.PI / 2],
    [17.3, 1.2, -Math.PI / 2], [17.3, 15.2, -Math.PI / 2],
    [-4, 17.4, Math.PI], [4, 17.4, Math.PI], [-4, -17.4, 0], [4, -17.4, 0],
    [17.4, -9.5, -Math.PI / 2], [17.4, -14.5, -Math.PI / 2],
  ]
  for (const [bx, bz, br] of benchPos) siteG.add(ctx.blocks.bench({ x: bx, z: bz, rotY: br }))
  for (let k = 0; k < 12; k++) {
    const b = cyl(0.09, 0.11, 0.7, 8, M.blue)
    b.position.set(-18.75, 0.91, -13.2 + k * 2.4)
    siteG.add(b)
  }
  for (const [bx, bz] of [[15.05, 3.4], [15.05, -3.4], [15.05, 13.0], [15.05, -13.0], [19.8, 5.0], [19.8, 11.4]] as Array<[number, number]>) {
    const b = cyl(0.09, 0.11, 0.7, 8, M.blue)
    b.position.set(bx, 0.8, bz)
    siteG.add(b)
  }
  for (const [bx, bz] of [[19.6, -5.2], [19.6, -14.7], [15.6, -4.8], [15.6, -14.8]] as Array<[number, number]>) {
    const b = cyl(0.09, 0.11, 0.7, 8, M.blue)
    b.position.set(bx, 0.91, bz)
    siteG.add(b)
  }
  const hedgePos: Array<[number, number]> = [[-16.2, 7.3], [-16.2, -7.3], [-8, 17.2], [8, 17.2], [-8, -17.2], [8, -17.2], [15.9, 1.9], [15.9, 14.5]]
  for (const [hx, hz] of hedgePos) siteG.add(ctx.blocks.hedge({ w: 3, x: hx, z: hz }))
  const planterSpots: Array<[number, number, number]> = [
    [16.5, 16.5, 0], [-16.5, 16.5, Math.PI / 2], [16.5, -16.5, Math.PI / 2], [-16.5, -16.5, 0],
    [0, 17.2, Math.PI / 2], [0, -17.2, Math.PI / 2], [-17.3, 10.5, Math.PI / 2], [-17.3, -10.5, Math.PI / 2],
    [16.8, 14.5, Math.PI / 2], [16.8, -14.5, Math.PI / 2],
  ]
  for (const [px, pz, pr] of planterSpots) siteG.add(planterAt(px, pz, pr))
  for (const [fx, fz] of [[-17.75, 6.6], [-17.75, -6.6], [-17.75, 1.9]] as Array<[number, number]>) {
    const pole = cyl(0.045, 0.07, 7.5, 8, M.silver)
    pole.position.set(fx, 3.75, fz)
    siteG.add(pole)
    const ball = mesh(new THREE.SphereGeometry(0.16, 8, 6), M.silver)
    ball.position.set(fx, 7.62, fz)
    siteG.add(ball)
    const flag = box(1.0, 0.6, 0.04, M.blue)
    flag.position.set(fx + 0.52, 7.05, fz)
    siteG.add(flag)
  }
  for (const [bx, bz] of [[-17.3, -7.9], [15.6, -16.6]] as Array<[number, number]>) {
    const rack = new THREE.Group()
    for (let k = 0; k < 8; k++) {
      const bar = box(2.4, 0.05, 0.05, M.silverDark)
      bar.position.set(-0.7 + k * 0.35, 0.28, 0)
      rack.add(bar)
    }
    rack.position.set(bx, 0, bz)
    siteG.add(site(rack))
  }
  // 西广场发光嵌线（避开入口轴线与雕塑）
  for (const lz of [-12, -9.6, -7.2, 7.2, 9.6, 12]) {
    const l = box(2.8, 0.04, 0.14, M.blue)
    l.position.set(-16.9, 0.58, lz)
    siteG.add(l)
  }
  root.add(siteG)

  // ================= 裙房（30×30×9m 玻璃研究院，±15 退线） =================
  const podiumG = new THREE.Group()
  const plinth = box(30, 0.8, 30, M.stone)
  plinth.position.y = 0.4
  podiumG.add(plinth)
  const lobbyFloor = box(28, 0.25, 28, M.floorDark)
  lobbyFloor.position.y = 0.675
  podiumG.add(lobbyFloor)

  // 官方密梃幕墙四向（西面内凹 7m 通高入口 + 眉檐 + 内衬）
  const cw = (w: number, h: number, x: number, y: number, z: number, ry: number, cols: number, rows: number): void => {
    const c = ctx.blocks.glassCurtain({ w, h, cols, rows, x, y, z })
    c.rotation.y = ry
    podiumG.add(c)
  }
  cw(30, 8.2, 0, 0.8, 15, 0, 12, 2) // 北
  cw(30, 8.2, 0, 0.8, -15, Math.PI, 12, 2) // 南
  cw(30, 8.2, 15, 0.8, 0, Math.PI / 2, 12, 2) // 东
  cw(12, 8.2, -15, 0.8, 9, -Math.PI / 2, 5, 2) // 西段 A
  cw(12, 8.2, -15, 0.8, -9, -Math.PI / 2, 5, 2) // 西段 B
  cw(7, 2.2, -15, 6.8, 0, -Math.PI / 2, 3, 1) // 入口眉檐
  cw(7, 6, -12.2, 0.8, 0, -Math.PI / 2, 3, 5) // 大堂内衬玻璃

  // 大堂：6 根柱 + 双螺旋楼梯 + 暖光内衬 + 入口门梃 + 雨棚 + 台阶
  for (const [cx, cz] of [[-11.8, -5], [-11.8, -2], [-11.8, 2], [-11.8, 5], [-12.7, -2.6], [-12.7, 2.6]] as Array<[number, number]>) {
    const col = cyl(0.3, 0.36, 7.4, 12, M.stoneLight)
    col.position.set(cx, 4.5, cz)
    podiumG.add(col)
  }
  const atrium = new THREE.Group()
  const ac = cyl(0.15, 0.19, 7.4, 10, M.silver)
  ac.position.y = 4.5
  atrium.add(ac)
  for (const ph of [0, Math.PI]) {
    const tube = mesh(new THREE.TubeGeometry(new HelixCurve(1.0, 2.2, 6.6, ph), 200, 0.12, 10), M.silver)
    tube.position.y = 0.8
    atrium.add(tube)
  }
  for (let k = 0; k < 22; k++) {
    const a = k * 0.62
    const t = box(0.44, 0.05, 1.0, M.wood)
    t.position.set(Math.cos(a) * 1.0, 0.8 + (k * 6.6) / 22, Math.sin(a) * 1.0)
    t.rotation.y = a + Math.PI / 2
    atrium.add(t)
  }
  atrium.position.set(-11.8, 0, 0)
  podiumG.add(atrium)
  for (const gz of [-1.7, 1.7]) {
    const g = box(2.6, 4.4, 0.12, M.warm)
    g.position.set(-12.55, 3.1, gz)
    podiumG.add(g)
  }
  for (const [jx, jz] of [[-15.05, 3.5], [-15.05, -3.5], [-12.05, 3.5], [-12.05, -3.5]] as Array<[number, number]>) {
    const j = box(0.3, 6.2, 0.3, M.silver)
    j.position.set(jx, 3.9, jz)
    podiumG.add(j)
  }
  const canopy = box(1.6, 0.3, 6.0, M.silver)
  canopy.position.set(-15.95, 4.6, 0)
  podiumG.add(canopy)
  for (const cz of [-2.6, 2.6]) {
    const c = cyl(0.1, 0.12, 4.5, 8, M.silver)
    c.position.set(-15.75, 2.25, cz)
    podiumG.add(c)
  }
  const canopyLed = box(1.6, 0.05, 0.2, M.blue)
  canopyLed.position.set(-15.95, 4.42, 2.9)
  podiumG.add(canopyLed)
  for (let k = 0; k < 4; k++) {
    const tread = box(2.8, 0.06, 0.5, M.stoneDark)
    tread.position.set(-16.4 - k * 0.55, 0.8 - k * 0.2, 0)
    podiumG.add(tread)
    const riser = box(2.8, 0.2, 0.05, M.stone)
    riser.position.set(-16.4 - k * 0.55, 0.7 - k * 0.2, 0)
    podiumG.add(riser)
  }

  // 裙房角柱灯（入夜算光）
  for (const [fx, fz] of [[14.72, 14.72], [14.72, -14.72], [-14.72, 14.72], [-14.72, -14.72]] as Array<[number, number]>) {
    const fin = box(0.5, 8.2, 0.5, M.blueSoft)
    fin.position.set(fx, 4.9, fz)
    podiumG.add(fin)
  }

  // 屋顶花园：屋顶板 + 女儿墙栏杆 + 植槽 + 树 + 凉棚 + 铺装 + 坐凳灯柱
  const roofSlab = box(30, 0.5, 30, M.stoneDark)
  roofSlab.position.y = 8.75
  podiumG.add(roofSlab)
  podiumG.add(ctx.blocks.railing({ w: 29, x: 0, y: 9, z: 14.4 }))
  podiumG.add(ctx.blocks.railing({ w: 29, x: 0, y: 9, z: -14.4 }))
  const re = ctx.blocks.railing({ w: 29, x: 0, y: 9, z: 0 })
  re.rotation.y = Math.PI / 2
  re.position.x = 14.4
  podiumG.add(re)
  const rw = ctx.blocks.railing({ w: 29, x: 0, y: 9, z: 0 })
  rw.rotation.y = Math.PI / 2
  rw.position.x = -14.4
  podiumG.add(rw)
  const roofPlanterSpots: Array<[number, number, number]> = [
    [13.5, 13.5, 0], [-13.5, 13.5, Math.PI / 2], [13.5, -13.5, Math.PI / 2], [-13.5, -13.5, 0],
    [13.5, 6.5, Math.PI / 2], [-13.5, 6.5, Math.PI / 2], [13.5, -6.5, Math.PI / 2], [-13.5, -6.5, Math.PI / 2],
    [0, 13.8, Math.PI / 2], [0, -13.8, Math.PI / 2], [6.5, 13.8, Math.PI / 2], [-6.5, 13.8, Math.PI / 2],
  ]
  for (const [px, pz, pr] of roofPlanterSpots) {
    const pl = planterAt(px, pz, pr)
    pl.position.y = 9
    podiumG.add(pl)
  }
  const roofTreeSpots: Array<[number, number]> = [[-13, -8], [13, -8], [-11.5, -9.5], [11.5, -9.5], [-13, 8], [13, 8], [-11.5, 9.5], [11.5, 9.5]]
  for (const [tx, tz] of roofTreeSpots) {
    const t = denseTree(tx, tz, 0.9 + rng() * 0.15)
    t.position.y = 9
    podiumG.add(t)
  }
  for (const px of [-7.5, 7.5]) {
    const pg = new THREE.Group()
    const lattice = ctx.blocks.latticePanel({ w: 7, h: 5, cols: 7, rows: 3, x: 0, y: 2.4, z: 0 })
    lattice.rotation.x = -Math.PI / 2
    pg.add(lattice)
    for (const [ox, oz] of [[-3.3, 0], [3.3, 0], [-3.3, -5], [3.3, -5]] as Array<[number, number]>) {
      const post = cyl(0.12, 0.14, 2.6, 8, M.wood)
      post.position.set(ox, 1.3, oz)
      pg.add(post)
    }
    pg.position.set(px, 9, 12.5)
    podiumG.add(pg)
  }
  for (let k = 0; k < 20; k++) {
    const tile = box(0.94, 0.05, 0.94, M.paver)
    tile.position.set(-13.5 + (k % 5), 9.02, 8 + Math.floor(k / 5))
    podiumG.add(tile)
  }
  for (const [bx, bz, br] of [[-9, 10, Math.PI], [9, 10, Math.PI], [0, 8.5, 0], [11, -8, -Math.PI / 2]] as Array<[number, number, number]>) {
    const b = ctx.blocks.bench({ x: bx, z: bz, rotY: br })
    b.position.y = 9
    podiumG.add(b)
  }
  for (const [lx, lz] of [[12.5, -10], [-12.5, -10]] as Array<[number, number]>) {
    const l = ctx.blocks.streetLamp({ x: lx, z: lz })
    l.position.y = 9
    podiumG.add(l)
  }
  root.add(podiumG)

  // ================= 塔身（9m 起，23 层 × 3.4m，~87m） =================
  const towerG = new THREE.Group()
  const core = cyl(2.1, 2.5, 78.2, 16, M.graphite)
  core.position.y = 48.1
  towerG.add(core)

  const FLOORS = 23
  for (let i = 0; i < FLOORS; i++) {
    const fw = 16 - 5 * (i / (FLOORS - 1)) // 平宽 16→11 收分
    const R = fw / (2 * Math.cos(Math.PI / 8)) // 外接半径
    const faceW = 2 * R * Math.sin(Math.PI / 8)
    const fr = fw / 2 // 面平面半径
    const g = new THREE.Group()
    g.position.y = 9 + i * 3.4
    g.rotation.y = i * 0.05 // 逐层旋转 2.9°
    const slab = cyl(R, R, 0.35, 8, M.graphite)
    slab.position.y = 0.175
    g.add(slab)
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4 + Math.PI / 8
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      for (let p = 0; p < 4; p++) {
        const off = (p - 1.5) * (faceW / 4)
        const gl = box(faceW / 4 - 0.12, 3.05, 0.1, M.glass)
        gl.position.set(ca * (fr + 0.06) - sa * off, 1.7, sa * (fr + 0.06) + ca * off)
        gl.rotation.y = a
        g.add(gl)
      }
      for (let mi = 0; mi < 9; mi++) {
        const off = (mi - 4) * (faceW / 8)
        const mu = cyl(0.05, 0.05, 3.05, 8, M.silver)
        mu.position.set(ca * (fr + 0.06) - sa * off, 1.7, sa * (fr + 0.06) + ca * off)
        g.add(mu)
      }
      const sp = box(faceW - 0.1, 0.5, 0.3, M.graphite)
      sp.position.set(ca * (fr - 0.05), 0.25, sa * (fr - 0.05))
      sp.rotation.y = a
      g.add(sp)
      const rail = box(faceW - 0.15, 0.12, 0.3, M.silver)
      rail.position.set(ca * (fr + 0.05), 1.7, sa * (fr + 0.05))
      rail.rotation.y = a
      g.add(rail)
      const led = box(faceW - 0.2, 0.07, 0.3, M.blue)
      led.position.set(ca * (fr + 0.16), 3.36, sa * (fr + 0.16))
      led.rotation.y = a
      g.add(led)
    }
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4
      const fin = box(0.12, 3.05, 0.12, M.silverDark)
      fin.position.set(Math.cos(a) * (R - 0.06), 1.7, Math.sin(a) * (R - 0.06))
      fin.rotation.y = a
      g.add(fin)
    }
    towerG.add(g)
  }

  // 双螺旋光轨（外径 9.6m、2.25 圈、480 段：玻璃管套蓝光芯）
  for (const ph of [0, Math.PI]) {
    const curve = new HelixCurve(9.6, 2.25, 78, ph)
    const tube = mesh(new THREE.TubeGeometry(curve, 480, 0.55, 14), M.glassTube)
    tube.position.y = 9
    towerG.add(tube)
    const glow = mesh(new THREE.TubeGeometry(curve, 480, 0.26, 10), M.blue)
    glow.position.y = 9
    towerG.add(glow)
  }

  // 空中观景环（中段）
  const sky = new THREE.Group()
  const skyRing = mesh(new THREE.TorusGeometry(8.0, 0.55, 12, 48), M.silver)
  skyRing.rotation.x = Math.PI / 2
  skyRing.position.y = 50.0
  sky.add(skyRing)
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4 + 0.2
    const st = cyl(0.2, 0.24, 3.2, 8, M.silver)
    st.position.set(Math.cos(a) * 8.0, 51.6, Math.sin(a) * 8.0)
    sky.add(st)
  }
  for (let k = 0; k < 24; k++) {
    const a = k * Math.PI / 12
    const bal = cyl(0.045, 0.045, 1.0, 6, M.silver)
    bal.position.set(Math.cos(a) * 7.5, 50.5, Math.sin(a) * 7.5)
    sky.add(bal)
  }
  const hand = mesh(new THREE.TorusGeometry(7.5, 0.07, 8, 48), M.silver)
  hand.rotation.x = Math.PI / 2
  hand.position.y = 51.0
  sky.add(hand)
  towerG.add(sky)

  // ================= 塔冠「算力之眼」（~87–95m） =================
  const crownG = new THREE.Group()
  for (let k = 0; k < 48; k++) {
    const a = k * Math.PI / 24
    const fin = box(5.0, 0.12, 0.4, M.silver)
    fin.position.set(Math.cos(a) * 2.6, 87.85, Math.sin(a) * 2.6)
    fin.rotation.y = a
    crownG.add(fin)
  }
  const ring1 = mesh(new THREE.TorusGeometry(5.6, 0.45, 16, 96), M.silver)
  ring1.rotation.x = Math.PI / 2
  ring1.position.y = 87.9
  crownG.add(ring1)
  const ring2 = mesh(new THREE.TorusGeometry(4.5, 0.3, 12, 64), M.silverDark)
  ring2.rotation.x = Math.PI / 2
  ring2.position.y = 87.5
  crownG.add(ring2)
  const band = mesh(new THREE.CylinderGeometry(6.0, 6.0, 1.6, 48, 1, true), M.glass)
  band.position.y = 88.1
  crownG.add(band)
  const eye = mesh(new THREE.SphereGeometry(1.9, 24, 16), M.blue)
  eye.position.y = 90.1
  crownG.add(eye)
  for (const [px, pz] of [[1.7, 1.7], [1.7, -1.7], [-1.7, 1.7], [-1.7, -1.7]] as Array<[number, number]>) {
    const post = cyl(0.26, 0.32, 2.2, 10, M.silver)
    post.position.set(px, 88.9, pz)
    crownG.add(post)
  }
  const spire = cyl(0.18, 0.4, 2.6, 10, M.silver)
  spire.position.y = 91.6
  crownG.add(spire)
  const tip = mesh(new THREE.ConeGeometry(0.4, 0.8, 10), M.silver)
  tip.position.y = 93.3
  crownG.add(tip)
  const beacon = mesh(new THREE.SphereGeometry(0.22, 10, 8), M.blue)
  beacon.position.y = 94.3
  crownG.add(beacon)
  towerG.add(crownG)

  root.add(towerG)
  return root
}

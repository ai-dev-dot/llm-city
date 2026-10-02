import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'

/**
 * 智谷广场 · G5 求索智谷街区四期（宗地 G5-09，东南 1×1，20×20m，局部原点=宗地中心）
 * 「城之停留」中庭：环形散步道（R6.8，24 段弧形薄板）+ 中央椭圆下沉讲座台（4 级）
 * + ∞ 双环雕塑（对望一期东南角 ∞ 环，母题成环）+ 发光 ∞ 地面双环 + 树阵 14 株 / 花坛 8 团
 * + 蓝光灯柱 4（h6）+ 树池地灯 + 台阶嵌灯。全场构件打 userData.site（景观件豁免退线）。
 * 街角开放：东南/西南各留草地开口。夜为一圈光——「城市睡着时，智谷醒着」的最后一环。
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

export default function build(ctx: BuildCtx): THREE.Object3D {
  const rng = ctx.rng

  // ---- 材质（单栋内共享；延续银蓝科技风 + 石木草叶）----
  const M = {
    silver: stdMaterial('#B8BCC2', { metalness: 0.8, roughness: 0.35 }),
    silverDark: stdMaterial('#8A9098', { metalness: 0.7, roughness: 0.4 }),
    graphite: stdMaterial('#2A2E33', { metalness: 0.5, roughness: 0.5 }),
    stone: stdMaterial('#C4C1BA', { roughness: 0.85 }),
    stoneLight: stdMaterial('#D9D6CF', { roughness: 0.8 }),
    stoneDark: stdMaterial('#A8A5A0', { roughness: 0.85 }),
    paver: stdMaterial('#B0ACA6', { roughness: 0.92 }),
    paverDark: stdMaterial('#8E8A84', { roughness: 0.92 }),
    grass: stdMaterial('#7B8A6F', { roughness: 0.95 }),
    soil: stdMaterial('#4A3E32', { roughness: 0.95 }),
    trunk: stdMaterial('#6B4A2F', { roughness: 0.9 }),
    leafA: stdMaterial('#6E8F63', { roughness: 0.9 }),
    leafB: stdMaterial('#5C7F55', { roughness: 0.9 }),
    leafC: stdMaterial('#7FA06E', { roughness: 0.9 }),
    blue: stdMaterial('#3FA9F5', { emissive: '#3FA9F5', emissiveIntensity: 2.0, roughness: 0.4 }),
    blueSoft: stdMaterial('#2E7FBF', { emissive: '#2E7FBF', emissiveIntensity: 1.2, roughness: 0.4 }),
    cyan: stdMaterial('#3FE0D0', { emissive: '#3FE0D0', emissiveIntensity: 1.8, roughness: 0.4 }),
    warm: stdMaterial('#FFE9A8', { emissive: '#FFE9A8', emissiveIntensity: 1.5, roughness: 0.4 }),
    water: stdMaterial('#5E8CB4', { metalness: 0.9, roughness: 0.06, emissive: '#2E5A80', emissiveIntensity: 0.25 }),
  }

  /** 浓荫树（沿用街区 5 叶款） */
  const denseTree = (x: number, z: number, scale: number): THREE.Group => {
    const g = new THREE.Group()
    const trunk = cyl(0.16 * scale, 0.24 * scale, 1.7 * scale, 8, M.trunk)
    trunk.position.y = 0.85 * scale
    g.add(trunk)
    const leaves = [M.leafA, M.leafB, M.leafC, M.leafB, M.leafA]
    const details = [2, 2, 2, 1, 1]
    for (let i = 0; i < 5; i++) {
      const r = (0.55 + rng() * 0.36) * scale
      const leaf = mesh(new THREE.IcosahedronGeometry(r, details[i]), leaves[i])
      leaf.position.set((rng() - 0.5) * 0.9 * scale, (1.65 + i * 0.58 + rng() * 0.22) * scale, (rng() - 0.5) * 0.9 * scale)
      g.add(leaf)
    }
    g.position.set(x, 0, z)
    return site(g)
  }

  const root = new THREE.Group()

  // ================= 场地（20×20 草皮满铺；西接创客巷巷门、东南/西南街角留开放） =================
  const grass = box(20, 0.4, 20, M.grass)
  grass.position.y = 0.2
  root.add(site(grass))
  const pave = (x: number, z: number, m: THREE.Material = M.paver): void => {
    const p = box(0.98, 0.1, 0.98, m)
    p.position.set(x, 0.46, z)
    root.add(site(p))
  }
  // 西衔接带（连创客巷巷门方向）+ 东南街角小台
  for (let ix = 0; ix < 3; ix++) for (let iz = 0; iz < 5; iz++) pave(-9.2 + ix, -1.96 + iz)
  for (let ix = 0; ix < 2; ix++) for (let iz = 0; iz < 2; iz++) pave(8.62 + ix, -8.62 + iz)

  // ================= 环形散步道（R6.8、宽 1.6，24 段弧形薄板）+ 内缘灯线 =================
  const ringGroup = new THREE.Group()
  const SEGS = 24
  for (let k = 0; k < SEGS; k++) {
    const a = (k * Math.PI * 2) / SEGS + Math.PI / SEGS
    const seg = box(1.78, 0.06, 1.6, M.paver)
    seg.position.set(Math.cos(a) * 6.8, 0.46, Math.sin(a) * 6.8 + 0.5)
    seg.rotation.y = -a
    ringGroup.add(site(seg))
    // 段间缝线
    const joint = box(0.05, 0.03, 1.6, M.paverDark)
    joint.position.set(Math.cos(a + Math.PI / SEGS) * 6.8, 0.47, Math.sin(a + Math.PI / SEGS) * 6.8 + 0.5)
    joint.rotation.y = -(a + Math.PI / SEGS)
    ringGroup.add(site(joint))
    // 内缘蓝灯点（2 颗/段）
    for (const dm of [-1, 1]) {
      const dot = mesh(new THREE.SphereGeometry(0.045, 8, 6), M.blue)
      const aa = a + (dm * 0.1)
      dot.position.set(Math.cos(aa) * 6.05, 0.5, Math.sin(aa) * 6.05 + 0.5)
      ringGroup.add(site(dot))
    }
  }
  root.add(ringGroup)

  // ================= 下沉讲座台（椭圆 6.2×4.4，四级下探 0.6） =================
  const podium = new THREE.Group()
  podium.position.set(0, 0, 0.7)
  const levels: Array<[number, number, number, THREE.Material]> = [
    [3.1, 2.2, 0.46, M.stone],      // 级 1（外沿，椭圆 6.2×4.4）
    [2.8, 1.9, 0.31, M.stoneLight], // 级 2（5.6×3.8）
    [2.5, 1.6, 0.16, M.stone],      // 级 3（5.0×3.2）
    [2.2, 1.3, 0.04, M.stoneDark],  // 台底（4.4×2.6）
  ]
  for (const [rx, rz, h, m] of levels) {
    const step = cyl(rx, rx, 0.15, 40, m)
    step.scale.z = rz / rx
    step.position.y = h + 0.075
    podium.add(site(step))
  }
  // 台阶嵌灯（级 2 内沿 6 颗）
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3 + Math.PI / 6
    const led = mesh(new THREE.SphereGeometry(0.06, 8, 6), M.cyan)
    led.position.set(Math.cos(a) * 2.35, 0.31, Math.sin(a) * 1.9 - 0.0)
    led.scale.z = 0.72
    podium.add(site(led))
  }
  // 级 1 上沿环形线性灯槽（12 段，夜为台缘光框）
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6 + Math.PI / 12
    const strip = box(1.1, 0.03, 0.14, M.blue)
    strip.position.set(Math.cos(a) * 2.72, 0.535, (Math.sin(a) * 1.95))
    strip.rotation.y = -a
    podium.add(site(strip))
  }
  // 台沿坐凳（4 组，贴级 1 外沿）
  for (const [bx, bz, br] of [[3.05, 0, -Math.PI / 2], [-3.05, 0, Math.PI / 2], [0, 2.2, Math.PI], [0, -2.2, 0]] as Array<[number, number, number]>) {
    const b = ctx.blocks.bench({ x: bx, z: bz, rotY: br })
    b.position.y = 0.05
    podium.add(b)
  }
  // 北缘缓坡板（对算芯楼方向）
  const ramp = box(1.4, 0.05, 1.1, M.stoneLight)
  ramp.position.set(0, 0.47, 2.55)
  ramp.rotation.x = 0.16
  podium.add(site(ramp))
  root.add(podium)

  // ================= ∞ 双环雕塑（台畔北侧，对望一期东南角 ∞ 环） =================
  const infSculpt = new THREE.Group()
  const sBase = cyl(1.9, 2.05, 0.3, 28, M.stoneDark)
  sBase.position.y = 0.15
  infSculpt.add(site(sBase))
  const sPlint = cyl(1.5, 1.6, 0.22, 28, M.stone)
  sPlint.position.y = 0.41
  infSculpt.add(site(sPlint))
  for (const [cx2, rotX, tilt] of [[-1.05, 0, 0.25], [1.05, 0, -0.25]] as Array<[number, number, number]>) {
    const ringT = mesh(new THREE.TorusGeometry(0.95, 0.11, 12, 44), M.silver)
    ringT.position.set(cx2, 2.15, 0)
    ringT.rotation.y = Math.PI / 2 + (cx2 > 0 ? 0.3 : -0.3)
    ringT.rotation.x = tilt
    infSculpt.add(site(ringT))
    const ringGlow = mesh(new THREE.TorusGeometry(0.95, 0.035, 8, 40), M.blue)
    ringGlow.position.set(cx2, 2.15, 0)
    ringGlow.rotation.y = Math.PI / 2 + (cx2 > 0 ? 0.3 : -0.3)
    ringGlow.rotation.x = tilt
    infSculpt.add(site(ringGlow))
    const strut = cyl(0.07, 0.09, 1.5, 10, M.silverDark)
    strut.position.set(cx2, 1.0, 0)
    strut.rotation.z = cx2 > 0 ? -0.15 : 0.15
    infSculpt.add(site(strut))
  }
  const beadTop = mesh(new THREE.SphereGeometry(0.12, 10, 8), M.blue)
  beadTop.position.y = 3.15
  infSculpt.add(site(beadTop))
  infSculpt.position.set(0, 0, 2.4)
  root.add(infSculpt)

  // ================= 发光 ∞ 地面双环（台东草地，夜为谷中一圈光） =================
  for (const [cx3, cz3] of [[3.6, -1.6], [5.4, -1.6]] as Array<[number, number]>) {
    const ring = mesh(new THREE.TorusGeometry(0.85, 0.055, 8, 48), M.blue)
    ring.rotation.x = -Math.PI / 2
    ring.position.set(cx3, 0.2, cz3)
    root.add(site(ring))
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4
      const seed = mesh(new THREE.SphereGeometry(0.035, 6, 4), M.warm)
      seed.position.set(cx3 + Math.cos(a) * 0.85, 0.16, cz3 + Math.sin(a) * 0.85)
      root.add(site(seed))
    }
  }
  // 地面光环的内衬青绿细环（双环中心各一）·
  for (const [cx4, cz4] of [[4.5, -1.6], [3.6, -1.6]] as Array<[number, number]>) {
    const inner = mesh(new THREE.TorusGeometry(0.42, 0.04, 8, 36), M.cyan)
    inner.rotation.x = -Math.PI / 2
    inner.position.set(cx4, 0.16, cz4)
    root.add(site(inner))
  }
  // 西衔接带光链（引向创客巷巷门，36 颗）
  for (let k = 0; k < 36; k++) {
    const t = k / 35
    const d = k % 2 === 0 ? 0.6 : -0.6
    const dot = mesh(new THREE.SphereGeometry(0.045, 8, 6), M.blue)
    dot.position.set(-9.4 + t * 1.8, 0.52, 0.6 + d * (0.5 + 0.35 * Math.sin(t * 9)))
    root.add(site(dot))
  }
  // 讲座石（台内两块可坐白石 + 一块青石）
  const stoneA = mesh(new THREE.IcosahedronGeometry(0.55, 1), M.stoneLight)
  stoneA.position.set(-1.6, 0.35, -0.3)
  podium.add(site(stoneA))
  const stoneB = mesh(new THREE.IcosahedronGeometry(0.45, 1), M.stoneLight)
  stoneB.position.set(1.4, 0.3, 0.4)
  podium.add(site(stoneB))
  const stoneC = mesh(new THREE.DodecahedronGeometry(0.36, 0), M.stone)
  stoneC.position.set(2.3, 0.25, 1.0)
  podium.add(site(stoneC))

  // ================= 树阵 20 株（四角组团 + 东西缘列植 + 北缘 + 台后） =================
  const treeSpots: Array<[number, number, number]> = [
    [-8.3, 7.6, 1.0], [-6.4, 8.7, 0.9], [8.3, 7.6, 1.0], [6.4, 8.7, 0.9],
    [-8.3, -7.6, 1.0], [-6.4, -8.7, 0.9], [8.3, -7.6, 1.0], [6.4, -8.7, 0.9],
    [-8.9, -1.6, 0.92], [-8.9, 2.6, 0.92],
    [8.9, -2.5, 0.92], [8.9, 3.4, 0.92],
    [0, 8.9, 0.95], [-3.2, 4.8, 0.88],
    [-7.2, -9.0, 0.85], [7.2, -9.0, 0.85], [-7.2, 9.0, 0.85], [7.2, 9.0, 0.85],
    [-8.9, -7.2, 0.8], [8.9, -8.4, 0.8],
  ]
  for (const [tx, tz, ts] of treeSpots) {
    root.add(denseTree(tx, tz, ts))
    // 树池圈
    const ring = mesh(new THREE.TorusGeometry(0.85, 0.09, 8, 20), M.stoneDark)
    ring.rotation.x = Math.PI / 2
    ring.position.set(tx, 0.24, tz)
    root.add(site(ring))
  }

  // ================= 灌木花坛 8 团（沿环外缘分布） =================
  const shrubGroups: Array<[number, number]> = [
    [-6.9, -7.1], [-3.4, -9.0], [2.0, -9.1], [6.9, -6.4],
    [7.6, 3.9], [5.2, 8.3], [-4.6, 9.0], [-8.4, 5.2],
    [-1.2, -8.6], [8.7, 0.9], [-9.3, -4.6], [0.4, 9.3],
  ]
  for (const [sx, sz] of shrubGroups) {
    for (let k = 0; k < 3; k++) {
      const shrub = mesh(new THREE.IcosahedronGeometry(0.5 + rng() * 0.25, 1), [M.leafA, M.leafB, M.leafC][k])
      shrub.position.set(sx + (rng() - 0.5) * 1.4, 0.55, sz + (rng() - 0.5) * 1.4)
      root.add(site(shrub))
    }
    const turf = cyl(0.82, 0.95, 0.16, 16, M.stoneDark)
    turf.position.set(sx, 0.08, sz)
    root.add(site(turf))
  }
  // 花径（环外一周 72 株小花：茎 + 花球，双环分布）
  for (let k = 0; k < 72; k++) {
    const a = (k * Math.PI * 2) / 72 + (k % 2) * 0.04
    const r2 = 7.9 + (k % 3) * 0.55
    const stem = cyl(0.03, 0.035, 0.52, 6, M.leafA)
    stem.position.set(Math.cos(a) * r2, 0.26, Math.sin(a) * r2 + 0.5)
    root.add(site(stem))
    const bloom = mesh(new THREE.IcosahedronGeometry(0.14, 0), [M.cyan, M.warm, M.leafC][k % 3])
    bloom.position.set(Math.cos(a) * r2, 0.6, Math.sin(a) * r2 + 0.5)
    root.add(site(bloom))
  }
  // 雾喷装置 4 组（草坪保湿小杆）
  for (const [fx, fz] of [[-5.4, -4.6], [5.0, -4.9], [-4.8, 6.6], [5.4, 6.2]] as Array<[number, number]>) {
    const nozzle = cyl(0.06, 0.08, 0.5, 8, M.graphite)
    nozzle.position.set(fx, 0.25, fz)
    root.add(site(nozzle))
    const tip = mesh(new THREE.SphereGeometry(0.1, 8, 6), M.silverDark)
    tip.position.set(fx, 0.55, fz)
    root.add(site(tip))
    const base = cyl(0.16, 0.19, 0.08, 10, M.stoneDark)
    base.position.set(fx, 0.04, fz)
    root.add(site(base))
  }
  // ∞ 地面环畔四块坐石
  for (const [sx2, sz2, s] of [[3.1, -3.2, 0.5], [4.6, -3.4, 0.42], [5.9, -3.0, 0.46], [3.9, 0.1, 0.4]] as Array<[number, number, number]>) {
    const rock = mesh(new THREE.IcosahedronGeometry(s, 1), M.stone)
    rock.position.set(sx2, s * 0.4, sz2)
    rock.rotation.y = s * 3
    root.add(site(rock))
  }

  // ================= 蓝光灯柱 4（h6、四角）+ 树池地灯 + 坐凳小件 =================
  for (const [lx, lz] of [[-7.8, -7.0], [7.8, -7.0], [-7.8, 7.0], [7.8, 7.0]] as Array<[number, number]>) {
    const pole = cyl(0.1, 0.14, 6.0, 12, M.graphite)
    pole.position.set(lx, 3.0, lz)
    root.add(site(pole))
    const head = mesh(new THREE.SphereGeometry(0.24, 12, 8), M.blue)
    head.position.set(lx, 6.2, lz)
    root.add(site(head))
    const collar = mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 20), M.cyan)
    collar.rotation.x = Math.PI / 2
    collar.position.set(lx, 0.3, lz)
    root.add(site(collar))
    // 柱身三环箍（灯柱细节）
    for (const cy of [1.5, 3.0, 4.5]) {
      const hoop = mesh(new THREE.TorusGeometry(0.16, 0.04, 8, 18), M.silverDark)
      hoop.rotation.x = Math.PI / 2
      hoop.position.set(lx, cy, lz)
      root.add(site(hoop))
    }
    // 柱首小翅
    for (const s of [-1, 1]) {
      const fin = box(0.05, 0.5, 0.34, M.silverDark)
      fin.position.set(lx + s * 0.14, 6.32, lz)
      fin.rotation.z = s * 0.3
      root.add(site(fin))
    }
  }
  // 树池地灯 12（环外沿散点）
  for (const [lx2, lz2] of [[-8.9, -4.8], [-7.3, -8.8], [-2.4, -9.3], [2.6, -9.3], [7.5, -8.6], [9.0, -4.4], [8.9, 6.2], [-8.9, 6.4], [-5.2, 9.0], [5.0, 9.0], [9.0, 1.2], [-9.0, -0.2]] as Array<[number, number]>) {
    const glow = mesh(new THREE.SphereGeometry(0.09, 8, 6), M.warm)
    glow.position.set(lx2, 0.2, lz2)
    root.add(site(glow))
    const pin = cyl(0.05, 0.06, 0.24, 8, M.silverDark)
    pin.position.set(lx2, 0.12, lz2)
    root.add(site(pin))
  }
  // 草地年轮线（广场西南草地 4 条浅步道）
  for (const gz of [-7.6, -6.6]) {
    const lane = box(7.0, 0.05, 0.5, M.paverDark)
    lane.position.set(-4.2, 0.5, gz)
    lane.rotation.y = 0.12
    root.add(site(lane))
  }
  // 环内沿坐凳 4（面向广场内部）
  for (const [bx2, bz2, br2] of [[-5.5, 1.1, Math.PI / 2], [5.5, 0, -Math.PI / 2], [0.6, -5.2, 0], [-0.9, 6.0, Math.PI]] as Array<[number, number, number]>) {
    root.add(ctx.blocks.bench({ x: bx2, z: bz2, rotY: br2 }))
  }
  // 垃圾箱 2 + 车架 1
  for (const [bx3, bz3] of [[-4.6, -6.9], [4.9, -6.6]] as Array<[number, number]>) {
    const binBody = box(0.5, 0.75, 0.45, M.graphite)
    binBody.position.set(bx3, 0.375, bz3)
    root.add(site(binBody))
    const binTop = box(0.54, 0.06, 0.49, M.silver)
    binTop.position.set(bx3, 0.78, bz3)
    root.add(site(binTop))
  }
  const rack2 = new THREE.Group()
  for (let k = 0; k < 6; k++) {
    const bar = box(1.6, 0.05, 0.05, M.silverDark)
    bar.position.set(-0.5 + k * 0.28, 0.28, 0)
    rack2.add(site(bar))
  }
  rack2.position.set(-3.4, 0, -6.3)
  rack2.rotation.y = 0.5
  root.add(rack2)

  return root
}
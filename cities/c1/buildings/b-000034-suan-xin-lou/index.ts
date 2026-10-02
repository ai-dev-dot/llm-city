import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'

/**
 * 算芯楼 · G5 求索智谷街区二期（宗地 G5-03+06，东北 1×2，20×40m，局部原点=宗地中心）
 * 智算中心：36m 纵深体量被 8.8m 通高玻璃「光之井」切成南北两段机柜大厅（各 15.6×13.3×12.9m）
 * ——东立面（对 H5）与山墙为服务器阵列格栅主面（三层带：玻璃底+竖格栅+横梃+蓝灯带+状态灯珠），
 * 西立面（对一期裙房）glassCurtain 密梃幕墙整面透亮；南段屋顶冷却塔列 ×5、北段屋顶散热鳍组 ×10；
 * 场地：草皮满铺至红线、西缘 Data Stream 光带、东「运算闲庭」、南北树带、东南角 0/1 雕塑。
 * 约定：随机全部走 ctx.rng()（确定性）；材质仅在单栋内共享；景观件打 userData.site（R13 豁免）。
 * 布局：本体 x[-8,8]、z[-18,18]（退线环形 2m 全做场地）；北段大厅 z=+11，南段 z=-11，光井 z=0。
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

  // ---- 材质（单栋内共享；配色延续 G5 银蓝科技风）----
  const M = {
    glass: stdMaterial('#9EC5DD', { metalness: 0.5, roughness: 0.18, emissive: '#C4DFF0', emissiveIntensity: 0.3 }),
    glassTube: stdMaterial('#9EC5DD', { metalness: 0.5, roughness: 0.2, emissive: '#BFE3F5', emissiveIntensity: 0.4, transparent: true, opacity: 0.55 }),
    skyglass: stdMaterial('#BFE0F0', { metalness: 0.4, roughness: 0.15, emissive: '#C4DFF0', emissiveIntensity: 0.6 }),
    silver: stdMaterial('#B8BCC2', { metalness: 0.8, roughness: 0.35 }),
    silverDark: stdMaterial('#8A9098', { metalness: 0.7, roughness: 0.4 }),
    graphite: stdMaterial('#2A2E33', { metalness: 0.5, roughness: 0.5 }),
    vent: stdMaterial('#4A5568', { metalness: 0.6, roughness: 0.55 }),
    white: stdMaterial('#E8E6E1', { roughness: 0.5 }),
    stone: stdMaterial('#C4C1BA', { roughness: 0.85 }),
    stoneLight: stdMaterial('#D9D6CF', { roughness: 0.8 }),
    stoneDark: stdMaterial('#A8A5A0', { roughness: 0.85 }),
    paver: stdMaterial('#B4B1AB', { roughness: 0.9 }),
    path: stdMaterial('#A8AD96', { roughness: 0.95 }),
    gravel: stdMaterial('#9A9488', { roughness: 0.95 }),
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

  /** 浓荫树：5 叶 detail-2/1，冠形微偏走 rng（确定性），与一期同款加密版 */
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

  /** 植槽（石壁 + 土 + 三丛灌木），与一期同款 */
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

  // ================= 场地（20×40，草皮满铺至红线；2m 退线环带全做场地） =================
  const siteG = new THREE.Group()
  const grass = box(20, 0.4, 40, M.grass)
  grass.position.y = 0.2
  siteG.add(grass)

  const pave = (x: number, z: number): void => {
    const p = box(0.98, 0.1, 0.98, M.paver)
    p.position.set(x, 0.46, z)
    siteG.add(p)
  }
  // 西园区接口带（3 行 × 18 列延伸至宗地西缘，接一期东侧绿化与门厅站台）
  for (let ix = 0; ix < 3; ix++) for (let iz = 0; iz < 18; iz++) pave(-9.2 + ix, -9.35 + iz)
  // 门厅前站台（本体红线内，台阶踏面）
  for (let ix = 0; ix < 3; ix++) for (let iz = 0; iz < 6; iz++) pave(-8.2 + ix, -2.94 + iz)
  // 南角小广场（对 G6 预留轴线开口）
  for (let ix = 0; ix < 4; ix++) for (let iz = 0; iz < 4; iz++) pave(-1.47 + ix, -19.2 + iz)
  // 环带步道（薄板豁免）
  const walkN = box(16, 0.06, 1.3, M.path)
  walkN.position.set(0, 0.43, 18.55)
  siteG.add(walkN)
  const walkS = box(16, 0.06, 1.3, M.path)
  walkS.position.set(0, 0.43, -18.55)
  siteG.add(walkS)
  // 东「运算闲庭」：砾石带 + 三条小径
  const gravel = box(1.3, 0.06, 22, M.gravel)
  gravel.position.set(9.0, 0.43, 0)
  siteG.add(gravel)
  for (const z of [-8.7, 8.7]) {
    const p = box(1.3, 0.06, 5, M.path)
    p.position.set(9.0, 0.43, z)
    siteG.add(p)
  }

  // 灯光序列：Data Stream 数据流——西缘两排正弦波蓝光点汇入门阶（输入），东缘两排回流（输出）
  for (let k = 0; k < 40; k++) {
    const t = k / 39
    const x = -9.9 + t * 1.55
    for (const s of [-1, 1]) {
      const baseZ = (1 - t) * 2.4 + t * 0.5
      const dot = box(0.09, 0.055, 0.12, M.blue)
      dot.position.set(x, 0.5, s * (baseZ + 0.14 * Math.sin(t * Math.PI * 10)))
      siteG.add(dot)
    }
  }
  for (let k = 0; k < 8; k++) {
    const dot = box(0.09, 0.055, 0.12, M.blue)
    dot.position.set(-9.9 + k * 0.25, 0.5, 0)
    siteG.add(dot)
  }
  for (let k = 0; k < 32; k++) {
    const t = k / 31
    const x = 9.35 + t * 0.75
    for (const s of [-1, 1]) {
      const dot = box(0.08, 0.05, 0.1, M.blueSoft)
      dot.position.set(x, 0.48, s * (0.5 + 0.45 * Math.sin(t * Math.PI * 7)))
      siteG.add(dot)
    }
  }
  for (let k = 0; k < 30; k++) {
    const t = k / 29
    const x = 9.35 + t * 0.75
    const dot = box(0.07, 0.04, 0.08, M.blue)
    dot.position.set(x, 0.5, 0.12 * Math.sin(t * Math.PI * 5))
    siteG.add(dot)
  }
  // 南角「数据环」：半埋发光环（G6 方向的街角灯点）
  const southRing = mesh(new THREE.TorusGeometry(1.1, 0.05, 8, 48), M.blue)
  southRing.rotation.x = -Math.PI / 2
  southRing.position.set(0.6, 0.52, -17.3)
  siteG.add(site(southRing))
  // 步道石灯（8 颗，路口节奏）
  for (const [lx, lz] of [[-8.1, -15.6], [-8.1, 14.8], [8.6, -17.4], [8.6, 17.4], [0, 19.2], [0, -19.2], [-9.15, 8.6], [9.15, -8.6]] as Array<[number, number]>) {
    const glow = mesh(new THREE.SphereGeometry(0.1, 8, 6), M.blue)
    glow.position.set(lx, 0.18, lz)
    siteG.add(site(glow))
  }
  // 灌木丛（16 丛，沿步道与场地边点缀）
  const shrubSpots: Array<[number, number]> = [
    [-8.2, -14.5], [-8.2, -10.8], [-6.2, 18.35], [-3.4, 18.35], [3.4, 18.35], [6.2, 18.35],
    [-4.6, -18.35], [-1.8, -18.35], [4.6, -18.35], [7.4, -18.35],
    [8.75, -6.5], [8.75, -4.2], [8.75, 4.8], [8.75, 7.1],
    [-8.8, 7.6], [-8.8, -4.6],
  ]
  for (const [sxr, szr] of shrubSpots) {
    const shrub = mesh(new THREE.IcosahedronGeometry(0.55, 1), [M.leafA, M.leafB, M.leafC][Math.floor(rng() * 3)])
    shrub.position.set(sxr, 0.6, szr)
    siteG.add(site(shrub))
  }
  // 东闲庭碎石点缀
  for (let k = 0; k < 18; k++) {
    const peb = mesh(new THREE.IcosahedronGeometry(0.14 + rng() * 0.12, 0), M.gravel)
    peb.position.set(9.0 + (rng() - 0.5) * 1.1, 0.5, (rng() - 0.5) * 20)
    siteG.add(site(peb))
  }

  // 树阵（30 株：北带 6 / 南带 6 / 东带 9 / 西带 5 / 光井两侧 2 + 南角广场 1 + 光井内庭树 1）
  const treeSpots: Array<[number, number, number]> = [
    ...([-7.5, -4.5, -1.5, 1.5, 4.5, 7.5].map((x) => [x, 18.35, 1.0] as [number, number, number])),
    ...([-7.5, -4.5, -1.5, 1.5, 4.5, 7.5].map((x) => [x, -18.35, 1.0] as [number, number, number])),
    ...([-12, -8, -3.5, 0, 3.5, 8, 12].map((z) => [8.75, z, 0.92] as [number, number, number])),
    [8.6, 14.6, 0.85], [8.6, -14.6, 0.85],
    [-8.8, -12, 0.92], [-8.8, -6, 0.92], [-8.8, 5.6, 0.92], [-8.8, 10.8, 1.0], [-8.8, -0.8, 0.9],
    [-8.75, 2.6, 0.9], [8.75, -2.6, 0.9],
    [1.6, -17.9, 0.9],
    [-5.2, 17.6, 0.92], [5.2, 17.6, 0.92], [-5.2, -17.6, 0.92], [5.2, -17.6, 0.92],
    [8.7, 10.5, 0.88], [8.7, -10.5, 0.88],
  ]
  for (const [tx, tz, ts] of treeSpots) siteG.add(denseTree(tx, tz, ts * (0.92 + rng() * 0.18)))

  // 灯柱 / 坐凳 / 石球灯 / 绿篱 / 植槽 / 自行车架
  for (const [lx, lz] of [[-9.35, -3.4], [-9.35, 3.6], [9.35, -3.9], [9.35, 4.6], [-5.8, 18.75], [5.8, -18.75]] as Array<[number, number]>) {
    siteG.add(ctx.blocks.streetLamp({ x: lx, z: lz }))
  }
  const benchPos: Array<[number, number, number]> = [
    [-8.4, -4.2, Math.PI / 2], [-8.4, 4.0, Math.PI / 2],
    [8.75, -6.0, -Math.PI / 2], [8.75, 2.2, -Math.PI / 2],
    [-3.6, 18.5, Math.PI], [3.6, 18.5, Math.PI],
    [-3.6, -18.5, 0], [3.6, -18.5, 0],
    [0, 18.45, Math.PI], [0, -18.45, 0],
  ]
  for (const [bx, bz, br] of benchPos) siteG.add(ctx.blocks.bench({ x: bx, z: bz, rotY: br }))
  const bollardPos: Array<[number, number]> = [
    [-8.5, -9.3], [-8.5, -7.0], [-8.5, -1.2], [-8.5, 1.0], [-8.5, 5.6], [-8.5, 7.9],
    [9.1, -6.8], [9.1, -1.6], [9.1, 3.2], [9.1, 7.6],
    [-3.6, 18.35], [3.6, 18.35],
  ]
  for (const [bx, bz] of bollardPos) {
    const b = cyl(0.09, 0.11, 0.7, 8, M.blue)
    b.position.set(bx, 0.82, bz)
    siteG.add(b)
  }
  for (const [hx, hz] of [[-6, 18.7], [-3, 18.7], [0, 18.7], [3, 18.7], [6, 18.7]] as Array<[number, number]>) {
    siteG.add(ctx.blocks.hedge({ w: 3, x: hx, z: hz }))
  }
  for (const [px, pz, pr] of [[-8.55, 17.75, 0], [8.55, 17.75, 0], [-8.55, -17.75, Math.PI], [8.55, -17.75, Math.PI]] as Array<[number, number, number]>) {
    siteG.add(planterAt(px, pz, pr))
  }
  const rack = new THREE.Group()
  for (let k = 0; k < 7; k++) {
    const bar = box(1.8, 0.05, 0.05, M.silverDark)
    bar.position.set(-0.6 + k * 0.3, 0.28, 0)
    rack.add(bar)
  }
  rack.position.set(-8.5, 0, 1.9)
  siteG.add(site(rack))
  // 东南角「0/1 二进制音阶」雕塑（无穷母题的数字化落点）
  const binG = new THREE.Group()
  const binBase = box(3.2, 0.16, 1.0, M.stone)
  binBase.position.y = 0.08
  binG.add(binBase)
  for (let k = 0; k < 7; k++) {
    const d = box(0.4, 0.4, 0.4, M.graphite)
    d.position.set(k * 0.44 - 1.32, 0.38, 0)
    binG.add(d)
    const l = box(0.4, 0.4, 0.4, M.blue)
    l.position.set(k * 0.44 - 1.32, 0.8, -0.42)
    binG.add(l)
  }
  for (let k = 0; k < 7; k++) {
    const bar = box(0.1, 1.1 - k * 0.1, 0.1, k % 2 === 0 ? M.blueSoft : M.silverDark)
    bar.position.set(-1.32 + k * 0.44, 0.75 - k * 0.05, 0.42)
    binG.add(bar)
  }
  binG.position.set(7.55, 0, -17.75)
  binG.rotation.y = -Math.PI / 4
  siteG.add(site(binG))
  root.add(siteG)

  // ================= 机柜大厅立面构件（面朝 +Z 的「跨」，旋转定位到四面） =================
  /** 单跨机柜立面：三层带意象——玻璃底 + 8 根竖格栅 + 带顶横梃 + 蓝灯带 + 状态灯珠 4。
   *  玻璃面平齐 local z=0，格栅外挑 0.17（定位时让外沿贴 8.0/17.83 等红线内值）。 */
  const bayLocal = (span: number): THREE.Group => {
    const g = new THREE.Group()
    const bands = [
      { y0: 1.5, y1: 4.3 },
      { y0: 4.6, y1: 8.6 },
      { y0: 8.9, y1: 12.55 },
    ]
    for (const b of bands) {
      const bh = b.y1 - b.y0
      const gl = box(span - 0.08, bh, 0.07, M.glass)
      gl.position.set(0, (b.y0 + b.y1) / 2, 0.015)
      g.add(gl)
      for (let k = 0; k < 14; k++) {
        const slat = box(0.042, bh - 0.08, 0.05, M.silver)
        slat.position.set(-span / 2 + 0.12 + (k * (span - 0.24)) / 13, (b.y0 + b.y1) / 2, 0.13)
        g.add(slat)
      }
      for (let k = 0; k < 3; k++) {
        const louver = box(span - 0.3, 0.035, 0.09, M.vent)
        louver.position.set(0, b.y0 + 0.55 + k * 0.18, 0.09)
        g.add(louver)
      }
      const rail = box(span - 0.06, 0.07, 0.07, M.silverDark)
      rail.position.set(0, b.y1 - 0.035, 0.15)
      g.add(rail)
      const led = box(span - 0.3, 0.05, 0.06, M.blue)
      led.position.set(0, b.y1 - 0.16, 0.06)
      g.add(led)
      for (let k = 0; k < 6; k++) {
        const dot = box(0.055, 0.055, 0.055, k % 3 === 0 ? M.warm : M.blueSoft)
        dot.position.set(-span / 2 + (span * (k + 0.5)) / 6, b.y0 + 0.35, 0.1)
        g.add(dot)
      }
    }
    // 跨间竖向分隔缝（机柜单元边线）
    const seam = box(0.04, 12.9, 0.1, M.graphite)
    seam.position.set(0, 6.45, 0.02)
    g.add(seam)
    return g
  }

  // ================= 两段机柜大厅 =================
  for (const zc of [11.05, -11.05]) {
    const hall = new THREE.Group()
    // 结构芯体 + 勒脚 + 顶沿压边
    const core = box(15.5, 12.9, 13.3, M.graphite)
    core.position.y = 6.45
    hall.add(core)
    const plinth = box(15.9, 0.7, 13.7, M.stoneDark)
    plinth.position.y = 0.35
    hall.add(plinth)
    const cap = box(15.7, 0.3, 13.5, M.silver)
    cap.position.y = 13.05
    hall.add(cap)
    // 西立面「接口面」：手写密梃幕墙（面朝 -X，覆盖大厅纵深 13.1；亮青高反玻璃 + 银梃，官方正解配色）
    const wglass = box(0.1, 12.2, 13.1, M.glass)
    wglass.position.set(-7.83, 6.8, 0)
    hall.add(wglass)
    for (let k = 0; k <= 16; k++) {
      const mu = cyl(0.05, 0.05, 12.2, 8, M.silver)
      mu.position.set(-7.83, 6.8, -6.5 + k * 0.8125)
      hall.add(mu)
    }
    for (let k = 0; k <= 9; k++) {
      const hb = box(0.16, 0.055, 13.1, M.silver)
      hb.position.set(-7.77, 0.7 + (k * 12.2) / 9, 0)
      hall.add(hb)
    }
    // 内景机柜暖光带（透过幕墙可见的三排机架灯，横向沿 z）
    for (const [ly, lz] of [[3.1, -3.0], [6.7, 0.2], [10.3, 2.6]] as Array<[number, number]>) {
      const strip = box(0.14, 0.14, 6.5, M.warm)
      strip.position.set(-7.62, ly, lz)
      hall.add(strip)
    }
    // 东立面：7 跨格栅机柜（外沿至 x=8.0）
    for (let k = 0; k < 7; k++) {
      const bay = bayLocal(1.884)
      bay.rotation.y = Math.PI / 2
      bay.position.set(7.83, 0, -6.6 + k * 1.884 + 0.942)
      hall.add(bay)
    }
    // 东立面「算力状态」灯珠阵：上下两排流水位 LED（服务器工况灯意象）
    for (let k = 0; k < 44; k++) {
      const z = -6.25 + k * (12.5 / 43)
      for (const ly of [1.15, 12.3]) {
        const dot = box(0.055, 0.055, 0.055, k % 7 === 0 ? M.warm : M.blueSoft)
        dot.position.set(7.86, ly, z)
        hall.add(dot)
      }
    }
    // 东面玻璃后的机架纵列（透过幕墙可见的服务器机架柱与托板）
    for (let k = 0; k < 14; k++) {
      const z = -6.15 + k * (12.3 / 13)
      for (const ly of [3.0, 7.1, 11.2]) {
        const upright = box(0.1, 0.06, 0.06, M.silverDark)
        upright.position.set(7.55, ly, z)
        hall.add(upright)
        const tray = box(0.06, 0.035, 1.55, M.graphite)
        tray.position.set(7.51, ly - 0.75, z)
        hall.add(tray)
      }
    }
    // 勒脚一圈散热百叶片（机房通风意象）
    for (let k = 0; k < 26; k++) {
      for (const sx of [-7.92, 7.92]) {
        const louv = box(0.03, 0.3, 0.5, M.vent)
        louv.position.set(sx, 0.45, -6.25 + k * 0.5)
        hall.add(louv)
      }
    }
    for (let k = 0; k < 14; k++) {
      for (const sz of [-6.88, 6.88]) {
        const louv = box(0.5, 0.3, 0.03, M.vent)
        louv.position.set(-6.5 + k * 1.0, 0.45, sz)
        hall.add(louv)
      }
    }
    // 西玻璃内侧整机陈列（透明「接口面」透见的机架厅）
    for (let k = 0; k < 9; k++) {
      const z = -5.2 + k * 1.3
      for (const [cx, hh] of [[-7.5, 3.6], [-7.1, 3.6]] as Array<[number, number]>) {
        const post = box(0.22, hh, 0.22, M.silverDark)
        post.position.set(cx, 1.5 + hh / 2, z)
        hall.add(post)
        for (let r2 = 0; r2 < 3; r2++) {
          const shelf = box(0.5, 0.06, 0.5, M.graphite)
          shelf.position.set(cx, 0.6 + r2 * 1.15, z)
          hall.add(shelf)
        }
      }
    }
    hall.position.set(0, 0, zc)
    root.add(hall)

    // 山墙（北面朝 F4 / 南面朝 G6）：6 跨格栅
    const gableN = new THREE.Group()
    for (let k = 0; k < 6; k++) {
      const bay = bayLocal(2.6)
      bay.position.set(-7.8 + k * 2.6 + 1.3, 0, 0)
      gableN.add(bay)
    }
    gableN.position.set(0, 0, zc + 6.78) // z=17.83（北）或 -4.27（光井侧）
    root.add(gableN)
    const gableS = new THREE.Group()
    for (let k = 0; k < 6; k++) {
      const bay = bayLocal(2.6)
      bay.rotation.y = Math.PI
      bay.position.set(-7.8 + k * 2.6 + 1.3, 0, 0)
      gableS.add(bay)
    }
    gableS.position.set(0, 0, zc - 6.78) // z=-17.83（南）或 +4.27（光井侧）
    root.add(gableS)

    // 屋顶女儿墙：南北边 w15.6、东西边 w13.0 转 90°
    const rn = ctx.blocks.railing({ w: 15.6, x: 0, y: 13.2, z: 6.6 })
    hall.add(rn)
    const rs = ctx.blocks.railing({ w: 15.6, x: 0, y: 13.2, z: -6.6 })
    hall.add(rs)
    for (const rx of [-7.8, 7.8]) {
      const re = ctx.blocks.railing({ w: 13.0, x: 0, y: 13.2, z: 0 })
      re.rotation.y = Math.PI / 2
      re.position.x = rx
      hall.add(re)
    }
    // 女儿墙内侧连续蓝灯线（夜为屋顶轮廓光）
    for (const lz of [-6.55, 6.55]) {
      const line = box(15.4, 0.06, 0.06, M.blue)
      line.position.set(0, 13.32, lz)
      hall.add(line)
    }
    // 山墙顶「机柜齿冠」：细齿收边（屋顶女儿墙内）
    for (const gz of [6.45, -6.45]) {
      for (let k = 0; k < 31; k++) {
        const tooth = box(0.12, 0.42, 0.2, M.silverDark)
        tooth.position.set(-7.5 + k * 0.5, 12.62, gz)
        hall.add(tooth)
      }
    }

    if (zc > 0) {
      // 北段屋顶：散热鳍组 2 排 ×5（交错）+ 检修格栅步道 + 天窗带
      for (const [uz, x0] of [[-2.2, -5.2], [1.2, -3.9]] as Array<[number, number]>) {
        for (let k = 0; k < 5; k++) {
          const ux = x0 + k * 2.6
          const unit = new THREE.Group()
          const base = box(0.52, 0.14, 3.0, M.graphite)
          base.position.y = 13.27
          unit.add(base)
          for (let j = 0; j < 12; j++) {
            const fin = box(0.032, 0.5, 2.85, M.silverDark)
            fin.position.set(-0.176 + j * 0.032, 13.59, 0)
            unit.add(fin)
          }
          const pipe = cyl(0.05, 0.05, 2.95, 8, M.silver)
          pipe.rotation.x = Math.PI / 2
          pipe.position.y = 13.95
          unit.add(pipe)
          unit.position.set(ux, 0, uz)
          hall.add(unit)
        }
      }
      const walk = ctx.blocks.latticePanel({ w: 4.6, h: 1.3, cols: 4, rows: 2, x: 0, y: 13.26, z: -4.6 })
      walk.rotation.x = -Math.PI / 2
      hall.add(walk)
      for (const sx of [-6.9, 6.9]) {
        const sky = box(1.6, 0.1, 3.4, M.skyglass)
        sky.position.set(sx, 13.24, 4.0)
        hall.add(sky)
      }
      // 屋顶冷媒管道（汇入散热鳍组的主干意象）
      for (const [px, pz, pw] of [[-6.6, -0.6, 3.4], [6.6, -0.6, 3.4], [0, 3.4, 5.2]] as Array<[number, number, number]>) {
        const tube = cyl(0.08, 0.08, pw, 10, M.silverDark)
        tube.rotation.x = Math.PI / 2
        tube.position.set(px, 13.34, pz)
        hall.add(tube)
      }
    } else {
      // 南段屋顶：冷却塔列 ×5 + 检修格栅步道（两侧）
      for (const tx of [-4.9, -2.45, 0, 2.45, 4.9]) {
        const tower = new THREE.Group()
        const body = cyl(1.18, 0.95, 3.1, 30, M.white)
        body.position.y = 1.55
        tower.add(body)
        const ringTop = cyl(1.24, 1.18, 0.22, 30, M.silverDark)
        ringTop.position.y = 3.21
        tower.add(ringTop)
        const ringMid = cyl(1.08, 1.06, 0.16, 30, M.silverDark)
        ringMid.position.y = 1.5
        tower.add(ringMid)
        for (const ry of [1.62, 0.35]) {
          const hoop = mesh(new THREE.TorusGeometry(1.0, 0.05, 8, 30), M.silverDark)
          hoop.rotation.x = Math.PI / 2
          hoop.position.y = ry
          tower.add(hoop)
        }
        for (let k = 0; k < 12; k++) {
          const a = (k * Math.PI) / 6
          const rib = box(0.04, 2.55, 0.5, M.silver)
          rib.position.set(Math.cos(a) * 0.86, 1.5, Math.sin(a) * 0.86)
          rib.rotation.y = a
          tower.add(rib)
        }
        const grill = ctx.blocks.latticePanel({ w: 1.9, h: 1.9, cols: 4, rows: 4, bar: 0.09, x: 0, y: 3.34, z: 0 })
        grill.rotation.x = -Math.PI / 2
        tower.add(grill)
        const lamp = mesh(new THREE.SphereGeometry(0.09, 8, 6), M.blue)
        lamp.position.y = 3.52
        tower.add(lamp)
        // 塔身竖向波纹板（24 片贴筒身）
        for (let k = 0; k < 24; k++) {
          const a = (k * Math.PI) / 12
          const wave = box(0.035, 2.7, 0.16, M.white)
          wave.position.set(Math.cos(a) * 1.02, 1.42, Math.sin(a) * 1.02)
          wave.rotation.y = a + Math.PI / 2
          tower.add(wave)
        }
        const baseRing = cyl(1.4, 1.55, 0.24, 24, M.stone)
        baseRing.position.y = 0.12
        tower.add(baseRing)
        tower.position.set(tx, 13.2, 0)
        hall.add(tower)
      }
      // 屋顶管道网格（冷却主管意象，横贯南段屋顶）
      for (const [px, pz, pw] of [[-3.2, -2.6, 5.8], [3.2, -2.6, 5.8], [0, -4.4, 2.6]] as Array<[number, number, number]>) {
        const tube = cyl(0.09, 0.09, pw, 10, M.silverDark)
        tube.rotation.x = Math.PI / 2
        tube.position.set(px, 13.35, pz)
        hall.add(tube)
      }
      for (const wx of [-6.6, 6.6]) {
        const walk = ctx.blocks.latticePanel({ w: 1.8, h: 1.2, cols: 2, rows: 2, x: wx, y: 13.26, z: 0.8 })
        walk.rotation.x = -Math.PI / 2
        hall.add(walk)
      }
    }
  }

  // ================= 光之井（z=-4.4~4.4，通高 13.9m 玻璃中庭） =================
  const well = new THREE.Group()
  // 四角钢柱（带环箍）
  for (const [cx, cz] of [[-7.5, -4.1], [7.5, -4.1], [-7.5, 4.1], [7.5, 4.1]] as Array<[number, number]>) {
    const col = cyl(0.3, 0.34, 13.9, 12, M.silver)
    col.position.set(cx, 7.3, cz)
    well.add(col)
    for (let k = 0; k < 7; k++) {
      const tie = box(0.5, 0.09, 0.5, M.silverDark)
      tie.position.set(cx, 2.6 + k * 1.7, cz)
      well.add(tie)
    }
  }
  // 四面密梃玻璃幕墙（西面内凹 0.9m 成门厅，门头贴灯刻线）
  const cwE = ctx.blocks.glassCurtain({ w: 15.6, h: 13.2, cols: 12, rows: 6, x: 7.8, y: 0.7, z: 0 })
  cwE.rotation.y = Math.PI / 2
  well.add(cwE)
  const cwW = ctx.blocks.glassCurtain({ w: 15.6, h: 13.2, cols: 12, rows: 6, x: -6.9, y: 0.7, z: 0 })
  cwW.rotation.y = -Math.PI / 2
  well.add(cwW)
  const cwN = ctx.blocks.glassCurtain({ w: 15.6, h: 13.2, cols: 12, rows: 6, x: 0, y: 0.7, z: 4.3 })
  well.add(cwN)
  const cwS = ctx.blocks.glassCurtain({ w: 15.6, h: 13.2, cols: 12, rows: 6, x: 0, y: 0.7, z: -4.3 })
  cwS.rotation.y = Math.PI
  well.add(cwS)
  // 东侧「雨幕立柱」：玻璃外一排细柱 + 柱顶蓝珠（格栅语汇延伸）
  for (let k = 0; k < 9; k++) {
    const col = cyl(0.07, 0.09, 13.2, 8, M.silver)
    col.position.set(7.93, 7.3, -3.9 + k * 0.975)
    well.add(col)
    const bead = mesh(new THREE.SphereGeometry(0.08, 8, 6), M.blue)
    bead.position.set(7.93, 13.55, -3.9 + k * 0.975)
    well.add(bead)
  }
  // 北山墙顶呼吸蓝带（对 F4 街，夜观「智谷醒着」）
  const northBand = box(15.6, 0.12, 0.12, M.blue)
  northBand.position.set(0, 12.86, 17.72)
  root.add(northBand)
  // 门头蓝光刻线（西幕内侧）
  for (let k = 0; k < 6; k++) {
    const line = box(0.05, 1.8, 0.05, M.blue)
    line.position.set(-6.84, 4.9, -1.25 + k * 0.5)
    well.add(line)
  }
  // 玻璃连桥（y=8.3 横跨光井）+ 栏杆 + 桥底灯条
  const bridgeSlab = box(2.0, 0.18, 8.9, M.glassTube)
  bridgeSlab.position.y = 8.35
  well.add(bridgeSlab)
  for (const bx of [-1.05, 1.05]) {
    const br = ctx.blocks.railing({ w: 8.9, x: bx, y: 8.44, z: 0 })
    br.rotation.y = Math.PI / 2
    well.add(br)
    const led = box(0.08, 0.04, 8.6, M.blue)
    led.position.set(bx - 0.14, 8.28, 0)
    well.add(led)
  }
  // 底层玻璃庭院：铺装 + 涌泉水盘 + 暖光柱 + 庭树 + 坐凳
  for (let ix = 0; ix < 14; ix++) for (let iz = 0; iz < 6; iz++) {
    const t = box(0.98, 0.08, 0.98, M.paver)
    t.position.set(-6.37 + ix, 0.44, -2.45 + iz)
    well.add(site(t))
  }
  const basin = cyl(1.3, 1.5, 0.3, 20, M.stone)
  basin.position.set(-5.2, 0.15, 0)
  well.add(basin)
  const pond = cyl(1.15, 1.15, 0.18, 20, M.water)
  pond.position.set(-5.2, 0.42, 0)
  well.add(pond)
  const glowRing = mesh(new THREE.TorusGeometry(1.0, 0.04, 8, 32), M.blue)
  glowRing.rotation.x = Math.PI / 2
  glowRing.position.set(-5.2, 0.32, 0)
  well.add(glowRing)
  for (const jz of [-0.5, 0, 0.5]) {
    const jet = cyl(0.05, 0.08, 1.0, 8, M.jet)
    jet.position.set(-5.2, 0.95, jz)
    well.add(site(jet))
  }
  for (const [px, pz] of [[-6.5, -1.2], [6.5, -1.2], [-6.5, 1.2], [6.5, 1.2]] as Array<[number, number]>) {
    const base = cyl(0.4, 0.46, 0.16, 12, M.stoneDark)
    base.position.set(px, 0.08, pz)
    well.add(base)
    const lamp = cyl(0.28, 0.34, 3.3, 12, M.warm)
    lamp.position.set(px, 1.81, pz)
    well.add(site(lamp))
  }
  const innerTree = denseTree(6.1, 0, 1.35)
  well.add(innerTree)
  const b1 = ctx.blocks.bench({ x: 0.5, z: 3.0, rotY: Math.PI })
  well.add(b1)
  const b2 = ctx.blocks.bench({ x: -0.5, z: -3.0, rotY: 0 })
  well.add(b2)
  // 顶部光冠：4 条蓝光框 + 斜角玻璃顶棚 + 四角冠珠
  for (const [ex, ez, ew, ed] of [[0, 4.34, 15.6, 0.1], [0, -4.34, 15.6, 0.1], [7.73, 0, 0.1, 8.3], [-7.73, 0, 0.1, 8.3]] as Array<[number, number, number, number]>) {
    const edge = ex === 0 ? box(ew, 0.1, ed, M.blue) : box(ew, 0.1, ed, M.blue)
    edge.position.set(ex, 13.95, ez)
    well.add(edge)
  }
  const crownGlass = box(15.3, 0.07, 8.1, M.skyglass)
  crownGlass.position.y = 14.1
  well.add(crownGlass)
  for (const [px, pz] of [[-7.5, -4.05], [7.5, -4.05], [-7.5, 4.05], [7.5, 4.05]] as Array<[number, number]>) {
    const bead = mesh(new THREE.SphereGeometry(0.14, 8, 6), M.blue)
    bead.position.set(px, 14.0, pz)
    well.add(bead)
  }
  // 西侧入口：台阶（三级薄板，全收红线内）+ 悬挑雨棚 + 双柱
  for (let k = 0; k < 3; k++) {
    const tread = box(0.37, 0.05, 5.88, M.stoneDark)
    tread.position.set(-8.0 + 0.37 * k + 0.185, 0.445 + 0.127 * k, 0)
    well.add(tread)
    const riser = box(0.05, 0.127, 5.88, M.stone)
    riser.position.set(-8.0 + 0.37 * k + 0.37, 0.445 + 0.127 * k - 0.035, 0)
    well.add(riser)
  }
  const canopy = box(1.5, 0.3, 5.9, M.silver)
  canopy.position.set(-7.25, 4.55, 0)
  well.add(canopy)
  for (const cz2 of [-2.75, 2.75]) {
    const ccol = cyl(0.16, 0.18, 3.85, 8, M.silver)
    ccol.position.set(-7.15, 2.62, cz2)
    well.add(ccol)
  }
  for (const cz2 of [-2.85, 2.85]) {
    const led = box(1.4, 0.05, 0.08, M.blue)
    led.position.set(-7.25, 4.42, cz2)
    well.add(led)
  }
  root.add(well)

  return root
}
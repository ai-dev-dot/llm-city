import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'

/**
 * 创客巷 · G5 求索智谷街区三期（宗地 G5-07+08，西南 2×1，40×20m，局部原点=宗地中心）
 * 手作聚落：折巷三步一台——西段咖啡书店骑街口（西橱窗对学府操场）→ 中段巷北让出共享庭院
 * （树+木平台+涌泉）→ 东段巷收窄、钢架巷门对四期智谷广场；四栋坡顶工坊沿东西巷两列展开。
 * 广场语汇：坡顶人字架 + 天窗带 + 卷帘门 + 展示橱窗 + 檐下灯串；银蓝科技风延续 + 暖木与暖灯点缀。
 * 约定：随机全部走 ctx.rng()（确定性）；材质仅在单栋内共享；巷内家具体全打 userData.site（R13 豁免）。
 * 布局：宗地 x[-20,20]（东西 40）、z[-10,10]（南北 20）；本体 x[-18,18]、z[-8,8]；
 * 主巷 z[-3.1,3.1] 东西贯通；南列=木工坊(x[-15.5,-8])+3D 打印坊(x[-8,1])+木作后院(x[1,15.5])；
 * 北列=咖啡书店(x[-15.5,-8.5])+共享庭院(x[-7.5,2.5])+涂装坊(x[4,11])；东巷口钢架门 x≈15.2。
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

  // ---- 材质（单栋内共享；银蓝科技风 + 暖木/暖灯点缀）----
  const M = {
    glass: stdMaterial('#9EC5DD', { metalness: 0.5, roughness: 0.18, emissive: '#C4DFF0', emissiveIntensity: 0.3 }),
    glassWarm: stdMaterial('#A8C8D8', { metalness: 0.4, roughness: 0.2, emissive: '#FFE9A8', emissiveIntensity: 0.55 }),
    graphite: stdMaterial('#2A2E33', { metalness: 0.5, roughness: 0.5 }),
    vent: stdMaterial('#4A5568', { metalness: 0.6, roughness: 0.55 }),
    silver: stdMaterial('#B8BCC2', { metalness: 0.8, roughness: 0.35 }),
    silverDark: stdMaterial('#8A9098', { metalness: 0.7, roughness: 0.4 }),
    white: stdMaterial('#E8E6E1', { roughness: 0.5 }),
    plaster: stdMaterial('#C4C1BA', { roughness: 0.85 }),
    stone: stdMaterial('#C4C1BA', { roughness: 0.85 }),
    stoneDark: stdMaterial('#A8A5A0', { roughness: 0.85 }),
    paver: stdMaterial('#B0ACA6', { roughness: 0.92 }),
    paverDark: stdMaterial('#8E8A84', { roughness: 0.92 }),
    grass: stdMaterial('#7B8A6F', { roughness: 0.95 }),
    path: stdMaterial('#A8AD96', { roughness: 0.95 }),
    trunk: stdMaterial('#6B4A2F', { roughness: 0.9 }),
    leafA: stdMaterial('#6E8F63', { roughness: 0.9 }),
    leafB: stdMaterial('#5C7F55', { roughness: 0.9 }),
    leafC: stdMaterial('#7FA06E', { roughness: 0.9 }),
    wood: stdMaterial('#A87B4F', { roughness: 0.7 }),
    woodDark: stdMaterial('#7A5636', { roughness: 0.72 }),
    woodDeck: stdMaterial('#B58A5E', { roughness: 0.75 }),
    water: stdMaterial('#5E8CB4', { metalness: 0.9, roughness: 0.06, emissive: '#2E5A80', emissiveIntensity: 0.25 }),
    jet: stdMaterial('#BFE3F5', { emissive: '#BFE3F5', emissiveIntensity: 1.2, roughness: 0.3 }),
    blue: stdMaterial('#3FA9F5', { emissive: '#3FA9F5', emissiveIntensity: 2.0, roughness: 0.4 }),
    blueSoft: stdMaterial('#2E7FBF', { emissive: '#2E7FBF', emissiveIntensity: 1.2, roughness: 0.4 }),
    cyan: stdMaterial('#3FE0D0', { emissive: '#3FE0D0', emissiveIntensity: 1.8, roughness: 0.4 }),
    warm: stdMaterial('#FFE9A8', { emissive: '#FFE9A8', emissiveIntensity: 1.5, roughness: 0.4 }),
    awning: stdMaterial('#E2664F', { roughness: 0.75 }),
    awningCream: stdMaterial('#F2E9D8', { roughness: 0.8 }),
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

  /** 人字坡顶：脊线沿 x（坡面朝 ±z），w 沿 x、d 沿 z、rise 为脊高 */
  const pitched = (w: number, d: number, rise: number, m: THREE.Material): THREE.Group => {
    const g = new THREE.Group()
    const shape = new THREE.Shape()
    shape.moveTo(-d / 2, 0)
    shape.lineTo(0, rise)
    shape.lineTo(d / 2, 0)
    shape.closePath()
    const roof = mesh(new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false }), m)
    roof.rotation.y = Math.PI / 2
    roof.position.x = -w / 2
    g.add(roof)
    const ridge = cyl(0.08, 0.08, w, 8, m)
    ridge.rotation.z = Math.PI / 2
    ridge.position.y = rise
    g.add(ridge)
    // 屋面瓦楞肋条（每坡 8 条，平行脊线）
    for (const s of [-1, 1]) {
      for (let k = 0; k < 8; k++) {
        const t = 0.05 + (0.9 * k) / 7
        const pur = box(w - 0.15, 0.04, 0.14, M.graphite)
        pur.position.set(0, rise * (1 - t), (s * (t * d)) / 2)
        g.add(pur)
      }
    }
    // 檐口挑梁饰（坡底两侧各 7 根小托）
    for (let k = 0; k < 7; k++) {
      for (const s of [-1, 1]) {
        const cor = box(0.06, 0.15, 0.32, M.graphite)
        cor.position.set(-w / 2 + 0.25 + (k * (w - 0.5)) / 6, -0.08, s * (d / 2 - 0.26))
        g.add(cor)
      }
    }
    return g
  }

  /** 坊屋基体：背墙 + 两山墙 + 勒脚 + 背檐口；巷面（开口面）由调用方定制 */
  const shopShell = (
    x0: number, z0: number, w: number, d: number, wallH: number,
    wallM: THREE.Material, openFace: 'N' | 'S',
  ): THREE.Group => {
    const g = new THREE.Group()
    g.position.set(x0 + w / 2, 0, z0 + d / 2)
    const back = box(w, wallH, 0.24, wallM)
    back.position.y = wallH / 2
    back.position.z = openFace === 'N' ? d / 2 - 0.12 : -(d / 2 - 0.12)
    g.add(back)
    for (const sx of [-w / 2 + 0.12, w / 2 - 0.12]) {
      const gable = box(0.24, wallH, d, wallM)
      gable.position.set(sx, wallH / 2, 0)
      g.add(gable)
    }
    const plinth = box(w + 0.12, 0.44, d - 0.06, M.stoneDark)
    plinth.position.y = 0.22
    g.add(plinth)
    const cornice = box(w + 0.08, 0.12, 0.2, M.silverDark)
    cornice.position.set(0, wallH + 0.06, openFace === 'N' ? d / 2 - 0.16 : -(d / 2 - 0.16))
    g.add(cornice)
    return g
  }

  const root = new THREE.Group()

  // ================= 场地（40×20 草皮满铺；2m 环带全做场地） =================
  const siteG = new THREE.Group()
  const grass = box(40, 0.4, 20, M.grass)
  grass.position.y = 0.2
  siteG.add(grass)
  const pave = (x: number, z: number, m: THREE.Material = M.paver): void => {
    const p = box(0.98, 0.1, 0.98, m)
    p.position.set(x, 0.46, z)
    siteG.add(p)
  }
  // 西口站台（对学府操场）+ 东口小广场（对四期智谷广场）
  for (let ix = 0; ix < 2; ix++) for (let iz = 0; iz < 7; iz++) pave(-17.6 + ix, -3.43 + iz)
  for (let ix = 0; ix < 3; ix++) for (let iz = 0; iz < 7; iz++) pave(17.1 + ix, -3.43 + iz)
  // 巷面（本体巷铺装满铺，薄板豁免）
  for (let ix = 0; ix < 33; ix++) for (let iz = 0; iz < 7; iz++) pave(-16.16 + ix, -3.43 + iz)
  // 铺装嵌小块（每砖一角嵌深色小方块，步道缝意象）
  for (let ix = 0; ix < 33; ix++) for (let iz = 0; iz < 7; iz++) {
    const chip = box(0.18, 0.04, 0.18, M.paverDark)
    chip.position.set(-16.16 + ix + 0.3, 0.52, -3.43 + iz - 0.3)
    siteG.add(chip)
  }
  // 庭园喇叭口（巷北让出段）
  for (let ix = 0; ix < 10; ix++) for (let iz = 0; iz < 5; iz++) pave(-7.3 + ix, 3.25 + iz)
  // 北/南环带步道
  const walkN = box(36, 0.06, 1.4, M.path)
  walkN.position.set(0, 0.43, 8.6)
  siteG.add(walkN)
  const walkS = box(36, 0.06, 1.4, M.path)
  walkS.position.set(0, 0.43, -8.6)
  siteG.add(walkS)
  // 树阵（30 株：东西口对景 4 / 北带 10 / 南带 10 / 巷口 4 / 庭院外 2）
  const treeSpots: Array<[number, number, number]> = [
    [-17.0, -5.5, 0.85], [-17.0, 5.5, 0.85],
    [-16, 8.7, 0.92], [-12, 8.7, 0.95], [-8, 8.7, 0.95], [-4, 8.7, 0.95], [0, 8.7, 0.95], [4, 8.7, 0.95], [8, 8.7, 0.95], [13, 8.7, 0.95], [16.5, 8.7, 0.92], [19.0, 8.7, 0.85],
    [-16, -8.7, 0.92], [-13, -8.7, 0.95], [-9.5, -8.7, 0.95], [-6, -8.7, 0.95], [-2, -8.7, 0.95], [2, -8.7, 0.95], [6, -8.7, 0.95], [10, -8.7, 0.95], [14, -8.7, 0.95], [17.7, -8.7, 0.88], [19.0, -8.7, 0.85],
    [17.7, -4.8, 0.8], [17.7, 4.8, 0.8],
    [-19.0, -1.8, 0.85], [-19.0, 1.8, 0.85],
    [-3.2, 5.2, 0.8], [5.2, 5.2, 0.8],
    [-17.9, 8.7, 0.9], [17.9, 8.7, 0.9], [-18.6, -8.7, 0.85], [18.6, -8.7, 0.85],
  ]
  for (const [tx, tz, ts] of treeSpots) siteG.add(denseTree(tx, tz, ts))
  // 石凳（北/南环带）
  for (const [bx, bz, br] of [[-10, 8.9, Math.PI], [3, 8.9, Math.PI], [13, 8.9, Math.PI], [-10, -8.9, 0], [3, -8.9, 0], [13, -8.9, 0]] as Array<[number, number, number]>) {
    siteG.add(ctx.blocks.bench({ x: bx, z: bz, rotY: br }))
  }
  // 街沿树池（石圈 + 绿球，10 座）
  for (const [px4, pz4] of [[-10, 8.9], [3, 8.9], [13, 8.9], [-10, -8.9], [3, -8.9], [13, -8.9], [-16, 6.2], [-16, -6.2], [19, 6.2], [19, -6.2]] as Array<[number, number]>) {
    const ring = mesh(new THREE.TorusGeometry(0.62, 0.1, 8, 16), M.stoneDark)
    ring.rotation.x = Math.PI / 2
    ring.position.set(px4, 0.2, pz4)
    siteG.add(site(ring))
    const plant = mesh(new THREE.SphereGeometry(0.4, 8, 6), M.leafA)
    plant.position.set(px4, 0.55, pz4)
    siteG.add(site(plant))
  }
  // 巷内小物：电箱 / 消防栓 / 导视牌
  const elecBox = box(0.5, 0.9, 0.36, M.vent)
  elecBox.position.set(-14.1, 0.45, 3.0)
  siteG.add(site(elecBox))
  const hydrant = new THREE.Group()
  const hBody = cyl(0.14, 0.17, 0.55, 10, M.blueSoft)
  hBody.position.y = 0.275
  hydrant.add(site(hBody))
  const hCap = box(0.26, 0.1, 0.26, M.blueSoft)
  hCap.position.y = 0.57
  hydrant.add(site(hCap))
  hydrant.position.set(-11.9, 0, -3.0)
  siteG.add(hydrant)
  const guide = new THREE.Group()
  const gPost = cyl(0.04, 0.05, 2.4, 8, M.graphite)
  gPost.position.y = 1.2
  guide.add(site(gPost))
  const gPanel = box(0.06, 0.5, 0.8, M.cyan)
  gPanel.position.y = 2.1
  guide.add(site(gPanel))
  guide.position.set(14.2, 0, 2.9)
  siteG.add(guide)
  // 自行车架 2 组（西口 + 庭院角）
  for (const [rx5, rz5] of [[-17.3, -2.6], [6.6, 3.4]] as Array<[number, number]>) {
    const rack = new THREE.Group()
    for (let k = 0; k < 7; k++) {
      const bar = box(1.8, 0.05, 0.05, M.silverDark)
      bar.position.set(-0.6 + k * 0.3, 0.28, 0)
      rack.add(site(bar))
    }
    rack.position.set(rx5, 0, rz5)
    rack.rotation.y = 0.4
    siteG.add(rack)
  }
  // 消防栓 2（巷中段）
  const hydrant2 = new THREE.Group()
  const hb2 = cyl(0.13, 0.16, 0.5, 10, M.blueSoft)
  hb2.position.y = 0.25
  hydrant2.add(site(hb2))
  const hc2 = box(0.24, 0.09, 0.24, M.blueSoft)
  hc2.position.y = 0.53
  hydrant2.add(site(hc2))
  hydrant2.position.set(1.9, 0, 3.0)
  siteG.add(hydrant2)
  // 街沿矮灯
  for (const [lx, lz] of [[-17.9, -5.1], [-17.9, 5.1], [17.9, -5.1], [17.9, 5.1], [0, 9.4], [0, -9.4]] as Array<[number, number]>) {
    const b = cyl(0.08, 0.1, 0.65, 8, M.blue)
    b.position.set(lx, 0.85, lz)
    siteG.add(b)
  }

  // ================= 巷地面：排水沟盖 + 内嵌蓝灯线 =================
  const drain = new THREE.Group()
  for (let k = 0; k < 375; k++) {
    const bar = box(0.06, 0.03, 0.5, M.silverDark)
    bar.position.set(-15.9 + k * 0.085, 0.53, 0)
    drain.add(bar)
  }
  for (const sz of [-0.29, 0.29]) {
    const edge = box(31.6, 0.05, 0.05, M.silver)
    edge.position.set(0, 0.52, sz)
    drain.add(edge)
  }
  for (const bx of [-13, -8.5, -4, 0.5, 5, 9.5, 13.5]) {
    const led = box(0.35, 0.03, 0.12, M.blue)
    led.position.set(bx, 0.44, -0.33)
    drain.add(led)
  }
  siteG.add(site(drain))

  // ================= 咖啡书店（北列西：两层 + 西橱窗对学府 + 骑楼） =================
  const bookshop = new THREE.Group()
  const bsW = 7.0
  const bsD = 4.8
  const bsCX = -12.0
  const bsCZ = 5.6
  bookshop.position.set(bsCX, 0, bsCZ)
  const bsShell = shopShell(-bsW / 2, -bsD / 2, bsW, bsD, 8.8, M.white, 'S')
  bookshop.add(bsShell)
  // 巷侧（南面）一层全开玻璃 + 中门
  const shopFront = box(bsW - 0.4, 3.4, 0.1, M.glassWarm)
  shopFront.position.set(0, 2.1, -bsD / 2 + 0.09)
  bookshop.add(shopFront)
  for (const fx of [-2.4, -0.8, 0.8, 2.4]) {
    const fm = box(0.12, 3.4, 0.16, M.silver)
    fm.position.set(fx, 2.1, -bsD / 2 + 0.09)
    bookshop.add(fm)
  }
  const bsDoor = box(1.7, 3.2, 0.1, M.wood)
  bsDoor.position.set(0, 2.0, -bsD / 2 + 0.14)
  bookshop.add(bsDoor)
  // 二层巷侧木格栅窗带 + 内侧书架墙（透窗可见的书脊阵列）
  const upper = box(bsW - 0.3, 1.5, 0.1, M.glass)
  upper.position.set(0, 5.3, -bsD / 2 + 0.1)
  bookshop.add(upper)
  for (let k = 0; k < 12; k++) {
    const slat = box(0.04, 1.45, 0.06, M.wood)
    slat.position.set(-3.1 + k * 0.56, 5.25, -bsD / 2 + 0.15)
    bookshop.add(slat)
  }
  for (let k = 0; k < 14; k++) {
    const shelf = box(0.06, 1.35, 0.3, k % 2 === 0 ? M.wood : M.woodDark)
    shelf.position.set(-3.0 + k * 0.45, 5.3, -bsD / 2 + 0.55)
    bookshop.add(shelf)
    for (let r = 0; r < 3; r++) {
      const bookSpine = box(0.05, 0.28 + rng() * 0.2, 0.22, r % 3 === 0 ? M.awning : r % 3 === 1 ? M.cyan : M.warm)
      bookSpine.position.set(-3.0 + k * 0.45 + (rng() - 0.5) * 0.1, 4.75 + r * 0.4, -bsD / 2 + 0.55)
      bookshop.add(bookSpine)
    }
  }
  // 西面大橱窗 (对学府操场) + 密梃
  for (const [gz, gh] of [[1.7, 3.4], [5.0, 2.2], [7.1, 1.6]] as Array<[number, number]>) {
    const pane = box(0.1, gh, bsD - 0.4, M.glass)
    pane.position.set(-bsW / 2 + 0.09, gz, 0)
    bookshop.add(pane)
  }
  for (let k = 0; k < 3; k++) {
    const mu = cyl(0.05, 0.05, 8.7, 8, M.silver)
    mu.position.set(-bsW / 2 + 0.12, 4.55, -1.5 + k * 1.5)
    bookshop.add(mu)
  }
  // 招牌「创客书房」（西墙面，对学府）
  const bsSign = ctx.blocks.neonSign({ w: 3.2, h: 0.75, color: '#FFE9A8', x: -bsW / 2 + 0.06, y: 4.3, z: 0 })
  bsSign.rotation.y = Math.PI / 2
  bookshop.add(bsSign)
  // 平屋顶 + 女儿墙 + 屋顶设备
  const bsRoof = box(bsW + 0.1, 0.24, bsD, M.graphite)
  bsRoof.position.set(0, 8.92, 0)
  bookshop.add(bsRoof)
  const bsParapetN = box(bsW, 0.5, 0.2, M.white)
  bsParapetN.position.set(0, 9.15, bsD / 2 - 0.1)
  bookshop.add(bsParapetN)
  const bsParapetE = box(0.2, 0.5, bsD, M.white)
  bsParapetE.position.set(bsW / 2, 9.15, 0)
  bookshop.add(bsParapetE)
  const hvac = box(1.5, 0.7, 1.2, M.silverDark)
  hvac.position.set(-1.2, 9.55, 1.0)
  bookshop.add(hvac)
  // 骑楼三柱 + 西瓜红遮阳棚（站街口的暖色帘）
  for (const cx2 of [-2.7, 0, 2.7]) {
    const col = cyl(0.14, 0.16, 4.3, 10, M.silverDark)
    col.position.set(cx2, 2.15, -bsD / 2 - 0.95)
    bookshop.add(col)
  }
  const bsAwning = box(bsW + 0.8, 0.1, 1.9, M.awning)
  bsAwning.position.set(0.4, 4.25, -bsD / 2 - 0.85)
  bsAwning.rotation.x = 0.28
  bookshop.add(bsAwning)
  const bsFringe = box(bsW + 0.8, 0.1, 0.1, M.awningCream)
  bsFringe.position.set(0.4, 4.18, -bsD / 2 - 1.7)
  bookshop.add(bsFringe)
  // 书店门前三级外摆台（靠巷侧落座）
  for (let k = 0; k < 3; k++) {
    const tread = box(2.4, 0.05, 0.42, M.woodDeck)
    tread.position.set(-1.0, 0.55 + 0.1 * k, -bsD / 2 - 0.25 - 0.42 * k)
    bookshop.add(site(tread))
  }
  // 二层窗台花箱（4 只，暖色点缀）
  for (const fx3 of [-2.6, -1.3, 1.3, 2.6]) {
    const planter = box(1.0, 0.3, 0.4, M.wood)
    planter.position.set(fx3, 4.45, -bsD / 2 + 0.25)
    bookshop.add(planter)
    for (let p = 0; p < 3; p++) {
      const flower = mesh(new THREE.SphereGeometry(0.08, 8, 6), [M.awning, M.awningCream, M.awning][p])
      flower.position.set(fx3 - 0.3 + p * 0.3, 4.7, -bsD / 2 + 0.25)
      bookshop.add(flower)
    }
  }
  root.add(bookshop)

  // ================= 涂装坊（北列东：波纹板 + 卷帘门 + 蓝白斜纹 + 烟囱） =================
  const paintShop = new THREE.Group()
  const psW = 7.0
  const psD = 4.8
  const psCX = 7.5
  const psCZ = 5.6
  paintShop.position.set(psCX, 0, psCZ)
  const psShell = shopShell(-psW / 2, -psD / 2, psW, psD, 7.2, M.silverDark, 'S')
  paintShop.add(psShell)
  // 巷侧卷帘门（半开格栅）
  for (let k = 0; k < 20; k++) {
    const slat = box(psW - 0.8, 0.11, 0.05, k % 2 === 0 ? M.silver : M.silverDark)
    slat.position.set(0.4, 0.74 + k * 0.105, -psD / 2 + 0.1)
    paintShop.add(slat)
  }
  // 蓝白斜条纹试验色块
  const stripe = box(3.6, 1.6, 0.06, M.white)
  stripe.position.set(-1.4, 5.6, -psD / 2 + 0.09)
  paintShop.add(stripe)
  for (let k = 0; k < 6; k++) {
    const band = box(0.3, 1.66, 0.07, M.blue)
    band.position.set(-2.8 + k * 0.56, 5.6, -psD / 2 + 0.08)
    band.rotation.z = 0.5
    paintShop.add(band)
  }
  // 东侧通风百叶 3
  for (let k = 0; k < 3; k++) {
    const louv = box(0.06, 0.85, 0.5, M.vent)
    louv.position.set(psW / 2 - 0.1, 3.4 + k * 1.5, 0)
    paintShop.add(louv)
  }
  // 坡顶 + 天窗带
  const psRoof = pitched(psW + 0.1, psD, 1.8, M.graphite)
  psRoof.position.y = 7.2
  paintShop.add(psRoof)
  // 北墙（背巷）高窗 3
  for (const px3 of [-2.2, 0, 2.2]) {
    const win = box(0.9, 1.0, 0.06, M.glass)
    win.position.set(px3, 4.0, psD / 2 - 0.05)
    paintShop.add(win)
    const sill = box(1.0, 0.06, 0.12, M.silverDark)
    sill.position.set(px3, 3.4, psD / 2 - 0.1)
    paintShop.add(sill)
  }
  // 屋顶换气天窗舱
  const psMonitor = new THREE.Group()
  const psMonBox = box(1.3, 0.6, 1.6, M.silverDark)
  psMonBox.position.y = 0.3
  psMonitor.add(psMonBox)
  const psGap = box(1.45, 0.1, 1.75, M.vent)
  psGap.position.y = 0.66
  psMonitor.add(psGap)
  psMonitor.position.set(-1.4, 8.05, -1.4)
  paintShop.add(psMonitor)
  const psSkylight = box(psW - 1.4, 0.1, 1.2, M.glass)
  psSkylight.position.set(0, 8.0, -0.6)
  psSkylight.rotation.x = -0.35
  paintShop.add(psSkylight)
  // 烟囱（顶排烟 + 双箍）
  const chimney = box(0.55, 2.6, 0.55, M.plaster)
  chimney.position.set(2.2, 8.2, 1.1)
  paintShop.add(chimney)
  for (const cy of [8.5, 9.6]) {
    const hoop = box(0.7, 0.1, 0.7, M.silverDark)
    hoop.position.set(2.2, cy, 1.1)
    paintShop.add(hoop)
  }
  const chTop = box(0.8, 0.22, 0.8, M.graphite)
  chTop.position.set(2.2, 9.75, 1.1)
  paintShop.add(chTop)
  // 巷侧喷绘星点（涂装试验的泼溅色斑，24 粒）
  for (let k = 0; k < 24; k++) {
    const splat = mesh(new THREE.SphereGeometry(0.035 + rng() * 0.05, 6, 4), [M.blue, M.cyan, M.warm][Math.floor(rng() * 3)])
    splat.position.set(-2.8 + rng() * 5.6, 3.4 + rng() * 2.6, -psD / 2 + 0.09)
    paintShop.add(splat)
  }
  root.add(paintShop)

  // ================= 木工坊（南列西：暖木墙 + 巷侧全开木作门 + 排烟管） =================
  const woodShop = new THREE.Group()
  const wsW = 7.5
  const wsD = 4.8
  const wsCX = -11.75
  const wsCZ = -5.6
  woodShop.position.set(wsCX, 0, wsCZ)
  const wsShell = shopShell(-wsW / 2, -wsD / 2, wsW, wsD, 4.6, M.wood, 'N')
  woodShop.add(wsShell)
  // 巷侧（北面）全开木作门：两扇卷帘 + 侧边人门
  for (let k = 0; k < 14; k++) {
    const slat = box(2.6, 0.13, 0.05, M.silverDark)
    slat.position.set(-2.1, 2.15 - k * 0.13, wsD / 2 - 0.08)
    woodShop.add(slat)
  }
  for (let k = 0; k < 14; k++) {
    const slat = box(2.0, 0.13, 0.05, M.silverDark)
    slat.position.set(1.8, 3.3 - k * 0.2, wsD / 2 - 0.08)
    woodShop.add(slat)
  }
  const wsDoor = box(0.95, 2.2, 0.1, M.woodDark)
  wsDoor.position.set(-0.1, 1.1, wsD / 2 - 0.02)
  woodShop.add(wsDoor)
  // 木墙竖板纹理（山墙与背檐）
  for (let k = 0; k < 15; k++) {
    const plank = box(0.05, 4.4, 0.06, M.woodDark)
    plank.position.set(-wsW / 2 + 0.3 + k * 0.49, 2.4, -wsD / 2 + 0.05)
    woodShop.add(plank)
  }
  for (let k = 0; k < 13; k++) {
    const plank = box(0.06, 4.4, 0.05, M.woodDark)
    plank.position.set(wsW / 2 - 0.05, 2.4, -wsD / 2 + 0.24 + k * 0.36)
    woodShop.add(plank)
  }
  // 坡顶 + 天窗带 + 天窗舱
  const wsRoof = pitched(wsW + 0.1, wsD, 2.9, M.silverDark)
  wsRoof.position.y = 4.6
  woodShop.add(wsRoof)
  const wsSkylight = box(1.3, 0.1, 3.6, M.glass)
  wsSkylight.position.set(0, 6.0, -0.4)
  wsSkylight.rotation.z = 0.28
  woodShop.add(wsSkylight)
  const wsMonitor = new THREE.Group()
  const monBox = box(1.4, 0.7, 1.8, M.woodDark)
  monBox.position.y = 5.0
  wsMonitor.add(monBox)
  const monRoof = pitched(1.6, 2.0, 0.5, M.silver)
  monRoof.position.y = 5.35
  wsMonitor.add(monRoof)
  wsMonitor.position.set(-1.8, 0, 0.5)
  woodShop.add(wsMonitor)
  // 西墙小窗 2
  for (const wz of [-1.4, 1.5]) {
    const win = box(0.06, 1.1, 1.0, M.glass)
    win.position.set(-wsW / 2 + 0.06, 2.8, wz)
    woodShop.add(win)
    for (const [ox, oz] of [[0, -0.5], [0, 0.5]] as Array<[number, number]>) {
      const wf = box(0.08, 1.1, 0.06, M.wood)
      wf.position.set(-wsW / 2 + 0.04, 2.8, wz + oz)
      woodShop.add(wf)
    }
  }
  // 排烟管穿顶
  const pipe = cyl(0.09, 0.09, 2.6, 8, M.silver)
  pipe.position.set(-2.2, 6.1, -0.8)
  pipe.rotation.z = 0.2
  woodShop.add(pipe)
  // 门口工具箱 + 木料堆（巷内）
  const toolChest = box(1.1, 0.6, 0.7, M.woodDark)
  toolChest.position.set(3.1, 0.3, wsD / 2 + 0.45)
  woodShop.add(site(toolChest))
  for (let k = 0; k < 4; k++) {
    const log = cyl(0.09, 0.09, 1.5, 6, M.wood)
    log.rotation.x = Math.PI / 2
    log.position.set(3.8 + k * 0.3, 0.09 + k * 0.14, wsD / 2 + 1.1)
    woodShop.add(site(log))
  }
  root.add(woodShop)

  // ================= 3D 打印坊（南列中：玻璃橱窗 + 青绿霓虹 + 展品） =================
  const printShop = new THREE.Group()
  const prW = 9.0
  const prD = 4.8
  const prCX = -3.5
  const prCZ = -5.6
  printShop.position.set(prCX, 0, prCZ)
  const prShell = shopShell(-prW / 2, -prD / 2, prW, prD, 5.2, M.white, 'N')
  printShop.add(prShell)
  // 巷侧整面玻璃橱窗
  const prGlass = box(prW - 0.5, 3.3, 0.1, M.glass)
  prGlass.position.set(0, 2.05, prD / 2 - 0.07)
  printShop.add(prGlass)
  for (let k = 0; k < 11; k++) {
    const mu = cyl(0.045, 0.045, 3.3, 8, M.silver)
    mu.position.set(-4.05 + k * 0.81, 2.05, prD / 2 - 0.02)
    printShop.add(mu)
  }
  const prLed = box(prW - 0.4, 0.08, 0.1, M.cyan)
  prLed.position.set(0, 3.75, prD / 2 - 0.06)
  printShop.add(prLed)
  // 橱窗内展品：齿轮 / 小花瓶 / 小火箭 / 抽象小人 / 球件
  const gear = mesh(new THREE.TorusGeometry(0.42, 0.11, 8, 14), M.silver)
  gear.rotation.y = Math.PI / 2
  gear.position.set(-2.8, 1.9, prD / 2 + 0.45)
  printShop.add(gear)
  const vase = cyl(0.16, 0.22, 0.5, 12, M.cyan)
  vase.position.set(-1.4, 2.1, prD / 2 + 0.45)
  printShop.add(vase)
  const rocket = new THREE.Group()
  const rBody = cyl(0.1, 0.16, 0.6, 10, M.white)
  rBody.position.y = 0.3
  rocket.add(rBody)
  const rNose = mesh(new THREE.ConeGeometry(0.1, 0.28, 10), M.cyan)
  rNose.position.y = 0.74
  rocket.add(rNose)
  for (let k = 0; k < 3; k++) {
    const fin = box(0.04, 0.26, 0.14, M.blueSoft)
    const a = (k * Math.PI * 2) / 3
    fin.position.set(Math.cos(a) * 0.12, 0.16, Math.sin(a) * 0.12)
    fin.rotation.y = a
    rocket.add(fin)
  }
  rocket.position.set(0.2, 1.9, prD / 2 + 0.45)
  printShop.add(rocket)
  const figurine = new THREE.Group()
  const head = mesh(new THREE.SphereGeometry(0.12, 10, 8), M.cyan)
  head.position.y = 0.62
  figurine.add(head)
  const fBody = box(0.18, 0.3, 0.14, M.cyan)
  fBody.position.y = 0.36
  figurine.add(fBody)
  figurine.position.set(2.0, 1.8, prD / 2 + 0.45)
  printShop.add(figurine)
  const blob = mesh(new THREE.IcosahedronGeometry(0.3, 1), M.blueSoft)
  blob.position.set(3.4, 1.85, prD / 2 + 0.45)
  blob.rotation.y = 0.6
  printShop.add(blob)
  // 附加展品：十二面骰 / 弹簧蛇 / 小房子
  const dice = mesh(new THREE.DodecahedronGeometry(0.24, 0), M.cyan)
  dice.position.set(-3.9, 1.9, prD / 2 + 0.45)
  dice.rotation.y = 0.5
  printShop.add(dice)
  const spring = new THREE.Group()
  for (let k = 0; k < 6; k++) {
    const coil = mesh(new THREE.TorusGeometry(0.16, 0.045, 6, 12), M.blueSoft)
    coil.position.y = 0.1 * k
    coil.rotation.y = k * 0.7
    spring.add(coil)
  }
  spring.position.set(4.5, 1.7, prD / 2 + 0.45)
  printShop.add(spring)
  const miniHouse = new THREE.Group()
  const mBox = box(0.4, 0.32, 0.4, M.white)
  mBox.position.y = 0.16
  miniHouse.add(mBox)
  const mRoof = new THREE.Group()
  const shape = new THREE.Shape()
  shape.moveTo(-0.3, 0)
  shape.lineTo(0, 0.26)
  shape.lineTo(0.3, 0)
  shape.closePath()
  const mr = mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: false }), M.cyan)
  mr.position.set(0, 0.32, -0.2)
  mRoof.add(mr)
  miniHouse.add(mRoof)
  miniHouse.position.set(2.6, 1.82, prD / 2 + 0.45)
  miniHouse.rotation.y = 0.3
  printShop.add(miniHouse)
  // 霓虹「MAKE」
  const prSign = ctx.blocks.neonSign({ w: 2.3, h: 0.65, color: '#3FE0D0', x: 0, y: 4.55, z: prD / 2 - 0.18 })
  prSign.rotation.y = Math.PI
  printShop.add(prSign)
  // 坡顶 + 天窗带 + 天窗舱（南坡上）
  const prRoof = pitched(prW + 0.1, prD, 2.6, M.silverDark)
  prRoof.position.y = 5.2
  printShop.add(prRoof)
  const prMonitor = new THREE.Group()
  const prMonBox = box(1.5, 0.7, 1.9, M.white)
  prMonBox.position.y = 5.55
  prMonitor.add(prMonBox)
  const prMonRoof = pitched(1.7, 2.1, 0.5, M.silver)
  prMonRoof.position.y = 5.9
  prMonitor.add(prMonRoof)
  prMonitor.position.set(1.5, 0, -0.7)
  printShop.add(prMonitor)
  // 西墙高窗
  for (const wz of [-1.2, 1.1]) {
    const win = box(0.06, 0.9, 1.1, M.glass)
    win.position.set(-prW / 2 + 0.06, 3.0, wz)
    printShop.add(win)
  }
  const prSkylight = box(prW - 2, 0.1, 1.2, M.glass)
  prSkylight.position.set(0, 6.45, -0.8)
  prSkylight.rotation.x = -0.3
  printShop.add(prSkylight)
  root.add(printShop)

  // ================= 木作后院（南列东：栅栏 + 板材架 + 工具台 + 篷布遮棚） =================
  const yard = new THREE.Group()
  yard.position.set(8.25, 0, -5.6)
  for (let k = 0; k < 22; k++) {
    const post = box(0.05, 1.4, 0.05, M.silverDark)
    post.position.set(-7.15 + k * 0.68, 0.7, 4.8 / 2 + 0.1)
    yard.add(site(post))
  }
  for (const ry of [0.45, 1.15]) {
    const rail = box(14.6, 0.05, 0.05, M.silverDark)
    rail.position.set(0, ry, 4.8 / 2 + 0.1)
    yard.add(site(rail))
  }
  // 三层板材架
  for (const px of [-5.5, 5.5]) {
    const post = box(0.1, 2.4, 0.1, M.woodDark)
    post.position.set(px, 1.2, -1.9)
    yard.add(site(post))
  }
  for (let k = 0; k < 3; k++) {
    const shelf = box(11.2, 0.06, 1.0, M.wood)
    shelf.position.set(0, 0.5 + k * 0.78, -1.9)
    yard.add(site(shelf))
    for (let b = 0; b < 9; b++) {
      const board = box(0.12, 0.09, 1.4, M.wood)
      board.position.set(-4.6 + b * 1.15, 0.66 + k * 0.78 + (k % 2) * 0.08, -1.9)
      yard.add(site(board))
    }
  }
  // 工具台
  const bench = box(2.6, 0.1, 0.9, M.woodDark)
  bench.position.set(0, 0.95, 0.1)
  yard.add(site(bench))
  for (const lx of [-1.1, 1.1]) for (const lz of [-0.25, 0.45]) {
    const leg = box(0.09, 0.9, 0.09, M.silverDark)
    leg.position.set(lx, 0.45, lz)
    yard.add(site(leg))
  }
  // 篷布遮棚（电焊角）
  for (const [px, pz] of [[-6.2, 1.6], [-4.8, 1.6], [-6.2, -0.9], [-4.8, -0.9]] as Array<[number, number]>) {
    const pole = cyl(0.05, 0.06, 2.9, 8, M.silverDark)
    pole.position.set(px, 1.45, pz)
    yard.add(site(pole))
  }
  const tarp = box(1.9, 0.05, 3.4, M.awning)
  tarp.position.set(-5.5, 2.5, 0.35)
  tarp.rotation.x = 0.16
  yard.add(site(tarp))
  // 三只木箱
  for (const [bx2, bz2, s] of [[4.6, 1.2, 1], [4.6, 0.6, 0.8], [5.6, 0.9, 0.7]] as Array<[number, number, number]>) {
    const crate = box(0.55 * s, 0.4 * s, 0.45 * s, M.wood)
    crate.position.set(bx2, 0.3 * s, bz2)
    crate.rotation.y = 0.3 + s
    yard.add(site(crate))
  }
  root.add(yard)

  // ================= 共享庭院（北列中：木平台 + 树 + 涌泉 + 灯，巷北让出段） =================
  const court = new THREE.Group()
  court.position.set(-2.5, 0, 5.6)
  for (let k = 0; k < 22; k++) {
    const plank = box(0.17, 0.06, 4.6, M.woodDeck)
    plank.position.set(-3.4 + k * 0.34, 0.44, 0.35)
    court.add(site(plank))
  }
  const treeA = denseTree(-1.4, -0.7, 1.5)
  court.add(treeA)
  const treeB = denseTree(1.5, 0.8, 1.3)
  court.add(treeB)
  const treeC = denseTree(3.6, 1.9, 1.15)
  court.add(treeC)
  for (const a of [0, 1.5, 3.0, 4.5]) {
    const b = ctx.blocks.bench({ x: 0, z: 0, rotY: 0 })
    const r = 1.45
    b.position.set(Math.sin(a) * r, 0, Math.cos(a) * r)
    b.rotation.y = -a + Math.PI / 2
    court.add(b)
  }
  const pool = cyl(1.05, 1.25, 0.32, 20, M.stone)
  pool.position.set(3.0, 0.16, -1.4)
  court.add(pool)
  const poolWater = cyl(0.88, 0.88, 0.16, 20, M.water)
  poolWater.position.set(3.0, 0.42, -1.4)
  court.add(poolWater)
  for (const jz of [-0.35, 0.35]) {
    const jet = cyl(0.035, 0.06, 0.85, 8, M.jet)
    jet.position.set(3.0, 0.95, -1.4 + jz)
    court.add(site(jet))
  }
  for (const lx2 of [-4.3, 4.3]) {
    const pole = cyl(0.07, 0.09, 3.4, 8, M.silverDark)
    pole.position.set(lx2, 1.7, 0.9)
    court.add(site(pole))
    const globe = mesh(new THREE.SphereGeometry(0.22, 10, 8), M.warm)
    globe.position.set(lx2, 3.55, 0.9)
    court.add(site(globe))
  }
  // 花架格栅（庭院北缘，攀藤架意象）
  for (const px2 of [-4.6, -2.9, -1.2, 0.5, 2.2, 3.9]) {
    const post = box(0.09, 3.0, 0.09, M.wood)
    post.position.set(px2, 1.5, 1.6)
    court.add(site(post))
  }
  for (const ry of [2.6, 2.95]) {
    const rail = box(8.7, 0.05, 0.05, M.wood)
    rail.position.set(-0.35, ry, 1.6)
    court.add(site(rail))
  }
  for (let k = 0; k < 10; k++) {
    const climber = mesh(new THREE.IcosahedronGeometry(0.18 + rng() * 0.1, 0), [M.leafA, M.leafC][k % 2])
    climber.position.set(-4.2 + k * 0.85, 2.4 + rng() * 0.9, 1.58)
    court.add(site(climber))
  }
  root.add(court)

  // ================= 巷灯（吊杆 4 盏）与檐下/巷空灯串 =================
  for (const [lx, lz] of [[-12.5, -2.5], [-4.5, -2.5], [3.5, 2.5], [11.5, 2.5]] as Array<[number, number]>) {
    const lamppost = new THREE.Group()
    const pole = cyl(0.07, 0.1, 4.2, 8, M.graphite)
    pole.position.y = 2.1
    lamppost.add(site(pole))
    const arm = box(0.02, 0.08, 1.15, M.graphite)
    arm.position.set(0, 4.0, -0.55)
    lamppost.add(site(arm))
    const bulb = mesh(new THREE.SphereGeometry(0.15, 10, 8), M.warm)
    bulb.position.set(0, 3.85, -1.05)
    lamppost.add(site(bulb))
    lamppost.position.set(lx, 0, lz)
    siteG.add(lamppost)
  }
  const stringDefs: Array<[number, number, number, number]> = [
    [-14.8, -2.7, 13.8, -2.7],  // 南檐（木工坊/3D 坊前）
    [-14.8, 2.7, 3.0, 2.7],     // 北檐西段（书店前）
    [4.6, 2.7, 13.8, 2.7],      // 北檐东段（涂装坊前）
    [-10.0, -2.7, -10.0, 2.7],  // 横跨 1
    [-3.4, -2.7, -3.4, 2.7],    // 横跨 2
    [3.2, -2.7, 3.2, 2.7],      // 横跨 3
    [9.8, -2.7, 9.8, 2.7],      // 横跨 4
    [-6.8, -3.3, -2.5, -3.3],   // 庭院前缘短串
  ]
  for (const [x0s, z0s, x1s, z1s] of stringDefs) {
    for (let k = 0; k < 32; k++) {
      const t = k / 31
      const sag = t < 0.08 || t > 0.92 ? 0 : -0.7 * Math.sin(Math.PI * ((t - 0.08) / 0.84))
      const bulb = mesh(new THREE.SphereGeometry(0.048, 8, 6), M.warm)
      bulb.position.set(x0s + (x1s - x0s) * t, 4.3 + sag, z0s + (z1s - z0s) * t)
      siteG.add(site(bulb))
    }
  }
  // 竖挂灯珠串（巷两侧檐下垂串，每 5m 一组）
  for (const sx2 of [-14, -9, -4, 1, 6, 11]) {
    for (const sz2 of [-2.5, 2.5]) {
      for (let k = 0; k < 7; k++) {
        const vb = mesh(new THREE.SphereGeometry(0.042, 8, 6), M.warm)
        vb.position.set(sx2 + (k % 2) * 0.06, 3.9 - k * 0.55, sz2)
        siteG.add(site(vb))
      }
    }
  }

  // ================= 外摆（伞/桌椅/盆栽，沿巷两侧） =================
  const umbrella = (x: number, z: number, rot: number, colorM: THREE.Material): void => {
    const g = new THREE.Group()
    const pole = cyl(0.045, 0.06, 2.9, 8, M.silverDark)
    pole.position.y = 1.45
    g.add(site(pole))
    const canopy = mesh(new THREE.ConeGeometry(1.15, 0.55, 8, 1, true), colorM)
    canopy.position.y = 2.85
    g.add(site(canopy))
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4
      const rib = box(0.04, 0.05, 1.12, M.silver)
      rib.position.set(Math.cos(a) * 0.55, 2.58, Math.sin(a) * 0.55)
      rib.rotation.y = a
      g.add(site(rib))
    }
    const fin = mesh(new THREE.SphereGeometry(0.06, 8, 6), M.silverDark)
    fin.position.y = 3.32
    g.add(site(fin))
    g.position.set(x, 0, z)
    g.rotation.y = rot
    siteG.add(g)
  }
  const tableSet = (x: number, z: number, rot: number): void => {
    const g = new THREE.Group()
    const top = box(0.72, 0.05, 0.72, M.woodDeck)
    top.position.y = 0.78
    g.add(site(top))
    for (const [lx3, lz3] of [[0.3, 0.3], [-0.3, 0.3], [0.3, -0.3], [-0.3, -0.3]] as Array<[number, number]>) {
      const leg = cyl(0.035, 0.035, 0.75, 6, M.silverDark)
      leg.position.set(lx3, 0.375, lz3)
      g.add(site(leg))
    }
    for (const s of [-1, 1]) {
      // 前椅
      const chair = new THREE.Group()
      const seat = box(0.42, 0.045, 0.42, M.woodDark)
      seat.position.y = 0.45
      chair.add(seat)
      const back = box(0.42, 0.5, 0.04, M.woodDark)
      back.position.set(0, 0.72, -0.2)
      chair.add(back)
      for (const [cx3, cz3] of [[0.18, 0.18], [-0.18, 0.18], [0.18, -0.18], [-0.18, -0.18]] as Array<[number, number]>) {
        const cl = cyl(0.02, 0.02, 0.44, 6, M.silverDark)
        cl.position.set(cx3, 0.22, cz3)
        chair.add(cl)
      }
      chair.position.set(s * 0.52, 0, -0.3)
      chair.rotation.y = s * 0.15
      g.add(site(chair))
      // 背对椅（桌另一侧）
      const chairB = new THREE.Group()
      const seatB = box(0.42, 0.045, 0.42, M.woodDark)
      seatB.position.y = 0.45
      chairB.add(seatB)
      const backB = box(0.42, 0.5, 0.04, M.woodDark)
      backB.position.set(0, 0.72, 0.2)
      chairB.add(backB)
      for (const [cx3, cz3] of [[0.18, 0.18], [-0.18, 0.18], [0.18, -0.18], [-0.18, -0.18]] as Array<[number, number]>) {
        const cl = cyl(0.02, 0.02, 0.44, 6, M.silverDark)
        cl.position.set(cx3, 0.22, cz3)
        chairB.add(cl)
      }
      chairB.position.set(s * 0.52, 0, 0.3)
      chairB.rotation.y = Math.PI + s * 0.15
      g.add(site(chairB))
    }
    g.position.set(x, 0, z)
    g.rotation.y = rot
    siteG.add(g)
  }
  const pots: Array<[number, number, number]> = [
    [-15.6, -3.05, 1.0], [-14.2, -3.05, 0.9], [-11.6, -3.0, 1.0], [-9.6, -3.0, 0.85], [-7.2, -3.0, 1.0],
    [-5.4, -3.0, 0.9], [-2.4, -3.0, 1.0], [0.4, -3.0, 0.9], [3.4, -3.0, 1.0], [5.8, -3.0, 0.9], [8.2, -3.0, 1.0], [10.6, -3.0, 0.95],
    [-15.6, 3.05, 0.9], [-13.4, 3.05, 1.0], [-10.9, 2.95, 0.85], [-8.3, 2.95, 1.0], [-5.2, 3.05, 1.05], [6.2, 3.0, 1.0],
    [9.0, 3.0, 0.9], [12.0, 3.0, 0.85],
  ]
  for (const [px, pz, ps] of pots) {
    const pot = cyl(0.22 * ps, 0.26 * ps, 0.4 * ps, 10, M.stoneDark)
    pot.position.set(px, 0.2 * ps, pz)
    siteG.add(site(pot))
    const foliage = mesh(new THREE.IcosahedronGeometry(0.3 * ps, 1), [M.leafA, M.leafC, M.leafB][Math.floor(rng() * 3)])
    foliage.position.set(px, (0.5 + rng() * 0.15) * ps, pz)
    siteG.add(site(foliage))
  }
  for (const [ux, uz] of [[-12.8, -1.4], [-10.2, 1.4], [-7.6, -1.35], [-4.9, 1.35], [-2.2, -1.3], [0.9, 1.3], [4.0, -1.3], [6.6, 1.35], [9.4, -1.3], [11.8, 1.3], [-13.8, 1.4], [7.9, -1.35], [-15.6, -1.3], [13.9, 1.35]] as Array<[number, number]>) {
    umbrella(ux, uz, (rng() - 0.5) * 0.3, rng() > 0.5 ? M.awning : M.awningCream)
  }
  for (const [tx2, tz2, tr2] of [[-12.8, -2.35, 0], [-10.2, 2.35, Math.PI], [-7.6, -2.35, 0.2], [-4.9, 2.35, -0.2], [-2.2, -2.3, 0], [0.9, 2.3, Math.PI], [4.0, -2.3, 0], [6.6, 2.3, Math.PI], [9.4, -2.3, 0.1], [11.8, 2.3, 0], [-13.8, 2.3, 0.2], [7.9, -2.3, 0], [-15.6, -2.2, 0], [13.9, 2.2, Math.PI], [-1.2, 6.8, 0.4], [1.6, 6.2, 0], [-14.6, -2.4, 0.3], [10.8, -2.3, -0.2]] as Array<[number, number, number]>) {
    tableSet(tx2, tz2, tr2)
  }

  // 东口巷门后对景树（巷轴收头，望向四期广场）
  const gateTree = denseTree(18.3, 0, 1.05)
  siteG.add(gateTree)
  const gateRing = mesh(new THREE.TorusGeometry(0.7, 0.1, 8, 16), M.stoneDark)
  gateRing.rotation.x = Math.PI / 2
  gateRing.position.set(18.3, 0.2, 0)
  siteG.add(site(gateRing))
  // ================= 东巷口钢架门（对四期智谷广场） =================
  const gateway = new THREE.Group()
  for (const gz of [-3.0, 3.0]) {
    const post = box(0.32, 7.2, 0.32, M.graphite)
    post.position.set(0, 3.6, gz)
    gateway.add(post)
    const cap = box(0.46, 0.5, 0.46, M.cyan)
    cap.position.set(0, 7.55, gz)
    gateway.add(cap)
    const baseRing = mesh(new THREE.TorusGeometry(0.5, 0.05, 8, 32), M.cyan)
    baseRing.rotation.x = Math.PI / 2
    baseRing.position.set(0, 0.28, gz)
    gateway.add(baseRing)
    const footRing = mesh(new THREE.TorusGeometry(0.34, 0.04, 8, 24), M.warm)
    footRing.rotation.x = Math.PI / 2
    footRing.position.set(0, 0.1, gz)
    gateway.add(footRing)
  }
  const beam = box(0.34, 0.34, 6.4, M.graphite)
  beam.position.set(0, 7.15, 0)
  gateway.add(beam)
  const gateSign = ctx.blocks.neonSign({ w: 3.1, h: 0.8, color: '#3FE0D0', x: 0, y: 6.6, z: 0 })
  gateSign.rotation.y = Math.PI / 2
  gateway.add(gateSign)
  // 门梁灯珠（24 颗，夜为巷口灯语）
  for (let k = 0; k < 24; k++) {
    const gb = mesh(new THREE.SphereGeometry(0.055, 8, 6), k % 2 === 0 ? M.cyan : M.warm)
    gb.position.set(0, 6.9, -2.9 + k * 0.252)
    gateway.add(gb)
  }
  // 门侧钢格栅翼墙（两片，斜向对四期广场）
  for (const s of [-1, 1]) {
    const wing = new THREE.Group()
    for (let k = 0; k < 6; k++) {
      const v = box(0.05, 3.4, 0.05, M.graphite)
      v.position.set(0, 1.9, 0.5 + k * 0.5)
      wing.add(v)
    }
    for (const ry of [1.3, 2.1, 2.9]) {
      const hb = box(0.06, 0.05, 3.1, M.graphite)
      hb.position.set(0, ry, 2.0)
      wing.add(hb)
    }
    wing.position.set(s * 1.15, 0, s * 3.55)
    wing.rotation.y = s * -0.5
    gateway.add(wing)
  }
  gateway.position.set(15.2, 0, 0)
  root.add(gateway)

  root.add(siteG)
  return root
}
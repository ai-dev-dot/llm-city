import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { boxBatch, cylBatch, vaultShell, COLORS, type BoxSpec } from '../../blocks/deepseek-v4.1-flash/kit'
import { glassWall, latticeScreen, railWithBalusters } from '../../blocks/deepseek-v4.1-flash/shared-parts'
import { bookWall, readingDesk, skylightGrid, readingSteps, BOOK_COLORS } from '../../blocks/deepseek-v4.1-flash/book-parts'
import { pavingGrid } from '../../blocks/deepseek-v4.1-flash/echo-parts'

/** 市立图书馆 City Library —— E6 回声街区二期（deepseek-v4.1-flash）。
 *
 *  宗地 E6-01+04（1×2，20×40m），局部原点＝宗地中心地面，+X 东、+Z 北。
 *  立意「城市的记忆」：宗地北缘与 E5-07 蓝图馆（城市规划馆）同一 40m 带宽、隔 12m 道路正对——
 *  蓝图馆讲城市的未来，图书馆收城市的记忆。体量北高南低退台（24 / 20 / 18 / 10m），
 *  北端采光书塔对蓝图馆与原点塔，中部通高阅览体覆井格天窗，南端儿童馆伏在最低处。
 *  三立面分工：北＝主入口 + 通高书墙门厅；东＝通高长窗（对剧院与两楼之间约 5m 南北通道）；
 *  西＝密棂遮阳（挡西晒、临街安静）；顶＝井格天窗（阅读靠天光）。
 *
 *  退线（R13）：建筑本体 x ∈ [−7.6, 7.6]、z ∈ [−17.4, 17.4]（核心 16×36），四周留 2.4m 场地带；
 *  台阶/铺装走薄板与地被豁免，景观件一律 userData.site。
 */

const P = {
  /** 建筑本体东西半宽 */
  hx: 7.0,
  /** 台基顶面标高 */
  plinth: 0.5,
  /** 北端入口体：z 区间与高度 */
  northZ0: 9.0,
  northZ1: 17.4,
  northH: 20.0,
  /** 采光书塔 */
  towerH: 24.0,
  towerX: 3.6,
  towerZ0: 13.6,
  towerZ1: 17.4,
  /** 中部阅览体 */
  midZ0: -9.0,
  midZ1: 9.0,
  midH: 18.0,
  /** 南端儿童馆 */
  southZ0: -17.4,
  southZ1: -9.0,
  southH: 10.0,
}

export default function build(ctx: BuildCtx): THREE.Object3D {
  const root = new THREE.Group()

  // ---- 材质（与一期剧院同族，让街区读成一个组群）----
  const matStone = stdMaterial(COLORS.stone, { roughness: 0.86 })
  const matStoneDim = stdMaterial(COLORS.stoneDim, { roughness: 0.8 })
  const matStoneDeep = stdMaterial(COLORS.stoneDeep, { roughness: 0.82 })
  const matBronze = stdMaterial(COLORS.bronze, { metalness: 0.55, roughness: 0.34 })
  const matDark = stdMaterial(COLORS.dark, { metalness: 0.4, roughness: 0.5 })
  const matWood = stdMaterial(COLORS.wood, { roughness: 0.62 })
  const matGlass = stdMaterial(COLORS.glass, { metalness: 0.5, roughness: 0.16, emissive: '#C4DFF0', emissiveIntensity: 0.34 })
  const matGrass = stdMaterial('#8C9E8B', { roughness: 0.95 })
  const matPave = stdMaterial(COLORS.stoneDim, { roughness: 0.88 })
  const matGlow = stdMaterial(COLORS.glow, { emissive: '#FFE0A8', emissiveIntensity: 0.9, roughness: 0.5 })
  const bookMats = BOOK_COLORS.map((c) => stdMaterial(c, { roughness: 0.78 }))

  const batch = (specs: BoxSpec[], m: THREE.Material): THREE.Mesh => {
    const o = new THREE.Mesh(boxBatch(specs, m).geometry, m)
    o.castShadow = true
    return o
  }

  // =====================================================================
  // 一、场地：宗地全域满铺（北前庭 / 东西带 / 南儿童院），东带与剧院西带合成南北通道
  // =====================================================================
  const site = new THREE.Group()
  site.userData.site = true
  site.add(batch([{ x: 0, y: 0.03, z: 0, w: 19.9, h: 0.06, d: 39.9 }], matGrass))
  // 北前庭铺装（对蓝图馆）
  site.add(pavingGrid({ w: 19.6, d: 2.4, z: 18.8, y: 0.14, cell: 0.5, material: matPave }))
  // 东带通道铺装（贴建筑，与剧院西带合成里弄）
  site.add(pavingGrid({ w: 2.2, d: 34.0, x: 8.9, z: -0.2, y: 0.14, cell: 0.5, material: matPave }))
  // 西带步道
  site.add(pavingGrid({ w: 2.2, d: 34.0, x: -8.9, z: -0.2, y: 0.14, cell: 0.5, material: matPave }))
  // 南侧儿童院（铺装 + 沙坑 + 矮墙）
  site.add(pavingGrid({ w: 19.6, d: 2.4, z: -18.8, y: 0.14, cell: 0.6, material: matPave }))
  site.add(batch([{ x: -3.0, y: 0.2, z: -19.0, w: 5.0, h: 0.4, d: 1.6 }], matStoneDim))
  site.add(batch([{ x: -3.0, y: 0.3, z: -19.0, w: 4.6, h: 0.24, d: 1.2 }], stdMaterial('#D9CFA8', { roughness: 0.95 })))
  // 主入口台阶（4 级，深 0.42 ≤0.5 走薄板豁免）
  {
    const st: BoxSpec[] = []
    for (let i = 0; i < 4; i++) st.push({ x: 0, y: (P.plinth / 4) * (i + 0.5), z: 17.8 + i * 0.42, w: 13.0, h: P.plinth / 4, d: 0.42 })
    site.add(batch(st, matStoneDim))
  }
  // 绿篱 / 树 / 灯 / 凳 / 石盆
  for (const [x, z, w, d] of [
    [9.7, -8.0, 0.6, 16.0], [-9.7, -8.0, 0.6, 16.0], [9.7, 12.0, 0.6, 9.0], [-9.7, 12.0, 0.6, 9.0],
  ] as const) {
    site.add(ctx.blocks.hedge({ x, z, w, d, h: 0.8 }))
  }
  const treeSpots: Array<[number, number]> = [
    [-9.0, -13.0], [-9.0, -3.0], [-9.0, 6.0], [9.0, -13.0], [9.0, 6.0], [-7.0, 19.2], [7.0, 19.2],
  ]
  treeSpots.forEach(([x, z], i) => site.add(ctx.blocks.tree({ x, z, scale: 0.86, seed: 3000 + i * 53 })))
  for (const [x, z] of [[-9.2, -8.0], [9.2, -8.0], [-9.2, 10.0], [9.2, 10.0], [-5.0, 19.2], [5.0, 19.2]] as const) {
    site.add(ctx.blocks.streetLamp({ x, z, h: 4.2 }))
  }
  for (const [x, z, r] of [[-9.2, -16.0, Math.PI / 2], [9.2, -16.0, -Math.PI / 2], [-9.2, 1.0, Math.PI / 2], [9.2, 1.0, -Math.PI / 2]] as const) {
    site.add(ctx.blocks.bench({ x, z, rotY: r }))
  }
  for (const [x, z] of [[-7.6, 18.6], [7.6, 18.6], [-9.3, 15.0], [9.3, 15.0]] as const) {
    site.add(ctx.blocks.urn({ x, z, scale: 1.05 }))
  }
  // 树池 + 路缘
  {
    const pits: BoxSpec[] = []
    for (const [x, z] of treeSpots) {
      pits.push({ x, y: 0.16, z, w: 1.8, h: 0.32, d: 1.8 })
      for (const dx of [-0.8, 0.8]) pits.push({ x: x + dx, y: 0.3, z, w: 0.2, h: 0.1, d: 1.8 })
      for (const dz of [-0.8, 0.8]) pits.push({ x, y: 0.3, z: z + dz, w: 1.8, h: 0.1, d: 0.2 })
    }
    site.add(batch(pits, matStoneDim))
    const kerbs: BoxSpec[] = []
    for (let i = 0; i < 33; i++) kerbs.push({ x: -9.9 + i * 0.6, y: 0.2, z: 17.6, w: 0.5, h: 0.28, d: 0.24 })
    for (let i = 0; i < 33; i++) kerbs.push({ x: -9.9 + i * 0.6, y: 0.2, z: -17.6, w: 0.5, h: 0.28, d: 0.24 })
    for (const s of [-1, 1]) for (let i = 0; i < 58; i++) kerbs.push({ x: s * 7.8, y: 0.2, z: -17.4 + i * 0.6, w: 0.24, h: 0.28, d: 0.5 })
    site.add(batch(kerbs, matStoneDeep))
  }
  // 导视牌 + 垃圾桶
  site.add(batch([
    { x: -5.4, y: 1.05, z: 19.2, w: 0.8, h: 0.6, d: 0.1 },
    { x: -5.4, y: 0.35, z: 19.2, w: 0.14, h: 0.7, d: 0.14 },
    { x: 5.4, y: 1.05, z: 19.2, w: 0.8, h: 0.6, d: 0.1 },
    { x: 5.4, y: 0.35, z: 19.2, w: 0.14, h: 0.7, d: 0.14 },
  ], matDark))
  site.add(batch([
    { x: 9.4, y: 0.42, z: -18.0, w: 0.46, h: 0.84, d: 0.46 },
    { x: 9.4, y: 0.88, z: -18.0, w: 0.52, h: 0.1, d: 0.52 },
    { x: -9.4, y: 0.42, z: 16.0, w: 0.46, h: 0.84, d: 0.46 },
    { x: -9.4, y: 0.88, z: 16.0, w: 0.52, h: 0.1, d: 0.52 },
  ], matDark))
  root.add(site)

  // =====================================================================
  // 二、台基（顶 0.5 ≤0.6 走地被豁免）
  // =====================================================================
  root.add(batch([{ x: 0, y: P.plinth / 2, z: 0, w: 15.6, h: P.plinth, d: 35.2 }], matStoneDeep))

  // =====================================================================
  // 三、北端入口体（20m）：主入口 + 通高书墙门厅 + 采光书塔（24m）
  // =====================================================================
  const north = new THREE.Group()
  const ncz = (P.northZ0 + P.northZ1) / 2
  // 体量墙身：东西墙 + 北墙（留入口洞）+ 屋面
  for (const s of [-1, 1]) {
    north.add(batch([{ x: s * P.hx, y: (P.northH + P.plinth) / 2, z: ncz, w: 0.6, h: P.northH - P.plinth, d: P.northZ1 - P.northZ0 }], matStone))
  }
  for (const [x0, x1] of [[-P.hx, -4.2], [4.2, P.hx]] as const) {
    north.add(batch([{ x: (x0 + x1) / 2, y: (P.northH + P.plinth) / 2, z: P.northZ1 - 0.3, w: x1 - x0, h: P.northH - P.plinth, d: 0.6 }], matStone))
  }
  north.add(batch([{ x: 0, y: P.northH + 0.3, z: ncz, w: P.hx * 2 + 1.2, h: 0.6, d: P.northZ1 - P.northZ0 + 0.6 }], matStoneDeep))
  // 主入口：门套 + 门楣 + 通高玻璃 + 馆名灯箱
  north.add(batch([
    { x: -4.2, y: P.plinth + 5.5, z: P.northZ1 + 0.2, w: 0.8, h: 11.0, d: 0.7 },
    { x: 4.2, y: P.plinth + 5.5, z: P.northZ1 + 0.2, w: 0.8, h: 11.0, d: 0.7 },
    { x: 0, y: 11.6, z: P.northZ1 + 0.2, w: 9.2, h: 0.9, d: 0.7 },
    { x: 0, y: 12.5, z: P.northZ1 + 0.25, w: 8.0, h: 0.5, d: 0.6 },
    { x: 0, y: P.plinth + 0.14, z: P.northZ1 + 0.3, w: 9.2, h: 0.28, d: 0.7 },
  ], matStoneDeep))
  north.add(glassWall(8.4, 10.6, 0, P.plinth, P.northZ1 + 0.03, 0, matGlass, matBronze, 20, 16))
  north.add(ctx.blocks.neonSign({ w: 4.6, h: 0.9, color: '#F2C879', x: 0, y: 13.3, z: P.northZ1 + 0.48 }))
  // 门厅通高书墙（东西两面，4 层）
  for (const s of [-1, 1]) {
    north.add(bookWall({
      w: 6.6, h: 9.2, x: s * 6.2, y: P.plinth + 0.6, z: 13.2, ry: s > 0 ? Math.PI / 2 : -Math.PI / 2,
      rows: 5, cols: 7, depth: 0.44, perBay: 9, fill: 0.8, seed: 11 + s,
      shelfMat: matWood, bookMats,
    }))
  }
  // 服务台 + 检索台 + 门厅吊灯
  north.add(batch([
    { x: 0, y: P.plinth + 0.55, z: 11.0, w: 4.6, h: 1.1, d: 0.8 },
    { x: -3.6, y: P.plinth + 0.5, z: 10.4, w: 1.6, h: 1.0, d: 0.7 },
    { x: 3.6, y: P.plinth + 0.5, z: 10.4, w: 1.6, h: 1.0, d: 0.7 },
  ], matWood))
  {
    const discs: Array<{ x: number; y: number; z: number; r: number; h: number; seg?: number }> = []
    for (let i = 0; i < 4; i++) discs.push({ x: -4.5 + i * 3.0, y: 12.6, z: 12.4, r: 0.9, h: 0.22, seg: 14 })
    north.add(new THREE.Mesh(cylBatch(discs, matGlow).geometry, matGlow))
  }
  // 采光书塔（24m，玻璃塔内书架可见，夜间发光）
  {
    const tx = 0, tz = (P.towerZ0 + P.towerZ1) / 2
    const tw = P.towerX * 2, td = P.towerZ1 - P.towerZ0
    // 四角石柱 + 玻璃四立面
    const corners: BoxSpec[] = []
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      corners.push({ x: sx * (P.towerX - 0.3), y: (P.towerH + P.plinth) / 2, z: tz + sz * (td / 2 - 0.3), w: 0.6, h: P.towerH - P.plinth, d: 0.6 })
    }
    corners.push({ x: tx, y: P.towerH + 0.3, z: tz, w: tw + 1.0, h: 0.6, d: td + 1.0 })
    corners.push({ x: tx, y: P.towerH + 0.75, z: tz, w: tw * 0.7, h: 0.3, d: td * 0.7 })
    north.add(batch(corners, matStoneDim))
    for (const [gx, gz, gry] of [
      [tx, tz + td / 2, 0], [tx, tz - td / 2, 0], [tx - P.towerX, tz, Math.PI / 2], [tx + P.towerX, tz, Math.PI / 2],
    ] as const) {
      north.add(glassWall(gry === 0 ? tw : td, P.towerH - P.plinth - 0.6, gx, P.plinth + 0.3, gz, gry, matGlass, matBronze, gry === 0 ? 8 : 10, 26))
    }
    // 塔内书架（四面各贴一面墙，面宽随塔身长宽取，7 层）
    for (const [bx, bz, bw, bry] of [
      [tx, tz + td / 2 - 0.5, tw - 0.6, 0],
      [tx, tz - td / 2 + 0.5, tw - 0.6, Math.PI],
      [tx - P.towerX + 0.5, tz, td - 1.0, Math.PI / 2],
      [tx + P.towerX - 0.5, tz, td - 1.0, -Math.PI / 2],
    ] as const) {
      north.add(bookWall({
        w: bw, h: 17.0, x: bx, y: P.plinth + 0.4, z: bz, ry: bry,
        rows: 7, cols: 6, depth: 0.4, perBay: 8, fill: 0.72, seed: 40 + Math.round(bx * 3 + bz * 7 + bw * 11),
        shelfMat: matWood, bookMats,
      }))
    }
    // 塔顶发光槽（街区第二盏文化灯）
    north.add(batch([
      { x: tx, y: P.towerH - 0.9, z: tz + td / 2 + 0.02, w: tw - 0.4, h: 0.7, d: 0.24 },
      { x: tx, y: P.towerH - 0.9, z: tz - td / 2 - 0.02, w: tw - 0.4, h: 0.7, d: 0.24 },
      { x: tx - P.towerX - 0.02, y: P.towerH - 0.9, z: tz, w: 0.24, h: 0.7, d: td - 0.4 },
      { x: tx + P.towerX + 0.02, y: P.towerH - 0.9, z: tz, w: 0.24, h: 0.7, d: td - 0.4 },
    ], matGlow))
  }
  // 北端屋面设备
  north.add(batch([
    { x: -5.4, y: P.northH + 1.0, z: 11.0, w: 3.2, h: 1.4, d: 3.0 },
    { x: 5.4, y: P.northH + 0.9, z: 11.0, w: 3.2, h: 1.2, d: 3.0 },
  ], matStoneDeep))
  root.add(north)

  // =====================================================================
  // 四、中部阅览体（18m）：通高阅览大厅 + 阶梯台地 + 东西书墙 + 井格天窗
  // =====================================================================
  const mid = new THREE.Group()
  const mcz = (P.midZ0 + P.midZ1) / 2
  const md = P.midZ1 - P.midZ0
  // 东西墙（留通高长窗洞：中段开窗）
  for (const s of [-1, 1]) {
    mid.add(batch([
      { x: s * P.hx, y: (P.midH + P.plinth) / 2, z: P.midZ0 + 2.4, w: 0.6, h: P.midH - P.plinth, d: 4.8 },
      { x: s * P.hx, y: (P.midH + P.plinth) / 2, z: P.midZ1 - 2.4, w: 0.6, h: P.midH - P.plinth, d: 4.8 },
      { x: s * P.hx, y: 15.4, z: mcz, w: 0.6, h: 5.2, d: 9.0 },
      { x: s * P.hx, y: P.plinth + 0.6, z: mcz, w: 0.6, h: 1.2, d: 9.0 },
    ], matStone))
  }
  // 东立面通高长窗（对通道与剧院）+ 竖向石肋
  mid.add(glassWall(9.0, 13.6, P.hx + 0.02, P.plinth + 1.2, mcz, Math.PI / 2, matGlass, matBronze, 14, 18))
  {
    const ribs: BoxSpec[] = []
    for (let i = 0; i < 8; i++) ribs.push({ x: P.hx + 0.24, y: (P.midH + P.plinth) / 2, z: P.midZ0 + 2.0 + i * 1.5, w: 0.34, h: P.midH - P.plinth, d: 0.34 })
    mid.add(batch(ribs, matStoneDim))
  }
  // 西立面密棂遮阳屏（三组）
  for (const [cz, cw] of [[-6.6, 5.6], [0, 6.4], [6.6, 5.6]] as const) {
    mid.add(latticeScreen({ w: cw, h: 13.6, x: -P.hx - 0.06, y: P.plinth + 1.2, z: cz, ry: Math.PI / 2, cell: 0.24, material: matBronze }))
    mid.add(batch([{ x: -P.hx - 0.02, y: P.plinth + 1.2 + 6.8, z: cz, w: 0.12, h: 13.6, d: cw + 0.4 }], matGlass))
  }
  // 屋面 + 井格天窗
  mid.add(batch([
    { x: 0, y: P.midH + 0.3, z: mcz, w: P.hx * 2 + 1.2, h: 0.6, d: md + 0.6 },
  ], matStoneDeep))
  mid.add(skylightGrid({ w: 12.0, d: 16.0, x: 0, y: P.midH + 0.62, z: 0.0, cols: 24, rows: 32, well: 0.9, frameMat: matStoneDim, glassMat: matGlass }))
  // 通高大厅内部：东西书墙（5 层 × 20 格）+ 阶梯阅览台地 + 台地上的阅览桌椅
  for (const s of [-1, 1]) {
    mid.add(bookWall({
      w: 15.0, h: 13.6, x: s * 6.2, y: P.plinth + 0.6, z: 0.0, ry: s > 0 ? Math.PI / 2 : -Math.PI / 2,
      rows: 5, cols: 20, depth: 0.46, perBay: 9, fill: 0.84, seed: 200 + s,
      shelfMat: matWood, bookMats,
    }))
  }
  const stepN = 18, stepTread = 0.86, stepRise = 0.2, stepZ0 = -8.2
  mid.add(readingSteps({ w: 6.6, x: 0, z0: stepZ0, y: P.plinth, n: stepN, tread: stepTread, rise: stepRise, material: matStoneDim }))
  // 台地上每三级一档阅览桌（两侧），加顶部平台与台底各一组
  for (const k of [2, 5, 8, 11, 14, 17]) {
    for (const s of [-1, 1]) {
      mid.add(readingDesk({ x: s * 2.4, y: P.plinth + k * stepRise, z: stepZ0 + k * stepTread + 0.5, deskMat: matWood, seatMat: matWood, frameMat: matBronze }))
    }
  }
  // 开架书区：沿大厅两侧通道各一列双面书架（背对背两片，共 4 面）
  for (const s of [-1, 1]) {
    for (const t of [-1, 1]) {
      mid.add(bookWall({
        w: 13.0, h: 2.3, x: s * 4.6 + t * 0.21, y: P.plinth + 0.5, z: -0.6,
        ry: (s * t > 0 ? 1 : -1) * (Math.PI / 2),
        rows: 4, cols: 14, depth: 0.42, perBay: 8, fill: 0.86, seed: 600 + s * 3 + t,
        shelfMat: matWood, bookMats,
      }))
    }
  }
  for (let r = 0; r < 3; r++) {
    for (const s of [-1, 1]) {
      mid.add(readingDesk({ x: s * 3.2, y: P.plinth + stepN * stepRise, z: 1.6 + r * 2.6, deskMat: matWood, seatMat: matWood, frameMat: matBronze }))
    }
  }
  for (let r = 0; r < 2; r++) {
    for (const s of [-1, 1]) {
      mid.add(readingDesk({ x: s * 2.6, y: P.plinth, z: -7.4 + r * 2.6, deskMat: matWood, seatMat: matWood, frameMat: matBronze }))
    }
  }
  // 中庭栏杆 + 夹层走廊
  mid.add(railWithBalusters(12.0, P.plinth + 4.0, -8.2, matBronze, 22))
  mid.add(batch([{ x: 0, y: P.plinth + 3.9, z: -8.5, w: 12.6, h: 0.4, d: 1.0 }], matStoneDeep))
  // 阅览体与北端之间的隔墙（留门洞）+ 楼梯
  mid.add(batch([
    { x: -5.6, y: (P.midH + P.plinth) / 2, z: P.midZ1 - 0.3, w: 4.0, h: P.midH - P.plinth, d: 0.6 },
    { x: 5.6, y: (P.midH + P.plinth) / 2, z: P.midZ1 - 0.3, w: 4.0, h: P.midH - P.plinth, d: 0.6 },
    { x: 0, y: 14.6, z: P.midZ1 - 0.3, w: 8.0, h: 6.4, d: 0.6 },
  ], matStoneDim))
  for (const s of [-1, 1]) {
    const st: BoxSpec[] = []
    for (let i = 0; i < 20; i++) {
      const y = P.plinth + i * 0.245
      const z = P.midZ1 - 1.2 - i * 0.32
      st.push({ x: s * 5.6, y: y + 0.08, z, w: 2.2, h: 0.16, d: 0.36 })
      st.push({ x: s * 5.6, y: y - 0.06, z: z - 0.14, w: 2.2, h: 0.3, d: 0.07 })
      st.push({ x: s * 4.4, y: y + 0.5, z, w: 0.08, h: 0.7, d: 0.36 })
    }
    mid.add(batch(st, matStoneDim))
  }
  root.add(mid)

  // =====================================================================
  // 五、南端儿童馆（10m）：低伏、独立入口 + 小院
  // =====================================================================
  const south = new THREE.Group()
  const scz = (P.southZ0 + P.southZ1) / 2
  const sd = P.southZ1 - P.southZ0
  for (const s of [-1, 1]) {
    south.add(batch([{ x: s * P.hx, y: (P.southH + P.plinth) / 2, z: scz, w: 0.6, h: P.southH - P.plinth, d: sd }], matStone))
  }
  south.add(batch([
    { x: 0, y: (P.southH + P.plinth) / 2, z: P.southZ0 + 0.3, w: P.hx * 2 + 1.2, h: P.southH - P.plinth, d: 0.6 },
    { x: 0, y: P.southH + 0.3, z: scz, w: P.hx * 2 + 1.2, h: 0.6, d: sd + 0.6 },
  ], matStoneDeep))
  // 南立面低窗 + 儿童馆门 + 彩色遮阳板
  south.add(glassWall(9.0, 3.6, 0, P.plinth + 3.2, P.southZ0 - 0.03, 0, matGlass, matBronze, 22, 8))
  south.add(batch([{ x: 0, y: P.plinth + 1.7, z: P.southZ0 - 0.32, w: 3.0, h: 3.4, d: 0.3 }], matBronze))
  {
    const fins: BoxSpec[] = []
    const finMats = [stdMaterial('#A8843F', { roughness: 0.7 }), stdMaterial('#5C6B4A', { roughness: 0.7 }), stdMaterial('#7A3B34', { roughness: 0.7 })]
    for (let i = 0; i < 9; i++) fins.push({ x: -6.0 + i * 1.5, y: 7.4, z: P.southZ0 - 0.3, w: 1.1, h: 0.22, d: 0.58 })
    for (let i = 0; i < 9; i += 3) {
      const m = new THREE.Mesh(boxBatch(fins.slice(i, i + 3), finMats[(i / 3) % 3]).geometry, finMats[(i / 3) % 3])
      south.add(m)
    }
  }
  // 儿童馆内部：低书架 + 圆桌 + 地毯
  for (const s of [-1, 1]) {
    south.add(bookWall({
      w: 6.4, h: 3.0, x: s * 6.2, y: P.plinth + 0.5, z: scz, ry: s > 0 ? Math.PI / 2 : -Math.PI / 2,
      rows: 2, cols: 8, depth: 0.4, perBay: 8, fill: 0.85, seed: 500 + s,
      shelfMat: matWood, bookMats,
    }))
  }
  {
    const kids: BoxSpec[] = []
    for (const [x, z] of [[-3.4, -13.6], [3.4, -13.6], [0, -11.6]] as const) {
      kids.push({ x, y: 0.95, z, w: 1.6, h: 0.1, d: 1.6 })
      kids.push({ x, y: 0.5, z, w: 0.16, h: 0.9, d: 0.16 })
      kids.push({ x: x - 0.5, y: 0.5, z: z + 0.6, w: 0.4, h: 0.06, d: 0.4 })
      kids.push({ x: x + 0.5, y: 0.5, z: z - 0.6, w: 0.4, h: 0.06, d: 0.4 })
    }
    south.add(batch(kids, matWood))
    south.add(batch([
      { x: 0, y: 0.16, z: -13.0, w: 6.0, h: 0.24, d: 4.0 },
    ], stdMaterial('#7C8A96', { roughness: 0.95 })))
  }
  root.add(south)

  // =====================================================================
  // 六、外墙石材分缝 + 屋面检修栏杆
  // =====================================================================
  {
    const joints: BoxSpec[] = []
    for (const s of [-1, 1]) {
      // 石材分缝：大分格（水平 2.6m、竖 2.6m），细线（0.07m）——避免整墙读成瓷砖网格
      for (let k = 1; k < 8; k++) joints.push({ x: s * (P.hx + 0.32), y: P.plinth + k * 2.6, z: ncz, w: 0.07, h: 0.07, d: P.northZ1 - P.northZ0 })
      for (let k = 1; k < 3; k++) joints.push({ x: s * (P.hx + 0.32), y: (P.northH + P.plinth) / 2, z: P.northZ0 + ((P.northZ1 - P.northZ0) * k) / 3, w: 0.07, h: P.northH - P.plinth, d: 0.07 })
      for (let k = 1; k < 7; k++) joints.push({ x: s * (P.hx + 0.32), y: P.plinth + k * 2.6, z: P.midZ0 + 2.4, w: 0.07, h: 0.07, d: 4.6 })
      for (let k = 1; k < 7; k++) joints.push({ x: s * (P.hx + 0.32), y: P.plinth + k * 2.6, z: P.midZ1 - 2.4, w: 0.07, h: 0.07, d: 4.6 })
      for (let k = 1; k < 2; k++) joints.push({ x: s * (P.hx + 0.32), y: (P.midH + P.plinth) / 2, z: P.midZ0 + 2.4 * k, w: 0.07, h: P.midH - P.plinth, d: 0.07 })
      for (let k = 1; k < 2; k++) joints.push({ x: s * (P.hx + 0.32), y: (P.midH + P.plinth) / 2, z: P.midZ1 - 2.4 * k, w: 0.07, h: P.midH - P.plinth, d: 0.07 })
      for (let k = 1; k < 4; k++) joints.push({ x: s * (P.hx + 0.32), y: P.plinth + k * 2.6, z: scz, w: 0.07, h: 0.07, d: sd })
    }
    root.add(batch(joints, matStoneDim))
    // 三段体量顶部檐口（出挑 0.5m，给盒子轮廓一条水平打断）
    root.add(batch([
      { x: 0, y: P.northH - 0.45, z: ncz, w: P.hx * 2 + 1.7, h: 0.55, d: P.northZ1 - P.northZ0 + 1.1 },
      { x: 0, y: P.midH - 0.45, z: (P.midZ0 + P.midZ1) / 2, w: P.hx * 2 + 1.7, h: 0.55, d: P.midZ1 - P.midZ0 + 1.1 },
      { x: 0, y: P.southH - 0.4, z: scz, w: P.hx * 2 + 1.7, h: 0.5, d: sd + 1.1 },
    ], matStoneDim))
    root.add(railWithBalusters(13.0, P.midH + 0.6, P.midZ0 + 0.4, matBronze, 16))
    root.add(railWithBalusters(13.0, P.midH + 0.6, P.midZ1 - 0.4, matBronze, 16))
  }

  // =====================================================================
  // 七、西侧临街橱窗（城市书房，24h 亮）+ 东侧通道侧门
  // =====================================================================
  {
    const shop: BoxSpec[] = []
    for (const [cz, cw] of [[-13.0, 4.0], [-3.0, 4.6], [7.0, 4.0]] as const) {
      shop.push({ x: -P.hx - 0.5, y: P.plinth + 0.9, z: cz, w: 1.0, h: 1.8, d: cw })
      shop.push({ x: -P.hx - 0.4, y: 4.4, z: cz, w: 0.9, h: 0.3, d: cw + 0.6 })
    }
    root.add(batch(shop, matBronze))
    root.add(batch([
      { x: -P.hx - 0.52, y: P.plinth + 0.9, z: -13.0, w: 0.1, h: 1.6, d: 3.6 },
      { x: -P.hx - 0.52, y: P.plinth + 0.9, z: -3.0, w: 0.1, h: 1.6, d: 4.2 },
      { x: -P.hx - 0.52, y: P.plinth + 0.9, z: 7.0, w: 0.1, h: 1.6, d: 3.6 },
    ], matGlow))
    // 东侧通道侧门（对剧院）
    root.add(batch([
      { x: P.hx + 0.5, y: P.plinth + 1.7, z: -12.0, w: 0.9, h: 3.4, d: 2.6 },
      { x: P.hx + 0.6, y: 4.0, z: -12.0, w: 0.8, h: 0.3, d: 3.4 },
    ], matStoneDim))
  }

  return root
}

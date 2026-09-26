import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { heightfield, waterEllipse, steppingStones } from '../../blocks/qwen3.8-flash/park-ground'
import { broadleaf, conifer, willow, birch, shrub, reedClump, flowerClump, boulder } from '../../blocks/qwen3.8-flash/park-trees'
import { ribbonPath, tilePlaza, boardwalk } from '../../blocks/qwen3.8-flash/park-paving'
import { archFootbridge, lighthouse, pergola, bollardLamp, framingRing, signPost } from '../../blocks/qwen3.8-flash/park-structures'

/** E4「镜湖公园街区」一期 · 镜湖水域园（Mirror Lake Basin）
 *  2×3 大宗地 60×40m：倒影湖正对原点塔北立面，拱步桥串起「塔视线」南北轴，
 *  西串湿地木栈道，南端入口广场立「塔框」雕塑，东落长廊花架与东园广场，
 *  北草坡散木，最北百花林背景林带（宗地内 E4-04/05/06 部分为二期林带前缘）。
 *  局部原点 = 宗地中心；-z 为南（隔 E5 路对原点塔一侧）。 */
export default function build(ctx: BuildCtx): THREE.Object3D {
  const root = new THREE.Group()
  const rng = ctx.rng

  // ── 水面体块与场地骨架参数 ──────────────────────────────────────
  const lake = { cx: -8, cz: -9.8, rx: 14.2, rz: 6.0 } // 镜湖：南缘 z=-15.8，北缘 -3.8
  const wet = { cx: -26.4, cz: 3.2, rx: 2.6, rz: 5.6 } // 西湿地浅塘

  type Path = { pts: Array<[number, number]>; w: number }
  const P = {
    causeway: { pts: [[-10, -19.7], [-10, -16.1]], w: 3.0 } as Path,
    axisN: { pts: [[-10, -3.3], [-10, 1.4], [-9.4, 5.5], [-8.6, 9]], w: 2.6 } as Path,
    prom: { pts: [[-21.6, -2.6], [-16, -1.4], [-8, -0.6], [0, -1.0], [6.8, -3.0]], w: 2.4 } as Path,
    eastShore: { pts: [[10.8, -15], [11.6, -11], [9.6, -6.8], [7, -4]], w: 2.2 } as Path,
    eastPerim: { pts: [[24.8, -16.6], [25, -11], [22.5, -6.5], [20.5, -1], [19.8, 4], [19.6, 8.5], [21.5, 12.5], [24, 15.6]], w: 2.0 } as Path,
    westConn: { pts: [[-21.8, -3.4], [-24.6, -1.4]], w: 1.9 } as Path,
    gladeW: { pts: [[-24.4, 8.8], [-23, 10.5]], w: 1.9 } as Path,
    glade: { pts: [[-23, 10.5], [-16, 13], [-6, 11.5], [4, 13], [14, 11.5], [23.5, 13.2]], w: 1.9 } as Path,
  }
  const flattenPaths: Path[] = [P.causeway, P.axisN, P.prom, P.eastShore, P.eastPerim, P.westConn, P.gladeW, P.glade]
  const rects: Array<{ x0: number; z0: number; x1: number; z1: number; lvl: number }> = [
    { x0: -17.4, z0: -19.9, x1: -2.6, z1: -16.2, lvl: 0.34 }, // 南入口广场
    { x0: 21.4, z0: -16.4, x1: 28.4, z1: -10.0, lvl: 0.34 }, // 东园广场
  ]
  const circles: Array<{ cx: number; cz: number; r: number; lvl: number }> = [
    { cx: -3.8, cz: 4.8, r: 4.3, lvl: 0.34 }, // 灯塔坪
  ]

  const smooth = (a: number, b: number, x: number): number => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a || 1e-6)))
    return t * t * (3 - 2 * t)
  }
  const lakeT = (x: number, z: number): number => Math.hypot((x - lake.cx) / lake.rx, (z - lake.cz) / lake.rz)
  const wetT = (x: number, z: number): number => Math.hypot((x - wet.cx) / wet.rx, (z - wet.cz) / wet.rz)
  const distPoly = (pts: Array<[number, number]>, x: number, z: number): number => {
    let d = Infinity
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, z1] = pts[i]
      const [x2, z2] = pts[i + 1]
      const dx = x2 - x1
      const dz = z2 - z1
      const L2 = dx * dx + dz * dz || 1e-6
      let t = ((x - x1) * dx + (z - z1) * dz) / L2
      t = t < 0 ? 0 : t > 1 ? 1 : t
      const px = x1 + dx * t - x
      const pz = z1 + dz * t - z
      d = Math.min(d, Math.hypot(px, pz))
    }
    return d
  }
  const hills: Array<{ x: number; z: number; r: number; h: number }> = [
    { x: 1.5, z: 6.5, r: 8.5, h: 2.1 },
    { x: -17.5, z: 11.5, r: 6.2, h: 2.6 },
    { x: 22.5, z: 9.5, r: 7.5, h: 1.7 },
    { x: 24, z: -3.5, r: 6, h: 1.0 },
  ]
  /** 场地高度场：台地基面 B=0.28（高于市政草皮瓦顶 0.16）+ 丘陵 − 湖盆 − 环湖矮堤；
   *  湖盆挖入瓦层以下——visible 湖底 = 市政草皮瓦面，水面 0.21 浮于其上如「镜盆」 */
  const B = 0.28
  const H = (x: number, z: number): number => {
    let h = B + 0.02 * Math.sin(x * 0.42 + 1.7) * Math.cos(z * 0.5 + 0.4)
    for (const g of hills) {
      const k = 2 * (0.62 * g.r) ** 2
      h += g.h * Math.exp(-((x - g.x) ** 2 / k + (z - g.z) ** 2 / k))
    }
    const tl = lakeT(x, z)
    const waterIn = smooth(1.06, 0.62, tl)
    if (waterIn > 0) h -= 1.85 * waterIn
    const tw = wetT(x, z)
    const wetIn = smooth(1.04, 0.55, tw)
    if (wetIn > 0) h -= 0.55 * wetIn
    const levee = smooth(1.0, 1.13, tl) * (1 - smooth(1.16, 1.34, tl))
    h += 0.2 * levee
    // 路径压平（不侵入水体）
    const land = 1 - smooth(0.98, 1.16, tl)
    for (const p of flattenPaths) {
      const d = distPoly(p.pts, x, z)
      const w = smooth(p.w / 2 + 1.35, p.w / 2 + 0.35, d) * land
      if (w > 0) h = h + (B + 0.04 - h) * w * 0.96
    }
    for (const r of rects) {
      const ex = Math.max(r.x0 - x, x - r.x1, 0)
      const ez = Math.max(r.z0 - z, z - r.z1, 0)
      const d = Math.hypot(ex, ez)
      const w = smooth(1.7, 0.4, d) * land
      if (w > 0) h = h + (r.lvl - h) * w * 0.96
    }
    for (const c of circles) {
      const d = Math.hypot(x - c.cx, z - c.cz)
      const w = smooth(c.r + 1.5, c.r - 0.6, d) * land
      if (w > 0) h = h + (c.lvl - h) * w * 0.96
    }
    return h
  }
  const hash2 = (x: number, z: number): number => {
    const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453
    return s - Math.floor(s)
  }
  const grassTints = ['#75905E', '#7F9A66', '#6B8757', '#88A06C', '#718C5C']
  /** 顶点配色：草坡渐变/岸线沙/水下深色/林下阴绿/花甸暖点，微噪声去塑料感 */
  const colorAt = (x: number, z: number, h: number): [number, number, number] => {
    let hex: string
    const tl = lakeT(x, z)
    const tw = wetT(x, z)
    if (h < -1.15) hex = '#3B4A43'
    else if (h < -0.45) hex = '#4C5F4C'
    else if (h < -0.1) hex = tl < 1.1 ? '#978B6F' : '#7C8A62'
    else if (tl > 0.97 && tl < 1.16) hex = '#CFC09B'
    else if (tw > 0.9 && tw < 1.12) hex = '#A9A183'
    else if (z > 9.2) hex = hash2(x * 1.7, z * 1.3) < 0.22 ? '#54684A' : '#5E744B'
    else if (h > 1.4) hex = '#96AC70'
    else hex = grassTints[Math.floor(hash2(x * 1.13, z * 0.97) * grassTints.length)]
    const c = new THREE.Color(hex)
    const j = 0.86 + hash2(x * 3.7 + 11, z * 3.1 + 7) * 0.26
    return [c.r * j, c.g * j * (0.96 + hash2(z * 0.7, x * 2.3) * 0.1), c.b * j]
  }

  // ── 1. 地景基面（60×40 满铺至宗地边缘） ────────────────────────
  root.add(heightfield({ w: ctx.lot.size[0], d: ctx.lot.size[1], segX: 420, segZ: 280, fn: H, colorAt }))

  // ── 2. 水体 ────────────────────────────────────────────────────
  const waterGrp = new THREE.Group()
  waterGrp.userData.site = true
  waterGrp.add(waterEllipse({ cx: lake.cx, cz: lake.cz, rx: lake.rx * 1.02, rz: lake.rz * 1.02, y: 0.21, color: '#5F97AB', seg: 72, rim: 0.014 }))
  waterGrp.add(waterEllipse({ cx: wet.cx, cz: wet.cz, rx: wet.rx * 1.04, rz: wet.rz * 1.03, y: 0.19, color: '#6FA38E', seg: 44, rim: 0.02 }))
  // 微波同心环（原点塔倒影落在湖心，涟漪自桥墩处泛起）
  const rippleMat = new THREE.MeshStandardMaterial({ color: '#D6EDF4', emissive: '#9FD0DE', emissiveIntensity: 0.35, metalness: 0.1, roughness: 0.2, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
  for (const [rx, rz, n] of [[-10, -11.8, 4], [-2, -10.5, 3], [4, -12.6, 2]] as const) {
    for (let i = 0; i < n; i++) {
      const r = 0.5 + i * 0.55
      const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 5, 34), rippleMat)
      t.rotation.x = Math.PI / 2
      t.position.set(rx + (rng() - 0.5) * 0.6, 0.215, rz + (rng() - 0.5) * 0.6)
      t.scale.set(1, 1, 0.72)
      waterGrp.add(t)
    }
  }
  root.add(waterGrp)

  // ── 3. 园路系统（整组抬至台基 B=0.28） ─────────────────────────
  const pathsGrp = new THREE.Group()
  pathsGrp.userData.site = true
  pathsGrp.position.y = B
  pathsGrp.add(ribbonPath({ pts: P.prom.pts, width: P.prom.w, color: '#BCB29A', y: 0.05 }))
  pathsGrp.add(ribbonPath({ pts: P.causeway.pts, width: P.causeway.w, color: '#C6C1B5', y: 0.05 }))
  pathsGrp.add(ribbonPath({ pts: P.axisN.pts, width: P.axisN.w, color: '#C6C1B5', y: 0.05 }))
  pathsGrp.add(ribbonPath({ pts: P.eastShore.pts, width: P.eastShore.w, color: '#B7A98C', y: 0.05 }))
  pathsGrp.add(ribbonPath({ pts: P.eastPerim.pts, width: P.eastPerim.w, color: '#B7A98C', y: 0.05 }))
  pathsGrp.add(ribbonPath({ pts: P.westConn.pts, width: P.westConn.w, color: '#A8927A', y: 0.05 }))
  pathsGrp.add(ribbonPath({ pts: P.gladeW.pts, width: P.gladeW.w, color: '#A8927A', y: 0.05 }))
  pathsGrp.add(ribbonPath({ pts: P.glade.pts, width: P.glade.w, color: '#A8927A', y: 0.05 }))
  // 湿地木栈道（凌水而过，不必压平）
  pathsGrp.add(boardwalk({ pts: [[-24.8, -1.2], [-26.6, 0.6], [-27.4, 3.4], [-26.6, 6.2], [-24.8, 8.4]], width: 2.2, y: 0.16 }))
  // 东湾汀步（浅水 crossing）
  pathsGrp.add(steppingStones({ pts: [[8.2, -14.2], [9.6, -13.2], [10.6, -12]], step: 0.95, r: 0.4, seedRng: rng }))
  pathsGrp.add(steppingStones({ pts: [[-19.5, -5.6], [-20.6, -4.6], [-21.4, -3.6]], step: 0.95, r: 0.38, seedRng: rng }))
  root.add(pathsGrp)

  // ── 4. 广场铺装 ────────────────────────────────────────────────
  const plazas = new THREE.Group()
  plazas.userData.site = true
  plazas.position.y = B
  plazas.add(tilePlaza({
    cx: -10, cz: -18.1, r: 13, tile: 1.05, y: 0.1, color: '#C6C1B5', ringBand: [3.1, 3.95], ringColor: '#8E8577',
    clip: (x, z) => x >= -17.2 && x <= -2.8 && z <= -15.3 && z >= -19.8, jitter: rng,
  }))
  plazas.add(tilePlaza({ cx: 24.9, cz: -13.2, r: 3.3, tile: 0.95, y: 0.1, color: '#C9C4BA', ringBand: [2.2, 2.75], ringColor: '#94897A', jitter: rng }))
  plazas.add(tilePlaza({ cx: -3.8, cz: 4.8, r: 4.2, tile: 0.95, y: 0.1, color: '#C9C4BA', ringBand: [3.1, 3.7], ringColor: '#94897A', jitter: rng }))
  root.add(plazas)

  // ── 5. 结构：拱步桥 · 灯塔 · 花架 · 塔框（落在台基/广场面层上） ──
  root.add(archFootbridge({ from: [-10, -16], to: [-10, -3.5], width: 3.6, rise: 1.25, y0: 0.48, y1: 0.48, planks: 38 }))
  { // 桥墩两枚
    const pierMat = new THREE.MeshStandardMaterial({ color: '#8F8B82', roughness: 0.9 })
    for (const [pz, py] of [[-12.25, 1.6], [-7.25, 1.6]] as const) {
      const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, py + 1.5, 10), pierMat)
      pier.position.set(-10, (py - 1.5) / 2, pz)
      pier.castShadow = true
      root.add(pier)
    }
  }
  {
    const lh = lighthouse({ x: -3.8, z: 4.8, h: 9 })
    lh.position.y = 0.34
    root.add(lh)
    const pg = pergola({ x: 21.6, z: 5, rotY: Math.PI / 2, length: 12, bays: 6 })
    pg.position.y = 0.34
    root.add(pg)
    const fr = framingRing({ x: -10, z: -18.1, rotY: 0 })
    fr.position.y = 0.42
    root.add(fr)
    for (const [sx2, sz2, sr] of [[-13.2, -16.2, 2.6], [22.6, -11.6, -1.2]] as const) {
      const sp = signPost({ x: sx2, z: sz2, rotY: sr })
      sp.position.y = 0.4
      root.add(sp)
    }
  }

  // ── 6. 家具：坐凳 · 矮灯 · 高杆灯 · 围合绿篱 ───────────────────
  const furn = new THREE.Group()
  furn.position.y = B
  const benchFacing = (x: number, z: number): void => {
    const a = Math.atan2(lake.cx - x, lake.cz - z)
    furn.add(ctx.blocks.bench({ x, z, rotY: a }))
  }
  for (const [bx, bz] of [[-16.5, -2.6], [-12.5, -1.4], [-4.5, -1.5], [2, -2.4], [8.8, -12.6], [10.9, -9.6], [-13.5, -16.9], [-6.5, -16.9], [-19.2, -1.0], [18.9, -2.6], [18.7, 7.4], [23.1, -15.6], [-5.6, 7.4], [-1.6, 5.2], [-11.5, 8.8], [-7, 10.8]] as const) benchFacing(bx, bz)
  for (const [lx, lz] of [[-18.5, -3.2], [-14.5, -1.9], [-9, -1.05], [-2.5, -1.55], [4, -2.8], [10, -14.2], [11.2, -9.2], [20.6, -8.2], [18.6, 1.4], [18.5, 9.8], [22.8, 13.8], [-10.8, 12.2], [-2.8, 12.6], [8.6, 12.9], [-21.3, 0.2], [-25.2, 7.2], [-12.9, -16.9], [-7.1, -19.3], [27.6, -13.2], [-6.4, 2.4]] as const) furn.add(bollardLamp({ x: lx, z: lz }))
  for (const [sx, sz] of [[-15.8, -17.2], [-4.2, -17.2], [27.6, -15.8], [27.4, -10.6], [12.8, 14.8], [-18.6, 15.2]] as const) furn.add(ctx.blocks.streetLamp({ x: sx, z: sz, h: 4.6 }))
  { // 围合绿篱（留三处开口：南轴、东环路北出、西conn）
    const hEdges: Array<[number, number, number, number]> = [
      [-26.4, -19.4, 27.8, -19.4], [-8.6, -19.4, 26.6, -19.4],
      [-26.6, 19.4, 26.6, 19.4],
      [-29.4, -16.8, -29.4, 16.8],
      [29.4, -16.6, 29.4, 13.8], [29.4, 16.2, 29.4, 18.8],
    ]
    for (const [x0, z0, x1, z1] of hEdges) {
      const vert = x0 === x1
      const len = Math.hypot(x1 - x0, z1 - z0)
      const n = Math.max(2, Math.round(len / 3.4))
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n
        furn.add(ctx.blocks.hedge({ x: x0 + (x1 - x0) * t, z: z0 + (z1 - z0) * t, w: vert ? 0.8 : 3.2, d: vert ? 3.2 : 0.8, h: 0.72 }))
      }
    }
  }
  root.add(furn)

  // ── 7. 种植（整组站在台基 B 上） ───────────────────────────────
  const plant = new THREE.Group()
  plant.position.y = B
  const nearPath = (x: number, z: number, pad: number): boolean => {
    for (const p of flattenPaths) if (distPoly(p.pts, x, z) < p.w / 2 + pad) return true
    return false
  }
  const inLake = (x: number, z: number, pad: number): boolean => lakeT(x, z) < 1 + pad
  const inWet = (x: number, z: number, pad: number): boolean => wetT(x, z) < 1 + pad
  let sid = 1000
  /** 贴边树容差：限制树冠半径×缩放，使包围盒不越宗地（R2） */
  const fit = (x: number, z: number, spread: number, s: number): number => {
    const mx = (ctx.lot.size[0] / 2 - 0.5 - Math.abs(x)) / spread
    const mz = (ctx.lot.size[1] / 2 - 0.5 - Math.abs(z)) / spread
    return Math.max(0.42, Math.min(s, mx, mz))
  }
  // 背景林带（百花林前缘，E4 北三地块南延部分——疏密由噪声控制）
  for (let gx = -28.6; gx <= 28.6; gx += 1.6) {
    for (let gz = 9.6; gz <= 19.2; gz += 1.75) {
      const jx = gx + (rng() - 0.5) * 1.3
      const jz = gz + (rng() - 0.5) * 1.3
      if (jx < -29 || jx > 29 || jz > 19.3) continue
      const dens = 0.5 + 0.5 * Math.sin(jx * 0.31 + jz * 0.23 + 1.2)
      if (rng() > dens * 0.7 + 0.08) continue
      if (nearPath(jx, jz, 1.7)) continue
      const s0 = 0.75 + rng() * 0.7
      const edge = jx < -24 || jx > 24 || jz > 17.6
      const tintPool = jz > 15 ? (rng() < 0.14 ? '#A8703C' : undefined) : undefined
      const isC = rng() < (edge ? 0.55 : 0.32)
      const s = fit(jx, jz, isC ? 1.9 : 2.6, s0)
      if (isC) plant.add(conifer({ x: jx, z: jz, scale: s, seed: (sid += 7), tint: tintPool }))
      else plant.add(broadleaf({ x: jx, z: jz, scale: s, seed: (sid += 7), tint: tintPool }))
    }
  }
  // 疏林草坡独赏树（丘谷之间）
  const solitaires: Array<[number, number, number]> = [
    [1.5, 6.2, 1.5], [5.5, 3, 1.2], [-0.5, 10, 1.35], [-15, 7.5, 1.25], [-18.5, 5, 1.15], [-6.5, 8.5, 1.2],
    [9, 7, 1.3], [14, 3.5, 1.15], [25.5, 3.5, 1.3], [26.5, -6.5, 1.2], [16.5, -9, 1.4], [13.5, -3.5, 1.1],
    [20, -14.5, 1.2], [-23.5, -11.5, 1.15], [-25.5, -6.5, 1.2], [27, 16.5, 1.1], [-28.5, 13.5, 1.1], [3, -1, 1.2],
  ]
  for (const t of solitaires) {
    const [tx, tz, ts] = t
    if (inLake(tx, tz, 0.2) || nearPath(tx, tz, 1.4)) continue
    plant.add(broadleaf({ x: tx, z: tz, scale: fit(tx, tz, 2.6, ts), seed: (sid += 13), tint: ts > 1.35 ? '#87A06A' : undefined, rich: ts >= 1.35 }))
  }
  // 环湖垂柳（岸线点睛）
  for (const [wx, wz, ws] of [[-19.6, -3.0, 0.95], [-14.2, -3.2, 0.85], [4.6, -4.9, 0.9], [-22.9, -9.8, 0.8], [-21.8, -13.4, 0.9], [7.4, -7.4, 0.85], [9.9, -14.6, 0.95], [-13.8, -15.2, 0.8], [-5.4, -15.4, 0.85], [2.6, -15.3, 0.8]] as const) {
    if (nearPath(wx, wz, 0.7)) { continue }
    plant.add(willow({ x: wx, z: wz, scale: fit(wx, wz, 3.2, ws), seed: (sid += 17) }))
  }
  // 白桦列植：东环路段 + 北轴两侧
  for (let i = 0; i < 14; i++) {
    const bz = -14 + i * 2.1
    const bx = 17.6 + (rng() - 0.5) * 0.5
    plant.add(birch({ x: bx, z: bz + (rng() - 0.5) * 0.8, scale: fit(bx, bz, 1.8, 0.9 + rng() * 0.35), seed: (sid += 19) }))
  }
  for (let i = 0; i < 5; i++) {
    const az = -2 + i * 3.1
    plant.add(birch({ x: -13.1, z: az, scale: fit(-13.1, az, 1.8, 0.85 + rng() * 0.3), seed: (sid += 23) }))
    plant.add(birch({ x: -6.4, z: az + 1.2, scale: fit(-6.4, az + 1.2, 1.8, 0.85 + rng() * 0.3), seed: (sid += 29) }))
  }
  // 灌木：环湖群落 + 广场缘 + 林下
  for (let i = 0; i < 66; i++) {
    const a = rng() * Math.PI * 2
    const rr = 1.3 + rng() * 0.25
    const sx = lake.cx + Math.cos(a) * lake.rx * rr
    const sz = lake.cz + Math.sin(a) * lake.rz * rr
    if (Math.abs(sx) > 28.8 || sz > 8 || sz < -19.2 || nearPath(sx, sz, 0.8)) continue
    if (lakeT(sx, sz) < 1.02 || inWet(sx, sz, 0.02)) continue
    plant.add(shrub({ x: sx, z: sz, scale: 0.7 + rng() * 0.75, seed: (sid += 31) }))
  }
  for (const [hx, hz] of [[-17.4, -16.6], [-3.2, -16.6], [22.2, -15.8], [27.8, -10.6], [-6.6, 1.4], [-1.4, 8.6], [24.2, 7.6], [18.6, 12.8], [-23.2, 6.4], [-25.8, -3.8], [-15.6, 0.6], [15.4, -16.4]] as const) {
    for (let k = 0; k < 3; k++) plant.add(shrub({ x: hx + (rng() - 0.5) * 1.6, z: hz + (rng() - 0.5) * 1.6, scale: 0.75 + rng() * 0.8, seed: (sid += 37) }))
  }
  // 芦苇：湿地岸线 + 湖西浅湾
  for (let i = 0; i < 104; i++) {
    const a = rng() * Math.PI * 2
    const rr = 0.94 + rng() * 0.26
    const rx = wet.cx + Math.cos(a) * wet.rx * rr
    const rz = wet.cz + Math.sin(a) * wet.rz * rr
    if (Math.abs(rx) > 29.4 || Math.abs(rz) > 19.6) continue
    plant.add(reedClump({ x: rx, z: rz, y: -0.05, scale: 0.8 + rng() * 0.8, seed: (sid += 41) }))
  }
  for (let i = 0; i < 44; i++) {
    const a = Math.PI * (0.62 + rng() * 0.9)
    const rr = 1.0 + rng() * 0.14
    const rx = lake.cx + Math.cos(a) * lake.rx * rr
    const rz = lake.cz + Math.sin(a) * lake.rz * rr
    if (rx < -28.5 || nearPath(rx, rz, 0.5)) continue
    plant.add(reedClump({ x: rx, z: rz, y: -0.12, scale: 0.7 + rng() * 0.7, seed: (sid += 43), tint: '#8A9660' }))
  }
  // 花丛：草坡与林缘（林带内更密，出「百花」之意）
  for (let i = 0; i < 280; i++) {
    const fx = (rng() * 2 - 1) * 28.4
    const fz = -15 + rng() * 33.6
    if (inLake(fx, fz, 0.1) || inWet(fx, fz, 0.06) || nearPath(fx, fz, 0.35)) continue
    if (fz < 9 && rng() < 0.3) continue
    plant.add(flowerClump({ x: fx, z: fz, scale: 0.85 + rng() * 0.7, seed: (sid += 47) }))
  }
  // 景石：岸线 + 林间
  for (const [bx2, bz2, br] of [[-17.8, -4.6, 0.5], [-11.8, -4.4, 0.4], [-1, -5.2, 0.55], [6.2, -6.2, 0.4], [-20.6, -7.2, 0.45], [8.8, -8.6, 0.35], [-23.8, -12.4, 0.5], [-6, 14.5, 0.6], [-17, 9.6, 0.45], [10, 16.5, 0.55], [21, 16.8, 0.5], [-27.8, 12.8, 0.4], [2.5, 1.2, 0.4], [14.5, 10.5, 0.5], [-13.2, 12.6, 0.45], [25.5, 12.2, 0.4], [16, 14, 0.35], [-20, 16.5, 0.5], [6.5, 9.5, 0.4], [-25.6, 16.8, 0.42], [27.8, 4.5, 0.45], [23.5, -4, 0.4], [12, -17.8, 0.45], [19, -17.6, 0.4], [-26.5, -14.5, 0.5], [-27.5, -8.5, 0.4]] as const) {
    if (Math.abs(bx2) > 29 || Math.abs(bz2) > 19.5) continue
    if (lakeT(bx2, bz2) < 1.12) continue
    plant.add(boulder({ x: bx2, z: bz2, r: br, seed: (sid += 53) }))
  }
  // 环湖岸滩卵石带（贴着真实水位线散布，半没于水）
  for (let i = 0; i < 230; i++) {
    const a = rng() * Math.PI * 2
    const rr = 0.93 + rng() * 0.17
    const px = lake.cx + Math.cos(a) * lake.rx * rr
    const pz = lake.cz + Math.sin(a) * lake.rz * rr
    if (Math.abs(px) > 29.5 || Math.abs(pz) > 19.7) continue
    const r = 0.09 + rng() * 0.11
    plant.add(boulder({ x: px, z: pz, y: -0.1, r, seed: (sid += 59) }))
  }
  plant.add(shrub({ x: -5.8, z: 3.4, scale: 0.9, seed: sid + 1 }))
  plant.add(shrub({ x: -2.2, z: 5.4, scale: 1.0, seed: sid + 2 }))
  plant.add(shrub({ x: 1.6, z: 6.0, scale: 0.9, seed: sid + 3 }))
  root.add(plant)

  return root
}

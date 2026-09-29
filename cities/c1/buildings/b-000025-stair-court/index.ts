import * as THREE from 'three'
import type { BuildCtx, Rng } from '../../../../lib/ctx'
import {
  MAT, bx, cy, cyc, ico, tor, lathe,
  F1, FU, L2, L3, L4, WING_ROOF, WING_PAR, NORTH_ROOF, GATE_ROOF, GATE_PAR,
  TIER_A, TIER_B, CW, GATE_X, STAIR_X, STAIR_Z0, STAIR_Z1,
  ribbon, piers, corbels, parapet, railing, louvres,
  planeTree, columnarTree, shrub, paving, lawn, flowerBed, bench,
  courtLamp, streetLamp, pergola, flag, hedgeRun, fenceRun,
} from './parts'

/* ─────────────────────────────────────────────────────────────────────────────
   b-000025「拾阶院」教学主楼 · F5 模都学府街区 一期 · qwen3.8-max
   宗地 F5-01+02+04+05（2×2，40×40m）；局部原点 = 宗地中心地面，Y 向上
   +z 北（对 F4 灯花市集 15.5m / 南灯公寓 45m）· −x 西（对 E5 叠澜塔 116m / 原点塔 211m）
   母题「阶·荫·书」：退台书山报课钟塔 38m · 台阶讲坛大台阶 · 悬铃木林荫 · 通长晨读长窗
   R13 策略：墙体外表面一律内收红线 0.5m（±17.5），壁柱补到 ±18，窗件微挑出墙面
            （最远 ±17.61）；四周 2m 环带全部为景观件（userData.site 豁免）
   ───────────────────────────────────────────────────────────────────────────── */

const ENV = 17.5      // 墙体外表面（红线内收 0.5m）
const WIN_IN = 10     // 东西翼回廊外缘

export default function build(ctx: BuildCtx): THREE.Object3D {
  const rng = ctx.rng
  const root = new THREE.Group()
  root.name = 'b-000025-stair-court'
  const land = new THREE.Group()
  land.userData.site = true          // 景观件 → R13 退线豁免

  ground(land, rng)
  plinth(root)
  wing(root, rng, -1)
  wing(root, rng, 1)
  stairTower(root)
  northWing(root, rng)
  bellTower(root, rng)
  southWing(root, rng)
  arcade(root, rng)
  grandStair(root)
  courtyard(land, rng)
  roofscape(root, rng)
  streetFront(land, rng)
  nightLights(root, land)

  root.add(land)
  return root
}

/* ══════════ 场地基底（40×40 满铺至红线） ══════════ */
function ground(g: THREE.Group, rng: Rng): void {
  g.add(bx('grass', 40, 0.12, 40, 0, 0, 0))
  paving(g, -20, 20, 18, 20, 0.13, 0.66, rng)
  paving(g, -20, -18, -20, 20, 0.13, 0.66, rng)
  paving(g, 18, 20, -20, 20, 0.13, 0.66, rng)
  paving(g, -20, 20, -20, -18, 0.13, 0.66, rng)
  lawn(g, -20, -18.5, -16, 16, 0.13, rng, 170)
  lawn(g, 18.5, 20, -16, 16, 0.13, rng, 170)
  lawn(g, -16, 16, -20, -18.5, 0.13, rng, 140)
  g.add(bx('concMid', 0.16, 0.2, 32, -18.55, 0.13, 0))
  g.add(bx('concMid', 0.16, 0.2, 32, 18.55, 0.13, 0))
  g.add(bx('concMid', 32, 0.2, 0.16, 0, 0.13, -18.55))
  g.add(bx('concMid', 40, 0.2, 0.16, 0, 0.13, 18.08))
  // 人行道盲道条（沿西/北两侧，城市接口）
  for (let i = 0; i < 60; i++) g.add(bx('paveWarm', 0.32, 0.03, 0.32, -19.4, 0.25, -19.4 + i * 0.65))
  for (let i = 0; i < 60; i++) g.add(bx('paveWarm', 0.32, 0.03, 0.32, -19.4 + i * 0.65, 0.25, 19.4))
}

/* ══════════ 台基（四翼地坪 ±0.45） ══════════ */
function plinth(g: THREE.Group): void {
  for (const s of [-1, 1] as const) g.add(bx('concDk', ENV - CW, 0.45, 20, s * ((ENV + CW) / 2), 0, 0))
  g.add(bx('concDk', ENV * 2, 0.45, ENV - 10, 0, 0, (10 + ENV) / 2))
  g.add(bx('concDk', ENV * 2, 0.45, 4.5, 0, 0, -15.25))
  g.add(bx('concDk', ENV * 2, 0.45, 5.5, 0, 0, -10.25))
  for (const s of [-1, 1] as const) {
    g.add(bx('brickBase', 0.6, 0.5, 20, s * (ENV + 0.2), 0.45, 0))
    g.add(bx('brickBase', ENV * 2, 0.5, 0.6, 0, 0.45, -17.7))
    g.add(bx('brickBase', 11, 0.5, 0.6, s * 12.5, 0.45, 17.7))
    g.add(bx('brickBase', 14, 0.5, 0.6, 0, 0.45, 17.7))
  }
}

/* ══════════ 东西翼教室楼（四层 + 外廊，西向木格栅遮阳） ══════════ */
function wing(g: THREE.Group, rng: Rng, s: -1 | 1): void {
  const OUT = ENV * s, dir = (-s) as 1 | -1
  // 一层房间体量 + 上部体量（含走廊，悬挑于回廊之上）
  g.add(bx('brick', ENV - WIN_IN, F1 - 0.45, 20, s * ((ENV + WIN_IN) / 2), 0.45, 0))
  g.add(bx('brick', ENV - CW, WING_ROOF - F1, 20, s * ((ENV + CW) / 2), F1, 0))
  g.add(bx('concMid', ENV - CW, 0.36, 20, s * ((ENV + CW) / 2), F1 - 0.36, 0))
  // 外立面砖壁柱（补到红线 ±18）
  piers(g, { axis: 'z', at: 18 * s, dir, from: -10, to: 10, y0: 0.45, h: WING_ROOF - 0.45, n: 4, w: 0.9, d: 0.5 })
  // 楼板混凝土带
  for (const y of [L2, L3, L4, WING_ROOF]) g.add(bx('concMid', 0.5, 0.4, 20, s * (ENV + 0.15), y - 0.2, 0))
  // 外立面长窗（一层小窗 + 二~四层教室长窗，南端开间为楼梯间）
  ribbon(g, { axis: 'z', at: OUT, dir, from: -10, to: 10, y0: 1.3, h: 1.95, bays: 4, jamb: 0.85, rng, lit: 0.18 })
  for (const y of [L2, L3, L4]) ribbon(g, { axis: 'z', at: OUT, dir, from: -10, to: 10, y0: y + 0.95, h: 2.05, bays: 4, jamb: 0.8, rng, lit: 0.34 })
  // 楼梯间竖向窄窗
  for (const y of [1.2, L2 + 0.7, L3 + 0.7, L4 + 0.7]) {
    g.add(bx('glass', 0.18, 1.85, 1.05, s * (ENV + 0.05), y, -8.4))
    for (const dz of [-0.52, 0, 0.52]) g.add(bx('alu', 0.09, 1.95, 0.07, s * (ENV - 0.05), y - 0.05, -8.4 + dz))
  }
  // 走廊：楼板 + 中庭侧通长玻璃 + 内栏杆 + 教室门 + 储物柜 + 灯带
  for (const y of [L2, L3, L4]) {
    g.add(bx('glass', 0.18, 2.5, 19.4, s * (CW + 0.06), y + 0.5, 0))
    for (let m = 0; m <= 13; m++) g.add(bx('alu', 0.09, 2.6, 0.075, s * (CW - 0.05), y + 0.45, -9.7 + m * 1.49))
    g.add(bx('concMid', 0.42, 0.32, 19.6, s * (CW + 0.2), y + 3.0, 0))
    g.add(bx('concMid', 0.42, 0.5, 19.6, s * (CW + 0.2), y, 0))
    railing(g, { axis: 'z', at: s * (CW + 0.62), from: -9.6, to: 9.6, y: y + 0.02, h: 1.0, step: 0.28 })
    for (let i = 0; i < 4; i++) {
      g.add(bx('timberDk', 0.09, 2.1, 1.05, s * (WIN_IN - 0.06), y, -7.5 + i * 5.0))
      g.add(bx('alu', 0.05, 0.14, 0.14, s * (WIN_IN - 0.12), y + 1.05, -7.08 + i * 5.0))
      g.add(bx('glassWarm', 0.06, 0.5, 0.42, s * (WIN_IN - 0.1), y + 1.5, -7.78 + i * 5.0))
    }
    for (let i = 0; i < 10; i++) g.add(bx('steel', 0.36, 1.8, 0.85, s * (WIN_IN - 0.2), y, -9.2 + i * 2.0))
    g.add(bx('lamp', 0.3, 0.06, 18.6, s * (CW + 1.5), y + 3.14, 0))
    g.add(bx('red', 0.24, 0.7, 0.5, s * (WIN_IN - 0.14), y + 0.9, 9.2))
  }
  // 走廊端部折跑梯（自玻璃外可见）
  for (const y of [L2, L3, L4]) {
    for (let i = 0; i < 12; i++) g.add(bx('concMid', 1.35, 0.07, 0.32, s * (CW + 1.4), y - 0.36 + i * 0.3, 8.5 - i * 0.15))
    railing(g, { axis: 'z', at: s * (CW + 0.7), from: 6.7, to: 8.6, y: y - 0.3, h: 0.95, step: 0.3 })
  }
  // 端墙窗
  for (const z of [-10, 10] as const) {
    for (const y of [1.4, L2 + 0.9, L3 + 0.9, L4 + 0.9]) {
      ribbon(g, { axis: 'x', at: z, dir: (z === -10 ? 1 : -1) as 1 | -1, from: s * ENV, to: s * (WIN_IN + 0.4), y0: y, h: 1.8, bays: 2, jamb: 0.7, rng, lit: 0.24 })
    }
  }
  // 女儿墙 + 挑砖线脚 + 屋面 + 雨水管
  parapet(g, { axis: 'z', at: 18 * s, dir: s, from: -10, to: 10, y: WING_ROOF, h: 1.2 })
  parapet(g, { axis: 'x', at: -10, dir: -1, from: 18 * s, to: CW * s, y: WING_ROOF, h: 1.2 })
  parapet(g, { axis: 'x', at: 10, dir: 1, from: 18 * s, to: CW * s, y: WING_ROOF, h: 1.2 })
  corbels(g, { axis: 'z', at: ENV * s, dir: s, from: -10, to: 10, y: WING_ROOF - 0.22 })
  g.add(bx('concDk', ENV - CW, 0.22, 20, s * ((ENV + CW) / 2), WING_ROOF - 0.22, 0))
  for (const z of [-9.4, -3.2, 3.2, 9.4]) g.add(cy('steel', 0.09, 0.09, WING_ROOF - 0.4, 8, s * (ENV + 0.32), 0.45, z))
  // 西向木格栅遮阳屏（仅西翼：过滤西晒，框出叠澜塔/原点塔景）
  if (s === -1) {
    for (const y of [L2 + 0.6, L3 + 0.6, L4 + 0.6]) {
      for (const [a, b] of [[-9.6, -5.3], [-4.9, 4.9], [5.3, 9.6]] as const) {
        louvres(g, { axis: 'z', at: -ENV - 0.32, from: a, to: b, y0: y, y1: y + 2.62, rng })
      }
    }
    for (const y of [L2 + 0.44, L3 + 0.44, L4 + 0.44, WING_ROOF - 0.36]) g.add(bx('conc', 0.4, 0.16, 19.6, -ENV - 0.3, y, 0))
    for (let i = 0; i < 5; i++) g.add(bx('steelDk', 0.4, 12.2, 0.1, -ENV - 0.3, 1.4, -9.4 + i * 4.7))
  }
}

/** 砖花格屏（0.4m 模数砌块隔一留缝，透光通风，母题「书」的格律）
 *  at = 墙面，dir = 向外（屏挑出墙面 0.12，最远 ±17.74，稳守 R13） */
function brickScreen(g: THREE.Group, o: {
  axis: 'x' | 'z'; at: number; dir: 1 | -1; c: number; y0: number; w: number; h: number
}): void {
  const m = 0.4
  const nx = Math.floor(o.w / m), ny = Math.floor(o.h / m)
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      if ((i + j) % 2 === 1) continue
      const k = (i + j) % 4 === 0 ? 'brickDk' : 'brick'
      const u = o.c - o.w / 2 + m * (i + 0.5)
      const y = o.y0 + m * (j + 0.5)
      if (o.axis === 'z') g.add(bx(k, 0.24, m - 0.12, m - 0.12, o.at + o.dir * 0.12, y, u))
      else g.add(bx(k, m - 0.12, m - 0.12, 0.24, u, y, o.at + o.dir * 0.12))
    }
  }
  if (o.axis === 'z') {
    g.add(bx('conc', 0.4, 0.24, o.w + 0.3, o.at + o.dir * 0.12, o.y0 - 0.24, o.c))
    g.add(bx('conc', 0.4, 0.24, o.w + 0.3, o.at + o.dir * 0.12, o.y0 + o.h + 0.06, o.c))
    g.add(bx('steelDk', 0.08, o.h + 0.3, 0.08, o.at + o.dir * 0.2, o.y0 - 0.24, o.c - o.w / 2))
    g.add(bx('steelDk', 0.08, o.h + 0.3, 0.08, o.at + o.dir * 0.2, o.y0 - 0.24, o.c + o.w / 2))
  } else {
    g.add(bx('conc', o.w + 0.3, 0.24, 0.4, o.c, o.y0 - 0.24, o.at + o.dir * 0.12))
    g.add(bx('conc', o.w + 0.3, 0.24, 0.4, o.c, o.y0 + o.h + 0.06, o.at + o.dir * 0.12))
  }
}

/** 东翼北端玻璃楼梯塔（凸出墙面 0.4m，塔内折跑梯自玻璃外可见） */
function stairTower(g: THREE.Group): void {
  const X = 15.6, W = 4.6, FX = 17.9
  g.add(bx('brick', W, WING_PAR - 0.45, 4.8, X, 0.45, 7.6))
  for (const y of [1.0, L2 + 0.5, L3 + 0.5, L4 + 0.5]) {
    g.add(bx('glass', 0.18, 2.4, 3.4, FX, y, 7.6))
    for (let m = 0; m < 5; m++) g.add(bx('alu', 0.09, 2.5, 0.08, FX + 0.04, y - 0.05, 6.2 + m * 0.72))
    g.add(bx('glass', 3.4, 2.4, 0.18, X, y, 10.0))
    for (let m = 0; m < 5; m++) g.add(bx('alu', 0.08, 2.5, 0.09, X - 1.4 + m * 0.72, y - 0.05, 10.04))
    g.add(bx('concMid', 0.42, 0.3, 3.5, FX - 0.16, y + 2.45, 7.6))
  }
  for (let f = 0; f < 4; f++) {
    const y = f * FU + 0.45
    for (let i = 0; i < 12; i++) g.add(bx('concMid', 1.55, 0.07, 0.3, X, y + i * 0.29, 6.1 + i * 0.25))
    g.add(bx('concMid', 1.95, 0.16, 1.5, X, y + 3.4, 9.0))
    railing(g, { axis: 'z', at: X - 0.82, from: 6.0, to: 9.1, y: y + 0.6, h: 0.95, step: 0.3 })
  }
  g.add(bx('conc', W + 0.2, 0.24, 5.0, X, WING_PAR, 7.6))
  parapet(g, { axis: 'x', at: 10, dir: 1, from: X - W / 2, to: X + W / 2, y: WING_PAR + 0.24, h: 0.5 })
  g.add(cy('steel', 0.28, 0.34, 1.5, 12, X, WING_PAR + 0.24, 7.6))
  g.add(bx('lamp', 0.1, 0.1, 3.2, X - 1.6, WING_PAR - 0.3, 7.6))
}

/* ══════════ 北翼（校门门楼 + 两翼段行政办公） ══════════ */
function northWing(g: THREE.Group, rng: Rng): void {
  const dir = -1 as 1 | -1
  for (const s of [-1, 1] as const) {
    const x0 = s === -1 ? -18 : GATE_X, x1 = s === -1 ? -GATE_X : 18
    // 一层房间（退让出回廊 z 10..12.5）+ 上部体量（悬挑于回廊上）
    g.add(bx('brick', 11, F1 - 0.45, ENV - 12.5, s * 12.5, 0.45, (12.5 + ENV) / 2))
    g.add(bx('brick', 11, NORTH_ROOF - F1, ENV - 10.4, s * 12.5, F1, (10.4 + ENV) / 2))
    g.add(bx('concMid', 11, 0.36, ENV - 10, s * 12.5, F1 - 0.36, (10 + ENV) / 2))
    piers(g, { axis: 'x', at: 18, dir: -1, from: x0 + 0.45, to: x1 - 0.45, y0: 0.45, h: NORTH_ROOF - 0.45, n: 3, w: 0.85, d: 0.5 })
    for (const y of [L2, L3, NORTH_ROOF]) g.add(bx('concMid', 11, 0.4, 0.5, s * 12.5, y - 0.2, ENV + 0.15))
    for (const y of [1.3, L2 + 0.9, L3 + 0.9]) ribbon(g, { axis: 'x', at: ENV, dir, from: x0 + 0.5, to: x1 - 0.5, y0: y, h: 1.95, bays: 3, jamb: 0.75, rng, lit: 0.3 })
    for (const y of [1.5, L2 + 0.95, L3 + 0.95]) ribbon(g, { axis: 'x', at: 12.5, dir: 1, from: x0 + 0.7, to: x1 - 0.7, y0: y, h: 1.85, bays: 3, jamb: 0.7, rng, lit: 0.24 })
    parapet(g, { axis: 'x', at: 18, dir: 1, from: x0, to: x1, y: NORTH_ROOF, h: 1.2 })
    parapet(g, { axis: 'z', at: s * 18, dir: s, from: 10.4, to: 18, y: NORTH_ROOF, h: 1.2 })
    corbels(g, { axis: 'x', at: ENV, dir: 1, from: x0, to: x1, y: NORTH_ROOF - 0.22 })
    // 端墙砖花格屏（临西/东城市道路，母题「书」的格律）
    brickScreen(g, { axis: 'z', at: s * ENV, dir: s, c: 14.0, y0: 1.2, w: 5.0, h: 8.4 })
    g.add(bx('concDk', 11, 0.22, ENV - 10.4, s * 12.5, NORTH_ROOF - 0.22, (10.4 + ENV) / 2))
    for (const z of [10.8, 17.0]) g.add(cy('steel', 0.09, 0.09, NORTH_ROOF - 0.4, 8, s * (ENV + 0.32), 0.45, z))
    // 屋顶设备：空调外机格栅阵 + 通风帽
    for (let i = 0; i < 4; i++) {
      const x = s * (9.2 + i * 2.3)
      g.add(bx('alu', 1.5, 0.78, 0.92, x, NORTH_ROOF, 13.0))
      for (let k = 0; k < 8; k++) g.add(bx('steelDk', 1.44, 0.05, 0.035, x, NORTH_ROOF + 0.08 + k * 0.085, 13.46))
    }
    g.add(bx('conc', 1.5, 1.2, 1.5, s * 16.0, NORTH_ROOF, 16.0))
    g.add(cy('steel', 0.34, 0.42, 1.0, 12, s * 16.0, NORTH_ROOF + 1.2, 16.0))
  }
  // ── 中央门楼：一层开敞门廊（柱列），二层实体量，檐口 9.0，塔身自其上拔起
  g.add(bx('brick', 14, GATE_ROOF - F1, ENV - 10.4, 0, F1, (10.4 + ENV) / 2))
  g.add(bx('concMid', 14, 0.4, ENV - 10, 0, F1 - 0.4, (10 + ENV) / 2))
  ribbon(g, { axis: 'x', at: ENV, dir, from: -6.7, to: -4.0, y0: L2 + 0.95, h: 2.0, bays: 1, jamb: 0.2, rng, lit: 0.6, mat: 'glassWarm' })
  ribbon(g, { axis: 'x', at: ENV, dir, from: 4.0, to: 6.7, y0: L2 + 0.95, h: 2.0, bays: 1, jamb: 0.2, rng, lit: 0.6, mat: 'glassWarm' })
  piers(g, { axis: 'x', at: 18, dir: -1, from: -GATE_X, to: GATE_X, y0: F1, h: GATE_ROOF - F1, n: 4, w: 0.75, d: 0.5 })
  for (const x of [-6.3, -2.6, 2.6, 6.3]) {
    for (const z of [11.2, 16.8]) {
      g.add(bx('brick', 0.62, F1 - 0.45, 0.62, x, 0.45, z))
      g.add(bx('conc', 0.82, 0.24, 0.82, x, F1 - 0.24, z))
      g.add(bx('brickDk', 0.68, 0.14, 0.68, x, 0.45, z))
    }
  }
  for (let i = 0; i < 5; i++) g.add(bx('lamp', 2.3, 0.07, 0.24, -5.2 + i * 2.6, F1 - 0.5, 14))
  // 门廊柱壁灯（把 8m 深门洞打亮，夜里校门是一条暖光廊）
  for (const x of [-6.3, -2.6, 2.6, 6.3]) {
    for (const z of [11.2, 16.8]) {
      g.add(bx('lamp', 0.14, 0.4, 0.1, x + 0.34, 2.5, z))
      g.add(bx('bronze', 0.1, 0.5, 0.08, x + 0.32, 2.45, z))
    }
  }
  // 门房（西）+ 校史展示墙（东）
  g.add(bx('glass', 2.5, 3.0, 5.6, -5.0, 0.45, 14))
  for (let m = 0; m < 4; m++) g.add(bx('alu', 0.09, 3.1, 0.09, -5.0, 0.45, 11.4 + m * 1.85))
  g.add(bx('alu', 2.6, 0.09, 5.7, -5.0, 3.4, 14))
  g.add(bx('conc', 2.7, 0.14, 5.8, -5.0, 0.45, 14))
  g.add(bx('lamp', 2.2, 0.05, 5.2, -5.0, F1 - 0.5, 14))
  g.add(bx('timberDk', 1.4, 0.08, 0.7, -5.0, 0.72, 12.4))
  g.add(bx('brickDk', 2.5, 3.2, 4.8, 5.0, 0.45, 14))
  for (let i = 0; i < 3; i++) {
    g.add(bx('bronze', 0.07, 0.74, 1.1, 3.72, 1.45, 12.4 + i * 1.5))
    g.add(bx('lamp', 0.05, 0.52, 0.88, 3.66, 1.56, 12.4 + i * 1.5))
  }
  // 门楼檐口 + 挑砖 + 校名铜匾 + 校徽
  g.add(bx('conc', 14.4, 0.5, ENV - 10.4 + 0.9, 0, GATE_ROOF, (10.4 + ENV) / 2))
  parapet(g, { axis: 'x', at: 18, dir: 1, from: -GATE_X, to: GATE_X, y: GATE_ROOF + 0.5, h: 0.55 })
  corbels(g, { axis: 'x', at: ENV, dir: 1, from: -GATE_X, to: GATE_X, y: GATE_ROOF - 0.24, step: 0.26 })
  g.add(bx('bronze', 4.7, 1.1, 0.14, 0, 5.5, ENV + 0.32))
  g.add(bx('copper', 4.95, 0.1, 0.2, 0, 6.6, ENV + 0.3))
  g.add(bx('copper', 4.95, 0.1, 0.2, 0, 5.5, ENV + 0.3))
  g.add(bx('lamp', 4.4, 0.84, 0.05, 0, 5.63, ENV + 0.4))
  for (let i = 0; i < 5; i++) g.add(bx('copper', 0.64, 0.52, 0.06, -1.72 + i * 0.86, 5.79, ENV + 0.42))
  g.add(bx('lamp', 4.2, 0.07, 0.1, 0, 6.78, ENV + 0.36))
  emblem(g, 0, GATE_PAR - 0.95, ENV + 0.36)
  // 门厅内：入口台阶 + 无障碍坡道
  g.add(bx('conc', 6.4, 0.15, 0.55, 0, 0.15, 17.4))
  g.add(bx('conc', 6.4, 0.15, 0.55, 0, 0.3, 16.85))
  for (const s of [-1, 1] as const) {
    g.add(bx('concMid', 1.5, 0.1, 5.0, s * 5.0, 0.14, 14.8))
    railing(g, { axis: 'z', at: s * 5.75, from: 12.4, to: 17.3, y: 0.2, h: 0.9, step: 0.26 })
  }
}

/** 校徽：铜盘 + 12 放射条 + 外环 + 中央三竖（抽象「书」） */
function emblem(g: THREE.Group, x: number, y: number, z: number): void {
  g.add(cyc('bronze', 0.84, 0.84, 0.1, 36, x, y, z - 0.05, Math.PI / 2, 0, 0))
  g.add(cyc('copper', 0.94, 0.94, 0.05, 36, x, y, z + 0.02, Math.PI / 2, 0, 0))
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    g.add(bx('copper', 0.055, 0.36, 0.05, x + Math.cos(a) * 0.62, y + Math.sin(a) * 0.62 - 0.18, z + 0.04, -a))
  }
  g.add(bx('white', 0.09, 0.5, 0.06, x - 0.18, y - 0.25, z + 0.05))
  g.add(bx('white', 0.09, 0.64, 0.06, x, y - 0.32, z + 0.05))
  g.add(bx('white', 0.09, 0.5, 0.06, x + 0.18, y - 0.25, z + 0.05))
  g.add(bx('lamp', 0.74, 0.06, 0.05, x, y - 0.44, z + 0.05))
}

/* ══════════ 报课钟塔（退台书山，38.0m） ══════════ */
function bellTower(g: THREE.Group, rng: Rng): void {
  const TX = 3.6, TZ0 = 10.6, TZ1 = ENV, CZ = (TZ0 + TZ1) / 2, TD = TZ1 - TZ0
  g.add(bx('brick', TX * 2, GATE_PAR - 0.45, TD, 0, 0.45, CZ))
  for (const y of [1.4, L2 + 0.9]) {
    g.add(bx('glass', 0.95, 1.95, 0.18, 0, y, ENV + 0.05))
    g.add(bx('alu', 0.09, 2.05, 0.09, -0.44, y - 0.05, ENV - 0.05))
    g.add(bx('alu', 0.09, 2.05, 0.09, 0.44, y - 0.05, ENV - 0.05))
  }
  // 砖砌水平灰缝线（塔身四面，强化「书山」层理）
  for (let i = 0; i < 3; i++) {
    const y = 1.2 + i * 2.6
    g.add(bx('brickDk', TX * 2 + 0.06, 0.06, 0.06, 0, y, ENV + 0.04))
    for (const s of [-1, 1] as const) g.add(bx('brickDk', 0.06, 0.06, TD, s * (TX + 0.03), y, CZ))
  }
  g.add(bx('conc', TX * 2 + 1.2, 0.44, TD + 0.5, 0, GATE_PAR, CZ))
  corbels(g, { axis: 'x', at: TZ1, dir: 1, from: -TX - 0.4, to: TX + 0.4, y: GATE_PAR - 0.22, step: 0.24 })
  corbels(g, { axis: 'x', at: TZ0, dir: -1, from: -TX - 0.4, to: TX + 0.4, y: GATE_PAR - 0.22, step: 0.24 })
  corbels(g, { axis: 'z', at: TX, dir: 1, from: TZ0 + 0.2, to: TZ1 - 0.2, y: GATE_PAR - 0.22, step: 0.24 })
  corbels(g, { axis: 'z', at: -TX, dir: -1, from: TZ0 + 0.2, to: TZ1 - 0.2, y: GATE_PAR - 0.22, step: 0.24 })
  // 退台段：6 级 × 2.7m，每级收分 0.5m
  const LV = 6, LH = 2.7
  for (let i = 0; i < LV; i++) {
    const y = GATE_PAR + 0.44 + i * LH
    const w = TX * 2 - i * 0.5, d = TD - i * 0.5
    const hw = w / 2, hd = d / 2
    g.add(bx(i % 2 ? 'brick' : 'brickLt', w, LH, d, 0, y, CZ))
    for (const s of [-1, 1] as const) {
      g.add(bx('glass', 0.18, 2.0, 0.55, s * (hw + 0.04), y + 0.55, CZ))
      g.add(bx('alu', 0.08, 2.1, 0.08, s * (hw - 0.06), y + 0.5, CZ - 0.29))
      g.add(bx('alu', 0.08, 2.1, 0.08, s * (hw - 0.06), y + 0.5, CZ + 0.29))
      g.add(bx('glass', 0.55, 2.0, 0.18, 0, y + 0.55, CZ + s * (hd + 0.04)))
      g.add(bx('brickDk', w + 0.04, 0.07, 0.07, 0, y + LH * 0.5, CZ + s * (hd + 0.02)))
    }
    g.add(bx('concMid', w + 0.12, 0.16, d + 0.12, 0, y + LH - 0.16, CZ))
    g.add(bx('conc', w + 0.9, 0.2, d + 0.9, 0, y - 0.2, CZ))
    corbels(g, { axis: 'x', at: CZ + hd + 0.45, dir: -1, from: -hw - 0.35, to: hw + 0.35, y: y - 0.26, step: 0.22, h: 0.14 })
    corbels(g, { axis: 'x', at: CZ - hd - 0.45, dir: 1, from: -hw - 0.35, to: hw + 0.35, y: y - 0.26, step: 0.22, h: 0.14 })
    corbels(g, { axis: 'z', at: hw + 0.45, dir: -1, from: CZ - hd - 0.35, to: CZ + hd + 0.35, y: y - 0.26, step: 0.22, h: 0.14 })
    corbels(g, { axis: 'z', at: -hw - 0.45, dir: 1, from: CZ - hd - 0.35, to: CZ + hd + 0.35, y: y - 0.26, step: 0.22, h: 0.14 })
    if (i % 2 === 0) {
      for (const s of [-1, 1] as const) {
        g.add(bx('concDk', 0.52, 0.36, d * 0.6, s * (hw + 0.24), y, CZ))
        g.add(bx('grassDk', 0.42, 0.1, d * 0.55, s * (hw + 0.24), y + 0.36, CZ))
        for (let k = 0; k < 3; k++) shrub(g, s * (hw + 0.24), CZ - d * 0.2 + k * d * 0.2, y + 0.46, 0.2 + rng() * 0.08, rng)
      }
    } else {
      railing(g, { axis: 'z', at: hw + 0.36, from: CZ - hd, to: CZ + hd, y, h: 0.95, step: 0.17 })
      railing(g, { axis: 'z', at: -hw - 0.36, from: CZ - hd, to: CZ + hd, y, h: 0.95, step: 0.17 })
    }
  }
  // 钟层：混凝土框架 + 四面发光钟 + 开放钢格构（露铜钟）
  const BY = GATE_PAR + 0.44 + LV * LH
  const BW = TX * 2 - LV * 0.5 + 0.6, BD = TD - LV * 0.5 + 0.6, BH = 5.5
  g.add(bx('conc', BW, 0.34, BD, 0, BY, CZ))
  for (const sx of [-1, 1] as const) {
    for (const sz of [-1, 1] as const) g.add(bx('conc', 0.5, BH, 0.5, sx * (BW / 2 - 0.25), BY + 0.34, CZ + sz * (BD / 2 - 0.25)))
  }
  g.add(bx('conc', BW + 0.5, 0.4, BD + 0.5, 0, BY + 0.34 + BH, CZ))
  const cyb = BY + 0.34 + BH / 2 + 0.25
  dialGroup(g, 0, cyb, CZ + BD / 2 - 0.14, 0)
  dialGroup(g, 0, cyb, CZ - BD / 2 + 0.14, Math.PI)
  dialGroup(g, BW / 2 - 0.14, cyb, CZ, Math.PI / 2)
  dialGroup(g, -BW / 2 + 0.14, cyb, CZ, -Math.PI / 2)
  for (const s of [-1, 1] as const) {
    for (let i = 0; i < 6; i++) g.add(bx('steelDk', 0.055, BH - 0.6, 0.055, s * (BW / 2 - 0.04), BY + 0.62, CZ - BD / 2 + 0.5 + i * ((BD - 1.0) / 5)))
    for (let i = 0; i < 5; i++) g.add(bx('steelDk', 0.055, BH - 0.6, 0.055, -BW / 2 + 0.5 + i * ((BW - 1.0) / 4), BY + 0.62, CZ + s * (BD / 2 - 0.04)))
    for (let k = 0; k < 3; k++) {
      g.add(bx('steelDk', BW, 0.06, 0.06, 0, BY + 1.3 + k * 1.5, CZ + s * (BD / 2 - 0.04)))
      g.add(bx('steelDk', 0.06, 0.06, BD, s * (BW / 2 - 0.04), BY + 1.3 + k * 1.5, CZ))
    }
  }
  // 铜钟（Lathe 旋出钟形）+ 吊架 + 钟锤
  const bellY = BY + 1.2
  const pts: Array<[number, number]> = []
  for (let i = 0; i <= 16; i++) {
    const t = i / 16
    pts.push([0.16 + 0.62 * Math.pow(t, 2.1), t * 1.5])
  }
  pts.push([0.86, 1.5], [0.86, 1.64], [0.1, 1.68])
  g.add(lathe('copper', pts, 26, 0, bellY, CZ))
  g.add(cy('steelDk', 0.07, 0.07, 0.55, 8, 0, bellY + 1.68, CZ))
  g.add(bx('steelDk', 1.6, 0.22, 0.32, 0, bellY + 2.2, CZ))
  g.add(cy('bronze', 0.09, 0.13, 0.44, 8, 0, bellY + 0.26, CZ))
  g.add(ico('lamp', 0.12, 1, 0, bellY + 0.16, CZ))
  // 顶冠：屋面板 + 钢格栅女儿墙 + 桅杆 + 顶灯（38.0m 收头如笔尖）
  const CR = BY + 0.34 + BH + 0.4
  g.add(bx('concDk', BW + 0.3, 0.22, BD + 0.3, 0, CR, CZ))
  for (const s of [-1, 1] as const) {
    for (let i = 0; i < 12; i++) g.add(bx('steel', 0.05, 1.0, 0.05, s * (BW / 2 + 0.06), CR + 0.22, CZ - BD / 2 + i * (BD / 11)))
    for (let i = 0; i < 9; i++) g.add(bx('steel', 0.05, 1.0, 0.05, -BW / 2 + i * (BW / 8), CR + 0.22, CZ + s * (BD / 2 + 0.06)))
    g.add(bx('steel', 0.07, 0.07, BD + 0.24, s * (BW / 2 + 0.06), CR + 1.18, CZ))
    g.add(bx('steel', BW + 0.24, 0.07, 0.07, 0, CR + 1.18, CZ + s * (BD / 2 + 0.06)))
  }
  g.add(cy('steel', 0.05, 0.11, 4.5, 8, 0, CR + 1.2, CZ))
  g.add(tor('copper', 0.26, 0.035, 6, 20, 0, CR + 5.5, CZ))
  g.add(ico('lamp', 0.21, 2, 0, CR + 5.87, CZ))
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    g.add(cyc('steel', 0.022, 0.022, 1.5, 4, Math.cos(a) * 0.4, CR + 2.5, CZ + Math.sin(a) * 0.4, 0, 0, Math.cos(a) * 0.3))
  }
}

/** 钟面：白盘 + 铜环 + 60 分刻 + 12 时标 + 铜指针（定格 10:10 上下课之间）
 *  构件建于表盘局部 XY 面（法线 +Z），刻度/指针绕 Z 旋转；外层组绕 Y 转向四面 */
function dialGroup(g: THREE.Group, x: number, y: number, z: number, ry: number): void {
  const c = new THREE.Group()
  c.position.set(x, y, z)
  c.rotation.y = ry
  const r = 1.35
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.1, 40), MAT['clockFace'])
  disc.rotation.x = Math.PI / 2
  disc.position.z = -0.06
  disc.castShadow = true
  c.add(disc)
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r + 0.07, 0.06, 8, 40), MAT['bronze'])
  rim.position.z = -0.02
  c.add(rim)
  const tick = (a: number, len: number, w: number, rr: number): void => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.045), MAT['black'])
    m.position.set(Math.sin(a) * rr, Math.cos(a) * rr, 0.02)
    m.rotation.z = -a
    m.castShadow = true
    c.add(m)
  }
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2
    if (i % 5 === 0) tick(a, 0.24, 0.055, r - 0.26)
    else tick(a, 0.1, 0.026, r - 0.19)
  }
  const hand = (ang: number, len: number, w: number, zz: number): void => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.05), MAT['black'])
    m.position.set(Math.sin(ang) * len * 0.42, Math.cos(ang) * len * 0.42, zz)
    m.rotation.z = -ang
    m.castShadow = true
    c.add(m)
  }
  hand(-Math.PI / 3, r * 0.56, 0.09, 0.06)
  hand(Math.PI / 3, r * 0.82, 0.06, 0.09)
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 12), MAT['bronze'])
  hub.rotation.x = Math.PI / 2
  hub.position.z = 0.11
  c.add(hub)
  g.add(c)
}

/* ══════════ 南翼（阶梯教室 + 双层退台） ══════════ */
function southWing(g: THREE.Group, rng: Rng): void {
  // Tier B（z −17.5..−13，两层 8.1m）：一层美术/音乐教室，二层两间阶梯教室
  g.add(bx('brick', 35, TIER_B - 0.45, 4.5, 0, 0.45, -15.25))
  piers(g, { axis: 'x', at: -18, dir: 1, from: -17.65, to: 17.65, y0: 0.45, h: TIER_B - 0.45, n: 9, w: 0.7, d: 0.5 })
  for (const y of [L2, TIER_B]) g.add(bx('concMid', 35, 0.4, 0.5, 0, y - 0.2, -ENV - 0.15))
  ribbon(g, { axis: 'x', at: -ENV, dir: 1, from: -17.2, to: 17.2, y0: 1.3, h: 1.95, bays: 8, jamb: 0.5, rng, lit: 0.22 })
  ribbon(g, { axis: 'x', at: -ENV, dir: 1, from: -17.2, to: 17.2, y0: L2 + 0.9, h: 1.9, bays: 8, jamb: 0.5, rng, lit: 0.3 })
  // 二层北面通高玻璃（阶梯教室，自中庭可望见升起的地面）
  g.add(bx('glassWarm', 34.6, 3.15, 0.18, 0, L2 + 0.45, -13.06))
  for (let m = 0; m <= 24; m++) g.add(bx('alu', 0.09, 3.25, 0.1, -17.3 + m * 1.44, L2 + 0.4, -12.98))
  g.add(bx('concMid', 34.8, 0.4, 0.5, 0, L2 + 0.05, -13.1))
  g.add(bx('concMid', 34.8, 0.3, 0.45, 0, L2 + 3.6, -13.1))
  parapet(g, { axis: 'x', at: -18, dir: -1, from: -18, to: 18, y: TIER_B, h: 0.85 })
  corbels(g, { axis: 'x', at: -ENV, dir: -1, from: -18, to: 18, y: TIER_B - 0.22 })
  for (const s of [-1, 1] as const) {
    for (const y of [1.5, L2 + 0.95]) ribbon(g, { axis: 'z', at: s * ENV, dir: (-s) as 1 | -1, from: -17.2, to: -13.4, y0: y, h: 1.8, bays: 2, jamb: 0.6, rng, lit: 0.26 })
    g.add(cy('steel', 0.09, 0.09, TIER_B - 0.4, 8, s * (ENV + 0.32), 0.45, -16.6))
  }
  // Tier A（z −13..−10 实体 + −10..−7.5 回廊顶板）：社团室/图书角
  g.add(bx('brick', 35, TIER_A - 0.45, 3, 0, 0.45, -11.5))
  g.add(bx('concMid', 35, 0.34, 5.5, 0, TIER_A - 0.34, -10.25))
  for (const s of [-1, 1] as const) {
    g.add(bx('glassWarm', 9.0, 2.9, 0.18, s * 13.0, 0.55, -7.56))
    for (let m = 0; m < 7; m++) g.add(bx('alu', 0.09, 3.0, 0.09, s * 8.9 + s * m * 1.42, 0.5, -7.48))
    g.add(bx('concMid', 9.2, 0.32, 0.46, s * 13.0, TIER_A - 0.32, -7.62))
    g.add(bx('lamp', 8.6, 0.06, 0.12, s * 13.0, TIER_A - 0.44, -7.7))
    for (let i = 0; i < 3; i++) g.add(bx('timberDk', 2.6, 2.2, 0.4, s * (9.6 + i * 3.1), 0.45, -9.6))
    for (let i = 0; i < 3; i++) g.add(bx('lamp', 2.4, 0.05, 0.06, s * (9.6 + i * 3.1), 2.8, -9.4))
  }
  for (const s of [-1, 1] as const) parapet(g, { axis: 'z', at: s * 18, dir: s, from: -13, to: -7.5, y: TIER_A, h: 0.42 })
  // 两间阶梯教室（Tier B 二层）
  for (const s of [-1, 1] as const) rakedHall(g, s * 10.6)
  g.add(bx('concDk', 35, 0.2, 4.5, 0, TIER_B - 0.2, -15.25))
}

/** 阶梯教室：4 级升起 + 9 座/级 + 讲台 + 讲桌 + 黑板 + 灯带 */
function rakedHall(g: THREE.Group, cx: number): void {
  const W = 9.6
  for (let i = 0; i < 4; i++) {
    const y = L2 + 0.15 + i * 0.42
    const z = -13.9 - i * 0.9
    g.add(bx('concMid', W, 0.42, 0.9, cx, y, z - 0.45))
    for (let s = 0; s < 9; s++) {
      const x = cx - W / 2 + 0.7 + s * ((W - 1.4) / 8)
      g.add(bx('timberDk', 0.48, 0.06, 0.44, x, y + 0.72, z - 0.45))
      g.add(bx('timberDk', 0.48, 0.46, 0.06, x, y + 0.78, z - 0.7))
      g.add(bx('steelDk', 0.06, 0.3, 0.06, x - 0.19, y + 0.42, z - 0.45))
      g.add(bx('steelDk', 0.06, 0.3, 0.06, x + 0.19, y + 0.42, z - 0.45))
    }
  }
  g.add(bx('concMid', W - 1.4, 0.18, 1.4, cx, L2, -13.5))
  g.add(bx('timber', 1.15, 0.98, 0.52, cx + 1.6, L2 + 0.18, -13.4))
  g.add(bx('black', 3.6, 1.55, 0.09, cx - 2.0, L2 + 0.6, -13.25))
  g.add(bx('white', 3.4, 0.06, 0.05, cx - 2.0, L2 + 2.2, -13.24))
  g.add(bx('lamp', 3.2, 0.06, 0.1, cx, L2 + 3.3, -14.6))
  g.add(bx('lamp', 3.2, 0.06, 0.1, cx, L2 + 3.3, -16.2))
}

/* ══════════ 中庭回廊（环通柱廊 + 梁 + 灯带） ══════════ */
function arcade(g: THREE.Group, rng: Rng): void {
  const sides: Array<{ axis: 'x' | 'z'; at: number; from: number; to: number }> = [
    { axis: 'z', at: -CW, from: -9.6, to: 9.6 },
    { axis: 'z', at: CW, from: -9.6, to: 9.6 },
    { axis: 'x', at: 10, from: -ENV, to: -GATE_X },
    { axis: 'x', at: 10, from: GATE_X, to: ENV },
    { axis: 'x', at: -CW, from: -ENV, to: -STAIR_X },
    { axis: 'x', at: -CW, from: STAIR_X, to: ENV },
  ]
  for (const s of sides) {
    const n = Math.max(2, Math.round((s.to - s.from) / 2.5))
    for (let i = 0; i <= n; i++) {
      const c = s.from + (s.to - s.from) * (i / n)
      if (s.axis === 'z') {
        g.add(bx('brick', 0.5, F1 - 0.45, 0.5, s.at, 0.45, c))
        g.add(bx('conc', 0.68, 0.22, 0.68, s.at, F1 - 0.22, c))
        g.add(bx('brickDk', 0.56, 0.13, 0.56, s.at, 0.45, c))
      } else {
        g.add(bx('brick', 0.5, F1 - 0.45, 0.5, c, 0.45, s.at))
        g.add(bx('conc', 0.68, 0.22, 0.68, c, F1 - 0.22, s.at))
        g.add(bx('brickDk', 0.56, 0.13, 0.56, c, 0.45, s.at))
      }
    }
    const len = s.to - s.from, mid = (s.from + s.to) / 2
    if (s.axis === 'z') {
      g.add(bx('concMid', 0.36, 0.58, len, s.at, F1 - 0.58, mid))
      for (let i = 0; i < 9; i++) g.add(bx('concMid', 2.4, 0.32, 0.22, s.at - 1.25, F1 - 0.32, s.from + 1.0 + i * ((len - 2.0) / 8)))
    } else {
      g.add(bx('concMid', len, 0.58, 0.36, mid, F1 - 0.58, s.at))
      for (let i = 0; i < 9; i++) g.add(bx('concMid', 0.22, 0.32, 2.4, s.from + 1.0 + i * ((len - 2.0) / 8), F1 - 0.32, s.at + 1.25))
    }
  }
  // 回廊地坪（台基顶上的细铺装）+ 一步台阶落院
  paving(g, -WIN_IN, -CW, -10, 10, 0.45, 0.85, rng, 'paveWarm')
  paving(g, CW, WIN_IN, -10, 10, 0.45, 0.85, rng, 'paveWarm')
  paving(g, -ENV, -GATE_X, 10, 12.5, 0.45, 0.85, rng, 'paveWarm')
  paving(g, GATE_X, ENV, 10, 12.5, 0.45, 0.85, rng, 'paveWarm')
  paving(g, -GATE_X, GATE_X, 10, ENV, 0.45, 0.85, rng, 'paveWarm')
  paving(g, -ENV, -STAIR_X, -10, -CW, 0.45, 0.85, rng, 'paveWarm')
  paving(g, STAIR_X, ENV, -10, -CW, 0.45, 0.85, rng, 'paveWarm')
  for (const s of [-1, 1] as const) {
    g.add(bx('conc', 2.5, 0.2, 20, s * 8.75, 0.25, 0))
    g.add(bx('conc', 20, 0.2, 2.5, 0, 0.25, s === -1 ? -8.75 : 11.25))
  }
  // 檐下灯带
  for (const s of [-1, 1] as const) for (let i = 0; i < 8; i++) g.add(bx('lamp', 0.28, 0.06, 1.6, s * 8.75, F1 - 0.64, -8.6 + i * 2.45))
  for (let i = 0; i < 4; i++) {
    g.add(bx('lamp', 1.6, 0.06, 0.28, -15.6 + i * 2.6, F1 - 0.64, 11.25))
    g.add(bx('lamp', 1.6, 0.06, 0.28, 9.0 + i * 2.6, F1 - 0.64, 11.25))
    g.add(bx('lamp', 1.6, 0.06, 0.28, -15.6 + i * 2.0, F1 - 0.64, -8.75))
    g.add(bx('lamp', 1.6, 0.06, 0.28, 10.6 + i * 2.0, F1 - 0.64, -8.75))
  }
}

/* ══════════ 台阶讲坛（母题「阶」：自院拾级上屋顶读书台，兼露天看台） ══════════ */
function grandStair(g: THREE.Group): void {
  const N = 9, RISE = TIER_A / N, TREAD = (STAIR_Z0 - STAIR_Z1) / N
  for (let i = 0; i < N; i++) {
    const y = i * RISE
    const zc = STAIR_Z0 - TREAD * (i + 0.5)
    g.add(bx('concMid', STAIR_X * 2, RISE, TREAD, 0, y, zc))
    g.add(bx('paveWarm', STAIR_X * 2 - 0.2, 0.07, TREAD - 0.06, 0, y + RISE, zc))
    g.add(bx('concDk', 0.07, RISE + 0.07, TREAD, -STAIR_X + 0.07, y, zc))
    g.add(bx('concDk', 0.07, RISE + 0.07, TREAD, STAIR_X - 0.07, y, zc))
    if (i % 2 === 1) g.add(bx('timber', STAIR_X * 2 - 0.6, 0.06, 0.26, 0, y + RISE + 0.07, zc - TREAD * 0.28))
  }
  for (const s of [-1, 1] as const) {
    for (let i = 0; i < N; i++) g.add(bx('brick', 0.42, TIER_A - i * RISE, TREAD, s * (STAIR_X + 0.21), i * RISE, STAIR_Z0 - TREAD * (i + 0.5)))
    g.add(bx('conc', 0.58, 0.13, STAIR_Z0 - STAIR_Z1 + 0.3, s * (STAIR_X + 0.21), TIER_A, (STAIR_Z0 + STAIR_Z1) / 2))
    for (let i = 0; i < N; i++) g.add(bx('steelDk', 0.05, 0.92, 0.05, s * (STAIR_X + 0.21), i * RISE + RISE, STAIR_Z0 - TREAD * (i + 0.5)))
    g.add(cyc('steelDk', 0.035, 0.035, 5.9, 6, s * (STAIR_X + 0.21), TIER_A / 2 + 0.9, (STAIR_Z0 + STAIR_Z1) / 2, -Math.atan2(STAIR_Z0 - STAIR_Z1, TIER_A), 0, 0))
  }
  // 讲坛（台阶起步处的讲台，朝北面对中庭）
  g.add(bx('conc', 3.4, 0.34, 1.6, 0, 0.16, STAIR_Z0 + 1.0))
  g.add(bx('brickDk', 2.8, 0.52, 1.1, 0, 0.5, STAIR_Z0 + 1.05))
  g.add(bx('timber', 0.74, 1.08, 0.52, 0, 1.02, STAIR_Z0 + 1.0, 0.07))
  g.add(bx('bronze', 0.52, 0.32, 0.05, 0, 1.62, STAIR_Z0 + 0.74))
  g.add(bx('lamp', 0.4, 0.05, 0.3, 0, 2.12, STAIR_Z0 + 1.0))
}

/* ══════════ 中庭（大悬铃木 + 花坛 + 旗杆 + 铺装 + 灯） ══════════ */
function courtyard(g: THREE.Group, rng: Rng): void {
  paving(g, -CW, CW, STAIR_Z0, 10, 0.15, 0.62, rng)
  paving(g, -1.7, 1.7, STAIR_Z0, 9.9, 0.18, 0.62, rng, 'paveWarm')
  paving(g, -CW, CW, STAIR_Z1, STAIR_Z0, 0.15, 0.7, rng)
  // 大悬铃木（偏置轴线西侧，母题「荫」）
  const tx = -2.8, tz = 3.4
  g.add(bx('brickDk', 3.4, 0.5, 3.4, tx, 0.15, tz))
  g.add(bx('grassDk', 3.0, 0.16, 3.0, tx, 0.65, tz))
  planeTree(g, tx, tz, 0.81, 1.22, rng, 20, 3)
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2
    if (Math.abs(Math.cos(a)) < 0.22) continue
    g.add(bx('timber', 0.94, 0.09, 0.44, tx + Math.cos(a) * 2.2, 0.6, tz + Math.sin(a) * 2.2, -a))
    g.add(bx('concDk', 0.82, 0.45, 0.38, tx + Math.cos(a) * 2.2, 0.15, tz + Math.sin(a) * 2.2, -a))
  }
  flowerBed(g, 5.2, 6.4, 0.15, 2.7, 2.7, rng, 120)
  flowerBed(g, 5.2, 1.4, 0.15, 2.7, 2.7, rng, 120)
  flowerBed(g, -5.4, -1.4, 0.15, 2.7, 2.7, rng, 120)
  // 双旗杆（仪典轴东侧）
  for (const fz of [8.4, 5.9]) {
    g.add(bx('concDk', 0.72, 0.34, 0.72, 3.4, 0.15, fz))
    g.add(cy('alu', 0.055, 0.09, 11.4, 10, 3.4, 0.49, fz))
    g.add(ico('alu', 0.1, 1, 3.4, 12.0, fz))
    flag(g, 3.4, 11.3, fz, fz === 8.4 ? 'flagA' : 'flagB', rng)
  }
  for (const [lx, lz] of [[-6.6, 8.6], [6.6, 8.6], [-6.6, 3.0], [6.6, 3.0], [-6.6, -2.2], [6.6, -2.2], [-4.2, -2.4], [4.2, -2.4]] as const) {
    courtLamp(g, lx, lz)
  }
  bench(g, 1.8, 7.4, Math.PI)
  bench(g, 1.8, 3.6, Math.PI)
  bench(g, 6.6, -1.4, -Math.PI / 2)
  bench(g, -6.6, 8.2, Math.PI / 2)
  // 饮水台 / 公告栏 / 垃圾箱
  g.add(bx('conc', 1.15, 0.95, 0.55, -6.8, 0.15, 0.6))
  g.add(bx('steel', 0.52, 0.14, 0.36, -6.8, 1.1, 0.6))
  g.add(cy('alu', 0.03, 0.03, 0.36, 6, -6.65, 1.24, 0.6))
  g.add(bx('timberDk', 0.18, 1.6, 3.0, 6.85, 0.55, 8.6))
  g.add(bx('white', 0.06, 1.3, 2.7, 6.72, 0.7, 8.6))
  g.add(bx('glass', 0.05, 1.36, 2.76, 6.64, 0.67, 8.6))
  g.add(bx('lamp', 0.07, 0.09, 2.6, 6.58, 2.2, 8.6))
  for (const [wx, wz] of [[-6.9, -6.6], [6.9, 9.0]] as const) {
    g.add(bx('steelDk', 0.5, 0.74, 0.5, wx, 0.15, wz))
    g.add(bx('steel', 0.56, 0.06, 0.56, wx, 0.89, wz))
  }
}

/* ══════════ 屋顶（读书亭 / 太阳能 / 屋顶读书台 / 设备 / 屋面绿化） ══════════ */
function roofscape(g: THREE.Group, rng: Rng): void {
  for (const s of [-1, 1] as const) {
    paving(g, s === -1 ? -ENV : CW, s === -1 ? -CW : ENV, -9.6, 9.6, WING_ROOF, 1.05, rng, 'paveDk')
    pergola(g, s * 14.2, -3.0, WING_ROOF, 5.2, 6.0, rng)
    for (const pz of [-8.2, 6.2]) {
      g.add(bx('brickDk', 2.4, 0.5, 2.4, s * 12.4, WING_ROOF, pz))
      g.add(bx('grassDk', 2.1, 0.14, 2.1, s * 12.4, WING_ROOF + 0.5, pz))
      for (let i = 0; i < 5; i++) shrub(g, s * 12.4 + (rng() - 0.5) * 1.8, pz + (rng() - 0.5) * 1.8, WING_ROOF + 0.64, 0.3 + rng() * 0.16, rng)
    }
    planeTree(g, s * 11.0, 3.4, WING_ROOF + 0.2, 0.62, rng, 9, 2)
    g.add(bx('brickDk', 2.2, 0.5, 2.2, s * 11.0, WING_ROOF, 3.4))
    bench(g, s * 16.2, -5.6, s === -1 ? Math.PI / 2 : -Math.PI / 2)
    bench(g, s * 16.2, 2.4, s === -1 ? Math.PI / 2 : -Math.PI / 2)
    // 楼梯间出屋面 + 通风帽 + 碎石带
    g.add(bx('brick', 3.0, 2.4, 3.0, s * 12.6, WING_ROOF, -8.2))
    g.add(bx('conc', 3.3, 0.18, 3.3, s * 12.6, WING_ROOF + 2.4, -8.2))
    g.add(bx('steelDk', 2.4, 0.5, 0.1, s * 12.6, WING_ROOF + 2.58, -8.2))
    g.add(bx('timberDk', 0.95, 2.05, 0.12, s * 12.6, WING_ROOF + 0.2, -6.76))
    for (const pz of [3.2, 7.6]) {
      g.add(cy('steel', 0.3, 0.36, 1.0, 12, s * 15.8, WING_ROOF, pz))
      g.add(cyc('steel', 0.46, 0.46, 0.1, 12, s * 15.8, WING_ROOF + 1.08, pz))
    }
    g.add(bx('gravel', 2.0, 0.1, 18.0, s * 9.2, WING_ROOF, 0))
    for (let i = 0; i < 60; i++) g.add(ico('concDk', 0.06 + rng() * 0.05, 0, s * 9.2 + (rng() - 0.5) * 1.8, WING_ROOF + 0.12, -8.6 + rng() * 17.6, 0.7))
    railing(g, { axis: 'x', at: -9.85, from: s * ENV, to: s * CW, y: WING_ROOF, h: 1.05, step: 0.12 })
    railing(g, { axis: 'x', at: 9.85, from: s * ENV, to: s * CW, y: WING_ROOF, h: 1.05, step: 0.12 })
  }
  // 北翼屋面（11.7m）：室外课间平台 + 自东西翼屋面（15.3m）下来的直跑梯 + 绿化
  for (const s of [-1, 1] as const) {
    paving(g, s === -1 ? -17.4 : 10.6, s === -1 ? -10.6 : 17.4, 10.6, 17.2, NORTH_ROOF, 1.0, rng, 'paveDk')
    for (let i = 0; i < 10; i++) g.add(bx('concMid', 2.2, 0.36, 0.42, s * 9.1, NORTH_ROOF + 0.36 * (9 - i), 10.6 + i * 0.42))
    for (let i = 0; i < 10; i++) g.add(bx('concDk', 0.14, 0.5 + 0.36 * (9 - i), 0.42, s * 9.1 - 1.14, NORTH_ROOF, 10.6 + i * 0.42))
    for (let i = 0; i < 10; i++) g.add(bx('concDk', 0.14, 0.5 + 0.36 * (9 - i), 0.42, s * 9.1 + 1.14, NORTH_ROOF, 10.6 + i * 0.42))
    g.add(bx('grassDk', 2.8, 0.13, 6.4, s * 16.0, NORTH_ROOF, 14.0))
    for (let i = 0; i < 9; i++) shrub(g, s * (14.8 + rng() * 2.4), 11.2 + rng() * 5.6, NORTH_ROOF + 0.13, 0.28 + rng() * 0.18, rng)
    bench(g, s * 13.2, 15.8, s === -1 ? Math.PI / 2 : -Math.PI / 2)
    bench(g, s * 13.2, 12.0, s === -1 ? Math.PI / 2 : -Math.PI / 2)
    railing(g, { axis: 'z', at: s * 10.25, from: 10.8, to: 17.0, y: NORTH_ROOF, h: 1.05, step: 0.14 })
  }
  // Tier A 屋顶读书台（3.8m）：木铺装 + 凉棚 ×2 + 读书桌 + 花池 + 栏杆
  paving(g, -ENV, ENV, -13, -7.7, TIER_A, 0.95, rng, 'paveWarm')
  pergola(g, -14.2, -10.4, TIER_A, 5.8, 3.6, rng)
  pergola(g, 14.2, -10.4, TIER_A, 5.8, 3.6, rng)
  for (const dx of [-6.2, 6.2]) {
    g.add(bx('timber', 3.2, 0.09, 1.15, dx, TIER_A + 0.72, -10.2))
    for (const s of [-1, 1] as const) g.add(bx('steelDk', 0.09, 0.72, 0.09, dx + s * 1.4, TIER_A, -10.2))
    bench(g, dx, -11.6, 0)
    bench(g, dx, -8.9, Math.PI)
  }
  for (const px of [-10.6, -3.2, 3.2, 10.6]) {
    g.add(bx('brickDk', 2.1, 0.5, 1.15, px, TIER_A, -8.1))
    g.add(bx('grassDk', 1.9, 0.12, 0.95, px, TIER_A + 0.5, -8.1))
    for (let i = 0; i < 4; i++) shrub(g, px + (rng() - 0.5) * 1.6, -8.1 + (rng() - 0.5) * 0.6, TIER_A + 0.62, 0.24 + rng() * 0.12, rng)
  }
  railing(g, { axis: 'x', at: -7.62, from: -ENV, to: -STAIR_X - 0.5, y: TIER_A, h: 1.05, step: 0.11 })
  railing(g, { axis: 'x', at: -7.62, from: STAIR_X + 0.5, to: ENV, y: TIER_A, h: 1.05, step: 0.11 })
  for (const s of [-1, 1] as const) railing(g, { axis: 'z', at: s * 17.3, from: -13, to: -7.7, y: TIER_A, h: 1.05, step: 0.11 })
  // Tier B 屋顶（8.1m）：太阳能板阵 24 块 + 绿化退台 + 通风帽 + 碎石带
  g.add(bx('grassDk', 34.0, 0.13, 1.4, 0, TIER_B, -16.9))
  for (let i = 0; i < 16; i++) shrub(g, -16.4 + i * 2.18, -16.9 + (rng() - 0.5) * 0.6, TIER_B + 0.13, 0.3 + rng() * 0.2, rng)
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < 12; i++) {
      const x = -16.2 + i * 2.94, z = -15.8 + r * 2.2
      g.add(bx('steelDk', 0.1, 0.5, 0.1, x - 1.1, TIER_B, z))
      g.add(bx('steelDk', 0.1, 0.5, 0.1, x + 1.1, TIER_B, z))
      const p = new THREE.Group()
      p.position.set(x, TIER_B + 0.52, z)
      p.rotation.x = -0.44
      p.add(bx('solar', 2.62, 0.07, 1.5, 0, 0, 0))
      p.add(bx('alu', 2.66, 0.05, 0.07, 0, -0.04, 0.75))
      p.add(bx('alu', 2.66, 0.05, 0.07, 0, -0.04, -0.75))
      for (let k = 0; k < 5; k++) p.add(bx('alu', 0.03, 0.035, 1.5, -1.05 + k * 0.525, -0.06, 0))
      g.add(p)
    }
  }
  for (const px of [-13.0, -4.2, 4.2, 13.0]) {
    g.add(cy('steel', 0.34, 0.42, 1.2, 12, px, TIER_B, -13.6))
    g.add(cyc('steel', 0.5, 0.5, 0.1, 12, px, TIER_B + 1.28, -13.6))
  }
  railing(g, { axis: 'x', at: -17.3, from: -ENV, to: ENV, y: TIER_B + 0.85, h: 0.7, step: 0.26, rail2: false })
  for (const s of [-1, 1] as const) railing(g, { axis: 'z', at: s * 17.3, from: -17.4, to: -13, y: TIER_B + 0.85, h: 0.7, step: 0.26, rail2: false })
}

/* ══════════ 沿街场地（2m 环带：校门 / 围界 / 林荫 / 车棚） ══════════ */
function streetFront(g: THREE.Group, rng: Rng): void {
  // 北门：砖门柱 ×2 + 铜牌 + 门灯 + 两侧矮墙
  for (const s of [-1, 1] as const) {
    g.add(bx('brickDk', 0.95, 3.7, 0.95, s * 6.4, 0.13, 19.0))
    g.add(bx('conc', 1.16, 0.16, 1.16, s * 6.4, 3.83, 19.0))
    g.add(bx('brickLt', 0.7, 0.5, 0.7, s * 6.4, 3.99, 19.0))
    g.add(cy('steelDk', 0.03, 0.03, 0.18, 6, s * 6.4, 4.49, 19.0))
    g.add(ico('lamp', 0.17, 1, s * 6.4, 4.76, 19.0))
    g.add(bx('bronze', 0.06, 1.5, 0.62, s * 6.4 - s * 0.5, 1.35, 19.0))
    g.add(bx('lamp', 0.05, 0.1, 0.52, s * 6.4 - s * 0.54, 2.92, 19.0))
    g.add(bx('brickDk', 6.0, 1.1, 0.4, s * 9.9, 0.13, 19.0))
    g.add(bx('conc', 6.1, 0.1, 0.52, s * 9.9, 1.23, 19.0))
  }
  // 校门双扇（竖木格栅，通透可见院内轴线）
  for (const s of [-1, 1] as const) {
    const leaf = new THREE.Group()
    leaf.position.set(0, 0, 19.2)
    leaf.add(bx('steelDk', 5.5, 0.14, 0.14, s * 2.85, 0.16, 0))
    leaf.add(bx('steelDk', 5.5, 0.14, 0.14, s * 2.85, 1.72, 0))
    leaf.add(bx('steelDk', 0.14, 1.7, 0.14, s * 5.55, 0.16, 0))
    leaf.add(bx('steelDk', 0.14, 1.7, 0.14, s * 0.15, 0.16, 0))
    for (let i = 0; i < 28; i++) leaf.add(bx('timber', 0.075, 1.42, 0.055, s * (0.35 + i * 0.19), 0.3, 0))
    for (let i = 0; i < 4; i++) leaf.add(bx('steelDk', 0.05, 1.7, 0.05, s * (0.7 + i * 1.35), 0.16, 0))
    leaf.add(bx('bronze', 0.56, 0.36, 0.07, s * 0.62, 0.95, 0.07))
    leaf.userData.site = true
    g.add(leaf)
  }
  // 门柱脚灯 + 门内两侧地灯（夜里把门洞与校名匾打亮）
  for (const s of [-1, 1] as const) {
    g.add(bx('lamp', 0.16, 0.5, 0.16, s * 6.4, 0.13, 18.4))
    g.add(bx('lamp', 0.14, 0.34, 0.14, s * 4.6, 0.14, 18.6))
  }
  // 围界：绿篱（北留大门）+ 木格栅栏（南留操场口）
  hedgeRun(g, { axis: 'x', at: 19.6, from: -20, to: -12.9, rng })
  hedgeRun(g, { axis: 'x', at: 19.6, from: 12.9, to: 20, rng })
  hedgeRun(g, { axis: 'z', at: -19.6, from: 12.9, to: 19.4, rng })
  hedgeRun(g, { axis: 'z', at: 19.6, from: 12.9, to: 19.4, rng })
  fenceRun(g, { axis: 'z', at: -19.6, from: -18.6, to: 18.6 })
  fenceRun(g, { axis: 'z', at: 19.6, from: -18.6, to: 18.6 })
  fenceRun(g, { axis: 'x', at: -19.6, from: -19.4, to: -2.6 })
  fenceRun(g, { axis: 'x', at: -19.6, from: 2.6, to: 19.4 })
  for (const s of [-1, 1] as const) {
    g.add(bx('brickDk', 0.72, 2.6, 0.72, s * 2.4, 0.13, -19.6))
    g.add(bx('conc', 0.88, 0.14, 0.88, s * 2.4, 2.73, -19.6))
    g.add(ico('lamp', 0.13, 1, s * 2.4, 2.96, -19.6))
  }
  // 西林荫步道：窄冠悬铃木 + 路灯 + 宣传栏
  for (let i = 0; i < 6; i++) {
    const z = -15 + i * 6
    g.add(bx('concDk', 1.05, 0.3, 1.05, -19.1, 0.13, z))
    g.add(bx('grassDk', 0.85, 0.1, 0.85, -19.1, 0.43, z))
    columnarTree(g, -19.1, z, 0.53, 0.92, rng)
  }
  for (let i = 0; i < 4; i++) streetLamp(g, -18.95, -12 + i * 8, 1)
  g.add(bx('timberDk', 0.16, 2.05, 3.0, -19.05, 0.13, 5.0))
  g.add(bx('white', 0.06, 1.5, 2.6, -18.94, 0.5, 5.0))
  g.add(bx('glass', 0.05, 1.6, 2.7, -18.86, 0.45, 5.0))
  g.add(bx('lamp', 0.07, 0.09, 2.5, -18.8, 2.12, 5.0))
  // 东消防通道：路灯 + 消火栓 + 井盖 + 预留连廊接口（接二期书山馆）
  for (let i = 0; i < 6; i++) {
    const z = -15 + i * 6
    g.add(bx('concDk', 1.05, 0.3, 1.05, 19.1, 0.13, z))
    g.add(bx('grassDk', 0.85, 0.1, 0.85, 19.1, 0.43, z))
    columnarTree(g, 19.1, z, 0.53, 0.92, rng)
  }
  for (let i = 0; i < 4; i++) streetLamp(g, 18.95, -12 + i * 8, -1)
  for (const z of [-14.0, 4.0]) {
    g.add(bx('red', 0.34, 0.62, 0.34, 19.05, 0.13, z))
    g.add(cy('red', 0.1, 0.13, 0.2, 8, 19.05, 0.75, z))
    g.add(cyc('red', 0.07, 0.07, 0.32, 8, 19.05, 0.5, z, 0, 0, Math.PI / 2))
  }
  for (const z of [-9.0, 0.0, 9.0]) g.add(cyc('concDk', 0.32, 0.32, 0.06, 14, 19.1, 0.15, z, Math.PI / 2, 0, 0))
  g.add(bx('concMid', 1.7, 0.3, 3.2, 18.1, L2 - 0.3, 0))
  g.add(bx('steel', 0.08, 2.6, 3.0, 18.85, L2, 0))
  railing(g, { axis: 'z', at: 18.35, from: -1.5, to: 1.5, y: L2, h: 1.05, step: 0.14 })
  g.add(bx('bronze', 0.05, 0.5, 0.9, 18.9, L2 + 1.2, 0))
  // 南后院：自行车棚 + 24 辆车 + 树阵 + 垃圾收集点
  bikeShed(g, rng)
  for (let i = 0; i < 4; i++) {
    g.add(bx('concDk', 1.1, 0.3, 1.1, 8.6 + i * 2.6, 0.13, -19.05))
    g.add(bx('grassDk', 0.9, 0.1, 0.9, 8.6 + i * 2.6, 0.43, -19.05))
    columnarTree(g, 8.6 + i * 2.6, -19.05, 0.53, 0.9, rng)
  }
  g.add(bx('steelDk', 2.4, 1.1, 1.2, 17.0, 0.13, -19.2))
  for (let i = 0; i < 4; i++) g.add(bx('steel', 0.5, 0.06, 1.14, 16.1 + i * 0.6, 1.23, -19.2))
  // 北门广场：家长等候长椅 + 花坛 + 路灯 + 隔离墩
  bench(g, -15.4, 19.0, Math.PI)
  bench(g, -11.6, 19.0, Math.PI)
  bench(g, 11.6, 19.0, Math.PI)
  bench(g, 15.4, 19.0, Math.PI)
  flowerBed(g, -9.4, 19.0, 0.13, 2.2, 1.4, rng, 64)
  flowerBed(g, 9.4, 19.0, 0.13, 2.2, 1.4, rng, 64)
  streetLamp(g, -8.2, 19.3, 1)
  streetLamp(g, 8.2, 19.3, -1)
  for (let i = 0; i < 7; i++) g.add(bx('concMid', 0.28, 0.75, 0.28, -18.4 + i * 0.9, 0.13, 18.45))
  for (let i = 0; i < 7; i++) g.add(bx('concMid', 0.28, 0.75, 0.28, 12.4 + i * 0.9, 0.13, 18.45))
}

/** 自行车棚（钢构 + 阳光板单坡顶 + 停车架 + 24 辆车） */
function bikeShed(g: THREE.Group, rng: Rng): void {
  const X0 = -16.6, Z = -18.72, LEN = 14.4
  for (let i = 0; i <= 6; i++) {
    const x = X0 + (LEN / 6) * i
    g.add(cy('steelDk', 0.07, 0.08, 2.35, 8, x, 0.13, Z - 0.85))
    g.add(cy('steelDk', 0.07, 0.08, 2.05, 8, x, 0.13, Z + 0.85))
    g.add(cyc('steelDk', 0.06, 0.06, 1.95, 6, x, 2.55, Z, Math.PI / 2, 0, 0))
  }
  for (let i = 0; i < 12; i++) {
    const p = new THREE.Group()
    p.position.set(X0 + 0.6 + i * 1.2, 2.62, Z)
    p.rotation.x = 0.16
    p.add(bx('glass', 1.16, 0.05, 2.0, 0, 0, 0))
    p.add(bx('alu', 1.2, 0.07, 0.06, 0, -0.03, 0.98))
    g.add(p)
  }
  g.add(bx('steelDk', LEN + 0.3, 0.1, 0.1, X0 + LEN / 2, 2.42, Z - 0.85))
  g.add(bx('steelDk', LEN + 0.3, 0.1, 0.1, X0 + LEN / 2, 2.12, Z + 0.85))
  // 停车架 + 自行车 24 辆（前后交错停放）
  for (let i = 0; i < 24; i++) {
    const x = X0 + 0.6 + (i % 12) * 1.2
    const z = Z + (i < 12 ? -0.42 : 0.42)
    g.add(cyc('steel', 0.025, 0.025, 0.62, 6, x, 0.42, z, Math.PI / 2, 0, 0))
    bicycle(g, x, z, i < 12 ? 1 : -1, rng)
  }
  g.add(bx('concDk', LEN + 0.6, 0.14, 2.2, X0 + LEN / 2, 0.13, Z))
}

/** 自行车（torus 轮 + 辐条 + 车架 + 座 + 把） */
function bicycle(g: THREE.Group, x: number, z: number, dir: number, rng: Rng): void {
  const b = new THREE.Group()
  b.position.set(x, 0.27, z)
  b.rotation.y = dir > 0 ? 0 : Math.PI
  const R = 0.27
  for (const wz of [-0.52, 0.52]) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(R, 0.022, 6, 18), MAT['steelDk'])
    w.position.set(0, R, wz)
    w.rotation.y = Math.PI / 2
    w.castShadow = true
    b.add(w)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      b.add(cyc('alu', 0.006, 0.006, R * 1.9, 3, 0, R + Math.cos(a) * R * 0.95, wz + Math.sin(a) * R * 0.95, a, 0, 0))
    }
    b.add(cyc('steel', 0.03, 0.03, 0.06, 6, 0, R, wz, 0, 0, Math.PI / 2))
  }
  const liv = rng() < 0.34 ? 'red' : rng() < 0.5 ? 'blue' : 'steelDk'
  b.add(cyc(liv, 0.025, 0.025, 1.0, 6, 0, 0.52, 0, Math.PI / 2, 0, 0))
  b.add(cyc(liv, 0.025, 0.025, 0.62, 6, 0, 0.42, -0.24, 0.62, 0, 0))
  b.add(cyc(liv, 0.025, 0.025, 0.6, 6, 0, 0.44, 0.26, -0.5, 0, 0))
  b.add(cyc(liv, 0.022, 0.022, 0.52, 6, 0, 0.32, 0.02, Math.PI / 2, 0, 0.2))
  b.add(cyc('steelDk', 0.022, 0.022, 0.42, 6, 0, 0.62, -0.42, 0.28, 0, 0))
  b.add(bx('black', 0.1, 0.05, 0.28, 0, 0.82, -0.44))
  b.add(cyc('steelDk', 0.02, 0.02, 0.44, 6, 0, 0.78, 0.44, 0, 0, Math.PI / 2))
  b.add(bx('black', 0.05, 0.04, 0.16, 0.18, 0.76, 0.44))
  b.add(bx('black', 0.05, 0.04, 0.16, -0.18, 0.76, 0.44))
  b.add(cyc('alu', 0.09, 0.09, 0.05, 8, 0, 0.27, 0.02, 0, 0, Math.PI / 2))
  b.userData.site = true
  g.add(b)
}

/* ══════════ 夜间灯光（檐下灯带 / 立面投光 / 塔身退台灯 / 中庭地灯） ══════════ */
function nightLights(g: THREE.Group, land: THREE.Group): void {
  // 檐口灯带：东西翼外立面 + 北翼北立面
  for (const s of [-1, 1] as const) {
    for (let i = 0; i < 8; i++) g.add(bx('lamp', 0.12, 0.06, 2.2, s * (ENV + 0.2), WING_ROOF - 0.34, -8.8 + i * 2.5))
    for (let i = 0; i < 3; i++) g.add(bx('lamp', 2.0, 0.06, 0.12, s * (10.6 + i * 2.3), NORTH_ROOF - 0.34, ENV + 0.2))
  }
  // 南翼 Tier B 檐下灯带（对三期操场方向）
  for (let i = 0; i < 14; i++) g.add(bx('lamp', 2.3, 0.06, 0.12, -16.4 + i * 2.5, TIER_B - 0.3, -ENV - 0.2))
  // 塔身退台灯带（每级挑檐下，四面）
  for (let i = 0; i < 6; i++) {
    const y = GATE_PAR + 0.44 + i * 2.7 - 0.3
    const hw = 3.6 - i * 0.25, hd = (6.9 - i * 0.5) / 2, CZ = 14.05
    for (const s of [-1, 1] as const) {
      g.add(bx('lamp', hw * 2 - 0.3, 0.05, 0.07, 0, y, CZ + s * (hd + 0.4)))
      g.add(bx('lamp', 0.07, 0.05, hd * 2 - 0.3, s * (hw + 0.4), y, CZ))
    }
  }
  // 立面投光灯（贴地洗墙，环带内 → 景观件）
  for (const s of [-1, 1] as const) {
    for (let i = 0; i < 6; i++) land.add(bx('lamp', 0.24, 0.09, 0.3, s * 18.6, 0.24, -14 + i * 5.6))
  }
  for (let i = 0; i < 8; i++) land.add(bx('lamp', 0.3, 0.09, 0.24, -15.4 + i * 4.4, 0.24, 18.6))
  for (let i = 0; i < 8; i++) land.add(bx('lamp', 0.3, 0.09, 0.24, -15.4 + i * 4.4, 0.24, -18.6))
  // 中庭地面灯带（主轴两侧）
  for (let i = 0; i < 12; i++) {
    land.add(bx('lamp', 0.1, 0.05, 0.9, -2.1, 0.26, -2.4 + i * 1.05))
    land.add(bx('lamp', 0.1, 0.05, 0.9, 2.1, 0.26, -2.4 + i * 1.05))
  }
  // 台阶讲坛踏步灯（每级侧面）
  for (let i = 0; i < 9; i++) {
    const y = i * (TIER_A / 9)
    for (const s of [-1, 1] as const) g.add(bx('lamp', 0.06, 0.08, 0.4, s * (STAIR_X - 0.12), y + 0.2, STAIR_Z0 - 0.25 - i * 0.5))
  }
}

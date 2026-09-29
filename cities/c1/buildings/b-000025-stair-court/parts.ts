import * as THREE from 'three'
import type { Rng } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'

/* ─────────────────────────────────────────────────────────────────────────────
   b-000025「拾阶院」构件库 · F5 模都学府街区一期 · qwen3.8-max
   材质表（全楼共享，供 web/src/city/bake.ts 按材质规约合并）+ 几何助手 + 立面/景观构件
   ───────────────────────────────────────────────────────────────────────────── */

/* ══════════ 材质表 ══════════ */
type MO = {
  metalness?: number; roughness?: number; emissive?: string
  emissiveIntensity?: number; side?: THREE.Side
}
export const MAT: Record<string, THREE.MeshStandardMaterial> = {}
const reg = (k: string, color: string, o?: MO): void => { MAT[k] = stdMaterial(color, o) }

reg('brick', '#9E5B45', { roughness: 0.9, metalness: 0.04 })          // 清水红砖
reg('brickDk', '#85493A', { roughness: 0.93, metalness: 0.04 })       // 砖垛/线脚
reg('brickLt', '#B2705A', { roughness: 0.88, metalness: 0.04 })
reg('brickBase', '#7A463A', { roughness: 0.95, metalness: 0.04 })     // 基座粗砖
reg('conc', '#D6D2CA', { roughness: 0.82, metalness: 0.05 })          // 混凝土
reg('concMid', '#BAB5AC', { roughness: 0.85, metalness: 0.05 })
reg('concDk', '#8C8880', { roughness: 0.88, metalness: 0.05 })
reg('timber', '#B98A55', { roughness: 0.72, metalness: 0.03 })        // 木格栅
reg('timberDk', '#8B6740', { roughness: 0.8, metalness: 0.03 })
reg('glass', '#2B3D4F', { roughness: 0.16, metalness: 0.62, emissive: '#18242F', emissiveIntensity: 0.26 })
reg('glassLit', '#33414E', { roughness: 0.26, metalness: 0.4, emissive: '#FFCF93', emissiveIntensity: 0.32 })
reg('glassWarm', '#4A4237', { roughness: 0.3, metalness: 0.32, emissive: '#FFD9A0', emissiveIntensity: 0.4 })
reg('steel', '#6F7377', { roughness: 0.42, metalness: 0.78 })
reg('steelDk', '#3A3835', { roughness: 0.5, metalness: 0.7 })
reg('alu', '#8E9296', { roughness: 0.34, metalness: 0.86 })
reg('copper', '#8C6B3F', { roughness: 0.34, metalness: 0.88 })
reg('bronze', '#A8834A', { roughness: 0.38, metalness: 0.85, emissive: '#3A2A10', emissiveIntensity: 0.26 })
reg('white', '#EFEDE8', { roughness: 0.6, metalness: 0.05 })
reg('clockFace', '#FFF6E2', { roughness: 0.5, metalness: 0.1, emissive: '#FFE9BE', emissiveIntensity: 0.8 })
reg('lamp', '#FFE7BE', { roughness: 0.4, metalness: 0.1, emissive: '#FFD9A0', emissiveIntensity: 0.8 })
reg('leaf', '#6E8F5C', { roughness: 0.92, metalness: 0.02 })
reg('leafDk', '#4F6B3E', { roughness: 0.95, metalness: 0.02 })
reg('leafLt', '#8CA96E', { roughness: 0.9, metalness: 0.02 })
reg('bark', '#6B5A48', { roughness: 0.95, metalness: 0.02 })
reg('grass', '#77965F', { roughness: 0.95, metalness: 0.02 })
reg('grassDk', '#5F7C4C', { roughness: 0.96, metalness: 0.02 })
reg('pave', '#C8C4BC', { roughness: 0.85, metalness: 0.04 })
reg('paveDk', '#ADA9A1', { roughness: 0.88, metalness: 0.04 })
reg('paveWarm', '#C0A98F', { roughness: 0.86, metalness: 0.04 })
reg('red', '#BE443B', { roughness: 0.7, metalness: 0.05 })
reg('black', '#26251F', { roughness: 0.6, metalness: 0.2 })
reg('solar', '#2A3B55', { roughness: 0.22, metalness: 0.7 })
reg('flagA', '#C0453C', { roughness: 0.82, metalness: 0.02, side: THREE.DoubleSide })
reg('flagB', '#E8E6E1', { roughness: 0.82, metalness: 0.02, side: THREE.DoubleSide })
export const FLOWER = ['#C0453B', '#D9A03C', '#B8567E', '#E4E0D2', '#7E6BB0', '#D96A3C']
for (let i = 0; i < FLOWER.length; i++) reg(`fl${i}`, FLOWER[i], { roughness: 0.85, emissive: FLOWER[i], emissiveIntensity: 0.07 })

/* ══════════ 几何助手 ══════════ */
/** 盒体，y = 底面标高 */
export function bx(k: string, w: number, h: number, d: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MAT[k])
  m.position.set(x, y + h / 2, z)
  if (ry) m.rotation.y = ry
  m.castShadow = true
  return m
}
/** 竖圆柱，y = 底面标高 */
export function cy(k: string, rt: number, rb: number, h: number, seg: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), MAT[k])
  m.position.set(x, y + h / 2, z)
  m.castShadow = true
  return m
}
/** 圆柱，中心定位 + 任意旋转（斜撑/枝干/横杆） */
export function cyc(k: string, rt: number, rb: number, len: number, seg: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, len, seg), MAT[k])
  m.position.set(x, y, z)
  m.rotation.set(rx, ry, rz)
  m.castShadow = true
  return m
}
/** 二十面体团块（树冠/灌木），中心定位，sy 压扁 */
export function ico(k: string, r: number, det: number, x: number, y: number, z: number, sy = 1): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, det), MAT[k])
  m.position.set(x, y, z)
  m.scale.y = sy
  m.castShadow = true
  return m
}
/** 圆环（平放，xy 平面） */
export function tor(k: string, R: number, r: number, segR: number, segT: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.TorusGeometry(R, r, segR, segT), MAT[k])
  m.position.set(x, y, z)
  m.castShadow = true
  return m
}
/** 旋转体（铜钟） */
export function lathe(k: string, pts: Array<[number, number]>, seg: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg), MAT[k])
  m.position.set(x, y, z)
  m.castShadow = true
  return m
}

/* ══════════ 标高与轴线 ══════════ */
export const F1 = 4.5                    // 一层层高
export const FU = 3.6                    // 标准层层高
export const L2 = F1                     // 4.5
export const L3 = F1 + FU                // 8.1
export const L4 = F1 + 2 * FU            // 11.7
export const WING_ROOF = F1 + 3 * FU     // 15.3 东西翼屋面
export const WING_PAR = 16.5             // 东西翼女儿墙顶
export const NORTH_ROOF = L4             // 11.7 北翼两翼段屋面
export const GATE_ROOF = 8.1             // 中央门楼屋面
export const GATE_PAR = 9.0              // 门楼檐口顶（塔基转换）
export const TIER_A = 3.8                // 南翼低翼（屋顶读书台）
export const TIER_B = L3                 // 8.1 南翼高翼（阶梯教室）
export const CW = 7.5                    // 中庭半宽
export const GATE_X = 7                  // 中央门楼半宽
export const STAIR_X = 7.5               // 台阶讲坛半宽
export const STAIR_Z0 = -3.0             // 台阶讲坛北端（院侧起步）
export const STAIR_Z1 = -7.5             // 台阶讲坛南端（抵 Tier A 屋面）

/* ══════════ 立面构件 ══════════ */
export type RibbonOpt = {
  axis: 'x' | 'z'; at: number; dir: 1 | -1; from: number; to: number
  y0: number; h: number; bays: number; jamb?: number; mat?: string
  mull?: number; sill?: boolean; lintel?: boolean; lit?: number; rng?: Rng
}
/** 通长晨读长窗：玻璃 + 竖框阵 + 中横框 + 窗台 + 窗楣；lit = 夜间亮灯比例
 *  at = 墙体外表面，dir 指向室内。构件一律「微挑出墙面」（沿官方 makeWindowStrip 惯例，
 *  实心砖体内嵌的窗会被遮住看不见）：玻璃挑 0.02、竖框挑 0.085、窗台/窗楣挑 0.105——
 *  故调用方须把墙体外表面内收红线 0.5m（壁柱补到 ±18），窗件最远只到 ±17.61，稳守 R13。 */
export function ribbon(g: THREE.Group, o: RibbonOpt): void {
  const lo = Math.min(o.from, o.to), hi = Math.max(o.from, o.to)
  const bw = (hi - lo) / o.bays
  const jamb = o.jamb ?? 0.55
  const ww = Math.max(0.7, bw - jamb * 2)
  const gm = o.mat ?? 'glass'
  const n = o.mull ?? Math.max(2, Math.round(ww / 1.05))
  for (let i = 0; i < o.bays; i++) {
    const c = lo + bw * (i + 0.5)
    const k = o.rng && o.lit && o.rng() < o.lit ? 'glassLit' : gm
    if (o.axis === 'z') {
      g.add(bx(k, 0.16, o.h, ww, o.at + o.dir * 0.06, o.y0, c))
      for (let m = 0; m <= n; m++) g.add(bx('alu', 0.09, o.h + 0.08, 0.075, o.at - o.dir * 0.04, o.y0 - 0.04, c - ww / 2 + (ww * m) / n))
      g.add(bx('alu', 0.09, 0.075, ww, o.at - o.dir * 0.04, o.y0 + o.h / 2 - 0.04, c))
      if (o.sill !== false) g.add(bx('concMid', 0.45, 0.14, ww + 0.26, o.at + o.dir * 0.12, o.y0 - 0.14, c))
      if (o.lintel !== false) g.add(bx('concMid', 0.4, 0.28, ww + 0.22, o.at + o.dir * 0.1, o.y0 + o.h, c))
    } else {
      g.add(bx(k, ww, o.h, 0.16, c, o.y0, o.at + o.dir * 0.06))
      for (let m = 0; m <= n; m++) g.add(bx('alu', 0.075, o.h + 0.08, 0.09, c - ww / 2 + (ww * m) / n, o.y0 - 0.04, o.at - o.dir * 0.04))
      g.add(bx('alu', ww, 0.075, 0.09, c, o.y0 + o.h / 2 - 0.04, o.at - o.dir * 0.04))
      if (o.sill !== false) g.add(bx('concMid', ww + 0.26, 0.14, 0.45, c, o.y0 - 0.14, o.at + o.dir * 0.12))
      if (o.lintel !== false) g.add(bx('concMid', ww + 0.22, 0.28, 0.4, c, o.y0 + o.h, o.at + o.dir * 0.1))
    }
  }
}

/** 砖壁柱阵：at = 外表面，dir 指向室内 */
export function piers(g: THREE.Group, o: {
  axis: 'x' | 'z'; at: number; dir: 1 | -1; from: number; to: number
  y0: number; h: number; n: number; w?: number; d?: number; key?: string
}): void {
  const w = o.w ?? 0.85, d = o.d ?? 1.0
  const lo = Math.min(o.from, o.to), hi = Math.max(o.from, o.to)
  for (let i = 0; i <= o.n; i++) {
    const c = lo + (hi - lo) * (i / o.n)
    if (o.axis === 'z') g.add(bx(o.key ?? 'brick', d, o.h, w, o.at + o.dir * d / 2, o.y0, c))
    else g.add(bx(o.key ?? 'brick', w, o.h, d, c, o.y0, o.at + o.dir * d / 2))
  }
}

/** 挑砖线脚 */
export function corbels(g: THREE.Group, o: {
  axis: 'x' | 'z'; at: number; dir: 1 | -1; from: number; to: number
  y: number; step?: number; key?: string; h?: number
}): void {
  const s = o.step ?? 0.3, hh = o.h ?? 0.16
  const lo = Math.min(o.from, o.to), hi = Math.max(o.from, o.to)
  const n = Math.max(1, Math.floor((hi - lo) / s))
  for (let i = 0; i < n; i++) {
    const c = lo + s * (i + 0.5)
    if (o.axis === 'z') g.add(bx(o.key ?? 'brickDk', 0.17, hh, 0.18, o.at + o.dir * 0.08, o.y, c))
    else g.add(bx(o.key ?? 'brickDk', 0.18, hh, 0.17, c, o.y, o.at + o.dir * 0.08))
  }
}

/** 女儿墙 + 混凝土压顶。at = 压顶外表面（可直接取红线 ±18），dir = 向外法线；
 *  墙身与压顶同心，压顶两面各挑出 0.08——整件最外缘恰好落在 at，不越 R13。 */
export function parapet(g: THREE.Group, o: {
  axis: 'x' | 'z'; at: number; dir: 1 | -1; from: number; to: number; y: number; h?: number; t?: number; key?: string
}): void {
  const h = o.h ?? 1.15, t = o.t ?? 0.32, cap = t + 0.16
  const lo = Math.min(o.from, o.to), hi = Math.max(o.from, o.to)
  const len = hi - lo, mid = (lo + hi) / 2
  const c = o.at - o.dir * cap / 2
  if (o.axis === 'z') {
    g.add(bx(o.key ?? 'brick', t, h, len, c, o.y, mid))
    g.add(bx('conc', cap, 0.11, len + 0.06, c, o.y + h, mid))
  } else {
    g.add(bx(o.key ?? 'brick', len, h, t, mid, o.y, c))
    g.add(bx('conc', len + 0.06, 0.11, cap, mid, o.y + h, c))
  }
}

/** 竖向圆钢栏杆 */
export function railing(g: THREE.Group, o: {
  axis: 'x' | 'z'; at: number; from: number; to: number; y: number
  h?: number; step?: number; key?: string; rail2?: boolean
}): void {
  const h = o.h ?? 1.05, s = o.step ?? 0.135
  const lo = Math.min(o.from, o.to), hi = Math.max(o.from, o.to)
  const n = Math.max(2, Math.round((hi - lo) / s))
  for (let i = 0; i <= n; i++) {
    const c = lo + (hi - lo) * (i / n)
    if (o.axis === 'z') g.add(cy(o.key ?? 'steelDk', 0.017, 0.017, h - 0.12, 6, o.at, o.y, c))
    else g.add(cy(o.key ?? 'steelDk', 0.017, 0.017, h - 0.12, 6, c, o.y, o.at))
  }
  const len = hi - lo, mid = (lo + hi) / 2
  if (o.axis === 'z') {
    g.add(bx(o.key ?? 'steelDk', 0.055, 0.07, len, o.at, o.y + h - 0.07, mid))
    if (o.rail2 !== false) g.add(bx(o.key ?? 'steelDk', 0.035, 0.035, len, o.at, o.y + h * 0.46, mid))
  } else {
    g.add(bx(o.key ?? 'steelDk', len, 0.07, 0.055, mid, o.y + h - 0.07, o.at))
    if (o.rail2 !== false) g.add(bx(o.key ?? 'steelDk', len, 0.035, 0.035, mid, o.y + h * 0.46, o.at))
  }
}

/** 木格栅遮阳屏：竖条阵（微变量）+ 三道横撑 */
export function louvres(g: THREE.Group, o: {
  axis: 'x' | 'z'; at: number; from: number; to: number; y0: number; y1: number; rng: Rng
}): void {
  const n = Math.max(4, Math.floor((o.to - o.from) / 0.31))
  for (let i = 0; i < n; i++) {
    const c = o.from + (i + 0.5) * ((o.to - o.from) / n) + (o.rng() - 0.5) * 0.035
    const k = o.rng() < 0.22 ? 'timberDk' : 'timber'
    const tilt = (o.rng() - 0.5) * 0.1
    const hh = o.y1 - o.y0 - o.rng() * 0.05
    if (o.axis === 'z') g.add(bx(k, 0.11, hh, 0.075 + o.rng() * 0.02, o.at, o.y0, c, tilt))
    else g.add(bx(k, 0.075 + o.rng() * 0.02, hh, 0.11, c, o.y0, o.at, tilt))
  }
  const mid = (o.from + o.to) / 2, len = o.to - o.from
  for (const [yy, hh] of [[o.y0 - 0.05, 0.1], [o.y1 - 0.05, 0.1], [(o.y0 + o.y1) / 2, 0.09]] as const) {
    if (o.axis === 'z') g.add(bx('steelDk', 0.12, hh, len, o.at, yy, mid))
    else g.add(bx('steelDk', len, hh, 0.12, mid, yy, o.at))
  }
}

/* ══════════ 景观构件 ══════════ */
/** 悬铃木（法桐）：主干 + 分枝 + 多团压扁冠 */
export function planeTree(g: THREE.Group, x: number, z: number, y: number, scale: number, rng: Rng, blobs: number, det: number): void {
  const th = 3.5 * scale
  g.add(cy('bark', 0.12 * scale, 0.26 * scale, th, 10, x, y, z))
  const nb = Math.max(3, Math.round(3.5 * scale))
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + rng() * 0.7
    const el = 0.5 + rng() * 0.4
    const len = (1.4 + rng() * 1.0) * scale
    g.add(cyc('bark', 0.045 * scale, 0.09 * scale, len, 6,
      x + Math.cos(el) * Math.cos(a) * len * 0.5,
      y + th * 0.86 + Math.sin(el) * len * 0.5,
      z - Math.cos(el) * Math.sin(a) * len * 0.5,
      0, a, -(Math.PI / 2 - el)))
  }
  const top = y + th + 0.55 * scale
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * Math.PI * 2 + rng() * 0.9
    const rad = i === 0 ? 0 : (0.85 + rng() * 1.0) * scale
    const r = (1.0 + rng() * 0.55) * scale
    const k = i % 3 === 0 ? 'leafDk' : i % 3 === 1 ? 'leaf' : 'leafLt'
    g.add(ico(k, r, det, x + Math.cos(a) * rad, top + (rng() - 0.32) * 1.0 * scale, z + Math.sin(a) * rad, 0.72 + rng() * 0.24))
  }
}

/** 窄冠柱状乔木（2m 环带专用：冠幅收在 1m 内） */
export function columnarTree(g: THREE.Group, x: number, z: number, y: number, scale: number, rng: Rng): void {
  g.add(cy('bark', 0.07 * scale, 0.13 * scale, 2.6 * scale, 8, x, y, z))
  for (let i = 0; i < 5; i++) {
    const t = i / 4
    const r = (0.4 + Math.sin(t * Math.PI) * 0.4) * scale
    g.add(ico(i % 2 ? 'leaf' : 'leafDk', r, 2, x + (rng() - 0.5) * 0.1, y + (1.9 + t * 3.3) * scale, z + (rng() - 0.5) * 0.1, 1.25))
  }
}

/** 灌木 */
export function shrub(g: THREE.Group, x: number, z: number, y: number, r: number, rng: Rng, det = 1): void {
  g.add(ico(rng() < 0.4 ? 'leafDk' : 'leaf', r, det, x, y + r * 0.72, z, 0.78 + rng() * 0.2))
  g.add(ico(rng() < 0.5 ? 'leafLt' : 'leaf', r * 0.62, det, x + (rng() - 0.5) * r, y + r * 0.95, z + (rng() - 0.5) * r, 0.8))
}

/** 铺装分格板阵（顶 ≤0.6m 地被层） */
export function paving(g: THREE.Group, x0: number, x1: number, z0: number, z1: number, y: number, cell: number, rng: Rng, key = 'pave'): void {
  const lo = Math.min(x0, x1), hi = Math.max(x0, x1)
  const lo2 = Math.min(z0, z1), hi2 = Math.max(z0, z1)
  const nx = Math.max(1, Math.round((hi - lo) / cell)), nz = Math.max(1, Math.round((hi2 - lo2) / cell))
  const cw = (hi - lo) / nx, cd = (hi2 - lo2) / nz
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const r = rng()
      const k = r < 0.13 ? 'paveDk' : r < 0.21 ? 'paveWarm' : key
      g.add(bx(k, cw - 0.05, 0.11, cd - 0.05, lo + cw * (i + 0.5), y, lo2 + cd * (j + 0.5)))
    }
  }
}

/** 草皮 + 草丛 */
export function lawn(g: THREE.Group, x0: number, x1: number, z0: number, z1: number, y: number, rng: Rng, tufts: number): void {
  g.add(bx('grass', x1 - x0, 0.14, z1 - z0, (x0 + x1) / 2, y, (z0 + z1) / 2))
  for (let i = 0; i < tufts; i++) {
    const x = x0 + 0.15 + rng() * (x1 - x0 - 0.3), z = z0 + 0.15 + rng() * (z1 - z0 - 0.3)
    g.add(cy(rng() < 0.5 ? 'leaf' : 'leafDk', 0, 0.05 + rng() * 0.03, 0.14 + rng() * 0.2, 4, x, y + 0.13, z))
  }
}

/** 花坛：砖砌池壁 + 压顶 + 六色花阵 + 灌木 */
export function flowerBed(g: THREE.Group, cx: number, cz: number, y: number, w: number, d: number, rng: Rng, flowers: number): void {
  g.add(bx('brickDk', w, 0.42, 0.16, cx, y, cz - d / 2 + 0.08))
  g.add(bx('brickDk', w, 0.42, 0.16, cx, y, cz + d / 2 - 0.08))
  g.add(bx('brickDk', 0.16, 0.42, d, cx - w / 2 + 0.08, y, cz))
  g.add(bx('brickDk', 0.16, 0.42, d, cx + w / 2 - 0.08, y, cz))
  g.add(bx('conc', w + 0.22, 0.09, d + 0.22, cx, y + 0.42, cz))
  g.add(bx('grassDk', w - 0.3, 0.3, d - 0.3, cx, y + 0.1, cz))
  for (let i = 0; i < flowers; i++) {
    const x = cx - (w - 0.5) / 2 + rng() * (w - 0.5), z = cz - (d - 0.5) / 2 + rng() * (d - 0.5)
    const st = 0.16 + rng() * 0.22
    g.add(cy('leafDk', 0.012, 0.015, st, 4, x, y + 0.4, z))
    g.add(ico(`fl${Math.floor(rng() * FLOWER.length)}`, 0.055 + rng() * 0.035, 0, x, y + 0.4 + st + 0.03, z, 0.85))
  }
  for (let i = 0; i < 3; i++) shrub(g, cx + (rng() - 0.5) * (w - 0.9), cz + (rng() - 0.5) * (d - 0.9), y + 0.4, 0.24 + rng() * 0.14, rng)
}

/** 长椅（景观件） */
export function bench(g: THREE.Group, x: number, z: number, ry: number): void {
  const b = new THREE.Group()
  b.position.set(x, 0, z)
  b.rotation.y = ry
  for (let i = 0; i < 5; i++) b.add(bx('timber', 1.7, 0.06, 0.11, 0, 0.44, -0.24 + i * 0.13))
  for (let i = 0; i < 4; i++) b.add(bx('timber', 1.7, 0.06, 0.1, 0, 0.62 + i * 0.11, -0.31))
  for (const s of [-1, 1] as const) {
    b.add(bx('steelDk', 0.08, 0.44, 0.5, s * 0.72, 0, -0.05))
    b.add(bx('steelDk', 0.08, 0.9, 0.08, s * 0.72, 0.44, -0.29))
  }
  b.userData.site = true
  g.add(b)
}

/** 庭院灯（细柱 + 双臂 + 发光球） */
export function courtLamp(g: THREE.Group, x: number, z: number): void {
  const l = new THREE.Group()
  l.userData.site = true
  l.add(bx('concDk', 0.34, 0.16, 0.34, x, 0.15, z))
  l.add(cy('steelDk', 0.055, 0.075, 3.5, 8, x, 0.31, z))
  for (const s of [-1, 1] as const) {
    l.add(cyc('steelDk', 0.04, 0.04, 0.85, 6, x + s * 0.3, 3.72, z, 0, 0, -s * 0.5))
    l.add(ico('lamp', 0.15, 1, x + s * 0.62, 3.6, z))
  }
  g.add(l)
}

/** 路灯（细杆 + 悬臂 + 发光板） */
export function streetLamp(g: THREE.Group, x: number, z: number, dir: number): void {
  g.add(bx('concDk', 0.36, 0.2, 0.36, x, 0.13, z))
  g.add(cy('steelDk', 0.06, 0.09, 5.1, 8, x, 0.33, z))
  g.add(cyc('steelDk', 0.05, 0.05, 1.5, 6, x + dir * 0.6, 5.42, z, 0, 0, dir * -0.55))
  g.add(bx('lamp', 0.9, 0.1, 0.3, x + dir * 1.22, 5.24, z))
  g.add(bx('steelDk', 0.98, 0.15, 0.36, x + dir * 1.22, 5.34, z))
}

/** 木格栅凉棚 */
export function pergola(g: THREE.Group, cx: number, cz: number, y: number, w: number, d: number, rng: Rng): void {
  const H = 2.7
  for (const sx of [-1, 1] as const) {
    for (const sz of [-1, 1] as const) {
      g.add(bx('steelDk', 0.3, 0.14, 0.3, cx + sx * (w / 2 - 0.2), y, cz + sz * (d / 2 - 0.2)))
      g.add(bx('timberDk', 0.22, H, 0.22, cx + sx * (w / 2 - 0.2), y + 0.14, cz + sz * (d / 2 - 0.2)))
    }
  }
  for (const sz of [-1, 1] as const) g.add(bx('timberDk', w, 0.26, 0.16, cx, y + H + 0.14, cz + sz * (d / 2 - 0.2)))
  const n = Math.max(4, Math.round(d / 0.34))
  for (let i = 0; i <= n; i++) g.add(bx(i % 4 === 0 ? 'timberDk' : 'timber', w - 0.2, 0.14, 0.07 + rng() * 0.02, cx, y + H + 0.4, cz - d / 2 + (d * i) / n))
  for (const sx of [-1, 1] as const) g.add(bx('timberDk', 0.14, 0.2, d, cx + sx * (w / 2 - 0.2), y + H + 0.2, cz))
}

/** 旗（细分曲面 + 确定性波褶） */
export function flag(g: THREE.Group, x: number, y: number, z: number, key: string, rng: Rng): void {
  const geo = new THREE.PlaneGeometry(1.5, 0.95, 16, 9)
  const pos = geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), py = pos.getY(i)
    pos.setZ(i, Math.sin(px * 3.4 + py * 1.6) * 0.075 * (px + 0.75) + (rng() - 0.5) * 0.012)
  }
  geo.computeVertexNormals()
  const m = new THREE.Mesh(geo, MAT[key])
  m.position.set(x, y - 0.5, z + 0.78)
  m.rotation.y = Math.PI / 2
  m.castShadow = true
  m.userData.site = true
  g.add(m)
}

/** 绿篱段（砖砌矮基 + 密植团块） */
export function hedgeRun(g: THREE.Group, o: {
  axis: 'x' | 'z'; at: number; from: number; to: number; rng: Rng
}): void {
  const lo = Math.min(o.from, o.to), hi = Math.max(o.from, o.to)
  const len = hi - lo, mid = (lo + hi) / 2
  if (o.axis === 'x') {
    g.add(bx('brickDk', len, 0.26, 0.5, mid, 0.13, o.at))
    g.add(bx('leafDk', len, 0.86, 0.56, mid, 0.39, o.at))
    const n = Math.max(4, Math.round(len / 0.52))
    for (let i = 0; i < n; i++) {
      const x = lo + (len * (i + 0.5)) / n
      g.add(ico(i % 2 ? 'leaf' : 'leafLt', 0.3 + o.rng() * 0.09, 1, x, 1.3 + o.rng() * 0.06, o.at + (o.rng() - 0.5) * 0.2, 0.72))
    }
  } else {
    g.add(bx('brickDk', 0.5, 0.26, len, o.at, 0.13, mid))
    g.add(bx('leafDk', 0.56, 0.86, len, o.at, 0.39, mid))
    const n = Math.max(4, Math.round(len / 0.52))
    for (let i = 0; i < n; i++) {
      const z = lo + (len * (i + 0.5)) / n
      g.add(ico(i % 2 ? 'leaf' : 'leafLt', 0.3 + o.rng() * 0.09, 1, o.at + (o.rng() - 0.5) * 0.2, 1.3 + o.rng() * 0.06, z, 0.72))
    }
  }
}

/** 木格栅围界栏（钢柱 + 竖木条 + 横杆） */
export function fenceRun(g: THREE.Group, o: { axis: 'x' | 'z'; at: number; from: number; to: number }): void {
  const lo = Math.min(o.from, o.to), hi = Math.max(o.from, o.to)
  const len = hi - lo, n = Math.max(1, Math.round(len / 2.4))
  const seg = len / n
  for (let i = 0; i <= n; i++) {
    const c = lo + seg * i
    if (o.axis === 'x') g.add(bx('steelDk', 0.09, 1.5, 0.09, c, 0.13, o.at))
    else g.add(bx('steelDk', 0.09, 1.5, 0.09, o.at, 0.13, c))
  }
  for (let i = 0; i < n; i++) {
    const c0 = lo + seg * i, mid = c0 + seg / 2
    if (o.axis === 'x') {
      g.add(bx('steelDk', seg, 0.05, 0.05, mid, 1.55, o.at))
      g.add(bx('steelDk', seg, 0.05, 0.05, mid, 0.32, o.at))
      for (let k = 0; k < 13; k++) g.add(bx('timber', 0.06, 1.15, 0.035, c0 + 0.12 + k * (seg - 0.24) / 12, 0.38, o.at))
    } else {
      g.add(bx('steelDk', 0.05, 0.05, seg, o.at, 1.55, mid))
      g.add(bx('steelDk', 0.05, 0.05, seg, o.at, 0.32, mid))
      for (let k = 0; k < 13; k++) g.add(bx('timber', 0.035, 1.15, 0.06, o.at, 0.38, c0 + 0.12 + k * (seg - 0.24) / 12))
    }
  }
}

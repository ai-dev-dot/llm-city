import * as THREE from 'three'
import { Asm, mat4, on } from './asm'

/** 抛物线拱的解析：起拱点 (±halfSpan, springY)，矢顶 (0, springY+rise) */
export interface ArchSpec { halfSpan: number; springY: number; rise: number }

export const archY = (s: ArchSpec, x: number): number => s.springY + s.rise * (1 - (x / s.halfSpan) ** 2)
export const archSlope = (s: ArchSpec, x: number): number => Math.atan2((-2 * s.rise * x) / s.halfSpan ** 2, 1)

// 共享几何（合并池不销毁源几何，可跨池复用，省构造开销）
const RIVET = new THREE.CylinderGeometry(0.05, 0.058, 0.08, 6)
const BOLT = new THREE.CylinderGeometry(0.075, 0.075, 0.09, 6)
const BAR = new THREE.BoxGeometry(1, 1, 1)

/** 沿基准位姿排铆钉：dir='z' 时钉轴朝 Z（杆件侧面），dir='y' 时朝 Y（水平板面） */
function rivets(a: Asm, key: string, base: THREE.Matrix4, xs: number[], y: number, zPair: number, axis: 'z' | 'y' = 'z'): void {
  for (const dx of xs) {
    if (axis === 'z') {
      for (const dz of [-zPair, zPair]) a.q(key, RIVET, on(base, dx, y, dz, Math.PI / 2, 0, 0))
    } else {
      for (const dz of [-zPair, zPair]) a.q(key, RIVET, on(base, dx, y, dz))
    }
  }
}

/** 拱桁架肋（上弦压杆 + 拱腹板 + 下弦拉杆 + 竖腹杆 + V 形斜杆 + 节点板 + 铆钉带）。
 *  桁架平面 = XY（跨沿 X），厚度沿 Z；twin 时做双片桁架 + 平联缀条（主肋用）。 */
export function archRib(a: Asm, o: ArchSpec & {
  z: number
  bays?: number
  depth?: number
  twin?: boolean
  key?: string
  rivet?: boolean
}): void {
  const bays = o.bays ?? 8
  const depth = o.depth ?? 0.3
  const key = o.key ?? 'iron'
  const H = o.halfSpan
  const twin = !!o.twin
  const gap = twin ? 0.52 : 0
  const planes = twin ? [o.z - gap / 2, o.z + gap / 2] : [o.z]
  const rivet = o.rivet !== false

  const xs: number[] = []
  for (let i = 0; i <= bays; i++) xs.push(-H + (2 * H * i) / bays)

  for (const pz of planes) {
    // 上弦 + 腹板
    for (let i = 0; i < bays; i++) {
      const x0 = xs[i], x1 = xs[i + 1]
      const y0 = archY(o, x0), y1 = archY(o, x1)
      const xm = (x0 + x1) / 2, ym = (y0 + y1) / 2
      const sl = Math.atan2(y1 - y0, x1 - x0)
      const len = Math.hypot(x1 - x0, y1 - y0) + 0.1
      a.box(key, len, 0.24, depth, xm, ym + 0.12, pz, 0, 0, sl)
      a.box(key, len, 0.4, depth * 0.5, xm, ym - 0.14, pz, 0, 0, sl)
      if (rivet) rivets(a, key, mat4(xm, ym + 0.12, pz, 0, 0, sl), [-len * 0.3, 0, len * 0.3], 0, depth / 2 + 0.03)
    }
    // 下弦拉杆（双压杆）
    a.box(key, 2 * H + 0.3, 0.18, depth, 0, o.springY - 0.34, pz)
    a.box(key, 2 * H + 0.3, 0.14, depth * 0.6, 0, o.springY - 0.58, pz)
    if (rivet) rivets(a, key, mat4(0, o.springY - 0.34, pz), [-H * 0.6, -H * 0.2, H * 0.2, H * 0.6], 0, depth / 2 + 0.03)

    // 竖腹杆 + 节点板
    for (let i = 0; i <= bays; i++) {
      const x = xs[i]
      const yt = archY(o, x)
      const yb = o.springY - 0.25
      if (yt - yb > 0.3) {
        a.box(key, 0.13, yt - yb, depth * 0.72, x, (yt + yb) / 2, pz)
        a.box(key, 0.3, 0.3, depth + 0.05, x, yt - 0.18, pz)
        a.box(key, 0.28, 0.28, depth + 0.05, x, o.springY - 0.34, pz)
        if (rivet) a.q(key, RIVET, mat4(x, yt - 0.18, pz + depth / 2 + 0.05, Math.PI / 2, 0, 0))
      }
    }
    // V 形斜腹杆（左右对称向矢顶收敛）
    for (let i = 0; i < bays; i++) {
      const x0 = xs[i], x1 = xs[i + 1]
      const toCentre = i < bays / 2
      const xa = toCentre ? x0 : x1
      const xb = toCentre ? x1 : x0
      const ya = o.springY - 0.3
      const yb = archY(o, xb) - 0.2
      const dx = xb - xa, dy = yb - ya
      const len = Math.hypot(dx, dy)
      if (len < 0.35) continue
      a.box(key, len, 0.11, depth * 0.5, (xa + xb) / 2, (ya + yb) / 2, pz, 0, 0, Math.atan2(dy, dx))
    }
    // 起拱垫座（skewback）
    for (const s of [-1, 1]) {
      a.box('cast', 0.5, 0.7, depth + 0.24, s * (H + 0.06), o.springY - 0.5, pz)
      a.q(key, BOLT, mat4(s * (H + 0.06), o.springY - 0.3, pz + depth / 2 + 0.14, Math.PI / 2, 0, 0))
      a.q(key, BOLT, mat4(s * (H + 0.06), o.springY - 0.7, pz - depth / 2 - 0.14, Math.PI / 2, 0, 0))
    }
  }

  // 双片桁架的平联缀条与横撑
  if (twin) {
    for (let i = 0; i <= bays; i++) {
      const x = xs[i]
      const yt = archY(o, x)
      a.box(key, 0.1, 0.1, gap, x, yt + 0.2, o.z)
      a.box(key, 0.1, 0.1, gap, x, o.springY - 0.34, o.z)
    }
    for (let i = 0; i < bays; i++) {
      const x0 = xs[i], x1 = xs[i + 1]
      const ym = (archY(o, x0) + archY(o, x1)) / 2 + 0.2
      const len = Math.hypot(x1 - x0, gap)
      a.box(key, len, 0.07, 0.07, (x0 + x1) / 2, ym, o.z, 0, -Math.atan2(gap, x1 - x0), 0)
      a.box(key, len, 0.07, 0.07, (x0 + x1) / 2, o.springY - 0.5, o.z, 0, Math.atan2(gap, x1 - x0), 0)
    }
  }
}

/** 檩条：沿 Z 通长，贴合拱弧位置 */
export function purlin(a: Asm, s: ArchSpec, o: { x: number; z0: number; z1: number; key?: string; w?: number; h?: number }): void {
  const key = o.key ?? 'iron'
  const y = archY(s, o.x)
  const sl = archSlope(s, o.x)
  a.box(key, o.w ?? 0.14, o.h ?? 0.2, o.z1 - o.z0, o.x, y + 0.16, (o.z0 + o.z1) / 2, 0, 0, sl)
}

/** 拱棚玻璃屋面：分格玻璃 + 密集铁压条网格 + 檩条（压条与玻璃各并成一 mesh） */
export function vaultGlazing(a: Asm, o: {
  spec: ArchSpec
  z0: number
  z1: number
  ribZs: number[]
  segs: number
  subArc?: number
  subZ?: number
  glassKey?: string
  barKey?: string
  purlin?: boolean
}): void {
  const s = o.spec
  const H = s.halfSpan
  const subArc = o.subArc ?? 4
  const subZ = o.subZ ?? 7
  const glassKey = o.glassKey ?? 'glass'
  const barKey = o.barKey ?? 'iron'
  const xs: number[] = []
  for (let i = 0; i <= o.segs; i++) xs.push(-H + (2 * H * i) / o.segs)

  if (o.purlin !== false) {
    for (let i = 1; i < o.segs; i++) purlin(a, s, { x: xs[i], z0: o.z0, z1: o.z1 })
  }

  const bays: Array<[number, number]> = []
  for (let j = 0; j + 1 < o.ribZs.length; j++) bays.push([o.ribZs[j], o.ribZs[j + 1]])

  for (let i = 0; i < o.segs; i++) {
    const x0 = xs[i], x1 = xs[i + 1]
    const xm = (x0 + x1) / 2
    const ym = (archY(s, x0) + archY(s, x1)) / 2
    const sl = Math.atan2(archY(s, x1) - archY(s, x0), x1 - x0)
    const chord = Math.hypot(x1 - x0, archY(s, x1) - archY(s, x0))
    for (const [za, zb] of bays) {
      const zc = (za + zb) / 2
      const zl = zb - za - 0.1
      const base = mat4(xm, ym + 0.1, zc, 0, 0, sl)
      // 玻璃片
      a.q(glassKey, new THREE.BoxGeometry(chord - 0.05, 0.045, zl), base)
      // 压条：沿弧 subArc-1 根（通 Z），沿 Z subZ-1 根（通弧）+ 四周边框
      const du = chord / subArc
      const dz = zl / subZ
      for (let k = 1; k < subArc; k++) a.q(barKey, BAR, on(base, -chord / 2 + du * k, 0.045, 0, 0, 0, 0, 0.055, 0.07, zl))
      for (let k = 1; k < subZ; k++) a.q(barKey, BAR, on(base, 0, 0.045, -zl / 2 + dz * k, 0, 0, 0, chord, 0.06, 0.05))
      a.q(barKey, BAR, on(base, 0, 0.05, -zl / 2, 0, 0, 0, chord, 0.09, 0.07))
      a.q(barKey, BAR, on(base, 0, 0.05, zl / 2, 0, 0, 0, chord, 0.09, 0.07))
      a.q(barKey, BAR, on(base, -chord / 2, 0.05, 0, 0, 0, 0, 0.07, 0.09, zl))
      a.q(barKey, BAR, on(base, chord / 2, 0.05, 0, 0, 0, 0, 0.07, 0.09, zl))
    }
  }
}

/** 铸铁柱：法兰底板 + 地脚螺栓 + 柱础 + 锥形柱身 + 环箍 + 柱头（垫块 + 四向牛腿 + 涡卷） */
export function ironColumn(a: Asm, o: {
  x: number; z: number; y0?: number; h: number; r?: number; key?: string
  capital?: boolean; rings?: number; bolts?: boolean
}): void {
  const y0 = o.y0 ?? 0
  const r = o.r ?? 0.24
  const key = o.key ?? 'cast'
  const yTop = y0 + o.h
  a.box(key, 0.92, 0.14, 0.92, o.x, y0 + 0.07, o.z)
  if (o.bolts !== false) {
    for (const dx of [-0.34, 0.34]) for (const dz of [-0.34, 0.34]) a.q('iron', BOLT, mat4(o.x + dx, y0 + 0.16, o.z + dz))
  }
  a.box(key, 0.66, 0.24, 0.66, o.x, y0 + 0.26, o.z)
  a.cyl(key, r * 1.5, r * 1.75, 0.26, 12, o.x, y0 + 0.51, o.z)
  const shaftH = o.h - 0.64 - (o.capital === false ? 0 : 0.86)
  a.cyl(key, r * 0.82, r * 1.06, shaftH, 14, o.x, y0 + 0.64 + shaftH / 2, o.z)
  const rings = o.rings ?? 2
  for (let i = 1; i <= rings; i++) {
    const yy = y0 + 0.64 + (shaftH * i) / (rings + 1)
    a.cyl(key, r * 0.95, r * 0.95, 0.13, 14, o.x, yy, o.z)
    a.cyl('iron', r * 0.86, r * 0.86, 0.05, 14, o.x, yy + 0.09, o.z)
  }
  if (o.capital !== false) {
    const yc = y0 + 0.64 + shaftH
    a.cyl(key, r * 1.3, r * 0.9, 0.3, 14, o.x, yc + 0.15, o.z)
    a.box(key, 0.86, 0.2, 0.86, o.x, yc + 0.4, o.z)
    a.box('iron', 1.06, 0.14, 1.06, o.x, yc + 0.57, o.z)
    for (const [dx, dz, ry] of [[0.52, 0, 0], [-0.52, 0, 0], [0, 0.52, Math.PI / 2], [0, -0.52, Math.PI / 2]] as const) {
      a.box('iron', 0.62, 0.16, 0.14, o.x + dx * 0.5, yc + 0.24, o.z + dz * 0.5, 0, ry, dx ? 0.42 * Math.sign(dx) : 0)
      a.sph('iron', 0.11, 8, 6, o.x + dx * 0.82, yc + 0.42, o.z + dz * 0.82)
    }
    a.box('iron', 0.7, 0.1, 0.7, o.x, yc + 0.69, o.z)
  }
  a.q('iron', RIVET, mat4(o.x, yTop, o.z))
}

/** 格构梁（局部沿 X，两端 flange + Z 形斜杆 + 竖杆 + 铆钉带），用 sub() 定位转向 */
export function latticeGirder(a: Asm, o: {
  len: number; h: number; depth?: number; bays?: number; key?: string; web?: boolean
  flange?: number; rivet?: boolean
}): void {
  const bays = o.bays ?? Math.max(4, Math.round(o.len / 0.9))
  const depth = o.depth ?? 0.16
  const key = o.key ?? 'iron'
  const fl = o.flange ?? 0.2
  const L = o.len
  for (const zz of [-depth / 2, depth / 2]) {
    a.box(key, L, fl, 0.1, 0, o.h / 2 - fl / 2, zz)
    a.box(key, L, fl, 0.1, 0, -o.h / 2 + fl / 2, zz)
    if (o.web) a.box(key, L, o.h - fl * 2, 0.04, 0, 0, zz)
    if (o.rivet !== false) {
      const xs: number[] = []
      for (let i = 0; i <= bays; i++) xs.push(-L / 2 + (L * i) / bays)
      rivets(a, key, mat4(0, o.h / 2 - fl / 2, zz), xs.filter((_, i) => i % 2 === 0), 0, 0.07, 'y')
      rivets(a, key, mat4(0, -o.h / 2 + fl / 2, zz), xs.filter((_, i) => i % 2 === 1), 0, 0.07, 'y')
    }
  }
  for (let i = 0; i <= bays; i++) {
    const x = -L / 2 + (L * i) / bays
    a.box(key, 0.11, o.h - fl * 2, depth, x, 0, 0)
    a.box(key, 0.24, 0.24, depth + 0.04, x, o.h / 2 - fl - 0.06, 0)
    a.box(key, 0.24, 0.24, depth + 0.04, x, -o.h / 2 + fl + 0.06, 0)
  }
  const step = L / bays
  for (let i = 0; i < bays; i++) {
    const x0 = -L / 2 + step * i
    const up = i % 2 === 0
    const ya = up ? -o.h / 2 + fl : o.h / 2 - fl
    const yb = up ? o.h / 2 - fl : -o.h / 2 + fl
    const len = Math.hypot(step, yb - ya)
    a.box(key, len, 0.1, depth * 0.6, (x0 + x0 + step) / 2, (ya + yb) / 2, 0, 0, 0, Math.atan2(yb - ya, step))
  }
  // 上下弦平面内的水平联杆
  for (let i = 0; i <= bays; i++) {
    const x = -L / 2 + (L * i) / bays
    a.box(key, 0.08, 0.08, depth, x, o.h / 2 - fl / 2, 0)
    a.box(key, 0.08, 0.08, depth, x, -o.h / 2 + fl / 2, 0)
  }
}

/** 铁栏杆段（局部沿 X）：上下横杆 + 密立柱 + 矛头尖饰，全部入合并池 */
export function ironRailing(a: Asm, o: {
  len: number; h?: number; pitch?: number; key?: string; spear?: boolean; y?: number
}): void {
  const h = o.h ?? 1.05
  const key = o.key ?? 'iron'
  const pitch = o.pitch ?? 0.16
  const n = Math.max(2, Math.round(o.len / pitch))
  a.box(key, o.len, 0.09, 0.09, 0, h - 0.05, 0)
  a.box(key, o.len, 0.07, 0.07, 0, h * 0.62, 0)
  a.box(key, o.len, 0.1, 0.14, 0, 0.06, 0)
  for (let i = 0; i <= n; i++) {
    const x = -o.len / 2 + (o.len * i) / n
    a.q(key, BAR, mat4(x, h / 2, 0, 0, 0, 0, 0.055, h - 0.1, 0.055))
    if (o.spear !== false) {
      a.q(key, new THREE.ConeGeometry(0.055, 0.14, 4), mat4(x, h + 0.02, 0))
      a.q('gold', new THREE.SphereGeometry(0.035, 6, 4), mat4(x, h - 0.06, 0))
    }
  }
  for (const x of [-o.len / 2, o.len / 2]) a.box(key, 0.14, h + 0.16, 0.14, x, (h + 0.16) / 2, 0)
}

/** 脊饰：沿 Z 通长的脊瓦 + 周期尖饰（cresting），合并入池 */
export function ridgeCresting(a: Asm, o: { z0: number; z1: number; x: number; y: number; pitch?: number; key?: string }): void {
  const key = o.key ?? 'patina'
  const pitch = o.pitch ?? 0.75
  a.box(key, 0.3, 0.14, o.z1 - o.z0, o.x, o.y + 0.07, (o.z0 + o.z1) / 2)
  a.box('gold', 0.12, 0.06, o.z1 - o.z0, o.x, o.y + 0.17, (o.z0 + o.z1) / 2)
  const n = Math.max(2, Math.round((o.z1 - o.z0) / pitch))
  for (let i = 0; i <= n; i++) {
    const z = o.z0 + ((o.z1 - o.z0) * i) / n
    a.q(key, new THREE.ConeGeometry(0.09, 0.34, 4), mat4(o.x, o.y + 0.34, z))
    a.q('gold', new THREE.SphereGeometry(0.055, 6, 4), mat4(o.x, o.y + 0.53, z))
    a.q(key, BAR, mat4(o.x, o.y + 0.2, z, 0, 0, 0, 0.26, 0.2, 0.05))
  }
}

/** 拉杆（tie rod）：通长圆钢 + 花篮螺栓 + 两端圆盘锚座 */
export function tieRod(a: Asm, o: { x0: number; x1: number; y: number; z: number; r?: number }): void {
  const r = o.r ?? 0.06
  const len = o.x1 - o.x0
  const xc = (o.x0 + o.x1) / 2
  a.cyl('iron', r, r, len, 8, xc, o.y, o.z, 0, 0, Math.PI / 2)
  a.cyl('cast', r * 2.1, r * 2.1, 0.5, 10, xc, o.y, o.z, 0, 0, Math.PI / 2)
  a.cyl('cast', r * 1.5, r * 1.5, 0.16, 10, xc - 0.32, o.y, o.z, 0, 0, Math.PI / 2)
  a.cyl('cast', r * 1.5, r * 1.5, 0.16, 10, xc + 0.32, o.y, o.z, 0, 0, Math.PI / 2)
  for (const x of [o.x0, o.x1]) {
    a.cyl('iron', r * 1.8, r * 1.8, 0.1, 12, x + (x === o.x0 ? 0.06 : -0.06), o.y, o.z, 0, 0, Math.PI / 2)
  }
}

/** 棚内吊灯：吊杆 + 锥形灯罩 + 双层环 + 发光胆 + 顶盘 */
export function hangingLamp(a: Asm, o: { x: number; y: number; z: number; drop?: number; scale?: number }): void {
  const s = o.scale ?? 1
  const d = o.drop ?? 1.6
  a.cyl('iron', 0.03, 0.03, d, 6, o.x, o.y - d / 2, o.z)
  a.cyl('iron', 0.14, 0.14, 0.06, 10, o.x, o.y - 0.03, o.z)
  const yy = o.y - d
  a.cyl('cast', 0.05, 0.42 * s, 0.34 * s, 14, o.x, yy - 0.17 * s, o.z)
  a.cyl('iron', 0.44 * s, 0.44 * s, 0.05, 14, o.x, yy - 0.36 * s, o.z)
  a.sph('glow', 0.15 * s, 10, 8, o.x, yy - 0.3 * s, o.z)
  for (let i = 0; i < 6; i++) {
    const t = (Math.PI * 2 * i) / 6
    a.cyl('iron', 0.02, 0.02, 0.4 * s, 4, o.x + Math.cos(t) * 0.3 * s, yy - 0.5 * s, o.z + Math.sin(t) * 0.3 * s, 0.3 * Math.cos(t), 0, -0.3 * Math.sin(t))
  }
  a.cyl('gold', 0.06, 0.1, 0.12, 8, o.x, yy - 0.62 * s, o.z)
}

/** 铁牛腿（撑拱）：曲率由三段折线近似，用于柱头承梁、雨棚吊撑 */
export function bracket(a: Asm, o: { x: number; y: number; z: number; len?: number; rotY?: number; key?: string; mirror?: boolean }): void {
  const key = o.key ?? 'iron'
  const L = o.len ?? 0.85
  const g = a.sub(o.x, o.y, o.z, 0, o.rotY ?? 0, 0)
  const m = o.mirror ? -1 : 1
  g.box(key, L, 0.12, 0.12, m * L / 2, -0.06, 0, 0, 0, m * -0.06)
  for (let i = 0; i < 4; i++) {
    const t = i / 3
    const x = m * L * (1 - t)
    const y = -0.1 - 0.62 * t * t
    g.box(key, L / 4.4, 0.1, 0.1, x, y, 0, 0, 0, m * -0.5 * t)
  }
  g.box(key, 0.12, 0.72, 0.12, 0, -0.42, 0)
  g.q(key, new THREE.ConeGeometry(0.09, 0.2, 4), mat4(m * L, -0.02, 0, 0, 0, m * Math.PI / 2))
  g.flush()
}

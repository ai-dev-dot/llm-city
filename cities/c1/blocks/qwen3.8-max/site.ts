import * as THREE from 'three'
import { Asm, mat4, hash01 } from './asm'
import { ironRailing } from './ironwork'

const BAR = new THREE.BoxGeometry(1, 1, 1)
const TUFT = new THREE.ConeGeometry(0.07, 0.24, 4)
const BLOB = new THREE.IcosahedronGeometry(1, 1)

/** 铺装：垫层板 + 分缝暗线 + 错缝色差石板（每块确定性抖动，避免整片死板） */
export function paving(a: Asm, o: {
  x: number; z: number; w: number; d: number; y: number
  rows?: number; cols?: number; key?: string; jointKey?: string; tone?: boolean
}): void {
  const rows = o.rows ?? Math.max(2, Math.round(o.d / 1.2))
  const cols = o.cols ?? Math.max(2, Math.round(o.w / 1.2))
  a.box(o.key ?? 'paving', o.w, 0.14, o.d, o.x, o.y + 0.07, o.z)
  const cw = o.w / cols
  const rh = o.d / rows
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u = hash01(r * 31 + c, 5)
      const xx = o.x - o.w / 2 + (c + 0.5) * cw + (r % 2 ? cw * 0.25 : 0)
      const zz = o.z - o.d / 2 + (r + 0.5) * rh
      if (Math.abs(xx - o.x) > o.w / 2 - cw * 0.4) continue
      if (o.tone !== false && u > 0.78) {
        a.q('pavingDark', BAR, mat4(xx, o.y + 0.15, zz, 0, 0, 0, cw - 0.08, 0.02, rh - 0.08))
      }
    }
    a.q(o.jointKey ?? 'pavingDark', BAR, mat4(o.x, o.y + 0.15, o.z - o.d / 2 + r * rh, 0, 0, 0, o.w, 0.015, 0.05))
  }
  for (let c = 1; c < cols; c++) {
    a.q(o.jointKey ?? 'pavingDark', BAR, mat4(o.x - o.w / 2 + c * cw, o.y + 0.15, o.z, 0, 0, 0, 0.05, 0.015, o.d))
  }
}

/** 缘石（路缘石）：沿 X 或 Z 通长的石条 + 端头 */
export function kerbRun(a: Asm, o: { x: number; z: number; len: number; axis?: 'x' | 'z'; y?: number; h?: number; key?: string }): void {
  const axis = o.axis ?? 'x'
  const y = o.y ?? 0
  const h = o.h ?? 0.24
  const n = Math.max(2, Math.round(o.len / 1.6))
  for (let i = 0; i < n; i++) {
    const t = -o.len / 2 + ((i + 0.5) * o.len) / n
    const seg = o.len / n - 0.04
    a.q(o.key ?? 'stoneDark', BAR, mat4(
      o.x + (axis === 'x' ? t : 0), y + h / 2, o.z + (axis === 'z' ? t : 0),
      0, 0, 0, axis === 'x' ? seg : 0.26, h, axis === 'x' ? 0.26 : seg))
  }
  a.box(o.key ?? 'stoneDark', axis === 'x' ? o.len : 0.3, h * 0.5, axis === 'x' ? 0.3 : o.len, o.x, y + h * 0.25, o.z)
}

/** 草坛：略高于铺装的草皮 + 草叶簇（确定性抖动）+ 石缘 */
export function grassBed(a: Asm, o: { x: number; z: number; w: number; d: number; y: number; tufts?: number; edge?: boolean }): void {
  a.box('grass', o.w, 0.1, o.d, o.x, o.y + 0.05, o.z)
  const n = o.tufts ?? Math.round(o.w * o.d * 2.2)
  for (let i = 0; i < n; i++) {
    const u = hash01(i, 7)
    const v = hash01(i, 8)
    const s = 0.6 + hash01(i, 9) * 1.1
    a.q(u > 0.55 ? 'grassDark' : 'grass', TUFT, mat4(
      o.x + (u - 0.5) * (o.w - 0.2), o.y + 0.18, o.z + (v - 0.5) * (o.d - 0.2),
      u * 0.4, v * 3, u * 0.3, s, s * (0.8 + v * 0.5), s))
  }
  if (o.edge !== false) {
    for (const sz of [-1, 1]) a.q('stoneDark', BAR, mat4(o.x, o.y + 0.1, o.z + sz * (o.d / 2), 0, 0, 0, o.w + 0.1, 0.2, 0.14))
    for (const sx of [-1, 1]) a.q('stoneDark', BAR, mat4(o.x + sx * (o.w / 2), o.y + 0.1, o.z, 0, 0, 0, 0.14, 0.2, o.d + 0.1))
  }
}

/** 维多利亚路灯：三级基座 + 凹槽柱身 + 双环箍 + 灯架横梁 + 玻璃灯室 + 铁框 + 尖顶 + 灯胆 */
export function victorianLamp(a: Asm, o: { x: number; z: number; y?: number; h?: number; arms?: number }): void {
  const h = o.h ?? 5.2
  const g = a.sub(o.x, o.y ?? 0, o.z)
  g.box('cast', 0.56, 0.14, 0.56, 0, 0.07, 0)
  g.cyl('cast', 0.24, 0.3, 0.3, 10, 0, 0.29, 0)
  g.cyl('ironDark', 0.17, 0.22, 0.4, 10, 0, 0.64, 0)
  g.cyl('cast', 0.11, 0.15, h - 1.5, 12, 0, 0.84 + (h - 1.5) / 2, 0)
  for (let i = 0; i < 4; i++) {
    const t = (Math.PI * 2 * i) / 4 + Math.PI / 4
    g.q('ironDark', BAR, mat4(Math.cos(t) * 0.13, 0.84 + (h - 1.5) * 0.55, Math.sin(t) * 0.13, 0, 0, 0, 0.03, h - 1.7, 0.03))
  }
  g.cyl('cast', 0.2, 0.13, 0.26, 12, 0, h - 0.55, 0)
  g.cyl('gold', 0.15, 0.15, 0.06, 12, 0, h - 0.4, 0)
  const arms = o.arms ?? 2
  for (let i = 0; i < arms; i++) {
    const t = (Math.PI * 2 * i) / arms
    const ax = Math.cos(t) * 0.42
    const az = Math.sin(t) * 0.42
    g.cyl('iron', 0.045, 0.045, 0.5, 6, ax * 0.5, h - 0.3, az * 0.5, 0, 0, -Math.cos(t) * 1.1)
    g.box('iron', 0.3, 0.07, 0.3, ax, h - 0.06, az)
    g.box('glass', 0.24, 0.34, 0.24, ax, h + 0.16, az)
    g.sph('glow', 0.11, 10, 8, ax, h + 0.16, az)
    for (let e = 0; e < 4; e++) {
      const et = (Math.PI * 2 * e) / 4 + Math.PI / 4
      g.q('iron', BAR, mat4(ax + Math.cos(et) * 0.15, h + 0.16, az + Math.sin(et) * 0.15, 0, 0, 0, 0.035, 0.4, 0.035))
    }
    g.cyl('iron', 0.02, 0.2, 0.2, 4, ax, h + 0.43, az)
    g.sph('gold', 0.05, 6, 5, ax, h + 0.55, az)
  }
  g.cyl('iron', 0.05, 0.05, 0.5, 6, 0, h + 0.1, 0)
  g.cyl('cast', 0.02, 0.16, 0.22, 4, 0, h + 0.42, 0)
  g.sph('gold', 0.07, 8, 6, 0, h + 0.58, 0)
  g.flush()
}

/** 铸铁护柱：底座 + 锥身 + 鎏金环 + 圆顶 */
export function bollard(a: Asm, o: { x: number; z: number; y?: number; h?: number; key?: string }): void {
  const h = o.h ?? 0.95
  const y = o.y ?? 0
  const key = o.key ?? 'cast'
  a.cyl(key, 0.16, 0.2, 0.12, 10, o.x, y + 0.06, o.z)
  a.cyl(key, 0.1, 0.13, h - 0.3, 10, o.x, y + 0.12 + (h - 0.3) / 2, o.z)
  a.cyl('gold', 0.115, 0.115, 0.06, 10, o.x, y + h - 0.2, o.z)
  a.sph(key, 0.11, 10, 8, o.x, y + h - 0.1, o.z)
  a.q(key, BAR, mat4(o.x, y + h * 0.5, o.z, 0, 0, 0, 0.24, 0.05, 0.05))
}

/** 石砌花池：石框 + 土面 + 灌木球 + 花草点色 */
export function planter(a: Asm, o: { x: number; z: number; w?: number; d?: number; y?: number; h?: number }): void {
  const w = o.w ?? 2.0
  const d = o.d ?? 1.0
  const y = o.y ?? 0
  const h = o.h ?? 0.55
  a.box('stoneDark', w, h, d, o.x, y + h / 2, o.z)
  a.box('stone', w + 0.16, 0.12, d + 0.16, o.x, y + h + 0.06, o.z)
  a.box('woodDark', w - 0.2, 0.1, d - 0.2, o.x, y + h + 0.08, o.z)
  const n = Math.max(2, Math.round(w / 0.55))
  for (let i = 0; i < n; i++) {
    const u = hash01(i, 17)
    const xx = o.x - w / 2 + ((i + 0.5) * w) / n
    a.q('hedge', new THREE.IcosahedronGeometry(0.24 + u * 0.12, 1), mat4(xx, y + h + 0.28, o.z + (u - 0.5) * (d - 0.5), u, u * 3, u * 2, 1, 0.85 + u * 0.3, 1))
    for (let k = 0; k < 3; k++) {
      const v = hash01(i * 7 + k, 19)
      a.q(k === 1 ? 'signalRed' : 'goldPale', new THREE.SphereGeometry(0.07, 6, 5),
        mat4(xx + (v - 0.5) * 0.4, y + h + 0.42 + v * 0.1, o.z + (hash01(i + k, 23) - 0.5) * (d - 0.4)))
    }
  }
}

/** 旗杆：锥杆 + 鎏金宝珠 + 旗绳 + 双面旗（三折角板，读作有风） */
export function flagpole(a: Asm, o: { x: number; z: number; y?: number; h?: number; flagKey?: string }): void {
  const h = o.h ?? 9
  const y = o.y ?? 0
  a.box('stoneDark', 0.5, 0.3, 0.5, o.x, y + 0.15, o.z)
  a.cyl('cast', 0.14, 0.18, 0.36, 10, o.x, y + 0.48, o.z)
  a.cyl('steel', 0.05, 0.11, h - 1, 10, o.x, y + 0.66 + (h - 1) / 2, o.z)
  a.sph('gold', 0.13, 10, 8, o.x, y + h + 0.1, o.z)
  a.cyl('gold', 0.03, 0.03, 0.3, 6, o.x, y + h + 0.32, o.z)
  a.cyl('steel', 0.015, 0.015, h - 1.6, 4, o.x + 0.1, y + 0.9 + (h - 1.6) / 2, o.z)
  const fk = o.flagKey ?? 'signalRed'
  for (let i = 0; i < 3; i++) {
    a.box(fk, 0.9, 0.62, 0.04, o.x + 0.62, y + h - 0.9, o.z + (i - 1) * 0.05, 0, 0, (i - 1) * 0.05)
  }
  a.box('goldPale', 0.9, 0.1, 0.05, o.x + 0.62, y + h - 0.66, o.z)
  a.box('goldPale', 0.1, 0.62, 0.05, o.x + 0.2, y + h - 0.9, o.z)
}

/** 铸铁长椅：两端涡卷铸铁腿 + 木条坐面与靠背 + 扶手 */
export function bench(a: Asm, o: { x: number; z: number; y?: number; rotY?: number; len?: number }): void {
  const len = o.len ?? 2.0
  const g = a.sub(o.x, o.y ?? 0, o.z, 0, o.rotY ?? 0, 0)
  for (const sx of [-1, 1]) {
    g.box('cast', 0.1, 0.44, 0.5, sx * (len / 2 - 0.16), 0.24, 0)
    g.box('cast', 0.1, 0.5, 0.1, sx * (len / 2 - 0.16), 0.72, -0.22, 0.2, 0, 0)
    g.cyl('cast', 0.09, 0.09, 0.1, 8, sx * (len / 2 - 0.16), 0.5, 0.02, Math.PI / 2, 0, 0)
    g.sph('cast', 0.08, 8, 6, sx * (len / 2 - 0.16), 0.96, -0.3)
    g.box('cast', 0.12, 0.08, 0.42, sx * (len / 2 - 0.16), 1.0, 0.02)
  }
  for (let i = 0; i < 4; i++) g.box('wood', len - 0.1, 0.07, 0.11, 0, 0.48, -0.18 + i * 0.12)
  for (let i = 0; i < 3; i++) g.box('wood', len - 0.1, 0.1, 0.06, 0, 0.62 + i * 0.13, -0.26 - i * 0.02, 0.16, 0, 0)
  g.flush()
}

/** 悬铃木（法国梧桐）：斜干 + 双主枝 + 多层修剪冠（深浅两绿）+ 六棱石树池 + 铸铁护栅 */
export function planeTree(a: Asm, o: { x: number; z: number; y?: number; scale?: number; seed?: number; pit?: boolean }): void {
  const s = o.scale ?? 1
  const sd = o.seed ?? 1
  const g = a.sub(o.x, o.y ?? 0, o.z, 0, hash01(sd, 3) * 6.28, 0)
  const lean = (hash01(sd, 1) - 0.5) * 0.14
  g.cyl('woodDark', 0.16 * s, 0.3 * s, 2.6 * s, 9, lean * 0.6, 1.3 * s, 0, 0, 0, lean)
  for (const [t, len, r] of [[0.6, 1.1, 0.1], [2.4, 1.0, 0.09], [4.2, 0.8, 0.07]] as const) {
    g.cyl('woodDark', r * s * 0.7, r * s, len * s, 7,
      Math.cos(t) * 0.4 * s, 2.4 * s, Math.sin(t) * 0.4 * s, Math.sin(t) * 0.7, 0, -Math.cos(t) * 0.7)
  }
  const crowns: Array<[number, number, number, number]> = [
    [0, 3.5, 0, 1.15], [0.7, 3.0, 0.3, 0.85], [-0.6, 3.1, -0.4, 0.9],
    [0.2, 4.2, -0.3, 0.8], [-0.3, 4.0, 0.5, 0.7],
  ]
  for (let i = 0; i < crowns.length; i++) {
    const [cx, cy, cz, cr] = crowns[i]
    const u = hash01(sd + i, 29)
    g.q(i % 2 ? 'hedge' : 'grassDark', BLOB, mat4(cx * s, cy * s, cz * s, u * 3, u * 6, u * 2,
      cr * s * (0.9 + u * 0.3), cr * s * (0.75 + u * 0.2), cr * s * (0.9 + u * 0.3)))
  }
  for (let i = 0; i < 3; i++) {
    const u = hash01(sd + i, 31)
    g.q('grass', BLOB, mat4((u - 0.5) * 1.4 * s, (3.2 + u) * s, (hash01(sd + i, 37) - 0.5) * 1.4 * s,
      u * 4, u * 2, u, 0.5 * s, 0.4 * s, 0.5 * s))
  }
  g.flush()
  if (o.pit !== false) {
    for (let i = 0; i < 6; i++) {
      const t = (Math.PI * 2 * i) / 6
      a.q('stone', BAR, mat4(o.x + Math.cos(t) * 0.85, (o.y ?? 0) + 0.16, o.z + Math.sin(t) * 0.85, 0, -t, 0, 0.92, 0.32, 0.16))
    }
    a.box('woodDark', 1.5, 0.1, 1.5, o.x, (o.y ?? 0) + 0.2, o.z)
    for (let i = 0; i < 7; i++) a.q('iron', BAR, mat4(o.x, (o.y ?? 0) + 0.27, o.z - 0.72 + i * 0.24, 0, 0, 0, 1.44, 0.04, 0.06))
    for (let i = 0; i < 7; i++) a.q('iron', BAR, mat4(o.x - 0.72 + i * 0.24, (o.y ?? 0) + 0.25, o.z, 0, 0, 0, 0.06, 0.04, 1.44))
  }
}

/** 台阶（薄板踏道）：n 级，dir=+1 向 +Z 下，-1 向 -Z 下 */
export function steps(a: Asm, o: {
  x: number; z: number; w: number; y: number; n: number
  riser?: number; tread?: number; dir?: 1 | -1; key?: string
}): void {
  const n = o.n
  const riser = o.riser ?? 0.16
  const tread = o.tread ?? 0.34
  const dir = o.dir ?? 1
  for (let i = 0; i < n; i++) {
    const yy = o.y + riser * (n - i) - riser / 2
    const zz = o.z + dir * (i * tread + tread / 2)
    a.box(o.key ?? 'stone', o.w, riser, tread, o.x, yy, zz)
    a.q('stoneDark', BAR, mat4(o.x, yy + riser / 2 - 0.02, zz + dir * tread * 0.42, 0, 0, 0, o.w, 0.03, tread * 0.2))
  }
  for (const sx of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const yy = o.y + riser * (n - i) + 0.24
      const zz = o.z + dir * (i * tread + tread / 2)
      a.box(o.key ?? 'stone', 0.22, 0.2 + riser * (n - i), tread, o.x + sx * (o.w / 2 + 0.11), o.y + (0.2 + riser * (n - i)) / 2, zz)
      if (i === n - 1) a.box('stone', 0.3, 0.34, 0.3, o.x + sx * (o.w / 2 + 0.11), yy + 0.1, zz)
    }
  }
}

/** 铁栅围墙段：石勒脚 + 密柱矛头栏（axis 定走向） */
export function fenceRun(a: Asm, o: { x: number; z: number; len: number; y?: number; h?: number; axis?: 'x' | 'z'; plinth?: boolean }): void {
  const y = o.y ?? 0
  const h = o.h ?? 1.3
  const g = a.sub(o.x, y, o.z, 0, o.axis === 'z' ? Math.PI / 2 : 0, 0)
  if (o.plinth !== false) g.box('stoneDark', o.len, 0.22, 0.3, 0, 0.11, 0)
  const r = g.sub(0, o.plinth === false ? 0 : 0.22, 0)
  ironRailing(r, { len: o.len, h, pitch: 0.15 })
  r.flush()
  for (const sx of [-1, 1]) {
    g.box('stone', 0.34, h + 0.5, 0.34, sx * (o.len / 2 - 0.1), (h + 0.5) / 2, 0)
    g.box('stoneDark', 0.44, 0.12, 0.44, sx * (o.len / 2 - 0.1), h + 0.56, 0)
    g.q('stone', new THREE.ConeGeometry(0.16, 0.3, 4), mat4(sx * (o.len / 2 - 0.1), h + 0.76, 0))
  }
  g.flush()
}

/** 给水水鹤（铁水柱）：石基 + 竖管 + 横臂 + 吊链 + 阀轮 + 配重 + 接水盘 */
export function waterCrane(a: Asm, o: { x: number; z: number; y?: number; h?: number; rotY?: number }): void {
  const h = o.h ?? 4.4
  const g = a.sub(o.x, o.y ?? 0, o.z, 0, o.rotY ?? 0, 0)
  g.box('stoneDark', 0.9, 0.4, 0.9, 0, 0.2, 0)
  g.cyl('cast', 0.2, 0.26, 0.5, 10, 0, 0.65, 0)
  g.cyl('ironDark', 0.15, 0.18, h, 12, 0, 0.9 + h / 2, 0)
  for (const yy of [1.6, 2.8, h * 0.8]) g.cyl('cast', 0.21, 0.21, 0.12, 12, 0, yy, 0)
  g.cyl('ironDark', 0.13, 0.13, 1.9, 12, 0.85, h + 0.7, 0, 0, 0, Math.PI / 2)
  g.cyl('cast', 0.17, 0.17, 0.2, 12, 1.72, h + 0.7, 0)
  g.cyl('iron', 0.1, 0.14, 0.7, 10, 1.72, h + 0.3, 0)
  g.cyl('cast', 0.16, 0.16, 0.06, 12, 1.72, h - 0.06, 0)
  g.box('iron', 0.1, 0.5, 0.1, 0.3, h + 0.35, 0)
  g.box('cast', 0.3, 0.4, 0.24, 0.3, h + 0.05, 0)
  g.cyl('steel', 0.16, 0.16, 0.04, 12, 0.3, h + 0.62, 0.22, Math.PI / 2, 0, 0)
  for (let i = 0; i < 4; i++) {
    const t = (Math.PI * 2 * i) / 4
    g.q('steel', BAR, mat4(0.3 + Math.cos(t) * 0.14, h + 0.62, 0.22 + Math.sin(t) * 0.14, Math.PI / 2, 0, t, 0.035, 0.035, 0.2))
  }
  g.cyl('iron', 0.015, 0.015, 1.1, 4, 1.2, h + 0.05, 0)
  g.cyl('cast', 1.0, 1.1, 0.18, 14, 1.72, 0.1, 0)
  g.box('stoneDark', 1.9, 0.16, 0.5, 0.9, 0.08, 0)
  g.flush()
}

/** 煤堆 + 挡煤矮墙 + 铲料斗（铁路后院） */
export function coalStack(a: Asm, o: { x: number; z: number; y?: number; w?: number; d?: number; h?: number }): void {
  const w = o.w ?? 3.2
  const d = o.d ?? 2.2
  const h = o.h ?? 1.3
  const y = o.y ?? 0
  a.box('ballast', w, 0.12, d, o.x, y + 0.06, o.z)
  const layers = 5
  for (let l = 0; l < layers; l++) {
    const t = l / (layers - 1)
    const wl = w * (1 - t * 0.55)
    const dl = d * (1 - t * 0.5)
    const n = Math.max(4, Math.round((wl * dl) / 0.28))
    for (let i = 0; i < n; i++) {
      const u = hash01(l * 97 + i, 41)
      const v = hash01(l * 97 + i, 43)
      const s = 0.8 + u * 0.9
      a.q('locoBlack', new THREE.IcosahedronGeometry(0.13, 0), mat4(
        o.x + (u - 0.5) * wl, y + 0.14 + l * (h / layers) + v * 0.06, o.z + (v - 0.5) * dl,
        u * 6, v * 6, u * 3, s, s * 0.8, s))
    }
  }
  for (const sz of [-1, 1]) a.box('woodDark', w + 0.2, 0.4, 0.12, o.x, y + 0.2, o.z + sz * (d / 2 + 0.1))
  for (const sx of [-1, 1]) a.box('woodDark', 0.12, 0.4, d + 0.2, o.x + sx * (w / 2 + 0.1), y + 0.2, o.z)
  a.box('ironDark', 0.6, 0.5, 0.4, o.x + w / 2 + 0.6, y + 0.4, o.z)
  a.cyl('wood', 0.05, 0.05, 1.2, 6, o.x + w / 2 + 0.9, y + 0.9, o.z, 0, 0, 0.5)
}

/** 消防栓 + 检查井 + 垃圾箱（城市家具三件套，各可单独调用） */
export function hydrant(a: Asm, o: { x: number; z: number; y?: number }): void {
  const y = o.y ?? 0
  a.cyl('signalRed', 0.2, 0.24, 0.16, 10, o.x, y + 0.08, o.z)
  a.cyl('signalRed', 0.12, 0.15, 0.62, 10, o.x, y + 0.47, o.z)
  a.sph('signalRed', 0.14, 10, 8, o.x, y + 0.8, o.z)
  for (const sx of [-1, 1]) a.cyl('signalRed', 0.06, 0.06, 0.16, 8, o.x + sx * 0.16, y + 0.6, o.z, 0, 0, Math.PI / 2)
  a.q('gold', BAR, mat4(o.x, y + 0.68, o.z, 0, 0, 0, 0.28, 0.05, 0.28))
  a.cyl('ironDark', 0.05, 0.05, 0.14, 6, o.x, y + 0.92, o.z)
}

export function manhole(a: Asm, o: { x: number; z: number; y?: number; r?: number }): void {
  const r = o.r ?? 0.36
  const y = o.y ?? 0
  a.cyl('ironDark', r, r, 0.06, 16, o.x, y + 0.03, o.z)
  a.cyl('cast', r * 0.86, r * 0.86, 0.04, 16, o.x, y + 0.07, o.z)
  for (let i = 0; i < 5; i++) a.q('ironDark', BAR, mat4(o.x, y + 0.09, o.z - r * 0.6 + i * r * 0.3, 0, 0, 0, r * 1.5, 0.02, 0.05))
  a.q('cast', new THREE.TorusGeometry(r, 0.05, 6, 16), mat4(o.x, y + 0.05, o.z, Math.PI / 2, 0, 0))
}

export function wasteBin(a: Asm, o: { x: number; z: number; y?: number; rotY?: number }): void {
  const g = a.sub(o.x, o.y ?? 0, o.z, 0, o.rotY ?? 0, 0)
  g.cyl('cast', 0.24, 0.2, 0.7, 12, 0, 0.35, 0)
  for (let i = 0; i < 6; i++) g.q('ironDark', BAR, mat4(0, 0.14 + i * 0.1, 0, 0, 0, 0, 0.5, 0.03, 0.5))
  g.cyl('cast', 0.28, 0.28, 0.08, 12, 0, 0.72, 0)
  g.cyl('ironDark', 0.1, 0.14, 0.1, 12, 0, 0.8, 0)
  g.box('cast', 0.3, 0.06, 0.3, 0, 0.03, 0)
  g.flush()
}

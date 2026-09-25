import * as THREE from 'three'
import { Asm, mat4, on } from './asm'

const BAR = new THREE.BoxGeometry(1, 1, 1)

type Glyph = { w: number; bars: Array<[number, number, number, number, number]> }  // x, y, w, h, rot（单位字高 1）

const G_I: Glyph = { w: 0.22, bars: [[0, 0, 0.17, 1, 0]] }
const G_V: Glyph = { w: 0.64, bars: [[-0.16, 0, 0.17, 1.04, 0.3], [0.16, 0, 0.17, 1.04, -0.3]] }
const G_X: Glyph = { w: 0.64, bars: [[0, 0, 0.17, 1.06, 0.62], [0, 0, 0.17, 1.06, -0.62]] }

const ROMAN: string[][] = [
  ['I'], ['II'], ['III'], ['IV'], ['V'], ['VI'],
  ['VII'], ['VIII'], ['IX'], ['X'], ['X', 'I'], ['X', 'II'],
]

/** 罗马数字（I~XII）：用细方块拼字，钟盘上读作真字而非贴图 */
function numeralBars(n: number, s: number): Array<[number, number, number, number, number]> {
  const parts = ROMAN[(((n - 1) % 12) + 12) % 12]
  const glyphs = parts.map((p) => (p === 'I' ? G_I : p === 'V' ? G_V : G_X))
  const gap = 0.1 * s
  const total = glyphs.reduce((acc, g) => acc + g.w * s, 0) + gap * (glyphs.length - 1)
  const out: Array<[number, number, number, number, number]> = []
  let x = -total / 2
  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i]
    for (const b of g.bars) out.push([x + (b[0] + g.w / 2) * s, b[1] * s, b[2] * s, b[3] * s, b[4]])
    x += g.w * s + gap
  }
  return out
}

/** 钟盘（法线朝 +Z；ry 转向）：石套环 + 鎏金环 + 珐琅面 + 12 罗马数字 +
 *  60 分钟刻度 + 时针分针（含配重与鎏金镂空）+ 中心座 + 玻璃护罩格条 */
export function clockFace(a: Asm, o: {
  x: number; y: number; z: number; r: number; ry?: number
  hour?: number; minute?: number; dialKey?: string; ringKey?: string; caseKey?: string
  guard?: boolean; keystone?: boolean
}): void {
  const r = o.r
  const ry = o.ry ?? 0
  const c = mat4(o.x, o.y, o.z, 0, ry, 0)
  const dialKey = o.dialKey ?? 'white'
  const ringKey = o.ringKey ?? 'gold'
  const caseKey = o.caseKey ?? 'stone'

  // 石外壳 + 四向键石 + 滴水线
  a.q(caseKey, new THREE.CylinderGeometry(r * 1.34, r * 1.4, 0.34, 28), on(c, 0, 0, -0.1, Math.PI / 2, 0, 0))
  a.q(caseKey, new THREE.CylinderGeometry(r * 1.2, r * 1.2, 0.24, 28), on(c, 0, 0, 0.06, Math.PI / 2, 0, 0))
  if (o.keystone !== false) {
    for (let i = 0; i < 4; i++) {
      const t = (Math.PI * i) / 2
      a.q(caseKey, BAR, on(c, Math.cos(t) * r * 1.36, Math.sin(t) * r * 1.36, 0.1, 0, 0, t, 0.3, 0.52, 0.2))
    }
  }
  // 鎏金环 + 珐琅面
  a.q(ringKey, new THREE.TorusGeometry(r * 1.06, 0.075, 8, 30), on(c, 0, 0, 0.14))
  a.q(dialKey, new THREE.CylinderGeometry(r, r, 0.14, 30), on(c, 0, 0, 0.1, Math.PI / 2, 0, 0))
  a.q(ringKey, new THREE.TorusGeometry(r * 0.98, 0.035, 6, 30), on(c, 0, 0, 0.19))

  // 分钟刻度（60 格，逢五加长加宽）
  for (let i = 0; i < 60; i++) {
    const t = (Math.PI * 2 * i) / 60
    const major = i % 5 === 0
    const rr = r * (major ? 0.88 : 0.92)
    a.q(major ? ringKey : 'ironDark', BAR,
      on(c, Math.cos(t) * rr, Math.sin(t) * rr, 0.19, 0, 0, t + Math.PI / 2, major ? 0.06 : 0.035, major ? 0.2 : 0.12, 0.03))
  }
  // 罗马数字
  for (let n = 1; n <= 12; n++) {
    const t = Math.PI / 2 - (Math.PI * 2 * n) / 12
    const rr = r * 0.7
    const nc = on(c, Math.cos(t) * rr, Math.sin(t) * rr, 0.2)
    const s = r * 0.34
    for (const b of numeralBars(n, s)) {
      a.q('ironDark', BAR, on(nc, b[0], b[1], 0, 0, 0, b[4], b[2], b[3], 0.035))
    }
  }
  // 时针（宽短、带配重与镂空菱形）
  const ha = Math.PI / 2 - (Math.PI * 2 * ((o.hour ?? 10) % 12 + (o.minute ?? 10) / 60)) / 12
  const ma = Math.PI / 2 - (Math.PI * 2 * (o.minute ?? 10)) / 60
  const hand = (ang: number, len: number, w: number, key: string, zc: number) => {
    const hc = on(c, 0, 0, zc, 0, 0, ang)
    a.q(key, BAR, on(hc, 0, len * 0.42, 0, 0, 0, 0, w, len * 0.92, 0.05))
    a.q(key, BAR, on(hc, 0, len * 0.9, 0, 0, 0, 0, w * 0.6, len * 0.2, 0.05))
    a.q(key, new THREE.ConeGeometry(w * 0.5, len * 0.16, 4), on(hc, 0, len * 1.06, 0))
    a.q(key, BAR, on(hc, 0, -len * 0.2, 0, 0, 0, 0, w * 1.3, len * 0.34, 0.05))
    a.q(ringKey, BAR, on(hc, 0, len * 0.5, 0.04, 0, 0, Math.PI / 4, w * 0.5, w * 0.5, 0.03))
  }
  hand(ha, r * 0.52, 0.16 * (r / 1.6), 'ironDark', 0.24)
  hand(ma, r * 0.76, 0.12 * (r / 1.6), 'ironDark', 0.28)
  a.q(ringKey, new THREE.CylinderGeometry(r * 0.09, r * 0.09, 0.16, 12), on(c, 0, 0, 0.28, Math.PI / 2, 0, 0))
  a.q(ringKey, new THREE.SphereGeometry(r * 0.07, 10, 8), on(c, 0, 0, 0.36))

  // 玻璃护罩 + 放射格条
  if (o.guard !== false) {
    a.q('glass', new THREE.CylinderGeometry(r * 0.97, r * 0.97, 0.05, 26), on(c, 0, 0, 0.4, Math.PI / 2, 0, 0))
    for (let i = 0; i < 8; i++) {
      const t = (Math.PI * 2 * i) / 8
      a.q(ringKey, BAR, on(c, Math.cos(t) * r * 0.49, Math.sin(t) * r * 0.49, 0.44, 0, 0, t + Math.PI / 2, 0.05, 0.04, r * 0.98))
    }
    a.q(ringKey, new THREE.TorusGeometry(r * 0.97, 0.045, 6, 26), on(c, 0, 0, 0.44))
  }
}

/** 双面吊钟（站台用）：牛腿支架 + 两面钟盘 + 吊杆 + 顶饰 */
export function hangingClock(a: Asm, o: { x: number; y: number; z: number; r?: number; rotY?: number; hour?: number; minute?: number }): void {
  const r = o.r ?? 0.5
  const c = a.sub(o.x, o.y, o.z, 0, o.rotY ?? 0, 0)
  c.box('iron', 0.14, 0.14, 0.9, 0, 0, -0.45)
  c.box('iron', 0.5, 0.1, 0.1, 0, -0.16, -0.05)
  c.cyl('iron', 0.05, 0.05, 0.4, 6, 0, -0.3, 0)
  for (const sz of [1, -1]) {
    clockFace(c, { x: 0, y: -0.62, z: sz * 0.16, r, ry: sz === 1 ? 0 : Math.PI, hour: o.hour ?? 10, minute: o.minute ?? 10, caseKey: 'iron', ringKey: 'gold', guard: false, keystone: false })
  }
  c.cyl('gold', 0.08, 0.12, 0.16, 8, 0, -0.62 - r * 1.42, 0)
  c.sph('gold', 0.09, 8, 6, 0, -0.62 - r * 1.55, 0)
  c.flush()
}

/** 发车时刻牌：吊杆 + 铁框 + 深色板面 + 行列「字块」+ 站台号 + 罩灯 */
export function departureBoard(a: Asm, o: { x: number; y: number; z: number; w?: number; h?: number; rotY?: number; rows?: number }): void {
  const w = o.w ?? 2.6
  const h = o.h ?? 1.0
  const rows = o.rows ?? 4
  const g = a.sub(o.x, o.y, o.z, 0, o.rotY ?? 0, 0)
  for (const sx of [-w * 0.34, w * 0.34]) g.cyl('iron', 0.03, 0.03, 0.7, 6, sx, 0.35 + h / 2, 0)
  g.box('ironDark', w + 0.2, h + 0.2, 0.1, 0, h / 2, 0)
  g.box('locoBlack', w, h, 0.08, 0, h / 2, 0.05)
  g.box('gold', w + 0.24, 0.06, 0.14, 0, h + 0.13, 0)
  g.box('gold', w + 0.24, 0.06, 0.14, 0, -0.03, 0)
  for (const sx of [-1, 1]) g.box('gold', 0.06, h + 0.2, 0.14, sx * (w / 2 + 0.07), h / 2, 0)
  for (let r = 0; r < rows; r++) {
    const yy = h - 0.16 - (r * (h - 0.28)) / Math.max(1, rows - 1)
    const cells = 12 - (r % 3)
    for (let i = 0; i < cells; i++) {
      const wide = (i * 5 + r * 3) % 4 === 0
      g.q(r === 0 ? 'gold' : 'white', BAR, mat4(-w / 2 + 0.3 + (i * (w - 0.7)) / Math.max(1, cells - 1), yy, 0.1, 0, 0, 0, wide ? 0.16 : 0.09, 0.09, 0.02))
    }
    g.q('gold', BAR, mat4(0, yy - 0.09, 0.09, 0, 0, 0, w - 0.2, 0.015, 0.01))
  }
  for (const sx of [-1, 1]) {
    g.cyl('iron', 0.03, 0.03, 0.3, 6, sx * w * 0.4, h + 0.26, 0.1, 0.5, 0, 0)
    g.cyl('cast', 0.05, 0.14, 0.16, 10, sx * w * 0.4, h + 0.36, 0.24, 1.1, 0, 0)
    g.cyl('glow', 0.07, 0.07, 0.03, 8, sx * w * 0.4, h + 0.3, 0.3, 1.1, 0, 0)
  }
  g.flush()
}

/** 站台号牌：立柱 + 圆牌 + 鎏金环 + 编号块 */
export function platformSign(a: Asm, o: { x: number; z: number; y?: number; h?: number; digits?: number[] }): void {
  const h = o.h ?? 3.2
  const g = a.sub(o.x, o.y ?? 0, o.z)
  g.box('stoneDark', 0.42, 0.2, 0.42, 0, 0.1, 0)
  g.cyl('cast', 0.09, 0.12, h, 10, 0, h / 2, 0)
  g.cyl('gold', 0.12, 0.12, 0.08, 10, 0, h * 0.72, 0)
  g.cyl('white', 0.42, 0.42, 0.08, 20, 0, h + 0.3, 0, Math.PI / 2, 0, 0)
  g.cyl('gold', 0.44, 0.44, 0.05, 20, 0, h + 0.3, -0.03, Math.PI / 2, 0, 0)
  g.cyl('locoGreen', 0.4, 0.4, 0.06, 20, 0, h + 0.3, 0.05, Math.PI / 2, 0, 0)
  const d = o.digits ?? [1]
  for (let i = 0; i < d.length; i++) {
    const xx = (i - (d.length - 1) / 2) * 0.26
    for (const b of numeralBars(d[i], 0.22)) {
      g.q('white', BAR, mat4(xx + b[0], h + 0.3 + b[1], 0.09, 0, 0, b[4], b[2], b[3], 0.02))
    }
  }
  g.cyl('iron', 0.05, 0.09, 0.2, 8, 0, h + 0.72, 0)
  g.sph('gold', 0.07, 8, 6, 0, h + 0.84, 0)
  g.flush()
}

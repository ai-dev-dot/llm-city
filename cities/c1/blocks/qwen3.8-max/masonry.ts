import * as THREE from 'three'
import { Asm, mat4, on } from './asm'

const BAR = new THREE.BoxGeometry(1, 1, 1)
const SCALE = new THREE.BoxGeometry(1, 1, 1)

/** 半圆券石环（gauged arch）：以 (x, ySpring) 为券心，沿半径排楔形券石，
 *  石间留缝读作灰缝阴影，隔块外凸 0.05 做「砌券起伏」，拱心石可加大。
 *  ry=0 时券面法线朝 +Z（南北立面）；ry=±π/2 时朝 ±X（东西山墙）。 */
export function voussoirArch(a: Asm, o: {
  x: number; ySpring: number; z: number; r: number
  rIn?: number; stones?: number; depth?: number; key?: string
  startDeg?: number; endDeg?: number; ry?: number; keystone?: boolean
  alternate?: boolean; reveal?: number
}): void {
  const key = o.key ?? 'stone'
  const depth = o.depth ?? 0.42
  const rIn = o.rIn ?? o.r
  const rOut = o.r + (o.reveal ?? 0.22)
  const stones = o.stones ?? 13
  const a0 = THREE.MathUtils.degToRad(o.startDeg ?? 0)
  const a1 = THREE.MathUtils.degToRad(o.endDeg ?? 180)
  const gap = THREE.MathUtils.degToRad(0.9)
  for (let i = 0; i < stones; i++) {
    const s0 = a0 + ((a1 - a0) * i) / stones + gap / 2
    const s1 = a0 + ((a1 - a0) * (i + 1)) / stones - gap / 2
    const isKey = o.keystone !== false && i === Math.floor(stones / 2) && stones % 2 === 1
    const ro = isKey ? rOut + 0.16 : rOut + (o.alternate !== false && i % 2 === 1 ? 0.05 : 0)
    const sh = new THREE.Shape()
    sh.moveTo(rIn * Math.cos(s0), rIn * Math.sin(s0))
    sh.absarc(0, 0, rIn, s0, s1, false)
    sh.lineTo(ro * Math.cos(s1), ro * Math.sin(s1))
    sh.absarc(0, 0, ro, s1, s0, true)
    sh.closePath()
    a.qExtrude(key, sh, isKey ? depth + 0.1 : depth, o.x, o.ySpring, o.z, 0, o.ry ?? 0, 0, 5)
    if (isKey) {
      // 拱心石下吊一块雕饰牛腿
      const km = mat4(o.x, o.ySpring, o.z, 0, o.ry ?? 0, 0)
      a.q(key, BAR, on(km, 0, rOut + 0.24, 0, 0, 0, 0, 0.3, 0.34, depth + 0.14))
      a.q('stoneDark', new THREE.ConeGeometry(0.13, 0.26, 4), on(km, 0, rOut + 0.02, 0, Math.PI, 0, 0))
    }
  }
}

/** 圆窗（oculus）：券石环 + 放射铁棂 + 玻璃 + 中心圆饰 */
export function oculus(a: Asm, o: { x: number; y: number; z: number; r: number; ry?: number; spokes?: number; key?: string }): void {
  const key = o.key ?? 'stone'
  const spokes = o.spokes ?? 12
  voussoirArch(a, {
    x: o.x, ySpring: o.y, z: o.z, r: o.r, rIn: o.r - 0.02, stones: spokes * 2,
    depth: 0.3, key, startDeg: 0, endDeg: 360, ry: o.ry, keystone: false, alternate: false, reveal: 0.16,
  })
  const c = mat4(o.x, o.y, o.z, 0, o.ry ?? 0, 0)
  a.q('glass', new THREE.CircleGeometry(o.r - 0.04, 20), on(c, 0, 0, -0.06))
  for (let i = 0; i < spokes; i++) {
    const t = (Math.PI * 2 * i) / spokes
    a.q('iron', BAR, on(c, Math.cos(t) * (o.r - 0.06) / 2, Math.sin(t) * (o.r - 0.06) / 2, 0, 0, 0, t, o.r - 0.1, 0.05, 0.09))
  }
  for (const rr of [o.r * 0.42, o.r * 0.74]) {
    for (let i = 0; i < 16; i++) {
      const t = (Math.PI * 2 * i) / 16
      a.q('iron', BAR, on(c, Math.cos(t) * rr, Math.sin(t) * rr, 0, 0, 0, t + Math.PI / 2, 0.06, 0.05, rr * 0.42))
    }
  }
  a.q('gold', new THREE.CylinderGeometry(0.14, 0.14, 0.14, 10), on(c, 0, 0, 0.06, Math.PI / 2, 0, 0))
  a.q('gold', new THREE.SphereGeometry(0.1, 8, 6), on(c, 0, 0, 0.14))
}

/** 檐口（古典三层）：托檐齿饰 modillion + 齿饰 dentil + 冠板 corona + 上沿 fillet。
 *  axis='x' 时沿 X 展开、挑出方向 +Z；axis='z' 时沿 Z 展开、挑出 +X。 */
export function cornice(a: Asm, o: {
  len: number; x: number; y: number; z: number; axis?: 'x' | 'z'
  proj?: number; modillions?: number; dentils?: number; key?: string; sign?: 1 | -1
}): void {
  const key = o.key ?? 'stone'
  const p = o.proj ?? 0.62
  const s = o.sign ?? 1
  const axis = o.axis ?? 'x'
  const L = (v: number) => (axis === 'x' ? v : 0)
  const D = (v: number) => (axis === 'z' ? v : 0)
  const along = (w: number, h: number, t: number, dx: number, dy: number, dz: number, k = key) => {
    a.box(k, axis === 'x' ? w : t, h, axis === 'x' ? t : w, o.x + L(dx) + D(dz), o.y + dy, o.z + D(dx) + L(dz))
  }
  // 床板 + 齿饰带
  along(o.len, 0.16, p * 0.55, 0, 0.08, s * p * 0.22)
  const dn = o.dentils ?? Math.round(o.len / 0.34)
  for (let i = 0; i < dn; i++) {
    const t = -o.len / 2 + (o.len * (i + 0.5)) / dn
    a.q(key, BAR, mat4(o.x + L(t) + D(s * p * 0.5), o.y + 0.24, o.z + D(t) + L(s * p * 0.5), 0, 0, 0,
      axis === 'x' ? 0.17 : 0.2, 0.16, axis === 'x' ? 0.2 : 0.17))
  }
  // 托檐齿饰（牛腿）
  const mn = o.modillions ?? Math.max(3, Math.round(o.len / 1.15))
  for (let i = 0; i <= mn; i++) {
    const t = -o.len / 2 + (o.len * i) / mn
    const cx = o.x + L(t) + D(s * p * 0.34)
    const cz = o.z + D(t) + L(s * p * 0.34)
    const rx = axis === 'x' ? s * -0.22 : 0
    const rz = axis === 'z' ? s * 0.22 : 0
    a.box(key, axis === 'x' ? 0.3 : 0.46, 0.36, axis === 'x' ? 0.46 : 0.3, cx, o.y + 0.5, cz, rx, 0, rz)
    a.box(key, axis === 'x' ? 0.22 : 0.3, 0.18, axis === 'x' ? 0.3 : 0.22, cx, o.y + 0.73, cz)
  }
  // 冠板 + 上沿
  along(o.len, 0.24, p, 0, 0.9, s * p * 0.5)
  along(o.len, 0.1, p * 0.62, 0, 1.07, s * p * 0.31)
  along(o.len, 0.14, p * 0.34, 0, 1.19, s * p * 0.17)
}

/** 石栏杆（balustrade）：地栿 + 瓶形望柱（车旋剖面）+ 扶手 + 端部方墩 + 可选石盆 */
export function balustrade(a: Asm, o: {
  len: number; x: number; y: number; z: number; axis?: 'x' | 'z'
  h?: number; n?: number; key?: string; urn?: boolean; pierEvery?: number
}): void {
  const key = o.key ?? 'stone'
  const h = o.h ?? 1.05
  const axis = o.axis ?? 'x'
  const n = o.n ?? Math.max(3, Math.round(o.len / 0.42))
  const pts: THREE.Vector2[] = [
    [0.1, 0], [0.125, 0.05], [0.075, 0.14], [0.055, 0.26], [0.07, 0.36],
    [0.1, 0.46], [0.085, 0.56], [0.055, 0.64], [0.062, 0.72], [0.09, 0.8],
  ].map(([r, y]) => new THREE.Vector2(r * (h / 1.05), y * (h / 0.86)))
  const geo = new THREE.LatheGeometry(pts, 10)
  const pierEvery = o.pierEvery ?? 0
  for (let i = 0; i <= n; i++) {
    const t = -o.len / 2 + (o.len * i) / n
    const px = o.x + (axis === 'x' ? t : 0)
    const pz = o.z + (axis === 'z' ? t : 0)
    if (pierEvery && i % pierEvery === 0) {
      a.box(key, 0.34, h + 0.16, 0.34, px, o.y + (h + 0.16) / 2, pz)
      a.box(key, 0.44, 0.1, 0.44, px, o.y + h + 0.2, pz)
      if (o.urn) {
        a.cyl(key, 0.14, 0.18, 0.16, 10, px, o.y + h + 0.33, pz)
        a.cyl('stoneDark', 0.1, 0.13, 0.24, 10, px, o.y + h + 0.51, pz)
        a.sph(key, 0.12, 8, 6, px, o.y + h + 0.68, pz)
      }
      continue
    }
    a.mesh(geo, key, px, o.y + 0.16, pz)
  }
  const rail = (w: number, hgt: number, d: number, dy: number, k = key) => {
    a.box(k, axis === 'x' ? o.len + 0.1 : w, hgt, axis === 'x' ? d : o.len + 0.1, o.x, o.y + dy, o.z)
  }
  rail(0.3, 0.16, 0.34, 0.08)
  rail(0.34, 0.12, 0.4, h + 0.06)
  rail(0.24, 0.07, 0.3, h + 0.15)
}

/** 隅石（quoin）：转角长短交替石块，跨骑在墙角上（两面都读出砌法）
 *  axis = 墙体延伸方向；(x,z) 为墙角中心线；d 为跨墙厚度（略大于墙厚即凸出） */
export function quoins(a: Asm, o: {
  x: number; z: number; y0: number; y1: number; axis?: 'x' | 'z'
  long?: number; short?: number; d?: number; n?: number; key?: string
}): void {
  const key = o.key ?? 'stone'
  const n = o.n ?? Math.max(4, Math.round((o.y1 - o.y0) / 0.72))
  const axis = o.axis ?? 'x'
  const d = o.d ?? 0.44
  for (let i = 0; i < n; i++) {
    const yy = o.y0 + ((o.y1 - o.y0) * (i + 0.5)) / n
    const hh = (o.y1 - o.y0) / n - 0.05
    const w = i % 2 === 0 ? (o.long ?? 0.66) : (o.short ?? 0.42)
    a.q(key, BAR, mat4(o.x, yy, o.z, 0, 0, 0,
      axis === 'x' ? w : d, hh, axis === 'x' ? d : w))
  }
}

/** 粗砌基座（rustication）：实体基座 + 错缝石块贴面 + 灰缝凹线，读作厚重石工 */
export function rusticatedBase(a: Asm, o: {
  w: number; d: number; h: number; x: number; y: number; z: number
  rows?: number; perRow?: number; key?: string; faceKey?: string
}): void {
  const key = o.key ?? 'stoneDark'
  const rows = o.rows ?? 3
  const per = o.perRow ?? Math.max(3, Math.round(o.w / 1.5))
  const rh = o.h / rows
  const bw = o.w / per
  a.box(key, o.w, o.h, o.d, o.x, o.y + o.h / 2, o.z)
  for (let r = 0; r < rows; r++) {
    const yy = o.y + rh * (r + 0.5)
    const shift = (r % 2) * bw * 0.5
    for (let c = -1; c <= per; c++) {
      const xx = o.x - o.w / 2 + (c + 0.5) * bw + shift
      if (xx - bw / 2 < o.x - o.w / 2 - 0.02 || xx + bw / 2 > o.x + o.w / 2 + 0.02) continue
      for (const sz of [1, -1]) {
        a.q(o.faceKey ?? 'stone', BAR, mat4(xx, yy, o.z + sz * (o.d / 2 + 0.035), 0, 0, 0, bw - 0.07, rh - 0.07, 0.07))
      }
    }
  }
  for (let r = 1; r < rows; r++) {
    const yy = o.y + rh * r
    for (const sz of [1, -1]) {
      a.q('pavingDark', BAR, mat4(o.x, yy, o.z + sz * (o.d / 2 + 0.02), 0, 0, 0, o.w, 0.05, 0.05))
    }
  }
}

/** 砖砌线脚：水平腰线 + 齿形叠涩（corbel table），沿 X 或 Z 通长 */
export function stringCourse(a: Asm, o: {
  len: number; x: number; y: number; z: number; axis?: 'x' | 'z'
  proj?: number; key?: string; corbels?: number; sign?: 1 | -1
}): void {
  const key = o.key ?? 'brickDark'
  const axis = o.axis ?? 'x'
  const p = o.proj ?? 0.16
  const s = o.sign ?? 1
  const put = (w: number, h: number, t: number, dx: number, dy: number, dz: number, k = key) => {
    a.box(k, axis === 'x' ? w : t, h, axis === 'x' ? t : w,
      o.x + (axis === 'x' ? dx : s * dz), o.y + dy, o.z + (axis === 'z' ? dx : s * dz))
  }
  put(o.len, 0.1, p, 0, 0.05, s * p / 2)
  put(o.len, 0.06, p * 1.5, 0, 0.13, s * p * 0.75)
  const n = o.corbels ?? Math.round(o.len / 0.42)
  for (let i = 0; i < n; i++) {
    const t = -o.len / 2 + (o.len * (i + 0.5)) / n
    a.q(key, BAR, mat4(
      o.x + (axis === 'x' ? t : s * p * 0.6), o.y - 0.09, o.z + (axis === 'z' ? t : s * p * 0.6),
      0, 0, 0, axis === 'x' ? 0.18 : p * 1.1, 0.2, axis === 'x' ? p * 1.1 : 0.18))
  }
}

/** 尖顶鱼鳞瓦（铜绿）：四坡面各建「基边中点为原点、+Z 上坡、+Y 法线」的斜面局部系，
 *  逐行铺瓦（行间错缝、越往上越窄），末行做檐口板与鎏金线 */
export function spireScales(a: Asm, o: {
  w: number; y0: number; y1: number; x?: number; z?: number
  rowH?: number; scaleW?: number; key?: string; faces?: number; eave?: boolean
}): void {
  const key = o.key ?? 'patina'
  const w = o.w
  const hs = o.y1 - o.y0
  const Ls = Math.hypot(hs, w)
  const gamma = Math.atan2(w, hs)
  const rowH = o.rowH ?? 0.24
  const sw = o.scaleW ?? 0.26
  const faces = o.faces ?? 4
  for (let f = 0; f < faces; f++) {
    const phi = (Math.PI * 2 * f) / faces
    const face = a.sub(o.x ?? 0, o.y0, o.z ?? 0, 0, phi, 0)
    const sl = face.sub(0, 0, w, gamma, 0, 0)
    const rows = Math.floor(Ls / rowH)
    for (let r = 0; r < rows; r++) {
      const u = r * rowH + rowH * 0.5
      const half = w * (1 - u / Ls) - 0.05
      if (half < sw * 0.6) continue
      const per = Math.max(1, Math.round((half * 2) / sw))
      for (let i = 0; i < per; i++) {
        const x = -half + ((i + 0.5) * half * 2) / per + (r % 2 ? sw * 0.42 : 0)
        if (Math.abs(x) > half + sw * 0.2) continue
        sl.q(key, SCALE, mat4(x, 0.03 + (r % 2) * 0.014, u, 0, 0, 0, sw * 0.94, 0.055, rowH * 1.3))
      }
    }
    if (o.eave !== false) {
      sl.box('patinaLight', w * 2 + 0.14, 0.16, 0.36, 0, 0.1, -0.08)
      sl.box('gold', w * 2 + 0.18, 0.06, 0.12, 0, 0.21, -0.14)
      for (let i = 0; i < 8; i++) {
        sl.q('patina', new THREE.ConeGeometry(0.07, 0.2, 4), mat4(-w + ((i + 0.5) * w * 2) / 8, 0.24, -0.16, Math.PI, 0, 0))
      }
    }
  }
}

/** 百叶窗（louvred opening）：石框 + 斜叶片阵列，钟楼钟层与通风口用 */
export function louvre(a: Asm, o: {
  w: number; h: number; x: number; y: number; z: number; ry?: number
  slats?: number; key?: string; frame?: boolean
}): void {
  const key = o.key ?? 'woodDark'
  const n = o.slats ?? Math.max(4, Math.round(o.h / 0.22))
  const c = mat4(o.x, o.y, o.z, 0, o.ry ?? 0, 0)
  if (o.frame !== false) {
    a.q('stone', BAR, on(c, 0, o.h / 2, 0.02, 0, 0, 0, o.w + 0.24, 0.14, 0.3))
    a.q('stone', BAR, on(c, 0, -o.h / 2 + 0.07, 0.02, 0, 0, 0, o.w + 0.24, 0.14, 0.3))
    for (const sx of [-1, 1]) a.q('stone', BAR, on(c, sx * (o.w / 2 + 0.06), 0, 0.02, 0, 0, 0, 0.14, o.h, 0.3))
  }
  a.q('ironDark', BAR, on(c, 0, 0, -0.08, 0, 0, 0, o.w, o.h, 0.06))
  for (let i = 0; i < n; i++) {
    const yy = -o.h / 2 + ((i + 0.5) * o.h) / n
    a.q(key, BAR, on(c, 0, yy, 0, 0.62, 0, 0, o.w - 0.06, 0.045, 0.26))
  }
  for (const sx of [-1, 1]) a.q('iron', BAR, on(c, sx * (o.w / 2 - 0.1), 0, 0.06, 0, 0, 0, 0.06, o.h, 0.06))
}

/** 铭牌（抽象铭文）：石框 + 底板 + 行列字符块（不写字，用块阵读作铭文） */
export function plaque(a: Asm, o: {
  w: number; h: number; x: number; y: number; z: number; ry?: number
  rows?: number; cols?: number; key?: string
}): void {
  const rows = o.rows ?? 2
  const cols = o.cols ?? 9
  const c = mat4(o.x, o.y, o.z, 0, o.ry ?? 0, 0)
  a.q('stone', BAR, on(c, 0, 0, 0, 0, 0, 0, o.w + 0.3, o.h + 0.3, 0.16))
  a.q('stoneDark', BAR, on(c, 0, 0, 0.09, 0, 0, 0, o.w, o.h, 0.08))
  a.q('gold', BAR, on(c, 0, 0, 0.14, 0, 0, 0, o.w - 0.16, o.h - 0.16, 0.02))
  for (let r = 0; r < rows; r++) {
    const yy = (rows === 1 ? 0 : (r - (rows - 1) / 2) * (o.h * 0.34))
    const used = r === rows - 1 ? Math.max(3, cols - 3) : cols
    for (let i = 0; i < used; i++) {
      const xx = ((i - (used - 1) / 2) * (o.w - 0.5)) / Math.max(1, used - 1)
      const wide = (i * 7 + r * 3) % 5 === 0
      a.q('goldPale', BAR, on(c, xx, yy, 0.16, 0, 0, 0, wide ? 0.2 : 0.12, o.h * 0.2, 0.04))
    }
  }
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    a.q('gold', new THREE.SphereGeometry(0.07, 6, 5), on(c, sx * (o.w / 2 + 0.06), sy * (o.h / 2 + 0.06), 0.1))
  }
}

/** 拱窗单元：石套线 + 券石 + 窗台 + 井字铁棂玻璃（直段 + 半圆券心扇形棂） */
export function archedWindow(a: Asm, o: {
  w: number; h: number; x: number; y: number; z: number; ry?: number
  key?: string; glassKey?: string; bars?: number; voussoirs?: number; sill?: boolean
}): void {
  const key = o.key ?? 'stone'
  const c = mat4(o.x, o.y, o.z, 0, o.ry ?? 0, 0)
  const r = o.w / 2
  const straight = Math.max(0.2, o.h - r)
  const gk = o.glassKey ?? 'glassDeep'
  // 玻璃：直段方片 + 券心半圆片
  a.q(gk, BAR, on(c, 0, straight / 2, -0.06, 0, 0, 0, o.w - 0.08, straight, 0.06))
  a.q(gk, new THREE.CircleGeometry(r - 0.04, 18, 0, Math.PI), on(c, 0, straight, -0.06))
  // 铁棂：直段竖棂 + 横棂，券心放射棂 + 两道弧棂
  const bars = o.bars ?? 3
  for (let i = 1; i <= bars; i++) {
    const xx = -o.w / 2 + (o.w * i) / (bars + 1)
    a.q('iron', BAR, on(c, xx, straight / 2, 0.02, 0, 0, 0, 0.055, straight, 0.06))
  }
  for (let i = 1; i < 4; i++) {
    a.q('iron', BAR, on(c, 0, (straight * i) / 4, 0.02, 0, 0, 0, o.w - 0.1, 0.055, 0.06))
  }
  for (let i = 0; i < 7; i++) {
    const t = Math.PI - (Math.PI * i) / 6
    a.q('iron', BAR, on(c, Math.cos(t) * (r - 0.08) / 2, straight + Math.sin(t) * (r - 0.08) / 2, 0.02, 0, 0, t, r - 0.1, 0.05, 0.06))
  }
  for (const rr of [r * 0.4, r * 0.72]) {
    for (let i = 0; i < 9; i++) {
      const t = Math.PI - (Math.PI * i) / 8
      a.q('iron', BAR, on(c, Math.cos(t) * rr, straight + Math.sin(t) * rr, 0.02, 0, 0, t + Math.PI / 2, 0.055, 0.05, rr * 0.42))
    }
  }
  a.q('gold', new THREE.CylinderGeometry(0.1, 0.1, 0.1, 8), on(c, 0, straight, 0.04, Math.PI / 2, 0, 0))
  // 石套线
  for (const sx of [-1, 1]) a.q(key, BAR, on(c, sx * (o.w / 2 + 0.1), straight / 2, 0.06, 0, 0, 0, 0.2, straight + 0.1, 0.34))
  voussoirArch(a, {
    x: o.x, ySpring: o.y + straight, z: o.z, r: r + 0.1, rIn: r - 0.02,
    stones: o.voussoirs ?? 9, depth: 0.34, key, ry: o.ry, reveal: 0.14,
  })
  if (o.sill !== false) {
    a.q(key, BAR, on(c, 0, -0.08, 0.1, 0, 0, 0, o.w + 0.5, 0.16, 0.42))
    a.q('stoneDark', BAR, on(c, 0, -0.19, 0.08, 0, 0, 0, o.w + 0.36, 0.08, 0.3))
    for (const sx of [-1, 1]) a.q(key, BAR, on(c, sx * (o.w / 2 + 0.14), -0.3, 0.1, 0, 0, 0, 0.16, 0.2, 0.34))
  }
}

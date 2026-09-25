import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'

const mk = (g: THREE.BufferGeometry, m: THREE.Material) => { const o = new THREE.Mesh(g, m); o.castShadow = true; return o }

/** 盒体，y 为底 */
const bx = (w: number, h: number, d: number, m: THREE.Material, x: number, yb: number, z: number): THREE.Mesh => {
  const o = mk(new THREE.BoxGeometry(w, h, d), m)
  o.position.set(x, yb + h / 2, z)
  return o
}
/** 圆柱，y 为底 */
const cyl = (rt: number, rb: number, h: number, seg: number, m: THREE.Material, x: number, yb: number, z: number): THREE.Mesh => {
  const o = mk(new THREE.CylinderGeometry(rt, rb, h, seg), m)
  o.position.set(x, yb + h / 2, z)
  return o
}

// ---- 参数化材质（纯色/金属度/粗糙度/自发光，禁贴图）----
const GRASS = stdMaterial('#8C9E8B', { roughness: 0.95, emissive: '#5F7060', emissiveIntensity: 0.3 })
const PAVE = stdMaterial('#C4C1BA', { roughness: 0.9 })
const PAVE_DARK = stdMaterial('#A8A5A0', { roughness: 0.9 })
const STONE = stdMaterial('#D9D6CF', { roughness: 0.85 })
const STONE_DIM = stdMaterial('#7C7A76', { roughness: 0.8 })
const GLASS = stdMaterial('#43607E', { metalness: 0.55, roughness: 0.2, emissive: '#2A4058', emissiveIntensity: 0.4 })
const GLASS_IN = stdMaterial('#314B63', { metalness: 0.45, roughness: 0.35, emissive: '#22374C', emissiveIntensity: 0.3 })
const GLASS_LIT = stdMaterial('#4E6C88', { metalness: 0.5, roughness: 0.22, emissive: '#3A5670', emissiveIntensity: 0.55 })
const FRAME = stdMaterial('#A8A5A0', { metalness: 0.85, roughness: 0.3 })
const FRAME_DARK = stdMaterial('#3E3C3A', { metalness: 0.6, roughness: 0.45 })
const STEEL = stdMaterial('#56697C', { metalness: 0.7, roughness: 0.35 })
const ORANGE = stdMaterial('#FF6900', { metalness: 0.3, roughness: 0.4, emissive: '#FF6900', emissiveIntensity: 1.2 })
const RED_LAMP = stdMaterial('#FF4444', { roughness: 0.4, emissive: '#FF2222', emissiveIntensity: 1.6 })

type Axis = 'x' | 'z'

/**
 * 幕墙面：玻璃格（可含内片）+ 竖梃 + 横挺 + 可选竖向遮阳鳍。
 * axis='x'：面沿 X 展开、法向 Z；axis='z'：面沿 Z 展开、法向 X。
 * at = 面所在法向坐标，dir = 外挑方向（±1）。
 */
function facade(g: THREE.Group, o: {
  axis: Axis; dir: 1 | -1; at: number
  w: number; y0: number; h: number
  cols: number; rows: number
  glass?: THREE.Material; inner?: boolean; glassInner?: THREE.Material
  fins?: number; finOut?: number
  muntins?: boolean
}): void {
  const cw = o.w / o.cols
  const ch = o.h / o.rows
  const panel = (a: number, yb: number, wAlong: number, h: number, depth: number, m: THREE.Material, off: number) => {
    const geo = o.axis === 'x' ? new THREE.BoxGeometry(wAlong, h, depth) : new THREE.BoxGeometry(depth, h, wAlong)
    const p = mk(geo, m)
    if (o.axis === 'x') p.position.set(a, yb + h / 2, o.at + o.dir * off)
    else p.position.set(o.at + o.dir * off, yb + h / 2, a)
    g.add(p)
  }
  for (let c = 0; c < o.cols; c++) {
    for (let r = 0; r < o.rows; r++) {
      const a = -o.w / 2 + cw * (c + 0.5)
      const y = o.y0 + ch * r
      panel(a, y, cw - 0.16, ch - 0.16, 0.1, o.glass ?? GLASS, 0.05)
      if (o.inner) panel(a, y + 0.04, cw - 0.3, ch - 0.3, 0.08, o.glassInner ?? GLASS_IN, -0.14)
      // 格内横细棂（近观层加密）
      if (o.muntins) panel(a, y + ch * 0.5, cw - 0.3, 0.06, 0.14, FRAME, 0.11)
    }
  }
  for (let c = 0; c <= o.cols; c++) {
    panel(-o.w / 2 + cw * c, o.y0, 0.15, o.h, 0.26, FRAME, 0.08)
  }
  for (let r = 0; r <= o.rows; r++) {
    panel(0, o.y0 + ch * r, o.w, 0.16, 0.24, FRAME_DARK, 0.08)
  }
  if (o.fins) {
    for (let k = 1; k <= o.fins; k++) {
      const a = -o.w / 2 + (o.w * k) / (o.fins + 1)
      panel(a, o.y0, 0.1, o.h, o.finOut ?? 0.5, STEEL, (o.finOut ?? 0.5) / 2 + 0.05)
    }
  }
}

/** 塔身标准段：逐层幕墙 + 层间设备带与铆钉阵 + 四角束柱 */
function shaft(g: THREE.Group, w: number, y0: number, layers: number, lh: number, o?: { lit?: boolean; cols?: number; rows?: number; fins?: number; muntins?: boolean }): void {
  const cols = o?.cols ?? 4
  const rows = o?.rows ?? 3
  for (let L = 0; L < layers; L++) {
    const y = y0 + L * lh
    const h = lh - 0.45
    const half = w / 2
    const glassM = o?.lit ? GLASS_LIT : GLASS
    const common = { w, y0: y, h, cols, rows, inner: true, glass: glassM, fins: o?.fins ?? 5, muntins: o?.muntins }
    facade(g, { axis: 'x', dir: 1, at: half, ...common })
    facade(g, { axis: 'x', dir: -1, at: -half, ...common })
    facade(g, { axis: 'z', dir: 1, at: half, ...common })
    facade(g, { axis: 'z', dir: -1, at: -half, ...common })
    // 层间设备带 + 带面铆钉阵（每面 6 颗）
    const bandY = y + h
    g.add(bx(w + 0.36, 0.45, 0.3, STEEL, 0, bandY, half + 0.14))
    g.add(bx(w + 0.36, 0.45, 0.3, STEEL, 0, bandY, -half - 0.14))
    g.add(bx(0.3, 0.45, w + 0.36, STEEL, half + 0.14, bandY, 0))
    g.add(bx(0.3, 0.45, w + 0.36, STEEL, -half - 0.14, bandY, 0))
    for (let i = 0; i < 6; i++) {
      const a = -w / 2 + (w * (i + 0.5)) / 6
      for (const s of [1, -1]) {
        const r1 = mk(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 6), FRAME)
        r1.rotation.x = Math.PI / 2
        r1.position.set(a, bandY + 0.225, s * (half + 0.3))
        g.add(r1)
        const r2 = mk(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 6), FRAME)
        r2.rotation.z = Math.PI / 2
        r2.position.set(s * (half + 0.3), bandY + 0.225, a)
        g.add(r2)
      }
    }
    // 四角束柱：1 主柱 + 4 附柱
    for (const sx of [1, -1]) for (const sz of [1, -1]) {
      const cx = sx * half
      const cz = sz * half
      g.add(cyl(0.2, 0.22, lh, 12, FRAME, cx, y, cz))
      for (const [ox, oz] of [[0.24, 0], [-0.24, 0], [0, 0.24], [0, -0.24]] as Array<[number, number]>) {
        g.add(cyl(0.09, 0.1, lh, 8, FRAME, cx + ox * sx, y, cz + oz * sz))
      }
    }
  }
}

/** 段间腰线：挑檐 + 檐下托檐齿饰 */
function cornice(g: THREE.Group, w: number, y: number): void {
  g.add(bx(w + 0.8, 0.34, w + 0.8, STEEL, 0, y, 0))
  g.add(bx(w + 0.5, 0.22, w + 0.5, FRAME_DARK, 0, y - 0.22, 0))
  const n = 8
  const span = w - 0.6
  for (let i = 0; i < n; i++) {
    const a = -span / 2 + (span * (i + 0.5)) / n
    for (const s of [1, -1]) {
      g.add(bx(0.2, 0.3, 0.34, FRAME, a, y - 0.52, s * (w / 2 + 0.24)))
      g.add(bx(0.34, 0.3, 0.2, FRAME, s * (w / 2 + 0.24), y - 0.52, a))
    }
  }
}

/** 卫星锅：Lathe 抛物面 + 背架 + 馈源杆 */
function dish(g: THREE.Group, x: number, y: number, z: number, ry: number, scale: number): void {
  const grp = new THREE.Group()
  const R = 1.35
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= 6; i++) {
    const r = (R * i) / 6
    pts.push(new THREE.Vector2(r, (r * r) / (4 * 1.1)))
  }
  const dishGeo = mk(new THREE.LatheGeometry(pts, 20), FRAME)
  dishGeo.rotation.x = Math.PI / 2
  dishGeo.position.z = -0.15
  grp.add(dishGeo)
  grp.add(bx(0.14, 0.14, 0.5, FRAME_DARK, 0, -0.1, -0.4))
  const feed = cyl(0.05, 0.05, 1.5, 6, ORANGE, 0, -0.3, -0.75)
  feed.rotation.x = Math.PI / 2.6
  feed.position.set(0, 0, -0.75)
  grp.add(feed)
  for (const s of [-1, 1]) {
    const leg = bx(0.12, 1.2, 0.12, FRAME_DARK, s * 0.5, -1.2, 0.1)
    grp.add(leg)
  }
  grp.add(bx(1.4, 0.12, 0.5, FRAME_DARK, 0, -1.3, 0.1))
  grp.scale.setScalar(scale)
  grp.rotation.y = ry
  grp.position.set(x, y, z)
  g.add(grp)
}

/** 格构桅杆：四弦 + 逐节横杆斜杆 + 检修平台 */
function mast(g: THREE.Group, y0: number, y1: number): void {
  const H = y1 - y0
  const s = 0.72
  const segs = 15
  const lh = H / segs
  for (const sx of [1, -1]) for (const sz of [1, -1]) {
    g.add(cyl(0.08, 0.11, H, 8, STEEL, sx * s, y0, sz * s))
  }
  const th = Math.atan2(s * 2, lh)
  for (let i = 0; i < segs; i++) {
    const y = y0 + i * lh
    for (const sg of [1, -1]) {
      g.add(bx(s * 2, 0.1, 0.1, FRAME, 0, y, sg * s))
      g.add(bx(0.1, 0.1, s * 2, FRAME, sg * s, y, 0))
    }
    const d = Math.hypot(s * 2, lh)
    const mkDiag = (along: 'x' | 'z', dir: 1 | -1) => {
      const o = mk(new THREE.BoxGeometry(0.08, d, 0.08), FRAME_DARK)
      if (along === 'x') {
        o.position.set(0, y + lh / 2, dir * s)
        o.rotation.x = dir * th
      } else {
        o.position.set(dir * s, y + lh / 2, 0)
        o.rotation.z = -dir * th
      }
      g.add(o)
    }
    if (i % 2 === 0) { mkDiag('z', 1); mkDiag('x', -1) }
    else { mkDiag('z', -1); mkDiag('x', 1) }
    mkDiag('z', i % 2 === 0 ? -1 : 1)
    mkDiag('x', i % 2 === 0 ? 1 : -1)
  }
  for (const py of [y0 + H * 0.2, y0 + H * 0.52, y0 + H * 0.84]) {
    g.add(bx(3.2, 0.16, 3.2, FRAME, 0, py, 0))
    for (const sg of [1, -1]) {
      g.add(bx(3.2, 0.8, 0.08, FRAME, 0, py + 0.16, sg * 1.55))
      g.add(bx(0.08, 0.8, 3.2, FRAME, sg * 1.55, py + 0.16, 0))
    }
    for (const sx of [1, -1]) for (const sz of [1, -1]) {
      const brace = mk(new THREE.BoxGeometry(0.1, 1.6, 0.1), FRAME_DARK)
      brace.position.set(sx * 1.1, py - 0.7, sz * 1.1)
      brace.rotation.z = sx * 0.6
      brace.rotation.x = -sz * 0.6
      g.add(brace)
    }
  }
}

/** 场地铺装层（userData.site：R13 景观场地豁免——铺装/步道属场地设计非建筑本体） */
const paver = (w: number, h: number, d: number, m: THREE.Material, x: number, yb: number, z: number): THREE.Mesh => {
  const o = bx(w, h, d, m, x, yb, z)
  o.userData.site = true
  return o
}

export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()
  const rng = ctx.rng

  // ================= 场地（用地红线 20×20 全域设计）=================
  g.add(bx(20, 0.5, 20, GRASS, 0, 0, 0))
  g.add(bx(20, 0.5, 0.3, PAVE_DARK, 0, 0, 9.85))
  g.add(bx(20, 0.5, 0.3, PAVE_DARK, 0, 0, -9.85))
  g.add(bx(0.3, 0.5, 20, PAVE_DARK, 9.85, 0, 0))
  g.add(bx(0.3, 0.5, 20, PAVE_DARK, -9.85, 0, 0))
  // 南向主轴步道（接城市原点）+ 环塔步道 + 四角铺装 + 十字径
  g.add(paver(3.4, 0.14, 2.6, PAVE, 0, 0.5, -8.7))
  g.add(paver(16, 0.14, 1, PAVE, 0, 0.5, 7.5))
  g.add(paver(16, 0.14, 1, PAVE, 0, 0.5, -7.5))
  g.add(paver(1, 0.14, 14, PAVE, 7.5, 0.5, 0))
  g.add(paver(1, 0.14, 14, PAVE, -7.5, 0.5, 0))
  for (const sx of [1, -1]) for (const sz of [1, -1]) g.add(paver(3, 0.14, 3, PAVE, sx * 8.4, 0.5, sz * 8.4))
  g.add(paver(2.2, 0.14, 3, PAVE, 8.9, 0.5, 0))
  g.add(paver(2.2, 0.14, 3, PAVE, -8.9, 0.5, 0))
  g.add(paver(3, 0.14, 2.2, PAVE, 0, 0.5, 8.9))
  // 环带铺装分块（质感细分）+ 花坛圆坛 4
  for (let i = 0; i < 6; i++) {
    const a = -6.25 + 2.5 * i
    g.add(paver(2.2, 0.1, 0.9, PAVE_DARK, a, 0.5, 6.55))
    g.add(paver(2.2, 0.1, 0.9, PAVE_DARK, a, 0.5, -6.55))
    g.add(paver(0.9, 0.1, 2.2, PAVE_DARK, 6.55, 0.5, a))
    g.add(paver(0.9, 0.1, 2.2, PAVE_DARK, -6.55, 0.5, a))
  }
  for (const [fx, fz] of [[-5.2, -5.2], [5.2, -5.2], [-5.2, 5.2], [5.2, 5.2]] as Array<[number, number]>) {
    g.add(cyl(1.15, 1.25, 0.4, 16, STONE, fx, 0.5, fz))
    const soil = cyl(1.0, 1.0, 0.14, 16, GRASS, fx, 0.9, fz)
    g.add(soil)
    g.add(cyl(0.14, 0.18, 0.9, 8, stdMaterial('#6B4A2F'), fx, 1.04, fz))
    const bloom = mk(new THREE.IcosahedronGeometry(0.62, 0), stdMaterial('#B0885E', { roughness: 0.9, emissive: '#7A5C3E', emissiveIntensity: 0.2 }))
    bloom.position.set(fx, 2.1, fz)
    g.add(bloom)
  }
  // 树阵 8 株（官方树，site 豁免）
  const treeSpots: Array<[number, number]> = [[-8.3, -8.3], [8.3, -8.3], [-8.3, 8.3], [8.3, 8.3], [8.5, 4.4], [-8.5, -4.4], [7.2, -8.6], [-5.6, 8.6]]
  for (const [tx, tz] of treeSpots) {
    g.add(ctx.blocks.tree({ x: tx, z: tz, scale: 0.9 + rng() * 0.35, seed: Math.floor(rng() * 1e9) }))
  }
  // 路灯 6、长椅 4、绿篱、石盆
  for (const [lx, lz] of [[-2.3, -8.6], [2.3, -8.6], [-6.8, -6.8], [6.8, -6.8], [-6.8, 6.8], [6.8, 6.8]] as Array<[number, number]>) {
    g.add(ctx.blocks.streetLamp({ x: lx, z: lz }))
  }
  for (const [bxp, bz, rot] of [[8.4, 4.4, -Math.PI / 2], [8.4, -4.4, -Math.PI / 2], [-8.4, 4.4, Math.PI / 2], [-8.4, -4.4, Math.PI / 2]] as Array<[number, number, number]>) {
    g.add(ctx.blocks.bench({ x: bxp, z: bz, rotY: rot }))
  }
  g.add(ctx.blocks.hedge({ w: 3.2, d: 0.8, h: 0.9, x: -4.6, z: -8.7 }))
  g.add(ctx.blocks.hedge({ w: 3.2, d: 0.8, h: 0.9, x: 4.6, z: -8.7 }))
  g.add(ctx.blocks.hedge({ w: 6, d: 0.8, h: 0.9, x: 0, z: 9.3 }))
  for (const [ux, uz] of [[-3.4, -7.6], [3.4, -7.6], [-6.9, 6.9], [6.9, 6.9]] as Array<[number, number]>) {
    g.add(ctx.blocks.urn({ scale: 1.1, x: ux, z: uz }))
  }

  // ================= 裙房（y 0.5–7.6，14×14 < 16×16）=================
  g.add(bx(14, 0.6, 14, STONE, 0, 0.5, 0))
  g.add(bx(14.4, 0.18, 14.4, STONE_DIM, 0, 0.92, 0))
  g.add(bx(13.2, 6.5, 13.2, FRAME_DARK, 0, 1.1, 0))
  const podFace = { w: 14, y0: 1.1, h: 6.5, cols: 6, rows: 3, inner: true, muntins: true, fins: 2 }
  facade(g, { axis: 'x', dir: 1, at: 7, ...podFace })
  facade(g, { axis: 'x', dir: -1, at: -7, ...podFace })
  facade(g, { axis: 'z', dir: 1, at: 7, ...podFace })
  facade(g, { axis: 'z', dir: -1, at: -7, ...podFace })
  // 入口：双开门 + 门框 + 翼墙 + 雨篷 + 落柱
  g.add(bx(1.3, 3.3, 0.1, GLASS_LIT, -0.68, 1.1, -7.13))
  g.add(bx(1.3, 3.3, 0.1, GLASS_LIT, 0.68, 1.1, -7.13))
  g.add(bx(0.18, 3.5, 0.3, FRAME, -1.45, 1.1, -7.15))
  g.add(bx(0.18, 3.5, 0.3, FRAME, 1.45, 1.1, -7.15))
  g.add(bx(3.1, 0.3, 0.3, FRAME, 0, 4.6, -7.15))
  g.add(bx(0.1, 3.3, 1.1, GLASS, -1.5, 1.1, -7.42))
  g.add(bx(0.1, 3.3, 1.1, GLASS, 1.5, 1.1, -7.42))
  g.add(bx(6, 0.28, 0.9, STEEL, 0, 5.6, -7.45))
  g.add(bx(6.2, 0.14, 1.0, FRAME, 0, 5.88, -7.45))
  for (const cx of [-2.5, 2.5]) g.add(cyl(0.09, 0.11, 4.62, 10, FRAME, cx, 0.98, -7.85))
  g.add(ctx.blocks.neonSign({ w: 3.2, h: 0.7, color: '#FF6900', y: 4.7, z: -7.25 }))
  // 四级台阶（薄板豁免：每级深度 0.5 ≤ 0.5，外伸至 z -9.0）
  const stepTop = [1.1, 0.985, 0.87, 0.755]
  const stepZ = [-7.25, -7.75, -8.25, -8.75]
  for (let i = 0; i < 4; i++) g.add(bx(5, stepTop[i] - 0.64, 0.5, PAVE_DARK, 0, 0.64, stepZ[i]))
  // 屋面：顶板 + 女儿墙 + 设备机房 + 格栅 + 排气 + 检修铺装
  g.add(bx(14.4, 0.4, 14.4, STONE_DIM, 0, 7.6, 0))
  g.add(ctx.blocks.flatRoofTop({ w: 14.4, d: 14.4, y: 8.0 }))
  for (const mx of [-4.4, 4.4]) {
    g.add(bx(3.2, 2.0, 2.6, FRAME_DARK, mx, 8.0, 3.4))
    g.add(ctx.blocks.latticePanel({ w: 2.6, h: 1.4, cols: 7, rows: 4, color: '#A8A5A0', x: mx, y: 8.3, z: 2.05 }))
    g.add(bx(3.4, 0.18, 2.8, FRAME, mx, 10.0, 3.4))
  }
  g.add(cyl(0.22, 0.26, 1.7, 10, FRAME, -5.6, 8.0, -3.2))
  g.add(cyl(0.22, 0.26, 1.7, 10, FRAME, 5.6, 8.0, -3.2))
  g.add(bx(3, 0.08, 3, PAVE_DARK, -4.5, 8.0, -4))
  g.add(bx(3, 0.08, 3, PAVE_DARK, 4.5, 8.0, -4))
  g.add(bx(1.6, 0.08, 6, PAVE_DARK, 0, 8.0, -4.5))

  // ================= 塔身：三段阶梯收分（loss 曲线意象）=================
  // 段 A：y 7.6–46.3，8.4×8.4，9 层 × 4.3
  shaft(g, 8.4, 7.6, 9, 4.3, { muntins: true })
  cornice(g, 8.4, 46.3)
  // 段 B：y 46.64–68.64，6.4×6.4，5 层 × 4.4
  shaft(g, 6.4, 46.64, 5, 4.4, { cols: 5, rows: 4, muntins: true })

  // ================= 观景层（y 68.64–75.84，四向挑台）=================
  g.add(bx(9.6, 0.4, 9.6, STEEL, 0, 68.64, 0))
  for (const a of [-3.6, -1.2, 1.2, 3.6]) {
    for (const f of [0, 1, 2, 3]) {
      const brace = mk(new THREE.BoxGeometry(0.14, 2.64, 0.14), FRAME_DARK)
      const y = 67.52
      if (f === 0) { brace.position.set(a, y, 3.9); brace.rotation.x = 0.559 }
      if (f === 1) { brace.position.set(a, y, -3.9); brace.rotation.x = -0.559 }
      if (f === 2) { brace.position.set(3.9, y, a); brace.rotation.z = -0.559 }
      if (f === 3) { brace.position.set(-3.9, y, a); brace.rotation.z = 0.559 }
      g.add(brace)
    }
  }
  const viewFace = { axis: 'x' as Axis, w: 9.6, y0: 69.04, h: 6.3, cols: 5, rows: 3, inner: true, glass: GLASS_LIT, muntins: true, fins: 4 }
  facade(g, { dir: 1, at: 4.8, ...viewFace })
  facade(g, { dir: -1, at: -4.8, ...viewFace })
  facade(g, { dir: 1, at: 4.8, ...viewFace, axis: 'z' })
  facade(g, { dir: -1, at: -4.8, ...viewFace, axis: 'z' })
  for (let i = 0; i < 10; i++) {
    const a = -4.4 + (8.8 * i) / 9
    g.add(bx(0.3, 0.3, 0.4, FRAME, a, 68.34, 4.9))
    g.add(bx(0.3, 0.3, 0.4, FRAME, a, 68.34, -4.9))
    g.add(bx(0.4, 0.3, 0.3, FRAME, 4.9, 68.34, a))
    g.add(bx(0.4, 0.3, 0.3, FRAME, -4.9, 68.34, a))
  }
  // 挑台底吊顶格 4×4 + 檐口 + 檐下齿饰 + 屋顶环栏
  for (const dx of [-3.6, -1.2, 1.2, 3.6]) for (const dz of [-3.6, -1.2, 1.2, 3.6]) {
    g.add(bx(2.2, 0.14, 2.2, FRAME_DARK, dx, 68.5, dz))
  }
  g.add(bx(10.2, 0.5, 10.2, STEEL, 0, 75.34, 0))
  for (let i = 0; i < 9; i++) {
    const a = -4.4 + (8.8 * i) / 8
    for (const s of [1, -1]) {
      g.add(bx(0.26, 0.34, 0.4, FRAME, a, 75.0, s * 5.1))
      g.add(bx(0.4, 0.34, 0.26, FRAME, s * 5.1, 75.0, a))
    }
  }
  const railY = 75.84
  for (const zz of [1, -1]) for (const a of [-3.825, -1.275, 1.275, 3.825]) {
    g.add(ctx.blocks.railing({ w: 2.5, h: 1.0, x: a, y: railY, z: zz * 5.0 }))
  }
  for (const xx of [1, -1]) for (const a of [-3.825, -1.275, 1.275, 3.825]) {
    const r = ctx.blocks.railing({ w: 2.5, h: 1.0, x: xx * 5.0, y: railY, z: a })
    r.rotation.y = Math.PI / 2
    g.add(r)
  }

  // 段 C：y 75.84–89.04，4.8×4.8，3 层 × 4.4（顶层亮灯）
  shaft(g, 4.8, 75.84, 3, 4.4, { lit: true, cols: 5, rows: 4, muntins: true })

  // ================= 塔冠 + 格构桅杆 + 天线阵 =================
  g.add(bx(5.6, 0.4, 5.6, STEEL, 0, 89.04, 0))
  g.add(bx(3.4, 2.6, 3.4, FRAME_DARK, 0, 89.44, 0))
  g.add(bx(4.6, 0.3, 4.6, FRAME, 0, 92.04, 0))
  g.add(ctx.blocks.neonSign({ w: 3.4, h: 1.0, color: '#FF6900', y: 90.2, z: -1.78 }))
  for (const sx of [1, -1]) for (const sz of [1, -1]) {
    const lamp = mk(new THREE.SphereGeometry(0.22, 10, 8), RED_LAMP)
    lamp.position.set(sx * 2.5, 89.66, sz * 2.5)
    g.add(lamp)
  }
  // 擦窗机：轨道 + 小车 + 吊臂
  g.add(bx(4.4, 0.12, 0.2, FRAME, 0, 89.44, 1.9))
  g.add(bx(4.4, 0.12, 0.2, FRAME, 0, 89.44, -1.9))
  g.add(bx(1.0, 0.7, 0.7, ORANGE, 1.1, 89.56, -1.9))
  g.add(bx(0.14, 0.14, 1.4, FRAME, 1.1, 90.26, -2.5))
  g.add(cyl(0.03, 0.03, 3.4, 6, FRAME_DARK, 1.1, 86.6, -3.1))
  // 格构桅杆 92.34–126 + 卫星锅 3 + 副鞭 + 顶灯
  mast(g, 92.34, 126)
  dish(g, 1.4, 100.47, 0.7, 0.6, 0.95)
  dish(g, -1.2, 111.04, -0.9, 3.4, 0.8)
  dish(g, 0.8, 120.31, -0.5, 5.2, 0.7)
  g.add(cyl(0.05, 0.09, 5.5, 6, FRAME, 0, 126, 0))
  g.add(cyl(0.05, 0.07, 4, 6, FRAME, 1.5, 119.56, 1.5))
  const beaconTop = mk(new THREE.SphereGeometry(0.28, 10, 8), RED_LAMP)
  beaconTop.position.set(0, 131.5, 0)
  g.add(beaconTop)
  for (const [bxp, byp, bzp] of [[0.75, 104.5, 0.75], [-0.75, 115.5, -0.75]] as Array<[number, number, number]>) {
    const b = mk(new THREE.SphereGeometry(0.18, 8, 6), RED_LAMP)
    b.position.set(bxp, byp, bzp)
    g.add(b)
  }

  // ================= 基座小品：铭牌墙 + 旗阵 =================
  g.add(bx(2.6, 0.3, 0.7, STONE, 4.9, 0.5, -7.6))
  g.add(bx(2.4, 1.4, 0.22, STONE_DIM, 4.9, 0.8, -7.6))
  for (let i = 0; i < 3; i++) g.add(bx(1.8, 0.1, 0.06, ORANGE, 4.9, 1.15 + i * 0.3, -7.74))
  for (const fx of [-3.6, 3.6]) {
    g.add(cyl(0.07, 0.1, 9, 8, FRAME, fx, 0.5, -7.6))
    const ball = mk(new THREE.SphereGeometry(0.15, 8, 6), ORANGE)
    ball.position.set(fx, 9.6, -7.6)
    g.add(ball)
    g.add(bx(1.5, 0.9, 0.06, ORANGE, fx + 0.8, 7.9, -7.6))
  }

  return g
}


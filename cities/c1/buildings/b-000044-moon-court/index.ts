import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { crescent } from '../../blocks/kimi-k3/crescent'
import { archWindow } from '../../blocks/kimi-k3/arch-window'
import { dentilCourse } from '../../blocks/kimi-k3/dentil-course'
import { quoins } from '../../blocks/kimi-k3/quoins'
import { moonPaver } from '../../blocks/kimi-k3/moon-paver'
import { pool } from '../../blocks/kimi-k3/pool'

/**
 * b-000044 月庭 Moon Court · F3 揽月街区三期（builder.model_id = kimi-k3）
 * 街区总图：cities/c1/blockplans/F3.md 三期（F3-01+02+03，北排 1×3，60×20m）。
 *
 * 立意《廊下月光》。高定商业与私人会所——米兰拱廊与巴黎皇家宫殿的模都版本：
 * 北面临路 19 开间连续拱廊骑楼（廊深 2.5m，廊下即人行道，全天候步行商业界面，
 * 兑现总图「城市门面」）；中段会所三层拔起，铜金穹顶下是私人会所中庭；两翼南侧
 * 双内院（映月渠静水 + 月相汀步 + 拱墙），月光从穹顶与院渠两处落进街区。
 * 一族三月：主塔月牙 r2.1（月）→ 揽月阁 r1.2（伴月）→ 月庭 r0.7（新月），从属有序。
 *
 * 布局（局部原点 = 宗地中心，+x 东，+z 北，宗地 60×20 = x±30 / z±10，
 * 本体退线 x±28 / z±8）：
 * 一字排三段——商业两翼（x ±7..28 × z −2..8，两层 10.4m）夹中央会所
 * （x ±7 × z −6..8，三层 12.8m + 鼓座穹顶 ~19m）；北立面 z=8 连续拱廊骑楼
 * （柱列 19 开间 ×3.0m 模数，双柱式全柱列）；两翼南侧 L 形双内院（z −6..−2）。
 * 场地：草皮满铺，北「月相大道」铺装带 + 旗杆，南环带步道接双内院。
 *
 * 夜景：骑楼廊内暖光带（廊顶筒拱底灯）+ 店面内透 + 穹顶鼓座拱窗环透 +
 * 穹顶泛光环 + 新月尖——月庭不夜廊。
 */

const C = {
  stone: '#E8E2D4',
  stoneDeep: '#D6CDBC',
  stoneShade: '#CFC5B2',
  copper: '#B08D57',
  copperDark: '#8F6F42',
  dome: '#C9A96A',
  glass: '#2A3F54',
  glassLit: '#FFD9A0',
  water: '#4A6B82',
  grass: '#8C9E8B',
  hedge: '#6E7F5C',
  trunk: '#6B4A2F',
  pave: '#D8D5CE',
  paveDark: '#B2AFA7',
  lane: '#A9A49B',
  glow: '#FFE9A8',
}

const matCache = new Map<string, THREE.MeshStandardMaterial>()
function M(color: string, o?: Parameters<typeof stdMaterial>[1]): THREE.MeshStandardMaterial {
  const k = `${color}|${JSON.stringify(o ?? {})}`
  let m = matCache.get(k)
  if (!m) { m = stdMaterial(color, o); matCache.set(k, m) }
  return m
}

function box(
  g: THREE.Group,
  w: number, h: number, d: number,
  color: string,
  o?: { x?: number; y?: number; z?: number; rotY?: number; metal?: number; rough?: number; emi?: string; emiI?: number; site?: boolean; shadow?: boolean },
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(color, { metalness: o?.metal, roughness: o?.rough, emissive: o?.emi, emissiveIntensity: o?.emiI }))
  m.position.set(o?.x ?? 0, (o?.y ?? 0) + h / 2, o?.z ?? 0)
  if (o?.rotY) m.rotation.y = o.rotY
  if (o?.shadow !== false) m.castShadow = true
  if (o?.site) m.userData.site = true
  g.add(m)
  return m
}

function cyl(
  g: THREE.Group,
  rT: number, rB: number, h: number, seg: number,
  color: string,
  o?: { x?: number; y?: number; z?: number; metal?: number; rough?: number; emi?: string; emiI?: number; site?: boolean },
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h, seg), M(color, { metalness: o?.metal, roughness: o?.rough, emissive: o?.emi, emissiveIntensity: o?.emiI }))
  m.position.set(o?.x ?? 0, (o?.y ?? 0) + h / 2, o?.z ?? 0)
  m.castShadow = true
  if (o?.site) m.userData.site = true
  g.add(m)
  return m
}

/** 全柱式圆柱（柱基三层 + 凹槽柱身 + 柱头三层），r 柱身半径 */
function fullColumn(g: THREE.Group, o: { r: number; h: number; x: number; y: number; z: number }) {
  const grp = new THREE.Group()
  const r = o.r, h = o.h
  // 柱基：方座 + 圆盘 + 束腰
  box(grp, r * 2.6, 0.22, r * 2.6, C.stoneDeep, { y: 0, rough: 0.82 })
  cyl(grp, r * 1.3, r * 1.45, 0.16, 20, C.stoneDeep, { y: 0.22, rough: 0.82 })
  cyl(grp, r * 1.1, r * 1.3, 0.12, 20, C.stone, { y: 0.38, rough: 0.78 })
  // 凹槽柱身（12 槽板 + 圆柱）
  const shaftH = h - 1.0
  cyl(grp, r, r * 1.08, shaftH, 20, C.stone, { y: 0.5, rough: 0.72 })
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const flute = new THREE.Mesh(new THREE.BoxGeometry(0.045, shaftH - 0.1, 0.05), M(C.stoneShade, { roughness: 0.85 }))
    flute.position.set(Math.cos(a) * r * 0.98, 0.5 + shaftH / 2, Math.sin(a) * r * 0.98)
    flute.rotation.y = -a
    grp.add(flute)
  }
  // 柱头：束腰 + 圆盘 + 方盖
  cyl(grp, r * 1.05, r * 0.95, 0.12, 20, C.stone, { y: h - 0.5, rough: 0.75 })
  cyl(grp, r * 1.35, r * 1.05, 0.16, 20, C.stoneDeep, { y: h - 0.38, rough: 0.8 })
  box(grp, r * 2.7, 0.22, r * 2.7, C.stoneDeep, { y: h - 0.22, rough: 0.82 })
  grp.position.set(o.x, o.y, o.z)
  g.add(grp)
}

/** 连续拱板（骑楼柱列上方的连拱带）：单拱 = 拱形轮廓环带挤出，w 开间宽 */
function archBand(g: THREE.Group, o: { w: number; archR: number; y: number; x: number; z: number; rotY?: number; depth?: number }) {
  // 矩形带 − 半圆拱洞 = 拱肩板
  const h = o.archR + 0.7
  const shape = new THREE.Shape()
  shape.moveTo(-o.w / 2, 0); shape.lineTo(o.w / 2, 0); shape.lineTo(o.w / 2, h); shape.lineTo(-o.w / 2, h); shape.closePath()
  const hole = new THREE.Path()
  hole.moveTo(-o.archR, 0)
  hole.lineTo(-o.archR, 0.35)
  hole.absarc(0, 0.35, o.archR, Math.PI, 0, true)
  hole.lineTo(o.archR, 0)
  hole.closePath()
  shape.holes.push(hole)
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: o.depth ?? 0.5, bevelEnabled: false, curveSegments: 10, steps: 1 }), M(C.stone, { roughness: 0.78 }))
  m.castShadow = true
  // 拱腹铜线（同心细拱带，两道）
  const grp = new THREE.Group()
  grp.add(m)
  for (const rr of [o.archR + 0.1, o.archR + 0.22]) {
    const trim = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.045, 6, 18, Math.PI), M(C.copper, { metalness: 0.8, roughness: 0.38 }))
    trim.position.set(0, 0.35, (o.depth ?? 0.5) + 0.01)
    grp.add(trim)
  }
  // 拱心石
  box(grp, 0.24, 0.5, (o.depth ?? 0.5) + 0.08, C.stoneDeep, { y: o.archR + 0.28, z: -0.04, rough: 0.8 })
  grp.rotation.y = o.rotY ?? 0
  grp.position.set(o.x, o.y, o.z)
  g.add(grp)
}

/** 高定店面（骑楼廊内旗舰店界面）：铜框 12 棂大玻璃 + 铜雨棚 + 招牌位小月牙 */
function shopfront(g: THREE.Group, o: { w: number; h: number; x: number; y: number; z: number; lit: boolean; sign?: boolean }) {
  const grp = new THREE.Group()
  const W = o.w, H = o.h
  const frameMat = C.copper
  // 玻璃
  box(grp, W, H, 0.08, o.lit ? C.glassLit : C.glass, {
    y: 0, metal: o.lit ? 0.2 : 0.55, rough: o.lit ? 0.35 : 0.2,
    emi: o.lit ? '#FFC98A' : '#1B2A3A', emiI: o.lit ? 0.75 : 0.3,
  })
  // 铜棂：3 竖 4 横
  for (let i = 0; i <= 3; i++) {
    box(grp, 0.09, H, 0.12, frameMat, { x: -W / 2 + (W * i) / 3, y: 0, metal: 0.8, rough: 0.38 })
  }
  for (let i = 0; i <= 4; i++) {
    box(grp, W, 0.09, 0.12, frameMat, { y: (H * i) / 4, metal: 0.8, rough: 0.38 })
  }
  // 铜雨棚（斜挑板 + 拉杆）
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(W + 0.3, 0.08, 1.0), M(frameMat, { metalness: 0.8, roughness: 0.38 }))
  canopy.position.set(0, H + 0.35, 0.5)
  canopy.rotation.x = -0.18
  canopy.castShadow = true
  grp.add(canopy)
  for (const dx of [-W / 2 + 0.3, W / 2 - 0.3]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 8), M(C.copperDark, { metalness: 0.8, roughness: 0.4 }))
    rod.position.set(dx, H + 0.75, 0.42)
    rod.rotation.x = 0.5
    grp.add(rod)
  }
  // 招牌位（旗舰店铜牌 + 小月牙）
  if (o.sign) {
    box(grp, 1.5, 0.55, 0.1, C.copperDark, { y: H + 0.55, z: 0.06, metal: 0.75, rough: 0.4 })
    grp.add(crescent({ r: 0.22, depth: 0.08, y: H + 0.83, z: 0.14, emissiveIntensity: 0.7 }))
  }
  grp.position.set(o.x, o.y, o.z)
  g.add(grp)
}

/** 密柱球头栏杆（顶奢围合件），沿 X 展开，y 为底部 */
function balustrade(g: THREE.Group, o: { w: number; x?: number; y?: number; z?: number; rotY?: number }) {
  const grp = new THREE.Group()
  const h = 1.05
  box(grp, o.w, 0.13, 0.28, C.stone, { y: h - 0.13, rough: 0.78 })
  box(grp, o.w, 0.1, 0.2, C.stoneDeep, { y: 0, rough: 0.82 })
  const n = Math.max(2, Math.round(o.w / 0.42))
  for (let i = 0; i <= n; i++) {
    const px = -o.w / 2 + (o.w * i) / n
    cyl(grp, 0.055, 0.085, h - 0.23, 10, C.stone, { x: px, y: 0.1, rough: 0.78 })
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), M(C.stone, { roughness: 0.78 }))
    ball.position.set(px, h - 0.2, 0)
    grp.add(ball)
  }
  grp.rotation.y = o.rotY ?? 0
  grp.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0)
  g.add(grp)
}

/** 骑楼廊内筒拱顶（半圆筒壳，管轴沿 X、凸面朝上、开口朝下） */
function barrelVault(g: THREE.Group, o: { r: number; len: number; x: number; y: number; z: number }) {
  const geo = new THREE.CylinderGeometry(o.r, o.r, o.len, 14, 1, true, 0, Math.PI)
  const m = new THREE.Mesh(geo, M(C.stoneShade, { roughness: 0.85, side: THREE.BackSide }))
  m.rotation.set(-Math.PI / 2, 0, Math.PI / 2)
  m.position.set(o.x, o.y, o.z)
  g.add(m)
}

/** 盲拱饰面（矩形+半圆轮廓挤出，可旋转向任意立面；archPanel 无 rotY 故自绘） */
function blindArch(g: THREE.Group, o: { w: number; h: number; depth?: number; x?: number; y?: number; z?: number; rotY?: number }) {
  const r = o.w / 2
  const shape = new THREE.Shape()
  shape.moveTo(-r, 0); shape.lineTo(-r, o.h - r)
  shape.absarc(0, o.h - r, r, Math.PI, 0, true)
  shape.lineTo(r, 0); shape.closePath()
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: o.depth ?? 0.16, bevelEnabled: false, curveSegments: 8, steps: 1 }), M(C.stoneShade, { roughness: 0.85 }))
  m.castShadow = true
  const grp = new THREE.Group()
  grp.add(m)
  grp.rotation.y = o.rotY ?? 0
  grp.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0)
  g.add(grp)
}

/** 精品树（街区族谱小号） */
function fineTree(g: THREE.Group, o: { x: number; z: number; scale?: number; seed: number; y?: number }) {
  const grp = new THREE.Group()
  let s = o.seed >>> 0
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  cyl(grp, 0.12, 0.2, 1.9, 10, C.trunk, { y: 0, rough: 0.9 })
  for (let i = 0; i < 4; i++) {
    const r = 0.62 + rnd() * 0.35
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), M(i % 2 ? C.grass : C.hedge, { roughness: 0.92 }))
    leaf.castShadow = true
    leaf.position.set((rnd() - 0.5) * 1.1, 2.1 + i * 0.5 + rnd() * 0.25, (rnd() - 0.5) * 1.1)
    grp.add(leaf)
  }
  const sc = o.scale ?? 1
  grp.scale.set(sc, sc, sc)
  grp.position.set(o.x, o.y ?? 0, o.z)
  grp.userData.site = true
  g.add(grp)
}

/** 叠水盘（内院喷泉）：三层石盘 + 顶珠 */
function fountain(g: THREE.Group, o: { x: number; z: number; scale?: number }) {
  const grp = new THREE.Group()
  const s = o.scale ?? 1
  cyl(grp, 1.3 * s, 1.45 * s, 0.4 * s, 18, C.stoneDeep, { y: 0, rough: 0.82 })
  cyl(grp, 0.16 * s, 0.2 * s, 0.9 * s, 12, C.stone, { y: 0.3 * s, rough: 0.78 })
  cyl(grp, 0.85 * s, 0.95 * s, 0.22 * s, 16, C.stone, { y: 1.05 * s, rough: 0.78 })
  cyl(grp, 0.12 * s, 0.15 * s, 0.55 * s, 10, C.stone, { y: 1.2 * s, rough: 0.78 })
  cyl(grp, 0.45 * s, 0.52 * s, 0.18 * s, 14, C.stone, { y: 1.68 * s, rough: 0.78 })
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.2 * s, 14, 10), M(C.water, { metalness: 0.6, roughness: 0.15, emissive: '#2E5066', emissiveIntensity: 0.4 }))
  orb.position.y = 2.05 * s
  grp.add(orb)
  grp.position.set(o.x, 0, o.z)
  grp.userData.site = true
  g.add(grp)
}

// ============================== 尺寸常量 ==============================

const WING_H = 10.4 // 两翼两层
const WING_L1 = 5.2, WING_L2 = 9.4 // 首层 5.2 / 二层 4.2
const HALL_H = 12.8 // 会所三层
const BAY = 2.914 // 开间模数（两翼 7 开间，柱列 x 7..27.4，柱基/柱头外缘收 ±28 界内）
const ZX = 7.0 // 骑楼柱列线（二层以上前缘；外挂件凸出尽收 z 7.95 界内）
const SHOP_Z = 4.6 // 店面线（一层内退，骑楼廊深 2.4m）

// ============================== 场地 ==============================

function site(g: THREE.Group, ctx: BuildCtx) {
  // 草皮满铺 ±30/±10
  box(g, 60, 0.12, 20, C.grass, { y: -0.12, rough: 0.95, shadow: false, site: true })
  // 北「月相大道」铺装带（骑楼外 z 8..10 即人行道，整条铺装）
  box(g, 60, 0.1, 2.0, C.pave, { y: -0.02, z: 9.0, rough: 0.9, site: true })
  // 月相石板列（大道上一字 11 块，朔望有序）
  const phases = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2] as const
  phases.forEach((p, i) => g.add(moonPaver({ phase: p as 0 | 1 | 2 | 3, x: -25 + i * 5, y: 0.04, z: 9.0, r: 0.55 })))
  // 南环带步道 + 东西环带小径
  box(g, 60, 0.1, 1.6, C.pave, { y: -0.02, z: -8.9, rough: 0.9, site: true })
  box(g, 1.6, 0.1, 20, C.pave, { x: 29.1, y: -0.02, rough: 0.9, site: true })
  box(g, 1.6, 0.1, 20, C.pave, { x: -29.1, y: -0.02, rough: 0.9, site: true })
  // 旗杆 ×2（大道两端）
  for (const fx of [-26, 26]) {
    cyl(g, 0.05, 0.08, 7.5, 10, C.copper, { x: fx, y: 0.3, z: 9.2, metal: 0.85, rough: 0.3, site: true })
    box(g, 0.6, 0.3, 0.6, C.stoneDeep, { x: fx, y: 0, z: 9.2, rough: 0.85, site: true })
    const geo = new THREE.PlaneGeometry(1.8, 1.05, 10, 3)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 2.8) * 0.1 * (pos.getX(i) / 1.8 + 0.5))
    geo.computeVertexNormals()
    const flag = new THREE.Mesh(geo, M('#3E5C76', { roughness: 0.7, side: THREE.DoubleSide }))
    flag.castShadow = true
    flag.position.set(fx + 0.95, 7.3, 9.2)
    flag.userData.site = true // 旗面属景观小件（杆/座已 site，旗面同例）
    g.add(flag)
  }
  // 树阵（大道 4 + 南院 4）+ 路灯 + 石盆
  fineTree(g, { x: -21, z: 9.2, scale: 0.9, seed: 61 })
  fineTree(g, { x: -13, z: 9.2, scale: 1.0, seed: 62 })
  fineTree(g, { x: 13, z: 9.2, scale: 0.95, seed: 63 })
  fineTree(g, { x: 21, z: 9.2, scale: 1.05, seed: 64 })
  for (const [lx, lz] of [[-17, 9.3], [17, 9.3], [-25, -8.9], [25, -8.9]] as const) {
    g.add(ctx.blocks.streetLamp({ x: lx, z: lz, h: 4.5 }))
  }
  for (const [ux, uz] of [[-29, 4], [29, 4], [-29, -4], [29, -4]] as const) {
    g.add(ctx.blocks.urn({ x: ux, z: uz, scale: 1.1 }))
  }
}

// ============================== 北立面骑楼（19 开间连续拱廊） ==============================

function arcade(g: THREE.Group, ctx: BuildCtx) {
  // 开间布局：两翼各 7 开间（柱列 x ±7..±27.7 收界内）
  const wingBays: number[] = []
  for (let i = 0; i < 7; i++) wingBays.push(7 + BAY / 2 + i * BAY)
  // 两翼首层：开敞拱廊（全柱式柱列 + 拱板 + 廊内店面 + 筒拱顶）
  for (const side of [1, -1]) {
    for (let i = 0; i < 7; i++) {
      const x = side * wingBays[i]
      // 拱板（开间连拱）+ 板下垂花吊饰
      archBand(g, { w: BAY, archR: 1.15, y: WING_L1 - 0.7, x, z: ZX, depth: 0.55 })
      cyl(g, 0.07, 0.1, 0.3, 8, C.stoneDeep, { x, y: WING_L1 - 0.85, z: ZX + 0.2, rough: 0.8 })
      const drop = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), M(C.stoneDeep, { roughness: 0.8 }))
      drop.position.set(x, WING_L1 - 0.9, ZX + 0.2)
      g.add(drop)
      // 廊内店面
      shopfront(g, { w: BAY - 0.7, h: 3.6, x, y: 0.5, z: SHOP_Z, lit: ctx.rng() < 0.7, sign: i === 1 || i === 5 })
      // 二层拱窗 + 法式小石栏（二层前缘与柱列齐）
      g.add(archWindow({ w: 1.8, h: 2.8, lit: ctx.rng() < 0.45, x, y: WING_L1 + 0.7, z: ZX, rotY: 0 }))
      balustrade(g, { w: BAY - 0.3, x, y: WING_L1 + 0.62, z: ZX + 0.3 })
    }
    // 开间柱列（8 根/翼，全柱式）+ 附墙半柱（店面线）
    for (let i = 0; i <= 7; i++) {
      const x = side * (7 + i * BAY)
      fullColumn(g, { r: 0.3, h: WING_L1 - 0.7, x, y: 0, z: ZX })
      box(g, 0.5, WING_L1 - 0.7, 0.4, C.stone, { x, y: 0, z: SHOP_Z - 0.2, rough: 0.78 })
    }
    // 廊内筒拱顶（整翼一通）+ 暖光灯带
    barrelVault(g, { r: 1.3, len: 20.6, x: side * 17.35, y: WING_L1 - 0.75, z: ZX - 1.2 })
    box(g, 20.2, 0.06, 0.18, C.glow, { x: side * 17.35, y: WING_L1 - 0.95, z: ZX - 1.2, emi: C.glow, emiI: 0.9, shadow: false })
    // 廊下拼花地面（深浅方格）
    for (let i = 0; i < 14; i++) {
      for (let j = 0; j < 2; j++) {
        box(g, 1.42, 0.04, 1.1, (i + j) % 2 ? C.pave : C.paveDark, {
          x: side * (7.6 + i * 1.45), y: 0.0, z: ZX - 0.7 - j * 1.15, rough: 0.9, site: true,
        })
      }
    }
  }
  // 两翼檐口：齿饰 + 屋面栏杆（随柱列线）
  for (const side of [1, -1]) {
    g.add(dentilCourse({ w: 20.9, x: side * 17.35, y: WING_H - 0.55, z: ZX, rotY: 0 }))
    balustrade(g, { w: 20.6, x: side * 17.35, y: WING_H, z: ZX - 0.2 })
  }
}

// ============================== 两翼体量 + 山墙 + 屋面 ==============================

function wings(g: THREE.Group, ctx: BuildCtx) {
  for (const side of [1, -1]) {
    const cx = side * 17.35 // 翼中心（x ±7..±27.7，宽 20.7）
    // 主体量两段：一层内退店面线（z −2..4.6），二层起挑至柱列线（z −2..7.0）
    box(g, 20.7, WING_L1, 6.6, C.stone, { x: cx, y: 0, z: 1.3, rough: 0.8 })
    box(g, 20.7, WING_H - WING_L1, 9.0, C.stone, { x: cx, y: WING_L1, z: 2.5, rough: 0.8 })
    // 勒脚与凹槽线脚（一层墙面随店面线）
    box(g, 21.1, 0.7, 7.0, C.stoneDeep, { x: cx, y: 0, z: 1.3, rough: 0.85 })
    for (const y of [1.5, 2.4]) {
      box(g, 20.9, 0.14, 6.8, C.stoneShade, { x: cx, y, z: 1.3, rough: 0.85 })
    }
    // 檐口挑板 + 洗墙灯带（二层前缘线内）
    box(g, 21.1, 0.3, 9.4, C.stone, { x: cx, y: WING_H - 0.12, z: 2.5, rough: 0.78 })
    box(g, 21.2, 0.09, 9.5, C.glow, { x: cx, y: WING_H - 0.28, z: 2.5, emi: C.glow, emiI: 0.9, shadow: false })
    // 山墙（东西外端 x=±27.7）：盲拱三联 + 隅石（凸出收 ±28 界内）
    const gx = side * 27.7
    for (let i = 0; i < 3; i++) {
      blindArch(g, { w: 2.0, h: 4.4, depth: 0.18, x: gx, y: 1.2, z: 0.3 + i * 2.8, rotY: side * Math.PI / 2 })
    }
    g.add(quoins({ h: WING_H - 0.4, x: side * 27.0, y: 0.2, z: 7.0, dirX: side, dirZ: 1 }))
    g.add(quoins({ h: WING_H - 0.4, x: side * 27.0, y: 0.2, z: -2, dirX: side, dirZ: -1 }))
    // 南立面（内院侧 z=−2）：首层拱窗 6 + 二层方窗 6
    for (let i = 0; i < 6; i++) {
      const x = side * (8.9 + i * 3.3)
      g.add(archWindow({ w: 1.6, h: 3.0, lit: ctx.rng() < 0.5, x, y: 1.0, z: -2, rotY: Math.PI }))
      box(g, 1.7, 2.2, 0.1, ctx.rng() < 0.4 ? C.glassLit : C.glass, {
        x, y: WING_L1 + 0.9, z: -2, metal: 0.5, rough: 0.25, emi: '#1B2A3A', emiI: 0.3,
      })
      box(g, 2.0, 0.14, 0.2, C.stoneDeep, { x, y: WING_L1 + 0.76, z: -2.02, rough: 0.82 })
    }
    // 屋面（10.4m）：连续拱天窗 5 联 + 屋顶花园（绿篱/乔木）+ 周缘栏杆
    for (let i = 0; i < 5; i++) {
      const x = side * (9.6 + i * 3.6)
      const sky = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.6, 12, 1, false, 0, Math.PI), M(C.glassLit, { metalness: 0.3, roughness: 0.3, emissive: '#FFC98A', emissiveIntensity: 0.4 }))
      sky.rotation.set(-Math.PI / 2, 0, Math.PI / 2)
      sky.position.set(x, WING_H + 0.05, 2.5)
      sky.castShadow = true
      g.add(sky)
      // 天窗拱肋 3 道
      for (const rx of [-0.65, 0, 0.65]) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.05, 6, 14, Math.PI), M(C.copper, { metalness: 0.8, roughness: 0.38 }))
        rib.rotation.set(0, Math.PI / 2, 0)
        rib.position.set(x + rx, WING_H + 0.05, 2.5)
        g.add(rib)
      }
      box(g, 0.16, 0.5, 2.7, C.copper, { x: x - 0.98, y: WING_H - 0.02, z: 2.5, metal: 0.8, rough: 0.38 })
      box(g, 0.16, 0.5, 2.7, C.copper, { x: x + 0.98, y: WING_H - 0.02, z: 2.5, metal: 0.8, rough: 0.38 })
    }
    // 屋面花园：绿篱阵 + 乔木 2
    for (let i = 0; i < 4; i++) {
      box(g, 0.5, 0.65, 6.0, C.hedge, { x: side * (10.3 + i * 4.2), y: WING_H, z: 2.2, rough: 0.95 })
    }
    fineTree(g, { x: side * 12.3, z: 5.4, scale: 0.55, seed: 71 + side, y: WING_H })
    fineTree(g, { x: side * 21.6, z: 4.8, scale: 0.5, seed: 73 + side, y: WING_H })
    balustrade(g, { w: 8.6, x: cx, y: WING_H, z: -1.8, rotY: 0 })
    balustrade(g, { w: 8.6, x: side * 27.5, y: WING_H, z: 2.5, rotY: Math.PI / 2 })
  }
}

// ============================== 中央会所（三门廊 + 三层 + 鼓座穹顶） ==============================

function pavilion(g: THREE.Group, ctx: BuildCtx) {
  // 主体量（x ±7；一层内退 z −6..5.2，二层起前缘 z −6..7.3，三层 12.8m）
  box(g, 14, WING_L1, 11.2, C.stone, { y: 0, z: -0.4, rough: 0.8 })
  box(g, 14, HALL_H - WING_L1, 13.3, C.stone, { y: WING_L1, z: 0.65, rough: 0.8 })
  box(g, 14.4, 0.7, 11.6, C.stoneDeep, { y: 0, z: -0.4, rough: 0.85 })
  // 北向三门廊（主入口，全柱式 4 柱 + 三拱板）
  for (let i = 0; i < 4; i++) {
    fullColumn(g, { r: 0.3, h: 5.0, x: -3.75 + i * 2.5, y: 0, z: ZX + 0.3 })
  }
  for (let i = 0; i < 3; i++) {
    archBand(g, { w: 2.5, archR: 1.15, y: 5.0, x: -2.5 + i * 2.5, z: ZX + 0.3, depth: 0.55 })
    // 门（铜框内透，一层内退墙面）
    box(g, 1.9, 3.9, 0.12, C.copperDark, { x: -2.5 + i * 2.5, y: 0.3, z: 5.2, metal: 0.7, rough: 0.4 })
    box(g, 1.6, 3.5, 0.08, C.glassLit, { x: -2.5 + i * 2.5, y: 0.5, z: 5.25, metal: 0.3, rough: 0.3, emi: '#FFC98A', emiI: 0.75 })
  }
  // 门廊筒拱 + 台阶
  barrelVault(g, { r: 1.25, len: 7.6, x: 0, y: 4.95, z: ZX - 0.7 })
  box(g, 8.6, 0.06, 0.2, C.glow, { x: 0, y: 4.8, z: ZX - 0.7, emi: C.glow, emiI: 0.95, shadow: false })
  box(g, 9.2, 0.18, 2.2, C.stoneDeep, { y: 0, z: ZX + 0.9, rough: 0.85, site: true })
  box(g, 8.0, 0.09, 1.4, C.stone, { y: 0, z: ZX + 1.7, rough: 0.8, site: true })
  // 二层：三联大拱窗（中庭内透）
  for (let i = 0; i < 3; i++) {
    g.add(archWindow({ w: 2.2, h: 3.6, lit: true, x: -2.8 + i * 2.8, y: 6.0, z: ZX + 0.3, rotY: 0 }))
  }
  // 三层：5 小拱廊（盲拱 + 拱窗相间）
  for (let i = 0; i < 5; i++) {
    const x = -5.0 + i * 2.5
    if (i % 2 === 0) {
      g.add(archWindow({ w: 1.4, h: 2.4, lit: ctx.rng() < 0.6, x, y: 10.0, z: ZX + 0.3, rotY: 0 }))
    } else {
      blindArch(g, { w: 1.4, h: 2.4, depth: 0.16, x, y: 10.0, z: ZX + 0.3 })
    }
  }
  // 会所檐口齿饰 + 挑板 + 洗墙灯（四面，外缘收 ±8/±28 界内）
  for (const [w, x, z, ry] of [[14.3, 0, ZX + 0.3, 0], [14.3, 0, -6, 0], [13.2, -7, 0.65, Math.PI / 2], [13.2, 7, 0.65, Math.PI / 2]] as const) {
    g.add(dentilCourse({ w, x, y: HALL_H - 0.55, z, rotY: ry }))
  }
  box(g, 14.5, 0.3, 13.8, C.stone, { y: HALL_H - 0.12, z: 0.65, rough: 0.78 })
  box(g, 14.6, 0.09, 13.9, C.glow, { y: HALL_H - 0.28, z: 0.65, emi: C.glow, emiI: 0.9, shadow: false })
  // 南立面（内院端）：首层双铜门（通双内院）+ 二层三拱窗
  for (const side of [1, -1]) {
    box(g, 0.12, 3.4, 1.8, C.copperDark, { x: side * 2.5, y: 0.3, z: -6, metal: 0.7, rough: 0.4 })
  }
  for (let i = 0; i < 3; i++) {
    g.add(archWindow({ w: 1.7, h: 3.0, lit: true, x: -3.2 + i * 3.2, y: 6.0, z: -6, rotY: Math.PI }))
    blindArch(g, { w: 1.4, h: 2.3, depth: 0.16, x: -3.2 + i * 3.2, y: 10.0, z: -6, rotY: Math.PI })
  }
  // 鼓座（八角，8 柱 + 8 拱窗；中心随体量 z 0.65）
  const DRUM_R = 4.0, DRUM_H = 2.4
  const ZC = 0.65
  let ty = HALL_H
  // 鼓座基座（方圆过渡 + 周缘栏杆）
  box(g, 9.6, 0.5, 9.6, C.stone, { y: ty, z: ZC, rough: 0.78 })
  balustrade(g, { w: 9.6, x: 0, y: ty + 0.5, z: ZC - 4.8 })
  balustrade(g, { w: 9.6, x: 0, y: ty + 0.5, z: ZC + 4.8 })
  balustrade(g, { w: 9.6, x: -4.8, y: ty + 0.5, z: ZC, rotY: Math.PI / 2 })
  balustrade(g, { w: 9.6, x: 4.8, y: ty + 0.5, z: ZC, rotY: Math.PI / 2 })
  ty += 0.5
  cyl(g, DRUM_R, DRUM_R + 0.15, DRUM_H, 8, C.stone, { y: ty, z: ZC, rough: 0.78 })
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8
    // 每面双柱（鼓座柱廊加密）
    for (const da of [-0.14, 0.14]) {
      cyl(g, 0.12, 0.15, DRUM_H - 0.4, 12, C.stoneDeep, { x: Math.cos(a + da) * (DRUM_R + 0.12), y: ty + 0.2, z: ZC + Math.sin(a + da) * (DRUM_R + 0.12), rough: 0.8 })
    }
    g.add(archWindow({ w: 0.8, h: 1.5, lit: true, x: Math.cos(a + Math.PI / 8) * (DRUM_R + 0.03), y: ty + 0.5, z: ZC + Math.sin(a + Math.PI / 8) * (DRUM_R + 0.03), rotY: -a - Math.PI / 8 + Math.PI / 2 }))
  }
  cyl(g, DRUM_R + 0.4, DRUM_R + 0.4, 0.12, 24, C.glow, { y: ty + DRUM_H, z: ZC, emi: C.glow, emiI: 0.9 })
  cyl(g, DRUM_R + 0.5, DRUM_R + 0.5, 0.26, 24, C.copper, { y: ty + DRUM_H + 0.12, z: ZC, metal: 0.8, rough: 0.35 })
  ty += DRUM_H + 0.38
  // 铜金穹顶（菱格网：半球 + 8 经肋 + 3 纬环）
  const DOME_R = 4.3
  const dome = new THREE.Mesh(new THREE.SphereGeometry(DOME_R, 36, 22, 0, Math.PI * 2, 0, Math.PI / 2), M(C.dome, { metalness: 0.88, roughness: 0.3 }))
  dome.castShadow = true
  dome.position.set(0, ty, ZC)
  g.add(dome)
  for (let i = 0; i < 8; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(DOME_R + 0.06, 0.07, 8, 26, Math.PI), M(C.copperDark, { metalness: 0.85, roughness: 0.32 }))
    rib.rotation.y = (i / 8) * Math.PI
    rib.position.set(0, ty, ZC)
    g.add(rib)
  }
  for (const [ry, rr] of [[DOME_R * 0.35, DOME_R * 0.94], [DOME_R * 0.6, DOME_R * 0.8], [DOME_R * 0.82, DOME_R * 0.58]] as const) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.055, 8, 30), M(C.copperDark, { metalness: 0.85, roughness: 0.32 }))
    ring.rotation.x = Math.PI / 2
    ring.position.set(0, ty + ry, ZC)
    g.add(ring)
  }
  // 顶亭（6 小柱 + 小穹 + 新月尖 r0.7——一族三月之新月）
  const spireY = ty + DOME_R
  cyl(g, 0.7, 0.85, 0.5, 12, C.copper, { y: spireY - 0.1, z: ZC, metal: 0.85, rough: 0.3 })
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    cyl(g, 0.06, 0.08, 0.85, 8, C.stone, { x: Math.cos(a) * 0.55, y: spireY + 0.4, z: ZC + Math.sin(a) * 0.55, rough: 0.75 })
  }
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.72, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(C.dome, { metalness: 0.88, roughness: 0.3 }))
  cap.position.set(0, spireY + 1.25, ZC)
  g.add(cap)
  cyl(g, 0.05, 0.1, 0.7, 8, C.copper, { y: spireY + 1.9, z: ZC, metal: 0.85, rough: 0.3 })
  g.add(crescent({ r: 0.7, depth: 0.18, y: spireY + 3.1, z: ZC, emissiveIntensity: 0.9 }))
  // ——穹顶顶 ~19.3m
}

// ============================== 双内院（映月渠 + 汀步 + 拱墙） ==============================

function courtyard(g: THREE.Group, ctx: BuildCtx) {
  for (const side of [1, -1]) {
    const cx = side * 17.5
    // 内院铺地（z −6..−2，拼花）
    box(g, 20.6, 0.06, 3.8, C.pave, { x: cx, y: 0, z: -4, rough: 0.9, site: true })
    // 映月渠（16×1.6 静水）
    g.add(pool({ w: 15, d: 1.7, x: cx, y: 0.04, z: -4.2, waterColor: '#4A6B82' }))
    // 月相汀步跨渠（3 块）
    for (let i = 0; i < 3; i++) {
      g.add(moonPaver({ phase: (i + 1) as 1 | 2 | 3, x: cx - 4 + i * 4, y: 0.3, z: -4.2, r: 0.5 }))
    }
    // 叠水盘（院心）
    fountain(g, { x: cx, z: -5.3, scale: 0.9 })
    // 绿篱列 + 乔木
    for (let i = 0; i < 3; i++) {
      box(g, 3.6, 0.65, 0.5, C.hedge, { x: side * (10 + i * 5.5), y: 0, z: -2.6, rough: 0.95, site: true })
    }
    fineTree(g, { x: side * 10.5, z: -5.5, scale: 0.7, seed: 81 + side })
    fineTree(g, { x: side * 24, z: -5.4, scale: 0.8, seed: 83 + side })
    // 院墙（z=−6 沿线）开 3 拱（通南环带）
    for (let i = 0; i < 3; i++) {
      g.add(ctx.blocks.archWall({ w: 6.4, h: 2.8, archW: 2.2, archH: 2.3, depth: 0.4, color: C.stone, x: side * (9.8 + i * 7.2), y: 0, z: -6 }))
    }
    // 石凳
    for (const bx of [side * 13, side * 21]) {
      g.add(ctx.blocks.bench({ x: bx, z: -3.0, rotY: Math.PI }))
    }
  }
}

// ============================== 入口 ==============================

export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()
  site(g, ctx)
  wings(g, ctx)
  arcade(g, ctx)
  pavilion(g, ctx)
  courtyard(g, ctx)
  return g
}

import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { crescent } from '../../blocks/kimi-k3/crescent'
import { moonPaver } from '../../blocks/kimi-k3/moon-paver'

/**
 * b-000045 揽月台 Lanyue Terrace · F3 揽月街区四期（builder.model_id = kimi-k3）
 * 街区总图：cities/c1/blockplans/F3.md 四期（F3-06，东列中 1×1，20×20m），
 * 开放空间（构筑物 ≤6m），街区东门户收口，街区全落成。
 *
 * 立意《手中的月》。主塔的月在 108m 塔尖、揽月阁的月在云阶上、月庭的月在穹顶——
 * 都是天上的月；揽月台给市民一枚可以走近、可以围坐、可以倒映的月。
 * 三重「月落」：月相环广场（脚下：8 块月相石板环列朔望有序）→ 望月坛
 * （手中：三层圆坛 + 石柱托小月牙 r0.9，市民的月）→ 月牙池（水中：
 * 池子本身就是月牙形，月落揽月台）。南侧观星草坡两层台地登高，东半疏林草坪
 * 留呼吸（东望 G3），西缘列树接一期前庭。无围墙，四条月相步道接入街区序列。
 *
 * 布局（局部原点 = 宗地中心，+x 东，+z 北，宗地 20×20 = ±10）：
 * 中央月相环广场（r 6.5 环带）+ 环心望月坛（r 3.2 三层，坛顶 5.2m ≤ 6m 档）；
 * 南观星草坡（14×7 两层台地 1.1/2.2m，坡顶揽月石台）；北月牙静水池（r 2.4 平放
 * 月牙，尖角朝东）；东疏林草坪（5 株散植）；西入口列树。
 */

const C = {
  stone: '#E8E2D4',
  stoneDeep: '#D6CDBC',
  stoneShade: '#CFC5B2',
  copper: '#B08D57',
  copperDark: '#8F6F42',
  water: '#4A6B82',
  grass: '#8C9E8B',
  grassDeep: '#7B8F76',
  hedge: '#6E7F5C',
  trunk: '#6B4A2F',
  pave: '#D8D5CE',
  paveDark: '#B2AFA7',
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

/** 月牙轮廓 Shape（crescent 同款两圆相减算法，供平面水池/铺装复用） */
function crescentShape(r: number): THREE.Shape {
  const d = r * 0.45, ri = r * 0.75
  const ix = (d * d + r * r - ri * ri) / (2 * d)
  const iy = Math.sqrt(r * r - ix * ix)
  const aA = Math.atan2(iy, ix)
  const N = 28
  const shape = new THREE.Shape()
  for (let i = 0; i <= N; i++) {
    const a = aA + ((Math.PI * 2 - 2 * aA) * i) / N
    const px = Math.cos(a) * r, py = Math.sin(a) * r
    if (i === 0) shape.moveTo(px, py); else shape.lineTo(px, py)
  }
  const bB = Math.atan2(-iy, ix - d)
  const bA = Math.atan2(iy, ix - d)
  for (let i = 0; i <= N; i++) {
    const a = bB + ((bA - Math.PI * 2 - bB) * i) / N
    shape.lineTo(d + Math.cos(a) * ri, Math.sin(a) * ri)
  }
  shape.closePath()
  return shape
}

/** 密柱球头栏杆（街区族谱件），沿 X 展开，y 为底部 */
function balustrade(g: THREE.Group, o: { w: number; x?: number; y?: number; z?: number; rotY?: number }) {
  const grp = new THREE.Group()
  const h = 1.05
  box(grp, o.w, 0.13, 0.28, C.stone, { y: h - 0.13, rough: 0.78 })
  box(grp, o.w, 0.1, 0.2, C.stoneDeep, { y: 0, rough: 0.82 })
  const n = Math.max(2, Math.round(o.w / 0.3))
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

/** 精品树（街区族谱） */
function fineTree(g: THREE.Group, o: { x: number; z: number; scale?: number; seed: number; y?: number }) {
  const grp = new THREE.Group()
  let s = o.seed >>> 0
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  cyl(grp, 0.12, 0.2, 1.9, 10, C.trunk, { y: 0, rough: 0.9 })
  for (let i = 0; i < 5; i++) {
    const r = 0.65 + rnd() * 0.4
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), M(i % 2 ? C.grass : C.hedge, { roughness: 0.92 }))
    leaf.castShadow = true
    leaf.position.set((rnd() - 0.5) * 1.2, 2.1 + i * 0.52 + rnd() * 0.25, (rnd() - 0.5) * 1.2)
    grp.add(leaf)
  }
  const sc = o.scale ?? 1
  grp.scale.set(sc, sc, sc)
  grp.position.set(o.x, o.y ?? 0, o.z)
  grp.userData.site = true
  g.add(grp)
}

// ============================== 场地与环带步道 ==============================

function site(g: THREE.Group, ctx: BuildCtx) {
  // 草皮满铺 ±10
  box(g, 20, 0.12, 20, C.grass, { y: -0.12, rough: 0.95, shadow: false, site: true })
  // 环带月相步道（四边 ±8.8，宽 1.4，接街区序列）
  for (const [w, d, x, z] of [
    [20, 1.4, 0, 8.8], [20, 1.4, 0, -8.8],
    [1.4, 17.6, 8.8, 0], [1.4, 17.6, -8.8, 0],
  ] as const) {
    box(g, w, 0.1, d, C.pave, { x, y: -0.02, z, rough: 0.9, site: true })
  }
  const phases = [2, 3, 0, 1] as const
  let pi = 0
  for (const side of [0, 1, 2, 3]) {
    for (const t of [-4.4, 0, 4.4]) {
      const [px, pz] = side === 0 ? [t, 8.8] : side === 1 ? [8.8, -t] : side === 2 ? [-t, -8.8] : [-8.8, t]
      g.add(moonPaver({ phase: phases[pi % 4], x: px, y: 0.04, z: pz, r: 0.5 }))
      pi++
    }
  }
  // 路灯（四角）
  for (const [lx, lz] of [[-8.6, -8.6], [8.6, -8.6], [8.6, 8.6], [-8.6, 8.6]] as const) {
    g.add(ctx.blocks.streetLamp({ x: lx, z: lz, h: 4.5 }))
  }
  // 步道路缘石（四边外侧条石）
  for (const side of [0, 1, 2, 3]) {
    for (let k = 0; k < 10; k++) {
      const t = -8.55 + k * 1.9
      const [px, pz, ry] = side === 0 ? [t, 9.65, 0] : side === 1 ? [9.65, -t, Math.PI / 2] : side === 2 ? [-t, -9.65, 0] : [-9.65, t, Math.PI / 2]
      box(g, 1.7, 0.16, 0.3, C.stoneDeep, { x: px, y: -0.02, z: pz, rotY: ry, rough: 0.85, site: true })
    }
  }
}

// ============================== 中央月相环广场 + 望月坛 ==============================

function moonPlaza(g: THREE.Group, ctx: BuildCtx) {
  // 环带铺装（外 r6.5 内 r3.5 圆环 + 径向分隔 8 道 + 内盘 r3.5）
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.5, 6.5, 48, 1), M(C.pave, { roughness: 0.9 }))
  ring.rotation.x = -Math.PI / 2
  ring.position.set(0, 0.05, 0.5)
  ring.receiveShadow = true
  ring.userData.site = true
  g.add(ring)
  const inner = new THREE.Mesh(new THREE.CircleGeometry(3.6, 36), M(C.paveDark, { roughness: 0.9 }))
  inner.rotation.x = -Math.PI / 2
  inner.position.set(0, 0.04, 0.5)
  inner.userData.site = true
  g.add(inner)
  // 径向铜分隔条 8 道（指月八向）
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    box(g, 0.12, 0.06, 3.0, C.copper, { x: Math.cos(a) * 5.0, y: 0.05, z: 0.5 + Math.sin(a) * 5.0, rotY: -a + Math.PI / 2, metal: 0.8, rough: 0.38, site: true })
  }
  // 8 块月相石板环列（朔/弦/望/晦 × 2，环带中径 r5.0）
  const phases = [0, 1, 2, 3, 2, 1, 0, 3] as const
  phases.forEach((p, i) => {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8
    g.add(moonPaver({ phase: p, x: Math.cos(a) * 5.0, y: 0.08, z: 0.5 + Math.sin(a) * 5.0, r: 0.62 }))
  })
  // 星座点阵（小熊座七星：铜圆点 + 连线，嵌内盘）
  const ursa: [number, number][] = [[-2.2, -1.2], [-1.4, -0.7], [-0.7, -0.9], [-0.1, -0.4], [0.7, 0.5], [1.4, 1.1], [2.1, 0.7]]
  for (let i = 0; i < ursa.length; i++) {
    const [sx, sz] = ursa[i]
    cyl(g, 0.09, 0.09, 0.05, 10, C.copper, { x: sx, y: 0.05, z: 0.5 + sz, metal: 0.8, rough: 0.35, site: true })
    if (i > 0) {
      const [px, pz] = ursa[i - 1]
      const len = Math.hypot(sx - px, sz - pz)
      box(g, 0.05, 0.04, len, C.copperDark, { x: (sx + px) / 2, y: 0.05, z: 0.5 + (sz + pz) / 2, rotY: -Math.atan2(sz - pz, sx - px) + Math.PI / 2, metal: 0.78, rough: 0.4, site: true })
    }
  }
  // 望月坛（三层圆坛 r3.2/2.5/1.8）
  for (const [r, y0, h] of [[3.2, 0, 0.35], [2.5, 0.35, 0.35], [1.8, 0.7, 0.4]] as const) {
    cyl(g, r, r + 0.12, h, 48, C.stone, { y: y0, z: 0.5, rough: 0.78 })
    // 坛沿铜环
    cyl(g, r + 0.1, r + 0.14, 0.08, 48, C.copper, { y: y0 + h - 0.08, z: 0.5, metal: 0.8, rough: 0.38 })
  }
  // 坛身月相浮雕板（底层 8 块 + 二层 8 块月牙薄板环列）
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    g.add(crescent({ r: 0.3, depth: 0.08, x: Math.cos(a) * 3.26, y: 0.18, z: 0.5 + Math.sin(a) * 3.26, rotY: -a - Math.PI / 2, emissiveIntensity: 0.25 }))
    g.add(crescent({ r: 0.24, depth: 0.07, x: Math.cos(a + Math.PI / 8) * 2.56, y: 0.53, z: 0.5 + Math.sin(a + Math.PI / 8) * 2.56, rotY: -a - Math.PI / 8 - Math.PI / 2, emissiveIntensity: 0.25 }))
  }
  // 广场外缘月相铆钉环（36 铜点）
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2
    cyl(g, 0.06, 0.06, 0.05, 8, C.copper, { x: Math.cos(a) * 6.3, y: 0.05, z: 0.5 + Math.sin(a) * 6.3, metal: 0.8, rough: 0.35, site: true })
  }
  // 坛顶石柱 + 小月牙（市民的月，r0.9 微光）
  cyl(g, 0.32, 0.42, 1.9, 18, C.stone, { y: 1.1, z: 0.5, rough: 0.72 })
  cyl(g, 0.5, 0.4, 0.18, 18, C.stoneDeep, { y: 3.0, z: 0.5, rough: 0.8 })
  cyl(g, 0.08, 0.14, 0.9, 12, C.copper, { y: 3.18, z: 0.5, metal: 0.85, rough: 0.3 })
  g.add(crescent({ r: 0.9, depth: 0.22, y: 4.85, z: 0.5, emissiveIntensity: 0.85 }))
  // 坛周八边形环栏（8 段直栏近似圆环 r4.15）
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8
    const segW = 2 * 4.15 * Math.tan(Math.PI / 8)
    balustrade(g, { w: segW * 0.92, x: Math.cos(a) * 4.15, y: 0, z: 0.5 + Math.sin(a) * 4.15, rotY: -a - Math.PI / 2 })
  }
  // 环形长凳 4 组（朝向坛心，弧形近似）+ 组间石盆
  for (const a of [0.6, 2.2, 3.7, 5.2] as const) {
    const bx = Math.cos(a) * 5.6, bz = 0.5 + Math.sin(a) * 5.6
    g.add(ctx.blocks.bench({ x: bx, z: bz, rotY: -a + Math.PI }))
    g.add(ctx.blocks.bench({ x: bx + Math.cos(a + 0.35) * 0.9, z: bz + Math.sin(a + 0.35) * 0.9, rotY: -a + Math.PI - 0.3 }))
  }
  for (const a of [1.4, 3.0, 4.5, 6.0] as const) {
    g.add(ctx.blocks.urn({ x: Math.cos(a) * 5.7, z: 0.5 + Math.sin(a) * 5.7, scale: 0.9 }))
  }
}

// ============================== 北 · 月牙静水池（月落揽月台） ==============================

function crescentPool(g: THREE.Group, ctx: BuildCtx) {
  const CX = 0, CZ = 7.0, R = 2.3
  // 月牙池沿（月牙轮廓环：外挤出 0.4 高）+ 月牙水面
  const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(crescentShape(R), { depth: 0.38, bevelEnabled: false, curveSegments: 14, steps: 1 }), M(C.stoneDeep, { roughness: 0.8 }))
  rim.rotation.x = -Math.PI / 2
  rim.position.set(CX, 0.38, CZ)
  rim.castShadow = true
  rim.userData.site = true
  g.add(rim)
  const water = new THREE.Mesh(new THREE.ExtrudeGeometry(crescentShape(R - 0.35), { depth: 0.05, bevelEnabled: false, curveSegments: 14, steps: 1 }), M(C.water, { metalness: 0.65, roughness: 0.08, emissive: '#2E5066', emissiveIntensity: 0.45 }))
  water.rotation.x = -Math.PI / 2
  water.position.set(CX, 0.3, CZ)
  water.userData.site = true
  g.add(water)
  // 池心小月珠（水面一点光）
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), M(C.glow, { emissive: C.glow, emissiveIntensity: 0.9, roughness: 0.3 }))
  orb.position.set(CX - 0.7, 0.42, CZ)
  orb.userData.site = true
  g.add(orb)
  // 月相汀步 3 块（跨池尖角侧）
  for (let i = 0; i < 3; i++) {
    g.add(moonPaver({ phase: (i + 1) as 1 | 2 | 3, x: CX + 1.2 + i * 0.85, y: 0.34, z: CZ - 1.6 + i * 0.5, r: 0.42 }))
  }
  // 池畔石凳 ×2 + 石盆 ×2
  for (const [bx, bz, ry] of [[-3.2, 6.2, 0.5], [2.9, 7.8, -0.9]] as const) {
    g.add(ctx.blocks.bench({ x: bx, z: bz, rotY: ry }))
  }
  for (const [ux, uz] of [[-3.4, 8.3], [3.5, 5.9]] as const) {
    g.add(ctx.blocks.urn({ x: ux, z: uz, scale: 1.1 }))
  }
}

// ============================== 南 · 观星草坡（两层台地 + 揽月石台） ==============================

function starSlope(g: THREE.Group, ctx: BuildCtx) {
  // 一层台地（14×6，高 1.1，中心 z −6.2）
  box(g, 14, 1.1, 6, C.stoneDeep, { y: 0, z: -6.2, rough: 0.85, site: true })
  box(g, 13.6, 0.14, 5.6, C.grass, { y: 1.1, z: -6.2, rough: 0.95, site: true })
  // 一层台地石砌缝（水平 2 道 + 竖缝砌块纹）
  for (const y of [0.35, 0.7]) {
    box(g, 14.1, 0.08, 6.1, C.stoneShade, { y, z: -6.2, rough: 0.88, site: true })
  }
  for (let i = 0; i < 11; i++) {
    box(g, 0.08, 1.04, 0.08, C.stoneShade, { x: -6.5 + i * 1.3, y: 0.03, z: -3.24, rough: 0.88, site: true })
  }
  for (let i = 0; i < 7; i++) {
    box(g, 0.08, 1.04, 0.08, C.stoneShade, { x: -4.55 + i * 1.3, y: 1.13, z: -5.04, rough: 0.88, site: true })
  }
  // 二层台地（10×3.6，高 1.1，中心 z −6.8）
  box(g, 10, 1.1, 3.6, C.stoneDeep, { y: 1.1, z: -6.8, rough: 0.85, site: true })
  box(g, 9.6, 0.14, 3.2, C.grass, { y: 2.2, z: -6.8, rough: 0.95, site: true })
  // 两侧石阶（各 6 级通二层）
  for (const side of [1, -1]) {
    for (let i = 0; i < 6; i++) {
      box(g, 1.6, 0.18, 0.5, C.stone, { x: side * 6.2, y: 0.02 + i * 0.36, z: -4.4 - i * 0.42, rough: 0.8, site: true })
    }
  }
  // 坡顶揽月石台（石板 + 星图铜盘 + 双观星石 + 北缘栏杆）
  box(g, 3.4, 0.16, 2.6, C.pave, { y: 2.24, z: -6.6, rough: 0.88, site: true })
  // 星图铜盘（嵌台中央：圆盘 + 8 射线 + 24 星点）
  cyl(g, 0.85, 0.85, 0.05, 24, C.copper, { y: 2.4, z: -6.6, metal: 0.8, rough: 0.35, site: true })
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    box(g, 0.05, 0.04, 0.75, C.copperDark, { x: Math.cos(a) * 0.45, y: 2.46, z: -6.6 + Math.sin(a) * 0.45, rotY: -a + Math.PI / 2, metal: 0.78, rough: 0.4, site: true })
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + (i % 3) * 0.05
    const rr = 0.25 + (i % 5) * 0.11
    cyl(g, 0.035, 0.035, 0.05, 8, C.glow, { x: Math.cos(a) * rr, y: 2.45, z: -6.6 + Math.sin(a) * rr, emi: C.glow, emiI: 0.5, site: true })
  }
  // 观星石（斜面躺石 + 底座，仰观天象）×2
  for (const sx of [-0.9, 0.9]) {
    box(g, 0.9, 0.14, 1.8, C.stoneDeep, { x: sx, y: 2.4, z: -6.7, rough: 0.85, site: true })
    const rock = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 1.6), M(C.stone, { roughness: 0.85 }))
    rock.rotation.x = -0.35
    rock.position.set(sx, 2.76, -6.7)
    rock.castShadow = true
    rock.userData.site = true
    g.add(rock)
  }
  balustrade(g, { w: 9.4, x: 0, y: 2.2, z: -5.2 })
  // 台地树（一层肩 2 株）
  fineTree(g, { x: -5.6, z: -6.6, scale: 0.7, seed: 91, y: 1.24 })
  fineTree(g, { x: 5.6, z: -6.4, scale: 0.75, seed: 92, y: 1.24 })
}

// ============================== 东疏林 + 西列树 ==============================

function groves(g: THREE.Group, ctx: BuildCtx) {
  // 东半疏林（5 株散植，留呼吸，东望 G3）
  const east: [number, number, number, number][] = [
    [5.2, 3.2, 1.0, 101], [7.4, 1.0, 0.85, 102], [6.2, -1.8, 1.1, 103],
    [8.0, 4.6, 0.9, 104], [4.6, -4.0, 0.8, 105], [8.4, -3.2, 0.95, 109],
    [6.8, 6.9, 0.9, 110], [4.0, 6.2, 0.85, 111], [8.8, 6.3, 1.0, 112],
  ]
  for (const [x, z, s, seed] of east) fineTree(g, { x, z, scale: s, seed })
  // 东缘长凳（看 G3 方向）
  g.add(ctx.blocks.bench({ x: 7.2, z: 2.8, rotY: Math.PI / 2 }))
  // 西缘列树 3 株（接一期前庭方向）
  fineTree(g, { x: -7.6, z: 3.4, scale: 0.95, seed: 106 })
  fineTree(g, { x: -7.8, z: -0.6, scale: 1.05, seed: 107 })
  fineTree(g, { x: -7.4, z: -4.2, scale: 0.9, seed: 108 })
  // 西入口石盆
  for (const uz of [1.6, -2.6]) {
    g.add(ctx.blocks.urn({ x: -8.6, z: uz, scale: 1.15 }))
  }
  // 西北角绿篱（挡北路尘）
  for (const px of [-6.5, -4.2]) {
    g.add(ctx.blocks.hedge({ w: 2.0, d: 0.7, x: px, z: 8.2 }))
  }
}

// ============================== 入口 ==============================

export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()
  site(g, ctx)
  moonPlaza(g, ctx)
  crescentPool(g, ctx)
  starSlope(g, ctx)
  groves(g, ctx)
  return g
}

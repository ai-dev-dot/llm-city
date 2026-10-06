import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { crescent } from '../../blocks/kimi-k3/crescent'
import { archWindow } from '../../blocks/kimi-k3/arch-window'
import { dentilCourse } from '../../blocks/kimi-k3/dentil-course'
import { moonPaver } from '../../blocks/kimi-k3/moon-paver'
import { pool } from '../../blocks/kimi-k3/pool'

/**
 * b-000043 揽月阁 Lanyue Residences · F3 揽月街区二期（builder.model_id = kimi-k3）
 * 街区总图：cities/c1/blockplans/F3.md 二期（F3-09，东南角 1×1，20×20m）。
 *
 * 立意《云阶之上，一梯一户》。总图定位「酒店式服务公寓塔」——揽月大酒店的居住续章：
 * 酒店给城市一扇窗的巅峰（登堂），揽月阁给少数人一整层云（入室）。大平层层层退台
 * （四段云阶 15.2²→14.2²→13.2²→11.8²），每户一整层、层层有退台花园；同族石材竖梃 +
 * 香槟铜线脚续街区族谱，冠部小穹顶亭 + 小月牙（r1.2，对主塔月牙保持克制从属）。
 * 南望 F4 灯花（一千扇窗的家）、东望 G3 留白（呼吸）、西对一期映月池前庭（街区礼仪轴）。
 *
 * 布局（局部原点 = 宗地中心，+x 东，+z 北，宗地 20×20 = ±10，本体退线 ±8）：
 * 塔身面线 ±7.6 居中立起（凸件尽收 ±8 内），两层石砌基座（0..8m：私享大堂 + 会所）；
 * 主入口朝西（对一期前庭），落客车道自南路引入；17 层四段退台至 67.5m，
 * 冠部会所环厅 + 穹顶亭 + 小月牙 ≈ 76m（甘居主塔 ~108m 之下，从体量）。
 * 场地：草皮满铺，月相步道环带接一期序列，东南角静水圆池「小水中月」+ 石凳花园。
 *
 * 夜景：基座洗墙 + 大堂内透 + 四成夜窗（家的窗灯比酒店密）+ 环厅暖光 + 小月牙——
 * 主塔月牙之侧的一点伴月。
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

/** 豪宅宽窗单元：落地宽玻 + 铜框 + 石窗台（大平层 2.5 宽窗）；lit 为夜窗 */
function wideWindow(g: THREE.Group, o: { x: number; y: number; z: number; rotY: number; lit: boolean; w?: number; h?: number }) {
  const grp = new THREE.Group()
  const W = o.w ?? 2.5, H = o.h ?? 2.5
  // 铜框（口字形四边）
  const ft = 0.12
  box(grp, W + ft * 2, ft, 0.14, C.copper, { y: H, metal: 0.8, rough: 0.38 })
  box(grp, W + ft * 2, ft, 0.14, C.copper, { y: -ft, metal: 0.8, rough: 0.38 })
  box(grp, ft, H, 0.14, C.copper, { x: -(W / 2 + ft / 2), y: 0, metal: 0.8, rough: 0.38 })
  box(grp, ft, H, 0.14, C.copper, { x: W / 2 + ft / 2, y: 0, metal: 0.8, rough: 0.38 })
  // 玻璃（中挺一分二）
  box(grp, W, H, 0.07, o.lit ? C.glassLit : C.glass, {
    y: 0, z: -0.02,
    metal: o.lit ? 0.2 : 0.55, rough: o.lit ? 0.35 : 0.2,
    emi: o.lit ? '#FFC98A' : '#1B2A3A', emiI: o.lit ? 0.8 : 0.3,
  })
  box(grp, 0.09, H, 0.1, C.copper, { y: 0, metal: 0.8, rough: 0.38 })
  // 石窗台
  box(grp, W + 0.5, 0.13, 0.26, C.stoneDeep, { y: -0.26, rough: 0.82 })
  grp.rotation.y = o.rotY
  grp.position.set(o.x, o.y, o.z)
  g.add(grp)
}

/** 通长阳台（薄挑板 + 铜细柱栏杆 + 铜扶手），沿 X 展开，y 为板底 */
function balcony(g: THREE.Group, o: { w: number; x?: number; y: number; z?: number; rotY?: number }) {
  const grp = new THREE.Group()
  const d = 0.3 // 挑出深度（收 ±8 退线内）
  box(grp, o.w, 0.14, d, C.stoneDeep, { y: -0.14, z: d / 2, rough: 0.82 })
  // 铜细柱 + 扶手
  const n = Math.max(2, Math.round(o.w / 0.85))
  for (let i = 0; i <= n; i++) {
    cyl(grp, 0.035, 0.045, 1.0, 8, C.copper, { x: -o.w / 2 + (o.w * i) / n, y: 0, z: d - 0.06, metal: 0.8, rough: 0.35 })
  }
  box(grp, o.w, 0.07, 0.09, C.copper, { y: 1.0, z: d - 0.06, metal: 0.8, rough: 0.35 })
  box(grp, o.w, 0.05, 0.07, C.copperDark, { y: 0.42, z: d - 0.06, metal: 0.78, rough: 0.4 })
  grp.rotation.y = o.rotY ?? 0
  grp.position.set(o.x ?? 0, o.y, o.z ?? 0)
  g.add(grp)
}

/** 层间铜线脚（单道挑板） */
function band(g: THREE.Group, w: number, y: number, x: number, z: number, rotY?: number) {
  const grp = new THREE.Group()
  box(grp, w, 0.12, 0.18, C.copper, { y: 0, metal: 0.8, rough: 0.38 })
  box(grp, w, 0.07, 0.12, C.copperDark, { y: 0.12, metal: 0.78, rough: 0.4 })
  grp.position.set(x, y, z)
  if (rotY) grp.rotation.y = rotY
  g.add(grp)
}

/** 精品树（同一期族谱，小号） */
function fineTree(g: THREE.Group, o: { x: number; z: number; scale?: number; seed: number }) {
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
  grp.position.set(o.x, 0, o.z)
  grp.userData.site = true
  g.add(grp)
}

// ============================== 尺寸常量 ==============================

const BASE_H = 8 // 基座 2 层
const FLOOR_H = 3.5
const SEG_FLOORS = [5, 5, 5, 2] // 四段：5+5+5+2 = 17 层
const SEG_HALF = [7.6, 6.9, 6.2, 5.4] // 各段半宽（云阶退台，段差 0.7 出戏剧环台）
const T_TOP = BASE_H + 17 * FLOOR_H // 67.5

// ============================== 场地 ==============================

function site(g: THREE.Group, ctx: BuildCtx) {
  // 草皮满铺 ±10
  box(g, 20, 0.12, 20, C.grass, { y: -0.12, rough: 0.95, shadow: false, site: true })
  // 月相步道环带（中线 ±8.8，宽 1.4，接一期序列）
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
  // 东南角「小水中月」静水圆池 + 石凳花园
  const pond = pool({ w: 4.2, d: 4.2, x: 6.3, y: 0.05, z: -6.3, waterColor: '#4A6B82' })
  g.add(pond)
  for (const a of [0.5, 1.8, 3.1] as const) {
    cyl(g, 0.28, 0.34, 0.45, 12, C.stoneDeep, { x: 6.3 + Math.cos(a) * 3.1, y: 0, z: -6.3 + Math.sin(a) * 3.1, rough: 0.85, site: true })
  }
  // 树（东南花园 2 + 东北 1 + 西侧 2 + 南 1）
  fineTree(g, { x: 4.2, z: -4.0, scale: 0.9, seed: 41 })
  fineTree(g, { x: 8.6, z: -3.4, scale: 1.05, seed: 42 })
  fineTree(g, { x: 6.6, z: 5.9, scale: 0.95, seed: 43 })
  fineTree(g, { x: -8.9, z: 4.6, scale: 0.9, seed: 44 })
  fineTree(g, { x: -8.9, z: -4.6, scale: 1.0, seed: 45 })
  fineTree(g, { x: -3.4, z: -8.9, scale: 0.85, seed: 46 })
  // 绿篱带（西入口两翼 + 南车道侧）
  for (const pz of [3.4, 5.4]) g.add(ctx.blocks.hedge({ w: 0.7, d: 2.4, x: -8.4, z: pz }))
  for (const px of [4.6, 7.2]) g.add(ctx.blocks.hedge({ w: 2.4, d: 0.7, x: px, z: -8.4 }))
  // 路灯 ×2 + 石盆 ×2
  g.add(ctx.blocks.streetLamp({ x: -8.8, z: 0, h: 4.5 }))
  g.add(ctx.blocks.streetLamp({ x: 8.8, z: -8.0, h: 4.5 }))
  g.add(ctx.blocks.urn({ x: -8.5, z: 1.8, scale: 1.1 }))
  g.add(ctx.blocks.urn({ x: -8.5, z: -1.8, scale: 1.1 }))
  // 落客车道（南路引入 → 西入口）
  box(g, 3.2, 0.11, 4.4, C.lane, { x: 0, y: 0, z: -8.0, rough: 0.92, site: true })
  box(g, 8.0, 0.11, 3.0, C.lane, { x: -4.6, y: 0, z: -4.0, rough: 0.92, site: true })
}

// ============================== 基座（2 层，8m） ==============================

function base(g: THREE.Group, ctx: BuildCtx) {
  const HB = SEG_HALF[0] // 7.6
  // 主体量 + 勒脚
  box(g, HB * 2, BASE_H, HB * 2, C.stone, { y: 0, rough: 0.8 })
  box(g, HB * 2 + 0.4, 0.8, HB * 2 + 0.4, C.stoneDeep, { y: 0, rough: 0.85 })
  for (const y of [1.6, 2.6]) {
    box(g, HB * 2 + 0.2, 0.16, HB * 2 + 0.2, C.stoneShade, { y, rough: 0.85 })
  }
  // 首层拱窗（大堂内透，lit 70%）：每面 3 扇（西面让位主入口 1 扇）
  const lit = () => ctx.rng() < 0.7
  const faces = [
    { dx: 0, dz: -1, rotY: Math.PI }, // 南
    { dx: 0, dz: 1, rotY: 0 }, // 北
    { dx: -1, dz: 0, rotY: -Math.PI / 2 }, // 西
    { dx: 1, dz: 0, rotY: Math.PI / 2 }, // 东
  ]
  for (const f of faces) {
    const n = f.dx === -1 ? 2 : 3
    for (let i = 0; i < n; i++) {
      // 西面两扇让位主入口（中段 ±3），置南北两端
      const t = f.dx === -1 ? (i === 0 ? -4.8 : 4.8) : -HB + 1.7 + ((HB * 2 - 3.4) * (i + 0.5)) / n
      g.add(archWindow({
        w: 1.9, h: 3.2, lit: lit(),
        x: f.dx !== 0 ? f.dx * HB : t,
        y: 1.0,
        z: f.dz !== 0 ? f.dz * HB : t,
        rotY: f.rotY,
      }))
    }
    // 二层竖梃 + 宽窗（每面 4 梃 3 窗）
    for (let i = 0; i <= 3; i++) {
      const t = -HB + 0.9 + ((HB * 2 - 1.8) * i) / 3
      box(g, f.dx !== 0 ? 0.3 : 0.55, 3.0, f.dx !== 0 ? 0.55 : 0.3, C.stone, {
        x: f.dx !== 0 ? f.dx * HB : t, y: 4.6, z: f.dz !== 0 ? f.dz * HB : t, rough: 0.78,
      })
    }
    for (let i = 0; i < 3; i++) {
      const t = -HB + 0.9 + ((HB * 2 - 1.8) * (i + 0.5)) / 3
      wideWindow(g, {
        x: f.dx !== 0 ? f.dx * HB : t,
        y: 4.9,
        z: f.dz !== 0 ? f.dz * HB : t,
        rotY: f.rotY,
        lit: ctx.rng() < 0.5,
        w: 2.2, h: 2.4,
      })
    }
    // 基座顶齿饰檐口 + 洗墙灯带
    g.add(dentilCourse({ w: HB * 2 + 0.3, x: f.dx !== 0 ? f.dx * HB : 0, y: BASE_H - 0.5, z: f.dz !== 0 ? f.dz * HB : 0, rotY: f.dx !== 0 ? Math.PI / 2 : 0 }))
  }
  box(g, HB * 2 + 0.5, 0.26, HB * 2 + 0.5, C.stone, { y: BASE_H - 0.1, rough: 0.78 })
  box(g, HB * 2 + 0.4, 0.09, HB * 2 + 0.4, C.glow, { y: BASE_H - 0.26, emi: C.glow, emiI: 0.9, shadow: false })
  // 主入口（西面）：双石柱 + 檐台 + 小月牙徽记 + 铜门（全部门廊构件收 ±8 退线内）
  box(g, 1.1, 0.4, 4.6, C.stoneDeep, { x: -HB + 0.3, y: 0, z: 0, rough: 0.85 })
  for (const pz of [-1.7, 1.7]) {
    cyl(g, 0.28, 0.34, 4.0, 14, C.stone, { x: -HB + 0.25, y: 0.4, z: pz, rough: 0.72 })
    box(g, 0.8, 0.26, 0.8, C.stoneDeep, { x: -HB + 0.25, y: 4.4, z: pz, rough: 0.8 })
  }
  box(g, 1.3, 0.45, 4.9, C.stone, { x: -HB + 0.3, y: 4.66, z: 0, rough: 0.78 })
  box(g, 1.4, 0.18, 5.2, C.copper, { x: -HB + 0.28, y: 5.11, z: 0, metal: 0.8, rough: 0.38 })
  g.add(crescent({ r: 0.6, y: 5.95, x: -HB + 0.1, z: 0, rotY: -Math.PI / 2, emissiveIntensity: 0.8 }))
  box(g, 0.12, 3.2, 2.6, C.copperDark, { x: -HB, y: 0.4, z: 0, metal: 0.7, rough: 0.4 })
  box(g, 0.08, 2.8, 2.2, C.glassLit, { x: -HB + 0.04, y: 0.55, z: 0, metal: 0.3, rough: 0.3, emi: '#FFC98A', emiI: 0.7 })
  // 入口台阶（薄板豁免）
  box(g, 1.4, 0.18, 5.0, C.stoneDeep, { x: -HB - 1.1, y: 0, z: 0, rough: 0.85, site: true })
  box(g, 1.0, 0.09, 4.4, C.stone, { x: -HB - 1.6, y: 0, z: 0, rough: 0.8, site: true })
}

// ============================== 塔身（四段退台 17 层，8→67.5m） ==============================

function tower(g: THREE.Group, ctx: BuildCtx) {
  const faces = [
    { dx: 0, dz: -1, rotY: Math.PI },
    { dx: 0, dz: 1, rotY: 0 },
    { dx: -1, dz: 0, rotY: -Math.PI / 2 },
    { dx: 1, dz: 0, rotY: Math.PI / 2 },
  ]
  let yBase = BASE_H
  let floorNo = 0
  for (let seg = 0; seg < 4; seg++) {
    const half = SEG_HALF[seg]
    const floors = SEG_FLOORS[seg]
    const segH = floors * FLOOR_H
    // 段主体量
    box(g, half * 2, segH, half * 2, C.stone, { y: yBase, rough: 0.8 })
    for (const f of faces) {
      // 每面 4 梃 3 宽窗（梃贯通段高）
      for (let i = 0; i <= 3; i++) {
        const t = -half + 0.85 + ((half * 2 - 1.7) * i) / 3
        const px = f.dx !== 0 ? f.dx * half : t
        const pz = f.dz !== 0 ? f.dz * half : t
        box(g, f.dx !== 0 ? 0.3 : 0.6, segH, f.dx !== 0 ? 0.6 : 0.3, C.stone, { x: px, y: yBase, z: pz, rough: 0.78 })
        box(g, f.dx !== 0 ? 0.36 : 0.72, 0.26, f.dx !== 0 ? 0.72 : 0.36, C.stoneDeep, { x: px, y: yBase + segH - 0.26, z: pz, rough: 0.82 })
      }
      for (let fl = 0; fl < floors; fl++) {
        const wy = yBase + fl * FLOOR_H + 0.55
        for (let i = 0; i < 3; i++) {
          const t = -half + 0.85 + ((half * 2 - 1.7) * (i + 0.5)) / 3
          wideWindow(g, {
            x: f.dx !== 0 ? f.dx * half : t,
            y: wy,
            z: f.dz !== 0 ? f.dz * half : t,
            rotY: f.rotY,
            lit: ctx.rng() < 0.33,
            w: seg === 3 ? 2.8 : 2.5, // 云顶大平层窗更大
            h: 2.5,
          })
        }
        // 每层通长阳台（凸出收 ±8 内）
        balcony(g, {
          w: half * 2 - 0.5,
          x: f.dx !== 0 ? f.dx * (half + 0.01) : 0,
          y: yBase + fl * FLOOR_H + 0.32,
          z: f.dz !== 0 ? f.dz * (half + 0.01) : 0,
          rotY: f.dx !== 0 ? Math.PI / 2 : 0,
        })
      }
      // 段顶铜线脚
      band(g, half * 2 + 0.3, yBase + segH - 0.19, f.dx !== 0 ? f.dx * half : 0, f.dz !== 0 ? f.dz * half : 0, f.dx !== 0 ? Math.PI / 2 : 0)
    }
    // 段顶洗墙灯环（云阶夜景分层点亮）+ 段顶铜线脚已在立面循环
    box(g, half * 2 + 0.36, 0.08, half * 2 + 0.36, C.glow, { y: yBase + segH - 0.08, emi: C.glow, emiI: 0.8, shadow: false })
    // 段顶退台花园（环形：栏杆 + 角花钵 + 角树 + 绿篱；末段无）
    if (seg < 3) {
      const next = SEG_HALF[seg + 1]
      const ringW = half - next // 退台环宽
      if (ringW > 0.3) {
        for (const f of faces) {
          balcony(g, {
            w: half * 2 + 0.1,
            x: f.dx !== 0 ? f.dx * (half - 0.28) : 0,
            y: yBase + segH + 0.14,
            z: f.dz !== 0 ? f.dz * (half - 0.28) : 0,
            rotY: f.dx !== 0 ? Math.PI / 2 : 0,
          })
        }
        for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
          g.add(ctx.blocks.urn({ x: cx * (next + ringW / 2), y: yBase + segH, z: cz * (next + ringW / 2), scale: 0.9 }))
          fineTree(g, { x: cx * (next + ringW / 2 + 0.5), z: cz * (next + ringW / 2 - 0.5), scale: 0.5, seed: 500 + seg * 10 + (cx + cz * 2 + 3) })
        }
        // 退台绿篱（四边段；官方 hedge 无 y 参数，退台件自绘）
        for (const f of faces) {
          box(g, f.dx !== 0 ? 0.5 : next * 2 - 1, 0.7, f.dx !== 0 ? next * 2 - 1 : 0.5, C.hedge, {
            x: f.dx !== 0 ? f.dx * (next + ringW / 2) : 0,
            y: yBase + segH,
            z: f.dz !== 0 ? f.dz * (next + ringW / 2) : 0,
            rough: 0.95,
          })
        }
      }
    }
    yBase += segH
    floorNo += floors
  }
  // 塔顶檐口 + 洗墙灯带
  const topHalf = SEG_HALF[3]
  box(g, topHalf * 2 + 0.4, 0.26, topHalf * 2 + 0.4, C.stone, { y: T_TOP - 0.1, rough: 0.78 })
  box(g, topHalf * 2 + 0.3, 0.09, topHalf * 2 + 0.3, C.glow, { y: T_TOP - 0.26, emi: C.glow, emiI: 0.85, shadow: false })
}

// ============================== 冠部（会所环厅 + 穹顶亭 + 小月牙，67.5→~76m） ==============================

function crown(g: THREE.Group) {
  let ty = T_TOP
  // 会所环厅（6.5²，石柱 8 + 玻璃内透）
  const CLUB = 3.25
  box(g, CLUB * 2, 2.6, CLUB * 2, C.glassLit, { y: ty, metal: 0.3, rough: 0.3, emi: '#FFC98A', emiI: 0.5 })
  for (const [dx, dz] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] as const) {
    box(g, 0.42, 2.7, 0.42, C.stone, { x: dx * CLUB, y: ty - 0.05, z: dz * CLUB, rough: 0.78 })
  }
  box(g, CLUB * 2 + 0.5, 0.24, CLUB * 2 + 0.5, C.stone, { y: ty + 2.6, rough: 0.78 })
  ty += 2.84
  // 穹顶亭（铜金半球 + 8 柱 + 泛光环 + 顶球）
  const PAV_R = 2.5
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    cyl(g, 0.14, 0.17, 1.9, 10, C.stone, { x: Math.cos(a) * (PAV_R - 0.25), y: ty, z: Math.sin(a) * (PAV_R - 0.25), rough: 0.75 })
  }
  cyl(g, PAV_R + 0.2, PAV_R + 0.2, 0.12, 20, C.glow, { y: ty + 1.86, emi: C.glow, emiI: 0.9 })
  cyl(g, PAV_R, PAV_R + 0.12, 0.24, 16, C.copper, { y: ty + 1.98, metal: 0.8, rough: 0.35 })
  const dome = new THREE.Mesh(new THREE.SphereGeometry(PAV_R - 0.1, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), M(C.dome, { metalness: 0.88, roughness: 0.3 }))
  dome.castShadow = true
  dome.position.y = ty + 2.14
  g.add(dome)
  for (let i = 0; i < 4; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(PAV_R - 0.02, 0.06, 8, 20, Math.PI), M(C.copperDark, { metalness: 0.85, roughness: 0.32 }))
    rib.rotation.y = (i / 4) * Math.PI
    rib.position.y = ty + 2.14
    g.add(rib)
  }
  // 小月牙（r1.2，对主塔保持克制从属）
  const spireY = ty + 2.14 + PAV_R - 0.1
  cyl(g, 0.08, 0.16, 1.2, 10, C.copper, { y: spireY, metal: 0.85, rough: 0.3 })
  g.add(crescent({ r: 1.2, depth: 0.26, y: spireY + 2.0, emissiveIntensity: 0.85 }))
  // ——通高 ~76m
}

// ============================== 入口 ==============================

export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()
  site(g, ctx)
  base(g, ctx)
  tower(g, ctx)
  crown(g)
  return g
}

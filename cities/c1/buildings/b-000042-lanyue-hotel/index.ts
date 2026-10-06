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
 * b-000042 揽月大酒店 Lanyue Grand Hotel · F3 揽月街区一期（builder.model_id = kimi-k3）
 * 街区总图：cities/c1/blockplans/F3.md 一期（F3-04+05+07+08，西南 2×2，40×40m）。
 *
 * 立意《一扇窗的巅峰》。模都第一座经典顶奢大饭店——与 E5 叠澜塔（现代天际设计酒店）
 * 错位：那边是新锐设计，这边是石材 + 香槟铜 + 月牙穹顶冠的经典大饭店（old money 恒久
 * 奢华，原型即中央公园南的 Plaza、香港中环的文华东方）。选址黄金三角：西南对角 E4 镜湖、
 * 西临 E3 博览、南接 F4 灯花——公园 + 会展 + 富人区，顶奢亘古不变的地段逻辑。
 * 母题「月·阙·云」：月牙穹顶冠、月相铺装、映月池水中月（月之暗面 = 揽月，Moonshot
 * 中文正解「可上九天揽月」）；经典三段式塔身（阙）；云顶餐厅与退台云阶（云）。
 *
 * 布局（局部原点 = 宗地中心，+x 东，+z 北，宗地 40×40 = ±20，本体退线 ±18）：
 * L 型裙楼（西翼 x −16..−3 × z ±16；南翼 x ±16 × z −16..−3，高 18m 四层）围合东北前庭
 * （映月池 + 落客廊，自北路引入）；塔身 17.6×17.6 立于西南 C 位（中心 (−9,−9)，
 * 18 层 82.8m）揽三向对景；冠部三层退台 + 八角鼓座 + 铜金穹顶 + 月牙尖，通高 ~105m，
 * 甘居原点塔 211m / 叠澜塔 116m 之下——顶级靠品质，不靠压高。
 *
 * 夜景：檐口暖金洗墙灯带 + 大堂内透 + 塔身三成窗灯 + 鼓座泛光环 + 月牙尖自发光——
 * 全城最克制、也最贵的一道光。
 */

const C = {
  stone: '#E8E2D4', // 月光石主墙
  stoneDeep: '#D6CDBC', // 石材深色（基座/线脚/隅石）
  stoneShade: '#CFC5B2', // 凹槽石影
  copper: '#B08D57', // 香槟铜（檐口/窗框/线脚）
  copperDark: '#8F6F42',
  dome: '#C9A96A', // 穹顶铜金
  glass: '#2A3F54', // 深拱窗玻璃
  glassLit: '#FFD9A0', // 夜窗暖光
  water: '#4A6B82',
  grass: '#8C9E8B',
  grassDeep: '#7B8F76',
  pave: '#D8D5CE',
  paveDark: '#B2AFA7',
  lane: '#A9A49B', // 车道
  hedge: '#6E7F5C',
  trunk: '#6B4A2F',
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

/** 层间铜线脚：三道薄板叠出（挑-收-挑），沿 X 展开 */
function stringCourse(g: THREE.Group, w: number, y: number, x: number, z: number, rotY?: number) {
  const grp = new THREE.Group()
  box(grp, w, 0.14, 0.16, C.copper, { y: 0, metal: 0.8, rough: 0.38 })
  box(grp, w, 0.1, 0.22, C.copperDark, { y: 0.14, metal: 0.78, rough: 0.4 })
  box(grp, w, 0.1, 0.14, C.copper, { y: 0.24, metal: 0.8, rough: 0.38 })
  grp.position.set(x, y, z)
  if (rotY) grp.rotation.y = rotY
  g.add(grp)
}

/** 塔身标准窗单元：深玻璃 + 铜窗套（左右梃/楣梁/窗台）+ 三角楣饰；lit 为夜窗 */
function pierWindow(g: THREE.Group, o: { x: number; y: number; z: number; rotY: number; lit: boolean; w?: number }) {
  const grp = new THREE.Group()
  const W = o.w ?? 1.7, H = 2.3
  // 玻璃
  box(grp, W, H, 0.08, o.lit ? C.glassLit : C.glass, {
    y: 0, z: 0.02,
    metal: o.lit ? 0.2 : 0.55, rough: o.lit ? 0.4 : 0.22,
    emi: o.lit ? '#FFC98A' : '#1B2A3A', emiI: o.lit ? 0.85 : 0.3,
  })
  // 窗套：左右梃 + 楣梁 + 窗台
  box(grp, 0.22, H + 0.3, 0.18, C.stone, { x: -(W / 2 + 0.11), y: -0.15, rough: 0.8 })
  box(grp, 0.22, H + 0.3, 0.18, C.stone, { x: W / 2 + 0.11, y: -0.15, rough: 0.8 })
  box(grp, W + 0.66, 0.22, 0.2, C.stone, { y: H + 0.08, rough: 0.8 })
  box(grp, W + 0.66, 0.14, 0.3, C.stoneDeep, { y: -0.29, rough: 0.82 })
  // 三角楣饰（pediment）
  const tri = new THREE.Shape()
  tri.moveTo(-(W / 2 + 0.33), 0); tri.lineTo(W / 2 + 0.33, 0); tri.lineTo(0, 0.42); tri.closePath()
  const ped = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.16, bevelEnabled: false }), M(C.stone, { roughness: 0.8 }))
  ped.castShadow = true
  ped.position.set(0, H + 0.3, -0.06)
  grp.add(ped)
  // 窗台铜板
  box(grp, W + 0.2, 0.1, 0.24, C.copper, { y: -0.15, z: 0.02, metal: 0.8, rough: 0.38 })
  grp.rotation.y = o.rotY
  grp.position.set(o.x, o.y, o.z)
  g.add(grp)
}

/** 贯通竖梃（整段通高）：梃身 + 梃帽 + 梃基 */
function pier(g: THREE.Group, o: { x: number; y: number; z: number; h: number; rotY: number; w?: number; d?: number }) {
  const grp = new THREE.Group()
  const w = o.w ?? 0.5, d = o.d ?? 0.26
  box(grp, w, o.h, d, C.stone, { y: 0, rough: 0.78 })
  box(grp, w + 0.12, 0.3, d + 0.08, C.stoneDeep, { y: o.h - 0.3, rough: 0.82 })
  box(grp, w + 0.12, 0.24, d + 0.08, C.stoneDeep, { y: 0, rough: 0.82 })
  grp.rotation.y = o.rotY
  grp.position.set(o.x, o.y, o.z)
  g.add(grp)
}

/** 加密栏杆（顶奢密柱 + 球形柱头），沿 X 展开，y 为底部 */
function balustrade(g: THREE.Group, o: { w: number; x?: number; y?: number; z?: number; rotY?: number }) {
  const grp = new THREE.Group()
  const h = 1.1
  box(grp, o.w, 0.14, 0.3, C.stone, { y: h - 0.14, rough: 0.78 }) // 扶手
  box(grp, o.w, 0.1, 0.22, C.stoneDeep, { y: 0, rough: 0.82 }) // 踢脚
  const n = Math.max(2, Math.round(o.w / 0.55))
  for (let i = 0; i <= n; i++) {
    const px = -o.w / 2 + (o.w * i) / n
    cyl(grp, 0.06, 0.09, h - 0.24, 10, C.stone, { x: px, y: 0.1, rough: 0.78 })
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), M(C.stone, { roughness: 0.78 }))
    ball.position.set(px, h - 0.21, 0)
    grp.add(ball)
  }
  grp.rotation.y = o.rotY ?? 0
  grp.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0)
  g.add(grp)
}

/** 精品树（五球冠 + 分枝），seed 走 ctx.rng 上游确定性 */
function fineTree(g: THREE.Group, o: { x: number; z: number; scale?: number; seed: number }) {
  const grp = new THREE.Group()
  let s = o.seed >>> 0
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  cyl(grp, 0.14, 0.24, 2.2, 10, C.trunk, { y: 0, rough: 0.9 })
  cyl(grp, 0.07, 0.1, 1.1, 8, C.trunk, { x: 0.3, y: 1.7, z: 0.2, rough: 0.9 })
  for (let i = 0; i < 5; i++) {
    const r = 0.75 + rnd() * 0.45
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), M(i % 2 ? C.grass : C.hedge, { roughness: 0.92 }))
    leaf.castShadow = true
    leaf.position.set((rnd() - 0.5) * 1.3, 2.5 + i * 0.55 + rnd() * 0.3, (rnd() - 0.5) * 1.3)
    grp.add(leaf)
  }
  const sc = o.scale ?? 1
  grp.scale.set(sc, sc, sc)
  grp.position.set(o.x, 0, o.z)
  grp.userData.site = true
  g.add(grp)
}

/** 穹顶凉亭（屋面花园件）：四石柱 + 檐环 + 小铜穹顶 + 顶球 */
function gazebo(g: THREE.Group, o: { x: number; y: number; z: number }) {
  const grp = new THREE.Group()
  for (const [px, pz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]] as const) {
    cyl(grp, 0.14, 0.17, 2.6, 14, C.stone, { x: px, y: 0, z: pz, rough: 0.75 })
    box(grp, 0.44, 0.16, 0.44, C.stoneDeep, { x: px, y: 2.6, z: pz, rough: 0.8 })
  }
  cyl(grp, 1.85, 1.85, 0.3, 8, C.stone, { y: 2.76, rough: 0.78 })
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.7, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), M(C.dome, { metalness: 0.85, roughness: 0.32 }))
  dome.castShadow = true
  dome.position.y = 3.06
  grp.add(dome)
  cyl(grp, 0.06, 0.06, 0.5, 8, C.copper, { y: 4.7, metal: 0.85, rough: 0.3 })
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), M(C.dome, { metalness: 0.85, roughness: 0.3, emissive: C.glow, emissiveIntensity: 0.4 }))
  ball.position.y = 5.05
  grp.add(ball)
  grp.position.set(o.x, o.y, o.z)
  g.add(grp)
}

/** 旗杆：石座 + 铜杆 + 深青旗面（波形分段）+ 顶球 */
function flagpole(g: THREE.Group, o: { x: number; z: number; h?: number }) {
  const grp = new THREE.Group()
  const h = o.h ?? 9
  box(grp, 0.7, 0.5, 0.7, C.stoneDeep, { y: 0, rough: 0.85 })
  cyl(grp, 0.05, 0.08, h, 10, C.copper, { y: 0.5, metal: 0.85, rough: 0.3 })
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), M(C.dome, { metalness: 0.85, roughness: 0.3 }))
  ball.position.y = h + 0.6
  grp.add(ball)
  // 波形旗面（平面几何逐列起伏）
  const geo = new THREE.PlaneGeometry(2.2, 1.3, 12, 4)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i)
    pos.setZ(i, Math.sin(px * 2.6) * 0.12 * (px / 2.2 + 0.5))
  }
  geo.computeVertexNormals()
  const flag = new THREE.Mesh(geo, M('#3E5C76', { roughness: 0.7, side: THREE.DoubleSide }))
  flag.castShadow = true
  flag.position.set(1.15, h - 0.15, 0)
  grp.add(flag)
  grp.position.set(o.x, 0, o.z)
  grp.userData.site = true
  g.add(grp)
}

// ============================== 场地（草皮满铺 + 月相步道 + 树阵） ==============================

function site(g: THREE.Group, ctx: BuildCtx) {
  // 草皮满铺至宗地边缘（±20）
  box(g, 40, 0.12, 40, C.grass, { y: -0.12, rough: 0.95, shadow: false, site: true })
  // 环带月相步道（四边，中线 ±18.2，宽 1.8）
  for (const [w, d, x, z] of [
    [40, 1.8, 0, 18.2], [40, 1.8, 0, -18.2],
    [1.8, 36.4, 18.2, 0], [1.8, 36.4, -18.2, 0],
  ] as const) {
    box(g, w, 0.1, d, C.pave, { x, y: -0.02, z, rough: 0.9, site: true })
  }
  // 月相石板序列（朔→弦→望→晦 循环，转角为望）
  const phases = [0, 1, 2, 3, 2, 1] as const
  let pi = 0
  for (const side of [0, 1, 2, 3]) {
    for (let k = 0; k < 6; k++) {
      const t = -15 + k * 6
      const [px, pz] = side === 0 ? [t, 18.2] : side === 1 ? [18.2, -t] : side === 2 ? [-t, -18.2] : [-18.2, t]
      g.add(moonPaver({ phase: phases[pi % phases.length], x: px, y: 0.04, z: pz }))
      pi++
    }
  }
  // 四角大树 + 步道内侧树阵
  const trees: [number, number, number][] = [
    [-17, -17, 1.15], [17, -17, 1.1], [17, 17, 1.2], [-17, 17, 1.05],
    [-11, 17.8, 0.9], [1, 17.8, 0.95], [11.5, 17.6, 0.9],
    [17.8, -8, 0.9], [17.6, -14, 1.0], [-17.8, -8, 0.95],
    [-14, -17.8, 0.9], [8, -17.8, 0.95],
  ]
  trees.forEach(([x, z, s], i) => fineTree(g, { x, z, scale: s, seed: 700 + i * 13 }))
  // 路灯（四角 + 南北中点）
  const lamps: [number, number][] = [[-18.6, -18.6], [18.6, -18.6], [18.6, 18.6], [-18.6, 18.6], [0, 18.6], [-18.6, 0]]
  for (const [x, z] of lamps) g.add(ctx.blocks.streetLamp({ x, z, h: 5 }))
  // 石盆（步道转角）
  for (const [x, z] of [[-18.2, 12], [18.2, 12], [18.2, -12], [-12, -18.2], [12, -18.2]] as const) {
    g.add(ctx.blocks.urn({ x, z, scale: 1.2 }))
  }
}

// ============================== 裙楼（L 型四层，18m） ==============================

const POD_H = 18
const L1 = 5.4, L2 = 9.6, L3 = 13.8 // 层界线：首层 5.4 / 二三 4.2 / 四层 4.2

function podium(g: THREE.Group, ctx: BuildCtx) {
  // ---- 主体量（西翼 x −16..−3 × z ±16；南翼 x ±16 × z −16..−3）----
  box(g, 13, POD_H, 32, C.stone, { x: -9.5, y: 0, z: 0, rough: 0.8 })
  box(g, 32, POD_H, 13, C.stone, { x: 0, y: 0, z: -9.5, rough: 0.8 })
  // 基座凹槽石线脚（首层水平三道，绕两翼外缘）
  for (const y of [0.9, 1.7, 2.5]) {
    box(g, 13.3, 0.18, 32.3, C.stoneShade, { x: -9.5, y, z: 0, rough: 0.85 })
    box(g, 32.3, 0.18, 13.3, C.stoneShade, { x: 0, y, z: -9.5, rough: 0.85 })
  }
  // 勒脚（基座加厚带 0..0.9）
  box(g, 13.5, 0.9, 32.5, C.stoneDeep, { x: -9.5, y: 0, z: 0, rough: 0.85 })
  box(g, 32.5, 0.9, 13.5, C.stoneDeep, { x: 0, y: 0, z: -9.5, rough: 0.85 })

  // ---- 首层：高拱窗（大堂内透，lit 比例 60%）----
  const lit = () => ctx.rng() < 0.6
  // 西翼西面（x=−16，朝西对 E3 博览）7 扇
  for (let i = 0; i < 7; i++) g.add(archWindow({ w: 2.0, h: 3.8, lit: lit(), x: -16, y: 1.1, z: -13.2 + i * 4.4, rotY: -Math.PI / 2 }))
  // 西翼北面（z=+16）2 扇
  for (let i = 0; i < 2; i++) g.add(archWindow({ w: 2.0, h: 3.8, lit: lit(), x: -14 + i * 4.4, y: 1.1, z: 16, rotY: 0 }))
  // 西翼东面（朝前庭）4 扇（主入口门廊占 z 1.9..7.1，让位）
  for (let i = 0; i < 3; i++) g.add(archWindow({ w: 1.8, h: 3.8, lit: lit(), x: -3, y: 1.1, z: 9.5 + i * 3.2, rotY: Math.PI / 2 }))
  g.add(archWindow({ w: 1.8, h: 3.8, lit: lit(), x: -3, y: 1.1, z: -1.2, rotY: Math.PI / 2 }))
  // 南翼南面（朝 F4 灯花）7 扇
  for (let i = 0; i < 7; i++) g.add(archWindow({ w: 2.0, h: 3.8, lit: lit(), x: -13.2 + i * 4.4, y: 1.1, z: -16, rotY: Math.PI }))
  // 南翼东面（朝东南角地）2 扇
  for (let i = 0; i < 2; i++) g.add(archWindow({ w: 1.8, h: 3.8, lit: lit(), x: 16, y: 1.1, z: -13 + i * 4.0, rotY: Math.PI / 2 }))
  // 南翼北面（朝前庭）4 扇（让位映月池轴）
  for (let i = 0; i < 4; i++) g.add(archWindow({ w: 1.8, h: 3.8, lit: lit(), x: 0.5 + i * 3.4, y: 1.1, z: -3, rotY: 0 }))

  // ---- 主入口（西翼东面，朝前庭）：三门廊 + 石柱 + 月牙徽记 ----
  // 门廊石台
  box(g, 1.2, 0.45, 6.4, C.stoneDeep, { x: -2.4, y: 0, z: 4.5, rough: 0.85 })
  // 双柱
  for (const pz of [1.9, 7.1]) {
    cyl(g, 0.32, 0.38, 4.6, 16, C.stone, { x: -2.1, y: 0.45, z: pz, rough: 0.72 })
    box(g, 0.95, 0.3, 0.95, C.stoneDeep, { x: -2.1, y: 5.05, z: pz, rough: 0.8 })
  }
  // 门廊檐台 + 楣 + 月牙徽记
  box(g, 1.7, 0.5, 7.0, C.stone, { x: -2.45, y: 5.35, z: 4.5, rough: 0.78 })
  box(g, 1.9, 0.22, 7.4, C.copper, { x: -2.45, y: 5.85, z: 4.5, metal: 0.8, rough: 0.38 })
  g.add(crescent({ r: 0.9, y: 7.3, x: -2.2, z: 4.5, rotY: Math.PI / 2, emissiveIntensity: 0.8 }))
  // 三扇大门（铜框深玻璃 + 门亮子）
  for (const pz of [2.6, 4.5, 6.4]) {
    box(g, 0.14, 3.4, 1.5, C.copperDark, { x: -3, y: 0.45, z: pz, metal: 0.7, rough: 0.4 })
    box(g, 0.1, 3.0, 1.2, C.glassLit, { x: -2.95, y: 0.6, z: pz, metal: 0.3, rough: 0.3, emi: '#FFC98A', emiI: 0.7 })
  }

  // ---- 二三层：竖梃 + 标准窗网格（层间铜线脚）----
  const bayW = 2.2
  // 西翼西面/东面、西翼北面；南翼南面/北面、南翼东面
  const faces: { kind: 'x' | 'z'; at: number; from: number; to: number; rotY: number }[] = [
    { kind: 'x', at: -16, from: -15, to: 15, rotY: -Math.PI / 2 }, // 西翼西
    { kind: 'x', at: -3, from: -2, to: 15, rotY: Math.PI / 2 }, // 西翼东（前庭）
    { kind: 'z', at: 16, from: -15, to: -4, rotY: 0 }, // 西翼北
    { kind: 'z', at: -16, from: -15, to: 15, rotY: Math.PI }, // 南翼南
    { kind: 'z', at: -3, from: -2, to: 15, rotY: 0 }, // 南翼北（前庭）
    { kind: 'x', at: 16, from: -15, to: -4, rotY: Math.PI / 2 }, // 南翼东
  ]
  for (const f of faces) {
    const len = f.to - f.from
    const nBay = Math.floor(len / bayW)
    for (const [fy, fh] of [[L1, L2 - L1], [L2, L3 - L2]] as const) {
      // 竖梃
      for (let i = 0; i <= nBay; i++) {
        const t = f.from + (len * i) / nBay
        pier(g, f.kind === 'x'
          ? { x: f.at, y: fy, z: t, h: fh, rotY: f.rotY }
          : { x: t, y: fy, z: f.at, h: fh, rotY: f.rotY })
      }
      // 窗
      for (let i = 0; i < nBay; i++) {
        const t = f.from + (len * (i + 0.5)) / nBay
        pierWindow(g, f.kind === 'x'
          ? { x: f.at, y: fy + 0.75, z: t, rotY: f.rotY, lit: ctx.rng() < 0.35 }
          : { x: t, y: fy + 0.75, z: f.at, rotY: f.rotY, lit: ctx.rng() < 0.35 })
      }
    }
    // 层间线脚（三层顶两道）
    for (const cy of [L1 - 0.26, L2 - 0.26, L3 - 0.26]) {
      stringCourse(g, len + 0.4, cy, f.kind === 'x' ? f.at : (f.from + f.to) / 2, f.kind === 'x' ? (f.from + f.to) / 2 : f.at, f.kind === 'x' ? Math.PI / 2 : 0)
    }
  }

  // ---- 四层（檐口层）：连续小拱窗带 + 齿饰檐口 ----
  for (const f of faces) {
    const len = f.to - f.from
    const nWin = Math.floor(len / 2.6)
    for (let i = 0; i < nWin; i++) {
      const t = f.from + (len * (i + 0.5)) / nWin
      g.add(archWindow({ w: 1.5, h: 2.5, lit: ctx.rng() < 0.4, ...(f.kind === 'x' ? { x: f.at, z: t } : { x: t, z: f.at }), y: L3 + 0.55, rotY: f.rotY }))
    }
    // 齿饰檐口（四面通长）
    g.add(dentilCourse({ w: len + 0.5, ...(f.kind === 'x' ? { x: f.at, z: (f.from + f.to) / 2 } : { x: (f.from + f.to) / 2, z: f.at }), y: POD_H - 0.55, rotY: f.kind === 'x' ? Math.PI / 2 : 0 }))
  }
  // 檐口挑板 + 洗墙灯带（夜景暖金）
  box(g, 13.8, 0.3, 32.8, C.stone, { x: -9.5, y: POD_H - 0.12, z: 0, rough: 0.78 })
  box(g, 32.8, 0.3, 13.8, C.stone, { x: 0, y: POD_H - 0.12, z: -9.5, rough: 0.78 })
  box(g, 13.9, 0.1, 32.9, C.glow, { x: -9.5, y: POD_H - 0.3, z: 0, emi: C.glow, emiI: 0.9, shadow: false })
  box(g, 32.9, 0.1, 13.9, C.glow, { x: 0, y: POD_H - 0.3, z: -9.5, emi: C.glow, emiI: 0.9, shadow: false })

  // ---- 转角隅石（两翼外转角 + 前庭内转角）----
  g.add(quoins({ h: POD_H - 0.4, x: -16, y: 0.2, z: 16, dirX: -1, dirZ: 1 })) // 西北角
  g.add(quoins({ h: POD_H - 0.4, x: -16, y: 0.2, z: -16, dirX: -1, dirZ: -1 })) // 西南角
  g.add(quoins({ h: POD_H - 0.4, x: 16, y: 0.2, z: -16, dirX: 1, dirZ: -1 })) // 东南角
  g.add(quoins({ h: POD_H - 0.4, x: 16, y: 0.2, z: -3, dirX: 1, dirZ: 1 })) // 南翼东北端
  g.add(quoins({ h: POD_H - 0.4, x: -3, y: 0.2, z: 16, dirX: -1, dirZ: 1 })) // 西翼东北端

  // ---- 屋面空中花园（18m 标高）：泳池 + 凉亭 + 绿篱 + 栏杆 ----
  // 南翼屋面：泳池 + 凉亭
  g.add(pool({ w: 11, d: 5.5, x: 6, y: POD_H, z: -9.5, waterColor: '#5A8BA8' }))
  gazebo(g, { x: -4.5, y: POD_H, z: -9.5 })
  // 西翼屋面：露台铺装 + 绿篱迷宫感
  box(g, 11.5, 0.08, 30, C.pave, { x: -9.5, y: POD_H, z: 0, rough: 0.9 })
  for (let i = 0; i < 5; i++) g.add(ctx.blocks.hedge({ w: 8, d: 0.7, x: -9.5, z: -11 + i * 5.5 }))
  for (const pz of [-13, -2, 9]) g.add(ctx.blocks.urn({ x: -5.2, y: POD_H, z: pz, scale: 1.1 }))
  // 女儿墙栏杆（两翼外缘屋面）
  balustrade(g, { w: 32.4, x: -16.2, y: POD_H, z: 0, rotY: Math.PI / 2 })
  balustrade(g, { w: 12.8, x: -9.5, y: POD_H, z: 16.2 })
  balustrade(g, { w: 32.4, x: 0, y: POD_H, z: -16.2 })
  balustrade(g, { w: 12.8, x: 16.2, y: POD_H, z: -9.5, rotY: Math.PI / 2 })
}

// ============================== 塔身（17.6×17.6，18 层，18→82.8m） ==============================

const TX = -9, TZ = -9 // 塔身中心
const TH = 17.4 / 2 // 塔身半宽 8.7（面线 ±17.7，立面凸件尽收 ±18 退线内）
const FLOOR_H = 3.6
const FLOORS = 18
const T_TOP = POD_H + FLOORS * FLOOR_H // 82.8

function tower(g: THREE.Group, ctx: BuildCtx) {
  // 主体量（石色核心，立面构件外挂）
  box(g, TH * 2, FLOORS * FLOOR_H, TH * 2, C.stone, { x: TX, y: POD_H, z: TZ, rough: 0.8 })
  // 塔身落地基座（裙楼内收一层，18..21.6 过渡层宽线脚）
  stringCourse(g, TH * 2 + 0.2, POD_H + 0.4, TX, TZ - TH, 0)
  stringCourse(g, TH * 2 + 0.2, POD_H + 0.4, TX, TZ + TH, 0)
  stringCourse(g, TH * 2 + 0.2, POD_H + 0.4, TX - TH, TZ, Math.PI / 2)
  stringCourse(g, TH * 2 + 0.2, POD_H + 0.4, TX + TH, TZ, Math.PI / 2)

  const faces = [
    { dx: 0, dz: -1, rotY: Math.PI }, // 南
    { dx: 0, dz: 1, rotY: 0 }, // 北
    { dx: -1, dz: 0, rotY: -Math.PI / 2 }, // 西
    { dx: 1, dz: 0, rotY: Math.PI / 2 }, // 东
  ]
  for (const f of faces) {
    // 每面：6 梃 5 窗，贯通 18 层（顶部两层改拱窗层）；梃加粗显石感、窗收窄（墙窗比 ~60:40）
    for (let i = 0; i <= 5; i++) {
      const t = -TH + 1.1 + ((TH * 2 - 2.2) * i) / 5
      const px = TX + (f.dx !== 0 ? f.dx * TH : t)
      const pz = TZ + (f.dz !== 0 ? f.dz * TH : t)
      pier(g, { x: px, y: POD_H, z: pz, h: FLOOR_H * 16, rotY: f.rotY, w: 0.62, d: 0.32 })
      box(g, f.dx !== 0 ? 0.4 : 0.74, FLOOR_H * 2, f.dx !== 0 ? 0.74 : 0.4, C.stoneDeep, { x: px, y: POD_H + FLOOR_H * 16, z: pz, rough: 0.8 })
    }
    // 标准层窗（1..15 层，16 层起拱窗层）
    for (let fl = 0; fl < 16; fl++) {
      const wy = POD_H + fl * FLOOR_H + 0.7
      for (let i = 0; i < 5; i++) {
        const t = -TH + 1.1 + ((TH * 2 - 2.2) * (i + 0.5)) / 5
        pierWindow(g, {
          x: TX + (f.dx !== 0 ? f.dx * TH : t),
          y: wy,
          z: TZ + (f.dz !== 0 ? f.dz * TH : t),
          rotY: f.rotY,
          lit: ctx.rng() < 0.3,
          w: 1.5,
        })
      }
      // 每层一道细线脚（水平阴影缝），每三层一道宽铜线脚
      const along = f.dx !== 0
      const cy = POD_H + (fl + 1) * FLOOR_H
      box(g, along ? 0.14 : TH * 2 + 0.3, 0.1, along ? TH * 2 + 0.3 : 0.14, C.stoneShade, {
        x: TX + (along ? f.dx * TH : 0), y: cy - 0.1, z: TZ + (along ? 0 : f.dz * TH), rough: 0.85,
      })
      if ((fl + 1) % 3 === 0) {
        stringCourse(g, TH * 2 + 0.5, cy - 0.34, TX + (along ? f.dx * TH : 0), TZ + (along ? 0 : f.dz * TH), along ? Math.PI / 2 : 0)
      }
    }
    // 顶部拱窗层（16F/17F 通高拱窗 4 扇）
    for (let i = 0; i < 4; i++) {
      const t = -TH + 1.6 + ((TH * 2 - 3.2) * (i + 0.5)) / 4
      g.add(archWindow({
        w: 2.3, h: 5.9, lit: ctx.rng() < 0.5,
        x: TX + (f.dx !== 0 ? f.dx * TH : t),
        y: POD_H + 16 * FLOOR_H + 0.7,
        z: TZ + (f.dz !== 0 ? f.dz * TH : t),
        rotY: f.rotY,
      }))
    }
    // 拱窗层顶齿饰檐口
    g.add(dentilCourse({
      w: TH * 2 + 0.3,
      x: TX + (f.dx !== 0 ? f.dx * TH : 0),
      y: T_TOP - 0.5,
      z: TZ + (f.dz !== 0 ? f.dz * TH : 0),
      rotY: f.dx !== 0 ? Math.PI / 2 : 0,
    }))
  }
  // 塔顶檐口挑板 + 洗墙灯带（外缘收 ±18 退线内）
  box(g, TH * 2 + 0.5, 0.32, TH * 2 + 0.5, C.stone, { x: TX, y: T_TOP - 0.14, z: TZ, rough: 0.78 })
  box(g, TH * 2 + 0.4, 0.1, TH * 2 + 0.4, C.glow, { x: TX, y: T_TOP - 0.32, z: TZ, emi: C.glow, emiI: 0.85, shadow: false })
  // 塔基过渡：裙楼屋面塔身四角石盆（景观件豁免退线）
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    g.add(ctx.blocks.urn({ x: TX + dx * (TH + 0.9), y: POD_H, z: TZ + dz * (TH + 0.9), scale: 1.3 }))
  }
}

// ============================== 冠部（退台×3 + 鼓座 + 穹顶 + 月牙尖，82.8→105m） ==============================

function crown(g: THREE.Group, ctx: BuildCtx) {
  // 三层退台（云阶）：15² / 12² / 9.5²，各 2.7m，屋面栏杆 + 角石盆
  const tiers: [number, number][] = [[15, 2.7], [12, 2.7], [9.5, 2.7]]
  let ty = T_TOP
  for (const [w, h] of tiers) {
    box(g, w, h, w, C.stone, { x: TX, y: ty, z: TZ, rough: 0.8 })
    // 竖梃饰面（每面 4 梃）
    for (const f of [[0, -1, 0], [0, 1, Math.PI], [-1, 0, Math.PI / 2], [1, 0, -Math.PI / 2]] as const) {
      for (let i = 0; i < 4; i++) {
        const t = -w / 2 + ((i + 0.5) * w) / 4
        box(g, 0.4, h - 0.5, 0.22, C.stoneDeep, {
          x: TX + (f[0] !== 0 ? f[0] * w / 2 : t),
          y: ty + 0.25,
          z: TZ + (f[1] !== 0 ? f[1] * w / 2 : t),
          rotY: f[2],
          rough: 0.82,
        })
      }
    }
    balustrade(g, { w, x: TX, y: ty + h, z: TZ - w / 2 })
    balustrade(g, { w, x: TX, y: ty + h, z: TZ + w / 2 })
    balustrade(g, { w, x: TX - w / 2, y: ty + h, z: TZ, rotY: Math.PI / 2 })
    balustrade(g, { w, x: TX + w / 2, y: ty + h, z: TZ, rotY: Math.PI / 2 })
    // 檐口线脚
    box(g, w + 0.5, 0.22, w + 0.5, C.copper, { x: TX, y: ty + h - 0.22, z: TZ, metal: 0.8, rough: 0.38 })
    ty += h
  }
  // 云顶餐厅层（最上退台玻璃环厅，内透暖光）
  box(g, 7.6, 2.4, 7.6, C.glassLit, { x: TX, y: ty, z: TZ, metal: 0.3, rough: 0.3, emi: '#FFC98A', emiI: 0.55 })
  for (const [dx, dz] of [[-3.9, 0], [3.9, 0], [0, -3.9], [0, 3.9]] as const) {
    box(g, dx === 0 ? 8.2 : 0.5, 2.6, dz === 0 ? 8.2 : 0.5, C.stone, { x: TX + dx, y: ty - 0.1, z: TZ + dz, rough: 0.8 })
  }
  ty += 2.4
  // 八角鼓座（柱廊 + 小拱窗）
  const DRUM_R = 4.3, DRUM_H = 3.5
  cyl(g, DRUM_R, DRUM_R + 0.2, DRUM_H, 8, C.stone, { x: TX, y: ty, z: TZ, rough: 0.78 })
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8
    const px = TX + Math.cos(a) * (DRUM_R + 0.15)
    const pz = TZ + Math.sin(a) * (DRUM_R + 0.15)
    cyl(g, 0.16, 0.19, DRUM_H - 0.5, 12, C.stoneDeep, { x: px, y: ty + 0.25, z: pz, rough: 0.8 })
    g.add(archWindow({ w: 0.9, h: 1.9, lit: true, x: TX + Math.cos(a + Math.PI / 8) * (DRUM_R + 0.05), y: ty + 0.8, z: TZ + Math.sin(a + Math.PI / 8) * (DRUM_R + 0.05), rotY: -a - Math.PI / 8 + Math.PI / 2 }))
  }
  // 鼓座泛光环（夜景）
  cyl(g, DRUM_R + 0.45, DRUM_R + 0.45, 0.14, 24, C.glow, { x: TX, y: ty + DRUM_H, z: TZ, emi: C.glow, emiI: 0.9, site: false })
  // 鼓座檐环
  cyl(g, DRUM_R + 0.55, DRUM_R + 0.55, 0.3, 24, C.copper, { x: TX, y: ty + DRUM_H + 0.14, z: TZ, metal: 0.8, rough: 0.35 })
  ty += DRUM_H + 0.44
  // 铜金穹顶（半球 + 经肋 + 纬环）
  const DOME_R = 4.9
  const dome = new THREE.Mesh(new THREE.SphereGeometry(DOME_R, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2), M(C.dome, { metalness: 0.88, roughness: 0.3 }))
  dome.castShadow = true
  dome.position.set(TX, ty, TZ)
  g.add(dome)
  // 经肋（半圆环竖放旋转）
  for (let i = 0; i < 6; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(DOME_R + 0.08, 0.09, 8, 24, Math.PI), M(C.copperDark, { metalness: 0.85, roughness: 0.32 }))
    rib.rotation.z = 0
    rib.rotation.y = (i / 6) * Math.PI
    rib.position.set(TX, ty, TZ)
    g.add(rib)
  }
  // 纬环两道
  for (const [ry, rr] of [[DOME_R * 0.45, DOME_R * 0.9], [DOME_R * 0.75, DOME_R * 0.68]] as const) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.07, 8, 28), M(C.copperDark, { metalness: 0.85, roughness: 0.32 }))
    ring.rotation.x = Math.PI / 2
    ring.position.set(TX, ty + ry, TZ)
    g.add(ring)
  }
  // 顶端尖柱 + 月牙徽记（揽月 identity，自发光）
  const spireY = ty + DOME_R
  cyl(g, 0.12, 0.26, 2.0, 12, C.copper, { x: TX, y: spireY, z: TZ, metal: 0.85, rough: 0.3 })
  g.add(crescent({ r: 2.1, depth: 0.34, x: TX, y: spireY + 3.3, z: TZ, emissiveIntensity: 0.9 }))
  // ——通高 ~110m（甘居叠澜塔 116m / 原点塔 211m 之下）
}

// ============================== 东北前庭（映月池 + 落客廊 + 车道） ==============================

function forecourt(g: THREE.Group, ctx: BuildCtx) {
  // 前庭铺地（x −3..16 × z −3..16，浅色与草皮区分）
  box(g, 19, 0.1, 19, C.pave, { x: 6.5, y: -0.01, z: 6.5, rough: 0.9, site: true })
  // 车道（北路 → 落客廊，深色条带）
  box(g, 5.5, 0.11, 7.5, C.lane, { x: 6.5, y: 0, z: 15.8, rough: 0.92, site: true })
  box(g, 9.5, 0.11, 4.5, C.lane, { x: 6.5, y: 0, z: 11.5, rough: 0.92, site: true })
  // 映月池（静水映塔影水中月，圆月汀步三阶）
  g.add(pool({ w: 13, d: 7, steps: true, x: 6.5, y: 0.06, z: 4.2 }))
  // 池四角石盆 + 池周花钵环 + 南侧长凳
  for (const [px, pz] of [[0.8, 0.6], [12.2, 0.6], [0.8, 7.8], [12.2, 7.8]] as const) {
    g.add(ctx.blocks.urn({ x: px, z: pz, scale: 1.25 }))
  }
  for (let i = 0; i < 4; i++) {
    g.add(ctx.blocks.urn({ x: 2.6 + i * 2.6, z: 0.2, scale: 0.85 }))
    g.add(ctx.blocks.urn({ x: 2.6 + i * 2.6, z: 8.2, scale: 0.85 }))
  }
  for (const pz of [2.2, 4.2, 6.2]) {
    g.add(ctx.blocks.urn({ x: -0.4, z: pz, scale: 0.85 }))
    g.add(ctx.blocks.urn({ x: 13.4, z: pz, scale: 0.85 }))
  }
  for (const bx of [3, 6.5, 10]) g.add(ctx.blocks.bench({ x: bx, z: -1.6, rotY: Math.PI }))
  // 落客廊 porte-cochère（6 石柱 + 平顶 + 铜檐 + 顶上月牙徽记）
  const PX = 6.5, PZ = 12.2
  for (const [dx, dz] of [[-3.2, -1.6], [0, -1.6], [3.2, -1.6], [-3.2, 1.6], [0, 1.6], [3.2, 1.6]] as const) {
    cyl(g, 0.26, 0.32, 4.2, 16, C.stone, { x: PX + dx, y: 0, z: PZ + dz, rough: 0.72 })
    box(g, 0.8, 0.24, 0.8, C.stoneDeep, { x: PX + dx, y: 4.2, z: PZ + dz, rough: 0.8 })
  }
  box(g, 8.2, 0.55, 4.6, C.stone, { x: PX, y: 4.44, z: PZ, rough: 0.78 })
  box(g, 8.6, 0.18, 5.0, C.copper, { x: PX, y: 4.99, z: PZ, metal: 0.8, rough: 0.38 })
  // 廊顶灯带 + 月牙徽记（朝北迎客）
  box(g, 7.6, 0.08, 4.0, C.glow, { x: PX, y: 4.36, z: PZ, emi: C.glow, emiI: 1.0, shadow: false })
  g.add(crescent({ r: 0.8, x: PX, y: 6.1, z: PZ + 2.3, emissiveIntensity: 0.85 }))
  // 前庭绿篱（沿西/南内缘）+ 孤植大树（东南草坪角）
  for (let i = 0; i < 4; i++) g.add(ctx.blocks.hedge({ w: 0.7, d: 4.2, x: -2.2, z: 1 + i * 4.6 }))
  for (let i = 0; i < 3; i++) g.add(ctx.blocks.hedge({ w: 4.2, d: 0.7, x: 0.5 + i * 4.6, z: -2.2 }))
  fineTree(g, { x: 14, z: 1.5, scale: 1.25, seed: 991 })
  fineTree(g, { x: 14.5, z: 6.8, scale: 0.95, seed: 331 })
  // 旗杆（入口两侧）
  flagpole(g, { x: 0.2, z: 9.5 })
  flagpole(g, { x: 12.8, z: 9.5 })
  // 前庭路灯
  for (const [lx, lz] of [[-1.5, -1.5], [14.5, -1.5], [-1.5, 14.5], [14.5, 14.5]] as const) {
    g.add(ctx.blocks.streetLamp({ x: lx, z: lz, h: 5 }))
  }
}

// ============================== 入口 ==============================

export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()
  site(g, ctx)
  podium(g, ctx)
  tower(g, ctx)
  crown(g, ctx)
  forecourt(g, ctx)
  return g
}

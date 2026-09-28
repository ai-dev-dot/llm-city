import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { gardenTree } from '../../blocks/glm-5.3/garden-tree'
import { modernLamp, bollardLight } from '../../blocks/glm-5.3/modern-site'

/**
 * 叠澜塔 Ripple Hotel · E5「原点街区」三期天际酒店（宗地 E5-03+06，20×40m 竖宗地）
 *
 * 「涟漪升空」：二期光环广场把原点荡成地面涟漪，三期把涟漪竖起来送上天空——
 * 塔身每层的弧形阳台是一圈圈「澜环」，随高度呼吸起伏（竖向波长 11 层），波峰化露台；
 * 塔顶一朵最大的澜：悬挑胶囊盘 sky lounge + 外缘无边泳池 + 金色发光环。
 * 东北弧面半嵌通高观光电梯核（三条铜金竖光带）——夜晚的竖琴。
 *
 * 坐标：局部原点 = 宗地中心地面，+x 东、+z 北（E5 街区统一约定），x∈[-10,10]、z∈[-20,20]。
 * R13 本体线 |x|≤8、|z|≤18：澜环最宽 7.7 / 悬盘 7.9 / 大堂 7.8——全部收线内。
 *
 * 胶囊平面：半宽 7（东西）× 半长 10（南北），两圆心 (0,±3) r7 + 直段。
 * 轮廓弧长参数化 capPoint(s)，s∈[0,56)：东直段(0,6) → 北弧(6,6+7π) → 西直段 → 南弧。
 */

/* ---------- 常量 ---------- */

const HW = 7, HL = 10                       // 塔身胶囊半宽（东西）/半长（南北）
const BASE_H = 7.5                          // 基座高
const FLOORS = 33, FH = 3.1                 // 层数 / 层高 → 塔身 7.5–109.8（主体 ~110m 贴总图档位）
const TOWER_TOP = BASE_H + FLOORS * FH      // 109.8
/** 澜环呼吸量：竖向波长 11 层，波谷 0.18 / 波峰 0.70 */
const breathe = (k: number): number => 0.18 + 0.52 * (1 + Math.sin((k * Math.PI * 2) / 11 - Math.PI / 2)) / 2
const PERIM = 2 * (2 * (HL - HW)) + 2 * Math.PI * HW   // 胶囊周长 ≈ 56.0

/* ---------- 胶囊几何工具 ---------- */

/** 胶囊轮廓 Shape（圆角矩形极限态：两端半圆）。逆时针，curveSegments 控制分段密度 */
function capsuleShape(hw: number, hl: number): THREE.Shape {
  const s = new THREE.Shape()
  s.absarc(0, hl - hw, hw, 0, Math.PI, false)                 // 北端半圆（东→顶→西）
  s.absarc(0, -(hl - hw), hw, Math.PI, Math.PI * 2, false)    // 南端半圆（西→底→东）
  s.closePath()
  return s
}

/** 胶囊环形板（外轮廓 hw/hl，内孔缩 inset），extrude 厚 th，板底落于 y（水平环形板） */
function capsuleRing(s: Sink, hw: number, hl: number, inset: number, th: number, y: number, c: THREE.Color): void {
  const shape = capsuleShape(hw, hl)
  const hole = capsuleShape(hw - inset, hl - inset)
  shape.holes.push(hole as THREE.Path)
  const g = new THREE.ExtrudeGeometry(shape, { depth: th, bevelEnabled: false, curveSegments: 42 })
  g.rotateX(-Math.PI / 2)
  g.translate(0, y, 0)
  pushGeo(s, g, c)
}

/** 胶囊实心棱柱（低多边形主体） */
function capsulePrism(hw: number, hl: number, y0: number, y1: number, c: THREE.Color, s: Sink): void {
  const g = new THREE.ExtrudeGeometry(capsuleShape(hw, hl), { depth: y1 - y0, bevelEnabled: false, curveSegments: 36 })
  g.rotateX(-Math.PI / 2)
  g.translate(0, y0, 0)
  pushGeo(s, g, c)
}

/** 轮廓弧长参数化：s∈[0,PERIM) → 位置 + 单位切向（逆时针） */
function capPoint(s0: number): { x: number; z: number; tx: number; tz: number } {
  let s = s0 % PERIM
  if (s < 0) s += PERIM
  const seg = 2 * (HL - HW), arc = Math.PI * HW     // 直段长 6、弧段长 7π
  if (s < seg) return { x: HW, z: -(HL - HW) + s, tx: 0, tz: 1 }
  s -= seg
  if (s < arc) { const t = (s / HW); return { x: HW * Math.cos(t), z: (HL - HW) + HW * Math.sin(t), tx: -Math.sin(t), tz: Math.cos(t) } }
  s -= arc
  if (s < seg) return { x: -HW, z: (HL - HW) - s, tx: 0, tz: -1 }
  s -= seg
  const t = Math.PI + s / HW
  return { x: HW * Math.cos(t), z: -(HL - HW) + HW * Math.sin(t), tx: -Math.sin(t), tz: Math.cos(t) }
}

/* ---------- 顶点合并 Sink（街区同工艺） ---------- */

interface Sink { pos: number[]; nor: number[]; col: number[]; idx: number[] }
const newSink = (): Sink => ({ pos: [], nor: [], col: [], idx: [] })

function pushGeo(s: Sink, g: THREE.BufferGeometry, c: THREE.Color, m?: THREE.Matrix4): void {
  if (m) g.applyMatrix4(m)
  const p = g.attributes.position, n = g.attributes.normal, ix = g.index
  const base = s.pos.length / 3
  for (let i = 0; i < p.count; i++) {
    s.pos.push(p.getX(i), p.getY(i), p.getZ(i))
    s.nor.push(n.getX(i), n.getY(i), n.getZ(i))
    s.col.push(c.r, c.g, c.b)
  }
  if (ix) for (let i = 0; i < ix.count; i++) s.idx.push(ix.getX(i) + base)
  else for (let i = 0; i < p.count; i++) s.idx.push(i + base)   // ExtrudeGeometry 等非索引几何：顶点序即三角序
  g.dispose()
}

function box(s: Sink, w: number, h: number, d: number, x: number, y: number, z: number, c: THREE.Color, rotY = 0): void {
  const g = new THREE.BoxGeometry(w, h, d)
  if (rotY) g.rotateY(rotY)
  g.translate(x, y, z)
  pushGeo(s, g, c)
}

const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => { const o = new THREE.Mesh(g, m); o.castShadow = true; return o }

function sinkMesh(s: Sink, mat: THREE.Material): THREE.Mesh {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(s.pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(s.nor, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(s.col, 3))
  g.setIndex(s.idx)
  return mesh(g, mat)
}

const C = (h: string) => new THREE.Color(h)

/* ---------- 材质（E5 谱系：银蓝缎面 + 金点睛；酒店暖白节奏区分写字楼冷调） ---------- */

const matSolid = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.6, roughness: 0.25, envMapIntensity: 1.2 })
const matPave = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.06, roughness: 0.92 })
// 核心玻璃：银蓝家族 + 暖底光（夜「满房」感——与写字楼冷加班灯的区分）
const matGlass = new THREE.MeshStandardMaterial({ color: '#567CA8', metalness: 0.55, roughness: 0.18, emissive: '#8A7455', emissiveIntensity: 0.3, envMapIntensity: 1.3, side: THREE.DoubleSide })
const matRailGlass = new THREE.MeshStandardMaterial({ color: '#9FC4D8', metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
const matWater = new THREE.MeshStandardMaterial({ color: '#4E86A0', metalness: 0.35, roughness: 0.06, transparent: true, opacity: 0.82 })
const matGlow = new THREE.MeshStandardMaterial({ color: '#FFD9A0', emissive: '#FFC878', emissiveIntensity: 2.5 })
const matGlowW = new THREE.MeshStandardMaterial({ color: '#FFF3DC', emissive: '#FFEED2', emissiveIntensity: 2.1 })
const matGold = stdMaterial('#C9AE8A', { metalness: 0.72, roughness: 0.25 })
const matBronze = stdMaterial('#B08858', { metalness: 0.75, roughness: 0.3 })

const SILVER_L = C('#E8E6E1'), SILVER = C('#C4C1BA'), SILVER_M = C('#9EA3A9')
const PAVE_L = C('#9C9890'), PAVE_M = C('#7E7A73'), PAVE_D = C('#5E5B56')
const GRASS_C = C('#667A54'), WARM = C('#DED8CC'), WARM_D = C('#B8B0A2'), GOLD_C = C('#C9AE8A')

/* ---------- 场地：基底 + 门前涟漪弧 + 落客 + 旗阵 + 草皮树列 ---------- */

function paving(parent: THREE.Object3D): void {
  const base = newSink()
  box(base, 19.9, 0.04, 39.9, 0, 0.02, 0, C('#4B4B49'))
  box(base, 19.7, 0.04, 39.7, 0, 0.045, 0, PAVE_L)
  parent.add(sinkMesh(base, matPave))

  // 门前涟漪（圆心门正中 (0,-17.5)，南半圆三圈——门前窄带 2.3m 深内的小涟漪「入水口」；
  // 实测（workshop 探针）：RingGeometry rotateX(-π/2) 后 φw=thetaStart 直接映射，南半 = [-π,0]）
  const rip = newSink()
  for (const [r, cc] of [[0.9, PAVE_M], [1.5, PAVE_L], [2.15, PAVE_M]] as Array<[number, THREE.Color]>) {
    const g3 = new THREE.RingGeometry(r - 0.3, r, Math.max(10, Math.ceil(r * 8)), 1, -Math.PI, Math.PI)
    g3.rotateX(-Math.PI / 2)
    g3.translate(0, 0.055, -17.5)
    pushGeo(rip, g3, cc)
  }
  parent.add(sinkMesh(rip, matPave))

  // 落客带（南缘车行道 + 缘石）
  const drop = newSink()
  box(drop, 15.0, 0.06, 1.15, 0, 0.06, -18.9, C('#3F4246'))
  box(drop, 15.4, 0.1, 0.16, 0, 0.07, -19.65, PAVE_M)
  box(drop, 15.4, 0.1, 0.16, 0, 0.07, -18.25, PAVE_M)
  parent.add(sinkMesh(drop, matPave))

  // 旗阵 ×5（东南向，银杆+城市旗；收在 R13 本体线内，挂 site 景观件豁免）
  for (let i = 0; i < 5; i++) {
    const fx = 3.2 + i * 1.1, fz = -18.85
    const fg = new THREE.Group()
    const pole = mesh(new THREE.CylinderGeometry(0.045, 0.06, 6, 8), matSolid)
    pole.position.set(fx, 3, fz); fg.add(pole)
    const flag = mesh(new THREE.BoxGeometry(0.02, 0.5, 0.85), stdMaterial('#3D5A85', { metalness: 0.3, roughness: 0.6 }))
    flag.position.set(fx, 5.6, fz + 0.45); fg.add(flag)
    fg.userData.site = true
    parent.add(fg)
  }

  // 东西退线环带草皮 + 北院草皮
  const green = newSink()
  box(green, 1.9, 0.05, 39.7, -8.95, 0.03, 0, GRASS_C)
  box(green, 1.9, 0.05, 39.7, 8.95, 0.03, 0, GRASS_C)
  box(green, 17.6, 0.05, 1.4, 0, 0.03, 18.9, GRASS_C)
  box(green, 0.9, 0.05, 37.5, -8.5, 0.055, 0, PAVE_M)
  box(green, 0.9, 0.05, 37.5, 8.5, 0.055, 0, PAVE_M)
  parent.add(sinkMesh(green, matPave))

  // 树列：东西各 4 + 北院 2 + 南旗阵侧 2
  const trees: Array<[number, number, number]> = [
    [-8.9, -12, 0.9], [-8.9, -4, 1.0], [-8.9, 4, 0.9], [-8.9, 12, 1.0],
    [8.9, -12, 1.0], [8.9, -4, 0.9], [8.9, 4, 1.0], [8.9, 12, 0.9],
    [-4.5, 18.6, 0.85], [4.5, 18.6, 0.85], [8.6, -18.5, 0.8], [-7.9, -18.6, 0.8],
  ]
  trees.forEach(([tx, tz, sc], i) => parent.add(gardenTree({ x: tx, z: tz, scale: sc, seed: 97 + i * 11 })))
}

/* ---------- 基座 + 大堂 ---------- */

function podium(parent: THREE.Object3D): void {
  const s = newSink()
  // 基座胶囊体（餐饮层，暖石板色）
  capsulePrism(HW + 0.5, HL + 0.5, 0.05, BASE_H, WARM, s)
  // 基座横缝 + 檐口
  for (const yy of [2.6, 5.2]) capsuleRing(s, HW + 0.54, HL + 0.54, 0.02, 0.1, yy, WARM_D)
  capsuleRing(s, HW + 0.62, HL + 0.62, 0.04, 0.18, BASE_H - 0.18, SILVER)
  parent.add(sinkMesh(s, matPave))

  // 基座弧形橱窗带（y1.1–3.4，橱窗竖筋沿轮廓）
  const shop = newSink(), shopG = newSink()
  const nRib = 64
  for (let i = 0; i < nRib; i++) {
    const p = capPoint((i / nRib) * PERIM)
    const px = p.x * ((HW + 0.5) / HW), pz = p.z * ((HL + 0.5) / HL)
    const ang = Math.atan2(p.tz, -p.tx)
    box(shop, 0.09, 2.5, 0.14, px, 2.25, pz, i % 6 === 0 ? SILVER_M : SILVER, ang)
  }
  // 弧橱窗玻璃面（两层带）
  for (const [y0, h] of [[1.1, 2.3]] as Array<[number, number]>) {
    const shape = capsuleShape(HW + 0.46, HL + 0.46)
    const hole = capsuleShape(HW + 0.4, HL + 0.4)
    shape.holes.push(hole as THREE.Path)
    const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 42 })
    g.rotateX(-Math.PI / 2)
    g.translate(0, y0 + h, 0)
    pushGeo(shopG, g, C('#3A4E68'))
  }
  parent.add(sinkMesh(shop, matSolid))
  parent.add(sinkMesh(shopG, stdMaterial('#2E4258', { emissive: '#FFD9A0', emissiveIntensity: 0.4, roughness: 0.15, metalness: 0.3, side: THREE.DoubleSide })))

  // 南大堂玻璃盒（两层通高 15.6×8×7.5，南/东/西三面幕墙）
  const hall = newSink(), hallG = newSink()
  const hw2 = 7.8, zS = -17.4, zN = -9.6
  box(hall, hw2 * 2, 0.5, zN - zS, 0, BASE_H, (zS + zN) / 2, SILVER)            // 檐口顶板
  box(hall, hw2 * 2 + 0.3, 0.24, zN - zS + 0.3, 0, BASE_H + 0.12, (zS + zN) / 2, SILVER_L) // 女儿墙沿口
  // 南面幕墙：竖梃 8 间 + 横梃
  const faceW = hw2 * 2 - 0.4
  for (let i = 0; i <= 8; i++) {
    const fx = -faceW / 2 + (faceW * i) / 8
    box(hall, 0.12, BASE_H - 0.6, 0.16, fx, (BASE_H - 0.5) / 2 + 0.05, zS + 0.08, i % 2 === 0 ? SILVER : SILVER_M)
  }
  for (const fy of [2.5, 5.2]) box(hall, faceW, 0.14, 0.14, 0, fy, zS + 0.08, SILVER_M)
  box(hallG, faceW - 0.1, BASE_H - 0.8, 0.04, 0, (BASE_H - 0.5) / 2 + 0.05, zS + 0.04, C('#3A4E68'))
  // 东西山墙幕墙
  for (const sx of [-hw2 + 0.08, hw2 - 0.08]) {
    for (let i = 0; i <= 3; i++) box(hall, 0.14, BASE_H - 0.6, 0.14, sx, (BASE_H - 0.5) / 2 + 0.05, zS + 1.2 + (i * (zN - zS - 2.4)) / 3, SILVER)
    box(hallG, 0.04, BASE_H - 0.8, zN - zS - 2.2, sx + (sx > 0 ? -0.04 : 0.04), (BASE_H - 0.5) / 2 + 0.05, (zS + zN) / 2, C('#3A4E68'))
  }
  parent.add(sinkMesh(hall, matSolid))
  parent.add(sinkMesh(hallG, stdMaterial('#41608A', { emissive: '#FFE3B0', emissiveIntensity: 0.55, metalness: 0.3, roughness: 0.12, side: THREE.DoubleSide })))

  // 南主入口：金色门斗（贴墙横梁+两端短臂+双柱——门线距退线仅 0.7m，不做外挑雨棚）
  const ent = newSink()
  box(ent, 4.8, 0.32, 0.55, 0, 4.62, zS + 0.28, GOLD_C)
  box(ent, 0.55, 0.32, 1.3, -2.4, 4.62, zS + 0.75, GOLD_C)
  box(ent, 0.55, 0.32, 1.3, 2.4, 4.62, zS + 0.75, GOLD_C)
  box(ent, 5.1, 0.1, 0.2, 0, 4.82, zS + 0.5, C('#8F7452'))
  for (const dx of [-1.8, 1.8]) {
    const col = new THREE.CylinderGeometry(0.14, 0.16, 4.6, 10)
    col.translate(dx, 2.3, zS + 0.35)
    pushGeo(ent, col, SILVER_L)
  }
  parent.add(sinkMesh(ent, matGold))

  // 檐下柱廊 6 柱（南面大堂前，贴大堂南缘内退——R13 本体线 |z|≤18 内）
  const cols = newSink()
  for (let i = 0; i < 6; i++) {
    const cx = -6.2 + (12.4 * i) / 5
    if (Math.abs(cx) < 2.2) continue            // 让开主入口门斗
    const col = new THREE.CylinderGeometry(0.17, 0.19, 4.5, 10)
    col.translate(cx, 2.25, zS + 0.55)
    pushGeo(cols, col, WARM_D)
  }
  parent.add(sinkMesh(cols, matPave))
}

/* ---------- 塔身：核心 + 澜环体系 + 鳍 ---------- */

function tower(parent: THREE.Object3D, rng: () => number): void {
  // 玻璃核心（整根胶囊棱柱，暖底光「满房」感）
  const core = newSink()
  capsulePrism(HW - 0.06, HL - 0.06, BASE_H - 0.1, TOWER_TOP + 0.06, C('#567CA8'), core)
  parent.add(sinkMesh(core, matGlass))

  const rings = newSink(), rails = newSink(), caps = newSink(), lights = newSink(), terr = newSink()
  for (let k = 0; k < FLOORS; k++) {
    const y0 = BASE_H + k * FH
    const e = breathe(k)
    // 澜环板（阳台楼板，extrude 环带，呼吸半径）
    capsuleRing(rings, HW + e, HL + e, 0.22, 0.16, y0, k % 2 === 0 ? WARM : WARM_D)
    capsuleRing(rings, HW + e + 0.03, HL + e + 0.03, 0.03, 0.06, y0 + 0.16, SILVER_L)   // 檐口亮线
    // 扶手细环（1.0m 高处的窄水平环）
    capsuleRing(rails, HW + e + 0.045, HL + e + 0.045, 0.045, 0.05, y0 + 1.02, SILVER)
    // 栏杆竖杆阵（周长按呼吸放大，每 0.78m）
    const per = PERIM * (1 + e / 6.5)
    const n = Math.floor(per / 0.78)
    for (let i = 0; i < n; i++) {
      const p = capPoint((i / n) * PERIM)
      const sc = 1 + e / 6.5
      const rod = new THREE.CylinderGeometry(0.016, 0.016, 1.0, 4)
      rod.translate(p.x * sc, y0 + 0.55, p.z * sc)
      pushGeo(rails, rod, SILVER_M)
    }
    // 栏杆玻璃矮板（半透，两层窄条）
    capsuleRing(rails, HW + e + 0.03, HL + e + 0.03, 0.03, 0.5, y0 + 0.45, C('#9FC4D8'))
    // 层间檐线（核心上的窄环，读出层高）
    capsuleRing(caps, HW + 0.015, HL + 0.015, 0.05, 0.08, y0 + FH - 0.1, SILVER_M)
    // 客房灯条（六成层，1–2 条暖白，沿轮廓随机方位）
    if (rng() < 0.62) {
      const nL = 1 + Math.floor(rng() * 2)
      for (let j = 0; j < nL; j++) {
        const p = capPoint(rng() * PERIM)
        box(lights, 1.5, 0.42, 0.04, p.x * (1 + 0.004), y0 + 2.1, p.z * (1 + 0.004), C('#FFE9C0'), Math.atan2(-p.tz, p.tx))
      }
    }
    // 大露台层（波峰）：绿植池 + 灌木球 + 躺椅
    if (e > 0.6) {
      for (let j = 0; j < 4; j++) {
        const p = capPoint((j / 4) * PERIM + 0.8)
        const sc = 1 + e / 6.5
        const px = p.x * sc, pz = p.z * sc
        box(terr, 1.1, 0.42, 1.1, px, y0 + 0.37, pz, C('#8A8074'), Math.atan2(-p.tz, p.tx))
        const bush = new THREE.SphereGeometry(0.34, 8, 6)
        bush.translate(px, y0 + 0.75, pz)
        pushGeo(terr, bush, GRASS_C)
      }
      const p2 = capPoint(3.2), sc2 = 1 + e / 6.5
      box(terr, 0.55, 0.1, 1.7, p2.x * sc2 - 0.3, y0 + 0.62, p2.z * sc2, C('#B0906A'), Math.atan2(-p2.tz, p2.tx))
      box(terr, 0.55, 0.1, 1.7, -p2.x * sc2 + 0.3, y0 + 0.62, -p2.z * sc2, C('#B0906A'), Math.atan2(p2.tz, -p2.tx))
    }
  }
  parent.add(sinkMesh(rings, matPave))
  parent.add(sinkMesh(rails, matRailGlass))
  parent.add(sinkMesh(caps, matSolid))
  parent.add(sinkMesh(lights, stdMaterial('#FFE9C0', { emissive: '#FFE0AC', emissiveIntensity: 1.6 })))
  const terrMesh = sinkMesh(terr, matPave)
  terrMesh.userData.site = true                       // 露台家具（绿植池/躺椅）=景观件，R13 豁免
  parent.add(terrMesh)

  // 竖向鳍（东西直段各 4 + 南北端各 1：波谷露出、波峰没入的「澜间脊线」）
  const fins = newSink()
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++)
    box(fins, 0.5, TOWER_TOP - BASE_H, 0.12, sx * 7.6, (BASE_H + TOWER_TOP) / 2, -5.4 + i * 3.6, SILVER)
  box(fins, 0.12, TOWER_TOP - BASE_H, 0.5, 0, (BASE_H + TOWER_TOP) / 2, 12.2, SILVER)
  box(fins, 0.12, TOWER_TOP - BASE_H, 0.5, 0, (BASE_H + TOWER_TOP) / 2, -12.2, SILVER)
  parent.add(sinkMesh(fins, matSolid))
}

/* ---------- 观光电梯核（东北弧面半嵌） ---------- */

function liftCore(parent: THREE.Object3D): void {
  const cx = 5.0, cz = 7.5, r = 2.1
  const tube = mesh(new THREE.CylinderGeometry(r, r, TOWER_TOP + 0.2, 28, 1, true), matRailGlass)
  tube.position.set(cx, (TOWER_TOP + 0.2) / 2, cz); parent.add(tube)
  const s = newSink()
  for (let i = 0; i < 14; i++) {                          // 竖梃
    const a = (i / 14) * Math.PI * 2
    const rod = new THREE.CylinderGeometry(0.04, 0.04, TOWER_TOP + 0.2, 6)
    rod.translate(cx + Math.cos(a) * (r + 0.02), (TOWER_TOP + 0.2) / 2, cz + Math.sin(a) * (r + 0.02))
    pushGeo(s, rod, SILVER)
  }
  parent.add(sinkMesh(s, matSolid))
  const lit = newSink()                                   // 三条铜金竖光带（东北外缘弧上）
  for (const da of [-0.55, 0, 0.55]) {
    const a = 0.35 + da                                  // 东北方位 ≈ 20°
    const rod = new THREE.BoxGeometry(0.1, TOWER_TOP - 2, 0.06)
    rod.rotateY(-a)
    rod.translate(cx + Math.cos(a) * (r + 0.06), (TOWER_TOP - 2) / 2 + 1, cz + Math.sin(a) * (r + 0.06))
    pushGeo(lit, rod, C('#FFD9A0'))
  }
  parent.add(sinkMesh(lit, stdMaterial('#B08858', { emissive: '#FFC878', emissiveIntensity: 1.4, metalness: 0.6, roughness: 0.3 })))
}

/* ---------- sky lounge：悬挑胶囊盘 + 无边泳池 + 金环 + 家具 ---------- */

function skyLounge(parent: THREE.Object3D): void {
  const s = newSink()
  // 束腰过渡（塔身→悬盘：3 圈胶囊环逐圈放大 + 暗带收头——澜节奏的收束句读，补「直接相连感」）
  for (let i = 0; i < 3; i++) {
    const t = i / 2
    const hw = HW + 0.1 + t * 0.55, hl = HL + 0.15 + t * 1.0
    capsuleRing(s, hw, hl, 0.35, 0.4, TOWER_TOP - 1.35 + i * 0.42, i === 2 ? WARM : C('#6A655D'))
  }
  capsuleRing(s, 7.0, 12.0, 0.3, 0.5, TOWER_TOP, WARM_D)             // 倒锥过渡盘
  capsuleRing(s, 7.9, 13.0, 0.3, 0.7, TOWER_TOP + 0.5, WARM)        // 主悬挑盘
  parent.add(sinkMesh(s, matPave))
  const s2 = newSink()
  capsuleRing(s2, 7.9, 13.0, 0.12, 0.1, TOWER_TOP + 1.2, GOLD_C)     // 盘缘金环（贴盘外缘上翻）
  parent.add(sinkMesh(s2, matGold))
  const glowRim = newSink()
  capsuleRing(glowRim, 7.9, 13.0, 0.05, 0.05, TOWER_TOP + 1.32, C('#FFF3DC'))
  parent.add(sinkMesh(glowRim, matGlowW))
  // 无边泳池（外缘环带水）
  const pool = newSink()
  capsuleRing(pool, 7.68, 12.82, 1.98, 0.36, TOWER_TOP + 1.22, C('#2E4A5C'))   // 池底深色
  parent.add(sinkMesh(pool, matPave))
  const waterS = newSink()
  capsuleRing(waterS, 7.66, 12.80, 2.0, 0.34, TOWER_TOP + 1.23, C('#4E86A0'))
  parent.add(sinkMesh(waterS, matWater))
  const poolLit = newSink()
  capsuleRing(poolLit, 6.6, 11.76, 0.6, 0.03, TOWER_TOP + 1.58, C('#BFE8F2')) // 池底灯环（透水微光）
  parent.add(sinkMesh(poolLit, stdMaterial('#9FD8E8', { emissive: '#9FD8E8', emissiveIntensity: 1.2, transparent: true, opacity: 0.8 })))

  // 盘上：中心电梯厅（玻璃圆厅+梃+顶帽）+ 吧台弧墙 + 绿植池 + 躺椅
  const cx = 5.0, cz = 7.5
  const lift = mesh(new THREE.CylinderGeometry(2.6, 2.6, 4.0, 28, 1, true), matRailGlass)
  lift.position.set(cx, TOWER_TOP + 3.0, cz); parent.add(lift)
  const s3 = newSink()
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    const rod = new THREE.CylinderGeometry(0.05, 0.05, 4.0, 6)
    rod.translate(cx + Math.cos(a) * 2.62, TOWER_TOP + 3.0, cz + Math.sin(a) * 2.62)
    pushGeo(s3, rod, SILVER)
  }
  const cap1 = new THREE.CylinderGeometry(2.95, 2.95, 0.3, 28)
  cap1.translate(cx, TOWER_TOP + 5.15, cz); pushGeo(s3, cap1, SILVER)
  const cap2 = new THREE.CylinderGeometry(1.5, 1.6, 1.1, 16)
  cap2.translate(cx, TOWER_TOP + 5.85, cz); pushGeo(s3, cap2, SILVER_M)
  // 吧台弧墙（北侧三段折线）
  for (let i = 0; i < 3; i++) {
    const ang = Math.PI / 2 + (i - 1) * 0.5
    box(s3, 3.0, 1.15, 0.18, Math.cos(ang) * 2.6, TOWER_TOP + 1.85, 8.8 + (i - 1) * 0.9, WARM_D, -ang + Math.PI / 2)
  }
  // 绿植池 4 + 躺椅 6（盘心平台：避泳池环带与电梯厅）
  const DECK = TOWER_TOP + 1.2
  for (const [gx, gz] of [[-4.2, -1.5], [4.0, -3.0], [-4.0, 4.0], [-0.5, 6.0]] as Array<[number, number]>) {
    box(s3, 1.0, 0.5, 1.0, gx, DECK + 0.3, gz, C('#8A8074'))
    const bush = new THREE.SphereGeometry(0.38, 8, 6)
    bush.translate(gx, DECK + 0.75, gz)
    pushGeo(s3, bush, GRASS_C)
  }
  for (const [lx, lz, la] of [[0, -4.0, 0], [2.4, -3.2, 0.6], [-2.4, -3.2, -0.6], [4.4, -0.5, Math.PI / 2], [-4.4, -0.5, -Math.PI / 2], [0, 4.4, Math.PI]] as Array<[number, number, number]>)
    box(s3, 0.55, 0.1, 1.75, lx, DECK + 0.08, lz, C('#B0906A'), la)
  parent.add(sinkMesh(s3, matPave))

  // 悬挑斜肋（盘底 12 根，从塔身斜出贴盘底缘；径向收在 R13 本体线内）
  const ribs = newSink()
  for (let i = 0; i < 12; i++) {
    const p = capPoint((i / 12) * PERIM + 0.26)
    const g = new THREE.BoxGeometry(1.3, 0.28, 0.34)
    const ang = Math.atan2(p.z, p.x)
    g.rotateZ(0.45)
    g.rotateY(-ang + Math.PI / 2)
    const mx = p.x * 1.045, mz = p.z * 1.045
    g.translate(mx, TOWER_TOP + 0.55, mz)
    pushGeo(ribs, g, SILVER_M)
  }
  parent.add(sinkMesh(ribs, matSolid))
}

/* ---------- 北后勤院 ---------- */

function backyard(parent: THREE.Object3D): void {
  const s = newSink()
  box(s, 15.6, 0.04, 6.6, 0, 0.055, 14.6, PAVE_M)                    // 后院铺装（地被）
  for (let i = 0; i < 3; i++) {                                      // 冷却塔阵
    const ct = new THREE.CylinderGeometry(0.75, 0.75, 1.8, 14)
    ct.translate(-4.2 + i * 2.3, 0.95, 16.6)
    pushGeo(s, ct, C('#3A3F46'))
  }
  box(s, 4.2, 3.4, 3.2, 5.4, 1.75, 16.2, C('#8F8C86')) // 卸货棚（界内）
  box(s, 4.4, 0.2, 3.4, 5.4, 3.55, 16.2, SILVER_M)
  for (let i = 0; i < 4; i++) box(s, 1.8, 1.5, 1.2, -5.6 + i * 2.1, 0.8, 12.6, C('#7C7A76'))  // 物资箱阵
  parent.add(sinkMesh(s, matPave))
  // 围篱独立薄板 sink（min ext 0.14 ≤0.5、顶 ≤3——薄板豁免；不与设备合件以免被带累）
  const fence = newSink()
  box(fence, 16.2, 0.9, 0.14, 0, 0.5, 17.85, PAVE_D)
  for (let i = 0; i < 9; i++) box(fence, 0.12, 1.0, 0.12, -8 + i * 2, 0.55, 17.85, SILVER_M)
  parent.add(sinkMesh(fence, matPave))
}

/* ---------- 灯阵 ---------- */

function lighting(parent: THREE.Object3D): void {
  const lampSpots: Array<[number, number]> = [
    [-9.0, -18.5], [9.2, -18.5], [-9.3, 8], [9.3, 8], [-9.3, 18.2], [9.3, 18.2],
  ]
  for (const [lx, lz] of lampSpots)
    parent.add(modernLamp({ x: lx, z: lz, rotY: Math.atan2(-lz, -lx) }))
  const bs: Array<[number, number]> = [
    [-3.4, -19.5], [3.4, -19.5], [-9.5, -9.5], [9.5, -9.5],
    [-9.5, 0], [9.5, 0], [-9.5, 9.5], [9.5, 9.5],
  ]
  for (const [bx, bz] of bs) parent.add(bollardLight({ x: bx, z: bz }))
}

/* ---------- 装配 ---------- */

export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()
  const rng = ctx.rng
  paving(g)
  podium(g)
  tower(g, rng)
  liftCore(g)
  skyLounge(g)
  backyard(g)
  lighting(g)
  return g
}

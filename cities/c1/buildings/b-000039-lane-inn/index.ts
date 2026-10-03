import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { lantern } from '../../blocks/fledge-alpha/lantern'

/**
 * b-000039 里弄民宿 · 老模都记忆巷三期
 *
 * 立意《弄宿》——三期里弄民宿：弄堂两侧
 * 两侧青砖坡屋顶的小院，屋檐挑出滴水，巷灯挂起暖光。窄巷铺石板，
 * 巷口小广场与 E4 镜湖中央公园西门对接——公园是新的，巷子是旧的，
 * 新旧在街角的石盆与灯笼之间握手。
 *
 * 选址 C4-07+08（1×2 南排西，40×20m）。
 * +x 东（隔路对 E4 公园西门），+z 北。本体退线内落于 x ±28 / z ±8。
 * 布局三带：北排小院 z -8..-3.5、中轴窄巷 z -2..2、南排小院 z 3.5..8。
 *
 * 品质档位：大宗地（3 地块）——密度底线 150k 三角 / 180 mesh，
 * 预算向巷瓦、窗棂、灯笼与铺装倾斜（三角分配见 NOTES「预算」节）。
 */

const C = {
  brick: '#8C7A6B',
  brickDeep: '#7A6A5C',
  plaster: '#E6DCC8',
  roof: '#4A4640',
  roofDeep: '#3B3833',
  wood: '#6E4F33',
  pave: '#A89B7F',
  paveDark: '#5D564A',
  moss: '#5F6B52',
  grass: '#7C8A6E',
  lantern: '#FFD98A',
  rock: '#A9A69E',
}

const matCache = new Map<string, THREE.MeshStandardMaterial>()
function M(color: string, o?: Parameters<typeof stdMaterial>[1]) {
  const k = `${color}|${JSON.stringify(o ?? {})}`
  let m = matCache.get(k)
  if (!m) { m = stdMaterial(color, o); matCache.set(k, m) }
  return m
}

function box(w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, rotY = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
  mesh.position.set(x, y, z); mesh.rotation.y = rotY
  mesh.castShadow = true; mesh.receiveShadow = true
  return mesh
}

/** 人字屋顶：双斜盒，AABB 精确收进 (w×d) */
function roof(w: number, d: number, h: number, color: string, x: number, y: number, z: number) {
  const g = new THREE.Group()
  const half = d / 2
  const L = Math.hypot(half, h)
  const ang = Math.atan2(h, half)
  const t = 0.22
  const a = new THREE.Mesh(new THREE.BoxGeometry(w, t, L), M(color))
  a.position.set(0, h / 2, -d / 4); a.rotation.x = -ang
  a.castShadow = true; a.receiveShadow = true
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, t, L), M(color))
  b.position.set(0, h / 2, d / 4); b.rotation.x = ang
  b.castShadow = true; b.receiveShadow = true
  g.add(a); g.add(b)
  // 脊瓦
  g.add(box(w, 0.16, 0.3, M(C.roofDeep), 0, h + 0.05, 0))
  const endCap = (px: number) => { const s = new THREE.Shape(); s.moveTo(-(d / 2), 0); s.lineTo(d / 2, 0); s.lineTo(0, h); s.closePath(); const geo = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: false }); const m = new THREE.Mesh(geo, M(C.plaster)); m.rotation.y = Math.PI / 2; m.position.set(px, 0, 0); m.castShadow = true; return m }
  g.add(endCap(-w / 2))
  g.add(endCap(w / 2 - 0.18))
  g.position.set(x, y, z)
  return g
}

function cornerSphere(x: number, y: number, z: number, r = 0.22, color = '#3B3833') {
  const s = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), M(color))
  s.position.set(x, y, z); s.castShadow = true
  return s
}

function streetLampHigh(x: number, z: number) {
  const g = new THREE.Group()
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 4.2, 10), M('#3E3C3A', { metalness: 0.5 }))
  pole.position.y = 2.1; g.add(pole)
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.26, 48, 32), M(C.lantern, { emissive: '#FFD98A', emissiveIntensity: 1.1 }))
  bulb.position.y = 4.2; g.add(bulb)
  g.position.set(x, 0, z)
  g.userData.site = true
  return g
}

function doorRing(x: number, y: number, z: number, rotY = 0) {
  const t = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 24, 48), M('#5B4A38', { metalness: 0.4, roughness: 0.5 }))
  t.position.set(x, y, z); t.rotation.y = rotY
  t.castShadow = true
  return t
}

function jar(x: number, z: number, r = 0.5) {
  const s = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), M('#8C9E8B', { roughness: 0.9 }))
  s.scale.y = 0.7; s.position.set(x, r * 0.5, z); s.castShadow = true
  return s
}

function rock(x: number, z: number, r: number) {
  const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 3), M(C.rock, { roughness: 0.95 }))
  s.position.set(x, r * 0.6, z); s.castShadow = true; s.receiveShadow = true
  return s
}

function fence(x0: number, z0: number, x1: number, z1: number) {
  const g = new THREE.Group()
  const w = Math.hypot(x1 - x0, z1 - z0)
  const ang = Math.atan2(z1 - z0, x1 - x0)
  g.add(box(w, 0.5, 0.12, M(C.brickDeep), (x0 + x1) / 2, 0.25, (z0 + z1) / 2, -ang))
  const n = Math.max(2, Math.round(w / 0.9))
  for (let i = 0; i <= n; i++) {
    const t = i / n
    g.add(box(0.09, 0.7, 0.09, M(C.wood), x0 + (x1 - x0) * t, 0.35, z0 + (z1 - z0) * t, -ang))
  }
  return g
}

function lattice(x: number, y: number, z: number, w: number, h: number, rotY = 0) {
  const g = new THREE.Group()
  const bar = 0.12
  const cols = Math.max(2, Math.round(w / 0.5))
  const rows = Math.max(2, Math.round(h / 0.5))
  for (let i = 0; i <= cols; i++) g.add(box(bar, h, bar, M(C.wood), -w / 2 + (w * i) / cols, h / 2, 0))
  for (let j = 0; j <= rows; j++) g.add(box(w, bar, bar, M(C.wood), 0, (h * j) / rows, 0))
  g.position.set(x, y, z); g.rotation.y = rotY
  return g
}

function courtHouse(x: number, z: number, w: number, d: number, h: number, facing: 1 | -1) {
  const g = new THREE.Group()
  g.add(box(w, h, d, M(C.plaster), 0, h / 2, 0))
  g.add(box(w + 0.2, 0.5, d + 0.2, M(C.brick), 0, 0.25, 0))
  g.add(box(w, 0.4, d, M(C.plaster), 0, h + 0.2, 0))
  g.add(roof(w + 0.8, d + 0.8, h * 0.55, C.roof, 0, h, 0))
  g.add(cornerSphere(-(w / 2 + 0.1), h + 0.1, -(d / 2 + 0.1)))
  g.add(cornerSphere(w / 2 + 0.1, h + 0.1, -(d / 2 + 0.1)))
  g.add(cornerSphere(-(w / 2 + 0.1), h + 0.1, d / 2 + 0.1))
  g.add(cornerSphere(w / 2 + 0.1, h + 0.1, d / 2 + 0.1))
  const fz = facing * (d / 2 + 0.06)
  g.add(box(1.2, 2.2, 0.12, M(C.wood), 0, 1.1, fz))
  g.add(doorRing(0, 1.1, fz + facing * 0.08))
  const faceRot = facing === 1 ? 0 : Math.PI
  g.add(lattice(-w / 4, 0.9, fz + facing * 0.05, w / 3.2, 1.2, faceRot))
  g.add(lattice(w / 4, 0.9, fz + facing * 0.05, w / 3.2, 1.2, faceRot))
  g.add(lattice(-(w / 2 + 0.05), 1.0, -d / 4, d / 3, 1.0, Math.PI / 2))
  g.add(lattice(-(w / 2 + 0.05), 1.0, d / 4, d / 3, 1.0, Math.PI / 2))
  g.add(lattice(w / 2 + 0.05, 1.0, -d / 4, d / 3, 1.0, Math.PI / 2))
  g.add(lattice(w / 2 + 0.05, 1.0, d / 4, d / 3, 1.0, Math.PI / 2))
  // 两层宅第二层拱窗与窗台
  if (h >= 4.5) {
    const fz2 = facing * (d / 2 + 0.05)
    g.add(lattice(-w / 4, 3.3, fz2, w / 3.2, 1.0, faceRot))
    g.add(lattice(w / 4, 3.3, fz2, w / 3.2, 1.0, faceRot))
    g.add(box(w / 3.2 + 0.2, 0.08, 0.14, M(C.wood), -w / 4, 3.25, fz2 + facing * 0.03))
    g.add(box(w / 3.2 + 0.2, 0.08, 0.14, M(C.wood), w / 4, 3.25, fz2 + facing * 0.03))
    g.add(lattice(-(w / 2 + 0.05), 3.3, -d / 4, d / 3, 1.0, Math.PI / 2))
    g.add(lattice(-(w / 2 + 0.05), 3.3, d / 4, d / 3, 1.0, Math.PI / 2))
    g.add(lattice(w / 2 + 0.05, 3.3, -d / 4, d / 3, 1.0, Math.PI / 2))
    g.add(lattice(w / 2 + 0.05, 3.3, d / 4, d / 3, 1.0, Math.PI / 2))
  }
  // 门台阶与门框
  g.add(box(1.8, 0.16, 0.7, M(C.brick), 0, 0.08, fz + facing * 0.4))
  g.add(box(1.6, 0.22, 0.18, M(C.wood), 0, 2.35, fz + facing * 0.04))
  g.position.set(x, 0, z)
  return g
}

export default function build(ctx: BuildCtx): THREE.Object3D {
  const root = new THREE.Group()
  const rng = ctx.rng

  root.add(box(40, 0.36, 20, M(C.brickDeep), 0, 0, 0))
  for (let gx = -19; gx <= 19; gx += 2) {
    for (let gz = -9; gz <= 9; gz += 2) {
      const inLane = Math.abs(gz) <= 2.2
      const inYard = Math.abs(gz) >= 3.2 && Math.abs(gz) <= 7.6
      root.add(box(1.8, 0.04, 1.8, M(inLane ? C.paveDark : inYard ? C.pave : C.moss), gx, 0.20, gz))
    }
  }

  const houses: Array<[number, number, number, number, number, 1 | -1]> = [
    [-13, -4.8, 9, 5.2, 5.2, 1],
    [0, -4.8, 9, 5.2, 5.2, 1],
    [13, -4.8, 9, 5.2, 5.2, 1],
    [-13, 4.8, 9, 5.2, 5.2, -1],
    [0, 4.8, 9, 5.2, 5.2, -1],
    [13, 4.8, 9, 5.2, 5.2, -1],
  ]
  for (const [x, z, w, d, h, f] of houses) root.add(courtHouse(x, z, w, d, h, f))

  root.add(fence(-17, -3.6, -17, -7.8))
  root.add(fence(-9, -3.6, -9, -7.8))
  root.add(fence(-2, -3.6, -2, -7.8))
  root.add(fence(2, -3.6, 2, -7.8))
  root.add(fence(9, -3.6, 9, -7.8))
  root.add(fence(-17, 3.6, -17, 7.8))
  root.add(fence(-9, 3.6, -9, 7.8))
  root.add(fence(-2, 3.6, -2, 7.8))
  root.add(fence(2, 3.6, 2, 7.8))
  root.add(fence(9, 3.6, 9, 7.8))

  const lampX = [-15, -9, -3, 3, 9, 15]
  for (const x of lampX) {
    root.add(streetLampHigh(x, -2.6))
    root.add(streetLampHigh(x + 2.9, 2.6))
  }
  for (const x of lampX) {
    const l1 = lantern({ x, z: -2.6, scale: 0.8 }); l1.position.y = 0; root.add(l1)
    const l2 = lantern({ x: x + 2.9, z: 2.6, scale: 0.8 }); l2.position.y = 0; root.add(l2)
  }
  for (let i = 0; i < 4; i++) {
    const x = -15 + i * 10
    root.add(ctx.blocks.streetLamp({ x, z: -3.2, h: 4.4 }))
    root.add(ctx.blocks.streetLamp({ x: x + 4.5, z: 3.2, h: 4.4 }))
  }
  for (let i = 0; i < 6; i++) {
    const x = -16 + i * 6.4
    root.add(ctx.blocks.tree({ x, z: -6.5, scale: 0.7 + rng() * 0.3, seed: 100 + i }))
    root.add(ctx.blocks.tree({ x: x + 3.3, z: 6.5, scale: 0.7 + rng() * 0.3, seed: 200 + i }))
  }
  for (let i = 0; i < 8; i++) {
    const x = -16 + i * 4.6
    root.add(jar(x, -7.0, 0.42 + rng() * 0.2))
    root.add(jar(x + 2.3, 7.0, 0.42 + rng() * 0.2))
  }
  for (let i = 0; i < 4; i++) {
    const x = -14 + i * 9
    root.add(ctx.blocks.bench({ x, z: -2.9, rotY: 0 }))
    root.add(ctx.blocks.bench({ x: x + 4.5, z: 2.9, rotY: Math.PI }))
  }
  for (let i = 0; i < 6; i++) {
    const x = -15 + i * 6
    root.add(ctx.blocks.hedge({ w: 1.6, d: 0.6, h: 0.7, x, z: -3.4 }))
    root.add(ctx.blocks.hedge({ w: 1.6, d: 0.6, h: 0.7, x: x + 3, z: 3.4 }))
  }

  root.add(rock(-17, -6.6, 1.0))
  root.add(rock(17, -6.6, 0.9))
  root.add(rock(-17, 6.6, 0.9))
  root.add(rock(17, 6.6, 1.0))
  root.add(rock(0, -6.4, 0.7))
  root.add(rock(0, 6.4, 0.7))
  for (let i = 0; i < 6; i++) {
    const x = -15 + i * 5.6
    root.add(rock(x, -6.5, 0.55 + rng() * 0.25))
    root.add(rock(x + 1.65, 6.5, 0.55 + rng() * 0.25))
  }

  const gate = new THREE.Group()
  gate.add(box(0.5, 4.2, 0.5, M(C.wood), -2.2, 2.1, 0))
  gate.add(box(0.5, 4.2, 0.5, M(C.wood), 2.2, 2.1, 0))
  gate.add(box(5.4, 0.5, 0.6, M(C.wood), 0, 4.0, 0))
  gate.add(box(4.4, 0.3, 0.5, M(C.roofDeep), 0, 4.5, 0))
  gate.add(lattice(0, 4.5, 0.31, 3.6, 0.8))
  gate.position.set(16, 0, 0)
  gate.userData.site = true
  root.add(gate)

  return root
}

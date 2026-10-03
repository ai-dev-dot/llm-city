import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { lantern } from '../../blocks/fledge-alpha/lantern'

/**
 * b-000038 老茶馆·手作铺 · 老模都记忆巷二期
 *
 * 立意《慢工》——巷东头一座老茶馆配一间手作铺：青砖素白、双层人字青瓦顶，
 * 木门+Torus 门环+窗棂，院内石盆假山与灯笼。二期沿总图 C4-01+02（1×2，40×20m），
 * 与一期中轴巷（C4-04+05+06）同街区、巷口相望。
 */

const C = {
  brick: '#8C7A6B', brickDeep: '#7A6A5C', plaster: '#E6DCC8',
  roof: '#4A4640', roofDeep: '#3B3833', wood: '#6E4F33',
  pave: '#B8AE9E', paveDark: '#9C9284', moss: '#7E8C72',
  grass: '#8C9E8B', lantern: '#FFD98A', rock: '#A9A69E',
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
  g.position.set(x, 0, z); g.userData.site = true
  return g
}

function doorRing(x: number, y: number, z: number, rotY = 0) {
  const t = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 24, 48), M('#5B4A38', { metalness: 0.4, roughness: 0.5 }))
  t.position.set(x, y, z); t.rotation.y = rotY; t.castShadow = true
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
  const bar = 0.06
  const cols = Math.max(2, Math.round(w / 0.5))
  const rows = Math.max(2, Math.round(h / 0.5))
  for (let i = 0; i <= cols; i++) g.add(box(bar, h, bar, M(C.wood), -w / 2 + (w * i) / cols, h / 2, 0))
  for (let j = 0; j <= rows; j++) g.add(box(w, bar, bar, M(C.wood), 0, (h * j) / rows, 0))
  g.position.set(x, y, z); g.rotation.y = rotY
  return g
}

export default function build(ctx: BuildCtx): THREE.Object3D {
  const root = new THREE.Group()
  const rng = ctx.rng

  // 地面（宗地 40×20，铺装+草皮满铺）
  root.add(box(40, 0.2, 20, M(C.pave), 0, -0.1, 0))
  root.add(box(36, 0.05, 16, M(C.paveDark), 0, 0.025, 0))
  root.add(box(36, 0.04, 1.4, M(C.grass), 0, 0.02, -8.3))
  root.add(box(36, 0.04, 1.4, M(C.grass), 0, 0.02, 8.3))
  root.add(box(36, 0.04, 0.5, M(C.moss), 0, 0.02, -7.4))
  root.add(box(36, 0.04, 0.5, M(C.moss), 0, 0.02, 7.4))

  // 老茶馆（西院，16×8）+ 手作铺（东院，14×8）+ 连廊
  const tea = new THREE.Group()
  tea.add(box(12, 4, 8, M(C.plaster), 0, 2, 0))
  tea.add(box(12.4, 0.6, 8.4, M(C.brick), 0, 0.3, 0))
  tea.add(roof(12.8, 8.8, 2.2, C.roof, 0, 4, 0))
  tea.add(cornerSphere(-6.3, 4.1, -4.3))
  tea.add(cornerSphere(6.3, 4.1, -4.3))
  tea.add(cornerSphere(-6.3, 4.1, 4.3))
  tea.add(cornerSphere(6.3, 4.1, 4.3))
  tea.add(box(1.6, 2.4, 0.16, M(C.wood), 0, 1.2, 4.1))
  tea.add(doorRing(0, 1.2, 4.2))
  tea.add(lattice(-3.5, 1.0, 4.12, 2.2, 1.4))
  tea.add(lattice(3.5, 1.0, 4.12, 2.2, 1.4))
  tea.add(lattice(-6.1, 1.1, 0, 3, 1.2, Math.PI / 2))
  tea.add(lattice(6.1, 1.1, 0, 3, 1.2, Math.PI / 2))
  tea.position.set(-11, 0, -2)
  root.add(tea)

  const shop = new THREE.Group()
  shop.add(box(10, 3.4, 8, M(C.plaster), 0, 1.7, 0))
  shop.add(box(10.4, 0.6, 8.4, M(C.brick), 0, 0.3, 0))
  shop.add(roof(10.8, 8.8, 2.0, C.roof, 0, 3.4, 0))
  shop.add(cornerSphere(-5.3, 3.5, -4.3))
  shop.add(cornerSphere(5.3, 3.5, -4.3))
  shop.add(cornerSphere(-5.3, 3.5, 4.3))
  shop.add(cornerSphere(5.3, 3.5, 4.3))
  shop.add(box(1.6, 2.2, 0.16, M(C.wood), 0, 1.1, 4.1))
  shop.add(doorRing(0, 1.1, 4.2))
  shop.add(lattice(-3, 1.0, 4.12, 2, 1.2))
  shop.add(lattice(3, 1.0, 4.12, 2, 1.2))
  shop.add(lattice(-5.1, 1.0, 0, 3, 1.2, Math.PI / 2))
  shop.add(lattice(5.1, 1.0, 0, 3, 1.2, Math.PI / 2))
  shop.position.set(11, 0, 2)
  root.add(shop)

  // 连廊（低矮青砖+坡顶）
  root.add(box(6, 2.6, 3.2, M(C.plaster), 0, 1.3, 0))
  root.add(box(6.4, 0.5, 3.6, M(C.brick), 0, 0.25, 0))
  root.add(roof(6.8, 3.8, 1.4, C.roof, 0, 2.6, 0))
  root.add(lattice(-1.4, 0.9, 1.7, 1.4, 1.0))
  root.add(lattice(1.4, 0.9, 1.7, 1.4, 1.0))

  // 院墙
  root.add(fence(-18, -6, -18, 6))
  root.add(fence(18, -6, 18, 6))
  root.add(fence(-18, -6, 18, -6))
  root.add(fence(-18, 6, 18, 6))

  // 巷灯+官方件
  const lampX = [-14, -6, 2, 10]
  for (const x of lampX) {
    root.add(streetLampHigh(x, -5))
    root.add(streetLampHigh(x + 4, 5))
  }
  for (const x of lampX) {
    const l1 = lantern({ x, z: -5, scale: 0.8 }); l1.position.y = 4.4; root.add(l1)
    const l2 = lantern({ x: x + 4, z: 5, scale: 0.8 }); l2.position.y = 4.4; root.add(l2)
  }
  for (let i = 0; i < 4; i++) {
    const x = -14 + i * 9
    root.add(ctx.blocks.streetLamp({ x, z: -6.6, h: 4.2 }))
    root.add(ctx.blocks.streetLamp({ x: x + 4.5, z: 6.6, h: 4.2 }))
  }
  for (let i = 0; i < 6; i++) {
    const x = -16 + i * 6.4
    root.add(ctx.blocks.tree({ x, z: -6.0, scale: 0.7 + rng() * 0.3, seed: 300 + i }))
    root.add(ctx.blocks.tree({ x: x + 3.2, z: 6.0, scale: 0.7 + rng() * 0.3, seed: 400 + i }))
  }
  for (let i = 0; i < 8; i++) {
    const x = -16 + i * 4.6
    root.add(jar(x, -7.6, 0.42 + rng() * 0.2))
    root.add(jar(x + 2.3, 7.6, 0.42 + rng() * 0.2))
  }
  for (let i = 0; i < 4; i++) {
    const x = -14 + i * 9
    root.add(ctx.blocks.bench({ x, z: 5.2, rotY: Math.PI }))
    root.add(ctx.blocks.bench({ x: x + 4.5, z: -5.2, rotY: 0 }))
  }
  for (let i = 0; i < 6; i++) {
    const x = -15 + i * 6
    root.add(ctx.blocks.hedge({ w: 1.5, d: 0.6, h: 0.7, x, z: -7.0 }))
    root.add(ctx.blocks.hedge({ w: 1.5, d: 0.6, h: 0.7, x: x + 3, z: 7.0 }))
  }
  // 假山
  for (let i = 0; i < 10; i++) {
    const x = -15 + i * 3.3
    root.add(rock(x, -6.6, 0.55 + rng() * 0.25))
    root.add(rock(x + 1.65, 6.6, 0.55 + rng() * 0.25))
  }
  root.add(rock(-16, 6.6, 0.8))
  root.add(rock(16, -6.6, 0.8))

  return root
}

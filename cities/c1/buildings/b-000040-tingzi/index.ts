import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { lantern } from '../../blocks/fledge-alpha/lantern'

/**
 * b-000040 巷口凉棚 · 老模都记忆巷四期（C4-03）
 *
 * 立意《歇脚》——巷口一方有顶可歇的凉棚：四木柱+双层人字青瓦顶，
 * 两侧石凳、四角石盆与灯笼。绿化以石板透草缝与草皮满铺为主，
 * 让巷口成为行人可坐可歇的节点。
 */

const C = {
  brick: '#8C7A6B', plaster: '#E6DCC8', roof: '#4A4640', roofDeep: '#3B3833',
  wood: '#6E4F33', pave: '#B8AE9E', paveDark: '#9C9284', moss: '#7E8C72',
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
  g.position.set(x, y, z)
  return g
}

function jar(x: number, z: number, r = 0.5) {
  const s = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 40), M('#8C9E8B', { roughness: 0.9 }))
  s.scale.y = 0.7; s.position.set(x, r * 0.5, z); s.castShadow = true
  return s
}

function rock(x: number, z: number, r: number) {
  const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 3), M(C.rock, { roughness: 0.95 }))
  s.position.set(x, r * 0.6, z); s.castShadow = true; s.receiveShadow = true
  return s
}

function streetLampHigh(x: number, z: number) {
  const g = new THREE.Group()
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 4.2, 10), M('#3E3C3A', { metalness: 0.5 }))
  pole.position.y = 2.1; g.add(pole)
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.26, 64, 40), M(C.lantern, { emissive: '#FFD98A', emissiveIntensity: 1.1 }))
  bulb.position.y = 4.2; g.add(bulb)
  g.position.set(x, 0, z); g.userData.site = true
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

  // 宗地 20×20 满铺草皮+石板步道十字
  root.add(box(20, 0.2, 20, M(C.grass), 0, -0.1, 0))
  root.add(box(20, 0.06, 2.4, M(C.paveDark), 0, 0.03, 0))   // 东西步道
  root.add(box(2.4, 0.06, 20, M(C.paveDark), 0, 0.03, 0))   // 南北步道
  root.add(box(2.4, 0.06, 2.4, M(C.pave), 0, 0.03, 0))      // 中央石�?
  // 草皮与步道间的青苔镶边
  root.add(box(20, 0.04, 0.4, M(C.moss), 0, 0.02, -1.5))
  root.add(box(20, 0.04, 0.4, M(C.moss), 0, 0.02, 1.5))
  root.add(box(0.4, 0.04, 20, M(C.moss), -1.5, 0.02, 0))
  root.add(box(0.4, 0.04, 20, M(C.moss), 1.5, 0.02, 0))

  // 凉棚本体：四木柱 + 双层人字青瓦顶
  const pav = new THREE.Group()
  for (const [px, pz] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]] as const) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 3.4, 12), M(C.wood))
    col.position.set(px, 1.7, pz); col.castShadow = true; pav.add(col)
  }
  pav.add(roof(6.6, 6.6, 1.8, C.roof, 0, 3.4, 0))
  pav.add(roof(6.0, 6.0, 1.2, C.roofDeep, 0, 5.2, 0))
  pav.add(lattice(0, 4.6, 3.2, 4.4, 1.0))
  root.add(pav)

  // 长凳对望 + 石盆 + 假山 + 灯笼
  root.add(ctx.blocks.bench({ x: -4.6, z: 0, rotY: Math.PI / 2 }))
  root.add(ctx.blocks.bench({ x: 4.6, z: 0, rotY: -Math.PI / 2 }))
  for (const [jx, jz] of [[-6.4, -6.4], [6.4, -6.4], [-6.4, 6.4], [6.4, 6.4], [-3, -9.2], [3, 9.2], [-9.2, 3], [9.2, -3]] as const) {
    root.add(jar(jx, jz, 0.5 + rng() * 0.2))
  }
  root.add(rock(-6.8, 6.8, 0.8))
  root.add(rock(6.8, -6.8, 0.8))
  root.add(streetLampHigh(-6.8, -6.8))
  root.add(streetLampHigh(6.8, 6.8))
  root.add(streetLampHigh(0, -9))
  root.add(streetLampHigh(0, 9))
  const l1 = lantern({ x: -6.8, z: 6.8, scale: 0.8 }); l1.position.y = 4.0; root.add(l1)
  const l2 = lantern({ x: 6.8, z: -6.8, scale: 0.8 }); l2.position.y = 4.0; root.add(l2)

  // 行道树与绿篱
  root.add(ctx.blocks.tree({ x: -7.4, z: 0, scale: 0.9, seed: 1 }))
  root.add(ctx.blocks.tree({ x: 7.4, z: 0, scale: 0.9, seed: 2 }))
  root.add(ctx.blocks.hedge({ w: 2.4, d: 0.6, h: 0.6, x: 0, z: -7.4 }))
  root.add(ctx.blocks.hedge({ w: 2.4, d: 0.6, h: 0.6, x: 0, z: 7.4 }))

  return root
}

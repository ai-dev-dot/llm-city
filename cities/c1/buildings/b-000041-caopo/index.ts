import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { lantern } from '../../blocks/fledge-alpha/lantern'

/**
 * b-000041 巷尾草坡 · 老模都记忆巷四期（C4-09）
 *
 * 立意《一坪绿》——巷尾一方可展坐、可望巷口的草坡：中央草坪抬高，
 * 草皮满铺至宗地边缘，石盆+假山+长凳+灯笼点缀，让游客在巷尾歇脚观巷。
 */

const C = {
  brick: '#8C7A6B', plaster: '#E6DCC8', roof: '#4A4640', roofDeep: '#3B3833',
  wood: '#6E4F33', pave: '#B8AE9E', paveDark: '#9C9284', moss: '#7E8C72',
  grass: '#8C9E8B', grassDeep: '#7B8F76', lantern: '#FFD98A', rock: '#A9A69E',
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

export default function build(ctx: BuildCtx): THREE.Object3D {
  const root = new THREE.Group()
  const rng = ctx.rng

  // 宗地 20×20 满铺草皮（草坡基底）
  root.add(box(20, 0.2, 20, M(C.grass), 0, -0.1, 0))
  // 中央抬高草坪（草坡）
  root.add(box(12, 1.2, 12, M(C.grassDeep), 0, 0.6, 0))
  root.add(box(12.4, 0.3, 12.4, M(C.moss), 0, 0.15, 0))
  // 绕草坡步道（环形石板）
  root.add(box(20, 0.06, 2.4, M(C.paveDark), 0, 0.03, -7.6))
  root.add(box(20, 0.06, 2.4, M(C.paveDark), 0, 0.03, 7.6))
  root.add(box(2.4, 0.06, 20, M(C.paveDark), -7.6, 0.03, 0))
  root.add(box(2.4, 0.06, 20, M(C.paveDark), 7.6, 0.03, 0))
  // 草坡顶点缀
  root.add(ctx.blocks.tree({ x: -3, z: -3, scale: 1.0, seed: 1 }))
  root.add(ctx.blocks.tree({ x: 3, z: 3, scale: 1.1, seed: 2 }))
  root.add(ctx.blocks.bench({ x: 0, z: -3.4, rotY: 0 }))
  root.add(ctx.blocks.bench({ x: 0, z: 3.4, rotY: Math.PI }))
  root.add(jar(-3.4, 3.4, 0.55))
  root.add(jar(3.4, -3.4, 0.55))
  root.add(jar(-7.6, 0, 0.55))
  root.add(jar(7.6, 0, 0.55))
  root.add(jar(0, -7.6, 0.55))
  root.add(jar(0, 7.6, 0.55))
  root.add(jar(-7.6, 7.6, 0.5))
  root.add(jar(7.6, -7.6, 0.5))
  root.add(rock(-3.4, -3.4, 0.8))
  root.add(rock(3.4, 3.4, 0.8))
  root.add(rock(-7.6, -7.6, 0.7))
  root.add(rock(7.6, 7.6, 0.7))
  // 草坡缺口石盆（荷花缸）
  root.add(jar(0, 0, 0.7))
  // 巷口灯笼与街灯
  root.add(streetLampHigh(-6.8, 6.8))
  root.add(streetLampHigh(6.8, -6.8))
  root.add(streetLampHigh(-6.8, -6.8))
  root.add(streetLampHigh(6.8, 6.8))
  const l1 = lantern({ x: -6.8, z: -6.8, scale: 0.8 }); l1.position.y = 4.0; root.add(l1)
  const l2 = lantern({ x: 6.8, z: 6.8, scale: 0.8 }); l2.position.y = 4.0; root.add(l2)
  // 草坡四向绿篱
  root.add(ctx.blocks.hedge({ w: 3.0, d: 0.6, h: 0.6, x: 0, z: -6.2 }))
  root.add(ctx.blocks.hedge({ w: 3.0, d: 0.6, h: 0.6, x: 0, z: 6.2 }))
  root.add(ctx.blocks.hedge({ w: 0.6, d: 3.0, h: 0.6, x: -6.2, z: 0 }))
  root.add(ctx.blocks.hedge({ w: 0.6, d: 3.0, h: 0.6, x: 6.2, z: 0 }))

  return root
}

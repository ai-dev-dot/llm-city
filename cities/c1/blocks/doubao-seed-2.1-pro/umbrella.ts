import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'

const mesh = (g: THREE.BufferGeometry, m: THREE.Material, site = false) => {
  const o = new THREE.Mesh(g, m)
  o.castShadow = true
  if (site) o.userData.site = true
  return o
}

/**
 * 遮阳伞（豆包私人积木）：杆 + 扁圆锥伞盖 + 顶珠。纯参数化、无随机。
 * 整体为景观件（R13 豁免）。调用方以桌椅组配外摆。
 * 复用：灯花市集（三期）；街区底商外摆。
 */
export function umbrella(o: {
  x?: number
  z?: number
  r?: number
  h?: number
  color?: string
  y?: number
}): THREE.Object3D {
  const g = new THREE.Group()
  const r = o.r ?? 1.1
  const h = o.h ?? 2.3
  const pole = mesh(new THREE.CylinderGeometry(0.05, 0.06, h, 10), stdMaterial('#5B4A38', { roughness: 0.8 }), true)
  pole.position.y = h / 2; g.add(pole)
  const canopy = mesh(new THREE.ConeGeometry(r, 0.42, 18), stdMaterial(o.color ?? '#E0D3B8', { roughness: 0.85 }), true)
  canopy.position.y = h + 0.1; g.add(canopy)
  // 顶珠
  const tip = mesh(new THREE.SphereGeometry(0.06, 8, 6), stdMaterial('#5B4A38'), true)
  tip.position.y = h + 0.34; g.add(tip)
  // 伞盖下缘垂边（一圈矮锥裙）
  const skirt = mesh(new THREE.CylinderGeometry(r, r * 0.97, 0.12, 18, 1, true), stdMaterial(o.color ?? '#E0D3B8', { roughness: 0.85 }), true)
  skirt.position.y = h - 0.08; g.add(skirt)
  g.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0)
  g.userData.site = true
  return g
}

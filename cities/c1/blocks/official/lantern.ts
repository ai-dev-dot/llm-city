import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'

const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => { const o = new THREE.Mesh(g, m); o.castShadow = true; return o }

/** 石灯（自建积木示范件，[city-admin] 立法 R14 时投放 2026-09-25）。
 *  与官方件同款约定：纯参数化、无副作用、无随机；各模型可仿照本文件
 *  在 blocks/<自己的 model_id>/ 下建立私人积木（仅能 import 本人名下目录）。
 *  形制：须弥座 — 灯柱 — 承台 — 灯室（四壁发光窗）— 四坡攒尖顶 — 宝珠。 */
export function lantern(o: { x?: number; z?: number; scale?: number; glow?: string } = {}): THREE.Object3D {
  const s = o.scale ?? 1
  const stone = stdMaterial('#8A8478', { roughness: 0.9 })
  const grp = new THREE.Group()
  const base = mesh(new THREE.CylinderGeometry(0.42, 0.52, 0.28, 8), stone)
  base.position.y = 0.14; grp.add(base)
  const shaft = mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.85, 8), stone)
  shaft.position.y = 0.28 + 0.425; grp.add(shaft)
  const slab = mesh(new THREE.BoxGeometry(0.72, 0.15, 0.72), stdMaterial('#75705F'))
  slab.position.y = 1.13 + 0.075; grp.add(slab)
  const house = mesh(new THREE.BoxGeometry(0.55, 0.48, 0.55), stdMaterial('#E8E0CC', { roughness: 0.7 }))
  house.position.y = 1.28 + 0.24; grp.add(house)
  const glow = mesh(new THREE.BoxGeometry(0.59, 0.26, 0.59), stdMaterial(o.glow ?? '#FFE9A8', { emissive: o.glow ?? '#FFE9A8', emissiveIntensity: 1.5 }))
  glow.position.y = 1.28 + 0.24; grp.add(glow)
  const cap = mesh(new THREE.CylinderGeometry(0.02, 0.48, 0.3, 4), stdMaterial('#4E4A40'))
  cap.rotation.y = Math.PI / 4; cap.position.y = 1.76 + 0.15; grp.add(cap)
  const pearl = mesh(new THREE.SphereGeometry(0.09, 10, 8), stdMaterial('#D9C68A', { metalness: 0.4, roughness: 0.35, emissive: '#6B5E2E', emissiveIntensity: 0.3 }))
  pearl.position.y = 2.06 + 0.09; grp.add(pearl)
  grp.scale.set(s, s, s)
  grp.position.set(o.x ?? 0, 0, o.z ?? 0)
  grp.userData.site = true   // 景观件：R13 退线豁免
  return grp
}

import * as THREE from 'three'

// fixture 版自建积木（"本人"= glm-5.3 名下）：不 import lib——fixture 源位置与复制到
// 临时城后的相对层级不同（5 级 vs 3 级），纯 THREE 材质可免路径重写。
// 真实城的积木请参考 cities/c1/blocks/official/lantern.ts（用 stdMaterial 保持官方质感）。
const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => { const o = new THREE.Mesh(g, m); o.castShadow = true; return o }

/** 石灯：六边形灯柱 + 灯室 + 攒尖顶（glm-5.3 的私人积木示范） */
export function lantern(o: { x?: number; z?: number; scale?: number; glow?: string } = {}): THREE.Object3D {
  const s = o.scale ?? 1
  const stone = new THREE.MeshStandardMaterial({ color: '#8A8478', roughness: 0.9 })
  const grp = new THREE.Group()
  const base = mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.26, 6), stone)
  base.position.y = 0.13; grp.add(base)
  const shaft = mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.8, 6), stone)
  shaft.position.y = 0.26 + 0.4; grp.add(shaft)
  const slab = mesh(new THREE.BoxGeometry(0.7, 0.14, 0.7), new THREE.MeshStandardMaterial({ color: '#75705F' }))
  slab.position.y = 1.06 + 0.07; grp.add(slab)
  const house = mesh(new THREE.BoxGeometry(0.52, 0.46, 0.52), new THREE.MeshStandardMaterial({ color: '#E8E0CC', roughness: 0.7 }))
  house.position.y = 1.2 + 0.23; grp.add(house)
  const glow = mesh(new THREE.BoxGeometry(0.56, 0.24, 0.56), new THREE.MeshStandardMaterial({ color: o.glow ?? '#FFE9A8', emissive: o.glow ?? '#FFE9A8', emissiveIntensity: 1.5 }))
  glow.position.y = 1.2 + 0.23; grp.add(glow)
  const cap = mesh(new THREE.CylinderGeometry(0.02, 0.46, 0.28, 4), new THREE.MeshStandardMaterial({ color: '#4E4A40' }))
  cap.rotation.y = Math.PI / 4; cap.position.y = 1.66 + 0.14; grp.add(cap)
  grp.scale.set(s, s, s)
  grp.position.set(o.x ?? 0, 0, o.z ?? 0)
  grp.userData.site = true   // 景观件：R13 退线豁免
  return grp
}

import * as THREE from 'three'

// fixture 版"他人"积木（claude-sonnet-4.5 名下）：供 bad-cross-block 红灯样本引用，
// 验证 R14——glm-5.3 的建筑 import 它必须被拦。
const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => { const o = new THREE.Mesh(g, m); o.castShadow = true; return o }

/** 火盆：三足鼎式炭盆（claude-sonnet-4.5 的私人积木） */
export function brazier(o: { x?: number; z?: number; scale?: number } = {}): THREE.Object3D {
  const s = o.scale ?? 1
  const iron = new THREE.MeshStandardMaterial({ color: '#3E3C3A', metalness: 0.5, roughness: 0.6 })
  const grp = new THREE.Group()
  const bowl = mesh(new THREE.CylinderGeometry(0.45, 0.3, 0.35, 10), iron)
  bowl.position.y = 0.55; grp.add(bowl)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2
    const leg = mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.5, 6), iron)
    leg.position.set(Math.cos(a) * 0.28, 0.25, Math.sin(a) * 0.28)
    leg.rotation.z = Math.cos(a) * 0.25
    leg.rotation.x = -Math.sin(a) * 0.25
    grp.add(leg)
  }
  const ember = mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshStandardMaterial({ color: '#E25822', emissive: '#E25822', emissiveIntensity: 1.2 }))
  ember.position.y = 0.66; grp.add(ember)
  grp.scale.set(s, s, s)
  grp.position.set(o.x ?? 0, 0, o.z ?? 0)
  grp.userData.site = true   // 景观件：R13 退线豁免
  return grp
}

import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'

export default function build(ctx: BuildCtx): THREE.Object3D {
  void ctx
  const g = new THREE.Group()
  const stele = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 6, 0.8),
    new THREE.MeshStandardMaterial({ color: '#3E3C3A', metalness: 0.2, roughness: 0.5 }),
  )
  stele.position.y = 3.4
  g.add(stele)
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0, 1.2, 0.9, 4),
    new THREE.MeshStandardMaterial({ color: '#C9A227', metalness: 0.6, roughness: 0.35 }),
  )
  cap.rotation.y = Math.PI / 4
  cap.position.y = 7.05
  g.add(cap)
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.8, 2.4),
    new THREE.MeshStandardMaterial({ color: '#7C7A76', roughness: 0.85 }),
  )
  base.position.y = 0.4
  g.add(base)
  return g
}

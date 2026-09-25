import * as THREE from 'three'
import type { BuildCtx } from '../../../../../lib/ctx'

// 超高：1100 高 + y=550
export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()
  const m = new THREE.Mesh(new THREE.BoxGeometry(10, 1100, 10), new THREE.MeshStandardMaterial())
  m.position.y = 550
  g.add(m)
  return g
}

import * as THREE from 'three'
import type { BuildCtx } from '../../../../../lib/ctx'

// 超高：400 高 + y=200
export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()
  const m = new THREE.Mesh(new THREE.BoxGeometry(10, 400, 10), new THREE.MeshStandardMaterial())
  m.position.y = 200
  g.add(m)
  return g
}

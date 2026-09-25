import * as THREE from 'three'
import type { BuildCtx } from '../../../../../lib/ctx'

// 超三角面：25,100 盒 × 12 三角 = 301,200 > 300,000（供 Task 8 用）
export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()
  for (let i = 0; i < 25100; i++) {
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial()))
  }
  return g
}

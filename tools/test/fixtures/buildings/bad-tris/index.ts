import * as THREE from 'three'
import type { BuildCtx } from '../../../../../lib/ctx'

// 超三角面：4200 盒 × 12 三角 = 50,400 > 50,000（供 Task 8 用）
export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()
  for (let i = 0; i < 4200; i++) {
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial()))
  }
  return g
}

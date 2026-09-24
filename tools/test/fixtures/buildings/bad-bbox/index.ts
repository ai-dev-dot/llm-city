import * as THREE from 'three'
import type { BuildCtx } from '../../../../../lib/ctx'

// 水平投影出界：宽 30 的盒子中心在 x=10，半宽 15 → x∈[-5,25]，远超地块界（供 Task 8 用）
export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()
  const m = new THREE.Mesh(new THREE.BoxGeometry(30, 4, 12), new THREE.MeshStandardMaterial())
  m.position.set(10, 2, 0)
  g.add(m)
  return g
}

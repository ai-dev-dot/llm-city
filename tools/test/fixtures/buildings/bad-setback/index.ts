import * as THREE from 'three'
import type { BuildCtx } from '../../../../../lib/ctx'

// 贴线建筑（R13 红灯样本）：4m 高墙体压在地块东缘（x 8.2..10.2），R2 合法但超出中央 16×16 退线
export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()
  const m = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 6), new THREE.MeshStandardMaterial())
  m.position.set(9.2, 2, 0)
  g.add(m)
  return g
}

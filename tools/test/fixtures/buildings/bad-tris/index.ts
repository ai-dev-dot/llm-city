import * as THREE from 'three'
import type { BuildCtx } from '../../../../../lib/ctx'

// 超三角面：84 个高分段球 ≈ 504,000 > 500,000 防故障护栏（少量 mesh 高面数，构建快）
export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()
  for (let i = 0; i < 84; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.MeshStandardMaterial())
    m.position.set((i % 12) * 1.6 - 8.8, Math.floor(i / 12) * 1.6, 0)
    g.add(m)
  }
  return g
}

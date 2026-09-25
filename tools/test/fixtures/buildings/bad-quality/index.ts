import * as THREE from 'three'
import type { BuildCtx } from '../../../../../lib/ctx'

// 低完成度建筑（R11 红灯样本）：单块楼板，几何合法但细节密度远低于品质下限，且无 NOTES.md（R12 同红）
export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()
  g.add(ctx.blocks.boxFloor({ w: 12, d: 12, h: 3, y: 0 }))
  return g
}

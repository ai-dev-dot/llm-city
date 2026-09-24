import * as THREE from 'three'
import type { BuildCtx } from '../../../../../lib/ctx'

// 空几何（供 Task 8 用）
export default function build(ctx: BuildCtx): THREE.Object3D {
  return new THREE.Group()
}

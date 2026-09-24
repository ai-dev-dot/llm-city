import * as THREE from 'three'
import type { BuildCtx } from '../../../../../lib/ctx'

// R5：Math.random 非确定源
export default function build(ctx: BuildCtx): THREE.Object3D {
  const r = Math.random()
  return new THREE.Group()
}

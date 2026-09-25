import * as THREE from 'three'
import { brazier } from '../../blocks/claude-sonnet-4.5/brazier'
import type { BuildCtx } from '../../../../../lib/ctx'

// R14：使用了他模型（claude-sonnet-4.5）名下的自建积木（esbuild 能打包成功，由 checkAllowedInputs 拦）
export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()
  g.add(brazier({ x: 0, z: 0 }))
  return g
}

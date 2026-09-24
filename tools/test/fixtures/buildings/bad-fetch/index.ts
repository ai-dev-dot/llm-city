import * as THREE from 'three'
import type { BuildCtx } from '../../../../../lib/ctx'

// R6：fetch 外部资源（写在 if (false) 后也拦——静态扫描按出现即拦）
export default function build(ctx: BuildCtx): THREE.Object3D {
  if (false) fetch('http://example.com')
  return new THREE.Group()
}

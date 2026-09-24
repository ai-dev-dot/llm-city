import * as THREE from 'three'
import type { BuildCtx } from '../../../../../lib/ctx'

// R6：动态 import（if (false) 保证顶层不实际执行——但源码扫描出现即拦）
export default async function build(ctx: BuildCtx): Promise<THREE.Object3D> {
  if (false) await import('three')
  return new THREE.Group()
}

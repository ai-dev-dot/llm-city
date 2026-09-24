import { readFileSync } from 'node:fs'
import type { BuildCtx } from '../../../../../lib/ctx'

// R6：node: 前缀内置模块（platform=neutral 下 esbuild 会当 external 逃过 metafile 分析，必须靠源码正则拦）
export default function build(ctx: BuildCtx): THREE.Object3D {
  const src = readFileSync('index.ts', 'utf8')
  return new THREE.Group()
}

import other from '../good-tower/index'
import type { BuildCtx } from '../../../../../lib/ctx'

// R8：跨建筑 import（能被 esbuild 打包成功，由 checkAllowedInputs 拦）
export default function build(ctx: BuildCtx): THREE.Object3D {
  return other(ctx)
}

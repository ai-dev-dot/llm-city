import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'

export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()
  g.add(ctx.blocks.plinth({ w: 18, d: 18, h: 0.8, color: '#A8A5A0' }))
  // 三层基座 + 塔身
  for (let f = 0; f < 4; f++) {
    const w = 14 - f * 2
    g.add(ctx.blocks.boxFloor({ w, d: w, h: 4, y: 0.8 + f * 4.4, color: f % 2 ? '#D9D6CF' : '#E8E6E1' }))
    g.add(ctx.blocks.windowStrip({ w: w + 0.1, h: 1.4, y: 0.8 + f * 4.4 + 1.6 }))
  }
  // 顶部观景亭
  g.add(ctx.blocks.boxFloor({ w: 5, d: 5, h: 3.4, y: 0.8 + 4 * 4.4, color: '#D9D6CF' }))
  g.add(ctx.blocks.pitchedRoof({ w: 6, d: 6, h: 2.6, y: 0.8 + 4 * 4.4 + 3.4, color: '#4A5568' }))
  // 门廊四柱
  for (const dx of [-3, -1, 1, 3]) {
    g.add(ctx.blocks.column({ r: 0.3, h: 5, x: dx, z: 8.2, color: '#E8E6E1' }))
  }
  g.add(ctx.blocks.neonSign({ w: 4, h: 0.9, color: '#3B82F6', y: 22.5, z: 7.6 }))
  g.add(ctx.blocks.tree({ x: -8, z: 6, seed: 21 }))
  g.add(ctx.blocks.tree({ x: 8, z: 6, seed: 22 }))
  return g
}

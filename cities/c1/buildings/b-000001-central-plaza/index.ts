import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'

export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()
  g.add(ctx.blocks.plinth({ w: 19, d: 19, h: 0.4, color: '#C4C1BA' }))
  const rng = ctx.rng()
  for (let i = 0; i < 4; i++) {
    g.add(ctx.blocks.column({ r: 0.45, h: 4.2, x: -6 + (i % 2) * 12, z: -6 + Math.floor(i / 2) * 12, color: '#E8E6E1' }))
  }
  g.add(ctx.blocks.bench({ x: -5, z: 3, rotY: 0.3 }))
  g.add(ctx.blocks.bench({ x: 5, z: -3, rotY: Math.PI + 0.3 }))
  g.add(ctx.blocks.hedge({ w: 12, x: 0, z: 8.6 }))
  g.add(ctx.blocks.tree({ x: -8, z: -8, scale: 1.2, seed: 11 }))
  g.add(ctx.blocks.tree({ x: 8, z: -8, scale: 1.0, seed: 12 }))
  g.add(ctx.blocks.tree({ x: 8, z: 8, scale: 0.9, seed: 13 }))
  g.add(ctx.blocks.streetLamp({ x: -8.5, z: 0 }))
  g.add(ctx.blocks.streetLamp({ x: 8.5, z: 0 }))
  void rng
  return g
}

import * as THREE from 'three'
import type { BuildCtx } from '../../../../../lib/ctx'

export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()
  const floors = 6
  for (let i = 0; i < floors; i++) {
    const f = ctx.blocks.boxFloor({ w: 12, d: 12, h: 3, y: i * 3.2 })
    g.add(f)
    g.add(ctx.blocks.windowStrip({ w: 12.2, h: 1.1, y: i * 3.2 + 1 }))
  }
  g.add(ctx.blocks.flatRoofTop({ w: 12, d: 12, y: floors * 3.2 }))
  const rng = ctx.rng()
  for (let i = 0; i < 4; i++) g.add(ctx.blocks.tree({ x: -6 + rng() * 12, z: -6 + rng() * 12, seed: i + 1 }))
  return g
}

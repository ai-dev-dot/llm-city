import * as THREE from 'three'
import type { BuildCtx } from '../../../../../lib/ctx'

// 新标准示范建筑（R11：≥12,000 三角形、≥60 mesh；R12：NOTES.md 设计文档）。
// 6 层塔楼 + 基座柱阵 + 四面窗棂分格 + 景观——细部全部来自低分段几何的重复构件，
// 这是把三角预算花在「可感知细节」上的最小样例。
export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()

  // 主体：6 层塔楼
  const floors = 6
  for (let i = 0; i < floors; i++) {
    const y = i * 3.2
    g.add(ctx.blocks.boxFloor({ w: 12, d: 12, h: 3, y }))
    g.add(ctx.blocks.windowStrip({ w: 12.2, h: 1.1, y: y + 1 }))
    // 窗棂分格：每层每面 10 竖条（低面数高密度）
    for (let k = 0; k < 18; k++) {
      const x = -6 + k * (12 / 17)
      g.add(ctx.blocks.wall({ w: 0.14, h: 3, d: 0.14, x, y, z: 6.1 }))
      g.add(ctx.blocks.wall({ w: 0.14, h: 3, d: 0.14, x, y, z: -6.1 }))
      g.add(ctx.blocks.wall({ w: 0.14, h: 3, d: 0.14, x: 6.1, y, z: x }))
      g.add(ctx.blocks.wall({ w: 0.14, h: 3, d: 0.14, x: -6.1, y, z: x }))
    }
    // 横棂两层
    for (const zy of [0.8, 1.6, 2.4]) {
      g.add(ctx.blocks.wall({ w: 12.2, h: 0.14, d: 0.14, y: y + zy, z: 6.1 }))
      g.add(ctx.blocks.wall({ w: 12.2, h: 0.14, d: 0.14, y: y + zy, z: -6.1 }))
      g.add(ctx.blocks.wall({ w: 0.14, h: 0.14, d: 12.2, x: 6.1, y: y + zy, z: 0 }))
      g.add(ctx.blocks.wall({ w: 0.14, h: 0.14, d: 12.2, x: -6.1, y: y + zy, z: 0 }))
    }
  }
  g.add(ctx.blocks.flatRoofTop({ w: 12, d: 12, y: floors * 3.2 }))
  // 穹顶冠（半球 + 顶针）。不用 pitchedRoof：其 45° 旋转在保守包围盒（Box3.setFromObject
  // 非精确模式）下会外扩 √2 倍，宽 12m 的顶会算成 24m 触发 R2。对称穹顶无此问题。
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(5.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#4A5568', roughness: 0.6 }),
  )
  dome.position.y = floors * 3.2 + 0.25
  dome.castShadow = true
  g.add(dome)
  const spire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.14, 3.2, 8),
    new THREE.MeshStandardMaterial({ color: '#3E3C3A', metalness: 0.6, roughness: 0.4 }),
  )
  spire.position.y = floors * 3.2 + 0.25 + 5.2 + 1.6
  spire.castShadow = true
  g.add(spire)

  // 基座柱阵：13×13 = 169 根 12 边柱
  for (let ix = 0; ix < 13; ix++)
    for (let iz = 0; iz < 13; iz++)
      g.add(ctx.blocks.column({ r: 0.22, h: 2.2, x: -8.4 + ix * 1.4, z: -8.4 + iz * 1.4 }))
  // 基座装饰球阵（细分 1 的二十面体，草地点缀）
  for (let i = 0; i < 80; i++) {
    const a = (i / 80) * Math.PI * 2
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), new THREE.MeshStandardMaterial({ color: '#8C9E8B', roughness: 0.9 }))
    b.position.set(Math.cos(a) * 9.4, 0.3, Math.sin(a) * 9.4)
    g.add(b)
  }

  // 景观：树、路灯、椅、绿篱
  const rng = ctx.rng
  for (let i = 0; i < 28; i++) g.add(ctx.blocks.tree({ x: -8 + rng() * 16, z: -8 + rng() * 16, seed: i + 1 }))
  for (const s of [-1, 1]) {
    g.add(ctx.blocks.streetLamp({ x: s * 9, z: 9 }))
    g.add(ctx.blocks.streetLamp({ x: 9, z: s * 9 }))
    g.add(ctx.blocks.streetLamp({ x: s * 9, z: -9 }))
    g.add(ctx.blocks.streetLamp({ x: -9, z: s * 9 }))
    g.add(ctx.blocks.bench({ x: s * 7, z: 8.5 }))
  }
  g.add(ctx.blocks.hedge({ w: 8, d: 0.7, x: 0, z: 9.2 }))
  g.add(ctx.blocks.hedge({ w: 8, d: 0.7, x: 0, z: -9.2 }))
  return g
}

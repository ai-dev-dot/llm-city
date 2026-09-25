import * as THREE from 'three'
import type { BuildCtx } from '../../../../../lib/ctx'

// 回归样本（[city-admin] 修复 2026-09-25：Box3.setFromObject precise 模式）：
// 建筑含两件旋转曲面构件——顶部 45° 旋转攒尖顶（pitchedRoof，旧保守盒会外扩 √2 倍触发 R2）
// 与 30° 旋转六棱盘（旧保守盒被量出 1.3 倍半径、超出中央 16×16 触发 R13）。
// 两者真实投影均在红线内：修复前本样本 R2/R13 误判红灯，修复后须 R1–R14 全绿。
// 主体配方与 good-tower 相同（保证 R11 ≥50,000 三角形）。
export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()

  // 主体：6 层塔楼
  const floors = 6
  for (let i = 0; i < floors; i++) {
    const y = i * 3.2
    g.add(ctx.blocks.boxFloor({ w: 12, d: 12, h: 3, y }))
    g.add(ctx.blocks.windowStrip({ w: 12.2, h: 1.1, y: y + 1 }))
    for (let k = 0; k < 26; k++) {
      const x = -6 + k * (12 / 25)
      g.add(ctx.blocks.wall({ w: 0.14, h: 3, d: 0.14, x, y, z: 6.1 }))
      g.add(ctx.blocks.wall({ w: 0.14, h: 3, d: 0.14, x, y, z: -6.1 }))
      g.add(ctx.blocks.wall({ w: 0.14, h: 3, d: 0.14, x: 6.1, y, z: x }))
      g.add(ctx.blocks.wall({ w: 0.14, h: 3, d: 0.14, x: -6.1, y, z: x }))
    }
    for (const zy of [0.8, 1.6, 2.4]) {
      g.add(ctx.blocks.wall({ w: 12.2, h: 0.14, d: 0.14, y: y + zy, z: 6.1 }))
      g.add(ctx.blocks.wall({ w: 12.2, h: 0.14, d: 0.14, y: y + zy, z: -6.1 }))
      g.add(ctx.blocks.wall({ w: 0.14, h: 0.14, d: 12.2, x: 6.1, y: y + zy, z: 0 }))
      g.add(ctx.blocks.wall({ w: 0.14, h: 0.14, d: 12.2, x: -6.1, y: y + zy, z: 0 }))
    }
  }
  g.add(ctx.blocks.flatRoofTop({ w: 12, d: 12, y: floors * 3.2 }))

  // 旋转构件 1：45° 旋转攒尖顶（真实投影 x=z=7.92·cos45°≈5.6m；旧保守盒宽 22.4m 误触 R2）
  g.add(ctx.blocks.pitchedRoof({ w: 11.2, d: 11.2, h: 3, y: floors * 3.2 + 0.25 }))
  // 旋转构件 2：30° 旋转六棱盘（真实投影 x 6.06m / z 7.0m ≤ 8.05；旧保守盒 9.09m 误触 R13）
  const hexDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 7, 1.2, 6),
    new THREE.MeshStandardMaterial({ color: '#B3AC9E', roughness: 0.85 }),
  )
  hexDisc.rotation.y = Math.PI / 6
  hexDisc.position.y = floors * 3.2 + 0.25 + 3 + 0.6
  hexDisc.castShadow = true
  g.add(hexDisc)
  const spire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.14, 3.2, 8),
    new THREE.MeshStandardMaterial({ color: '#3E3C3A', metalness: 0.6, roughness: 0.4 }),
  )
  spire.position.y = floors * 3.2 + 0.25 + 3 + 1.2 + 1.6
  spire.castShadow = true
  g.add(spire)

  // 基座柱阵：15×15 = 225 根 12 边柱（R13 退线：收进中央 16×16）
  for (let ix = 0; ix < 15; ix++)
    for (let iz = 0; iz < 15; iz++)
      g.add(ctx.blocks.column({ r: 0.22, h: 2.2, x: -7.4 + ix * 1.06, z: -7.4 + iz * 1.06 }))
  // 基座装饰球阵（细分 1 的二十面体，草地点缀；顶 ≤0.6m 为地被层豁免）
  for (let i = 0; i < 260; i++) {
    const a = (i / 260) * Math.PI * 2
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), new THREE.MeshStandardMaterial({ color: '#8C9E8B', roughness: 0.9 }))
    b.position.set(Math.cos(a) * 9.4, 0.26, Math.sin(a) * 9.4)
    g.add(b)
  }

  // 景观：树、路灯、椅、绿篱
  const rng = ctx.rng
  for (let i = 0; i < 56; i++) g.add(ctx.blocks.tree({ x: -8 + rng() * 16, z: -8 + rng() * 16, seed: i + 1 }))
  for (const s of [-1, 1]) {
    g.add(ctx.blocks.streetLamp({ x: s * 9, z: 9 }))
    g.add(ctx.blocks.streetLamp({ x: 9, z: s * 9 }))
    g.add(ctx.blocks.streetLamp({ x: s * 9, z: -9 }))
    g.add(ctx.blocks.streetLamp({ x: -9, z: s * 9 }))
    g.add(ctx.blocks.bench({ x: s * 7, z: 8.5 }))
  }
  g.add(ctx.blocks.hedge({ w: 8, d: 0.7, x: 0, z: 9.2 }))
  g.add(ctx.blocks.hedge({ w: 8, d: 0.7, x: 0, z: -9.2 }))
  for (const [rx, rz, rotY] of [[0, 7.4, 0], [0, -7.4, Math.PI], [7.4, 0, Math.PI / 2], [-7.4, 0, -Math.PI / 2]] as const) {
    const aw = ctx.blocks.archWall({ w: 6, h: 3.2, archW: 1.5, archH: 2.6, depth: 0.35, x: rx, y: 0.05, z: rz })
    aw.rotation.y = rotY
    g.add(aw)
    const rg = ctx.blocks.railing({ w: 12, h: 0.9, x: 0, y: 0.05, z: 0 })
    rg.rotation.y = rotY
    rg.position.x = rx === 0 ? 0 : rx * 0.72
    rg.position.z = rz === 0 ? 0 : rz * 0.72
    g.add(rg)
    g.add(ctx.blocks.archPanel({ w: 1.4, h: 2.0, depth: 0.15, x: rx === 0 ? 2.2 : rx * 0.55, y: 0.05, z: rz === 0 ? 2.2 : rz * 0.55 }))
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    g.add(ctx.blocks.urn({ scale: 1.1, x: Math.cos(a) * 7.2, y: 0.05, z: Math.sin(a) * 7.2 }))
  }
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2
    g.add(ctx.blocks.latticePanel({ w: 1.6, h: 1.2, cols: 2, rows: 2, x: Math.cos(a) * 6.6, y: 0.05, z: Math.sin(a) * 6.6 }))
  }
  return g
}

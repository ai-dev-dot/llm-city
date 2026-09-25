import * as THREE from 'three'
import type { BuildCtx } from '../../../../../lib/ctx'
import { lantern } from '../../blocks/glm-5.3/lantern'

// R14 合规示范（[city-admin] 立法 2026-09-25）：good-tower 基底 + 场地石灯改用
// **本人名下**自建积木（blocks/glm-5.3/lantern.ts）——R1–R14 全绿。
// 自建积木与官方件同款约定：纯参数化、无随机、无副作用。
export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()

  // 主体：6 层塔楼
  const floors = 6
  for (let i = 0; i < floors; i++) {
    const y = i * 3.2
    g.add(ctx.blocks.boxFloor({ w: 12, d: 12, h: 3, y }))
    g.add(ctx.blocks.windowStrip({ w: 12.2, h: 1.1, y: y + 1 }))
    // 窗棂分格：每层每面 10 竖条（低面数高密度）
    for (let k = 0; k < 26; k++) {
      const x = -6 + k * (12 / 25)
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
  // 穹顶冠（半球 + 顶针）。历史上曾因保守包围盒（Box3.setFromObject 非精确模式对
  // 45° 旋转攒尖顶外扩 √2 倍）而避开 pitchedRoof；2026-09-25 [city-admin] 已修复为
  // precise 逐三角形精确盒（见 good-rotated 回归样本），此处保持对称穹顶原样。
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

  // 基座柱阵：15×15 = 225 根 12 边柱（R13 退线：收进中央 16×16）
  for (let ix = 0; ix < 15; ix++)
    for (let iz = 0; iz < 15; iz++)
      g.add(ctx.blocks.column({ r: 0.22, h: 2.2, x: -7.4 + ix * 1.06, z: -7.4 + iz * 1.06 }))
  // 基座装饰球阵（细分 1 的二十面体，草地点缀）
  for (let i = 0; i < 205; i++) {
    const a = (i / 205) * Math.PI * 2
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
  // 高表现力官方件示范：拱墙环廊 + 栏杆环 + 石盆 + 盲拱贴面
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

  // 自建积木（R14 示范）：本人名下 blocks/glm-5.3/lantern——四隅对置石灯阵
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8
    g.add(lantern({ x: Math.cos(a) * 8.6, z: Math.sin(a) * 8.6, scale: 1 + (i % 3) * 0.15 }))
  }
  return g
}

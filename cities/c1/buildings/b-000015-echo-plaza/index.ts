import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { boxBatch, cylBatch, vaultShell, COLORS, type BoxSpec } from '../../blocks/deepseek-v4.1-flash/kit'
import { railWithBalusters } from '../../blocks/deepseek-v4.1-flash/shared-parts'
import { pavingGrid } from '../../blocks/deepseek-v4.1-flash/echo-parts'

/** 回声文化广场 Echo Culture Plaza —— E6 回声街区三期（deepseek-v4.1-flash）。
 *
 *  宗地 E6-07+08+09（3×1，60×20m），局部原点＝宗地中心地面，+X 东、+Z 北。
 *  立意：一期给城市以「声」、二期以「记忆」，三期给街区以「留白与聚场」——
 *  三段并置：西树阵广场（日常）→ 中段镜面水景（静）→ 东段下沉露天剧场（活动）。
 *
 *  **标高（关键）**：城市给每块地块铺了顶面 y=0.16 的实心草皮瓦（web/src/city/scene.ts:104），
 *  低于它的场地设计在网页里一律被盖住。故本广场不做「挖到街面以下」的下沉，而是
 *  **台地广场 + 下沉碗**（城主 2026-09-28 裁定甲案）：四周城市步道留街面标高（铺装顶 0.28），
 *  广场主体做成 +3.6m 台地，露天剧场碗底 +0.3m —— 碗相对台地下沉 3.3m，
 *  且全广场最低点 0.22m 仍高于草皮瓦面，网页里全部可见。
 *
 *  R13：本栋全域为地景（广场），整组 userData.site —— 无建筑本体，退线条款不适用；
 *  R2 仍须落在宗地内（±30 / ±10，容差 0.5）。
 */

const P = {
  /** 宗地东西半宽 / 南北半深 */
  hx: 30,
  hz: 10,
  /** 台地顶面标高 */
  deck: 3.6,
  /** 台地平台板厚 */
  slab: 0.4,
  /** 台地南北半深（其外为城市步道） */
  deckHz: 6.6,
  /** 周边城市步道铺装顶面 */
  walk: 0.28,
  /** 露天剧场舞台面标高（相对台地下沉 3.3m） */
  stageY: 0.3,
  /** 看台级数 / 每级进深（升高 = (deck − stageY) / steps） */
  steps: 14,
  stepRun: 0.9,
  /** 舞台西缘 x（看台由此向西逐级升高） */
  stageEdgeX: 22.5,
  /** 舞台东缘 */
  stageBackX: 28.0,
  /** 看台最前一级半宽 / 每级展开量 */
  seatHalf0: 3.0,
  seatGrow: 0.22,
}

export default function build(ctx: BuildCtx): THREE.Object3D {
  const root = new THREE.Group()
  // 全域地景：整组打 site（R13 退线豁免——广场无建筑本体）
  root.userData.site = true

  const matStone = stdMaterial(COLORS.stone, { roughness: 0.86 })
  const matStoneDim = stdMaterial(COLORS.stoneDim, { roughness: 0.8 })
  const matStoneDeep = stdMaterial(COLORS.stoneDeep, { roughness: 0.82 })
  const matBronze = stdMaterial(COLORS.bronze, { metalness: 0.55, roughness: 0.34 })
  const matDark = stdMaterial(COLORS.dark, { metalness: 0.4, roughness: 0.5 })
  const matWood = stdMaterial(COLORS.wood, { roughness: 0.62 })
  const matGrass = stdMaterial('#8C9E8B', { roughness: 0.95 })
  const matWater = stdMaterial('#5E7C93', { metalness: 0.35, roughness: 0.07, emissive: '#33506A', emissiveIntensity: 0.22 })
  const matPool = stdMaterial('#3E4A55', { roughness: 0.5 })
  const matGlow = stdMaterial(COLORS.glow, { emissive: '#FFE0A8', emissiveIntensity: 0.9, roughness: 0.5 })

  const batch = (specs: BoxSpec[], m: THREE.Material): THREE.Mesh => {
    const o = new THREE.Mesh(boxBatch(specs, m).geometry, m)
    o.castShadow = true
    return o
  }
  const rise = (P.deck - P.stageY) / P.steps
  const seatHalf = (k: number): number => P.seatHalf0 + k * P.seatGrow

  // =====================================================================
  // 一、底面：草地满铺（顶 0.22，高于草皮瓦 0.16）
  // =====================================================================
  root.add(batch([{ x: 0, y: 0.16, z: 0, w: 59.8, h: 0.12, d: 19.8 }], matGrass))

  // =====================================================================
  // 二、周边城市步道（南北两条，留街面标高，接两馆前庭与 E7 方向）
  // =====================================================================
  for (const s of [-1, 1]) {
    root.add(pavingGrid({ w: 56.0, d: 3.2, z: s * 8.4, y: P.walk, cell: 0.26, material: matStoneDim }))
    // 边缘矮座墙（可坐，兼界定广场边界）
    const walls: BoxSpec[] = []
    for (let i = 0; i < 47; i++) {
      walls.push({ x: -27.6 + i * 1.2, y: 0.44, z: s * 9.9, w: 1.15, h: 0.56, d: 0.5 })
    }
    root.add(batch(walls, matStone))
    // 步道灯
    for (let i = 0; i < 10; i++) root.add(ctx.blocks.streetLamp({ x: -25.0 + i * 5.6, z: s * 9.4, h: 4.4 }))
    // 盲道（黄色触感砖，贯通）
    const tact = stdMaterial('#C9A227', { roughness: 0.85 })
    const tiles: BoxSpec[] = []
    for (let i = 0; i < 186; i++) {
      for (const dz of [0, 0.34]) tiles.push({ x: -27.7 + i * 0.3, y: P.walk + 0.03, z: s * 7.0 + dz, w: 0.28, h: 0.08, d: 0.3 })
    }
    root.add(batch(tiles, tact))
    // 排水沟（铸铁格栅）
    const grates: BoxSpec[] = []
    for (let i = 0; i < 112; i++) {
      grates.push({ x: -27.7 + i * 0.5, y: P.walk + 0.02, z: s * 6.6, w: 0.44, h: 0.06, d: 0.34 })
    }
    root.add(batch(grates, matDark))
  }
  // 行道树（步道外缘）
  for (let i = 0; i < 9; i++) {
    const x = -25.0 + i * 5.6 + 2.8
    root.add(ctx.blocks.tree({ x, z: 9.1, scale: 0.78, seed: 9000 + i * 29 }))
    root.add(ctx.blocks.tree({ x, z: -9.1, scale: 0.78, seed: 9500 + i * 29 }))
  }

  // =====================================================================
  // 三、台地挡墙 + 上台台阶 + 无障碍坡道
  // =====================================================================
  {
    const walls: BoxSpec[] = []
    const wallH = P.deck - 0.16
    for (const s of [-1, 1]) {
      walls.push({ x: s * 28.3, y: 0.16 + wallH / 2, z: 0, w: 0.7, h: wallH, d: P.deckHz * 2 + 1.4 })
      walls.push({ x: 0, y: 0.16 + wallH / 2, z: s * (P.deckHz + 0.35), w: 57.3, h: wallH, d: 0.7 })
      walls.push({ x: s * 28.3, y: P.deck + 0.09, z: 0, w: 0.95, h: 0.18, d: P.deckHz * 2 + 1.7 })
      walls.push({ x: 0, y: P.deck + 0.09, z: s * (P.deckHz + 0.35), w: 57.6, h: 0.18, d: 0.95 })
    }
    root.add(batch(walls, matStone))
    // 水平分缝线（大分格细线）
    const joints: BoxSpec[] = []
    for (let k = 1; k < 4; k++) {
      const y = 0.16 + (wallH * k) / 4
      joints.push({ x: 0, y, z: P.deckHz + 0.72, w: 57.3, h: 0.06, d: 0.06 })
      joints.push({ x: 0, y, z: -(P.deckHz + 0.72), w: 57.3, h: 0.06, d: 0.06 })
      for (const s of [-1, 1]) joints.push({ x: s * 28.67, y, z: 0, w: 0.06, h: 0.06, d: P.deckHz * 2 + 1.4 })
    }
    root.add(batch(joints, matStoneDeep))
    // 上台台阶（南北各 3 组，12 级 × 0.275 升高 / 0.28 踏面）
    for (const s of [-1, 1]) {
      for (const cx of [-22.0, -12.0, 2.0]) {
        const st: BoxSpec[] = []
        for (let i = 0; i < 12; i++) {
          const y = 0.3 + (i + 1) * 0.275
          st.push({ x: cx, y: y - 0.14, z: s * (P.deckHz + 0.14 + i * 0.28), w: 4.2, h: 0.28, d: 0.28 })
          st.push({ x: cx, y: y - 0.14, z: s * (P.deckHz + 0.14 + i * 0.28), w: 4.4, h: 0.05, d: 0.3 })
        }
        for (const t of [-1, 1]) {
          st.push({ x: cx + t * 2.3, y: 1.9, z: s * (P.deckHz + 1.8), w: 0.4, h: 3.5, d: 3.6 })
        }
        root.add(batch(st, matStoneDim))
      }
    }
    // 无障碍坡道（北步道内，约 1:12，自 x=−20 升到 x=+19.6）
    const ramp: BoxSpec[] = []
    const rampLen = 39.6, rampRise = 3.3, seg = 66
    for (let i = 0; i < seg; i++) {
      const x = -20 + (rampLen * (i + 0.5)) / seg
      const y = 0.3 + (rampRise * (i + 1)) / seg
      ramp.push({ x, y: y - 0.1, z: 8.6, w: rampLen / seg + 0.02, h: 0.2, d: 1.8 })
      ramp.push({ x, y: y + 0.5, z: 9.6, w: rampLen / seg + 0.02, h: 0.12, d: 0.1 })
    }
    root.add(batch(ramp, matStoneDim))
  }

  // =====================================================================
  // 四、台地平台（顶 3.6）：西段整片 + 看台四周环带
  // =====================================================================
  {
    const slab: BoxSpec[] = []
    const yc = P.deck - P.slab / 2
    const westX1 = P.stageEdgeX - P.steps * P.stepRun
    slab.push({ x: (westX1 - 28) / 2, y: yc, z: 0, w: westX1 + 28, h: P.slab, d: P.deckHz * 2 })
    for (let k = 0; k < P.steps; k++) {
      const xa = P.stageEdgeX - (k + 1) * P.stepRun
      const xb = P.stageEdgeX - k * P.stepRun
      const half = seatHalf(k)
      for (const s of [-1, 1]) {
        slab.push({ x: (xa + xb) / 2, y: yc, z: s * ((half + P.deckHz) / 2), w: P.stepRun, h: P.slab, d: P.deckHz - half })
      }
    }
    for (const s of [-1, 1]) {
      slab.push({ x: (P.stageEdgeX + P.stageBackX) / 2, y: yc, z: s * ((5.0 + P.deckHz) / 2), w: P.stageBackX - P.stageEdgeX, h: P.slab, d: P.deckHz - 5.0 })
    }
    root.add(batch(slab, matStoneDeep))
    root.add(pavingGrid({ w: 37.9, d: 13.2, x: -9.05, z: 0, y: P.deck + 0.06, cell: 0.35, material: matStoneDim }))
  }

  // =====================================================================
  // 五、西段树阵广场（台地上）：树阵 + 铺装带 + 座凳 + 高灯柱
  // =====================================================================
  {
    const pits: BoxSpec[] = []
    const treeSpots: Array<[number, number]> = []
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 10; c++) {
        if (c % 2 === 1 && r % 2 === 1) continue
        treeSpots.push([-26.6 + c * 2.3, -5.9 + r * 1.7])
      }
    }
    treeSpots.forEach(([x, z], i) => {
      const t = ctx.blocks.tree({ x, z, scale: 0.9, seed: 7000 + i * 41 })
      t.position.y = P.deck + 0.06
      root.add(t)
    })
    for (const [x, z] of treeSpots) {
      pits.push({ x, y: P.deck + 0.2, z, w: 1.7, h: 0.4, d: 1.7 })
      for (const dx of [-0.75, 0.75]) pits.push({ x: x + dx, y: P.deck + 0.36, z, w: 0.2, h: 0.12, d: 1.7 })
      for (const dz of [-0.75, 0.75]) pits.push({ x, y: P.deck + 0.36, z: z + dz, w: 1.7, h: 0.12, d: 0.2 })
    }
    root.add(batch(pits, matStone))
    const bands: BoxSpec[] = []
    for (const z of [-4.2, 0, 4.2]) {
      for (let i = 0; i < 62; i++) bands.push({ x: -27.7 + i * 0.36, y: P.deck + 0.07, z, w: 0.32, h: 0.08, d: 1.1 })
    }
    root.add(batch(bands, matStoneDeep))
    for (let i = 0; i < 16; i++) {
      const b1 = ctx.blocks.bench({ x: -26.6 + i * 1.45, z: -2.6, rotY: 0 })
      const b2 = ctx.blocks.bench({ x: -26.6 + i * 1.45, z: 2.6, rotY: Math.PI })
      b1.position.y = P.deck + 0.06
      b2.position.y = P.deck + 0.06
      root.add(b1, b2)
    }
    for (const [x, z] of [[-26.5, -6.2], [-21.5, -6.2], [-16.5, -6.2], [-11.5, -6.2], [-26.5, 6.2], [-21.5, 6.2], [-16.5, 6.2], [-11.5, 6.2]] as const) {
      const l = ctx.blocks.streetLamp({ x, z, h: 5.4 })
      l.position.y = P.deck + 0.06
      root.add(l)
    }
  }

  // =====================================================================
  // 六、中段镜面水景（台地上）：长条浅水池 + 涌泉 + 池底分格 + 汀步
  // =====================================================================
  {
    const px0 = -5.5, px1 = 8.5, pz = 5.0
    const pw = px1 - px0
    const pcx = (px0 + px1) / 2
    const base = P.deck + 0.06
    root.add(batch([
      { x: pcx, y: base + 0.22, z: pz, w: pw + 0.8, h: 0.44, d: 0.4 },
      { x: pcx, y: base + 0.22, z: -pz, w: pw + 0.8, h: 0.44, d: 0.4 },
      { x: px0 - 0.2, y: base + 0.22, z: 0, w: 0.4, h: 0.44, d: pz * 2 },
      { x: px1 + 0.2, y: base + 0.22, z: 0, w: 0.4, h: 0.44, d: pz * 2 },
    ], matStone))
    root.add(pavingGrid({ w: pw, d: pz * 2 - 0.4, x: pcx, z: 0, y: base + 0.02, cell: 0.45, material: matPool }))
    root.add(batch([{ x: pcx, y: base + 0.34, z: 0, w: pw - 0.2, h: 0.05, d: pz * 2 - 0.6 }], matWater))
    {
      const jets: Array<{ x: number; y: number; z: number; r: number; h: number; seg?: number; rTop?: number }> = []
      for (let i = 0; i < 20; i++) {
        for (const s of [-1, 1]) jets.push({ x: px0 + 0.8 + i * 0.72, y: base + 0.36, z: s * 2.6, r: 0.05, h: 0.5, rTop: 0.02, seg: 6 })
      }
      root.add(new THREE.Mesh(cylBatch(jets, matWater).geometry, matWater))
    }
    {
      const stones: BoxSpec[] = []
      for (let i = 0; i < 11; i++) stones.push({ x: px0 + 1.2 + i * 1.35, y: base + 0.42, z: 0, w: 0.7, h: 0.16, d: 1.4 })
      root.add(batch(stones, matStone))
    }
    const seats: BoxSpec[] = []
    for (let i = 0; i < 44; i++) {
      seats.push({ x: -5.9 + i * 0.34, y: base + 0.34, z: 5.6, w: 0.32, h: 0.44, d: 0.6 })
      seats.push({ x: -5.9 + i * 0.34, y: base + 0.34, z: -5.6, w: 0.32, h: 0.44, d: 0.6 })
    }
    root.add(batch(seats, matStone))
    const lamps: Array<{ x: number; y: number; z: number; r: number; h: number; seg?: number; rTop?: number }> = []
    const heads: BoxSpec[] = []
    for (let i = 0; i < 40; i++) {
      const z = i < 20 ? -6.3 : 6.3
      const x = -5.0 + (i % 20) * 0.72
      lamps.push({ x, y: base, z, r: 0.09, h: 0.9, rTop: 0.07, seg: 6 })
      heads.push({ x, y: base + 0.94, z, w: 0.2, h: 0.16, d: 0.2 })
    }
    root.add(new THREE.Mesh(cylBatch(lamps, matDark).geometry, matDark))
    root.add(batch(heads, matGlow))
  }

  // =====================================================================
  // 七、东段下沉露天剧场（碗底 0.3，相对台地下沉 3.3m）
  // =====================================================================
  {
    const bowl: BoxSpec[] = []
    const boards: BoxSpec[] = []
    for (let k = 0; k < P.steps; k++) {
      const xa = P.stageEdgeX - (k + 1) * P.stepRun
      const xb = P.stageEdgeX - k * P.stepRun
      const yTop = P.stageY + (k + 1) * rise
      const half = seatHalf(k)
      const seg = 18
      for (let i = 0; i < seg; i++) {
        const z0 = -half + (half * 2 * i) / seg
        const z1 = -half + (half * 2 * (i + 1)) / seg
        bowl.push({ x: (xa + xb) / 2, y: yTop - 0.12, z: (z0 + z1) / 2, w: P.stepRun, h: 0.24, d: z1 - z0 })
      }
      for (const s of [-1, 1]) {
        bowl.push({ x: (xa + xb) / 2, y: yTop - 0.9, z: s * (half + 0.2), w: P.stepRun, h: 1.8, d: 0.4 })
      }
      const seats = Math.floor((half * 2) / 0.42)
      for (let i = 0; i < seats; i++) {
        const sz = -half + 0.3 + i * 0.42
        boards.push({ x: xa + 0.24, y: yTop + 0.04, z: sz, w: 0.36, h: 0.08, d: 0.4 })
        boards.push({ x: xa + 0.54, y: yTop + 0.24, z: sz, w: 0.08, h: 0.4, d: 0.4 })
        boards.push({ x: xa + 0.24, y: yTop - 0.08, z: sz, w: 0.3, h: 0.16, d: 0.06 })
      }
    }
    bowl.push({ x: (P.stageEdgeX + P.stageBackX) / 2, y: P.stageY - 0.3, z: 0, w: P.stageBackX - P.stageEdgeX, h: 0.6, d: 10.0 })
    bowl.push({ x: P.stageEdgeX - 0.6, y: P.stageY - 0.15, z: 0, w: 1.2, h: 0.5, d: 9.0 })
    for (const s of [-1, 1]) {
      bowl.push({ x: 16.2, y: P.stageY + 1.65, z: s * (P.deckHz + 0.1), w: 12.8, h: 3.3, d: 0.6 })
    }
    bowl.push({ x: P.stageBackX + 0.4, y: P.stageY + 1.65, z: 0, w: 0.8, h: 3.3, d: 13.0 })
    root.add(batch(bowl, matStoneDim))
    root.add(batch(boards, matWood))
    // 舞台背景墙三联盲拱（街区拱母题）
    for (const bz of [-3.4, 0, 3.4]) {
      const ap = ctx.blocks.archPanel({ w: 2.8, h: 5.6, depth: 0.4, color: COLORS.stone, x: P.stageBackX - 0.2, y: P.stageY + 0.6, z: bz })
      ap.rotation.y = -Math.PI / 2
      root.add(ap)
    }
    // 薄壳罩棚（城主裁定为构筑物）：自碗底起拱，冠顶高于台地 5.4m
    {
      const shell = vaultShell({ w: 9.0, rise: 8.7, t: 0.3, depth: 5.5, x: 0, y: 0, z: 0, n: 22, material: matStone })
      shell.rotation.y = Math.PI / 2
      shell.position.set(P.stageEdgeX, P.stageY, 0)
      shell.updateMatrix()
      root.add(shell)
      const ribs: BoxSpec[] = []
      for (let i = 0; i < 14; i++) {
        const z = -3.6 + i * 0.56
        ribs.push({ x: P.stageEdgeX + 2.75, y: P.stageY + 6.1 - Math.abs(z) * 0.34, z, w: 5.2, h: 0.18, d: 0.14 })
      }
      root.add(batch(ribs, matDark))
      for (const s of [-1, 1]) {
        root.add(batch([{ x: P.stageBackX - 0.8, y: P.stageY + 3.4, z: s * 3.4, w: 0.4, h: 7.0, d: 0.4 }], matStoneDim))
      }
    }
    // 两侧入场台阶（自台地折下到碗底）
    for (const s of [-1, 1]) {
      const st: BoxSpec[] = []
      for (let i = 0; i < 12; i++) {
        st.push({ x: 11.6 - i * 0.34, y: P.stageY + (i + 1) * 0.275 - 0.14, z: s * (P.deckHz + 0.5), w: 0.34, h: 0.28, d: 2.2 })
      }
      root.add(batch(st, matStoneDim))
    }
    // 碗口南北两缘护栏
    for (const s of [-1, 1]) {
      root.add(railWithBalusters(12.8, P.deck + 0.06, s * (P.deckHz - 0.4), matBronze, 20))
    }
  }

  // =====================================================================
  // 八、收边：绿篱 / 石盆 / 座凳 / 标识 / 垃圾桶 / 剧场两翼草坡
  // =====================================================================
  {
    const h = ctx.blocks.hedge({ x: -28.9, z: 0, w: 0.7, d: 12.0, h: 0.75 })
    h.position.y = 0.16
    root.add(h)
  }
  for (const [x, z] of [[-27.6, 8.6], [-8.0, 8.6], [10.0, 8.6], [-27.6, -8.6], [-8.0, -8.6], [10.0, -8.6]] as const) {
    const u = ctx.blocks.urn({ x, z, scale: 1.05 })
    u.position.y = P.walk
    root.add(u)
  }
  for (const [x, z] of [[-22.0, 6.2], [-16.0, 6.2], [-22.0, -6.2], [-16.0, -6.2], [-10.5, 6.2], [-10.5, -6.2]] as const) {
    const u = ctx.blocks.urn({ x, z, scale: 1.05 })
    u.position.y = P.deck + 0.06
    root.add(u)
  }
  for (const [x, z, r] of [[-6.2, 6.9, 0], [9.2, 6.9, 0], [-6.2, -6.9, Math.PI], [9.2, -6.9, Math.PI]] as const) {
    const b = ctx.blocks.bench({ x, z, rotY: r })
    b.position.y = P.walk
    root.add(b)
  }
  root.add(batch([
    { x: -1.0, y: P.walk + 1.0, z: 9.4, w: 1.0, h: 0.7, d: 0.12 },
    { x: -1.0, y: P.walk + 0.4, z: 9.4, w: 0.16, h: 0.8, d: 0.16 },
    { x: 3.0, y: P.walk + 1.0, z: -9.4, w: 1.0, h: 0.7, d: 0.12 },
    { x: 3.0, y: P.walk + 0.4, z: -9.4, w: 0.16, h: 0.8, d: 0.16 },
  ], matDark))
  root.add(batch([
    { x: -10.5, y: P.walk + 0.45, z: 9.3, w: 0.5, h: 0.9, d: 0.5 },
    { x: -10.5, y: P.walk + 0.95, z: 9.3, w: 0.56, h: 0.1, d: 0.56 },
    { x: -18.0, y: P.walk + 0.45, z: -9.3, w: 0.5, h: 0.9, d: 0.5 },
    { x: -18.0, y: P.walk + 0.95, z: -9.3, w: 0.56, h: 0.1, d: 0.56 },
  ], matDark))
  {
    const slopes: BoxSpec[] = []
    for (let i = 0; i < 14; i++) {
      const x = 12.2 + i * 1.1
      for (const s of [-1, 1]) slopes.push({ x, y: P.deck + 0.16, z: s * (P.deckHz - 0.5), w: 1.05, h: 0.28, d: 0.9 })
    }
    root.add(batch(slopes, matGrass))
  }

  return root
}

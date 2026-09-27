import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { boxBatch, cylBatch, vaultShell, COLORS, type BoxSpec } from '../../blocks/deepseek-v4.1-flash/kit'
import { arcade, seatBlock, cofferCeiling, diffuserWall, pavingGrid, louvreBand, flyLoft } from '../../blocks/deepseek-v4.1-flash/echo-parts'
import { glassWall, latticeScreen, railWithBalusters } from '../../blocks/deepseek-v4.1-flash/shared-parts'

/** 回声剧院 Echo Theatre —— E6 回声街区一期（deepseek-v4.1-flash 首建）。
 *
 *  宗地 E6-02+03+05+06（2×2，40×40m），局部原点＝宗地中心地面，+X 东、+Z 北（朝原点塔）。
 *  形制：北向拱肋柱廊（城市立面，正对 E5 市民南广场）→ 通高玻璃门厅（夜间即灯）→
 *  观众厅（池座 + 两层楼座 + 两侧包厢，约 950 座，墙面包声学扩散体）→ 台口 → 舞台塔（街区制高点）。
 *  母题「拱·声」：拱肋柱廊＝声波的门廊；石造实体对 E5 玻璃塔形成材质对照。
 *
 *  退线（R13）：建筑本体 x ∈ [−17.2, 17.2]、z ∈ [−17.4, 16.6]，四周留 2.8m 场地带；
 *  台阶（薄板 ≤0.5m 深）与铺装（顶 ≤0.6m）走豁免，景观件一律 userData.site。
 */

const P = {
  /** 建筑本体东西半宽 */
  hx: 17.2,
  /** 观众厅内净半宽 */
  hallX: 13,
  /** 舞台塔半宽 */
  flyX: 12,
  /** 拱廊/门厅半宽 */
  foyerX: 16.25,
  /** 台基顶面标高 */
  plinth: 0.55,
  /** 拱廊前缘 z 基准（挤出向 +Z 0.6m） */
  arcadeZ: 15.4,
  /** 门厅后墙 / 观众厅前墙 z */
  foyerBackZ: 6.5,
  /** 观众厅后墙（后区）与舞台分界 z */
  stageZ: -8,
  /** 舞台塔后墙 z */
  backZ: -17.4,
  /** 观众厅天花（藻井底）标高 */
  hallCeil: 17.6,
  /** 门厅顶板标高 */
  foyerCeil: 15.0,
  /** 侧翼屋面标高 */
  wingTop: 12.0,
  /** 舞台塔顶标高（街区制高点） */
  flyTop: 42.0,
}

export default function build(ctx: BuildCtx): THREE.Object3D {
  const root = new THREE.Group()

  // ---- 材质（同建筑内共享；滤镜按建筑整体换色）----
  const matStone = stdMaterial(COLORS.stone, { roughness: 0.86 })
  const matStoneDim = stdMaterial(COLORS.stoneDim, { roughness: 0.8 })
  const matStoneDeep = stdMaterial(COLORS.stoneDeep, { roughness: 0.82 })
  const matBronze = stdMaterial(COLORS.bronze, { metalness: 0.55, roughness: 0.34 })
  const matDark = stdMaterial(COLORS.dark, { metalness: 0.4, roughness: 0.5 })
  const matWood = stdMaterial(COLORS.wood, { roughness: 0.62 })
  const matVelvet = stdMaterial(COLORS.velvet, { roughness: 0.9 })
  const matGlow = stdMaterial(COLORS.glow, { emissive: '#FFE0A8', emissiveIntensity: 0.9, roughness: 0.5 })
  const matGlass = stdMaterial(COLORS.glass, { metalness: 0.5, roughness: 0.16, emissive: '#C4DFF0', emissiveIntensity: 0.34 })
  const matGrass = stdMaterial('#8C9E8B', { roughness: 0.95 })
  const matPave = stdMaterial(COLORS.stoneDim, { roughness: 0.88 })

  /** 批盒工具：一次性把 specs 合成单 mesh */
  const batch = (specs: BoxSpec[], m: THREE.Material): THREE.Mesh => {
    const o = new THREE.Mesh(boxBatch(specs, m).geometry, m)
    o.castShadow = true
    return o
  }

  // =====================================================================
  // 一、场地：宗地全域满铺（北前庭 / 环带 / 后院），无裸灰
  // =====================================================================
  const site = new THREE.Group()
  site.userData.site = true
  // 城市每地块铺有顶面 y=0.16 的实心草皮瓦（web/src/city/scene.ts）：场地整体抬 0.12，
  // 使铺装顶面 0.26、草地顶面 0.18 都在瓦面之上，场地设计才在网页里可见。
  site.position.y = 0.12

  // 草地底板：宗地全域（40×40）薄草皮，顶 0.06 ≤0.6 走地被豁免
  site.add(batch([{ x: 0, y: 0.03, z: 0, w: 39.9, h: 0.06, d: 39.9 }], matGrass))

  // 北前庭铺装（台阶前至宗地北缘）
  site.add(pavingGrid({ w: 39.6, d: 2.0, z: 18.9, y: 0.14, cell: 0.5, material: matPave }))
  // 环带硬质步道（东西南三侧贴建筑一圈）
  site.add(pavingGrid({ w: 2.2, d: 33.4, x: -18.6, z: -0.4, y: 0.14, cell: 0.5, material: matPave }))
  site.add(pavingGrid({ w: 2.2, d: 33.4, x: 18.6, z: -0.4, y: 0.14, cell: 0.5, material: matPave }))
  site.add(pavingGrid({ w: 39.4, d: 2.2, z: -18.7, y: 0.14, cell: 0.5, material: matPave }))

  // 主入口大台阶（4 级，深 0.42 ≤0.5 走薄板豁免）
  {
    const steps: BoxSpec[] = []
    for (let i = 0; i < 4; i++) {
      steps.push({ x: 0, y: 0.14 + (0.29 / 4) * (i + 0.5), z: 17.1 + i * 0.42, w: 34.4, h: 0.29 / 4, d: 0.42 })
    }
    site.add(batch(steps, matStoneDim))
  }
  // 东西两侧入口台阶
  for (const s of [-1, 1]) {
    const steps: BoxSpec[] = []
    for (let i = 0; i < 3; i++) {
      steps.push({ x: s * (17.2 + 0.21 + i * 0.42), y: 0.14 + (0.29 / 3) * (i + 0.5), z: 0, w: 0.42, h: 0.29 / 3, d: 6.0 })
    }
    site.add(batch(steps, matStoneDim))
  }

  // 西侧镜面水景（长条水盘 + 涌泉），东侧对应花池
  {
    const water = stdMaterial('#5E7C93', { metalness: 0.3, roughness: 0.08, emissive: '#33506A', emissiveIntensity: 0.2 })
    site.add(batch([{ x: -18.9, y: 0.18, z: 2.0, w: 1.4, h: 0.36, d: 11.0 }], matStoneDeep))
    site.add(batch([{ x: -18.9, y: 0.3, z: 2.0, w: 1.1, h: 0.06, d: 10.6 }], water))
    const jets = []
    for (let i = 0; i < 12; i++) jets.push({ x: -18.9, y: 0.3, z: -3.0 + i * 0.9, r: 0.05, h: 0.7, seg: 6 })
    const jm = new THREE.Mesh(cylBatch(jets, water).geometry, water)
    site.add(jm)
  }
  {
    site.add(batch([{ x: 18.9, y: 0.22, z: 2.0, w: 1.4, h: 0.44, d: 11.0 }], matStoneDim))
    site.add(batch([{ x: 18.9, y: 0.44, z: 2.0, w: 1.0, h: 0.3, d: 10.6 }], matGrass))
  }

  // 绿篱：环带三段（景观件豁免）
  for (const [x, z, w, d] of [
    [-19.4, -8.0, 0.7, 16.0], [19.4, -8.0, 0.7, 16.0], [-9.0, -19.4, 12.0, 0.7],
    [9.0, -19.4, 12.0, 0.7], [-19.4, 12.5, 0.7, 8.0], [19.4, 12.5, 0.7, 8.0],
  ] as const) {
    site.add(ctx.blocks.hedge({ x, z, w, d, h: 0.85 }))
  }

  // 行道树 / 路灯 / 长凳 / 石盆（景观件：树池落于环带）
  const treeSpots: Array<[number, number]> = [
    [-19.0, -13.0], [-19.0, -2.0], [19.0, -13.0], [19.0, -2.0],
    [-13.0, -19.0], [13.0, -19.0], [-15.5, 18.6], [15.5, 18.6],
  ]
  treeSpots.forEach(([x, z], i) => site.add(ctx.blocks.tree({ x, z, scale: 0.92, seed: 1000 + i * 37 })))
  for (const [x, z] of [[-19.0, -7.5], [19.0, -7.5], [-19.0, 8.5], [19.0, 8.5], [-8.0, 19.3], [8.0, 19.3], [-14.0, -19.3], [14.0, -19.3]] as const) {
    site.add(ctx.blocks.streetLamp({ x, z, h: 4.6 }))
  }
  for (const [x, z, r] of [[-19.0, -10.5, Math.PI / 2], [19.0, -10.5, -Math.PI / 2], [-19.0, 6.0, Math.PI / 2], [19.0, 6.0, -Math.PI / 2], [-6.0, -19.0, 0], [6.0, -19.0, 0]] as const) {
    site.add(ctx.blocks.bench({ x, z, rotY: r }))
  }
  for (const [x, z] of [[-16.4, 17.6], [16.4, 17.6], [-16.4, 14.4], [16.4, 14.4], [-19.2, 16.0], [19.2, 16.0]] as const) {
    site.add(ctx.blocks.urn({ x, z, scale: 1.15 }))
  }
  // 剧目灯箱（前庭两侧，夜间发光）
  site.add(ctx.blocks.neonSign({ w: 3.2, h: 1.5, color: '#F2C879', x: -12.5, y: 1.5, z: 18.4 }))
  site.add(ctx.blocks.neonSign({ w: 3.2, h: 1.5, color: '#F2C879', x: 12.5, y: 1.5, z: 18.4 }))
  root.add(site)

  // =====================================================================
  // 二、台基：整块石造基座（顶 0.55 ≤0.6 走地被豁免）
  // =====================================================================
  root.add(batch([{ x: 0, y: P.plinth / 2, z: -0.4, w: 35.2, h: P.plinth, d: 34.4 }], matStoneDeep))

  // =====================================================================
  // 三、拱肋柱廊（城市立面，正对市民南广场）
  // =====================================================================
  const porch = arcade({
    panels: 13, panelW: 2.5, h: 14.0, archW: 1.9, archH: 13.0, depth: 0.6,
    y: P.plinth, z: P.arcadeZ, stone: COLORS.stone, trim: COLORS.stoneDim,
  })
  root.add(porch)
  // 主入口门套（中央三孔放大：两侧壁柱 + 门楣 + 叠涩出挑）+ 剧名灯箱
  root.add(batch([
    { x: -2.9, y: P.plinth + 8.0, z: 16.25, w: 0.9, h: 16.0, d: 0.7 },
    { x: 2.9, y: P.plinth + 8.0, z: 16.25, w: 0.9, h: 16.0, d: 0.7 },
    { x: 0, y: 16.35, z: 16.3, w: 6.7, h: 0.9, d: 0.8 },
    { x: 0, y: 17.0, z: 16.35, w: 5.6, h: 0.5, d: 0.7 },
    { x: 0, y: P.plinth + 0.16, z: 16.4, w: 6.7, h: 0.32, d: 0.9 },
  ], matStoneDeep))
  root.add(ctx.blocks.neonSign({ w: 5.4, h: 1.0, color: '#F2C879', x: 0, y: 16.5, z: 16.8 }))
  // 门套内两侧壁灯（暖光竖条）
  root.add(batch([
    { x: -2.35, y: P.plinth + 3.4, z: 15.75, w: 0.16, h: 6.0, d: 0.16 },
    { x: 2.35, y: P.plinth + 3.4, z: 15.75, w: 0.16, h: 6.0, d: 0.16 },
  ], matGlow))

  // =====================================================================
  // 四、门厅：通高玻璃厅（夜间即灯）+ 藻井天花 + 夹层 + 大楼梯
  // =====================================================================
  const foyer = new THREE.Group()
  const fz0 = P.foyerBackZ, fz1 = P.arcadeZ   // 6.5 → 15.4
  const fcz = (fz0 + fz1) / 2
  const fd = fz1 - fz0

  // 北向幕墙（拱廊之后）
  foyer.add(glassWall(P.foyerX * 2, P.foyerCeil - P.plinth, 0, P.plinth, fz1 - 0.15, 0, matGlass, matBronze, 66, 30))
  // 东西侧幕墙
  for (const s of [-1, 1]) {
    foyer.add(glassWall(fd - 0.6, P.foyerCeil - P.plinth, s * P.foyerX, P.plinth, fcz, Math.PI / 2, matGlass, matBronze, 20, 30))
  }
  // 门厅顶板 + 屋面天窗 + 藻井
  foyer.add(batch([{ x: 0, y: P.foyerCeil + 0.28, z: fcz, w: P.foyerX * 2 + 0.7, h: 0.56, d: fd + 0.4 }], matStoneDeep))
  foyer.add(batch([
    { x: 0, y: P.foyerCeil + 0.62, z: 10.4, w: 25.0, h: 0.12, d: 6.2 },
  ], matGlass))
  foyer.add(cofferCeiling({ w: P.foyerX * 2, d: fd, y: P.foyerCeil - 0.1, cell: 0.68, depth: 0.72, z: fcz, material: matStone }))
  // 夹层楼板（后三分之一）+ 边缘栏板
  const mezY = 6.0
  foyer.add(batch([{ x: 0, y: mezY, z: 13.4, w: P.foyerX * 2, h: 0.45, d: 4.0 }], matStoneDim))
  for (const z of [11.4]) {
    const r = new THREE.Group()
    r.add(new THREE.Mesh(new THREE.BoxGeometry(P.foyerX * 2, 0.12, 0.2), matBronze))
    r.position.set(0, mezY + 1.05, z)
    foyer.add(railWithBalusters(P.foyerX * 2, mezY + 0.22, z, matBronze, 40))
  }
  // 东西大楼梯（16 级，各 2 件：踏面 + 踢面）
  for (const s of [-1, 1]) {
    const st: BoxSpec[] = []
    const bx = s * 15.0
    for (let i = 0; i < 16; i++) {
      const y = P.plinth + i * ((mezY - P.plinth) / 16)
      const z = 15.0 - i * 0.34
      st.push({ x: bx, y: y + 0.09, z, w: 2.0, h: 0.18, d: 0.4 })                 // 踏面
      st.push({ x: bx, y: y - 0.09, z: z - 0.15, w: 2.0, h: 0.36, d: 0.08 })       // 踢面
      st.push({ x: bx - s * 1.05, y: y + 0.55, z, w: 0.1, h: 0.75, d: 0.4 })       // 栏板立柱
      st.push({ x: bx - s * 1.05, y: y + 1.0, z, w: 0.22, h: 0.14, d: 0.42 })      // 扶手
    }
    foyer.add(batch(st, matStoneDim))
  }
  // 服务台 / 衣帽 / 悬挂灯
  foyer.add(batch([
    { x: 0, y: P.plinth + 0.55, z: 8.2, w: 7.0, h: 1.1, d: 0.9 },
    { x: -8.6, y: P.plinth + 0.45, z: 7.6, w: 3.6, h: 0.9, d: 0.8 },
    { x: 8.6, y: P.plinth + 0.45, z: 7.6, w: 3.6, h: 0.9, d: 0.8 },
  ], matWood))
  {
    const discs = []
    const pend = []
    for (let i = 0; i < 5; i++) {
      const x = -12 + i * 6
      discs.push({ x, y: 10.4, z: 11.0, r: 1.5, h: 0.28, seg: 16 })
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2
        pend.push({ x: x + Math.cos(a) * 1.25, y: 9.2, z: 11.0 + Math.sin(a) * 1.25, r: 0.07, h: 1.1, seg: 6 })
      }
    }
    const dm = new THREE.Mesh(cylBatch(discs, matGlow).geometry, matGlow)
    dm.castShadow = true
    foyer.add(dm)
    foyer.add(new THREE.Mesh(cylBatch(pend, matBronze).geometry, matBronze))
  }
  // 门厅与观众厅之间的高侧窗带（上亮带，补背光）
  foyer.add(glassWall(P.hallX * 2, 2.6, 0, P.hallCeil - 2.6, P.foyerBackZ + 0.05, 0, matGlass, matBronze, 26, 3))
  root.add(foyer)

  // =====================================================================
  // 五、观众厅：池座 + 两层楼座 + 两侧包厢 + 声学扩散体 + 藻井天花
  // =====================================================================
  const hall = new THREE.Group()
  const hz0 = P.stageZ, hz1 = P.foyerBackZ   // -8 → 6.5
  const hcz = (hz0 + hz1) / 2

  // 侧墙（x=±13）与后墙（z=6.5，留两个入场门洞）
  for (const s of [-1, 1]) {
    hall.add(batch([{ x: s * (P.hallX + 0.3), y: (P.hallCeil + P.plinth) / 2, z: hcz, w: 0.6, h: P.hallCeil - P.plinth, d: hz1 - hz0 }], matStoneDim))
  }
  for (const [x0, x1] of [[-13.0, -8.6], [-5.4, 5.4], [8.6, 13.0]] as const) {
    hall.add(batch([{ x: (x0 + x1) / 2, y: (P.hallCeil + P.plinth) / 2, z: hz1 + 0.3, w: x1 - x0, h: P.hallCeil - P.plinth, d: 0.6 }], matStoneDim))
  }
  // 观众厅天花：藻井（26×14.5，格 0.72）
  hall.add(cofferCeiling({ w: P.hallX * 2, d: hz1 - hz0, y: P.hallCeil - 0.15, cell: 0.72, depth: 0.95, z: hcz, material: matStone }))
  // 声学扩散体：东西侧墙 + 后墙（棋盘错落）
  for (const s of [-1, 1]) {
    hall.add(diffuserWall({ w: hz1 - hz0 - 0.4, h: 12.0, x: s * (P.hallX - 0.05), y: 4.4, z: hcz, cols: 18, rows: 10, ry: Math.PI / 2, material: matWood }))
    // 侧墙木格栅（扩散体之外的竖向声学板条）
    const battens: BoxSpec[] = []
    for (let i = 0; i < 46; i++) {
      const z = hz0 + 0.3 + i * ((hz1 - hz0 - 0.6) / 45)
      battens.push({ x: s * (P.hallX - 0.16), y: 3.0, z, w: 0.16, h: 4.4, d: 0.14 })
    }
    hall.add(batch(battens, matWood))
  }
  hall.add(diffuserWall({ w: P.hallX * 2 - 0.4, h: 12.0, x: 0, y: 4.4, z: hz1 - 0.05, cols: 26, rows: 10, material: matWood }))

  // 池座：11 排 × 46 座（阶梯楼板随排抬升）
  const seatPitch = 0.52, rowPitch = 0.92, rake = 0.13
  const cols = 46
  {
    const stalls: BoxSpec[] = []
    for (let r = 0; r < 11; r++) {
      const z = -4.2 + r * rowPitch
      const y = P.plinth + r * rake
      stalls.push({ x: 0, y: y - 0.2, z: z + 0.3, w: P.hallX * 2 - 0.6, h: 0.4 + r * rake, d: rowPitch + 0.1 })
    }
    hall.add(batch(stalls, matStoneDeep))
    hall.add(seatBlock({ rows: 11, cols, x: 0, z: 0.4, y: P.plinth, seatPitch, rowPitch, rake, seatMat: matVelvet, frameMat: matBronze }))
  }
  // 一层楼座（6 排，楼板 + 挑台栏板）
  {
    const y = 5.6
    hall.add(batch([{ x: 0, y: y - 0.3, z: 3.9, w: P.hallX * 2 - 0.4, h: 0.6, d: 5.2 }], matStoneDeep))
    hall.add(railWithBalusters(P.hallX * 2 - 0.8, y + 0.05, 1.3, matBronze, 44))
    hall.add(seatBlock({ rows: 6, cols, x: 0, z: 3.8, y, seatPitch, rowPitch, rake: 0.16, seatMat: matVelvet, frameMat: matBronze }))
  }
  // 二层楼座（4 排）
  {
    const y = 9.8
    hall.add(batch([{ x: 0, y: y - 0.3, z: 5.0, w: P.hallX * 2 - 0.4, h: 0.6, d: 3.0 }], matStoneDeep))
    hall.add(railWithBalusters(P.hallX * 2 - 0.8, y + 0.05, 3.4, matBronze, 44))
    hall.add(seatBlock({ rows: 4, cols, x: 0, z: 5.0, y, seatPitch, rowPitch, rake: 0.16, seatMat: matVelvet, frameMat: matBronze }))
  }
  // 两侧包厢（4 座，各含楼板 / 三面矮墙 / 栏板 / 4 座）
  for (const s of [-1, 1]) {
    for (const [y, z] of [[5.6, 0.6], [9.8, 4.4]] as const) {
      const bx = s * (P.hallX - 1.9)
      hall.add(batch([
        { x: bx, y: y - 0.25, z, w: 3.4, h: 0.5, d: 3.0 },
        { x: bx + s * 1.65, y: y + 1.4, z, w: 0.2, h: 2.8, d: 3.0 },
        { x: bx, y: y + 1.4, z: z + 1.45, w: 3.4, h: 2.8, d: 0.2 },
        { x: bx, y: y + 1.4, z: z - 1.45, w: 3.4, h: 2.8, d: 0.2 },
      ], matVelvet))
      hall.add(railWithBalusters(3.2, y + 0.05, z - 1.5, matBronze, 8))
      hall.add(seatBlock({ rows: 2, cols: 2, x: bx, z, y, seatPitch: 0.6, rowPitch: 0.9, rake: 0, seatMat: matVelvet, frameMat: matBronze }))
    }
  }
  // 灯架（三条横贯观众厅的照明桥）
  {
    const bridges: BoxSpec[] = []
    for (let i = 0; i < 3; i++) {
      const z = -1.0 + i * 3.0
      const y = 13.2 + i * 0.8
      bridges.push({ x: 0, y, z, w: P.hallX * 2 - 1.0, h: 0.5, d: 0.5 })
      bridges.push({ x: 0, y: y + 0.4, z, w: P.hallX * 2 - 1.0, h: 0.12, d: 0.12 })
      for (let k = 0; k < 14; k++) {
        bridges.push({ x: -11 + k * 1.7, y: y - 0.45, z, w: 0.22, h: 0.4, d: 0.22 })
      }
    }
    hall.add(batch(bridges, matDark))
  }
  root.add(hall)

  // =====================================================================
  // 六、台口 + 舞台塔（街区制高点）
  // =====================================================================
  const stage = new THREE.Group()
  // 台口框（两侧塔柱 + 上方横梁，留 14×9 洞口）
  stage.add(batch([
    { x: -10.5, y: P.plinth + 6.0, z: P.stageZ, w: 5.0, h: 12.0, d: 1.2 },
    { x: 10.5, y: P.plinth + 6.0, z: P.stageZ, w: 5.0, h: 12.0, d: 1.2 },
    { x: 0, y: P.plinth + 11.0, z: P.stageZ, w: 16.0, h: 4.0, d: 1.2 },
  ], matStone))
  // 舞台台面（暖木）+ 台唇
  stage.add(batch([
    { x: 0, y: P.plinth + 0.25, z: -13.0, w: 24.0, h: 0.5, d: 9.0 },
    { x: 0, y: P.plinth + 0.2, z: -7.6, w: 15.0, h: 0.4, d: 1.4 },
  ], matWood))
  // 舞台塔体：东西墙 + 后墙 + 北墙（台口上方封塔，塔内吊杆/天桥不外露）+ 顶板
  const flyTop = P.flyTop
  for (const s of [-1, 1]) {
    stage.add(batch([{ x: s * P.flyX, y: (flyTop + P.plinth) / 2, z: -12.7, w: 0.8, h: flyTop - P.plinth, d: 9.4 }], matStone))
  }
  stage.add(batch([{ x: 0, y: (flyTop + P.plinth) / 2, z: P.backZ, w: P.flyX * 2 + 0.8, h: flyTop - P.plinth, d: 0.8 }], matStone))
  // 北墙（y=13 台口框以上至塔顶，27m 宽封满塔体）
  stage.add(batch([{ x: 0, y: (flyTop + 13.0) / 2, z: -8.4, w: 27.0, h: flyTop - 13.0, d: 0.8 }], matStone))
  stage.add(batch([{ x: 0, y: flyTop + 0.3, z: -12.6, w: P.flyX * 2 + 1.6, h: 0.6, d: 10.2 }], matStoneDeep))
  // 塔身竖肋（东西后三面，密肋＝石造垂直感）
  {
    const ribs: BoxSpec[] = []
    for (const s of [-1, 1]) {
      for (let i = 0; i < 12; i++) {
        const z = -17.0 + i * 0.78
        ribs.push({ x: s * (P.flyX + 0.5), y: (flyTop + P.plinth) / 2, z, w: 0.3, h: flyTop - P.plinth, d: 0.34 })
      }
    }
    for (let i = 0; i < 25; i++) {
      const x = -P.flyX + i * 1.0
      ribs.push({ x, y: (flyTop + P.plinth) / 2, z: P.backZ - 0.3, w: 0.34, h: flyTop - P.plinth, d: 0.3 })
    }
    // 竖向石缝分层（每 3.7m 一道水平压顶线）
    for (let k = 1; k < 11; k++) {
      const y = P.plinth + k * 3.7
      ribs.push({ x: 0, y, z: P.backZ - 0.34, w: P.flyX * 2 + 0.8, h: 0.16, d: 0.2 })
      for (const s of [-1, 1]) ribs.push({ x: s * (P.flyX + 0.55), y, z: -12.7, w: 0.2, h: 0.16, d: 9.4 })
    }
    stage.add(batch(ribs, matStoneDim))
  }
  // 塔顶百叶 + 顶部发光槽（夜间塔顶泛光）
  stage.add(louvreBand({ w: 20.0, h: 3.4, x: 0, y: flyTop - 6.2, z: P.backZ - 0.36, slats: 9, material: matDark }))
  stage.add(louvreBand({ w: 8.4, h: 3.4, x: P.flyX + 0.6, y: flyTop - 6.2, z: -12.7, slats: 9, ry: Math.PI / 2, material: matDark }))
  stage.add(louvreBand({ w: 8.4, h: 3.4, x: -P.flyX - 0.6, y: flyTop - 6.2, z: -12.7, slats: 9, ry: Math.PI / 2, material: matDark }))
  stage.add(batch([
    { x: 0, y: flyTop - 1.1, z: P.backZ - 0.32, w: 20.4, h: 0.9, d: 0.3 },
    { x: P.flyX + 0.7, y: flyTop - 1.1, z: -12.7, w: 0.3, h: 0.9, d: 8.6 },
    { x: -P.flyX - 0.7, y: flyTop - 1.1, z: -12.7, w: 0.3, h: 0.9, d: 8.6 },
  ], matGlow))
  // 舞台内部：吊杆阵列 + 天桥 + 幕布
  stage.add(flyLoft({ w: 22.0, x: 0, z0: -16.6, z1: -9.2, y: 24.0, bars: 40, material: matDark }))
  {
    const cats: BoxSpec[] = []
    for (const y of [9.0, 16.0, 23.0]) {
      for (const s of [-1, 1]) cats.push({ x: s * (P.flyX - 0.9), y, z: -12.7, w: 1.1, h: 0.18, d: 8.4 })
      cats.push({ x: 0, y, z: -16.6, w: 22.0, h: 0.18, d: 1.1 })
      for (let i = 0; i < 12; i++) {
        cats.push({ x: -11 + i * 2.0, y: y + 0.55, z: -16.6, w: 0.06, h: 1.1, d: 0.06 })
      }
    }
    stage.add(batch(cats, matDark))
  }
  stage.add(batch([
    { x: 0, y: 12.0, z: -8.6, w: 15.0, h: 9.0, d: 0.16 },
    { x: -7.6, y: 12.0, z: -8.3, w: 2.6, h: 9.0, d: 0.16 },
    { x: 7.6, y: 12.0, z: -8.3, w: 2.6, h: 9.0, d: 0.16 },
  ], matVelvet))
  // 舞台工作灯（顶部吊灯盘 + 面光）
  {
    const lamps: Array<{ x: number; y: number; z: number; r: number; h: number; seg?: number }> = []
    for (let i = 0; i < 24; i++) {
      lamps.push({ x: -10 + (i % 12) * 1.8, y: 26.0, z: -10.5 - Math.floor(i / 12) * 3.0, r: 0.22, h: 0.5, seg: 8 })
    }
    for (let i = 0; i < 10; i++) lamps.push({ x: -8 + i * 1.8, y: 15.0, z: -7.4, r: 0.2, h: 0.6, seg: 8 })
    stage.add(new THREE.Mesh(cylBatch(lamps, matGlow).geometry, matGlow))
  }
  root.add(stage)

  // =====================================================================
  // 七、侧翼（排练厅 / 门厅配套 / 楼梯）：石墙 + 密棂窗 + 平屋面设备
  // =====================================================================
  const wings = new THREE.Group()
  const wingZ0 = P.backZ, wingZ1 = P.foyerBackZ
  for (const s of [-1, 1]) {
    const wx = s * ((P.hallX + 0.6 + P.hx) / 2)
    const ww = P.hx - P.hallX - 0.6
    wings.add(batch([{ x: wx, y: (P.wingTop + P.plinth) / 2, z: (wingZ0 + wingZ1) / 2, w: ww, h: P.wingTop - P.plinth, d: wingZ1 - wingZ0 }], matStone))
    // 屋面女儿墙 + 设备
    wings.add(batch([
      { x: wx, y: P.wingTop + 0.35, z: wingZ0 + 0.3, w: ww + 0.4, h: 0.7, d: 0.6 },
      { x: wx, y: P.wingTop + 0.35, z: wingZ1 - 0.3, w: ww + 0.4, h: 0.7, d: 0.6 },
    ], matStoneDim))
    // 外立面密棂窗（三组）
    for (const [cz, cw] of [[-13.0, 4.4], [-3.0, 5.2], [3.4, 4.0]] as const) {
      wings.add(latticeScreen({ w: cw, h: 7.2, x: s * (P.hx + 0.06), y: 2.6, z: cz, ry: Math.PI / 2, cell: 0.25, material: matBronze }))
      wings.add(batch([{ x: s * (P.hx + 0.02), y: 2.6 + 7.2 / 2, z: cz, w: 0.12, h: 7.2, d: cw + 0.5 }], matGlass))
    }
    // 侧入口门套（贴面壁柱 + 门楣 + 出挑薄檐，均落在退线内）+ 门扇
    wings.add(batch([
      { x: s * (P.hx + 0.3), y: P.plinth + 2.6, z: -3.3, w: 0.6, h: 5.2, d: 0.9 },
      { x: s * (P.hx + 0.3), y: P.plinth + 2.6, z: 2.3, w: 0.6, h: 5.2, d: 0.9 },
      { x: s * (P.hx + 0.3), y: 5.5, z: -0.5, w: 0.6, h: 0.9, d: 6.5 },
      { x: s * (P.hx + 0.35), y: 6.1, z: -0.5, w: 0.7, h: 0.26, d: 6.9 },
      { x: s * (P.hx + 0.5), y: 6.45, z: -0.5, w: 0.2, h: 0.4, d: 6.9 },
    ], matStoneDim))
    wings.add(batch([
      { x: s * (P.hx + 0.1), y: P.plinth + 1.6, z: -0.5, w: 0.3, h: 3.2, d: 1.5 },
      { x: s * (P.hx + 0.1), y: P.plinth + 1.6, z: 0.5, w: 0.3, h: 3.2, d: 1.5 },
    ], matBronze))
    // 屋面设备（空调机组 / 风管 / 冷却塔）
    wings.add(batch([
      { x: wx - s * 0.6, y: P.wingTop + 1.0, z: -12.0, w: ww - 1.4, h: 1.4, d: 3.0 },
      { x: wx - s * 0.6, y: P.wingTop + 0.8, z: -7.0, w: ww - 2.0, h: 1.0, d: 2.0 },
      { x: wx, y: P.wingTop + 0.5, z: 2.0, w: 1.6, h: 0.5, d: 8.0 },
    ], matStoneDeep))
    // 落水管
    for (const dz of [-16.4, -6.0, 5.6]) {
      wings.add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, P.wingTop, 8), matBronze))
      const dp = wings.children[wings.children.length - 1] as THREE.Mesh
      dp.position.set(s * (P.hx + 0.14), P.wingTop / 2, dz)
      dp.castShadow = true
    }
  }
  root.add(wings)

  // =====================================================================
  // 八、屋面：观众厅声壳（筒壳）+ 门厅屋面板 + 舞台塔设备
  // =====================================================================
  root.add(vaultShell({ w: P.hallX * 2 + 1.2, rise: 3.0, t: 0.45, depth: hz1 - hz0, x: 0, y: P.hallCeil, z: hz0, n: 28, material: matStoneDim }))
  // 壳端山墙 + 检修步道
  root.add(batch([
    { x: 0, y: P.hallCeil + 1.4, z: hz1 - 0.25, w: P.hallX * 2 + 1.2, h: 3.2, d: 0.5 },
    { x: 0, y: P.hallCeil + 1.4, z: hz0 + 0.25, w: P.hallX * 2 + 1.2, h: 3.2, d: 0.5 },
    { x: 0, y: P.hallCeil + 3.2, z: 0, w: 1.2, h: 0.3, d: hz1 - hz0 - 1.0 },
  ], matStoneDeep))
  // 筒壳横向拱肋（12 道，让声壳读作有结构的分段壳而非一片板）
  for (let i = 0; i < 12; i++) {
    root.add(vaultShell({
      w: P.hallX * 2 + 1.9, rise: 3.25, t: 0.5, depth: 0.36, n: 20,
      x: 0, y: P.hallCeil - 0.06, z: hz0 + 0.4 + (i * (hz1 - hz0 - 0.9)) / 11, material: matStone,
    }))
  }
  // 观众厅檐口带 + 女儿墙（把筒壳边缘收进石造线脚里）
  root.add(batch([
    { x: 0, y: P.hallCeil + 0.3, z: hz0 - 0.25, w: P.hallX * 2 + 1.9, h: 0.6, d: 0.7 },
    { x: 0, y: P.hallCeil + 0.3, z: hz1 + 0.25, w: P.hallX * 2 + 1.9, h: 0.6, d: 0.7 },
    { x: P.hallX + 0.65, y: P.hallCeil + 1.25, z: hcz, w: 0.7, h: 2.5, d: hz1 - hz0 + 1.2 },
    { x: -P.hallX - 0.65, y: P.hallCeil + 1.25, z: hcz, w: 0.7, h: 2.5, d: hz1 - hz0 + 1.2 },
  ], matStoneDim))
  // 舞台塔北立面（塔体高于观众厅声壳的一段：竖肋 + 通高百叶 + 顶部檐口）
  {
    const nface: BoxSpec[] = []
    for (let i = 0; i < 19; i++) {
      nface.push({ x: -12.6 + i * 1.4, y: (flyTop + 20.4) / 2, z: -7.86, w: 0.36, h: flyTop - 20.4, d: 0.36 })
    }
    nface.push({ x: 0, y: 20.7, z: -7.9, w: 27.0, h: 0.7, d: 0.5 })
    nface.push({ x: 0, y: flyTop - 0.3, z: -7.9, w: 27.0, h: 0.8, d: 0.6 })
    root.add(batch(nface, matStoneDim))
    // 三联盲拱（把下层柱廊的「拱·声」母题抬到塔身，塔身不再是白板）
    for (const bx of [-8.6, 0, 8.6]) {
      root.add(ctx.blocks.archPanel({ w: 5.4, h: 14.0, depth: 0.5, color: COLORS.stone, x: bx, y: 21.6, z: -8.2 }))
      root.add(louvreBand({ w: 2.8, h: 7.0, x: bx, y: 24.0, z: -7.66, slats: 12, material: matDark }))
      root.add(batch([
        { x: bx, y: 21.3, z: -8.05, w: 6.4, h: 0.5, d: 0.5 },
      ], matStoneDim))
    }
  }
  // 舞台塔顶设备
  root.add(batch([
    { x: -6.0, y: flyTop + 1.5, z: -14.5, w: 6.0, h: 2.4, d: 4.0 },
    { x: 6.0, y: flyTop + 1.2, z: -14.5, w: 5.0, h: 1.8, d: 4.0 },
    { x: 0, y: flyTop + 0.9, z: -10.0, w: 16.0, h: 1.2, d: 1.6 },
  ], matStoneDeep))
  // 塔顶检修栏杆（航空障碍标识）
  root.add(railWithBalusters(22.0, flyTop + 0.6, P.backZ - 0.45, matBronze, 24))

  // =====================================================================
  // 九、外墙石材分缝（水平压顶线 + 竖向分格缝，落在主要实墙面）
  // =====================================================================
  {
    const joints: BoxSpec[] = []
    const wingZ = (wingZ0 + wingZ1) / 2, wingD = wingZ1 - wingZ0
    for (const s of [-1, 1]) {
      // 侧翼外立面：水平缝每 1.2m、竖缝每 1.6m
      for (let k = 1; k < 10; k++) joints.push({ x: s * (P.hx + 0.03), y: P.plinth + k * 1.2, z: wingZ, w: 0.1, h: 0.1, d: wingD })
      for (let k = 1; k < 16; k++) joints.push({ x: s * (P.hx + 0.03), y: (P.wingTop + P.plinth) / 2, z: wingZ0 + (wingD * k) / 16, w: 0.1, h: P.wingTop - P.plinth, d: 0.1 })
      // 舞台塔东西立面：水平缝每 1.85m、竖缝每 1.5m
      for (let k = 1; k < 22; k++) joints.push({ x: s * (P.flyX + 0.42), y: P.plinth + k * 1.85, z: -12.7, w: 0.1, h: 0.1, d: 9.4 })
      for (let k = 1; k < 7; k++) joints.push({ x: s * (P.flyX + 0.42), y: (P.flyTop + P.plinth) / 2, z: P.backZ + (9.4 * k) / 7, w: 0.1, h: P.flyTop - P.plinth, d: 0.1 })
    }
    // 舞台塔后立面
    for (let k = 1; k < 22; k++) joints.push({ x: 0, y: P.plinth + k * 1.85, z: P.backZ - 0.42, w: P.flyX * 2 + 0.8, h: 0.1, d: 0.1 })
    for (let k = 1; k < 17; k++) joints.push({ x: -P.flyX + (P.flyX * 2 * k) / 17, y: (P.flyTop + P.plinth) / 2, z: P.backZ - 0.42, w: 0.1, h: P.flyTop - P.plinth, d: 0.1 })
    root.add(batch(joints, matStoneDim))
  }

  // =====================================================================
  // 十、门厅二层夹层（+11.2m）与屋面天窗
  // =====================================================================
  {
    const mez2 = 11.2
    const m2: BoxSpec[] = [{ x: 0, y: mez2, z: 13.9, w: P.foyerX * 2, h: 0.4, d: 3.0 }]
    for (let i = 0; i < 14; i++) m2.push({ x: -15.5 + i * 2.4, y: mez2 - 0.35, z: 15.1, w: 0.3, h: 0.3, d: 0.3 })
    root.add(batch(m2, matStoneDim))
    root.add(railWithBalusters(P.foyerX * 2, mez2 + 0.2, 12.4, matBronze, 44))
    // 门厅屋面天窗（条窗 + 分格梃）
    const sky: BoxSpec[] = []
    for (let i = 0; i < 26; i++) sky.push({ x: -13.0 + i * 1.04, y: P.foyerCeil + 0.75, z: 11.0, w: 0.12, h: 0.4, d: 7.6 })
    sky.push({ x: 0, y: P.foyerCeil + 0.9, z: 14.6, w: 27.0, h: 0.16, d: 0.16 })
    sky.push({ x: 0, y: P.foyerCeil + 0.9, z: 7.4, w: 27.0, h: 0.16, d: 0.16 })
    root.add(batch(sky, matBronze))
  }

  // =====================================================================
  // 十一、舞台栅顶（gridiron）与侧翼内部楼板
  // =====================================================================
  {
    const grid: BoxSpec[] = []
    for (let i = 0; i < 14; i++) {
      const z = -16.6 + (7.4 * i) / 13
      grid.push({ x: 0, y: 30.5, z, w: 22.0, h: 0.2, d: 0.2 })
      grid.push({ x: 0, y: 33.0, z, w: 22.0, h: 0.18, d: 0.18 })
    }
    for (let i = 0; i < 12; i++) {
      const x = -11 + (22 * i) / 11
      grid.push({ x, y: 30.5, z: -12.7, w: 0.2, h: 0.2, d: 8.4 })
      grid.push({ x, y: 33.0, z: -12.7, w: 0.18, h: 0.18, d: 8.4 })
    }
    // 栅顶滑轮组
    for (let i = 0; i < 20; i++) grid.push({ x: -10 + i * 1.05, y: 30.0, z: -16.4, w: 0.34, h: 0.7, d: 0.34 })
    root.add(batch(grid, matDark))
    // 侧翼内部：三层楼板 + 走廊柱
    const inner: BoxSpec[] = []
    for (const s of [-1, 1]) {
      const wx = s * ((P.hallX + 0.6 + P.hx) / 2)
      for (const y of [4.1, 8.1]) inner.push({ x: wx, y, z: (wingZ0 + wingZ1) / 2, w: P.hx - P.hallX - 0.7, h: 0.35, d: wingZ1 - wingZ0 - 0.6 })
      for (let i = 0; i < 13; i++) inner.push({ x: s * (P.hx - 0.8), y: 6.1, z: wingZ0 + 1.0 + i * 1.9, w: 0.34, h: 8.0, d: 0.34 })
      for (let i = 0; i < 9; i++) inner.push({ x: wx, y: 6.1, z: wingZ0 + 1.2 + i * 2.8, w: P.hx - P.hallX - 1.4, h: 0.16, d: 0.16 })
    }
    root.add(batch(inner, matStoneDeep))
  }

  // =====================================================================
  // 十二、场地收边：路缘石 / 树池 / 前庭栏杆
  // =====================================================================
  {
    const kerbs: BoxSpec[] = []
    // 前庭与环带的交界路缘（每 0.6m 一段）
    for (let i = 0; i < 66; i++) kerbs.push({ x: -19.5 + i * 0.6, y: 0.2, z: 17.7, w: 0.5, h: 0.28, d: 0.24 })
    for (const s of [-1, 1]) {
      for (let i = 0; i < 56; i++) kerbs.push({ x: s * 17.4, y: 0.2, z: -17.2 + i * 0.6, w: 0.24, h: 0.28, d: 0.5 })
    }
    for (let i = 0; i < 66; i++) kerbs.push({ x: -19.5 + i * 0.6, y: 0.2, z: -17.5, w: 0.5, h: 0.28, d: 0.24 })
    root.add(batch(kerbs, matStoneDeep))
    // 树池（方池 + 压边）
    const pits: BoxSpec[] = []
    for (const [x, z] of treeSpots) {
      pits.push({ x, y: 0.16, z, w: 1.9, h: 0.32, d: 1.9 })
      for (const dx of [-0.85, 0.85]) pits.push({ x: x + dx, y: 0.3, z, w: 0.2, h: 0.1, d: 1.9 })
      for (const dz of [-0.85, 0.85]) pits.push({ x, y: 0.3, z: z + dz, w: 1.9, h: 0.1, d: 0.2 })
    }
    root.add(batch(pits, matStoneDim))
    // 前庭两侧石栏杆（界定入口广场，分列台阶左右）
    for (const s of [-1, 1]) {
      const r = railWithBalusters(9.0, 0.34, 19.7, matStoneDim, 18)
      r.position.x = s * 14.5
      root.add(r)
    }
  }

  // =====================================================================
  // 十三、剧场专项：乐池 / 台唇灯 / 面光桥 / 侧台 / 侧廊栏杆
  // =====================================================================
  {
    // 乐池（舞台前下沉池 + 池壁 + 后缘栏杆）
    const pit: BoxSpec[] = [
      { x: 0, y: P.plinth - 0.75, z: -5.8, w: 18.0, h: 1.5, d: 2.2 },
      { x: 0, y: P.plinth - 0.15, z: -4.75, w: 18.0, h: 0.5, d: 0.4 },
    ]
    for (let i = 0; i < 14; i++) pit.push({ x: -8 + i * 1.23, y: P.plinth - 1.5, z: -5.8, w: 0.16, h: 1.4, d: 2.0 })
    root.add(batch(pit, matStoneDeep))
    root.add(railWithBalusters(17.6, P.plinth - 0.4, -4.75, matBronze, 20))
    // 台唇灯（脚灯一排，暖光）
    const fl: BoxSpec[] = []
    for (let i = 0; i < 22; i++) fl.push({ x: -10.5 + i * 1.0, y: P.plinth + 0.5, z: -7.35, w: 0.6, h: 0.22, d: 0.3 })
    root.add(batch(fl, matGlow))
    // 面光桥（观众厅后上方两条，各 20 具面光灯）
    const foh: BoxSpec[] = []
    const fohLamps: Array<{ x: number; y: number; z: number; r: number; h: number; seg?: number }> = []
    for (const [y, z] of [[12.0, 5.4], [15.4, 3.0]] as const) {
      foh.push({ x: 0, y, z, w: P.hallX * 2 - 1.4, h: 0.5, d: 0.6 })
      for (let i = 0; i < 20; i++) {
        const x = -11 + i * 1.16
        foh.push({ x, y: y - 0.45, z, w: 0.24, h: 0.4, d: 0.24 })
        fohLamps.push({ x, y: y + 0.5, z: z - 0.2, r: 0.16, h: 0.42, seg: 8 })
      }
    }
    root.add(batch(foh, matDark))
    root.add(new THREE.Mesh(cylBatch(fohLamps, matGlow).geometry, matGlow))
    // 舞台侧台（东西各一，置景用）
    const wingside: BoxSpec[] = []
    for (const s of [-1, 1]) {
      wingside.push({ x: s * (P.hallX - 2.2), y: P.plinth + 0.3, z: -12.0, w: 6.0, h: 0.6, d: 9.0 })
      wingside.push({ x: s * (P.hallX + 0.7), y: P.plinth + 4.0, z: -12.0, w: 0.5, h: 8.0, d: 9.0 })
      for (let i = 0; i < 6; i++) wingside.push({ x: s * (P.hallX - 2.0), y: P.plinth + 2.6, z: -16.0 + i * 1.6, w: 5.6, h: 0.16, d: 0.16 })
    }
    root.add(batch(wingside, matDark))
    // 侧廊栏杆（池座两侧通道，沿 Z 向展开）
    for (const s of [-1, 1]) {
      const r = railWithBalusters(12.0, P.plinth + 0.95, 0.4, matBronze, 22)
      r.position.set(s * 12.2, 0, 0)
      r.rotation.y = Math.PI / 2
      root.add(r)
    }
  }

  // =====================================================================
  // 十四、场地家具补强：自行车架 / 垃圾桶 / 标识 / 旗杆
  // =====================================================================
  {
    const rack: BoxSpec[] = []
    for (let i = 0; i < 10; i++) {
      const x = -14.0 + i * 1.1
      rack.push({ x, y: 0.55, z: 16.9, w: 0.08, h: 0.7, d: 0.9 })
      rack.push({ x, y: 0.9, z: 16.9, w: 0.08, h: 0.08, d: 0.9 })
    }
    rack.push({ x: -8.5, y: 0.12, z: 16.9, w: 12.0, h: 0.24, d: 1.4 })
    site.add(batch(rack, matDark))
    const bins: BoxSpec[] = []
    for (const [x, z] of [[-11.5, 19.2], [11.5, 19.2], [-19.0, 0.5], [19.0, 0.5], [-4.0, -19.2], [4.0, -19.2]] as const) {
      bins.push({ x, y: 0.45, z, w: 0.5, h: 0.9, d: 0.5 })
      bins.push({ x, y: 0.95, z, w: 0.56, h: 0.1, d: 0.56 })
    }
    site.add(batch(bins, matDark))
    // 导视牌（前庭两侧）
    for (const s of [-1, 1]) {
      site.add(batch([
        { x: s * 8.0, y: 1.15, z: 19.2, w: 0.9, h: 0.7, d: 0.12 },
        { x: s * 8.0, y: 0.4, z: 19.2, w: 0.16, h: 0.8, d: 0.16 },
      ], matDark))
    }
    // 旗杆三根（前庭东侧）
    const poles: Array<{ x: number; y: number; z: number; r: number; h: number; seg?: number; rTop?: number }> = []
    for (let i = 0; i < 3; i++) poles.push({ x: 14.0 + i * 1.6, y: 0.2, z: 16.6, r: 0.09, h: 8.0, rTop: 0.05, seg: 8 })
    site.add(new THREE.Mesh(cylBatch(poles, matBronze).geometry, matBronze))
    // 补充行道树 / 路灯 / 长凳
    for (const [x, z] of [[-19.0, 12.0], [19.0, 12.0], [-19.0, -16.0], [19.0, -16.0]] as const) {
      site.add(ctx.blocks.tree({ x, z, scale: 0.85, seed: 2000 + Math.round(x * 7 + z * 3) }))
    }
    for (const [x, z] of [[-19.0, 15.0], [19.0, 15.0], [-12.0, -19.3], [12.0, -19.3]] as const) {
      site.add(ctx.blocks.streetLamp({ x, z, h: 4.2 }))
    }
    for (const [x, z, r] of [[-16.0, -19.0, 0], [16.0, -19.0, 0], [-19.0, 9.0, Math.PI / 2], [19.0, 9.0, -Math.PI / 2]] as const) {
      site.add(ctx.blocks.bench({ x, z, rotY: r }))
    }
  }

  return root
}

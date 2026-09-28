import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'

// 站前广场 · 二期（E7-04+05+06，宗地 60×20，局部原点 = 宗地中心，北 = +z 朝一期站房）
// 三段式：西「到发长廊」公交湾小桁架拱弧棚（脊 ~7.4m ≤8m 档位）；中「长镜水景」+
// 金色中央步道；东「到达罗盘」圆形地花（呼应 E5 圆环/原点母题）+ 树阵。全域花岗岩满铺。

const ARCH_N = 38            // 到发长廊拱道数
const ARCH_STEP = 1.1
const X0 = -27.25            // 首道拱 x（东端 -27.25 + 37×1.1 = 13.45）
const R_TOP = 4.2            // 拱半径（跨 8.4，z ±4.2 @ 中心 z=-3 → -7.2..1.2 退线内）
const R_BOT = 3.96
const SPOKE_N = 33
const FOOT_Y = 3.2           // 拱脚标高（脊 7.4 ≤ 8 档位）

const C = {
  steel: '#4A5568',
  steelLight: '#A8A5A0',
  stone: '#C4C1BA',      // 花岗岩铺装
  stoneDeep: '#A8A5A0',  // 分格缝
  gold: '#B0885E',       // 铜条/罗盘/柱头
  water: '#22436B',      // 镜面水体
  waterDeep: '#16324F',
  grass: '#8C9E8B',
  dark: '#3E3C3A',
  screen: '#1B2A41',
  lamp: '#F5F1E0',
}

export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()
  const mSteel = new THREE.MeshStandardMaterial({ color: C.steel, metalness: 0.55, roughness: 0.4 })
  const mSteelL = new THREE.MeshStandardMaterial({ color: C.steelLight, metalness: 0.4, roughness: 0.5 })
  const mStone = new THREE.MeshStandardMaterial({ color: C.stone, roughness: 0.9 })
  const mStoneDeep = new THREE.MeshStandardMaterial({ color: C.stoneDeep, roughness: 0.9 })
  const mGold = new THREE.MeshStandardMaterial({ color: C.gold, metalness: 0.7, roughness: 0.35 })
  const mWater = new THREE.MeshStandardMaterial({ color: C.water, metalness: 0.9, roughness: 0.08, emissive: C.waterDeep, emissiveIntensity: 0.5 })
  const mWaterDeep = new THREE.MeshStandardMaterial({ color: C.waterDeep, roughness: 0.4 })
  const mDark = new THREE.MeshStandardMaterial({ color: C.dark, metalness: 0.5, roughness: 0.5 })
  const mScreen = new THREE.MeshStandardMaterial({ color: C.screen, emissive: '#9EC5DD', emissiveIntensity: 0.55, roughness: 0.3 })
  const mLamp = new THREE.MeshStandardMaterial({ color: C.lamp, emissive: '#FFE9A8', emissiveIntensity: 0.9 })
  const mFountain = new THREE.MeshStandardMaterial({ color: '#CFE8F5', emissive: '#9EC5DD', emissiveIntensity: 0.6, roughness: 0.3 })

  const box = (w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0, site = false) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
    o.position.set(x, y, z)
    if (site) o.userData.site = true
    g.add(o)
    return o
  }
  const cyl = (rt: number, rb: number, h: number, seg: number, m: THREE.Material, x = 0, y = 0, z = 0, site = false) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m)
    o.position.set(x, y, z)
    if (site) o.userData.site = true
    g.add(o)
    return o
  }

  // ── 1 场地：花岗岩满铺 + 分格缝 ──
  box(60, 0.1, 20, mStone, 0, 0.05, 0, true)
  for (let i = 0; i <= 12; i++) box(0.06, 0.02, 20, mStoneDeep, -30 + i * 5, 0.11, 0, true)
  for (let i = 0; i <= 4; i++) box(60, 0.02, 0.06, mStoneDeep, 0, 0.11, -10 + i * 5, true)

  // 中央金色步道（南北贯通）+ 盲道
  for (let i = 0; i < 24; i++) box(3.4, 0.02, 0.14, mGold, 0, 0.12, -9.4 + i * 0.8, true)
  box(0.12, 0.02, 19, mGold, -1.9, 0.12, 0, true)
  box(0.12, 0.02, 19, mGold, 1.9, 0.12, 0, true)
  for (let i = 0; i < 38; i++) box(0.5, 0.015, 0.12, mStoneDeep, -1.9 + (i % 2) * 3.8, 0.13, -9.2 + i * 0.5, true)

  // ── 2 到达罗盘（东段圆形地花，地被层）──
  const rings: Array<[number, number, number]> = [[1.5, 0.05, 40], [2.5, 0.06, 48], [3.5, 0.07, 56], [4.5, 0.08, 64], [5.6, 0.09, 72]]
  cyl(0.9, 0.9, 0.07, 24, mGold, 17, 0.13, 0, true)
  cyl(1.15, 1.15, 0.04, 24, mStoneDeep, 17, 0.12, 0, true)
  for (const [r, t, seg] of rings) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, t, 6, seg), mGold)
    ring.rotation.x = Math.PI / 2
    ring.position.set(17, 0.14, 0)
    ring.userData.site = true
    g.add(ring)
  }
  for (let k = 0; k < 32; k++) {
    const a = (k * Math.PI) / 16
    const tick = box(0.08, 0.02, 0.5, mGold, 17 + 5.05 * Math.sin(a), 0.12, 5.05 * Math.cos(a), true)
    tick.rotation.y = a
  }
  for (const [dx, dz, len] of [[0, 6.3, 1.3], [0, -6.3, 1.3], [6.9, 0, 1.0], [-6.9, 0, 1.0]] as const)
    box(dx === 0 ? 0.16 : len, 0.02, dx === 0 ? len : 0.16, mGold, 17 + dx, 0.12, dz, true)

  // ── 3 长镜水景（北带 x -26..-6，z 3..8）──
  box(20.5, 0.4, 0.25, mStoneDeep, -16, 0.35, 8.1)            // 北壁
  box(20.5, 0.4, 0.25, mStoneDeep, -16, 0.35, 2.9)            // 南壁
  box(0.25, 0.4, 5, mStoneDeep, -26.1, 0.35, 5.5)             // 西壁
  box(0.25, 0.4, 5, mStoneDeep, -5.9, 0.35, 5.5)              // 东壁
  box(20, 0.08, 4.7, mWaterDeep, -16, 0.16, 5.5)              // 池底
  box(19.7, 0.05, 4.5, mWater, -16, 0.42, 5.5)                // 镜面水体
  for (let i = 0; i < 14; i++) {                              // 涌泉
    const fx = -24.4 + i * 1.4
    cyl(0.1, 0.14, 0.9, 8, mStoneDeep, fx, 0.75, 5.5)
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mFountain)
    ball.position.set(fx, 1.32, 5.5)
    g.add(ball)
    const jet = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.4, 8), mFountain)
    jet.rotation.x = Math.PI
    jet.position.set(fx, 1.62, 5.5)
    g.add(jet)
  }
  for (let i = 0; i < 30; i++) box(0.28, 0.06, 0.06, mLamp, -25.4 + i * 0.66, 0.5, 3.15) // 池南缘灯带
  for (let s = 0; s < 3; s++) {                               // 西端叠水台阶
    box(1.6 - s * 0.4, 0.12, 0.5, mStoneDeep, -26.8, 0.12 + s * 0.12, 5.5)
  }

  // ── 4 到发长廊（公交湾小桁架拱弧棚，西段）──
  const chordTopGeo = new THREE.TorusGeometry(R_TOP, 0.13, 12, 56, Math.PI)
  const chordBotGeo = new THREE.TorusGeometry(R_BOT, 0.09, 10, 52, Math.PI)
  const spokeGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.4, 8)
  const tieGeo = new THREE.CylinderGeometry(0.06, 0.06, R_BOT * 2, 8)
  const yAxis = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i < ARCH_N; i++) {
    const ax = X0 + i * ARCH_STEP
    const top = new THREE.Mesh(chordTopGeo, mSteel)
    top.rotation.y = Math.PI / 2
    top.position.set(ax, FOOT_Y, -3)
    g.add(top)
    const bot = new THREE.Mesh(chordBotGeo, mSteel)
    bot.rotation.y = Math.PI / 2
    bot.position.set(ax, FOOT_Y, -3)
    g.add(bot)
    const tie = new THREE.Mesh(tieGeo, mSteel)
    tie.rotation.x = Math.PI / 2
    tie.position.set(ax, FOOT_Y, -3)
    g.add(tie)
    for (let j = 0; j < SPOKE_N; j++) {
      const th = (Math.PI * (j + 0.5)) / SPOKE_N
      const dir = new THREE.Vector3(0, Math.sin(th), -Math.cos(th))
      const sp = new THREE.Mesh(spokeGeo, mSteelL)
      sp.quaternion.setFromUnitVectors(yAxis, dir)
      sp.position.set(ax, FOOT_Y + 4.08 * Math.sin(th), -3 + 4.08 * Math.cos(th))
      g.add(sp)
    }
    if (i % 3 === 1) for (const sz of [-3 + R_TOP - 0.25, -3 - R_TOP + 0.25]) {
      cyl(0.16, 0.2, FOOT_Y, 10, mStone, ax, FOOT_Y / 2, sz)
      box(0.5, 0.14, 0.5, mStoneDeep, ax, 0.07, sz)
    }
  }
  // 三层檩条（上下弦间、拱顶两披）
  for (const deg of [20, 50, 90, 130, 160]) {
    const th = (deg * Math.PI) / 180
    for (let i = 0; i < ARCH_N - 1; i++) {
      const px = X0 + ARCH_STEP / 2 + i * ARCH_STEP
      box(0.95, 0.07, 0.07, mSteelL, px, FOOT_Y + R_TOP * Math.sin(th), -3 + R_TOP * Math.cos(th))
      box(0.95, 0.07, 0.07, mSteelL, px, FOOT_Y + R_TOP * Math.sin(th) * 0.92, -3 + R_TOP * Math.cos(th) * 0.98)
    }
  }
  // 棚下：车次屏、站台标线、长凳、站牌、吊灯
  for (const sx of [-24, -17, -10, -3]) box(3.2, 0.9, 0.12, mScreen, sx, 2.9, -3)
  for (let i = 0; i < 9; i++) box(3.6, 0.015, 0.14, mStoneDeep, -26.4, 0.16, -6.9 + i * 1.15, true)
  for (const bx of [-25, -21, -13, -9]) {
    box(2.6, 0.08, 0.5, mStone, bx, 0.5, -6.6)
    box(2.6, 0.4, 0.08, mStone, bx, 0.72, -6.85)
    box(0.1, 0.45, 0.45, mDark, bx - 1.1, 0.27, -6.6)
    box(0.1, 0.45, 0.45, mDark, bx + 1.1, 0.27, -6.6)
  }
  for (const sx of [-25.5, -5.5]) {                            // 站牌
    cyl(0.05, 0.05, 2.6, 6, mDark, sx, 1.3, -3.9)
    box(1.5, 0.7, 0.06, mScreen, sx, 2.7, -3.9)
  }
  const rodGeo = new THREE.CylinderGeometry(0.025, 0.025, 3.2, 6)
  const shadeGeo = new THREE.SphereGeometry(0.34, 10, 7)
  for (let i = 3; i < ARCH_N; i += 5) {
    const lx = X0 + i * ARCH_STEP
    const rod = new THREE.Mesh(rodGeo, mDark)
    rod.position.set(lx, 5.7, -3)
    g.add(rod)
    const shade = new THREE.Mesh(shadeGeo, mLamp)
    shade.position.set(lx, 4.35, -3)
    g.add(shade)
  }

  // ── 5 树阵与树池（20 棵）──
  const treeSpots: Array<[number, number]> = []
  for (let i = 0; i < 8; i++) treeSpots.push([-26 + i * 3.2, -8.2])   // 南列沿棚外
  treeSpots.push([-4.5, 5.5], [-27.8, 5.5])                            // 水景两端
  treeSpots.push([24, 6.5], [24, -6.5], [15, 6.8], [15, -7])           // 罗盘环周
  treeSpots.push([27.2, 8.6], [27.2, -8.6])                            // 东端角
  treeSpots.push([8.5, 8.6], [11.5, 8.6], [19, 8.6], [23, 8.6])        // 北缘补列
  let seed = 61
  for (const [txs, tzs] of treeSpots) {
    box(1.7, 0.1, 1.7, mDark, txs, 0.13, tzs, true)
    g.add(ctx.blocks.tree({ x: txs, z: tzs, scale: 1.0, seed: (seed += 2) }))
  }

  // ── 6 灯柱、坐墙、椅、钵 ──
  for (const [px, pz] of [[-26, 9.2], [-14, 9.2], [14, -9.2], [26, -9.2], [-8, -9.2], [20, 9.2], [4, 9.2], [28, 0]] as const) {
    g.add(ctx.blocks.streetLamp({ x: px, z: pz, h: 5 }))
  }
  for (const [px, pz] of [[28.2, 8.7], [28.2, -8.7], [-28.2, 9.0], [-13, 9.0]] as const) { // 高杆灯
    cyl(0.09, 0.14, 7.5, 8, mDark, px, 3.75, pz, true)
    box(1.4, 0.08, 0.08, mDark, px, 7.5, pz, true)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 7), mLamp)
    head.position.set(px + 0.6, 7.35, pz)
    head.userData.site = true
    g.add(head)
  }
  for (let i = 0; i < 6; i++) box(2.4, 0.45, 0.5, mStoneDeep, 15 + i * 2.55, 0.32, -9.4, true) // 南缘矮坐墙
  for (const bx of [-19, -12, -6, 6, 12, 20]) {                // 罗盘/水景区长椅
    box(2.2, 0.08, 0.5, mStone, bx, 0.5, 1.9)
    box(0.1, 0.45, 0.45, mDark, bx - 0.9, 0.27, 1.9)
    box(0.1, 0.45, 0.45, mDark, bx + 0.9, 0.27, 1.9)
  }
  for (const [ux, uz] of [[-2.9, -9.3], [2.9, -9.3], [-2.9, 9.3], [2.9, 9.3], [10.5, -9.3], [23.5, -9.3], [-5.2, 1.6], [9.8, 1.6]] as const) {
    g.add(ctx.blocks.urn({ x: ux, z: uz, scale: 1.05 }))
  }
  return g
}

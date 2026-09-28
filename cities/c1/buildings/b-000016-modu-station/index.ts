import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'

// 模都站 · 一期站房主楼（E7-01+02+03，宗地 60×20，局部原点 = 宗地中心，北 = +z）
// 构图：大跨桁架拱光棚罩候车厅（跨 z 向、脊高 ~20m），东翼钟塔穿棚而出（~63m），
//       北向柱廊正接 E6 回声街区文化广场步道；宗地红线内满铺场地。

const ARCH_N = 32            // 桁架拱道数
const ARCH_STEP = 1.75       // 拱距
const X0 = -27.125           // 首道拱 x（居中对称，最边拱外缘 ~27.3 < 28 退线）
const R_TOP = 7.83           // 上弦管中心线半径（外缘 7.99 ≤ 8 退线）
const R_BOT = 7.55           // 下弦
const SPOKE_N = 33           // 每拱腹杆数
const FOOT_Y = 12            // 拱脚标高

const C = {
  steel: '#4A5568',      // 拱弦/主钢
  steelLight: '#A8A5A0', // 腹杆/檩/系杆
  stone: '#E8E6E1',      // 裙墙/塔身暖白
  stoneMid: '#D9D6CF',
  stoneDark: '#C4C1BA',  // 铺装
  stoneDeep: '#A8A5A0',
  glass: '#9EC5DD',
  grass: '#8C9E8B',
  dark: '#3E3C3A',
  gold: '#B0885E',
  screen: '#1B2A41',
  clock: '#F5EFD8',
}

export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()
  const mSteel = new THREE.MeshStandardMaterial({ color: C.steel, metalness: 0.55, roughness: 0.4 })
  const mSteelL = new THREE.MeshStandardMaterial({ color: C.steelLight, metalness: 0.4, roughness: 0.5 })
  const mStone = new THREE.MeshStandardMaterial({ color: C.stone, roughness: 0.85 })
  const mStoneM = new THREE.MeshStandardMaterial({ color: C.stoneMid, roughness: 0.8 })
  const mStoneD = new THREE.MeshStandardMaterial({ color: C.stoneDark, roughness: 0.9 })
  const mStoneDeep = new THREE.MeshStandardMaterial({ color: C.stoneDeep, roughness: 0.9 })
  const mGlass = new THREE.MeshStandardMaterial({ color: C.glass, metalness: 0.5, roughness: 0.15, emissive: '#C4DFF0', emissiveIntensity: 0.35 })
  const mGrass = new THREE.MeshStandardMaterial({ color: C.grass, roughness: 0.95 })
  const mDark = new THREE.MeshStandardMaterial({ color: C.dark, metalness: 0.5, roughness: 0.5 })
  const mGold = new THREE.MeshStandardMaterial({ color: C.gold, metalness: 0.7, roughness: 0.35 })
  const mClock = new THREE.MeshStandardMaterial({ color: C.clock, emissive: C.clock, emissiveIntensity: 0.85, roughness: 0.4 })
  const mScreen = new THREE.MeshStandardMaterial({ color: C.screen, emissive: C.glass, emissiveIntensity: 0.55, roughness: 0.3 })
  const mLamp = new THREE.MeshStandardMaterial({ color: '#F5F1E0', emissive: '#FFE9A8', emissiveIntensity: 0.9 })

  const box = (w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0, site = false) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
    o.position.set(x, y, z)
    if (site) o.userData.site = true // 地被/铺装/景观小件：R13 退线豁免
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

  // ── 1 场地（宗地红线内满铺）──
  box(60, 0.1, 20, mGrass, 0, 0.05, 0, true)                  // 草皮满铺
  box(60, 0.08, 4, mStoneD, 0, 0.14, 8, true)                 // 北广场花岗岩
  for (let i = 0; i <= 12; i++) box(0.06, 0.02, 4, mStoneDeep, -30 + i * 5, 0.19, 8, true)
  box(60, 0.02, 0.06, mStoneDeep, 0, 0.19, 8, true)
  box(60, 0.08, 1.8, mStoneD, 0, 0.14, -8.9, true)            // 南步道
  for (let i = 0; i <= 12; i++) box(0.06, 0.02, 1.8, mStoneDeep, -30 + i * 5, 0.19, -8.9, true)
  box(56, 0.1, 0.7, mStoneM, 0, 0.15, 8.55, true)             // 北踏步两级
  box(56, 0.2, 0.7, mStoneM, 0, 0.2, 8.15, true)
  for (const sx of [-25, -15, -5, 5, 15, 25]) {               // 南带树池 + 行道树
    box(1.7, 0.1, 1.7, mDark, sx, 0.35, -6.8, true)
    g.add(ctx.blocks.tree({ x: sx, z: -6.8, scale: 1.05, seed: 7 + sx }))
  }
  box(1.7, 0.1, 1.7, mDark, 27, 0.35, 6.9, true)              // 东北角庭荫树
  g.add(ctx.blocks.tree({ x: 27, z: 6.9, scale: 1.15, seed: 41 }))
  box(1.7, 0.1, 1.7, mDark, -27, 0.35, 6.9, true)
  g.add(ctx.blocks.tree({ x: -27, z: 6.9, scale: 1.1, seed: 43 }))
  for (const lx of [-25, -15, -5, 5, 15, 25]) g.add(ctx.blocks.streetLamp({ x: lx, z: 9.1, h: 5 }))
  for (const bx of [-17, -10, 10, 17]) g.add(ctx.blocks.bench({ x: bx, z: 9, rotY: Math.PI }))
  for (const ux of [-24, -16, -8, 8, 16, 24]) g.add(ctx.blocks.urn({ x: ux, z: 6.9, scale: 1.1 }))
  for (let i = 0; i < 3; i++) {                               // 西翼旗杆组
    const fx = -26 + i * 2.5
    cyl(0.05, 0.07, 11, 8, mSteelL, fx, 5.5, 9, true)
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), mGold)
    ball.position.set(fx, 11.1, 9)
    ball.userData.site = true
    g.add(ball)
    box(1.6, 1.0, 0.05, mStoneM, fx + 0.85, 10.2, 9, true)
  }

  // ── 2 基座与裙墙 ──
  box(56, 0.3, 16, mStoneM, 0, 0.15, 0)                       // 站房基座（本体 56×16）
  box(56, 3.2, 0.4, mStone, 0, 2.0, -7.7)                     // 南裙墙
  box(56, 0.28, 0.52, mStoneD, 0, 3.75, -7.7)                 // 裙墙顶线脚
  box(56, 0.16, 0.56, mDark, 0, 0.42, -7.7)                   // 勒脚
  box(0.4, 11.7, 15.7, mStone, -27.8, 6.15, 0)                // 西山墙实体下段
  box(0.4, 11.7, 15.7, mStone, 27.8, 6.15, 0)                 // 东山墙实体下段
  for (const sx of [-1, 1]) box(0.36, 0.3, 15.9, mStoneD, sx * 27.8, 12.05, 0) // 山墙腰线

  // ── 3 南立面密梃玻璃幕墙（28 列 × 6 行，全幅 55.8 收进退线）──
  const GW = 55.8, CW = GW / 28
  for (let r5 = 0; r5 < 6; r5++)
    for (let cCol = 0; cCol < 28; cCol++)
      box(CW - 0.14, 1.52, 0.06, mGlass, -GW / 2 + (cCol + 0.5) * CW, 4.55 + r5 * 1.6, -7.7)
  for (let i = 0; i <= 28; i++) box(0.1, 9.6, 0.16, mSteel, -GW / 2 + i * CW, 7.75, -7.7)
  for (let r = 0; r <= 6; r++) box(GW, 0.1, 0.16, mSteel, 0, 3.75 + r * 1.6, -7.7)

  // ── 4 北向柱廊（正接 E6 文化广场步道）──
  for (let i = 0; i < 14; i++) {
    const px = -26 + i * 4
    cyl(0.3, 0.36, 9.4, 12, mStone, px, 5.0, 7.45)
    box(0.9, 0.5, 0.9, mStoneD, px, 0.55, 7.45)               // 柱础
    box(0.78, 0.35, 0.78, mGold, px, 9.85, 7.45)              // 柱头
  }
  box(56, 0.9, 0.9, mStone, 0, 10.9, 7.42)                    // 檐梁
  for (let i = 0; i < 64; i++) box(0.72, 0.42, 0.45, mStoneM, -27.555 + Math.floor(i / 2) * 1.75 + (i % 2) * 0.86, 11.56, 7.42) // 檐下齿块
  box(56, 0.28, 0.95, mStoneD, 0, 11.95, 7.4)                 // 檐口板
  g.add(ctx.blocks.glassCurtain({ w: 55.8, h: 8.0, cols: 20, rows: 4, y: 3.75, z: 7.05 })) // 柱廊后幕墙

  // ── 5 端部弧形玻璃山墙 + 放射梃 + 端环梁 ──
  const gableShape = new THREE.Shape()
  gableShape.moveTo(7.6, FOOT_Y)
  gableShape.absarc(0, FOOT_Y, 7.6, 0, Math.PI, false)
  gableShape.closePath()
  const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: 0.12, bevelEnabled: false, curveSegments: 24, steps: 1 })
  const spokeGeo = new THREE.BoxGeometry(0.07, 7.0, 0.09)
  const ringGeo = new THREE.TorusGeometry(R_TOP, 0.11, 6, 36, Math.PI)
  for (const sx of [-1, 1]) {
    const panel = new THREE.Mesh(gableGeo, mGlass)
    panel.rotation.y = Math.PI / 2
    panel.position.x = sx * 27.8 - sx * 0.06
    g.add(panel)
    for (let k = 0; k < 16; k++) {
      const th = (Math.PI * k) / 15
      const sp = new THREE.Mesh(spokeGeo, mSteelL)
      sp.rotation.x = Math.PI / 2 - th
      sp.position.set(sx * 27.86, FOOT_Y + 4.0 * Math.sin(th), 4.0 * Math.cos(th))
      g.add(sp)
    }
    const ring = new THREE.Mesh(ringGeo, mSteel)
    ring.rotation.y = Math.PI / 2
    ring.position.set(sx * 27.6, FOOT_Y, 0)
    g.add(ring)
  }

  // ── 6 大跨桁架拱光棚（32 道，跨 z 向）──
  const chordTopGeo = new THREE.TorusGeometry(R_TOP, 0.16, 14, 56, Math.PI)
  const chordBotGeo = new THREE.TorusGeometry(R_BOT, 0.12, 12, 56, Math.PI)
  const spokeArcGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8)
  const tieGeo = new THREE.CylinderGeometry(0.08, 0.08, R_BOT * 2, 8)
  const yAxis = new THREE.Vector3(0, 1, 0)
  const xAxis = new THREE.Vector3(1, 0, 0)
  for (let i = 0; i < ARCH_N; i++) {
    const ax = X0 + i * ARCH_STEP
    const top = new THREE.Mesh(chordTopGeo, mSteel)
    top.rotation.y = Math.PI / 2
    top.position.set(ax, FOOT_Y, 0)
    g.add(top)
    const bot = new THREE.Mesh(chordBotGeo, mSteel)
    bot.rotation.y = Math.PI / 2
    bot.position.set(ax, FOOT_Y, 0)
    g.add(bot)
    const tie = new THREE.Mesh(tieGeo, mSteel)
    tie.rotation.x = Math.PI / 2
    tie.position.set(ax, FOOT_Y, 0)
    g.add(tie)
    for (let j = 0; j < SPOKE_N; j++) {
      const th = (Math.PI * (j + 0.5)) / SPOKE_N
      const dir = new THREE.Vector3(0, Math.sin(th), -Math.cos(th))
      const sp = new THREE.Mesh(spokeArcGeo, mSteelL)
      sp.quaternion.setFromUnitVectors(yAxis, dir)
      sp.position.set(ax, FOOT_Y + 7.7 * Math.sin(th), 7.7 * Math.cos(th))
      g.add(sp)
    }
    void xAxis
  }
  // 纵向檩条 7 道（贴上弦中心线）+ 拱间水平系杆 + 脊部天窗带
  for (const deg of [15, 45, 75, 90, 105, 135, 165]) {
    const th = (deg * Math.PI) / 180
    for (let i = 0; i < ARCH_N - 1; i++) {
      const px = X0 + ARCH_STEP / 2 + i * ARCH_STEP
      box(1.55, 0.09, 0.09, mSteelL, px, FOOT_Y + R_TOP * Math.sin(th), R_TOP * Math.cos(th))
    }
  }
  for (const sz of [-6.35, 6.35])
    for (let i = 0; i < ARCH_N - 1; i++)
      box(1.55, 0.08, 0.08, mSteelL, X0 + ARCH_STEP / 2 + i * ARCH_STEP, 13.5, sz)
  for (let i = 0; i < ARCH_N - 1; i++) {
    box(1.55, 0.4, 1.3, mGlass, X0 + ARCH_STEP / 2 + i * ARCH_STEP, 19.55, -0.9)
    box(1.55, 0.4, 1.3, mGlass, X0 + ARCH_STEP / 2 + i * ARCH_STEP, 19.55, 0.9)
    box(1.55, 0.12, 0.12, mGold, X0 + ARCH_STEP / 2 + i * ARCH_STEP, 20.12, 0) // 脊饰
  }
  // 光棚下吊灯（每 2 拱 2 盏，夜景主角）+ 脊部饰条
  const rodGeo = new THREE.CylinderGeometry(0.03, 0.03, 3.5, 6)
  const shadeGeo = new THREE.SphereGeometry(0.45, 12, 8)
  const discGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.06, 12)
  for (let i = 2; i < ARCH_N; i += 2)
    for (const lz of [-3, 3]) {
      const lx = X0 + i * ARCH_STEP
      const rod = new THREE.Mesh(rodGeo, mDark)
      rod.position.set(lx, 17.1, lz)
      g.add(rod)
      const shade = new THREE.Mesh(shadeGeo, mLamp)
      shade.position.set(lx, 15.3, lz)
      g.add(shade)
      const disc = new THREE.Mesh(discGeo, mLamp)
      disc.position.set(lx, 15.05, lz)
      g.add(disc)
    }

  // ── 7 钟塔（东翼 x=24，穿棚而出，总高 ~63m）──
  const tx = 24
  box(8, 1.2, 8, mStoneD, tx, 0.6, 0)                         // 塔基
  box(7, 17, 7, mStone, tx, 9.7, 0)                           // 段一
  box(7.6, 0.4, 7.6, mStoneD, tx, 18.4, 0)                    // 腰线
  box(6, 16, 6, mStone, tx, 26.6, 0)                          // 段二
  box(6.6, 0.4, 6.6, mStoneD, tx, 34.8, 0)                    // 腰线
  box(5, 18, 5, mStone, tx, 44.0, 0)                          // 段三
  const tiers = [
    { w: 7, cy: 9.7, h: 17 }, { w: 6, cy: 26.6, h: 16 }, { w: 5, cy: 44.0, h: 18 },
  ] as const
  for (const t of tiers) {
    const hw = t.w / 2 - 0.35
    for (const ox of [-hw, hw]) for (const oz of [-hw, hw])   // 四角壁柱
      box(0.35, t.h, 0.35, mStoneM, tx + ox, t.cy, oz)
    for (const [fx, fz] of [[0, t.w / 2 + 0.05], [0, -t.w / 2 - 0.05], [t.w / 2 + 0.05, 0], [-t.w / 2 - 0.05, 0]] as const)
      box(fx === 0 ? 0.6 : 0.1, t.h * 0.7, fx === 0 ? 0.1 : 0.6, mGlass, tx + fx, t.cy, fz) // 竖向灯带
  }
  // 钟箱四面（盘 + 刻度 + 指针，自发光）
  const clockBoxGeo = new THREE.BoxGeometry(5.0, 3.4, 0.7)
  const dialGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.18, 28)
  const tickGeo = new THREE.BoxGeometry(0.08, 0.34, 0.05)
  const handH = new THREE.BoxGeometry(0.1, 0.75, 0.06)
  const handM = new THREE.BoxGeometry(0.07, 1.05, 0.06)
  const capGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.12, 8)
  for (let f = 0; f < 4; f++) {
    const grp = new THREE.Group()
    grp.position.set(tx, 0, 0)
    grp.rotation.y = (f * Math.PI) / 2
    const b = new THREE.Mesh(clockBoxGeo, mStone)
    b.position.set(0, 54, 2.85)
    grp.add(b)
    const dial = new THREE.Mesh(dialGeo, mClock)
    dial.rotation.x = Math.PI / 2
    dial.position.set(0, 54, 3.28)
    grp.add(dial)
    for (let t = 0; t < 12; t++) {
      const tk = new THREE.Mesh(tickGeo, mDark)
      const a = (t * Math.PI) / 6
      tk.position.set(1.12 * Math.sin(a), 54 + 1.12 * Math.cos(a), 3.4)
      tk.rotation.z = -a
      grp.add(tk)
    }
    const hh = new THREE.Mesh(handH, mDark)
    hh.position.set(0.18, 54.2, 3.42)
    hh.rotation.z = -0.9
    grp.add(hh)
    const mh = new THREE.Mesh(handM, mDark)
    mh.position.set(-0.3, 53.75, 3.42)
    mh.rotation.z = 2.2
    grp.add(mh)
    const cap = new THREE.Mesh(capGeo, mGold)
    cap.rotation.x = Math.PI / 2
    cap.position.set(0, 54, 3.44)
    grp.add(cap)
    g.add(grp)
  }
  box(5.9, 0.5, 5.9, mStoneD, tx, 56.2, 0)                    // 檐环
  box(6.4, 0.3, 6.4, mGold, tx, 56.6, 0)                      // 檐口金线
  const cone = new THREE.Mesh(new THREE.ConeGeometry(2.6, 4.6, 12), mGold)
  cone.position.set(tx, 59.05, 0)
  g.add(cone)
  cyl(0.05, 0.05, 1.9, 6, mDark, tx, 62.3, 0)                 // 避雷针
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), mGold)
  tip.position.set(tx, 63.35, 0)
  g.add(tip)

  // ── 8 室内候车厅 ──
  cyl(0.42, 0.5, 11.7, 12, mStone, -10, 6.15, 0)              // 中柱
  cyl(0.42, 0.5, 11.7, 12, mStone, 10, 6.15, 0)
  for (const rz of [-3.2, 3.2])
    for (const rx of [-16, -8, 0, 8, 16]) {                   // 候车椅 10 组
      box(2.4, 0.09, 0.6, mStoneM, rx, 0.92, rz)
      box(2.4, 0.5, 0.08, mStoneM, rx, 1.2, rz + (rz > 0 ? 0.3 : -0.3))
      box(0.08, 0.5, 0.5, mDark, rx - 1.0, 0.65, rz)
      box(0.08, 0.5, 0.5, mDark, rx + 1.0, 0.65, rz)
    }
  for (const gx of [-5, 0, 5]) box(1.8, 1.05, 0.7, mDark, gx, 0.83, 0) // 检票岛
  // 中央吊板双面钟（吊杆接棚腹 z=0 处 ~19.8）
  cyl(0.03, 0.03, 2.2, 6, mDark, -0.8, 18.7, 0)
  cyl(0.03, 0.03, 2.2, 6, mDark, 0.8, 18.7, 0)
  box(2.6, 3.0, 0.18, mStone, 0, 16.2, 0)
  const dialGeo2 = new THREE.CylinderGeometry(1.05, 1.05, 0.1, 24)
  const tick2 = new THREE.BoxGeometry(0.06, 0.24, 0.04)
  for (const dz of [0.1, -0.1]) {
    const d2 = new THREE.Mesh(dialGeo2, mClock)
    d2.rotation.x = dz > 0 ? 0 : Math.PI
    d2.position.set(0, 16.4, dz)
    g.add(d2)
    for (let t = 0; t < 12; t++) {
      const tk = new THREE.Mesh(tick2, mDark)
      const a = (t * Math.PI) / 6
      tk.position.set(0.78 * Math.sin(a), 16.4 + 0.78 * Math.cos(a), dz + (dz > 0 ? 0.06 : -0.06))
      tk.rotation.z = -a
      g.add(tk)
    }
  }
  const hh2 = box(0.07, 0.55, 0.04, mDark, 0.12, 16.55, 0.16)
  hh2.rotation.z = -0.9
  const mh2 = box(0.05, 0.75, 0.04, mDark, -0.22, 16.22, 0.16)
  mh2.rotation.z = 2.2

  // ── 9 站名灯箱与车次屏（夜光源）──
  box(9.6, 1.5, 0.14, mDark, 0, 10.15, 7.52)                  // 站名底板
  box(8.6, 0.82, 0.16, mClock, 0, 10.15, 7.56)                // 发光字带
  box(12, 1.9, 0.16, mScreen, 0, 6.5, 6.95)                   // 北车次屏
  box(12, 1.9, 0.16, mScreen, 0, 6.5, -7.55)                  // 南车次屏
  return g
}

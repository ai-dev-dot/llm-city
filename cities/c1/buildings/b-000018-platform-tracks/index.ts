import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'

// 站台轨道带 · 三期（E7-07+08+09，宗地 60×20，局部原点 = 宗地中心，北 = +z 朝二期广场）
// 双线轨道（中心 z ±2）向东西延展；侧式双站台（台面 1.1m）+ 26 道小桁架拱雨棚 ×2
// （脊 7.2 ≤12m 档位，光棚家族第三档）；跨站天桥（x 8..10.8，顶 8.4）越轨贯通南北；
// 4 节动车组停靠北轨；南缘草皮留白为车辆段延伸余地（总图既定）。

const ARCH_N = 26            // 每座雨棚拱道数
const ARCH_STEP = 1.85
const AX0 = -23.125          // 首拱 x（居中对称 ±23.125）
const R_TOP = 2.5            // 拱半径（跨 5m，z 台中心 ±7 → 4.5..9.5）
const R_BOT = 2.34
const SPOKE_N = 31
const SPRING = 4.6           // 拱脚标高（脊 7.2，柱顶相接）
const GAP_LO = 6.475         // 天桥穿棚留洞：缺拱 i17/i18（x 6.475..12.025）
const GAP_HI = 12.025

const C = {
  steel: '#4A5568',
  steelLight: '#A8A5A0',
  stone: '#C4C1BA',
  stoneDeep: '#A8A5A0',
  gold: '#B0885E',
  dark: '#3E3C3A',
  ballast: '#5B5956',
  rail: '#7C7A76',
  grass: '#8C9E8B',
  line: '#C9A227',
  body: '#E8E6E1',
  blue: '#9EC5DD',
  glass: '#9EC5DD',
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
  const mDark = new THREE.MeshStandardMaterial({ color: C.dark, metalness: 0.5, roughness: 0.5 })
  const mBallast = new THREE.MeshStandardMaterial({ color: C.ballast, roughness: 0.95 })
  const mRail = new THREE.MeshStandardMaterial({ color: C.rail, metalness: 0.85, roughness: 0.3 })
  const mGrass = new THREE.MeshStandardMaterial({ color: C.grass, roughness: 0.95 })
  const mLine = new THREE.MeshStandardMaterial({ color: C.line, roughness: 0.6 })
  const mBody = new THREE.MeshStandardMaterial({ color: C.body, metalness: 0.25, roughness: 0.35 })
  const mBlue = new THREE.MeshStandardMaterial({ color: C.blue, roughness: 0.4 })
  const mGlass = new THREE.MeshStandardMaterial({ color: C.glass, metalness: 0.5, roughness: 0.15, emissive: '#C4DFF0', emissiveIntensity: 0.3 })
  const mScreen = new THREE.MeshStandardMaterial({ color: C.screen, emissive: C.glass, emissiveIntensity: 0.55, roughness: 0.3 })
  const mLamp = new THREE.MeshStandardMaterial({ color: C.lamp, emissive: '#FFE9A8', emissiveIntensity: 0.9 })
  const mHead = new THREE.MeshStandardMaterial({ color: '#F5F1E0', emissive: '#FFF3C4', emissiveIntensity: 1.2 })

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

  // ── 1 场地：草皮满铺 + 两端花岗岩 + 缝阵 ──
  box(60, 0.1, 20, mGrass, 0, 0.05, 0, true)
  box(60, 0.09, 1.6, mStone, 0, 0.12, 9.2, true)              // 北缘花岗岩（接广场）
  box(60, 0.09, 1.4, mStone, 0, 0.12, -9.3, true)             // 南缘花岗岩
  for (let i = 0; i <= 12; i++) box(0.06, 0.02, 1.6, mStoneDeep, -30 + i * 5, 0.17, 9.2, true)
  for (let i = 0; i <= 12; i++) box(0.06, 0.02, 1.4, mStoneDeep, -30 + i * 5, 0.17, -9.3, true)

  // ── 2 轨道系统（双线 z ±2，道砟一体）──
  box(57.6, 0.22, 6.8, mBallast, 0, 0.11, 0, true)            // 道砟床（顶 0.22 ≤0.6 地被）
  const sleeperGeo = new THREE.BoxGeometry(0.24, 0.08, 2.8)
  for (let i = 0; i < 102; i++) {
    const sx = -28.05 + i * 0.55
    for (const tz of [2.0, -2.0]) {
      const s = new THREE.Mesh(sleeperGeo, mDark)
      s.position.set(sx, 0.26, tz)
      s.userData.site = true
      g.add(s)
    }
  }
  for (const tz of [2.0, -2.0]) for (const rz of [-0.7175, 0.7175]) {
    box(56.4, 0.1, 0.07, mRail, 0, 0.35, tz + rz, true)       // 轨腰（顶 ≤0.6 地被豁免）
    box(56.4, 0.03, 0.14, mRail, 0, 0.42, tz + rz, true)      // 亮面轨头
  }
  for (const mz of [4.45, -4.45])                              // 接触网支柱 + 悬臂
    for (let i = 0; i < 5; i++) {
      const mx = -24 + i * 12
      cyl(0.07, 0.1, 5.6, 8, mSteelL, mx, 2.8, mz)
      const tz = mz > 0 ? 2.0 : -2.0
      box(2.5, 0.08, 0.08, mSteelL, mx, 4.95, (mz + tz) / 2)
      box(0.06, 0.5, 0.06, mSteelL, mx, 5.2, tz)
    }
  for (const tz of [2.0, -2.0]) {                              // 承力索 + 接触线
    box(55.8, 0.035, 0.035, mDark, 0, 5.45, tz)
    box(55.8, 0.035, 0.035, mDark, 0, 4.95, tz)
  }

  // ── 3 侧式双站台 + 拱形雨棚 ──
  const chordTopGeo = new THREE.TorusGeometry(R_TOP, 0.1, 14, 40, Math.PI)
  const chordBotGeo = new THREE.TorusGeometry(R_BOT, 0.075, 12, 40, Math.PI)
  const spokeGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.34, 8)
  const yAxis = new THREE.Vector3(0, 1, 0)
  for (const pz of [7, -7]) {
    const dir = pz > 0 ? 1 : -1
    box(56, 1.1, 4.6, mStone, 0, 0.55, pz, true)              // 站台（构筑物/地被，site）
    box(56, 0.02, 0.15, mLine, 0, 1.11, pz - dir * 2.15)      // 黄色安全线（贴轨侧）
    box(56, 0.015, 0.3, mStoneDeep, 0, 1.11, pz - dir * 1.8)  // 盲道条
    for (let i = 0; i < ARCH_N; i++) {
      const ax = AX0 + i * ARCH_STEP
      if (ax > GAP_LO && ax < GAP_HI) continue                 // 天桥穿棚留洞
      const top = new THREE.Mesh(chordTopGeo, mSteel)
      top.rotation.y = Math.PI / 2
      top.position.set(ax, SPRING, pz)
      top.userData.site = true
      g.add(top)
      const bot = new THREE.Mesh(chordBotGeo, mSteel)
      bot.rotation.y = Math.PI / 2
      bot.position.set(ax, SPRING, pz)
      bot.userData.site = true
      g.add(bot)
      for (let j = 0; j < SPOKE_N; j++) {
        const th = (Math.PI * (j + 0.5)) / SPOKE_N
        const dd = new THREE.Vector3(0, Math.sin(th), -Math.cos(th))
        const sp = new THREE.Mesh(spokeGeo, mSteelL)
        sp.quaternion.setFromUnitVectors(yAxis, dd)
        sp.position.set(ax, SPRING + (R_TOP - 0.13) * Math.sin(th), pz + (R_TOP - 0.13) * Math.cos(th) * dir)
        sp.userData.site = true
        g.add(sp)
      }
    }
    for (const deg of [25, 55, 90, 125, 155]) {                // 双层檩（缺洞段断开）
      const th = (deg * Math.PI) / 180
      for (let i = 0; i < ARCH_N - 1; i++) {
        const px = AX0 + ARCH_STEP / 2 + i * ARCH_STEP
        if (px > GAP_LO && px < GAP_HI) continue
        box(1.7, 0.06, 0.06, mSteelL, px, SPRING + R_TOP * Math.sin(th), pz + R_TOP * Math.cos(th) * dir, true)
        box(1.7, 0.05, 0.05, mSteelL, px, SPRING + R_TOP * Math.sin(th) * 0.9, pz + R_TOP * Math.cos(th) * 0.97 * dir, true)
      }
    }
    for (let i = 0; i < ARCH_N; i++) {                         // 棚柱（站台面上）
      const ax = AX0 + i * ARCH_STEP
      if (ax > GAP_LO && ax < GAP_HI) continue
      cyl(0.11, 0.14, SPRING - 1.1, 8, mStone, ax, 1.1 + (SPRING - 1.1) / 2, pz - dir * 2.15, true)
      cyl(0.11, 0.14, SPRING - 1.1, 8, mStone, ax, 1.1 + (SPRING - 1.1) / 2, pz + dir * 2.15, true)
    }
    for (let i = 0; i < ARCH_N; i += 4) {                      // 棚下吊灯
      const ax = AX0 + i * ARCH_STEP
      if (ax > GAP_LO && ax < GAP_HI) continue
      cyl(0.025, 0.025, 2.4, 6, mDark, ax, 5.55, pz)
      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 7), mLamp)
      sh.position.set(ax, 4.35, pz)
      g.add(sh)
    }
    for (const bx of [-19, -13, -1, 13.5, 17]) {               // 站台长椅（面轨）
      box(2.2, 0.08, 0.45, mStone, bx, 1.6, pz - dir * 0.95)
      box(2.2, 0.4, 0.07, mStone, bx, 1.85, pz - dir * 0.7)
      box(0.1, 0.35, 0.4, mDark, bx - 0.9, 1.28, pz - dir * 0.95)
      box(0.1, 0.35, 0.4, mDark, bx + 0.9, 1.28, pz - dir * 0.95)
    }
    for (const sx of [-16, 15.5]) {                            // 站牌（金柱 + 屏）
      cyl(0.05, 0.05, 2.7, 6, mGold, sx, 2.45, pz + dir * 0.85)
      box(1.3, 0.75, 0.06, mScreen, sx, 3.6, pz + dir * 0.85)
    }
    box(3.2, 0.85, 0.12, mScreen, -7, 4.05, pz - dir * 1.9)    // 车次屏（吊棚）
    box(3.2, 0.85, 0.12, mScreen, 14, 4.05, pz - dir * 1.9)
  }

  // ── 4 静态列车编组（4 节，北轨 z 2.0，双端驾驶室）──
  const carLen = 12.2, pitch = 12.7
  const roofGeo = new THREE.CylinderGeometry(1.5, 1.5, carLen, 12, 1, false, 0, Math.PI)
  roofGeo.rotateZ(Math.PI / 2)                                 // 轴向 x，拱顶截面 (y,z)
  roofGeo.scale(1, 0.4, 1)                                     // 压扁：拱顶升起 0.6
  for (let ci = 0; ci < 4; ci++) {
    const cx = -19.05 + ci * pitch
    box(carLen, 0.4, 2.6, mDark, cx, 0.55, 2.0)                // 底架
    box(carLen, 2.55, 3.0, mBody, cx, 2.025, 2.0)              // 车身
    const roof = new THREE.Mesh(roofGeo, mBody)
    roof.position.set(cx, 3.3, 2.0)
    g.add(roof)
    box(carLen + 0.02, 0.4, 3.04, mBlue, cx, 1.6, 2.0)         // 蓝色带
    for (const wz of [0.52, 3.48]) box(carLen - 2.6, 0.7, 0.05, mGlass, cx, 2.35, wz) // 通长窗带
    for (const wz of [0.5, 3.5])
      for (const mx of [-4.0, -1.35, 1.35, 4.0]) box(0.08, 0.7, 0.06, mDark, cx + mx, 2.35, wz)
    for (const dx of [-4.6, 4.6]) for (const wz of [0.51, 3.49]) { // 双车门/侧
      box(1.25, 1.95, 0.07, mDark, cx + dx, 1.83, wz)
      box(0.04, 1.95, 0.09, mBody, cx + dx, 1.83, wz)
    }
    for (const bx of [-4.2, 4.2]) {                            // 转向架 + 轮
      box(2.4, 0.45, 2.1, mDark, cx + bx, 0.5, 2.0)
      for (const wx of [-0.8, 0.8]) for (const wz of [-0.85, 0.85]) {
        const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.18, 10), mDark)
        wh.rotation.z = Math.PI / 2
        wh.position.set(cx + bx + wx, 0.6, 2.0 + wz)
        g.add(wh)
      }
    }
    if (ci < 3) box(0.5, 2.4, 2.9, mDark, cx + pitch / 2, 2.1, 2.0) // 风挡连接
    if (ci === 0 || ci === 3) {                                // 端部驾驶室鼻（平前端面）
      const nose = ci === 0 ? -1 : 1
      const shape = new THREE.Shape()
      shape.moveTo(-1.5, 0.75)
      shape.lineTo(1.5, 0.75)
      shape.lineTo(1.5, 3.05)
      shape.lineTo(0.55, 3.62)
      shape.lineTo(-1.5, 3.42)
      shape.closePath()
      const noseGeo = new THREE.ExtrudeGeometry(shape, { depth: 2.3, bevelEnabled: false })
      const nm = new THREE.Mesh(noseGeo, mBody)
      nm.rotation.y = nose > 0 ? -Math.PI / 2 : Math.PI / 2
      nm.position.set(cx + nose * (carLen / 2 + 2.3), 0, 2.0)
      g.add(nm)
      box(0.06, 1.2, 2.2, mScreen, cx + nose * (carLen / 2 + 2.32), 2.9, 2.0) // 前风挡
      for (const lz of [0.8, -0.8]) {
        const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 10), mHead)
        hl.rotation.z = Math.PI / 2
        hl.position.set(cx + nose * (carLen / 2 + 2.36), 1.25, 2.0 + lz)
        g.add(hl)
      }
    }
    if (ci === 1 || ci === 2) {                                // 受电弓（触网 4.95）
      box(1.5, 0.08, 1.3, mDark, cx, 3.98, 2.0)
      box(0.05, 0.95, 0.05, mDark, cx - 0.42, 4.42, 2.0).rotation.z = 0.55
      box(0.05, 0.95, 0.05, mDark, cx + 0.42, 4.42, 2.0).rotation.z = -0.55
      box(1.15, 0.05, 0.12, mDark, cx, 4.9, 2.0)
    }
  }

  // ── 5 跨站天桥（x 8..10.8，桥面顶 6.4，屋盖顶 8.4 ≤12m）──
  box(2.8, 0.5, 13, mSteel, 9.4, 6.15, 0)                      // 桥面梁
  box(2.8, 0.06, 13, mStone, 9.4, 6.43, 0)                     // 桥面铺装
  box(0.06, 1.55, 12.9, mGlass, 8.06, 7.2, 0)                  // 侧玻璃连续带（西）
  box(0.06, 1.55, 12.9, mGlass, 10.74, 7.2, 0)                 // 侧玻璃连续带（东）
  for (const gz of [-6.5, -3.25, 0, 3.25, 6.5]) box(2.9, 0.08, 0.08, mSteel, 9.4, 7.2, gz)
  box(3.3, 0.18, 13.6, mSteel, 9.4, 8.15, 0)                   // 平屋盖（钢色）
  box(0.14, 0.04, 13.4, mGold, 8.0, 8.27, 0)                   // 屋面金线（东缘细条）
  box(0.14, 0.04, 13.4, mGold, 10.8, 8.27, 0)                  // 屋面金线（西缘细条）
  for (const cz of [-4.05, 4.05]) cyl(0.16, 0.2, 5.9, 10, mSteel, 9.4, 2.95, cz) // 中柱
  for (const sz of [6.5, -6.5]) {                              // 梯井（落站台）
    box(2.8, 5.3, 2.8, mStone, 9.4, 1.1 + 2.65, sz)
    box(2.9, 0.14, 2.9, mStoneDeep, 9.4, 6.47, sz)
    for (let s = 0; s < 14; s++)                               // 外挂踏步（西壁折返）
      box(0.3, 0.16, 1.15, mStoneDeep, 7.85, 1.25 + s * 0.37, sz - 0.6 + (s % 2) * 1.2)
    box(0.3, 0.16, 2.4, mStoneDeep, 7.85, 3.9, sz)             // 中转平台
  }

  // ── 6 南缘留白 + 出口金门 + 树 + 踏步 ──
  cyl(0.09, 0.12, 2.9, 8, mGold, -1.8, 1.45, -9.6)             // 出口金门柱
  cyl(0.09, 0.12, 2.9, 8, mGold, 1.8, 1.45, -9.6)
  box(4.1, 0.2, 0.22, mGold, 0, 2.85, -9.6)                    // 门楣（顶 2.95 ≤3 薄板豁免）
  box(3.4, 0.1, 0.05, mLamp, 0, 2.72, -9.6)                    // 出口发光带
  for (const sgn of [1, -1]) {                                 // 南北踏步（3 级薄板豁免）
    const zBase = sgn > 0 ? 9.9 : -9.45
    for (let s = 0; s < 3; s++) box(4.4, 0.37, 0.55, mStoneDeep, 0, 0.185 + s * 0.37, zBase - sgn * s * 0.55, true)
  }
  return g
}

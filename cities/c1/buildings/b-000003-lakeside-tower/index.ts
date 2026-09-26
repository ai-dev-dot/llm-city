import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { litgrid } from '../../blocks/doubao-seed-2.1-pro/litgrid'

const M = (g: THREE.BufferGeometry, m: THREE.Material, site = false) => {
  const o = new THREE.Mesh(g, m)
  o.castShadow = true
  if (site) o.userData.site = true
  return o
}

/** 造型乔木（景观件）：树干 + 5 颗 detail1 叶球，scale 控制大小；确定性，无随机。 */
function bigTree(o: { x: number; z: number; scale?: number; leaf?: string }): THREE.Object3D {
  const g = new THREE.Group()
  const trunk = M(new THREE.CylinderGeometry(0.16, 0.26, 2.0, 12), stdMaterial('#6B4A2F', { roughness: 0.9 }))
  trunk.position.y = 1.0; g.add(trunk)
  const leafCol = o.leaf ?? '#6E8A5C'
  const balls: Array<[number, number, number, number]> = [
    [0, 2.6, 0, 1.15], [0.7, 2.4, 0.3, 0.85], [-0.7, 2.5, -0.2, 0.9], [0.2, 3.3, -0.1, 0.8], [-0.2, 3.1, 0.6, 0.7],
  ]
  for (const [x, y, z, r] of balls) {
    const leaf = M(new THREE.IcosahedronGeometry(r, 1), stdMaterial(leafCol, { roughness: 0.92 }))
    leaf.position.set(x, y, z); g.add(leaf)
  }
  const s = o.scale ?? 1
  g.scale.set(s, s, s)
  g.position.set(o.x, 0, o.z)
  g.userData.site = true
  return g
}

/** 遮阳伞（景观件）：杆 + 扁伞盖。 */
function parasol(o: { x: number; z: number; color?: string }): THREE.Object3D {
  const g = new THREE.Group()
  const pole = M(new THREE.CylinderGeometry(0.05, 0.06, 2.2, 10), stdMaterial('#5B4A38'))
  pole.position.y = 1.1; g.add(pole)
  const canopy = M(new THREE.ConeGeometry(1.05, 0.45, 18), stdMaterial(o.color ?? '#E0D3B8', { roughness: 0.85 }))
  canopy.position.y = 2.35; g.add(canopy)
  g.position.set(o.x, 0, o.z)
  g.userData.site = true
  return g
}

export default function build(ctx: BuildCtx): THREE.Object3D {
  const root = new THREE.Group()
  const B = ctx.blocks
  const add = (o: THREE.Object3D) => { root.add(o); return o }

  // ---- 材质 ----
  const matGround = stdMaterial('#B7B4AC', { roughness: 0.95 })
  const matPave = stdMaterial('#CFCCC4', { roughness: 0.9 })
  const matWhite = stdMaterial('#E7E3D9', { roughness: 0.72 })
  const matWood = stdMaterial('#A9805A', { roughness: 0.85 })
  const matGlass = stdMaterial('#22344C', { metalness: 0.55, roughness: 0.18, emissive: '#0E1A2A', emissiveIntensity: 0.5 })
  const matMetal = stdMaterial('#8E8B84', { metalness: 0.6, roughness: 0.4 })
  const matDarkMetal = stdMaterial('#4E4C48', { metalness: 0.5, roughness: 0.5 })

  // ===================================================================
  // 场地（宗地 20×40，全域）：基底面 + 沿街人行道环带
  // ===================================================================
  add(M(new THREE.BoxGeometry(20, 0.04, 40), matGround)).position.set(0, 0.02, 0)
  // 北、东、南、西四圈人行道（2m 环带）
  const northWalk = M(new THREE.BoxGeometry(20, 0.03, 2), matPave); northWalk.position.set(0, 0.045, 19); add(northWalk)
  const eastWalk = M(new THREE.BoxGeometry(2, 0.03, 40), matPave); eastWalk.position.set(9, 0.045, 0); add(eastWalk)
  const southWalk = M(new THREE.BoxGeometry(20, 0.03, 2), matPave); southWalk.position.set(0, 0.045, -19); add(southWalk)
  const westWalk = M(new THREE.BoxGeometry(2, 0.03, 40), matPave); westWalk.position.set(-9, 0.045, 0); add(westWalk)

  // ===================================================================
  // 塔楼（北，z 中心 +10）：板/墙内退 proj=.42，凸窗外缘贴 ±8 / +18 / +2
  //   板面 15.16 × 15.16：x±7.58，z[+2.42,+17.58]
  // ===================================================================
  const tower = new THREE.Group()
  // 大堂地板
  const baseSlab = M(new THREE.BoxGeometry(15.16, 0.24, 15.16), matWhite)
  baseSlab.position.set(0, 0.12, 10); tower.add(baseSlab)
  // 标准层楼板（y=6 大堂顶 → y=72 屋顶，23 道）
  for (let f = 0; f <= 22; f++) {
    const slab = M(new THREE.BoxGeometry(15.16, 0.24, 15.16), matWhite)
    slab.position.set(0, 6 + f * 3 + 0.12, 10); tower.add(slab)
  }
  // 四角结构角柱（通高 72m）
  for (const [sx, sz] of [[-7.33, 2.67], [7.33, 2.67], [-7.33, 17.33], [7.33, 17.33]]) {
    const col = M(new THREE.BoxGeometry(0.5, 72, 0.5), matWhite)
    col.position.set(sx, 36, sz); tower.add(col)
  }
  // 四面飘窗灯幕墙（净宽 14.16，11 格，24 层）
  const faceW = 14.16
  const northFace = litgrid({ w: faceW, h: 66, floors: 22, cells: 11, seed: 7, y0: 6 })
  northFace.position.set(0, 0, 17.58); tower.add(northFace)
  const southFace = litgrid({ w: faceW, h: 66, floors: 22, cells: 11, seed: 13, y0: 6 })
  southFace.rotation.y = Math.PI; southFace.position.set(0, 0, 2.42); tower.add(southFace)
  const eastFace = litgrid({ w: faceW, h: 66, floors: 22, cells: 11, seed: 21, y0: 6 })
  eastFace.rotation.y = Math.PI / 2; eastFace.position.set(7.58, 0, 10); tower.add(eastFace)
  const westFace = litgrid({ w: faceW, h: 66, floors: 22, cells: 11, seed: 29, y0: 6 })
  westFace.rotation.y = -Math.PI / 2; westFace.position.set(-7.58, 0, 10); tower.add(westFace)

  // ---- 6m 通高入户大堂：南/东/西落地玻璃（内退），北向入口 + 雨棚 ----
  const lobbyGlass = stdMaterial('#1B2C42', { metalness: 0.65, roughness: 0.12, emissive: '#0A1422', emissiveIntensity: 0.4 })
  const lh = 5.6
  const ls = M(new THREE.BoxGeometry(14.6, lh, 0.1), lobbyGlass); ls.position.set(0, 3, 2.7); tower.add(ls)
  const le = M(new THREE.BoxGeometry(0.1, lh, 14.6), lobbyGlass); le.position.set(7.3, 3, 10); tower.add(le)
  const lw = M(new THREE.BoxGeometry(0.1, lh, 14.6), lobbyGlass); lw.position.set(-7.3, 3, 10); tower.add(lw)
  // 北：中央大门 + 两侧玻璃
  const doorW = 4.2, sideW = (14.6 - doorW) / 2
  const nl = M(new THREE.BoxGeometry(sideW, lh, 0.1), lobbyGlass); nl.position.set(-(doorW / 2 + sideW / 2), 3, 17.3); tower.add(nl)
  const nr = M(new THREE.BoxGeometry(sideW, lh, 0.1), lobbyGlass); nr.position.set(doorW / 2 + sideW / 2, 3, 17.3); tower.add(nr)
  const door = M(new THREE.BoxGeometry(doorW, 4.2, 0.12), stdMaterial('#FFE6BC', { metalness: 0.2, roughness: 0.4, emissive: '#FFCE80', emissiveIntensity: 0.9 }))
  door.position.set(0, 2.1, 17.3); tower.add(door)
  // 大堂内顶暖光（夜间透出暖光——温暖光盒）
  const glowCeil = M(new THREE.BoxGeometry(13, 0.06, 13), stdMaterial('#FFE0B0', { emissive: '#FFCE85', emissiveIntensity: 0.8 }))
  glowCeil.position.set(0, 5.7, 10); tower.add(glowCeil)
  // 入口雨棚（外缘不越 +18）
  const canopyTop = M(new THREE.BoxGeometry(5.4, 0.14, 1.2), matMetal)
  canopyTop.position.set(0, 4.4, 17.4); tower.add(canopyTop)
  // 入口台阶（site 薄板，伸入北环带）
  for (let i = 0; i < 2; i++) {
    const step = M(new THREE.BoxGeometry(3.6, 0.08, 0.5), matPave, true)
    step.position.set(0, 0.04 + i * 0.08, 18.5 + i * 0.45); tower.add(step)
  }

  // ---- 顶部：空中会所 72–78 + 冠顶构架 78–95 ----
  // 会所玻璃体（11×11，x±5.5，z[+4.5,+15.5]）
  const club = new THREE.Group()
  for (const [w, x, z, ry] of [
    [11, 0, 15.5, 0], [11, 0, 4.5, Math.PI], [11, 5.5, 10, Math.PI / 2], [11, -5.5, 10, -Math.PI / 2],
  ] as const) {
    const wall = M(new THREE.BoxGeometry(w - 0.4, 4.2, 0.12), matGlass)
    wall.position.set(x, 74.1, z); wall.rotation.y = ry; club.add(wall)
  }
  for (const [cx, cz] of [[-5.5, 4.5], [5.5, 4.5], [-5.5, 15.5], [5.5, 15.5]]) {
    const pc = M(new THREE.BoxGeometry(0.22, 6, 0.22), matMetal)
    pc.position.set(cx, 75, cz); club.add(pc)
  }
  const clubRoof = M(new THREE.BoxGeometry(12, 0.25, 12), matWhite)
  clubRoof.position.set(0, 78, 10); club.add(clubRoof)
  tower.add(club)

  // 72 屋顶露台栏杆（内移立 7.5，一圈）
  const rail1 = B.railing({ w: 15, h: 1.05, x: 0, y: 72.12, z: 7.5 + 10, color: '#9A978F' }); tower.add(rail1)
  const rail2 = B.railing({ w: 15, h: 1.05, x: 0, y: 72.12, z: -7.5 + 10, color: '#9A978F' }); rail2.rotation.y = Math.PI; tower.add(rail2)
  const rail3 = B.railing({ w: 15, h: 1.05, x: 7.5, y: 72.12, z: 10, color: '#9A978F' }); rail3.rotation.y = Math.PI / 2; tower.add(rail3)
  const rail4 = B.railing({ w: 15, h: 1.05, x: -7.5, y: 72.12, z: 10, color: '#9A978F' }); rail4.rotation.y = -Math.PI / 2; tower.add(rail4)

  // ---- 顶部「灯阁」（78–96）：塔身收分方阁，四面暖光灯窗夜间发光，呼应「望湖阁」----
  const crown = new THREE.Group()
  const gx = 4, gzC = 10
  // 阁四角细柱 78→88
  for (const [cx, cz] of [[-gx, gzC - gx], [gx, gzC - gx], [-gx, gzC + gx], [gx, gzC + gx]]) {
    const post = M(new THREE.BoxGeometry(0.28, 10, 0.28), matMetal)
    post.position.set(cx, 83, cz); crown.add(post)
  }
  // 四面灯窗（y80–86）：暖光底板 + 窗棂
  const lampWin = stdMaterial('#FFDCA0', { metalness: 0.2, roughness: 0.5, emissive: '#FFC870', emissiveIntensity: 1.15 })
  for (const [px, pz, ry] of [[0, gzC + gx, 0], [0, gzC - gx, Math.PI], [gx, gzC, Math.PI / 2], [-gx, gzC, -Math.PI / 2]] as const) {
    const fg = new THREE.Group()
    const panel = M(new THREE.BoxGeometry(7.2, 6, 0.08), lampWin)
    panel.position.y = 3; fg.add(panel)
    fg.add(B.latticePanel({ w: 7.2, h: 6, cols: 3, rows: 2, bar: 0.1, color: '#6E6B64' }))
    fg.position.set(px, 80, pz); fg.rotation.y = ry; crown.add(fg)
  }
  // 金属挑檐顶板（y88，比阁身挑出）
  const capSlab = M(new THREE.BoxGeometry(9.6, 0.3, 9.6), matMetal)
  capSlab.position.set(0, 88, gzC); crown.add(capSlab)
  // 冠灯 + 天线
  const crownLamp = M(new THREE.SphereGeometry(0.3, 16, 12), stdMaterial('#FFE6B0', { emissive: '#FFD07A', emissiveIntensity: 1.5 }))
  crownLamp.position.set(0, 89.4, gzC); crown.add(crownLamp)
  const mast = M(new THREE.CylinderGeometry(0.04, 0.07, 6.6, 8), matDarkMetal)
  mast.position.set(0, 92.7, gzC); crown.add(mast)
  tower.add(crown)

  root.add(tower)

  // ===================================================================
  // 裙房（南，z 中心 -10）：15.6×15.6，x±7.8，z[-17.8,-2.2]，高 9m，2 层
  // ===================================================================
  const podium = new THREE.Group()
  // 楼板 y=4.5 / 9
  for (const y of [4.5, 9]) {
    const slab = M(new THREE.BoxGeometry(15.6, 0.3, 15.6), matWhite)
    slab.position.set(0, y, -10); podium.add(slab)
  }
  // 四角柱
  for (const [sx, sz] of [[-7.5, -2.5], [7.5, -2.5], [-7.5, -17.5], [7.5, -17.5]]) {
    const col = M(new THREE.BoxGeometry(0.6, 9, 0.6), matWhite)
    col.position.set(sx, 4.5, sz); podium.add(col)
  }
  // 东、南、西三面橱窗（每层：玻璃大板 + 竖梃 + 暖光）
  const shopFront = (wIsX: boolean, fixed: number, level: number) => {
    const yMid = level === 0 ? 2.35 : 6.85
    if (wIsX) {
      const glass = M(new THREE.BoxGeometry(15, 3.4, 0.12), matGlass)
      glass.position.set(0, yMid, fixed); podium.add(glass)
    } else {
      const glass = M(new THREE.BoxGeometry(0.12, 3.4, 15), matGlass)
      glass.position.set(fixed, yMid, -10); podium.add(glass)
    }
    const n = 7
    for (let i = 0; i <= n; i++) {
      const t = -7.5 + (15 * i) / n
      const mull = wIsX
        ? M(new THREE.BoxGeometry(0.1, 3.6, 0.18), matMetal)
        : M(new THREE.BoxGeometry(0.18, 3.6, 0.1), matMetal)
      if (wIsX) mull.position.set(t, yMid, fixed); else mull.position.set(fixed, yMid, -10 + t)
      podium.add(mull)
    }
    // 暖光橱窗
    for (const t of [-3.5, 3.5]) {
      const warm = wIsX
        ? M(new THREE.BoxGeometry(2.6, 2.2, 0.05), stdMaterial('#FFE2B0', { emissive: '#FFD08A', emissiveIntensity: 0.9 }))
        : M(new THREE.BoxGeometry(0.05, 2.2, 2.6), stdMaterial('#FFE2B0', { emissive: '#FFD08A', emissiveIntensity: 0.9 }))
      if (wIsX) warm.position.set(t, yMid, fixed + 0.05); else warm.position.set(fixed + 0.05, yMid, -10 + t)
      podium.add(warm)
    }
  }
  shopFront(false, 7.8, 0)   // 东
  shopFront(false, 7.8, 1)
  shopFront(true, -17.8, 0) // 南
  shopFront(true, -17.8, 1)
  shopFront(false, -7.8, 0) // 西（餐饮主面）
  shopFront(false, -7.8, 1)

  // ---- 屋顶花园 y=9 ----
  const deck = M(new THREE.BoxGeometry(7, 0.06, 14), matWood); deck.position.set(-3.8, 9.05, -10); podium.add(deck)
  const lawn = M(new THREE.BoxGeometry(7, 0.06, 14), stdMaterial('#8C9E78', { roughness: 0.95 })); lawn.position.set(3.9, 9.05, -10); podium.add(lawn)
  // 灌木球（内缘防超界）
  for (const [x, z, c] of [[5.5, -5, '#6E8A5C'], [6.2, -13, '#7C9464'], [3, -16, '#6E8A5C'], [2, -4, '#84A06C'], [6.5, -9, '#6E8A5C']] as const) {
    const bush = M(new THREE.IcosahedronGeometry(0.6, 1), stdMaterial(c, { roughness: 0.95 }), true)
    bush.position.set(x, 9.6, z); podium.add(bush)
  }
  // 盆栽
  for (const [x, z] of [[-6.8, -4], [-6.8, -16]]) {
    const pot = M(new THREE.CylinderGeometry(0.28, 0.22, 0.4, 12), stdMaterial('#B07A52'))
    pot.position.set(x, 9.25, z); podium.add(pot)
    const plant = M(new THREE.IcosahedronGeometry(0.4, 1), stdMaterial('#7C9464', { roughness: 0.9 }), true)
    plant.position.set(x, 9.85, z); podium.add(plant)
  }
  // 周边栏杆（内移立 ±7.55 / -2.45,-17.55）
  const pr1 = B.railing({ w: 15.1, h: 1.05, x: 0, y: 9.15, z: -2.45, color: '#9A978F' }); podium.add(pr1)
  const pr2 = B.railing({ w: 15.1, h: 1.05, x: 0, y: 9.15, z: -17.55, color: '#9A978F' }); pr2.rotation.y = Math.PI; podium.add(pr2)
  const pr3 = B.railing({ w: 15.1, h: 1.05, x: 7.55, y: 9.15, z: -10, color: '#9A978F' }); pr3.rotation.y = Math.PI / 2; podium.add(pr3)
  const pr4 = B.railing({ w: 15.1, h: 1.05, x: -7.55, y: 9.15, z: -10, color: '#9A978F' }); pr4.rotation.y = -Math.PI / 2; podium.add(pr4)
  // 露台小桌椅 2 组
  for (const x of [-3.8, -5.5]) {
    const tabletop = M(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 16), matWood)
    tabletop.position.set(x, 9.5, -10); podium.add(tabletop)
    const tleg = M(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), matDarkMetal)
    tleg.position.set(x, 9.25, -10); podium.add(tleg)
  }

  root.add(podium)

  // ===================================================================
  // 连廊（塔楼南墙 +2.42 与裙房北墙 -2.2 之间）：金属格栅顶 y=6
  // ===================================================================
  const link = new THREE.Group()
  for (const x of [-7, 7]) {
    const girder = M(new THREE.BoxGeometry(0.2, 0.25, 4.7), matMetal)
    girder.position.set(x, 6, 0.1); link.add(girder)
  }
  for (let i = 0; i < 6; i++) {
    const cross = M(new THREE.BoxGeometry(14.4, 0.12, 0.16), matMetal)
    cross.position.set(0, 6, -1.9 + i * 0.8); link.add(cross)
  }
  for (const [x, z] of [[-7, 2.2], [7, 2.2], [-7, -2], [7, -2]]) {
    const post = M(new THREE.BoxGeometry(0.18, 6, 0.18), matDarkMetal)
    post.position.set(x, 3, z); link.add(post)
  }
  root.add(link)

  // ===================================================================
  // 景观（site 件）：行道树、路灯、坐凳、西环带咖啡外摆
  // ===================================================================
  // 北街 3 棵
  for (const x of [-5, 0, 5]) add(bigTree({ x, z: 18.6, scale: 0.95 }))
  // 东街 4 棵
  for (const z of [13, 5, -3, -11]) add(bigTree({ x: 8.6, z, scale: 0.9, leaf: '#789460' }))
  // 西环带 2 棵（配咖啡区）
  for (const z of [-7, -14]) add(bigTree({ x: -8.7, z, scale: 0.85, leaf: '#6E8A5C' }))
  // 四角 + 北街路灯
  for (const [x, z] of [[8.6, 18.6], [-8.6, 18.6], [8.6, -18.6], [-8.6, -18.6]]) {
    const lamp = B.streetLamp({ x, z, h: 4.8 }); add(lamp)
  }
  // 坐凳
  add(B.bench({ x: -8.7, z: -3, rotY: Math.PI / 2 }))
  add(B.bench({ x: -8.7, z: -17, rotY: Math.PI / 2 }))
  add(B.bench({ x: 3, z: 18.9 }))
  // 咖啡外摆 2 组（西环带 x=-9，伞缘贴 -10）
  for (const z of [-8, -13]) {
    add(parasol({ x: -9, z, color: '#E8DCC0' }))
    const tabletop = M(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 16), matWood, true)
    tabletop.position.set(-9, 0.75, z); add(tabletop)
    const tleg = M(new THREE.CylinderGeometry(0.06, 0.08, 0.72, 8), matDarkMetal, true)
    tleg.position.set(-9, 0.38, z); add(tleg)
    for (const [dx, dz] of [[0.5, 0.2], [-0.5, -0.2]]) {
      const seat = M(new THREE.BoxGeometry(0.36, 0.08, 0.36), matWood, true)
      seat.position.set(-9 + dx, 0.42, z + dz); add(seat)
    }
  }

  return root
}

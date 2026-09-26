import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { litgrid } from '../../blocks/doubao-seed-2.1-pro/litgrid'
import { stairFlight, stairLanding } from '../../blocks/doubao-seed-2.1-pro/stair'
import { pergola } from '../../blocks/doubao-seed-2.1-pro/pergola'

const M = (g: THREE.BufferGeometry, m: THREE.Material, site = false) => {
  const o = new THREE.Mesh(g, m)
  o.castShadow = true
  if (site) o.userData.site = true
  return o
}

// ---- 布局常量 ----
// 台阶三阶级：西缘 / 东缘 / 层数（层高 3m：12 / 18 / 24m）
const TIERS = [
  { xW: -6, xE: -1.5, floors: 4 },
  { xW: -1.5, xE: 3, floors: 6 },
  { xW: 3, xE: 7.5, floors: 8 },
] as const
const ZS = [16, 12, 8, 4, -4, -8, -12, -16]            // 8 户中心
const ZB = [18, 14, 10, 6, 2, -2, -6, -10, -14, -18]  // 户界

/** 垂柳（景观件）：主干 + 3 球 detail1 树冠 + 8 根垂枝。 */
function willow(o: { x: number; z: number; scale?: number; rng: () => number }): THREE.Object3D {
  const g = new THREE.Group()
  const trunk = M(new THREE.CylinderGeometry(0.15, 0.28, 2.6, 10), stdMaterial('#6B5138', { roughness: 0.9 }))
  trunk.position.y = 1.3; g.add(trunk)
  const balls: Array<[number, number, number, number]> = [
    [0, 3.1, 0, 1.05], [0.65, 2.85, 0.25, 0.78], [-0.6, 2.9, -0.2, 0.82],
  ]
  for (const [x, y, z, r] of balls) {
    const leaf = M(new THREE.IcosahedronGeometry(r, 1), stdMaterial('#7C9460', { roughness: 0.95 }))
    leaf.position.set(x, y, z); g.add(leaf)
  }
  // 下垂枝条
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const branch = M(new THREE.CylinderGeometry(0.02, 0.008, 1.7, 5), stdMaterial('#6E8A54', { roughness: 0.95 }), true)
    branch.position.set(Math.cos(a) * 0.75, 2.15, Math.sin(a) * 0.75)
    branch.rotation.x = 0.28 * Math.sin(a)
    branch.rotation.z = -0.28 * Math.cos(a)
    g.add(branch)
  }
  const s = o.scale ?? 1
  g.scale.set(s, s, s)
  g.position.set(o.x, 0, o.z)
  g.userData.site = true
  return g
}

export default function build(ctx: BuildCtx): THREE.Object3D {
  const root = new THREE.Group()
  const B = ctx.blocks
  const rng = ctx.rng
  const add = (o: THREE.Object3D) => { root.add(o); return o }

  // ---- 材质 ----
  const matGround = stdMaterial('#B5B2A8', { roughness: 0.95 })
  const matPave = stdMaterial('#CFCCC4', { roughness: 0.9 })
  const matStone = stdMaterial('#C3C8C6', { roughness: 0.92 })
  const matWall = stdMaterial('#ECE8DF', { roughness: 0.8 })
  const matPlinth = stdMaterial('#D8D3C8', { roughness: 0.88 })
  const matSlab = stdMaterial('#E2DED4', { roughness: 0.78 })
  const matWood = stdMaterial('#A9805A', { roughness: 0.85 })
  const matDoorWood = stdMaterial('#8A5E3C', { roughness: 0.82 })
  const matTile = stdMaterial('#47433F', { roughness: 0.85 })
  const matGlass = stdMaterial('#26405C', { metalness: 0.55, roughness: 0.18, emissive: '#0E1A2A', emissiveIntensity: 0.45 })
  const matMetal = stdMaterial('#8E8B84', { metalness: 0.6, roughness: 0.4 })
  const matLawn = stdMaterial('#8C9E78', { roughness: 0.95 })
  const matHedge = stdMaterial('#6E7F5C', { roughness: 0.95 })
  const matLit = stdMaterial('#FFDCA0', { roughness: 0.5, emissive: '#FFC870', emissiveIntensity: 1.2 })

  // ===================================================================
  // 场地（宗地 20×40，全域）
  // ===================================================================
  add(M(new THREE.BoxGeometry(20, 0.04, 40), matGround)).position.set(0, 0.02, 0)
  // 西环带：临湖石板步道（2m）
  add(M(new THREE.BoxGeometry(2, 0.03, 40), matStone)).position.set(-9, 0.045, 0)
  // 北 / 南环带
  add(M(new THREE.BoxGeometry(20, 0.03, 2), matPave)).position.set(0, 0.045, 19)
  add(M(new THREE.BoxGeometry(20, 0.03, 2), matPave)).position.set(0, 0.045, -19)
  // 东环带：面向中央庭院的花境草皮带
  add(M(new THREE.BoxGeometry(2, 0.05, 40), matLawn, true)).position.set(9, 0.04, 0)
  // 前院草皮带 x[-8,-6]（风廊口断开，两段）
  add(M(new THREE.BoxGeometry(2, 0.05, 16), matLawn, true)).position.set(-7, 0.035, 10)
  add(M(new THREE.BoxGeometry(2, 0.05, 16), matLawn, true)).position.set(-7, 0.035, -10)
  // 风廊石板地 z[-2,2]：x[-8,7.5]
  add(M(new THREE.BoxGeometry(15.5, 0.04, 4), matStone, true)).position.set(-0.25, 0.05, 0)

  // ===================================================================
  // 台院主体：楼板 / 西立面（朝湖）/ 山墙 / 风廊壁
  // ===================================================================

  // ---- 朝西立面构件（闭包）----
  // 落地玻璃木门：门线 x=faceX，门朝西
  const doorWest = (z: number, yBase: number, faceX: number) => {
    const g = new THREE.Group()
    const DW = 2.6, DH = 2.3
    for (const sz of [-(DW / 2 - 0.06), DW / 2 - 0.06]) {
      const jamb = M(new THREE.BoxGeometry(0.12, DH, 0.12), matDoorWood)
      jamb.position.set(-0.04, DH / 2, sz); g.add(jamb)
    }
    const head = M(new THREE.BoxGeometry(0.12, 0.12, DW), matDoorWood)
    head.position.set(-0.04, DH - 0.06, 0); g.add(head)
    const sill = M(new THREE.BoxGeometry(0.1, 0.08, DW), matDoorWood)
    sill.position.set(-0.04, 0.04, 0); g.add(sill)
    const mull = M(new THREE.BoxGeometry(0.08, DH, 0.06), matDoorWood)
    mull.position.set(-0.04, DH / 2, 0); g.add(mull)
    const pane = M(new THREE.BoxGeometry(0.05, DH - 0.28, DW - 0.26), matGlass)
    pane.position.set(-0.02, DH / 2, 0); g.add(pane)
    if (rng() < 0.22) {
      const warm = M(new THREE.BoxGeometry(0.03, DH - 0.45, DW - 0.55), matLit)
      warm.position.set(0.07, DH / 2, 0); g.add(warm)
    }
    g.position.set(faceX, yBase, z)
    return g
  }
  // 外挑木阳台（挑 .9m）
  const balconyWest = (z: number, yBase: number, faceX: number) => {
    const g = new THREE.Group()
    const DW = 2.9
    const deck = M(new THREE.BoxGeometry(0.9, 0.09, DW), matWood)
    deck.position.set(-0.45, 0.045, 0); g.add(deck)
    // 端部栏杆（沿 Z）
    const r1 = B.railing({ w: DW, h: 1.0, color: '#9A6E4A' })
    r1.rotation.y = -Math.PI / 2; r1.position.set(-0.88, 0.1, 0); g.add(r1)
    // 两侧栏杆（沿 X）
    const r2 = B.railing({ w: 0.82, h: 1.0, color: '#9A6E4A' })
    r2.position.set(-0.44, 0.1, DW / 2); g.add(r2)
    const r3 = B.railing({ w: 0.82, h: 1.0, color: '#9A6E4A' })
    r3.position.set(-0.44, 0.1, -DW / 2); g.add(r3)
    // 端花箱
    const box = M(new THREE.BoxGeometry(0.16, 0.22, 0.5), matDoorWood, true)
    box.position.set(-0.82, 0.2, 0); g.add(box)
    const leaf = M(new THREE.IcosahedronGeometry(0.26, 1), stdMaterial('#6E8A54', { roughness: 0.95 }), true)
    leaf.position.set(-0.82, 0.46, 0); g.add(leaf)
    g.position.set(faceX, yBase, z)
    return g
  }
  // 高窗带（退台上层：窗底 .9）
  const highWinWest = (z: number, yBase: number, faceX: number) => {
    const g = new THREE.Group()
    const DW = 2.6
    const pane = M(new THREE.BoxGeometry(0.05, 1.45, DW), matGlass)
    pane.position.set(-0.02, 1.62, 0); g.add(pane)
    const mull = M(new THREE.BoxGeometry(0.07, 1.45, 0.06), matDoorWood)
    mull.position.set(-0.04, 1.62, 0); g.add(mull)
    for (const sz of [-(DW / 2 - 0.05), DW / 2 - 0.05]) {
      const jamb = M(new THREE.BoxGeometry(0.1, 1.5, 0.1), matDoorWood)
      jamb.position.set(-0.04, 1.62, sz); g.add(jamb)
    }
    // 花箱 ×2
    for (const sz of [-0.65, 0.65]) {
      const box = M(new THREE.BoxGeometry(0.18, 0.22, 0.42), matDoorWood, true)
      box.position.set(-0.16, 0.98, sz); g.add(box)
      const leaf = M(new THREE.IcosahedronGeometry(0.24, 1), stdMaterial('#7C9464', { roughness: 0.95 }), true)
      leaf.position.set(-0.16, 1.26, sz); g.add(leaf)
    }
    g.position.set(faceX, yBase, z)
    return g
  }

  TIERS.forEach((t, ti) => {
    const xC = (t.xW + t.xE) / 2
    const w = t.xE - t.xW
    const H = t.floors * 3

    // ---- 楼板：f=0..floors，两段（避开风廊 z[-2,2]；山墙内收后板长 14.2）----
    for (let f = 0; f <= t.floors; f++) {
      for (const zc of [9.1, -9.1]) {
        const slab = M(new THREE.BoxGeometry(w, f === 0 ? 0.2 : 0.22, 14.2), f === 0 ? matPlinth : matSlab)
        slab.position.set(xC, f * 3 + (f === 0 ? 0.1 : 0.11), zc)
        add(slab)
      }
    }

    // ---- 西立面：外露层（西阶 1–4 / 中阶 5–6 / 东阶 7–8）----
    const fFrom = ti === 0 ? 0 : ti === 1 ? 4 : 6
    const fTo = ti === 0 ? 3 : ti === 1 ? 5 : 7
    for (let f = fFrom; f <= fTo; f++) {
      const yBase = f * 3
      for (const z of ZS) {
        if (f === 0 || f === 4 || f === 6) {
          add(doorWest(z, yBase, t.xW))
        } else if (f === 5 || f === 7) {
          add(highWinWest(z, yBase, t.xW))
        } else {
          add(doorWest(z, yBase, t.xW))
          add(balconyWest(z, yBase, t.xW))
        }
      }
    }

    // ---- 南北山墙（内收至 z=±17，留 1m 山墙侧院；披檐挑出后外缘 ≤17.93）----
    for (const side of [1, -1]) {
      const zFace = side * 17.0
      const wall = M(new THREE.BoxGeometry(w, H, 0.22), matWall)
      wall.position.set(xC, H / 2, zFace); add(wall)
      // 勒脚
      const pl = M(new THREE.BoxGeometry(w, 0.6, 0.24), matPlinth)
      pl.position.set(xC, 0.3, zFace); add(pl)
      // 山墙侧院窄带草皮（site 薄板，z17.1–18）
      const sideLawn = M(new THREE.BoxGeometry(w, 0.05, 0.9), matLawn, true)
      sideLawn.position.set(xC, 0.035, side * 17.55); add(sideLawn)
      // 每层 3 窗
      for (let f = 0; f < t.floors; f++) {
        for (const dx of [-1.35, 0, 1.35]) {
          const winG = new THREE.Group()
          const pane = M(new THREE.BoxGeometry(0.9, 1.4, 0.06), matGlass)
          pane.position.y = 0.7; winG.add(pane)
          const frame = M(new THREE.BoxGeometry(0.98, 1.5, 0.05), matDoorWood)
          frame.position.y = 0.75; winG.add(frame)
          if (rng() < 0.2) winG.add((() => {
            const warm = M(new THREE.BoxGeometry(0.7, 1.1, 0.03), matLit)
            warm.position.y = 0.75; return warm
          })())
          // 窗挂花箱（约 45% 住户）：木盒 + detail1 叶丛
          if (rng() < 0.45) {
            const wbox = M(new THREE.BoxGeometry(0.55, 0.2, 0.2), matDoorWood, true)
            wbox.position.set(0, 0.05, -side * 0.16); winG.add(wbox)
            const wleaf = M(new THREE.IcosahedronGeometry(0.25, 1), stdMaterial('#6E8A54', { roughness: 0.95 }), true)
            wleaf.position.set(0, 0.34, -side * 0.16); winG.add(wleaf)
          }
          winG.position.set(xC + dx, f * 3 + 0.55, zFace - side * 0.13)
          add(winG)
        }
      }
    }

    // ---- 风廊壁 z=±2：墙 + 一层廊内门 + 上层小窗 + 花架爬藤 ----
    for (const side of [1, -1]) {
      const zFace = side * 1.9
      const wall = M(new THREE.BoxGeometry(w, H, 0.16), matWall)
      wall.position.set(xC, H / 2, zFace); add(wall)
      // 一层入户门（每阶级 1 樘）
      const doorG = new THREE.Group()
      const dpane = M(new THREE.BoxGeometry(1.2, 2.2, 0.06), matGlass)
      dpane.position.y = 1.15; doorG.add(dpane)
      for (const sx of [-0.62, 0.62]) {
        const jamb = M(new THREE.BoxGeometry(0.1, 2.3, 0.1), matDoorWood)
        jamb.position.set(sx, 1.15, 0); doorG.add(jamb)
      }
      const dhead = M(new THREE.BoxGeometry(1.34, 0.12, 0.1), matDoorWood)
      dhead.position.y = 2.26; doorG.add(dhead)
      // 门牌灯
      const lampDot = M(new THREE.SphereGeometry(0.08, 8, 6), matLit, true)
      lampDot.position.set(0.75, 2.1, 0); doorG.add(lampDot)
      doorG.position.set(xC, 0.05, zFace - side * 0.1)
      add(doorG)
      // 上层小窗
      for (let f = 1; f < t.floors; f++) {
        const pane = M(new THREE.BoxGeometry(1.0, 1.2, 0.05), matGlass)
        pane.position.set(xC, f * 3 + 1.6, zFace - side * 0.08); add(pane)
      }
      // 花架格栅 + 爬藤（绿巷）
      const lattice = B.latticePanel({ w: w - 0.6, h: H - 1.2, cols: 3, rows: Math.max(2, Math.round(H / 3)), bar: 0.08, color: '#8A5E3C' })
      lattice.position.set(xC, 0.7, zFace - side * 0.14); add(lattice)
      for (let k = 0; k < 9; k++) {
        const vx = xC - w / 2 + 0.5 + rng() * (w - 1)
        const vy = 1.0 + rng() * (H - 1.6)
        const leaf = M(new THREE.IcosahedronGeometry(0.3, 1), stdMaterial('#5F7A48', { roughness: 0.95 }), true)
        leaf.position.set(vx, vy, zFace - side * 0.22); add(leaf)
      }
    }
  })

  // ---- 东立面（x=7.5，全高 24m）：litgrid 飘窗灯墙沿 Z 展开（齐山墙 ±17.1）----
  const eastFace = litgrid({ w: 34.2, h: 24, floors: 8, cells: 26, seed: 31, y0: 0 })
  eastFace.rotation.y = Math.PI / 2
  eastFace.position.set(7.5 - 0.42, 0, 0)
  add(eastFace)
  // 东立面爬藤花架（贴墙下部 3m 高，垂绿）
  const eastTrellis = B.latticePanel({ w: 28, h: 3, cols: 13, rows: 2, bar: 0.07, color: '#8A5E3C' })
  eastTrellis.rotation.y = Math.PI / 2
  eastTrellis.position.set(7.28, 0.1, 0)
  add(eastTrellis)
  for (let k = 0; k < 38; k++) {
    const vz = -14 + rng() * 28
    const leaf = M(new THREE.IcosahedronGeometry(0.34, 1), stdMaterial('#5F7A48', { roughness: 0.95 }), true)
    leaf.position.set(7.2, 0.6 + rng() * 2.2, vz); add(leaf)
  }

  // ===================================================================
  // 露台小院（两级退台屋顶：y=12 西阶顶 / y=18 中阶顶）
  // ===================================================================
  const terraceGarden = (y: number, xFrom: number, xTo: number, doorAt: 'E' | 'W') => {
    const deep = xTo - xFrom
    const xMid = (xFrom + xTo) / 2
    // 靠门侧 1.6m 木平台（顺 Z 条板）
    const platX = doorAt === 'E' ? xTo - 0.8 : xFrom + 0.8
    for (const z of ZS) {
      for (let i = 0; i < 12; i++) {
        const board = M(new THREE.BoxGeometry(0.11, 0.05, 3.5), matWood, true)
        board.position.set(platX - 0.72 + i * 0.13, y + 0.06, z)
        add(board)
      }
      // 草皮区
      const lawnX = doorAt === 'E' ? xFrom + (deep - 1.6) / 2 : xTo - (deep - 1.6) / 2
      const lawn = M(new THREE.BoxGeometry(deep - 1.7, 0.06, 3.5), matLawn, true)
      lawn.position.set(lawnX, y + 0.05, z); add(lawn)
      // 灌木 5 球
      for (const [gx, gz, gr] of [[-0.9, -0.8, 0.4], [0.6, 0.4, 0.48], [-0.3, 1.0, 0.36], [1.0, -0.6, 0.32], [0.2, -1.2, 0.28]] as const) {
        const bush = M(new THREE.IcosahedronGeometry(gr, 1), stdMaterial(rng() < 0.5 ? '#6E8A5C' : '#7C9464', { roughness: 0.95 }), true)
        bush.position.set(lawnX + gx, y + gr + 0.08, z + gz); add(bush)
      }
      // 盆栽
      const pot = M(new THREE.CylinderGeometry(0.24, 0.19, 0.36, 12), stdMaterial('#B07A52'), true)
      pot.position.set(platX, y + 0.2, z - 1.2); add(pot)
      const plant = M(new THREE.IcosahedronGeometry(0.36, 1), stdMaterial('#7C9464', { roughness: 0.9 }), true)
      plant.position.set(platX, y + 0.66, z - 1.2); add(plant)
    }
    // 临空矮栏杆（外竖向边缘：西阶顶西缘 x=-6；中阶顶西缘 x=-1.5）
    const edgeX = doorAt === 'E' ? xFrom : xTo
    for (const zc of [10, -10]) {
      const rail = B.railing({ w: 15.6, h: 0.95, color: '#9A6E4A' })
      rail.rotation.y = Math.PI / 2
      rail.position.set(edgeX, y + 0.12, zc); add(rail)
    }
    // 户界绿篱（9 道，沿 X 向）
    for (let i = 0; i < ZB.length; i++) {
      const hedge = M(new THREE.BoxGeometry(deep, 0.65, 0.14), matHedge, true)
      hedge.position.set(xMid, y + 0.38, ZB[i]); add(hedge)
    }
    // 户外桌椅（隔户布置）
    for (const z of [16, 8, -8, -16]) {
      const tabletop = M(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 14), matWood, true)
      tabletop.position.set(platX, y + 0.72, z); add(tabletop)
      const tleg = M(new THREE.CylinderGeometry(0.05, 0.06, 0.66, 8), matMetal, true)
      tleg.position.set(platX, y + 0.37, z); add(tleg)
      for (const [dx, dz] of [[0.5, 0.2], [-0.5, -0.2]]) {
        const seat = M(new THREE.BoxGeometry(0.34, 0.07, 0.34), matWood, true)
        seat.position.set(platX + dx, y + 0.42, z + dz); add(seat)
      }
    }
  }
  terraceGarden(12, -6, -1.5, 'E')
  terraceGarden(18, -1.5, 3, 'E')

  // ===================================================================
  // 外挂折返楼梯 + 电梯井（风廊东端，东阶架空区 x[3,7.5]，贴北壁）
  // ===================================================================
  for (let f = 0; f < 8; f++) {
    const yB = f * 3
    // 跑 1（沿 +Z 爬半层）
    const run1 = stairFlight({ w: 1.05, run: 2.4, rise: 1.5, steps: 9, y0: yB, color: '#D9D5CC' })
    run1.position.set(3.55, 0, -0.35); add(run1)
    // 中平台
    add((() => {
      const l = stairLanding({ w: 1.15, d: 1.1, y0: yB + 1.5 })
      l.position.set(3.55, 0, 1.35); return l
    })())
    // 跑 2（折返）
    const run2 = stairFlight({ w: 1.05, run: 2.4, rise: 1.5, steps: 9, y0: yB + 1.5, color: '#D9D5CC' })
    run2.rotation.y = Math.PI
    run2.position.set(4.85, 0, 0.55); add(run2)
    // 层平台（连接跑 2 顶与下一层跑 1 底）
    add((() => {
      const l = stairLanding({ w: 2.5, d: 1.4, y0: yB + 3 })
      l.position.set(4.2, 0, -0.75); return l
    })())
  }
  // 电梯井
  const shaft = M(new THREE.BoxGeometry(1.2, 24, 1.2), matWall)
  shaft.position.set(6.6, 12, -1.3); add(shaft)
  for (let f = 0; f < 8; f++) {
    const edoor = M(new THREE.BoxGeometry(0.9, 2.1, 0.06), matMetal)
    edoor.position.set(6.6, f * 3 + 1.1, -0.68); add(edoor)
  }

  // ---- 风廊廊架（西半段 x[-8,3]，爬藤）----
  add(pergola({ w: 11, d: 3.7, h: 3.6, bay: 2.75, seed: 17, vines: true })).position.set(-2.5, 0, 0)

  // ===================================================================
  // 黛瓦披檐（6 处：三阶级 × 南北山墙压顶）
  // ===================================================================
  TIERS.forEach((t) => {
    const xC = (t.xW + t.xE) / 2
    const w = t.xE - t.xW
    for (const side of [1, -1]) {
      const g = new THREE.Group()
      // 三角坡板（直角三角：外挑 .8 / 高 .35）
      const shape = new THREE.Shape()
      shape.moveTo(0, 0); shape.lineTo(0.82, 0); shape.lineTo(0, 0.36); shape.closePath()
      const plate = M(new THREE.ExtrudeGeometry(shape, { depth: w - 0.2, bevelEnabled: false, steps: 1 }), matTile)
      plate.position.set(0, 0, -(w - 0.2) / 2); g.add(plate)
      // 椽子 7 根（沿山墙宽对称分布）
      for (let i = 1; i <= 7; i++) {
        const rafter = M(new THREE.BoxGeometry(0.84, 0.07, 0.09), matWood)
        rafter.position.set(0.42, 0.02, -(w - 0.3) / 2 + (w - 0.3) * (i / 8)); g.add(rafter)
      }
      // 瓦垄（顺坡，沿宽每 .22 一道）
      const nT = Math.round((w - 0.4) / 0.22)
      for (let i = 0; i <= nT; i++) {
        const tile = M(new THREE.CylinderGeometry(0.045, 0.045, 0.86, 8), matTile)
        tile.rotation.z = Math.PI / 2
        tile.rotation.y = -0.42
        tile.position.set(0.43, 0.14, -(w - 0.4) / 2 + (w - 0.4) * (i / nT)); g.add(tile)
      }
      // 封檐板
      const fascia = M(new THREE.BoxGeometry(0.1, 0.22, w), matTile)
      fascia.position.set(0.82, 0.08, 0); g.add(fascia)
      // 挂载：局部挑出（+X）转向山墙外侧（±Z）；组内件沿局部 Z 对称，锚点回山墙中心
      g.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2
      g.position.set(xC, t.floors * 3 - 0.05, side * 17.11)
      add(g)
    }
  })

  // ===================================================================
  // 24m 屋顶（东阶顶，南北两段）
  // ===================================================================
  for (const zc of [10, -10]) {
    // 东缘栏杆（沿 Z）
    const rail = B.railing({ w: 15.6, h: 1.05, color: '#9A978F' })
    rail.rotation.y = Math.PI / 2
    rail.position.set(7.05, 24.12, zc); add(rail)
    // 山墙侧栏杆（沿 X）
    const side = zc > 0 ? 1 : -1
    const rail2 = B.railing({ w: 4.1, h: 1.05, color: '#9A978F' })
    rail2.position.set(5.25, 24.12, side * 17.55); add(rail2)
    // 盆栽灌木
    for (const [bx, bz] of [[3.6, -6], [4.2, 2], [6.6, 6]] as const) {
      const pot = M(new THREE.CylinderGeometry(0.3, 0.24, 0.42, 12), stdMaterial('#B07A52'), true)
      pot.position.set(bx, 24.23, zc + bz); add(pot)
      const plant = M(new THREE.IcosahedronGeometry(0.44, 1), stdMaterial('#7C9464', { roughness: 0.9 }), true)
      plant.position.set(bx, 24.92, zc + bz); add(plant)
    }
  }
  // 电梯机房（南半段，电梯井顶）
  const machine = M(new THREE.BoxGeometry(1.8, 2.2, 1.8), matWall)
  machine.position.set(6.6, 25.1, -1.3); add(machine)
  const machineRoof = M(new THREE.BoxGeometry(2.1, 0.16, 2.1), matTile)
  machineRoof.position.set(6.6, 26.3, -1.3); add(machineRoof)
  // 太阳能板阵列（北半段：5 列 Z × 3 行 X = 15 块，斜 25°）
  for (let ix = 0; ix < 3; ix++) {
    for (let iz = 0; iz < 5; iz++) {
      const panelG = new THREE.Group()
      const panel = M(new THREE.BoxGeometry(1.05, 0.05, 1.5), stdMaterial('#2E3A4E', { metalness: 0.5, roughness: 0.3 }), true)
      panel.position.y = 0.4; panelG.add(panel)
      for (const [px, pz] of [[0.45, 0.6], [-0.45, -0.6]]) {
        const leg = M(new THREE.BoxGeometry(0.07, 0.5, 0.07), matMetal, true)
        leg.position.set(px, 0.22, pz); panelG.add(leg)
      }
      panelG.rotation.x = -0.32
      panelG.position.set(3.9 + ix * 1.25, 24.05, 4.5 + iz * 2.4)
      add(panelG)
    }
  }

  // ===================================================================
  // 地面前院（8 院，x[-8,-6]）：绿篱围合 + 矮木门
  // ===================================================================
  for (const z of ZS) {
    // 西缘绿篱：两侧各 0.8 段，留 1m 门口
    for (const dz of [-0.85, 0.85]) {
      const hedge = M(new THREE.BoxGeometry(0.16, 0.9, 0.75), matHedge, true)
      hedge.position.set(-8, 0.45, z + dz); add(hedge)
    }
    // 矮木门 + 门柱 + 门灯
    const gate = M(new THREE.BoxGeometry(0.06, 0.85, 0.95), matDoorWood, true)
    gate.position.set(-8, 0.43, z); add(gate)
    for (const dz of [-0.52, 0.52]) {
      const post = M(new THREE.BoxGeometry(0.12, 1.15, 0.12), matWall, true)
      post.position.set(-8, 0.58, z + dz); add(post)
    }
    const glight = M(new THREE.SphereGeometry(0.07, 8, 6), matLit, true)
    glight.position.set(-7.85, 1.05, z + 0.45); add(glight)
    // 院内：灌木 2 + 石板步
    for (const [gx, gz, gr] of [[-6.6, -0.9, 0.42], [-6.55, 0.25, 0.36], [-6.6, 0.8, 0.5]] as const) {
      const bush = M(new THREE.IcosahedronGeometry(gr, 1), stdMaterial('#6E8A5C', { roughness: 0.95 }), true)
      bush.position.set(gx, gr + 0.05, z + gz); add(bush)
    }
    for (let i = 0; i < 3; i++) {
      const stone = M(new THREE.BoxGeometry(0.6, 0.03, 0.5), matStone, true)
      stone.position.set(-7.7 + i * 0.55, 0.03, z); add(stone)
    }
    // 隔户：户外椅 / 小盆栽
    if (rng() < 0.5) {
      const chair = M(new THREE.BoxGeometry(0.5, 0.5, 0.5), matWood, true)
      chair.position.set(-6.5, 0.27, z + 0.7); add(chair)
    }
  }
  // 户界绿篱（9 道）
  for (const zb of ZB) {
    add(M(new THREE.BoxGeometry(2, 0.85, 0.12), matHedge, true)).position.set(-7, 0.43, zb)
  }
  // 前院带南北端封篱
  add(M(new THREE.BoxGeometry(2, 0.9, 0.12), matHedge, true)).position.set(-7, 0.45, 18)
  add(M(new THREE.BoxGeometry(2, 0.9, 0.12), matHedge, true)).position.set(-7, 0.45, -18)

  // ===================================================================
  // 门廊（风廊东西口 + 西山墙侧门）
  // ===================================================================
  // 西口（临湖，x=-8）
  for (const sz of [-1.3, 1.3]) {
    add(M(new THREE.BoxGeometry(0.26, 2.9, 0.26), matWall, true)).position.set(-8, 1.45, sz)
  }
  add(M(new THREE.BoxGeometry(0.32, 0.3, 2.86), matTile, true)).position.set(-8, 2.85, 0)
  add(M(new THREE.SphereGeometry(0.14, 10, 8), matLit, true)).position.set(-8, 2.4, 0)
  // 东口（朝东环带，x=7.5）
  for (const sz of [-1.3, 1.3]) {
    add(M(new THREE.BoxGeometry(0.26, 2.9, 0.26), matWall, true)).position.set(7.5, 1.45, sz)
  }
  add(M(new THREE.BoxGeometry(0.32, 0.3, 2.86), matTile, true)).position.set(7.5, 2.85, 0)
  add(M(new THREE.SphereGeometry(0.14, 10, 8), matLit, true)).position.set(7.5, 2.4, 0)
  // 北山墙侧门（西阶段，山墙内收至 17.0）+ 雨棚 + 台阶
  const sideDoor = M(new THREE.BoxGeometry(1.3, 2.2, 0.1), matDoorWood)
  sideDoor.position.set(-3.75, 1.15, 16.86); add(sideDoor)
  const sideAwning = M(new THREE.BoxGeometry(1.7, 0.12, 0.9), matMetal, true)
  sideAwning.position.set(-3.75, 2.5, 16.6); add(sideAwning)
  for (let i = 0; i < 2; i++) {
    const step = M(new THREE.BoxGeometry(1.6, 0.08, 0.45), matPave, true)
    step.position.set(-3.75, 0.04 + i * 0.08, 18.3 + i * 0.42); add(step)
  }
  const sideDoor2 = M(new THREE.BoxGeometry(1.3, 2.2, 0.1), matDoorWood)
  sideDoor2.position.set(-3.75, 1.15, -16.86); add(sideDoor2)
  const sideAwning2 = M(new THREE.BoxGeometry(1.7, 0.12, 0.9), matMetal, true)
  sideAwning2.position.set(-3.75, 2.5, -16.6); add(sideAwning2)
  for (let i = 0; i < 2; i++) {
    const step = M(new THREE.BoxGeometry(1.6, 0.08, 0.45), matPave, true)
    step.position.set(-3.75, 0.04 + i * 0.08, -18.3 - i * 0.42); add(step)
  }

  // ===================================================================
  // 景观
  // ===================================================================
  // 临湖矮栏杆（西环带外缘 x=-9.9，9 段）
  for (let i = 0; i < 9; i++) {
    const rail = B.railing({ w: 4, h: 1.05, color: '#9A978F' })
    rail.rotation.y = Math.PI / 2
    rail.position.set(-9.9, 0.06, -16 + i * 4); add(rail)
  }
  // 垂柳 5 棵（与院门错开）
  for (const z of [-16, -8, 0, 8, 16]) add(willow({ x: -9.1, z, scale: 0.92, rng }))
  // 临湖路灯 4
  for (const z of [-12, -4, 4, 12]) add(B.streetLamp({ x: -8.85, z, h: 4.6 }))
  // 长椅 3（朝湖）
  for (const z of [-14, -2, 10]) {
    const bench = B.bench({ x: -8.55, z, rotY: Math.PI / 2 }); add(bench)
  }
  // 北 / 南环带乔木各 2 + 路灯
  for (const x of [-5, 5]) {
    add(B.tree({ x, z: 18.7, scale: 0.9, seed: 5 }))
    add(B.tree({ x, z: -18.7, scale: 0.9, seed: 9 }))
  }
  for (const x of [-8, 8]) {
    add(B.streetLamp({ x, z: 18.6, h: 4.6 }))
    add(B.streetLamp({ x, z: -18.6, h: 4.6 }))
  }
  // 东环带花境：花灌木球（两侧错落，detail1 为主）
  for (let i = 0; i < 22; i++) {
    const vz = -17.5 + i * 1.66
    const vx = 8.55 + (i % 2) * 0.85
    const r = 0.34 + rng() * 0.18
    const bush = M(new THREE.IcosahedronGeometry(r, 1), stdMaterial(['#6E8A5C', '#7C9464', '#84A06C'][i % 3], { roughness: 0.95 }), true)
    bush.position.set(vx, r + 0.05, vz); add(bush)
  }
  // 东环带断续绿篱（沿 Z，不越宗地 X 界）
  for (const zc of [-13, -7, 7, 13]) add(B.hedge({ w: 1.1, d: 4, h: 0.8, x: 9, z: zc }))
  // 东环带路灯 + 长椅
  for (const z of [-10, 10]) add(B.streetLamp({ x: 8.8, z, h: 4.6 }))
  add(B.bench({ x: 8.5, z: 0, rotY: -Math.PI / 2 }))
  add(B.bench({ x: 8.5, z: -16, rotY: -Math.PI / 2 }))

  return root
}

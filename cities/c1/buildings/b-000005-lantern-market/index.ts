import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { umbrella } from '../../blocks/doubao-seed-2.1-pro/umbrella'
import { stairFlight, stairLanding } from '../../blocks/doubao-seed-2.1-pro/stair'

const M = (g: THREE.BufferGeometry, m: THREE.Material, site = false) => {
  const o = new THREE.Mesh(g, m)
  o.castShadow = true
  if (site) o.userData.site = true
  return o
}

// ---- 布篷三色（暖红 / 米白 / 墨绿，市集活泼）----
const AWNING = ['#B25B4A', '#E3D9C6', '#5A6B52']

/** 造型乔木：树干 + 5 颗 detail1 叶球。景观件。 */
function bigTree(o: { x: number; z: number; scale?: number; leaf?: string }): THREE.Object3D {
  const g = new THREE.Group()
  const trunk = M(new THREE.CylinderGeometry(0.16, 0.26, 2.0, 12), stdMaterial('#6B4A2F', { roughness: 0.9 }))
  trunk.position.y = 1.0; g.add(trunk)
  const leafCol = o.leaf ?? '#6E8A5C'
  const balls: Array<[number, number, number, number]> = [
    [0, 2.6, 0, 1.15], [0.7, 2.4, 0.3, 0.85], [-0.7, 2.5, -0.2, 0.9], [0.2, 3.3, -0.1, 0.8], [-0.2, 3.1, 0.6, 0.7],
  ]
  for (const [x, y, z, r] of balls) {
    const leaf = M(new THREE.IcosahedronGeometry(r, 1), stdMaterial(leafCol, { roughness: 0.92 }), true)
    leaf.position.set(x, y, z); g.add(leaf)
  }
  const s = o.scale ?? 1
  g.scale.set(s, s, s)
  g.position.set(o.x, 0, o.z)
  g.userData.site = true
  return g
}

/** 垂柳：主干 + 3 大球 detail1 树冠 + 8 垂枝。景观件。 */
function willow(o: { x: number; z: number; scale?: number }): THREE.Object3D {
  const g = new THREE.Group()
  const trunk = M(new THREE.CylinderGeometry(0.15, 0.28, 2.6, 10), stdMaterial('#6B5138', { roughness: 0.9 }))
  trunk.position.y = 1.3; g.add(trunk)
  const balls: Array<[number, number, number, number]> = [
    [0, 3.1, 0, 1.05], [0.65, 2.85, 0.25, 0.78], [-0.6, 2.9, -0.2, 0.82],
  ]
  for (const [x, y, z, r] of balls) {
    const leaf = M(new THREE.IcosahedronGeometry(r, 1), stdMaterial('#7C9460', { roughness: 0.95 }), true)
    leaf.position.set(x, y, z); g.add(leaf)
  }
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

  // ---- 材质（延续街区：白墙/黛瓦/暖木/暖窗）----
  const matGround = stdMaterial('#B5B2A8', { roughness: 0.95 })
  const matPave = stdMaterial('#CFCCC4', { roughness: 0.9 })
  const matStone = stdMaterial('#C3C8C6', { roughness: 0.92 })
  const matStoneDark = stdMaterial('#9EA3A1', { roughness: 0.95 })
  const matWall = stdMaterial('#ECE8DF', { roughness: 0.8 })
  const matPlinth = stdMaterial('#D8D3C8', { roughness: 0.88 })
  const matSlab = stdMaterial('#E2DED4', { roughness: 0.78 })
  const matWood = stdMaterial('#A9805A', { roughness: 0.85 })
  const matDoorWood = stdMaterial('#8A5E3C', { roughness: 0.82 })
  const matTile = stdMaterial('#47433F', { roughness: 0.85 })
  const matGlass = stdMaterial('#26405C', { metalness: 0.55, roughness: 0.18, emissive: '#0E1A2A', emissiveIntensity: 0.45 })
  const matMetal = stdMaterial('#8E8B84', { metalness: 0.6, roughness: 0.4 })
  const matDarkMetal = stdMaterial('#4E4C48', { metalness: 0.5, roughness: 0.5 })
  const matLawn = stdMaterial('#8C9E78', { roughness: 0.95 })
  const matLit = stdMaterial('#FFDCA0', { roughness: 0.5, emissive: '#FFC870', emissiveIntensity: 1.2 })
  const matWater = stdMaterial('#6E93A8', { metalness: 0.4, roughness: 0.15 })
  const matPaper = stdMaterial('#EDE8DA', { roughness: 0.9 })
  const awningMats = AWNING.map(c => stdMaterial(c, { roughness: 0.9 }))

  // 共享几何（大量复用处只建一次）
  const G = {
    stoneA: new THREE.BoxGeometry(0.42, 0.05, 0.58),
    stoneB: new THREE.BoxGeometry(0.42, 0.05, 0.58),
    floorBoard: new THREE.BoxGeometry(0.2, 0.05, 6),
    tileRoll: new THREE.CylinderGeometry(0.045, 0.045, 3.7, 20),
    smallRoll: new THREE.CylinderGeometry(0.04, 0.04, 1, 10),
    fruit: new THREE.IcosahedronGeometry(0.12, 1),
    leaf: new THREE.IcosahedronGeometry(0.28, 1),
  }

  // ===================================================================
  // 场地（宗地 40×20，全域）
  // ===================================================================
  const __p104 = M(new THREE.BoxGeometry(40, 0.04, 20), matGround)
  __p104.position.set(0, 0.02, 0)
  add(__p104)

  // 广场条石区 x[-18,12] z[-8,2]：错缝条石（避开喷泉/咖啡亭/树池）
  const inKiosk = (x: number, z: number) => x > -17.2 && x < -12.8 && z > -7.4 && z < -3.0
  const inFountain = (x: number, z: number) => (x + 3) ** 2 + (z + 3) ** 2 < 4.4
  const inTree = (x: number, z: number) => x > 5.0 && x < 8.0 && z > -7.0 && z < -4.0
  // 条石错缝：16 行 × 最多 68 列（约千块，避开喷泉/咖啡/树池）
  const rows = 16, cols = 68
  for (let r = 0; r < rows; r++) {
    const z = -7.75 + r * 0.62
    const shift = r % 2 ? 0.22 : 0
    for (let c = 0; c < cols; c++) {
      const x = -17.8 + shift + c * 0.45
      if (x > 11.7) continue
      if (inKiosk(x, z) || inFountain(x, z) || inTree(x, z)) continue
      const __p118 = M(r % 2 ? G.stoneA : G.stoneB, (r + c) % 3 ? matStone : matStoneDark, true)
      __p118.position.set(x, 0.045, z)
      add(__p118)
    }
  }

  // 西环带临湖步道石板 x=-19（2m，延续湖院）
  for (let r = 0; r < 23; r++) {
    for (let s = 0; s < 3; s++) {
      const slab = M(new THREE.BoxGeometry(0.6, 0.04, 0.82), r % 2 ? matStone : matStoneDark, true)
      slab.position.set(-19.65 + s * 0.63, 0.05, -8.6 + r * 0.78); add(slab)
    }
  }
  // 南环带沿街方砖 z=-9
  for (let r = 0; r < 44; r++) {
    for (let s = 0; s < 2; s++) {
      const brick = M(new THREE.BoxGeometry(0.86, 0.04, 0.9), r % 2 ? matPave : matStone, true)
      brick.position.set(-18.9 + r * 0.88, 0.045, -8.55 - s * 0.92); add(brick)
    }
  }
  // 北环带 / 东环带
  const __p137 = M(new THREE.BoxGeometry(40, 0.03, 2), matPave)
  __p137.position.set(0, 0.045, 9)
  add(__p137)
  const __p138 = M(new THREE.BoxGeometry(2, 0.03, 20), matPave)
  __p138.position.set(19, 0.045, 0)
  add(__p138)

  // ===================================================================
  // 北翼 · 邻里市集大厅 z[2,8]（36×6，檐口 9.6，双坡顶至 12）
  // ===================================================================
  const hall = new THREE.Group()
  // 石台基（0.15）+ 木铺地（200 道条板沿 Z）
  const __p145 = M(new THREE.BoxGeometry(36, 0.15, 6), matPlinth)
  __p145.position.set(0, 0.075, 5)
  hall.add(__p145)
  for (let i = 0; i < 176; i++) {
    const b = M(G.floorBoard, i % 5 ? matWood : matDoorWood, true)
    b.position.set(-17.5 + i * 0.2, 0.175, 5); hall.add(b)
  }
  // 南立面石台（朝广场 0.15 过渡，长条石沿）
  const __p151 = M(new THREE.BoxGeometry(36, 0.15, 0.35), matPlinth)
  __p151.position.set(0, 0.075, 1.85)
  hall.add(__p151)

  // 北墙 z≈8：白墙 9.3（厚 .18 收进退线）+ 7 高窗 + 中央次入口
  const __p154 = M(new THREE.BoxGeometry(36, 9.3, 0.18), matWall)
  __p154.position.set(0, 4.65, 7.95)
  hall.add(__p154)
  for (let i = 0; i < 7; i++) {
    const x = -15.4 + i * 5.13
    const win = M(new THREE.BoxGeometry(1.5, 2.1, 0.08), matGlass)
    win.position.set(x, 6.3, 7.84); hall.add(win)
    for (const [dx, dy] of [[-0.78, 0], [0.78, 0], [0, -1.08], [0, 1.08]]) {
      const bar = M(new THREE.BoxGeometry(0.08, 0.08, 0.08), matDoorWood)
      bar.position.set(x + dx, 6.3 + dy, 7.82); hall.add(bar)
    }
  }
  // 次入口（北墙中央）：双开木门 + 金属雨棚 + 台阶
  const __p165 = M(new THREE.BoxGeometry(2.6, 2.8, 0.1), matDoorWood)
  __p165.position.set(0, 1.4, 7.86)
  hall.add(__p165)
  const __p166 = M(new THREE.BoxGeometry(3.2, 0.12, 0.5), matMetal)
  __p166.position.set(0, 3.0, 7.72)
  hall.add(__p166)
  for (let i = 0; i < 2; i++) {
    const __p168 = M(new THREE.BoxGeometry(3.0, 0.08, 0.5), matPave, true)
    __p168.position.set(0, 0.04 + i * 0.08, 8.6 + i * 0.42)
    hall.add(__p168)
  }

  // 东西山墙 x=±18（五边形随双坡）
  for (const side of [1, -1]) {
    const shape = new THREE.Shape()
    shape.moveTo(-3, 0); shape.lineTo(-3, 9.6); shape.lineTo(0, 12); shape.lineTo(3, 9.6); shape.lineTo(3, 0); shape.closePath()
    const gable = M(new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false, steps: 1 }), matWall)
    gable.rotation.y = Math.PI / 2
    gable.position.set(side * 17.7, 0, 5); hall.add(gable)
    // 山墙圆拱小窗（贴山墙面）
    const oculus = M(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 16), matGlass)
    oculus.rotation.x = Math.PI / 2
    oculus.position.set(side * 17.4, 10.4, 5); hall.add(oculus)
  }

  // 双坡黛瓦顶：两片坡板 + 瓦垄（163 道/坡 ×2）+ 封檐 + 檐沟 + 脊
  const pitch = Math.atan2(2.4, 3)
  for (const side of [1, -1]) {
    // 坡板（宽 35.8 收进退线）
    const plate = M(new THREE.BoxGeometry(35.8, 0.1, 3.72), matTile)
    plate.rotation.x = side === 1 ? pitch : -pitch
    plate.position.set(0, 10.8, side === 1 ? 6.5 : 3.5); hall.add(plate)
    // 瓦垄（顺坡：每道沿脊→檐方向，X 向每 .16m 一道并排，226 道/坡）
    const n = 225
    for (let i = 0; i <= n; i++) {
      const roll = M(G.tileRoll, matTile, true)
      // Y 轴圆柱绕 X 倾贴坡面：北坡高端朝脊(-Z)用 -pitch，南坡用 +pitch
      roll.rotation.x = side === 1 ? -pitch : pitch
      const lx = -18.2 + (i / n) * 36.4
      roll.position.set(lx, 10.86, side === 1 ? 6.5 : 3.5)
      hall.add(roll)
    }
    // 封檐板 + 檐沟
    const __p202 = M(new THREE.BoxGeometry(35.8, 0.24, 0.12), matTile)
    __p202.position.set(0, 9.52, side === 1 ? 7.9 : 1.9)
    hall.add(__p202)
    const __p203 = M(new THREE.CylinderGeometry(0.07, 0.07, 35.8, 10), matDarkMetal, true)
    __p203.rotation.z = Math.PI / 2
    __p203.position.set(0, 9.42, side === 1 ? 8.12 : 1.88)
    hall.add(__p203)
  }
  // 屋脊盖瓦
  const __p206 = M(new THREE.CylinderGeometry(0.12, 0.12, 35.8, 14), matTile, true)
  __p206.rotation.z = Math.PI / 2
  __p206.position.set(0, 12.02, 5)
  hall.add(__p206)

  // 木桁架（8 榀，露明）：双斜梁 + 水平系梁 + 中柱
  for (let i = 0; i < 8; i++) {
    const x = -15.7 + i * 4.5
    const tr = new THREE.Group()
    for (const z of [3.1, 6.9]) {
      // 斜梁：南坡(中点3.1)高端朝脊(+Z)用 -pitch；北坡(6.9)用 +pitch
      const rafter = M(new THREE.BoxGeometry(0.14, 0.14, 2.6), matDoorWood)
      rafter.rotation.x = z < 5 ? -pitch : pitch
      rafter.position.set(0, 10.7, z - 5)
      tr.add(rafter)
    }
    const __p219 = M(new THREE.BoxGeometry(0.12, 0.12, 5.6), matDoorWood)
    __p219.position.set(0, 9.75, 0)
    tr.add(__p219)
    const __p220 = M(new THREE.BoxGeometry(0.12, 2.2, 0.12), matDoorWood)
    __p220.position.set(0, 10.9, 0)
    tr.add(__p220)
    tr.position.set(x, 0, 5); hall.add(tr)
  }

  // ---- 南立面 7 跨石拱廊（z=2，墙厚 .4）----
  const segW = 36 / 7
  for (let i = 0; i < 7; i++) {
    const x = -18 + segW * (i + 0.5)
    const arch = B.archWall({ w: segW - 0.08, h: 6.6, archW: 4.0, archH: 5.4, depth: 0.4, color: '#C3C8C6' })
    arch.position.set(x, 0.15, 1.85); hall.add(arch)
    // 墩帽 ×2
    for (const dx of [-(segW / 2 - 0.18), segW / 2 - 0.18]) {
      const cap = M(new THREE.BoxGeometry(0.42, 0.16, 0.5), matStone)
      cap.position.set(x + dx, 5.95, 2.05); hall.add(cap)
    }
    // 拱顶石
    const key = M(new THREE.BoxGeometry(0.26, 0.42, 0.52), matStoneDark)
    key.position.set(x, 5.7, 2.1); hall.add(key)
  }

  // ---- 拱廊内 7 固定摊位（z≈5.3，与拱跨对齐）----
  const potGeo = new THREE.LatheGeometry(
    [new THREE.Vector2(0.12, 0), new THREE.Vector2(0.2, 0.08), new THREE.Vector2(0.22, 0.4), new THREE.Vector2(0.16, 0.56), new THREE.Vector2(0.1, 0.6)],
    14,
  )
  // 夜市灯：挂灯泡 + 篷下暖光板（材质/几何循环外建一次）
  const bulbMat = stdMaterial('#FFE6B0', { roughness: 0.4, emissive: '#FFD080', emissiveIntensity: 1.6 })
  const stallWarmMat = stdMaterial('#FFDCA0', { roughness: 0.6, emissive: '#FFC870', emissiveIntensity: 0.9 })
  const bulbGeo = new THREE.SphereGeometry(0.09, 10, 8)
  for (let i = 0; i < 7; i++) {
    const x = -18 + segW * (i + 0.5)
    const st = new THREE.Group()
    const am = awningMats[i % 3]
    // 木台
    const __p250 = M(new THREE.BoxGeometry(3.0, 0.85, 0.9), matWood)
    __p250.position.set(0, 0.58, -0.9)
    st.add(__p250)
    const __p251 = M(new THREE.BoxGeometry(3.0, 0.3, 0.06), matDoorWood)
    __p251.position.set(0, 0.75, -1.36)
    st.add(__p251)
    // 四篷柱
    for (const [px, pz] of [[-1.35, -0.3], [1.35, -0.3], [-1.35, -2.0], [1.35, -2.0]]) {
      const __p254 = M(new THREE.BoxGeometry(0.1, 3.1, 0.1), matDoorWood)
      __p254.position.set(px, 1.7, pz)
      st.add(__p254)
    }
    // 双坡布篷：两斜板 + 脊 + 条纹 + 檐 scallop
    for (const side of [1, -1]) {
      const cloth = M(new THREE.BoxGeometry(3.1, 0.06, 0.95), am, true)
      cloth.rotation.x = side * 0.5
      cloth.position.set(0, 2.9, side * 0.42); st.add(cloth)
      // 条纹 ×3
      for (let k = 0; k < 3; k++) {
        const stripe = M(new THREE.BoxGeometry(3.12, 0.02, 0.07), awningMats[(i + 1) % 3], true)
        stripe.rotation.x = side * 0.5
        stripe.position.set(0, 2.92, side * (0.15 + k * 0.25)); st.add(stripe)
      }
    }
    const __p268 = M(new THREE.CylinderGeometry(0.06, 0.06, 3.1, 8), am, true)
    __p268.position.set(0, 3.12, 0)
    st.add(__p268)
    const __p301 = M(new THREE.CylinderGeometry(0.05, 0.05, 3.1, 8, 1, true, 0, Math.PI), am, true)
    __p301.rotation.x = Math.PI / 2
    st.add(__p301)
    // 货品（确定性随摊变化）
    const kind = i % 3
    if (kind === 0) {
      // 果筐 + 果球
      const __p274 = M(new THREE.CylinderGeometry(0.42, 0.34, 0.35, 10), matWood)
      __p274.position.set(-0.8, 1.2, -0.9)
      st.add(__p274)
      for (let k = 0; k < 6; k++) {
        const __f = M(G.fruit, stdMaterial(['#B25B4A', '#D98E4A', '#C9A227'][k % 3], { roughness: 0.85 }), true)
        __f.position.set(-1.05 + (k % 3) * 0.22, 1.42 + Math.floor(k / 3) * 0.12, -0.75 - Math.floor(k / 3) * 0.18)
        st.add(__f)
      }
    } else if (kind === 1) {
      // 陶罐（Lathe）+ 麻袋
      const pot = M(potGeo, stdMaterial('#B07A52', { roughness: 0.9 }), true)
      pot.position.set(-0.9, 1.0, -0.9); st.add(pot)
      for (const [px, pz] of [[0.2, -0.5], [0.7, -1.1]]) {
        const sack = M(new THREE.IcosahedronGeometry(0.28, 1), stdMaterial('#C8BFA8', { roughness: 0.95 }), true)
        sack.scale.y = 0.8; sack.position.set(px, 1.23, pz); st.add(sack)
      }
    } else {
      // 面包盘 + 面包
      const __p289 = M(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 14), matDoorWood)
      __p289.position.set(-0.8, 1.05, -0.9)
      st.add(__p289)
      for (let k = 0; k < 4; k++) {
        const bun = M(new THREE.IcosahedronGeometry(0.14, 1), stdMaterial('#C99A5B', { roughness: 0.9 }), true)
        bun.scale.y = 0.6; bun.position.set(-1.05 + (k % 2) * 0.3, 1.18, -0.75 - Math.floor(k / 2) * 0.22); st.add(bun)
      }
      // 花桶
      const __p295 = M(new THREE.CylinderGeometry(0.2, 0.16, 0.3, 10), matMetal)
      __p295.position.set(0.8, 1.18, -0.6)
      st.add(__p295)
      for (let k = 0; k < 3; k++) {
        const stem = M(new THREE.CylinderGeometry(0.01, 0.01, 0.35, 5), matLawn, true)
        stem.position.set(0.72 + k * 0.08, 1.4, -0.6); st.add(stem)
        const bloom = M(new THREE.IcosahedronGeometry(0.06, 1), stdMaterial(['#E3B7C4', '#D98E8E', '#E3CF8F'][k], { roughness: 0.9 }), true)
        bloom.position.set(0.72 + k * 0.08, 1.6, -0.6); st.add(bloom)
      }
    }
    // 小招牌（杆+木牌）
    const __p304 = M(new THREE.BoxGeometry(0.07, 1.0, 0.07), matDoorWood)
    __p304.position.set(1.25, 1.7, -1.9)
    st.add(__p304)
    const __p305 = M(new THREE.BoxGeometry(0.6, 0.34, 0.05), matDoorWood, true)
    __p305.position.set(1.25, 2.15, -1.92)
    st.add(__p305)
    // ---- 摊位附加细节：悬挂架（挂钩+干花束）、台下货箱麻袋、价签、加一筐货 ----
    for (const px of [-1.3, 1.3]) {
      const hp = M(new THREE.BoxGeometry(0.08, 1.7, 0.08), matDoorWood)
      hp.position.set(px, 1.55, -1.75); st.add(hp)
    }
    const hb = M(new THREE.BoxGeometry(2.7, 0.08, 0.08), matDoorWood)
    hb.position.set(0, 2.4, -1.75); st.add(hb)
    for (let k = 0; k < 3; k++) {
      const hx = -0.9 + k * 0.9
      const hook = M(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 6), matMetal, true)
      hook.position.set(hx, 2.28, -1.75); st.add(hook)
      for (let s = 0; s < 3; s++) {
        const stem = M(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 5), matLawn, true)
        stem.position.set(hx - 0.06 + s * 0.06, 2.05, -1.75); st.add(stem)
      }
      const bundle = M(new THREE.IcosahedronGeometry(0.1, 1), stdMaterial(['#E3B7C4', '#D9A2B0', '#E3CF8F'][(i + k) % 3], { roughness: 0.9 }), true)
      bundle.position.set(hx, 2.22, -1.75); st.add(bundle)
    }
    // 台下货箱 ×2 / 麻袋 ×2
    for (let k = 0; k < 4; k++) {
      const [bx, bz] = [[-0.9, -0.7], [0.9, -0.7], [-0.2, -1.2], [0.6, -1.2]][k]
      const crate = k < 2
        ? M(new THREE.BoxGeometry(0.45, 0.4, 0.4), matWood, true)
        : M(new THREE.IcosahedronGeometry(0.26, 1), stdMaterial('#C8BFA8', { roughness: 0.95 }), true)
      crate.position.set(bx, k < 2 ? 0.2 : 1.05, bz); st.add(crate)
    }
    // 价签 ×3
    for (let k = 0; k < 3; k++) {
      const tag = M(new THREE.BoxGeometry(0.18, 0.13, 0.02), matPaper, true)
      tag.position.set(-1.1 + k * 1.1, 1.05, -0.42); st.add(tag)
    }
    // 加一筐货（果筐 + 6 果球）
    const exBasket = M(new THREE.CylinderGeometry(0.4, 0.33, 0.32, 10), matWood, true)
    exBasket.position.set(1.05, 1.2, -0.85); st.add(exBasket)
    for (let k = 0; k < 6; k++) {
      const fr = M(G.fruit, stdMaterial(['#B25B4A', '#D98E4A', '#C9A227'][k % 3], { roughness: 0.85 }), true)
      fr.position.set(0.8 + (k % 3) * 0.22, 1.4 + Math.floor(k / 3) * 0.12, -0.7 - Math.floor(k / 3) * 0.18); st.add(fr)
    }
    // ---- 夜市灯：横杆中央挂灯泡 + 短杆 + 篷下暖光板（夜间每摊亮一盏）----
    const lampCord = M(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 5), matMetal, true)
    lampCord.position.set(0, 2.28, -1.55); st.add(lampCord)
    const bulb = M(bulbGeo, bulbMat, true)
    bulb.position.set(0, 2.1, -1.55); st.add(bulb)
    const warmPanel = M(new THREE.BoxGeometry(1.4, 0.05, 0.5), stallWarmMat, true)
    warmPanel.position.set(0, 1.95, -0.9); st.add(warmPanel)
    st.position.set(x, 0.15, 5.3); hall.add(st)
  }

  root.add(hall)

  // ===================================================================
  // 东翼 · 社区中心 x[12,18]（6×16，两层 8.4，平顶）
  // ===================================================================
  const cc = new THREE.Group()
  // 楼板 y=0.15 / 4.5 / 8.4
  const __p316 = M(new THREE.BoxGeometry(6, 0.15, 16), matPlinth)
  __p316.position.set(15, 0.075, 0)
  cc.add(__p316)
  const __p317 = M(new THREE.BoxGeometry(6, 0.25, 16), matSlab)
  __p317.position.set(15, 4.5, 0)
  cc.add(__p317)
  const __p318 = M(new THREE.BoxGeometry(6, 0.25, 16), matSlab)
  __p318.position.set(15, 8.4, 0)
  cc.add(__p318)
  // 东墙 x=18（每层 3 小窗）
  const __p320 = M(new THREE.BoxGeometry(0.2, 8.1, 16), matWall)
  __p320.position.set(17.9, 4.05, 0)
  cc.add(__p320)
  for (let f = 0; f < 2; f++) {
    for (const z of [-5, 0, 5]) {
      const win = M(new THREE.BoxGeometry(0.08, 1.5, 1.2), matGlass)
      win.position.set(17.83, f === 0 ? 2.25 : 6.4, z); cc.add(win)
    }
  }
  // 南墙 z=-8（烘焙窗口 + 侧门 + 二层 2 窗）
  const __p328 = M(new THREE.BoxGeometry(6, 8.1, 0.2), matWall)
  __p328.position.set(15, 4.05, -7.9)
  cc.add(__p328)
  const __p329 = M(new THREE.BoxGeometry(1.8, 1.3, 0.1), matGlass)
  __p329.position.set(13.4, 1.6, -7.83)
  cc.add(__p329)
  // 百叶窗板（打开斜撑）
  const __p331 = M(new THREE.BoxGeometry(1.8, 1.3, 0.05), matDoorWood, true)
  __p331.position.set(13.4, 2.5, -7.5)
  cc.add(__p331)
  const __p332 = M(new THREE.BoxGeometry(0.05, 0.7, 0.05), matDoorWood, true)
  __p332.position.set(14.2, 2.1, -7.7)
  cc.add(__p332)
  const __p333 = M(new THREE.BoxGeometry(1.0, 2.2, 0.1), matDoorWood)
  __p333.position.set(16.6, 1.1, -7.83)
  cc.add(__p333)
  for (const x of [13.5, 16.5]) {
    const __p335 = M(new THREE.BoxGeometry(1.3, 1.5, 0.08), matGlass)
    __p335.position.set(x, 6.3, -7.83)
    cc.add(__p335)
  }
  // 西立面 x=12：木外廊（挑 1.8，柱列 x=10.3）+ 密梃玻璃窗
  const __p338 = M(new THREE.BoxGeometry(0.3, 8.1, 16), matWall)
  __p338.position.set(12, 4.05, 0)
  cc.add(__p338)
  for (const z of [-6.4, -3.2, 3.2, 6.4]) {
    for (let f = 0; f < 2; f++) {
      const y = f === 0 ? 2.1 : 6.2
      const win = M(new THREE.BoxGeometry(0.08, 2.5, 2.4), matGlass)
      win.position.set(11.83, y, z); cc.add(win)
      // 竖梃 ×3 + 横梃
      for (const dz of [-0.8, 0.8]) {
        const __p346 = M(new THREE.BoxGeometry(0.1, 2.6, 0.07), matDoorWood)
        __p346.position.set(11.78, y, z + dz)
        cc.add(__p346)
      }
      // 跨内中梃 ×2
      for (const mz of [-0.4, 0.4]) {
        const midT = M(new THREE.BoxGeometry(0.08, 2.5, 0.06), matDoorWood)
        midT.position.set(11.77, y, z + mz); cc.add(midT)
      }
      const __p348 = M(new THREE.BoxGeometry(0.1, 0.09, 2.4), matDoorWood)
      __p348.position.set(11.78, y, z)
      cc.add(__p348)
    }
  }
  // 中央入口门廊（z=0）：双开木门通高 + 雨棚 + 台阶
  const __p352 = M(new THREE.BoxGeometry(0.1, 3.4, 1.8), matDoorWood)
  __p352.position.set(11.8, 1.9, 0)
  cc.add(__p352)
  const __p353 = M(new THREE.BoxGeometry(2.4, 0.14, 2.2), matMetal)
  __p353.position.set(10.9, 3.5, 0)
  cc.add(__p353)
  for (let i = 0; i < 3; i++) {
    const __p355 = M(new THREE.BoxGeometry(2.2, 0.08, 0.5), matPave, true)
    __p355.position.set(10.9, 0.04 + i * 0.08, -0.2 - i * 0.42)
    cc.add(__p355)
  }
  // 外廊柱列（6 根，承廊顶）+ 廊顶（二层阳台板）
  for (const z of [-6.4, -3.2, 0, 3.2, 6.4]) {
    const __p359 = M(new THREE.BoxGeometry(0.16, 4.2, 0.16), matDoorWood)
    __p359.position.set(10.3, 2.1, z)
    cc.add(__p359)
  }
  const __p361 = M(new THREE.BoxGeometry(1.9, 0.15, 15.6), matSlab)
  __p361.position.set(11.15, 4.2, 0)
  cc.add(__p361)
  // 二层阳台栏杆（沿外廊外缘）
  for (const z of [-4.8, 0, 4.8]) {
    const rail = B.railing({ w: 4.6, h: 1.0, color: '#9A6E4A' })
    rail.position.set(10.3, 4.3, z); cc.add(rail)
  }

  // 室内折返楼梯（东南角 x[14.5,17], z[-7,-4]）：首层 4.2 层高 / 二层 3.9 层高
  const ccStair = (y0: number, rise: number, rColor: string) => {
    const g = new THREE.Group()
    const half = rise / 2
    const run1 = stairFlight({ w: 1.05, run: 2.2, rise: half, steps: 9, y0, color: rColor })
    run1.position.set(15.2, 0, -4.5); g.add(run1)
    const lp = stairLanding({ w: 1.15, d: 1.1, y0: y0 + half })
    lp.position.set(15.2, 0, -5.9); g.add(lp)
    const run2 = stairFlight({ w: 1.05, run: 2.2, rise: half, steps: 9, y0: y0 + half, color: rColor })
    run2.rotation.y = Math.PI
    run2.position.set(16.4, 0, -5.1); g.add(run2)
    return g
  }
  cc.add(ccStair(0.15, 4.2, '#D9D5CC'))
  cc.add(ccStair(4.35, 3.9, '#D9D5CC'))

  // ---- 屋顶社区露台 y=8.4 ----
  // 木甲板条板（西半，x[12,15]，沿 Z 顺铺 33 道，间距 .085）
  for (let i = 0; i < 33; i++) {
    const __p387 = M(new THREE.BoxGeometry(0.075, 0.05, 15), matWood, true)
    __p387.position.set(12.1 + i * 0.088, 8.5, 0)
    cc.add(__p387)
  }
  // 草皮东半
  const __p390 = M(new THREE.BoxGeometry(2.8, 0.06, 15), matLawn, true)
  __p390.position.set(16.5, 8.48, 0)
  cc.add(__p390)
  // 盆栽灌木 ×6
  for (const [x, z, c] of [[13.0, -5.5, '#6E8A5C'], [14.3, -1.5, '#7C9464'], [12.8, 2.5, '#84A06C'], [16.2, 5.5, '#6E8A5C'], [17.0, -5.0, '#7C9464'], [16.4, 0.5, '#84A06C']] as const) {
    const __p393 = M(new THREE.CylinderGeometry(0.26, 0.21, 0.38, 12), stdMaterial('#B07A52'), true)
    __p393.position.set(x, 8.7, z)
    cc.add(__p393)
    const __p394 = M(new THREE.IcosahedronGeometry(0.4, 1), stdMaterial(c, { roughness: 0.9 }), true)
    __p394.position.set(x, 9.3, z)
    cc.add(__p394)
  }
  // 周边栏杆（南/北/西三缘；东缘邻东环带）
  const railS = B.railing({ w: 5.6, h: 1.05, color: '#9A978F' })
  railS.position.set(15, 8.55, -7.7); cc.add(railS)
  const railN = B.railing({ w: 5.6, h: 1.05, color: '#9A978F' })
  railN.position.set(15, 8.55, 7.7); cc.add(railN)
  const railW = B.railing({ w: 15.4, h: 1.05, color: '#9A978F' })
  railW.rotation.y = Math.PI / 2; railW.position.set(12.3, 8.55, 0); cc.add(railW)
  const railE = B.railing({ w: 15.4, h: 1.05, color: '#9A978F' })
  railE.rotation.y = Math.PI / 2; railE.position.set(17.7, 8.55, 0); cc.add(railE)
  // 露台桌椅 2 组
  for (const [x, z] of [[13.6, -3], [13.4, 4]]) {
    const __p407 = M(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 14), matWood, true)
    __p407.position.set(x, 9.2, z)
    cc.add(__p407)
    const __p408 = M(new THREE.CylinderGeometry(0.05, 0.06, 0.66, 8), matMetal, true)
    __p408.position.set(x, 8.85, z)
    cc.add(__p408)
  }

  root.add(cc)

  // ===================================================================
  // L 拐角钟楼（东北，4.5 见方，中心 (15.75,5.5)，檐 11.4 + 尖顶至 15）
  // ===================================================================
  const ct = new THREE.Group()
  // 钟楼中心：西移 .75、南移 .2——为钟盘凸出留退线余量（塔缘 x17.2/z7.5）
  const cxT = 15.0, czT = 5.3
  // 四面塔墙：南北 archWall（底层贯通拱门），东西实墙
  const southW = B.archWall({ w: 4.5, h: 11.4, archW: 1.9, archH: 3.3, depth: 0.35, color: '#ECE8DF' })
  southW.position.set(cxT, 0, czT - 2.25); ct.add(southW)
  const northW = B.archWall({ w: 4.5, h: 11.4, archW: 1.9, archH: 3.3, depth: 0.35, color: '#ECE8DF' })
  northW.rotation.y = Math.PI; northW.position.set(cxT, 0, czT + 2.25); ct.add(northW)
  for (const side of [1, -1]) {
    const __p424 = M(new THREE.BoxGeometry(0.35, 11.4, 4.5), matWall)
    __p424.position.set(cxT + side * 2.25, 5.7, czT)
    ct.add(__p424)
  }
  // 隅石（四角 × 7 层，交替长短）
  for (let i = 0; i < 7; i++) {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const q = M(new THREE.BoxGeometry(0.42, i % 2 ? 0.5 : 0.7, 0.42), matPlinth)
      q.position.set(cxT + sx * 2.2, 0.6 + i * 1.5, czT + sz * 2.2); ct.add(q)
    }
  }
  // 楼层线脚（9m 以下两圈挑石，每面 3 块）
  for (const y of [4.0, 8.6]) {
    for (let k = -1; k <= 1; k++) {
      const __p436 = M(new THREE.BoxGeometry(1.3, 0.14, 0.3), matStone)
      __p436.position.set(cxT + k * 1.45, y, czT - 2.3)
      ct.add(__p436)
      const __p437 = M(new THREE.BoxGeometry(1.3, 0.14, 0.3), matStone)
      __p437.position.set(cxT + k * 1.45, y, czT + 2.3)
      ct.add(__p437)
      const __p438 = M(new THREE.BoxGeometry(0.3, 0.14, 1.3), matStone)
      __p438.position.set(cxT - 2.3, y, czT + k * 1.45)
      ct.add(__p438)
      const __p439 = M(new THREE.BoxGeometry(0.3, 0.14, 1.3), matStone)
      __p439.position.set(cxT + 2.3, y, czT + k * 1.45)
      ct.add(__p439)
    }
  }
  // 四面钟（y≈9.3）：钟盘 + 12 刻度 + 时分针
  // 钟盘 r=.5（贴塔缘：东盘外缘 17.7、北盘 8.0，在退线内）
  const clockFace = (px: number, pz: number, ry: number) => {
    const g = new THREE.Group()
    const __p545 = M(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 28), stdMaterial('#F5F1E6', { roughness: 0.6 }))
    __p545.position.y = 0
    g.add(__p545)
    const ring = M(new THREE.TorusGeometry(0.5, 0.05, 8, 28), matDarkMetal)
    ring.rotation.x = Math.PI / 2; g.add(ring)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const tick = M(new THREE.BoxGeometry(i % 3 === 0 ? 0.07 : 0.045, i % 3 === 0 ? 0.14 : 0.09, 0.05), matDarkMetal)
      tick.position.set(Math.sin(a) * 0.4, Math.cos(a) * 0.4, 0.06); g.add(tick)
    }
    const hour = M(new THREE.BoxGeometry(0.06, 0.28, 0.04), matDarkMetal)
    hour.position.set(0.09, 0.09, 0.07); hour.rotation.z = -0.6; g.add(hour)
    const minute = M(new THREE.BoxGeometry(0.04, 0.4, 0.04), matDarkMetal)
    minute.position.set(-0.08, -0.08, 0.07); minute.rotation.z = 0.5; g.add(minute)
    g.rotation.x = Math.PI / 2
    g.rotation.y = ry
    g.position.set(px, 9.3, pz)
    ct.add(g)
  }
  // 钟盘贴塔身四面外缘（塔缘 x±2.2、z±2.2）
  clockFace(cxT, czT - 2.2, 0)
  clockFace(cxT, czT + 2.2, Math.PI)
  clockFace(cxT - 2.2, czT, -Math.PI / 2)
  clockFace(cxT + 2.2, czT, Math.PI / 2)
  // 钟室百叶（四面，y10–11，每面 6 斜片）
  for (const [px, pz, ry] of [[cxT, czT - 2.3, 0], [cxT, czT + 2.3, Math.PI], [cxT - 2.3, czT, -Math.PI / 2], [cxT + 2.3, czT, Math.PI / 2]] as const) {
    for (let i = 0; i < 6; i++) {
      const louver = M(new THREE.BoxGeometry(0.09, 0.5, 0.12), matDoorWood, true)
      const g = new THREE.Group(); g.add(louver); g.position.set(px - 0.55 + i * 0.22, 10.5, pz); g.rotation.y = ry
      louver.rotation.x = 0.5
      ct.add(g)
    }
  }
  // 四坡尖顶 11.4–15（4 棱锥黛瓦）：thetaStart π/4 使锥底顶点落斜角，
  // boundingBox 直接 ±2.47（R2 不会被盒角变换高估）；与 spire.rotation.y=π/4 视觉等价
  const spire = M(new THREE.CylinderGeometry(0, 3.5, 3.6, 4, 1, false, Math.PI / 4), matTile)
  spire.position.set(cxT, 13.2, czT); ct.add(spire)
  // 四坡瓦垄（每坡 7 道，沿坡；坡面朝向东南西北）
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2
    for (let k = 0; k < 7; k++) {
      const roll = M(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 10), matTile, true)
      const off = -1.05 + k * 0.35
      // YXZ 顺序：先绕 X 倾(0.8≈坡角)再绕 Y 转坡面方位；Y 端水平朝向 (sin,cos) 即向外
      roll.rotation.order = 'YXZ'
      roll.rotation.y = ang
      roll.rotation.x = 0.8
      roll.position.set(cxT + Math.sin(ang) * (1.4 + Math.abs(off) * 0.3), 13.2 - Math.abs(off) * 0.35 + 0.3, czT + Math.cos(ang) * (1.4 + Math.abs(off) * 0.3))
      ct.add(roll)
    }
  }
  // 檐口封边（11.4 一圈挑檐）
  const __p493 = M(new THREE.BoxGeometry(5.0, 0.18, 5.0), matTile)
  __p493.position.set(cxT, 11.35, czT)
  ct.add(__p493)
  // 顶端风铃 + 风标
  const __p495 = M(new THREE.SphereGeometry(0.12, 10, 8), matLit, true)
  __p495.position.set(cxT, 15.2, czT)
  ct.add(__p495)
  const __p496 = M(new THREE.CylinderGeometry(0.03, 0.04, 1.2, 8), matDarkMetal, true)
  __p496.position.set(cxT, 15.7, czT)
  ct.add(__p496)
  const __p497 = M(new THREE.BoxGeometry(0.5, 0.08, 0.04), matDarkMetal, true)
  __p497.position.set(cxT, 16.25, czT)
  ct.add(__p497)

  root.add(ct)

  // ===================================================================
  // 西南街角咖啡亭（独立，3.6 见方，中心 (-15,-5.2)，高约 4m）
  // ===================================================================
  const kf = new THREE.Group()
  // 石台基
  const __p506 = M(new THREE.BoxGeometry(3.9, 0.15, 3.9), matPlinth)
  __p506.position.set(-15, 0.075, -5.2)
  kf.add(__p506)
  // 四角木柱
  for (const [px, pz] of [[-16.6, -6.8], [-13.4, -6.8], [-16.6, -3.6], [-13.4, -3.6]]) {
    const __p509 = M(new THREE.BoxGeometry(0.16, 3.1, 0.16), matDoorWood)
    __p509.position.set(px, 1.7, pz)
    kf.add(__p509)
  }
  // 西北两面下墙 + 上玻
  const __p512 = M(new THREE.BoxGeometry(3.2, 1.0, 0.12), matWall)
  __p512.position.set(-15, 0.75, -6.75)
  kf.add(__p512)
  const __p513 = M(new THREE.BoxGeometry(3.2, 1.3, 0.08), matGlass)
  __p513.position.set(-15, 2.25, -6.75)
  kf.add(__p513)
  const __p514 = M(new THREE.BoxGeometry(0.12, 1.0, 3.2), matWall)
  __p514.position.set(-16.75, 0.75, -5.2)
  kf.add(__p514)
  const __p515 = M(new THREE.BoxGeometry(0.08, 1.3, 3.2), matGlass)
  __p515.position.set(-16.75, 2.25, -5.2)
  kf.add(__p515)
  // 东南两面：活动木门板（打开斜撑）×4
  for (const [px, pz, rz] of [[-15.8, -3.55, 0], [-14.2, -3.55, 0], [-13.55, -4.4, 1], [-13.55, -6.0, 1]] as const) {
    const panel = M(new THREE.BoxGeometry(rz === 1 ? 0.08 : 1.3, 2.2, rz === 1 ? 1.3 : 0.08), matDoorWood, true)
    panel.position.set(px, 1.25, pz); kf.add(panel)
  }
  // L 形木吧台（沿西、沿南）+ 高凳 ×3
  const __p522 = M(new THREE.BoxGeometry(0.6, 1.05, 2.4), matWood)
  __p522.position.set(-16.2, 0.7, -5.2)
  kf.add(__p522)
  const __p523 = M(new THREE.BoxGeometry(2.4, 1.05, 0.6), matWood)
  __p523.position.set(-15.2, 0.7, -6.2)
  kf.add(__p523)
  for (const [px, pz] of [[-15.6, -4.6], [-14.6, -6.8], [-16.8, -4.8]]) {
    const __p525 = M(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 12), matWood, true)
    __p525.position.set(px, 0.78, pz)
    kf.add(__p525)
    const __p526 = M(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8), matMetal, true)
    __p526.position.set(px, 0.4, pz)
    kf.add(__p526)
  }
  // 浓缩咖啡机 + 糕点柜
  const __p529 = M(new THREE.BoxGeometry(0.5, 0.5, 0.4), matMetal)
  __p529.position.set(-16.2, 1.5, -5.8)
  kf.add(__p529)
  const __p530 = M(new THREE.BoxGeometry(1.2, 0.7, 0.5), matDoorWood)
  __p530.position.set(-14.6, 1.1, -6.5)
  kf.add(__p530)
  const __p531 = M(new THREE.BoxGeometry(1.1, 0.3, 0.45), matGlass, true)
  __p531.position.set(-14.6, 1.5, -6.5)
  kf.add(__p531)
  // 四坡小顶（4.2 见方，h 1.3）
  const kroof = M(new THREE.CylinderGeometry(0, 2.95, 1.3, 4, 1, false, Math.PI / 4), matTile)
  kroof.position.set(-15, 3.95, -5.2); kf.add(kroof)
  // 小顶瓦垄 4×6（坡面朝向东南西北）
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2
    for (let k = 0; k < 6; k++) {
      const roll = M(G.smallRoll, matTile, true)
      roll.scale.z = 1.9
      // YXZ：坡角 0.41 + 方位角；向外朝向 (sin,cos)
      roll.rotation.order = 'YXZ'
      roll.rotation.y = ang
      roll.rotation.x = 0.41
      const off = -0.85 + k * 0.34
      roll.position.set(-15 + Math.sin(ang) * (1.1 + Math.abs(off) * 0.25), 3.9 - Math.abs(off) * 0.28, -5.2 + Math.cos(ang) * (1.1 + Math.abs(off) * 0.25))
      kf.add(roll)
    }
  }
  // 挑檐封板
  const __p551 = M(new THREE.BoxGeometry(4.4, 0.14, 4.4), matTile)
  __p551.position.set(-15, 3.34, -5.2)
  kf.add(__p551)
  // 招牌（挑木杆 + 木牌 + 暖光灯）
  const __p553 = M(new THREE.BoxGeometry(0.08, 0.7, 0.08), matDoorWood)
  __p553.position.set(-13.3, 2.9, -5.2)
  kf.add(__p553)
  const __p554 = M(new THREE.BoxGeometry(0.06, 0.5, 0.9), matDoorWood, true)
  __p554.position.set(-13.2, 2.9, -5.2)
  kf.add(__p554)
  const __p555 = M(new THREE.SphereGeometry(0.1, 10, 8), matLit, true)
  __p555.position.set(-13.1, 2.5, -5.6)
  kf.add(__p555)
  // 亭外花箱 ×2
  for (const [px, pz] of [[-17.0, -3.4], [-13.0, -7.0]]) {
    const __p558 = M(new THREE.BoxGeometry(0.5, 0.3, 0.3), matDoorWood, true)
    __p558.position.set(px, 0.3, pz)
    kf.add(__p558)
    const __p559 = M(G.leaf, matLawn, true)
    __p559.position.set(px, 0.62, pz)
    kf.add(__p559)
  }
  root.add(kf)

  // ===================================================================
  // 开放广场设施：喷泉 / 树池大树 / 花车×2 / 公告栏 / 矮灯柱×4 / 石凳×5
  // ===================================================================
  // ---- 石砌圆喷泉 中心 (-3,-3) ----
  const fq = new THREE.Group()
  const __p568 = M(new THREE.CylinderGeometry(1.75, 1.9, 0.55, 28), matStone)
  __p568.position.set(-3, 0.28, -3)
  fq.add(__p568)
  // 12 块分块盆沿石
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const block = M(new THREE.BoxGeometry(0.62, 0.22, 0.34), i % 2 ? matStone : matStoneDark, true)
    block.position.set(-3 + Math.sin(a) * 1.62, 0.62, -3 + Math.cos(a) * 1.62)
    block.rotation.y = a; fq.add(block)
  }
  // 内盆水面
  const __p577 = M(new THREE.CylinderGeometry(1.4, 1.4, 0.06, 24), matWater, true)
  __p577.position.set(-3, 0.5, -3)
  fq.add(__p577)
  // 中央水柱：石墩 + 顶盘 + 水柱 ×3
  const __p579 = M(new THREE.CylinderGeometry(0.28, 0.34, 0.7, 16), matStoneDark)
  __p579.position.set(-3, 0.8, -3)
  fq.add(__p579)
  const __p580 = M(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16), matStone)
  __p580.position.set(-3, 1.15, -3)
  fq.add(__p580)
  for (const [dx, dz, h] of [[0, 0, 0.9], [0.35, 0.15, 0.6], [-0.2, -0.3, 0.5]] as const) {
    const __jet = M(new THREE.CylinderGeometry(0.04, 0.04, h, 8), stdMaterial('#AFC6D4', { roughness: 0.15, emissive: '#8FB4C8', emissiveIntensity: 0.5 }), true)
    __jet.position.set(-3 + dx, 1.2 + h / 2, -3 + dz)
    fq.add(__jet)
  }
  // 喷泉灯：中央小球 + 池底 4 埋地暖灯
  const fqBulb = M(new THREE.SphereGeometry(0.08, 10, 8), bulbMat, true)
  fqBulb.position.set(-3, 1.3, -3); fq.add(fqBulb)
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4
    const ground = M(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 10), bulbMat, true)
    ground.position.set(-3 + Math.sin(a) * 1.05, 0.53, -3 + Math.cos(a) * 1.05); fq.add(ground)
  }
  // 水底石卵
  for (let i = 0; i < 6; i++) {
    const a = rng() * Math.PI * 2, r = 0.4 + rng() * 0.8
    const __p588 = M(new THREE.IcosahedronGeometry(0.1 + rng() * 0.06, 1), matStoneDark, true)
    __p588.position.set(-3 + Math.sin(a) * r, 0.55, -3 + Math.cos(a) * r)
    fq.add(__p588)
  }
  root.add(fq)

  // ---- 方池大树 (6.5,-5.5) ----
  const tp = new THREE.Group()
  for (const [bx, bz, w, d] of [[6.5, -4.2, 2.6, 0.25], [6.5, -6.8, 2.6, 0.25], [5.2, -5.5, 0.25, 2.6], [7.8, -5.5, 0.25, 2.6]] as const) {
    const __p595 = M(new THREE.BoxGeometry(w, 0.5, d), matStoneDark, true)
    __p595.position.set(bx, 0.25, bz)
    tp.add(__p595)
  }
  const __p597 = M(new THREE.BoxGeometry(2.2, 0.08, 2.2), matLawn, true)
  __p597.position.set(6.5, 0.12, -5.5)
  tp.add(__p597)
  root.add(tp)
  add(bigTree({ x: 6.5, z: -5.5, scale: 0.9, leaf: '#789460' }))

  // ---- 市集花车 ×2：(-7,0.6) / (2,0.6) ----
  const cart = (px: number, seed: number) => {
    const g = new THREE.Group()
    // 车台
    const __p605 = M(new THREE.BoxGeometry(1.9, 0.12, 1.0), matDoorWood)
    __p605.position.set(0, 0.75, 0)
    g.add(__p605)
    const __p606 = M(new THREE.BoxGeometry(1.8, 0.5, 0.08), matWood)
    __p606.position.set(0, 0.5, -0.46)
    g.add(__p606)
    // 木轮 ×2
    for (const wx of [-0.6, 0.6]) {
      const wheel = M(new THREE.TorusGeometry(0.28, 0.08, 8, 14), matDarkMetal, true)
      wheel.position.set(wx, 0.4, -0.5); g.add(wheel)
      const __p611 = M(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 8), matMetal, true)
      __p611.position.set(wx, 0.4, -0.5)
      g.add(__p611)
      for (const a of [0, Math.PI / 2]) {
        const spoke = M(new THREE.BoxGeometry(0.5, 0.03, 0.03), matDoorWood, true)
        spoke.position.set(wx, 0.4, -0.5); spoke.rotation.z = a; g.add(spoke)
      }
    }
    // 双坡条纹布篷：柱 ×4 + 两坡板 + 条纹
    for (const [qx, qz] of [[-.8, -.4], [.8, -.4], [-.8, .4], [.8, .4]]) {
      const __p619 = M(new THREE.BoxGeometry(0.07, 1.5, 0.07), matDoorWood, true)
      __p619.position.set(qx, 1.75, qz)
      g.add(__p619)
    }
    const cm = awningMats[seed % 3]
    for (const side of [1, -1]) {
      const cloth = M(new THREE.BoxGeometry(1.9, 0.05, 0.6), cm, true)
      cloth.rotation.x = side * 0.55; cloth.position.set(0, 2.55, side * 0.25); g.add(cloth)
      const __p625 = M(new THREE.BoxGeometry(1.92, 0.02, 0.06), awningMats[(seed + 1) % 3], true)
      __p625.position.set(0, 2.57, side * 0.2)
      g.add(__p625)
    }
    // 货品：果筐/花桶（随 seed）
    if (seed % 2) {
      const __p629 = M(new THREE.CylinderGeometry(0.3, 0.25, 0.3, 10), matWood, true)
      __p629.position.set(0, 0.96, 0.05)
      g.add(__p629)
      for (let k = 0; k < 5; k++) {
        const __f = M(G.fruit, stdMaterial(['#B25B4A', '#D98E4A', '#C9A227'][k % 3], { roughness: 0.85 }), true)
        __f.position.set(-0.2 + (k % 3) * 0.2, 1.16 + Math.floor(k / 3) * 0.1, 0.0)
        g.add(__f)
      }
    } else {
      // 南瓜/花束
      for (const [gx, gz, c] of [[-.5, .1, '#C98E4A'], [-.1, .2, '#B25B4A'], [.35, .05, '#D9A24A']] as const) {
        const p = M(new THREE.IcosahedronGeometry(0.18, 1), stdMaterial(c, { roughness: 0.9 }), true)
        p.scale.y = 0.75; p.position.set(gx, 0.95, gz); g.add(p)
      }
    }
    // 车辕把手
    const __p642 = M(new THREE.BoxGeometry(0.08, 0.08, 1.0), matDoorWood, true)
    __p642.position.set(-0.5, 0.72, 0.9)
    g.add(__p642)
    g.position.set(px, 0, 0.6); return g
  }
  add(cart(-7, 1))
  add(cart(2, 2))

  // ---- 社区公告栏（贴社区中心西墙 x=12，位置 (11.4,0.8)）----
  const nb = new THREE.Group()
  const __p650 = M(new THREE.BoxGeometry(0.1, 1.6, 0.1), matDoorWood, true)
  __p650.position.set(11.45, 0.8, 0.2)
  nb.add(__p650)
  const __p651 = M(new THREE.BoxGeometry(0.1, 1.6, 0.1), matDoorWood, true)
  __p651.position.set(11.45, 0.8, 1.4)
  nb.add(__p651)
  const __p652 = M(new THREE.BoxGeometry(0.12, 1.2, 1.3), matWood)
  __p652.position.set(11.5, 1.1, 0.8)
  nb.add(__p652)
  // 纸张 ×4
  for (let i = 0; i < 4; i++) {
    const __p655 = M(new THREE.BoxGeometry(0.03, 0.42, 0.5), matPaper, true)
    __p655.position.set(11.42, 0.9 + (i % 2) * 0.5, 0.5 + Math.floor(i / 2) * 0.6)
    nb.add(__p655)
  }
  // 顶棚（小双坡）
  const __p658 = M(new THREE.BoxGeometry(0.7, 0.08, 1.7), matTile, true)
  __p658.position.set(11.3, 1.85, 0.8)
  nb.add(__p658)
  const __p659 = M(new THREE.BoxGeometry(0.16, 0.06, 1.7), matDoorWood, true)
  __p659.position.set(11.1, 1.75, 0.8)
  nb.add(__p659)
  root.add(nb)

  // ---- 复古矮灯柱 ×4 ----
  const bollard = (px: number, pz: number) => {
    const g = new THREE.Group()
    const __p851 = M(new THREE.CylinderGeometry(0.09, 0.13, 2.2, 10), matDarkMetal, true)
    __p851.position.y = 1.1
    g.add(__p851)
    const __p852 = M(new THREE.BoxGeometry(0.26, 0.5, 0.26), stdMaterial('#FFE6B0', { emissive: '#FFCE85', emissiveIntensity: 1.1 }), true)
    __p852.position.y = 2.5
    g.add(__p852)
    const __p853 = M(new THREE.ConeGeometry(0.24, 0.28, 4), matDarkMetal, true)
    __p853.position.y = 2.88
    g.add(__p853)
    const __p854 = M(new THREE.SphereGeometry(0.07, 8, 6), matLit, true)
    __p854.position.y = 3.1
    g.add(__p854)
    g.position.set(px, 0, pz); return g
  }
  for (const [px, pz] of [[-17.2, -7.2], [10.2, -7.2], [-17.2, 1.3], [10.2, 1.3]]) add(bollard(px, pz))

  // ---- 石墩坐凳 ×5 ----
  const stool = (px: number, pz: number, ry: number) => {
    const g = new THREE.Group()
    const __p862 = M(new THREE.CylinderGeometry(0.3, 0.36, 0.42, 14), matStone, true)
    __p862.position.y = 0.21
    g.add(__p862)
    const __p863 = M(new THREE.BoxGeometry(0.6, 0.06, 0.4), matSlab, true)
    __p863.position.y = 0.45
    g.add(__p863)
    g.rotation.y = ry; g.position.set(px, 0, pz); return g
  }
  for (const [px, pz, ry] of [[-1, -6.9, 0], [-6.6, -2.6, 0.4], [5, -1.6, -0.3], [9, 1, 1.2], [-11.2, 1.3, -0.6]] as const) {
    add(stool(px, pz, ry))
  }

  // ===================================================================
  // 咖啡外摆 2 组（遮阳伞 + 桌 + 椅 ×2 + 花箱）
  // ===================================================================
  const cafeSet = (px: number, pz: number, col: string) => {
    add(umbrella({ x: px, z: pz, r: 1.15, color: col }))
    const __p891 = M(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 14), matWood, true)
    __p891.position.set(px, 0.72, pz)
    add(__p891)
    const __p892 = M(new THREE.CylinderGeometry(0.05, 0.07, 0.68, 8), matDarkMetal, true)
    __p892.position.set(px, 0.36, pz)
    add(__p892)
    for (const [dx, dz] of [[0.55, 0.2], [-0.55, -0.2]]) {
      const __p894 = M(new THREE.BoxGeometry(0.36, 0.08, 0.36), matWood, true)
      __p894.position.set(px + dx, 0.42, pz + dz)
      add(__p894)
    }
    const __p896 = M(new THREE.BoxGeometry(0.5, 0.3, 0.3), matDoorWood, true)
    __p896.position.set(px - 0.9, 0.3, pz + 0.6)
    add(__p896)
    const __p897 = M(G.leaf, matLawn, true)
    __p897.position.set(px - 0.9, 0.62, pz + 0.6)
    add(__p897)
  }
  cafeSet(-10.4, -5.6, '#C9A28F')
  cafeSet(-14.4, -1.4, '#9FB09A')

  // ===================================================================
  // ===================================================================
  // 广场花钵（18 处石钵+多色花球，贴广场边界）+ 拱廊夜间铁栅 7 跨
  // ===================================================================
  const potGeoP = new THREE.CylinderGeometry(0.34, 0.26, 0.4, 18)
  const soilGeoP = new THREE.CylinderGeometry(0.29, 0.29, 0.05, 16)
  const bloomGeo = new THREE.IcosahedronGeometry(0.19, 1)
  const stemGeoP = new THREE.CylinderGeometry(0.012, 0.012, 0.3, 5)
  const leafyGeo = new THREE.IcosahedronGeometry(0.16, 1)
  // 高饱和庭院花色（浅粉系在软件光栅化下与灰石糊色，改用红/橙/紫/品红）
  const FLOWERS = ['#C8453A', '#E8A52C', '#9C5FB0', '#D4568E']
  const POT_POINTS: Array<[number, number]> = [
    [10.6, -7.6], [6.1, -7.6], [1.6, -7.6], [-2.9, -7.6], [-7.4, -7.6],
    [11.5, 6.6], [11.5, 2.2], [11.5, -2.2], [11.5, -5.8],
    [-13.5, 1.4], [-2.5, 1.4], [5.5, 1.2],
    [9.8, -2], [13, -3.5],
    [17.8, -6], [17.8, -2], [17.8, 2], [17.8, 5],
  ]
  POT_POINTS.forEach(([px, pz], idx) => {
    const g = new THREE.Group()
    const pot = M(potGeoP, matStone, true); pot.position.y = 0.2; g.add(pot)
    const soil = M(soilGeoP, matStoneDark, true); soil.position.y = 0.38; g.add(soil)
    // 4 花球（细茎托高、微自发光，远看可见）
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + idx * 0.7
      const sx = Math.sin(a) * 0.13, sz = Math.cos(a) * 0.13
      const fstem = M(stemGeoP, matLawn, true)
      fstem.position.set(sx, 0.52, sz); g.add(fstem)
      const fc = FLOWERS[(idx + k) % 4]
      const b = M(bloomGeo, stdMaterial(fc, { roughness: 0.8, emissive: fc, emissiveIntensity: 0.28 }), true)
      b.position.set(sx, 0.74, sz); g.add(b)
    }
    // 外沿叶球 ×2
    for (const dx of [-0.22, 0.22]) {
      const lf = M(leafyGeo, matLawn, true)
      lf.position.set(dx, 0.34, 0.18); g.add(lf)
    }
    g.position.set(px, 0, pz); add(g)
  })
  // 拱廊闸栅「收起态」：每跨拱顶上方檐下挂横栅卷（不拱洞）
  for (let i = 0; i < 7; i++) {
    const x = -18 + segW * (i + 0.5)
    const rolled = B.latticePanel({ w: 3.4, h: 0.5, cols: 6, rows: 1, bar: 0.05, color: '#4E4C48' })
    rolled.position.set(x, 5.35, 2.08); add(rolled)
  }

  // 四环带景观
  // ===================================================================
  // 西环带临湖栏杆 5 段（x=-19.9，沿 Z）
  for (let i = 0; i < 5; i++) {
    const rail = B.railing({ w: 4, h: 1.05, color: '#9A978F' })
    rail.rotation.y = Math.PI / 2; rail.position.set(-19.9, 0.06, -8 + i * 4); add(rail)
  }
  // 垂柳 2 + 临湖路灯 2 + 长椅 1
  add(willow({ x: -19.0, z: 2, scale: 0.9 }))
  add(willow({ x: -19.0, z: -6.5, scale: 0.85 }))
  add(B.streetLamp({ x: -18.8, z: 6.5, h: 4.6 }))
  add(B.streetLamp({ x: -18.8, z: -2, h: 4.6 }))
  add(B.bench({ x: -18.6, z: -9.2, rotY: Math.PI / 2 }))

  // 南环行道树 2（与外摆错开）+ 路灯 3
  add(bigTree({ x: 1, z: -9.0, scale: 0.9, leaf: '#789460' }))
  add(bigTree({ x: 12, z: -9.0, scale: 0.85, leaf: '#6E8A5C' }))
  for (const px of [-6, 6, 17]) add(B.streetLamp({ x: px, z: -8.9, h: 4.6 }))

  // 北环小乔木 2 + 路灯 2（对接湖院/中央庭院开口）
  add(B.tree({ x: -9, z: 8.9, scale: 0.85, seed: 13 }))
  add(B.tree({ x: 7, z: 8.9, scale: 0.85, seed: 17 }))
  add(B.streetLamp({ x: -16, z: 8.8, h: 4.6 }))
  add(B.streetLamp({ x: 15, z: 8.8, h: 4.6 }))

  // 东环带花境灌木 10 + 路灯 1（邻四期预留地）
  for (let i = 0; i < 10; i++) {
    const z = -7.5 + i * 1.7
    const br = 0.34 + (i % 3) * 0.08
    const bush = M(new THREE.IcosahedronGeometry(br, 1), stdMaterial(['#6E8A5C', '#7C9464', '#84A06C'][i % 3], { roughness: 0.95 }), true)
    bush.position.set(18.9, br + 0.05, z); add(bush)
  }
  add(B.streetLamp({ x: 18.8, z: -4, h: 4.6 }))

  return root
}

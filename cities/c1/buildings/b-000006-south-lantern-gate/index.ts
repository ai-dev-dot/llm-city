import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { litgrid } from '../../blocks/doubao-seed-2.1-pro/litgrid'
import { umbrella } from '../../blocks/doubao-seed-2.1-pro/umbrella'

const M = (g: THREE.BufferGeometry, m: THREE.Material, site = false) => {
  const o = new THREE.Mesh(g, m)
  o.castShadow = true
  if (site) o.userData.site = true
  return o
}

// 方位约定（本宗地局部坐标）：南 = -Z（南街），东 = +X（东街）；
// 北邻望湖阁裙房（F4-06），西邻灯花市集社区中心（F4-08），中央生活庭院在西北。

// ---- 五边形（东南角切角）工具 ----
// 世界 xz 顶点（逆时针）：西南→切角南点→切角东点→东北→西北
function pentPts(s: number, c: number): Array<[number, number]> {
  return [
    [-s / 2, -s / 2], [s / 2 - c, -s / 2], [s / 2, -s / 2 + c], [s / 2, s / 2], [-s / 2, s / 2],
  ]
}
function inPent(x: number, z: number, s: number, c: number): boolean {
  // 点在正方形内且在切角斜边西北侧；斜边过 (s/2-c,-s/2) 与 (s/2,-s/2+c)，方程 x−z = s−c
  return Math.abs(x) <= s / 2 && Math.abs(z) <= s / 2 && x - z <= s - c + 1e-6
}
function pentShape(s: number, c: number): THREE.Shape {
  const sh = new THREE.Shape()
  const pts = pentPts(s, c)
  sh.moveTo(pts[0][0], -pts[0][1]) // shape 平面 y = -世界z；Extrude 后经 rotateX(-90°) 映射回世界
  for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], -pts[i][1])
  sh.closePath()
  return sh
}
/** 五边形实心柱（y0 起，高 h）。侧壁翻转风险以 DoubleSide 兜底。 */
function pentSolid(s: number, c: number, h: number, y0: number, mat: THREE.Material): THREE.Mesh {
  const g = new THREE.ExtrudeGeometry(pentShape(s, c), { depth: h, bevelEnabled: false })
  g.rotateX(-Math.PI / 2)
  const m = new THREE.Mesh(g, mat)
  m.position.y = y0
  m.castShadow = true
  return m
}

/** 直栏杆段（w 沿局部 X，含立杆与两道横杆），调用方自行旋转定位。 */
function railingSeg(w: number, h = 1.05): THREE.Group {
  const g = new THREE.Group()
  const mat = stdMaterial('#8E8B84', { metalness: 0.55, roughness: 0.4 })
  const posts = Math.max(2, Math.round(w / 1.4) + 1)
  for (let i = 0; i < posts; i++) {
    const p = M(new THREE.BoxGeometry(0.05, h, 0.05), mat)
    p.position.set(-w / 2 + (w * i) / (posts - 1), h / 2, 0); g.add(p)
  }
  for (const y of [h * 0.55, h * 0.92]) {
    const rail = M(new THREE.BoxGeometry(w, 0.05, 0.05), mat)
    rail.position.set(0, y, 0); g.add(rail)
  }
  return g
}

/** 矮灯柱：短金属杆 + 暖光球形灯。景观件。 */
function bollard(x: number, z: number): THREE.Object3D {
  const g = new THREE.Group()
  const metal = stdMaterial('#3E3C3A', { metalness: 0.5, roughness: 0.45 })
  const pole = M(new THREE.CylinderGeometry(0.05, 0.07, 0.9, 8), metal, true)
  pole.position.y = 0.45; g.add(pole)
  const lamp = M(new THREE.SphereGeometry(0.13, 10, 8),
    stdMaterial('#FFDCA0', { roughness: 0.5, emissive: '#FFC870', emissiveIntensity: 1.6 }), true)
  lamp.position.y = 1.0; g.add(lamp)
  g.position.set(x, 0, z)
  g.userData.site = true
  return g
}

/** 木盆灌木盆栽。景观件。 */
function pot(x: number, z: number, y = 0, leaf = '#6E8A54'): THREE.Object3D {
  const g = new THREE.Group()
  const potM = M(new THREE.CylinderGeometry(0.26, 0.2, 0.34, 10), stdMaterial('#A9805A', { roughness: 0.88 }), true)
  potM.position.y = 0.17; g.add(potM)
  const bush = M(new THREE.IcosahedronGeometry(0.34, 1), stdMaterial(leaf, { roughness: 0.95 }), true)
  bush.position.y = 0.56; bush.scale.y = 0.85; g.add(bush)
  g.position.set(x, y, z)
  g.userData.site = true
  return g
}

/** 圆桌 + 两凳（小木家具）。y 为放置面。 */
function tableSet(x: number, z: number, y = 0): THREE.Group {
  const g = new THREE.Group()
  const wood = stdMaterial('#8A6A46', { roughness: 0.85 })
  const top = M(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 12), wood, true)
  top.position.y = 0.72; g.add(top)
  const leg = M(new THREE.CylinderGeometry(0.05, 0.07, 0.7, 8), wood, true)
  leg.position.y = 0.36; g.add(leg)
  for (const [sx, sz] of [[0, 0.62], [0, -0.62]]) {
    const stool = M(new THREE.CylinderGeometry(0.17, 0.17, 0.26, 10), wood, true)
    stool.position.set(sx, 0.13, sz); g.add(stool)
  }
  g.position.set(x, y, z)
  g.userData.site = true
  return g
}

/**
 * 临街店面（朝 +Z）：底墙 + 橱窗玻璃带（竖梃）+ 中央门 + 招牌板 + 斜布篷。
 * sign 招牌色 / awn 布篷色 / doorAt 门中心在 X 的位置（比例 -1..1）。
 */
function shopFront(o: { w: number; sign: string; awn: string; doorAt?: number; shelf?: string[]; back?: string }): THREE.Group {
  const g = new THREE.Group()
  const matBase = stdMaterial('#D8D3C8', { roughness: 0.88 })
  const matFrame = stdMaterial('#E0DCD2', { roughness: 0.7 })
  const matGlass = stdMaterial('#26405C', { metalness: 0.55, roughness: 0.18, emissive: '#0E1A2A', emissiveIntensity: 0.45 })
  const matWarm = stdMaterial('#FFDCA0', { roughness: 0.5, emissive: '#FFC870', emissiveIntensity: 1.0 })
  const matAwn = stdMaterial(o.awn, { roughness: 0.9 })
  const matSign = stdMaterial(o.sign, { roughness: 0.7, emissive: o.sign, emissiveIntensity: 0.22 })

  // 底墙 + 顶梁
  const base = M(new THREE.BoxGeometry(o.w, 0.6, 0.16), matBase)
  base.position.set(0, 0.3, 0); g.add(base)
  const top = M(new THREE.BoxGeometry(o.w, 0.3, 0.16), matFrame)
  top.position.set(0, 3.35, 0); g.add(top)
  // 明亮橱窗：暖光背板贴窗（店铺总亮着灯）+ 竖梃框架；无整片玻璃（无贴图环境玻璃呈死黑）
  const backCol = o.back ?? '#F2C987'
  const back = M(new THREE.BoxGeometry(o.w - 0.2, 2.5, 0.05),
    stdMaterial(backCol, { roughness: 0.6, emissive: backCol, emissiveIntensity: 0.32 }))
  back.position.set(0, 1.9, 0.02); g.add(back)
  const mull = Math.max(2, Math.round(o.w / 1.1))
  for (let i = 0; i <= mull; i++) {
    const bar = M(new THREE.BoxGeometry(0.07, 2.5, 0.08), matFrame)
    bar.position.set(-o.w / 2 + (o.w * i) / mull, 1.95, 0.06); g.add(bar)
  }
  // 门（双开门内暖光）
  const dx = (o.doorAt ?? 0) * (o.w / 2 - 0.5)
  const doorWarm = M(new THREE.BoxGeometry(1.2, 2.4, 0.05), matWarm)
  doorWarm.position.set(dx, 1.5, 0.08); g.add(doorWarm)
  const doorFrame = M(new THREE.BoxGeometry(1.3, 2.5, 0.08), matFrame)
  doorFrame.position.set(dx, 1.55, 0.11); g.add(doorFrame)
  for (const sx of [-0.3, 0, 0.3]) {
    const bar = M(new THREE.BoxGeometry(0.05, 2.4, 0.06), matFrame)
    bar.position.set(dx + sx, 1.5, 0.13); g.add(bar)
  }
  // 两层木货架与货品色盒（避开门口，门两侧各 3 件）
  if (o.shelf) {
    for (const side of [-1, 1]) {
      const xEdge = side < 0 ? -o.w / 2 + 0.15 : o.w / 2 - 0.15
      const xToDoor = side < 0 ? dx - 0.7 : dx + 0.7
      const cx = (xEdge + xToDoor) / 2
      const sw = Math.abs(xToDoor - xEdge)
      for (const sy of [1.15, 2.05]) {
        const shelf = M(new THREE.BoxGeometry(sw, 0.06, 0.26), stdMaterial('#8A6A46', { roughness: 0.85 }))
        shelf.position.set(cx, sy, 0.05); g.add(shelf)
      }
      for (let i = 0; i < 3; i++) {
        // 从外缘向门方向排布（side=+1 须向内减号，否则货品排到店外）
        const inward = side < 0 ? 1 : -1
        const px = xEdge + inward * ((sw * (i + 0.5)) / 3)
        for (const sy of [1.35, 2.25]) {
          const item = M(new THREE.BoxGeometry(0.22, 0.3, 0.2), stdMaterial(o.shelf[(i + (side < 0 ? 0 : 2)) % o.shelf.length], { roughness: 0.8 }))
          item.position.set(px, sy, 0.08); g.add(item)
        }
      }
    }
  }
  // 招牌板（彩色长条，木边框）
  const sign = M(new THREE.BoxGeometry(o.w - 0.4, 0.62, 0.12), matSign)
  sign.position.set(0, 3.95, 0.02); g.add(sign)
  // 斜布篷（向外 +Z 挑出，下垂软边）
  const awn = M(new THREE.BoxGeometry(o.w, 0.08, 1.0), matAwn)
  awn.position.set(0, 3.42, 0.45); awn.rotation.x = -0.28; g.add(awn)
  const valance = M(new THREE.BoxGeometry(o.w, 0.22, 0.06), matAwn)
  valance.position.set(0, 3.16, 0.9); g.add(valance)
  return g
}

/** 贴墙爬藤花架：竖木格栅 + 叶丛。景观件，调用方贴外墙放。 */
function vineWall(w: number, h: number, seed: number): THREE.Group {
  const g = new THREE.Group()
  const wood = stdMaterial('#7C5838', { roughness: 0.88 })
  const leaf = stdMaterial('#5F7A48', { roughness: 0.95 })
  for (let i = 0; i <= Math.round(w / 0.7); i++) {
    const bar = M(new THREE.BoxGeometry(0.05, h, 0.06), wood, true)
    bar.position.set(-w / 2 + (w * i) / Math.round(w / 0.7), h / 2, 0); g.add(bar)
  }
  for (let i = 0; i <= Math.round(h / 0.6); i++) {
    const bar = M(new THREE.BoxGeometry(w, 0.04, 0.05), wood, true)
    bar.position.set(0, 0.2 + (h - 0.3) * (i / Math.round(h / 0.6)), 0); g.add(bar)
  }
  // 确定性叶丛（由 seed）
  let a = seed >>> 0
  const rnd = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  for (let k = 0; k < Math.round(w * h / 2.4); k++) {
    const v = M(new THREE.IcosahedronGeometry(0.2 + rnd() * 0.12, 0), leaf, true)
    v.position.set((rnd() - 0.5) * (w - 0.3), 0.35 + rnd() * (h - 0.6), 0.05); g.add(v)
  }
  g.userData.site = true
  return g
}

export default function build(ctx: BuildCtx): THREE.Object3D {
  const root = new THREE.Group()
  const B = ctx.blocks
  const rng = ctx.rng
  const add = (o: THREE.Object3D) => { root.add(o); return o }

  // ---- 材质（延续街区三期：白墙/黛色/暖木/暖窗）----
  const matGround = stdMaterial('#B0ADA4', { roughness: 0.95 })
  const matBrick = stdMaterial('#C7C3B9', { roughness: 0.92 })
  const matPaveWarm = stdMaterial('#D2CCBE', { roughness: 0.9 })
  const matWall = stdMaterial('#ECE8DF', { roughness: 0.8, side: THREE.DoubleSide })
  const matPlinth = stdMaterial('#D8D3C8', { roughness: 0.88 })
  const matSlab = stdMaterial('#E2DED4', { roughness: 0.78 })
  const matWood = stdMaterial('#A9805A', { roughness: 0.85 })
  const matTile = stdMaterial('#47433F', { metalness: 0.32, roughness: 0.7 })
  const matGlass = stdMaterial('#26405C', { metalness: 0.55, roughness: 0.18, emissive: '#0E1A2A', emissiveIntensity: 0.45 })
  const matMetal = stdMaterial('#8E8B84', { metalness: 0.6, roughness: 0.4 })
  const matDarkMetal = stdMaterial('#4E4C48', { metalness: 0.5, roughness: 0.5 })
  const matLawn = stdMaterial('#8C9E78', { roughness: 0.95 })
  const matWarm = stdMaterial('#FFDCA0', { roughness: 0.5, emissive: '#FFC870', emissiveIntensity: 1.2 })
  const matSolar = stdMaterial('#2E3E52', { metalness: 0.5, roughness: 0.3 })

  // ===================================================================
  // 场地（宗地 20×20，全域）
  // ===================================================================
  add(M(new THREE.BoxGeometry(20, 0.04, 20), matGround)).position.set(0, 0.02, 0)

  // 步行砖：南环带 + 东环带 + 切角外区域（网格 0.5 方格，基座五边形外即铺）
  const BASE_S = 16, BASE_C = 3.5
  for (let ix = -20; ix <= 20; ix++) {
    for (let iz = -20; iz <= 20; iz++) {
      const x = -9.75 + ix * 0.5
      const z = -9.75 + iz * 0.5
      if (x < -10 || x > 10 || z < -10 || z > 10) continue
      const southBand = z < -8
      const eastBand = x > 8
      const cornerOut = !inPent(x, z, BASE_S, BASE_C) && x > -8 && z < 8 && (x > 3 || z < -3)
      if (!southBand && !eastBand && !cornerOut) continue
      const b = M(new THREE.BoxGeometry(0.46, 0.035, 0.46), matBrick, true)
      b.position.set(x, 0.028, z); add(b)
    }
  }
  // 廊内（基座首层）暖色地砖：五边形薄板
  add(M(new THREE.ExtrudeGeometry(pentShape(15.4, 3.2), { depth: 0.04, bevelEnabled: false }).rotateX(-Math.PI / 2),
    matPaveWarm)).position.y = 0.05

  // 西北角朝中央庭院：草皮角 + 灌木 + 坐凳
  add(M(new THREE.BoxGeometry(6, 0.05, 6), matLawn, true)).position.set(-7, 0.045, 7)
  for (const [x, z] of [[-5.2, 5.4], [-8.2, 6.2], [-6.4, 8.6]]) add(pot(x, z, 0, '#6E8A5C'))
  add(B.bench({ x: -8.4, z: 8.6, rotY: Math.PI / 2 }))

  // ===================================================================
  // 基座（2 层商业，五边形 s=16 c=3.5）
  // ===================================================================
  // --- 首层外墙：西、北为白实墙（外缘 ±7.88，不越退线 ±8）---
  add(M(new THREE.BoxGeometry(0.24, 4.5, 15.76), matWall)).position.set(-7.88, 2.25, 0)
  add(M(new THREE.BoxGeometry(15.76, 4.5, 0.24), matWall)).position.set(0, 2.25, 7.88)
  // 墙基勒脚
  add(M(new THREE.BoxGeometry(0.28, 0.5, 15.76), matPlinth)).position.set(-7.88, 0.25, 0)
  add(M(new THREE.BoxGeometry(15.76, 0.5, 0.28), matPlinth)).position.set(0, 0.25, 7.88)
  // 后勤门 ×2 + 高窗带
  for (const [x, z, ry] of [[-7.86, 3.5, -Math.PI / 2], [3.5, 7.86, 0]]) {
    const door = M(new THREE.BoxGeometry(1.1, 2.3, 0.1), stdMaterial('#8A5E3C', { roughness: 0.82 }))
    door.position.set(x, 1.15, z); door.rotation.y = ry; add(door)
  }
  for (let k = 0; k < 5; k++) {
    const w1 = M(new THREE.BoxGeometry(0.1, 0.7, 1.1), matGlass)
    w1.position.set(-7.9, 2.7, -5.5 + k * 2.6); add(w1)
    const w2 = M(new THREE.BoxGeometry(1.1, 0.7, 0.1), matGlass)
    w2.position.set(-5.5 + k * 2.6, 2.7, 7.9); add(w2)
  }
  // 西、北墙爬藤花架
  const vw1 = vineWall(5.5, 3.6, 0x51a7); vw1.position.set(-7.93, 0.4, -3); vw1.rotation.y = -Math.PI / 2; add(vw1)
  const vw2 = vineWall(5.5, 3.6, 0x9c31); vw2.position.set(-3, 0.4, 7.93); add(vw2)

  // --- 首层南、东店面（骑楼秩序：柱列在街缘 ±7.8，店面退入廊后 ±5.9）---
  // 南立面可用长度 x∈[-8,4.5]：面包房（西）+ 便利店（东，近切角）
  const bakery = shopFront({ w: 6.4, sign: '#D9832E', awn: '#E3D9C6', doorAt: -0.35, shelf: ['#E8B44A', '#C97E2E', '#EAD394'], back: '#F2C987' })
  bakery.position.set(-4.75, 0, -5.9); bakery.rotation.y = Math.PI; add(bakery)
  const grocer = shopFront({ w: 6.0, sign: '#4E7A4E', awn: '#B7C2A8', doorAt: 0.3, shelf: ['#7FA878', '#B0784E', '#9AA0A0'], back: '#EDE6D2' })
  grocer.position.set(1.5, 0, -5.9); grocer.rotation.y = Math.PI; add(grocer)
  // 东立面南段：小酒馆
  const bistro = shopFront({ w: 6.4, sign: '#B04836', awn: '#D9B4A4', doorAt: -0.2, shelf: ['#7A4A6E', '#5A6B7A', '#B0885E'], back: '#E6B4A2' })
  bistro.position.set(5.9, 0, -1.3); bistro.rotation.y = Math.PI / 2; add(bistro)
  // 东立面北段白墙 + 小窗
  add(M(new THREE.BoxGeometry(0.24, 4.5, 6.2), matWall)).position.set(7.88, 2.25, 4.9)
  for (let k = 0; k < 3; k++) {
    const w2 = M(new THREE.BoxGeometry(0.1, 1.0, 1.2), matGlass)
    w2.position.set(7.9, 2.6, 2.6 + k * 2.1); add(w2)
  }

  // --- 切角斜边（中点 (6.25,-6.25)，外法线东南）：公寓入口 ---
  const FACE_ROT = 3 * Math.PI / 4 // 局部 +Z → 世界东南
  const entrance = new THREE.Group()
  // 入口两侧大堂玻璃窗
  for (const sx of [-1.55, 1.55]) {
    const gpanel = M(new THREE.BoxGeometry(1.5, 2.8, 0.08), matGlass)
    gpanel.position.set(sx, 1.7, 0.02); entrance.add(gpanel)
  }
  // 大门（双开玻璃木门 + 门框 + 门内暖光）
  const warm = M(new THREE.BoxGeometry(1.9, 3.0, 0.05), matWarm)
  warm.position.set(0, 1.6, 0.04); entrance.add(warm)
  const dframe = M(new THREE.BoxGeometry(2.1, 3.1, 0.1), matSlab)
  dframe.position.set(0, 1.65, 0.08); entrance.add(dframe)
  for (const sx of [-0.48, 0, 0.48]) {
    const bar = M(new THREE.BoxGeometry(0.06, 3.0, 0.08), matDarkMetal)
    bar.position.set(sx, 1.6, 0.11); entrance.add(bar)
  }
  // 金属玻璃雨棚（尺寸须收：随入口旋转 135° 后按对角 AABB 判定，外缘不得越 ±8）
  const canopy = M(new THREE.BoxGeometry(2.6, 0.08, 1.2), matMetal)
  canopy.position.set(0, 3.5, 0.6); canopy.rotation.x = -0.12; entrance.add(canopy)
  // 两侧壁灯
  for (const sx of [-2.05, 2.05]) {
    const lamp = M(new THREE.SphereGeometry(0.12, 8, 6),
      stdMaterial('#FFDCA0', { emissive: '#FFC870', emissiveIntensity: 1.4 }))
    lamp.position.set(sx, 2.9, 0.12); entrance.add(lamp)
  }
  entrance.position.set(6.25, 0, -6.25); entrance.rotation.y = FACE_ROT; add(entrance)
  // 入口台阶（3 级，沿外法线）
  const steps = new THREE.Group()
  for (let i = 1; i <= 3; i++) {
    const st = M(new THREE.BoxGeometry(2.6, 0.1, 0.4), matPlinth)
    st.position.set(0, i * 0.05, 0.2 + (3 - i) * 0.38); steps.add(st)
  }
  steps.position.set(6.25, 0, -6.25); steps.rotation.y = FACE_ROT; add(steps)

  // --- 骑楼柱列（圆柱承二层板）---
  const colPos: Array<[number, number]> = []
  for (const x of [-7.5, -4.5, -1.5, 1.5, 4.5]) colPos.push([x, -7.8])
  colPos.push([6.25, -6.25])
  for (const z of [-4.5, -1.5, 1.5, 4.5, 7.5]) colPos.push([7.8, z])
  for (const [x, z] of colPos) {
    const c = M(new THREE.CylinderGeometry(0.2, 0.22, 4.5, 14),
      stdMaterial('#E6E2D8', { roughness: 0.72 }))
    c.position.set(x, 2.25, z); add(c)
    const cap = M(new THREE.CylinderGeometry(0.24, 0.2, 0.16, 14), matSlab)
    cap.position.set(x, 4.5, z); add(cap)
  }
  // 骑楼廊顶木顶棚（底面暖色木铺，人视温暖）+ 檐板前沿边梁（廊檐轮廓收边）
  const ceilS = M(new THREE.BoxGeometry(12.3, 0.06, 1.9), matWood)
  ceilS.position.set(-1.75, 4.31, -6.9); add(ceilS)
  const ceilE = M(new THREE.BoxGeometry(1.9, 0.06, 12.3), matWood)
  ceilE.position.set(6.9, 4.31, 1.75); add(ceilE)
  for (const [x, z, rot] of [[-1.75, -7.95, 0], [7.95, 1.75, Math.PI / 2]]) {
    const beam = M(new THREE.BoxGeometry(12.5, 0.18, 0.1), matPlinth)
    beam.position.set(x, 4.26, z); beam.rotation.y = rot; add(beam)
  }

  // --- 4.5m 楼板（五边形，挑至柱外）---
  add(pentSolid(16, 3.5, 0.25, 4.35, matSlab))

  // --- 二层：南/东连续橱窗带，西/北白墙高窗 ---
  const band2f = (w: number) => {
    const g = new THREE.Group()
    const glass = M(new THREE.BoxGeometry(w, 3.2, 0.08), matGlass)
    glass.position.y = 1.9; g.add(glass)
    for (let i = 0; i <= Math.round(w / 1.3); i++) {
      const bar = M(new THREE.BoxGeometry(0.06, 3.2, 0.1), matSlab)
      bar.position.set(-w / 2 + (w * i) / Math.round(w / 1.3), 1.9, 0.04); g.add(bar)
    }
    // 上下线脚
    for (const y of [0.25, 3.55]) {
      const line = M(new THREE.BoxGeometry(w, 0.16, 0.14), matPlinth)
      line.position.y = y; g.add(line)
    }
    return g
  }
  const bandS = band2f(12.5); bandS.position.set(-1.75, 4.75, -7.9); bandS.rotation.y = Math.PI; add(bandS)
  const bandE = band2f(12.5); bandE.position.set(7.9, 4.75, 1.75); bandE.rotation.y = Math.PI / 2; add(bandE)
  // 西、北二层高窗
  for (let k = 0; k < 6; k++) {
    const w1 = M(new THREE.BoxGeometry(0.1, 1.5, 1.2), matGlass)
    w1.position.set(-7.9, 6.6, -6 + k * 2.4); add(w1)
    const w2 = M(new THREE.BoxGeometry(1.2, 1.5, 0.1), matGlass)
    w2.position.set(-6 + k * 2.4, 6.6, 7.9); add(w2)
  }
  // 切角斜边二层：斜窗带
  const bandF = band2f(4.6); bandF.position.set(6.25, 4.75, -6.25); bandF.rotation.y = FACE_ROT; add(bandF)
  // 9m 顶板
  add(pentSolid(16, 3.5, 0.3, 8.7, matSlab))
  // 顶板檐口裙边：沿五边形外缘 0.9m 高竖边（中心内移至 ±7.94，外缘不越退线 ±8）——
  // 封死「基座立面 ±7.9 / 塔实墙 ±6.76」错位形成的水平透视缝隙，托盘收边
  const lip = (len: number, x: number, z: number, rot: number) => {
    const w = M(new THREE.BoxGeometry(len, 0.9, 0.12), matPlinth)
    w.position.set(x, 9.15, z); w.rotation.y = rot; add(w)
  }
  lip(12.5, -1.75, -7.94, 0)                                  // 南
  lip(12.5, 7.94, -1.75, Math.PI / 2)                         // 东
  lip(16, 0, 7.94, 0)                                         // 北
  lip(16, -7.94, 0, Math.PI / 2)                              // 西
  lip(3.5 * Math.SQRT2 - 0.1, 6.25, -6.25, Math.PI / 4)       // 切角斜边

  // ===================================================================
  // 上部塔（s=14.4 c=3.0，9–45m，12 层 ×3m）——飘窗灯幕墙四面
  // ===================================================================
  const TOWER_S = 14.4, TOWER_C = 3.0, PROJ = 0.42
  const edge = TOWER_S / 2 - PROJ // 墙面定位 6.78，飘窗外缘齐 7.2
  // 楼板（五边形薄板，每层）
  for (let f = 0; f <= 12; f++) {
    add(pentSolid(TOWER_S, TOWER_C, 0.14, 9 + f * 3 - 0.07, matSlab))
  }
  // 角柱 5 根（五边形顶点，9–45）
  for (const [px, pz] of pentPts(TOWER_S, TOWER_C)) {
    add(M(new THREE.BoxGeometry(0.2, 36, 0.2), matPlinth)).position.set(px, 27, pz)
  }
  // 四面 litgrid：南/东 w=s-c（切角端），西/北 w=s
  const lgS = litgrid({ w: TOWER_S - TOWER_C, h: 36, floors: 12, cells: 9, seed: 601, y0: 9 })
  lgS.position.set(-TOWER_C / 2, 0, -edge); lgS.rotation.y = Math.PI; add(lgS)
  const lgE = litgrid({ w: TOWER_S - TOWER_C, h: 36, floors: 12, cells: 9, seed: 602, y0: 9 })
  lgE.position.set(edge, 0, TOWER_C / 2); lgE.rotation.y = Math.PI / 2; add(lgE)
  const lgW = litgrid({ w: TOWER_S, h: 36, floors: 12, cells: 11, seed: 603, y0: 9 })
  lgW.position.set(-edge, 0, 0); lgW.rotation.y = -Math.PI / 2; add(lgW)
  const lgN = litgrid({ w: TOWER_S, h: 36, floors: 12, cells: 11, seed: 604, y0: 9 })
  lgN.position.set(0, 0, edge); add(lgN)

  // 切角转角阳台（每两层一个，向外法线东南挑出）
  for (let f = 0; f < 12; f += 2) {
    const y = 9 + f * 3
    const balc = new THREE.Group()
    const slab = M(new THREE.BoxGeometry(2.0, 0.1, 1.0), matSlab)
    slab.position.set(0, 0.05, 0.5); balc.add(slab)
    // 玻璃门（墙内口）
    const door = M(new THREE.BoxGeometry(1.8, 2.5, 0.08), matGlass)
    door.position.set(0, 1.35, 0); balc.add(door)
    // 前沿栏杆（沿切角斜线方向 = 东北 45°）
    const rail = railingSeg(2.0, 1.0)
    rail.position.set(0, 0.1, 0.95); rail.rotation.y = Math.PI / 4; balc.add(rail)
    // 侧栏
    for (const sx of [-0.95, 0.95]) {
      const side = railingSeg(0.9, 1.0)
      side.position.set(sx, 0.1, 0.5); side.rotation.y = -Math.PI / 4; balc.add(side)
    }
    const mid = TOWER_S / 2 - TOWER_C / 2
    balc.position.set(mid, y, -mid); balc.rotation.y = FACE_ROT; add(balc)
  }

  // ===================================================================
  // 屋顶（45m）：邻里露台 + 南门灯亭 + 机房
  // ===================================================================
  add(pentSolid(TOWER_S, TOWER_C, 0.3, 44.85, matSlab))
  // 木甲板条板（西/北区）
  for (let k = 0; k < 14; k++) {
    const board = M(new THREE.BoxGeometry(0.32, 0.05, 7), matWood)
    board.position.set(-6 + k * 0.48, 45.05, 2.6); add(board)
  }
  // 草皮两带
  add(M(new THREE.BoxGeometry(5.5, 0.05, 1.3), matLawn)).position.set(-3.6, 45.05, -1.6)
  add(M(new THREE.BoxGeometry(1.3, 0.05, 5.0), matLawn)).position.set(-1.0, 45.05, 3.4)
  // 盆栽与桌椅
  for (const [px, pz] of [[-6.4, -1.4], [-0.8, -1.4], [-6.2, 6.2], [0.6, 4.0], [1.6, -3.0]]) add(pot(px, pz, 45.03))
  add(tableSet(-3.2, 5.2, 45.03))
  add(tableSet(-5.6, 0.2, 45.03))
  // 外缘栏杆 5 段（沿五边形边）
  const RY = 45.15
  const edgeSeg = (w: number, x: number, z: number, rot: number) => {
    const r = railingSeg(w); r.position.set(x, RY, z); r.rotation.y = rot; add(r)
  }
  edgeSeg(TOWER_S - TOWER_C, -TOWER_C / 2, -TOWER_S / 2, Math.PI)         // 南
  edgeSeg(TOWER_S - TOWER_C, TOWER_S / 2, -TOWER_C / 2, Math.PI / 2)     // 东
  edgeSeg(TOWER_S, 0, TOWER_S / 2, 0)                                    // 北
  edgeSeg(TOWER_S, -TOWER_S / 2, 0, -Math.PI / 2)                        // 西
  { const r = railingSeg(TOWER_C * Math.SQRT2 - 0.2); r.position.set(TOWER_S / 2 - TOWER_C / 2, RY, -(TOWER_S / 2 - TOWER_C / 2)); r.rotation.y = Math.PI / 4; add(r) } // 切角斜边

  // --- 南门灯亭（东南切角轴，45.3–50.2）：四面暖光格栅灯窗方阁 ---
  const pavilion = new THREE.Group()
  pavilion.position.set(3.0, 0, -3.0)
  const base = M(new THREE.BoxGeometry(4.3, 0.3, 4.3), matPlinth)
  base.position.y = 45.45; pavilion.add(base)
  // 四角金属柱
  for (const [px, pz] of [[-1.9, -1.9], [1.9, -1.9], [1.9, 1.9], [-1.9, 1.9]]) {
    const p = M(new THREE.BoxGeometry(0.14, 3.4, 0.14), matDarkMetal)
    p.position.set(px, 47.0, pz); pavilion.add(p)
  }
  // 四面暖光格栅灯窗（暖光底板 + 横竖梃）
  const litFace = new THREE.Group()
  const faceBase = M(new THREE.BoxGeometry(3.5, 3.0, 0.08),
    stdMaterial('#FFDCA0', { roughness: 0.5, emissive: '#FFBE7A', emissiveIntensity: 1.15 }))
  faceBase.position.y = 47.0; litFace.add(faceBase)
  for (let i = 0; i <= 5; i++) {
    const bar = M(new THREE.BoxGeometry(0.07, 3.0, 0.12), matDarkMetal)
    bar.position.set(-1.75 + (3.5 * i) / 5, 47.0, 0.02); litFace.add(bar)
  }
  for (let i = 0; i <= 4; i++) {
    const bar = M(new THREE.BoxGeometry(3.5, 0.07, 0.12), matDarkMetal)
    bar.position.set(0, 45.6 + (3.0 * i) / 4, 0.02); litFace.add(bar)
  }
  for (const [rot, x, z] of [[0, 0, 1.92], [Math.PI / 2, 1.92, 0], [Math.PI, 0, -1.92], [-Math.PI / 2, -1.92, 0]]) {
    const f = litFace.clone(); f.position.set(x, 0, z); f.rotation.y = rot; pavilion.add(f)
  }
  // 黛色金属四坡挑檐
  const capRoof = M(new THREE.ConeGeometry(3.1, 1.5, 4), matTile)
  capRoof.position.y = 49.45; capRoof.rotation.y = Math.PI / 4; pavilion.add(capRoof)
  const eave = M(new THREE.BoxGeometry(4.6, 0.12, 4.6), matTile)
  eave.position.y = 48.72; pavilion.add(eave)
  // 冠灯 + 天线
  const crown = M(new THREE.SphereGeometry(0.2, 12, 10),
    stdMaterial('#FFE4B0', { emissive: '#FFC870', emissiveIntensity: 1.8 }))
  crown.position.y = 50.45; pavilion.add(crown)
  const ant = M(new THREE.CylinderGeometry(0.02, 0.03, 1.2, 6), matDarkMetal)
  ant.position.y = 51.0; pavilion.add(ant)
  add(pavilion)

  // --- 设备机房 + 太阳能板 ---
  add(M(new THREE.BoxGeometry(3.0, 2.6, 3.4), matWall)).position.set(-1.6, 46.6, 1.6)
  add(M(new THREE.BoxGeometry(0.9, 2.0, 0.08), matDarkMetal)).position.set(-1.6, 46.3, 3.32)
  for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) {
    const panel = M(new THREE.BoxGeometry(1.1, 0.05, 1.5), matSolar)
    panel.position.set(2.0 + i * 1.3, 45.4, 1.2 + j * 1.65); panel.rotation.x = -0.28; add(panel)
  }

  // ===================================================================
  // 景观（南/东沿街 + 街角）
  // ===================================================================
  // 行道树 + 圆形树池
  const treeSpots: Array<[number, number]> = [[-6, -9], [0, -9], [9, 1], [9, 7]]
  for (const [x, z] of treeSpots) {
    const ring = M(new THREE.CylinderGeometry(0.85, 0.85, 0.06, 16), matPlinth, true)
    ring.position.set(x, 0.04, z); add(ring)
    add(B.tree({ x, z, scale: 0.95, seed: x * 7 + z * 13 }))
  }
  // 切角广场造型小树
  add(B.tree({ x: 8.9, z: -4.8, scale: 0.7, seed: 42 }))
  // 路灯
  for (const [x, z] of [[-8, -9.2], [-3, -9.2], [2, -9.2], [9.2, -2], [9.2, 3], [9.2, 8], [-3, 9.2], [-9.2, 3]]) {
    add(B.streetLamp({ x, z, h: 5.2 }))
  }
  // 街角矮灯柱、花钵
  add(bollard(5.6, -9.2)); add(bollard(9.2, -5.6))
  add(pot(7.0, -9.4, 0, '#8A9A64')); add(pot(9.4, -7.0, 0, '#7A8E60'))
  // 街角外摆：伞 + 桌椅
  add(umbrella({ x: 8.9, z: -8.9, r: 1.2, color: '#E3D9C6' }))
  add(tableSet(8.9, -8.9))

  // 北环带（对接望湖阁南环带）、西环带（对接市集东环带）：暖色铺装薄板，覆盖全部裸基底
  add(M(new THREE.BoxGeometry(20, 0.04, 2), matPaveWarm, true)).position.set(0, 0.03, 9)
  add(M(new THREE.BoxGeometry(2, 0.04, 20), matPaveWarm, true)).position.set(-9, 0.03, 0)

  void rng
  return root
}

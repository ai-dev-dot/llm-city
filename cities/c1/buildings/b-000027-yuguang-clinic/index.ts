import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { louver } from '../../blocks/space-bunny/louver'
import { healingTree } from '../../blocks/space-bunny/healing-tree'
import { greenWall } from '../../blocks/space-bunny/green-wall'
import { planter } from '../../blocks/space-bunny/planter'

/**
 * b-000027 愈光楼 · D5 模都医枢 一期主楼
 * 母题：愈 · 光 · 庭
 *
 * 「一塔一庭」：东缘立 7 层住院翼（剪影主峰，西立面是一整面 31m 高的通高玻璃采光墙，
 * 墙后是 8 层通高的中庭、逐层挑台与一株 16m 银杏）；北翼 4 层门急诊医技贴街，南翼 3 层
 * 康复餐饮低伏收边；两翼之间让出 26×16m 的露天愈光庭，庭院西面全开，城市的人可以
 * 从 C5 方向一直走进来，抬头看见的不是墙，是一棵被玻璃墙背衬着的树。
 *
 * 立面语汇：薄荷绿实体层间带 + 连续玻璃带 + 竖向浅木遮阳鳍 + 白色檐口线脚。
 */

// ---- 体量常量：局部原点 = 宗地中心地面，宗地 40×40m，x/z ∈ [-20, 20] ----
const EX0 = 6, EX1 = 17 // 住院翼（塔）x 界
const EZ0 = -15, EZ1 = 15 // 住院翼 z 界
const AX0 = 8, AX1 = 16 // 塔内中庭（光井）x 界
const AZ0 = -6, AZ1 = 6 // 塔内中庭 z 界
const WY0 = -17, WY1 = 6 // 门诊翼（北）x 界
const WZ0 = 8, WZ1 = 15 // 门诊翼 z 界
const RY0 = -17, RY1 = 6 // 康复翼（南）x 界
const RZ0 = -15, RZ1 = -8 // 康复翼 z 界
const CY0 = -8, CY1 = 8 // 中庭 z 界，x 自 -20 敞口至 EX0
const H1 = 5.4 // 架空层净高
const FH = 4.3 // 标准层高
const LV_E = 7 // 住院翼层数：架空层 + L2..L7
const LV_W = 4 // 门诊翼层数：架空层 + L2..L4
const LV_R = 3 // 康复翼层数：架空层 + L2..L3
const TOP_E = H1 + (LV_E - 1) * FH // 31.2 住院翼檐口
const TOP_W = H1 + (LV_W - 1) * FH // 18.3 门诊翼檐口
const TOP_R = H1 + (LV_R - 1) * FH // 14.0 康复翼檐口

const C = {
  panel: '#F4F6F4', // 白预制板
  mint: '#BCD6C9', // 薄荷绿层间带
  wood: '#B08A5A', // 木色暖檐
  woodLite: '#C6BFB2', // 浅暖灰遮阳鳍（朝庭立面，避开与木色暖檐抢戏）
  conc: '#C7C4BC', // 清水混凝土
  glass: '#9EC5DD', // 幕墙玻璃
  frame: '#93A0A6', // 金属框架
  steel: '#7C8A90', // 钢构
  green: '#7FA07A',
  green2: '#5E7F5C',
  green3: '#9BB58E',
  pave: '#D8D5CE',
  paveDark: '#B2AFA7',
  grass: '#8C9E8B',
  glow: '#FFF1CE',
  water: '#7FB6C4',
}

// 材质在本栋内共享：AGENTS 规约要求材质只在单栋建筑内共享，滤镜按建筑整体换色
const matCache = new Map<string, THREE.MeshStandardMaterial>()
function M(color: string, o?: Parameters<typeof stdMaterial>[1]): THREE.MeshStandardMaterial {
  const k = `${color}|${JSON.stringify(o ?? {})}`
  let m = matCache.get(k)
  if (!m) {
    m = stdMaterial(color, o)
    matCache.set(k, m)
  }
  return m
}

function box(w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, rotY = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
  mesh.position.set(x, y, z)
  mesh.rotation.y = rotY
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

/** 由对角坐标生成定心盒：楼板与池壁通用 */
function slab(x0: number, x1: number, z0: number, z1: number, yTop: number, thick: number, m: THREE.Material): THREE.Mesh {
  return box(x1 - x0, thick, z1 - z0, m, (x0 + x1) / 2, yTop - thick / 2, (z0 + z1) / 2)
}

const siteTag = (o: THREE.Object3D): THREE.Object3D => {
  o.userData.site = true
  return o
}

/**
 * 幕墙：玻璃面 + 竖梃 + 深窗洞双层窗台 + 窗楣
 * 局部约定：+X 沿面展开，+Z 为外法向
 */
function curtain(o: { len: number; h: number; bays: number }): THREE.Object3D {
  const grp = new THREE.Group()
  const h = o.h
  const glass = box(o.len, h, 0.12, M(C.glass, { metalness: 0.5, roughness: 0.18, emissive: '#E6E1CE', emissiveIntensity: 0.26 }), o.len / 2, h / 2, 0)
  glass.castShadow = false
  grp.add(glass)
  const fm = M(C.frame, { metalness: 0.55, roughness: 0.36 })
  const cm = M(C.conc, { roughness: 0.85 })
  for (let b = 0; b <= o.bays; b++) grp.add(box(0.14, h + 0.1, 0.3, fm, (o.len * b) / o.bays, h / 2, 0.07))
  // 深窗洞：每开间一道外挑窗台 + 内侧窗台板，给立面阴影节奏
  const bw = o.len / o.bays
  for (let b = 0; b < o.bays; b++) {
    const x = bw * (b + 0.5)
    grp.add(box(bw - 0.34, 0.2, 0.46, cm, x, 0.1, 0.2))
    grp.add(box(bw - 0.34, 0.12, 0.9, M(C.panel, { roughness: 0.7 }), x, -0.14, -0.28))
  }
  grp.add(box(o.len, 0.34, 0.42, M(C.panel, { roughness: 0.7 }), o.len / 2, h + 0.17, 0.14))
  return grp
}

/**
 * 檐口线脚：剖面朝 -x 生长、挤出 +z，转 90 度后即沿局部 +X 展开、挑向局部 +Z
 */
function cornice(o: { len: number; color: string; x: number; y: number; z: number; rotY: number }): THREE.Object3D {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.lineTo(-0.42, 0)
  s.lineTo(-0.5, 0.14)
  s.lineTo(-0.5, 0.3)
  s.lineTo(-0.3, 0.34)
  s.lineTo(-0.3, 0.52)
  s.lineTo(0, 0.52)
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, {
    depth: o.len, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 3, steps: 1,
  })
  const m = new THREE.Mesh(g, M(o.color, { roughness: 0.7 }))
  m.rotation.y = Math.PI / 2
  m.castShadow = true
  m.receiveShadow = true
  const grp = new THREE.Group()
  grp.add(m)
  grp.position.set(o.x, o.y, o.z)
  grp.rotation.y = o.rotY
  return grp
}

/** 管状构件：拉杆、扶手、采光顶钢肋都走这里 */
function tube(points: THREE.Vector3[], r: number, m: THREE.Material, radial = 5, seg?: number): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points)
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, seg ?? Math.max(8, points.length * 4), r, radial, false), m)
  mesh.castShadow = true
  return mesh
}

/**
 * 竖向遮阳鳍阵列：一排立着的薄叶片，替立面挡住低角度日晒、给病房隐私
 * 锚点约定：自 (x, z) 沿局部 +X 展开 len 米，外法向为局部 +Z
 */
function finWall(o: {
  len: number; h: number; count: number; x: number; y: number; z: number
  rotY: number; reach?: number; color?: string
}): THREE.Object3D {
  const reach = o.reach ?? 0.42
  const t = Math.min(0.12, reach * 0.3)
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.lineTo(-reach, 0)
  s.lineTo(-reach, o.h - t)
  s.lineTo(-reach + t, o.h)
  s.lineTo(0, o.h)
  s.closePath()
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.18, bevelEnabled: true, bevelThickness: 0.016, bevelSize: 0.016, bevelSegments: 1, curveSegments: 4, steps: 1,
  })
  const g = new THREE.Group()
  g.position.set(o.x, o.y, o.z)
  g.rotation.y = o.rotY
  const mat = M(o.color ?? C.woodLite, { roughness: 0.7 })
  for (let k = 0; k < o.count; k++) {
    const m = new THREE.Mesh(geo, mat)
    m.castShadow = true
    m.receiveShadow = true
    m.rotation.y = Math.PI / 2
    m.position.set((o.len * (k + 0.5)) / o.count, 0, 0)
    g.add(m)
  }
  return g
}

/**
 * 一段标准立面：薄荷绿实体层间带 + 连续玻璃带 + 竖向遮阳鳍 + 檐口线脚
 * 锚点约定：自 (x, z) 沿局部 +X 展开 len 米，外法向为局部 +Z
 */
function facade(root: THREE.Group, o: {
  len: number; x: number; y0: number; z: number; rotY: number
  bay?: number; fins?: number; finColor?: string; brise?: boolean
}) {
  const bandH = 0.85
  const gy = o.y0 + bandH
  const gh = FH - bandH - 0.42
  const bays = o.bay ?? Math.max(6, Math.round(o.len / 1.6))
  const cg = curtain({ len: o.len, h: gh, bays })
  cg.position.set(o.x, gy, o.z)
  cg.rotation.y = o.rotY
  root.add(cg)
  // 层间带也须从锚点起算，故放进同向的组里定位
  const bg = new THREE.Group()
  bg.position.set(o.x, 0, o.z)
  bg.rotation.y = o.rotY
  bg.add(box(o.len, bandH, 0.36, M(C.mint, { roughness: 0.66 }), o.len / 2, o.y0 + bandH / 2, 0.04))
  root.add(bg)
  if (o.brise) {
    // 朝庭立面加一道水平遮阳鳍带：餐厅与康复厅的南向/北向低角度日晒
    const lv = louver({ w: o.len, y: 0, fins: 3, gap: 0.8, reach: 0.66, color: C.panel, seg: 6 })
    lv.position.set(o.x, gy + 0.1, o.z)
    lv.rotation.y = o.rotY
    root.add(lv)
  }
  if (o.fins) {
    root.add(finWall({
      len: o.len, h: gh + bandH - 0.3, count: o.fins,
      x: o.x, y: o.y0 + 0.15, z: o.z, rotY: o.rotY, color: o.finColor,
    }))
  }
  root.add(cornice({ len: o.len, color: C.panel, x: o.x, y: o.y0 + FH - 0.45, z: o.z, rotY: o.rotY }))
}

export default function build(ctx: BuildCtx): THREE.Object3D {
  const rng = ctx.rng
  const root = new THREE.Group()

  const panelM = M(C.panel, { roughness: 0.68 })
  const woodM = M(C.wood, { roughness: 0.74 })
  const concM = M(C.conc, { roughness: 0.88 })
  const frameM = M(C.frame, { metalness: 0.55, roughness: 0.36 })
  const steelM = M(C.steel, { metalness: 0.6, roughness: 0.34 })
  const paveM = M(C.pave, { roughness: 0.92 })

  // 0 · 宗地地面：草皮满铺至宗地边缘
  root.add(siteTag(box(40, 0.3, 40, M(C.grass, { roughness: 1 }), 0, -0.15, 0)))

  /** 铺装片：小件豁免，直接打 site 标记 */
  const pave = (x0: number, x1: number, z0: number, z1: number, step = 1.35, y = 0.02): void => {
    const nx = Math.max(1, Math.round((x1 - x0) / step))
    const nz = Math.max(1, Math.round((z1 - z0) / step))
    const tw = (x1 - x0) / nx
    const td = (z1 - z0) / nz
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        const t = siteTag(box(tw - 0.07, 0.12, td - 0.07, (i + j) % 3 === 0 ? M(C.paveDark, { roughness: 0.94 }) : paveM,
          x0 + tw * (i + 0.5), y, z0 + td * (j + 0.5)))
        t.castShadow = false
      }
    }
  }

  /** 一行种植池 + 灌木：庭园与屋顶共用 */
  const greenBand = (parent: THREE.Object3D, cx: number, y: number, cz: number, w: number, d: number, n: number, site = false) => {
    parent.add(planter({ w, d, h: 0.58, x: cx, y, z: cz, soil: true, site }))
    for (let j = 0; j < n; j++) {
      const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 + rng() * 0.32, 1), M(rng() > 0.5 ? C.green : C.green3, { roughness: 0.95 }))
      s.position.set(cx - w / 2 + 0.6 + rng() * (w - 1.2), y + 0.86 + rng() * 0.42, cz - d / 2 + 0.4 + rng() * (d - 0.8))
      s.castShadow = true
      parent.add(site ? siteTag(s) : s)
    }
  }

  // 1 · 底盘：架空柱廊（L1，5.4m）
  const colM = M(C.conc, { roughness: 0.8 })
  const colGeo = new THREE.CylinderGeometry(0.85, 0.95, H1, 24)
  const colPts: Array<[number, number]> = [
    [-14, -12.5], [-14, 12.5], [-4, -12.5], [-4, 12.5],
    [6.5, -12.5], [6.5, 12.5], [15.5, -12.5], [15.5, 12.5],
  ]
  for (const [x, z] of colPts) {
    const c = new THREE.Mesh(colGeo, colM)
    c.position.set(x, H1 / 2, z)
    c.castShadow = true
    c.receiveShadow = true
    root.add(c)
    root.add(box(2.6, 0.34, 2.6, concM, x, H1 - 0.17, z))
  }
  // L1 楼板：住院翼（塔内中庭留空）+ 门诊翼 + 康复翼
  root.add(slab(EX0, EX1, AZ1, EZ1, H1, 0.5, concM))
  root.add(slab(EX0, EX1, EZ0, AZ0, H1, 0.5, concM))
  root.add(slab(EX0, AX0, AZ0, AZ1, H1, 0.5, concM))
  root.add(slab(AX1, EX1, AZ0, AZ1, H1, 0.5, concM))
  root.add(slab(WY0, WY1, WZ0, WZ1, H1, 0.5, concM))
  root.add(slab(RY0, RY1, RZ0, RZ1, H1, 0.5, concM))
  // 木色暖檐：L1 楼板外缘一圈，沿体量外轮廓走
  root.add(box(WY1 - WY0 + 0.6, 0.95, 0.5, woodM, (WY0 + WY1) / 2, H1 - 0.48, WZ1 + 0.28))
  root.add(box(RY1 - RY0 + 0.6, 0.95, 0.5, woodM, (RY0 + RY1) / 2, H1 - 0.48, RZ0 - 0.28))
  root.add(box(0.5, 0.95, EZ1 - EZ0 + 0.6, woodM, EX1 + 0.28, H1 - 0.48, 0))
  root.add(box(0.5, 0.95, WZ1 - WZ0 + 0.6, woodM, WY0 - 0.28, H1 - 0.48, (WZ0 + WZ1) / 2))
  root.add(box(0.5, 0.95, RZ1 - RZ0 + 0.6, woodM, RY0 - 0.28, H1 - 0.48, (RZ0 + RZ1) / 2))
  // L1 围护：门诊翼南北面、康复翼南北面都是玻璃大厅
  const wN = curtain({ len: WY1 - WY0, h: 4.2, bays: 14 })
  wN.position.set(WY0, 0.45, WZ1)
  root.add(wN)
  const wS = curtain({ len: WY1 - WY0, h: 4.2, bays: 14 })
  wS.position.set(WY1, 0.45, WZ0)
  wS.rotation.y = Math.PI
  root.add(wS)
  const rN = curtain({ len: RY1 - RY0, h: 4.2, bays: 14 })
  rN.position.set(RY0, 0.45, RZ1)
  root.add(rN)
  const rS = curtain({ len: RY1 - RY0, h: 4.2, bays: 14 })
  rS.position.set(RY1, 0.45, RZ0)
  rS.rotation.y = Math.PI
  root.add(rS)
  // 住院翼东面 L1：落客门厅用玻璃
  const eG = curtain({ len: EZ1 - EZ0, h: 4.2, bays: 19 })
  eG.position.set(EX1, 0.45, EZ1)
  eG.rotation.y = Math.PI / 2
  root.add(eG)
  for (const z of [-13.6, 13.6]) {
    const pw = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, H1, 20), colM)
    pw.position.set(EX1 + 0.6, H1 / 2, z)
    pw.castShadow = true
    root.add(pw)
  }
  root.add(box(0.24, 3.6, 3.2, M(C.wood, { roughness: 0.72 }), EX1, 1.8, 0))

  // 2 · 门急诊入口与门廊雨棚（北）
  const portico = new THREE.Group()
  portico.add(box(17, 0.42, 2.6, M(C.panel, { roughness: 0.6 }), -5, H1 - 0.21, WZ1 + 1.3))
  portico.add(box(17.3, 0.55, 0.34, woodM, -5, H1 - 0.5, WZ1 + 2.5))
  for (let k = 0; k < 7; k++) {
    const x = -12 + k * 2.4
    portico.add(tube([new THREE.Vector3(x, H1 - 0.4, WZ1 + 2.45), new THREE.Vector3(x, H1 + 3.4, WZ1 + 0.1)], 0.055, steelM, 5, 6))
  }
  for (const x of [-12.2, -5, 2.2]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, H1, 20), concM)
    c.position.set(x, H1 / 2, WZ1 + 2.25)
    c.castShadow = true
    portico.add(c)
  }
  portico.add(box(9, 3.5, 0.28, M(C.glass, { metalness: 0.5, roughness: 0.15, emissive: '#C4DFF0', emissiveIntensity: 0.3 }), -5, 1.75, WZ1 - 0.2))
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 2.7, 20, 1, true),
    M(C.glass, { metalness: 0.5, roughness: 0.14, emissive: '#C4DFF0', emissiveIntensity: 0.35, side: THREE.DoubleSide }))
  drum.position.set(-5, 1.35, WZ1 - 1.5)
  portico.add(drum)
  for (let k = 0; k < 3; k++) {
    const piv = new THREE.Group()
    piv.position.set(-5, 0, WZ1 - 1.5)
    piv.rotation.y = (k / 3) * Math.PI * 2
    piv.add(box(1.42, 2.6, 0.1, M(C.glass, { metalness: 0.45, roughness: 0.15, emissive: '#C4DFF0', emissiveIntensity: 0.3, side: THREE.DoubleSide }), 0, 1.3, 1.45))
    portico.add(piv)
  }
  root.add(portico)

  // 3 · 住院翼（塔，7 层，31.2m）
  for (let i = 1; i < LV_E; i++) {
    const yb = H1 + i * FH
    const y0 = yb - FH
    root.add(slab(EX0, EX1, AZ1, EZ1, yb, 0.5, concM))
    root.add(slab(EX0, EX1, EZ0, AZ0, yb, 0.5, concM))
    root.add(slab(EX0, AX0, AZ0, AZ1, yb, 0.5, concM))
    root.add(slab(AX1, EX1, AZ0, AZ1, yb, 0.5, concM))
    // 外露结构柱：医疗建筑的诚实构造
    for (const x of [7.4, 11.9, 15.6]) {
      for (const z of [-13.4, -8.2, -2.6, 2.6, 8.2, 13.4]) {
        if (x > AX0 && x < AX1 && z > AZ0 && z < AZ1) continue
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, FH, 24), colM)
        c.position.set(x, y0 + FH / 2, z)
        c.castShadow = true
        c.receiveShadow = true
        root.add(c)
        root.add(box(1.7, 0.28, 1.7, concM, x, yb - 0.64, z))
      }
    }
    // 庭院侧呼吸阳台：自通高玻璃墙挑出 1.4m
    root.add(slab(EX0 - 1.4, EX0, CY0, CY1, yb, 0.32, panelM))
    const rB = ctx.blocks.railing({ w: CY1 - CY0, h: 1.05, color: C.frame, x: EX0 - 1.4, y: yb, z: 0 })
    rB.rotation.y = Math.PI / 2
    root.add(rB)
    for (const z of [-6.4, 6.4]) {
      root.add(planter({ w: 1.1, d: 2.2, h: 0.44, x: EX0 - 0.75, y: yb, z, round: 0.3, color: C.panel }))
      const sh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4 + rng() * 0.26, 1), M(C.green, { roughness: 0.95 }))
      sh.position.set(EX0 - 0.75, yb + 0.86, z + (rng() - 0.5) * 1.2)
      sh.castShadow = true
      root.add(sh)
    }
    // 塔内中庭：逐层挑台 + 栏板 + 吊挂绿植 + 直跑楼梯
    const proj = 1.6
    const ring: Array<[number, number, number, number]> = [
      [AX0, AX0 + proj, AZ0, AZ1],
      [AX1 - proj, AX1, AZ0, AZ1],
      [AX0 + proj, AX1 - proj, AZ1 - proj, AZ1],
      [AX0 + proj, AX1 - proj, AZ0, AZ0 + proj],
    ]
    for (const [ax0, ax1, az0, az1] of ring) root.add(slab(ax0, ax1, az0, az1, yb, 0.32, panelM))
    const rl = AX1 - AX0 - proj * 2
    const guards: Array<[number, number, number]> = [
      [(AX0 + AX1) / 2, AZ1 - proj + 0.1, 0],
      [(AX0 + AX1) / 2, AZ0 + proj - 0.1, 0],
      [AX0 + proj - 0.1, 0, Math.PI / 2],
      [AX1 - proj + 0.1, 0, Math.PI / 2],
    ]
    for (const [gx, gz, rot] of guards) {
      const r = ctx.blocks.railing({ w: rl, h: 1.05, color: C.frame, x: gx, y: yb, z: gz })
      r.rotation.y = rot
      root.add(r)
    }
    for (const z of [AZ1 - proj - 0.5, AZ0 + proj + 0.5]) {
      const px = (AX0 + AX1) / 2 + (z > 0 ? -2.4 : 2.4)
      root.add(planter({ w: 0.9, d: 0.9, h: 0.3, x: px, y: yb - 3, z, round: 0.32, color: C.panel }))
      for (let k = 0; k < 3; k++) {
        const v = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26 + rng() * 0.2, 1), M(rng() > 0.5 ? C.green : C.green2, { roughness: 0.95 }))
        v.position.set(px + (rng() - 0.5) * 0.7, yb - 3.2 - rng() * 1.3, z + (rng() - 0.5) * 0.7)
        v.castShadow = true
        root.add(v)
      }
    }
    const steps = 12
    const stX = (AX0 + AX1) / 2 + 2.1
    for (let k = 0; k < steps; k++) {
      const y = yb - FH + ((k + 1) / steps) * FH
      root.add(box(2.8, 0.15, 0.55, M(C.panel, { roughness: 0.62 }), stX, y, AZ1 - 0.35 - k * 0.5))
      root.add(box(2.8, FH / steps, 0.1, M(C.panel, { roughness: 0.62 }), stX, y - FH / steps / 2, AZ1 - 0.62 - k * 0.5))
    }
    root.add(tube([
      new THREE.Vector3(stX + 1.45, yb - FH + 0.85, AZ1 - 0.28),
      new THREE.Vector3(stX + 1.45, yb - 0.85, AZ1 - 0.28 - steps * 0.5),
    ], 0.055, frameM, 5, 18))
    // 塔内中庭的竖向木格栅与发光壁龛
    for (let k = 0; k < 9; k++) {
      const zz = AZ0 + 0.6 + (k / 8) * (AZ1 - AZ0 - 1.2)
      root.add(box(0.16, FH - 0.4, 0.3, woodM, AX0 + 0.28, y0 + FH / 2, zz))
      root.add(box(0.16, FH - 0.4, 0.3, woodM, AX1 - 0.28, y0 + FH / 2, zz))
    }
    root.add(box(2.6, 0.9, 0.22, M(C.glow, { emissive: C.glow, emissiveIntensity: 1.2, roughness: 0.5 }), (AX0 + AX1) / 2, y0 + 2.2, AZ0 + 0.24))
    // 立面：东、北、南三面。西面只对中庭敞开，z -8..8 是通高玻璃墙。
    facade(root, { len: EZ1 - EZ0, x: EX1, y0, z: EZ1, rotY: Math.PI / 2, fins: 13 })
    facade(root, { len: EX1 - EX0, x: EX0, y0, z: EZ1, rotY: 0, fins: 5 })
    facade(root, { len: EX1 - EX0, x: EX1, y0, z: EZ0, rotY: Math.PI, fins: 5 })
    // 塔西面高出两翼的山墙：白板 + 浅木竖鳍
    if (i >= LV_W) {
      root.add(box(0.3, FH, WZ1 - WZ0, panelM, EX0, y0 + FH / 2, (WZ0 + WZ1) / 2))
      root.add(finWall({ len: WZ1 - WZ0, h: FH - 0.9, count: 4, x: EX0, y: y0 + 0.45, z: WZ0, rotY: -Math.PI / 2, reach: 0.32 }))
    }
    if (i >= LV_R) {
      root.add(box(0.3, FH, RZ1 - RZ0, panelM, EX0, y0 + FH / 2, (RZ0 + RZ1) / 2))
      root.add(finWall({ len: RZ1 - RZ0, h: FH - 0.9, count: 4, x: EX0, y: y0 + 0.45, z: RZ1, rotY: Math.PI / 2, reach: 0.32 }))
    }
  }
  // 庭院照壁：31.2m 通高玻璃墙 + 竖梃 + 层间横梁，墙后即 8 层中庭与银杏
  const gw = box(CY1 - CY0, TOP_E, 0.14, M(C.glass, { metalness: 0.5, roughness: 0.14, emissive: '#C4DFF0', emissiveIntensity: 0.42 }), EX0, TOP_E / 2, 0)
  gw.rotation.y = Math.PI / 2
  gw.castShadow = false
  root.add(gw)
  for (let k = 0; k <= 13; k++) root.add(box(0.16, TOP_E, 0.42, frameM, EX0 - 0.06, TOP_E / 2, CY0 + (k / 13) * (CY1 - CY0)))
  for (let i = 1; i < LV_E; i++) root.add(box(0.4, 0.4, CY1 - CY0, frameM, EX0 - 0.12, H1 + i * FH, 0))
  root.add(box(0.5, 0.6, CY1 - CY0 + 1, M(C.wood, { roughness: 0.74 }), EX0 - 0.1, TOP_E - 0.3, 0))
  for (let k = 0; k < 6; k++) {
    root.add(box(0.2, TOP_E - 3, 0.2, M(C.glow, { emissive: C.glow, emissiveIntensity: 1.3, roughness: 0.4 }), AX1 - 0.4, (TOP_E - 3) / 2 + 0.6, AZ0 + 0.9 + k * 1.9))
  }

  // 4 · 门诊翼（北，4 层，18.3m）
  for (let i = 1; i < LV_W; i++) {
    const yb = H1 + i * FH
    const y0 = yb - FH
    root.add(slab(WY0, WY1, WZ0, WZ1, yb, 0.5, concM))
    for (const x of [-15, -9, -3, 3]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, FH, 24), colM)
      c.position.set(x, y0 + FH / 2, (WZ0 + WZ1) / 2 + 1.6)
      c.castShadow = true
      c.receiveShadow = true
      root.add(c)
    }
    facade(root, { len: WY1 - WY0, x: WY0, y0, z: WZ1, rotY: 0, fins: 11 })
    facade(root, { len: WZ1 - WZ0, x: WY0, y0, z: WZ0, rotY: -Math.PI / 2 })
    facade(root, { len: WY1 - WY0, x: WY1, y0, z: WZ0, rotY: Math.PI, fins: 11, brise: true })
  }

  // 5 · 康复翼（南，3 层，14.0m）
  for (let i = 1; i < LV_R; i++) {
    const yb = H1 + i * FH
    const y0 = yb - FH
    root.add(slab(RY0, RY1, RZ0, RZ1, yb, 0.5, concM))
    for (const x of [-15, -9, -3, 3]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, FH, 24), colM)
      c.position.set(x, y0 + FH / 2, (RZ0 + RZ1) / 2 - 1.6)
      c.castShadow = true
      c.receiveShadow = true
      root.add(c)
    }
    facade(root, { len: RY1 - RY0, x: RY1, y0, z: RZ0, rotY: Math.PI, fins: 11 })
    facade(root, { len: RZ1 - RZ0, x: RY0, y0, z: RZ1, rotY: Math.PI / 2 })
    facade(root, { len: RY1 - RY0, x: RY0, y0, z: RZ1, rotY: 0, brise: true, fins: 11 })
    facade(root, { len: RZ1 - RZ0, x: RY1, y0, z: RZ0, rotY: -Math.PI / 2 })
  }

  // 6 · 愈光庭：26×16m 露天疗愈庭园
  const court = new THREE.Group()
  pave(-20, EX0, CY0, CY1)
  for (let k = 0; k < 32; k++) {
    const a0 = (k / 32) * Math.PI * 2
    const a1 = ((k + 1) / 32) * Math.PI * 2
    const s = new THREE.Shape()
    s.moveTo(Math.cos(a0) * 4.2, Math.sin(a0) * 4.2)
    s.lineTo(Math.cos(a0) * 8.4, Math.sin(a0) * 8.4)
    s.absarc(0, 0, 8.4, a0, a1, false)
    s.lineTo(Math.cos(a1) * 4.2, Math.sin(a1) * 4.2)
    s.absarc(0, 0, 4.2, a1, a0, true)
    s.closePath()
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false, curveSegments: 3, steps: 1 }),
      k % 2 === 0 ? M(C.pave, { roughness: 0.9 }) : M(C.paveDark, { roughness: 0.92 }))
    m.rotation.x = -Math.PI / 2
    m.position.set(-6.5, 0.06, 0)
    m.receiveShadow = true
    court.add(siteTag(m))
  }
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.2, 0.6, 48), M(C.conc, { roughness: 0.7 }))
  basin.position.set(-6.5, 0.3, 0)
  basin.receiveShadow = true
  court.add(basin)
  const water = new THREE.Mesh(new THREE.CylinderGeometry(3.85, 3.85, 0.06, 48), M(C.water, { metalness: 0.7, roughness: 0.08, emissive: '#5E93A8', emissiveIntensity: 0.3 }))
  water.position.set(-6.5, 0.55, 0)
  court.add(water)
  const rim = new THREE.Mesh(new THREE.TorusGeometry(4.05, 0.14, 8, 48), panelM)
  rim.position.set(-6.5, 0.6, 0)
  rim.rotation.x = Math.PI / 2
  court.add(rim)
  // 庭院的树：从浅池里长出来的银杏，母题「庭」的心跳
  court.add(healingTree({
    rand: rng, h: 16.5, crown: 3.6, blobs: 8, detail: 2, spread: 3.2,
    x: -6.5, y: 0.55, z: 0, leafColor: C.green3, trunkColor: '#9A8A74',
  }))
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + 0.5
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.2, 8), M(C.glow, { emissive: C.glow, emissiveIntensity: 1.6, roughness: 0.4 }))
    rod.position.set(-6.5 + Math.cos(a) * 6.4, 2.1, Math.sin(a) * 6.4)
    court.add(siteTag(rod))
  }
  // 环形坐凳：三圈，围着浅池
  for (let k = 0; k < 3; k++) {
    const r = 6.3 + k * 0.62
    const seg = 12 + k * 8
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * Math.PI * 2 + k * 0.22
      const b = ctx.blocks.bench({ x: -6.5 + Math.cos(a) * r, z: Math.sin(a) * r, rotY: -a + Math.PI / 2 })
      court.add(siteTag(b))
    }
  }
  // 药草园：六道低矮药草畦，庭的东西两侧对称布置
  for (let k = 0; k < 6; k++) {
    const x = 0.9 + k * 1.1
    greenBand(court, x, 0, -6.5, 0.92, 5.4, 13, true)
    greenBand(court, x, 0, 6.5, 0.92, 5.4, 13, true)
  }
  // 庭园西端三级草坡台阶与半圆看坐阶
  for (let k = 0; k < 3; k++) {
    root.add(siteTag(box(4.4, 0.34, 1.5, M(C.grass, { roughness: 1 }), -17.4, 0.17 + k * 0.34, 0)))
    const step = new THREE.Mesh(new THREE.TorusGeometry(9.4 + k * 1.1, 0.3, 8, 40, Math.PI), M(C.conc, { roughness: 0.85 }))
    step.position.set(-6.5, 0.3 + k * 0.36, 0)
    step.rotation.x = Math.PI / 2
    step.rotation.z = Math.PI
    root.add(siteTag(step))
  }
  // 塔内中庭的发光环梁：每层一道，勾出中庭的八层轮廓
  for (let i = 1; i < LV_E; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.12, 6, 32), M(C.glow, { emissive: C.glow, emissiveIntensity: 1.1, roughness: 0.5 }))
    ring.position.set((AX0 + AX1) / 2, H1 + i * FH - 0.2, 0)
    ring.rotation.x = Math.PI / 2
    root.add(ring)
  }
  // 门诊翼南墙（庭院北侧）挂绿墙
  court.add(greenWall({
    w: WY1 - WY0 - 2, h: 11, rand: rng, cols: 40, rows: 20, leaf: 0.34, detail: 1,
    x: (WY0 + WY1) / 2, y: 2.2, z: WZ0 + 0.22, panelColor: C.green2, leafColor: C.green, leafColor2: C.green3,
  }))
  root.add(court)

  // 7 · 塔顶采光顶：罩住塔内中庭，半径收在中庭轮廓内，不越出塔的体量
  const lensR = 5
  const lens = new THREE.Mesh(new THREE.SphereGeometry(lensR, 40, 14, 0, Math.PI * 2, 0, 0.7),
    M(C.glass, { metalness: 0.45, roughness: 0.14, emissive: '#CFE6F2', emissiveIntensity: 0.5, side: THREE.DoubleSide, transparent: true, opacity: 0.55 }))
  lens.scale.y = 0.66
  lens.position.set((AX0 + AX1) / 2, TOP_E + 0.4, 0)
  lens.castShadow = false
  root.add(lens)
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI
    const pts: THREE.Vector3[] = []
    for (let s = 0; s <= 8; s++) {
      const t = (s / 8) * 0.7
      pts.push(new THREE.Vector3(
        (AX0 + AX1) / 2 + Math.cos(a) * Math.sin(t) * lensR,
        TOP_E + 0.4 + Math.cos(t) * lensR * 0.66,
        Math.sin(a) * Math.sin(t) * lensR,
      ))
    }
    root.add(tube(pts, 0.11, steelM, 5, 18))
  }
  const ringBeam = new THREE.Mesh(new THREE.TorusGeometry(lensR * Math.sin(0.7), 0.22, 8, 44), frameM)
  ringBeam.position.set((AX0 + AX1) / 2, TOP_E + 0.4, 0)
  ringBeam.rotation.x = Math.PI / 2
  root.add(ringBeam)
  for (let k = 0; k < 5; k++) {
    const z = AZ0 + 1.2 + (k / 4) * (AZ1 - AZ0 - 2.4)
    root.add(tube([
      new THREE.Vector3(AX0 + 0.6, TOP_E + 1.1, z),
      new THREE.Vector3((AX0 + AX1) / 2, TOP_E + lensR * 0.66 + 0.4, z),
      new THREE.Vector3(AX1 - 0.6, TOP_E + 1.1, z),
    ], 0.09, steelM, 5, 20))
  }

  // 8 · 屋顶花园：门诊翼 18.3m / 康复翼 14.0m / 塔顶 31.2m
  const roof = (yTop: number, x0: number, x1: number, z0: number, z1: number): THREE.Group => {
    const g = new THREE.Group()
    g.position.y = yTop
    const cx = (x0 + x1) / 2
    const cz = (z0 + z1) / 2
    const segs: Array<[number, number, number, number]> = [
      [x1 - x0, cx, z1, 0], [x1 - x0, cx, z0, 0], [z1 - z0, x1, cz, Math.PI / 2], [z1 - z0, x0, cz, Math.PI / 2],
    ]
    for (const [len, px, pz, rot] of segs) {
      const r = ctx.blocks.railing({ w: len, h: 1.1, color: C.frame, x: px, y: 0, z: pz })
      r.rotation.y = rot
      g.add(r)
    }
    return g
  }
  // 门诊翼屋顶：候诊露台 + 观景廊架 + 绿化
  const roofW = roof(TOP_W, WY0, WY1, WZ0, WZ1)
  greenBand(roofW, -12, 0, 12.2, 7, 3.2, 26)
  greenBand(roofW, 1.5, 0, 12.2, 7, 3.2, 26)
  for (let k = 0; k < 3; k++) roofW.add(healingTree({ rand: rng, h: 4.6, crown: 1.4, blobs: 5, x: -14 + k * 8, y: 0, z: 9.4, leafColor: C.green3 }))
  const perg = new THREE.Group()
  perg.position.set(-6, 0, 11.5)
  for (const [px, pz] of [[-3.2, -1.4], [3.2, -1.4], [-3.2, 1.4], [3.2, 1.4]] as const) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 3.1, 16), woodM)
    c.position.set(px, 1.55, pz)
    c.castShadow = true
    perg.add(c)
  }
  for (let k = 0; k < 12; k++) perg.add(box(7.2, 0.15, 0.26, woodM, 0, 3.2, -1.6 + k * 0.29))
  perg.add(box(7.6, 0.2, 0.28, woodM, 0, 3.44, -1.78))
  perg.add(box(7.6, 0.2, 0.28, woodM, 0, 3.44, 1.78))
  for (let k = 0; k < 4; k++) perg.add(ctx.blocks.bench({ x: -2.4 + k * 1.6, z: 0, rotY: Math.PI / 2 }))
  roofW.add(perg)
  roofW.add(box(4, 2.6, 3.4, M(C.mint, { roughness: 0.7 }), 3.4, 1.3, 10))
  roofW.add(box(4.3, 0.26, 3.7, concM, 3.4, 2.73, 10))
  roofW.add(box(1.1, 2, 0.14, M(C.wood, { roughness: 0.7 }), 3.4, 1, 8.24))
  root.add(roofW)
  // 康复翼屋顶：低伏的绿台
  const roofR = roof(TOP_R, RY0, RY1, RZ0, RZ1)
  greenBand(roofR, -12, 0, -11.8, 7.5, 3.4, 30)
  greenBand(roofR, 1.5, 0, -11.8, 7.5, 3.4, 30)
  for (let k = 0; k < 3; k++) roofR.add(healingTree({ rand: rng, h: 4.2, crown: 1.3, blobs: 5, x: -14 + k * 8, y: 0, z: -9.6, leafColor: C.green3 }))
  roofR.add(box(3.6, 2.4, 3, M(C.panel, { roughness: 0.72 }), 3.2, 1.2, -10))
  roofR.add(box(3.9, 0.26, 3.3, concM, 3.2, 2.53, -10))
  root.add(roofR)
  // 塔顶：机组 + 通风帽 + 观景绿带（坐标全部落在塔的 6..17 轮廓内）
  const roofE = roof(TOP_E, EX0, EX1, EZ0, EZ1)
  for (const [ux, uz] of [[9, -11.5], [9, 6.5], [14.7, 11]] as const) {
    roofE.add(box(2.6, 1.3, 2.2, M(C.frame, { metalness: 0.5, roughness: 0.4 }), ux, 0.65, uz))
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.05, 0.6, 16), steelM)
    cap.position.set(ux, 1.6, uz)
    cap.castShadow = true
    roofE.add(cap)
    roofE.add(ctx.blocks.latticePanel({ w: 2.6, h: 1, cols: 6, rows: 2, bar: 0.06, color: C.frame, x: ux, y: 0.15, z: uz + 1.12 }))
  }
  greenBand(roofE, 11.5, 0, -11.5, 7, 3.2, 26)
  roofE.add(healingTree({ rand: rng, h: 4, crown: 1.2, blobs: 5, x: 14.4, y: 0, z: 3, leafColor: C.green3 }))
  root.add(roofE)

  // 9 · 场地：北候诊前庭 / 西绿谷 / 东落客 / 南康复花园
  pave(-20, 20, WZ1, 20)
  for (const x of [-14, -6, 2, 13]) {
    root.add(siteTag(planter({ w: 3.2, d: 3.2, h: 0.55, x, y: 0, z: 17.5, site: true, soil: true })))
    root.add(siteTag(healingTree({ rand: rng, h: 6.6, crown: 1.55, blobs: 6, x, y: 0.55, z: 17.5, site: true, leafColor: C.green3 })))
  }
  for (let k = 0; k < 9; k++) root.add(siteTag(ctx.blocks.bench({ x: -17.5 + k * 4.3, z: 16.3, rotY: Math.PI })))
  for (let k = 0; k < 6; k++) root.add(siteTag(ctx.blocks.streetLamp({ x: -17 + k * 7, z: 16.1, h: 4.6 })))
  pave(-20, WY0, RZ0, WZ1)
  for (const z of [-9.5, 9.5]) {
    root.add(siteTag(healingTree({ rand: rng, h: 7.6, crown: 1.3, blobs: 5, detail: 2, spread: 1.1, x: -18.3, y: 0, z, site: true, leafColor: C.green3 })))
  }
  for (const z of [-13, -5.5, 5.5, 13]) root.add(siteTag(ctx.blocks.bench({ x: -18.6, z, rotY: Math.PI / 2 })))
  pave(EX1, 20, EZ0, EZ1)
  for (const z of [-11, -3.5, 4, 11.5]) root.add(siteTag(ctx.blocks.streetLamp({ x: 18.6, z, h: 5.2 })))
  for (let k = 0; k < 7; k++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 6, 14, Math.PI), frameM)
    r.position.set(18.7, 0.45, -6 + k * 1.9)
    r.rotation.y = Math.PI / 2
    root.add(siteTag(r))
  }
  pave(-20, 20, -20, RZ0)
  for (let k = 0; k < 5; k++) greenBand(root, -15 + k * 7.5, 0, -17.6, 5.2, 2.4, 14, true)
  for (const x of [-16, -5.5, 5.5, 16]) root.add(siteTag(healingTree({ rand: rng, h: 6.2, crown: 1.4, blobs: 6, x, y: 0, z: -17.9, site: true })))
  for (let k = 0; k < 10; k++) root.add(siteTag(ctx.blocks.bench({ x: -17.4 + k * 3.9, z: -15.7, rotY: 0 })))
  // 庭园与绿谷边缘的灌木带
  for (let k = 0; k < 80; k++) {
    const x = -19 + rng() * 38
    const z = rng() > 0.5 ? WZ1 + 0.4 + rng() * 3.6 : -19.4 + rng() * 3.6
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32 + rng() * 0.28, 1), M(rng() > 0.5 ? C.green : C.green3, { roughness: 0.95 }))
    s.position.set(x, 0.36, z)
    s.castShadow = true
    root.add(siteTag(s))
  }

  return root
}

import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { healingTree } from '../../blocks/space-bunny/healing-tree'
import { planter } from '../../blocks/space-bunny/planter'

/**
 * b-000030 愈光庭 · D5 模都医枢 三期疗愈庭园（街区级开放绿肺）
 * 母题：愈 · 光 · 庭 —— 本栋专答「怎么好起来」
 *
 * 一、二期是被治疗的身体；三期是**可以不带目的走进来的一片绿**。全城第一座向全城
 * 开放的疗愈庭园，周末向 F4/F6/C5 社区开放。它不是「公园」，是一张**处方的平面图**：
 * 每一块地对应一种好起来的方式——坐着（草坡静坐阶）、走着（环形康复步道）、
 * 吃着（中药茶座亭）、练着（低强度康复器械）、被雨水冲着（雨水花园）、
 * 闻着（药草畦）、看着（朴树树阵）。
 *
 * 宗地 60×20m（南排 1×3），北界与一期宗地直接相接：愈光楼的南花园就在前庭北缘，
 * 人从楼里出来直接踩进这片绿；南隔 12m 道路对 D6（nemotron AI 创新谷）；
 * 东邻静息塔，西临 C5 尚空。总图定档：亭群 ≤5m / 草坡台 ≤3m / 树 ≤9m，全园低伏。
 */

/** 体量：宗地 60×20m，局部原点 = 宗地中心，x ∈ [-30,30] / z ∈ [-10,10]（+z 为北，朝一期）
 *  本体（非 site 件）限于中央 56×16m：x ∈ [-28,28] / z ∈ [-8,8]；地被与景观件可至宗地边缘。 */
const LAWN_A = 10.4 // 中央草坪椭圆半轴 x
const LAWN_B = 2.7 // 中央草坪椭圆半轴 z
const PATH_A = 12.6 // 康复步道外圈半轴 x
const PATH_B = 4.9 // 康复步道外圈半轴 z
const PCZ = -3.1 // 椭圆中心 z
const PATH_W = PATH_A - LAWN_A // 步道净宽 2.2m

const C = {
  grass: '#8C9E8B',
  grassDeep: '#7B8F76',
  pave: '#D8D5CE',
  paveDark: '#B2AFA7',
  stone: '#C7C4BC',
  stoneDeep: '#A9A69E',
  wood: '#B08A5A',
  woodDeep: '#8E6E45',
  metal: '#93A0A6',
  steel: '#7C8A90',
  glass: '#9EC5DD',
  mint: '#BCD6C9',
  green: '#7FA07A',
  green2: '#5E7F5C',
  green3: '#9BB58E',
  soil: '#6B4A2F',
  water: '#7FB6C4',
  glow: '#FFF1CE',
  bloomA: '#E8C4C4',
  bloomB: '#E9D9A8',
  bloomC: '#D9C6E4',
  bloomD: '#F0CFA6',
  bloomE: '#C6DCE4',
  bloomF: '#DCE8C0',
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

const siteTag = (o: THREE.Object3D): THREE.Object3D => {
  o.userData.site = true
  return o
}

/** 椭圆环带（康复步道）：外圈正序、内圈逆序，挤出成一条贯通的带 */
function ellipseBand(a: number, b: number, width: number, y: number, m: THREE.Material, seg = 56): THREE.Mesh {
  const shape = new THREE.Shape()
  for (let i = 0; i <= seg; i++) {
    const t = (i / seg) * Math.PI * 2
    const x = Math.cos(t) * a
    const z = Math.sin(t) * b
    if (i === 0) shape.moveTo(x, z)
    else shape.lineTo(x, z)
  }
  const hole = new THREE.Path()
  for (let i = seg; i >= 0; i--) {
    const t = (i / seg) * Math.PI * 2
    const x = Math.cos(t) * (a - width)
    const z = Math.sin(t) * (b - width)
    if (i === seg) hole.moveTo(x, z)
    else hole.lineTo(x, z)
  }
  shape.holes.push(hole)
  const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false, curveSegments: 3, steps: 1 }), m)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = y
  mesh.receiveShadow = true
  return mesh
}

/** 铺装片（景观件，R13 豁免）：双色间插做出方向感 */
const pave = (x0: number, x1: number, z0: number, z1: number, step = 1.15, y = 0.04): void => {
  const nx = Math.max(1, Math.round((x1 - x0) / step))
  const nz = Math.max(1, Math.round((z1 - z0) / step))
  const tw = (x1 - x0) / nx
  const td = (z1 - z0) / nz
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const t = siteTag(box(tw - 0.06, 0.14, td - 0.06, (i + j) % 2 === 0 ? M(C.pave, { roughness: 0.92 }) : M(C.paveDark, { roughness: 0.94 }),
        x0 + tw * (i + 0.5), y, z0 + td * (j + 0.5)))
      t.castShadow = false
    }
  }
}

export default function build(ctx: BuildCtx): THREE.Object3D {
  const rng = ctx.rng
  const root = new THREE.Group()

  /** 一丛灌木/草花：二十面体叶簇，转一个随机角让边缘不呆 */
  const clump = (parent: THREE.Object3D, x: number, y: number, z: number, r: number, colors: string[], site = false): THREE.Mesh => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), M(colors[Math.floor(rng() * colors.length)], { roughness: 0.95 }))
    m.position.set(x, y, z)
    m.rotation.y = rng() * Math.PI
    m.castShadow = true
    parent.add(site ? siteTag(m) : m)
    return m
  }

  const stoneM = M(C.stone, { roughness: 0.88 })
  const stoneDeepM = M(C.stoneDeep, { roughness: 0.9 })
  const woodM = M(C.wood, { roughness: 0.76 })
  const woodDeepM = M(C.woodDeep, { roughness: 0.78 })
  const metalM = M(C.metal, { metalness: 0.55, roughness: 0.36 })
  const steelM = M(C.steel, { metalness: 0.6, roughness: 0.34 })
  const grassM = M(C.grass, { roughness: 1 })

  // ═══════════ 0 · 底子：草皮满铺至宗地边缘 + 铺装分区 ═══════════
  root.add(siteTag(box(60, 0.3, 20, grassM, 0, -0.15, 0)))

  // 1 · 北入口前庭（z 1.8..10）：自愈光楼南花园接入
  pave(-30, 30, 1.8, 10)
  // 木廊架：24m 长，把前庭与静坐阶连成一片有顶的灰空间
  const perg = new THREE.Group()
  perg.position.set(-7, 0, 5.6)
  for (const px of [-11, -7.4, -3.8, -0.2, 3.4, 7, 10.6]) {
    for (const pz of [-1.5, 1.5]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, 3.2, 16), woodM)
      c.position.set(px, 1.6, pz)
      c.castShadow = true
      perg.add(c)
    }
  }
  for (let k = 0; k < 15; k++) perg.add(box(24.4, 0.16, 0.17, woodM, 0, 3.28, -1.8 + k * 0.26))
  for (const pz of [-1.85, 1.85]) {
    perg.add(box(24.8, 0.24, 0.3, woodDeepM, 0, 3.52, pz))
    perg.add(box(24.8, 0.34, 0.24, woodDeepM, 0, 0.17, pz))
  }
  for (const px of [-9.5, -5.5, -1.5, 2.5, 6.5]) {
    perg.add(ctx.blocks.bench({ x: px, z: 0, rotY: Math.PI / 2 }))
  }
  root.add(perg)

  // 前庭树池与朴树（≤9m，且树冠须留在宗地边缘内）
  for (const x of [-22, 16, 24]) {
    root.add(siteTag(planter({ w: 3, d: 3, h: 0.55, x, y: 0, z: 7.6, site: true, soil: true })))
    for (let k = 0; k < 7; k++) clump(root, x - 1 + rng() * 2, 0.72, 7.6 - 1 + rng() * 2, 0.3 + rng() * 0.2, [C.green, C.green3], true)
    root.add(siteTag(healingTree({ rand: rng, h: 7.4, crown: 1.45, blobs: 7, detail: 2, spread: 1.38, x, y: 0.55, z: 7.6, site: true, leafColor: C.green3 })))
  }
  for (const x of [-27, -13.5, 0, 12, 20, 28]) {
    root.add(siteTag(ctx.blocks.bench({ x, z: 2.6, rotY: Math.PI })))
  }
  for (const x of [-25, -15, 3, 14, 22]) {
    root.add(siteTag(ctx.blocks.streetLamp({ x, z: 9, h: 4.4 })))
  }

  // 入口标识牌：石屏 + 「愈光庭」发光字 + 木质导览牌
  const sign = new THREE.Group()
  sign.position.set(-19.5, 0, 6.6)
  sign.add(box(1.1, 3.2, 0.5, stoneM, 0, 1.6, 0))
  sign.add(box(1.5, 0.3, 0.9, stoneDeepM, 0, 3.35, 0))
  const ns = ctx.blocks.neonSign({ w: 3.6, h: 0.95, color: '#8FD9C4', x: 0, y: 2.5, z: 0.3 })
  sign.add(ns)
  sign.add(box(2.4, 1.5, 0.16, woodDeepM, 2.6, 1.2, 0))
  sign.add(box(2.1, 1.2, 0.06, M('#EFE9DC', { roughness: 0.85 }), 2.6, 1.2, 0.1))
  for (let k = 0; k < 5; k++) sign.add(box(1.7, 0.06, 0.03, M(C.woodDeep, { roughness: 0.8 }), 2.6, 1.62 - k * 0.22, 0.14))
  root.add(sign)

  // 2 · 三级草坡静坐阶（z −0.4..1.8）：全园唯一的高度变化，也是「坐」的邀请
  for (let k = 0; k < 3; k++) {
    const z1 = 1.8 - k * 0.73
    const z0 = z1 - 0.73
    const top = 1.35 - k * 0.45
    root.add(box(52, 0.45, 0.73, M(C.grassDeep, { roughness: 1 }), 0, top - 0.22, (z0 + z1) / 2))
    root.add(box(52, top, 0.16, stoneM, 0, top / 2, z0 + 0.08))
    root.add(box(52, 0.14, 0.2, stoneDeepM, 0, top - 0.02, z0 + 0.1))
    for (let j = -3; j <= 3; j++) root.add(box(3.4, 0.16, 0.5, woodM, j * 7.4, top + 0.08, z1 - 0.32))
  }
  for (let k = 0; k < 22; k++) clump(root, -25 + rng() * 50, 1.5, -0.5 + rng() * 0.8, 0.24 + rng() * 0.18, [C.green3, C.green])

  // 3 · 环形康复步道 + 中央草坪
  root.add(ellipseBand(PATH_A, PATH_B, PATH_W, 0.05, M(C.pave, { roughness: 0.92 })))
  for (let k = 0; k < 30; k++) {
    const t = (k / 30) * Math.PI * 2
    const mx = Math.cos(t) * (LAWN_A + PATH_W / 2)
    const mz = PCZ + Math.sin(t) * (LAWN_B + PATH_W / 2)
    const j = siteTag(box(0.22, 0.16, PATH_W, M(C.paveDark, { roughness: 0.94 }), mx, 0.12, mz))
    j.rotation.y = -Math.atan2(Math.cos(t) * PATH_B, -Math.sin(t) * PATH_A)
    j.castShadow = false
    root.add(j)
  }
  root.add(siteTag(ellipseBand(LAWN_A, LAWN_B, 0.5, 0.03, grassM)))
  // 灯环：24 盏庭院灯，沿步道外缘等分
  for (let k = 0; k < 30; k++) {
    const t = (k / 30) * Math.PI * 2
    const lx = Math.cos(t) * (PATH_A + 0.85)
    const lz = PCZ + Math.sin(t) * (PATH_B + 0.85)
    const g = new THREE.Group()
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.95, 8), metalM)
    post.position.y = 0.47
    post.castShadow = true
    g.add(post)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 8), M(C.glow, { emissive: C.glow, emissiveIntensity: 1.5, roughness: 0.4 }))
    head.position.y = 1.05
    g.add(head)
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.1, 12), stoneDeepM))
    g.position.set(lx, 0, lz)
    root.add(siteTag(g))
  }
  // 朴树树阵 3×3 + 地被
  for (const x of [-7.2, 0, 7.2]) {
    for (const z of [PCZ - 2.1, PCZ, PCZ + 2.1]) {
      root.add(siteTag(planter({ w: 2.2, d: 2.2, h: 0.42, x, y: 0, z, site: true, soil: true })))
      root.add(siteTag(healingTree({ rand: rng, h: 7.6, crown: 1.85, blobs: 9, detail: 2, spread: 1.76, x, y: 0.42, z, site: true, leafColor: C.green3 })))
      for (let k = 0; k < 6; k++) clump(root, x - 0.9 + rng() * 1.8, 0.56, z - 0.9 + rng() * 1.8, 0.22 + rng() * 0.16, [C.green, C.green2], true)
    }
  }
  for (let k = 0; k < 90; k++) {
    const t = rng() * Math.PI * 2
    const rr = 0.35 + rng() * 0.6
    clump(root, Math.cos(t) * LAWN_A * rr, 0.16, PCZ + Math.sin(t) * LAWN_B * rr, 0.18 + rng() * 0.14, [C.green, C.green3, C.green2], true)
  }

  // 4 · 药草园分区：6 道抬高畦，每畦不同叶色 + 木质铭牌
  const herbSpots: Array<[number, string]> = [
    [-12.4, C.green], [-9.4, C.green2], [-6.4, C.green3], [-1.2, C.green], [1.8, C.green3], [4.8, C.green2],
  ]
  for (let k = 0; k < herbSpots.length; k++) {
    const [x, col] = herbSpots[k]
    root.add(planter({ w: 2.5, d: 1.15, h: 0.42, x, y: 0, z: 0.9, round: 0.26 }))
    for (let j = 0; j < 46; j++) {
      clump(root, x - 1.05 + rng() * 2.1, 0.56 + rng() * 0.22, 0.9 - 0.42 + rng() * 0.84, 0.15 + rng() * 0.12, [col, C.green3])
    }
    root.add(box(0.5, 0.5, 0.08, woodDeepM, x, 0.9, 1.55))
    root.add(box(0.36, 0.06, 0.03, M(C.pave, { roughness: 0.9 }), x, 1.02, 1.6))
    root.add(box(0.26, 0.05, 0.03, M(C.paveDark, { roughness: 0.9 }), x, 0.86, 1.6))
  }

  // 5 · 雨水花园（西南下沉 bioswale）：全园的水与雨
  const rain = new THREE.Group()
  rain.position.set(-20.5, 0, -4)
  // 下沉池：石砌池壁 + 低于地面的池底
  rain.add(box(12.4, 0.9, 6.4, M(C.stoneDeep, { roughness: 0.95 }), 0, -0.5, 0))
  rain.add(box(13, 0.34, 0.44, stoneM, 0, 0.1, -3.2))
  rain.add(box(13, 0.34, 0.44, stoneM, 0, 0.1, 3.2))
  rain.add(box(0.44, 0.34, 6.4, stoneM, -6.5, 0.1, 0))
  rain.add(box(0.44, 0.34, 6.4, stoneM, 6.5, 0.1, 0))
  rain.add(box(11.6, 0.1, 5.6, M(C.water, { metalness: 0.65, roughness: 0.12, emissive: '#4E7F90', emissiveIntensity: 0.2 }), 0, -0.32, 0))
  // 卵石滩
  for (let k = 0; k < 165; k++) {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14 + rng() * 0.16, 1), M(k % 3 === 0 ? C.stone : C.stoneDeep, { roughness: 0.95 }))
    s.position.set(-5.6 + rng() * 11.2, -0.22 + rng() * 0.18, -2.6 + rng() * 5.2)
    s.rotation.set(rng() * 3, rng() * 3, rng() * 3)
    s.castShadow = true
    rain.add(s)
  }
  // 芦苇与水生植物
  for (let k = 0; k < 74; k++) {
    const bx = -5.4 + rng() * 10.8
    const bz = -2.5 + rng() * 5
    const hgt = 0.9 + rng() * 0.8
    for (let j = 0; j < 4; j++) {
      const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.045, hgt, 5), M(rng() > 0.5 ? C.green2 : C.green, { roughness: 0.95 }))
      reed.position.set(bx + (rng() - 0.5) * 0.4, -0.28 + hgt / 2, bz + (rng() - 0.5) * 0.4)
      reed.rotation.z = (rng() - 0.5) * 0.5
      reed.rotation.x = (rng() - 0.5) * 0.5
      reed.castShadow = true
      rain.add(reed)
    }
  }
  // 三块踏步石与木栈道
  for (let k = 0; k < 3; k++) {
    const st = new THREE.Mesh(new THREE.IcosahedronGeometry(0.52, 2), M(C.stone, { roughness: 0.88 }))
    st.position.set(-4.4 + k * 4.4, -0.16, -1.6 + k * 1.5)
    st.scale.set(1, 0.42, 1)
    st.castShadow = true
    rain.add(st)
  }
  for (let k = 0; k < 30; k++) rain.add(box(0.52, 0.1, 2.1, woodM, -5.6 + k * 0.4, 0.02, 2.4))
  for (const sx of [-5.7, 6.1]) rain.add(box(0.16, 0.26, 2.4, woodDeepM, sx, -0.06, 2.4))
  // 石堰溢流
  const weir = new THREE.Shape()
  weir.moveTo(-0.4, 0)
  weir.lineTo(0.4, 0)
  weir.lineTo(0.28, 0.5)
  weir.absarc(0, 0.5, 0.28, 0, Math.PI, false)
  weir.lineTo(-0.28, 0)
  weir.closePath()
  const weirMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(weir, { depth: 1.5, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1, curveSegments: 5, steps: 1 }), stoneM)
  weirMesh.rotation.y = Math.PI / 2
  weirMesh.position.set(-6.2, 0.1, 0)
  weirMesh.castShadow = true
  rain.add(weirMesh)
  root.add(rain)
  pave(-28, -13, -8, 1.5)

  // 6 · 便民健康服务亭群 3 座（≤5m）：康复训练凉亭 / 中药茶座亭 / 健康咨询亭
  // 康复训练凉亭
  const pav1 = new THREE.Group()
  pav1.position.set(19, 0, 1.2)
  for (const [px, pz] of [[-2.6, -2.2], [2.6, -2.2], [-2.6, 2.2], [2.6, 2.2], [0, -2.2], [0, 2.2]] as const) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 3.5, 16), woodM)
    c.position.set(px, 1.75, pz)
    c.castShadow = true
    pav1.add(c)
  }
  for (let k = 0; k < 18; k++) pav1.add(box(5.8, 0.14, 0.22, woodM, 0, 3.6, -2.5 + k * 0.3))
  pav1.add(box(6.2, 0.22, 0.28, woodDeepM, 0, 3.78, -2.66))
  pav1.add(box(6.2, 0.22, 0.28, woodDeepM, 0, 3.78, 2.66))
  for (const px of [-1.8, 1.8]) pav1.add(ctx.blocks.bench({ x: px, z: 0, rotY: 0 }))
  for (let k = 0; k < 5; k++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.06, 6, 16), metalM)
    r.position.set(-2 + k * 1, 1.5, -1.4)
    r.rotation.y = Math.PI / 2
    pav1.add(r)
    pav1.add(box(0.16, 1.5, 0.16, metalM, -2 + k * 1, 0.75, -1.4))
  }
  pav1.add(ctx.blocks.neonSign({ w: 1.7, h: 0.4, color: '#9BD8C6', x: 0, y: 3.9, z: 2.68 }))
  root.add(pav1)

  // 中药茶座亭
  const pav2 = new THREE.Group()
  pav2.position.set(24.4, 0, -4.6)
  for (const [px, pz] of [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]] as const) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 3.1, 16), woodM)
    c.position.set(px, 1.55, pz)
    c.castShadow = true
    pav2.add(c)
  }
  pav2.add(box(5, 0.2, 5, M(C.woodDeep, { roughness: 0.78 }), 0, 3.22, 0))
  pav2.add(box(5.5, 0.26, 0.3, woodM, 0, 3.44, -2.5))
  pav2.add(box(5.5, 0.26, 0.3, woodM, 0, 3.44, 2.5))
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4
    pav2.add(box(1.5, 0.16, 0.6, M(C.stone, { roughness: 0.85 }), Math.cos(a) * 1.5, 0.42, Math.sin(a) * 1.5))
  }
  pav2.add(new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.8, 0.84, 20), M(C.stone, { roughness: 0.8 })))
  ;(pav2.children[pav2.children.length - 1] as THREE.Mesh).position.y = 0.42
  // 药柜架：三层开格 + 陶药罐
  pav2.add(box(2.6, 0.12, 0.5, woodDeepM, 0, 1.5, -2.1))
  pav2.add(box(2.6, 0.12, 0.5, woodDeepM, 0, 2.2, -2.1))
  for (let k = 0; k < 8; k++) {
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.3, 12), M(C.mint, { roughness: 0.6 }))
    jar.position.set(-1.05 + (k % 4) * 0.7, 1.72 + Math.floor(k / 4) * 0.7, -2.1)
    jar.castShadow = true
    pav2.add(jar)
  }
  pav2.add(ctx.blocks.neonSign({ w: 1.7, h: 0.4, color: '#E9C88F', x: 0, y: 3.6, z: 2.55 }))
  root.add(pav2)

  // 健康咨询亭
  const pav3 = new THREE.Group()
  pav3.position.set(16.6, 0, -5.2)
  pav3.add(box(6, 3.1, 4.4, M(C.mint, { roughness: 0.7 }), 0, 1.55, 0))
  pav3.add(box(6.5, 0.26, 4.9, stoneM, 0, 3.22, 0))
  pav3.add(box(5.2, 1.9, 0.14, M(C.glass, { metalness: 0.5, roughness: 0.16, emissive: '#E6E1CE', emissiveIntensity: 0.3 }), 0, 1.5, 2.24))
  for (const px of [-2.7, 0, 2.7]) pav3.add(box(0.16, 1.95, 0.28, metalM, px, 1.5, 2.2))
  pav3.add(box(3.2, 1.05, 0.7, woodM, 0, 0.55, 1.3))
  pav3.add(ctx.blocks.neonSign({ w: 2.2, h: 0.5, color: '#9BD8C6', x: 0, y: 3.9, z: 2.3 }))
  // 无障碍坡道
  const ramp = new THREE.Shape()
  ramp.moveTo(0, 0)
  ramp.lineTo(2.4, 0)
  ramp.lineTo(2.4, 0.34)
  ramp.lineTo(0, 0)
  const rampMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(ramp, { depth: 1.9, bevelEnabled: false }), M(C.paveDark, { roughness: 0.94 }))
  rampMesh.rotation.y = Math.PI
  rampMesh.position.set(2.6, 0.05, 3.2)
  rampMesh.receiveShadow = true
  pav3.add(siteTag(rampMesh))
  root.add(pav3)

  // 7 · 低强度康复器械区（东侧，6 组）
  pave(13, 27, -8, -8.2, 1.0)
  const gearSpots: Array<[number, number]> = [[15.5, -2.6], [19, -2.6], [22.5, -2.6], [15.5, -6.2], [19, -6.2], [22.5, -6.2]]
  for (let g = 0; g < gearSpots.length; g++) {
    const [x, z] = gearSpots[g]
    const gp = new THREE.Group()
    gp.position.set(x, 0, z)
    gp.add(box(1.8, 0.12, 1.4, M(C.stoneDeep, { roughness: 0.92 }), 0, 0.06, 0))
    if (g % 3 === 0) {
      // 太极揉推器：两立柱 + 两组转臂 + 彩色握把
      for (const px of [-0.6, 0.6]) {
        gp.add(box(0.14, 1.5, 0.14, steelM, px, 0.75, 0))
        gp.add(box(0.12, 0.12, 1.1, steelM, px, 1.42, 0))
        gp.add(box(0.16, 0.16, 0.34, M(C.mint, { roughness: 0.5 }), px, 1.42, 0.6))
        gp.add(box(0.16, 0.16, 0.34, M(C.mint, { roughness: 0.5 }), px, 1.42, -0.6))
      }
      gp.add(box(1.5, 0.12, 0.14, steelM, 0, 1.1, 0))
    } else if (g % 3 === 1) {
      // 蹬力器 + 平衡板
      for (const px of [-0.55, 0.55]) gp.add(box(0.12, 1.1, 0.12, steelM, px, 0.6, 0))
      gp.add(box(1.3, 0.12, 0.12, steelM, 0, 1.1, 0))
      for (const px of [-0.45, 0.45]) gp.add(box(0.14, 0.5, 0.14, M(C.mint, { roughness: 0.5 }), px, 0.9, 0))
      gp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.14, 20), woodM))
      ;(gp.children[gp.children.length - 1] as THREE.Mesh).position.set(0, 0.72, 0.45)
      gp.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), M(C.stone, { roughness: 0.9 })))
      ;(gp.children[gp.children.length - 1] as THREE.Mesh).position.set(0, 0.92, 0.45)
    } else {
      // 漫步机 + 引体架
      for (const px of [-0.6, 0.6]) gp.add(box(0.12, 1.35, 0.12, steelM, px, 0.7, -0.5))
      gp.add(box(1.4, 0.12, 0.12, steelM, 0, 1.36, -0.5))
      gp.add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.34), M(C.mint, { roughness: 0.5 })))
      ;(gp.children[gp.children.length - 1] as THREE.Mesh).position.set(0, 0.62, 0.28)
      gp.add(box(0.16, 0.9, 0.16, steelM, -0.6, 0.45, 0.2))
      gp.add(box(0.16, 0.9, 0.16, steelM, 0.6, 0.45, 0.2))
    }
    root.add(siteTag(gp))
    // 每组器械旁一块说明牌
    root.add(siteTag(box(0.5, 0.7, 0.08, woodDeepM, x + 1.2, 0.5, z - 0.9)))
  }

  // 8 · 南缘花境 6 段（6 种花色）
  const blooms = [C.bloomA, C.bloomB, C.bloomC, C.bloomD, C.bloomE, C.bloomF]
  pave(-30, 30, -10, -8.2, 1.15)
  for (let s = 0; s < 6; s++) {
    const x0 = -28.5 + s * 9.5
    root.add(siteTag(planter({ w: 8.6, d: 1.5, h: 0.4, x: x0 + 4.3, y: 0, z: -9.1, site: true, round: 0.4, soil: true })))
    for (let k = 0; k < 62; k++) {
      const fx = x0 + 0.4 + rng() * 7.8
      const fz = -9.1 - 0.45 + rng() * 0.9
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.42, 5), M(C.green2, { roughness: 0.95 }))
      stem.position.set(fx, 0.61, fz)
      root.add(siteTag(stem))
      const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1 + rng() * 0.07, 1), M(rng() > 0.75 ? blooms[(s + 1) % 6] : blooms[s], { roughness: 0.85 }))
      fl.position.set(fx, 0.86 + rng() * 0.12, fz)
      fl.castShadow = true
      root.add(siteTag(fl))
    }
  }
  for (let k = 0; k < 46; k++) clump(root, -29 + rng() * 58, 0.3, -9.4 + rng() * 0.7, 0.2 + rng() * 0.16, [C.green, C.green3], true)

  // 9 · 「四时」铜药盘：园心的小品，把全园的处方讲成一句话
  const dial = new THREE.Group()
  dial.position.set(0, 0, PCZ)
  dial.add(new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.1, 0.3, 40), M(C.stone, { roughness: 0.82 })))
  ;(dial.children[dial.children.length - 1] as THREE.Mesh).position.y = 0.15
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.1, 40), M('#B08A5A', { metalness: 0.75, roughness: 0.32 }))
  disc.position.y = 0.34
  dial.add(disc)
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2
    const ray = box(0.06, 0.06, 1.34, M('#B08A5A', { metalness: 0.75, roughness: 0.32 }), 0, 0.4, 0)
    ray.rotation.y = a
    const holder = new THREE.Group()
    holder.position.set(Math.cos(a) * 0.75, 0, Math.sin(a) * 0.75)
    holder.rotation.y = -a
    holder.add(ray)
    dial.add(holder)
  }
  const gnomon = box(0.09, 1.5, 0.09, M('#B08A5A', { metalness: 0.75, roughness: 0.32 }), 0.2, 0.75, 0)
  gnomon.rotation.z = -0.5
  dial.add(gnomon)
  root.add(siteTag(dial))

  // 10 · 边界绿篱：把庭园与街区分开，但不做围墙
  for (let k = 0; k < 64; k++) {
    clump(root, -29.4 + rng() * 58.8, 0.62, -8.6, 0.5 + rng() * 0.22, [C.green2, C.green])
  }
  for (let k = 0; k < 30; k++) {
    clump(root, -29.2, 0.6, -8 + rng() * 16, 0.5 + rng() * 0.2, [C.green2, C.green])
    clump(root, 29.2, 0.6, -8 + rng() * 16, 0.5 + rng() * 0.2, [C.green2, C.green])
  }

  return root
}

import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { mergeBoxMesh, type BoxPart } from '../../blocks/mimo-v2.6-flash/geo'
import { paving, turf } from '../../blocks/mimo-v2.6-flash/paving'

/** 西岸镜庭 Westcourt Mirror —— D4 西岸商业街区五期（宗地 D4-04+05 合并 40×20m）
 * 立意「双镜对景 · 商业街区的会客厅」：中央镜面水池对 E4 镜湖成双镜 + 东段商业外摆 +
 * 北段玻璃廊架（母题「玻璃·橱窗·骑楼檐」）+ 西段旱喷光点阵 + 12 棵树阵坐凳花境；
 * 无围墙四面开口，「檐下—庭—园」动线的停顿与高潮；纯地景，街区最后一块留白填空。
 * 局部原点 = 宗地中心；北 +z 接二期骑楼檐下，西 -x 临街，东 +x 贴一期裙房，南 -x 对三/四期。
 * R13：非 site 且 >0.6m 且非薄板构件落 36×16 核；铺装/池壁/灯盘走地被豁免，树/灯/凳/篱/urn 官方件 site。 */

const STONE = '#E8E6E1'
const DARK = '#3E3C3A'
const glowMat = (color: string, i = 1.4): THREE.MeshStandardMaterial =>
  stdMaterial(color, { emissive: color, emissiveIntensity: i, roughness: 0.5 })

export default function build(ctx: BuildCtx): THREE.Object3D {
  const root = new THREE.Group()
  const seed = () => Math.floor(ctx.rng() * 1e6)

  /** 官方积木无抬升参数：Group 包装定位（site 豁免沿父链查找） */
  const at = (o: THREE.Object3D, x: number, y: number, z: number, ry = 0): THREE.Object3D => {
    const g = new THREE.Group()
    g.add(o)
    g.position.set(x, y, z)
    g.rotation.y = ry
    return g
  }

  // ================================================================ 场地基底与铺装
  // 草皮满铺 40×20（顶 0.3m 地被豁免）——四角留白自然成绿地
  root.add(turf({ w: 40, d: 20 }))

  const fineA = { colorA: '#D9D6CF', colorB: '#C4C1BA', accent: 5, inset: null } as const
  const fineB = { colorA: '#C4C1BA', colorB: '#A8A5A0', accent: 4, inset: null } as const
  // 北带接二期骑楼檐下、南带通三期/四期（z 7.4–10.0 / -10.0–-7.4）
  root.add(paving({ w: 39, d: 2.6, z: 8.7, cell: 0.24, gap: 0.05, y: 0.3, ...fineB }))
  root.add(paving({ w: 39, d: 2.6, z: -8.7, cell: 0.24, gap: 0.05, y: 0.3, ...fineA }))
  // 中轴通条绕水池东（x7.65–8.95，北接廊架、南穿南带）
  root.add(paving({ w: 1.3, d: 14.8, x: 8.3, cell: 0.24, gap: 0.05, y: 0.3, ...fineB }))
  // 玻璃廊架下步道（z4.5–7.4，与北带恰好接缝）
  root.add(paving({ w: 13, d: 2.9, z: 5.95, cell: 0.24, gap: 0.05, y: 0.3, ...fineA }))
  // 东段商业外摆区（x8.95–17.55、z±5.5）
  root.add(paving({ w: 8.6, d: 11, x: 13.25, cell: 0.24, gap: 0.05, y: 0.3, ...fineB }))
  // 西段入口广场：十字嵌条图案（x-17.8–-9.2、z±4.8）
  root.add(paving({
    w: 8.6, d: 9.6, x: -13.5, cell: 0.24, gap: 0.05, y: 0.3,
    colorA: '#D9D6CF', colorB: '#C4C1BA', accent: 4, inset: '#A8A5A0',
  }))

  // ================================================================ 中央镜面水池（x±7.5、z±3.5）
  // 池壁高 0.45（顶 ≤0.6 地被豁免），池沿一圈可坐
  root.add(mergeBoxMesh([
    { w: 15.4, h: 0.45, d: 0.4, x: 0, y: 0.45, z: 3.5 },
    { w: 15.4, h: 0.45, d: 0.4, x: 0, y: 0.45, z: -3.5 },
    { w: 0.4, h: 0.45, d: 6.6, x: 7.5, y: 0.45, z: 0 },
    { w: 0.4, h: 0.45, d: 6.6, x: -7.5, y: 0.45, z: 0 },
  ], stdMaterial(STONE, { roughness: 0.6 })))
  // 池底深色马赛克 cell0.3 + 十字嵌条（水下光带感）
  root.add(paving({
    w: 14.4, d: 6.2, y: 0.02, cell: 0.24, gap: 0.04,
    colorA: '#33465A', colorB: '#2B3C4E', accent: 6, inset: '#5E8FB3',
  }))
  // 微波水面：确定性双正弦扰动（禁随机），镜面金属感
  const wg = new THREE.PlaneGeometry(14.3, 6.1, 30, 14)
  wg.rotateX(-Math.PI / 2)
  const wp = wg.attributes.position
  for (let i = 0; i < wp.count; i++) {
    const x = wp.getX(i), z = wp.getZ(i)
    wp.setY(i, 0.5 + Math.sin(x * 2.1 + z * 1.7) * 0.02 + Math.sin(x * 0.9 - z * 2.6) * 0.015)
  }
  wg.computeVertexNormals()
  const water = new THREE.Mesh(
    wg,
    stdMaterial('#4A6C85', { metalness: 0.85, roughness: 0.18, emissive: '#2A5674', emissiveIntensity: 0.35, side: THREE.DoubleSide }),
  )
  water.receiveShadow = true
  root.add(water)
  // 涟漪环 3（主喷根 + 两涌泉根）
  const ripple = (r0: number, r1: number, x: number, z: number): THREE.Object3D => {
    const g = new THREE.RingGeometry(r0, r1, 24)
    g.rotateX(-Math.PI / 2)
    const m = new THREE.Mesh(g, glowMat('#7FB8D9', 0.8))
    m.position.set(x, 0.54, z)
    return m
  }
  root.add(ripple(0.5, 0.64, 0, 0))
  root.add(ripple(0.4, 0.52, -3.2, 0))
  root.add(ripple(0.4, 0.52, 3.2, 0))
  // 涌泉 4（x±3.2/±6.4）+ 中央主喷 1.6m：柱 + 发光头各自成 mesh
  const jet = (x: number, h: number, r: number): void => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.2, h, 8), stdMaterial('#C4C1BA', { metalness: 0.6, roughness: 0.3 }))
    col.position.set(x, 0.16 + h / 2, 0)
    root.add(col)
    const head = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.5, r, 0.14, 8), glowMat('#BFE4F5', 1.2))
    head.position.set(x, 0.16 + h + 0.07, 0)
    root.add(head)
  }
  for (const x of [-6.4, -3.2, 3.2, 6.4]) jet(x, 0.9, 0.1)
  jet(0, 1.6, 0.16)
  // 池内壁水下灯带（贴壁 y0.34，地被豁免）
  root.add(mergeBoxMesh([
    { w: 14.6, h: 0.06, d: 0.06, x: 0, y: 0.55, z: 3.26 },
    { w: 14.6, h: 0.06, d: 0.06, x: 0, y: 0.55, z: -3.26 },
    { w: 0.06, h: 0.06, d: 6.0, x: 7.26, y: 0.55, z: 0 },
    { w: 0.06, h: 0.06, d: 6.0, x: -7.26, y: 0.55, z: 0 },
  ], glowMat('#FFD9A0', 1.5)))
  // 池南北地射灯 6（绿地条上 y0.38）
  root.add(mergeBoxMesh([
    { w: 0.3, h: 0.08, d: 0.3, x: -5, y: 0.65, z: 4.6 },
    { w: 0.3, h: 0.08, d: 0.3, x: 0, y: 0.65, z: 4.6 },
    { w: 0.3, h: 0.08, d: 0.3, x: 5, y: 0.65, z: 4.6 },
    { w: 0.3, h: 0.08, d: 0.3, x: -5, y: 0.65, z: -4.6 },
    { w: 0.3, h: 0.08, d: 0.3, x: 0, y: 0.65, z: -4.6 },
    { w: 0.3, h: 0.08, d: 0.3, x: 5, y: 0.65, z: -4.6 },
  ], glowMat('#BFE4F5', 1.1)))
  // 池南北条状绿地（凸起花坛 0.3，顶 0.6 恰合地被豁免）
  const bedN = turf({ w: 14.4, d: 1.2, y: 0.3, color: '#7E9A7A' })
  bedN.position.z = 4.6
  root.add(bedN)
  const bedS = turf({ w: 14.4, d: 1.2, y: 0.3, color: '#7E9A7A' })
  bedS.position.z = -4.6
  root.add(bedS)

  // ================================================================ 北段玻璃廊架（≤2.9m 全薄豁免）
  // 柱 8（x-6/-2/2/6 × z4.9/9.0）；**按排拆两个 mesh**——合并则 extZ=4.32 撑爆薄豁免，
  // 拆后每排 min(extX,extZ)=0.22 ≤0.5 且顶 2.7 ≤3 → 薄豁免成立（z9.11 可越核）
  for (const z of [4.9, 9.0]) {
    const arcadeCols: BoxPart[] = []
    for (const x of [-6, -2, 2, 6]) arcadeCols.push({ w: 0.22, h: 2.7, d: 0.22, x, y: 1.35, z })
    root.add(mergeBoxMesh(arcadeCols, stdMaterial(DARK, { metalness: 0.6, roughness: 0.35 })))
  }
  // 顶条阵 9（d0.45 步进 0.6，逐条独立 mesh 走薄豁免伸到 z9.45；玻璃青透光感）
  for (let i = 0; i < 9; i++) {
    const z = 4.65 + i * 0.6
    root.add(mergeBoxMesh(
      [{ w: 12.7, h: 0.12, d: 0.45, x: 0, y: 2.75, z }],
      stdMaterial('#9EC5DD', { metalness: 0.3, roughness: 0.25, emissive: '#2A5674', emissiveIntensity: 0.5 }),
    ))
  }
  // 纵梁 2（压顶条阵两端）
  for (const x of [-6.3, 6.3]) {
    root.add(mergeBoxMesh([{ w: 0.16, h: 0.16, d: 5.1, x, y: 2.66, z: 7.0 }], stdMaterial(DARK, { metalness: 0.6, roughness: 0.35 })))
  }

  // ================================================================ 东段商业外摆（x8.95–17.55）
  // 遮阳伞 4（柱+8 段锥面+顶球，顶 ~3.1m；核内 x≤18.05）
  const umbrella = (x: number, z: number, color: string): THREE.Object3D => {
    const g = new THREE.Group()
    g.add(mergeBoxMesh([
      { w: 0.5, h: 0.06, d: 0.5, x: 0, y: 0.03, z: 0 },
      { w: 0.1, h: 2.3, d: 0.1, x: 0, y: 1.15, z: 0 },
    ], stdMaterial('#5B5956', { metalness: 0.5, roughness: 0.4 })))
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.35, 0.5, 8), stdMaterial(color, { roughness: 0.7 }))
    cone.position.y = 2.55
    g.add(cone)
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), glowMat('#FFD9A0', 1.0))
    finial.position.y = 2.83
    g.add(finial)
    g.position.set(x, 0.44, z)
    return g
  }
  root.add(umbrella(10.8, -3.6, '#E86A92'))
  root.add(umbrella(10.8, 3.6, '#F2E9D8'))
  root.add(umbrella(15.6, -3.6, '#F2E9D8'))
  root.add(umbrella(15.6, 3.6, '#E86A92'))
  // 圆桌 + 3 椅 × 4 套（桌椅在伞下、柱错开 0.6）
  const tableSet = (x: number, z: number): THREE.Object3D => {
    const g = new THREE.Group()
    g.add(mergeBoxMesh([
      { w: 1.05, h: 0.06, d: 1.05, x: 0, y: 0.72, z: 0 },
      { w: 0.12, h: 0.7, d: 0.12, x: 0, y: 0.35, z: 0 },
    ], stdMaterial(STONE, { roughness: 0.5 })))
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.5
      const chair = mergeBoxMesh([
        { w: 0.44, h: 0.06, d: 0.44, x: 0, y: 0.42, z: 0 },
        { w: 0.44, h: 0.44, d: 0.06, x: 0, y: 0.67, z: -0.19 },
        { w: 0.06, h: 0.4, d: 0.06, x: -0.17, y: 0.2, z: -0.17 },
        { w: 0.06, h: 0.4, d: 0.06, x: 0.17, y: 0.2, z: -0.17 },
        { w: 0.06, h: 0.4, d: 0.06, x: -0.17, y: 0.2, z: 0.17 },
        { w: 0.06, h: 0.4, d: 0.06, x: 0.17, y: 0.2, z: 0.17 },
      ], stdMaterial('#5B5956', { roughness: 0.5 }))
      const holder = new THREE.Group()
      holder.add(chair)
      holder.position.set(Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95)
      holder.rotation.y = -a - Math.PI / 2
      g.add(holder)
    }
    g.position.set(x, 0.44, z)
    return g
  }
  root.add(tableSet(11.4, -3.6))
  root.add(tableSet(11.4, 3.6))
  root.add(tableSet(16.2, -3.6))
  root.add(tableSet(16.2, 3.6))
  // 挂灯串：杆 2 + 水平串 + 12 灯球（交替暖红，球各自成 mesh）
  root.add(mergeBoxMesh([
    { w: 0.12, h: 3.3, d: 0.12, x: 17.6, y: 1.65, z: -4.6 },
    { w: 0.12, h: 3.3, d: 0.12, x: 17.6, y: 1.65, z: 4.6 },
  ], stdMaterial(DARK, { metalness: 0.5, roughness: 0.4 })))
  root.add(mergeBoxMesh([{ w: 0.04, h: 0.04, d: 9.2, x: 17.6, y: 3.2, z: 0 }], stdMaterial(DARK, { roughness: 0.6 })))
  for (let i = 0; i < 12; i++) {
    const z = -4.4 + i * 0.8
    root.add(mergeBoxMesh(
      [{ w: 0.16, h: 0.16, d: 0.16, x: 17.6, y: 3.1 - (i % 2) * 0.08, z }],
      glowMat(i % 4 === 0 ? '#FF6B4A' : '#FFD9A0', 1.5),
    ))
  }
  // 玻璃菜单牌 2（薄豁免，面向西广场）
  const menu = (x: number, z: number, ry: number): THREE.Object3D => {
    const g = new THREE.Group()
    g.add(mergeBoxMesh([
      { w: 0.7, h: 0.08, d: 0.3, x: 0, y: 0.04, z: 0 },
      { w: 0.1, h: 1.3, d: 0.1, x: 0, y: 0.65, z: 0 },
    ], stdMaterial(DARK, { metalness: 0.5, roughness: 0.4 })))
    g.add(mergeBoxMesh([
      { w: 0.62, h: 1.0, d: 0.05, x: 0, y: 0.9, z: 0 },
      { w: 0.54, h: 0.92, d: 0.07, x: 0, y: 0.9, z: 0 },
    ], glowMat('#9EC5DD', 0.7)))
    g.position.set(x, 0.44, z)
    g.rotation.y = ry
    return g
  }
  root.add(menu(9.6, -2.4, Math.PI / 2))
  root.add(menu(9.6, 2.4, Math.PI / 2))

  // ================================================================ 西段入口广场（旱喷光点阵）
  // 光盘 15（3×5，每盘独立 mesh；y0.47 贴铺装面）+ 水柱头阵（合并 1，薄豁免）
  for (const x of [-16.2, -13.5, -10.8]) for (const z of [-4, -2, 0, 2, 4]) {
    root.add(mergeBoxMesh([{ w: 0.56, h: 0.05, d: 0.56, x, y: 0.47, z }], glowMat('#9EC5DD', 0.9)))
  }
  const jetHeads: BoxPart[] = []
  for (const x of [-16.2, -13.5, -10.8]) for (const z of [-4, -2, 0, 2, 4]) {
    jetHeads.push({ w: 0.14, h: 0.36, d: 0.14, x, y: 0.65, z })
  }
  root.add(mergeBoxMesh(jetHeads, stdMaterial('#C4C1BA', { metalness: 0.6, roughness: 0.3 })))
  // 广场灯柱 2 + 高花钵 2（官方件 site）
  root.add(ctx.blocks.streetLamp({ x: -16.8, z: -5.8 }))
  root.add(ctx.blocks.streetLamp({ x: -16.8, z: 5.8 }))
  root.add(at(ctx.blocks.urn({ scale: 1.3 }), -10.2, 0.44, -4.2))
  root.add(at(ctx.blocks.urn({ scale: 1.3 }), -10.2, 0.44, 4.2))

  // ================================================================ 树阵 12（site；冠半径 ≈1.5×scale ≤1.95）
  const treeSpots: Array<[number, number]> = [
    [-15, 7], [-9.5, 7], [9.5, 7], [15, 7],
    [-15, -7], [-9.5, -7], [9.5, -7], [15, -7],
    [18.5, 5.4], [18.5, -5.4], [-18.5, 5.4], [-18.5, -5.4],
  ]
  for (const [x, z] of treeSpots) {
    root.add(ctx.blocks.tree({ x, z, scale: 1.0 + ctx.rng() * 0.3, seed: seed() }))
  }

  // ================================================================ 花境绿篱 6（贴地）
  root.add(ctx.blocks.hedge({ w: 6, d: 0.7, h: 0.55, z: 5.4 }))
  root.add(ctx.blocks.hedge({ w: 6, d: 0.7, h: 0.55, z: -5.4 }))
  root.add(ctx.blocks.hedge({ w: 6, d: 0.7, h: 0.55, x: -13.5, z: 4.9 }))
  root.add(ctx.blocks.hedge({ w: 6, d: 0.7, h: 0.55, x: -13.5, z: -4.9 }))
  root.add(ctx.blocks.hedge({ w: 7.5, d: 0.7, h: 0.55, x: 13.25, z: 6.1 }))
  root.add(ctx.blocks.hedge({ w: 7.5, d: 0.7, h: 0.55, x: 13.25, z: -6.1 }))

  // ================================================================ 街道家具
  // 坐凳 10：全落铺装面 y0.44（池沿 0.675 本身即坐凳——北 3 + 廊下 2 + 南 3 + 东 2）
  for (const x of [-5, 0, 5]) root.add(at(ctx.blocks.bench({ rotY: Math.PI }), x, 0.44, 6.6))
  root.add(at(ctx.blocks.bench({ rotY: Math.PI }), -4.2, 0.44, 5.4))
  root.add(at(ctx.blocks.bench({ rotY: Math.PI }), 4.2, 0.44, 5.4))
  for (const x of [-5, 0, 5]) root.add(at(ctx.blocks.bench({}), x, 0.44, -8.0))
  root.add(at(ctx.blocks.bench({ rotY: -Math.PI / 2 }), 17.0, 0.44, 0))
  root.add(at(ctx.blocks.bench({ rotY: -Math.PI / 2 }), 17.0, 0.44, 1.8))
  // 庭院灯 8：四角带端 + 南北带中段（官方件 site）
  for (const [x, z] of [
    [-17.5, 8.6], [17.5, 8.6], [-17.5, -8.6], [17.5, -8.6],
    [-8.3, 9], [8.3, 9], [-8.3, -9], [8.3, -9],
  ] as Array<[number, number]>) {
    root.add(ctx.blocks.streetLamp({ x, z }))
  }
  // 南沿矮栏杆 1（薄豁免，界定庭/园边界）
  root.add(ctx.blocks.railing({ w: 6, h: 0.85, x: -3, y: 0.44, z: -7.55, color: DARK }))

  return root
}

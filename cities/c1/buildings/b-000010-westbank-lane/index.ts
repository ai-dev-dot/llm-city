import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { mergeBoxMesh, mergeBoxes, type BoxPart } from '../../blocks/mimo-v2.6-flash/geo'
import { curtainGrid, finArray } from '../../blocks/mimo-v2.6-flash/curtainwall'
import { storefront } from '../../blocks/mimo-v2.6-flash/storefront'
import { paving, turf } from '../../blocks/mimo-v2.6-flash/paving'

/** 西岸里 Westbank Lane —— D4 西岸商业街区三期（宗地 D4-08+09，40×20m）
 * 立意「南檐坡屋」：沿 E4 南岸步道连续轻外廊（坡玻璃雨棚檐下步廊）；
 * 廊后三段业态——西段咖啡（双坡玻璃天窗 9.4m）、中段书店（2 层屋顶露台 12m 制高）、
 * 东段生活服务（木格栅棚 ≤11m）；北对中央光庭整幅橱窗 + 上亮带发光界面；
 * 东端临湖角树阵广场。一拱（一期）二平（二期）三坡（三期），全高 ≤12m（总图档内）。
 * 局部原点 = 宗地中心；北 +z 对光庭，东 +x 临镜湖，南 -z 接 E4 南岸步道。 */

const GLASS = '#5E8FB3'
const GLASS_EMIT = '#2A5674'
const FRAME = '#3E3C3A'
const ALUM = '#C4C1BA'
const STONE = '#E8E6E1'
const WOOD = '#B0885E'
const SIGN_COLORS = ['#FF6B4A', '#4ADFC4', '#FFD166', '#E86A92', '#7FD1FF', '#FF9F5A']

export default function build(ctx: BuildCtx): THREE.Object3D {
  const root = new THREE.Group()
  const seed = () => Math.floor(ctx.rng() * 1e6)

  // 官方积木无旋转/抬升参数：统一用 Group 包装定位（site 豁免沿父链查找）
  const at = (o: THREE.Object3D, x: number, y: number, z: number, ry = 0): THREE.Object3D => {
    const g = new THREE.Group()
    g.add(o)
    g.position.set(x, y, z)
    g.rotation.y = ry
    return g
  }

  /** 绕 X 轴旋转几何（坡屋面用：盒体合并后整体放坡，法线同步转） */
  const rotX = (g: THREE.BufferGeometry, a: number): THREE.BufferGeometry => {
    const c = Math.cos(a), s = Math.sin(a)
    const pos = g.attributes.position as THREE.BufferAttribute
    const nor = g.attributes.normal as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i), z = pos.getZ(i)
      pos.setY(i, y * c - z * s)
      pos.setZ(i, y * s + z * c)
      const ny = nor.getY(i), nz = nor.getZ(i)
      nor.setY(i, ny * c - nz * s)
      nor.setZ(i, ny * s + nz * c)
    }
    pos.needsUpdate = true
    nor.needsUpdate = true
    return g
  }

  /** 屋顶餐饮座（方桌 + 4 凳）+ 遮阳伞：两 mesh（木座 / 伞） */
  const seatSet = (x: number, y: number, z: number, umbrellaColor: string) => {
    const wood: BoxPart[] = [
      { w: 1.3, h: 0.09, d: 1.3, x: 0, y: 0.78, z: 0 },
      { w: 0.16, h: 0.74, d: 0.16, x: 0, y: 0.37, z: 0 },
      { w: 0.6, h: 0.06, d: 0.6, x: 0, y: 0.04, z: 0 },
    ]
    for (const [cx, cz] of [[-1.02, 0], [1.02, 0], [0, -1.02], [0, 1.02]] as const) {
      wood.push({ w: 0.44, h: 0.07, d: 0.44, x: cx, y: 0.46, z: cz })
      const sx = cx !== 0 ? Math.sign(cx) * 0.19 : 0
      const sz = cz !== 0 ? Math.sign(cz) * 0.19 : 0
      wood.push({ w: cx !== 0 ? 0.07 : 0.44, h: 0.52, d: cz !== 0 ? 0.07 : 0.44, x: cx + sx, y: 0.73, z: cz + sz })
      wood.push({ w: cx !== 0 ? 0.06 : 0.05, h: 0.42, d: cz !== 0 ? 0.06 : 0.05, x: cx + sx * 0.4, y: 0.21, z: cz + sz * 0.4 })
    }
    const shade: BoxPart[] = [
      { w: 0.09, h: 2.35, d: 0.09, x: 0, y: 1.175, z: 0 },
      { w: 2.2, h: 0.1, d: 2.2, x: 0, y: 2.36, z: 0 },
      { w: 2.3, h: 0.07, d: 0.12, x: 0, y: 2.28, z: 1.09 },
      { w: 2.3, h: 0.07, d: 0.12, x: 0, y: 2.28, z: -1.09 },
      { w: 0.12, h: 0.07, d: 2.3, x: 1.09, y: 2.28, z: 0 },
      { w: 0.12, h: 0.07, d: 2.3, x: -1.09, y: 2.28, z: 0 },
      { w: 0.1, h: 0.18, d: 0.1, x: 0, y: 2.5, z: 0 },
    ]
    return [
      at(mergeBoxMesh(wood, stdMaterial(WOOD, { roughness: 0.65 })), x, y, z),
      at(mergeBoxMesh(shade, stdMaterial(umbrellaColor, { roughness: 0.75 })), x, y, z),
    ]
  }

  // ================================================================ 场地
  // 草皮满铺宗地 40×20（顶 0.3m 地被豁免）；南接 E4 南岸步道、北对光庭、东西接口四带
  root.add(turf({ w: 40, d: 20 }))

  const bandA = { colorA: '#D9D6CF', colorB: '#C4C1BA', accent: 5, inset: null } as const
  const bandB = { colorA: '#C4C1BA', colorB: '#A8A5A0', accent: 4, inset: null } as const
  root.add(paving({ w: 39.9, d: 1.35, z: 9.32, y: 0.3, cell: 0.24, gap: 0.05, ...bandA }))
  root.add(paving({ w: 39.9, d: 1.35, z: -9.32, y: 0.3, cell: 0.24, gap: 0.05, ...bandB }))
  root.add(paving({ w: 1.35, d: 17.2, x: -19.32, y: 0.3, cell: 0.24, gap: 0.05, ...bandB }))
  root.add(paving({ w: 1.35, d: 17.2, x: 19.32, y: 0.3, cell: 0.24, gap: 0.05, ...bandB }))
  // 东角临湖树阵广场（薄板豁免）
  root.add(paving({ w: 2.4, d: 8.6, x: 18.7, z: -4.8, y: 0.3, cell: 0.28, gap: 0.05, ...bandA }))
  // 出入口接驳（南 3 对廊、北 2、东临湖 1）
  for (const x of [-12, 0, 12]) root.add(paving({ w: 3.4, d: 1.6, x, z: -8.4, y: 0.3, cell: 0.22, gap: 0.05, ...bandB }))
  for (const x of [-6, 9]) root.add(paving({ w: 3.4, d: 1.6, x, z: 8.4, y: 0.3, cell: 0.22, gap: 0.05, ...bandA }))
  root.add(paving({ w: 1.6, d: 3.0, x: 18.9, z: 2.5, y: 0.3, cell: 0.24, gap: 0.05, ...bandA }))
  // 南廊道地面（雨棚下，z -7.9..-5.5）
  root.add(paving({ w: 35.4, d: 2.4, z: -6.7, y: 0.3, cell: 0.22, gap: 0.05, ...bandA }))

  // 行道树 12（site 豁免；冠幅守 R2 容差：南 z-9.0/0.72、北 z9.0/0.7、东西 x±19.1/0.7、东广场 0.6）
  for (const [x, z, s] of [
    [-15, -9.0, 0.72], [-7.5, -9.0, 0.72], [0, -9.0, 0.72], [7.5, -9.0, 0.72], [15, -9.0, 0.72],
    [19.1, -8, 0.65], [19.1, -5, 0.65],
    [-13, 9.0, 0.7], [13, 9.0, 0.7],
    [-19.1, -7, 0.7], [-19.1, 6, 0.7],
    [18.55, -8.7, 0.6],
  ] as const) {
    root.add(ctx.blocks.tree({ x, z, scale: s, seed: seed() }))
  }
  // 路灯 10 / 坐凳 6 / 绿篱 4 / 石盆 4（官方件 site 豁免）
  for (const [x, z] of [
    [-10, -8.85], [2, -8.85], [14, -8.85], [-4, 8.85], [8, 8.85],
    [-14, -6.9], [-4, -6.9], [6, -6.9], [16, -6.9], [18.7, -2],
  ] as const) {
    root.add(ctx.blocks.streetLamp({ x, z }))
  }
  for (const [x, z, ry] of [
    [-8, -6.4, Math.PI], [4, -6.4, Math.PI], [12, -6.4, Math.PI],
    [18.5, -6, -Math.PI / 2], [18.5, -3.5, -Math.PI / 2], [0, 8.9, 0],
  ] as const) {
    root.add(at(ctx.blocks.bench({}), x, 0.3, z, ry))
  }
  root.add(ctx.blocks.hedge({ w: 4.0, h: 0.75, x: -4, z: -9.55 }))
  root.add(ctx.blocks.hedge({ w: 4.0, h: 0.75, x: 2, z: 9.55 }))
  root.add(ctx.blocks.hedge({ w: 0.9, d: 3.5, h: 0.75, x: 19.55, z: -4.5 }))
  root.add(ctx.blocks.hedge({ w: 0.9, d: 3.6, h: 0.75, x: -19.55, z: 0 }))
  for (const [x, z] of [[-16, -7.95], [16, -7.95], [-5.5, 9.4], [5.5, 9.4]] as const) {
    root.add(ctx.blocks.urn({ x, y: 0.3, z }))
  }

  // ================================================================ 主体三段
  // 非豁免件全落退线核 |x|≤18、|z|≤8（皮 x±17.6、北皮 z7.6、南皮 z-5.4，容差 0.05）
  const mass: BoxPart[] = [
    // 西段咖啡（双坡屋面下通高）：x -17.6..-6.7, z -5.4..7.6, y 0..6.6
    { w: 10.9, h: 6.6, d: 13.0, x: -12.15, y: 3.3, z: 1.1 },
    // 中段书店：x ±6.3, y 0..11.2（2 层）
    { w: 12.6, h: 11.2, d: 13.0, x: 0, y: 5.6, z: 1.1 },
    // 东段服务：x 6.7..17.6, y 0..6.6
    { w: 10.9, h: 6.6, d: 13.0, x: 12.15, y: 3.3, z: 1.1 },
    // 东段北条 2 层（棚架基座）：z 3..7.6, y 6.6..8.8
    { w: 10.9, h: 2.2, d: 4.6, x: 12.15, y: 7.7, z: 5.3 },
    // 中段女儿墙（y11.2..12.0，总图 12m 档顶）
    { w: 12.6, h: 0.8, d: 0.3, x: 0, y: 11.6, z: 7.45 },
    { w: 12.6, h: 0.8, d: 0.3, x: 0, y: 11.6, z: -5.25 },
    { w: 0.3, h: 0.8, d: 13.0, x: -6.15, y: 11.6, z: 1.1 },
    { w: 0.3, h: 0.8, d: 13.0, x: 6.15, y: 11.6, z: 1.1 },
    // 东段南顶露台女儿墙（y6.6..7.1）
    { w: 10.9, h: 0.5, d: 0.3, x: 12.15, y: 6.85, z: -5.25 },
    { w: 0.3, h: 0.5, d: 8.4, x: 6.85, y: 6.85, z: -1.2 },
    { w: 0.3, h: 0.5, d: 8.4, x: 17.45, y: 6.85, z: -1.2 },
    // 东段北条顶女儿墙（y8.8..9.3）
    { w: 10.9, h: 0.5, d: 0.3, x: 12.15, y: 9.05, z: 7.45 },
    { w: 10.9, h: 0.5, d: 0.3, x: 12.15, y: 9.05, z: 3.15 },
    { w: 0.3, h: 0.5, d: 4.6, x: 17.45, y: 9.05, z: 5.3 },
    { w: 0.3, h: 0.5, d: 4.6, x: 6.85, y: 9.05, z: 5.3 },
  ]
  root.add(mergeBoxMesh(mass, stdMaterial(STONE, { roughness: 0.7, metalness: 0.05 })))

  // 线脚与压顶（ALUM 独立 mesh：通长腰线 + 女儿墙压顶 + 西坡檐口）
  const trim: BoxPart[] = [
    { w: 35.4, h: 0.16, d: 0.18, x: 0, y: 6.66, z: 7.66 },
    { w: 35.4, h: 0.16, d: 0.18, x: 0, y: 6.66, z: -5.46 },
    { w: 0.18, h: 0.16, d: 13.0, x: -17.66, y: 6.66, z: 1.1 },
    { w: 0.18, h: 0.16, d: 13.0, x: 17.66, y: 6.66, z: 1.1 },
    // 中段女儿墙压顶
    { w: 12.8, h: 0.12, d: 0.42, x: 0, y: 11.94, z: 7.45 },
    { w: 12.8, h: 0.12, d: 0.42, x: 0, y: 11.94, z: -5.25 },
    { w: 0.42, h: 0.12, d: 13.1, x: -6.15, y: 11.94, z: 1.1 },
    { w: 0.42, h: 0.12, d: 13.1, x: 6.15, y: 11.94, z: 1.1 },
    // 东段女儿墙压顶
    { w: 11.1, h: 0.1, d: 0.4, x: 12.15, y: 7.14, z: -5.25 },
    { w: 11.1, h: 0.1, d: 0.4, x: 12.15, y: 9.34, z: 7.45 },
    { w: 11.1, h: 0.1, d: 0.4, x: 12.15, y: 9.34, z: 3.15 },
    // 西坡屋面檐口（南北）
    { w: 11.1, h: 0.3, d: 0.26, x: -12.15, y: 6.6, z: 7.66 },
    { w: 11.1, h: 0.3, d: 0.26, x: -12.15, y: 6.6, z: -5.46 },
  ]
  root.add(mergeBoxMesh(trim, stdMaterial(ALUM, { metalness: 0.6, roughness: 0.35 })))

  // ================================================================ 南外廊（檐下步廊）
  const arcade: BoxPart[] = []
  const colXs: number[] = []
  for (let i = 0; i < 10; i++) colXs.push(-17.4 + 3.8667 * i)
  for (const x of colXs) {
    arcade.push({ w: 0.62, h: 0.4, d: 0.62, x, y: 0.5, z: -7.5 })    // 柱脚 0.3..0.7
    arcade.push({ w: 0.45, h: 4.04, d: 0.45, x, y: 2.72, z: -7.5 })  // 柱身 0.7..4.74
    arcade.push({ w: 0.58, h: 0.32, d: 0.58, x, y: 4.9, z: -7.5 })   // 柱头 4.74..5.06
  }
  // 通长梁 + 檐口线脚两道
  arcade.push({ w: 35.6, h: 0.4, d: 0.5, x: 0, y: 4.94, z: -7.5 })
  arcade.push({ w: 35.8, h: 0.1, d: 0.6, x: 0, y: 4.7, z: -7.5 })
  arcade.push({ w: 35.8, h: 0.12, d: 0.64, x: 0, y: 5.16, z: -7.5 })
  root.add(mergeBoxMesh(arcade, stdMaterial(STONE, { roughness: 0.65 })))

  // 坡玻璃雨棚：北高（贴墙 y5.62 @ z-5.4）南低（梁顶 y5.14 @ z-7.9），单坡 ~10.8°
  const slopeAng = Math.atan2(0.48, 2.5)
  const slopeLen = Math.hypot(2.5, 0.48)
  const canopyGlass: BoxPart[] = [{ w: 35.6, h: 0.06, d: slopeLen, x: 0, y: 0, z: 0 }]
  const canopyFrame: BoxPart[] = []
  for (let i = 0; i < 21; i++) {
    canopyFrame.push({ w: 0.08, h: 0.14, d: slopeLen, x: -17.6 + 1.76 * i, y: 0, z: 0 })
  }
  for (const z of [-0.85, 0, 0.85]) canopyFrame.push({ w: 35.6, h: 0.1, d: 0.1, x: 0, y: 0, z })
  canopyFrame.push({ w: 35.6, h: 0.18, d: 0.16, x: 0, y: 0.04, z: slopeLen / 2 })
  canopyFrame.push({ w: 35.6, h: 0.2, d: 0.18, x: 0, y: -0.04, z: -slopeLen / 2 })
  const cg = new THREE.Mesh(rotX(mergeBoxes(canopyGlass), -slopeAng), stdMaterial('#DCE9F2', {
    metalness: 0.5, roughness: 0.15, emissive: '#9CC4DE', emissiveIntensity: 0.35,
  }))
  cg.position.set(0, 5.38, -6.65)
  root.add(cg)
  const cf = new THREE.Mesh(rotX(mergeBoxes(canopyFrame), -slopeAng), stdMaterial(FRAME, { metalness: 0.65, roughness: 0.35 }))
  cf.position.set(0, 5.38, -6.65)
  root.add(cf)

  // 檐下吊球灯 9 盏（暖 6 + 红 3 分组合并，吊杆独立）
  const lampWarm: BoxPart[] = []
  const lampRed: BoxPart[] = []
  const rodParts: BoxPart[] = []
  for (let i = 0; i < 9; i++) {
    const x = -15.6 + 3.9 * i
    const body: BoxPart[] = [
      { w: 0.34, h: 0.3, d: 0.34, x, y: 4.14, z: -7.4 },
      { w: 0.4, h: 0.06, d: 0.4, x, y: 4.32, z: -7.4 },
      { w: 0.05, h: 0.14, d: 0.05, x, y: 4.39, z: -7.4 },
    ]
    if (i % 3 === 1) lampRed.push(...body)
    else lampWarm.push(...body)
    rodParts.push({ w: 0.03, h: 0.36, d: 0.03, x, y: 4.56, z: -7.4 })
  }
  root.add(mergeBoxMesh(rodParts, stdMaterial(FRAME, { metalness: 0.6, roughness: 0.4 })))
  root.add(mergeBoxMesh(lampWarm, stdMaterial('#FFD9A0', { emissive: '#FFB65C', emissiveIntensity: 1.5, roughness: 0.5 })))
  root.add(mergeBoxMesh(lampRed, stdMaterial('#FF8A6A', { emissive: '#FF5A3C', emissiveIntensity: 1.5, roughness: 0.5 })))

  // 竖向霓虹刀牌 3 块（挂柱头，业态色）+ 挑杆
  const bladeBracket: BoxPart[] = []
  const bladeSpecs: Array<[number, string]> = [
    [colXs[2], '#FF9F5A'], [colXs[4], '#7FD1FF'], [colXs[7], '#4ADFC4'],
  ]
  for (const [x] of bladeSpecs) bladeBracket.push({ w: 0.1, h: 0.34, d: 0.1, x, y: 5.3, z: -7.5 })
  root.add(mergeBoxMesh(bladeBracket, stdMaterial(FRAME, { metalness: 0.6, roughness: 0.4 })))
  for (const [x, color] of bladeSpecs) {
    root.add(mergeBoxMesh(
      [{ w: 0.12, h: 2.1, d: 0.62, x, y: 6.45, z: -7.5 }],
      stdMaterial(color, { emissive: color, emissiveIntensity: 1.5, roughness: 0.4 }),
    ))
  }

  // ================================================================ 北立面（对光庭主界面）
  // 底层九开间橱窗（贴皮 z7.77 朝北；无遮阳篷——上亮带当檐）
  const northBays: Array<[number, number]> = [
    [-15.8, 3.3], [-12.15, 3.3], [-8.5, 3.3],
    [-4.1, 3.7], [0, 3.7], [4.1, 3.7],
    [8.5, 3.3], [12.15, 3.3], [15.8, 3.3],
  ]
  for (let i = 0; i < northBays.length; i++) {
    const [x, w] = northBays[i]
    root.add(storefront({
      w, h: 3.35, y: 0.45, mullions: 4, transoms: 3,
      signColor: SIGN_COLORS[i % SIGN_COLORS.length],
      signH: 0.7,
      x, z: 7.77,
    }))
  }
  // 南九开间橱窗（檐下，ry=π 朝南，遮阳篷挑入廊道）
  const southAwning = ['#C9A06A', '#7FA8C9', '#8FBF9F']
  for (let i = 0; i < northBays.length; i++) {
    const [x, w] = northBays[i]
    root.add(storefront({
      w, h: 3.35, y: 0.45, mullions: 4, transoms: 3,
      signColor: SIGN_COLORS[(i + 3) % SIGN_COLORS.length],
      signH: 0.7,
      awning: southAwning[Math.floor(i / 3) % 3],
      x, z: -5.55, ry: Math.PI,
    }))
  }
  // 橱窗上亮带（南北各三段，通高玻璃发光带）+ 竖鳍装饰
  const upperBands: Array<[number, number]> = [[-12.15, 10.7], [0, 12.4], [12.15, 10.7]]
  for (const [x, w] of upperBands) {
    root.add(curtainGrid({
      w, h: 1.65, y: 4.85, x, z: 7.77,
      cols: 4, rows: 1, subCols: 2,
      frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
      lit: { ratio: 0.4, seed: seed() },
    }))
    root.add(curtainGrid({
      w, h: 1.65, y: 4.85, x, z: -5.52, ry: Math.PI,
      cols: 4, rows: 1, subCols: 2,
      frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
      lit: { ratio: 0.4, seed: seed() },
    }))
    root.add(finArray({ w: w - 0.5, h: 1.65, y: 4.85, x, z: 7.8, count: 16, depth: 0.36, thick: 0.1, color: ALUM }))
    root.add(finArray({ w: w - 0.5, h: 1.65, y: 4.85, x, z: -5.55, ry: Math.PI, count: 16, depth: 0.36, thick: 0.1, color: ALUM }))
  }
  // 横楣发光招牌带（橱窗与上亮带之间，南北通长三段）
  const frieze: BoxPart[] = []
  const friezeFace: BoxPart[] = []
  for (const [x, w] of upperBands) {
    frieze.push({ w: w - 0.4, h: 0.26, d: 0.14, x, y: 4.68, z: 7.66 })
    frieze.push({ w: w - 0.4, h: 0.26, d: 0.14, x, y: 4.68, z: -5.46 })
    friezeFace.push({ w: w - 0.7, h: 0.16, d: 0.05, x, y: 4.68, z: 7.75 })
    friezeFace.push({ w: w - 0.7, h: 0.16, d: 0.05, x, y: 4.68, z: -5.55 })
  }
  root.add(mergeBoxMesh(frieze, stdMaterial(FRAME, { metalness: 0.5, roughness: 0.4 })))
  root.add(mergeBoxMesh(friezeFace, stdMaterial('#FFD166', { emissive: '#FFD166', emissiveIntensity: 1.4, roughness: 0.4 })))

  // 中段 2 层南北幕墙（北无遮阳守退线，南挑遮阳对公园）
  root.add(curtainGrid({
    w: 12.4, h: 4.6, y: 6.6, z: 7.77,
    cols: 6, rows: 2, subCols: 3, subRows: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    spandrel: 0.5, spandrelColor: ALUM,
    lit: { ratio: 0.35, seed: seed() },
  }))
  root.add(curtainGrid({
    w: 12.4, h: 4.6, y: 6.6, z: -5.55, ry: Math.PI,
    cols: 6, rows: 2, subCols: 3, subRows: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    spandrel: 0.5, spandrelColor: ALUM, sunshade: true, shadeOut: 0.3,
    lit: { ratio: 0.35, seed: seed() },
  }))
  // 中段 2 层东西山墙幕墙（高出东西段屋面，对露台侧）
  root.add(curtainGrid({
    w: 12.8, h: 4.6, y: 6.6, x: -6.47, ry: -Math.PI / 2,
    cols: 5, rows: 2, subCols: 3, subRows: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    spandrel: 0.5, spandrelColor: ALUM, lit: { ratio: 0.3, seed: seed() },
  }))
  root.add(curtainGrid({
    w: 12.8, h: 4.6, y: 6.6, x: 6.47, ry: Math.PI / 2,
    cols: 5, rows: 2, subCols: 3, subRows: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    spandrel: 0.5, spandrelColor: ALUM, lit: { ratio: 0.3, seed: seed() },
  }))
  // 东段北条 2 层北面（棚架背面）
  root.add(curtainGrid({
    w: 10.7, h: 2.2, y: 6.6, z: 7.77,
    cols: 5, rows: 1, subCols: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    spandrel: 0.4, spandrelColor: ALUM, lit: { ratio: 0.3, seed: seed() },
  }))

  // ================================================================ 东西山墙
  root.add(curtainGrid({
    w: 12.8, h: 6.2, y: 0.4, x: 17.77, ry: Math.PI / 2,
    cols: 7, rows: 2, subCols: 3, subRows: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    spandrel: 0.4, spandrelColor: ALUM, lit: { ratio: 0.3, seed: seed() },
  }))
  root.add(finArray({ w: 12.6, h: 6.4, y: 0.3, x: 17.82, z: 1.1, ry: Math.PI / 2, count: 16, depth: 0.4, thick: 0.12, color: ALUM }))
  root.add(curtainGrid({
    w: 4.4, h: 2.2, y: 6.6, x: 17.77, z: 5.3, ry: Math.PI / 2,
    cols: 3, rows: 1, subCols: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    lit: { ratio: 0.35, seed: seed() },
  }))
  root.add(curtainGrid({
    w: 12.8, h: 6.2, y: 0.4, x: -17.77, ry: -Math.PI / 2,
    cols: 7, rows: 2, subCols: 3, subRows: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    spandrel: 0.4, spandrelColor: ALUM, lit: { ratio: 0.3, seed: seed() },
  }))
  root.add(finArray({ w: 12.6, h: 6.4, y: 0.3, x: -17.82, z: 1.1, ry: -Math.PI / 2, count: 16, depth: 0.4, thick: 0.12, color: ALUM }))

  // ================================================================ 西段双坡玻璃天窗
  const halfSpan = 6.5
  const gableH = 2.8
  const roofAng = Math.atan2(gableH, halfSpan)
  const roofGlassMat = stdMaterial('#E4EFF6', { metalness: 0.5, roughness: 0.14, emissive: '#BBD9EA', emissiveIntensity: 0.45 })
  const roofFrameMat = stdMaterial(FRAME, { metalness: 0.6, roughness: 0.4 })
  for (const side of [1, -1] as const) {
    // side +1 = 北坡（+z 端落低），-1 = 南坡；板出挑檐口，d7.3 投影恰落皮内
    const plate: BoxPart[] = [{ w: 10.9, h: 0.08, d: 7.3, x: 0, y: 0, z: 0 }]
    const ribs: BoxPart[] = []
    for (let i = 0; i < 18; i++) ribs.push({ w: 0.1, h: 0.14, d: 7.3, x: -5.19 + 0.61 * i, y: 0.05, z: 0 })
    for (let z = -3.0; z <= 3.0; z += 0.75) ribs.push({ w: 10.7, h: 0.1, d: 0.12, x: 0, y: 0.05, z })
    const pm = new THREE.Mesh(rotX(mergeBoxes(plate), side * roofAng), roofGlassMat)
    pm.position.set(-12.15, 8.0, side > 0 ? 4.35 : -2.15)
    root.add(pm)
    const rm = new THREE.Mesh(rotX(mergeBoxes(ribs), side * roofAng), roofFrameMat)
    rm.position.set(-12.15, 8.0, side > 0 ? 4.35 : -2.15)
    root.add(rm)
  }
  // 脊盖
  root.add(mergeBoxMesh(
    [{ w: 11.0, h: 0.22, d: 0.56, x: -12.15, y: 9.46, z: 1.1 }],
    stdMaterial(ALUM, { metalness: 0.6, roughness: 0.35 }),
  ))
  // 西端山墙竖梃阵（随坡起落，玻璃山墙母题）
  const gableParts: BoxPart[] = []
  for (let z = -5.2; z <= 7.5; z += 0.7) {
    const hh = gableH * Math.max(0, 1 - Math.abs(z - 1.1) / halfSpan)
    if (hh < 0.2) continue
    gableParts.push({ w: 0.14, h: hh, d: 0.34, x: -17.67, y: 6.6 + hh / 2, z })
  }
  root.add(mergeBoxMesh(gableParts, roofFrameMat))
  // 东端（段间缝）同款封边
  const gablePartsE: BoxPart[] = []
  for (let z = -5.2; z <= 7.5; z += 0.7) {
    const hh = gableH * Math.max(0, 1 - Math.abs(z - 1.1) / halfSpan)
    if (hh < 0.2) continue
    gablePartsE.push({ w: 0.14, h: hh, d: 0.34, x: -6.63, y: 6.6 + hh / 2, z })
  }
  root.add(mergeBoxMesh(gablePartsE, roofFrameMat))

  // ================================================================ 中段屋顶露台（y11.2）
  root.add(paving({ w: 12.2, d: 12.8, z: 1.1, y: 11.2, cell: 0.32, gap: 0.06, ...bandA }))
  // 机房矮箱（≤12m 收头）+ 南面百叶 + 顶盖
  root.add(mergeBoxMesh([
    { w: 4.6, h: 0.7, d: 3.6, x: -3.6, y: 11.55, z: 5.4 },
    { w: 4.9, h: 0.1, d: 3.9, x: -3.6, y: 11.93, z: 5.4 },
  ], stdMaterial(STONE, { roughness: 0.7 })))
  root.add(finArray({ w: 4.2, h: 0.7, y: 11.2, x: -3.6, z: 3.55, ry: Math.PI, count: 12, depth: 0.3, thick: 0.1, color: FRAME }))
  // 露台花池 3（矮墙 + 树篱）+ 石盆 2 + 坐凳 2 + 绿篱
  for (const [x, z] of [[4.5, 7.0], [-4.5, -4.6], [4.5, -4.6]] as const) {
    root.add(mergeBoxMesh(
      [{ w: 2.6, h: 0.5, d: 0.9, x, y: 11.45, z }],
      stdMaterial(STONE, { roughness: 0.75 }),
    ))
    root.add(at(ctx.blocks.hedge({ w: 2.4, h: 0.45 }), x, 11.5, z))
  }
  root.add(ctx.blocks.urn({ x: 5.6, y: 11.2, z: -4.2, scale: 0.8 }))
  root.add(ctx.blocks.urn({ x: -5.6, y: 11.2, z: 6.6, scale: 0.8 }))
  root.add(at(ctx.blocks.bench({}), 5.4, 11.2, 4.6, -Math.PI / 2))
  root.add(at(ctx.blocks.bench({}), -5.4, 11.2, -3.0, Math.PI / 2))
  root.add(at(ctx.blocks.hedge({ w: 2.4, h: 0.6 }), -3.6, 11.2, 7.1))

  // ================================================================ 东段屋顶
  // 南顶露台（y6.6）：铺装 + 伞桌 + 绿篱 + 石盆 + 凳
  root.add(paving({ w: 10.4, d: 8.2, x: 12.15, z: -1.2, y: 6.6, cell: 0.32, gap: 0.06, ...bandB }))
  for (const o of seatSet(13.5, 6.6, 0.5, '#E8E6E1')) root.add(o)
  root.add(at(ctx.blocks.hedge({ w: 3.0, h: 0.7 }), 9.0, 6.6, 2.4))
  root.add(at(ctx.blocks.hedge({ w: 2.6, h: 0.7 }), 15.5, 6.6, -4.7))
  root.add(ctx.blocks.urn({ x: 8.0, y: 6.6, z: -4.6 }))
  root.add(at(ctx.blocks.bench({}), 16.4, 6.6, 2.3, Math.PI))
  // 北条顶木格栅棚架（y8.8 基座，柱 8.8..10.7，格栅顶 11.05）
  const pergola: BoxPart[] = []
  for (const x of [7.4, 12.15, 16.9]) {
    for (const z of [3.7, 7.0]) pergola.push({ w: 0.16, h: 1.9, d: 0.16, x, y: 9.75, z })
  }
  for (const x of [7.4, 12.15, 16.9]) pergola.push({ w: 0.2, h: 0.24, d: 3.6, x, y: 10.82, z: 5.35 })
  for (const z of [3.7, 7.0]) pergola.push({ w: 9.7, h: 0.24, d: 0.2, x: 12.15, y: 10.82, z })
  root.add(mergeBoxMesh(pergola, stdMaterial(WOOD, { roughness: 0.6 })))
  const lattice: BoxPart[] = []
  for (let x = 7.0; x <= 17.3; x += 0.42) lattice.push({ w: 0.07, h: 0.1, d: 3.5, x, y: 11.0, z: 5.35 })
  root.add(mergeBoxMesh(lattice, stdMaterial(WOOD, { roughness: 0.65 })))
  // 棚下铺装 + 坐凳 2 + 花池
  root.add(paving({ w: 10.3, d: 4.0, x: 12.15, z: 5.35, y: 8.8, cell: 0.28, gap: 0.05, ...bandA }))
  root.add(at(ctx.blocks.bench({}), 9.5, 8.8, 4.5, 0))
  root.add(at(ctx.blocks.bench({}), 14.8, 8.8, 6.2, Math.PI))
  root.add(mergeBoxMesh(
    [{ w: 2.8, h: 0.55, d: 0.9, x: 12.15, y: 9.075, z: 3.75 }],
    stdMaterial(STONE, { roughness: 0.75 }),
  ))
  root.add(at(ctx.blocks.hedge({ w: 2.6, h: 0.6 }), 12.15, 9.35, 3.75))

  // ================================================================ 招牌体系
  // 中段南向主招牌「西岸里」（2F 南幕墙下部，对南岸步道）
  root.add(mergeBoxMesh(
    [{ w: 5.6, h: 1.05, d: 0.16, x: 0, y: 7.5, z: -5.52 }],
    stdMaterial(FRAME, { metalness: 0.5, roughness: 0.4 }),
  ))
  root.add(mergeBoxMesh(
    [{ w: 5.2, h: 0.78, d: 0.06, x: 0, y: 7.5, z: -5.63 }],
    stdMaterial('#FF6B4A', { emissive: '#FF6B4A', emissiveIntensity: 1.6, roughness: 0.4 }),
  ))
  root.add(mergeBoxMesh([
    { w: 5.9, h: 0.09, d: 0.18, x: 0, y: 8.08, z: -5.54 },
    { w: 5.9, h: 0.09, d: 0.18, x: 0, y: 6.92, z: -5.54 },
    { w: 0.09, h: 1.25, d: 0.18, x: -2.9, y: 7.5, z: -5.54 },
    { w: 0.09, h: 1.25, d: 0.18, x: 2.9, y: 7.5, z: -5.54 },
  ], stdMaterial('#4ADFC4', { emissive: '#4ADFC4', emissiveIntensity: 1.6, roughness: 0.4 })))
  // 中段北女儿墙发光字带（对光庭）
  root.add(mergeBoxMesh(
    [{ w: 8.6, h: 0.7, d: 0.14, x: 0, y: 11.6, z: 7.64 }],
    stdMaterial(FRAME, { metalness: 0.5, roughness: 0.4 }),
  ))
  root.add(mergeBoxMesh(
    [{ w: 8.2, h: 0.5, d: 0.05, x: 0, y: 11.6, z: 7.72 }],
    stdMaterial('#FFD166', { emissive: '#FFD166', emissiveIntensity: 1.5, roughness: 0.4 }),
  ))
  // 东山墙竖向发光招牌（临湖识别度，贴皮守退线容差）
  root.add(mergeBoxMesh(
    [{ w: 0.12, h: 3.4, d: 1.6, x: 17.95, y: 4.4, z: -0.5 }],
    stdMaterial(FRAME, { metalness: 0.5, roughness: 0.4 }),
  ))
  root.add(mergeBoxMesh(
    [{ w: 0.06, h: 3.1, d: 1.35, x: 18.0, y: 4.4, z: -0.5 }],
    stdMaterial('#7FD1FF', { emissive: '#7FD1FF', emissiveIntensity: 1.6, roughness: 0.4 }),
  ))
  // 西山墙竖向发光招牌（对西接口）
  root.add(mergeBoxMesh(
    [{ w: 0.1, h: 3.3, d: 1.7, x: -17.94, y: 4.0, z: 3 }],
    stdMaterial(FRAME, { metalness: 0.5, roughness: 0.4 }),
  ))
  root.add(mergeBoxMesh(
    [{ w: 0.06, h: 3.0, d: 1.45, x: -17.99, y: 4.0, z: 3 }],
    stdMaterial('#FF9F5A', { emissive: '#FF9F5A', emissiveIntensity: 1.6, roughness: 0.4 }),
  ))

  return root
}

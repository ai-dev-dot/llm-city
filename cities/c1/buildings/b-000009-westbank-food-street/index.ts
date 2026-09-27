import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { mergeBoxMesh, mergeBoxes, type BoxPart } from '../../blocks/mimo-v2.6-flash/geo'
import { curtainGrid, finArray } from '../../blocks/mimo-v2.6-flash/curtainwall'
import { storefront } from '../../blocks/mimo-v2.6-flash/storefront'
import { paving, turf } from '../../blocks/mimo-v2.6-flash/paving'

/** 西岸食街 Westbank Food Street —— D4 西岸商业街区二期（宗地 D4-01+02，40×20m）
 * 立意「北檐灯街」：北临街平梁骑楼（9 柱柱廊 + 8 开间橱窗 + 连续招牌带）横向展开，
 * 与一期东拱廊成 T 字檐下体系；南侧玻璃餐饮市集大厅（通高 + 玻璃坡顶天窗）对中央光庭发光；
 * 东翼 2 层餐厅屋顶露台南望光庭。北高南低，天际线压在总图 12–18m 档（实际 ≈15.8m）。
 * 局部原点 = 宗地中心；北 +z 临街，东 +x 贴一期西山墙，南 -z 对光庭（D4-04+05）。 */

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

  /** 绕 X 轴旋转几何（玻璃坡顶用：盒体合并后整体放坡，法线同步转） */
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

  /** 栏杆跑段（沿本地 X 展开，ry 旋到朝向）：立柱 + 三横杆，合并单 mesh */
  const rail = (w: number, x: number, y: number, z: number, ry = 0): THREE.Object3D => {
    const h = 1.02
    const parts: BoxPart[] = [
      { w, h: 0.08, d: 0.1, x: 0, y: h, z: 0 },
      { w, h: 0.06, d: 0.07, x: 0, y: h * 0.62, z: 0 },
      { w, h: 0.06, d: 0.07, x: 0, y: h * 0.3, z: 0 },
    ]
    const n = Math.max(2, Math.round(w / 1.05))
    for (let i = 0; i <= n; i++) parts.push({ w: 0.07, h, d: 0.07, x: -w / 2 + (w * i) / n, y: h / 2, z: 0 })
    return at(mergeBoxMesh(parts, stdMaterial(FRAME, { metalness: 0.7, roughness: 0.35 })), x, y, z, ry)
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
  // 草皮满铺宗地 40×20（顶 0.3m 地被豁免）；北临街、南对光庭、东西接口四条带
  root.add(turf({ w: 40, d: 20 }))

  const bandA = { colorA: '#D9D6CF', colorB: '#C4C1BA', accent: 5, inset: null } as const
  const bandB = { colorA: '#C4C1BA', colorB: '#A8A5A0', accent: 4, inset: null } as const
  root.add(paving({ w: 39.9, d: 1.35, z: 9.32, y: 0.3, cell: 0.24, gap: 0.05, ...bandA }))
  root.add(paving({ w: 39.9, d: 1.35, z: -9.32, y: 0.3, cell: 0.26, gap: 0.05, ...bandB }))
  root.add(paving({ w: 1.35, d: 17.2, x: -19.32, y: 0.3, cell: 0.26, gap: 0.05, ...bandB }))
  root.add(paving({ w: 1.35, d: 17.2, x: 19.32, y: 0.3, cell: 0.26, gap: 0.05, ...bandB }))
  // 出入口接驳（北 3 / 南 2 / 西服务院 1）
  for (const x of [-12, 0, 12]) root.add(paving({ w: 3.2, d: 1.5, x, z: 8.05, y: 0.3, cell: 0.24, gap: 0.05, ...bandA }))
  for (const x of [-7, 9]) root.add(paving({ w: 3.4, d: 1.6, x, z: -8.35, y: 0.3, cell: 0.26, gap: 0.05, ...bandB }))
  root.add(paving({ w: 1.6, d: 3.2, x: -18.25, z: -3.45, y: 0.3, cell: 0.26, gap: 0.05, ...bandB }))

  // 行道树 9（冠幅受 R2 包容差约束：北 z9.05/0.8、南 z-9.2/0.7、东 x19.2/0.7，冠不入柱廊）
  for (const [x, z, s] of [[-15, 9.05, 0.8], [-5, 9.05, 0.8], [5, 9.05, 0.8], [15, 9.05, 0.8], [-14, -9.2, 0.7], [-4, -9.2, 0.7], [6, -9.2, 0.7], [16, -9.2, 0.7], [19.2, -6, 0.7]] as const) {
    root.add(ctx.blocks.tree({ x, z, scale: s, seed: seed() }))
  }
  // 路灯 9 / 坐凳 4 / 绿篱 3 / 石盆 4（官方件 site 豁免）
  for (const [x, z] of [[-10, 8.9], [0, 8.9], [10, 8.9], [-10, -8.9], [0, -8.9], [10, -8.9], [-19.3, 0], [19.3, 4], [-16.4, -0.6]] as const) {
    root.add(ctx.blocks.streetLamp({ x, z }))
  }
  for (const [x, z, ry] of [[-8, -9.35, Math.PI], [4, -9.35, Math.PI], [-19.35, -5, Math.PI / 2], [19.35, 6, -Math.PI / 2]] as const) {
    root.add(at(ctx.blocks.bench({}), x, 0.3, z, ry))
  }
  root.add(ctx.blocks.hedge({ w: 4.2, h: 0.75, x: -17.2, z: -9.35 }))
  root.add(ctx.blocks.hedge({ w: 4.2, h: 0.75, x: 17.2, z: -9.35 }))
  root.add(ctx.blocks.hedge({ w: 0.9, d: 3.0, h: 0.75, x: -19.35, z: 6 }))
  for (const [x, z] of [[-8.5, 8.95], [8.5, 8.95], [-8.5, -8.95], [8.5, -8.95]] as const) {
    root.add(ctx.blocks.urn({ x, y: 0.3, z }))
  }

  // ================================================================ 主体盒
  // 原则：主体皮退到幕墙/橱窗之后；合并单 mesh（全在退线核 |x|≤18、|z|≤8 内）
  const mass: BoxPart[] = [
    // 北街楼主体（含 2 层店面）：x ±17.6, z 1..5.4, y 0..9.5
    { w: 35.2, h: 9.5, d: 4.4, x: 0, y: 4.75, z: 3.2 },
    // 北街楼 2 层挑出（骑楼上层）：z 5.4..7.3, y 5..9.5
    { w: 35.2, h: 4.5, d: 1.9, x: 0, y: 7.25, z: 6.35 },
    // 3 层退台：x -17.6..5, z 1..7.3, y 9.5..14
    { w: 22.6, h: 4.5, d: 6.3, x: -6.3, y: 11.75, z: 4.15 },
    // 3 层女儿墙环
    { w: 23.0, h: 0.8, d: 0.3, x: -6.3, y: 14.4, z: 7.15 },
    { w: 23.0, h: 0.8, d: 0.3, x: -6.3, y: 14.4, z: 1.15 },
    { w: 0.3, h: 0.8, d: 6.6, x: -17.45, y: 14.4, z: 4.15 },
    { w: 0.3, h: 0.8, d: 6.6, x: 4.85, y: 14.4, z: 4.15 },
    // 屋顶机房（百叶围合 + 压顶），顶 ≈15.8m（总图 12–18m 档内）
    { w: 8, h: 1.6, d: 4.0, x: -8, y: 14.8, z: 4.15 },
    { w: 8.4, h: 0.18, d: 4.4, x: -8, y: 15.69, z: 4.15 },
    // 市集大厅围护：北 / 西 / 东墙 + 南面上部玻璃带（y5.6..10）
    { w: 16, h: 10, d: 0.3, x: -7, y: 5, z: 0.85 },
    { w: 0.3, h: 10, d: 8.9, x: -14.85, y: 5, z: -3.45 },
    { w: 0.3, h: 10, d: 8.9, x: 0.85, y: 5, z: -3.45 },
    { w: 16, h: 4.4, d: 0.3, x: -7, y: 7.8, z: -7.2 },
    // 东翼底层（南面退 0.35 让幕墙）：x1..17.6, z -7.35..1, y0..5
    { w: 16.6, h: 5, d: 8.35, x: 9.3, y: 2.5, z: -3.175 },
    // 东翼 2 层（南退留露台）：z -4.4..1, y5..9.5
    { w: 16.6, h: 4.5, d: 5.4, x: 9.3, y: 7.25, z: -1.7 },
    // 东翼南露台楼板：z -7.5..-4.4, y4.7..5.0
    { w: 16.6, h: 0.3, d: 3.1, x: 9.3, y: 4.85, z: -5.95 },
  ]
  root.add(mergeBoxMesh(mass, stdMaterial(STONE, { roughness: 0.7, metalness: 0.05 })))

  // 大厅南面柱廊：5 柱 + 柱脚柱头 + 绑梁（承上部玻璃带）
  const hallCol: BoxPart[] = []
  for (const x of [-14.4, -10.8, -7.2, -3.6, 0]) {
    hallCol.push({ w: 0.55, h: 5.6, d: 0.55, x, y: 2.8, z: -7.65 })
    hallCol.push({ w: 0.75, h: 0.4, d: 0.75, x, y: 0.64, z: -7.65 })
    hallCol.push({ w: 0.7, h: 0.3, d: 0.7, x, y: 5.45, z: -7.65 })
  }
  hallCol.push({ w: 16, h: 0.4, d: 0.55, x: -7, y: 5.8, z: -7.65 })
  root.add(mergeBoxMesh(hallCol, stdMaterial(STONE, { roughness: 0.7 })))

  // ================================================================ 北骑楼（檐下步行廊）
  const arcade: BoxPart[] = []
  for (let i = 0; i < 9; i++) {
    const x = -17.4 + 4.35 * i
    arcade.push({ w: 0.55, h: 4.55, d: 0.55, x, y: 2.275, z: 7.3 })
    arcade.push({ w: 0.78, h: 0.42, d: 0.78, x, y: 0.51, z: 7.3 })
    arcade.push({ w: 0.72, h: 0.26, d: 0.72, x, y: 4.42, z: 7.3 })
  }
  // 平梁 + 檐口线脚（上下两道）
  arcade.push({ w: 35.2, h: 0.45, d: 0.5, x: 0, y: 4.775, z: 7.3 })
  arcade.push({ w: 35.4, h: 0.12, d: 0.62, x: 0, y: 4.46, z: 7.3 })
  arcade.push({ w: 35.4, h: 0.1, d: 0.58, x: 0, y: 5.05, z: 7.3 })
  root.add(mergeBoxMesh(arcade, stdMaterial(STONE, { roughness: 0.65 })))

  // 挑檐吊顶格栅（80 道横条 + 3 道通长龙骨）
  const soffit: BoxPart[] = []
  for (let x = -17.4; x <= 17.4; x += 0.44) soffit.push({ w: 0.16, h: 0.1, d: 1.62, x, y: 4.92, z: 6.3 })
  for (const z of [5.6, 6.3, 7.0]) soffit.push({ w: 34.9, h: 0.06, d: 0.14, x: 0, y: 4.86, z })
  root.add(mergeBoxMesh(soffit, stdMaterial('#7C7A76', { metalness: 0.4, roughness: 0.5 })))

  // 廊道地面铺装（z 5.475..7.225）
  root.add(paving({ w: 34.9, d: 1.75, z: 6.35, y: 0.3, cell: 0.24, gap: 0.05, ...bandA }))

  // 8 开间橱窗（退至 z5.45 朝北，无篷——骑楼自带檐）
  for (let i = 0; i < 8; i++) {
    root.add(storefront({
      w: 3.6, h: 2.9, y: 0.45, mullions: 4, transoms: 3,
      signColor: SIGN_COLORS[i % SIGN_COLORS.length],
      signH: 0.75,
      z: 5.45, x: -15.225 + 4.35 * i,
    }))
  }
  // 檐下吊灯笼 18 盏（暖 12 + 红 6 分组合并，吊杆独立合并）
  const lampWarm: BoxPart[] = []
  const lampRed: BoxPart[] = []
  const rodParts: BoxPart[] = []
  for (let i = 0; i < 18; i++) {
    const x = -16.5 + 1.94 * i
    const body: BoxPart[] = [
      { w: 0.34, h: 0.46, d: 0.34, x, y: 4.31, z: 6.7 },
      { w: 0.4, h: 0.07, d: 0.4, x, y: 4.55, z: 6.7 },
      { w: 0.4, h: 0.07, d: 0.4, x, y: 4.07, z: 6.7 },
      { w: 0.05, h: 0.18, d: 0.05, x, y: 3.95, z: 6.7 },
    ]
    if (i % 3 === 0) lampRed.push(...body)
    else lampWarm.push(...body)
    rodParts.push({ w: 0.04, h: 0.34, d: 0.04, x, y: 4.76, z: 6.7 })
  }
  root.add(mergeBoxMesh(rodParts, stdMaterial(FRAME, { metalness: 0.6, roughness: 0.4 })))
  root.add(mergeBoxMesh(lampWarm, stdMaterial('#FFD9A0', { emissive: '#FFB65C', emissiveIntensity: 1.5, roughness: 0.5 })))
  root.add(mergeBoxMesh(lampRed, stdMaterial('#FF8A6A', { emissive: '#FF5A3C', emissiveIntensity: 1.5, roughness: 0.5 })))

  // ================================================================ 北立面（临街主立面）
  // 2 层密梃幕墙（z7.49，挑出遮阳 + 层间带 + 夜景暖窗）
  root.add(curtainGrid({
    w: 35.2, h: 4.5, y: 5.0, z: 7.49,
    cols: 8, rows: 2, subCols: 3, subRows: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    spandrel: 0.55, spandrelColor: ALUM, sunshade: true, shadeOut: 0.3,
    lit: { ratio: 0.3, seed: seed() },
  }))
  // 3 层密梃幕墙（退台段 x -17.6..5）
  root.add(curtainGrid({
    w: 22.6, h: 4.5, y: 9.5, x: -6.3, z: 7.49,
    cols: 6, rows: 2, subCols: 3, subRows: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    spandrel: 0.55, spandrelColor: ALUM, sunshade: true, shadeOut: 0.3,
    lit: { ratio: 0.35, seed: seed() },
  }))
  // 招牌带：6 块彩色发光招牌（骑楼檐口上方，y5.15..6.05）
  const signParts: BoxPart[] = []
  const signTrim: BoxPart[] = []
  for (let i = 0; i < 6; i++) {
    const x = (i - 2.5) * 3.4
    const cx = x < 0 ? x - 1.7 : x + 1.7
    signParts.push({ w: 3.0, h: 0.9, d: 0.16, x: cx, y: 5.6, z: 7.55 })
    signTrim.push({ w: 3.1, h: 0.06, d: 0.2, x: cx, y: 6.08, z: 7.56 })
    signTrim.push({ w: 3.1, h: 0.06, d: 0.2, x: cx, y: 5.12, z: 7.56 })
  }
  // 中央主招牌「西岸食街」+ 霓虹边框
  signParts.push({ w: 6.6, h: 1.0, d: 0.18, x: 0, y: 5.6, z: 7.56 })
  const marquee: BoxPart[] = [
    { w: 6.9, h: 0.1, d: 0.2, x: 0, y: 6.15, z: 7.57 },
    { w: 6.9, h: 0.1, d: 0.2, x: 0, y: 5.05, z: 7.57 },
    { w: 0.1, h: 1.2, d: 0.2, x: -3.45, y: 5.6, z: 7.57 },
    { w: 0.1, h: 1.2, d: 0.2, x: 3.45, y: 5.6, z: 7.57 },
    // 下沿霓虹条
    { w: 7.2, h: 0.1, d: 0.12, x: 0, y: 4.92, z: 7.6 },
  ]
  root.add(mergeBoxMesh(signParts, stdMaterial('#FFF3D6', { emissive: '#FFEBBF', emissiveIntensity: 1.4, roughness: 0.4 })))
  root.add(mergeBoxMesh(signTrim, stdMaterial(FRAME, { metalness: 0.5, roughness: 0.4 })))
  root.add(mergeBoxMesh(marquee, stdMaterial('#4ADFC4', { emissive: '#4ADFC4', emissiveIntensity: 1.6, roughness: 0.4 })))
  // 主招牌字面发光底板单独一 mesh（色彩谱轮换）
  root.add(mergeBoxMesh(
    [{ w: 6.3, h: 0.8, d: 0.06, x: 0, y: 5.6, z: 7.68 }],
    stdMaterial('#FF6B4A', { emissive: '#FF6B4A', emissiveIntensity: 1.6, roughness: 0.4 }),
  ))
  // 竖向霓虹刀牌 2 块（开间柱位）
  root.add(mergeBoxMesh(
    [{ w: 0.55, h: 2.3, d: 0.16, x: -13.05, y: 6.4, z: 7.56 }],
    stdMaterial('#E86A92', { emissive: '#E86A92', emissiveIntensity: 1.5, roughness: 0.4 }),
  ))
  root.add(mergeBoxMesh(
    [{ w: 0.55, h: 2.3, d: 0.16, x: 13.05, y: 6.4, z: 7.56 }],
    stdMaterial('#7FD1FF', { emissive: '#7FD1FF', emissiveIntensity: 1.5, roughness: 0.4 }),
  ))

  // ================================================================ 端部与南立面
  // 西端山墙（2 层段挑檐处幕墙 + 地面段竖向鳍片）
  root.add(curtainGrid({
    w: 1.9, h: 4.5, y: 5, x: -17.725, z: 6.35, ry: -Math.PI / 2,
    cols: 1, rows: 2, subCols: 2, subRows: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    spandrel: 0.55, spandrelColor: ALUM, lit: { ratio: 0.35, seed: seed() },
  }))
  root.add(curtainGrid({
    w: 6.3, h: 4.5, y: 9.5, x: -17.725, z: 4.15, ry: -Math.PI / 2,
    cols: 3, rows: 2, subCols: 3, subRows: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    spandrel: 0.55, spandrelColor: ALUM, lit: { ratio: 0.3, seed: seed() },
  }))
  root.add(finArray({ w: 4.4, h: 4.7, y: 0.15, x: -17.72, z: 3.2, ry: -Math.PI / 2, count: 11, depth: 0.4, thick: 0.12, color: ALUM }))
  // 东端山墙（贴一期巷道）
  root.add(curtainGrid({
    w: 1.9, h: 4.5, y: 5, x: 17.725, z: 6.35, ry: Math.PI / 2,
    cols: 1, rows: 2, subCols: 2, subRows: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    spandrel: 0.55, spandrelColor: ALUM, lit: { ratio: 0.35, seed: seed() },
  }))
  root.add(finArray({ w: 4.4, h: 4.7, y: 0.15, x: 17.72, z: 3.2, ry: Math.PI / 2, count: 11, depth: 0.4, thick: 0.12, color: ALUM }))
  // 南立面 2 层（西段 2.6m 可视面，对光庭）与 3 层通面
  root.add(curtainGrid({
    w: 2.6, h: 4.5, y: 5, x: -16.3, z: 0.875, ry: Math.PI,
    cols: 1, rows: 2, subCols: 2, subRows: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    spandrel: 0.55, spandrelColor: ALUM, lit: { ratio: 0.4, seed: seed() },
  }))
  root.add(curtainGrid({
    w: 22.6, h: 4.5, y: 9.5, x: -6.3, z: 0.875, ry: Math.PI,
    cols: 6, rows: 2, subCols: 3, subRows: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    spandrel: 0.55, spandrelColor: ALUM, lit: { ratio: 0.35, seed: seed() },
  }))

  // ================================================================ 屋顶层
  // 北街楼东段屋顶餐饮露台（x5..17.6, z1..7.3, y9.5）
  root.add(paving({ w: 12.4, d: 6.1, x: 11.3, z: 4.15, y: 9.5, cell: 0.36, gap: 0.06, colorA: '#D9D6CF', colorB: '#C4C1BA', accent: 5, inset: null }))
  root.add(rail(12.4, 11.3, 9.5, 7.2))
  root.add(rail(6.1, 17.5, 9.5, 4.15, Math.PI / 2))
  root.add(rail(12.4, 11.3, 9.5, 1.1))
  root.add(ctx.blocks.hedge({ w: 2.4, h: 0.7, x: 6.2, z: 6.8 }))
  root.add(ctx.blocks.hedge({ w: 2.0, h: 0.7, x: 16.5, z: 1.8 }))
  root.add(ctx.blocks.urn({ x: 5.7, y: 9.5, z: 1.7 }))
  const barSpots: Array<[number, number]> = [[7.6, 3.2], [11.0, 6.0], [14.6, 3.0], [16.2, 6.0]]
  for (let i = 0; i < barSpots.length; i++) {
    for (const o of seatSet(barSpots[i][0], 9.5, barSpots[i][1], i % 2 ? '#E8E6E1' : '#B0885E')) root.add(o)
  }
  // 3 层屋面绿化 + 机房百叶面
  root.add(paving({ w: 7.6, d: 5.6, x: 0.9, z: 4.2, y: 14, cell: 0.4, gap: 0.06, colorA: '#C4C1BA', colorB: '#A8A5A0', accent: 4, inset: null }))
  root.add(paving({ w: 5.0, d: 5.6, x: -14.9, z: 4.2, y: 14, cell: 0.4, gap: 0.06, colorA: '#C4C1BA', colorB: '#A8A5A0', accent: 4, inset: null }))
  root.add(paving({ w: 9.7, d: 5.6, x: -7.6, z: 4.2, y: 14, cell: 0.4, gap: 0.06, colorA: '#C4C1BA', colorB: '#A8A5A0', accent: 4, inset: null }))
  root.add(ctx.blocks.hedge({ w: 3.0, h: 0.7, x: -6.0, z: 6.4 }))
  root.add(ctx.blocks.hedge({ w: 2.4, h: 0.7, x: -15.5, z: 1.9 }))
  root.add(at(ctx.blocks.bench({}), -15.5, 14, 5.6, 0))
  root.add(ctx.blocks.urn({ x: -12.9, y: 14, z: 6.3 }))
  // 机房南面百叶（对光庭可视）+ 顶部格栅
  root.add(finArray({ w: 7.6, h: 1.6, y: 14, x: -8, z: 2.15, ry: Math.PI, count: 20, depth: 0.4, thick: 0.12, color: FRAME }))
  const topGrille: BoxPart[] = []
  for (let x = -11.5; x <= -4.5; x += 0.35) topGrille.push({ w: 0.12, h: 0.1, d: 3.6, x, y: 15.86, z: 4.15 })
  root.add(mergeBoxMesh(topGrille, stdMaterial(FRAME, { metalness: 0.5, roughness: 0.45 })))
  // ================================================================ 市集大厅
  // 玻璃坡顶（E-W 脊线 y12.6，两坡落至 y10 檐口；盒体合并后放坡）
  const slopeLen = Math.hypot(4.45, 2.6)
  const slopeAng = Math.atan2(2.6, 4.45)
  const roofGlass = stdMaterial('#E8D9B8', { metalness: 0.5, roughness: 0.15, emissive: '#FFD9A0', emissiveIntensity: 0.4 })
  const roofFrame = stdMaterial(FRAME, { metalness: 0.6, roughness: 0.4 })
  const slopeParts = (ribs: number): { plate: BoxPart[]; frame: BoxPart[] } => {
    const plate: BoxPart[] = [{ w: 16, h: 0.12, d: slopeLen, x: 0, y: 0, z: 0 }]
    const frame: BoxPart[] = []
    for (let i = 0; i <= ribs; i++) {
      frame.push({ w: 0.08, h: 0.1, d: slopeLen, x: -7.7 + (15.4 * i) / ribs, y: 0.11, z: 0 })
    }
    for (let z = -slopeLen / 2 + 0.8; z < slopeLen / 2; z += 1.05) {
      frame.push({ w: 16, h: 0.09, d: 0.12, x: 0, y: -0.105, z })
    }
    return { plate, frame }
  }
  // 南坡（+z 端抬高）与北坡（+z 端落低）
  const southSlope = slopeParts(22)
  const sm = new THREE.Mesh(rotX(mergeBoxes(southSlope.plate), -slopeAng), roofGlass)
  sm.position.set(-7, 11.3, -5.675)
  root.add(sm)
  const sfm = new THREE.Mesh(rotX(mergeBoxes(southSlope.frame), -slopeAng), roofFrame)
  sfm.position.set(-7, 11.3, -5.675)
  root.add(sfm)
  const northSlope = slopeParts(22)
  const nm = new THREE.Mesh(rotX(mergeBoxes(northSlope.plate), slopeAng), roofGlass)
  nm.position.set(-7, 11.3, -1.225)
  root.add(nm)
  const nfm = new THREE.Mesh(rotX(mergeBoxes(northSlope.frame), slopeAng), roofFrame)
  nfm.position.set(-7, 11.3, -1.225)
  root.add(nfm)
  // 脊盖 + 南北檐口
  root.add(mergeBoxMesh([
    { w: 16.2, h: 0.2, d: 0.5, x: -7, y: 12.68, z: -3.45 },
    { w: 16.2, h: 0.34, d: 0.2, x: -7, y: 9.95, z: -7.88 },
    { w: 16.2, h: 0.34, d: 0.2, x: -7, y: 9.95, z: 0.96 },
  ], stdMaterial(ALUM, { metalness: 0.6, roughness: 0.35 })))

  // 山墙竖梃（东西两端，随坡起落——玻璃山墙母题）
  const gableParts: BoxPart[] = []
  const railParts: BoxPart[] = [{ w: 8.5, h: 0.14, d: 0.35, x: 0, y: 0.07, z: 0 }]
  for (let z = -7.6; z <= 0.7; z += 0.5) {
    const h = (z <= -3.45 ? 10 + ((z + 7.9) * 2.6) / 4.45 : 10 + ((1 - z) * 2.6) / 4.45) - 9.95
    if (h < 0.25) continue
    gableParts.push({ w: 0.12, h, d: 0.4, x: z + 3.45, y: h / 2, z: 0 })
  }
  root.add(at(mergeBoxMesh(gableParts, roofFrame), -14.95, 9.95, -3.45, -Math.PI / 2))
  root.add(at(mergeBoxMesh(gableParts, roofFrame), 0.95, 9.95, -3.45, Math.PI / 2))
  root.add(at(mergeBoxMesh(railParts, roofFrame), -14.95, 9.95, -3.45, -Math.PI / 2))
  root.add(at(mergeBoxMesh(railParts, roofFrame), 0.95, 9.95, -3.45, Math.PI / 2))

  // 大厅南面上部玻璃（对光庭的发光横带）
  root.add(curtainGrid({
    w: 16, h: 3.8, y: 6.05, x: -7, z: -7.53, ry: Math.PI,
    cols: 8, rows: 2, subCols: 2, subRows: 2,
    frameColor: FRAME, glassColor: '#A8D4E8', glassEmissive: '#5E8FB3',
    spandrel: 0.4, spandrelColor: FRAME, lit: { ratio: 0.7, seed: seed() },
  }))

  // 明档内景（南面柱廊敞开可视）：拼花地面
  root.add(paving({ w: 15.2, d: 8.2, x: -7, z: -3.45, y: 0.3, cell: 0.34, gap: 0.05, colorA: '#D9D6CF', colorB: '#C4C1BA', accent: 6, inset: WOOD }))

  // 后场 4 档口（操作台 + 后架 + 挑檐 + 菜单灯箱 + 台面小件）
  const stallWood: BoxPart[] = []
  const stallGlow: BoxPart[] = []
  const stallSign: BoxPart[] = []
  for (const x of [-12.2, -8.6, -5.0, -1.4]) {
    stallWood.push(
      { w: 3.0, h: 1.05, d: 1.0, x, y: 0.965, z: -1.0 },
      { w: 3.0, h: 0.12, d: 1.06, x, y: 0.5, z: -1.0 },
      { w: 3.0, h: 1.9, d: 0.45, x, y: 1.39, z: -1.95 },
      { w: 3.2, h: 0.14, d: 2.4, x, y: 3.15, z: -1.5 },
      { w: 3.2, h: 0.24, d: 0.1, x, y: 3.0, z: -0.35 },
      { w: 0.2, h: 0.24, d: 0.2, x: x - 1.0, y: 1.61, z: -1.1 },
      { w: 0.16, h: 0.18, d: 0.16, x: x + 0.6, y: 1.58, z: -0.85 },
      { w: 0.3, h: 0.1, d: 0.24, x: x + 1.1, y: 1.54, z: -1.15 },
    )
    stallGlow.push({ w: 2.8, h: 0.5, d: 0.8, x, y: 1.74, z: -1.0 })
    stallSign.push({ w: 2.4, h: 0.55, d: 0.08, x, y: 2.62, z: -1.72 })
  }
  root.add(mergeBoxMesh(stallWood, stdMaterial(WOOD, { roughness: 0.65 })))
  root.add(mergeBoxMesh(stallGlow, stdMaterial('#DDEFF8', { emissive: '#FFD9A0', emissiveIntensity: 0.5, roughness: 0.2 })))
  root.add(mergeBoxMesh(stallSign, stdMaterial('#FFD166', { emissive: '#FFD166', emissiveIntensity: 1.5, roughness: 0.4 })))

  // 中岛 3 档（柜台 + 展示面 + 吊挂菜单灯箱 + 吊杆）
  const islandWood: BoxPart[] = []
  const islandGlass: BoxPart[] = []
  const islandSign: BoxPart[] = []
  const islandCord: BoxPart[] = []
  for (const x of [-11, -6.5, -2]) {
    islandWood.push(
      { w: 2.6, h: 1.05, d: 1.4, x, y: 0.965, z: -4.6 },
      { w: 0.4, h: 0.7, d: 0.4, x, y: 0.79, z: -4.6 },
      { w: 0.24, h: 0.2, d: 0.24, x: x - 0.7, y: 1.57, z: -4.85 },
    )
    islandGlass.push({ w: 2.4, h: 0.16, d: 1.2, x, y: 1.57, z: -4.6 })
    islandSign.push({ w: 2.2, h: 0.55, d: 0.08, x, y: 2.9, z: -4.6 })
    islandCord.push({ w: 0.05, h: 4.2, d: 0.05, x, y: 5.28, z: -4.6 })
  }
  root.add(mergeBoxMesh(islandWood, stdMaterial(WOOD, { roughness: 0.65 })))
  root.add(mergeBoxMesh(islandGlass, stdMaterial('#DDEFF8', { emissive: '#FFD9A0', emissiveIntensity: 0.4, roughness: 0.2 })))
  root.add(mergeBoxMesh(islandSign, stdMaterial('#4ADFC4', { emissive: '#4ADFC4', emissiveIntensity: 1.5, roughness: 0.4 })))
  root.add(mergeBoxMesh(islandCord, stdMaterial(FRAME, { metalness: 0.6, roughness: 0.4 })))

  // 长桌条凳 ×2（8 凳）
  const tableParts: BoxPart[] = []
  for (const x of [-11, -3]) {
    tableParts.push(
      { w: 4.4, h: 0.1, d: 1.1, x, y: 1.24, z: -6.4 },
      { w: 0.12, h: 0.72, d: 0.12, x: x - 1.9, y: 0.8, z: -6.4 },
      { w: 0.12, h: 0.72, d: 0.12, x: x + 1.9, y: 0.8, z: -6.4 },
    )
    for (const sx of [-1.65, -0.55, 0.55, 1.65]) {
      tableParts.push({ w: 0.42, h: 0.42, d: 0.42, x: x + sx, y: 0.65, z: -7.15 })
      tableParts.push({ w: 0.42, h: 0.42, d: 0.42, x: x + sx, y: 0.65, z: -5.65 })
    }
  }
  root.add(mergeBoxMesh(tableParts, stdMaterial(WOOD, { roughness: 0.65 })))

  // 吊灯阵 5×2（暖光灯体 + 吊杆）
  const pendantBody: BoxPart[] = []
  const pendantCord: BoxPart[] = []
  for (const x of [-12.5, -9.5, -6.5, -3.5, -0.5]) {
    for (const z of [-3.0, -5.6]) {
      pendantBody.push({ w: 0.32, h: 0.4, d: 0.32, x, y: 6.0, z })
      pendantBody.push({ w: 0.4, h: 0.08, d: 0.4, x, y: 6.22, z })
      pendantCord.push({ w: 0.04, h: 4.3, d: 0.04, x, y: 8.4, z })
    }
  }
  root.add(mergeBoxMesh(pendantCord, stdMaterial(FRAME, { metalness: 0.6, roughness: 0.4 })))
  root.add(mergeBoxMesh(pendantBody, stdMaterial('#FFE9C4', { emissive: '#FFB65C', emissiveIntensity: 1.6, roughness: 0.4 })))
  // 北墙暖光衬板（从光庭透进来的暖景深）
  root.add(mergeBoxMesh(
    [{ w: 13.5, h: 3.4, d: 0.1, x: -7, y: 3.5, z: 0.66 }],
    stdMaterial('#F5E9D0', { emissive: '#FFB65C', emissiveIntensity: 1.1, roughness: 0.9 }),
  ))

  // 西端 3F 山墙竖向发光招牌（补西立面识别度，贴墙不越核）
  root.add(mergeBoxMesh(
    [{ w: 0.2, h: 3.6, d: 1.5, x: -17.68, y: 11.9, z: 4.2 }],
    stdMaterial(FRAME, { metalness: 0.5, roughness: 0.4 }),
  ))
  root.add(mergeBoxMesh(
    [{ w: 0.06, h: 3.3, d: 1.26, x: -17.8, y: 11.9, z: 4.2 }],
    stdMaterial('#FF6B4A', { emissive: '#FF6B4A', emissiveIntensity: 1.5, roughness: 0.4 }),
  ))

  // ================================================================ 西服务院
  root.add(paving({ w: 2.5, d: 8.6, x: -16.3, z: -3.45, y: 0.3, cell: 0.4, gap: 0.06, ...bandB }))
  root.add(mergeBoxMesh([
    { w: 0.14, h: 2.5, d: 1.6, x: -15.06, y: 1.69, z: -2.6 },
    { w: 0.1, h: 0.08, d: 0.3, x: -15.15, y: 1.7, z: -2.15 },
  ], stdMaterial(ALUM, { metalness: 0.7, roughness: 0.35 })))
  root.add(finArray({ w: 3.6, h: 2.6, y: 4.3, x: -15.07, ry: -Math.PI / 2, count: 11, depth: 0.35, thick: 0.12, color: ALUM }))
  // 卸货雨棚
  root.add(mergeBoxMesh([
    { w: 3.0, h: 0.18, d: 2.2, x: -16.4, y: 3.5, z: -6.0 },
    { w: 0.16, h: 3.41, d: 0.16, x: -17.75, y: 1.705, z: -7.0 },
    { w: 0.16, h: 3.41, d: 0.16, x: -17.75, y: 1.705, z: -5.0 },
    { w: 0.2, h: 0.9, d: 1.4, x: -17.3, y: 0.74, z: -3.0 },
  ], stdMaterial(ALUM, { metalness: 0.6, roughness: 0.4 })))

  // ================================================================ 东翼（餐厅 + 南露台）
  // 底层沿街 6 开间橱窗（对光庭，暖光餐饮界面；上方楼板即天然雨棚）
  for (let i = 0; i < 6; i++) {
    root.add(storefront({
      w: 2.5, h: 2.9, y: 0.45, mullions: 3, transoms: 3,
      signColor: SIGN_COLORS[(i + 2) % SIGN_COLORS.length],
      signH: 0.7,
      z: -7.49, x: 2.7 + 2.65 * i,
      ry: Math.PI,
    }))
  }
  // 底层东山墙幕墙（贴一期巷道）
  root.add(curtainGrid({
    w: 8.35, h: 4.7, y: 0.15, x: 17.725, z: -3.175, ry: Math.PI / 2,
    cols: 6, rows: 2, subCols: 3, subRows: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    spandrel: 0.4, spandrelColor: ALUM, lit: { ratio: 0.3, seed: seed() },
  }))
  // 2 层南向幕墙（对露台/光庭，遮阳 + 暖窗）
  root.add(curtainGrid({
    w: 16.6, h: 4.5, y: 5, x: 9.3, z: -4.425, ry: Math.PI,
    cols: 8, rows: 2, subCols: 3, subRows: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    spandrel: 0.5, spandrelColor: ALUM, sunshade: true, shadeOut: 0.3,
    lit: { ratio: 0.35, seed: seed() },
  }))
  // 2 层东山墙幕墙
  root.add(curtainGrid({
    w: 5.4, h: 4.5, y: 5, x: 17.725, z: -1.7, ry: Math.PI / 2,
    cols: 3, rows: 2, subCols: 3, subRows: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    spandrel: 0.5, spandrelColor: ALUM, lit: { ratio: 0.3, seed: seed() },
  }))
  // 南露台（y5）：铺装 + 临空栏杆 + 花池 + 餐饮座
  root.add(paving({ w: 16.4, d: 2.9, x: 9.3, z: -5.95, y: 5, cell: 0.34, gap: 0.06, colorA: '#D9D6CF', colorB: '#C4C1BA', accent: 5, inset: null }))
  root.add(rail(16.4, 9.3, 5, -7.4))
  root.add(rail(2.9, 17.5, 5, -5.95, Math.PI / 2))
  root.add(ctx.blocks.hedge({ w: 2.6, h: 0.7, x: 5.0, z: -4.9 }))
  root.add(ctx.blocks.hedge({ w: 3.0, h: 0.7, x: 12.0, z: -4.9 }))
  root.add(ctx.blocks.urn({ x: 2.2, y: 5, z: -6.6 }))
  const wingSpots: Array<[number, number]> = [[4.2, -6.0], [8.6, -5.6], [13.2, -6.0], [16.2, -5.6]]
  for (let i = 0; i < wingSpots.length; i++) {
    for (const o of seatSet(wingSpots[i][0], 5, wingSpots[i][1], i % 2 ? '#B0885E' : '#E8E6E1')) root.add(o)
  }
  return root
}



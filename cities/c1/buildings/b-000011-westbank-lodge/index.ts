import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { mergeBoxMesh, mergeBoxes, type BoxPart } from '../../blocks/mimo-v2.6-flash/geo'
import { curtainGrid, finArray } from '../../blocks/mimo-v2.6-flash/curtainwall'
import { storefront } from '../../blocks/mimo-v2.6-flash/storefront'
import { paving, turf } from '../../blocks/mimo-v2.6-flash/paving'

/** 西岸驿 Westbank Lodge —— D4 西岸商业街区四期（宗地 D4-07 单地块 20×20m）
 * 立意「西南门户 · 驿站收口」：裙房 12m 满核心（东面与三期西岸里天际线平接）+ L 形转角骑楼
 * （二期柱廊母题在西南街角转 90° 收端）+ 塔楼偏北退台 12→40.8m（8 层客房）+ 格栅冠 45m。
 * 北面通高玻璃大堂对 04 中央光庭，西南角让出转角广场（塔让角、角成场）；
 * 西/南临街连续檐廊，橱窗竖招入夜有灯。母题延续：玻璃·橱窗·骑楼檐。
 * 局部原点 = 宗地中心；北 +z 对光庭，东 +x 接西岸里，南/西临街。 */

const GLASS = '#5E8FB3'
const GLASS_EMIT = '#2A5674'
const FRAME = '#3E3C3A'
const ALUM = '#C4C1BA'
const STONE = '#E8E6E1'
const WOOD = '#B0885E'
const SIGN_COLORS = ['#FF6B4A', '#4ADFC4', '#FFD166', '#E86A92', '#7FD1FF']

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

  // ================================================================ 场地
  // 草皮满铺 20×20（顶 0.3m 地被豁免）；西/南临街、北接光庭、东接西岸里
  root.add(turf({ w: 20, d: 20 }))

  const bandA = { colorA: '#D9D6CF', colorB: '#C4C1BA', accent: 5, inset: null } as const
  const bandB = { colorA: '#C4C1BA', colorB: '#A8A5A0', accent: 4, inset: null } as const
  // 四带（四角留白给转角广场与行道树）
  root.add(paving({ w: 1.35, d: 17.2, x: -9.32, y: 0.3, cell: 0.24, gap: 0.05, ...bandB }))
  root.add(paving({ w: 17.2, d: 1.35, z: -9.32, y: 0.3, cell: 0.24, gap: 0.05, ...bandB }))
  root.add(paving({ w: 17.2, d: 1.35, z: 9.32, y: 0.3, cell: 0.24, gap: 0.05, ...bandA }))
  root.add(paving({ w: 1.35, d: 17.2, x: 9.32, y: 0.3, cell: 0.24, gap: 0.05, ...bandA }))
  // 西南转角广场（塔让角、角成场）
  root.add(paving({ w: 4.4, d: 4.4, x: -7.4, z: -7.4, y: 0.3, cell: 0.26, gap: 0.05, ...bandA }))
  // 出入口接口：北接光庭、东接西岸里
  root.add(paving({ w: 3.4, d: 1.6, z: 8.4, y: 0.3, cell: 0.22, gap: 0.05, ...bandB }))
  root.add(paving({ w: 1.6, d: 3.0, x: 8.4, z: 1.5, y: 0.3, cell: 0.22, gap: 0.05, ...bandB }))
  // 骑楼廊下地面（西廊/南廊）
  root.add(paving({ w: 2.2, d: 15.0, x: -6.4, y: 0.3, cell: 0.22, gap: 0.05, ...bandA }))
  root.add(paving({ w: 12.8, d: 2.2, z: -6.4, y: 0.3, cell: 0.22, gap: 0.05, ...bandA }))

  // 行道树 10（site 豁免；冠半径 ≈1.5×scale，最远 9.0+0.98=9.98 ≤ R2 容差 10.25）
  for (const [x, z, s] of [
    [-9.0, -6, 0.65], [-9.0, 0, 0.65], [-9.0, 6, 0.65],
    [-6, -9.0, 0.65], [0, -9.0, 0.65], [6, -9.0, 0.65],
    [-6, 9.0, 0.62], [6, 9.0, 0.62],
    [9.0, -4, 0.6], [9.0, 4, 0.6],
  ] as const) {
    root.add(ctx.blocks.tree({ x, z, scale: s, seed: seed() }))
  }
  // 路灯 6 / 坐凳 4 / 绿篱 3 / 石盆 2（site 豁免）
  for (const [x, z] of [
    [-8.7, -3], [-8.7, 3], [-3, -8.7], [3, -8.7], [4, 8.7], [8.7, -4],
  ] as const) {
    root.add(ctx.blocks.streetLamp({ x, z }))
  }
  for (const [x, z, ry] of [
    [-7.6, -6.2, 0], [-6.2, -7.6, Math.PI / 2], [3.5, 8.9, 0], [8.9, 3.5, -Math.PI / 2],
  ] as const) {
    root.add(at(ctx.blocks.bench({}), x, 0.3, z, ry))
  }
  root.add(ctx.blocks.hedge({ w: 3.6, h: 0.75, x: -7.4, z: -9.55 }))
  root.add(ctx.blocks.hedge({ w: 0.9, d: 3.6, h: 0.75, x: -9.55, z: 0.8 }))
  root.add(ctx.blocks.hedge({ w: 3.0, h: 0.75, x: -4, z: 9.55 }))
  root.add(ctx.blocks.urn({ x: -8.6, y: 0.3, z: -5.2 }))
  root.add(ctx.blocks.urn({ x: 7.6, y: 0.3, z: 8.6, scale: 0.8 }))

  // ================================================================ 裙房（0–12m）
  // 下段挖 L 形骑楼廊（西/南退 2.2m）：剩余实体 = x-5.3..7.5 × z-5.3..7.5
  // 上段满皮 x±7.5 悬挑压柱上；女儿墙 11.4–11.94，压顶收平 12.0（东面与西岸里平接）
  const mass: BoxPart[] = [
    { w: 12.8, h: 6, d: 12.8, x: 1.1, y: 3, z: 1.1 },          // 下段实体（西/南内退）
    { w: 15, h: 5.4, d: 15, x: 0, y: 8.7, z: 0 },              // 上段满皮 6–11.4
    { w: 15, h: 0.54, d: 0.3, x: 0, y: 11.67, z: 7.35 },       // 女儿墙 北
    { w: 15, h: 0.54, d: 0.3, x: 0, y: 11.67, z: -7.35 },      // 女儿墙 南
    { w: 0.3, h: 0.54, d: 14.4, x: -7.35, y: 11.67, z: 0 },    // 女儿墙 西
    { w: 0.3, h: 0.54, d: 14.4, x: 7.35, y: 11.67, z: 0 },     // 女儿墙 东
  ]
  root.add(mergeBoxMesh(mass, stdMaterial(STONE, { roughness: 0.7, metalness: 0.05 })))

  // 压顶 + 檐口线脚（ALUM 独立 mesh；压顶顶 12.0）
  const trim: BoxPart[] = [
    { w: 15.1, h: 0.06, d: 0.42, x: 0, y: 11.97, z: 7.35 },
    { w: 15.1, h: 0.06, d: 0.42, x: 0, y: 11.97, z: -7.35 },
    { w: 0.42, h: 0.06, d: 14.4, x: -7.35, y: 11.97, z: 0 },
    { w: 0.42, h: 0.06, d: 14.4, x: 7.35, y: 11.97, z: 0 },
    // 骑楼挑板上下缘线脚（L 形，外缘 -8.0 ≤ 退线核容差 8.05）
    { w: 0.5, h: 0.1, d: 15.4, x: -7.75, y: 6.45, z: 0 },
    { w: 15.4, h: 0.1, d: 0.5, x: 0, y: 6.45, z: -7.75 },
    { w: 0.5, h: 0.1, d: 15.4, x: -7.75, y: 5.95, z: 0 },
    { w: 15.4, h: 0.1, d: 0.5, x: 0, y: 5.95, z: -7.75 },
  ]
  root.add(mergeBoxMesh(trim, stdMaterial(ALUM, { metalness: 0.6, roughness: 0.35 })))

  // ================================================================ L 形转角骑楼
  // 柱心 ±7.72（柱头 w0.6 → 外缘 8.02 ≤ 8.05）；挑板 y6.0–6.4 出挑至 8.0；角柱收转角
  const arcade: BoxPart[] = []
  const colXs = [-5.4, -1.8, 1.8, 5.4]          // 西列柱（沿 z）
  const colZs = [-5.4, -1.8, 1.8, 5.4]          // 南列柱（沿 x）
  for (const z of colXs) {
    arcade.push({ w: 0.62, h: 0.4, d: 0.62, x: -7.72, y: 0.5, z })
    arcade.push({ w: 0.48, h: 4.7, d: 0.48, x: -7.72, y: 3.05, z })
    arcade.push({ w: 0.6, h: 0.6, d: 0.6, x: -7.72, y: 5.7, z })
  }
  for (const x of colZs) {
    arcade.push({ w: 0.62, h: 0.4, d: 0.62, x, y: 0.5, z: -7.72 })
    arcade.push({ w: 0.48, h: 4.7, d: 0.48, x, y: 3.05, z: -7.72 })
    arcade.push({ w: 0.6, h: 0.6, d: 0.6, x, y: 5.7, z: -7.72 })
  }
  // 角柱（西南转角）
  arcade.push({ w: 0.62, h: 0.4, d: 0.62, x: -7.72, y: 0.5, z: -7.72 })
  arcade.push({ w: 0.48, h: 4.7, d: 0.48, x: -7.72, y: 3.05, z: -7.72 })
  arcade.push({ w: 0.6, h: 0.6, d: 0.6, x: -7.72, y: 5.7, z: -7.72 })
  // 挑板：西条 + 南条 + 角块（分置不重叠防 z-fighting；外缘 -8.0、南 -8.0）
  arcade.push({ w: 0.5, h: 0.4, d: 15.0, x: -7.75, y: 6.2, z: 0 })
  arcade.push({ w: 15.0, h: 0.4, d: 0.5, x: 0, y: 6.2, z: -7.75 })
  arcade.push({ w: 0.5, h: 0.4, d: 0.5, x: -7.75, y: 6.2, z: -7.75 })
  root.add(mergeBoxMesh(arcade, stdMaterial(STONE, { roughness: 0.65 })))

  // 檐下吊球灯 7 盏（暖 6 + 红 1；吊杆贴挑板底 6.0，球 5.44–5.74）
  const rod: BoxPart[] = []
  const ballWarm: BoxPart[] = []
  const ballRed: BoxPart[] = []
  const lampPts: Array<[number, number, boolean]> = [
    [-6.5, -4.5, false], [-6.5, -1.5, false], [-6.5, 1.5, false], [-6.5, 4.5, false],
    [-4.5, -6.5, false], [0, -6.5, true], [4.5, -6.5, false],
  ]
  for (const [x, z, red] of lampPts) {
    rod.push({ w: 0.03, h: 0.3, d: 0.03, x, y: 5.85, z })
    const ball: BoxPart[] = [
      { w: 0.3, h: 0.26, d: 0.3, x, y: 5.57, z },
      { w: 0.36, h: 0.05, d: 0.36, x, y: 5.72, z },
    ]
    if (red) ballRed.push(...ball)
    else ballWarm.push(...ball)
  }
  root.add(mergeBoxMesh(rod, stdMaterial(FRAME, { metalness: 0.6, roughness: 0.4 })))
  root.add(mergeBoxMesh(ballWarm, stdMaterial('#FFD9A0', { emissive: '#FFB65C', emissiveIntensity: 1.5, roughness: 0.5 })))
  root.add(mergeBoxMesh(ballRed, stdMaterial('#FF8A6A', { emissive: '#FF5A3C', emissiveIntensity: 1.5, roughness: 0.5 })))

  // ================================================================ 裙房立面
  // 西/南骑楼内墙橱窗（内退皮 x/z ±5.3 → 中心 5.46，无篷——骑楼即篷）
  const innerBays = [-3.8, -0.8, 2.2, 5.25]
  for (let i = 0; i < 4; i++) {
    root.add(storefront({
      w: 3.0, h: 4.5, y: 0.45, mullions: 4, transoms: 3,
      signColor: SIGN_COLORS[i % SIGN_COLORS.length], signH: 0.6,
      x: -5.46, z: innerBays[i], ry: -Math.PI / 2,
    }))
    root.add(storefront({
      w: 3.0, h: 4.5, y: 0.45, mullions: 4, transoms: 3,
      signColor: SIGN_COLORS[(i + 2) % SIGN_COLORS.length], signH: 0.6,
      z: -5.46, x: innerBays[i], ry: Math.PI,
    }))
  }
  // 转角 45° 霓虹灯箱（对景街口）
  root.add(at(
    mergeBoxMesh(
      [{ w: 1.4, h: 4.6, d: 0.5, x: 0, y: 2.75, z: 0 }],
      stdMaterial('#E86A92', { emissive: '#E86A92', emissiveIntensity: 1.5, roughness: 0.4 }),
    ),
    -6.35, 0, -6.35, -Math.PI / 4,
  ))

  // 北面（对光庭）：1F 大堂通高幕墙 + 2F 窗带
  root.add(curtainGrid({
    w: 12.6, h: 5.6, y: 0.4, x: 1.1, z: 7.66,
    cols: 7, rows: 1, subCols: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: '#6B4A20',
    lit: { ratio: 0.5, seed: seed() },
  }))
  root.add(curtainGrid({
    w: 13, h: 4.6, y: 6.6, z: 7.66,
    cols: 6, rows: 2, subCols: 2, subRows: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    spandrel: 0.4, spandrelColor: ALUM, lit: { ratio: 0.3, seed: seed() },
  }))
  // 东面（接西岸里）：1F 次入口幕墙 + 2F 窗带
  root.add(curtainGrid({
    w: 12.6, h: 4.5, y: 0.4, x: 7.66, z: 1.1, ry: Math.PI / 2,
    cols: 6, rows: 1, subCols: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    lit: { ratio: 0.4, seed: seed() },
  }))
  root.add(curtainGrid({
    w: 13, h: 4.6, y: 6.6, x: 7.66, ry: Math.PI / 2,
    cols: 6, rows: 2, subCols: 2, subRows: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    spandrel: 0.4, spandrelColor: ALUM, lit: { ratio: 0.3, seed: seed() },
  }))
  // 西/南 2F 窗带（悬挑上方，贴上段皮 7.5 → 中心 7.66）
  root.add(curtainGrid({
    w: 14.6, h: 4.6, y: 6.6, x: -7.66, ry: -Math.PI / 2,
    cols: 8, rows: 2, subCols: 2, subRows: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    spandrel: 0.4, spandrelColor: ALUM, sunshade: true, shadeOut: 0.15,
    lit: { ratio: 0.3, seed: seed() },
  }))
  root.add(curtainGrid({
    w: 14.6, h: 4.6, y: 6.6, z: -7.66, ry: Math.PI,
    cols: 8, rows: 2, subCols: 2, subRows: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    spandrel: 0.4, spandrelColor: ALUM, sunshade: true, shadeOut: 0.15,
    lit: { ratio: 0.3, seed: seed() },
  }))

  // 横楣发光带四段（西/南廊内 y5.4、东 y5.3、北 y6.05）
  const frieze: BoxPart[] = [
    { w: 0.14, h: 0.45, d: 12.8, x: -5.42, y: 5.4, z: 1.1 },
    { w: 12.8, h: 0.45, d: 0.14, z: -5.42, y: 5.4, x: 1.1 },
    { w: 0.14, h: 0.4, d: 12.8, x: 7.62, y: 5.3, z: 1.1 },
    { w: 14.6, h: 0.4, d: 0.14, z: 7.62, y: 6.05, x: 0 },
  ]
  root.add(mergeBoxMesh(frieze, stdMaterial('#FFD166', { emissive: '#FFD166', emissiveIntensity: 1.4, roughness: 0.4 })))

  // ================================================================ 北入口（台阶 + 格栅雨棚）
  // R13 薄板豁免看的是逐 mesh 的 min(extX,extZ)≤0.5 且 topY≤3 —— 合并会把 bbox 撑大，
  // 故每级踏步 / 每根棚条 / 每根纵梁各自成 mesh
  for (const [z, y] of [[7.7, 0.37], [8.15, 0.51], [8.6, 0.65]] as Array<[number, number]>) {
    root.add(mergeBoxMesh([{ w: 6, h: 0.14, d: 0.45, x: 0, y, z }], stdMaterial(STONE, { roughness: 0.75 })))
  }
  // 格栅雨棚 4 条（d0.36 条间缝 0.24，光影好看）+ 2 纵梁 + 2 前柱
  for (const z of [7.66, 8.26, 8.86, 9.46]) {
    root.add(mergeBoxMesh([{ w: 6, h: 0.4, d: 0.36, x: 0, y: 2.6, z }], stdMaterial(ALUM, { metalness: 0.6, roughness: 0.35 })))
  }
  for (const x of [-2.6, 2.6]) {
    root.add(mergeBoxMesh([{ w: 0.16, h: 0.14, d: 2.3, x, y: 2.7, z: 8.6 }], stdMaterial(ALUM, { metalness: 0.6, roughness: 0.35 })))
  }
  root.add(mergeBoxMesh([
    { w: 0.16, h: 2.3, d: 0.16, x: -2.6, y: 1.5, z: 9.35 }, // 前柱（薄豁免）
    { w: 0.16, h: 2.3, d: 0.16, x: 2.6, y: 1.5, z: 9.35 },
  ], stdMaterial(ALUM, { metalness: 0.6, roughness: 0.35 })))
  root.add(mergeBoxMesh([
    { w: 0.03, h: 0.2, d: 0.03, x: -1.5, y: 2.5, z: 8.2 },
    { w: 0.03, h: 0.2, d: 0.03, x: 1.5, y: 2.5, z: 8.2 },
    { w: 0.4, h: 0.12, d: 0.4, x: -1.5, y: 2.34, z: 8.2 },
    { w: 0.4, h: 0.12, d: 0.4, x: 1.5, y: 2.34, z: 8.2 },
  ], stdMaterial('#FFD9A0', { emissive: '#FFB65C', emissiveIntensity: 1.5, roughness: 0.5 })))

  // ================================================================ 塔楼（12–40.8m，8 层客房）
  // 平面 x±5.4、z 中心 +1.0（z-4.8..6.8）偏北，南/西南留裙房露台；核心内宽松
  const tower: BoxPart[] = [{ w: 10.8, h: 28.8, d: 11.6, x: 0, y: 26.4, z: 1.0 }]
  root.add(mergeBoxMesh(tower, stdMaterial('#54514D', { roughness: 0.6, metalness: 0.15 })))

  // 四面密梃幕墙（cols6×rows8×sub2×2，层间 spandrel 铝带，夜 lit 客房灯 0.3）
  const towerFaces: Array<{ x?: number; z?: number; ry?: number; w: number }> = [
    { z: 6.96, w: 10.8 },
    { z: -4.96, ry: Math.PI, w: 10.8 },
    { x: 5.56, ry: Math.PI / 2, w: 11.6 },
    { x: -5.56, ry: -Math.PI / 2, w: 11.6 },
  ]
  for (const f of towerFaces) {
    root.add(curtainGrid({
      w: f.w, h: 28.8, y: 12.0, x: f.x ?? 0, z: f.z ?? 1.0, ry: f.ry ?? 0,
      cols: 6, rows: 8, subCols: 2, subRows: 2,
      frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
      spandrel: 0.4, spandrelColor: ALUM,
      lit: { ratio: 0.3, seed: seed() },
    }))
  }
  // 东西面装饰竖鳍 16 道（y 为底 → 12.1..40.7）
  root.add(finArray({ w: 11.4, h: 28.6, y: 12.1, x: 5.72, z: 1.0, ry: Math.PI / 2, count: 16, depth: 0.34, thick: 0.1, color: ALUM }))
  root.add(finArray({ w: 11.4, h: 28.6, y: 12.1, x: -5.72, z: 1.0, ry: -Math.PI / 2, count: 16, depth: 0.34, thick: 0.1, color: ALUM }))
  // 层间腰线（7 层 × 4 面 合并单 mesh）
  const bands: BoxPart[] = []
  for (let k = 1; k <= 7; k++) {
    const y = 12.0 + 3.6 * k
    bands.push({ w: 10.95, h: 0.12, d: 0.1, x: 0, y, z: 6.86 })
    bands.push({ w: 10.95, h: 0.12, d: 0.1, x: 0, y, z: -4.86 })
    bands.push({ w: 0.1, h: 0.12, d: 11.75, x: 5.46, y, z: 1.0 })
    bands.push({ w: 0.1, h: 0.12, d: 11.75, x: -5.46, y, z: 1.0 })
  }
  root.add(mergeBoxMesh(bands, stdMaterial(ALUM, { metalness: 0.6, roughness: 0.35 })))

  // ================================================================ 塔冠（40.8–45.0m）
  // 机房层（退台 x±4.6）+ 南北百叶 + 竖格栅冠 42–44.5 + 发光字带 + 顶板收 45.0 + 航灯
  root.add(mergeBoxMesh(
    [{ w: 9.2, h: 2.6, d: 9.6, x: 0, y: 42.1, z: 1.0 }],
    stdMaterial(STONE, { roughness: 0.7 }),
  ))
  root.add(finArray({ w: 8.8, h: 2.4, y: 40.9, z: -4.0, ry: Math.PI, count: 14, depth: 0.3, thick: 0.1, color: FRAME }))
  root.add(finArray({ w: 8.8, h: 2.4, y: 40.9, z: 6.0, count: 14, depth: 0.3, thick: 0.1, color: FRAME }))
  const grille: BoxPart[] = []
  for (let x = -4.3; x <= 4.31; x += 0.43) {
    grille.push({ w: 0.12, h: 2.8, d: 0.3, x, y: 43.4, z: 5.9 })
    grille.push({ w: 0.12, h: 2.8, d: 0.3, x, y: 43.4, z: -3.9 })
  }
  for (let z = -3.4; z <= 5.41; z += 0.44) {
    grille.push({ w: 0.3, h: 2.8, d: 0.12, x: 4.7, y: 43.4, z })
    grille.push({ w: 0.3, h: 2.8, d: 0.12, x: -4.7, y: 43.4, z })
  }
  for (const y of [42.05, 44.7]) {
    grille.push({ w: 8.9, h: 0.1, d: 0.14, x: 0, y, z: 5.9 })
    grille.push({ w: 8.9, h: 0.1, d: 0.14, x: 0, y, z: -3.9 })
    grille.push({ w: 0.14, h: 0.1, d: 9.8, x: 4.7, y, z: 1.0 })
    grille.push({ w: 0.14, h: 0.1, d: 9.8, x: -4.7, y, z: 1.0 })
  }
  root.add(mergeBoxMesh(grille, stdMaterial(WOOD, { roughness: 0.55 })))
  // 顶部发光字带（四面，格栅内 z 内缩）
  const crownBand: BoxPart[] = [
    { w: 6.5, h: 0.35, d: 0.08, x: 0, y: 44.3, z: 5.58 },
    { w: 6.5, h: 0.35, d: 0.08, x: 0, y: 44.3, z: -3.58 },
    { w: 0.08, h: 0.35, d: 6.5, x: 4.28, y: 44.3, z: 1.0 },
    { w: 0.08, h: 0.35, d: 6.5, x: -4.28, y: 44.3, z: 1.0 },
  ]
  root.add(mergeBoxMesh(crownBand, stdMaterial('#FFD166', { emissive: '#FFD166', emissiveIntensity: 1.6, roughness: 0.4 })))
  // 顶板收 45.0 + 四角航空灯
  root.add(mergeBoxMesh(
    [{ w: 9.4, h: 0.2, d: 9.8, x: 0, y: 44.7, z: 1.0 }],
    stdMaterial(ALUM, { metalness: 0.6, roughness: 0.35 }),
  ))
  root.add(mergeBoxMesh([
    { w: 0.14, h: 0.1, d: 0.14, x: -4.65, y: 44.9, z: -3.85 },
    { w: 0.14, h: 0.1, d: 0.14, x: 4.65, y: 44.9, z: -3.85 },
    { w: 0.14, h: 0.1, d: 0.14, x: -4.65, y: 44.9, z: 5.85 },
    { w: 0.14, h: 0.1, d: 0.14, x: 4.65, y: 44.9, z: 5.85 },
  ], stdMaterial('#FF5A3C', { emissive: '#FF3A1C', emissiveIntensity: 2, roughness: 0.5 })))

  // ================================================================ 裙房屋顶花园（12m 平台，塔南侧）
  root.add(paving({ w: 14.6, d: 2.4, z: -6.1, y: 11.4, cell: 0.3, gap: 0.06, ...bandA }))
  root.add(paving({ w: 1.9, d: 14.6, x: -6.4, y: 11.4, cell: 0.3, gap: 0.06, ...bandA }))
  root.add(paving({ w: 1.9, d: 14.6, x: 6.4, y: 11.4, cell: 0.3, gap: 0.06, ...bandA }))
  root.add(at(ctx.blocks.hedge({ w: 3.0, h: 0.7 }), -4.0, 11.48, -6.3))
  root.add(at(ctx.blocks.hedge({ w: 3.0, h: 0.7 }), 4.0, 11.48, -6.3))
  root.add(at(ctx.blocks.hedge({ w: 0.7, d: 2.4, h: 0.7 }), -6.4, 11.48, 3.6))
  root.add(ctx.blocks.urn({ x: 0, y: 11.48, z: -6.6, scale: 0.8 }))
  root.add(at(ctx.blocks.bench({}), -2.2, 11.48, -7.0, 0))
  root.add(at(ctx.blocks.bench({}), 2.2, 11.48, -7.0, 0))

  // ================================================================ 招牌体系
  // 塔身东面竖招「西岸驿」（y20–29，贴皮外突出过竖鳍）
  root.add(mergeBoxMesh(
    [{ w: 0.3, h: 9, d: 2.2, x: 6.04, y: 24.5, z: 1.0 }],
    stdMaterial(FRAME, { metalness: 0.5, roughness: 0.4 }),
  ))
  root.add(mergeBoxMesh(
    [{ w: 0.1, h: 8.4, d: 1.9, x: 6.21, y: 24.5, z: 1.0 }],
    stdMaterial('#FF6B4A', { emissive: '#FF6B4A', emissiveIntensity: 1.6, roughness: 0.4 }),
  ))
  // 塔身西面竖招（对西街，y14–22）
  root.add(mergeBoxMesh(
    [{ w: 0.3, h: 8, d: 2.0, x: -6.04, y: 18, z: 1.0 }],
    stdMaterial(FRAME, { metalness: 0.5, roughness: 0.4 }),
  ))
  root.add(mergeBoxMesh(
    [{ w: 0.1, h: 7.4, d: 1.7, x: -6.21, y: 18, z: 1.0 }],
    stdMaterial('#7FD1FF', { emissive: '#7FD1FF', emissiveIntensity: 1.6, roughness: 0.4 }),
  ))
  // 西南角挑檐下 45° 霓虹刀牌（转角收端）
  root.add(at(
    mergeBoxMesh(
      [{ w: 0.1, h: 2.2, d: 0.55, x: 0, y: 4.35, z: 0 }],
      stdMaterial(FRAME, { metalness: 0.5, roughness: 0.4 }),
    ),
    -7.5, 0, -7.5, -Math.PI / 4,
  ))
  root.add(at(
    mergeBoxMesh(
      [{ w: 0.05, h: 1.9, d: 0.4, x: 0, y: 4.35, z: 0 }],
      stdMaterial('#4ADFC4', { emissive: '#4ADFC4', emissiveIntensity: 1.6, roughness: 0.4 }),
    ),
    -7.5, 0, -7.5, -Math.PI / 4,
  ))
  // 北女儿墙屋顶字牌「西岸驿」（对光庭）
  root.add(mergeBoxMesh(
    [{ w: 6.0, h: 1.2, d: 0.14, x: 0, y: 11.45, z: 7.55 }],
    stdMaterial(FRAME, { metalness: 0.5, roughness: 0.4 }),
  ))
  root.add(mergeBoxMesh(
    [{ w: 5.6, h: 0.95, d: 0.05, x: 0, y: 11.45, z: 7.64 }],
    stdMaterial('#FFD166', { emissive: '#FFD166', emissiveIntensity: 1.6, roughness: 0.4 }),
  ))

  return root
}

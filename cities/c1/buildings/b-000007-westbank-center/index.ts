import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { mergeBoxMesh, type BoxPart } from '../../blocks/mimo-v2.6-flash/geo'
import { curtainGrid, finArray } from '../../blocks/mimo-v2.6-flash/curtainwall'
import { storefront } from '../../blocks/mimo-v2.6-flash/storefront'
import { paving, turf } from '../../blocks/mimo-v2.6-flash/paving'

/** 西岸中心 Westbank Center —— D4 西岸商业街区一期（宗地 D4-03+06，20×40m）
 * 东向正对镜湖公园的玻璃橱窗塔：底层骑楼拱廊 + 商业裙房四层 + 退台景观塔 75m。
 * 局部原点 = 宗地中心；东 +x 临园，北 +z 接二期骑楼街。 */

const GLASS = '#9EC5DD'   // 色板11 天青浅蓝（城主同步后提亮，原 #5E8FB3）
const GLASS_EMIT = '#5E8FB3'   // 提亮兜底（原暗蓝 #2A5674）
const FRAME = '#7C7A76'   // 铝灰（原近黑 #3E3C3A，IBL 修复后改亮两档）
const ALUM = '#C4C1BA'
const STONE = '#E8E6E1'
const BASE = '#A8A5A0'
const CROWN = '#FFC46B'
const SIGN_COLORS = ['#FF6B4A', '#4ADFC4', '#FFD166', '#E86A92', '#7FD1FF', '#FF9F5A']

export default function build(ctx: BuildCtx): THREE.Object3D {
  const root = new THREE.Group()
  const seed = () => Math.floor(ctx.rng() * 1e6)

  // 官方积木无旋转/抬升参数：统一用 Group 包装定位（site 豁免沿父链查找不受影响）
  const at = (o: THREE.Object3D, x: number, y: number, z: number, ry = 0): THREE.Object3D => {
    const g = new THREE.Group()
    g.add(o)
    g.position.set(x, y, z)
    g.rotation.y = ry
    return g
  }

  // ---------------------------------------------------------------- 场地
  // 草皮满铺宗地全域（20×40，顶 0.3m 属地被豁免）
  root.add(turf({ w: 20, d: 40 }))

  // 四环带拼花铺装（薄板豁免）：叠在草皮顶 0.3 上——东临园 / 西临街 / 南北接口
  const eastPave = paving({ w: 2.45, d: 39.9, x: 8.77, y: 0.3, cell: 0.3, gap: 0.05, colorA: '#D9D6CF', colorB: '#C4C1BA', accent: 5, inset: null })
  root.add(eastPave)
  root.add(paving({ w: 2.45, d: 39.9, x: -8.77, y: 0.3, cell: 0.3, gap: 0.05, colorA: '#D9D6CF', colorB: '#C4C1BA', accent: 5, inset: null }))
  root.add(paving({ w: 14.9, d: 2.45, z: 18.77, y: 0.3, cell: 0.36, gap: 0.06, colorA: '#C4C1BA', colorB: '#A8A5A0', accent: 4, inset: null }))
  root.add(paving({ w: 14.9, d: 2.45, z: -18.77, y: 0.3, cell: 0.36, gap: 0.06, colorA: '#C4C1BA', colorB: '#A8A5A0', accent: 4, inset: null }))

  // ---------------------------------------------------------------- 主体盒（裙房 + 塔楼核心）
  // 原则：主体皮必须退到幕墙/拱墙/橱窗之后，让立面构件露出（幕墙进深 0.1~0.3 龛）
  const mass: BoxPart[] = [
    // 裙房上部三层半（y 4.2..16.8，x ±7.0 / z ±16.9）
    { w: 14.0, h: 12.6, d: 33.8, x: 0, y: 10.5, z: 0 },
    // 底层核心（y 0..4.2；东侧退让 x 至 4.6，留出骑楼空腔：拱墙 6.6..7.0 + 橱窗 5.6）
    { w: 11.6, h: 4.2, d: 33.8, x: -1.2, y: 2.1, z: 0 },
    // 女儿墙环（裙房顶）
    { w: 15.0, h: 0.8, d: 0.35, x: 0, y: 17.2, z: 17.42 },
    { w: 15.0, h: 0.8, d: 0.35, x: 0, y: 17.2, z: -17.42 },
    { w: 0.35, h: 0.8, d: 34.6, x: 7.32, y: 17.2, z: 0 },
    { w: 0.35, h: 0.8, d: 34.6, x: -7.32, y: 17.2, z: 0 },
    // 每层檐口线脚（4 层环，压幕墙外皮）
    { w: 14.8, h: 0.22, d: 0.3, x: 0, y: 4.2, z: 17.38 },
    { w: 14.8, h: 0.22, d: 0.3, x: 0, y: 4.2, z: -17.38 },
    { w: 0.3, h: 0.22, d: 34.6, x: 7.38, y: 4.2, z: 0 },
    { w: 0.3, h: 0.22, d: 34.6, x: -7.38, y: 4.2, z: 0 },
    { w: 14.8, h: 0.22, d: 0.3, x: 0, y: 8.4, z: 17.38 },
    { w: 14.8, h: 0.22, d: 0.3, x: 0, y: 8.4, z: -17.38 },
    { w: 0.3, h: 0.22, d: 34.6, x: 7.38, y: 8.4, z: 0 },
    { w: 0.3, h: 0.22, d: 34.6, x: -7.38, y: 8.4, z: 0 },
    { w: 14.8, h: 0.22, d: 0.3, x: 0, y: 12.6, z: 17.38 },
    { w: 14.8, h: 0.22, d: 0.3, x: 0, y: 12.6, z: -17.38 },
    { w: 0.3, h: 0.22, d: 34.6, x: 7.38, y: 12.6, z: 0 },
    { w: 0.3, h: 0.22, d: 34.6, x: -7.38, y: 12.6, z: 0 },
    // 塔楼核心 A：16.8..60.3（11.6×14.4，幕墙玻璃皮外露 0.2~0.3）
    { w: 11.6, h: 43.5, d: 14.4, x: 0, y: 38.55, z: 9.7 },
    // 塔楼核心 B：60.3..74.8 收分（9.4×11.6）
    { w: 9.4, h: 14.5, d: 11.6, x: 0, y: 67.55, z: 9.8 },
    // 冠部座
    { w: 10.4, h: 0.6, d: 12.8, x: 0, y: 75.1, z: 9.8 },
    { w: 11.0, h: 0.35, d: 13.4, x: 0, y: 77.4, z: 9.8 },
  ]
  root.add(mergeBoxMesh(mass, stdMaterial(STONE, { roughness: 0.7, metalness: 0.05 })))

  // 塔身竖向角线脚（四角通长，收分段呼应）
  const cornerParts: BoxPart[] = []
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cornerParts.push({ w: 0.34, h: 43.5, d: 0.34, x: sx * 6.05, y: 38.55, z: 9.7 + sz * 7.4 })
      cornerParts.push({ w: 0.3, h: 14.5, d: 0.3, x: sx * 4.95, y: 67.55, z: 9.8 + sz * 6.05 })
    }
  }
  root.add(mergeBoxMesh(cornerParts, stdMaterial(ALUM, { metalness: 0.75, roughness: 0.3 })))

  // ---------------------------------------------------------------- 东立面（临园主立面）
  // 底层骑楼拱廊：8 段拱墙（洞开到底成柱廊），皮 x 6.6..7.0
  for (let i = 0; i < 8; i++) {
    const z = -15.22 + 4.35 * i
    root.add(at(
      ctx.blocks.archWall({ w: 4.35, h: 4.2, archW: 3.3, archH: 3.6, depth: 0.4, color: STONE }),
      6.6, 0, z, Math.PI / 2,
    ))
  }
  // 骑楼廊道吊顶格栅（上部盒底 4.2 下挂横条，廊道 x 4.6..7.0）
  const soffit: BoxPart[] = []
  for (let z = -16.9; z <= 16.9; z += 0.38) {
    soffit.push({ w: 2.3, h: 0.1, d: 0.16, x: 5.75, y: 4.13, z })
  }
  root.add(mergeBoxMesh(soffit, stdMaterial('#7C7A76', { metalness: 0.4, roughness: 0.5 })))
  // 骑楼廊道地面铺装（x 4.6..7.0 檐下步行区）
  root.add(paving({ w: 2.3, d: 33.6, x: 5.78, y: 0.3, cell: 0.32, gap: 0.05, colorA: '#D9D6CF', colorB: '#C4C1BA', accent: 5, inset: null }))
  // 拱墙柱墩线脚：柱脚基座 + 柱头檐带（7 道接缝）+ 拱顶券心石（8 拱冠），压出柱廊节奏
  const pierTrim: BoxPart[] = []
  for (const z of [-13.05, -8.7, -4.35, 0.0, 4.36, 8.71, 13.06]) {
    pierTrim.push({ w: 0.5, h: 0.45, d: 1.16, x: 6.8, y: 0.24, z })
    pierTrim.push({ w: 0.5, h: 0.26, d: 1.16, x: 6.8, y: 3.96, z })
  }
  for (let i = 0; i < 8; i++) {
    pierTrim.push({ w: 0.5, h: 0.36, d: 0.46, x: 6.8, y: 3.5, z: -15.22 + 4.35 * i })
  }
  root.add(mergeBoxMesh(pierTrim, stdMaterial('#CFCBC3', { roughness: 0.75 })))
  // 拱廊内 8 开间橱窗（退至 x 5.6，篷挑不穿拱）
  const awningCols = ['#E8E6E1', '#B0885E']
  for (let i = 0; i < 8; i++) {
    const z = -14.0 + 4.0 * i
    const sf = storefront({
      w: 3.8, h: 2.6, y: 0.45, mullions: 4, transoms: 3,
      signColor: SIGN_COLORS[i % SIGN_COLORS.length],
      signH: 0.7,
      awning: awningCols[i % 2],
      x: 5.6, z, ry: Math.PI / 2,
    })
    root.add(sf)
  }
  // 2-4 层东立面幕墙（8 开间 × 3 层，密梃 + 遮阳片 + 层间带）
  root.add(curtainGrid({
    w: 34.5, h: 12.5, y: 4.3, x: 7.28, z: 0, ry: Math.PI / 2,
    cols: 8, rows: 3, subCols: 3, subRows: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    spandrel: 0.9, spandrelColor: ALUM, sunshade: true, shadeOut: 0.34, lit: { ratio: 0.24, seed: seed() },
  }))
  // 东立面 2-4 层竖向装饰鳍（立面节奏）
  root.add(finArray({ w: 34.5, h: 12.5, y: 4.3, x: 7.5, ry: Math.PI / 2, count: 9, depth: 0.55, thick: 0.14, color: ALUM }))

  // ---------------------------------------------------------------- 北立面（主入口）
  // 入口台阶（薄板）+ 玻璃雨棚 + 双门 + 门楣
  // 入口台阶（独立 mesh，叠草皮顶 0.3 起步，|z| ≤18 走本体退线）
  root.add(mergeBoxMesh([
    { w: 7.4, h: 0.15, d: 1.1, x: 0, y: 0.375, z: 17.45 },
    { w: 7.0, h: 0.15, d: 0.7, x: 0, y: 0.525, z: 17.55 },
    { w: 6.6, h: 0.15, d: 0.4, x: 0, y: 0.675, z: 17.58 },
  ], stdMaterial(BASE, { roughness: 0.85 })))
  // 玻璃雨棚 + 双门 + 门楣
  const north: BoxPart[] = [
    // 雨棚（挑至 17.9，退线内）
    { w: 7.2, h: 0.12, d: 1.5, x: 0, y: 4.05, z: 17.15 },
    { w: 7.2, h: 0.3, d: 0.12, x: 0, y: 4.25, z: 17.85 },
    // 雨棚拉杆
    { w: 0.08, h: 1.5, d: 0.08, x: -3.2, y: 3.3, z: 17.7 },
    { w: 0.08, h: 1.5, d: 0.08, x: 3.2, y: 3.3, z: 17.7 },
    // 门框 + 门楣灯带
    { w: 5.6, h: 0.18, d: 0.3, x: 0, y: 3.7, z: 17.32 },
    { w: 0.18, h: 3.3, d: 0.3, x: -2.7, y: 2.0, z: 17.32 },
    { w: 0.18, h: 3.3, d: 0.3, x: 2.7, y: 2.0, z: 17.32 },
    { w: 0.14, h: 3.3, d: 0.3, x: 0, y: 2.0, z: 17.32 },
  ]
  root.add(mergeBoxMesh(north, stdMaterial(BASE, { metalness: 0.6, roughness: 0.35 })))
  // 大堂暖光（门内）
  root.add(mergeBoxMesh(
    [{ w: 5.4, h: 3.3, d: 0.1, x: 0, y: 2.0, z: 17.28 }],
    stdMaterial('#F5E9D0', { emissive: '#FFD9A0', emissiveIntensity: 1.2, roughness: 0.9 }),
  ))
  // 门楣发光招牌带
  root.add(mergeBoxMesh(
    [{ w: 6.4, h: 0.62, d: 0.2, x: 0, y: 4.62, z: 17.3 }],
    stdMaterial('#FF6B4A', { emissive: '#FF6B4A', emissiveIntensity: 1.5, roughness: 0.4 }),
  ))
  root.add(ctx.blocks.neonSign({ w: 5.6, h: 0.44, color: '#FFD166', y: 4.4, z: 17.42 }))
  // 北立面两侧橱窗（接二期骑楼街）
  root.add(storefront({ w: 3.2, h: 2.7, y: 0.4, mullions: 2, transoms: 2, signColor: '#4ADFC4', signH: 0.6, awning: '#C4C1BA', x: -5.5, z: 17.3, display: false }))
  root.add(storefront({ w: 3.2, h: 2.7, y: 0.4, mullions: 2, transoms: 2, signColor: '#E86A92', signH: 0.6, awning: '#C4C1BA', x: 5.5, z: 17.3, display: false }))
  // 北立面 2-4 层幕墙
  root.add(curtainGrid({
    w: 14.5, h: 12.5, y: 4.3, x: 0, z: 17.28, ry: 0,
    cols: 5, rows: 3, subCols: 3, subRows: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    spandrel: 0.9, spandrelColor: ALUM, sunshade: true, shadeOut: 0.3, lit: { ratio: 0.24, seed: seed() },
  }))

  // ---------------------------------------------------------------- 西立面（临街办公入口）
  // 底层大堂通高玻璃 + 次入口 + 竖向招牌塔 + 设备百叶
  root.add(curtainGrid({
    w: 9.5, h: 4.1, y: 0.05, x: -7.28, z: 4.5, ry: -Math.PI / 2,
    cols: 4, rows: 1, subCols: 3, subRows: 3,
    frameColor: FRAME, glassColor: '#9CC4DE', glassEmissive: '#FFD9A0',
  }))
  const westDoor: BoxPart[] = [
    { w: 0.2, h: 0.16, d: 3.6, x: -7.34, y: 3.7, z: 4.5 },
    { w: 0.5, h: 0.14, d: 4.6, x: -7.6, y: 4.0, z: 4.5 },
    { w: 0.14, h: 3.5, d: 0.16, x: -7.32, y: 2.0, z: 6.2 },
    { w: 0.14, h: 3.5, d: 0.16, x: -7.32, y: 2.0, z: 2.8 },
    { w: 0.12, h: 3.5, d: 0.14, x: -7.32, y: 2.0, z: 4.5 },
  ]
  root.add(mergeBoxMesh(westDoor, stdMaterial(FRAME, { metalness: 0.75, roughness: 0.3 })))
  // 竖向招牌灯箱（西立面北段，挑至 x -7.65）
  const logoTower: BoxPart[] = [
    { w: 0.5, h: 11.5, d: 1.6, x: -7.5, y: 9.5, z: 11.5 },
    { w: 0.6, h: 0.3, d: 1.9, x: -7.5, y: 15.4, z: 11.5 },
    { w: 0.6, h: 0.3, d: 1.9, x: -7.5, y: 3.7, z: 11.5 },
  ]
  root.add(mergeBoxMesh(logoTower, stdMaterial('#4ADFC4', { emissive: '#4ADFC4', emissiveIntensity: 1.2, roughness: 0.4 })))
  root.add(finArray({ w: 1.5, h: 10.8, y: 4.05, x: -7.62, z: 11.5, ry: -Math.PI / 2, count: 14, depth: 0.4, thick: 0.1, color: '#7C7A76' }))
  // 西立面底层南段设备百叶
  root.add(finArray({ w: 9.5, h: 3.4, y: 0.5, x: -7.3, z: -7.5, ry: -Math.PI / 2, count: 26, depth: 0.3, thick: 0.1, color: '#7C7A76' }))
  root.add(mergeBoxMesh(
    [{ w: 0.3, h: 3.8, d: 10.2, x: -7.3, y: 2.2, z: -7.5 }],
    stdMaterial('#8A8783', { roughness: 0.8 }),
  ))
  // 西立面 2-4 层幕墙
  root.add(curtainGrid({
    w: 34.5, h: 12.5, y: 4.3, x: -7.28, z: 0, ry: -Math.PI / 2,
    cols: 8, rows: 3, subCols: 3, subRows: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    spandrel: 0.9, spandrelColor: ALUM, sunshade: true, shadeOut: 0.3, lit: { ratio: 0.24, seed: seed() },
  }))

  // ---------------------------------------------------------------- 南立面（接三期公园经济带）
  // 底层：绿墙格栅 + 服务门 + 百叶
  root.add(mergeBoxMesh(
    [{ w: 14.5, h: 4.2, d: 0.3, x: 0, y: 2.1, z: -17.3 }],
    stdMaterial('#6E7F5C', { roughness: 0.95 }),
  ))
  root.add(ctx.blocks.latticePanel({ w: 6.5, h: 3.6, cols: 10, rows: 7, bar: 0.1, color: '#3E3C3A', x: -3.6, y: 0.3, z: -17.5 }))
  root.add(ctx.blocks.latticePanel({ w: 6.5, h: 3.6, cols: 10, rows: 7, bar: 0.1, color: '#3E3C3A', x: 3.6, y: 0.3, z: -17.5 }))
  const southDoor: BoxPart[] = [
    { w: 2.4, h: 3.2, d: 0.16, x: 0, y: 1.7, z: -17.36 },
    { w: 3.0, h: 0.2, d: 0.5, x: 0, y: 3.5, z: -17.5 },
    { w: 0.6, h: 2.6, d: 0.14, x: 0, y: 1.5, z: -17.38 },
  ]
  root.add(mergeBoxMesh(southDoor, stdMaterial(FRAME, { metalness: 0.6, roughness: 0.4 })))
  // 南立面 2-4 层幕墙
  root.add(curtainGrid({
    w: 14.5, h: 12.5, y: 4.3, x: 0, z: -17.28, ry: Math.PI,
    cols: 5, rows: 3, subCols: 3, subRows: 2,
    frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
    spandrel: 0.9, spandrelColor: ALUM, sunshade: true, shadeOut: 0.3, lit: { ratio: 0.24, seed: seed() },
  }))

  // ---------------------------------------------------------------- 塔楼幕墙（段 A：16.8..60.3，15 层）
  const towerA = [
    { w: 12.5, x: 0, z: 17.28, ry: 0, cols: 9 },            // 北
    { w: 12.5, x: 0, z: 2.12, ry: Math.PI, cols: 9 },        // 南
    { w: 15.3, x: 6.08, z: 9.7, ry: Math.PI / 2, cols: 11 }, // 东
    { w: 15.3, x: -6.08, z: 9.7, ry: -Math.PI / 2, cols: 11 }, // 西
  ]
  for (const f of towerA) {
    root.add(curtainGrid({
      w: f.w, h: 43.4, y: 16.85, x: f.x, z: f.z, ry: f.ry,
      cols: f.cols, rows: 15, subCols: 3, subRows: 3,
      frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
      spandrel: 0.75, spandrelColor: ALUM, sunshade: true, shadeOut: 0.3, lit: { ratio: 0.4, seed: seed() },
    }))
  }
  // 段 A 顶（60.3）退台露台：核心顶环铺 + 沿幕墙皮栏杆
  root.add(paving({ w: 11.5, d: 14.3, y: 60.3, z: 9.7, cell: 0.48, gap: 0.07, colorA: '#D9D6CF', colorB: '#A8A5A0', accent: 4, inset: null }))
  root.add(at(ctx.blocks.railing({ w: 11.6 }), 0, 60.3, 17.15))
  root.add(at(ctx.blocks.railing({ w: 11.6 }), 0, 60.3, 2.25, Math.PI))
  root.add(at(ctx.blocks.railing({ w: 14.7 }), 5.95, 60.3, 9.7, Math.PI / 2))
  root.add(at(ctx.blocks.railing({ w: 14.7 }), -5.95, 60.3, 9.7, -Math.PI / 2))
  // 露台绿意
  root.add(at(ctx.blocks.hedge({ w: 3.6, d: 0.7, h: 0.7 }), -4.0, 60.3, 15.6))
  root.add(at(ctx.blocks.hedge({ w: 3.6, d: 0.7, h: 0.7 }), 4.0, 60.3, 3.8))
  root.add(at(ctx.blocks.tree({ scale: 0.7, seed: seed() }), -4.2, 60.3, 15.3))

  // ---------------------------------------------------------------- 塔楼幕墙（段 B：60.3..74.8，5 层）
  const towerB = [
    { w: 10.3, x: 0, z: 15.98, ry: 0, cols: 8 },            // 北
    { w: 10.3, x: 0, z: 3.62, ry: Math.PI, cols: 8 },        // 南
    { w: 12.5, x: 5.08, z: 9.8, ry: Math.PI / 2, cols: 9 },  // 东
    { w: 12.5, x: -5.08, z: 9.8, ry: -Math.PI / 2, cols: 9 }, // 西
  ]
  for (const f of towerB) {
    root.add(curtainGrid({
      w: f.w, h: 14.4, y: 60.35, x: f.x, z: f.z, ry: f.ry,
      cols: f.cols, rows: 5, subCols: 2, subRows: 3,
      frameColor: FRAME, glassColor: GLASS, glassEmissive: GLASS_EMIT,
      spandrel: 0.75, spandrelColor: ALUM, sunshade: true, shadeOut: 0.28, lit: { ratio: 0.42, seed: seed() },
    }))
  }

  // ---------------------------------------------------------------- 塔冠 + 天线
  const crown: BoxPart[] = []
  // 格栅檐竖条环
  for (let i = 0; i < 44; i++) {
    const t = i / 44
    const per = 2 * (11.0 + 13.4)
    const s = t * per
    let x: number, z: number, ry: number
    if (s < 11.0) { x = -5.5 + s; z = 9.8 + 6.7; ry = 0 }
    else if (s < 11.0 + 13.4) { x = 5.5; z = 9.8 + 6.7 - (s - 11.0); ry = Math.PI / 2 }
    else if (s < 22.0 + 13.4) { x = 5.5 - (s - 24.4); z = 9.8 - 6.7; ry = 0 }
    else { x = -5.5; z = 9.8 - 6.7 + (s - 35.4); ry = -Math.PI / 2 }
    crown.push({ w: 0.14, h: 4.15, d: 0.5, x, y: 77.7, z, ry })
  }
  // 冠部灯带环（暖金发光）
  const lampMat = stdMaterial(CROWN, { emissive: CROWN, emissiveIntensity: 1.6, roughness: 0.4 })
  const lampRing = mergeBoxMesh([
    { w: 11.3, h: 0.5, d: 0.3, x: 0, y: 77.7, z: 16.7 },
    { w: 11.3, h: 0.5, d: 0.3, x: 0, y: 77.7, z: 2.9 },
    { w: 0.3, h: 0.5, d: 13.7, x: 5.65, y: 77.7, z: 9.8 },
    { w: 0.3, h: 0.5, d: 13.7, x: -5.65, y: 77.7, z: 9.8 },
  ], lampMat)
  root.add(lampRing)
  // 格栅下/上环梁（下承冠部座1、上盖 44 竖条顶，消 75.4–77.2 悬空断层）+ 顶部压顶 + 天线
  crown.push({ w: 11.0, h: 0.35, d: 13.4, x: 0, y: 75.55, z: 9.8 })
  crown.push({ w: 11.0, h: 0.35, d: 13.4, x: 0, y: 79.9, z: 9.8 })
  crown.push({ w: 8.6, h: 0.5, d: 11.0, x: 0, y: 80.0, z: 9.8 })
  root.add(mergeBoxMesh(crown, stdMaterial(FRAME, { metalness: 0.7, roughness: 0.35 })))
  const mast: BoxPart[] = [
    { w: 0.5, h: 2.6, d: 0.5, x: 0, y: 81.5, z: 9.8 },
    { w: 0.26, h: 2.6, d: 0.26, x: 0, y: 84.1, z: 9.8 },
    { w: 0.14, h: 2.0, d: 0.14, x: 0, y: 86.4, z: 9.8 },
    { w: 0.9, h: 0.14, d: 0.9, x: 0, y: 83.0, z: 9.8 },
    { w: 0.7, h: 0.14, d: 0.7, x: 0, y: 85.4, z: 9.8 },
  ]
  root.add(mergeBoxMesh(mast, stdMaterial('#7C7A76', { metalness: 0.8, roughness: 0.3 })))
  root.add(mergeBoxMesh(
    [{ w: 0.44, h: 0.44, d: 0.44, x: 0, y: 87.5, z: 9.8 }],
    stdMaterial('#FF6B4A', { emissive: '#FF6B4A', emissiveIntensity: 1.8, roughness: 0.4 }),
  ))

  // ---------------------------------------------------------------- 裙房设备层（塔周围百叶围合）
  root.add(finArray({ w: 6.0, h: 2.4, y: 17.0, x: -4.8, z: 17.0, count: 18, depth: 0.3, thick: 0.1, color: '#7C7A76' }))
  root.add(finArray({ w: 6.0, h: 2.4, y: 17.0, x: -4.8, z: 2.4, ry: Math.PI, count: 18, depth: 0.3, thick: 0.1, color: '#7C7A76' }))
  const plantBox: BoxPart[] = [
    { w: 6.2, h: 2.5, d: 0.25, x: -4.8, y: 18.25, z: 16.85 },
    { w: 6.2, h: 2.5, d: 0.25, x: -4.8, y: 18.25, z: 2.55 },
    { w: 0.25, h: 2.5, d: 14.5, x: -7.4, y: 18.25, z: 9.7 },
    { w: 5.0, h: 1.6, d: 3.2, x: 4.6, y: 17.6, z: 15.6 },
    { w: 4.4, h: 1.2, d: 2.8, x: 4.6, y: 17.4, z: 4.2 },
  ]
  root.add(mergeBoxMesh(plantBox, stdMaterial('#8A8783', { metalness: 0.4, roughness: 0.6 })))

  // ---------------------------------------------------------------- 裙房屋顶花园（南段 y16.8）
  root.add(paving({ w: 13.4, d: 17.6, y: 16.8, z: -8.4, cell: 0.5, gap: 0.07, colorA: '#D9D6CF', colorB: '#C4C1BA', accent: 4, inset: '#A8A5A0' }))
  // 花园草皮岛
  root.add(mergeBoxMesh(
    [{ w: 5.4, h: 0.28, d: 6.0, x: -3.4, y: 16.94, z: -7.0 }],
    stdMaterial('#8C9E8B', { roughness: 0.95 }),
  ))
  root.add(mergeBoxMesh(
    [{ w: 4.6, h: 0.28, d: 4.2, x: 4.0, y: 16.94, z: -13.4 }],
    stdMaterial('#8C9E8B', { roughness: 0.95 }),
  ))
  // 廊架 pergola（西段）
  const perg: BoxPart[] = []
  for (const px of [-6.2, -2.2]) {
    for (const pz of [-15.6, -11.6]) {
      perg.push({ w: 0.24, h: 2.8, d: 0.24, x: px, y: 18.4, z: pz })
    }
  }
  perg.push({ w: 4.6, h: 0.2, d: 0.3, x: -4.2, y: 19.85, z: -15.6 })
  perg.push({ w: 4.6, h: 0.2, d: 0.3, x: -4.2, y: 19.85, z: -11.6 })
  for (let i = 0; i <= 12; i++) {
    perg.push({ w: 0.1, h: 0.14, d: 4.4, x: -6.3 + i * 0.35, y: 20.0, z: -13.6 })
  }
  root.add(mergeBoxMesh(perg, stdMaterial('#8C6A4A', { roughness: 0.7 })))
  // 花园栏杆（女儿墙内侧环）
  root.add(at(ctx.blocks.railing({ w: 13.3 }), 0, 17.6, -17.1))
  root.add(at(ctx.blocks.railing({ w: 17.3 }), -7.1, 17.6, -8.4, Math.PI / 2))
  root.add(at(ctx.blocks.railing({ w: 17.3 }), 7.1, 17.6, -8.4, -Math.PI / 2))
  // 花园树/凳/篱
  root.add(at(ctx.blocks.tree({ scale: 0.9, seed: seed() }), -3.4, 17.08, -7.0))
  root.add(at(ctx.blocks.tree({ scale: 0.75, seed: seed() }), -4.6, 17.08, -9.0))
  root.add(at(ctx.blocks.tree({ scale: 0.85, seed: seed() }), 4.0, 17.08, -13.4))
  root.add(at(ctx.blocks.tree({ scale: 0.7, seed: seed() }), 5.6, 17.08, -11.6))
  root.add(at(ctx.blocks.bench({ rotY: Math.PI / 2 }), -0.5, 17.08, -6.0))
  root.add(at(ctx.blocks.bench({ rotY: -Math.PI / 2 }), 0.5, 17.08, -10.0))
  root.add(at(ctx.blocks.bench({}), 3.2, 17.08, -4.2))
  root.add(at(ctx.blocks.bench({ rotY: Math.PI }), -4.2, 17.08, -3.4))
  root.add(at(ctx.blocks.hedge({ w: 5.2, d: 0.7, h: 0.8 }), -3.4, 17.08, -4.0))
  root.add(at(ctx.blocks.hedge({ w: 4.4, d: 0.7, h: 0.8 }), 4.0, 17.08, -15.4))
  root.add(at(ctx.blocks.hedge({ w: 0.7, d: 5.0, h: 0.8 }), 6.6, 17.08, -7.5))
  root.add(at(ctx.blocks.urn({ scale: 1.2 }), -6.2, 17.08, -2.2))
  root.add(at(ctx.blocks.urn({ scale: 1.2 }), 6.2, 17.08, -2.2))
  root.add(at(ctx.blocks.streetLamp({ h: 3.6 }), -1.6, 17.08, -14.8))
  root.add(at(ctx.blocks.streetLamp({ h: 3.6 }), 2.4, 17.08, -5.2))

  // ---------------------------------------------------------------- 地面场地（四环带）
  // 东环带（临园）：树阵 4 + 路灯 3 + 坐凳 4 + 树池格栅
  const eastTrees = [14, 5, -5, -14]
  for (const z of eastTrees) {
    root.add(ctx.blocks.tree({ x: 8.7, z, scale: 1.0, seed: seed() }))
    root.add(at(ctx.blocks.latticePanel({ w: 1.6, h: 0.32, cols: 4, rows: 1, bar: 0.08, color: '#3E3C3A' }), 8.7, 0.3, z, Math.PI / 2))
  }
  for (const z of [9.5, 0, -9.5]) root.add(at(ctx.blocks.streetLamp({}), 9.5, 0.3, z))
  root.add(at(ctx.blocks.bench({ rotY: Math.PI / 2 }), 8.15, 0.3, 10.5))
  root.add(at(ctx.blocks.bench({ rotY: Math.PI / 2 }), 8.15, 0.3, 2.0))
  root.add(at(ctx.blocks.bench({ rotY: Math.PI / 2 }), 8.15, 0.3, -6.5))
  root.add(at(ctx.blocks.bench({ rotY: Math.PI / 2 }), 8.15, 0.3, -15.0))
  // 西环带（临街）
  const westTrees = [13, 3, -8, -15]
  for (const z of westTrees) root.add(ctx.blocks.tree({ x: -8.7, z, scale: 0.95, seed: seed() }))
  for (const z of [8, -2, -12]) root.add(at(ctx.blocks.streetLamp({}), -9.4, 0.3, z))
  root.add(at(ctx.blocks.bench({}), -8.1, 0.3, 16.5))
  root.add(at(ctx.blocks.bench({}), -8.1, 0.3, -4.0))
  root.add(at(ctx.blocks.bench({}), -8.1, 0.3, -17.5))
  // 南北环带
  root.add(ctx.blocks.tree({ x: -6.0, z: -18.8, scale: 0.9, seed: seed() }))
  root.add(ctx.blocks.tree({ x: 6.0, z: -18.8, scale: 0.9, seed: seed() }))
  root.add(ctx.blocks.tree({ x: -6.2, z: 18.9, scale: 0.85, seed: seed() }))
  root.add(ctx.blocks.tree({ x: 6.2, z: 18.9, scale: 0.85, seed: seed() }))
  root.add(at(ctx.blocks.streetLamp({}), -5.0, 0.3, 19.2))
  root.add(at(ctx.blocks.streetLamp({}), 5.0, 0.3, 19.2))
  root.add(at(ctx.blocks.streetLamp({}), -5.0, 0.3, -19.2))
  root.add(at(ctx.blocks.streetLamp({}), 5.0, 0.3, -19.2))
  // 绿篱（沿本体四周，留入口口子）
  root.add(at(ctx.blocks.hedge({ w: 5.4, d: 0.7 }), -4.6, 0.3, 17.9))
  root.add(at(ctx.blocks.hedge({ w: 5.4, d: 0.7 }), 4.6, 0.3, 17.9))
  root.add(at(ctx.blocks.hedge({ w: 0.7, d: 9.0 }), 7.8, 0.3, -12.0))
  root.add(at(ctx.blocks.hedge({ w: 0.7, d: 9.0 }), 7.8, 0.3, 12.0))
  root.add(at(ctx.blocks.hedge({ w: 0.7, d: 8.0 }), -7.8, 0.3, 0))
  root.add(at(ctx.blocks.hedge({ w: 6.0, d: 0.7 }), -4.0, 0.3, -17.9))
  root.add(at(ctx.blocks.hedge({ w: 6.0, d: 0.7 }), 4.0, 0.3, -17.9))
  // 入口石盆
  root.add(at(ctx.blocks.urn({ scale: 1.5 }), -4.4, 0.3, 18.6))
  root.add(at(ctx.blocks.urn({ scale: 1.5 }), 4.4, 0.3, 18.6))
  // 南侧服务院铺装（叠草皮顶）
  root.add(paving({ w: 5.0, d: 3.0, x: 0, z: -19.0, y: 0.3, cell: 0.4, gap: 0.06, colorA: '#A8A5A0', colorB: '#7C7A76', accent: 3, inset: null }))

  return root
}

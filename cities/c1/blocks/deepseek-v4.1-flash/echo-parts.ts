import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'
import { boxBatch, COLORS, type BoxSpec } from './kit'

/** 回声街区专用构件库（deepseek-v4.1-flash 自建积木）。
 *  与官方件同款约定：纯参数化、无副作用、无随机；需要随机性时由调用方把 ctx.rng() 的结果作为参数传入。 */

const mesh = (g: THREE.BufferGeometry, m: THREE.Material): THREE.Mesh => {
  const o = new THREE.Mesh(g, m)
  o.castShadow = true
  return o
}

/** 拱肋柱廊：连排半圆拱洞石墙 + 檐部（额枋/齿饰/压顶）+ 柱础。
 *  挤出方向 +Z，板底在 y，返回 Group 的原点即柱廊左端起拱处（x 居中）。 */
export function arcade(o: {
  panels: number
  panelW: number
  h: number
  archW: number
  archH: number
  depth: number
  y?: number
  z?: number
  stone?: string
  trim?: string
}): THREE.Object3D {
  const grp = new THREE.Group()
  const stoneMat = stdMaterial(o.stone ?? COLORS.stone, { roughness: 0.86 })
  const trimMat = stdMaterial(o.trim ?? COLORS.stoneDim, { roughness: 0.8 })
  const x0 = (-(o.panels - 1) * o.panelW) / 2
  const specs: BoxSpec[] = []
  for (let i = 0; i < o.panels; i++) {
    const x = x0 + i * o.panelW
    // 拱洞石墙（官方件，curveSegments=7 的挤出弧）
    const shape = new THREE.Shape()
    shape.moveTo(-o.panelW / 2, 0); shape.lineTo(-o.panelW / 2, o.h)
    shape.lineTo(o.panelW / 2, o.h); shape.lineTo(o.panelW / 2, 0); shape.closePath()
    const hole = new THREE.Path()
    hole.moveTo(-o.archW / 2, 0)
    hole.lineTo(-o.archW / 2, o.archH - o.archW / 2)
    hole.absarc(0, o.archH - o.archW / 2, o.archW / 2, Math.PI, 0, true)
    hole.lineTo(o.archW / 2, 0); hole.closePath()
    shape.holes.push(hole)
    const panel = mesh(new THREE.ExtrudeGeometry(shape, { depth: o.depth, bevelEnabled: false, curveSegments: 7, steps: 1 }), stoneMat)
    panel.position.set(x, 0, 0)
    grp.add(panel)
    // 拱心石（每拱一枚，压在拱顶）
    specs.push({ x, y: o.archH + 0.16, z: o.depth / 2, w: 0.5, h: 0.62, d: o.depth + 0.22 })
    // 拱脚墩（每拱两侧，落在拱洞起拱线以下）
    for (const s of [-1, 1]) {
      specs.push({ x: x + s * (o.archW / 2 + 0.16), y: 0.5, z: o.depth / 2, w: 0.3, h: 1.0, d: o.depth + 0.16 })
    }
    // 拱肩花格（拱背两肩各一组井字棂，压住拱上方的实墙）
    const spandrelH = o.h - o.archH - 0.5
    if (spandrelH > 0.6) {
      for (const s of [-1, 1]) {
        const sx = x + s * (o.archW / 2 + (o.panelW / 2 - o.archW / 2) / 2)
        const sw = o.panelW / 2 - o.archW / 2 - 0.3
        for (let c = 0; c <= 3; c++) {
          specs.push({ x: sx - sw / 2 + (sw * c) / 3, y: o.archH + 0.35 + spandrelH / 2, z: o.depth + 0.04, w: 0.09, h: spandrelH, d: 0.09 })
        }
        for (let r = 0; r <= 2; r++) {
          specs.push({ x: sx, y: o.archH + 0.35 + (spandrelH * r) / 2, z: o.depth + 0.04, w: sw, h: 0.09, d: 0.09 })
        }
      }
    }
  }
  // 檐部：额枋 + 齿饰 + 压顶（三层线脚）
  const span = o.panels * o.panelW
  specs.push({ x: 0, y: o.h + 0.3, z: o.depth / 2, w: span + 0.4, h: 0.6, d: o.depth + 0.36 })
  const dents = Math.round(span / 0.62)
  for (let i = 0; i < dents; i++) {
    specs.push({ x: -span / 2 + (span * (i + 0.5)) / dents, y: o.h + 0.78, z: o.depth / 2, w: 0.3, h: 0.36, d: o.depth + 0.5 })
  }
  specs.push({ x: 0, y: o.h + 1.14, z: o.depth / 2, w: span + 0.9, h: 0.3, d: o.depth + 0.7 })
  specs.push({ x: 0, y: o.h + 1.4, z: o.depth / 2, w: span + 1.3, h: 0.24, d: o.depth + 1.0 })
  // 柱础（板缝处落地石墩）
  for (let i = 0; i <= o.panels; i++) {
    specs.push({ x: x0 - o.panelW / 2 + i * o.panelW, y: 0.11, z: o.depth / 2, w: 0.42, h: 0.22, d: o.depth + 0.5 })
  }
  grp.add(mesh(boxBatch(specs, trimMat).geometry, trimMat))
  grp.position.set(0, o.y ?? 0, o.z ?? 0)
  return grp
}

/** 观众席（池座/楼座通用）：rows 排 × cols 座，逐排抬升（0.12m/排）。
 *  单座 = 坐垫 + 靠背 + 双扶手 + 支腿（5 件）。block 中心在 (x, z)，排向 +Z 抬升，
 *  即 -Z 侧为最前一排（面向舞台）。 */
export function seatBlock(o: {
  rows: number
  cols: number
  x: number
  z: number
  y: number
  seatPitch?: number
  rowPitch?: number
  rake?: number
  seatMat: THREE.Material
  frameMat: THREE.Material
}): THREE.Object3D {
  const seatPitch = o.seatPitch ?? 0.54
  const rowPitch = o.rowPitch ?? 0.92
  const rake = o.rake ?? 0.12
  const grp = new THREE.Group()
  const seats: BoxSpec[] = []
  const frames: BoxSpec[] = []
  const z0 = o.z - ((o.rows - 1) * rowPitch) / 2
  const x0 = o.x - ((o.cols - 1) * seatPitch) / 2
  for (let r = 0; r < o.rows; r++) {
    const y = o.y + r * rake
    const z = z0 + r * rowPitch
    for (let c = 0; c < o.cols; c++) {
      const x = x0 + c * seatPitch
      seats.push({ x, y: y + 0.44, z, w: 0.48, h: 0.14, d: 0.5 })               // 坐垫
      seats.push({ x, y: y + 0.72, z: z + 0.21, w: 0.48, h: 0.48, d: 0.1 })     // 靠背
      seats.push({ x, y: y + 1.0, z: z + 0.23, w: 0.4, h: 0.16, d: 0.13 })      // 头枕
      seats.push({ x: x - 0.25, y: y + 0.58, z, w: 0.05, h: 0.06, d: 0.44 })    // 左扶手
      seats.push({ x: x + 0.25, y: y + 0.58, z, w: 0.05, h: 0.06, d: 0.44 })    // 右扶手
      frames.push({ x, y: y + 0.2, z: z + 0.06, w: 0.1, h: 0.4, d: 0.34 })      // 支腿
      frames.push({ x: x - 0.26, y: y + 0.28, z, w: 0.05, h: 0.56, d: 0.46 })   // 左侧板
      frames.push({ x: x + 0.26, y: y + 0.28, z, w: 0.05, h: 0.56, d: 0.46 })   // 右侧板
    }
  }
  grp.add(mesh(boxBatch(seats, o.seatMat).geometry, o.seatMat))
  grp.add(mesh(boxBatch(frames, o.frameMat).geometry, o.frameMat))
  return grp
}

/** 藻井天花：cell 见方的井格（每格 4 边帮 + 1 顶板），y 为天花底 */
export function cofferCeiling(o: {
  w: number
  d: number
  y: number
  cell: number
  depth: number
  x?: number
  z?: number
  material: THREE.Material
}): THREE.Mesh {
  const cols = Math.max(1, Math.round(o.w / o.cell))
  const rows = Math.max(1, Math.round(o.d / o.cell))
  const cw = o.w / cols
  const cd = o.d / rows
  const specs: BoxSpec[] = []
  const t = 0.16
  const cx = o.x ?? 0
  const cz = o.z ?? 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = cx - o.w / 2 + cw * (c + 0.5)
      const z = cz - o.d / 2 + cd * (r + 0.5)
      specs.push({ x, y: o.y - o.depth / 2, z, w: cw - 0.02, h: t, d: cd - 0.02 })          // 井顶板
      specs.push({ x: x - cw / 2, y: o.y, z, w: t, h: o.depth, d: cd })                     // 左帮
      specs.push({ x: x + cw / 2, y: o.y, z, w: t, h: o.depth, d: cd })                     // 右帮
      specs.push({ x, y: o.y, z: z - cd / 2, w: cw, h: o.depth, d: t })                     // 前帮
      specs.push({ x, y: o.y, z: z + cd / 2, w: cw, h: o.depth, d: t })                     // 后帮
    }
  }
  return mesh(boxBatch(specs, o.material).geometry, o.material)
}

/** 声学扩散体墙面：棋盘式凸出方板阵列（观众厅侧墙/后墙），板面朝 ±Z，可用 ry 转到 ±X */
export function diffuserWall(o: {
  w: number
  h: number
  x: number
  y: number
  z: number
  cols: number
  rows: number
  ry?: number
  depth?: number
  material: THREE.Material
}): THREE.Mesh {
  const specs: BoxSpec[] = []
  const cw = o.w / o.cols
  const ch = o.h / o.rows
  const d = o.depth ?? 0.28
  for (let r = 0; r < o.rows; r++) {
    for (let c = 0; c < o.cols; c++) {
      // 棋盘错落：相邻格深浅交替，形成漫反射肌理
      const deep = (r + c) % 2 === 0
      specs.push({
        x: -o.w / 2 + cw * (c + 0.5),
        y: o.y + ch * (r + 0.5),
        z: 0,
        w: cw - 0.06,
        h: ch - 0.06,
        d: deep ? d : d * 0.55,
      })
    }
  }
  const m = mesh(boxBatch(specs, o.material).geometry, o.material)
  m.position.set(o.x, 0, o.z)
  m.rotation.y = o.ry ?? 0
  return m
}

/** 铺装图案：cell 分格的石板（gap 为分缝宽），y 为板面标高 */
export function pavingGrid(o: {
  w: number
  d: number
  x?: number
  z?: number
  y?: number
  cell: number
  gap?: number
  thickness?: number
  material: THREE.Material
}): THREE.Mesh {
  const gap = o.gap ?? 0.08
  const cols = Math.max(1, Math.round(o.w / o.cell))
  const rows = Math.max(1, Math.round(o.d / o.cell))
  const cw = o.w / cols
  const cd = o.d / rows
  const specs: BoxSpec[] = []
  const th = o.thickness ?? 0.12
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      specs.push({
        x: (o.x ?? 0) - o.w / 2 + cw * (c + 0.5),
        y: (o.y ?? 0) - th / 2,
        z: (o.z ?? 0) - o.d / 2 + cd * (r + 0.5),
        w: cw - gap,
        h: th,
        d: cd - gap,
      })
    }
  }
  return mesh(boxBatch(specs, o.material).geometry, o.material)
}

/** 百叶带：slats 片横向叶片（舞台塔通风口/设备层），面朝 ±Z，可用 ry 转到 ±X */
export function louvreBand(o: {
  w: number
  h: number
  x: number
  y: number
  z: number
  slats: number
  ry?: number
  material: THREE.Material
}): THREE.Mesh {
  const specs: BoxSpec[] = []
  const sh = o.h / o.slats
  for (let i = 0; i < o.slats; i++) {
    specs.push({ x: 0, y: o.y + sh * (i + 0.5), z: 0, w: o.w, h: sh * 0.62, d: 0.24 })
  }
  const m = mesh(boxBatch(specs, o.material).geometry, o.material)
  m.position.set(o.x, 0, o.z)
  m.rotation.y = o.ry ?? 0
  return m
}

/** 舞台吊杆阵列（含吊绳与卷扬机梁）：bars 根横贯舞台的杆件，y 为吊杆标高 */
export function flyLoft(o: {
  w: number
  x: number
  z0: number
  z1: number
  y: number
  bars: number
  material: THREE.Material
}): THREE.Mesh {
  const specs: BoxSpec[] = []
  const span = o.z1 - o.z0
  for (let i = 0; i < o.bars; i++) {
    const z = o.z0 + (span * (i + 0.5)) / o.bars
    specs.push({ x: o.x, y: o.y, z, w: o.w, h: 0.16, d: 0.16 })                 // 吊杆
    specs.push({ x: o.x, y: o.y + 2.2, z, w: o.w * 0.96, h: 0.12, d: 0.12 })     // 上方卷扬梁
    for (const s of [-0.36, 0.36]) {                                             // 吊绳（左右各一）
      specs.push({ x: o.x + o.w * s, y: o.y + 1.1, z, w: 0.05, h: 2.2, d: 0.05 })
    }
  }
  return mesh(boxBatch(specs, o.material).geometry, o.material)
}

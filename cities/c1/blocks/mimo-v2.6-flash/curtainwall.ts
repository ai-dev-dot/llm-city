import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'
import { mulberry32 } from '../../../../lib/ctx'
import { mergeBoxMesh, type BoxPart } from './geo'

/** 参数化格构幕墙：密梃玻璃墙——框格挺（合并单 mesh）+ 玻璃板（合并单 mesh）+ 层间楼板带。
 * 平面法向 +z、底标高 y；用 ry 旋到朝向。塔楼/裙房立面通用，后续各期复用。 */
export interface CurtainwallOpts {
  /** 面宽（X 向全宽） */
  w: number
  /** 面高（自 y 起算） */
  h: number
  /** 底标高 */
  y: number
  /** 竖向分格数 */
  cols: number
  /** 横向分格数（层高数） */
  rows: number
  /** 每格内竖挺加密数（0/1/2…） */
  subCols?: number
  /** 每格内横挺加密数 */
  subRows?: number
  /** 定位与朝向 */
  x?: number
  z?: number
  ry?: number
  /** 框料颜色 */
  frameColor?: string
  /** 玻璃颜色 */
  glassColor?: string
  /** 玻璃自发光（夜景橱窗感） */
  glassEmissive?: string
  /** 层间楼板带高度（0 = 不做） */
  spandrel?: number
  /** 楼板带颜色 */
  spandrelColor?: string
  /** 幕墙厚度 */
  depth?: number
  /** 每格水平遮阳片（外挑，商业建筑可感知细节） */
  sunshade?: boolean
  /** 遮阳片外挑深度 */
  shadeOut?: number
  /** 夜景开灯分组：ratio 比例格子亮暖窗（确定性，seed 由调用方给） */
  lit?: { ratio: number; seed: number }
}

export function curtainGrid(o: CurtainwallOpts): THREE.Object3D {
  const grp = new THREE.Group()
  const depth = o.depth ?? 0.35
  const frameColor = o.frameColor ?? '#3E3C3A'
  const mullion = 0.12
  const cw = o.w / o.cols
  const ch = o.h / o.rows

  const frameParts: BoxPart[] = []
  const glassParts: BoxPart[] = []
  const spandrelParts: BoxPart[] = []

  // 外框
  frameParts.push({ w: o.w, h: mullion, d: depth, x: 0, y: mullion / 2, z: 0 })
  frameParts.push({ w: o.w, h: mullion, d: depth, x: 0, y: o.h - mullion / 2, z: 0 })
  frameParts.push({ w: mullion, h: o.h, d: depth, x: -o.w / 2 + mullion / 2, y: o.h / 2, z: 0 })
  frameParts.push({ w: mullion, h: o.h, d: depth, x: o.w / 2 - mullion / 2, y: o.h / 2, z: 0 })

  for (let c = 1; c < o.cols; c++) {
    frameParts.push({ w: mullion, h: o.h, d: depth, x: -o.w / 2 + cw * c, y: o.h / 2, z: 0 })
  }
  for (let r = 1; r < o.rows; r++) {
    frameParts.push({ w: o.w, h: mullion, d: depth, x: 0, y: ch * r, z: 0 })
  }

  // 格内加密挺
  const sc = o.subCols ?? 0
  const sr = o.subRows ?? 0
  const t = mullion * 0.7
  if (sc > 0 || sr > 0) {
    for (let c = 0; c < o.cols; c++) {
      for (let r = 0; r < o.rows; r++) {
        const x0 = -o.w / 2 + cw * c
        const y0 = ch * r
        for (let i = 1; i <= sc; i++) {
          frameParts.push({ w: t, h: ch - mullion, d: depth * 0.6, x: x0 + (cw * i) / (sc + 1), y: y0 + ch / 2, z: 0 })
        }
        for (let j = 1; j <= sr; j++) {
          frameParts.push({ w: cw - mullion, h: t, d: depth * 0.6, x: x0 + cw / 2, y: y0 + (ch * j) / (sr + 1), z: 0 })
        }
      }
    }
  }

  // 玻璃（每格一板，退后 0.08）；lit 分组时暖窗/暗窗分两组 mesh
  const litParts: BoxPart[] = []
  const rand = o.lit ? mulberry32(o.lit.seed) : null
  for (let c = 0; c < o.cols; c++) {
    for (let r = 0; r < o.rows; r++) {
      const part: BoxPart = {
        w: cw - mullion, h: ch - mullion, d: 0.06,
        x: -o.w / 2 + cw * (c + 0.5), y: ch * (r + 0.5), z: -0.08,
      }
      if (rand && rand() < (o.lit!.ratio)) litParts.push(part)
      else glassParts.push(part)
    }
  }

  // 每格水平遮阳片（外挑 +z）
  if (o.sunshade) {
    const out = o.shadeOut ?? 0.32
    const shadeParts: BoxPart[] = []
    for (let c = 0; c < o.cols; c++) {
      for (let r = 0; r < o.rows; r++) {
        shadeParts.push({
          w: cw - mullion, h: 0.05, d: out,
          x: -o.w / 2 + cw * (c + 0.5), y: ch * r + mullion * 1.4, z: depth / 2 + out / 2 - 0.02,
        })
      }
    }
    grp.add(mergeBoxMesh(shadeParts, stdMaterial(o.frameColor ?? '#3E3C3A', { metalness: 0.6, roughness: 0.45 })))
  }

  const frameMat = stdMaterial(frameColor, { metalness: 0.7, roughness: 0.35 })
  const glassMat = stdMaterial(o.glassColor ?? '#5E8FB3', {
    metalness: 0.7, roughness: 0.18,
    emissive: o.glassEmissive ?? '#2A5674', emissiveIntensity: 0.5,
  })
  grp.add(mergeBoxMesh(frameParts, frameMat))
  if (glassParts.length) grp.add(mergeBoxMesh(glassParts, glassMat))
  if (litParts.length) {
    grp.add(mergeBoxMesh(litParts, stdMaterial('#FFE9C4', {
      metalness: 0.1, roughness: 0.6, emissive: '#FFB65C', emissiveIntensity: 1.1,
    })))
  }

  if (o.spandrel && o.spandrel > 0) {
    for (let r = 0; r < o.rows; r++) {
      spandrelParts.push({ w: o.w, h: o.spandrel, d: depth + 0.1, x: 0, y: ch * r + ch - o.spandrel / 2, z: 0.04 })
    }
    grp.add(mergeBoxMesh(spandrelParts, stdMaterial(o.spandrelColor ?? '#C4C1BA', { metalness: 0.5, roughness: 0.4 })))
  }

  grp.position.set(o.x ?? 0, o.y, o.z ?? 0)
  grp.rotation.y = o.ry ?? 0
  return grp
}

/** 竖向装饰鳍板阵列（遮阳/立面节奏，合并单 mesh）：沿 X 展开、法向 +z */
export function finArray(o: {
  w: number; h: number; y: number; count: number
  depth?: number; thick?: number; x?: number; z?: number; ry?: number; color?: string
}): THREE.Object3D {
  const parts: BoxPart[] = []
  const dep = o.depth ?? 0.5
  const th = o.thick ?? 0.1
  for (let i = 0; i < o.count; i++) {
    const x = -o.w / 2 + (o.w * i) / Math.max(1, o.count - 1)
    parts.push({ w: th, h: o.h, d: dep, x, y: o.h / 2, z: 0 })
  }
  const m = mergeBoxMesh(parts, stdMaterial(o.color ?? '#A8A5A0', { metalness: 0.6, roughness: 0.4 }))
  const grp = new THREE.Group()
  grp.add(m)
  grp.position.set(o.x ?? 0, o.y, o.z ?? 0)
  grp.rotation.y = o.ry ?? 0
  return grp
}

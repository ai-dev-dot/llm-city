import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'
import { mergeBoxMesh, type BoxPart } from './geo'

/** 商业橱窗开间：大玻璃 + 密框 + 店内暖光衬板 + 展台 + 招牌 + 遮阳篷。
 * 平面法向 +z（橱窗朝外），底标高 y；ry 旋到朝向。招牌/篷为独立 mesh（攒 R11 mesh 数）。 */
export interface StorefrontOpts {
  /** 开间宽 */
  w: number
  /** 开间高（橱窗玻璃高，不含招牌带） */
  h: number
  y: number
  x?: number
  z?: number
  ry?: number
  /** 招牌文字底板色（发光） */
  signColor?: string
  /** 招牌带高度（0 = 无） */
  signH?: number
  /** 玻璃色 */
  glassColor?: string
  /** 店内暖光衬板 */
  glowColor?: string
  /** 竖向分格 */
  mullions?: number
  /** 横向分格 */
  transoms?: number
  /** 遮阳篷（斜面）颜色，null = 不做 */
  awning?: string | null
  /** 展台（橱窗内） */
  display?: boolean
}

export function storefront(o: StorefrontOpts): THREE.Object3D {
  const grp = new THREE.Group()
  const signH = o.signH ?? 0
  const glassH = o.h
  const gy = o.y
  const w = o.w

  // 橱窗玻璃 + 密框
  const frame: BoxPart[] = []
  const glass: BoxPart[] = []
  const t = 0.1
  frame.push({ w, h: t, d: 0.14, x: 0, y: gy + t / 2, z: 0 })
  frame.push({ w, h: t, d: 0.14, x: 0, y: gy + glassH - t / 2, z: 0 })
  const mu = o.mullions ?? 2
  for (let i = 1; i < mu; i++) {
    frame.push({ w: 0.09, h: glassH, d: 0.14, x: -w / 2 + (w * i) / mu, y: gy + glassH / 2, z: 0 })
  }
  const tr = o.transoms ?? 1
  for (let j = 1; j < tr; j++) {
    frame.push({ w, h: 0.08, d: 0.12, x: 0, y: gy + (glassH * j) / tr, z: 0 })
  }
  const cw = w / mu
  for (let i = 0; i < mu; i++) {
    for (let j = 0; j < tr; j++) {
      glass.push({
        w: cw - t, h: glassH / tr - t, d: 0.05,
        x: -w / 2 + cw * (i + 0.5), y: gy + (glassH / tr) * (j + 0.5), z: -0.05,
      })
    }
  }
  grp.add(mergeBoxMesh(frame, stdMaterial('#3E3C3A', { metalness: 0.7, roughness: 0.3 })))
  grp.add(mergeBoxMesh(glass, stdMaterial(o.glassColor ?? '#9CC4DE', {
    metalness: 0.6, roughness: 0.08, emissive: o.glowColor ?? '#FFD9A0', emissiveIntensity: 0.7,
  })))

  // 店内暖光衬板（橱窗后退，营业感）
  grp.add(mergeBoxMesh(
    [{ w: w - 0.1, h: glassH - 0.15, d: 0.08, x: 0, y: gy + glassH / 2, z: -0.55 }],
    stdMaterial('#F5E9D0', { emissive: o.glowColor ?? '#FFD9A0', emissiveIntensity: 1.1, roughness: 0.9 }),
  ))

  // 展台（橱窗内低台，薄板顶 ≤3m 属豁免，但按本体计亦在核心区内）
  if (o.display !== false) {
    grp.add(mergeBoxMesh(
      [{ w: w * 0.55, h: 0.5, d: 0.5, x: -w * 0.1, y: gy + 0.25, z: -0.35 }],
      stdMaterial('#D9D6CF', { roughness: 0.7 }),
    ))
  }

  // 招牌底板（发光）
  if (signH > 0) {
    grp.add(mergeBoxMesh(
      [{ w: w - 0.3, h: signH - 0.2, d: 0.16, x: 0, y: gy + glassH + signH / 2, z: 0.02 }],
      stdMaterial(o.signColor ?? '#FF6B4A', { emissive: o.signColor ?? '#FF6B4A', emissiveIntensity: 1.4, roughness: 0.4 }),
    ))
  }

  // 遮阳篷：斜板 + 檐口条（外挑量由调用方控制在退线内）
  if (o.awning) {
    const aw = w - 0.2
    const out = 0.62
    const y0 = gy + glassH + (signH > 0 ? signH : 0) + 0.15
    const cparts: BoxPart[] = [
      { w: aw, h: 0.07, d: out, x: 0, y: 0.16, z: out / 2 - 0.05 },
      { w: aw, h: 0.24, d: 0.08, x: 0, y: 0.3, z: out - 0.06 },
    ]
    const cm = mergeBoxMesh(cparts, stdMaterial(o.awning, { roughness: 0.8 }))
    cm.position.set(0, y0, 0)
    cm.rotation.x = 0.12
    grp.add(cm)
  }

  grp.position.set(o.x ?? 0, 0, o.z ?? 0)
  grp.rotation.y = o.ry ?? 0
  return grp
}

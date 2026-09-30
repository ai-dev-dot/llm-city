import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'

/**
 * 愈光楼母题件 · 种植池
 *
 * 圆角矩形池体（挤出 + 倒角），四壁实体、内膛下凹，池口一圈加厚压顶。
 * 屋顶花园与庭园用它把「绿」从地被抬到齐胸高度——病人推着轮椅能看见树的
 * 树冠而不是泥土，这是本街区的隐线。
 */
export function planter(o: {
  w: number
  d: number
  h?: number
  x?: number
  y?: number
  z?: number
  rotY?: number
  color?: string
  soilColor?: string
  /** 池壁厚 */
  wall?: number
  /** 圆角半径 */
  round?: number
  /** 池内是否带土面 */
  soil?: boolean
  /** 景观件标记（R13 退线豁免） */
  site?: boolean
}): THREE.Object3D {
  const h = o.h ?? 0.55
  const wall = o.wall ?? 0.16
  const round = o.round ?? Math.min(0.45, Math.min(o.w, o.d) * 0.22)
  const grp = new THREE.Group()
  const mat = stdMaterial(o.color ?? '#DCD8CF', { roughness: 0.82 })

  const outer = new THREE.Shape()
  const ow = o.w / 2, od = o.d / 2
  const r = Math.min(round, Math.min(ow, od) * 0.9)
  outer.moveTo(-ow + r, -od)
  outer.lineTo(ow - r, -od)
  outer.absarc(ow - r, -od + r, r, -Math.PI / 2, 0, false)
  outer.lineTo(ow, od - r)
  outer.absarc(ow - r, od - r, r, 0, Math.PI / 2, false)
  outer.lineTo(-ow + r, od)
  outer.absarc(-ow + r, od - r, r, Math.PI / 2, Math.PI, false)
  outer.lineTo(-ow, -od + r)
  outer.absarc(-ow + r, -od + r, r, Math.PI, Math.PI * 1.5, false)
  outer.closePath()

  const inner = new THREE.Path()
  const iw = ow - wall, id = od - wall, ir = Math.max(0.02, r - wall * 0.6)
  inner.moveTo(-iw + ir, -id)
  inner.lineTo(iw - ir, -id)
  inner.absarc(iw - ir, -id + ir, ir, -Math.PI / 2, 0, false)
  inner.lineTo(iw, id - ir)
  inner.absarc(iw - ir, id - ir, ir, 0, Math.PI / 2, false)
  inner.lineTo(-iw + ir, id)
  inner.absarc(-iw + ir, id - ir, ir, Math.PI / 2, Math.PI, false)
  inner.lineTo(-iw, -id + ir)
  inner.absarc(-iw + ir, -id + ir, ir, Math.PI, Math.PI * 1.5, false)
  inner.closePath()
  outer.holes.push(inner)

  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(outer, {
      depth: h,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.035,
      bevelSegments: 1,
      curveSegments: 5,
      steps: 1,
    }),
    mat,
  )
  body.rotation.x = -Math.PI / 2 // 挤出方向 +Z → +Y
  body.castShadow = true
  body.receiveShadow = true
  grp.add(body)

  if (o.soil !== false) {
    const soil = new THREE.Mesh(
      new THREE.BoxGeometry(o.w - wall * 2.2, 0.06, o.d - wall * 2.2),
      stdMaterial(o.soilColor ?? '#6B4A2F', { roughness: 1 }),
    )
    soil.position.y = h - 0.09
    soil.receiveShadow = true
    grp.add(soil)
  }

  grp.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0)
  grp.rotation.y = o.rotY ?? 0
  if (o.site) grp.userData.site = true
  return grp
}

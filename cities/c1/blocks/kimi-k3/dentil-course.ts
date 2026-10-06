import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'

/** 齿饰线脚带（古典檐口 standard course）：下檐板 + 密排齿块 + 上挑檐板三层。
 *  沿局部 X 展开，y 为带底。齿块间距 = 齿宽的 1.9 倍（经典 dentil 节律）。 */
export function dentilCourse(o: {
  w: number
  color?: string
  toothColor?: string
  x?: number
  y?: number
  z?: number
  rotY?: number
}): THREE.Object3D {
  const grp = new THREE.Group()
  const bandMat = stdMaterial(o.color ?? '#B08D57', { metalness: 0.75, roughness: 0.4 })
  const toothMat = stdMaterial(o.toothColor ?? o.color ?? '#B08D57', { metalness: 0.7, roughness: 0.42 })
  const lower = new THREE.Mesh(new THREE.BoxGeometry(o.w, 0.12, 0.3), bandMat)
  lower.castShadow = true
  lower.position.set(0, 0.06, 0)
  grp.add(lower)
  const pitch = 0.34
  const n = Math.max(2, Math.floor(o.w / pitch))
  for (let i = 0; i < n; i++) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.26), toothMat)
    t.position.set(-o.w / 2 + pitch / 2 + ((o.w - pitch) * i) / (n - 1), 0.22, 0)
    t.castShadow = true
    grp.add(t)
  }
  const upper = new THREE.Mesh(new THREE.BoxGeometry(o.w, 0.14, 0.44), bandMat)
  upper.castShadow = true
  upper.position.set(0, 0.39, 0.05)
  grp.add(upper)
  grp.rotation.y = o.rotY ?? 0
  grp.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0)
  return grp
}

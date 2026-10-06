import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'

/** 静水池/泳池（顶奢水景标准件）：石材池沿环 + 镜面水体 + 可选圆月汀步。
 *  矩形外廓 w×d，水面低于池沿 0.18（静态镜面，金属度低粗糙度吃环境反射）。
 *  steps=true 时沿长轴铺三块圆汀步（望月三阶）。景观件（userData.site）。 */
export function pool(o: {
  w: number
  d: number
  rimColor?: string
  waterColor?: string
  steps?: boolean
  x?: number
  y?: number
  z?: number
  rotY?: number
}): THREE.Object3D {
  const grp = new THREE.Group()
  const rimMat = stdMaterial(o.rimColor ?? '#E8E2D4', { roughness: 0.75 })
  const t = 0.5 // 池沿宽
  const h = 0.42
  // 四边池沿
  const rims: [number, number, number, number][] = [
    [o.w, t, 0, o.d / 2 - t / 2],
    [o.w, t, 0, -(o.d / 2 - t / 2)],
    [t, o.d - 2 * t, o.w / 2 - t / 2, 0],
    [t, o.d - 2 * t, -(o.w / 2 - t / 2), 0],
  ]
  for (const [w, d, x, z] of rims) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), rimMat)
    m.position.set(x, h / 2, z)
    m.castShadow = true
    grp.add(m)
  }
  // 镜面水体（低于沿口 0.18）
  const water = new THREE.Mesh(
    new THREE.BoxGeometry(o.w - 2 * t + 0.06, 0.06, o.d - 2 * t + 0.06),
    stdMaterial(o.waterColor ?? '#4A6B82', { metalness: 0.65, roughness: 0.08, emissive: '#2E5066', emissiveIntensity: 0.4 }),
  )
  water.position.y = h - 0.18
  grp.add(water)
  if (o.steps) {
    for (let i = 0; i < 3; i++) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.32, 16), rimMat)
      st.position.set(-o.w / 4 + (o.w / 4) * i, h - 0.06, 0)
      grp.add(st)
    }
  }
  grp.rotation.y = o.rotY ?? 0
  grp.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0)
  grp.userData.site = true
  return grp
}

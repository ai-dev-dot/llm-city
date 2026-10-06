import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'

/** 隅石角柱（quoins，古典石砌转角加固件）：交错长短石块自转角两向凸出，
 *  奇偶层交替咬合 x/z 两翼。置于建筑转角，y 为角柱底。
 *  翼向由 dirX/dirZ 指定（如转角 (−1,−1) 即石块向西/南两翼凸出）。 */
export function quoins(o: {
  h: number
  color?: string
  dirX?: number
  dirZ?: number
  x?: number
  y?: number
  z?: number
}): THREE.Object3D {
  const grp = new THREE.Group()
  const mat = stdMaterial(o.color ?? '#D6CDBC', { roughness: 0.82 })
  const dx = o.dirX ?? 1
  const dz = o.dirZ ?? 1
  const courseH = 0.5
  const n = Math.max(1, Math.round(o.h / courseH))
  for (let i = 0; i < n; i++) {
    const long = i % 2 === 0
    const w = long ? 0.85 : 0.6
    const dd = long ? 0.6 : 0.85
    const q = new THREE.Mesh(new THREE.BoxGeometry(w, courseH - 0.06, dd), mat)
    q.castShadow = true
    // 石块贴转角：长向交替咬向两翼，外缘凸出墙面 0.14
    q.position.set((dx * (w / 2 + 0.14)) - dx * 0.14, i * courseH + courseH / 2, (dz * (dd / 2 + 0.14)) - dz * 0.14)
    grp.add(q)
  }
  grp.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0)
  return grp
}

import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'

const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => { const o = new THREE.Mesh(g, m); o.castShadow = true; return o }

/**
 * 单跑直楼梯（豆包私人积木）：沿 +Z 方向爬升，y0 为起步地面。纯参数化、无随机。
 * 构件：逐级踏步 + 两侧斜侧板（stringer）+ 斜向扶手与立杆。
 * 折返双跑由调用方以两跑 + 休息平台组装（第二跑旋转 180°、x 错一开间）。
 * 复用：湖院（二期）、南门公寓（四期）。
 */
export function stairFlight(o: {
  w: number
  run: number
  rise: number
  steps?: number
  y0?: number
  color?: string
}): THREE.Object3D {
  const grp = new THREE.Group()
  const n = o.steps ?? Math.max(4, Math.round(o.run / 0.28))
  const tread = o.run / n
  const riser = o.rise / n
  const y0 = o.y0 ?? 0
  const mat = stdMaterial(o.color ?? '#D9D5CC', { roughness: 0.78 })
  const railMat = stdMaterial('#8E8B84', { metalness: 0.5, roughness: 0.45 })

  for (let i = 1; i <= n; i++) {
    const step = mesh(new THREE.BoxGeometry(o.w, 0.08, tread), mat)
    step.position.set(0, y0 + i * riser - 0.04, -o.run / 2 + (i - 0.5) * tread)
    grp.add(step)
  }
  // 斜侧板
  const len = Math.hypot(o.run, o.rise)
  const ang = -Math.atan2(o.rise, o.run)
  for (const sx of [-o.w / 2 + 0.05, o.w / 2 - 0.05]) {
    const stringer = mesh(new THREE.BoxGeometry(0.09, 0.16, len), mat)
    stringer.rotation.x = ang
    stringer.position.set(sx, y0 + o.rise / 2, 0)
    grp.add(stringer)
    // 斜扶手
    const hand = mesh(new THREE.BoxGeometry(0.07, 0.07, len), railMat)
    hand.rotation.x = ang
    hand.position.set(sx, y0 + o.rise / 2 + 0.9, 0)
    grp.add(hand)
    // 立杆（每 3 级一根）
    for (let i = 0; i <= n; i += 3) {
      const post = mesh(new THREE.BoxGeometry(0.05, 0.9, 0.05), railMat)
      post.position.set(sx, y0 + i * riser + 0.45, -o.run / 2 + i * tread)
      grp.add(post)
    }
  }

  return grp
}

/** 休息平台（楼梯折返处薄板 + 两侧栏杆短段），y0 为平台板面标高。 */
export function stairLanding(o: {
  w: number
  d: number
  y0: number
  color?: string
}): THREE.Object3D {
  const grp = new THREE.Group()
  const mat = stdMaterial(o.color ?? '#D9D5CC', { roughness: 0.78 })
  const slab = mesh(new THREE.BoxGeometry(o.w, 0.1, o.d), mat)
  slab.position.y = o.y0 - 0.05
  grp.add(slab)
  return grp
}

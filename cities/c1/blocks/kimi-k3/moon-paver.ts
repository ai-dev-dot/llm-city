import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'

/** 月相铺装圆板（月相步道标准件）：深色圆形石板 + 浅色月相亮部，平铺贴地。
 *  phase：0=朔（全暗无亮部）、1=弦（半圆亮）、2=望（满圆亮）、3=晦（月牙亮）。
 *  y 为板底（建议落在步道面之上 0.02 防 z-fight）。景观件（userData.site）。 */
export function moonPaver(o: {
  r?: number
  phase?: 0 | 1 | 2 | 3
  rotY?: number
  x?: number
  y?: number
  z?: number
}): THREE.Object3D {
  const r = o.r ?? 0.55
  const grp = new THREE.Group()
  const slab = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, 0.06, 20),
    stdMaterial('#8A8580', { roughness: 0.9 }),
  )
  slab.position.y = 0.03
  slab.receiveShadow = true
  grp.add(slab)
  const bright = stdMaterial('#E8E2D4', { roughness: 0.65, emissive: '#FFF6E0', emissiveIntensity: 0.12 })
  const phase = o.phase ?? 2
  if (phase === 2) {
    // 望：满圆
    const full = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r * 0.72, 0.025, 20), bright)
    full.position.y = 0.075
    grp.add(full)
  } else if (phase === 1) {
    // 弦：半圆亮板
    const half = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r * 0.72, 0.025, 20, 1, false, 0, Math.PI), bright)
    half.position.y = 0.075
    grp.add(half)
  } else if (phase === 3) {
    // 晦：月牙亮板（两圆相减轮廓，采样自 crescent 同款算法）
    const rr = r * 0.72
    const d = rr * 0.45, ri = rr * 0.75
    const ix = (d * d + rr * rr - ri * ri) / (2 * d)
    const iy = Math.sqrt(rr * rr - ix * ix)
    const aA = Math.atan2(iy, ix)
    const N = 20
    const shape = new THREE.Shape()
    for (let i = 0; i <= N; i++) {
      const a = aA + ((Math.PI * 2 - 2 * aA) * i) / N
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr
      if (i === 0) shape.moveTo(px, py); else shape.lineTo(px, py)
    }
    const bB = Math.atan2(-iy, ix - d)
    const bA = Math.atan2(iy, ix - d)
    for (let i = 0; i <= N; i++) {
      const a = bB + ((bA - Math.PI * 2 - bB) * i) / N
      shape.lineTo(d + Math.cos(a) * ri, Math.sin(a) * ri)
    }
    shape.closePath()
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: false, curveSegments: 4, steps: 1 })
    const cres = new THREE.Mesh(geo, bright)
    cres.rotation.x = -Math.PI / 2
    cres.position.y = 0.062
    grp.add(cres)
  }
  // 朔（phase 0）仅石板无亮部
  grp.rotation.y = o.rotY ?? 0
  grp.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0)
  grp.userData.site = true
  return grp
}

import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'

/** 月牙徽记（🌙 形徽牌，揽月街区身份件）：外圆盘被偏移内圆咬出弯月轮廓，
 *  尖角朝右，立放（板面朝 ±Z），y 为月牙中心标高。
 *  轮廓由两圆交点精确采样（外弧过最左点、内弧过凹点），确定性无随机。 */
export function crescent(o: {
  r?: number
  depth?: number
  color?: string
  glow?: string
  emissiveIntensity?: number
  x?: number
  y?: number
  z?: number
  rotY?: number
}): THREE.Object3D {
  const r = o.r ?? 1
  const d = r * 0.45 // 内圆圆心偏移
  const ri = r * 0.75 // 内圆半径
  // 两圆交点（月牙尖角）
  const ix = (d * d + r * r - ri * ri) / (2 * d)
  const iy = Math.sqrt(r * r - ix * ix)
  const aA = Math.atan2(iy, ix) // 外交点角（上尖）
  const N = 28
  const shape = new THREE.Shape()
  // 外弧：从上尖经最左点 (-r,0) 到下尖（逆时针扫过 180° 一侧）
  for (let i = 0; i <= N; i++) {
    const a = aA + ((Math.PI * 2 - 2 * aA) * i) / N
    const px = Math.cos(a) * r, py = Math.sin(a) * r
    if (i === 0) shape.moveTo(px, py); else shape.lineTo(px, py)
  }
  // 内弧：从下尖经内圆最左点回到上尖（向左凹，月牙中部厚、两端尖）
  const bB = Math.atan2(-iy, ix - d)
  const bA = Math.atan2(iy, ix - d)
  for (let i = 0; i <= N; i++) {
    const a = bB + ((bA - Math.PI * 2 - bB) * i) / N
    shape.lineTo(d + Math.cos(a) * ri, Math.sin(a) * ri)
  }
  shape.closePath()
  const glow = o.glow ?? '#FFE9A8'
  const mat = stdMaterial(o.color ?? '#C9A96A', {
    metalness: 0.85,
    roughness: 0.3,
    emissive: glow,
    emissiveIntensity: o.emissiveIntensity ?? 0.55,
  })
  const g = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: o.depth ?? 0.22, bevelEnabled: false, curveSegments: 4, steps: 1 }), mat)
  g.castShadow = true
  const grp = new THREE.Group()
  g.position.z = -(o.depth ?? 0.22) / 2
  grp.add(g)
  grp.rotation.y = o.rotY ?? 0
  grp.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0)
  return grp
}

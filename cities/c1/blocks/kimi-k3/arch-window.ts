import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'

/** 经典拱窗单元（顶奢石材立面标准件）：半圆拱顶窗 + 铜框衬板 + 挑出石窗台 + 拱心石。
 *  板面朝 +Z，y 为窗台标高。铜框板比玻璃大一圈、垫后 0.05，玻璃凸出框面 0.03——
 *  视觉即「深玻璃嵌在香槟铜框内」。lit 时玻璃转暖金自发光（夜窗）。 */
export function archWindow(o: {
  w?: number
  h?: number
  lit?: boolean
  frameColor?: string
  sillColor?: string
  x?: number
  y?: number
  z?: number
  rotY?: number
}): THREE.Object3D {
  const w = o.w ?? 1.6
  const h = o.h ?? 2.6
  const r = w / 2
  // 拱形轮廓（矩形 + 顶部半圆）
  const arch = (ww: number, hh: number) => {
    const s = new THREE.Shape()
    const rr = ww / 2
    s.moveTo(-rr, 0)
    s.lineTo(-rr, hh - rr)
    s.absarc(0, hh - rr, rr, Math.PI, 0, true)
    s.lineTo(rr, 0)
    s.closePath()
    return s
  }
  const grp = new THREE.Group()
  const frameMat = stdMaterial(o.frameColor ?? '#B08D57', { metalness: 0.8, roughness: 0.38 })
  const glassMat = o.lit
    ? stdMaterial('#FFD9A0', { metalness: 0.2, roughness: 0.4, emissive: '#FFC98A', emissiveIntensity: 0.85 })
    : stdMaterial('#2A3F54', { metalness: 0.55, roughness: 0.22, emissive: '#1B2A3A', emissiveIntensity: 0.3 })
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(arch(w + 0.22, h + 0.11), { depth: 0.1, bevelEnabled: false, curveSegments: 7, steps: 1 }), frameMat)
  frame.castShadow = true
  frame.position.set(0, -0.055, -0.05)
  grp.add(frame)
  const glass = new THREE.Mesh(new THREE.ExtrudeGeometry(arch(w, h), { depth: 0.06, bevelEnabled: false, curveSegments: 7, steps: 1 }), glassMat)
  glass.position.z = 0.04
  grp.add(glass)
  // 十字棂（拱窗的中挺与横档）
  const mullionMat = stdMaterial(o.frameColor ?? '#B08D57', { metalness: 0.8, roughness: 0.38 })
  const vm = new THREE.Mesh(new THREE.BoxGeometry(0.07, h - r * 0.4, 0.05), mullionMat)
  vm.position.set(0, (h - r * 0.4) / 2, 0.08)
  grp.add(vm)
  const hm = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, 0.07, 0.05), mullionMat)
  hm.position.set(0, h - r, 0.08)
  grp.add(hm)
  // 挑出石窗台 + 拱心石
  const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.16, 0.3), stdMaterial(o.sillColor ?? '#E8E2D4', { roughness: 0.8 }))
  sill.castShadow = true
  sill.position.set(0, -0.1, 0.1)
  grp.add(sill)
  const keystone = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.16), stdMaterial(o.sillColor ?? '#E8E2D4', { roughness: 0.8 }))
  keystone.position.set(0, h + 0.02, 0.05)
  grp.add(keystone)
  grp.rotation.y = o.rotY ?? 0
  grp.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0)
  return grp
}

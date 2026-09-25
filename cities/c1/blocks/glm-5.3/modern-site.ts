import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'

const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => { const o = new THREE.Mesh(g, m); o.castShadow = true; return o }

/** 现代灯柱（自建积木 · glm-5.3，原点塔场地 / 2026-09-26）：
 *  细钢杆 + 双横臂 + 长条发光灯头（现代广场/街边灯），暖白光。
 *  与官方件同款约定：纯参数化、无副作用；挂 userData.site 参与 R13 退线豁免。 */
export function modernLamp(o: { x?: number; z?: number; h?: number; rotY?: number; glow?: string } = {}): THREE.Object3D {
  const h = o.h ?? 4.2
  const steel = stdMaterial('#3A3F46', { metalness: 0.7, roughness: 0.4 })
  const grp = new THREE.Group()
  const base = mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.5, 10), stdMaterial('#4A4F56', { roughness: 0.8 }))
  base.position.y = 0.25; grp.add(base)
  const pole = mesh(new THREE.CylinderGeometry(0.045, 0.065, h - 0.5, 10), steel)
  pole.position.y = 0.5 + (h - 0.5) / 2; grp.add(pole)
  for (const side of [-1, 1]) {                                       // 双横臂灯头
    const arm = mesh(new THREE.BoxGeometry(0.75, 0.05, 0.07), steel)
    arm.position.set(side * 0.42, h - 0.06, 0); grp.add(arm)
    const head = mesh(new THREE.BoxGeometry(0.8, 0.09, 0.16),
      stdMaterial('#E9E4DA', { emissive: o.glow ?? '#FFE9C0', emissiveIntensity: 1.5, roughness: 0.6 }))
    head.position.set(side * 0.45, h - 0.02, 0); grp.add(head)
  }
  const cap = mesh(new THREE.BoxGeometry(0.16, 0.04, 0.16), steel)
  cap.position.y = h; grp.add(cap)
  grp.rotation.y = o.rotY ?? 0
  grp.position.set(o.x ?? 0, 0, o.z ?? 0)
  grp.userData.site = true
  return grp
}

/** 矮柱灯（自建积木 · glm-5.3）：广场引导灯/环形灯阵用，方截面矮柱 + 顶部发光带。 */
export function bollardLight(o: { x?: number; z?: number; h?: number; glow?: string } = {}): THREE.Object3D {
  const h = o.h ?? 0.85
  const grp = new THREE.Group()
  const post = mesh(new THREE.BoxGeometry(0.14, h, 0.14), stdMaterial('#5B5E63', { metalness: 0.5, roughness: 0.5 }))
  post.position.y = h / 2; grp.add(post)
  const band = mesh(new THREE.BoxGeometry(0.155, 0.09, 0.155),
    stdMaterial('#EDE8DE', { emissive: o.glow ?? '#FFE9C0', emissiveIntensity: 1.8 }))
  band.position.y = h - 0.1; grp.add(band)
  const cap = mesh(new THREE.BoxGeometry(0.18, 0.03, 0.18), stdMaterial('#33363B', { roughness: 0.5 }))
  cap.position.y = h + 0.015; grp.add(cap)
  grp.position.set(o.x ?? 0, 0, o.z ?? 0)
  grp.userData.site = true
  return grp
}

/** 现代树池坐凳（自建积木 · glm-5.3）：方形混凝土树池 + 四周木质坐沿，树阵广场件。
 *  只做树池本体（内填土），树冠由调用方选树栽入。 */
export function planterBench(o: { x?: number; z?: number; size?: number } = {}): THREE.Object3D {
  const s = o.size ?? 2.4
  const grp = new THREE.Group()
  const wood = stdMaterial('#8A6E4E', { roughness: 0.85 })
  const conc = stdMaterial('#A9A6A0', { roughness: 0.9 })
  const soil = stdMaterial('#4E4237', { roughness: 0.98 })
  const seat = mesh(new THREE.BoxGeometry(s + 0.9, 0.1, s + 0.9), wood)   // 木质坐沿外挑
  seat.position.y = 0.42; grp.add(seat)
  const box = mesh(new THREE.BoxGeometry(s, 0.45, s), conc)               // 混凝土池壁（坐沿下）
  box.position.y = 0.225; grp.add(box)
  const inner = mesh(new THREE.BoxGeometry(s - 0.3, 0.06, s - 0.3), soil)
  inner.position.y = 0.48; grp.add(inner)
  grp.position.set(o.x ?? 0, 0, o.z ?? 0)
  grp.userData.site = true
  return grp
}

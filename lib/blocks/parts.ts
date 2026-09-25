import * as THREE from 'three'
import { stdMaterial, PALETTE } from './index'
import { mulberry32 } from '../ctx'

const pick = (c: string | undefined, i: number) => c ?? PALETTE[i % PALETTE.length]
const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => { const o = new THREE.Mesh(g, m); o.castShadow = true; return o }

export function makeBoxFloor(o: { w: number; d: number; h: number; color?: string; y?: number }): THREE.Object3D {
  const g = mesh(new THREE.BoxGeometry(o.w, o.h, o.d), stdMaterial(pick(o.color, 1)))
  g.position.y = (o.y ?? 0) + o.h / 2
  return g
}
export function makeWall(o: { w: number; h: number; d?: number; color?: string; x?: number; z?: number; y?: number }): THREE.Object3D {
  const g = mesh(new THREE.BoxGeometry(o.w, o.h, o.d ?? 0.3), stdMaterial(pick(o.color, 3)))
  g.position.set(o.x ?? 0, (o.y ?? 0) + o.h / 2, o.z ?? 0)
  return g
}
export function makeWindowStrip(o: { w: number; h: number; d?: number; y?: number }): THREE.Object3D {
  const mat = stdMaterial('#2E4057', { metalness: 0.6, roughness: 0.25, emissive: '#1B2A3A', emissiveIntensity: 0.35 })
  const g = mesh(new THREE.BoxGeometry(o.w, o.h, (o.d ?? 0.3) + 0.05), mat)
  g.position.y = (o.y ?? 0) + o.h / 2
  return g
}
export function makePitchedRoof(o: { w: number; d: number; h: number; color?: string; y?: number }): THREE.Object3D {
  const g = mesh(new THREE.CylinderGeometry(0, Math.SQRT1_2 * Math.min(o.w, o.d), o.h, 4), stdMaterial(pick(o.color, 8)))
  g.scale.set(o.w / Math.min(o.w, o.d), 1, o.d / Math.min(o.w, o.d))
  g.rotation.y = Math.PI / 4
  g.position.y = (o.y ?? 0) + o.h / 2
  return g
}
export function makeFlatRoofTop(o: { w: number; d: number; y?: number; color?: string }): THREE.Object3D {
  const grp = new THREE.Group()
  const t = 0.25
  for (const [w, x, z] of [[o.w, 0, o.d / 2 - t / 2], [o.w, 0, -(o.d / 2 - t / 2)], [o.d, o.w / 2 - t / 2, 0], [o.d, -(o.w / 2 - t / 2), 0]] as const) {
    const along = Math.abs(z) > 0 && Math.abs(x) === 0 ? 'x' : 'z'
    const part = mesh(new THREE.BoxGeometry(along === 'x' ? w : t, t, along === 'x' ? t : w), stdMaterial(pick(o.color, 2)))
    part.position.set(x, t / 2, z)
    grp.add(part)
  }
  grp.position.y = o.y ?? 0
  return grp
}
export function makeColumn(o: { r: number; h: number; x?: number; z?: number; y?: number; color?: string }): THREE.Object3D {
  const g = mesh(new THREE.CylinderGeometry(o.r, o.r, o.h, 12), stdMaterial(pick(o.color, 0), { roughness: 0.5 }))
  g.position.set(o.x ?? 0, (o.y ?? 0) + o.h / 2, o.z ?? 0)
  return g
}
export function makeTowerCrane(o: { h: number; x?: number; z?: number }): THREE.Object3D {
  const grp = new THREE.Group()
  const yellow = stdMaterial('#C9A227', { metalness: 0.3, roughness: 0.6 })
  const mast = mesh(new THREE.BoxGeometry(1.2, o.h, 1.2), yellow); mast.position.y = o.h / 2; grp.add(mast)
  const jib = mesh(new THREE.BoxGeometry(o.h * 0.55, 0.8, 0.8), yellow); jib.position.set(o.h * 0.2, o.h, 0); grp.add(jib)
  const counter = mesh(new THREE.BoxGeometry(o.h * 0.18, 1, 1), yellow); counter.position.set(-o.h * 0.12, o.h, 0); grp.add(counter)
  const cable = mesh(new THREE.BoxGeometry(0.08, o.h * 0.35, 0.08), stdMaterial('#3E3C3A')); cable.position.set(o.h * 0.32, o.h - o.h * 0.175, 0); grp.add(cable)
  grp.position.set(o.x ?? 0, 0, o.z ?? 0)
  return grp
}
export function makeStreetLamp(o: { x?: number; z?: number; h?: number }): THREE.Object3D {
  const h = o.h ?? 4.5
  const grp = new THREE.Group()
  const pole = mesh(new THREE.CylinderGeometry(0.08, 0.12, h, 8), stdMaterial('#3E3C3A', { metalness: 0.5 }))
  pole.position.y = h / 2; grp.add(pole)
  const head = mesh(new THREE.SphereGeometry(0.28, 12, 8), stdMaterial('#F5F1E0', { emissive: '#FFE9A8', emissiveIntensity: 0.9 }))
  head.position.y = h; grp.add(head)
  grp.position.set(o.x ?? 0, 0, o.z ?? 0)
  grp.userData.site = true   // 景观件：R13 退线豁免
  return grp
}
export function makeTree(o: { x?: number; z?: number; scale?: number; seed?: number }): THREE.Object3D {
  const rng = mulberry32(o.seed ?? 1)
  const grp = new THREE.Group()
  const trunk = mesh(new THREE.CylinderGeometry(0.18, 0.26, 1.8, 8), stdMaterial('#6B4A2F'))
  trunk.position.y = 0.9; grp.add(trunk)
  const n = 3
  for (let i = 0; i < n; i++) {
    const r = 0.8 + rng() * 0.5
    const leaf = mesh(new THREE.IcosahedronGeometry(r, 0), stdMaterial(pick(undefined, 7 + i), { roughness: 0.9 }))
    leaf.position.set((rng() - 0.5) * 0.8, 2.1 + i * 0.75 + rng() * 0.3, (rng() - 0.5) * 0.8)
    grp.add(leaf)
  }
  const s = o.scale ?? 1
  grp.scale.set(s, s, s)
  grp.position.set(o.x ?? 0, 0, o.z ?? 0)
  grp.userData.site = true   // 景观件：R13 退线豁免
  return grp
}
export function makeNeonSign(o: { w: number; h: number; color: string; x?: number; y?: number; z?: number }): THREE.Object3D {
  const grp = new THREE.Group()
  const board = mesh(new THREE.BoxGeometry(o.w, o.h, 0.15), stdMaterial(o.color, { emissive: o.color, emissiveIntensity: 1.6, roughness: 0.4 }))
  grp.add(board)
  grp.position.set(o.x ?? 0, (o.y ?? 0) + o.h / 2, o.z ?? 0)
  return grp
}
export function makePlinth(o: { w: number; d: number; h: number; color?: string }): THREE.Object3D {
  const g = mesh(new THREE.BoxGeometry(o.w, o.h, o.d), stdMaterial(pick(o.color, 2), { roughness: 0.85 }))
  g.position.y = o.h / 2
  return g
}
export function makeHedge(o: { w: number; d?: number; h?: number; x?: number; z?: number }): THREE.Object3D {
  const g = mesh(new THREE.BoxGeometry(o.w, o.h ?? 0.9, o.d ?? 0.8), stdMaterial('#6E7F5C', { roughness: 0.95 }))
  g.position.set(o.x ?? 0, (o.h ?? 0.9) / 2, o.z ?? 0)
  g.userData.site = true   // 景观件：R13 退线豁免
  return g
}
export function makeBench(o: { x?: number; z?: number; rotY?: number }): THREE.Object3D {
  const grp = new THREE.Group()
  const seat = mesh(new THREE.BoxGeometry(1.8, 0.08, 0.45), stdMaterial('#8C6A4A', { roughness: 0.8 }))
  seat.position.y = 0.45; grp.add(seat)
  for (const dx of [-0.75, 0.75]) {
    const leg = mesh(new THREE.BoxGeometry(0.08, 0.45, 0.4), stdMaterial('#3E3C3A'))
    leg.position.set(dx, 0.22, 0); grp.add(leg)
  }
  grp.rotation.y = o.rotY ?? 0
  grp.position.set(o.x ?? 0, 0, o.z ?? 0)
  grp.userData.site = true   // 景观件：R13 退线豁免
  return grp
}

// ---- 高表现力组件（[city-admin] 增补 2026-09-25：把面数预算花在可感知细节上的官方件）----

/** 带半圆拱洞的墙板（洞开到底成柱廊）；挤出方向 +Z，y 为板底 */
export function makeArchWall(o: { w: number; h: number; archW: number; archH: number; depth?: number; color?: string; x?: number; y?: number; z?: number }): THREE.Object3D {
  const depth = o.depth ?? 0.4
  const shape = new THREE.Shape()
  shape.moveTo(-o.w / 2, 0); shape.lineTo(-o.w / 2, o.h); shape.lineTo(o.w / 2, o.h); shape.lineTo(o.w / 2, 0); shape.closePath()
  const hole = new THREE.Path()
  hole.moveTo(-o.archW / 2, 0)
  hole.lineTo(-o.archW / 2, o.archH - o.archW / 2)
  hole.absarc(0, o.archH - o.archW / 2, o.archW / 2, Math.PI, 0, true)
  hole.lineTo(o.archW / 2, 0)
  hole.closePath()
  shape.holes.push(hole)
  const g = mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 7, steps: 1 }), stdMaterial(pick(o.color, 8), { roughness: 0.8 }))
  g.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0)
  return g
}

/** 实心拱形贴板（盲拱/浮雕饰面）：矩形 + 顶部半圆轮廓，挤出 +Z，y 为板底 */
export function makeArchPanel(o: { w: number; h: number; depth?: number; color?: string; x?: number; y?: number; z?: number }): THREE.Object3D {
  const r = o.w / 2
  const shape = new THREE.Shape()
  shape.moveTo(-r, 0); shape.lineTo(-r, o.h - r)
  shape.absarc(0, o.h - r, r, Math.PI, 0, true)
  shape.lineTo(r, 0); shape.closePath()
  const g = mesh(new THREE.ExtrudeGeometry(shape, { depth: o.depth ?? 0.18, bevelEnabled: false, curveSegments: 7, steps: 1 }), stdMaterial(pick(o.color, 8), { roughness: 0.8 }))
  g.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0)
  return g
}

/** 栏杆段：扶手 + 踢脚 + 密立柱（柱距约 1m），沿局部 X 展开，y 为底部 */
export function makeRailing(o: { w: number; h?: number; color?: string; x?: number; y?: number; z?: number }): THREE.Object3D {
  const h = o.h ?? 1.0
  const grp = new THREE.Group()
  const hand = mesh(new THREE.BoxGeometry(o.w, 0.12, 0.22), stdMaterial(pick(o.color, 1)))
  hand.position.y = h - 0.06; grp.add(hand)
  const skirt = mesh(new THREE.BoxGeometry(o.w, 0.1, 0.12), stdMaterial(pick(o.color, 3)))
  skirt.position.y = 0.05; grp.add(skirt)
  const n = Math.max(3, Math.round(o.w))
  for (let i = 0; i <= n; i++) {
    const post = mesh(new THREE.CylinderGeometry(0.055, 0.07, h - 0.12, 6), stdMaterial(pick(o.color, 3), { roughness: 0.6 }))
    post.position.set(-o.w / 2 + (o.w * i) / n, (h - 0.12) / 2 + 0.12); grp.add(post)
  }
  grp.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0)
  return grp
}

/** 石盆（urn：座 + 盆身 + 半球盖），y 为底部 */
export function makeUrn(o: { scale?: number; color?: string; x?: number; y?: number; z?: number }): THREE.Object3D {
  const grp = new THREE.Group()
  const base = mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.34, 10), stdMaterial(pick(o.color, 3)))
  base.position.y = 0.17; grp.add(base)
  const body = mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.42, 10), stdMaterial(pick(o.color, 8)))
  body.position.y = 0.52; grp.add(body)
  const cap = mesh(new THREE.SphereGeometry(0.24, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), stdMaterial(pick(o.color, 3)))
  cap.position.y = 0.73; grp.add(cap)
  const s = o.scale ?? 1
  grp.scale.set(s, s, s)
  grp.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0)
  grp.userData.site = true   // 景观件：R13 退线豁免
  return grp
}

/** 井字窗棂板（cols 竖 × rows 横棂条），y 为底部 */
export function makeLatticePanel(o: { w: number; h: number; cols?: number; rows?: number; bar?: number; color?: string; x?: number; y?: number; z?: number }): THREE.Object3D {
  const grp = new THREE.Group()
  const t = o.bar ?? 0.12
  const mat = stdMaterial(pick(o.color, 3))
  const cols = o.cols ?? 4, rows = o.rows ?? 3
  for (let c = 0; c <= cols; c++) {
    const v = mesh(new THREE.BoxGeometry(t, o.h, t), mat)
    v.position.set(-o.w / 2 + (o.w * c) / cols, o.h / 2, 0); grp.add(v)
  }
  for (let r = 0; r <= rows; r++) {
    const hbar = mesh(new THREE.BoxGeometry(o.w, t, t), mat)
    hbar.position.set(0, (o.h * r) / rows, 0); grp.add(hbar)
  }
  grp.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0)
  return grp
}

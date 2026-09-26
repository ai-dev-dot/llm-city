import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'

const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => {
  const o = new THREE.Mesh(g, m)
  o.castShadow = true
  return o
}

/** 拱步桥：沿直线起拱的木桥——面板+双纵梁+立柱扶手。本体构件（非 site），
 *  调用方负责将其布置在宗地退线核心内。 */
export function archFootbridge(o: {
  from: [number, number]
  to: [number, number]
  width?: number
  rise?: number
  y0?: number
  y1?: number
  planks?: number
}): THREE.Object3D {
  const grp = new THREE.Group()
  const w = o.width ?? 3.4
  const n = o.planks ?? 30
  const wood = stdMaterial('#8C6A4A', { roughness: 0.85 })
  const steel = stdMaterial('#4A4E52', { metalness: 0.7, roughness: 0.35 })
  const [x1, z1] = o.from
  const [x2, z2] = o.to
  const len = Math.hypot(x2 - x1, z2 - z1)
  const rot = Math.atan2(x2 - x1, z2 - z1)
  const deckY = (t: number) => {
    const base = (o.y0 ?? 0.16) + ((o.y1 ?? 0.16) - (o.y0 ?? 0.16)) * t
    return base + (o.rise ?? 1.3) * Math.sin(Math.PI * t)
  }
  const pts: Array<[number, number, number]> = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    pts.push([x1 + (x2 - x1) * t, deckY(t), z1 + (z2 - z1) * t])
  }
  // 桥面板（垂直于行进方向的厚板）
  for (let i = 0; i <= n; i++) {
    const [px, py, pz] = pts[i]
    const plank = mesh(new THREE.BoxGeometry(w, 0.1, len / n + 0.04), wood)
    plank.position.set(px, py, pz)
    plank.rotation.y = rot
    grp.add(plank)
  }
  // 侧纵梁（随拱折线分段）+ 扶手柱与扶手
  for (const side of [-1, 1]) {
    const off = (side * w) / 2
    const dxn = (z2 - z1) / (len || 1)
    const dzn = -(x2 - x1) / (len || 1)
    for (let i = 0; i < n; i++) {
      const [ax, ay, az] = pts[i]
      const [bx, by, bz] = pts[i + 1]
      const seg = Math.hypot(bx - ax, by - ay, bz - az)
      const beam = mesh(new THREE.BoxGeometry(0.12, 0.16, seg + 0.03), steel)
      beam.position.set((ax + bx) / 2 + dxn * off, (ay + by) / 2 - 0.14, (az + bz) / 2 + dzn * off)
      beam.rotation.y = rot
      beam.rotation.x = Math.atan2(by - ay, seg)
      grp.add(beam)
      if (i % 2 === 0) {
        const post = mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.95, 6), steel)
        post.position.set(ax + dxn * off, ay + 0.48, az + dzn * off)
        grp.add(post)
      }
      const rail = mesh(new THREE.BoxGeometry(0.07, 0.07, seg + 0.04), steel)
      rail.position.set((ax + bx) / 2 + dxn * off, (ay + by) / 2 + 0.92, (az + bz) / 2 + dzn * off)
      rail.rotation.y = rot
      rail.rotation.x = Math.atan2(-(by - ay), seg)
      grp.add(rail)
    }
  }
  return grp
}

/** 灯塔观景台「塔鉴亭」：环廊柱阵 + 抬升圆台 + 细长灯柱 + 顶部发光冠环。本体构件。 */
export function lighthouse(o: { x: number; z: number; h?: number; glow?: string }): THREE.Object3D {
  const grp = new THREE.Group()
  const H = o.h ?? 9
  const white = stdMaterial('#E8E6E1', { roughness: 0.6 })
  const stone = stdMaterial('#C4C1BA', { roughness: 0.85 })
  const glowCol = o.glow ?? '#FFD98A'
  const base = mesh(new THREE.CylinderGeometry(2.7, 3.0, 0.5, 24), stone)
  base.position.y = 0.25
  grp.add(base)
  const step = mesh(new THREE.CylinderGeometry(2.45, 2.7, 0.18, 24), stone)
  step.position.y = 0.59
  grp.add(step)
  for (let i = 0; i < 5; i++) {
    const a = ((i - 2) / 5) * 1.1 - Math.PI / 2
    const st = mesh(new THREE.BoxGeometry(0.9, 0.14, 0.5), stone)
    st.position.set(Math.cos(a) * 3.05, 0.3 - i * 0.03, Math.sin(a) * 3.05)
    st.rotation.y = -a - Math.PI / 2
    grp.add(st)
  }
  const deck = mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.14, 24), white)
  deck.position.y = 0.95
  grp.add(deck)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12
    const col = mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.15, 8), white)
    col.position.set(Math.cos(a) * 2.0, 0.95 + 0.575, Math.sin(a) * 2.0)
    grp.add(col)
  }
  const railTop = mesh(new THREE.TorusGeometry(2.05, 0.05, 6, 30), stdMaterial('#5B5956', { metalness: 0.6 }))
  railTop.rotation.x = Math.PI / 2
  railTop.position.y = 2.14
  grp.add(railTop)
  const shaft = mesh(new THREE.CylinderGeometry(0.24, 0.42, H - 2.6, 14), white)
  shaft.position.y = 0.95 + (H - 2.6) / 2
  grp.add(shaft)
  const band = mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.3, 14), stdMaterial('#B0442F', { roughness: 0.7 }))
  band.position.y = 0.95 + (H - 2.6) * 0.55
  grp.add(band)
  const lampRoom = mesh(new THREE.BoxGeometry(0.92, 0.8, 0.92), stdMaterial('#3E3C3A', { metalness: 0.5, roughness: 0.5 }))
  lampRoom.position.y = H - 1.15
  grp.add(lampRoom)
  const lens = mesh(new THREE.SphereGeometry(0.42, 14, 10), stdMaterial(glowCol, { emissive: glowCol, emissiveIntensity: 3.4, roughness: 0.3 }))
  lens.position.y = H - 1.15
  grp.add(lens)
  const crown = mesh(new THREE.TorusGeometry(0.78, 0.07, 8, 26), stdMaterial(glowCol, { emissive: glowCol, emissiveIntensity: 2.4, metalness: 0.4 }))
  crown.rotation.x = Math.PI / 2
  crown.position.y = H - 0.55
  grp.add(crown)
  const cap = mesh(new THREE.ConeGeometry(0.66, 0.5, 4), stdMaterial('#4E4A40'))
  cap.rotation.y = Math.PI / 4
  cap.position.y = H - 0.3
  grp.add(cap)
  grp.position.set(o.x, 0, o.z)
  return grp
}

/** 花架长廊：双排立柱 + 顶格栅 + 攀绿团。本体（矮，位于退线核心内）。 */
export function pergola(o: { x: number; z: number; rotY?: number; length: number; bays?: number; postH?: number }): THREE.Object3D {
  const grp = new THREE.Group()
  const wood = stdMaterial('#9A7B55', { roughness: 0.85 })
  const leafMat = stdMaterial('#67804F', { roughness: 0.9 })
  const H = o.postH ?? 2.6
  const width = 2.6
  const bays = o.bays ?? 6
  for (const zz of [-width / 2, width / 2]) {
    for (let i = 0; i <= bays; i++) {
      const px = -o.length / 2 + (o.length * i) / bays
      const post = mesh(new THREE.CylinderGeometry(0.1, 0.13, H, 8), wood)
      post.position.set(px, H / 2, zz)
      grp.add(post)
    }
    const beam = mesh(new THREE.BoxGeometry(o.length + 0.3, 0.16, 0.14), wood)
    beam.position.set(0, H + 0.06, zz)
    grp.add(beam)
  }
  const rafters = bays * 4
  for (let i = 0; i <= rafters; i++) {
    const px = -o.length / 2 + (o.length * i) / rafters
    const rafter = mesh(new THREE.BoxGeometry(0.08, 0.12, width + 0.7), wood)
    rafter.position.set(px, H + 0.2, 0)
    grp.add(rafter)
  }
  for (let i = 0; i < bays; i++) {
    const px = -o.length / 2 + (o.length * (i + 0.5)) / bays
    const vine = mesh(new THREE.IcosahedronGeometry(0.38 + (i % 3) * 0.1, 0), leafMat)
    vine.position.set(px, H + 0.36, ((i % 2) - 0.5) * 0.9)
    vine.scale.y = 0.6
    grp.add(vine)
  }
  grp.rotation.y = o.rotY ?? 0
  grp.position.set(o.x, 0, o.z)
  return grp
}

/** 草坪矮灯柱：0.75m 石座 + 发光球头（site 件，沿步道列植）。 */
export function bollardLamp(o: { x: number; z: number; y?: number; glow?: string }): THREE.Object3D {
  const grp = new THREE.Group()
  const body = mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.68, 8), stdMaterial('#5B5956', { metalness: 0.55, roughness: 0.45 }))
  body.position.y = 0.34
  grp.add(body)
  const head = mesh(new THREE.SphereGeometry(0.11, 10, 8), stdMaterial(o.glow ?? '#FFE9B8', { emissive: o.glow ?? '#FFE9B8', emissiveIntensity: 2.6 }))
  head.position.y = 0.74
  grp.add(head)
  grp.position.set(o.x, o.y ?? 0, o.z)
  grp.userData.site = true
  return grp
}

/** 「塔框」雕塑：镜面金属竖环立于南广场轴线端——为原点塔取景框。 */
export function framingRing(o: { x: number; z: number; rotY?: number; glow?: string }): THREE.Object3D {
  const grp = new THREE.Group()
  const foot = mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.12, 14), stdMaterial('#3E3C3A', { metalness: 0.5 }))
  foot.position.y = 0.06
  grp.add(foot)
  const post = mesh(new THREE.BoxGeometry(0.16, 1.15, 0.16), stdMaterial('#5B5956', { metalness: 0.75, roughness: 0.3 }))
  post.position.y = 0.68
  grp.add(post)
  const ring = mesh(new THREE.TorusGeometry(1.05, 0.055, 10, 40), stdMaterial('#C9C5BC', { metalness: 0.9, roughness: 0.12 }))
  ring.position.y = 2.45
  grp.add(ring)
  const halo = mesh(new THREE.TorusGeometry(1.05, 0.028, 8, 36), stdMaterial(o.glow ?? '#FFE9B8', { emissive: o.glow ?? '#FFE9B8', emissiveIntensity: 2.0 }))
  halo.position.y = 2.45
  halo.scale.set(0.82, 0.82, 0.82)
  grp.add(halo)
  grp.rotation.y = o.rotY ?? 0
  grp.position.set(o.x, 0, o.z)
  grp.userData.site = true
  return grp
}

/** 导览牌：立杆 + 微倾面板（site 件）。 */
export function signPost(o: { x: number; z: number; rotY?: number }): THREE.Object3D {
  const grp = new THREE.Group()
  for (const dx of [-0.22, 0.22]) {
    const leg = mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.35, 6), stdMaterial('#3E3C3A', { metalness: 0.5 }))
    leg.position.set(dx, 0.675, 0)
    grp.add(leg)
  }
  const board = mesh(new THREE.BoxGeometry(0.8, 0.55, 0.06), stdMaterial('#4E5A46', { roughness: 0.7 }))
  board.position.y = 1.2
  board.rotation.x = -0.32
  grp.add(board)
  const face = mesh(new THREE.BoxGeometry(0.68, 0.42, 0.02), stdMaterial('#D9D6CF', { roughness: 0.5, emissive: '#8A8578', emissiveIntensity: 0.15 }))
  face.position.set(0, 1.23, 0.04)
  face.rotation.x = -0.32
  grp.add(face)
  grp.rotation.y = o.rotY ?? 0
  grp.position.set(o.x, 0, o.z)
  grp.userData.site = true
  return grp
}

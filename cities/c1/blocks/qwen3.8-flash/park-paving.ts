import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'

/** 步道带：沿折线/闭环铺一条略高于地面的铺装带（薄贴地带，R13 地被豁免）。
 *  顶点沿折线法向偏移 width/2，逐段平滑（相邻段平均法向）。 */
export function ribbonPath(o: {
  pts: Array<[number, number]>
  width: number
  y?: number
  color?: string
  closed?: boolean
}): THREE.Object3D {
  const pts = o.pts.slice()
  if (o.closed && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop()
  const n = pts.length
  const hw = o.width / 2
  const pos: number[] = []
  const idx: number[] = []
  const normals: Array<[number, number]> = []
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n]
    const next = pts[(i + 1) % n]
    let dx = next[0] - prev[0]
    let dz = next[1] - prev[1]
    if (!o.closed && i === 0) { dx = next[0] - pts[0][0]; dz = next[1] - pts[0][1] }
    if (!o.closed && i === n - 1) { dx = pts[n - 1][0] - pts[n - 2][0]; dz = pts[n - 1][1] - pts[n - 2][1] }
    const L = Math.hypot(dx, dz) || 1
    normals.push([-dz / L, dx / L])
  }
  const y = o.y ?? 0.125
  for (let i = 0; i < n; i++) {
    const [nx, nz] = normals[i]
    pos.push(pts[i][0] + nx * hw, y, pts[i][1] + nz * hw)
    pos.push(pts[i][0] - nx * hw, y, pts[i][1] - nz * hw)
  }
  const segs = o.closed ? n : n - 1
  for (let i = 0; i < segs; i++) {
    const a = i * 2
    const b = ((i + 1) % n) * 2
    idx.push(a, a + 1, b, a + 1, b + 1, b)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  const m = new THREE.Mesh(geo, stdMaterial(o.color ?? '#B7A98C', { roughness: 0.92 }))
  m.receiveShadow = true
  m.userData.site = true
  return m
}

/** 铺装广场：圆心裁剪的方形汀格（每块一个 mesh，缝 0.08），ringBand 内换深色镶边。 */
export function tilePlaza(o: {
  cx: number
  cz: number
  r: number
  tile?: number
  gap?: number
  y?: number
  color?: string
  ringBand?: [number, number]
  ringColor?: string
  clip?: (x: number, z: number) => boolean
  jitter?: () => number
}): THREE.Object3D {
  const grp = new THREE.Group()
  const t = o.tile ?? 1.05
  const gp = o.gap ?? 0.09
  const stone = stdMaterial(o.color ?? '#C6C1B5', { roughness: 0.88 })
  const band = stdMaterial(o.ringColor ?? '#8E8577', { roughness: 0.88 })
  const span = Math.ceil(o.r / (t + gp))
  for (let ix = -span; ix <= span; ix++) {
    for (let iz = -span; iz <= span; iz++) {
      const x = o.cx + ix * (t + gp)
      const z = o.cz + iz * (t + gp)
      const r = Math.hypot(x - o.cx, z - o.cz)
      if (r > o.r - t * 0.5) continue
      if (o.clip && !o.clip(x, z)) continue
      const inBand = o.ringBand && r >= o.ringBand[0] && r <= o.ringBand[1]
      const m = new THREE.Mesh(new THREE.BoxGeometry(t, 0.12, t), inBand ? band : stone)
      const jx = o.jitter ? (o.jitter() - 0.5) * 0.02 : 0
      const jz = o.jitter ? (o.jitter() - 0.5) * 0.02 : 0
      m.position.set(x, (o.y ?? 0.1) + jx, z + jz)
      m.receiveShadow = true
      grp.add(m)
    }
  }
  grp.userData.site = true
  return grp
}

/** 木栈道：沿折线的枕木排（离地低矮，地被豁免）。适合湿地水面之上。 */
export function boardwalk(o: {
  pts: Array<[number, number]>
  width?: number
  y?: number
  step?: number
  color?: string
}): THREE.Object3D {
  const grp = new THREE.Group()
  const w = o.width ?? 2.3
  const wood = stdMaterial(o.color ?? '#8C6A4A', { roughness: 0.88 })
  const y = o.y ?? 0.34
  for (let s = 0; s < o.pts.length - 1; s++) {
    const [x1, z1] = o.pts[s]
    const [x2, z2] = o.pts[s + 1]
    const len = Math.hypot(x2 - x1, z2 - z1)
    const dirx = (x2 - x1) / (len || 1)
    const dirz = (z2 - z1) / (len || 1)
    const rot = Math.atan2(dirx, dirz)
    const n = Math.max(2, Math.round(len / (o.step ?? 0.42)))
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const plank = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, 0.3), wood)
      plank.position.set(x1 + (x2 - x1) * t, y, z1 + (z2 - z1) * t)
      plank.rotation.y = rot
      grp.add(plank)
    }
    // 两侧纵梁
    for (const side of [-1, 1]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, len), stdMaterial('#6E5238'))
      beam.position.set((x1 + x2) / 2 - (side * w) / 2 * ((z2 - z1) / (len || 1)), y - 0.09, (z1 + z2) / 2 + (side * w) / 2 * ((x2 - x1) / (len || 1)))
      beam.rotation.y = rot
      grp.add(beam)
    }
  }
  grp.userData.site = true
  return grp
}

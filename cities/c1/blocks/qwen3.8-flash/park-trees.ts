import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'
import { mulberry32 } from '../../../../lib/ctx'

const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => {
  const o = new THREE.Mesh(g, m)
  o.castShadow = true
  return o
}

export interface TreeOpt {
  x: number
  z: number
  y?: number
  scale?: number
  rotY?: number
  seed?: number
  tint?: string
  rich?: boolean
}

/** 阔叶乔木（圆头杂木）：干 + 2~3 团冠，seed 驱动树形；rich=true 主冠升二级细分（赏树用）。 */
export function broadleaf(o: TreeOpt): THREE.Object3D {
  const rng = mulberry32(o.seed ?? 7)
  const s = o.scale ?? 1
  const grp = new THREE.Group()
  const th = 1.6 + rng() * 1.1
  const trunk = mesh(new THREE.CylinderGeometry(0.13, 0.24 * (0.85 + rng() * 0.4), th, 8), stdMaterial('#6B4A2F', { roughness: 0.95 }))
  trunk.position.y = th / 2
  grp.add(trunk)
  const leafColor = o.tint ?? ['#6E8B5E', '#7F9C6B', '#5F7D54', '#87A06A'][Math.floor(rng() * 4)]
  const n = 2 + (rng() < 0.55 ? 1 : 0)
  for (let i = 0; i < n; i++) {
    const r = (0.95 + rng() * 0.7) * (i === 0 ? 1 : 0.72)
    const leaf = mesh(new THREE.IcosahedronGeometry(r, i === 0 ? (o.rich ? 2 : 1) : 0), stdMaterial(leafColor, { roughness: 0.92 }))
    leaf.position.set((rng() - 0.5) * 1.3, th + 0.55 + i * 0.72 + rng() * 0.35, (rng() - 0.5) * 1.3)
    leaf.scale.y = 0.82 + rng() * 0.25
    grp.add(leaf)
  }
  grp.scale.set(s, s, s)
  grp.rotation.y = o.rotY ?? rng() * Math.PI * 2
  grp.position.set(o.x, o.y ?? 0, o.z)
  grp.userData.site = true
  return grp
}

/** 针叶塔松：干 + 3~4 层锥冠，深色背景林。 */
export function conifer(o: TreeOpt): THREE.Object3D {
  const rng = mulberry32((o.seed ?? 7) + 101)
  const s = o.scale ?? 1
  const grp = new THREE.Group()
  const th = 1.1
  const trunk = mesh(new THREE.CylinderGeometry(0.1, 0.17, th, 7), stdMaterial('#5D422B'))
  trunk.position.y = th / 2
  grp.add(trunk)
  const dark = o.tint ?? ['#4F6B52', '#587257', '#46604B'][Math.floor(rng() * 3)]
  const layers = 3 + (rng() < 0.5 ? 1 : 0)
  let y = th + 0.15
  let r = 1.35 + rng() * 0.3
  for (let i = 0; i < layers; i++) {
    const ch = 1.25 - i * 0.12
    const cone = mesh(new THREE.ConeGeometry(r, ch, 9), stdMaterial(dark, { roughness: 0.9 }))
    cone.position.y = y + ch / 2
    cone.rotation.y = rng() * 1.2
    grp.add(cone)
    y += ch * 0.62
    r *= 0.72
  }
  grp.scale.set(s, s, s)
  grp.rotation.y = o.rotY ?? rng() * Math.PI * 2
  grp.position.set(o.x, o.y ?? 0, o.z)
  grp.userData.site = true
  return grp
}

/** 垂柳：斜展干 + 扁球冠 + 下垂枝条（薄板，R13 自动豁免）。临水点睛。 */
export function willow(o: TreeOpt): THREE.Object3D {
  const rng = mulberry32((o.seed ?? 7) + 202)
  const s = o.scale ?? 1
  const grp = new THREE.Group()
  const trunk = mesh(new THREE.CylinderGeometry(0.16, 0.3, 2.2, 8), stdMaterial('#7A5A3A', { roughness: 0.95 }))
  trunk.position.y = 1.1
  grp.add(trunk)
  const lean = mesh(new THREE.CylinderGeometry(0.09, 0.14, 1.3, 6), stdMaterial('#7A5A3A'))
  lean.position.set(0.3, 2.7, 0.1)
  lean.rotation.z = -0.5
  grp.add(lean)
  const crown = mesh(new THREE.IcosahedronGeometry(1.55, 1), stdMaterial('#7A935F', { roughness: 0.92 }))
  crown.position.y = 3.4
  crown.scale.set(1.15, 0.62, 1.15)
  grp.add(crown)
  const tendrils = 8 + Math.floor(rng() * 4)
  const tm = stdMaterial('#6E8A55', { roughness: 0.9 })
  for (let i = 0; i < tendrils; i++) {
    const a = (i / tendrils) * Math.PI * 2 + rng() * 0.4
    const rr = 1.25 + rng() * 0.6
    const len = 1.5 + rng() * 1.3
    const t = mesh(new THREE.BoxGeometry(0.09, len, 0.05), tm)
    t.position.set(Math.cos(a) * rr, 3.4 - len / 2 + 0.35, Math.sin(a) * rr)
    t.rotation.z = Math.cos(a) * 0.12
    t.rotation.x = -Math.sin(a) * 0.12
    grp.add(t)
  }
  grp.scale.set(s, s, s)
  grp.rotation.y = o.rotY ?? rng() * Math.PI * 2
  grp.position.set(o.x, o.y ?? 0, o.z)
  grp.userData.site = true
  return grp
}

/** 白桦：浅色细干 + 疏朗小黄绿冠。列植于步道。 */
export function birch(o: TreeOpt): THREE.Object3D {
  const rng = mulberry32((o.seed ?? 7) + 303)
  const s = o.scale ?? 1
  const grp = new THREE.Group()
  const h = 4.2 + rng() * 1.4
  const trunk = mesh(new THREE.CylinderGeometry(0.09, 0.14, h, 8), stdMaterial('#DCD8CE', { roughness: 0.8 }))
  trunk.position.y = h / 2
  grp.add(trunk)
  for (let i = 0; i < 3; i++) {
    const bark = mesh(new THREE.BoxGeometry(0.2, 0.07, 0.04), stdMaterial('#3E3C3A'))
    bark.position.set(0.09, 1 + rng() * (h - 1.6), 0.05)
    grp.add(bark)
  }
  for (let i = 0; i < 3; i++) {
    const leaf = mesh(new THREE.IcosahedronGeometry(0.62 + rng() * 0.4, 0), stdMaterial(o.tint ?? '#93A86B', { roughness: 0.9 }))
    leaf.position.set((rng() - 0.5) * 1.5, h - 0.3 + rng() * 0.8, (rng() - 0.5) * 1.5)
    leaf.scale.y = 0.8
    grp.add(leaf)
  }
  grp.scale.set(s, s, s)
  grp.rotation.y = o.rotY ?? rng() * Math.PI * 2
  grp.position.set(o.x, o.y ?? 0, o.z)
  grp.userData.site = true
  return grp
}

/** 灌木球：一团或两团修剪冠。 */
export function shrub(o: TreeOpt): THREE.Object3D {
  const rng = mulberry32((o.seed ?? 7) + 404)
  const s = o.scale ?? 1
  const grp = new THREE.Group()
  const col = o.tint ?? ['#6D8258', '#7C8F60', '#5E7450'][Math.floor(rng() * 3)]
  const r0 = 0.55 + rng() * 0.35
  const b0 = mesh(new THREE.IcosahedronGeometry(r0, 1), stdMaterial(col, { roughness: 0.95 }))
  b0.position.y = r0 * 0.82
  b0.scale.y = 0.8
  grp.add(b0)
  if (rng() < 0.5) {
    const r1 = r0 * (0.5 + rng() * 0.2)
    const b1 = mesh(new THREE.IcosahedronGeometry(r1, 0), stdMaterial(col))
    b1.position.set((rng() - 0.5) * 1, r1 * 0.8, (rng() - 0.5) * 1)
    grp.add(b1)
  }
  grp.scale.set(s, s, s)
  grp.position.set(o.x, o.y ?? 0, o.z)
  grp.userData.site = true
  return grp
}

/** 芦苇丛：一把直立剑形叶片（自定义 BufferGeometry，一丛一个 mesh）。临水湿地用。 */
export function reedClump(o: { x: number; z: number; y?: number; scale?: number; seed?: number; tint?: string }): THREE.Object3D {
  const rng = mulberry32((o.seed ?? 7) + 505)
  const n = 9 + Math.floor(rng() * 5)
  const pos: number[] = []
  const pushBlade = (a: number, lean: number, h: number, w: number) => {
    const dx = Math.cos(a)
    const dz = Math.sin(a)
    const px = -dz * w * 0.5
    const pz = dx * w * 0.5
    const tipx = dx * lean
    const tipz = dz * lean
    // 双面四角（两个三角形 + 背面两个）
    const v = [
      [px, 0, pz], [-px, 0, -pz], [tipx + px * 0.2, h, tipz + pz * 0.2],
      [-px, 0, -pz], [tipx - px * 0.2, h, tipz - pz * 0.2], [tipx + px * 0.2, h, tipz + pz * 0.2],
      [px, 0, pz], [tipx + px * 0.2, h, tipz + pz * 0.2], [-px, 0, -pz],
      [-px, 0, -pz], [tipx - px * 0.2, h, tipz - pz * 0.2], [tipx + px * 0.2, h, tipz + pz * 0.2],
    ]
    for (const t of v) pos.push(t[0], t[1], t[2])
  }
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2
    pushBlade(a, (rng() - 0.5) * 0.55, 0.85 + rng() * 0.75, 0.055 + rng() * 0.03)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.computeVertexNormals()
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: o.tint ?? '#7E8C5C', roughness: 0.95, side: THREE.DoubleSide }),
  )
  m.castShadow = true
  const s = o.scale ?? 1
  m.scale.set(s, s, s)
  m.position.set(o.x, o.y ?? 0, o.z)
  m.userData.site = true
  return m
}

/** 花丛：合并为单个 BufferGeometry（茎=4 段棱柱、花=八面体），一丛一个 mesh。 */
export function flowerClump(o: { x: number; z: number; y?: number; scale?: number; seed?: number; tint?: string }): THREE.Object3D {
  const rng = mulberry32((o.seed ?? 7) + 606)
  const pos: number[] = []
  const col: number[] = []
  const stem = new THREE.Color('#67804F')
  const bloom = new THREE.Color(o.tint ?? ['#D9A0A0', '#E3C97B', '#C9B8E0', '#D98E6A', '#E0E0D2'][Math.floor(rng() * 5)])
  const v = new THREE.Vector3()
  const push = (geo: THREE.BufferGeometry, mat: THREE.Matrix4, c: THREE.Color): void => {
    const src = geo.index ? (geo.toNonIndexed() as THREE.BufferGeometry) : geo
    const p = src.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(mat)
      pos.push(v.x, v.y, v.z)
      col.push(c.r, c.g, c.b)
    }
    if (src !== geo) src.dispose()
    geo.dispose()
  }
  const m4 = new THREE.Matrix4()
  const n = 4 + Math.floor(rng() * 3)
  for (let i = 0; i < n; i++) {
    const h = 0.24 + rng() * 0.16
    const dx = (rng() - 0.5) * 0.5
    const dz = (rng() - 0.5) * 0.5
    m4.makeTranslation(dx, h / 2, dz)
    push(new THREE.CylinderGeometry(0.012, 0.016, h, 4, 1), m4, stem)
    m4.makeTranslation(dx, h + 0.03, dz)
    push(new THREE.OctahedronGeometry(0.055 + rng() * 0.04, 0), m4, bloom)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  geo.computeVertexNormals()
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }))
  m.castShadow = true
  const s = o.scale ?? 1
  m.scale.set(s, s, s)
  m.position.set(o.x, o.y ?? 0, o.z)
  m.userData.site = true
  return m
}

/** 景石：低多边形扁石，seed 控形。 */
export function boulder(o: { x: number; z: number; y?: number; r: number; seed?: number; tint?: string }): THREE.Object3D {
  const rng = mulberry32((o.seed ?? 7) + 707)
  const g = new THREE.IcosahedronGeometry(o.r, 1)
  const m = mesh(g, stdMaterial(o.tint ?? ['#8F8B82', '#9A968C', '#7E7B74'][Math.floor(rng() * 3)], { roughness: 0.92 }))
  m.position.set(o.x, (o.y ?? 0) + o.r * 0.42, o.z)
  m.scale.set(1 + rng() * 0.35, 0.6 + rng() * 0.2, 1 + rng() * 0.3)
  m.rotation.y = rng() * Math.PI
  m.userData.site = true
  return m
}

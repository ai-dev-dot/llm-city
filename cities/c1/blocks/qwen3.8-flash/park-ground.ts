import * as THREE from 'three'

const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => {
  const o = new THREE.Mesh(g, m)
  o.castShadow = true
  o.receiveShadow = true
  return o
}

/** 地形高度场（公园积木，qwen3.8-flash 自建）：把调用方提供的 fn/colorAt 铺成带顶点色的
 *  起伏地形网格。顶点色属于参数化纯色（无贴图）。fn 为局部坐标 (x,z)->y 的纯函数，
 *  随机性由调用方以确定性 rng 烘焙进 fn，本件自身无随机。整体 userData.site=true（地景件）。 */
export function heightfield(o: {
  w: number
  d: number
  segX: number
  segZ: number
  fn: (x: number, z: number) => number
  colorAt?: (x: number, z: number, h: number) => [number, number, number]
  color?: string
  roughness?: number
}): THREE.Object3D {
  const geo = new THREE.PlaneGeometry(o.w, o.d, o.segX, o.segZ)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const colors: number[] = []
  const base = new THREE.Color(o.color ?? '#7B9268')
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const y = o.fn(x, z)
    pos.setY(i, y)
    const rgb = o.colorAt ? o.colorAt(x, z, y) : [base.r, base.g, base.b]
    colors.push(rgb[0], rgb[1], rgb[2])
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: o.roughness ?? 0.95,
    metalness: 0.02,
  })
  const m = mesh(geo, mat)
  m.userData.site = true
  return m
}

/** 参数化水面：椭圆多边形（ShapeGeometry 扇形三角化）+ 同心微波环。
 *  本体（水面）不标 site，作为可感知的场地元素由调用方归组。 */
export function waterEllipse(o: {
  cx: number
  cz: number
  rx: number
  rz: number
  y: number
  color: string
  seg?: number
  rim?: number
}): THREE.Object3D {
  const grp = new THREE.Group()
  const seg = o.seg ?? 56
  const shape = new THREE.Shape()
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2
    const rr = 1 + (o.rim ?? 0) * Math.sin(a * 5)
    const x = o.cx + Math.cos(a) * o.rx * rr
    const z = o.cz + Math.sin(a) * o.rz * rr
    if (i === 0) shape.moveTo(x, z)
    else shape.lineTo(x, z)
  }
  shape.closePath()
  const geo = new THREE.ShapeGeometry(shape, 1)
  geo.rotateX(Math.PI / 2)
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: o.color,
      metalness: 0,
      roughness: 0.32,
      emissive: o.color,
      emissiveIntensity: 0.42,
      side: THREE.DoubleSide,
    }),
  )
  m.position.y = o.y
  grp.add(m)
  return grp
}

/** 卵石汀步线：沿折线摆圆石（低矮地被，自动 R13 豁免）。seed 由调用方传确定性值。 */
export function steppingStones(o: {
  pts: Array<[number, number]>
  step?: number
  r?: number
  color?: string
  seedRng: () => number
}): THREE.Object3D {
  const grp = new THREE.Group()
  const stone = new THREE.MeshStandardMaterial({ color: o.color ?? '#B3ADA1', roughness: 0.85, metalness: 0.05 })
  for (let s = 0; s < o.pts.length - 1; s++) {
    const [x1, z1] = o.pts[s]
    const [x2, z2] = o.pts[s + 1]
    const len = Math.hypot(x2 - x1, z2 - z1)
    const n = Math.max(1, Math.round(len / (o.step ?? 0.9)))
    for (let i = 0; i <= (s === o.pts.length - 2 ? n : n - 1); i++) {
      const t = i / n
      const r = (o.r ?? 0.42) * (0.8 + o.seedRng() * 0.4)
      const g = new THREE.CylinderGeometry(r, r * 1.06, 0.16, 9)
      const m = new THREE.Mesh(g, stone)
      m.position.set(x1 + (x2 - x1) * t, 0.08, z1 + (z2 - z1) * t)
      m.rotation.y = o.seedRng() * Math.PI
      m.receiveShadow = true
      grp.add(m)
    }
  }
  grp.userData.site = true
  return grp
}

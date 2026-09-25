import * as THREE from 'three'
import { mat } from './mat'

/** 位姿矩阵：位移 + 欧拉角 + 三轴缩放 */
export function mat4(
  x = 0, y = 0, z = 0,
  rx = 0, ry = 0, rz = 0,
  sx = 1, sy = 1, sz = 1,
): THREE.Matrix4 {
  const m = new THREE.Matrix4()
  m.compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz),
  )
  return m
}

/** 在已有基准位姿的局部坐标系上再叠加一次变换（构件沿斜面/弧面排布用） */
export function on(
  base: THREE.Matrix4,
  dx = 0, dy = 0, dz = 0,
  rx = 0, ry = 0, rz = 0,
  sx = 1, sy = 1, sz = 1,
): THREE.Matrix4 {
  return base.clone().multiply(mat4(dx, dy, dz, rx, ry, rz, sx, sy, sz))
}

/** 几何合并：把成千上万颗铆钉/枕木/压条/瓦鳞并成「每材质一个 mesh」——
 *  面数一分不少，绘制批次骤降（本城 inspect 的 R11 mesh 底线由大件独立 mesh 满足）。 */
export function mergeGeos(items: Array<{ geo: THREE.BufferGeometry; m: THREE.Matrix4 }>): THREE.BufferGeometry {
  const pos: number[] = []
  const nor: number[] = []
  const v = new THREE.Vector3()
  const nv = new THREE.Vector3()
  const n3 = new THREE.Matrix3()
  for (const it of items) {
    const src = it.geo.index ? it.geo.toNonIndexed() : it.geo
    const p = src.attributes.position as THREE.BufferAttribute
    const q = src.attributes.normal as THREE.BufferAttribute | undefined
    n3.getNormalMatrix(it.m)
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(it.m)
      pos.push(v.x, v.y, v.z)
      if (q) {
        nv.fromBufferAttribute(q, i).applyMatrix3(n3).normalize()
      } else {
        nv.set(0, 1, 0)
      }
      nor.push(nv.x, nv.y, nv.z)
    }
    if (src !== it.geo) src.dispose()
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.computeBoundingSphere()
  g.computeBoundingBox()
  return g
}

/** 确定性抖动：同一 (i,k) 永远给同一值，用来给道砟/瓦片/砌块做微差（禁随机源，见 R5） */
export function hash01(i: number, k = 0): number {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return s - Math.floor(s)
}

/** 装配器：同一个 Asm 收集一个子系统的全部构件。
 *  - box/cyl/sph/mesh：独立 mesh（大件，需要自己的包围盒参与退线判定）
 *  - qBox/qCyl/qSph/q：入合并池（小重复件），最后 flush() 压成每材质一个 mesh
 *  构造时 site:true → 整组打 userData.site（退线豁免的景观件/场地件） */
export class Asm {
  readonly root: THREE.Group
  private pools = new Map<string, Array<{ geo: THREE.BufferGeometry; m: THREE.Matrix4 }>>()
  private kids: Asm[] = []

  constructor(opts: { site?: boolean; name?: string } = {}) {
    this.root = new THREE.Group()
    if (opts.name) this.root.name = opts.name
    if (opts.site) this.root.userData.site = true
  }

  put<T extends THREE.Object3D>(o: T): T {
    this.root.add(o)
    return o
  }

  /** 子装配：自带位姿的局部坐标系（构件按局部 X 建模、整体旋转就位时用） */
  sub(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, name?: string): Asm {
    const kid = new Asm({ name })
    kid.root.position.set(x, y, z)
    kid.root.rotation.set(rx, ry, rz)
    this.root.add(kid.root)
    this.kids.push(kid)
    return kid
  }

  mesh(geo: THREE.BufferGeometry, key: string, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): THREE.Mesh {
    const o = new THREE.Mesh(geo, mat(key))
    o.position.set(x, y, z)
    o.rotation.set(rx, ry, rz)
    o.castShadow = true
    o.receiveShadow = true
    this.root.add(o)
    return o
  }

  box(key: string, w: number, h: number, d: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): THREE.Mesh {
    return this.mesh(new THREE.BoxGeometry(w, h, d), key, x, y, z, rx, ry, rz)
  }

  cyl(key: string, rt: number, rb: number, h: number, seg: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): THREE.Mesh {
    return this.mesh(new THREE.CylinderGeometry(rt, rb, h, seg), key, x, y, z, rx, ry, rz)
  }

  sph(key: string, r: number, ws: number, hs: number, x = 0, y = 0, z = 0): THREE.Mesh {
    return this.mesh(new THREE.SphereGeometry(r, ws, hs), key, x, y, z)
  }

  /** 入合并池 */
  q(key: string, geo: THREE.BufferGeometry, m?: THREE.Matrix4): void {
    const arr = this.pools.get(key)
    if (arr) arr.push({ geo, m: m ?? new THREE.Matrix4() })
    else this.pools.set(key, [{ geo, m: m ?? new THREE.Matrix4() }])
  }

  qBox(key: string, w: number, h: number, d: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): void {
    this.q(key, new THREE.BoxGeometry(w, h, d), mat4(x, y, z, rx, ry, rz))
  }

  qCyl(key: string, rt: number, rb: number, h: number, seg: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): void {
    this.q(key, new THREE.CylinderGeometry(rt, rb, h, seg), mat4(x, y, z, rx, ry, rz))
  }

  qSph(key: string, r: number, ws: number, hs: number, x = 0, y = 0, z = 0): void {
    this.q(key, new THREE.SphereGeometry(r, ws, hs), mat4(x, y, z))
  }

  qExtrude(key: string, shape: THREE.Shape, depth: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, curveSegments = 6): void {
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments, steps: 1 })
    geo.translate(0, 0, -depth / 2)
    this.q(key, geo, mat4(x, y, z, rx, ry, rz))
  }

  /** 把合并池落成 mesh（含子装配；可多次调用，池空则无操作） */
  flush(): number {
    let made = 0
    for (const kid of this.kids) made += kid.flush()
    for (const [key, items] of this.pools) {
      if (!items.length) continue
      const o = new THREE.Mesh(mergeGeos(items), mat(key))
      o.castShadow = true
      o.receiveShadow = true
      this.root.add(o)
      made++
    }
    this.pools.clear()
    return made
  }

  get pending(): number {
    let n = 0
    for (const items of this.pools.values()) n += items.length
    return n
  }
}

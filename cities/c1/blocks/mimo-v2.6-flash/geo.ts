import * as THREE from 'three'

/** 盒件合并器：把一批盒体合成单一 BufferGeometry——R11 面数预算靠密梃细部堆，
 * 合并避免碎 mesh 爆量；面数计数按 index.count/3 与 traverse 一致。 */
export interface BoxPart {
  /** 尺寸（全宽/全高/全深） */
  w: number; h: number; d: number
  /** 盒体中心 */
  x: number; y: number; z: number
  /** 绕 Y 轴旋转（弧度） */
  ry?: number
}

// unit box 六面：每面 4 顶点（共享法线）+ 2 三角，法线朝外
const FACES: Array<{ n: [number, number, number]; v: Array<[number, number, number]> }> = [
  { n: [1, 0, 0], v: [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]] },
  { n: [-1, 0, 0], v: [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]] },
  { n: [0, 1, 0], v: [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]] },
  { n: [0, -1, 0], v: [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]] },
  { n: [0, 0, 1], v: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
  { n: [0, 0, -1], v: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
]

export function mergeBoxes(parts: BoxPart[]): THREE.BufferGeometry {
  const pos: number[] = []
  const nor: number[] = []
  const idx: number[] = []
  let base = 0
  for (const p of parts) {
    const c = p.ry ? Math.cos(p.ry) : 1
    const s = p.ry ? Math.sin(p.ry) : 0
    const hx = p.w / 2, hy = p.h / 2, hz = p.d / 2
    for (const f of FACES) {
      const nx = f.n[0] * c + f.n[2] * s
      const nz = -f.n[0] * s + f.n[2] * c
      for (const v of f.v) {
        const lx = v[0] * hx, ly = v[1] * hy, lz = v[2] * hz
        pos.push(lx * c + lz * s + p.x, ly + p.y, -lx * s + lz * c + p.z)
        nor.push(nx, f.n[1], nz)
      }
    }
    // 每面 4 顶点顺序入栈后统一补索引
    const faceBase = base
    for (let f = 0; f < 6; f++) {
      const o = faceBase + f * 4
      idx.push(o, o + 1, o + 2, o, o + 2, o + 3)
    }
    base += 24
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setIndex(idx)
  return g
}

/** 合并盒体 → 单 mesh（material 复用） */
export function mergeBoxMesh(parts: BoxPart[], mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(mergeBoxes(parts), mat)
  m.castShadow = true
  return m
}

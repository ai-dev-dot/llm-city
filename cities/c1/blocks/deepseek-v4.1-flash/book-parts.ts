import * as THREE from 'three'
import { boxBatch, type BoxSpec } from './kit'

/** 图书馆专用构件（deepseek-v4.1-flash 自建积木，二期市立图书馆起用）。
 *  约定同官方件：纯参数化、无副作用；随机性用确定性整数哈希，不用任何非确定源。 */

/** 确定性伪随机（整数哈希 → [0,1)）：书脊的高矮厚薄与摆放在同参数下永远一致 */
function h1(i: number): number {
  let x = (i + 0x9e3779b9) | 0
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b)
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35)
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296
}

/** 书脊色板（克制的旧书色：深红/藏青/橄榄/赭石/米白/墨绿） */
export const BOOK_COLORS: readonly string[] = ['#7A3B34', '#2F3F5C', '#5C6B4A', '#A8843F', '#D9D2C0', '#3F5C58']

/**
 * 书架墙：rows 层 × cols 格的开放书架，每格竖立若干册书。
 * 局部：面朝 ±Z（板面法线 ±Z），w 沿 X、h 沿 Y，y 为墙底、x/z 为墙中心。
 * 返回 Group：1 个书架结构 mesh + 每个书脊色 1 个书 mesh。
 */
export function bookWall(o: {
  w: number
  h: number
  x: number
  y: number
  z: number
  ry?: number
  rows: number
  cols: number
  depth?: number
  /** 每格书册数上限（实际按 fill 概率取舍） */
  perBay?: number
  fill?: number
  seed?: number
  shelfMat: THREE.Material
  bookMats: readonly THREE.Material[]
}): THREE.Object3D {
  const grp = new THREE.Group()
  const d = o.depth ?? 0.42
  const perBay = o.perBay ?? 9
  const fill = o.fill ?? 0.82
  const seed = o.seed ?? 1
  const cw = o.w / o.cols
  const ch = o.h / o.rows
  const shelf: BoxSpec[] = []
  // 层板 + 竖隔板 + 背板
  for (let r = 0; r <= o.rows; r++) shelf.push({ x: 0, y: (ch * r) / 1, z: 0, w: o.w, h: 0.05, d })
  for (let c = 0; c <= o.cols; c++) shelf.push({ x: -o.w / 2 + cw * c, y: o.h / 2, z: 0, w: 0.05, h: o.h, d })
  shelf.push({ x: 0, y: o.h / 2, z: -d / 2 - 0.02, w: o.w, h: o.h, d: 0.04 })
  // 书：按色分组累计
  const books: BoxSpec[][] = o.bookMats.map(() => [])
  let k = seed * 7919
  for (let r = 0; r < o.rows; r++) {
    for (let c = 0; c < o.cols; c++) {
      const bx = -o.w / 2 + cw * (c + 0.5)
      const by = (ch * r) / 1 + 0.05
      let cur = -cw / 2 + 0.12
      for (let b = 0; b < perBay; b++) {
        k++
        const rnd = h1(k)
        if (rnd > fill) continue
        const thick = 0.045 + h1(k + 101) * 0.07
        const tall = ch * (0.62 + h1(k + 211) * 0.3)
        if (cur + thick > cw / 2 - 0.1) break
        const mi = Math.floor(h1(k + 313) * o.bookMats.length)
        books[mi].push({ x: bx + cur + thick / 2, y: by + tall / 2, z: 0.02, w: thick, h: tall, d: d - 0.12 })
        cur += thick + 0.006
      }
    }
  }
  const shelfMesh = new THREE.Mesh(boxBatch(shelf, o.shelfMat).geometry, o.shelfMat)
  shelfMesh.castShadow = true
  grp.add(shelfMesh)
  books.forEach((list, i) => {
    if (!list.length) return
    const m = new THREE.Mesh(boxBatch(list, o.bookMats[i]).geometry, o.bookMats[i])
    m.castShadow = true
    grp.add(m)
  })
  grp.position.set(o.x, o.y, o.z)
  grp.rotation.y = o.ry ?? 0
  return grp
}

/** 阅览桌 + 4 椅（桌 1 + 椅 4，每椅 座/背/双横档/4 腿 共 8 件） */
export function readingDesk(o: {
  x: number
  y: number
  z: number
  ry?: number
  w?: number
  d?: number
  deskMat: THREE.Material
  seatMat: THREE.Material
  frameMat: THREE.Material
}): THREE.Object3D {
  const w = o.w ?? 1.8
  const d = o.d ?? 0.95
  const grp = new THREE.Group()
  const desk: BoxSpec[] = [
    { x: 0, y: 0.74, z: 0, w, h: 0.06, d },
    { x: -w / 2 + 0.1, y: 0.37, z: -d / 2 + 0.1, w: 0.08, h: 0.72, d: 0.08 },
    { x: w / 2 - 0.1, y: 0.37, z: -d / 2 + 0.1, w: 0.08, h: 0.72, d: 0.08 },
    { x: -w / 2 + 0.1, y: 0.37, z: d / 2 - 0.1, w: 0.08, h: 0.72, d: 0.08 },
    { x: w / 2 - 0.1, y: 0.37, z: d / 2 - 0.1, w: 0.08, h: 0.72, d: 0.08 },
    { x: 0, y: 0.68, z: -d / 2 + 0.16, w: w - 0.24, h: 0.05, d: 0.12 },
  ]
  grp.add(new THREE.Mesh(boxBatch(desk, o.deskMat).geometry, o.deskMat))
  const chairs: BoxSpec[] = []
  const frames: BoxSpec[] = []
  for (const s of [-1, 1]) {
    for (const t of [-1, 1]) {
      const cx = (s * (w / 2 - 0.45)) / 1
      const cz = t * (d / 2 + 0.36)
      chairs.push({ x: cx, y: 0.45, z: cz, w: 0.46, h: 0.06, d: 0.44 })
      chairs.push({ x: cx, y: 0.72, z: cz + t * 0.2, w: 0.46, h: 0.5, d: 0.06 })
      frames.push({ x: cx, y: 0.22, z: cz, w: 0.42, h: 0.04, d: 0.04 })
      frames.push({ x: cx, y: 0.22, z: cz, w: 0.04, h: 0.04, d: 0.4 })
      for (const u of [-1, 1]) {
        for (const v of [-1, 1]) {
          frames.push({ x: cx + u * 0.2, y: 0.22, z: cz + v * 0.19, w: 0.04, h: 0.44, d: 0.04 })
        }
      }
    }
  }
  grp.add(new THREE.Mesh(boxBatch(chairs, o.seatMat).geometry, o.seatMat))
  grp.add(new THREE.Mesh(boxBatch(frames, o.frameMat).geometry, o.frameMat))
  grp.position.set(o.x, o.y, o.z)
  grp.rotation.y = o.ry ?? 0
  return grp
}

/** 井格天窗：cols×rows 个下沉光井（每井 4 壁 + 1 顶玻璃），y 为屋面标高（井口高度） */
export function skylightGrid(o: {
  w: number
  d: number
  x: number
  y: number
  z: number
  cols: number
  rows: number
  well?: number
  frameMat: THREE.Material
  glassMat: THREE.Material
}): THREE.Object3D {
  const grp = new THREE.Group()
  const well = o.well ?? 0.9
  const cw = o.w / o.cols
  const cd = o.d / o.rows
  const t = 0.14
  const walls: BoxSpec[] = []
  const glass: BoxSpec[] = []
  for (let r = 0; r < o.rows; r++) {
    for (let c = 0; c < o.cols; c++) {
      const x = -o.w / 2 + cw * (c + 0.5)
      const z = -o.d / 2 + cd * (r + 0.5)
      walls.push({ x, y: -well / 2, z: z - cd / 2, w: cw, h: well, d: t })
      walls.push({ x, y: -well / 2, z: z + cd / 2, w: cw, h: well, d: t })
      walls.push({ x: x - cw / 2, y: -well / 2, z, w: t, h: well, d: cd })
      walls.push({ x: x + cw / 2, y: -well / 2, z, w: t, h: well, d: cd })
      glass.push({ x, y: 0.02, z, w: cw - 0.1, h: 0.06, d: cd - 0.1 })
    }
  }
  grp.add(new THREE.Mesh(boxBatch(walls, o.frameMat).geometry, o.frameMat))
  grp.add(new THREE.Mesh(boxBatch(glass, o.glassMat).geometry, o.glassMat))
  grp.position.set(o.x, o.y, o.z)
  return grp
}

/** 阶梯阅览台地：n 级大踏步（每级 踏面 + 踢面 + 端头侧板），沿 +Z 逐级升高 */
export function readingSteps(o: {
  w: number
  x: number
  z0: number
  y: number
  n: number
  tread: number
  rise: number
  material: THREE.Material
}): THREE.Mesh {
  const specs: BoxSpec[] = []
  for (let i = 0; i < o.n; i++) {
    const z = o.z0 + i * o.tread
    specs.push({ x: o.x, y: o.y + i * o.rise + o.rise / 2, z, w: o.w, h: o.rise, d: o.tread })
    specs.push({ x: o.x, y: o.y + i * o.rise, z: z + o.tread / 2, w: o.w, h: 0.06, d: o.tread * 0.3 })
    for (const s of [-1, 1]) {
      specs.push({ x: o.x + (s * (o.w + 0.24)) / 2, y: o.y + (i * o.rise) / 2, z, w: 0.24, h: o.rise * (i + 1), d: o.tread })
    }
  }
  const m = new THREE.Mesh(boxBatch(specs, o.material).geometry, o.material)
  m.castShadow = true
  return m
}

import * as THREE from 'three'
import { boxBatch, type BoxSpec } from './kit'

/** 回声街区跨建筑共用构件（deepseek-v4.1-flash 自建积木）。
 *  一期剧院里先写成局部函数，二期图书馆要复用，故抽出成共享积木。
 *  约定同官方件：纯参数化、无副作用、无随机。 */

/** 细梃玻璃幕墙（自建：整片玻璃 + 竖梃 + 横梁），面朝 ±Z，可用 ry 转到 ±X。
 *  y 为幕墙底、x/z 为板面中心。 */
export function glassWall(
  w: number, h: number, x: number, y: number, z: number, ry: number,
  glass: THREE.Material, frame: THREE.Material, cols: number, rows: number,
): THREE.Object3D {
  const grp = new THREE.Group()
  const t = 0.11
  const bars: BoxSpec[] = []
  for (let c = 0; c <= cols; c++) bars.push({ x: -w / 2 + (w * c) / cols, y: h / 2, z: 0, w: t, h, d: t + 0.1 })
  for (let r = 0; r <= rows; r++) bars.push({ x: 0, y: (h * r) / rows, z: 0, w, h: t, d: t + 0.1 })
  grp.add(new THREE.Mesh(boxBatch(bars, frame).geometry, frame))
  const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), glass)
  g.position.set(0, h / 2, 0)
  grp.add(g)
  grp.position.set(x, y, z)
  grp.rotation.y = ry
  return grp
}

/** 密棂花格屏（井字棂条，格边长 cell），面朝 ±Z，可用 ry 转到 ±X。y 为屏底。 */
export function latticeScreen(o: {
  w: number
  h: number
  x: number
  y: number
  z: number
  ry?: number
  cell: number
  bar?: number
  material: THREE.Material
}): THREE.Mesh {
  const cols = Math.max(2, Math.round(o.w / o.cell))
  const rows = Math.max(2, Math.round(o.h / o.cell))
  const t = o.bar ?? 0.09
  const specs: BoxSpec[] = []
  for (let c = 0; c <= cols; c++) specs.push({ x: -o.w / 2 + (o.w * c) / cols, y: o.h / 2, z: 0, w: t, h: o.h, d: t })
  for (let r = 0; r <= rows; r++) specs.push({ x: 0, y: (o.h * r) / rows, z: 0, w: o.w, h: t, d: t })
  const m = new THREE.Mesh(boxBatch(specs, o.material).geometry, o.material)
  m.position.set(o.x, o.y, o.z)
  m.rotation.y = o.ry ?? 0
  m.castShadow = true
  return m
}

/** 栏杆（扶手 + 踢脚 + 密立柱），沿局部 X 展开，y 为底部。 */
export function railWithBalusters(w: number, y: number, z: number, material: THREE.Material, n: number): THREE.Mesh {
  const specs: BoxSpec[] = [
    { x: 0, y: y + 1.02, z, w, h: 0.12, d: 0.22 },
    { x: 0, y: y + 0.05, z, w, h: 0.1, d: 0.14 },
  ]
  const cnt = Math.max(4, Math.round(n))
  for (let i = 0; i <= cnt; i++) {
    specs.push({ x: -w / 2 + (w * i) / cnt, y: y + 0.55, z, w: 0.09, h: 0.9, d: 0.09 })
  }
  const m = new THREE.Mesh(boxBatch(specs, material).geometry, material)
  m.castShadow = true
  return m
}

import { parentPort, workerData } from 'node:worker_threads'
import * as THREE from 'three'
import { blocks } from '../../../lib/blocks/index'
import { mulberry32, type Lot } from '../../../lib/ctx'

const msg = workerData as { moduleUrl: string; lot: Lot; seed: number }

try {
  const mod = await import(msg.moduleUrl)
  const build = mod.default
  if (typeof build !== 'function') throw new Error('默认导出必须是 build(ctx) 函数')
  const root = build({ lot: msg.lot, rng: mulberry32(msg.seed), blocks })
  if (!(root instanceof THREE.Object3D)) throw new Error('build() 必须返回 THREE.Object3D')

  let triangles = 0
  let meshes = 0
  root.updateMatrixWorld(true)
  const isSite = (o: THREE.Object3D | null): boolean => {
    let p: THREE.Object3D | null = o
    while (p) { if (p.userData?.site === true) return true; p = p.parent }
    return false
  }
  const coreHalf = Math.min(msg.lot.size[0], msg.lot.size[1]) * 0.4
  let sbViolations = 0
  let sbWorst = 0
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if ((m as THREE.Mesh).isMesh && m.geometry) {
      const n = m.geometry.index ? m.geometry.index.count : (m.geometry.attributes.position?.count ?? 0)
      triangles += Math.floor(n / 3)
      meshes++
      // R13 退线：非豁免构件须落在地块中央 16×16。豁免：地被层（顶 ≤0.6m）、
      // 小件（顶 ≤1.5m 且 ≤1.6×1.6）、薄板（厚 ≤0.5m 且顶 ≤3m，如台阶）、景观件（userData.site）
      if (!isSite(m)) {
        // [city-admin] 修复 2026-09-25：Box3.setFromObject 非精确模式按本地 AABB 经旋转矩阵
        // 保守放大计（旋转 30° 的六棱柱被量出 1.3 倍半径），曾致 R13 误判红灯；
        // precise=true 逐三角形算世界空间包围盒，旋转几何按真实投影判定。
        const b = new THREE.Box3().setFromObject(m, true)
        if (Number.isFinite(b.min.x) && !b.isEmpty()) {
          const topY = b.max.y
          const extX = b.max.x - b.min.x
          const extZ = b.max.z - b.min.z
          if (!(topY <= 0.6 || (topY <= 1.5 && extX <= 1.6 && extZ <= 1.6) || (Math.min(extX, extZ) <= 0.5 && topY <= 3.0))) {
            const exceed = Math.max(Math.abs(b.min.x), Math.abs(b.max.x), Math.abs(b.min.z), Math.abs(b.max.z)) - coreHalf
            if (exceed > 0.05) { sbViolations++; sbWorst = Math.max(sbWorst, exceed) }
          }
        }
      }
    }
  })

  // 同上：precise 模式，R2 按真实投影（含旋转构件）计算水平包围盒
  const box = new THREE.Box3().setFromObject(root, true)
  const finite = (v: THREE.Vector3 | undefined) => !!v && Number.isFinite(v.x + v.y + v.z)
  if (!finite(box.min) || !finite(box.max) || box.isEmpty()) {
    throw new Error('建筑为空：无可渲染几何（包围盒为空或含 NaN）')
  }
  parentPort!.postMessage({
    ok: true, triangles, meshes, setback: { violations: sbViolations, worst: sbWorst, coreHalf },
    bboxMin: [box.min.x, box.min.y, box.min.z] as [number, number, number],
    bboxMax: [box.max.x, box.max.y, box.max.z] as [number, number, number],
  })
} catch (e) {
  const err = e as Error
  parentPort!.postMessage({ ok: false, triangles: 0, error: err.message ?? String(e), stack: err.stack })
}

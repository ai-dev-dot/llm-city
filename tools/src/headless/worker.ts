import { parentPort, workerData } from 'node:worker_threads'
import * as THREE from 'three'
import { blocks } from '../../../lib/blocks/index'
import { mulberry32, type Lot } from '../../../lib/ctx'
import { computeSetback } from './setback'

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
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh && m.geometry) {
      const n = m.geometry.index ? m.geometry.index.count : (m.geometry.attributes.position?.count ?? 0)
      triangles += Math.floor(n / 3)
      meshes++
    }
  })

  // R13 退线：判定在 ./setback，与 `npm run probe` 共用同一份逻辑（豁免建筑靠后者自查数字）
  const setback = computeSetback(root, msg.lot.size)

  // 同上：precise 模式，R2 按真实投影（含旋转构件）计算水平包围盒
  const box = new THREE.Box3().setFromObject(root, true)
  const finite = (v: THREE.Vector3 | undefined) => !!v && Number.isFinite(v.x + v.y + v.z)
  if (!finite(box.min) || !finite(box.max) || box.isEmpty()) {
    throw new Error('建筑为空：无可渲染几何（包围盒为空或含 NaN）')
  }
  parentPort!.postMessage({
    ok: true, triangles, meshes, setback,
    bboxMin: [box.min.x, box.min.y, box.min.z] as [number, number, number],
    bboxMax: [box.max.x, box.max.y, box.max.z] as [number, number, number],
  })
} catch (e) {
  const err = e as Error
  parentPort!.postMessage({ ok: false, triangles: 0, error: err.message ?? String(e), stack: err.stack })
}

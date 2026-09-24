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
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if ((m as THREE.Mesh).isMesh && m.geometry) {
      const n = m.geometry.index ? m.geometry.index.count : (m.geometry.attributes.position?.count ?? 0)
      triangles += Math.floor(n / 3)
    }
  })

  const box = new THREE.Box3().setFromObject(root)
  const finite = (v: THREE.Vector3 | undefined) => !!v && Number.isFinite(v.x + v.y + v.z)
  if (!finite(box.min) || !finite(box.max) || box.isEmpty()) {
    throw new Error('建筑为空：无可渲染几何（包围盒为空或含 NaN）')
  }
  parentPort!.postMessage({
    ok: true, triangles,
    bboxMin: [box.min.x, box.min.y, box.min.z] as [number, number, number],
    bboxMax: [box.max.x, box.max.y, box.max.z] as [number, number, number],
  })
} catch (e) {
  const err = e as Error
  parentPort!.postMessage({ ok: false, triangles: 0, error: err.message ?? String(e), stack: err.stack })
}

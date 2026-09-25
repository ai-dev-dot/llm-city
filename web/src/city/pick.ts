import * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** 平滑运镜：pos 与 target 同步插值；返回 cancel */
export function flyTo(
  camera: THREE.PerspectiveCamera, controls: OrbitControls,
  pos: THREE.Vector3, target: THREE.Vector3, durationMs = 1600,
): () => void {
  const p0 = camera.position.clone(), t0 = controls.target.clone()
  const start = performance.now()
  let cancelled = false
  const tick = () => {
    if (cancelled) return
    const k = Math.min(1, (performance.now() - start) / durationMs)
    const e = easeInOutCubic(k)
    camera.position.lerpVectors(p0, pos, e)
    controls.target.lerpVectors(t0, target, e)
    controls.update()
    if (k < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  return () => { cancelled = true }
}

export function setupPicking(
  canvas: HTMLCanvasElement, camera: THREE.PerspectiveCamera, controls: OrbitControls,
  pickRoot: THREE.Object3D, onHover: (id: string | null, ev: PointerEvent) => void,
  onClick: (id: string) => void,
): void {
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  let lastMove = 0
  let hoverId: string | null = null
  const castAt = (ev: PointerEvent): string | null => {
    const rect = canvas.getBoundingClientRect()
    ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1)
    raycaster.setFromCamera(ndc, camera)
    const hits = raycaster.intersectObject(pickRoot, true)
    for (const h of hits) {
      const o = h.object
      let cur: THREE.Object3D | null = o
      while (cur) { if (cur.userData?.buildingId) return cur.userData.buildingId as string; cur = cur.parent }
    }
    return null
  }
  canvas.addEventListener('pointermove', (ev) => {
    const now = performance.now()
    if (now - lastMove < 50) return
    lastMove = now
    hoverId = castAt(ev)
    onHover(hoverId, ev)
  })
  canvas.addEventListener('click', (ev) => {
    const id = castAt(ev)
    if (id) onClick(id)
  })
}

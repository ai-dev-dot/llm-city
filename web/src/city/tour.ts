import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { SceneBundle } from './scene'
import { flyTo } from './pick'

export type TourRouteId = 'plazaOrbit' | 'boulevard' | 'ascend' | 'buildingOrbit' | 'off'

export function buildRoutePoints(route: TourRouteId, opts?: { buildingCenter?: THREE.Vector3; buildingRadius?: number }): THREE.Vector3[] {
  if (route === 'plazaOrbit') {
    const r = 210, y = 95
    return [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
      const a = (i / 8) * Math.PI * 2
      return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r)
    })
  }
  if (route === 'boulevard') {
    return [
      new THREE.Vector3(-300, 45, 6), new THREE.Vector3(-100, 40, 10), new THREE.Vector3(100, 42, -8),
      new THREE.Vector3(300, 48, -6), new THREE.Vector3(100, 42, 8), new THREE.Vector3(-100, 40, -10),
    ]
  }
  if (route === 'ascend') {
    return [
      new THREE.Vector3(180, 6, 180), new THREE.Vector3(120, 60, 160), new THREE.Vector3(60, 140, 120),
      new THREE.Vector3(20, 260, 60), new THREE.Vector3(0, 380, 10), new THREE.Vector3(-30, 460, -40),
    ]
  }
  // buildingOrbit
  const c = opts?.buildingCenter ?? new THREE.Vector3()
  const r = opts?.buildingRadius ?? 40
  const y = c.y + r * 0.5
  return [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
    const a = (i / 8) * Math.PI * 2
    return new THREE.Vector3(c.x + Math.cos(a) * r, y, c.z + Math.sin(a) * r)
  })
}

const PRESETS: Record<'panorama' | 'plaza' | 'aerial', { pos: THREE.Vector3; target: THREE.Vector3 }> = {
  panorama: { pos: new THREE.Vector3(420, 300, 420), target: new THREE.Vector3(0, 0, 0) },
  plaza: { pos: new THREE.Vector3(60, 40, 120), target: new THREE.Vector3(0, 8, 0) },
  aerial: { pos: new THREE.Vector3(0.1, 520, 0.1), target: new THREE.Vector3(0, 0, 0) },
}

export type TourPreset = keyof typeof PRESETS

export class TourController {
  private curve: THREE.CatmullRomCurve3 | null = null
  private t = 0
  private speed = 1
  private lookAt: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  private route: TourRouteId = 'off'
  private raf = 0
  private lastTs = 0
  private stopFly: (() => void) | null = null

  constructor(private bundle: SceneBundle) {
    bundle.controls.addEventListener('start', () => this.stop())   // 用户接管即停巡航
  }

  get current() { return this.route }

  start(route: TourRouteId, opts?: { buildingCenter?: THREE.Vector3; buildingRadius?: number; lookAt?: THREE.Vector3 }) {
    const pts = buildRoutePoints(route, opts)
    this.curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.4)
    this.route = route
    this.t = 0
    if (opts?.lookAt) this.lookAt = opts.lookAt
    else if (route === 'buildingOrbit' && opts?.buildingCenter) this.lookAt = opts.buildingCenter.clone()
    else this.lookAt = new THREE.Vector3(0, 30, 0)
    this.lastTs = 0
    cancelAnimationFrame(this.raf)
    const tick = (ts: number) => {
      if (!this.curve) return
      if (this.lastTs) this.t += ((ts - this.lastTs) / 1000) * 0.02 * this.speed   // 一圈约 50s（1x）
      this.lastTs = ts
      const pos = this.curve.getPointAt(this.t % 1)
      this.bundle.camera.position.copy(pos)
      this.bundle.controls.target.copy(this.lookAt)
      this.bundle.controls.update()
      this.raf = requestAnimationFrame(tick)
    }
    this.raf = requestAnimationFrame(tick)
  }

  setSpeed(mult: 1 | 0.5 | 2) { this.speed = mult }

  stop() {
    if (this.route === 'off' && !this.curve) return
    this.route = 'off'
    this.curve = null
    cancelAnimationFrame(this.raf)
    this.stopFly?.(); this.stopFly = null
  }

  flyToPreset(preset: TourPreset) {
    this.stop()
    const p = PRESETS[preset]
    this.stopFly = flyTo(this.bundle.camera, this.bundle.controls, p.pos.clone(), p.target.clone())
  }
}

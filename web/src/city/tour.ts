import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { SceneBundle } from './scene'
import { flyTo } from './pick'

export type TourRouteId = 'plazaOrbit' | 'boulevard' | 'ascend' | 'buildingOrbit' | 'off'

/** 巡航范围的几何描述：街区模式=当前街区，全城=全城。全局路线以此为心生成，
 *  并按范围内最高楼顶（topY，挂载建筑实测，未挂载完=0 由公式兜底）适配高度——
 *  高街区抬升巡航看到楼顶，矮街区贴地看街景，不再硬编码绕中央广场。 */
export interface TourArea {
  center: [number, number]   // XZ 中心
  radius: number             // XZ 基准半径（街区边长/全城尺度派生）
  topY: number               // 范围内最高楼顶绝对高度（y=0 地面）
}

/** 由范围几何派生三条全局路线的机位参数（导出供测试锁定「最高楼楼顶入画」的比例：
 *  相机 fov55 竖直半角 27.5°，(topY-orbitLookY)/r 的仰角须小于它）。 */
export function tourAreaGeometry(a: TourArea) {
  const r = Math.max(a.radius, a.topY * 1.25, 40)              // 楼越高环得越远，楼顶仰角才压得下来
  const orbitY = Math.max(a.topY * 0.62, r * 0.35, 16)         // 环绕高度：看楼身中上部而非楼脚
  const orbitLookY = Math.max(Math.min(a.topY * 0.42, orbitY * 0.8), 6)
  const boulevardY = Math.max(Math.min(a.topY * 0.22, 45), 14) // 穿街低飞：街道视角
  const boulevardLookY = Math.max(orbitLookY * 0.5, 6)
  const ascendEndY = Math.max(a.topY * 2.3, r * 1.6)           // 爬升终点：升到能俯瞰整个范围
  return { r, orbitY, orbitLookY, boulevardY, boulevardLookY, ascendEndY }
}

export function buildRoutePoints(
  route: TourRouteId,
  opts?: { buildingCenter?: THREE.Vector3; buildingRadius?: number; area?: TourArea },
): THREE.Vector3[] {
  const area = opts?.area
  if (route === 'plazaOrbit') {
    if (!area) {
      const r = 210, y = 95
      return [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i / 8) * Math.PI * 2
        return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r)
      })
    }
    const { r, orbitY } = tourAreaGeometry(area)
    return [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
      const a = (i / 8) * Math.PI * 2
      return new THREE.Vector3(area.center[0] + Math.cos(a) * r, orbitY, area.center[1] + Math.sin(a) * r)
    })
  }
  if (route === 'boulevard') {
    if (!area) {
      return [
        new THREE.Vector3(-300, 45, 6), new THREE.Vector3(-100, 40, 10), new THREE.Vector3(100, 42, -8),
        new THREE.Vector3(300, 48, -6), new THREE.Vector3(100, 42, 8), new THREE.Vector3(-100, 40, -10),
      ]
    }
    // 原全城主干道的 XZ 走势按半径比例沿用（往返穿行），高度改按范围建筑适配
    const { r, boulevardY } = tourAreaGeometry(area)
    const xs = [-1.43, -0.48, 0.48, 1.43, 0.48, -0.48]
    const zs = [0.03, 0.05, -0.04, -0.03, 0.04, -0.05]
    return xs.map((x, i) => new THREE.Vector3(area.center[0] + x * r, boulevardY, area.center[1] + zs[i] * r))
  }
  if (route === 'ascend') {
    if (!area) {
      return [
        new THREE.Vector3(180, 6, 180), new THREE.Vector3(120, 60, 160), new THREE.Vector3(60, 140, 120),
        new THREE.Vector3(20, 260, 60), new THREE.Vector3(0, 380, 10), new THREE.Vector3(-30, 460, -40),
      ]
    }
    // 一角地面盘旋爬升至范围上空（XZ/高度序列 = 原全城版按 r/endY 归一后的比例）
    const { r, ascendEndY } = tourAreaGeometry(area)
    const xs = [0.857, 0.571, 0.286, 0.095, 0, -0.143]
    const zs = [0.857, 0.762, 0.571, 0.286, 0.048, -0.19]
    const ys = [0.013, 0.13, 0.3, 0.57, 0.83, 1]
    return xs.map((x, i) =>
      new THREE.Vector3(area.center[0] + x * r, Math.max(ys[i] * ascendEndY, 6), area.center[1] + zs[i] * r),
    )
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

  /** 状态变化通知（拖拽即停/预设飞点/环绕建筑都不经过 T 键，HUD 靠它同步按钮文本） */
  onStateChange: ((route: TourRouteId) => void) | null = null

  constructor(private bundle: SceneBundle) {
    bundle.controls.addEventListener('start', () => this.stop())   // 用户接管即停巡航
  }

  get current() { return this.route }

  start(route: TourRouteId, opts?: {
    buildingCenter?: THREE.Vector3; buildingRadius?: number; lookAt?: THREE.Vector3; area?: TourArea
  }) {
    const pts = buildRoutePoints(route, opts)
    this.curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.4)
    this.route = route
    this.t = 0
    if (opts?.lookAt) this.lookAt = opts.lookAt
    else if (route === 'buildingOrbit' && opts?.buildingCenter) this.lookAt = opts.buildingCenter.clone()
    else if (opts?.area) {
      // 视线中心随范围走：环绕/爬升看楼身中上部，穿街看低处街景
      const g = tourAreaGeometry(opts.area)
      const lookY = route === 'boulevard' ? g.boulevardLookY : g.orbitLookY
      this.lookAt = new THREE.Vector3(opts.area.center[0], lookY, opts.area.center[1])
    } else this.lookAt = new THREE.Vector3(0, 30, 0)
    this.lastTs = 0
    cancelAnimationFrame(this.raf)
    this.onStateChange?.(route)
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
    this.onStateChange?.('off')
  }

  flyToPreset(preset: TourPreset) {
    this.stop()
    const p = PRESETS[preset]
    this.stopFly = flyTo(this.bundle.camera, this.bundle.controls, p.pos.clone(), p.target.clone())
  }
}

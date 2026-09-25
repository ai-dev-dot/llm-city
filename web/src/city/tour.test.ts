import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildRoutePoints, TourController, type TourRouteId } from './tour'
import type { SceneBundle } from './scene'

describe('巡航路线（spec §10 三路线+单建筑慢旋）', () => {
  it('三条全局路线点数合理且闭合（首尾呼应）', () => {
    for (const r of ['plazaOrbit', 'boulevard', 'ascend'] as const) {
      const pts = buildRoutePoints(r)
      expect(pts.length).toBeGreaterThanOrEqual(4)
    }
    const orbit = buildRoutePoints('plazaOrbit')
    expect(orbit[0].distanceTo(orbit[orbit.length - 1])).toBeLessThan(orbit[0].distanceTo(orbit[2]))
  })
  it('单建筑环绕：点在水平面上且围绕中心', () => {
    const c = new THREE.Vector3(10, 5, 10)
    const pts = buildRoutePoints('buildingOrbit', { buildingCenter: c, buildingRadius: 30 })
    expect(pts.length).toBeGreaterThanOrEqual(8)
    for (const p of pts) expect(p.distanceTo(c)).toBeGreaterThan(25)
  })
})

// Regression: /qa 2026-09-25 — 拖拽即停/预设飞点/环绕建筑不经过 T 键，
// 修复前按钮文本停在旧路线（onStateChange 缺失）。报告见 .gstack/qa-reports/
describe('巡航状态回调（HUD 按钮文本同步依据）', () => {
  const makeBundle = () => {
    const handlers: Record<string, () => void> = {}
    return {
      bundle: {
        camera: { position: new THREE.Vector3() },
        controls: {
          target: new THREE.Vector3(),
          addEventListener: (name: string, cb: () => void) => { handlers[name] = cb },
          update: () => {},
        },
      } as unknown as SceneBundle,
      handlers,
    }
  }
  it('start 通知路线、拖拽（controls start）通知关；已关再 stop 不重复通知', () => {
    const { bundle, handlers } = makeBundle()
    const seen: TourRouteId[] = []
    const tour = new TourController(bundle)
    tour.onStateChange = (r) => seen.push(r)
    const raf = globalThis.requestAnimationFrame
    const cancelRaf = globalThis.cancelAnimationFrame
    globalThis.requestAnimationFrame = (() => 0) as typeof requestAnimationFrame
    globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame
    try {
      tour.start('plazaOrbit')
      expect(tour.current).toBe('plazaOrbit')
      handlers['start']?.()   // 用户拖拽接管 → 自动 stop
      expect(tour.current).toBe('off')
      tour.stop()             // 幂等：已关不再通知
    } finally {
      globalThis.requestAnimationFrame = raf
      globalThis.cancelAnimationFrame = cancelRaf
    }
    expect(seen).toEqual(['plazaOrbit', 'off'])
  })
})

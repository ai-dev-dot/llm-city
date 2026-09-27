import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildRoutePoints, tourAreaGeometry, TourController, type TourArea, type TourRouteId } from './tour'
import type { SceneBundle } from './scene'

const HALF_FOV_RAD = (55 / 2) * (Math.PI / 180)   // scene.ts 相机 fov55 的竖直半角

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

// 巡航范围个性化（2026-09-27 城主反馈：街区页巡航绕中央广场、超高层只见楼身不见顶）：
// 三条全局路线接 TourArea——以街区/全城为心，高度按范围内最高楼顶适配。
describe('巡航范围个性化（TourArea）', () => {
  const highRise: TourArea = { center: [-40, 200], radius: 100, topY: 200 }   // 原点塔式超高层街区
  const lowRise: TourArea = { center: [300, -500], radius: 55, topY: 12 }     // 低层商业街区

  it('环绕线绕范围中心（不再固定绕原点），半径与高度按公式派生', () => {
    const g = tourAreaGeometry(highRise)
    const pts = buildRoutePoints('plazaOrbit', { area: highRise })
    expect(pts).toHaveLength(8)
    for (const p of pts) {
      const dxz = Math.hypot(p.x - highRise.center[0], p.z - highRise.center[1])
      expect(dxz).toBeCloseTo(g.r, 6)
      expect(p.y).toBeCloseTo(g.orbitY, 6)
    }
  })
  it('最高楼楼顶入画：楼顶相对视线的仰角小于相机竖直半角', () => {
    for (const a of [highRise, lowRise]) {
      const g = tourAreaGeometry(a)
      const elevation = Math.atan((a.topY - g.orbitLookY) / g.r)
      expect(elevation).toBeLessThan(HALF_FOV_RAD)
    }
  })
  it('矮街区贴地环绕：高度贴近街区尺度，而非硬编码的 95', () => {
    const g = tourAreaGeometry(lowRise)
    expect(g.orbitY).toBeGreaterThan(10)
    expect(g.orbitY).toBeLessThan(30)
  })
  it('穿街线低飞过街区（y=穿街高度，两端伸出范围半径外）', () => {
    const g = tourAreaGeometry(lowRise)
    const pts = buildRoutePoints('boulevard', { area: lowRise })
    for (const p of pts) expect(p.y).toBeCloseTo(g.boulevardY, 6)
    const ends = [pts[0], pts[3]]
    for (const p of ends) {
      const dxz = Math.hypot(p.x - lowRise.center[0], p.z - lowRise.center[1])
      expect(dxz).toBeGreaterThan(g.r)
    }
    const mids = [pts[1], pts[2], pts[4], pts[5]]
    for (const p of mids) {
      const dxz = Math.hypot(p.x - lowRise.center[0], p.z - lowRise.center[1])
      expect(dxz).toBeLessThan(g.r)
    }
  })
  it('爬升线从街区一角地面爬到范围上空俯瞰', () => {
    const g = tourAreaGeometry(lowRise)
    const pts = buildRoutePoints('ascend', { area: lowRise })
    expect(pts[0].y).toBeLessThan(10)   // 近地面起步（实现有 6m 离地下限）
    expect(pts[pts.length - 1].y).toBeCloseTo(g.ascendEndY, 6)
    for (let i = 1; i < pts.length; i++) expect(pts[i].y).toBeGreaterThan(pts[i - 1].y)
  })
  it('无 area 保持原全城硬编码路线（向后兼容）', () => {
    const orbit = buildRoutePoints('plazaOrbit')
    expect(orbit[0].x).toBeCloseTo(210, 6)
    expect(orbit[0].y).toBe(95)
    expect(orbit[0].z).toBeCloseTo(0, 6)
    const ascend = buildRoutePoints('ascend')
    expect(ascend[ascend.length - 1].y).toBe(460)
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

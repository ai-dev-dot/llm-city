import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildRoutePoints } from './tour'

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

import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { LABEL_FADE, blockLabelHtml, buildingLabelHtml, projectLabel } from './labels'

/** 正对原点的测试相机：位于 (0,0,D) 看向 -z，fov 55 与产品一致 */
function cameraAt(dist: number): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(55, 1, 0.5, 4000)
  cam.position.set(0, 0, dist)
  cam.lookAt(0, 0, 0)
  cam.updateMatrixWorld(true)
  return cam
}

describe('projectLabel（世界锚点 → 屏幕位置/淡出）', () => {
  it('正前方锚点居中可见、不淡出', () => {
    const r = projectLabel([0, 0, 0], cameraAt(400), 800, 600)
    expect(r).not.toBeNull()
    expect(r!.left).toBeCloseTo(400, 5)
    expect(r!.top).toBeCloseTo(300, 5)
    expect(r!.opacity).toBe(1)
  })
  it('相机背后（z 投影出界）与 far 之外不画', () => {
    expect(projectLabel([0, 0, 900], cameraAt(400), 800, 600)).toBeNull()   // 身后 500
    expect(projectLabel([0, 0, -3999], cameraAt(400), 800, 600)).toBeNull() // 距 4399 > far 4000
  })
  it('屏幕外（含 48px 留边距）不画', () => {
    // fov55/aspect1 时距 400 的水平半视野 ≈ 400·tan(27.5°) ≈ 208，x=±600 远超画面
    expect(projectLabel([600, 0, -400], cameraAt(400), 800, 600)).toBeNull()
    expect(projectLabel([-600, 0, -400], cameraAt(400), 800, 600)).toBeNull()
  })
  it('近距淡出按相机到锚点距离算：≤40m 全隐（穿街低飞不糊脸），72m 起全显', () => {
    expect(projectLabel([0, 0, 0], cameraAt(30), 800, 600)!.opacity).toBe(0)
    const r = projectLabel([0, 0, 0], cameraAt(56), 800, 600)   // 距 56 → (56-40)/32 = 0.5
    expect(r!.opacity).toBeCloseTo(0.5, 5)
    expect(projectLabel([0, 0, 0], cameraAt(80), 800, 600)!.opacity).toBe(1)
  })
  it('远距淡出：1100m 起衰减、1450m 全隐（≤controls.maxDistance 1500）', () => {
    expect(projectLabel([0, 0, 0], cameraAt(1000), 800, 600)!.opacity).toBe(1)
    expect(projectLabel([0, 0, 0], cameraAt(1200), 800, 600)!.opacity).toBeCloseTo((1450 - 1200) / 350, 5)
    expect(projectLabel([0, 0, 0], cameraAt(1450), 800, 600)!.opacity).toBe(0)
  })
  it('淡出常量单调有序', () => {
    const f = LABEL_FADE
    expect(f.nearEnd).toBeLessThan(f.nearStart)
    expect(f.farStart).toBeLessThan(f.farEnd)
    expect(f.farEnd).toBeLessThanOrEqual(1500)
  })
})

describe('标签 HTML', () => {
  it('街区标签：色点 + 模型名加粗 + 街区ID/主题名次级色', () => {
    const h = blockLabelHtml('glm-5.3', '#3B82F6', 'E5', '原点街区')
    expect(h).toContain('glm-5.3')
    expect(h).toContain('<b>glm-5.3</b>')
    expect(h).toContain('background:#3B82F6')
    expect(h).toContain('E5')
    expect(h).toContain('原点街区')
  })
  it('街区标签：无厂商色/无主题名也能出', () => {
    const h = blockLabelHtml('m', null, 'A1', null)
    expect(h).toContain('A1')
    expect(h).not.toContain('background:')
  })
  it('HTML 注入被转义（城市数据是不可信输入）', () => {
    expect(blockLabelHtml('<img src=x>', null, 'A1', null)).not.toContain('<img')
    expect(buildingLabelHtml('<script>')).not.toContain('<script>')
  })
  it('建筑名标签只含转义后的名字', () => {
    expect(buildingLabelHtml('原点塔')).toBe('原点塔')
  })
})

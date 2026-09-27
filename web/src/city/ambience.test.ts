import { describe, expect, it } from 'vitest'
import { AMBIENCE_PRESETS } from './ambience'

describe('氛围预设（spec §10：白天默认基准、三档）', () => {
  it('白天自然光（2026-09-27 终裁）：渐变天穹+地平线无缝+雾不进城', () => {
    expect(Object.keys(AMBIENCE_PRESETS)).toEqual(['day', 'night', 'dusk'])
    // 地平线无缝律：雾色与天穹底色严格一致，远处地面融入天穹
    expect(AMBIENCE_PRESETS.day.fogColor).toBe(AMBIENCE_PRESETS.day.skyBottom)
    // 灰蒙蒙回归防线：全城对角线仅 458，白天雾必须从远处才起（建筑永远清晰）
    expect(AMBIENCE_PRESETS.day.fogNear).toBeGreaterThanOrEqual(1000)
    expect(AMBIENCE_PRESETS.night.fogColor).not.toBeNull()   // 夜/黄昏保留氛围雾
    expect(AMBIENCE_PRESETS.dusk.fogColor).not.toBeNull()
    expect(AMBIENCE_PRESETS.day.sunIntensity).toBeGreaterThan(1)
    expect(AMBIENCE_PRESETS.night.sunIntensity).toBeLessThan(AMBIENCE_PRESETS.day.sunIntensity)
    expect(AMBIENCE_PRESETS.dusk.sunPos[1]).toBeLessThan(AMBIENCE_PRESETS.day.sunPos[1])   // 黄昏低角度（brief 原文 toBeLess 非有效 matcher，最小修正为 toBeLessThan）
  })
  it('预设不含任何建筑材质修改项', () => {
    for (const p of Object.values(AMBIENCE_PRESETS)) {
      expect(JSON.stringify(p)).not.toMatch(/material|emissive|color.*set/i)
    }
  })
  it('envIntensity 三档单调：白天最亮、夜景最低（IBL 反射随氛围联动）', () => {
    expect(AMBIENCE_PRESETS.day.envIntensity).toBeGreaterThan(AMBIENCE_PRESETS.dusk.envIntensity)
    expect(AMBIENCE_PRESETS.dusk.envIntensity).toBeGreaterThan(AMBIENCE_PRESETS.night.envIntensity)
    expect(AMBIENCE_PRESETS.night.envIntensity).toBeGreaterThan(0)
    expect(AMBIENCE_PRESETS.day.envIntensity).toBeLessThanOrEqual(0.6)
  })
})

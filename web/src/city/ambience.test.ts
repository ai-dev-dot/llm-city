import { describe, expect, it } from 'vitest'
import { AMBIENCE_PRESETS } from './ambience'

describe('氛围预设（spec §10：白天默认基准、三档）', () => {
  it('三档齐全且白天为中性日光', () => {
    expect(Object.keys(AMBIENCE_PRESETS)).toEqual(['day', 'night', 'dusk'])
    expect(AMBIENCE_PRESETS.day.background).toBe('#DFE3E8')
    expect(AMBIENCE_PRESETS.day.sunIntensity).toBeGreaterThan(1)
    expect(AMBIENCE_PRESETS.night.sunIntensity).toBeLessThan(AMBIENCE_PRESETS.day.sunIntensity)
    expect(AMBIENCE_PRESETS.dusk.sunPos[1]).toBeLessThan(AMBIENCE_PRESETS.day.sunPos[1])   // 黄昏低角度（brief 原文 toBeLess 非有效 matcher，最小修正为 toBeLessThan）
  })
  it('预设不含任何建筑材质修改项', () => {
    for (const p of Object.values(AMBIENCE_PRESETS)) {
      expect(JSON.stringify(p)).not.toMatch(/material|emissive|color.*set/i)
    }
  })
})

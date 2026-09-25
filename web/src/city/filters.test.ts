import { describe, expect, it } from 'vitest'
import { modelFilterColor, vendorShade } from './filters'

describe('滤镜配色（spec §10 两档）', () => {
  it('按模型：同 id 同色、不同 id 不同色', () => {
    const ids = ['glm-5.3', 'glm-5.3-flash', 'claude-sonnet-4.5']
    const c1 = modelFilterColor('glm-5.3', ids)
    expect(modelFilterColor('glm-5.3', ids)).toBe(c1)
    expect(new Set(ids.map((i) => modelFilterColor(i, ids))).size).toBe(3)
  })
  it('按厂商：同厂商不同模型用色阶深浅区分', () => {
    const a = vendorShade('#3B82F6', 0), b = vendorShade('#3B82F6', 1), c = vendorShade('#3B82F6', 2)
    expect(new Set([a, b, c]).size).toBe(3)
    expect(c.startsWith('#')).toBe(true)
  })
})

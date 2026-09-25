import { describe, expect, it } from 'vitest'
import { generatePlanData } from '../src/gen-plan'

describe('规划图几何（spec §5.1/§5.2）', () => {
  const plan = generatePlanData()
  it('9×9 街区、729 地块、id 唯一', () => {
    expect(plan.districts).toHaveLength(81)
    expect(plan.lots).toHaveLength(729)
    expect(new Set(plan.lots.map((l) => l.id)).size).toBe(729)
  })
  it('E5 街区为原点，C3 中心 [-144,144]', () => {
    expect(plan.districts.find((d) => d.id === 'E5')!.center).toEqual([0, 0])
    expect(plan.districts.find((d) => d.id === 'C3')!.center).toEqual([-144, 144])
  })
  it('C3-05 是 C3 中心地块；C3-01 在最北最西', () => {
    expect(plan.lots.find((l) => l.id === 'C3-05')!.center).toEqual([-144, 144])
    expect(plan.lots.find((l) => l.id === 'C3-01')!.center).toEqual([-164, 164])
  })
  it('地块尺寸 20×20、隶属街区正确', () => {
    const lot = plan.lots.find((l) => l.id === 'E5-09')!
    expect(lot.size).toEqual([20, 20])
    expect(lot.district).toBe('E5')
    expect(lot.center).toEqual([20, -20])   // 09 = 最南最东
  })
  it('policy：施工白名单 + 街区主权豁免清单（R15 立法）', () => {
    expect(plan.policy!.allowedModelIds).toContain('official')
    expect(plan.policy!.allowedModelIds).toContain('glm-5.3')
    expect(plan.policy!.sharedBlocks).toEqual([])   // 城主显式放行的混居街区，缺省为空
  })
})

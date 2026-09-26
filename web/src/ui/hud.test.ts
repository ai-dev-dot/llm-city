import { describe, expect, it } from 'vitest'
import { plaqueStats } from './hud'
import type { BuildingRecord } from '../generated/city-data'

const b = (over: Partial<BuildingRecord>): BuildingRecord => ({
  id: 'b-000001', lot: 'E5-05', name: 'x', desc: '', model: 'GLM-5.3', modelId: 'glm-5.3',
  vendor: { id: 'zhipu', name: '智谱 AI', color: '#3B82F6' }, agent: 'zcode', operator: 'Think',
  sessions: [], tokens: { input: 100, output: 50 }, startedAt: '2026-09-24T10:00:00+08:00',
  completedAt: null, notesExcerpt: null, entryDir: 'buildings/b-000001-x',
  parcel: ['E5-05'], parcelCenter: null, parcelSize: null,
  ...over,
})

describe('启动铭牌统计（spec §10 参与模型/厂商去重）', () => {
  it('模型按 modelId 去重（不同登记写法同一 canonical 不重复计数）', () => {
    const s = plaqueStats([
      b({ id: 'b-000001', model: 'GLM-5.3', modelId: 'glm-5.3' }),
      b({ id: 'b-000002', model: 'glm_5_3', modelId: 'glm-5.3', vendor: null }),
      b({ id: 'b-000003', model: 'GLM-5.3-Flash', modelId: 'glm-5.3-flash' }),
    ])
    expect(s.buildings).toBe(3)
    expect(s.models).toBe(2)
    expect(s.vendors).toBe(1)
    expect(s.tokensIn).toBe(300)
  })
  it('null token 保守标记', () => {
    const s = plaqueStats([b({ tokens: { input: 100, output: null } }), b({ tokens: { input: null, output: 20 } })])
    expect(s.tokensIn).toBe(100); expect(s.unknownIn).toBe(true)
    expect(s.tokensOut).toBe(20); expect(s.unknownOut).toBe(true)
  })
})

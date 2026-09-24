import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { canonicalize, loadIdentityTable, resolveModelId } from './identity'

const table = loadIdentityTable(resolve(__dirname, '..'))

describe('canonicalize 机械归一', () => {
  it('大小写与分隔符变体归一', () => {
    expect(canonicalize('GLM-5.3')).toBe('glm-5.3')
    expect(canonicalize('glm_5_3')).toBe('glm-5-3')
    expect(canonicalize('Claude Sonnet 4.5')).toBe('claude-sonnet-4.5')
  })
  it('去 provider/ 前缀', () => {
    expect(canonicalize('anthropic/claude-sonnet-4.5')).toBe('claude-sonnet-4.5')
  })
})

describe('resolveModelId', () => {
  it('别名归一到同一身份（spec §14 R10 用例）', () => {
    expect(resolveModelId('GLM-5.3', table)).toEqual({ ok: true, modelId: 'glm-5.3' })
    expect(resolveModelId('glm_5_3', table)).toEqual({ ok: true, modelId: 'glm-5.3' })
    expect(resolveModelId('anthropic/claude-sonnet-4.5', table)).toEqual({ ok: true, modelId: 'claude-sonnet-4.5' })
  })
  it('不同模型绝不自动合并', () => {
    expect(resolveModelId('glm-5.3-flash', table)).toEqual({ ok: true, modelId: 'glm-5.3-flash' })
    expect(resolveModelId('GLM-5.3-Flash', table)).toEqual({ ok: true, modelId: 'glm-5.3-flash' })
  })
  it('未登记模型红灯且提示补表', () => {
    const r = resolveModelId('gpt-5.5-codex', table)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('models.json')
  })
  it('official 身份可解析', () => {
    expect(resolveModelId('official', table)).toEqual({ ok: true, modelId: 'official' })
  })
})

describe('models.json 自身一致性（spec §14 身份表一致性单测）', () => {
  it('每个模型的 vendor 都存在且厂商主色为合法 hex', () => {
    for (const m of table.models) {
      expect(table.vendors[m.vendor], `模型 ${m.id} 的 vendor ${m.vendor} 未登记`).toBeTruthy()
    }
    for (const [id, v] of Object.entries(table.vendors)) {
      expect(v.color, `厂商 ${id} 主色`).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})

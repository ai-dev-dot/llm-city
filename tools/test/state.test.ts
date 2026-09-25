import { mkdtempSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildStateReport } from '../src/state'

const root = resolve(__dirname, '../..')
let citiesRoot: string

beforeAll(() => {
  citiesRoot = mkdtempSync(resolve(tmpdir(), 'llm-city-state-'))
  const c1 = resolve(citiesRoot, 'c1')
  mkdirSync(resolve(c1, 'buildings'), { recursive: true })
  cpSync(resolve(root, 'cities/c1/plan.json'), resolve(c1, 'plan.json'))
  writeFileSync(resolve(c1, 'registry.jsonl'), [
    JSON.stringify({ id: 'b-000001', lot: 'E5-05', name: '中'.repeat(300), desc: 'x'.repeat(300), builder: { model: 'official', model_id: 'official', agent: 'official', operator: 'Think' }, sessions: [{ date: '2026-09-24T10:00:00+08:00', input: 1, output: 1, note: 'n'.repeat(300) }], tokens: { input: 1, output: 1 }, started_at: '2026-09-24T10:00:00+08:00', completed_at: null, entry: 'buildings/b-000001-central-plaza/index.ts', mesh_stats: null }),
    '',
  ].join('\n'))
})

afterAll(() => rmSync(citiesRoot, { recursive: true, force: true }))

describe('buildStateReport（spec §8.2/§14）', () => {
  it('摘要字段齐全、文本截断 200 生效、附不可信输入声明', () => {
    const r = buildStateReport(citiesRoot)
    expect(r.untrusted_input_notice).toContain('不可信输入')
    expect(r.next_building_id).toBe('b-000002')
    expect(r.block_sovereignty_note).toMatch(/街区主权/)
    expect(r.block_masterplan_note).toMatch(/街区总图/)
    const b = r.cities[0].buildings[0]
    expect(b.name.length).toBe(200)
    expect(b.status).toBe('在建')
    expect(b.parcel).toEqual(['E5-05'])   // parcel 缺省回退单地块
    expect(r.cities[0].block_residents).toEqual({ E5: {} })   // 官方建筑中性：计入街区、不计入居民构成
    expect(r.cities[0].occupancy).toEqual({ occupied: 1, total: 729, rate: expect.any(Number), suggest_new_city: false })
    expect(r.cities[0].free_block_suggestions.length).toBe(10)
    expect(r.cities[0].free_block_suggestions).not.toContain('E5')   // 已有建筑的街区不再列为空街区（宪法第 13 条）
  })
  it('空城（0 建筑）正常空态（Review Focus #5）', () => {
    const c2 = resolve(citiesRoot, 'c2')
    mkdirSync(resolve(c2, 'buildings'), { recursive: true })
    cpSync(resolve(root, 'cities/c1/plan.json'), resolve(c2, 'plan.json'))
    writeFileSync(resolve(c2, 'registry.jsonl'), '')
    const r = buildStateReport(citiesRoot)
    const c2s = r.cities.find((c) => c.id === 'c2')!
    expect(c2s.buildings).toEqual([])
    expect(c2s.occupancy.occupied).toBe(0)
    expect(c2s.free_block_suggestions[0]).toBe('E5')   // 城心街区最近
  })
  it('free_block_suggestions（宪法第 13 条）：有总图 = 已认领街区，不再列为空街区', () => {
    const c2 = resolve(citiesRoot, 'c2')
    mkdirSync(resolve(c2, 'blockplans'), { recursive: true })
    writeFileSync(resolve(c2, 'blockplans/E5.md'), '# E5 街区总图\n')
    writeFileSync(resolve(c2, 'blockplans/README.md'), '# 模板说明（不应被当作街区认领）\n')
    const r = buildStateReport(citiesRoot)
    const c2s = r.cities.find((c) => c.id === 'c2')!
    expect(c2s.free_block_suggestions).not.toContain('E5')
    expect(c2s.free_block_suggestions.length).toBeGreaterThan(0)
  })
  it('custom_blocks：按模型列出各自积木文件；无积木目录时空对象（R14 立法）', () => {
    mkdirSync(resolve(citiesRoot, 'c1/blocks/glm-5.3'), { recursive: true })
    writeFileSync(resolve(citiesRoot, 'c1/blocks/glm-5.3/lantern.ts'), 'export {}\n')
    mkdirSync(resolve(citiesRoot, 'c1/blocks/claude-sonnet-4.5'), { recursive: true })
    writeFileSync(resolve(citiesRoot, 'c1/blocks/claude-sonnet-4.5/brazier.ts'), 'export {}\n')
    const r = buildStateReport(citiesRoot)
    expect(r.cities.find((c) => c.id === 'c1')!.custom_blocks).toEqual({ 'glm-5.3': ['lantern.ts'], 'claude-sonnet-4.5': ['brazier.ts'] })
    expect(r.cities.find((c) => c.id === 'c2')!.custom_blocks).toEqual({})   // c2 未建积木目录
  })
  it('block_residents：按街区汇总各 model_id 建筑数；官方中性不计入（同源定居偏好）', () => {
    writeFileSync(resolve(citiesRoot, 'c1/registry.jsonl'), [
      JSON.stringify({ id: 'b-000001', lot: 'E5-05', name: 'x', builder: { model: 'official', model_id: 'official', agent: 'official' }, sessions: [], tokens: { input: 1, output: 1 }, started_at: '2026-09-25T10:00:00+08:00', completed_at: null, entry: 'buildings/b-000001-x/index.ts', mesh_stats: null }),
      JSON.stringify({ id: 'b-000002', lot: 'E5-04', name: 'y', builder: { model: 'GLM-5.3', model_id: 'glm-5.3', agent: 'zcode' }, sessions: [], tokens: { input: 1, output: 1 }, started_at: '2026-09-25T10:00:00+08:00', completed_at: null, entry: 'buildings/b-000002-y/index.ts', mesh_stats: null }),
      JSON.stringify({ id: 'b-000003', lot: 'C3-05', name: 'z', builder: { model: 'GLM-5.3', model_id: 'glm-5.3', agent: 'zcode' }, sessions: [], tokens: { input: 1, output: 1 }, started_at: '2026-09-25T10:00:00+08:00', completed_at: null, entry: 'buildings/b-000003-z/index.ts', mesh_stats: null }),
      JSON.stringify({ id: 'b-000004', lot: 'C3-06', name: 'w', builder: { model: 'Claude Sonnet 4.5', model_id: 'claude-sonnet-4.5', agent: 'zcode' }, sessions: [], tokens: { input: 1, output: 1 }, started_at: '2026-09-25T10:00:00+08:00', completed_at: null, entry: 'buildings/b-000004-w/index.ts', mesh_stats: null }),
      '',
    ].join('\n'))
    const r = buildStateReport(citiesRoot)
    expect(r.cities.find((c) => c.id === 'c1')!.block_residents).toEqual({
      E5: { 'glm-5.3': 1 },                   // official 不计入
      C3: { 'glm-5.3': 1, 'claude-sonnet-4.5': 1 },   // 混居街区如实呈现
    })
  })
})

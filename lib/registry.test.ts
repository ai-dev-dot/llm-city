import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkRegistryEdit, localIsoNow, parseRegistry, serializeRegistry, validateRow, validateTimestamp } from './registry'

const fx = (name: string) => readFileSync(resolve(__dirname, '../tools/test/registry', name), 'utf8')

describe('parseRegistry', () => {
  it('正常解析多行', () => {
    const rows = parseRegistry(fx('two-rows.jsonl'))
    expect(rows).toHaveLength(2)
    expect(rows[0].id).toBe('b-000001')
    expect(rows[1].tokens).toEqual({ input: 71000, output: 25400 })
  })
  it('CRLF 行尾兼容（Review Focus #1）', () => {
    const rows = parseRegistry(fx('crlf.jsonl'))
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('观澜塔')
  })
  it('坏 JSON 行报行号', () => {
    expect(() => parseRegistry(fx('bad-line.jsonl'))).toThrow(/第 2 行/)
  })
  it('空文件与空行为合法空册', () => {
    expect(parseRegistry('')).toEqual([])
    expect(parseRegistry('\n\n')).toEqual([])
  })
})

describe('validateTimestamp / validateRow', () => {
  it('带时区偏移合法；缺偏移或非法月拒绝（Review Focus #2）', () => {
    expect(validateTimestamp('2026-09-24T20:30:00+08:00')).toBe(true)
    expect(validateTimestamp('2026-09-24T20:30:00Z')).toBe(true)
    expect(validateTimestamp('2026-09-24T20:30:00')).toBe(false)
    expect(validateTimestamp('2026-13-01T00:00:00+08:00')).toBe(false)
  })
  it('entry 路径与 id 前缀一致才合法', () => {
    const row = JSON.parse(fx('two-rows.jsonl').split('\n')[0])
    expect(validateRow(row, 0)).toEqual([])
    expect(validateRow({ ...row, entry: 'buildings/b-000099-x/index.ts' }, 0)[0]).toMatch(/entry/)
  })
  it('builder 缺 operator 拦截（fix round 1）', () => {
    const row = JSON.parse(fx('two-rows.jsonl').split('\n')[0])
    const builder = { model: row.builder.model, model_id: row.builder.model_id, agent: row.builder.agent }
    expect(validateRow({ ...row, builder }, 0).join('\n')).toMatch(/builder/)
  })
})

describe('checkRegistryEdit 受限编辑（spec §5.4/§14）', () => {
  const base = JSON.parse(fx('two-rows.jsonl').split('\n')[1])   // b-000042 在建（completed_at null）
  const prev = [base]

  it('同 model_id 续建：追加 sessions、累计 tokens 允许', () => {
    const curr = [structuredClone(base)]
    curr[0].sessions.push({ date: '2026-09-26T10:00:00+08:00', input: 100, output: 50, note: '封顶' })
    curr[0].tokens = { input: 71100, output: 25450 }
    expect(checkRegistryEdit(prev, curr)).toEqual([])
  })
  it('mesh_stats 回填与竣工填 completed_at 允许', () => {
    const curr = [structuredClone(base)]
    curr[0].mesh_stats = { triangles: 12400 }
    curr[0].completed_at = '2026-09-26T18:00:00+08:00'
    expect(checkRegistryEdit(prev, curr)).toEqual([])
  })
  it('不可变字段（lot/builder/name/entry/started_at）被改即拦', () => {
    for (const patch of [{ lot: 'C3-06' }, { name: '改名' }, { started_at: '2026-01-01T00:00:00+08:00' }]) {
      const curr = [Object.assign(structuredClone(base), patch)]
      expect(checkRegistryEdit(prev, curr).length).toBeGreaterThan(0)
    }
    const currBuilder = [structuredClone(base)]
    currBuilder[0].builder = { ...currBuilder[0].builder, model_id: 'glm-5.3-flash' }
    expect(checkRegistryEdit(prev, currBuilder).length).toBeGreaterThan(0)
  })
  it('竣工行整行封存（Review Focus 隐含：封存后连允许字段也不许动）', () => {
    const done = structuredClone(base)
    done.completed_at = '2026-09-25T10:00:00+08:00'
    const curr = [structuredClone(done)]
    curr[0].mesh_stats = { triangles: 999 }
    expect(checkRegistryEdit([done], curr).length).toBeGreaterThan(0)
  })
  it('删除行被拦；adminOverride 放行（城主 revert 通道）', () => {
    expect(checkRegistryEdit(prev, []).length).toBeGreaterThan(0)
    expect(checkRegistryEdit(prev, [], { adminOverride: true })).toEqual([])
  })
})

describe('serialize 往返', () => {
  it('parse → serialize → parse 等值', () => {
    const rows = parseRegistry(fx('two-rows.jsonl'))
    expect(parseRegistry(serializeRegistry(rows))).toEqual(rows)
  })
  it('localIsoNow 带时区偏移', () => {
    expect(validateTimestamp(localIsoNow())).toBe(true)
  })
})

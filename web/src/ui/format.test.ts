import { describe, expect, it } from 'vitest'
import { formatDate, formatTokens, truncate } from './format'

describe('展示格式化（spec §13 token 缺失如实显示）', () => {
  it('token 千位缩写与「未记录」', () => {
    expect(formatTokens({ input: 52300, output: 18700 })).toBe('5.2万 in / 1.9万 out')
    expect(formatTokens({ input: 900, output: 80 })).toBe('900 in / 80 out')
    expect(formatTokens({ input: null, output: null })).toBe('未记录')
    expect(formatTokens({ input: 100, output: null })).toBe('100 in / 未记录 out')
  })
  it('日期与截断', () => {
    expect(formatDate('2026-09-24T20:30:00+08:00')).toBe('2026-09-24')
    expect(truncate('一'.repeat(120), 100).length).toBe(101)   // 100 字 + 省略号
    expect(truncate('短文本', 100)).toBe('短文本')
  })
})

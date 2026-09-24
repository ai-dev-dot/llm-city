import { describe, expect, it } from 'vitest'
import { hashSeed, mulberry32 } from './ctx'

describe('mulberry32 确定性（spec §14 积木库确定性单测的基座）', () => {
  it('同种子同序列，不同种子不同序列', () => {
    const a1 = mulberry32(42), a2 = mulberry32(42), b = mulberry32(43)
    const s1 = [a1(), a1(), a1()], s2 = [a2(), a2(), a2()], s3 = [b(), b(), b()]
    expect(s1).toEqual(s2)
    expect(s1).not.toEqual(s3)
  })
  it('输出在 [0,1) 且均匀性粗检', () => {
    const r = mulberry32(2026)
    let sum = 0
    for (let i = 0; i < 1000; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); sum += v }
    expect(Math.abs(sum / 1000 - 0.5)).toBeLessThan(0.05)
  })
})

describe('hashSeed', () => {
  it('稳定且对相似输入敏感', () => {
    expect(hashSeed('b-000042')).toBe(hashSeed('b-000042'))
    expect(hashSeed('b-000042')).not.toBe(hashSeed('b-000043'))
  })
})

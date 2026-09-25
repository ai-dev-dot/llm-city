import { describe, expect, it } from 'vitest'
import { frameBox } from './photo'

describe('构图框线（spec §10 摄影模式）', () => {
  it('16:9 在 1920×1080 全幅；9:16 与 1:1 最大内接（w = min(vw, vh·ratio)）', () => {
    expect(frameBox('16:9', 1920, 1080)).toEqual({ left: 0, top: 0, width: 1920, height: 1080 })
    expect(frameBox('9:16', 1920, 1080)).toEqual({ left: 656.25, top: 0, width: 607.5, height: 1080 })
    const sq = frameBox('1:1', 1920, 1080)
    expect(Math.round(sq.width)).toBe(Math.round(sq.height))
    expect(frameBox('off', 1920, 1080)).toEqual({ left: 0, top: 0, width: 1920, height: 1080 })
  })
})

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('仓库骨架', () => {
  it('workspaces 覆盖三包且依赖精确锁版', () => {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '../..', 'package.json'), 'utf8'))
    expect(pkg.workspaces).toEqual(['lib', 'tools', 'web'])
    const threeVersions = ['lib', 'tools', 'web'].map((w) => {
      const p = JSON.parse(readFileSync(resolve(__dirname, '../..', w, 'package.json'), 'utf8'))
      return p.dependencies?.three
    })
    expect(new Set(threeVersions).size).toBe(1)          // 全仓同一 three
    expect(threeVersions[0]).not.toMatch(/[\^~]/)         // 精确锁版（版本年轮）
  })
})

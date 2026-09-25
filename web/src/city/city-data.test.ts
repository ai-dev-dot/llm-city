import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// 直接测生成产物（gen:city 已在测试前运行；fresh clone 未生成时整组跳过）
import { existsSync } from 'node:fs'
const genPath = resolve(__dirname, '../generated/city-data.ts')
const text = existsSync(genPath) ? readFileSync(genPath, 'utf8') : ''

describe.skipIf(!text)('gen:city 产物', () => {
  it('含 city 常量与 buildingLoaders，建筑 id 与 loader 键一致', () => {
    expect(text).toContain('export const city: CityData')
    expect(text).toContain('export const buildingLoaders')
    const ids = [...text.matchAll(/"id": "(b-\d{6})"/g)].map((m) => m[1])
    const keys = [...text.matchAll(/^  '(b-\d{6})':/gm)].map((m) => m[1])
    expect(keys).toEqual(ids)
  })
  it('loader 指向真实建筑入口', () => {
    // 生成文件位于 web/src/generated/，到仓库根需要三级 ../（简报原文两级会解析到 web/ 下，typecheck 与 vite 均不可达）；
    // 生成物省略 .ts 后缀（TS5097），登记簿 ENTRY_RE 保证入口恒为 index.ts
    for (const m of text.matchAll(/import\('\.\.\/\.\.\/\.\.\/(cities\/[^']+)'\)/g)) {
      const p = resolve(__dirname, '../../..', m[1] + '.ts')
      expect(readFileSync(p, 'utf8')).toContain('export default')
    }
  })
})

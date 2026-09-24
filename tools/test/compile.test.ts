import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BANNED_SOURCE_PATTERNS, checkAllowedInputs, compileBuilding, scanSource } from '../src/compile'

const root = resolve(__dirname, '../..')
const fx = (...p: string[]) => resolve(root, 'tools/test/fixtures/buildings', ...p)
const cacheDir = resolve(root, 'node_modules/.cache/llm-city/buildings')

describe('compileBuilding（R1）', () => {
  it('好建筑编译成功且产物存在', async () => {
    const r = await compileBuilding(fx('good-tower/index.ts'), root, resolve(cacheDir, 'good-tower.mjs'))
    expect(r.ok).toBe(true)
    expect(r.inputFiles.length).toBeGreaterThan(0)
  })
  it('语法错误建筑 R1 失败且报错可读', async () => {
    const r = await compileBuilding(fx('bad-compile/index.ts'), root, resolve(cacheDir, 'bad-compile.mjs'))
    expect(r.ok).toBe(false)
    expect(r.errors.join('\n')).toMatch(/build|error/i)
  })
})

describe('checkAllowedInputs（R6/R8）', () => {
  it('好建筑：入口+lib+本目录文件全放行', async () => {
    const r = await compileBuilding(fx('good-tower/index.ts'), root, resolve(cacheDir, 'good-tower-2.mjs'))
    expect(checkAllowedInputs(r.inputFiles, 'tools/test/fixtures/buildings/good-tower', root)).toEqual([])
  })
  it('跨建筑 import 被拦（R8）', async () => {
    const r = await compileBuilding(fx('bad-cross-import/index.ts'), root, resolve(cacheDir, 'bad-cross.mjs'))
    const v = checkAllowedInputs(r.inputFiles, 'tools/test/fixtures/buildings/bad-cross-import', root)
    expect(v.join('\n')).toMatch(/good-tower/)
  })
})

describe('scanSource（R5/R6 尽力而为静态扫描）', () => {
  const scanDir = (name: string) => {
    const dir = fx(name)
    return scanSource(readdirSync(dir).filter((f) => f.endsWith('.ts')).map((f) => ({ path: `${name}/${f}`, text: readFileSync(resolve(dir, f), 'utf8') })))
  }
  it.each([
    ['bad-random', 'R5'],
    ['bad-fetch', 'R6'],
    ['bad-node-import', 'R6'],
    ['bad-dynamic-import', 'R6'],
  ])('%s 被拦且报对应规则', (name, rule) => {
    const hits = scanDir(name as string)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every((h) => h.rule === rule)).toBe(true)
  })
  it('好建筑零命中', () => {
    expect(scanDir('good-tower')).toEqual([])
  })
  it('BANNED_SOURCE_PATTERNS 覆盖 spec §6.3 全部关键字', () => {
    const all = BANNED_SOURCE_PATTERNS.map((p) => p.msg).join('|')
    for (const kw of ['Math.random', 'Date.now', 'performance.now', 'eval', 'new Function', 'fetch', 'XMLHttpRequest', 'node:', 'process.env', '动态 import'])
      expect(all).toContain(kw)
  })
})

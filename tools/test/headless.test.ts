import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compileBuilding } from '../src/compile'
import { ensureWorker, runHeadless } from '../src/headless/run'

const root = resolve(__dirname, '../..')
const fx = (...p: string[]) => resolve(root, 'tools/test/fixtures/buildings', ...p)
const lot = { id: 'C3-05', size: [20, 20] as [number, number], maxHeight: 300 }

async function compiled(name: string): Promise<string> {
  const out = resolve(root, `node_modules/.cache/llm-city/buildings/${name}.mjs`)
  const r = await compileBuilding(fx(name, 'index.ts'), root, out)
  expect(r.ok, r.errors.join('\n')).toBe(true)
  return r.outPath!
}

describe('runHeadless（R2/R3/R4/R9 的数据来源）', () => {
  it('好建筑：返回三角形数与包围盒（R4 数据）', async () => {
    ensureWorker(root)
    const r = await runHeadless(await compiled('good-tower'), lot, 42)
    expect(r.ok).toBe(true)
    expect(r.triangles).toBeGreaterThan(100)
    expect(r.bboxMax![0] - r.bboxMin![0]).toBeLessThanOrEqual(20.5)   // 含容差的判定留给 R2，此处只验证数据合理
  })
  it('死循环建筑被超时强杀（R9，缩短超时测机制）', async () => {
    ensureWorker(root)
    const r = await runHeadless(await compiled('bad-infinite'), lot, 1, 1500)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/超时/)
  }, 20_000)
  it('空几何建筑明确失败而非传播 NaN（Review Focus #3）', async () => {
    ensureWorker(root)
    const r = await runHeadless(await compiled('bad-empty'), lot, 1, 5000)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/空|几何/)
  })
  it('build 抛异常被捕获并带回消息', async () => {
    const out = resolve(root, 'node_modules/.cache/llm-city/buildings/thrower.mjs')
    const { writeFileSync, mkdirSync } = await import('node:fs')
    mkdirSync(resolve(root, 'node_modules/.cache/llm-city/buildings'), { recursive: true })
    writeFileSync(out, `export default function build(){ throw new Error('建筑炸了') }\n`)
    const r = await runHeadless(out, lot, 1, 5000)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/建筑炸了/)
  })
})

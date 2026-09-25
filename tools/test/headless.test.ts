import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compileBuilding } from '../src/compile'
import { ensureWorker, runHeadless, workerFingerprint } from '../src/headless/run'

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
  it('worker 缓存指纹自愈：戳记缺失或与源码不符时自动重编译（[city-admin] 2026-09-25）', () => {
    const stampPath = resolve(root, 'node_modules/.cache/llm-city/worker.mjs.sha')
    rmSync(stampPath, { force: true })
    ensureWorker(root)   // 旧版无戳记缓存 → 视为失效，重编译并落戳记
    expect(readFileSync(stampPath, 'utf8')).toMatch(/^[0-9a-f]{64}$/)
    writeFileSync(stampPath, 'stale-fingerprint')
    ensureWorker(root)   // 戳记与源码不符（模拟改过 worker.ts/lib 后的旧缓存）→ 重编译自愈
    expect(readFileSync(stampPath, 'utf8')).toBe(workerFingerprint(root))
  })
  it('worker 指纹覆盖 lib 依赖：lib 源码变更即指纹变化', () => {
    const before = workerFingerprint(root)
    const probe = resolve(root, 'lib/.fp-probe.ts')
    writeFileSync(probe, '// 指纹探针\n')
    try {
      expect(workerFingerprint(root)).not.toBe(before)
    } finally {
      rmSync(probe, { force: true })
    }
    expect(workerFingerprint(root)).toBe(before)   // 探针移除后指纹复原
  })
})

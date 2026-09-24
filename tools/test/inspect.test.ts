import { mkdtempSync, writeFileSync, mkdirSync, rmSync, cpSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { inspectBuilding } from '../src/inspect'

const root = resolve(__dirname, '../..')
let cityDir: string   // 临时城市：真实 plan.json + 临时 registry + fixtures 建筑

const row = (id: string, lot: string, entry: string, model = 'GLM-5.3') => ({
  id, lot, name: `测试建筑${id}`, desc: '测试',
  builder: { model, model_id: 'glm-5.3', agent: 'zcode', operator: 'Think' },
  sessions: [{ date: '2026-09-24T20:30:00+08:00', input: 100, output: 50, note: '首建' }],
  tokens: { input: 100, output: 50 },
  started_at: '2026-09-24T20:30:00+08:00', completed_at: null,
  entry, mesh_stats: null,
})

// Carry-forward 裁决 1：fixtures 的 lib/ctx import 是 5 级相对路径（'../../../../../lib/ctx'），
// 复制到临时城目录后断链——beforeAll 在 cpSync 之后把每个复制出的 index.ts 中该字符串
// 替换为真实仓库 lib/ctx 的绝对路径（正斜杠，esbuild 可解析）。
const COPIED_DIRS = [
  'b-000001-good-tower', 'b-000002-bad-bbox', 'b-000003-bad-height',
  'b-000004-bad-tris', 'b-000005-bad-random', 'b-000006-bad-cross', 'good-tower',
]

beforeAll(() => {
  cityDir = mkdtempSync(resolve(tmpdir(), 'llm-city-inspect-'))
  mkdirSync(resolve(cityDir, 'buildings'), { recursive: true })
  cpSync(resolve(root, 'cities/c1/plan.json'), resolve(cityDir, 'plan.json'))   // 临时城用真实 plan.json（C3-05/C3-06 均在规划图中）
  cpSync(resolve(root, 'tools/test/fixtures/buildings/good-tower'), resolve(cityDir, 'buildings/b-000001-good-tower'), { recursive: true })
  cpSync(resolve(root, 'tools/test/fixtures/buildings/bad-bbox'), resolve(cityDir, 'buildings/b-000002-bad-bbox'), { recursive: true })
  cpSync(resolve(root, 'tools/test/fixtures/buildings/bad-height'), resolve(cityDir, 'buildings/b-000003-bad-height'), { recursive: true })
  cpSync(resolve(root, 'tools/test/fixtures/buildings/bad-tris'), resolve(cityDir, 'buildings/b-000004-bad-tris'), { recursive: true })
  cpSync(resolve(root, 'tools/test/fixtures/buildings/bad-random'), resolve(cityDir, 'buildings/b-000005-bad-random'), { recursive: true })
  cpSync(resolve(root, 'tools/test/fixtures/buildings/bad-cross-import'), resolve(cityDir, 'buildings/b-000006-bad-cross'), { recursive: true })
  cpSync(resolve(root, 'tools/test/fixtures/buildings/good-tower'), resolve(cityDir, 'buildings/good-tower'), { recursive: true })
  // bad-cross-import 的 index.ts import '../good-tower/index'——上面额外复制一份**原名** good-tower 供其解析
  // （无登记行的目录：inspectBuilding 不做孤儿检测，只有 inspectCity 查）
  const libCtxAbs = resolve(root, 'lib/ctx').replace(/\\/g, '/')
  for (const d of COPIED_DIRS) {
    const p = resolve(cityDir, 'buildings', d, 'index.ts')
    writeFileSync(p, readFileSync(p, 'utf8').replace('\'../../../../../lib/ctx\'', `'${libCtxAbs}'`))
  }
})

afterAll(() => rmSync(cityDir, { recursive: true, force: true }))

describe('inspectBuilding R1–R10（spec §14 坏建筑样本全拦截）', () => {
  it('好建筑全绿且回填 mesh_stats', async () => {
    const rows = [row('b-000001', 'C3-05', 'buildings/b-000001-good-tower/index.ts')]
    const r = await inspectBuilding(root, cityDir, 'b-000001-good-tower', { registryOverride: rows })
    expect(r.passed).toBe(true)
    expect(r.results.map((x) => x.rule)).toHaveLength(10)
    expect(rows[0].mesh_stats?.triangles).toBeGreaterThan(100)   // 回填发生在 override 数组上
  })
  it.each([
    ['b-000002-bad-bbox', 'R2'],
    ['b-000003-bad-height', 'R3'],
    ['b-000004-bad-tris', 'R4'],
    ['b-000005-bad-random', 'R5'],
    ['b-000006-bad-cross', 'R8'],
  ])('%s 恰好挂对应规则', async (dir, rule) => {
    const id = dir.slice(0, 8)
    const rows = [row(id, 'C3-06', `buildings/${dir}/index.ts`)]
    const r = await inspectBuilding(root, cityDir, dir, { registryOverride: rows })
    expect(r.passed).toBe(false)
    const failed = r.results.filter((x) => !x.pass).map((x) => x.rule)
    expect(failed).toContain(rule)
  })
  it('R7：地块被他人占用', async () => {
    const rows = [
      row('b-000001', 'C3-05', 'buildings/b-000001-good-tower/index.ts'),
      row('b-000009', 'C3-05', 'buildings/b-000001-good-tower/index.ts'),   // 双占
    ]
    const r = await inspectBuilding(root, cityDir, 'b-000001-good-tower', { registryOverride: rows })
    expect(r.passed).toBe(false)
    expect(r.results.find((x) => x.rule === 'R7')!.pass).toBe(false)
  })
  it('R10：登记行 model_id 与归一结果不符', async () => {
    const rows = [row('b-000001', 'C3-05', 'buildings/b-000001-good-tower/index.ts', 'gpt-9')]
    const r = await inspectBuilding(root, cityDir, 'b-000001-good-tower', { registryOverride: rows })
    expect(r.results.find((x) => x.rule === 'R10')!.pass).toBe(false)
  })
  it('--complete 填 completed_at（封存）', async () => {
    const rows = [row('b-000001', 'C3-05', 'buildings/b-000001-good-tower/index.ts')]
    await inspectBuilding(root, cityDir, 'b-000001-good-tower', { registryOverride: rows, complete: true })
    expect(rows[0].completed_at).not.toBeNull()
  })
})

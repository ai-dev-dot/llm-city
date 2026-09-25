import { mkdtempSync, writeFileSync, mkdirSync, rmSync, cpSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { inspectBuilding, inspectCity } from '../src/inspect'
import { loadRegistry } from '../../lib/registry'

const root = resolve(__dirname, '../..')
let cityDir: string   // 临时城市：真实 plan.json + 临时 registry + fixtures 建筑

const row = (id: string, lot: string, entry: string, model = 'GLM-5.3') => ({
  id, lot, name: `测试建筑${id}`, desc: '测试',
  builder: { model, model_id: 'glm-5.3', agent: 'zcode' },
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
  'b-000007-bad-empty', 'b-000009-good-tower', 'b-000008-bad-quality',
  'b-000010-bad-setback', 'b-000011-good-custom-block', 'b-000012-bad-cross-block',
]

beforeAll(() => {
  cityDir = mkdtempSync(resolve(tmpdir(), 'llm-city-inspect-'))
  mkdirSync(resolve(cityDir, 'buildings'), { recursive: true })
  cpSync(resolve(root, 'cities/c1/plan.json'), resolve(cityDir, 'plan.json'))   // 临时城用真实 plan.json（C3-05/C3-06 均在规划图中）
  // 自建积木库（R14）：fixtures/blocks/{glm-5.3,claude-sonnet-4.5} → 临时城 blocks/
  // 建筑里 '../../blocks/<model>/...' 相对 import 在复制后仍指向城内积木目录，无需重写
  cpSync(resolve(root, 'tools/test/fixtures/blocks'), resolve(cityDir, 'blocks'), { recursive: true })
  cpSync(resolve(root, 'tools/test/fixtures/buildings/good-tower'), resolve(cityDir, 'buildings/b-000001-good-tower'), { recursive: true })
  cpSync(resolve(root, 'tools/test/fixtures/buildings/bad-bbox'), resolve(cityDir, 'buildings/b-000002-bad-bbox'), { recursive: true })
  cpSync(resolve(root, 'tools/test/fixtures/buildings/bad-height'), resolve(cityDir, 'buildings/b-000003-bad-height'), { recursive: true })
  cpSync(resolve(root, 'tools/test/fixtures/buildings/bad-tris'), resolve(cityDir, 'buildings/b-000004-bad-tris'), { recursive: true })
  cpSync(resolve(root, 'tools/test/fixtures/buildings/bad-random'), resolve(cityDir, 'buildings/b-000005-bad-random'), { recursive: true })
  cpSync(resolve(root, 'tools/test/fixtures/buildings/bad-cross-import'), resolve(cityDir, 'buildings/b-000006-bad-cross'), { recursive: true })
  cpSync(resolve(root, 'tools/test/fixtures/buildings/good-tower'), resolve(cityDir, 'buildings/good-tower'), { recursive: true })
  cpSync(resolve(root, 'tools/test/fixtures/buildings/bad-empty'), resolve(cityDir, 'buildings/b-000007-bad-empty'), { recursive: true })
  cpSync(resolve(root, 'tools/test/fixtures/buildings/bad-quality'), resolve(cityDir, 'buildings/b-000008-bad-quality'), { recursive: true })
  cpSync(resolve(root, 'tools/test/fixtures/buildings/bad-setback'), resolve(cityDir, 'buildings/b-000010-bad-setback'), { recursive: true })
  cpSync(resolve(root, 'tools/test/fixtures/buildings/good-tower'), resolve(cityDir, 'buildings/b-000009-good-tower'), { recursive: true })
  cpSync(resolve(root, 'tools/test/fixtures/buildings/good-custom-block'), resolve(cityDir, 'buildings/b-000011-good-custom-block'), { recursive: true })
  cpSync(resolve(root, 'tools/test/fixtures/buildings/bad-cross-block'), resolve(cityDir, 'buildings/b-000012-bad-cross-block'), { recursive: true })
  // bad-cross-import 的 index.ts import '../good-tower/index'——上面额外复制一份**原名** good-tower 供其解析
  // （无登记行的目录：inspectBuilding 不做孤儿检测，只有 inspectCity 查）
  const libCtxAbs = resolve(root, 'lib/ctx').replace(/\\/g, '/')
  for (const d of COPIED_DIRS) {
    const p = resolve(cityDir, 'buildings', d, 'index.ts')
    writeFileSync(p, readFileSync(p, 'utf8').replace('\'../../../../../lib/ctx\'', `'${libCtxAbs}'`))
  }
})

afterAll(() => rmSync(cityDir, { recursive: true, force: true }))

describe('inspectBuilding R1–R12（spec §14 坏建筑样本全拦截）', () => {
  it('好建筑全绿且回填 mesh_stats', async () => {
    const rows = [row('b-000001', 'C3-05', 'buildings/b-000001-good-tower/index.ts')]
    const r = await inspectBuilding(root, cityDir, 'b-000001-good-tower', { registryOverride: rows })
    expect(r.passed).toBe(true)
    expect(r.results.map((x) => x.rule)).toHaveLength(14)
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
  it('R11/R12：低完成度且无 NOTES 的建筑被拦（[city-admin] 修宪 2026-09-25）', async () => {
    const rows = [row('b-000008', 'C3-08', 'buildings/b-000008-bad-quality/index.ts')]
    const r = await inspectBuilding(root, cityDir, 'b-000008-bad-quality', { registryOverride: rows })
    const r11 = r.results.find((x) => x.rule === 'R11')!
    const r12 = r.results.find((x) => x.rule === 'R12')!
    expect(r11.pass).toBe(false)
    expect(r11.detail).toMatch(/完成度不足/)
    expect(r12.pass).toBe(false)
    expect(r12.detail).toMatch(/NOTES/)
  })
  it('R13：贴线构件（超出中央 16×16）被拦（[city-admin] 退线法）', async () => {
    const rows = [row('b-000010', 'C3-10', 'buildings/b-000010-bad-setback/index.ts')]
    const r = await inspectBuilding(root, cityDir, 'b-000010-bad-setback', { registryOverride: rows })
    const r13 = r.results.find((x) => x.rule === 'R13')!
    expect(r13.pass).toBe(false)
    expect(r13.detail).toMatch(/退线不足/)
  })
  it('R14：使用本人名下自建积木（good-custom-block）R1–R14 全绿', async () => {
    const rows = [row('b-000011', 'C3-09', 'buildings/b-000011-good-custom-block/index.ts')]
    const r = await inspectBuilding(root, cityDir, 'b-000011-good-custom-block', { registryOverride: rows })
    expect(r.passed).toBe(true)
    expect(r.results.map((x) => x.rule)).toHaveLength(14)
    expect(r.results.find((x) => x.rule === 'R14')!.pass).toBe(true)
    expect(rows[0].mesh_stats?.triangles).toBeGreaterThan(50_000)   // 石灯叠在 good-tower 基底上，仍过 R11
  })
  it('R14：import 他模型名下积木被拦', async () => {
    const rows = [row('b-000012', 'C3-04', 'buildings/b-000012-bad-cross-block/index.ts')]
    const r = await inspectBuilding(root, cityDir, 'b-000012-bad-cross-block', { registryOverride: rows })
    const r14 = r.results.find((x) => x.rule === 'R14')!
    expect(r14.pass).toBe(false)
    expect(r14.detail).toMatch(/claude-sonnet-4\.5/)
    expect(r14.detail).toMatch(/他模型|其他模型/)
  })
  it('官方建筑豁免 R11/R12/R13', async () => {
    const rows = [row('b-000008', 'C3-08', 'buildings/b-000008-bad-quality/index.ts', 'official')]
    rows[0].builder = { model: 'official', model_id: 'official', agent: 'official' }
    const r = await inspectBuilding(root, cityDir, 'b-000008-bad-quality', { registryOverride: rows })
    expect(r.results.find((x) => x.rule === 'R11')!.pass).toBe(true)
    expect(r.results.find((x) => x.rule === 'R12')!.pass).toBe(true)
    expect(r.results.find((x) => x.rule === 'R13')!.pass).toBe(true)
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
  it('封存行重算不符即红，且不覆写 mesh_stats', async () => {
    const sealed = {
      ...row('b-000001', 'C3-05', 'buildings/b-000001-good-tower/index.ts'),
      completed_at: '2026-09-24T20:40:00+08:00' as string | null,
      mesh_stats: { triangles: 12400 },   // 故意与真实重算值（>100）不符
    }
    const rows = [sealed]
    const r = await inspectBuilding(root, cityDir, 'b-000001-good-tower', { registryOverride: rows })
    expect(r.passed).toBe(false)
    const registryFail = r.results.find((x) => x.rule === 'registry' && !x.pass)
    expect(registryFail).toBeDefined()
    expect(registryFail!.detail).toMatch(/重算不符/)
    expect(registryFail!.detail).toMatch(/12400/)
    expect(sealed.mesh_stats!.triangles).toBe(12400)   // 封存行未被覆写
  })
  it('R1：build() 执行异常时报告附异常栈（spec §8.1）', async () => {
    const rows = [row('b-000007', 'C3-07', 'buildings/b-000007-bad-empty/index.ts')]
    const r = await inspectBuilding(root, cityDir, 'b-000007-bad-empty', { registryOverride: rows })
    const r1 = r.results.find((x) => x.rule === 'R1' && !x.pass)!   // 编译 R1 通过 + 执行 R1 失败，取失败那条
    expect(r1.detail).toMatch(/建筑为空/)
    expect(r1.detail).toMatch(/at |Error/)   // 栈特征
  })
  it('inspectCity：并行全量后集中落盘，两行 mesh_stats 均回填（不用 override）', async () => {
    const registry = [
      row('b-000001', 'C3-05', 'buildings/b-000001-good-tower/index.ts'),
      row('b-000009', 'C3-06', 'buildings/b-000009-good-tower/index.ts'),
    ]
    writeFileSync(resolve(cityDir, 'registry.jsonl'), registry.map((x) => JSON.stringify(x)).join('\n') + '\n')
    const results = await inspectCity(root, cityDir)
    expect(results[0].building).toBe('（登记簿一致性）')
    expect(results[1].building).toBe('（自建积木库）')   // R14 配套：目录名合法 + 积木静态安检
    expect(results[1].passed).toBe(true)
    expect(results[1].results[0].detail).toMatch(/积木库安检通过（2 个模型目录）/)
    expect(results[2].building).toBe('（街区同源 advisory）')   // 同源偏好：advisory 永不挂红灯
    expect(results[2].passed).toBe(true)
    expect(results[2].results[0].detail).toMatch(/C3：同源 ✓ glm-5\.3 ×2/)
    const buildings = results.slice(3)   // 前三项为登记簿一致性、自建积木库与同源 advisory（临时城里其余 fixture 目录无登记行，属孤儿，不参与断言）
    expect(buildings).toHaveLength(2)
    expect(buildings.every((r) => r.passed)).toBe(true)
    const after = loadRegistry(cityDir)
    expect(after.map((x) => x.mesh_stats !== null)).toEqual([true, true])
    expect(after.every((x) => x.mesh_stats!.triangles > 100)).toBe(true)
    rmSync(resolve(cityDir, 'registry.jsonl'), { force: true })   // 清理，不影响其他测试
  })
})

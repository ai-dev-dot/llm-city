import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// 真实 git/tsx 子进程在并行负载下较慢：放宽本文件超时预算（Windows + 杀毒扫描实测需要）
vi.setConfig({ hookTimeout: 60_000, testTimeout: 60_000 })
import { runDemolish } from '../src/demolish'
import { runCheckHistory } from '../src/history'

let repo: string
const git = (cmd: string) => execSync(`git ${cmd}`, { cwd: repo, encoding: 'utf8' })
const registryFile = () => resolve(repo, 'cities/c1/registry.jsonl')
const rowLine = (id: string, lot: string, completedAt: string | null) => JSON.stringify({ id, lot, name: `楼${id}`, builder: { model: 'GLM-5.3', model_id: 'glm-5.3', agent: 'zcode', operator: 'Think' }, sessions: [{ date: '2026-09-24T20:00:00+08:00', input: 5, output: 5, note: '首建' }], tokens: { input: 5, output: 5 }, started_at: '2026-09-24T20:00:00+08:00', completed_at: completedAt, entry: `buildings/${id}-x/index.ts`, mesh_stats: null })
const commitCount = () => git('rev-list --count HEAD').trim()

beforeAll(() => {
  repo = mkdtempSync(resolve(tmpdir(), 'llm-city-demolish-'))
  git('init -q')
  git('config user.email t@t')
  git('config user.name t')
  git('commit --allow-empty -m init -q')
  mkdirSync(resolve(repo, 'cities/c1/buildings/b-000001-x'), { recursive: true })
  mkdirSync(resolve(repo, 'cities/c1/buildings/b-000002-x'), { recursive: true })
  writeFileSync(resolve(repo, 'cities/c1/buildings/b-000001-x/index.ts'), 'export default () => null\n')
  writeFileSync(resolve(repo, 'cities/c1/buildings/b-000002-x/index.ts'), 'export default () => null\n')
  // b-000003 故意只有登记行、没有目录：半拆除状态样本
  writeFileSync(registryFile(), [rowLine('b-000001', 'C3-05', null), rowLine('b-000002', 'C3-06', '2026-09-25T12:00:00+08:00'), rowLine('b-000003', 'C3-07', null)].join('\n') + '\n')
  git('add -A && git commit -m "开工 b-000001/2/3" -q')
})

afterAll(() => rmSync(repo, { recursive: true, force: true }))

describe('runDemolish（城主拆除接口）', () => {
  it('干跑（缺 --yes）：只出摘要，零改动、零 commit', async () => {
    const before = commitCount()
    const r = await runDemolish(repo, 'b-000001-x', {})
    expect(r.ok).toBe(true)
    expect(r.executed).toBe(false)
    expect(r.summary.join('\n')).toMatch(/在建/)
    expect(r.summary.join('\n')).toMatch(/--yes/)
    expect(existsSync(resolve(repo, 'cities/c1/buildings/b-000001-x'))).toBe(true)
    expect(readFileSync(registryFile(), 'utf8').split('\n').filter(Boolean).length).toBe(3)
    expect(commitCount()).toBe(before)
  })

  it('拆除在建建筑（目录名 + --yes + --reason）：删目录删行，[city-admin] commit，复验零违规', async () => {
    const r = await runDemolish(repo, 'b-000001-x', { yes: true, reason: '测试拆除' })
    expect(r.ok).toBe(true)
    expect(r.executed).toBe(true)
    expect(r.removed).toEqual({ directory: true, registryRow: true })
    expect(existsSync(resolve(repo, 'cities/c1/buildings/b-000001-x'))).toBe(false)
    expect(readFileSync(registryFile(), 'utf8')).not.toContain('b-000001')
    expect(git('log -1 --format=%B')).toMatch(/\[city-admin\]/)
    expect(git('log -1 --format=%B')).toMatch(/测试拆除/)
    expect(r.commit).toBeTruthy()
    expect(r.postCheckViolations).toEqual([])
    const chk = await runCheckHistory(repo, { from: 'HEAD^', to: 'HEAD' })
    expect(chk.violations).toEqual([])
    expect(git('status --porcelain').trim()).toBe('')
  })

  it('拆除竣工封存建筑（裸 id）：同样可拆，registry 归零', async () => {
    const r = await runDemolish(repo, 'b-000002', { yes: true })
    expect(r.ok).toBe(true)
    expect(r.executed).toBe(true)
    expect(r.summary.join('\n')).toMatch(/竣工封存/)
    expect(existsSync(resolve(repo, 'cities/c1/buildings/b-000002-x'))).toBe(false)
    expect(readFileSync(registryFile(), 'utf8').split('\n').filter(Boolean).length).toBe(1)
    const chk = await runCheckHistory(repo, { from: 'HEAD^', to: 'HEAD' })
    expect(chk.violations).toEqual([])
  })

  it('半拆除状态（登记行在、目录不在）：仍可拆，只剩删行', async () => {
    const r = await runDemolish(repo, 'b-000003', { yes: true })
    expect(r.ok).toBe(true)
    expect(r.removed).toEqual({ directory: false, registryRow: true })
    expect(readFileSync(registryFile(), 'utf8')).toBe('')
    const chk = await runCheckHistory(repo, { from: 'HEAD^', to: 'HEAD' })
    expect(chk.violations).toEqual([])
  })

  it('不存在的建筑：报错退出，不产生任何改动', async () => {
    const before = commitCount()
    const r = await runDemolish(repo, 'b-000099', { yes: true })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/找不到/)
    expect(commitCount()).toBe(before)
  })
})

import { execSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// 真实 git/tsx 子进程在并行负载下较慢：放宽本文件超时预算（Windows + 杀毒扫描实测需要）
vi.setConfig({ hookTimeout: 60_000, testTimeout: 60_000 })
import { runCheckHistory } from '../src/history'

let repo: string
const git = (cmd: string) => execSync(`git ${cmd}`, { cwd: repo })
const rowLine = (id: string, lot: string) => JSON.stringify({ id, lot, name: `楼${id}`, builder: { model: 'GLM-5.3', model_id: 'glm-5.3', agent: 'zcode', operator: 'Think' }, sessions: [], tokens: { input: null, output: null }, started_at: '2026-09-24T20:00:00+08:00', completed_at: null, entry: `buildings/${id}-x/index.ts`, mesh_stats: null })

beforeAll(() => {
  repo = mkdtempSync(resolve(tmpdir(), 'llm-city-hist-'))
  git('init -q')
  git('-c user.email=t@t -c user.name=t commit --allow-empty -m init -q')
  mkdirSync(resolve(repo, 'cities/c1'), { recursive: true })
  writeFileSync(resolve(repo, 'cities/c1/registry.jsonl'), rowLine('b-000001', 'C3-05') + '\n')
  git('add -A && git -c user.email=t@t -c user.name=t commit -m "开工 b-000001" -q')
})

afterAll(() => rmSync(repo, { recursive: true, force: true }))

describe('runCheckHistory（spec §5.4 受限编辑/封存、§9 CI）', () => {
  it('合法续建（追加 session/tokens）零违规', async () => {
    const line = JSON.parse(rowLine('b-000001', 'C3-05'))
    line.sessions.push({ date: '2026-09-25T10:00:00+08:00', input: 5, output: 5, note: '续建' })
    line.tokens = { input: 5, output: 5 }
    writeFileSync(resolve(repo, 'cities/c1/registry.jsonl'), JSON.stringify(line) + '\n')
    const r = await runCheckHistory(repo, { from: 'HEAD', to: 'WORKTREE' })
    expect(r.violations).toEqual([])
  })
  it('改他人不可变字段被拦', async () => {
    const line = JSON.parse(rowLine('b-000001', 'C3-06'))   // lot 被改
    writeFileSync(resolve(repo, 'cities/c1/registry.jsonl'), JSON.stringify(line) + '\n')
    const r = await runCheckHistory(repo, { from: 'HEAD', to: 'WORKTREE' })
    expect(r.violations.join('\n')).toMatch(/lot/)
  })
  it('admin commit 删除行放行（城主 revert 通道）', async () => {
    writeFileSync(resolve(repo, 'cities/c1/registry.jsonl'), '')
    git('add -A && git -c user.email=t@t -c user.name=t commit -m "revert 拆除 [city-admin]" -q')
    const r = await runCheckHistory(repo, { from: 'HEAD~1', to: 'HEAD' })
    expect(r.violations).toEqual([])
  })
})

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { checkRegistryEdit, parseRegistry } from '../../lib/registry'

/** 数组形式 execFileSync：绕开 shell——文件名/rev 不经 cmd.exe 解析（注入面与空格路径双防） */
function sh(repoRoot: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 }).trim()
}

export function loadRevText(repoRoot: string, rev: 'WORKTREE' | string, relPath: string): string | null {
  if (rev === 'WORKTREE') {
    try { return readFileSync(resolve(repoRoot, relPath), 'utf8') } catch { return null }
  }
  try { return sh(repoRoot, 'show', `${rev}:${relPath}`) } catch { return null }
}

function citiesWithRegistry(repoRoot: string, rev: 'WORKTREE' | string): string[] {
  if (rev === 'WORKTREE') {
    try { return sh(repoRoot, 'ls-files', '--', 'cities/*/registry.jsonl').split(/\r?\n/).filter(Boolean) }
    catch { return [] }
  }
  return sh(repoRoot, 'ls-tree', '-r', '--name-only', rev, '--').split(/\r?\n/).filter((f) => /^cities\/[^/]+\/registry\.jsonl$/.test(f))
}

function commitMessage(repoRoot: string, sha: string): string {
  return sh(repoRoot, 'log', '-1', '--format=%B', sha)
}

export async function runCheckHistory(repoRoot: string, opts: { from: string; to: string }) {
  const violations: string[] = []
  // 步进序列：from..to 的每个 commit；最后一段（to 为 WORKTREE 或 HEAD）单独比
  const range = `${opts.from}..${opts.to === 'WORKTREE' ? 'HEAD' : opts.to}`
  let shas: string[] = []
  try { shas = sh(repoRoot, 'rev-list', '--reverse', range).split(/\r?\n/).filter(Boolean) } catch { /* 空区间 */ }
  const pairs: Array<{ prevRev: string; currRev: 'WORKTREE' | string; admin: boolean }> = []
  let prev = opts.from
  for (const sha of shas) {
    pairs.push({ prevRev: prev, currRev: sha, admin: /\[city-admin\]/.test(commitMessage(repoRoot, sha)) })
    prev = sha
  }
  if (opts.to === 'WORKTREE') pairs.push({ prevRev: 'HEAD', currRev: 'WORKTREE', admin: false })
  else if (shas.length === 0 || shas[shas.length - 1] !== opts.to) pairs.push({ prevRev: prev, currRev: opts.to, admin: false })

  for (const p of pairs) {
    const files = new Set([...citiesWithRegistry(repoRoot, p.prevRev), ...citiesWithRegistry(repoRoot, p.currRev)])
    for (const f of files) {
      const prevText = loadRevText(repoRoot, p.prevRev, f) ?? ''
      const currText = loadRevText(repoRoot, p.currRev, f) ?? ''
      if (prevText === currText) continue
      if (p.admin) continue   // 城主标记操作（revert 拆除等），只做结构校验（inspectCity 负责）
      const v = checkRegistryEdit(parseRegistry(prevText), parseRegistry(currText))
      violations.push(...v.map((s) => `${f}：${s}`))
    }
  }
  return { violations, checkedCommits: pairs.length }
}

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadRegistry, writeRegistry, type RegistryRow } from '../../lib/registry'
import { runCheckHistory } from './history'

/** 数组形式 execFileSync：绕开 shell（同 history.ts） */
function sh(repoRoot: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 16 * 1024 * 1024 }).trim()
}

function cityIds(repoRoot: string): string[] {
  return readdirSync(resolve(repoRoot, 'cities'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
}
/** 目录名 → 建筑 id：接受 b-000042 与 b-000042-slug 两种形态 */
function idOfDirName(name: string): string | null {
  return name.match(/^(b-\d{6})(?:-[a-z0-9-]+)?$/)?.[1] ?? null
}
function dirNameOfEntry(entry: string): string | null {
  return /^buildings\/(b-\d{6}-[a-z0-9-]+)\/index\.ts$/.exec(entry)?.[1] ?? null
}

export interface DemolishReport {
  ok: boolean
  executed: boolean          // false = 干跑（未传 --yes）
  city?: string
  id?: string
  dirName?: string
  summary: string[]          // 目标建筑摘要（干跑与执行都给）
  removed: { directory: boolean; registryRow: boolean }
  commit: string | null      // 拆除 commit 的短 sha
  postCheckViolations: string[]  // 拆除后 HEAD^..HEAD 受限编辑复验
  warnings: string[]
  error?: string
}

export async function runDemolish(
  repoRoot: string,
  target: string,
  opts: { yes?: boolean; reason?: string },
): Promise<DemolishReport> {
  const report: DemolishReport = { ok: false, executed: false, summary: [], removed: { directory: false, registryRow: false }, commit: null, postCheckViolations: [], warnings: [] }
  try {
    // —— 定位：目录存在 或 登记行存在，二者占其一即可；跨城命中多个则拒绝 ——
    const hits: { city: string; dirName: string; row: RegistryRow | null; rows: RegistryRow[] }[] = []
    for (const city of cityIds(repoRoot)) {
      const cityDir = resolve(repoRoot, 'cities', city)
      let rows: RegistryRow[]
      try {
        rows = loadRegistry(cityDir)
      } catch (e) {
        report.error = `cities/${city}/registry.jsonl 解析失败，中止拆除：${(e as Error).message}`
        return report
      }
      const seen = new Set<string>()
      const idGuess = idOfDirName(target)   // 目录形态或裸 id 都能猜出 id
      const candidates: { dirName: string; row: RegistryRow | null }[] = []
      const dirNameOnDisk = existsSync(resolve(cityDir, 'buildings', target)) ? target : null
      if (dirNameOnDisk) { candidates.push({ dirName: dirNameOnDisk, row: idGuess ? rows.find((r) => r.id === idGuess) ?? null : null }); seen.add(dirNameOnDisk) }
      for (const r of rows) {
        if (r.id !== target && r.id !== idGuess) continue
        const dn = dirNameOfEntry(r.entry)
        if (dn && !seen.has(dn)) { candidates.push({ dirName: dn, row: r }); seen.add(dn) }
      }
      for (const c of candidates) hits.push({ city, dirName: c.dirName, row: c.row, rows })
    }
    if (hits.length === 0) { report.error = `找不到建筑 ${target}（目录与登记行均不存在，已搜索 cities/*/）`; return report }
    if (hits.length > 1) { report.error = `${target} 在多个城命中：${hits.map((h) => h.city).join(', ')}——请逐城明确拆除`; return report }
    const { city, dirName, row, rows } = hits[0]
    const cityDir = resolve(repoRoot, 'cities', city)
    const id = row?.id ?? idOfDirName(dirName) ?? dirName
    const hadRow = row !== null
    const hadDirectory = existsSync(resolve(cityDir, 'buildings', dirName))
    if (!hadRow && !hadDirectory) { report.error = `找不到建筑 ${target}（目录与登记行均不存在）`; return report }

    report.city = city; report.id = id; report.dirName = dirName
    report.summary = [
      `${row ? `登记行：${row.name}（${row.lot}）` : '登记行：不存在（仅目录）'}`,
      row ? `建造者：${row.builder.model}（${row.builder.model_id}）` : null,
      row ? `状态：${row.completed_at ? `竣工封存（${row.completed_at}）` : '在建'}` : null,
      `目录：cities/${city}/buildings/${dirName}${hadDirectory ? '' : '（不存在）'}`,
      row ? `施工 ${row.sessions.length} 次，tokens ${row.tokens.input ?? '?'}/${row.tokens.output ?? '?'}` : null,
    ].filter((x): x is string => x !== null)

    // —— 干跑：只出摘要 ——
    if (!opts.yes) {
      report.ok = true
      report.summary.push('—— 干跑（dry-run），未做任何改动；确认执行请加 --yes')
      return report
    }

    // —— 执行 ——
    if (hadDirectory) rmSync(resolve(cityDir, 'buildings', dirName), { recursive: true, force: true })
    if (hadRow) writeRegistry(cityDir, rows.filter((r) => r.id !== id))
    report.removed = { directory: hadDirectory, registryRow: hadRow }

    // 拆除 commit：只圈定受影响路径（部分提交），不影响工作区其他改动
    const rowRel = `cities/${city}/registry.jsonl`
    const dirRel = `cities/${city}/buildings/${dirName}`
    let trackedDir = false
    try { trackedDir = hadDirectory && sh(repoRoot, 'ls-files', '--', dirRel).length > 0 } catch { /* 未跟踪 */ }
    const pathspecs = [hadRow ? rowRel : null, trackedDir ? dirRel : null].filter((x): x is string => x !== null)
    if (pathspecs.length > 0) {
      const label = dirName !== id ? dirName : id
      const subject = `demolish(city): [city-admin] 城主拆除 ${label}${row ? `「${row.name}」` : ''}`
      const msg = opts.reason ? `${subject}\n\n${opts.reason}` : subject
      sh(repoRoot, 'commit', '-m', msg, '--', ...pathspecs)
      report.commit = sh(repoRoot, 'rev-parse', '--short', 'HEAD')
    } else {
      report.warnings.push('没有已跟踪的变更（登记行与目录本就不在 git 里），未生成 commit')
    }

    // 复验：拆除 commit 必须被 check-history 认可（[city-admin] 通道）
    try {
      sh(repoRoot, 'rev-parse', '--verify', '--quiet', 'HEAD^')
      const chk = await runCheckHistory(repoRoot, { from: 'HEAD^', to: 'HEAD' })
      report.postCheckViolations = chk.violations
    } catch { report.warnings.push('仓库无父提交，跳过受限编辑复验') }

    // 本地生成产物刷新（web/src/generated/ 已 gitignore，不进 commit）
    const genScript = resolve(repoRoot, 'web/scripts/gen-city.mjs')
    if (existsSync(genScript)) {
      try { execFileSync(process.execPath, [genScript], { cwd: repoRoot, stdio: 'ignore' }) } catch (e) {
        report.warnings.push(`gen:city 重新生成失败（不影响拆除，下次 preview 会重试）：${(e as Error).message}`)
      }
    }

    report.ok = true; report.executed = true
    return report
  } catch (e) {
    report.error = (e as Error).message
    return report
  }
}

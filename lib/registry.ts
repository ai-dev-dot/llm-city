import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export interface SessionRecord { date: string; input: number | null; output: number | null; note?: string }
export interface RegistryRow {
  id: string; lot: string; name: string; desc?: string
  builder: { model: string; model_id: string; agent: string; operator?: string }
  sessions: SessionRecord[]
  tokens: { input: number | null; output: number | null }
  started_at: string; completed_at: string | null
  entry: string
  mesh_stats: { triangles: number } | null
}

export function registryPath(cityDir: string): string {
  return resolve(cityDir, 'registry.jsonl')
}
export function parseRegistry(text: string): RegistryRow[] {
  const rows: RegistryRow[] = []
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    try {
      rows.push(JSON.parse(line) as RegistryRow)
    } catch (e) {
      throw new Error(`registry.jsonl 第 ${i + 1} 行不是合法 JSON：${(e as Error).message}`)
    }
  }
  return rows
}
export function serializeRegistry(rows: RegistryRow[]): string {
  return rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : '')
}
export function loadRegistry(cityDir: string): RegistryRow[] {
  return parseRegistry(readFileSync(registryPath(cityDir), 'utf8'))
}
export function writeRegistry(cityDir: string, rows: RegistryRow[]): void {
  writeFileSync(registryPath(cityDir), serializeRegistry(rows))
}

const TS_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d+)?(Z|[+-](0\d|1[0-4]):[0-5]\d)$/
export function validateTimestamp(s: string): boolean {
  return TS_RE.test(s) && !Number.isNaN(Date.parse(s))
}

export function localIsoNow(): string {
  const d = new Date()
  const p = (n: number, l = 2) => String(n).padStart(l, '0')
  const off = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` +
    `${sign}${p(Math.floor(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)}`
}

const ID_RE = /^b-\d{6}$/
const ENTRY_RE = /^buildings\/(b-\d{6})-[a-z0-9-]+\/index\.ts$/

export function validateRow(row: RegistryRow, rowIndex: number): string[] {
  const errs: string[] = []
  const at = `登记行 ${rowIndex + 1}（${row.id ?? '?'}）：`
  if (!row.id || !ID_RE.test(row.id)) errs.push(`${at}id 必须形如 b-000042`)
  const m = row.entry?.match(ENTRY_RE)
  if (!m) errs.push(`${at}entry 必须形如 buildings/b-XXXXXX-slug/index.ts（正斜杠、slug 小写）`)
  else if (row.id && m[1] !== row.id) errs.push(`${at}entry 目录 (${m[1]}) 与行 id 不一致`)
  if (!validateTimestamp(row.started_at ?? '')) errs.push(`${at}started_at 不是带时区偏移的合法时间戳`)
  if (row.completed_at !== null && !validateTimestamp(row.completed_at)) errs.push(`${at}completed_at 非法`)
  if (!row.builder?.model || !row.builder?.model_id || !row.builder?.agent) errs.push(`${at}builder 字段缺失`)
  if (!Array.isArray(row.sessions)) errs.push(`${at}sessions 必须是数组`)
  if (!row.tokens || typeof row.tokens !== 'object') errs.push(`${at}tokens 缺失`)
  return errs
}

const IMMUTABLE: (keyof RegistryRow)[] = ['id', 'lot', 'name', 'desc', 'builder', 'started_at', 'entry']

export function checkRegistryEdit(
  prev: RegistryRow[],
  curr: RegistryRow[],
  opts?: { adminOverride?: boolean },
): string[] {
  if (opts?.adminOverride) return []
  const violations: string[] = []
  const currById = new Map(curr.map((r) => [r.id, r]))
  for (const p of prev) {
    const c = currById.get(p.id)
    if (!c) { violations.push(`登记行 ${p.id}（${p.name}）被删除——拆除须由城主以 [city-admin] 标记执行`); continue }
    if (p.completed_at !== null) {
      if (JSON.stringify(p) !== JSON.stringify(c)) violations.push(`竣工封存行 ${p.id}（${p.name}）被修改——completed_at 填写后整行冻结`)
      continue
    }
    for (const k of IMMUTABLE) {
      if (JSON.stringify(p[k]) !== JSON.stringify(c[k])) violations.push(`登记行 ${p.id}：不可变字段 ${k} 被修改`)
    }
  }
  return violations
}

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export interface SessionRecord { date: string; input: number | null; output: number | null; note?: string }
export interface RegistryRow {
  id: string; lot: string; name: string; desc?: string
  /** 宗地（[city-admin] 立法 2026-09-26 宪法第 14 条）：合并地块清单，须为同街区的 3×3 内矩形；
   *  省略 = 单地块 [lot]。lot 为锚点（显示用），parcel 为占地真值（占用/判定用） */
  parcel?: string[]
  builder: { model: string; model_id: string; agent: string; operator?: string }
  sessions: SessionRecord[]
  tokens: { input: number | null; output: number | null }
  started_at: string; completed_at: string | null
  entry: string
  mesh_stats: { triangles: number } | null
}

/** 行的占地地块清单：parcel 缺省时回退单地块 [lot] */
export function expandParcel(row: Pick<RegistryRow, 'lot' | 'parcel'>): string[] {
  return row.parcel && row.parcel.length ? row.parcel : [row.lot]
}

/** 宗地几何（矩形宗地的占地尺寸，米）：块内地块号 01–09 按 3×3 网格（号−1 → 行=÷3，列=%3，
 *  行沿 z、列沿 x，与 gen-plan 生成一致）。非法输入回退 20×20。 */
export function parcelDims(row: Pick<RegistryRow, 'lot' | 'parcel'>): [number, number] {
  const lots = expandParcel(row)
  if (lots.length === 1) return [20, 20]
  const nums = lots.map((l) => parseInt(l.split('-')[1] ?? '', 10))
  if (nums.some((n) => !Number.isInteger(n) || n < 1 || n > 9)) return [20, 20]
  const rows = nums.map((n) => Math.floor((n - 1) / 3))
  const cols = nums.map((n) => (n - 1) % 3)
  return [(Math.max(...cols) - Math.min(...cols) + 1) * 20, (Math.max(...rows) - Math.min(...rows) + 1) * 20]
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
  // 宗地（宪法第 14 条）：同街区、3×3 内矩形、锚点在册
  if (row.parcel !== undefined) {
    if (!Array.isArray(row.parcel) || !row.parcel.length) errs.push(`${at}parcel 必须是非空地块数组`)
    else {
      if (!row.parcel.includes(row.lot)) errs.push(`${at}锚点 lot ${row.lot} 不在 parcel 内`)
      const blocks = new Set(row.parcel.map((l) => String(l).split('-')[0]))
      if (blocks.size > 1) errs.push(`${at}parcel 跨街区（${[...blocks].join('、')}）——宗地不得跨街区（宪法第 14 条/R15）`)
      const nums = row.parcel.map((l) => parseInt(String(l).split('-')[1] ?? '', 10))
      if (nums.some((n) => !Number.isInteger(n) || n < 1 || n > 9)) {
        errs.push(`${at}parcel 地块编号非法（须为同街区 01–09）`)
      } else {
        const uniq = new Set(nums)
        if (uniq.size !== row.parcel.length) errs.push(`${at}parcel 含重复地块`)
        else {
          const rs = nums.map((n) => Math.floor((n - 1) / 3)), cs = nums.map((n) => (n - 1) % 3)
          const expect = (Math.max(...rs) - Math.min(...rs) + 1) * (Math.max(...cs) - Math.min(...cs) + 1)
          if (uniq.size !== expect) errs.push(`${at}parcel 不是矩形（宗地仅允许 1×1/1×2/2×1/1×3/3×1/2×2/2×3/3×2/3×3 矩形合并）`)
        }
      }
    }
  }
  return errs
}

const IMMUTABLE: (keyof RegistryRow)[] = ['id', 'lot', 'parcel', 'name', 'desc', 'builder', 'started_at', 'entry']

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

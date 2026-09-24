import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export interface ModelIdentityTable {
  vendors: Record<string, { name: string; color: string }>
  models: Array<{ id: string; vendor: string; aliases: string[] }>
}

export function loadIdentityTable(repoRoot: string): ModelIdentityTable {
  const raw = JSON.parse(readFileSync(resolve(repoRoot, 'models.json'), 'utf8'))
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.models) || !raw.vendors) {
    throw new Error('models.json 结构不合法：需要 vendors 与 models')
  }
  return raw as ModelIdentityTable
}

export function canonicalize(raw: string): string {
  let s = raw.trim().toLowerCase()
  s = s.replace(/[\s_]+/g, '-')
  s = s.replace(/[^a-z0-9./-]/g, '')
  s = s.replace(/^[a-z0-9.-]+\//g, '')
  s = s.replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '')
  return s
}

export type ResolveResult = { ok: true; modelId: string } | { ok: false; error: string }

export function resolveModelId(raw: string, table: ModelIdentityTable): ResolveResult {
  const key = canonicalize(raw)
  if (!key) return { ok: false, error: `身份名 "${raw}" 归一后为空` }
  for (const m of table.models) {
    if (canonicalize(m.id) === key) return { ok: true, modelId: m.id }
  }
  for (const m of table.models) {
    for (const alias of m.aliases) {
      if (canonicalize(alias) === key) return { ok: true, modelId: m.id }
    }
  }
  return {
    ok: false,
    error: `R10：模型 "${raw}"（归一为 "${key}"）未在 models.json 登记唯一身份——请先补登记 canonical id 与别名，再施工`,
  }
}

// 从 cities/<id>/ 生成 web/src/generated/city-data.ts（gitignore，构建/预览前必跑）
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const cityId = process.argv[2] ?? 'c1'
const cityDir = resolve(repoRoot, 'cities', cityId)
const models = JSON.parse(readFileSync(resolve(repoRoot, 'models.json'), 'utf8'))
const plan = JSON.parse(readFileSync(resolve(cityDir, 'plan.json'), 'utf8'))
const registryText = readFileSync(resolve(cityDir, 'registry.jsonl'), 'utf8')
const rows = registryText.split(/\r?\n/).filter((l) => l.trim()).map((l, i) => {
  try { return JSON.parse(l) } catch { throw new Error(`registry.jsonl 第 ${i + 1} 行不是合法 JSON`) }
})

const vendorOf = (modelId) => {
  const m = models.models.find((x) => x.id === modelId)
  return m ? { id: m.vendor, ...models.vendors[m.vendor] } : null
}
const buildings = rows.map((r) => {
  const entryDir = r.entry.replace(/\/index\.ts$/, '')
  const notesPath = resolve(cityDir, entryDir, 'NOTES.md')
  let notesExcerpt = null
  if (existsSync(notesPath)) {
    const raw = readFileSync(notesPath, 'utf8')
    // 优先取「## 摘要」节（builder 写好的两三句）；无该节回退为清洗后的前 300 字
    const strip = (text) => text
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*#{1,6}\s*/, '').replace(/^\s*[-*]\s+/, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n')
    const m = raw.match(/^##\s*摘要\s*$/m)
    if (m) {
      const rest = raw.slice(m.index + m[0].length)
      const end = rest.search(/^##\s/m)
      notesExcerpt = strip(end === -1 ? rest : rest.slice(0, end))
    } else {
      notesExcerpt = strip(raw)
    }
    if (notesExcerpt.length > 300) notesExcerpt = notesExcerpt.slice(0, 300) + '…'
  }
  // 宗地几何（[city-admin] 立法 2026-09-26 宪法第 14 条）：parcel 缺省 = 单地块；
  // 中心 = 宗地各地块中心均值（矩形宗地即几何中心），尺寸 = 包络 + 单地块边长
  const parcel = Array.isArray(r.parcel) && r.parcel.length ? r.parcel : [r.lot]
  const parcelLots = parcel.map((id) => plan.lots.find((l) => l.id === id)).filter(Boolean)
  const parcelCenter = parcelLots.length
    ? [
        parcelLots.reduce((s, l) => s + l.center[0], 0) / parcelLots.length,
        parcelLots.reduce((s, l) => s + l.center[1], 0) / parcelLots.length,
      ]
    : null
  const parcelSize = parcelLots.length
    ? [
        Math.max(...parcelLots.map((l) => l.center[0])) - Math.min(...parcelLots.map((l) => l.center[0])) + 20,
        Math.max(...parcelLots.map((l) => l.center[1])) - Math.min(...parcelLots.map((l) => l.center[1])) + 20,
      ]
    : null
  return {
    id: r.id, lot: r.lot, parcel, parcelCenter, parcelSize, name: r.name, desc: r.desc ?? '',
    model: r.builder.model, modelId: r.builder.model_id, vendor: vendorOf(r.builder.model_id),
    agent: r.builder.agent, operator: r.builder.operator ?? null,
    sessions: r.sessions, tokens: r.tokens,
    startedAt: r.started_at, completedAt: r.completed_at,
    notesExcerpt, entryDir,
  }
})

// 街区主题名（blockplans/<district>.md 首行标题「# F4 街区总图 · 灯花栖居街区 …」）
const blockplansDir = resolve(cityDir, 'blockplans')
const blockNames = {}
if (existsSync(blockplansDir)) {
  for (const f of readdirSync(blockplansDir)) {
    if (!f.endsWith('.md') || f === 'README.md') continue
    const head = readFileSync(resolve(blockplansDir, f), 'utf8').match(/^#\s+\S+\s+街区总图\s*·\s*(\S+)/m)
    if (head) blockNames[f.replace(/\.md$/, '')] = head[1]
  }
}

// 生成文件位于 web/src/generated/，到仓库根需三级 ../（../../ 会落在 web/ 下，typecheck 与 vite 均不可达）；
// import 路径省略 .ts 后缀（TS5097，web/tsconfig 裁决不启用 allowImportingTsExtensions），Vite/tsc 均可解析
const loaders = rows.map((r) => `  '${r.id}': () => import('../../../cities/${cityId}/${r.entry.replace(/\.ts$/, '')}'),`).join('\n')

const out = `// 本文件由 web/scripts/gen-city.mjs 生成——勿手改（npm run gen:city）
import type { BuildCtx } from '../../../lib/ctx'
import type { Object3D } from 'three'

export interface BuildingRecord {
  id: string; lot: string; parcel: string[]; parcelCenter: [number, number] | null; parcelSize: [number, number] | null
  name: string; desc: string
  model: string; modelId: string; vendor: { id: string; name: string; color: string } | null
  agent: string; operator: string | null
  sessions: Array<{ date: string; input: number | null; output: number | null; note?: string }>
  tokens: { input: number | null; output: number | null }
  startedAt: string; completedAt: string | null
  notesExcerpt: string | null; entryDir: string
}
export interface CityData {
  id: string; name: string; founded: string
  grid: { blocks: number; blockPitch: number; roadWidth: number }
  lots: Array<{ id: string; center: [number, number]; size: [number, number]; district: string }>
  buildings: BuildingRecord[]
  blockNames: Record<string, string>
}

export const city: CityData = ${JSON.stringify({ id: plan.id, name: plan.name, founded: plan.founded, grid: { blocks: plan.grid.blocks, blockPitch: plan.grid.blockPitch, roadWidth: plan.grid.roadWidth }, lots: plan.lots, buildings, blockNames }, null, 2)}

export const buildingLoaders: Record<string, () => Promise<{ default: (ctx: BuildCtx) => Object3D }>> = {
${loaders}
}
`

const outDir = resolve(repoRoot, 'web/src/generated')
mkdirSync(outDir, { recursive: true })
writeFileSync(resolve(outDir, 'city-data.ts'), out)
console.log(`gen:city → ${buildings.length} 栋建筑（${cityId}），plan ${plan.lots.length} 地块`)

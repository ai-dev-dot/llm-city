import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { inspectBuilding, inspectCity } from './inspect'

const repoRoot = resolve(import.meta.dirname, '../..')
const [, , cmd, ...args] = process.argv

function cityDirOf(repoRoot: string, cityId: string) { return resolve(repoRoot, 'cities', cityId) }
function allCities(repoRoot: string): string[] {
  return readdirSync(resolve(repoRoot, 'cities'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
}
/** 参数给出的建筑目录名在哪个城：唯一匹配返回 [cityId, dirName]，否则报错退出 */
const exists = (p: string) => { try { readdirSync(p); return true } catch { return false } }
function locateBuilding(name: string): [string, string] {
  const hits: [string, string][] = []
  for (const c of allCities(repoRoot)) {
    const dir = resolve(repoRoot, 'cities', c, 'buildings', name)
    if (exists(dir)) hits.push([c, name])
  }
  if (hits.length === 0) { console.error(`找不到建筑目录 ${name}（已搜索 cities/*/buildings/）`); process.exit(2) }
  if (hits.length > 1) { console.error(`建筑目录 ${name} 在多个城出现：${hits.map((h) => h[0]).join(', ')}`); process.exit(2) }
  return hits[0]
}

async function main() {
  if (cmd === 'inspect') {
    const json = args.includes('--json')
    const complete = args.includes('--complete')
    const target = args.find((a) => !a.startsWith('--'))
    let results
    if (target) {
      const [city, dir] = locateBuilding(target)
      results = [await inspectBuilding(repoRoot, cityDirOf(repoRoot, city), dir, { complete })]
    } else {
      results = []
      for (const c of allCities(repoRoot)) results.push(...await inspectCity(repoRoot, cityDirOf(repoRoot, c)))
    }
    if (json) { console.log(JSON.stringify(results, null, 2)) }
    else {
      for (const r of results) {
        console.log(`\n● ${r.city} / ${r.building}  ${r.passed ? 'PASS' : 'FAIL'}`)
        for (const x of r.results) console.log(`  ${x.pass ? '✓' : '✗'} ${x.rule}  ${x.detail}`)
      }
    }
    process.exit(results.every((r) => r.passed) ? 0 : 1)
  }
  if (cmd === 'state') {
    const { buildStateReport } = await import('./state')
    console.log(JSON.stringify(buildStateReport(resolve(repoRoot, 'cities')), null, 2))
    return
  } else {
    console.error('用法：npm run inspect -- [建筑目录名] [--json] [--complete]')
    process.exit(2)
  }
}
void main()

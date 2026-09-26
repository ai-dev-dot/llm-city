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
  if (cmd === 'demolish') {
    const { runDemolish } = await import('./demolish')
    const yes = args.includes('--yes')
    const ri = args.indexOf('--reason')
    const reason = ri >= 0 ? args[ri + 1] : undefined
    const target = args.find((a, i) => !a.startsWith('--') && (ri < 0 || i !== ri + 1))
    if (!target) {
      console.error('用法：npm run demolish -- <建筑目录名|建筑id> [--yes] [--reason 文本]（缺 --yes 为干跑）')
      process.exit(2)
    }
    const r = await runDemolish(repoRoot, target, { yes, reason })
    for (const s of r.summary) console.log(r.executed ? '  ' + s : s)
    for (const w of r.warnings) console.log(`  ⚠ ${w}`)
    if (!r.ok) { console.error(`✗ ${r.error}`); process.exit(2) }
    if (r.executed) {
      console.log(`拆除完成 ✓（${r.removed.directory ? '目录已删' : '目录本不存在'}、${r.removed.registryRow ? '登记行已删' : '登记行本不存在'}）`)
      if (r.commit) console.log(`commit ${r.commit}（[city-admin] 通道，未 push——push 由城主手动执行）`)
      if (r.postCheckViolations.length) {
        console.error(`受限编辑复验异常（不应发生，请检查）：\n` + r.postCheckViolations.map((v) => `  ✗ ${v}`).join('\n'))
        process.exit(1)
      }
    }
    return
  }
  if (cmd === 'check-history') {
    const { runCheckHistory } = await import('./history')
    const from = args.find((a) => a.startsWith('--from='))?.slice(7) ?? 'HEAD'
    const to = args.find((a) => a.startsWith('--to='))?.slice(5) ?? 'WORKTREE'
    const r = await runCheckHistory(repoRoot, { from, to })
    if (r.violations.length) {
      console.error(`受限编辑校验未通过（${r.checkedCommits} 个提交步骤）：\n` + r.violations.map((v) => `  ✗ ${v}`).join('\n'))
      process.exit(1)
    }
    console.log(`受限编辑校验通过 ✓（${r.checkedCommits} 个提交步骤）`)
    return
  }
  if (cmd === 'state') {
    const { buildStateReport } = await import('./state')
    console.log(JSON.stringify(buildStateReport(resolve(repoRoot, 'cities')), null, 2))
    return
  }
  if (cmd === 'shot') {
    const { runShot } = await import('./shot/run')
    const { loadRegistry, expandParcel, parcelDims } = await import('../../lib/registry')
    const { hashSeed } = await import('../../lib/ctx')
    const target = args.find((a) => !a.startsWith('--'))
    if (!target) {
      console.error('用法：npm run shot -- <建筑目录名|建筑id> [--views street,corner,aerial,top,front,back,left,right] [--amb day,dusk,night] [--width 960] [--out 目录] [--eye x,y,z --target x,y,z --fov 度（自定义机位）]')
      process.exit(2)
    }
    const [city, dir] = locateBuilding(target)
    const cityDir = cityDirOf(repoRoot, city)
    const id = dir.match(/^(b-\d{6})-/)?.[1]
    const row = loadRegistry(cityDir).find((r) => r.id === id)
    if (!row) {
      console.error(`登记簿中找不到 ${dir} 的登记行——shot 按登记宗地出图，请先登记骨架`)
      process.exit(2)
    }
    // 同时支持 --x=v 与 --x v 两种形式
    const opt = (name: string): string | undefined => {
      const eq = args.find((a) => a.startsWith(`--${name}=`))
      if (eq !== undefined) return eq.slice(name.length + 3)
      const i = args.indexOf(`--${name}`)
      return i >= 0 ? args[i + 1] : undefined
    }
    const views = opt('views')?.split(',') as import('./shot/run').ShotOptions['views'] | undefined
    const ambs = opt('amb')?.split(',') as import('./shot/run').ShotOptions['ambs'] | undefined
    const width = Number(opt('width')) || undefined
    const outDir = opt('out')
    // 自定义机位：--eye x,y,z --target x,y,z [--fov 度]
    const vec3 = (s: string | undefined): [number, number, number] | undefined => {
      const v = s?.split(',').map(Number)
      return v?.length === 3 && v.every((n) => Number.isFinite(n)) ? v as [number, number, number] : undefined
    }
    const eye = vec3(opt('eye'))
    const aim = vec3(opt('target'))
    if ((opt('eye') || opt('target')) && (!eye || !aim)) {
      console.error('--eye/--target 均须为 x,y,z 三个有限数字（世界坐标，宗地中心为原点，Y 向上）')
      process.exit(2)
    }
    const custom = eye && aim ? { eye, target: aim, fov: Number(opt('fov')) || undefined } : undefined
    // 给了自定义机位而未指定 --views 时，默认机位组追加 custom
    const effViews = views ?? (custom ? ['street', 'corner', 'aerial', 'top', 'custom'] as import('./shot/run').ShotOptions['views'] : undefined)
    const nLots = expandParcel(row).length
    const t0 = Date.now()
    const r = await runShot(repoRoot, cityDir, dir, { id: expandParcel(row).join('+'), size: parcelDims(row), maxHeight: 300 }, hashSeed(row.id), { views: effViews, ambs, width, outDir, custom })
    if (!r.ok) {
      console.error(`✗ shot 失败：${r.error}${r.stack ? `\n${r.stack}` : ''}`)
      process.exit(2)
    }
    console.log(`● ${city} / ${dir}  ${r.triangles?.toLocaleString()} 三角形，包围盒 ${r.size?.join(' × ')}m，渲染 ${r.shots?.length} 张耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`)
    for (const s of r.shots ?? []) console.log(`  📷 ${s.view}-${s.amb}.png  (${(s.bytes / 1024).toFixed(0)}KB)  ${s.path}`)
    return
  } else {
    console.error([
      '用法：',
      '  npm run state',
      '  npm run inspect -- [建筑目录名] [--json] [--complete]',
      '  npm run shot -- <建筑目录名|建筑id> [--views ...] [--amb day,dusk,night] [--width 960] [--out 目录] [--eye x,y,z --target x,y,z --fov 度]',
      '  npm run demolish -- <建筑目录名|建筑id> [--yes] [--reason 文本]   # 城主拆除',
      '  npm run check-history -- --from=<rev> --to=<rev|WORKTREE>',
    ].join('\n'))
    process.exit(2)
  }
}
void main()

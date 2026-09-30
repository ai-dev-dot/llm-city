import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { inspectBuilding, inspectCity } from './inspect'
import { resolveBuildingHits } from './locate'

const repoRoot = resolve(import.meta.dirname, '../..')
const [, , cmd, ...args] = process.argv

function cityDirOf(repoRoot: string, cityId: string) { return resolve(repoRoot, 'cities', cityId) }
function allCities(repoRoot: string): string[] {
  return readdirSync(resolve(repoRoot, 'cities'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
}
/** 参数给出的建筑在哪个城：接受完整目录名（b-000031-yuguang-yard）或裸 id（b-000031）——
 *  解析在 ./locate（纯函数，带测试）；唯一匹配返回 [cityId, dirName]，否则报错退出 */
function locateBuilding(name: string): [string, string] {
  const hits = resolveBuildingHits(resolve(repoRoot, 'cities'), name)
  if (hits.length === 0) { console.error(`找不到建筑 ${name}（已搜 cities/*/buildings/ 的目录名与裸 id b-000031 形态）`); process.exit(2) }
  if (hits.length > 1) { console.error(`建筑 ${name} 在多个城出现：${hits.map((h) => h[0]).join(', ')}`); process.exit(2) }
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
    const { runShot, runBlockShot } = await import('./shot/run')
    const { loadRegistry, expandParcel, parcelDims } = await import('../../lib/registry')
    const { hashSeed } = await import('../../lib/ctx')
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
    const block = opt('block')?.toUpperCase()
    if (block) {
      // 街区级 shot：定位含该街区的城 → 全部已登记建筑同场出图（总图自评）
      let cityId: string | null = null
      for (const c of allCities(repoRoot)) {
        const plan = JSON.parse(readFileSync(resolve(repoRoot, 'cities', c, 'plan.json'), 'utf8'))
        if ((plan.lots as Array<{ district: string }>).some((l) => l.district.toUpperCase() === block)) { cityId = c; break }
      }
      if (!cityId) { console.error(`所有城的 plan 里都找不到街区 ${block}`); process.exit(2) }
      const t0 = Date.now()
      const r = await runBlockShot(repoRoot, cityDirOf(repoRoot, cityId), block, { views, ambs, width, outDir })
      if (!r.ok) {
        console.error(`✗ shot 失败：${r.error}${r.stack ? `\n${r.stack}` : ''}`)
        process.exit(2)
      }
      console.log(`● ${cityId} / 街区 ${block}  ${r.triangles?.toLocaleString()} 三角形，包围盒 ${r.size?.join(' × ')}m，渲染 ${r.shots?.length} 张耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`)
      for (const s of r.shots ?? []) console.log(`  📷 ${s.view}-${s.amb}.png  (${(s.bytes / 1024).toFixed(0)}KB)  ${s.path}`)
      return
    }
    const target = args.find((a) => !a.startsWith('--'))
    if (!target) {
      console.error('用法：npm run shot -- <建筑目录名|建筑id | --block 街区id> [--views street,corner,aerial,top,front,back,left,right] [--amb day,dusk,night] [--width 960] [--out 目录] [--eye x,y,z --target x,y,z --fov 度（自定义机位，单建筑）]')
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
  }
  if (cmd === 'probe') {
    const { compileBuilding } = await import('./compile')
    const { runHeadless } = await import('./headless/run')
    const { loadRegistry, expandParcel, parcelDims } = await import('../../lib/registry')
    const { hashSeed } = await import('../../lib/ctx')
    // R13 退线自查：inspect 对豁免建筑（官方）只回一句「豁免」就丢掉了实测数字（inspect.ts:183
    // 走 isOfficial 分支，184-188 那条带数字的分支被整个跳过），此处把 worker 算出的数字原样
    // 摊开。判定不在此重复实现——与 inspect 共用 headless/setback.ts，故不会与真实判定脱节。
    const json = args.includes('--json')
    const target = args.find((a) => !a.startsWith('--'))
    if (!target) {
      console.error('用法：npm run probe -- <建筑目录名|建筑id> [--json]（有越界构件时退出码 1）')
      process.exit(2)
    }
    const [city, dir] = locateBuilding(target)
    const cityDir = cityDirOf(repoRoot, city)
    const id = dir.match(/^(b-\d{6})-/)?.[1]
    const row = loadRegistry(cityDir).find((r) => r.id === id)
    if (!row) {
      console.error(`登记簿中找不到 ${dir} 的登记行——probe 按登记宗地量核心矩形，请先登记骨架`)
      process.exit(2)
    }
    const outPath = resolve(repoRoot, `node_modules/.cache/llm-city/buildings/${dir}.mjs`)
    const compiled = await compileBuilding(resolve(cityDir, 'buildings', dir, 'index.ts'), repoRoot, outPath)
    if (!compiled.ok || !outPath) {
      console.error(`✗ 编译失败：\n${compiled.errors.map((e) => `  ${e}`).join('\n')}`)
      process.exit(2)
    }
    const parcel = expandParcel(row)
    const size = parcelDims(row)
    const head = await runHeadless(outPath, { id: parcel.join('+'), size, maxHeight: 300 }, hashSeed(row.id), 10_000 * parcel.length)
    if (!head.ok) {
      console.error(`✗ 无头执行失败：${head.error}${head.stack ? `\n${head.stack}` : ''}`)
      process.exit(2)
    }
    const sb = head.setback
    if (!sb) { console.error('✗ worker 未返回退线结果'); process.exit(2) }
    const isOfficial = row.builder.model_id === 'official'
    if (json) {
      console.log(JSON.stringify({ city, building: dir, builder: row.builder.model_id, parcel, size, triangles: head.triangles, meshes: head.meshes, exempt: isOfficial, setback: sb }, null, 2))
    } else {
      const core = `${(sb.coreHalfX * 2).toFixed(0)}×${(sb.coreHalfZ * 2).toFixed(0)}`
      console.log(`\n● ${city} / ${dir}  ${row.builder.model_id}`)
      console.log(`  宗地 ${size[0]}×${size[1]}m（${parcel.join('+')}）→ R13 核心矩形 ${core}m`)
      console.log(`  三角 ${head.triangles?.toLocaleString()}  mesh ${head.meshes ?? 0}`)
      if (sb.violations === 0) {
        console.log(`  ✓ R13 退线达标：无构件越界`)
      } else {
        console.log(`  ✗ R13 退线不足：${sb.violations} 个构件越界，最远超出 ${sb.worst.toFixed(2)}m`)
        for (const it of sb.items) {
          console.log(`      超出 ${it.over.toFixed(2)}m  ${it.geometry}  世界坐标 ${it.position.map((v) => v.toFixed(1)).join(', ')}  ` +
            `包围盒 x ${it.box.minX.toFixed(1)}..${it.box.maxX.toFixed(1)}  z ${it.box.minZ.toFixed(1)}..${it.box.maxZ.toFixed(1)}  ` +
            `顶 ${it.topY.toFixed(1)}m  尺寸 ${it.extX.toFixed(1)}×${it.extZ.toFixed(1)}`)
        }
        if (sb.violations > sb.items.length) console.log(`      …… 另有 ${sb.violations - sb.items.length} 个构件未列出（明细上限 ${sb.items.length} 条）`)
      }
      if (isOfficial) {
        console.log(`  ℹ 官方建筑不受 R13 强制约束（inspect R13 显示「官方建筑豁免退线」）——本命令是自愿自查，数字以 R13 为准但不改判定`)
      }
    }
    process.exit(sb.violations === 0 ? 0 : 1)
  } else {
    console.error([
      '用法：',
      '  npm run state',
      '  npm run inspect -- [建筑目录名] [--json] [--complete]',
      '  npm run probe -- <建筑目录名|建筑id> [--json]   # R13 退线自查（豁免建筑专用；有越界时退出码 1）',
      '  npm run shot -- <建筑目录名|建筑id> [--views ...] [--amb day,dusk,night] [--width 960] [--out 目录] [--eye x,y,z --target x,y,z --fov 度]',
      '  npm run shot -- --block <街区id> [--views ...] [--amb ...] [--width 1280]   # 街区总图：全部建筑同场 + 底图上下文',
      '  npm run demolish -- <建筑目录名|建筑id> [--yes] [--reason 文本]   # 城主拆除',
      '  npm run check-history -- --from=<rev> --to=<rev|WORKTREE>',
    ].join('\n'))
    process.exit(2)
  }
}
void main()

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { loadIdentityTable, resolveModelId } from '../../lib/identity'
import { localIsoNow, loadRegistry, validateRow, writeRegistry, type RegistryRow } from '../../lib/registry'
import { hashSeed } from '../../lib/ctx'
import { checkAllowedInputs, compileBuilding, readDirSources, scanSource, rel } from './compile'
import { runHeadless } from './headless/run'
import type { PlanData } from './gen-plan'

export interface RuleResult { rule: string; pass: boolean; detail: string }
export interface InspectResult { building: string; city: string; passed: boolean; results: RuleResult[] }

const ok = (rule: string, detail: string): RuleResult => ({ rule, pass: true, detail })
const bad = (rule: string, detail: string): RuleResult => ({ rule, pass: false, detail })

/** R11/R12 品质下限（[city-admin] 修宪 2026-09-25）：官方建筑（model=official）豁免 */
export const QUALITY_FLOOR = { minTriangles: 50_000, minMeshes: 60, notesMinChars: 200 }
const isOfficial = (row: RegistryRow) => row.builder.model_id === 'official'

export function loadPlan(cityDir: string): PlanData {
  return JSON.parse(readFileSync(resolve(cityDir, 'plan.json'), 'utf8')) as PlanData
}

export function parseBuildingId(dirName: string): string | null {
  const m = dirName.match(/^(b-\d{6})-[a-z0-9-]+$/)
  return m ? m[1] : null
}

export async function inspectBuilding(
  repoRoot: string,
  cityDir: string,
  buildingDirName: string,
  opts: { complete?: boolean; registryOverride?: RegistryRow[] },
): Promise<InspectResult> {
  const cityId = JSON.parse(readFileSync(resolve(cityDir, 'plan.json'), 'utf8')).id
  const buildingDir = resolve(cityDir, 'buildings', buildingDirName)
  const entry = resolve(buildingDir, 'index.ts')
  const results: RuleResult[] = []
  const id = parseBuildingId(buildingDirName)

  const rows = opts.registryOverride ?? loadRegistry(cityDir)
  const row = id ? rows.find((r) => r.id === id) : undefined
  const plan = loadPlan(cityDir)
  const table = loadIdentityTable(repoRoot)

  // R5/R6a：源码静态扫描（不依赖编译，最先跑，坏代码也能给出可读报告）。
  // 扫描范围 = 建筑目录 + 本人自建积木目录全部 .ts（[city-admin] 立法 R14 2026-09-25：
  // 防把 Math.random/fetch 等黑名单原语藏进积木绕过安检；本人积木库有脏件即本模型建筑红灯，属资产自负）
  const selfBlocksDir = row ? resolve(cityDir, 'blocks', row.builder.model_id) : null
  const sources = [
    ...readDirSources(buildingDir),
    ...(selfBlocksDir && existsSync(selfBlocksDir) ? readDirSources(selfBlocksDir) : []),
  ]
  const hits = scanSource(sources)
  const r5 = hits.filter((h) => h.rule === 'R5')
  results.push(r5.length ? bad('R5', r5.map((h) => `${h.file}：${h.msg}`).join('；')) : ok('R5', `黑名单零命中（${sources.length} 个源文件）`))
  const r6a = hits.filter((h) => h.rule === 'R6')
  if (r6a.length) results.push(bad('R6', `源码黑名单：${r6a.map((h) => `${h.file}：${h.msg}`).join('；')}`))

  // R1：编译
  const outPath = resolve(repoRoot, `node_modules/.cache/llm-city/buildings/${buildingDirName}.mjs`)
  const compiled = await compileBuilding(entry, repoRoot, outPath)
  results.push(compiled.ok ? ok('R1', 'esbuild 编译通过') : bad('R1', `编译失败：${compiled.errors.join('；')}`))

  // R6b/R8/R14：import 白名单（dirRel 以物理路径计算——对真实城等于 c1/buildings/<dir>，对测试临时城跨盘也成立）
  const dirRel = relative(repoRoot, buildingDir).replace(/\\/g, '/')
  const selfBlocksDirRel = selfBlocksDir ? rel(selfBlocksDir, repoRoot) : undefined
  const importViolations = checkAllowedInputs(compiled.inputFiles, dirRel, repoRoot, { selfBlocksDirRel })
  if (!r6a.length) {
    const cross = importViolations.filter((v) => v.tag === 'R6/R8')
    const crossBlock = importViolations.filter((v) => v.tag === 'R14')
    results.push(cross.length ? bad('R6', cross.map((v) => v.msg).join('；')) : ok('R6', 'import 白名单通过（three、lib/*、本目录、本人积木库）'))
    results.push(cross.length ? bad('R8', `跨建筑引用：${cross.map((v) => v.msg).join('；')}`) : ok('R8', '无跨建筑 import'))
    results.push(crossBlock.length
      ? bad('R14', `使用了他模型自建积木：${crossBlock.map((v) => v.msg).join('；')}`)
      : ok('R14', `未引用他模型积木（${selfBlocksDirRel ? `本人积木库 ${selfBlocksDirRel} 可用` : '无登记行，按无自建积木校验'}）`))
  }

  // R7：地块
  if (!row) {
    results.push(bad('R7', `登记簿中找不到 id=${id ?? '(目录名不合法)'} 的登记行——请先登记骨架（CITY.md 第 4 步）`))
  } else {
    const lot = plan.lots.find((l) => l.id === row.lot)
    const occupied = rows.some((r) => r.lot === row.lot && r.id !== row.id)
    if (!lot) results.push(bad('R7', `地块 ${row.lot} 不在规划图中`))
    else if (occupied) results.push(bad('R7', `地块 ${row.lot} 已被其他建筑占用`))
    else results.push(ok('R7', `地块 ${row.lot} 合法且未占用`))
  }

  // R10：身份归一 + 施工资格白名单（[city-admin] 修宪 2026-09-25：本城仅接收城主白名单模型）
  if (!row) {
    results.push(bad('R10', '无登记行，无法校验身份'))
  } else {
    const res = resolveModelId(row.builder.model, table)
    if (!res.ok) results.push(bad('R10', res.error))
    else if (res.modelId !== row.builder.model_id) results.push(bad('R10', `builder.model "${row.builder.model}" 归一为 ${res.modelId}，与登记 model_id "${row.builder.model_id}" 不一致`))
    else if (plan.policy?.allowedModelIds && !plan.policy.allowedModelIds.includes(row.builder.model_id)) results.push(bad('R10', `身份 ${res.modelId} 不在城主施工白名单（plan.json policy.allowedModelIds：${plan.policy.allowedModelIds.join('、')}）——本城不接收白名单外模型开工`))
    else results.push(ok('R10', `身份 ${res.modelId} 归一一致${plan.policy?.allowedModelIds ? '，且在城主施工白名单内' : ''}`))
  }

  // R12：设计文档（修宪：施工前比选与预算分配须留痕；官方建筑豁免）
  if (row && isOfficial(row)) {
    results.push(ok('R12', '官方建筑豁免设计文档'))
  } else {
    const notesPath = resolve(buildingDir, 'NOTES.md')
    let notes: string | null = null
    if (existsSync(notesPath)) notes = readFileSync(notesPath, 'utf8')
    if (!notes) results.push(bad('R12', '缺 NOTES.md 设计文档——须含立意、方案比选结论与三角预算分配表（CITY.md 第 2 步）'))
    else if (notes.length < QUALITY_FLOOR.notesMinChars) results.push(bad('R12', `NOTES.md 过短（${notes.length} 字 < ${QUALITY_FLOOR.notesMinChars}）——补齐立意、形制与预算分配`))
    else if (!notes.includes('预算')) results.push(bad('R12', 'NOTES.md 缺三角预算分配（「预算」节）——每类构件的计划面数与实际开销'))
    else results.push(ok('R12', `设计文档 ${notes.length} 字，含预算分配`))
  }

  // R2/R3/R4/R9：无头执行
  if (compiled.ok && !r6a.length && !importViolations.length && row) {
    const lot = plan.lots.find((l) => l.id === row.lot)
    const head = await runHeadless(outPath, { id: row.lot, size: lot?.size ?? [20, 20], maxHeight: 300 }, hashSeed(row.id))
    if (!head.ok) {
      results.push(bad('R1', `build() 执行失败：${head.error}${head.stack ? `\n${head.stack}` : ''}`))
      results.push(bad('R2', '未执行')); results.push(bad('R3', '未执行')); results.push(bad('R4', '未执行')); results.push(bad('R9', '未执行')); results.push(bad('R13', '未执行'))
    } else {
      results.push(ok('R9', '执行在时限内完成'))
      const halfW = (lot?.size[0] ?? 20) / 2 + 0.5, halfD = (lot?.size[1] ?? 20) / 2 + 0.5
      const minX = head.bboxMin![0], maxX = head.bboxMax![0], minZ = head.bboxMin![2], maxZ = head.bboxMax![2]
      const overX = Math.max(Math.abs(minX), Math.abs(maxX)) - halfW, overZ = Math.max(Math.abs(minZ), Math.abs(maxZ)) - halfD
      results.push(Math.max(overX, overZ) <= 0
        ? ok('R2', `包围盒 ${ (maxX - minX).toFixed(1) }m × ${ (maxZ - minZ).toFixed(1) }m（含 0.5m 容差内）`)
        : bad('R2', `水平投影超界 ${Math.max(overX, overZ).toFixed(2)}m（包围盒 ${(maxX - minX).toFixed(1)}×${(maxZ - minZ).toFixed(1)}m，地块 20×20m）`))
      results.push(head.bboxMax![1] <= 300
        ? ok('R3', `高度 ${head.bboxMax![1].toFixed(1)}m ≤ 300m`)
        : bad('R3', `高度 ${head.bboxMax![1].toFixed(1)}m 超出 300m 限高 ${(head.bboxMax![1] - 300).toFixed(1)}m`))
      results.push(head.triangles <= 500_000
        ? ok('R4', `三角形 ${head.triangles.toLocaleString()} ≤ 500,000（防故障护栏）`)
        : bad('R4', `三角形 ${head.triangles.toLocaleString()} 超出 500,000 防故障护栏 ${(head.triangles - 500_000).toLocaleString()}`))

      // R11：完成度下限（修宪：防最简可行解——预算上限的 24% 与构件密度是底线）
      if (isOfficial(row)) {
        results.push(ok('R11', '官方建筑豁免品质下限'))
      } else {
        const triFloor = head.triangles >= QUALITY_FLOOR.minTriangles
        const meshFloor = (head.meshes ?? 0) >= QUALITY_FLOOR.minMeshes
        results.push(triFloor && meshFloor
          ? ok('R11', `完成度达标：三角形 ${head.triangles.toLocaleString()} ≥ ${QUALITY_FLOOR.minTriangles.toLocaleString()}，mesh ${head.meshes} ≥ ${QUALITY_FLOOR.minMeshes}（防故障护栏 500,000 的 ${(head.triangles / 5000).toFixed(0)}%）`)
          : bad('R11', `完成度不足：三角形 ${head.triangles.toLocaleString()}（需 ≥ ${QUALITY_FLOOR.minTriangles.toLocaleString()}），mesh ${head.meshes ?? 0}（需 ≥ ${QUALITY_FLOOR.minMeshes}）——加密窗棂/栏杆/线脚/柱阵等细部，把预算分配表花掉`))
      }

      // R13：退线（修宪：建筑本体落于地块中央 16×16，四周至少 2m 场地带；地被层/小件/薄板/景观件已在 worker 豁免）
      if (isOfficial(row)) {
        results.push(ok('R13', '官方建筑豁免退线'))
      } else if (head.setback) {
        results.push(head.setback.violations === 0
          ? ok('R13', `退线达标：建筑本体落于中央 ${(head.setback.coreHalf * 2).toFixed(0)}×${(head.setback.coreHalf * 2).toFixed(0)}，四周留足场地带`)
          : bad('R13', `退线不足：${head.setback.violations} 个构件超出中央 ${(head.setback.coreHalf * 2).toFixed(0)}×${(head.setback.coreHalf * 2).toFixed(0)}（最远超出 ${head.setback.worst.toFixed(2)}m）——建筑本体四周至少退 2m 留作场地（地被层/小件/薄板/景观件豁免）`))
      }

      // 回写与竣工（对 override 数组同样生效，测试即验证）。
      // 封存行（completed_at 非空）不回写：重算一致则静默跳过（不重复写封存行）；不符则红——
      // 竣工封存行整行冻结（spec §9 登记簿受限编辑），mesh_stats 对不上即视为疑似篡改。
      const passed = results.every((r) => r.pass)
      if (passed && row.completed_at !== null) {
        if (row.mesh_stats?.triangles !== head.triangles) {
          results.push(bad('registry', `mesh_stats 重算不符：登记 ${row.mesh_stats?.triangles} ≠ 重算 ${head.triangles}——封存行疑似被篡改`))
        }
      } else if (passed) {
        row.mesh_stats = { triangles: head.triangles }
        if (opts.complete) row.completed_at = localIsoNow()
        if (!opts.registryOverride) writeRegistry(cityDir, rows)   // 落盘回写
      }
    }
  } else {
    for (const rule of ['R2', 'R3', 'R4', 'R9']) results.push(bad(rule, '前置规则未通过，跳过执行'))
  }

  return { building: buildingDirName, city: cityId, passed: results.every((r) => r.pass), results }
}

export async function inspectCity(repoRoot: string, cityDir: string): Promise<InspectResult[]> {
  const rows = loadRegistry(cityDir)
  const cityId = JSON.parse(readFileSync(resolve(cityDir, 'plan.json'), 'utf8')).id
  const errs: string[] = []
  // 结构一致性（spec §9 CI 项 1）
  rows.forEach((r, i) => errs.push(...validateRow(r, i)))
  const ids = rows.map((r) => r.id)
  if (new Set(ids).size !== ids.length) errs.push('登记簿内 id 重复')
  const lots = rows.map((r) => r.lot)
  const dupLot = lots.find((l, i) => lots.indexOf(l) !== i)
  if (dupLot) errs.push(`地块 ${dupLot} 被双登记`)
  // 孤儿建筑目录
  const buildingsDir = resolve(cityDir, 'buildings')
  if (existsSync(buildingsDir)) {
    for (const d of readdirSync(buildingsDir, { withFileTypes: true })) {
      if (d.isDirectory() && !ids.includes(parseBuildingId(d.name) ?? '')) errs.push(`建筑目录 ${d.name} 无对应登记行（孤儿目录）`)
    }
  }
  // entry 文件存在
  for (const r of rows) if (!existsSync(resolve(cityDir, r.entry))) errs.push(`${r.id} entry 不存在：${r.entry}`)

  const structResult: InspectResult = {
    building: '（登记簿一致性）', city: cityId,
    passed: errs.length === 0,
    results: errs.length ? [bad('registry', errs.join('；'))] : [ok('registry', `${rows.length} 行全部一致`)],
  }

  // 自建积木库（[city-admin] 立法 R14 2026-09-25）：子目录名必须是已登记 model_id；
  // 全部积木源码过静态安检（含暂无建筑引用的孤儿积木——防藏黑名单原语等日后被 import）
  const blocksRootDir = resolve(cityDir, 'blocks')
  const blockErrs: string[] = []
  if (existsSync(blocksRootDir)) {
    const knownIds = new Set(loadIdentityTable(repoRoot).models.map((m) => m.id))
    for (const d of readdirSync(blocksRootDir, { withFileTypes: true })) {
      if (!d.isDirectory()) continue
      if (!knownIds.has(d.name)) blockErrs.push(`积木目录 blocks/${d.name} 不是 models.json 已登记的 model_id`)
      for (const h of scanSource(readDirSources(resolve(blocksRootDir, d.name)))) {
        blockErrs.push(`blocks/${d.name} ${rel(h.file, repoRoot)}：${h.msg}`)
      }
    }
  }
  const blocksResult: InspectResult = {
    building: '（自建积木库）', city: cityId,
    passed: blockErrs.length === 0,
    results: blockErrs.length
      ? [bad('R14', blockErrs.join('；'))]
      : [ok('R14', existsSync(blocksRootDir) ? `积木库安检通过（${readdirSync(blocksRootDir, { withFileTypes: true }).filter((d) => d.isDirectory()).length} 个模型目录）` : '暂无自建积木库')],
  }

  // 逐建筑 R1–R10（并行执行控制 CI 时长；**共享同一 rows 数组作 registryOverride——mesh_stats/completed_at 全部写进内存数组，Promise.all 后集中落盘一次**，避免各建筑各自 loadRegistry 快照并行 writeRegistry 的丢失更新）
  const dirs = rows.map((r) => r.entry.split('/')[1]).filter(Boolean)
  const dirResults = await Promise.all(dirs.map((d) => inspectBuilding(repoRoot, cityDir, d, { registryOverride: rows })))
  if (dirs.length) writeRegistry(cityDir, rows)
  return [structResult, blocksResult, ...dirResults]
}

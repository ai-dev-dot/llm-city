import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { loadIdentityTable, resolveModelId } from '../../lib/identity'
import { localIsoNow, loadRegistry, validateRow, writeRegistry, type RegistryRow } from '../../lib/registry'
import { hashSeed } from '../../lib/ctx'
import { checkAllowedInputs, compileBuilding, readBuildingSources, scanSource } from './compile'
import { runHeadless } from './headless/run'
import type { PlanData } from './gen-plan'

export interface RuleResult { rule: string; pass: boolean; detail: string }
export interface InspectResult { building: string; city: string; passed: boolean; results: RuleResult[] }

const ok = (rule: string, detail: string): RuleResult => ({ rule, pass: true, detail })
const bad = (rule: string, detail: string): RuleResult => ({ rule, pass: false, detail })

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

  // R5/R6a：源码静态扫描（不依赖编译，最先跑，坏代码也能给出可读报告）
  const sources = readBuildingSources(buildingDir)
  const hits = scanSource(sources)
  const r5 = hits.filter((h) => h.rule === 'R5')
  results.push(r5.length ? bad('R5', r5.map((h) => `${h.file}：${h.msg}`).join('；')) : ok('R5', `黑名单零命中（${sources.length} 个源文件）`))
  const r6a = hits.filter((h) => h.rule === 'R6')
  if (r6a.length) results.push(bad('R6', `源码黑名单：${r6a.map((h) => `${h.file}：${h.msg}`).join('；')}`))

  // R1：编译
  const outPath = resolve(repoRoot, `node_modules/.cache/llm-city/buildings/${buildingDirName}.mjs`)
  const compiled = await compileBuilding(entry, repoRoot, outPath)
  results.push(compiled.ok ? ok('R1', 'esbuild 编译通过') : bad('R1', `编译失败：${compiled.errors.join('；')}`))

  // R6b/R8：import 白名单（dirRel 以物理路径计算——对真实城等于 c1/buildings/<dir>，对测试临时城跨盘也成立）
  const dirRel = relative(repoRoot, buildingDir).replace(/\\/g, '/')
  const importViolations = checkAllowedInputs(compiled.inputFiles, dirRel, repoRoot)
  if (!r6a.length) {
    const cross = importViolations.filter((v) => v.startsWith('R6/R8'))
    results.push(cross.length ? bad('R6', cross.join('；')) : ok('R6', 'import 白名单通过（three、lib/*、本目录）'))
    results.push(cross.length ? bad('R8', `跨建筑引用：${cross.join('；')}`) : ok('R8', '无跨建筑 import'))
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

  // R10：身份
  if (!row) {
    results.push(bad('R10', '无登记行，无法校验身份'))
  } else {
    const res = resolveModelId(row.builder.model, table)
    if (!res.ok) results.push(bad('R10', res.error))
    else if (res.modelId !== row.builder.model_id) results.push(bad('R10', `builder.model "${row.builder.model}" 归一为 ${res.modelId}，与登记 model_id "${row.builder.model_id}" 不一致`))
    else results.push(ok('R10', `身份 ${res.modelId} 归一一致`))
  }

  // R2/R3/R4/R9：无头执行
  if (compiled.ok && !r6a.length && !importViolations.length && row) {
    const lot = plan.lots.find((l) => l.id === row.lot)
    const head = await runHeadless(outPath, { id: row.lot, size: lot?.size ?? [20, 20], maxHeight: 300 }, hashSeed(row.id))
    if (!head.ok) {
      results.push(bad('R1', `build() 执行失败：${head.error}`))
      results.push(bad('R2', '未执行')); results.push(bad('R3', '未执行')); results.push(bad('R4', '未执行')); results.push(bad('R9', '未执行'))
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
      results.push(head.triangles <= 50_000
        ? ok('R4', `三角形 ${head.triangles.toLocaleString()} ≤ 50,000`)
        : bad('R4', `三角形 ${head.triangles.toLocaleString()} 超出 50,000 上限 ${(head.triangles - 50_000).toLocaleString()}`))

      // 回写与竣工（对 override 数组同样生效，测试即验证）
      const passed = results.every((r) => r.pass)
      if (passed) {
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

  // 逐建筑 R1–R10（并行，控制 CI 时长——spec §8.1）
  const dirs = rows.map((r) => r.entry.split('/')[1]).filter(Boolean)
  const dirResults = await Promise.all(dirs.map((d) => inspectBuilding(repoRoot, cityDir, d, {})))
  return [structResult, ...dirResults]
}

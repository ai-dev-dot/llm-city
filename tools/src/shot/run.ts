import { Worker } from 'node:worker_threads'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import * as esbuild from 'esbuild'
import * as url from 'node:url'
import type { Lot } from '../../../lib/ctx'
import { hashSeed } from '../../../lib/ctx'
import { loadRegistry, expandParcel, parcelDims } from '../../../lib/registry'
import { compileBuilding } from '../compile'
import type { ViewName } from './render'

export interface ShotResult {
  ok: boolean
  error?: string
  stack?: string
  triangles?: number
  size?: [string, string, string]
  shots?: Array<{ path: string; view: string; amb: string; bytes: number }>
}

export interface ShotOptions {
  views?: ViewName[]
  ambs?: Array<'day' | 'dusk' | 'night'>
  width?: number
  outDir?: string
  timeoutMs?: number
  /** 自定义机位（--eye/--target/--fov）：官方预设机位不敷使用时的正规出口，无需自建工具 */
  custom?: { eye: [number, number, number]; target: [number, number, number]; fov?: number }
}

/** shot worker 编译缓存指纹：worker.ts + tools/src/shot 全部 .ts + lib 全部 .ts（同 headless/run.ts 的机制） */
function shotFingerprint(repoRoot: string): string {
  const hash = createHash('sha256')
  const walk = (dir: string) => {
    for (const f of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = resolve(dir, f.name)
      if (f.isDirectory()) walk(p)
      else if (f.name.endsWith('.ts')) {
        hash.update(relative(repoRoot, p).replace(/\\/g, '/'))
        hash.update(readFileSync(p, 'utf8'))
      }
    }
  }
  hash.update(readFileSync(resolve(repoRoot, 'tools/src/shot/worker.ts'), 'utf8'))
  walk(resolve(repoRoot, 'tools/src/shot'))
  walk(resolve(repoRoot, 'lib'))
  return hash.digest('hex')
}

/** 幂等编译 shot worker → node_modules/.cache/llm-city/shot-worker.mjs（external three，机制同 headless ensureWorker） */
export function ensureShotWorker(repoRoot: string): string {
  const out = resolve(repoRoot, 'node_modules/.cache/llm-city/shot-worker.mjs')
  const stamp = `${out}.sha`
  const digest = shotFingerprint(repoRoot)
  if (existsSync(out) && existsSync(stamp) && readFileSync(stamp, 'utf8') === digest) return out
  mkdirSync(resolve(repoRoot, 'node_modules/.cache/llm-city'), { recursive: true })
  esbuild.buildSync({
    entryPoints: [resolve(repoRoot, 'tools/src/shot/worker.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: out,
    external: ['three'],
    logLevel: 'silent',
  })
  writeFileSync(stamp, digest)
  return out
}

/** 对一栋建筑出多视角渲染图：编译建筑（与 inspect 共享编译缓存）→ worker 内软件光栅化 → PNG 落盘。
 *  全程无浏览器：确定性、零浏览器进程、秒级。 */
export async function runShot(
  repoRoot: string,
  cityDir: string,
  buildingDirName: string,
  lot: Lot,
  seed: number,
  opts: ShotOptions = {},
): Promise<ShotResult> {
  const buildingDir = resolve(cityDir, 'buildings', buildingDirName)
  const entry = resolve(buildingDir, 'index.ts')
  const outPath = resolve(repoRoot, `node_modules/.cache/llm-city/buildings/${buildingDirName}.mjs`)
  const compiled = await compileBuilding(entry, repoRoot, outPath)
  if (!compiled.ok) return { ok: false, error: `编译失败：${compiled.errors.join('；')}` }

  const views = opts.views ?? ['street', 'corner', 'aerial', 'top']
  const ambs = opts.ambs ?? ['day']
  const width = Math.min(2400, Math.max(320, opts.width ?? 960))
  const outDir = opts.outDir ?? resolve(repoRoot, 'node_modules/.cache/llm-city/shots', buildingDirName)

  const workerPath = ensureShotWorker(repoRoot)
  return new Promise((resolvePromise) => {
    const w = new Worker(workerPath, {
      workerData: { moduleUrl: url.pathToFileURL(outPath).href, lot, seed, views, ambs, width, custom: opts.custom },
    })
    let settled = false
    const finish = (r: ShotResult) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      void w.terminate()
      resolvePromise(r)
    }
    const timer = setTimeout(() => finish({ ok: false, error: `渲染超时（${(opts.timeoutMs ?? 60_000) / 1000}s）——可加大 timeoutMs 或减少视角` }), opts.timeoutMs ?? 60_000)
    w.once('message', (m: { ok: boolean; error?: string; stack?: string; triangles?: number; size?: [string, string, string]; shots?: Array<{ view: string; amb: string; png: Buffer }> }) => {
      if (!m.ok) return finish({ ok: false, error: m.error, stack: m.stack })
      mkdirSync(outDir, { recursive: true })
      const shots = (m.shots ?? []).map((s) => {
        const path = resolve(outDir, `${s.view}-${s.amb}.png`)
        writeFileSync(path, s.png)
        return { path, view: s.view, amb: s.amb, bytes: s.png.length }
      })
      finish({ ok: true, triangles: m.triangles, size: m.size, shots })
    })
    w.once('error', (e: Error) => finish({ ok: false, error: `worker 异常：${e.message}` }))
    w.once('exit', (code) => {
      if (!settled) finish({ ok: false, error: `worker 意外退出（code ${code}）` })
    })
  })
}

/** 收集一个范围（街区 / 全城）内全部已登记建筑，编译并推导摆位——静图与绕飞动画共用。
 *  district = null 表示全城（不过滤街区，全城建筑同场）。 */
async function collectEntries(
  repoRoot: string,
  cityDir: string,
  district: string | null,
): Promise<{ ok: true; entries: Array<{ name: string; moduleUrl: string; position: [number, number]; lot: Lot; seed: number }>; context: { lots: Array<[number, number]>; grid: { blocks: number; blockPitch: number; roadWidth: number } } } | { ok: false; error: string }> {
  const plan = JSON.parse(readFileSync(resolve(cityDir, 'plan.json'), 'utf8')) as {
    grid: { blocks: number; blockPitch: number; roadWidth: number }
    lots: Array<{ id: string; center: [number, number]; district: string }>
  }
  const lotDistrict = new Map(plan.lots.map((l) => [l.id, l.district]))
  const rows = loadRegistry(cityDir).filter((row) =>
    district == null || expandParcel(row).some((id) => lotDistrict.get(id) === district))
  if (rows.length === 0) return { ok: false, error: district ? `街区 ${district} 没有已登记建筑（检查街区 id 与 registry.jsonl）` : '登记簿为空' }

  const entries: Array<{ name: string; moduleUrl: string; position: [number, number]; lot: Lot; seed: number }> = []
  for (const row of rows) {
    const dirName = row.entry.replace(/\/index\.ts$/, '').split('/').pop()!
    const entry = resolve(cityDir, row.entry)
    const outPath = resolve(repoRoot, `node_modules/.cache/llm-city/buildings/${dirName}.mjs`)
    const compiled = await compileBuilding(entry, repoRoot, outPath)
    if (!compiled.ok) return { ok: false, error: `${dirName} 编译失败：${compiled.errors.join('；')}` }
    const parcel = expandParcel(row)
    const centers = parcel
      .map((id) => plan.lots.find((l) => l.id === id)?.center)
      .filter((c): c is [number, number] => !!c)
    if (centers.length === 0) return { ok: false, error: `${dirName} 的宗地 ${parcel.join('+')} 在 plan 中不存在` }
    entries.push({
      name: dirName,
      moduleUrl: url.pathToFileURL(outPath).href,
      position: [
        centers.reduce((s, c) => s + c[0], 0) / centers.length,
        centers.reduce((s, c) => s + c[1], 0) / centers.length,
      ],
      lot: { id: parcel.join('+'), size: parcelDims(row), maxHeight: 300 },
      seed: hashSeed(row.id),
    })
  }
  return { ok: true, entries, context: { lots: plan.lots.map((l) => l.center), grid: plan.grid } }
}

/** 街区级 shot：把一个街区的全部已登记建筑按宗地中心摆进同一场景（附全城草皮/道路底图），
 *  按街区包围盒推机位出图——LLM 街区总图自评用（看群体关系：天际线主从、临街界面、退台让景）。
 *  单栋自评仍用 runShot；两者共用 worker 与编译缓存。 */
export async function runBlockShot(
  repoRoot: string,
  cityDir: string,
  district: string,
  opts: ShotOptions = {},
): Promise<ShotResult> {
  const collected = await collectEntries(repoRoot, cityDir, district)
  if (!collected.ok) return { ok: false, error: collected.error }

  const views = opts.views ?? ['street', 'corner', 'aerial', 'top']
  const ambs = opts.ambs ?? ['day']
  const width = Math.min(2400, Math.max(320, opts.width ?? 960))
  const outDir = opts.outDir ?? resolve(repoRoot, 'node_modules/.cache/llm-city/shots', `block-${district}`)

  const workerPath = ensureShotWorker(repoRoot)
  return new Promise((resolvePromise) => {
    const w = new Worker(workerPath, {
      workerData: {
        entries: collected.entries,
        context: collected.context,
        views, ambs, width,
      },
    })
    let settled = false
    const finish = (r: ShotResult) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      void w.terminate()
      resolvePromise(r)
    }
    const timer = setTimeout(() => finish({ ok: false, error: `渲染超时（${(opts.timeoutMs ?? 120_000) / 1000}s）——可减少视角或降低 width` }), opts.timeoutMs ?? 120_000)
    w.once('message', (m: { ok: boolean; error?: string; stack?: string; triangles?: number; size?: [string, string, string]; shots?: Array<{ view: string; amb: string; png: Buffer }> }) => {
      if (!m.ok) return finish({ ok: false, error: m.error, stack: m.stack })
      mkdirSync(outDir, { recursive: true })
      const shots = (m.shots ?? []).map((s) => {
        const path = resolve(outDir, `${s.view}-${s.amb}.png`)
        writeFileSync(path, s.png)
        return { path, view: s.view, amb: s.amb, bytes: s.png.length }
      })
      finish({ ok: true, triangles: m.triangles, size: m.size, shots })
    })
    w.once('error', (e: Error) => finish({ ok: false, error: `worker 异常：${e.message}` }))
    w.once('exit', (code) => {
      if (!settled) finish({ ok: false, error: `worker 意外退出（code ${code}）` })
    })
  })
}

export interface OrbitOptions {
  frames?: number                     // 缺省 80（8s 一圈 @ 10fps；50°/s——2026-10-02 城主裁决较初版 72°/s 减速）
  fps?: number                        // 缺省 10（流畅下限，勿再降；微信硬限 300 帧/文件内绰绰有余）
  amb?: 'day' | 'dusk' | 'night'      // 缺省 day
  width?: number                      // 缺省 960（gif 动图高清口径；体积主杠杆之一）
  gamma?: number                      // sRGB 提亮指数（缺省 2.2——对齐网页端观感；1 = 关闭）
  maxBytes?: number                   // 缺省 8MB——超限保时抽稀（帧时长×step，播放时长不变）
  outDir?: string
  timeoutMs?: number                  // 缺省 600s（全城 50 帧的余量）
  onProgress?: (done: number, total: number) => void
}

export interface OrbitResult {
  ok: boolean
  error?: string
  stack?: string
  triangles?: number
  size?: [string, string, string]
  gifPath?: string
  bytes?: number
  framesUsed?: number
  framesTotal?: number
  step?: number
  colors?: number
  durationS?: number
}

/** 绕飞动画 shot：街区（district 给定）或全城（null）的建筑同场，相机绕场景匀速环绕一圈，
 *  帧序列在 worker 内编码成循环 GIF。轨道首帧即 aerial 静图视角（与 runBlockShot 的 aerial 同一口径）。 */
export async function runOrbitShot(
  repoRoot: string,
  cityDir: string,
  district: string | null,
  opts: OrbitOptions = {},
): Promise<OrbitResult> {
  const collected = await collectEntries(repoRoot, cityDir, district)
  if (!collected.ok) return { ok: false, error: collected.error }

  const frames = opts.frames ?? 80
  const fps = opts.fps ?? 10
  const amb = opts.amb ?? 'day'
  const width = Math.min(1280, Math.max(320, opts.width ?? 960))
  const gamma = opts.gamma ?? 2.2
  const maxBytes = opts.maxBytes ?? 8 * 1024 * 1024
  const outDir = opts.outDir ?? resolve(repoRoot, 'node_modules/.cache/llm-city/shots', district ? `block-${district}` : 'city')
  const outPath = resolve(outDir, `orbit-${amb}.gif`)

  const workerPath = ensureShotWorker(repoRoot)
  return new Promise((resolvePromise) => {
    const w = new Worker(workerPath, {
      workerData: {
        entries: collected.entries,
        context: collected.context,
        views: [], ambs: [], width,
        orbit: { frames, amb, maxBytes, frameMs: Math.round(1000 / fps), gamma },
      },
    })
    let settled = false
    const finish = (r: OrbitResult) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      void w.terminate()
      resolvePromise(r)
    }
    const timer = setTimeout(() => finish({ ok: false, error: `渲染超时（${(opts.timeoutMs ?? 600_000) / 1000}s）——可减少 frames 或降低 width` }), opts.timeoutMs ?? 600_000)
    w.on('message', (m: { progress?: { done: number; total: number }; ok?: boolean; error?: string; stack?: string; triangles?: number; size?: [string, string, string]; gif?: Buffer; gifMeta?: { framesUsed: number; framesTotal: number; step: number; frameMs: number; colors: number } }) => {
      if (m.progress) return opts.onProgress?.(m.progress.done, m.progress.total)
      if (!m.ok) return finish({ ok: false, error: m.error, stack: m.stack })
      mkdirSync(outDir, { recursive: true })
      writeFileSync(outPath, m.gif!)
      finish({
        ok: true,
        triangles: m.triangles,
        size: m.size,
        gifPath: outPath,
        bytes: m.gif!.length,
        framesUsed: m.gifMeta!.framesUsed,
        framesTotal: m.gifMeta!.framesTotal,
        step: m.gifMeta!.step,
        colors: m.gifMeta!.colors,
        durationS: m.gifMeta!.framesUsed * m.gifMeta!.frameMs / 1000,
      })
    })
    w.once('error', (e: Error) => finish({ ok: false, error: `worker 异常：${e.message}` }))
    w.once('exit', (code) => {
      if (!settled) finish({ ok: false, error: `worker 意外退出（code ${code}）` })
    })
  })
}

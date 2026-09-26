import { Worker } from 'node:worker_threads'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import * as esbuild from 'esbuild'
import * as url from 'node:url'
import type { Lot } from '../../../lib/ctx'
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

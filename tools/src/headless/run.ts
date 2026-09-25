import { Worker } from 'node:worker_threads'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import * as esbuild from 'esbuild'
import * as url from 'node:url'
import type { Lot } from '../../../lib/ctx'

export interface HeadlessResult {
  ok: boolean
  error?: string
  stack?: string
  triangles: number
  meshes?: number
  setback?: { violations: number; worst: number; coreHalfX: number; coreHalfZ: number }
  bboxMin?: [number, number, number]
  bboxMax?: [number, number, number]
}

/** worker 缓存的期望指纹：worker.ts 源码 + lib 目录下全部 .ts 源码（worker 的本地依赖按
 *  城市架构只会落在 lib/，three 为 external 不入 bundle；路径排序保证跨平台稳定）。
 *  [city-admin] 2026-09-25：修复「worker.ts 改动后旧缓存仍被复用」的隐患——
 *  市政代码迭代后 inspect 曾继续跑旧逻辑，须手动删缓存才生效。 */
export function workerFingerprint(repoRoot: string): string {
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
  hash.update(readFileSync(resolve(repoRoot, 'tools/src/headless/worker.ts'), 'utf8'))
  walk(resolve(repoRoot, 'lib'))
  return hash.digest('hex')
}

/** 幂等：编译 worker.ts → node_modules/.cache/llm-city/worker.mjs（external three，可向上解析 node_modules）。
 *  缓存命中以指纹戳记（worker.mjs.sha）一致为准：源码或 lib 变更即自动重编译，旧版无戳记缓存亦自动失效。 */
export function ensureWorker(repoRoot: string): string {
  const out = resolve(repoRoot, 'node_modules/.cache/llm-city/worker.mjs')
  const stamp = `${out}.sha`
  const digest = workerFingerprint(repoRoot)
  if (existsSync(out) && existsSync(stamp) && readFileSync(stamp, 'utf8') === digest) return out
  mkdirSync(resolve(repoRoot, 'node_modules/.cache/llm-city'), { recursive: true })
  const entry = resolve(repoRoot, 'tools/src/headless/worker.ts')
  esbuild.buildSync({
    entryPoints: [entry],
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

export function runHeadless(modulePath: string, lot: Lot, seed: number, timeoutMs = 10_000): Promise<HeadlessResult> {
  // 仓库根从 run.ts 自身位置推导（tools/src/headless/ 向上 3 级）：产物无论落在
  // <root>/node_modules/.cache/llm-city/*.mjs 还是 llm-city/buildings/*.mjs 都成立，
  // 不依赖产物相对级数（brief 原按 modulePath 向上 4 级，对 buildings/ 子目录少一级）。
  const here = resolve(url.fileURLToPath(import.meta.url), '..')   // tools/src/headless/
  const repoRoot = resolve(here, '../../..')
  const workerPath = ensureWorker(repoRoot)
  return new Promise((resolvePromise) => {
    const w = new Worker(workerPath, {
      workerData: { moduleUrl: url.pathToFileURL(modulePath).href, lot, seed },
    })
    let settled = false
    const finish = (r: HeadlessResult) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      void w.terminate()
      resolvePromise(r)
    }
    const timer = setTimeout(() => {
      finish({ ok: false, triangles: 0, error: `R9：build() 超时（执行超过 ${timeoutMs / 1000} 秒），已强制终止（疑似死循环）` })
    }, timeoutMs)
    w.once('message', (m: HeadlessResult) => finish(m))
    w.once('error', (e: Error) => finish({ ok: false, triangles: 0, error: `worker 异常：${e.message}` }))
    w.once('exit', (code) => {
      if (!settled) finish({ ok: false, triangles: 0, error: `worker 意外退出（code ${code}）` })
    })
  })
}

import { Worker } from 'node:worker_threads'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import * as esbuild from 'esbuild'
import * as url from 'node:url'
import type { Lot } from '../../../lib/ctx'

export interface HeadlessResult {
  ok: boolean
  error?: string
  stack?: string
  triangles: number
  meshes?: number
  bboxMin?: [number, number, number]
  bboxMax?: [number, number, number]
}

/** 幂等：编译 worker.ts → node_modules/.cache/llm-city/worker.mjs（external three，可向上解析 node_modules） */
export function ensureWorker(repoRoot: string): string {
  const out = resolve(repoRoot, 'node_modules/.cache/llm-city/worker.mjs')
  if (existsSync(out)) return out
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

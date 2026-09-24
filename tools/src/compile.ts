import * as esbuild from 'esbuild'
import { readdirSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'

export interface CompileResult { ok: boolean; errors: string[]; outPath: string | null; inputFiles: string[] }

export async function compileBuilding(entryAbs: string, repoRoot: string, outAbs: string): Promise<CompileResult> {
  // esbuild.build 在编译出错时 reject（错误对象带 errors 数组），需要兜住才能返回 CompileResult(ok:false)
  try {
    const res = await esbuild.build({
      entryPoints: [entryAbs],
      bundle: true,
      format: 'esm',
      platform: 'neutral',
      metafile: true,
      write: true,
      outfile: outAbs,
      external: ['three'],
      absWorkingDir: repoRoot,
      logLevel: 'silent',
    })
    const inputFiles = Object.keys(res.metafile?.inputs ?? {})
    return {
      ok: res.errors.length === 0,
      errors: res.errors.map((e) => `${e.text}${e.location ? ` (${e.location.file}:${e.location.line})` : ''}`),
      outPath: res.errors.length === 0 ? outAbs : null,
      inputFiles,
    }
  } catch (e) {
    const err = e as esbuild.BuildFailure & Error
    const errors = Array.isArray(err?.errors) && err.errors.length > 0
      ? err.errors.map((er) => `${er.text}${er.location ? ` (${er.location.file}:${er.location.line})` : ''}`)
      : [String(err?.message ?? e)]
    return { ok: false, errors, outPath: null, inputFiles: [] }
  }
}

/** R6/R8：参与打包的文件只允许 lib/** 与本建筑目录；three 为 external 不出现在 inputs。
 * 比较基準统一为绝对路径：metafile inputs 相对 absWorkingDir，先 path.resolve 还原再比（对临时目录中的测试城跨盘路径同样成立）。 */
export function checkAllowedInputs(inputFiles: string[], buildingDirRel: string, repoRoot: string): string[] {
  const violations: string[] = []
  const targetDir = resolve(repoRoot, buildingDirRel).replace(/\\/g, '/')
  const entry = `${targetDir}/index.ts`
  for (const f of inputFiles) {
    const norm = resolve(repoRoot, f).replace(/\\/g, '/')
    if (norm === entry) continue   // 入口自身
    if (norm.startsWith(`${resolve(repoRoot, 'lib').replace(/\\/g, '/')}/`)) continue
    if (norm.startsWith(`${targetDir}/`)) continue
    violations.push(`R6/R8：${f} 不在 import 白名单（仅允许 three、lib/* 与本建筑目录）`)
  }
  return violations
}

export const BANNED_SOURCE_PATTERNS: Array<{ rule: 'R5' | 'R6'; re: RegExp; msg: string }> = [
  { rule: 'R5', re: /\bMath\.random\s*\(/, msg: 'Math.random（非确定源）' },
  { rule: 'R5', re: /\bDate\.now\s*\(/, msg: 'Date.now（非确定源）' },
  { rule: 'R5', re: /\bperformance\.now\s*\(/, msg: 'performance.now（非确定源）' },
  { rule: 'R6', re: /[^.\w]eval\s*\(/, msg: 'eval' },
  { rule: 'R6', re: /\bnew\s+Function\s*\(/, msg: 'new Function' },
  { rule: 'R6', re: /[^.\w]fetch\s*\(/, msg: 'fetch（外部资源）' },
  { rule: 'R6', re: /\bXMLHttpRequest\b/, msg: 'XMLHttpRequest（外部资源）' },
  { rule: 'R6', re: /\bimportScripts\b/, msg: 'importScripts' },
  { rule: 'R6', re: /\b(localStorage|sessionStorage)\b/, msg: 'Web Storage' },
  { rule: 'R6', re: /\bimport\s*\(/, msg: '动态 import' },
  { rule: 'R6', re: /(from\s+|import\s+|require\(\s*|await\s+import\s*\(\s*)['"]node:/, msg: 'node: 前缀内置模块' },
  { rule: 'R6', re: /\bprocess\.env\b/, msg: 'process.env' },
  { rule: 'R6', re: /require\(\s*['"](fs|path|os|child_process)['"]\s*\)/, msg: 'Node 内置模块 require' },
]

export function scanSource(files: Array<{ path: string; text: string }>): Array<{ rule: string; msg: string; file: string }> {
  const hits: Array<{ rule: string; msg: string; file: string }> = []
  for (const f of files) {
    const lines = f.text.split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      for (const p of BANNED_SOURCE_PATTERNS) {
        if (p.re.test(lines[i])) hits.push({ rule: p.rule, msg: p.msg, file: `${f.path}:${i + 1}` })
      }
    }
  }
  return hits
}

/** 递归读取建筑目录全部 .ts 源码（扫描对象；白名单保证无外部源码参与打包） */
export function readBuildingSources(buildingDir: string): Array<{ path: string; text: string }> {
  const out: Array<{ path: string; text: string }> = []
  const walk = (dir: string) => {
    for (const f of readdirSync(dir, { withFileTypes: true })) {
      const p = resolve(dir, f.name)
      if (f.isDirectory()) walk(p)
      else if (f.name.endsWith('.ts')) out.push({ path: p, text: readFileSync(p, 'utf8') })
    }
  }
  walk(buildingDir)
  return out
}

export function rel(p: string, root: string): string {
  return relative(root, p).replace(/\\/g, '/')
}

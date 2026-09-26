#!/usr/bin/env node
/**
 * browser-reap —— 无头浏览器孤儿回收器（零依赖单文件，可整文件复制到任何仓库）
 *
 * 问题：agent 做视觉自评时，浏览器工具（playwright/puppeteer 系）会拉起
 * chrome-headless-shell.exe / headless_shell.exe；会话结束时工具进程被杀，
 * 浏览器进程成为孤儿——父进程已死，永远无人关闭，CPU 常驻吃满。
 *
 * 原理：孤儿判定 = 「父进程已不在进程表中，或该 PID 已被更晚启动的进程复用」。
 * 活跃会话的无头浏览器父进程（node 驱动）必然活着，因此默认模式零误伤；
 * 连带回收孤儿的子孙进程（crashpad/renderer/gpu 等）。
 *
 * 用法：
 *   node browser-reap.mjs                  默认：仅回收孤儿（自动化钩子用，安静无副作用）
 *   node browser-reap.mjs --older-than 60  额外回收存活超过 60 分钟的（父进程还活着也算——长期挂着的无头浏览器几乎必是被遗弃的）
 *   node browser-reap.mjs --all            无差别回收全部无头浏览器（手动总清；会杀掉正在使用的）
 *   node browser-reap.mjs --dry-run        只列出不执行
 *   node browser-reap.mjs --json           机器可读输出
 *   node browser-reap.mjs --strict         枚举/回收失败时以非零码退出（默认恒 0，避免拖垮 npm 钩子链）
 *   node browser-reap.mjs --names a,b      自定义进程名（默认 chrome-headless-shell、headless_shell，均为纯自动化二进制，绝不碰日常 chrome）
 *
 * 退出码：默认恒 0（钩子安全）；--strict 时 3=枚举失败 2=有回收失败。
 * 其他项目接入：本文件 + package.json 三行（见 docs/browser-reap.md）。
 */
import { execFile } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const DEFAULT_NAMES = ['chrome-headless-shell.exe', 'headless_shell.exe']
const /** 父进程创建时间晚于子进程超过该容差 ⇒ 父 PID 已被复用，非真父 */ PID_REUSE_TOLERANCE_MS = 2000

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const optValue = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const DRY = flag('--dry-run')
const JSON_OUT = flag('--json')
const ALL = flag('--all')
const STRICT = flag('--strict')
const OLDER_THAN_MS = optValue('--older-than') ? Number(optValue('--older-than')) * 60_000 : 0
const NAMES = new Set(
  (optValue('--names') ?? DEFAULT_NAMES.join(','))
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    .flatMap((n) => n.endsWith('.exe') ? [n, n.slice(0, -4)] : [n, `${n}.exe`]),
)

const die = (msg, code) => {
  if (JSON_OUT) console.log(JSON.stringify({ ok: false, error: msg }))
  else console.error(`browser-reap：${msg}`)
  process.exit(STRICT ? code : 0)
}

/** CIM 日期两种序列化格式 → epoch ms：
 *  - PS5.1 ConvertTo-Json 把 DateTime 输出为 /Date(1790405056876)/（UTC ms）
 *  - 原始 CIM_DATETIME 字符串为 yyyyMMddHHmmss.ffffff±zzz（如 20260926185932.123456+480） */
function parseCimDate(s) {
  if (typeof s === 'string') {
    const dj = s.match(/^\/Date\((\d+)\)\/$/)
    if (dj) return +dj[1]
    const m = s.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\.(\d{6})([+-]\d{3})?$/)
    if (m) {
      const [, Y, M, D, h, mi, sec, frac, off] = m
      const msLocal = Date.UTC(+Y, +M - 1, +D, +h, +mi, +sec, Math.round(+frac / 1000))
      return msLocal - (off ? +off.slice(1) * (off[0] === '-' ? -1 : 1) : 0) * 60_000
    }
  }
  return null
}

/** 枚举当前用户可见全部进程 → [{ pid, ppid, name, born }]；born=epoch ms 或 null（拿不到时跳过年龄与 PID 复用判定） */
async function listProcesses() {
  if (process.platform === 'win32') {
    const script = `$ErrorActionPreference='Stop'; Get-CimInstance Win32_Process | ` +
      `ForEach-Object { [pscustomobject]@{ n=$_.Name; p=[int]$_.ProcessId; q=[int]$_.ParentProcessId; c=$_.CimInstanceProperties['CreationDate'].Value } } | ConvertTo-Json -Compress -Depth 3`
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { timeout: 30_000, maxBuffer: 64 * 1024 * 1024 })
    const raw = JSON.parse(stdout.trim())
    return (Array.isArray(raw) ? raw : [raw]).map((o) => ({
      pid: o.p, ppid: o.q, name: String(o.n ?? '').toLowerCase(), born: parseCimDate(o.c),
    }))
  }
  if (process.platform === 'darwin') {
    // best-effort：ps 拿不到创建时间戳，用 etime 折算年龄；PID 复用防御在 mac 上退化为不启用
    const { stdout } = await execFileAsync('ps', ['-axo', 'pid=,ppid=,etime=,comm='], { timeout: 30_000, maxBuffer: 64 * 1024 * 1024 })
    const now = Date.now()
    return stdout.trim().split('\n').filter(Boolean).map((line) => {
      const m = line.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s+(.+)$/)
      if (!m) return null
      const ageMs = m[3].split(/[-:]/).reduce((acc, x) => (acc * 60) + (+x || 0), 0) * 1000
      return { pid: +m[1], ppid: +m[2], name: basename(m[4].trim()).toLowerCase(), born: ageMs ? now - ageMs : null }
    }).filter(Boolean)
  }
  // linux：/proc 全量读取；starttime 为开机起 clock ticks，配 btime 折算 epoch ms（HZ 按通用默认 100）
  const stat = readFileSync('/proc/stat', 'utf8')
  const btime = Number(stat.match(/^btime (\d+)/m)?.[1] ?? 0) * 1000
  const out = []
  for (const d of readdirSync('/proc', { withFileTypes: true })) {
    if (!d.isDirectory() || !/^\d+$/.test(d.name)) continue
    try {
      const statTxt = readFileSync(`/proc/${d.name}/stat`, 'utf8')
      const close = statTxt.lastIndexOf(')')
      const fields = statTxt.slice(close + 2).split(' ')
      const comm = statTxt.slice(statTxt.indexOf('(') + 1, close)
      let name = comm.toLowerCase()
      try {
        const argv0 = readFileSync(`/proc/${d.name}/cmdline`, 'utf8').split('\0')[0]
        if (argv0) name = basename(argv0).toLowerCase()
      } catch { /* 无权限读 cmdline 时退回 comm（注意 comm 截断到 15 字符） */ }
      out.push({
        pid: +d.name, ppid: +fields[1], name,
        born: btime ? btime + Math.round(+fields[19] * 10) : null,   // ticks/HZ(100) → ms
      })
    } catch { /* 进程可能恰好在枚举间隙退出 */ }
  }
  return out
}

function formatAge(ms) {
  const min = Math.floor(ms / 60_000)
  return min >= 60 ? `${Math.floor(min / 60)}h${min % 60}m` : `${min}m`
}

const procs = await listProcesses().catch((e) => die(`进程枚举失败：${e.message}`, 3))
const byPid = new Map(procs.map((p) => [p.pid, p]))
const childrenOf = new Map()
for (const p of procs) {
  if (!childrenOf.has(p.ppid)) childrenOf.set(p.ppid, [])
  childrenOf.get(p.ppid).push(p.pid)
}

// 自身祖先链保护：绝不可能出现，但纯保险——避免任何逻辑缺陷导致自杀
const myAncestors = new Set()
for (let pid = process.ppid; pid && byPid.has(pid); pid = byPid.get(pid).ppid) myAncestors.add(pid)

const now = Date.now()
const isOrphan = (p) => {
  if (p.ppid <= 0) return true
  const parent = byPid.get(p.ppid)
  if (!parent) return true                                    // 父进程已退出 → 孤儿
  if (parent.born && p.born && parent.born > p.born + PID_REUSE_TOLERANCE_MS) return true   // 该 PID 已被更晚的进程复用 → 原父已死
  return false
}

const targets = procs.filter((p) =>
  NAMES.has(p.name) && !myAncestors.has(p.pid) && !myAncestors.has(p.ppid === 0 ? -1 : p.pid)
  && (ALL || isOrphan(p) || (OLDER_THAN_MS > 0 && p.born && now - p.born > OLDER_THAN_MS)))

// 连带回收目标的全部后代（renderer/gpu/crashpad 等子进程），后代不限进程名
const doomed = new Set()
for (const t of targets) {
  const queue = [t.pid]
  while (queue.length) {
    const pid = queue.pop()
    if (doomed.has(pid)) continue
    doomed.add(pid)
    for (const c of childrenOf.get(pid) ?? []) queue.push(c)
  }
}

const report = { ok: true, dryRun: DRY, matched: [], reaped: [], failed: [], skippedBySelf: 0 }
for (const t of targets) {
  const parentAlive = !ALL && !isOrphan(t)
  const reason = ALL ? '全量模式' : parentAlive ? `存活超 ${Math.round(OLDER_THAN_MS / 60_000)} 分钟` : `父进程 ${t.ppid} 已退出（孤儿）`
  report.matched.push({ pid: t.pid, name: t.name, age: t.born ? formatAge(now - t.born) : null, reason })
}
for (const pid of doomed) {
  const p = byPid.get(pid)
  if (p && !targets.some((t) => t.pid === pid)) report.matched.push({ pid, name: p.name, age: null, reason: '目标进程的子进程' })
}
report.matched.sort((a, b) => a.pid - b.pid)

if (doomed.size && !DRY) {
  for (const pid of doomed) {
    if (myAncestors.has(pid)) { report.skippedBySelf++; continue }
    try {
      process.kill(pid, 'SIGKILL')
      report.reaped.push(pid)
    } catch (e) {
      if (e.code === 'ESRCH') report.reaped.push(pid)          // 已自行退出，视同回收成功
      else report.failed.push({ pid, error: e.message })
    }
  }
}

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2))
} else if (report.matched.length) {
  const tag = DRY ? '（--dry-run 未执行）' : ''
  for (const m of report.matched) {
    const age = m.age ? `，已存活 ${m.age}` : ''
    console.log(`browser-reap：${DRY ? '将回收' : '回收'} ${m.name} pid=${m.pid}（${m.reason}${age}）${tag}`)
  }
  if (!DRY) {
    const failNote = report.failed.length ? `，${report.failed.length} 个失败` : ''
    console.log(`browser-reap：共回收 ${report.reaped.length} 个进程${failNote}。`)
  }
}
// 默认恒 0：钩子里绝不能因清理失败拖垮主命令；--strict 供需要硬失败的场合
if (STRICT && report.failed.length) process.exit(2)

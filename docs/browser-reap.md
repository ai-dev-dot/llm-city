# browser-reap · 无头浏览器孤儿回收 —— 问题方案沉淀

> 一页纸方案：任何让 coding agent 做视觉自评的项目（预览网页后让 LLM 看渲染效果）
> 都会遇到「chrome-headless-shell.exe 残留吃满 CPU」的问题。本文记录根因、原理与
> 三步接入法。本仓（llm-city）已按此落地，其他仓库照抄即可。

## 问题

agent 做视觉自评（CITY.md 第 8 步）时，浏览器工具（gstack browse、playwright /
puppeteer 系 MCP 或技能）会拉起**无头浏览器**进程：

- `chrome-headless-shell.exe`（playwright / puppeteer 的无头内核）
- `headless_shell.exe`（playwright 旧版命名）

工具的服务进程（node 驱动，如 gstack browse 的 `server-node.mjs`）负责拉起并管理
它。**当服务进程被硬杀**（Claude Code / opencode 会话被关、终端被杀、崩溃），
浏览器进程成为**孤儿**——父进程已死，再没有任何人负责关闭它，于是常驻后台吃满
CPU，直到用户手动杀掉。

服务进程正常退出时会顺手清掉浏览器；问题全部出在「硬杀」路径上，而这在
agent 工作流里高频发生（会话结束、窗口关闭、快捷键杀进程）。

## 原理：孤儿判定

回收器枚举系统全部进程（Windows 走 CIM，Linux 走 `/proc`，macOS 走 `ps`），对每个
无头浏览器进程判定：

```
孤儿 ⇔ 父进程已不在进程表中
    或 父 PID 被一个「更晚创建」的进程复用（PID 复用防御）
```

关键安全性质：**活跃会话的无头浏览器，其驱动进程必然活着**——所以默认模式
（只杀孤儿）零误伤，可以放心挂在自动化钩子里。回收目标时连带回收其全部后代
（renderer / gpu / crashpad 等子进程）。

只按进程名匹配 `chrome-headless-shell` / `headless_shell`——这两个名字是纯自动化
二进制专用，日常浏览器（chrome.exe / msedge.exe）永不匹配。

## 本仓接入（已完成）

1. **脚本**：`tools/src/browser-reap.mjs`（零依赖单文件，node ≥ 18，跨平台）
2. **package.json**：

   ```jsonc
   {
     "scripts": {
       "browser:reap": "node tools/src/browser-reap.mjs",   // 手动：随时清孤儿
       "prestate": "node tools/src/browser-reap.mjs",       // 自动：每次 npm run state 前扫荡（施工第 1 步 = 每个会话入口）
       "pregen:city": "node tools/src/browser-reap.mjs"     // 自动：每次 npm run preview / build:web 前扫荡（浏览器使用前）
     }
   }
   ```

   默认模式回收失败**恒退出 0**——钩子里绝不能因清理失败拖垮主命令。
3. **agent 纪律**：CITY.md 第 8 步「浏览器卫生」条款——用完当场关闭 +
   会话收尾前跑一次 `npm run browser:reap`。

效果：上次会话硬杀留下的孤儿，在下一次施工会话的第一步（`npm run state`）或
预览前被自动清掉；agent 按纪律收尾时当场清掉。用户不再需要手动开任务管理器。

## 其他项目三步接入

1. **复制** `tools/src/browser-reap.mjs` 到你的仓库（如 `scripts/browser-reap.mjs`）。
2. **package.json** 加钩子（照抄上面的三行，路径按你的放置调整；至少要
   `browser:reap` 手动命令 + 一个你工作流里的高频入口 pre-钩子）。
3. **给 agent 加纪律**（可选但推荐），在你的 AGENTS.md / CLAUDE.md 里加一段：

   ```markdown
   ## 浏览器卫生
   无头浏览器（视觉自评/网页测试用）用完必须当场关闭（调用所用浏览器工具的
   关闭/退出动作）。会话收尾前跑一次 `npm run browser:reap` 清理孤儿进程——
   该命令只回收父进程已死的无头浏览器，不会误伤在用的浏览器。
   ```

## 命令行参考

```
node browser-reap.mjs                     默认：仅回收孤儿（钩子用；无孤儿时静默，恒 exit 0）
node browser-reap.mjs --older-than 60     额外回收存活超 60 分钟的（驱动进程还活着但浏览器被遗弃数小时也清）
node browser-reap.mjs --all               无差别回收全部无头浏览器（手动总清；会杀在用的，勿挂钩子）
node browser-reap.mjs --dry-run           只列出不执行
node browser-reap.mjs --json              机器可读输出（matched/reaped/failed）
node browser-reap.mjs --strict            失败以非零码退出（默认恒 0）
node browser-reap.mjs --names a,b         自定义进程名（默认两个无头内核名）
```

## 已知边界

- 默认模式不回收「驱动进程还活着但浏览器闲置」的情况（无法区分「在用」与
  「遗忘」）——由 agent 纪律（用完即关）与 `--older-than` 兜底。
- Linux 上进程名优先取 `cmdline` 的 argv[0]（`/proc/comm` 截断 15 字符会认不出
  `chrome-headless-shell`）。
- macOS 为 best-effort（`ps` 拿不到创建时间戳，PID 复用防御与 `--older-than` 退化）。
- Windows 枚举走 PowerShell `Get-CimInstance`（PS 5.1 兼容，日期兼容
  `/Date(ms)/` 与原始 CIM 字符串两种序列化）。

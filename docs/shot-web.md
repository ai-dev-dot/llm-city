# shot-web · 网页实景自评（有头浏览器） —— 问题方案沉淀

> 一页纸方案：`shot` 是软件光栅化，看的是几何与色彩层次；但**材质观感（IBL 反射、玻璃镀膜）
> 的裁决端是网页本身**。agent 想看网页实景时，过去会自建截图轮子——而**无头浏览器截 WebGL
> 会把整机卡死**（2026-09-27 实测事故，一天四次硬重启）。本文记录根因、有头配方与模板，
> 供本仓与其他项目照抄。

## 问题（实测事故，2026-09-27 取证）

当天整机僵死四次（14:41 / 15:21 / 21:08 / 21:49，均需硬重启）。取证链完整：

- **13:44** 某模型用 `chrome.exe --headless=new --disable-gpu --virtual-time-budget=12000
  --window-size=1600,1000 --screenshot=…` 截 F4 街区网页，**60 秒没跑完被挪到后台**，
  模型自己的记录是「Chrome 卡住了」——**截图最终于 13:52:29 落盘，一张图 8 分 21 秒**。
- **21:03** 另一模型用 `chrome-headless-shell --headless --no-sandbox --disable-gpu
  --enable-unsafe-swiftshader --use-angle=swiftshader --window-size=1440,900
  --virtual-time-budget=15000 --screenshot=…`，机器约 5 分钟后僵死，**那张图从未生成**。
- **僵死前兆**：死机前 1 分 49 秒，`Group Policy Client` 服务启动超时 30 秒并失败——
  系统已被榨干到连服务都起不来。僵死后机器仍以极慢速度爬行 30~40 分钟才被强关。
- **排除项**：不是内存（开机以来零换页、无 2004 事件）、不是磁盘（无 disk/storahci 报错、
  SSD Healthy）、不是蓝屏/硬件（无 BugCheck、无 WHEA、无显卡复位）。

## 原理：两个因素相乘，缺一不可

1. **无头 → 每帧慢 50~100 倍**。无头 Chrome 拿不到 GPU，WebGL 退回 **SwiftShader 纯 CPU
   光栅化**。有头时 GPU 一帧 16ms，软渲染一帧 0.3~0.7 秒。
2. **`--virtual-time-budget` → 把「时间到了就停」换成「帧数跑满才停」**。Chrome 的虚拟时钟
   在页面**空闲**时才快进；而 Three.js 有常驻 `requestAnimationFrame` 渲染循环，永远不空闲，
   于是虚拟时钟**每帧只推进 16.7ms**：

   ```
   --virtual-time-budget=15000  →  15000 ÷ 16.7 ≈ 900 帧
   900 帧 × 0.5 秒/帧（软渲染）  ≈  450 秒 ≈ 7.5 分钟
   ```

   实测 8 分 21 秒，公式对得上。**有头 + 真实时间等待时这两个因素都不存在**：GPU 一帧 16ms，
   等 3~33 秒就是 3~33 秒。

**反证**：`D:\APP\llm_test` 用同样方式截 Three.js 页面数月零事故——因为它的铁律是
`Playwright 一律 launch(headless=False)`（其 AGENTS.md 已知坑，源自 `archive/experiments/neon-city`
的同类事故），且全仓从未用过 `--virtual-time-budget`。本仓此前只立了半条法（「用完要关」），
没立「别用无头截 WebGL」，于是被绕过。

## 方案：有头 Playwright + 渲染器自检

官方模板 `tools/shot-web/verify-template.py`（照 llm_test 的 `verify.py` 范式裁剪）：

1. **有头启动**：`p.chromium.launch(headless=False)`——真 GPU、真窗口。**这一行是安全红线**。
2. **渲染器自检**（本仓增强，llm_test 模板没有）：出图前先读 `WEBGL_debug_renderer_info`，
   发现 `SwiftShader` / `llvmpipe` **立即中止并报错**——把「有头却意外退化成软渲染」也掐死。
3. **真实时间拍点**：`BEATS=(3, 8, 20)` 累计时间轴 + `pg.wait_for_timeout()`，
   **禁用虚拟时间**。
4. **运行质量**：捕获 `pageerror` / `console.error` / `requestfailed`（llm_test 的 A 层检查）。
5. **必关干净**：`try/finally` 保证 `browser.close()`；异常路径打印 `taskkill /F` 兜底命令。
6. **落盘**：`node_modules/.cache/llm-city/workshop/<model_id>/web/`，不进版本库。

**依赖**：Python 3.13 + Playwright 1.60 已是本机**系统级安装**（`D:\Python\Python313`），
llm-city 无需引入任何 npm 依赖，也无需自造 CDP 驱动——直接复用 llm_test 那套。

## 用法

```bash
# 1. 复制模板到你的工作间
cp tools/shot-web/verify-template.py \
   node_modules/.cache/llm-city/workshop/<你的 model_id>/web-verify.py

# 2. 改 PAGE（vite 另起端口，勿用城主的 5173）与 BEATS，或命令行覆盖：
python node_modules/.cache/llm-city/workshop/<你的 model_id>/web-verify.py \
  --url "http://localhost:5174/llm-city/?block=E6" --beats 3,8,20 --out <出图目录>
```

**分工**：`shot` 是 agent 的日常自评（秒级、零浏览器、确定性）；本模板只在
**shot 覆盖不了**（要看网页 IBL 实景材质、要看交互）时用；**最终验收仍以城主 `npm run preview` 为准**。

## 已知边界

- 有头 = 会弹真实窗口，**运行期间勿最小化**（最小化可能让渲染降频/暂停，llm_test 同款约定）；
- 必须跑在有桌面会话的环境（无头服务器不适用，那类环境请回到 `shot`）；
- 单张截图秒级，但每个 beat 都要真实等待，多视角多环境时按需增减 BEATS；
- 自检只能识别软渲染，不能识别「GPU 被其他程序独占导致极慢」——若出图明显变慢，先查 GPU 占用。

## 其他项目接入

1. 复制 `tools/shot-web/verify-template.py`，改 `PAGE` 与落盘目录；
2. 在 agent 手册里把「自己写截图代码」替换为「复制模板改 URL」；
3. 规则层写死两条：**浏览器一律有头**、**禁用 `--virtual-time-budget` / `--disable-gpu` /
   `--use-angle=swiftshader`**，并把「一次截图 8 分钟、整机僵死」的事故写在规则旁边——
   模型只有理解了后果才不会再绕。

**关键设计原则**（跨项目通用）：给 agent 的正规出口必须**存在且够宽**——`shot` 覆盖不了的
需求若没有官方通道，模型一定会自建，而自建的轮子会踩你预想不到的坑（本仓 2026-09-26
`shot.md` 已取证过一轮「重复发明截图轮子」，这次是同一模式的第二次发作，代价是四次硬重启）。

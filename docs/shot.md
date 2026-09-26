# shot · 建筑多视角秒级自评渲染 —— 问题方案沉淀

> 一页纸方案：任何「LLM 造东西 → 自己看效果 → 迭代」的项目，都值得提供**官方出图工具**，
> 而不是让每个模型每次现写截图代码。本文记录 llm-city 的证据、设计与落地，供其他项目照抄思路。

## 问题（日志实锤，2026-09-26 取证）

分析各模型施工会话日志（Claude Code jsonl、gstack browse 审计、opencode 记录）发现，
**每个模型在「预览自评」环节都在重复发明截图轮子**：

- **gstack browse 截图**：本仓审计日志 87 次调用中 35 次是 `screenshot`（单张 ~9.4s），
  外加 20 次 goto、9 次 eval、8 次 js——都是「起 vite → 开无头浏览器 → 调视角 → 截图」循环。
- **canvas 注入调相机**：agent 向预览页面注入 JS 合成 PointerEvent 拖拽相机、点「航拍」按钮
  再截图——视角控制全靠猜坐标。
- **自建离屏渲染器**：能力最强的模型（doubao）直接在仓库根写了一套 `_shot/` 临时工程
  （three.js WebGLRenderer + 日/黄昏/夜三套光照 + 6 个手调机位），esbuild 编译 → 起 8077
  端口静态服务 → 无头浏览器轮询 `__shotReady` → 逐机位截图，机位调了 4 轮，「跑完即删」
  ——下次施工全部重来。
- **代价**：每轮迭代几十秒到几分钟的机械开销；浏览器路径还带来了孤儿进程问题
  （见 docs/browser-reap.md）；各模型视角标准不一，自评质量参差。

## 方案：官方 shot 工具（零浏览器软件光栅化）

`npm run shot -- <建筑目录名|id>` ——复用 inspect 的「编译建筑 → 无头 worker 加载 → build()」
管线，但**不用 three 的 WebGLRenderer，而是自写软件光栅化**：

1. **场景抽取**：worker 内 traverse 场景图，把所有 Mesh 摊平成世界空间三角形汤
   （位置 + 每顶点反照率 + 自发光；顶点色、BasicMaterial 发光件、多材质 group 均处理）。
2. **机位自动推导**（`deriveCameras`）：按建筑包围盒自动生成 street（1.7m 人视）/ corner（45°
   全景）/ aerial（鸟瞰）/ top（总平面）/ front·back·left·right（正交立面）——透视机位按
   「整楼装入视场」反推距离（垂直/水平两个方向取大），**超高层与宽矮型都完整入画，零手调**。
3. **渲染**：z-buffer 光栅化 + 双面 Lambert 光照 + 自发光（夜景窗灯/路灯亮起）+ 天空渐变 + 距离雾，
   2× 超采样抗锯齿；PNG 编码用 node:zlib——**全程零第三方依赖、零浏览器进程**。
4. **落盘**：`node_modules/.cache/llm-city/shots/<目录>/<view>-<amb>.png`（不污染城市数据），
   CLI 打印绝对路径，agent 直接读图自评。

**实测**：22 万三角的高塔 4 视角 4.6s；31.7 万三角的公园 4 视角×2 环境 6.4s——对比 browse
路径（起服务 + 每张 9.4s + 手调视角）快一个数量级，且确定性可复现。

## 用法

```bash
npm run shot -- b-000001-origin-tower                    # 默认 4 视角 × day
npm run shot -- b-000001 --amb day,dusk,night            # 加黄昏/夜景（自发光构件亮起）
npm run shot -- b-000001 --views front,left,top          # 任选机位（8 种）
npm run shot -- b-000001 --width 1280 --out /tmp/shots   # 清晰度与落盘目录
```

## 其他项目接入

1. 复制 `tools/src/shot/` 四件（`png.ts` / `render.ts` / `worker.ts` / `run.ts`）——前两者
   与业务无关可原样抄；`worker.ts` 的场景抽取换成你的「产物 → 三角形汤」方式；
2. CLI/脚本调 `runShot()`，把打印的图片路径交给 agent 读图；
3. 在 agent 手册里把「自己写截图代码」替换为「跑 shot 读图」。

**关键设计原则**（跨项目通用）：自评环节的出图必须是**确定性、秒级、零交互**的官方命令；
机位由包围盒自动推导而非手调；产物落缓存目录不进版本库；agent 只负责读图判断。

## 已知边界（v1）

- 无阴影/无 PBR——自评看形态与色彩层次足够，最终验收仍以城主 `npm run preview` 为准；
- 材质按反照率纯色近似（顶点色已支持），贴图类构件不在本城约束内（宪法禁贴图）；
- 透明材质按 opacity<0.15 剔除、其余按不透明处理。

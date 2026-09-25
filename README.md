# 模都 · llm-city

一座存在 git 仓库里的 3D 城市：各大模型通过 coding agent 手动「开工」盖楼，每一栋建筑永久留痕（谁建的、花了多少 token、开工/竣工日期），把用不完的 API 订阅额度沉淀成一部可漫游的 AI 发展史。

- 在线城市：GitHub Pages（`/llm-city/`）
- 设计文档：`docs/superpowers/specs/2026-09-24-llm-city-design.md`
- 实施计划：`docs/superpowers/plans/2026-09-24-llm-city-phase1.md`

## 城主（人类）快速上手

1. `npm install`
2. `npm run preview`——本地漫游城市
3. 让任何模型开工：在 agent CLI 里说「读 CITY.md，去模都开工」
4. 审查 agent 的 commit（重点看 import 清单与登记行），满意则手动 `git push`——CI 绿灯 = 竣工备案并发布 Pages
5. 烂尾处置：CI 红 → `npm run demolish -- <目录> --yes`（自动删目录+登记行、生成 `[city-admin]` commit 并复验；缺 `--yes` 为干跑）或让原模型修复重新验收
6. 首次发布前：仓库 Settings → Pages → Source 选「GitHub Actions」（一次性设置，否则 deploy 403 会被误判为烂尾）

## 模型（施工方）

见 `CITY.md`《城市规划法》——选址、建造、登记、验收全流程的唯一入口。

## 提交分类（每次 commit 必属其一）

- **A · 城市建设**（`cities/**`、`models.json`）——受城市宪法管辖：受限编辑、竣工封存、R1–R10；
- **B · 市政工具迭代**（`tools/`、CI、文档等）——须对既有城市向后兼容；破坏性口径变更 = 修宪，commit 带 `[city-admin]`；
- **C · 渲染基础变更**（three 版本、积木几何、rng 语义）——同城存续期间冻结（版本年轮）：inspect 的「封存行重算不符即红」会自动拦截，纯增量（新增组件/不改输出的修复）放行。

详见设计文档 §9.1。

## 常用命令

| 命令 | 用途 |
|---|---|
| `npm run state` | 城市现状摘要（占用/名册/空地建议） |
| `npm run inspect -- [目录]` | 建筑校验 R1–R10（缺省全量） |
| `npm run inspect -- [目录] --complete` | 校验通过并竣工封存 |
| `npm run demolish -- <目录\|id> [--yes] [--reason 文本]` | 城主拆除建筑：删目录+登记行+`[city-admin]` commit+复验（缺 `--yes` 为干跑） |
| `npm run check-history` | 登记簿受限编辑校验（CI 也跑） |
| `npm run preview` | 本地城市浏览器 |
| `npm test` | vitest 全量 |
| `npm run build:web` | 构建 Pages 产物 |

## 前端手工验收清单（一期九项，发布前人工过）

1. 启动铭牌数据正确（建筑数/模型数/厂商数/累计 token 与 registry 一致）；
2. hover tooltip 全字段（名称/canonical+登记名/厂商/状态/token/起止日期/施工次数；超长描述截断）；
3. 点击建筑侧栏详情（desc/NOTES 摘要/完整登记含厂商）；
4. 两档滤镜（按模型/按厂商）切换与恢复，染色正确且不改建筑本体；
5. 导览自动巡航起停正常（T 键与按钮，拖拽即停）；
6. 灰盒烂尾占位（人为引入坏建筑时全城不受影响）；GL 上下文丢失恢复（人为触发 webglcontextlost）；
7. 空城市状态正常（仅奠基建筑时铭牌/列表/漫游正常）；
8. 错误报告条计数正确，Canvas 异常时 UI 层仍可见；
9. 创作者模式：P 隐藏/恢复 HUD、2x 高清导出 PNG、三种构图框线、三档氛围、三条巡航路线与单建筑 360° 慢旋、点击飞向平滑无跳变。

## 版本年轮

每城技术栈随开城冻结（three 0.186.0 等），升级只发生在开新城——见设计文档 §15.1。

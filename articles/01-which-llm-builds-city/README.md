# 01 · 哪个大模型最会盖房子？

公众号第一篇文章的素材目录。文章主题：模都（llm-city）现状巡礼——9 个建满街区 +
全城，按厂商分组逐个点评。

**gifs/ 与 shots/ 下的产物不进版本库**（gitignore）：均为工具可再生产物，重出配方
见下；手工制作或外部素材请放本目录的 `manual/` 子目录（该目录进库）。

## article/ · 文章正文（spec 驱动）

- `spec.json` 正文文案与素材引用（相对本目录：`../shots/`、`../gifs/`）
- `article.html` 复制版：**不入库**（gitignore）——截图 base64 内嵌 + GIF 平文占位 +
  右上角「复制全文」按钮（浏览器打开 → 点复制 → 公众号粘贴；**一次性复制实验结论
  （2026-10-02）：这是唯一可用通道**，全内嵌 gif 的 preview 版 ~110MB 剪贴板写不进；
  编辑器「内容结构检测」的行高警告为实测口径误报，源样式与浏览器实测均合规，点
  「继续插入」即可；GIF 按占位行手动拖入）
- `article_preview.html` 完整预览版：**入库**——全相对路径轻量形态（0.02MB）+
  414px 手机壳；注意其引用的 shots/gifs 素材不入库，他机查看需先按配方重出素材
- 重建：`python tools/article/build_article.py --spec articles/01-which-llm-builds-city/article/spec.json`

## video/ · 视频台词与制作脚本

视频文案与制作安排见 `video/voiceover-v1.md` 和 `video/production-script.md`：采用第三稿台词、16:9 横屏、约2分59秒，脚本包含逐段口播、镜头、字幕与现有素材索引；尚未生成视频。

## gifs/ · 街区绕飞动图

工具：`python tools/shot-web/web-gif.py --block <街区> --out articles/01-which-llm-builds-city/gifs`
（全城加 `--city --speed 4 --fps 6`；详见 docs/shot-web.md）
统一口径：640×427 / 128 色全局调色板 / 右上角水印「街区名 · 模型名」（全城 = 城名）/
页面「巡航：街区环绕」运镜实景采集。帧缓存在 `node_modules/.cache`（gitignore），
改水印/宽/帧率秒级重出；城市数据更新后加 `--recapture` 重采。

| 文件 | 内容 | 规格 |
|---|---|---|
| weborbit-D4.gif | 西岸商业街区 · MiMo-V2.6-Flash（小米） | 83 帧 / 8.3s / 8.0MB |
| weborbit-D5.gif | 模都医枢 · Space Bunny（OpenCode） | 83 帧 / 8.3s / 8.9MB |
| weborbit-E3.gif | 博览中心 · LongCat 2.5 Preview（美团） | 83 帧 / 8.3s / 7.6MB |
| weborbit-E4.gif | 镜湖中央公园「温室之心」 · qwen3.8-flash（阿里） | 83 帧 / 8.3s / 9.2MB |
| weborbit-E5.gif | 原点街区 · GLM-5.3（智谱） | 83 帧 / 8.3s / 6.7MB |
| weborbit-E6.gif | 回声街区 · DeepSeek V4.1 Flash | 83 帧 / 8.3s / 8.8MB |
| weborbit-E7.gif | 中央车站街区 · GLM 5.3 Flash（智谱） | 83 帧 / 8.3s / 7.8MB |
| weborbit-F4.gif | 灯花栖居街区 · doubao-seed-2.1-pro（字节） | 83 帧 / 8.3s / 7.8MB |
| weborbit-G5.gif | 求索智谷街区 · DeepSeek V4 Pro | 83 帧 / 8.3s / 7.6MB |
| weborbit-city.gif | 全城 · 模都 llm-city | 75 帧 / 12.5s / 7.5MB |

## shots/ · 静态图（城主自拍 + 水印/拼图工具加工）

- `city.png` 全城天际线（城主自摄）→ `city.wm.png`（水印版）
- `<街区>.png` × 9（城主自摄，文件名 = 街区 id）→ `<街区>.wm.png`（水印版）
- `grid.png` 3×3 九宫格全家福（`<街区>.png` 自动拼装，每格底部街区名条，
  总结段用）

水印/拼图命令（产物不进库，重出即得）：

```bash
# 批量水印：根目录散图按文件名/全城自动解析，子目录按目录名解析
python tools/shot-web/watermark.py --root articles/01-which-llm-builds-city/shots
# 九宫格：拼 <街区>.png × 9 → grid.png（每格底部街区名条）
```

# 01 · 哪个大模型最会盖房子？

公众号第一篇文章的素材目录。文章主题：模都（llm-city）现状巡礼——9 个建满街区 +
全城，按厂商分组逐个点评。

**gifs/ 与 shots/ 下的产物不进版本库**（gitignore）：均为工具可再生产物，重出配方
见下；手工制作或外部素材请放本目录的 `manual/` 子目录（该目录进库）。

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

## shots/ · 静态图（待产出）

高空全景、9 张竖版双视角拼图（街区俯瞰 + 地标特写）、3×3 九宫格全家福；
网页实景截图，水印同 gif 风格，建筑名走文章图注。

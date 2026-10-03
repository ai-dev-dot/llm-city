# 模都第一期 · 视频工序（2026-10-03 定稿）

横屏解说片《让大模型各建一个街区，最后谁盖得最好？》——本目录 `voiceover-v1.md`
（台词第三稿，逐字定稿）+ `production-script.md`（18 段制作脚本）+ `spec.json`
（引擎编排，门槛位已全置）。

**成片**：`node_modules/.cache/llm-city/video01/moshi_v1.mp4`（1920×1080 60fps，
148.8s，volc 咪仔 2.0 终配 + qsv 硬编；大资产不入库）。末尾自动拼 5s 测试说明页
（文案 = `../article/spec.json` test_notes 四条同源）。

## 工具链（本仓 `tools/video/`，编排层）

| 工具 | 作用 | 产物（缓存区 video01/） |
|---|---|---|
| `prep_clips.py` | web-gif **原始帧缓存**→ video_maker 底片（弃 GIF 格式税，城主裁决） | `clips/<key>/`（raw_frames+ts.json+clip.mp4+clip.json）×10 |
| `make_layouts.py` | 九宫格 3×3 出场序 / 2×2 过渡 / E6+E3 并排底图 | `layouts/*.png` |
| `shot_empty_city.py` | 空城截图（有头浏览器运行时隐藏 35 建筑组，s06 用） | `empty_city.png` |
| `build_spec.py` | **spec 单源**：台词逐字拆 38 镜（脚本核对 863 字一致）+ 信息条/强调字/标注层 | `spec.json`（入库）+ `cards/overlays/anno_*.png` |

**通用视频引擎 = `D:\APP\llm_test\tools\video_maker.py`**（不复制、跨仓调用；
编码参数 encode_args 单源在 pk_video_maker，缺省 qsv）。适配层约定：spec 的
`work_dir`/`still` 用绝对路径落本仓缓存区；volc key 随引擎 ROOT 解析
（`llm_test/tmp/volc_tts_key.json`）。

## 重跑 / 改镜指南

```bash
python tools/video/build_spec.py        # 改镜表/叠层后重建 spec（门槛位自动继承）
python D:/APP/llm_test/tools/video_maker.py \
    --spec D:/APP/llm-city/articles/01-which-llm-builds-city/video/spec.json \
    --stage tts|assemble|publish        # 单段重跑；assemble 加 --draft 出草稿
```

- **单镜改台词/语速/语气**：build_spec.py 的 `S(...)` 支持 `tts_text` 注音、
  `rate`（10=+10%，0=正常）、`instruction`、`tail`（镜尾秒）镜级覆盖；指纹含
  rate/instruction 自动单镜重采。
- **坑 1**：改 `tail` 后 assemble 缓存不敏感（deps 不含它）——删
  `video01/segments/<id>.mp4` 再跑 assemble 强制重拼该镜。
- **坑 2**：cards 渲染是 2x PNG，shot.overlays 必须显式 `width`（CSS px）回 1x，
  否则 top_center 看不出、右上定位出画（s26 教训）。
- 城市数据变更后重采底片：重跑 `web-gif.py`（帧缓存刷新）→ `prep_clips.py --force`。

## 定稿快照

- 台词：voiceover-v1 第三稿逐字（narration_locked=true，2026-10-03）
- 配音：volc 咪仔 2.0 `zh_female_mizai_uranus_bigtts` @10 + 干脆利落指令
  （tts_confirmed=true）；镜级特例：s18 平和语气 + 正常语速（音调/语速反馈修复）
- 画面：38 镜；s06 = 空城规划图；s01 镜尾 0.15s（接缝反馈修复）
- 无 BGM（版权惯例，发布时平台曲库自配）
- 封面/发布文案：未做（门槛 cover_locked/copy_locked 待城主给文案）

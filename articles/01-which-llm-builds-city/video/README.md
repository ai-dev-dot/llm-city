# 模都第一期 · 视频工序（2026-10-03 定稿）

横屏解说片《让大模型各建一个街区，最后谁盖得最好？》——本目录 `voiceover-v1.md`
（台词第三稿，逐字定稿）+ `production-script.md`（18 段制作脚本）+ `spec.json`
（引擎编排，门槛位已全置）。

**成片**：本目录 `moshi_v1.mp4`（1920×1080 60fps，148.8s，volc 咪仔 2.0 终配 +
qsv 硬编；2026-10-03 城主定稿，产物不入库见 .gitignore）。末尾自动拼 5s 测试
说明页（文案 = `../article/spec.json` test_notes 四条同源）。

**发布产物**：本目录 `publish/`——双封面（竖 1080×1920 九宫格标题海报 /
横 1440×1080 全城压字）+ `publish.html`（五平台分卡发布文案页，浏览器打开
逐字段复制；话题/tags 城主未给留空待补）。重出：`--stage publish`（封面文字
门槛 cover_locked 已置）。

## 工具链（本仓 `tools/video/`，编排层）

| 工具 | 作用 | 产物（缓存区 video01/） |
|---|---|---|
| `dda_capture.py` | **DDA 满屏直采**（2026-10-06 城主裁决起视频底片唯一通道）：SendInput F11 真全屏 + ddagrab 60fps，1080p 真渲染满屏零裁剪 | `clips/<key>/`（raw.mp4+clip.mp4+clip.json） |
| `prep_clips.py` | DDA 底片**契约闸门**（只验不转；「web-gif 帧缓存→clip.mp4」转换职责随 DDA 固化退役） | 校验报告（缺契约 exit 1） |
| `make_layouts.py` | 九宫格 3×3 出场序 / 2×2 过渡 / E6+E3 并排底图 | `layouts/*.png` |
| `shot_empty_city.py` | 空城截图（有头浏览器运行时隐藏 35 建筑组，s06 用） | `empty_city.png` |
| `build_spec.py` | **spec 单源**：台词逐字拆 38 镜（脚本核对 863 字一致）+ 信息条/强调字/标注层 + clips 底片清单 | `spec.json`（入库）+ `cards/overlays/anno_*.png` |

**通用视频引擎 = llm_test 的 media_kit 包**（2026-10-03 包化：一次性
`python -m pip install -e D:\APP\llm_test --no-deps` 后，import 走
`media_kit.*`、CLI 直跑 `python D:/APP/llm_test/tools/video_maker.py`
均可用；编码参数 encode_args 单源，缺省 qsv）。适配层约定：spec 的
`work_dir`/`still` 用绝对路径落本仓缓存区；volc key 优先本仓自管
（env `VOLC_TTS_API_KEY` / `VOLC_TTS_KEY_FILE`，三级解析，不设则回落
llm_test/tmp 的母仓 key）。

## 重跑 / 改镜指南

```bash
python tools/video/build_spec.py        # 改镜表/叠层后重建 spec（门槛位自动继承）
python D:/APP/llm_test/tools/video_maker.py \
    --spec D:/APP/llm-city/articles/01-which-llm-builds-city/video/spec.json \
    --stage tts|assemble|publish        # 单段重跑（配音 2026-10-03 起直接 volc 终配）
```

- **单镜改台词/语速/语气**：build_spec.py 的 `S(...)` 支持 `tts_text` 注音、
  `rate`（10=+10%，0=正常）、`instruction`、`tail`（镜尾秒）镜级覆盖；指纹含
  rate/instruction 自动单镜重采。
- **坑 1**：改 `tail` 后 assemble 缓存不敏感（deps 不含它）——删
  `video01/segments/<id>.mp4` 再跑 assemble 强制重拼该镜。
- **坑 2**：cards 渲染是 2x PNG，shot.overlays 必须显式 `width`（CSS px）回 1x，
  否则 top_center 看不出、右上定位出画（s26 教训）。
- 城市数据变更后重采底片（DDA 通道，2026-10-06 起）：先起开发服
  （`npm run preview`；5173 被城主占用时 vite 自动落 5174），然后
  `python tools/video/dda_capture.py --spec <spec.json> --force`
  （幂等锚 raw.mp4，--force 才重采）→ `python tools/video/prep_clips.py` 验契约。

## 底片通道：一律 DDA 满屏直采（2026-10-06 城主裁决）

「以后的视频底片一律 DDA 满屏直采，**无论是否存在 gif 文件/帧图片**」——
web-gif.py 的 CDP screencast 帧（1152×768 · ~6fps，放大 1.67× + 重采样硬补
帧率）对视频底片退役；web-gif.py 本身不动（文章 GIF 素材用途保留）。
DDA 通道 = emulation 视口对齐物理分辨率 → SendInput 系统级 F11 真全屏
（四条软件全屏路皆死路，勿再试）→ ddagrab 60fps 满屏直采 + h264_qsv gq16；
采集期间浏览器全屏盖任务栏，**勿动鼠标/勿切窗**。引擎 assemble 对「有
raw.mp4」的目录只认 clip.mp4，遗留 raw_frames/720p 帧一律无视——prep_clips.py
闸门再兜一道：底片目录缺 DDA 契约即报缺，帧缓存不再是复用理由。
一期已发布成片（moshi_v1.mp4）不返工，旧底片仅供重拼一期时按指引补采。

## 台词标点门槛（llm_test punct_check，2026-10-06 立项）

重跑 `--stage tts` 前会先过标点门槛（零 API 费）：机械修复（半角→全角、
重复标点折叠、直引号配对、中文尾补句号等）自动写回 spec.json + 出报告
`work/punct_report.txt`，然后**拒绝配音**——人工复核报告与台词，确认无误后
在 spec.json 置 `"punct_locked": true` 再重跑 tts。确认后台词又漂移出机械
问题会自动修复并撤销该锁，须重审。build_spec.py 重生成 spec 时：台词逐字
未变才继承该锁，拆镜/改词即视为新台词重新过门槛。

## 定稿快照

- 台词：voiceover-v1 第三稿逐字（narration_locked=true，2026-10-03）
- 配音：volc 咪仔 2.0 `zh_female_mizai_uranus_bigtts` @10 + 干脆利落指令
  （tts_confirmed=true）；镜级特例：s18 平和语气 + 正常语速（音调/语速反馈修复）
- 画面：38 镜；s06 = 空城规划图；s01 镜尾 0.15s（接缝反馈修复）
- 无 BGM（版权惯例，发布时平台曲库自配）
- 封面/发布文案：已定稿出片（cover_locked/copy_locked=true，2026-10-03 城主给题
  「让大模型各建一个街区，最后谁盖得最好？」；标题=简介=同句，话题留空）

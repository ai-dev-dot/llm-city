# -*- coding: utf-8 -*-
"""prep-clips · GIF 原始帧缓存 → llm_test video_maker 底片目录

背景（2026-10-03 城主裁决）：本篇视频动画底片不用 GIF（格式税：640 宽缩放 +
128 色调色板），改用 web-gif.py 当年采集时落盘的**原始 screencast 帧**（1152×768
jpeg q100 + monotonic 时间戳，运镜 = 页面 plazaOrbit 巡航，GIF 即由它量化合成）。
缓存位置 = node_modules/.cache/llm-city/web-gif/frames/<key>/（gitignore）。

产出对齐 llm_test tools/video_maker.py 的底片契约（assemble 消费）：
  clips/<key>/raw_frames/frame_000000.jpg + ts.json   # 细网格直建路径（主路径）
  clips/<key>/clip.mp4                                  # 30fps 兜底（独立播放目检用）
  clips/<key>/clip.json                                 # span/encode.duration_seconds（钳制用）

编码参数经 llm_test encode_args 单源（qsv 缺省，2026-10-01 GPU 优化裁决）；
硬链接搬帧零拷贝（同盘 NTFS），失败回退复制。幂等：--force 才重做。

用法：
  python tools/video/prep_clips.py                # 全部 10 处
  python tools/video/prep_clips.py --keys G5,city # 指定处
  python tools/video/prep_clips.py --force        # 忽略已完成
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")   # Windows cp936 防线（本仓 Python 工具惯例）

REPO = Path(__file__).resolve().parents[2]
CACHE = REPO / "node_modules/.cache/llm-city/web-gif/frames"
LLM_TEST_ROOT = Path(r"D:\APP\llm_test")   # 适配层固化：通用视频引擎唯一源（tools/video_maker.py）
if str(LLM_TEST_ROOT) not in sys.path:
    sys.path.insert(0, str(LLM_TEST_ROOT))
from tools.pk_video_maker import encode_args, ENCODER_DEFAULT   # noqa: E402 编码参数单源

TARGET_FPS = 30      # 兜底 clip.mp4 网格（video_maker.stage_capture 同款）


def ffmpeg() -> str:
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def sh(args: list[str]) -> None:
    subprocess.run([ffmpeg(), "-y", "-loglevel", "error"] + args, check=True)


def link_or_copy(src: Path, dst: Path) -> None:
    try:
        os.link(src, dst)
    except OSError:
        shutil.copyfile(src, dst)


def nearest_resample(frames_dir: Path, seq_dir: Path, span: float) -> int:
    """最近邻重采样到 TARGET_FPS（video_maker.stage_capture 同款二分最近邻）。"""
    ts = json.loads((frames_dir / "ts.json").read_text(encoding="utf-8"))
    rel = [t - ts[0] for t in ts]
    n_out = int(span * TARGET_FPS)
    if seq_dir.exists():
        shutil.rmtree(seq_dir)
    seq_dir.mkdir(parents=True)
    for k in range(n_out):
        target = k / TARGET_FPS
        lo, hi = 0, len(rel) - 1
        while lo < hi:
            mid = (lo + hi) // 2
            if rel[mid] < target:
                lo = mid + 1
            else:
                hi = mid
        best = lo if lo == 0 or abs(rel[lo] - target) < abs(rel[lo - 1] - target) else lo - 1
        link_or_copy(frames_dir / f"frame_{best:06d}.jpg", seq_dir / f"{k:06d}.jpg")
    return n_out


def prep(key: str, work: Path, force: bool, encoder: str) -> None:
    src = CACHE / key
    meta = json.loads((src / "meta.json").read_text(encoding="utf-8"))
    ts = [float(t) for t in meta["timestamps"]]
    span = round(ts[-1] - ts[0], 3)

    out = work / "clips" / key
    done_marker = out / "clip.json"
    if done_marker.is_file() and not force:
        print(f"[prep] {key} 已完成，跳过")
        return

    raw = out / "raw_frames"
    raw.mkdir(parents=True, exist_ok=True)
    for i, t in enumerate(ts):
        link_or_copy(src / f"frame_{i:06d}.jpg", raw / f"frame_{i:06d}.jpg")
    (raw / "ts.json").write_text(json.dumps(ts), encoding="utf-8")

    seq = out / "_seq30"
    n_out = nearest_resample(raw, seq, span)
    sh(["-framerate", str(TARGET_FPS), "-i", str(seq / "%06d.jpg"),
        *encode_args(encoder, 18), str(out / "clip.mp4")])
    shutil.rmtree(seq)

    clip_meta = {
        "model": key,
        "source": "web-gif frame cache（2026-10-02 plazaOrbit 巡航原始帧，"
                  "docs/shot-web.md；2026-10-03 城主裁决：弃 GIF 用原始帧）",
        "period_seconds": float(meta["period"]),
        "label": meta.get("label", ""),
        "viewport": [1152, 768],
        "span_seconds": span,
        "raw_frames": len(ts),
        "raw_avg_fps": round((len(ts) - 1) / span, 2) if span > 0 else None,
        "encode": {"target_fps": TARGET_FPS, "frames_out": n_out,
                   "duration_seconds": round(n_out / TARGET_FPS, 3),
                   "encoder": encoder},
    }
    (out / "clip.json").write_text(
        json.dumps(clip_meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"[prep] {key}: {len(ts)} 帧 / {span:.2f}s / avg {clip_meta['raw_avg_fps']}fps "
          f"→ clip.mp4 {clip_meta['encode']['duration_seconds']}s（{encoder}）")


def main() -> int:
    ap = argparse.ArgumentParser(description="GIF 帧缓存 → video_maker 底片")
    ap.add_argument("--work", default=str(REPO / "node_modules/.cache/llm-city/video01"),
                    help="视频工作目录（缺省 node_modules/.cache/llm-city/video01）")
    ap.add_argument("--keys", default=",".join(sorted(p.name for p in CACHE.iterdir()
                                                      if p.is_dir())),
                    help="逗号分隔的 key（缺省全部）")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--encoder", default=ENCODER_DEFAULT, choices=("x264", "qsv"))
    a = ap.parse_args()
    work = Path(a.work).resolve()
    work.mkdir(parents=True, exist_ok=True)
    for key in [k.strip() for k in a.keys.split(",") if k.strip()]:
        prep(key, work, a.force, a.encoder)
    print(f"[完成] 底片落 {work / 'clips'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

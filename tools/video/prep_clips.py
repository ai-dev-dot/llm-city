# -*- coding: utf-8 -*-
"""prep-clips · 视频底片契约闸门（DDA 满屏直采固化为唯一通道，2026-10-06 城主裁决）

历史职责（web-gif 帧缓存 → clip.mp4 转换）随 DDA 通道固化退役：dda_capture.py
直采即产出引擎契约三件（raw.mp4 / clip.mp4 / clip.json），本件不再做任何转换，
只验闸门——每个底片目录必须是 DDA 形态：
  raw.mp4 + clip.mp4 + clip.json 齐，channel = dda_ddagrab_qsv_f11，
  分辨率 = 当前满屏物理分辨率。
「存在 gif 文件/帧图片就复用」的回头路从这里堵死：引擎 assemble 对「有
raw.mp4」的目录只认 clip.mp4、无视遗留 raw_frames；闸门防的是忘了采 DDA、
旧 CDP 产物（1152×768 · ~6fps）被静默当底片。

一期已发布成片（moshi_v1.mp4）不返工；一期 work 下的旧底片（无 raw.mp4 的
CDP 形态）会被本件如实报缺——重拼一期才需要按指引补采。

用法：
  python tools/video/prep_clips.py                 # 校验 work 下全部底片
  python tools/video/prep_clips.py --keys G5,city  # 只验指定键
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")   # Windows cp936 防线（本仓 Python 工具惯例）

from media_kit.dda_capture import probe_screen   # noqa: E402  满屏分辨率单源

REPO = Path(__file__).resolve().parents[2]
DEFAULT_WORK = REPO / "node_modules/.cache/llm-city/video01"
CHANNEL_DDA = "dda_ddagrab_qsv_f11"   # = media_kit.dda_capture.capture_page 产出
RES_TOL = 20          # 分辨率容差 px（dpr 尾数溢出兜底，同采集侧视口校验）


def _recapture_hint(key: str) -> str:
    return f"python tools/video/dda_capture.py --keys {key} --force 重采"


def check_key(key: str, out: Path, geo: dict) -> tuple[bool, str]:
    """验一个底片目录的 DDA 契约。返回 (ok, 摘要/报缺文案)。"""
    problems = []
    raw, clip, meta_p = out / "raw.mp4", out / "clip.mp4", out / "clip.json"

    if not (raw.is_file() and raw.stat().st_size > 0):
        # 无 raw.mp4 = 非 DDA 形态（一期 prep_clips 旧产物或目录缺失）
        if (out / "raw_frames" / "ts.json").is_file():
            problems.append("缺 raw.mp4（现存 raw_frames = 一期 CDP 旧底片；"
                            "一期已定稿无需重拼，确要重拼请 " + _recapture_hint(key) + "）")
        else:
            problems.append("缺 raw.mp4（目录不存在或为空）——" + _recapture_hint(key))
    if not (clip.is_file() and clip.stat().st_size > 0):
        problems.append("缺 clip.mp4（剪辑底片）——" + _recapture_hint(key))
    if not meta_p.is_file():
        problems.append("缺 clip.json（通道元数据，assemble 读它钳制素材长度）——"
                        + _recapture_hint(key))
        return False, "；".join(problems)

    meta = json.loads(meta_p.read_text(encoding="utf-8"))
    channel = meta.get("channel")
    if channel != CHANNEL_DDA:
        problems.append(f"channel={channel!r} ≠ DDA（{CHANNEL_DDA}）——"
                        + _recapture_hint(key))
    dur = (meta.get("encode") or {}).get("duration_seconds") or 0
    if dur <= 0:
        problems.append("clip.json encode.duration_seconds 异常（assemble 以此钳制 start）")
    vp = meta.get("viewport") or []
    want = (geo["phys_w"], geo["phys_h"])
    if (len(vp) != 2 or abs(vp[0] - want[0]) > RES_TOL
            or abs(vp[1] - want[1]) > RES_TOL):
        problems.append(f"底片分辨率 {vp} ≠ 当前满屏 {list(want)}"
                        f"（换过显示器/他机产物？）——" + _recapture_hint(key))

    if problems:
        return False, "；".join(problems)
    note = ""
    if (out / "raw_frames").is_dir():
        note = "（遗留 raw_frames 引擎已无视，可留可删）"
    return True, (f"DDA {vp[0]}x{vp[1]} span={meta.get('span_seconds')}s "
                  f"更新率={meta.get('screen_update_fps')}fps{note}")


def main() -> int:
    ap = argparse.ArgumentParser(
        description="DDA 底片契约闸门（不再是转换器）")
    ap.add_argument("--work", default=str(DEFAULT_WORK),
                    help="底片根（缺省缓存区 video01）")
    ap.add_argument("--keys", help="逗号分隔（缺省 = work/clips 全部子目录）")
    a = ap.parse_args()
    work = Path(a.work).resolve()
    clips_root = work / "clips"
    if not clips_root.is_dir():
        raise SystemExit(f"[abort] 无底片目录 {clips_root}——"
                         f"先跑 python tools/video/dda_capture.py --spec <spec.json>")
    keys = ([k.strip() for k in a.keys.split(",") if k.strip()] if a.keys
            else sorted(p.name for p in clips_root.iterdir() if p.is_dir()))
    if not keys:
        raise SystemExit(f"[abort] {clips_root} 下无底片——先跑 dda_capture.py")

    geo = probe_screen()
    fails = []
    for key in keys:
        ok, msg = check_key(key, clips_root / key, geo)
        mark = "✓" if ok else "✗"
        print(f"[prep] {mark} {key}: {msg}")
        if not ok:
            fails.append(key)
    if fails:
        print(f"[prep] {len(fails)}/{len(keys)} 键缺 DDA 契约：{' '.join(fails)}"
              f"——视频底片一律 DDA 满屏直采（2026-10-06 城主裁决），"
              f"帧缓存/GIF 不再作为底片来源")
        return 1
    print(f"[prep] 底片就绪 ×{len(keys)}（DDA 形态，可进 assemble）")
    return 0


if __name__ == "__main__":
    sys.exit(main())

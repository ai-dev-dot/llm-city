# -*- coding: utf-8 -*-
"""dda-capture · 城市页 DDA 满屏直采（视频底片唯一通道，2026-10-06 城主裁决）

「以后的视频底片一律 DDA 满屏直采，无论是否存在 gif 文件/帧图片」——
web-gif.py 的 CDP screencast 帧缓存（1152×768 · ~6fps）对视频底片退役
（文章 GIF 素材用途不变，web-gif.py 本身不动）。本件直采即产出引擎
assemble 的 DDA 形态契约三件：
  clips/<key>/raw.mp4    60fps 满屏底片（保留；幂等锚：在即跳过）
  clips/<key>/clip.mp4   剪辑用底片（更新率达标原速零代损，欠速轻压 2×）
  clips/<key>/clip.json  通道元数据（assemble 读 encode.duration_seconds 钳制）
引擎侧判定（video_maker.stage_assemble）：目录有 raw.mp4 = DDA 形态，只用
clip.mp4、无视遗留 raw_frames——旧帧缓存残留不会被静默当底片。

采集四要素与 llm_test media_kit/dda_capture.py 同源（probe_screen /
fullscreen_f11 / count_frames 及阈值常量直接 import 复用；那边 capture_page
写死本地 page.html 的 file URI，城市页是 http://localhost:5174/llm-city +
plazaOrbit 巡航，页面编排在此自带）：
  emulation 视口（逻辑 = 物理/DPI）@ device_scale_factor = 系统 DPI
  → canvas 真渲染满屏物理分辨率 → SendInput 系统级 F11 真全屏
  → ddagrab 60fps 满屏直采零裁剪 → h264_qsv gq16 单代低损。
  四条软件全屏路皆死路（CDP setWindowBounds / --kiosk / page.keyboard F11 /
  requestFullscreen，2026-10-06 逐条实测），勿再试——只有 OS 级 SendInput 有效。

纪律：仅 Windows + 真实显示器（DDA 抓屏）；采集期间浏览器 F11 前台全屏盖
任务栏，勿动鼠标/勿切窗（动了就采进杂物）。先起开发服：城主 5173 常驻时
vite 自动落 5174（本件缺省基址）；5173 空闲时自行 `npm run preview` 起服并
用 --url-base 传实际端口。

用法：
  python tools/video/dda_capture.py --spec articles/01-which-llm-builds-city/video/spec.json [--only G5 city]
  python tools/video/dda_capture.py --keys G5,city [--work <目录>] [--force]
  # --seconds 0（缺省）= 自动：巡航两圈 + 0.5s 余量；显式给秒数则照采
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")   # Windows cp936 防线（本仓 Python 工具惯例）

from media_kit.dda_capture import (   # noqa: E402  四要素/阈值单源（llm_test media_kit 包）
    FF, PRESS_THRESHOLD_FPS, QSV_QUALITY, count_frames, fullscreen_f11,
    probe_screen)

REPO = Path(__file__).resolve().parents[2]
DEFAULT_WORK = REPO / "node_modules/.cache/llm-city/video01"
URL_BASE = "http://localhost:5174/llm-city"   # 城主 5173 常驻 → 新 vite 实例落 5174
ORBIT_SPEED = 6.0        # 巡航加速倍率：一圈 50/6 ≈ 8.3s（web-gif 同款无缝循环基准）
CHANNEL_DDA = "dda_ddagrab_qsv_f11"   # 与 media_kit.dda_capture.capture_page 产出一致

# 渲染器自检 / 巡航启动 JS 与 tools/shot-web/web-gif.py 同源（那边出文章 GIF
# 素材，这边出视频底片）：藏 HUD 两边都要；tour.speed 直写只影响 t 增速；
# period = 50/speed（TourController 一圈基准 50s）。
RENDERER_JS = """
() => {
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
  if (!gl) return { ok: false, reason: 'no webgl context' };
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const r = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  return { ok: true, renderer: String(r) };
}
"""

PREP_JS = """
(speed) => {
  // 藏整个 HUD（含铭牌标签层）：视频底片同样不带建筑名/控件
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = 'none';
  const city = window.__city;
  if (!city) return { ok: false, reason: 'window.__city 不存在（页面未加载完或非本仓页面）' };
  city.tour.speed = speed;
  city.tour.start('plazaOrbit', { area: city.measureTourArea() });
  const opt = document.querySelector('#hud select')?.selectedOptions?.[0]?.textContent || '';
  const label = opt.replace(/\\s*[（(]\\d+\\s*栋[）)]\\s*$/, '')
                   .replace(/^\\s*[A-I]\\d+\\s*/, '')
                   .trim();
  return { ok: true, route: city.tour.current, period: 50 / speed, label };
}
"""


def page_url(key: str, base: str) -> str:
    return f"{base}/" if key == "city" else f"{base}/?block={key}"


def capture_key(key: str, out: Path, geo: dict, url_base: str,
                orbit_speed: float, seconds: float, force: bool) -> dict:
    """F11 全屏 DDA 采一个 key → out/{raw.mp4, clip.mp4, clip.json}。

    幂等锚 = raw.mp4（在即跳过；--force 或删 raw.mp4 重采）。遗留 raw_frames
    （一期 CDP 产物）不动不读——DDA 形态下引擎无视它。"""
    from playwright.sync_api import sync_playwright

    raw, clip = out / "raw.mp4", out / "clip.mp4"
    if force:
        for p in (raw, clip, out / "clip.json"):
            p.unlink(missing_ok=True)
    if raw.is_file() and raw.stat().st_size > 0:
        print(f"[dda] {key} 已有 raw.mp4，跳过（--force 或删 raw.mp4 重采）")
        if (out / "clip.json").is_file():
            return json.loads((out / "clip.json").read_text(encoding="utf-8"))
        return {}

    dpr, sw, sh_ = geo["dpr"], geo["phys_w"], geo["phys_h"]
    lw, lh = round(sw / dpr), round(sh_ / dpr)      # 逻辑视口 = 物理/DPI
    print(f"[dda] {key} 准备 F11 全屏直采（勿动鼠标/勿切窗）…", flush=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, args=[   # 铁律：有头 + 真 GPU
            "--use-angle=d3d11",
            "--autoplay-policy=no-user-gesture-required"])
        try:
            ctx = browser.new_context(
                viewport={"width": lw, "height": lh}, device_scale_factor=dpr)
            page = ctx.new_page()
            info = page.evaluate(RENDERER_JS)
            low = str(info.get("renderer", "")).lower()
            if not info.get("ok") or "swiftshader" in low or "llvmpipe" in low:
                raise SystemExit(f"[abort] 软渲染风险（"
                                 f"{info.get('renderer', info.get('reason'))}）——绝不继续")
            print(f"[自检] WebGL 渲染器：{info['renderer']}", flush=True)
            page.goto(page_url(key, url_base), wait_until="load")
            page.wait_for_timeout(4000)   # 等建筑 chunk 挂载完（灰盒/空窗会进底片）
            prep = page.evaluate(PREP_JS, orbit_speed)
            if not prep.get("ok"):
                raise SystemExit(f"[abort] 巡航启动失败：{prep.get('reason')}")
            period = float(prep["period"])
            if seconds <= 0:              # 自动时长 = 巡航两圈 + 余量（剪辑起点任取）
                seconds = round(2 * period + 0.5, 2)
            print(f"[巡航] route={prep['route']} speed×{orbit_speed} "
                  f"一圈 {period:.2f}s，采 {seconds:.2f}s", flush=True)
            page.wait_for_timeout(500)    # 等合成器提交藏 HUD 后的新帧（HUD 残留防线）
            fullscreen_f11(page.title())
            page.wait_for_timeout(1000)
            session = ctx.new_cdp_session(page)
            wid = session.send("Browser.getWindowForTarget")["windowId"]
            st = session.send("Browser.getWindowBounds",
                              {"windowId": wid})["bounds"]
            if st.get("windowState") != "fullscreen":
                print(f"  [warn] 窗口未全屏（{st}），画面将含杂物")
            # dpr 尾数溢出（0.0001px）兜底：关滚动条
            page.evaluate("() => { document.documentElement.style"
                          ".overflow = 'hidden';"
                          " document.body.style.overflow = 'hidden'; }")
            page.wait_for_timeout(4000)   # 等「按住 Esc」全屏提示条自动消失
            m = page.evaluate("() => ({iw: innerWidth, ih: innerHeight,"
                              " dpr: devicePixelRatio})")
            vw, vh = round(m["iw"] * dpr), round(m["ih"] * dpr)
            if abs(vw - sw) > 20 or abs(vh - sh_) > 20:
                print(f"  [warn] 视口物理 {vw}x{vh} ≠ 满屏 {sw}x{sh_}")
            t0 = time.monotonic()
            subprocess.run(
                [FF, "-y", "-loglevel", "error", "-filter_complex",
                 "ddagrab=output_idx=0:framerate=60,"
                 "hwmap=derive_device=qsv,format=qsv",
                 "-c:v", "h264_qsv", "-global_quality", str(QSV_QUALITY),
                 "-t", str(seconds), str(raw)], check=True)
            print(f"  底片用时 {time.monotonic() - t0:.1f}s", flush=True)
        finally:
            try:
                browser.close()
            except Exception as e:   # noqa: BLE001
                print(f"[警告] browser.close() 失败：{e}")
                print("       兜底硬杀：powershell \"Get-Process chrome | "
                      "Where-Object { $_.Path -like '*ms-playwright*' } | "
                      "Stop-Process -Force\"")

    fps = count_frames(raw) / seconds
    slow2x = 0.5 if fps < PRESS_THRESHOLD_FPS else 1.0
    if slow2x == 1.0:
        shutil.copyfile(raw, clip)       # 原速：零处理零代损
    else:
        # 屏幕更新率不足 = 页面被拉慢，2× 轻压回真实运镜节奏
        subprocess.run([FF, "-y", "-loglevel", "error", "-i", str(raw),
                        "-vf", "setpts=0.5*PTS,fps=60",
                        "-c:v", "h264_qsv", "-global_quality", str(QSV_QUALITY),
                        "-an", str(clip)], check=True)
    span = round(seconds * slow2x, 3)
    meta = {
        "channel": CHANNEL_DDA,
        "format": "h264_qsv", "quality": f"global_quality={QSV_QUALITY}",
        "viewport": [sw, sh_], "viewport_logic": [lw, lh], "dpr": dpr,
        "fullscreen": "sendinput_f11",
        "url": page_url(key, url_base),
        "route": prep.get("route"), "period_seconds": period,
        "orbit_speed": orbit_speed, "label": prep.get("label", ""),
        "capture_seconds": seconds, "screen_update_fps": round(fps, 2),
        "speed": slow2x, "span_seconds": span, "raw_file": "raw.mp4",
        "encode": {"target_fps": 60, "duration_seconds": span},
    }
    out.mkdir(parents=True, exist_ok=True)
    (out / "clip.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"  更新率 {fps:.1f}fps -> speed={slow2x} "
          f"clip={sw}x{sh_} span={span}s", flush=True)
    return meta


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description="城市页 DDA 满屏直采（视频底片唯一通道）")
    ap.add_argument("--spec", help="视频 spec（读 spec.clips 底片清单）")
    ap.add_argument("--keys", help="手工模式：逗号分隔，如 G5,city（city=全城）")
    ap.add_argument("--only", nargs="*", help="spec 模式：只采这些键")
    ap.add_argument("--work", default=str(DEFAULT_WORK),
                    help="底片输出根（缺省缓存区 video01）")
    ap.add_argument("--url-base", default=URL_BASE,
                    help=f"页面基址（缺省 {URL_BASE}；勿用城主 5173）")
    ap.add_argument("--speed", type=float, default=ORBIT_SPEED,
                    help=f"巡航加速倍率（缺省 {ORBIT_SPEED} ≈ 8.3s/圈）")
    ap.add_argument("--seconds", type=float, default=0,
                    help="采集秒数（缺省 0 = 自动：巡航两圈+0.5s）")
    ap.add_argument("--force", action="store_true", help="删已有 raw.mp4 强制重采")
    a = ap.parse_args(argv)

    if not a.spec and not a.keys:
        ap.error("须给 --spec 或 --keys")
    work = Path(a.work).resolve()
    if a.spec:
        spec_path = Path(a.spec)
        if not spec_path.is_file():
            spec_path = REPO / a.spec
        spec = json.loads(spec_path.read_text(encoding="utf-8"))
        clips = spec.get("clips") or {}
        pages = {k: (c or {}).get("dda_seconds") for k, c in clips.items()
                 if not k.startswith("_")}
        if not pages:
            raise SystemExit("[abort] spec.clips 无底片清单——重跑 build_spec.py 生成")
        keys = list(pages)
        if a.only:
            keys = [k for k in keys if k in a.only]
            missing = set(a.only) - set(keys)
            if missing:
                print(f"[warn] --only 里 {sorted(missing)} 不在 spec.clips 中，跳过")
    else:
        pages = {}
        keys = [k.strip().lower() if k.strip().lower() == "city"
                else k.strip().upper() for k in a.keys.split(",") if k.strip()]

    if not keys:
        raise SystemExit("[abort] 无可采键")
    geo = probe_screen()
    print(f"[dda] 满屏 {geo['phys_w']}x{geo['phys_h']} @ dpr {geo['dpr']}，"
          f"{len(keys)} 键：{' '.join(keys)}", flush=True)
    meta_all_path = work / "clips" / "dda_meta.json"
    meta_all = (json.loads(meta_all_path.read_text(encoding="utf-8"))
                if meta_all_path.is_file() else {})
    for key in keys:
        meta = capture_key(key, work / "clips" / key, geo, a.url_base,
                           a.speed, pages.get(key) or a.seconds, a.force)
        if meta:
            meta_all[key] = meta
    if meta_all:
        (work / "clips").mkdir(parents=True, exist_ok=True)
        meta_all_path.write_text(
            json.dumps(meta_all, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8")
    print(f"[dda] 完成，底片落 {work / 'clips'}（prep_clips.py 可验契约）")
    return 0


if __name__ == "__main__":
    sys.exit(main())

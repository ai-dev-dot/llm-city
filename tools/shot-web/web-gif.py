# -*- coding: utf-8 -*-
"""web-gif · 网页实景街区绕飞 gif（有头 Playwright + CDP screencast + 全局调色板合成）

定位（[city-admin] 2026-10-02）：公众号文章素材以网页实景为准——shot 是软件光栅化，
出不了网页端 IBL 玻璃反射的材质质感。运镜直接用页面自带「巡航：街区环绕」
（plazaOrbit），巡航速度临时调快到一圈 ~8.3s 恰好做无缝循环 gif。
有头铁律与渲染器自检同 docs/shot-web.md / verify-template.py——无头截 WebGL 会烧满
CPU 卡死整机（2026-09-27 实测事故），别改。

用法：
  python tools/shot-web/web-gif.py --block D4        # 单街区
  python tools/shot-web/web-gif.py --city            # 全城
  常用参数：--width 640 --fps 10 --colors 128 --speed 6 --out <目录>

口径（微信 10MB 单文件红线下的实测平衡）：
  640×427 / 10fps / 128 色 / 一圈 8.3s ≈ 5~7MB。画面细节多 LZW 压不动，
  960 宽实测 21MB 超线，勿盲目升宽。
水印：右上角「街区名 · 模型名」（取自页面街区选择器原文，与页面显示一致），
  白字黑描边（llm_test 验证过的可读方案），一行放不下自动拆两行；全城 = 城名。
  建筑铭牌不进 gif（640 宽下不可读且随遮挡闪变，2026-10-02 城主裁决维持隐藏）。
依赖：本机系统级 Python3.13 + Playwright + Pillow（docs/shot-web.md 的既有声明），零 npm 依赖。
"""
import argparse
import base64
import json
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")   # Windows cp936 防线（本仓 Python 工具惯例）

from playwright.sync_api import sync_playwright   # noqa: E402

from PIL import Image, ImageDraw, ImageFont   # noqa: E402

_LANCZOS = getattr(getattr(Image, "Resampling", Image), "LANCZOS")   # Pillow ≥9.1 与旧版兼容

FONT_PATH = r"C:\Windows\Fonts\msyhbd.ttc"   # 微软雅黑 Bold：水印字体（本机系统自带）

# 渲染器自检：出图前确认拿到真 GPU（同 verify-template.py，掐死「有头却软渲染」）
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
  // 藏整个 HUD（含铭牌标签层——铭牌是 hud 的子元素，连带隐藏。
  // 2026-10-02 城主裁决：gif 不带建筑名，640 宽下不可读且随遮挡闪变）。
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = 'none';
  const city = window.__city;
  if (!city) return { ok: false, reason: 'window.__city 不存在（页面未加载完或非本仓页面）' };
  city.tour.speed = speed;                       // TourController 私有字段的 JS 侧直写：只影响 t 增速
  city.tour.start('plazaOrbit', { area: city.measureTourArea() });
  // 水印文案取自页面街区选择器（与页面显示一致）："D4 西岸商业街区 · MiMo-V2.6-Flash（5 栋）"
  const opt = document.querySelector('#hud select')?.selectedOptions?.[0]?.textContent || '';
  const label = opt.replace(/\\s*[（(]\\d+\\s*栋[）)]\\s*$/, '')      // 去「（5 栋）」
                   .replace(/^\\s*[A-I]\\d+\\s*/, '')                  // 去「D4 」街区编号前缀（2026-10-02 城主裁决）
                   .trim();
  return { ok: true, route: city.tour.current, period: 50 / speed, label };
}
"""


def draw_watermark(img, lines):
    """右上角水印：白字黑描边，字号随帧宽等比（2.8%，下限 15px），多行右对齐竖排。
    须在量化前于最终分辨率上画——缩放后字会糊，量化后画会丢描边。"""
    w = img.width
    size = max(15, round(w * 0.028))
    font = ImageFont.truetype(FONT_PATH, size)
    d = ImageDraw.Draw(img)
    stroke = max(2, size // 7)
    margin = max(8, round(w * 0.014))
    y = margin
    for text in lines:
        tw = d.textlength(text, font=font)
        d.text((w - tw - margin, y), text, font=font, fill=(255, 255, 255),
               stroke_width=stroke, stroke_fill=(0, 0, 0))
        y += round(size * 1.35)
    return img


def capture(page, cdp, url, seconds, frames_dir, speed):
    """加载页面 → 开街区环绕巡航（加速）→ screencast 直采帧（内存队列，采完统一落盘）。

    事件回调只做内存解码：回调内做文件 IO 曾触发 Playwright 事件泵反复重放的竞态
    （2026-10-02 实测 frame FileNotFound × N）。返回 (ts_paths, period, label)：
    ts_paths = [(ts, path)]，period = 巡航一圈秒数，label = 水印文案。"""
    arrived = []          # (ts, jpeg_bytes, sessionId)
    on_disk = []          # 已落盘路径（与 arrived 一一对应）

    def flush_disk():
        while len(on_disk) < len(arrived):
            path = frames_dir / f"frame_{len(on_disk):06d}.jpg"
            path.write_bytes(arrived[len(on_disk)][1])
            on_disk.append(path)

    def on_frame(frame):
        ts = (frame.get("metadata") or {}).get("timestamp")
        arrived.append((ts if ts is not None else time.monotonic(),
                        base64.b64decode(frame["data"]), frame.get("sessionId")))

    cdp.on("Page.screencastFrame", on_frame)
    page.goto(url, wait_until="load")
    page.wait_for_timeout(4000)   # 等建筑 chunk 挂载完（灰盒/空窗会进帧）
    prep = page.evaluate(PREP_JS, speed)
    if not prep.get("ok"):
        raise RuntimeError(f"巡航启动失败：{prep.get('reason')}")
    period = float(prep["period"])
    print(f"[巡航] route={prep['route']} speed×{speed} 一圈 {period:.2f}s，采 {seconds:.2f}s", flush=True)

    # 等合成器提交藏 HUD 后的新帧——否则 screencast 首帧是 display:none 前的最后合成帧（HUD 残留）
    page.wait_for_timeout(500)
    t_start = time.monotonic()
    cdp.send("Page.startScreencast", {"format": "jpeg", "quality": 100,
                                      "maxWidth": 1280, "maxHeight": 800})
    acked = 0
    while time.monotonic() - t_start < seconds:
        page.wait_for_timeout(30)
        while acked < len(arrived):
            cdp.send("Page.screencastFrameAck", {"sessionId": arrived[acked][2]})
            acked += 1
    try:
        cdp.send("Page.stopScreencast")
    except Exception:
        pass
    while acked < len(arrived):
        cdp.send("Page.screencastFrameAck", {"sessionId": arrived[acked][2]})
        acked += 1
    flush_disk()
    return [(arrived[i][0], on_disk[i]) for i in range(len(on_disk))], period, prep.get("label", "")


def build_gif_global(frames_paths, out_path, frame_ms, width, colors, max_frames=140, watermark=None):
    """全局调色板一次性合成：全帧拼条一次量化出统一调色板 + FS 抖动逐帧应用——
    消逐帧独立量化的调色板闪烁（llm_test 实测的暗场劣化元凶）。
    帧数预算在选帧时前置控制，这里不做编码重试循环（网页画面 LZW 压不动，一轮回 2 分钟）。
    Pillow 对「与前一帧完全相同」的帧自动合并、时长累加——播放时长守恒、体积更小，属正向优化。"""
    def load(p):
        img = Image.open(p).convert("RGB")
        if img.width != width:
            img = img.resize((width, round(img.height * width / img.width)), _LANCZOS)
        if watermark:
            img = draw_watermark(img, watermark)
        return img
    frames = [load(p) for p in frames_paths]
    if len(frames) > max_frames:
        step = -(-len(frames) // max_frames)
        frames = frames[::step]
        print(f"[选帧] 超预算，抽稀到 {len(frames)} 帧（step={step}）", flush=True)
    w, h = frames[0].size
    strip = Image.new("RGB", (w, h * len(frames)))
    for k, im in enumerate(frames):
        strip.paste(im, (0, h * k))
    pal_img = strip.quantize(colors=colors, method=Image.Quantize.MEDIANCUT)
    pal_frames = [im.quantize(palette=pal_img, dither=Image.Dither.FLOYDSTEINBERG) for im in frames]
    pal_frames[0].save(out_path, format="GIF", save_all=True, append_images=pal_frames[1:],
                       duration=frame_ms, loop=0, optimize=True)
    return {"frames": len(pal_frames), "bytes": Path(out_path).stat().st_size,
            "duration": len(pal_frames) * frame_ms / 1000, "size": [w, h]}


def parse_args():
    ap = argparse.ArgumentParser(description="网页实景街区绕飞 gif（有头浏览器 + 页面巡航运镜）")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--block", help="街区 id，如 D4")
    g.add_argument("--city", action="store_true", help="全城（水印 = 城名）")
    ap.add_argument("--speed", type=float, default=6.0, help="巡航加速倍率（缺省 6 ≈ 8.3s 一圈）")
    ap.add_argument("--out", default=None, help="gif 输出目录（缺省 node_modules/.cache/llm-city/web-gif）")
    ap.add_argument("--url-base", default="http://localhost:5174/llm-city", help="页面基址（另起端口，勿用城主 5173）")
    ap.add_argument("--width", type=int, default=640, help="gif 宽（缺省 640；960 实测 21MB 超微信线）")
    ap.add_argument("--fps", type=float, default=10)
    ap.add_argument("--colors", type=int, default=128, help="全局调色板色数（缺省 128；256 色 ×1.6 体积）")
    ap.add_argument("--seconds", type=float, default=0, help="采集时长（缺省 = 一圈 + 0.4s 余量）")
    ap.add_argument("--max-frames", type=int, default=140, help="合成帧数硬上限（微信 300 帧红线内留足余量）")
    ap.add_argument("--recapture", action="store_true", help="忽略帧缓存强制重采（城市数据更新后用）")
    return ap.parse_args()


def main():
    a = parse_args()
    block = None if a.city else a.block.upper()
    key = "city" if a.city else block
    url = f"{a.url_base}/" if a.city else f"{a.url_base}/?block={block}"
    repo_root = Path(__file__).resolve().parents[2]
    out_dir = Path(a.out).resolve() if a.out else (repo_root / "node_modules/.cache/llm-city/web-gif")
    out_dir.mkdir(parents=True, exist_ok=True)
    gif_path = out_dir / f"weborbit-{key}.gif"
    # 帧缓存固定在缓存区（gitignore），与产物目录解耦——--out 指到 articles/ 等版本库
    # 目录时帧缓存不会混进去
    cache_dir = repo_root / "node_modules/.cache/llm-city/web-gif/frames" / key
    meta_path = cache_dir / "meta.json"

    # ---- 帧缓存命中判定：period（=圈速）一致且帧文件齐全即复用，不开浏览器 ----
    arrived = period = label = None
    if meta_path.exists() and not a.recapture:
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            cands = [cache_dir / f"frame_{i:06d}.jpg" for i in range(len(meta["timestamps"]))]
            if abs(float(meta["period"]) - 50 / a.speed) < 0.01 and len(cands) >= 10 and all(p.exists() for p in cands):
                arrived = list(zip([float(t) for t in meta["timestamps"]], cands))
                period, label = float(meta["period"]), meta["label"]
                print(f"[缓存] 命中 {len(arrived)} 帧（--recapture 强制重采）", flush=True)
        except (OSError, ValueError, KeyError) as e:
            print(f"[缓存] 不可用（{e}）——重新采集", flush=True)

    if arrived is None:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False)   # 铁律：有头。改无头 = 整机僵死
            try:
                ctx = browser.new_context(viewport={"width": 1152, "height": 768})   # 3:2，gif 更饱满
                page = ctx.new_page()
                cdp = ctx.new_cdp_session(page)
                page.goto("about:blank")
                info = page.evaluate(RENDERER_JS)
                low = str(info.get("renderer", "")).lower()
                if not info.get("ok") or "swiftshader" in low or "llvmpipe" in low:
                    print(f"[中止] 软渲染风险（{info.get('renderer', info.get('reason'))}）——绝不继续")
                    return 2
                print(f"[自检] WebGL 渲染器：{info['renderer']}", flush=True)

                seconds = a.seconds or (50 / a.speed + 0.4)
                cache_dir.mkdir(parents=True, exist_ok=True)
                arrived, period, label = capture(page, cdp, url, seconds, cache_dir, a.speed)
                if len(arrived) < 10:
                    print(f"[失败] 仅采到 {len(arrived)} 帧")
                    return 1
                meta_path.write_text(json.dumps(
                    {"period": period, "label": label, "speed": a.speed,
                     "captured_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
                     "timestamps": [ts for ts, _ in arrived]}, ensure_ascii=False), encoding="utf-8")
            finally:
                try:
                    browser.close()
                except Exception as e:   # noqa: BLE001
                    print(f"[警告] browser.close() 失败：{e}")
                    print("       兜底硬杀：powershell \"Get-Process chrome | "
                          "Where-Object { $_.Path -like '*ms-playwright*' } | Stop-Process -Force\"")

    # ---- 合成（缓存与新采集共用路径）----
    # 水印行：街区 = 「街区名 · 模型名」（页面选择器原文，无编号前缀）；全城 = 城名。
    # 整串 ≤62% 画面宽一行放下，否则拆两行（街区名 / 模型名，右对齐）。
    if a.city:
        wm_lines = ["模都 llm-city"]
    else:
        parts = [s.strip() for s in label.split("·") if s.strip()] or [label or block]
        probe = ImageDraw.Draw(Image.new("RGB", (10, 10)))
        probe_f = ImageFont.truetype(FONT_PATH, max(15, round(a.width * 0.028)))
        one_line = " · ".join(parts)
        wm_lines = [one_line] if probe.textlength(one_line, font=probe_f) <= a.width * 0.62 else parts
    print(f"[水印] {' / '.join(wm_lines)}", flush=True)

    # 原始帧率自适应选帧：gif 帧数不超实际采集帧数——超出的时刻只能重复取帧，
    # Pillow 会把相同帧合并成超长定格（实测 D4 停 2.1s / 全城停 4.1s 的卡顿元凶）。
    # 播放时长恒等于一圈；实际帧率随采集浮动（街区 ~10-16fps，全城 ~4-8fps）。
    t0 = arrived[0][0]
    win = [(ts, pth) for ts, pth in arrived if ts - t0 <= period]
    n = min(len(win), max(2, round(period * a.fps)), a.max_frames)
    step = len(win) / n
    sel = [win[min(len(win) - 1, int(k * step))][1] for k in range(n)]
    frame_ms = max(20, round(1000 * period / n))
    print(f"[选帧] 整圈原始 {len(win)} 帧 → 取 {n} 帧（{1000 / frame_ms:.1f}fps，播 {n * frame_ms / 1000:.1f}s）", flush=True)

    meta = build_gif_global(sel, gif_path, frame_ms=frame_ms, width=a.width,
                            colors=a.colors, max_frames=a.max_frames, watermark=wm_lines)
    print(f"[完成] {gif_path}：{meta['frames']} 帧，{meta['bytes'] / 1048576:.2f}MB，"
          f"播 {meta['duration']:.1f}s（{meta['size'][0]}×{meta['size'][1]}）", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())

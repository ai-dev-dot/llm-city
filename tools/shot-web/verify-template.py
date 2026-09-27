# -*- coding: utf-8 -*-
"""网页实景自评 · 有头 Playwright 模板 —— llm-city 官方模板（[city-admin] 2026-09-27）

自评首选仍是 `npm run shot`（零浏览器、秒级）。**本模板只在 shot 覆盖不了时用**——
比如要看网页 IBL 实景材质、要看交互。用法见 docs/shot-web.md，规则见 CITY.md 第 8 步。

为什么必须有头（照抄 llm_test 铁律，别改）：
  无头 Chrome 拿不到 GPU，WebGL 退回 SwiftShader 纯 CPU 软渲染；再叠加虚拟时间等待，
  一次截图会烧 8~15 分钟 100% CPU，2 核机器直接整机僵死（2026-09-27 实测事故，四次硬重启，
  一张图 8 分 21 秒）。有头 = 真 GPU = 每帧 16ms，真实时间等待 = 时间有界。

用法：
  1. 复制本文件到你的工作间：node_modules/.cache/llm-city/workshop/<你的 model_id>/web-verify.py
  2. 按需改下面 PAGE / BEATS / VIEWPORT（或命令行传参）
  3. `python web-verify.py`  →  出图落 --out 目录，读图自评
"""
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")   # Windows 铁律：默认 cp936 读中文即崩

from playwright.sync_api import sync_playwright   # noqa: E402  （须在 reconfigure 之后）

# ─────────────────────────── 按需修改 ───────────────────────────
PAGE = "http://localhost:5174/llm-city/?block=E6"   # 要看的页面（vite 另起端口，勿用城主的 5173）
BEATS = (3, 8, 20)          # 真实时间拍点（秒）：累计时间轴，到点截一张
VIEWPORT = (1280, 720)      # 视口；有头窗口按此开，勿超屏幕
OUT = "node_modules/.cache/llm-city/workshop/web-verify"   # 出图目录（相对仓库根）
# ────────────────────────────────────────────────────────────────


def parse_args():
    """极简参数覆盖：--url/--beats/--out/--width/--height"""
    url, beats, out = PAGE, BEATS, OUT
    w, h = VIEWPORT
    args = sys.argv[1:]
    for i, a in enumerate(args):
        nxt = args[i + 1] if i + 1 < len(args) else ""
        if a == "--url":
            url = nxt
        elif a == "--beats":
            beats = tuple(float(x) for x in nxt.split(","))
        elif a == "--out":
            out = nxt
        elif a == "--width":
            w = int(nxt)
        elif a == "--height":
            h = int(nxt)
    return url, beats, out, w, h


# 渲染器自检：出图前先确认拿到的是真 GPU。llm-city 增强项（llm_test 模板没有），
# 用来把"有头却意外退化成软渲染"（GPU 被占 / 传了 --disable-gpu 之类）从源头掐死。
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


def run_session(p, url, beats, outdir, w, h):
    """一次有头会话。browser 的生命周期严格限制在本函数内——
    close() 必须在 sync_playwright 的 with 退出**之前**执行，否则 Playwright 已停止，
    close() 会报 "Event loop is closed" 且窗口留在屏幕上不关。"""
    page_errors, console_errors, failed_reqs = [], [], []
    browser = p.chromium.launch(headless=False)   # 铁律：有头。改无头 = 整机僵死
    try:
        pg = browser.new_page(viewport={"width": w, "height": h})
        pg.on("pageerror", lambda e: page_errors.append(str(e)[:200]))
        pg.on("console", lambda m: console_errors.append(m.text[:200]) if m.type == "error" else None)
        pg.on("requestfailed", lambda r: failed_reqs.append(r.url[:120]))

        # ── 自检：必须是真 GPU，否则立即中止（只读渲染器字符串，不渲染重场景，零风险）──
        pg.goto("about:blank")
        info = pg.evaluate(RENDERER_JS)
        if not info.get("ok"):
            print(f"[中止] WebGL 不可用：{info.get('reason')}")
            return 2
        renderer = info["renderer"]
        low = renderer.lower()
        if "swiftshader" in low or "llvmpipe" in low:
            print(f"[中止] 拿到的是软渲染（{renderer}）——绝不能继续，会烧满 CPU 卡死整机。")
            print("       检查：是否误传 --disable-gpu / --use-angle=swiftshader；GPU 是否被独占。")
            return 2
        print(f"[自检] WebGL 渲染器：{renderer}")

        # ── 真实时间拍点（勿改成虚拟时间）──
        pg.goto(url, wait_until="load")
        elapsed = 0.0
        for t in beats:
            pg.wait_for_timeout(int((t - elapsed) * 1000))
            elapsed = t
            f = outdir / f"t{int(t):02d}.png"
            pg.screenshot(path=str(f))
            print(f"  t={t:g}s -> {f}")

        # ── 运行质量（照 llm_test 的 A 层检查）──
        print(f"[质量] pageerror={len(page_errors)} console.error={len(console_errors)} "
              f"requestfailed={len(failed_reqs)}")
        for tag, items in (("pageerror", page_errors), ("console.error", console_errors),
                           ("requestfailed", failed_reqs)):
            for x in items[:5]:
                print(f"  [{tag}] {x}")

        ok = not (page_errors or console_errors)
        print(f"[结果] {'通过' if ok else '有问题'} · 出图 {len(beats)} 张 → {outdir}")
        return 0 if ok else 1
    finally:
        # 有头窗口必须关干净，否则留下孤儿 Chrome（详见 CITY.md「浏览器卫生」）
        try:
            browser.close()
        except Exception as e:   # noqa: BLE001
            print(f"[警告] browser.close() 失败：{e}")
            print("       兜底硬杀（只杀 Playwright 自带 chromium，不碰你日常的 Chrome）：")
            print("       powershell \"Get-Process chrome | "
                  "Where-Object { $_.Path -like '*ms-playwright*' } | Stop-Process -Force\"")


def main():
    url, beats, out, w, h = parse_args()
    outdir = Path(out).resolve()
    outdir.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        return run_session(p, url, beats, outdir, w, h)


if __name__ == "__main__":
    sys.exit(main())

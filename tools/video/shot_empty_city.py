# -*- coding: utf-8 -*-
"""shot-empty-city · 空城截图（隐藏全部建筑，只留路网/草皮/地块）

用途：模都视频 s06「我先设计了一张城市地图」——配「还没有建筑的空城」
截图（2026-10-03 城主裁决），比建成城市更贴合「设计地图」语义。

机制：有头 Playwright（铁律 docs/shot-web.md）打开全城页，等建筑挂载后
经 window.__city.manager.groups（building_id → Group，loader.ts）整体
visible=false——草皮瓦/道路在 scene.ts 是独立合并 mesh，不受影响，即得
空城。运行时注入、不改产品代码。HUD/标签层同 web-gif 藏法。

用法：python tools/video/shot_empty_city.py [--out <png>] [--pos x,y,z --target x,y,z]
产物缺省落 node_modules/.cache/llm-city/video01/empty_city.png
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")   # Windows cp936 防线

from playwright.sync_api import sync_playwright   # noqa: E402

REPO = Path(__file__).resolve().parents[2]

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

EMPTY_JS = """
() => {
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = 'none';
  const city = window.__city;
  if (!city) return { ok: false, reason: 'window.__city 不存在' };
  const groups = city.manager.groups;
  let n = 0;
  for (const g of groups.values()) { g.visible = false; n++; }
  return { ok: true, hidden: n };
}
"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:5174/llm-city/")
    ap.add_argument("--out", default=str(REPO / "node_modules/.cache/llm-city/video01/empty_city.png"))
    ap.add_argument("--pos", default="300,230,300", help="相机位置 x,y,z")
    ap.add_argument("--target", default="0,0,0", help="注视点 x,y,z")
    ap.add_argument("--wait", type=float, default=4.0, help="挂载等待秒")
    a = ap.parse_args()
    pos = [float(v) for v in a.pos.split(",")]
    tgt = [float(v) for v in a.target.split(",")]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)   # 铁律：有头
        try:
            ctx = browser.new_context(viewport={"width": 1920, "height": 1080})
            page = ctx.new_page()
            cdp = ctx.new_cdp_session(page)
            page.goto("about:blank")
            info = page.evaluate(RENDERER_JS)
            low = str(info.get("renderer", "")).lower()
            if not info.get("ok") or "swiftshader" in low or "llvmpipe" in low:
                print(f"[中止] 软渲染风险（{info.get('renderer', info.get('reason'))}）")
                return 2
            print(f"[自检] WebGL 渲染器：{info['renderer']}", flush=True)
            page.goto(a.url, wait_until="load")
            page.wait_for_timeout(int(a.wait * 1000))   # 等建筑 chunk 挂载
            r = page.evaluate(EMPTY_JS)
            if not r.get("ok"):
                print(f"[失败] {r.get('reason')}")
                return 1
            print(f"[空城] 隐藏建筑组 {r['hidden']} 个", flush=True)
            page.evaluate(
                """([pos, tgt]) => {
                  const c = window.__city;
                  c.camera.position.set(pos[0], pos[1], pos[2]);
                  c.controls.target.set(tgt[0], tgt[1], tgt[2]);
                  c.controls.update();
                }""",
                [pos, tgt])
            page.wait_for_timeout(1200)   # 等一帧渲染 + 合成器提交
            out = Path(a.out)
            out.parent.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(out))
            print(f"[完成] {out}", flush=True)
        finally:
            try:
                browser.close()
            except Exception as e:   # noqa: BLE001
                print(f"[警告] browser.close() 失败：{e}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

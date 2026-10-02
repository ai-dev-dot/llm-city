# -*- coding: utf-8 -*-
"""web-shot · 网页实景静态截图（有头 Playwright，机位自动推导）——web-gif 的静态姊妹工具

与 web-gif.py 同一通道与铁律（有头、渲染器自检、藏 HUD、L 键关标签层）。
机位按「已挂载建筑实际包围盒」推导，等待挂载稳定后再拍（chunk 异步加载，
固定等待不可靠——实测同流程一次 W=308 一次 W=204 的漂移）。

用法：
  python tools/shot-web/web-shot.py --city                    # 全城高空全景
  python tools/shot-web/web-shot.py --block D4 --view aerial  # 街区斜俯瞰
  python tools/shot-web/web-shot.py --block D4 --view closeup # 街区地标近景（特写）

依赖：本机系统级 Python3.13 + Playwright + Pillow（同 docs/shot-web.md 声明）。
"""
import argparse
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")   # Windows cp936 防线（本仓 Python 工具惯例）

from playwright.sync_api import sync_playwright   # noqa: E402

from PIL import Image, ImageDraw, ImageFont   # noqa: E402

_LANCZOS = getattr(getattr(Image, "Resampling", Image), "LANCZOS")
FONT_PATH = r"C:\Windows\Fonts\msyhbd.ttc"

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

# 挂载建筑包围盒探测（只算建筑组；groups 是 Map，遍历用 for..of）
CALC_JS = """
() => {
  const city = window.__city;
  if (!city) return null;
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity, maxY = -Infinity, n = 0;
  for (const [, g] of city.manager.groups) {
    if (!g || !g.visible) continue;
    let bMin = [Infinity, Infinity, Infinity], bMax = [-Infinity, -Infinity, -Infinity];
    g.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox, m = o.matrixWorld;
      const corner = (x, y, z) => {
        const wx = m.elements[0]*x + m.elements[4]*y + m.elements[8]*z + m.elements[12];
        const wy = m.elements[1]*x + m.elements[5]*y + m.elements[9]*z + m.elements[13];
        const wz = m.elements[2]*x + m.elements[6]*y + m.elements[10]*z + m.elements[14];
        if (wx < bMin[0]) bMin[0] = wx; if (wx > bMax[0]) bMax[0] = wx;
        if (wy > bMax[1]) bMax[1] = wy;
        if (wz < bMin[2]) bMin[2] = wz; if (wz > bMax[2]) bMax[2] = wz;
      };
      corner(bb.min.x, bb.min.y, bb.min.z); corner(bb.max.x, bb.max.y, bb.max.z);
      corner(bb.min.x, bb.min.y, bb.max.z); corner(bb.max.x, bb.min.y, bb.min.z);
    });
    if (bMin[0] === Infinity) continue;
    n++;
    minX = Math.min(minX, bMin[0]); minZ = Math.min(minZ, bMin[2]);
    maxX = Math.max(maxX, bMax[0]); maxY = Math.max(maxY, bMax[1]); maxZ = Math.max(maxZ, bMax[2]);
  }
  if (!n) return null;
  return { n, W: maxX - minX, D: maxZ - minZ, maxY, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2 };
}
"""

# 等挂载稳定：包围盒签名连续 2s 不变（chunk 异步挂载，固定等待不可靠）
STABLE_JS = """
() => {
  const r = window.__bboxProbe && window.__bboxProbe();
  if (!r) return false;
  const key = r.n + ':' + r.W.toFixed(0) + ':' + r.D.toFixed(0) + ':' + r.maxY.toFixed(0);
  if (key === window.__lastKey) window.__stableMs = (window.__stableMs || 0) + 400;
  else { window.__stableMs = 0; window.__lastKey = key; }
  return window.__stableMs >= 2000;
}
"""

# 摆机位：aerial 斜俯瞰——距离数值求解（对包围盒 9 检查点做相机空间投影试算，
# 取全城入画且留 8% 边距的最小距离），适配任意视口比例与街区体量
POSE_JS = """
(view) => {
  const r = window.__bboxProbe();
  const city = window.__city;
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = 'none';
  const H = r.maxY, W = r.W, D = r.D;
  const cx = r.cx, cz = r.cz;
  const cam = city.camera;
  const tanV = Math.tan((cam.fov / 2) * Math.PI / 180);
  const tanH = tanV * cam.aspect;
  const dir = [0.55, 1.05, 0.75];
  const dl = Math.hypot(dir[0], dir[1], dir[2]);
  const dirN = [dir[0] / dl, dir[1] / dl, dir[2] / dl];
  // 检查点：4 底角 + 顶部中心（塔）。不含包围盒顶角——那是空中，会把距离虚撑远
  const pts = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    pts.push([cx + sx * W / 2, 0, cz + sz * D / 2]);
  }
  pts.push([cx, H, cz]);
  const projOk = (eye, target) => {
    const f = [target[0] - eye[0], target[1] - eye[1], target[2] - eye[2]];
    const fl = Math.hypot(f[0], f[1], f[2]);
    const fwd = [f[0] / fl, f[1] / fl, f[2] / fl];
    let up = [0, 1, 0];
    if (Math.abs(fwd[0] * up[0] + fwd[1] * up[1] + fwd[2] * up[2]) > 0.999) up = [0, 0, 1];
    const right = [up[1] * fwd[2] - up[2] * fwd[1], up[2] * fwd[0] - up[0] * fwd[2], up[0] * fwd[1] - up[1] * fwd[0]];
    const rl = Math.hypot(right[0], right[1], right[2]);
    right[0] /= rl; right[1] /= rl; right[2] /= rl;
    const up2 = [fwd[1] * right[2] - fwd[2] * right[1], fwd[2] * right[0] - fwd[0] * right[2], fwd[0] * right[1] - fwd[1] * right[0]];
    for (const pt of pts) {
      const dx = pt[0] - eye[0], dy = pt[1] - eye[1], dz = pt[2] - eye[2];
      const cz2 = fwd[0] * dx + fwd[1] * dy + fwd[2] * dz;
      if (cz2 < 1) return false;
      const ndcX = (right[0] * dx + right[1] * dy + right[2] * dz) / cz2 / tanH;
      const ndcY = (up2[0] * dx + up2[1] * dy + up2[2] * dz) / cz2 / tanV;
      if (Math.abs(ndcX) > 0.85 || Math.abs(ndcY) > 0.83) return false;
    }
    return true;
  };
  const target = [cx, H * 0.35, cz];
  let dist = 2000;
  if (view === 'aerial') {
    for (let d = 120; d <= 2000; d += 4) {
      const eye = [cx + dirN[0] * d, dirN[1] * d, cz + dirN[2] * d];
      if (projOk(eye, target)) { dist = d; break; }
    }
  } else {
    // closeup：对角方位、半楼高相机——找「全街区入画」的最小距离（楼群占画面更大）
    const t2 = [cx, H * 0.4, cz];
    for (let d = 40; d <= 2000; d += 4) {
      const eye = [cx + d * 0.75, H * 0.5, cz + d * 0.75];
      if (projOk(eye, t2)) { dist = d; target[1] = t2[1]; break; }
    }
  }
  city.controls.target.set(target[0], target[1], target[2]);
  city.camera.position.set(cx + dirN[0] * dist, dirN[1] * dist, cz + dirN[2] * dist);
  city.camera.updateProjectionMatrix();
  city.controls.update();
  return { view, W: W.toFixed(0), H: H.toFixed(0), D: D.toFixed(0), dist: dist.toFixed(0) };
}
"""


def draw_watermark(img, lines):
    """右上角水印：白字黑描边（与 web-gif 同款），字号随帧宽等比。"""
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


def main():
    ap = argparse.ArgumentParser(description="网页实景静态截图（有头浏览器）")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--block", help="街区 id，如 D4")
    g.add_argument("--city", action="store_true", help="全城")
    ap.add_argument("--view", default="aerial", choices=("aerial", "closeup"), help="机位（缺省 aerial）")
    ap.add_argument("--out", required=True, help="输出 PNG 路径")
    ap.add_argument("--url-base", default="http://localhost:5174/llm-city")
    ap.add_argument("--label", default=None, help="水印文案（缺省：街区取页面选择器原文去编号；全城 = 城名）")
    a = ap.parse_args()

    block = None if a.city else a.block.upper()
    url = f"{a.url_base}/" if a.city else f"{a.url_base}/?block={block}"
    out_path = Path(a.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)   # 铁律：有头
        try:
            ctx = browser.new_context(viewport={"width": 1152, "height": 1152})   # 方形：匹配参考构图，正文竖图友好
            page = ctx.new_page()
            page.goto("about:blank")
            info = page.evaluate(RENDERER_JS)
            low = str(info.get("renderer", "")).lower()
            if not info.get("ok") or "swiftshader" in low or "llvmpipe" in low:
                print(f"[中止] 软渲染风险（{info.get('renderer', info.get('reason'))}）——绝不继续")
                return 2
            print(f"[自检] WebGL 渲染器：{info['renderer']}", flush=True)

            page.goto(url, wait_until="load")
            page.evaluate(f"window.__bboxProbe = {CALC_JS}")
            page.wait_for_function(STABLE_JS, timeout=60_000)
            pose = page.evaluate(POSE_JS, a.view)
            print(f"[机位] {pose}", flush=True)
            page.keyboard.press("l")   # 页面原生开关：关标签层
            page.wait_for_timeout(800)   # 等合成器提交（藏 HUD + 关标签 + 新机位）

            page.screenshot(path=str(out_path))
            img = Image.open(out_path).convert("RGB")
            if a.label is not None:
                wm = [a.label]
            elif a.city:
                wm = ["模都 llm-city"]
            else:
                # 水印文案取页面选择器原文，去「（N 栋）」与街区编号前缀，拆「·」两侧
                sel = page.evaluate("""() => {
                  const raw = document.querySelector('#hud select')?.selectedOptions?.[0]?.textContent || '';
                  return raw.replace(/\\s*[（(]\\d+\\s*栋[）)]\\s*$/, '').replace(/^\\s*[A-I]\\d+\\s*/, '')
                            .split('·').map(s => s.trim()).filter(Boolean);
                }""")
                wm = sel or [block]
            img = draw_watermark(img, wm)
            img.save(out_path)
            print(f"[完成] {out_path}（水印：{' / '.join(wm)}）", flush=True)
        finally:
            try:
                browser.close()
            except Exception as e:   # noqa: BLE001
                print(f"[警告] browser.close() 失败：{e}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

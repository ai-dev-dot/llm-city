# -*- coding: utf-8 -*-
"""make-layouts · 视频特殊底图预拼（production-script.md 的剪辑器排版件）

三张 1920×1080 底图（still 镜直接整幅引用）：
  layout_grid9.png  九宫格 3×3（段06/18）：出场顺序非排名，格内等比完整显示
                    不裁塔顶，每格只写模型名（2026-10-03 城主脚本口径）
  layout_quad.png   2×2 过渡（段10）：D4/F4/E4/E5，只显示街区名
  layout_e6e3.png   E6+E3 左右并排（段15），无文字

底色 = video_maker 静图镜同款深底渐变（上浅下深），字体微软雅黑 Bold。
素材 = articles/01-which-llm-builds-city/shots/*.png（无铭牌网页截图）。

用法：python tools/video/make_layouts.py [--work <视频工作目录>]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")   # Windows cp936 防线

from PIL import Image, ImageDraw, ImageFont   # noqa: E402

REPO = Path(__file__).resolve().parents[2]
SHOTS = REPO / "articles/01-which-llm-builds-city/shots"
FONT_PATH = r"C:\Windows\Fonts\msyhbd.ttc"
CANVAS = (1920, 1080)
BG_TOP, BG_BOT = (24, 24, 32), (9, 9, 13)    # 与 video_maker.dark_bg 同款

# 模型名 = production-script.md 信息条原文（首次出场完整版本）
MODEL_NAMES = {
    "G5": "DeepSeek V4 Pro",
    "D5": "Space Bunny",
    "E7": "GLM 5.3 Flash",
    "D4": "MiMo V2.6 Flash",
    "F4": "豆包 Seed 2.1 Pro",
    "E4": "Qwen 3.8 Flash",
    "E5": "GLM 5.3",
    "E6": "DeepSeek V4.1 Flash",
    "E3": "LongCat 2.5 Preview",
}
BLOCK_NAMES = {   # 段10 只显示街区名（页面街区选择器原文口径）
    "D4": "西岸商业街区",
    "F4": "灯花栖居街区",
    "E4": "镜湖中央公园",
    "E5": "原点街区",
}


def dark_bg(size=CANVAS) -> Image.Image:
    w, h = size
    col = Image.new("RGB", (1, h))
    for y in range(h):
        t = y / max(h - 1, 1)
        col.putpixel((0, y), tuple(round(a + (b - a) * t) for a, b in zip(BG_TOP, BG_BOT)))
    return col.resize((w, h))


def contain(src: str, box_w: int, box_h: int) -> Image.Image:
    im = Image.open(SHOTS / f"{src}.png").convert("RGB")
    scale = min(box_w / im.width, box_h / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    return im


def paste_center(base: Image.Image, im: Image.Image, cx: int, cy: int) -> None:
    base.paste(im, (cx - im.width // 2, cy - im.height // 2))


def draw_label(d: ImageDraw.ImageDraw, text: str, cx: int, y: int, size: int) -> None:
    font = ImageFont.truetype(FONT_PATH, size)
    tw = d.textlength(text, font=font)
    d.text((cx - tw / 2, y), text, font=font, fill=(255, 255, 255, 255))


def grid9() -> Path:
    """3×3 出场序九宫格：格内图 contain + 底部模型名。"""
    order = ["G5", "D5", "E7", "D4", "F4", "E4", "E5", "E6", "E3"]   # 出场顺序，非排名
    margin, gap, name_h = 28, 14, 56
    cw = (CANVAS[0] - 2 * margin - 2 * gap) // 3
    ch = (CANVAS[1] - 2 * margin - 2 * gap) // 3
    img = dark_bg()
    d = ImageDraw.Draw(img)
    for i, key in enumerate(order):
        x0 = margin + (i % 3) * (cw + gap)
        y0 = margin + (i // 3) * (ch + gap)
        im = contain(key, cw, ch - name_h)
        paste_center(img, im, x0 + cw // 2, y0 + (ch - name_h) // 2)
        draw_label(d, MODEL_NAMES[key], x0 + cw // 2, y0 + ch - name_h + 10, 30)
    return img


def quad() -> Image.Image:
    """2×2 过渡：D4/F4/E4/E5，只写街区名。"""
    order = ["D4", "F4", "E4", "E5"]
    margin, gap, name_h = 28, 14, 50
    cw = (CANVAS[0] - 2 * margin - gap) // 2
    ch = (CANVAS[1] - 2 * margin - gap) // 2
    img = dark_bg()
    d = ImageDraw.Draw(img)
    for i, key in enumerate(order):
        x0 = margin + (i % 2) * (cw + gap)
        y0 = margin + (i // 2) * (ch + gap)
        im = contain(key, cw, ch - name_h)
        paste_center(img, im, x0 + cw // 2, y0 + (ch - name_h) // 2)
        draw_label(d, BLOCK_NAMES[key], x0 + cw // 2, y0 + ch - name_h + 6, 36)
    return img


def duo_e6e3() -> Image.Image:
    """E6 + E3 左右并排，无文字（强调字由 overlay 层做）。"""
    margin, gap = 28, 16
    cw = (CANVAS[0] - 2 * margin - gap) // 2
    ch = CANVAS[1] - 2 * margin
    img = dark_bg()
    for i, key in enumerate(["E6", "E3"]):
        im = contain(key, cw, ch)
        paste_center(img, im, margin + i * (cw + gap) + cw // 2, CANVAS[1] // 2)
    return img


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--work", default=str(REPO / "node_modules/.cache/llm-city/video01"))
    a = ap.parse_args()
    out = Path(a.work).resolve() / "layouts"
    out.mkdir(parents=True, exist_ok=True)
    jobs = {"layout_grid9.png": grid9(), "layout_quad.png": quad(),
            "layout_e6e3.png": duo_e6e3()}
    for name, im in jobs.items():
        im.save(out / name)
        print(f"[layout] {out / name}（{im.width}×{im.height}）")
    return 0


if __name__ == "__main__":
    sys.exit(main())

# -*- coding: utf-8 -*-
"""watermark · 截图加水印（右上角，白字黑描边，与 web-gif 同款）——纯本地，不开浏览器

水印文案自动解析：
  --block D4 → 「街区名 · 模型显示名」（街区名取 blockplans/<D4>.md 标题中文段，
                模型显示名 = models.json aliases 首项；无编号前缀——2026-10-02 城主裁决）
  --city     → 「模都 llm-city」
  --text X   → 自定义文案

用法：
  python tools/shot-web/watermark.py --block D4 图1.png [图2.png ...]
  python tools/shot-web/watermark.py --city 全城.png
  选项：--overwrite 覆盖原图（缺省写 <名>.wm.png 不动原图）
"""
import argparse
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")   # Windows cp936 防线（本仓 Python 工具惯例）

from PIL import Image, ImageDraw, ImageFont   # noqa: E402

FONT_PATH = r"C:\Windows\Fonts\msyhbd.ttc"
REPO = Path(__file__).resolve().parents[2]


def display_name(model_id: str) -> str:
    """models.json 显示名：aliases 里第一个含大写的别名（跳过小写/free 变体），回退 id。"""
    models = json.loads((REPO / "models.json").read_text(encoding="utf-8"))["models"]
    hit = next((m for m in models if m["id"] == model_id), None)
    if hit:
        return next((a for a in hit.get("aliases", []) if a != a.lower()), hit["id"])
    return model_id


def block_label(block: str) -> str:
    """街区水印文案：blockplans 标题中文段 + models.json 显示名，拼「街区名 · 模型名」。"""
    md_path = REPO / "cities" / "c1" / "blockplans" / f"{block}.md"
    md = md_path.read_text(encoding="utf-8")
    title = next((l for l in md.splitlines() if l.startswith("# ")), "")
    zh = re.search(r"([\u4e00-\u9fff「」]+)", title.split("·", 1)[1] if "·" in title else title)
    name = zh.group(1) if zh else block
    mid = re.search(r"归属模型\*\*：\s*([a-z0-9.\-]+)", md)
    display = display_name(mid.group(1)) if mid else ""
    return f"{name} · {display}" if display else name


def draw_watermark(img: Image.Image, lines: list[str]) -> Image.Image:
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
    ap = argparse.ArgumentParser(description="截图加水印（右上角白字黑描边）")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--block", help="街区 id（水印 = 街区名 · 模型名，自动解析）")
    g.add_argument("--city", action="store_true", help="全城（水印 = 模都 llm-city）")
    g.add_argument("--text", help="自定义水印文案")
    g.add_argument("--root", help="批量模式：目录下每个街区子目录（目录名 = 街区 id）内的图加对应水印，根目录散图加全城水印")
    ap.add_argument("images", nargs="*", help="截图路径（可多张；--root 模式不用）")
    ap.add_argument("--overwrite", action="store_true", help="覆盖原图（缺省写 <名>.wm.png）")
    a = ap.parse_args()

    jobs: list[tuple[Path, list[str]]] = []   # (图片, 水印行)
    if a.root:
        root = Path(a.root)
        for p in sorted(root.rglob("*.png")):
            if p.stem.endswith(".wm"):
                continue   # 跳过已加水印的产物
            if p.parent == root:
                # 根目录散图：文件名是街区 id（如 D4.png）→ 街区水印；否则全城水印
                bid = p.stem.upper()
                jobs.append((p, [block_label(bid)] if re.fullmatch(r"[A-I]\d+", bid) else ["模都 llm-city"]))
            else:
                jobs.append((p, [block_label(p.parent.name.upper())]))
    else:
        if a.city:
            lines = ["模都 llm-city"]
        elif a.text is not None:
            lines = [a.text]
        else:
            lines = [block_label(a.block.upper())]
        print(f"[水印] {' / '.join(lines)}")
        for p in a.images:
            jobs.append((Path(p), lines))

    if not jobs:
        print("没有需要处理的 png")
        return 0
    for src, lines in jobs:
        img = Image.open(src).convert("RGB")
        img = draw_watermark(img, lines)
        dst = src if a.overwrite else src.with_name(f"{src.stem}.wm.png")
        img.save(dst)
        print(f"  {src.relative_to(REPO) if src.is_relative_to(REPO) else src} -> {dst.name}  [{' / '.join(lines)}]")
    print(f"共 {len(jobs)} 张")
    return 0


if __name__ == "__main__":
    sys.exit(main())

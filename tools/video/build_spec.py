# -*- coding: utf-8 -*-
"""build-spec · 「模都第一期」横屏视频 spec 生成器（单源）

台词单源 = 同目录 voiceover-v1.md 第三稿（城主制作基准，逐字拆镜不改一字）；
分镜与素材口径 = 同目录 production-script.md（18 段时间轴）。
本文件把两者编成 llm_test tools/video_maker.py 的 spec（38 镜）并落
articles/01-which-llm-builds-city/video/spec.json（入库，门槛位回填继承）。

三种叠层：
  info_*    左上信息条（HTML→cards 工序渲 PNG）：模型名/街区名两行
  hook_*    片名/标签/流程卡/强调字（HTML，透明底大字，pos/window 控位控时）
  anno_*    部位标注层（PIL 直画 1920×1080 透明 PNG，落 work/cards/overlays/）：
            框线/箭头坐标 = 静图 contain 到 16:9 画布的换算值（目检 2026-10-03）

底片 = node_modules/.cache/llm-city/video01/clips（2026-10-06 城主裁决起一律
DDA 满屏直采：dda_capture.py --spec 按 spec.clips 段采，prep_clips.py 只做
契约闸门；web-gif 帧缓存通道对视频底片退役）；静图 =
articles/01-which-llm-builds-city/shots（无铭牌版）；三张预拼底图 =
work/layouts（make_layouts.py）。

用法：python tools/video/build_spec.py [--force]   # --force 不继承门槛位
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")   # Windows cp936 防线

from PIL import Image, ImageDraw, ImageFont   # noqa: E402

REPO = Path(__file__).resolve().parents[2]
VIDEO_DIR = REPO / "articles/01-which-llm-builds-city/video"
WORK = REPO / "node_modules/.cache/llm-city/video01"
SHOTS_DIR = REPO / "articles/01-which-llm-builds-city/shots"
SPEC_PATH = VIDEO_DIR / "spec.json"

ACCENT = "#c2410c"
CANVAS = (1920, 1080)
FONT_PATH = r"C:\Windows\Fonts\msyhbd.ttc"

# 静图 contain 到画布的换算系数（scale, offset_x）——标注坐标换算用
_FIT = {
    "G5": (1.895, 476), "D5": (1.717, 505), "E7": (1.878, 410),
    "D4": (1.714, 530), "F4": (1.898, 437), "E4": (2.395, 218),
    "E5": (2.185, 462), "E6": (2.432, 224), "E3": (1.971, 472),
}

YELLOW = (250, 204, 21, 255)   # 标注层框线/箭头（facc15）


# ---------------------------------------------------------------- 标注层

def _anno_canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def _box(d: ImageDraw.ImageDraw, x0, y0, x1, y1, label=None):
    d.rounded_rectangle([x0, y0, x1, y1], radius=18, outline=YELLOW, width=6)
    if label:
        f = ImageFont.truetype(FONT_PATH, 34)
        tw = d.textlength(label, font=f)
        lx, ly = x0, y0 - 52 if y0 >= 60 else y1 + 12
        d.rectangle([lx, ly, lx + tw + 24, ly + 46], fill=(0, 0, 0, 200))
        d.text((lx + 12, ly + 4), label, font=f, fill=(255, 255, 255, 255))


def _arrow(d: ImageDraw.ImageDraw, x0, y0, x1, y1, label=None):
    d.line([x0, y0, x1, y1], fill=YELLOW, width=8)
    import math
    ang = math.atan2(y1 - y0, x1 - x0)
    L = 34
    wing = 16
    tip1 = (x1 - L * math.cos(ang) + wing * math.sin(ang),
            y1 - L * math.sin(ang) - wing * math.cos(ang))
    tip2 = (x1 - L * math.cos(ang) - wing * math.sin(ang),
            y1 - L * math.sin(ang) + wing * math.cos(ang))
    d.polygon([ (x1, y1), tip1, tip2 ], fill=YELLOW)
    if label:
        f = ImageFont.truetype(FONT_PATH, 44)
        tw = d.textlength(label, font=f)
        lx, ly = x0 + 18, y0 - 60
        d.rectangle([lx, ly, lx + tw + 24, ly + 56], fill=(0, 0, 0, 200))
        d.text((lx + 12, ly + 4), label, font=f, fill=(255, 255, 255, 255))


def build_annotations() -> dict[str, Image.Image]:
    """八处部位标注层（整画布透明 PNG，坐标 = 静图 contain 换算值）。"""
    out = {}

    img, d = _anno_canvas()          # G5 s15：竖条与螺旋重叠处
    _box(d, 846, 265, 1045, 644)
    out["anno_g5_helix"] = img

    img, d = _anno_canvas()          # D5 s17：中层绿化
    _box(d, 763, 172, 1072, 550)
    out["anno_d5_green"] = img
    img, d = _anno_canvas()          # D5 s17：楼下花园
    _box(d, 608, 687, 1106, 962)
    out["anno_d5_garden"] = img

    img, d = _anno_canvas()          # E7 s20：玻璃拱顶
    _box(d, 880, 507, 1387, 883)
    out["anno_e7_dome"] = img
    img, d = _anno_canvas()          # E7 s20：轨道列车
    _box(d, 466, 676, 880, 939)
    out["anno_e7_track"] = img

    img, d = _anno_canvas()          # D4 s24：临街店面与窗框
    _box(d, 736, 668, 1250, 977)
    out["anno_d4_shop"] = img

    img, d = _anno_canvas()          # F4 s26：楼顶大灯
    _arrow(d, 1160, 230, 1010, 135)
    out["anno_f4_lamp"] = img

    img, d = _anno_canvas()          # E4 s29：温室后方的小湖
    _arrow(d, 1230, 320, 1050, 445, label="在这里")
    out["anno_e4_lake"] = img

    img, d = _anno_canvas()          # E6 s32/33：剧院大盒子+高柱
    _box(d, 516, 134, 1039, 754)
    out["anno_e6_theatre"] = img
    img, d = _anno_canvas()          # E6 s34：图书馆厚方块
    _box(d, 1124, 499, 1598, 936)
    out["anno_e6_lib"] = img

    img, d = _anno_canvas()          # E3 s36：大块白墙
    _box(d, 768, 118, 1103, 650)
    out["anno_e3_wall"] = img
    img, d = _anno_canvas()          # E3 s37：体育馆网格穹顶
    _box(d, 551, 552, 906, 848)
    out["anno_e3_dome"] = img
    return out


# ---------------------------------------------------------------- HTML 叠层

_INFO_STYLE = """
<div class="card">
  <div class="model">{model}</div>
  <div class="block">{block}</div>{extra}
</div>"""


def info_card(model: str, block: str, extra: str = "") -> str:
    ex = f'\n  <div class="extra">{extra}</div>' if extra else ""
    return _INFO_STYLE.format(model=model, block=block, extra=ex)


def hook_card(text: str, accent_words: list[str], size: int = 58) -> str:
    """强调字：白字黑描边，accent 词着色。"""
    for w in accent_words:
        text = text.replace(w, f'<span class="a">{w}</span>')
    return f'<div class="hook" style="font-size:{size}px">{text}</div>'


# 叠层显示宽度（CSS px）：cards 渲染是 2x PNG，assemble 叠层必须显式回
# 1x 宽，否则按原尺寸叠 = 双倍大（top_center 居中看不出、右上定位出画，
# 2026-10-03 草稿实测 s26 裁边）
OVERLAY_WIDTH: dict[str, int] = {}


_OVERLAY_CSS = """
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family:"Microsoft YaHei"; background:transparent; }}
.card {{ display:inline-block; padding:18px 26px 14px; border-radius:16px;
  background:rgba(15,15,20,0.78); border:1px solid rgba(255,255,255,0.14);
  box-shadow:0 8px 24px rgba(0,0,0,0.4); }}
.model {{ font-size:30px; font-weight:700; color:#fff; }}
.block {{ font-size:19px; color:rgba(255,255,255,0.72); margin-top:6px; }}
.extra {{ font-size:14px; color:rgba(255,255,255,0.55); margin-top:6px; }}
.hook {{ font-weight:700; color:#fff; white-space:nowrap;
  text-shadow:0 0 4px #000, 2px 2px 0 #000, -2px 2px 0 #000, 2px -2px 0 #000,
  -2px -2px 0 #000, 0 4px 14px rgba(0,0,0,0.6); }}
.hook .a {{ color:{accent}; }}
.title {{ font-weight:700; color:#fff; text-shadow:0 0 6px #000,
  4px 4px 0 #000, -4px 4px 0 #000, 4px -4px 0 #000, -4px -4px 0 #000; }}
.flow {{ display:inline-block; padding:26px 34px; border-radius:20px;
  background:rgba(15,15,20,0.82); border:1px solid rgba(255,255,255,0.14); }}
.flow .step {{ font-size:40px; font-weight:700; color:#fff; padding:12px 0; }}
.flow .step b {{ color:{accent}; margin-right:14px; }}
.mini {{ display:inline-block; padding:20px 24px; border-radius:16px;
  background:rgba(15,15,20,0.82); border:1px solid rgba(255,255,255,0.14); }}
.mini .cap {{ font-size:15px; color:rgba(255,255,255,0.55); margin-bottom:12px; }}
.mini .cell {{ font-size:26px; font-weight:600; color:#fff; padding:10px 14px;
  border:1px solid rgba(255,255,255,0.2); border-radius:10px; margin-top:8px;
  text-align:center; }}
.tag {{ display:inline-block; padding:8px 22px; border-radius:999px;
  background:rgba(15,15,20,0.78); border:1px solid rgba(255,255,255,0.2);
  font-size:30px; font-weight:700; color:#fff; }}
"""


def ov_overlays() -> list[dict]:
    """spec.overlays：HTML 叠层清单（cards 工序渲染）。"""
    o: list[dict] = []

    def add(name, html, width):
        OVERLAY_WIDTH[name] = width
        o.append({"name": name,
                  "html": f'<style>{_OVERLAY_CSS.format(accent=ACCENT)}</style>' + html,
                  "width": width})

    # 信息条 ×9（production-script.md 信息条原文）
    infos = {
        "g5": ("DeepSeek V4 Pro", "求索智谷街区", ""),
        "d5": ("Space Bunny", "模都医枢", "OpenCode 上的匿名模型"),
        "e7": ("智谱 GLM 5.3 Flash", "中央车站街区", ""),
        "d4": ("小米 MiMo V2.6 Flash", "西岸商业街区", ""),
        "f4": ("豆包 Seed 2.1 Pro", "灯花栖居街区", ""),
        "e4": ("通义 Qwen 3.8 Flash", "镜湖中央公园", ""),
        "e5": ("智谱 GLM 5.3", "原点街区", ""),
        "e6": ("DeepSeek V4.1 Flash", "回声街区", ""),
        "e3": ("美团 LongCat 2.5 Preview", "博览中心", ""),
    }
    for key, (m, b, ex) in infos.items():
        add(f"info_{key}", info_card(m, b, ex), 430)

    # 片名（s05）
    add("title_card", '<div class="title" style="font-size:170px">模都</div>', 500)
    # 钩子/强调字
    add("hook_open", hook_card("大模型自己盖楼？", ["大模型"]), 640)
    add("hook_quota", hook_card("额度用不完", ["额度用不完"]), 460)
    add("hook_build", hook_card("那就盖座城", ["盖座城"]), 460)
    add("hook_flow", hook_card("模型写代码，我验收", ["我验收"]), 700)
    add("hook_nine", hook_card("九个街区，看看成品", ["九个街区"]), 700)
    add("hook_remember", hook_card("好记", ["好记"]), 300)
    add("hook_messy", hook_card("近看有点乱", ["有点乱"]), 500)
    add("hook_comfy", hook_card("看着舒服", ["舒服"]), 400)
    add("hook_station", hook_card("一眼认出是车站", ["一眼认出"]), 640)
    add("hook_detail", hook_card("细节做得认真", ["认真"]), 560)
    add("hook_lamp", hook_card("这盏灯，太抢戏", ["太抢戏"]), 560)
    add("hook_lake", hook_card("湖呢？", ["湖呢？"], 72), 300)
    add("hook_stable", hook_card("稳当，但还不够惊艳", ["还不够惊艳"]), 760)
    add("hook_rework2", hook_card("这两个，我想让它们改改", ["改改"]), 760)
    add("hook_topheavy", hook_card("头重脚轻", ["头重脚轻"], 68), 420)
    add("hook_redo", hook_card("最想让它返工", ["最想"]), 560)
    add("hook_ask", hook_card("你最喜欢哪个？评论区聊聊", ["最喜欢哪个", "评论区"], 62), 900)
    # 流程卡（s10）
    flow = ('<div class="flow">'
            '<div class="step"><b>1</b>模型提案</div>'
            '<div class="step"><b>2</b>我点头</div>'
            '<div class="step"><b>3</b>模型写代码</div>'
            '<div class="step"><b>4</b>我验收</div>'
            '</div>')
    add("flow_card", flow, 460)
    # 分地示意小卡（s06，脚本口径：三格 + 角标「分地示意」）
    mini = ('<div class="mini"><div class="cap">分地示意</div>'
            '<div class="cell">DeepSeek V4 Pro</div>'
            '<div class="cell">Space Bunny</div>'
            '<div class="cell">GLM 5.3 Flash</div></div>')
    add("mini_grid", mini, 360)
    # 玩法标签（s07/08/09 统一右上）
    for label in ("住宅", "车站", "公园"):
        add(f"tag_{label}", f'<div class="tag">{label}</div>', 150)
    return o


# ---------------------------------------------------------------- 镜表

def S(id, narration, *, clip=None, start=0.0, still=None, dark=False,
      still_fit=None, infos=(), hooks=(), annos=(), window_hooks=(),
      instruction=None, rate=None, tail=None):
    """单镜构造：bg 视频镜 / still 静图镜 / dark 纯底镜。instruction/rate/tail =
    镜级语气指令/语速/镜尾静默覆盖（volc 语速同刻度整数，10=+10%、0=正常、
    负值更慢；指纹含 rate/instruction → 自动单镜重采；tail 只影响合成时长）。"""
    d: dict = {"id": id, "narration": narration}
    if instruction:
        d["instruction"] = instruction
    if rate is not None:
        d["rate"] = rate
    if tail is not None:
        d["tail"] = tail
    if clip:
        d["bg"] = {"clip": clip, "start": start}
    elif still:
        d["still"] = str(still)
        if still_fit:
            d["still_fit"] = still_fit
    elif dark:
        d["dark"] = True
    ovs = []
    for key in infos:                       # 信息条左上
        ovs.append({"png": f"overlays/info_{key}.png", "width": 430,
                    "pos": [64, 64]})
    for name, pos in window_hooks:          # 定窗强调字（[t0,t1] 或 at 淡入）
        ovs.append({"png": f"overlays/{name}.png",
                    "width": OVERLAY_WIDTH.get(name), "pos": pos})
    for name in hooks:                      # 整镜强调字
        ovs.append({"png": f"overlays/{name}.png",
                    "width": OVERLAY_WIDTH.get(name), "pos": "top_center"})
    for name in annos:                      # 标注层（整画布 PNG）
        ovs.append({"png": f"overlays/{name}.png", "pos": [0, 0]})
    if ovs:
        d["overlays"] = ovs
    return d


def build_shots() -> list[dict]:
    """38 镜。台词 = voiceover-v1.md 逐字；画面 = production-script.md 时间轴。"""
    city_png = SHOTS_DIR / "city.png"
    shots = [
        # 01 开场
        S("s01", "给大模型一块地，让它自己盖楼，",
          clip="G5", start=0, hooks=["hook_open"],
          tail=0.15),   # 2026-10-03 城主反馈：与 s02 间隔偏长——镜尾收紧
        S("s02", "最后能盖成什么样？", clip="city", start=0),
        # 02 起因
        S("s03", "我之前买了好几个 AI 编程套餐，最近厂商又一直送额度。",
          clip="city", start=2.2, hooks=["hook_quota"]),
        S("s04", "眼看用不完，我就想：别浪费了，让它们给我盖房子吧。",
          still=city_png, hooks=["hook_build"]),
        # 03 项目与分地
        S("s05", "于是，我就让这些大模型一起造了座城，叫「模都」。",
          clip="city", start=7.5,
          window_hooks=[("title_card", "center")]),
        S("s06", "我先设计了一张城市地图，每个模型来认领一个街区。",
          still=WORK / "empty_city.png",   # 空城（2026-10-03 城主裁决：没建筑的
          #   城市截图更贴「设计地图」；shot_empty_city.py 运行时隐藏建筑组）
          still_fit=[0, 0, 1200, 1080],
          window_hooks=[("mini_grid", [1290, 300])]),
        # 04 玩法：选题
        S("s07", "模型会先看看城里缺什么，", still=SHOTS_DIR / "F4.png",
          window_hooks=[("tag_住宅", [1620, 64])]),
        S("s08", "自己提案盖住宅、车站，", still=SHOTS_DIR / "E7.png",
          window_hooks=[("tag_车站", [1620, 64])]),
        S("s09", "还是公园等等。", still=SHOTS_DIR / "E4.png",
          window_hooks=[("tag_公园", [1620, 64])]),
        # 05 玩法：动手
        S("s10", "提案我点头，模型就自己写代码，", dark=True,
          window_hooks=[("flow_card", "center")]),
        S("s11", "盖出能在地图上转着看的三维建筑。我负责最后验收。",
          clip="city", start=0.8, hooks=["hook_flow"]),
        # 06 引入巡礼
        S("s12", "今天带大家看九个街区。先看三个我最喜欢的。",
          still=WORK / "layouts/layout_grid9.png", hooks=["hook_nine"]),
        # 07 求索塔
        S("s13", "先看 DeepSeek V4 Pro。这栋叫求索塔，青色螺旋一路绕到楼顶。",
          clip="G5", start=0.5, infos=["g5"]),
        S("s14", "我看完这么多楼，就这栋特别好记。",
          still=SHOTS_DIR / "G5.png", infos=["g5"], hooks=["hook_remember"]),
        S("s15", "不过凑近了有点乱，装饰再少点，我觉得会更好看。",
          still=SHOTS_DIR / "G5.png", infos=["g5"], hooks=["hook_messy"],
          annos=["anno_g5_helix"]),
        # 08 医疗街区
        S("s16", "还有 OpenCode 上的匿名模型，Space Bunny。它盖的是医院。",
          clip="D5", start=0, infos=["d5"]),
        S("s17", "白色的楼，隔几层就有一片绿化，楼下还有花园。",
          still=SHOTS_DIR / "D5.png", infos=["d5"],
          annos=["anno_d5_green", "anno_d5_garden"]),
        S("s18", "你不告诉我，我未必看得出是医院，但这几栋摆在一起，看着就是舒服。",
          still=SHOTS_DIR / "D5.png", infos=["d5"], hooks=["hook_comfy"],
          instruction="用平和自然的聊天语气说",   # 2026-10-03 城主反馈：此句
          # 终配音调突然飙高——镜级指令压平（指纹含指令，只重采本镜）
          rate=0),   # 2026-10-03 城主反馈：语速太快——从全局 +10% 降到正常档
        # 09 中央车站
        S("s19", "智谱 GLM 5.3 Flash，盖了座火车站。",
          clip="E7", start=0, infos=["e7"]),
        S("s20", "你看这玻璃拱顶，旁边轨道、列车也都有，不用看名字，就知道是车站。",
          still=SHOTS_DIR / "E7.png", infos=["e7"], hooks=["hook_station"],
          annos=["anno_e7_dome", "anno_e7_track"]),
        S("s21", "钟塔是高了点，但放一块儿，还真挺像那么回事。",
          still=SHOTS_DIR / "E7.png", infos=["e7"]),
        # 10 过渡
        S("s22", "接下来这四个，有喜欢的地方，也有想吐槽的。",
          still=WORK / "layouts/layout_quad.png"),
        # 11 商业街区
        S("s23", "小米 MiMo V2.6 Flash，盖了个商业街区。",
          clip="D4", start=0, infos=["d4"]),
        S("s24", "样子不算新鲜，但窗框、店面这些细节，做得挺认真。",
          still=SHOTS_DIR / "D4.png", infos=["d4"], hooks=["hook_detail"],
          annos=["anno_d4_shop"]),
        # 12 住宅
        S("s25", "豆包 Seed 2.1 Pro，盖的小区挺像我平时会路过的。",
          clip="F4", start=0, infos=["f4"]),
        S("s26", "就是楼顶这盏大灯，实在太抢戏了。",
          still=SHOTS_DIR / "F4.png", infos=["f4"],
          window_hooks=[("hook_lamp", [1180, 70])], annos=["anno_f4_lamp"]),
        # 13 公园
        S("s27", "通义 Qwen 3.8 Flash，这个玻璃温室漂亮。",
          clip="E4", start=0, infos=["e4"]),
        S("s28", "可你叫「镜湖中央公园」，湖呢？",
          still=SHOTS_DIR / "E4.png", infos=["e4"], hooks=["hook_lake"]),
        S("s29", "缩在后面，倒像植物园附送了个小水池。",
          still=SHOTS_DIR / "E4.png", infos=["e4"], annos=["anno_e4_lake"]),
        # 14 原点街区
        S("s30", "智谱 GLM 5.3，盖了城市中心这两座塔。看着挺稳当，但要说惊艳，我觉得还差点。",
          clip="E5", start=0.5, infos=["e5"], hooks=["hook_stable"]),
        # 15 过渡
        S("s31", "最后这两个，我就真想让它们再改改了。",
          still=WORK / "layouts/layout_e6e3.png", hooks=["hook_rework2"]),
        # 16 剧院与图书馆
        S("s32", "DeepSeek V4.1 Flash，你看这剧院，像不像把一个大盒子架在高柱子上？",
          clip="E6", start=0, infos=["e6"]),
        S("s33", "头重脚轻。", still=SHOTS_DIR / "E6.png", infos=["e6"],
          window_hooks=[("hook_topheavy", [1180, 70])],
          annos=["anno_e6_theatre"]),
        S("s34", "旁边图书馆也是个厚方块，看着有点闷。",
          still=SHOTS_DIR / "E6.png", infos=["e6"], annos=["anno_e6_lib"]),
        # 17 博览中心
        S("s35", "美团 LongCat 2.5 Preview，这个博览中心，我最想让它返工。",
          clip="E3", start=0, infos=["e3"], hooks=["hook_redo"]),
        S("s36", "几大片白墙从底拉到顶，总觉得还没做完。",
          still=SHOTS_DIR / "E3.png", infos=["e3"], annos=["anno_e3_wall"]),
        S("s37", "旁边体育馆的穹顶倒是不错，可惜救不了整组。",
          still=SHOTS_DIR / "E3.png", infos=["e3"], annos=["anno_e3_dome"]),
        # 18 评论互动
        S("s38", "以上这九个街区，你最喜欢哪个呢？评论区聊聊。",
          still=WORK / "layouts/layout_grid9.png", hooks=["hook_ask"]),
    ]
    return shots


# ---------------------------------------------------------------- spec 组装

SPOKEN_MAP = [("模都", "模督")]   # 口播层注音（字幕层不动）；草稿试听后增补


def apply_spoken(text: str) -> str:
    for a, b in SPOKEN_MAP:
        text = text.replace(a, b)
    return text


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true",
                    help="不继承既有 spec 的门槛位（默认继承）")
    a = ap.parse_args()

    # 门槛位继承：重生成不丢城主已确认的锁（punct_locked 见下：台词逐字未变才随迁）
    old = None
    if SPEC_PATH.is_file() and not a.force:
        old = json.loads(SPEC_PATH.read_text(encoding="utf-8"))
    gates = {}
    if old:
        gates = {k: old[k] for k in
                 ("narration_locked", "tts_confirmed") if k in old}
        old_pub = old.get("publish") or {}
        if old_pub:
            gates["publish"] = {k: old_pub[k] for k in
                                ("cover_locked", "copy_locked", "copy")
                                if k in old_pub}

    overlays = ov_overlays()   # 先注册 OVERLAY_WIDTH，build_shots 才取得到宽度
    shots = build_shots()
    for s in shots:   # 注音层：tts_text = 口播写法（字幕文本 narration 不动）
        s["tts_text"] = apply_spoken(s["narration"])

    # 标点门槛锁（llm_test punct_check，2026-10-06 立项）：只绑台词本身——
    # 重拆镜后 narration 逐字未变才继承，否则视为新台词重新过门槛
    if old and old.get("punct_locked"):
        old_narr = "".join(s.get("narration", "") for s in old.get("shots") or [])
        if old_narr and old_narr == "".join(s["narration"] for s in shots):
            gates["punct_locked"] = True

    # 底片清单单源（DDA 通道，2026-10-06 城主裁决）：dda_capture.py --spec
    # 按此逐键满屏直采；每键可手编 {"dda_seconds": n} 覆盖自动时长。
    # "hook" 片头底片一期未用，见了跳过。
    clip_keys = sorted({s["bg"]["clip"] for s in shots
                        if s.get("bg") and s["bg"]["clip"] != "hook"})

    # 覆盖词数核对：38 镜必须逐字覆盖 voiceover 正文（防拆镜丢句）
    n_chars = sum(len(s["narration"]) for s in shots)
    print(f"[spec] {len(shots)} 镜，台词共 {n_chars} 字")

    spec = {
        "_comment": "模都第一期横屏视频 spec（2026-10-03 build_spec.py 生成）。"
                    "引擎 = D:/APP/llm_test/tools/video_maker.py（适配层见 llm-city "
                    "tools/video/）。底片 = web-gif 原始帧缓存转换（prep_clips.py，"
                    "2026-10-03 城主裁决弃 GIF 用原始帧）；台词 = voiceover-v1.md "
                    "第三稿逐字（城主制作基准）；分镜 = production-script.md 18 段。"
                    "work_dir 用绝对路径落 llm-city 缓存区（生成物不入库）。",
        "work_dir": str(WORK),
        "accent": ACCENT,
        "canvas": list(CANVAS),
        "tail": 0.45,   # 0.7 草稿实测全片 193s 超预算；收紧到 0.45 压回 3 分钟内
        "output": "moshi_v1.mp4",
        "tts": {
            "provider": "volc",
            "voice": "zh_female_mizai_uranus_bigtts",
            "rate": 10,
            "instruction": "用干脆利落、紧凑快速的节奏说",
            "_note": "现役音色档案 §2.4（咪仔 2.0 @10）；草稿=edge 晓晓同刻度试听",
        },
        **gates,
        "test_notes": {
            "title": "【测试说明】",
            "items": json.loads((VIDEO_DIR.parent / "article/spec.json")
                                .read_text(encoding="utf-8"))["test_notes"],
            "seconds": 5.0,
            "_note": "对比/PK 类一律加（全局裁决）；文案 = 文章 spec 同源四条",
        },
        "clips": {k: {} for k in clip_keys},
        "overlays": overlays,
        "shots": shots,
        "publish": {
            "cover_locked": True,    # 2026-10-03 城主定稿给题
            "copy_locked": True,
            "title_lines": ["让大模型各建一个街区，", "最后谁盖得最好？"],
            "accent_words": ["大模型", "最好"],
            "cover_vertical": {"still": str(WORK / "layouts/layout_grid9.png")},
            #   九宫格做竖版图带（1080×608 cover 裁切损失最小；G5 帧塔尖被切，
            #   2026-10-03 目检换图）；点题「各建一个街区」
            "cover_horizontal": {"clip": "city", "start": 3.0},  # 全城帧
            "copy": {
                "title": "让大模型各建一个街区，最后谁盖得最好？",
                "description": "让大模型各建一个街区，最后谁盖得最好？",
                "topics": [],    # 城主未给，留空待补
                "tags": [],
            },
        },
    }
    SPEC_PATH.write_text(
        json.dumps(spec, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"[spec] {SPEC_PATH}")

    # 标注层 PNG 直落 work/cards/overlays（PIL 单件，不走 cards 工序）
    anno_dir = WORK / "cards/overlays"
    anno_dir.mkdir(parents=True, exist_ok=True)
    for name, img in build_annotations().items():
        img.save(anno_dir / f"{name}.png")
    print(f"[spec] 标注层 {len(build_annotations())} 张 → {anno_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

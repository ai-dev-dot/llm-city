# -*- coding: utf-8 -*-
"""build_article · llm-city 公众号文章构建器（spec 驱动，产物两形态）

方法与机制源自 llm_test 的发布管线（tools/wx_article.py + article_builder.py，
2026-10-02 经城主点名引入）：内联样式（公众号编辑器只保留内联）、复制按钮
克隆 #wx-article 剔除 h1（公众号标题编辑器单独填）、GIF 在复制版只留平文
占位行（微信 GIF 上限与体积，作者按占位自行拖入）、末尾「测试说明」小字灰块
（对比类文章必加，文案单源 = 本文件 DEFAULT_TEST_NOTES，与 llm_test 两仓同源）、
414px 手机预览壳。点评/占位一律普通文字段落（特殊样式会劫持公众号编辑器里
作者后续输入的格式——llm_test 2026-09-03 裁决，沿用）。

用法：
  python tools/article/build_article.py --spec articles/01-.../article/spec.json

产物（落 spec 同目录）：
  article.html         复制版：截图内嵌 base64 + GIF 平文占位 + 右上角「复制全文」
  article_preview.html 完整版：全部素材相对路径引用 + 414px 手机壳（本地预览用）

spec 契约（相对路径相对 spec 所在目录解析）：
  title / accent / intro[str] / sections[{heading, blocks}]
  block: {type: h2|h3|p|img|gif|links, ...}
    p:    text（支持 **加粗**）
    img:  src, caption
    gif:  src, caption（复制版 = ［GIF 位］占位行；预览版 = 内嵌动图 + 图注）
    links: items[[文字, url]]
  test_notes: [str]（缺省文案见 DEFAULT_TEST_NOTES；false 关闭）
"""
import argparse
import base64
import html as html_mod
import json
import re
import sys
from pathlib import Path

DEFAULT_TEST_NOTES = (
    "每个考题的测试都使用同一段提示词，同一个程序调用大模型API；",
    "如果大模型返回的代码无法运行，允许大模型进行一次运行修复，"
    "但是只能修复运行错误代码，不能进行其他优化。",
)

_FONT = ("-apple-system-font,BlinkMacSystemFont,'Helvetica Neue',"
         "'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif")
# 根节点内联样式（随复制走；不含 padding——页面留白属呈现不属内容）
ROOT_STYLE = (f"margin:0;font-family:{_FONT};"
              "font-size:17px;line-height:31px;color:#3f3f3f;word-break:break-word;")

COPY_BUTTON = (
    '<div style="position:fixed;top:14px;right:14px;z-index:99999;">'
    '<button id="wx-copy-btn" onclick="wxCopyArticle(this)" '
    'style="padding:10px 18px;background:ACCENT;color:#fff;border:none;'
    'border-radius:999px;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.25);'
    'cursor:pointer;">复制全文</button></div>'
    '<script>\n'
    'function wxCopyArticle(btn){\n'
    '  var root=document.getElementById("wx-article");\n'
    '  if(!root){btn.textContent="未找到文章根节点";return;}\n'
    '  var clone=root.cloneNode(true);\n'
    '  var h1=clone.querySelector("h1");\n'
    '  if(h1){h1.parentNode.removeChild(h1);}\n'
    '  clone.style.position="fixed";clone.style.left="-99999px";clone.style.top="0";\n'
    '  document.body.appendChild(clone);\n'
    '  var cleanup=function(){if(clone.parentNode){clone.parentNode.removeChild(clone);}};\n'
    '  var done=function(ok,msg){\n'
    '    cleanup();\n'
    '    btn.textContent=msg||(ok?"已复制 ✓ 去公众号编辑器 Ctrl+V 粘贴"\n'
    '                            :"复制失败，请 Ctrl+A 全选后手动复制");\n'
    '    setTimeout(function(){btn.textContent="复制全文";},8000);};\n'
    '  var fallback=function(){\n'
    '    try{var r=document.createRange();r.selectNodeContents(clone);\n'
    '      var s=getSelection();s.removeAllRanges();s.addRange(r);\n'
    '      var ok=document.execCommand("copy");s.removeAllRanges();done(ok);\n'
    '    }catch(e){done(false,"复制失败："+e.message);}};\n'
    '  if(!(navigator.clipboard&&window.ClipboardItem)){fallback();return;}\n'
    '  btn.textContent="复制中…（内容大，可能要等一会）";\n'
    '  try{\n'
    '    var item=new ClipboardItem({\n'
    '      "text/html":new Blob([clone.innerHTML],{type:"text/html"}),\n'
    '      "text/plain":new Blob([clone.innerText],{type:"text/plain"})});\n'
    '    navigator.clipboard.write([item]).then(function(){done(true);},\n'
    '                                            fallback);\n'
    '  }catch(e){fallback();}\n'
    '}\n</script>'
)

PHONE_SHELL = '''<!DOCTYPE html>
<html lang="zh-CN"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
  body {{ margin:0; background:#333a49; font-family:"Microsoft YaHei",sans-serif; }}
  .bar {{ position:sticky; top:0; z-index:9; background:#1f2430; color:#cfd8ea;
        font-size:12px; padding:8px 14px; text-align:center; }}
  .phone {{ max-width:414px; margin:0 auto; background:#fff; min-height:100vh;
          box-shadow:0 0 24px rgba(0,0,0,.35); }}
</style></head><body>
<div class="bar">{bar}</div>
<div class="phone">{body}</div>
</body></html>'''


def esc(text):
    return html_mod.escape(str(text), quote=False)


def rich(text):
    """段落文本：转义后解析 **加粗**。"""
    parts = re.split(r"(\*\*.+?\*\*)", esc(text))
    return "".join(f"<strong>{p[2:-2]}</strong>" if p.startswith("**") else p for p in parts if p)


def h2(text, accent):
    return (f'<h2 style="margin:34px 0 14px;font-size:17px;line-height:26px;'
            f'color:#222;border-left:4px solid {accent};padding-left:10px;">{esc(text)}</h2>')


def h3(text, accent):
    return (f'<h3 style="margin:26px 0 12px;font-size:17px;line-height:26px;'
            f'color:{accent};">{esc(text)}</h3>')


def para(text):
    return f'<p style="margin:0 0 14px;">{rich(text)}</p>'


def img_caption(text):
    return (f'<p style="margin:6px 0 0;font-size:12.5px;color:#8a8a8a;'
            f'text-align:center;line-height:20px;">▲ {esc(text)}</p>')


def img_block(src, caption):
    cap = img_caption(caption) if caption else ""
    return (f'<img src="{src}" alt="{esc(caption or "")}" '
            f'style="width:100%;display:block;border-radius:6px;" />' + cap)


def gif_slot(src, spec_dir):
    """复制版 GIF 占位（平文段落）：［GIF 位］在此插入：<file>（X.XMB）。"""
    p = (spec_dir / src).resolve()
    mb = f"{p.stat().st_size / 1048576:.1f}MB" if p.exists() else "体积见文件"
    return f'<p style="margin:0 0 14px;">［GIF 位］在此插入：{esc(src)}（{mb}）</p>'


def links_block(items):
    out = ('<section style="margin:22px 0;background:#f7f7f7;border-radius:8px;'
           'padding:12px 16px;">')
    for text, url in items:
        out += (f'<p style="margin:6px 0;font-size:14px;line-height:24px;">'
                f'{esc(text)}：<a href="{esc(url)}" style="color:#576b95;'
                f'word-break:break-all;">{esc(url)}</a></p>')
    return out + "</section>"


def test_notes_block(items):
    head = (f'<p style="margin:0 0 4px;font-size:12.5px;color:#8a8a8a;'
            f'line-height:21px;font-weight:700;">测试说明</p>')
    body = "".join(f'<p style="margin:0;font-size:12.5px;color:#999;'
                   f'line-height:21px;">{esc(f"{i}、{x}")}</p>'
                   for i, x in enumerate(items, 1))
    return f'<section style="margin:22px 0 6px;">{head}{body}</section>'


def to_data_uri(path: Path) -> str:
    mime = "image/gif" if path.suffix.lower() == ".gif" else "image/png"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"


def render_blocks(blocks, spec_dir: Path, embed_images: bool, accent: str):
    """embed_images=True（复制版）：img 内嵌 base64、gif 平文占位；
    False（预览版）：全部相对路径引用（gif 动图直接展示）。"""
    out = []
    for b in blocks:
        t = b["type"]
        if t == "h2":
            out.append(h2(b["text"], accent))
        elif t == "h3":
            out.append(h3(b["text"], accent))
        elif t == "p":
            out.append(para(b["text"]))
        elif t == "img":
            p = (spec_dir / b["src"]).resolve()
            src = to_data_uri(p) if embed_images else b["src"]
            out.append(img_block(src, b.get("caption")))
        elif t == "gif":
            if embed_images:
                out.append(gif_slot(b["src"], spec_dir))
            else:
                out.append(img_block(b["src"], b.get("caption")))
        elif t == "links":
            out.append(links_block(b["items"]))
        else:
            raise ValueError(f"未知块类型：{t}")
    return "".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--spec", required=True)
    a = ap.parse_args()
    spec_path = Path(a.spec).resolve()
    spec_dir = spec_path.parent
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    accent = spec.get("accent", "#1d4ed8")

    body = [f'<h1 style="margin:0 0 20px;font-size:20px;line-height:30px;color:#222;">'
            f'{esc(spec["title"])}</h1>']
    body.append("".join(para(t) for t in spec.get("intro", [])))
    for sec in spec.get("sections", []):
        if sec.get("heading"):
            body.append(h2(sec["heading"], accent))
        body.append(render_blocks(sec.get("blocks", []), spec_dir, True, accent))
    notes = spec.get("test_notes", list(DEFAULT_TEST_NOTES))
    if notes:
        body.append(test_notes_block(notes))
    root_html = f'<div id="wx-article" style="{ROOT_STYLE}">{"".join(body)}</div>'

    # 复制版：截图内嵌 + GIF 占位 + 复制按钮（页面呈现样式打在 body，根节点外）
    page = ("<!DOCTYPE html><html lang='zh-CN'><head><meta charset='utf-8'>"
            f"<title>{esc(spec['title'])}</title></head><body>"
            + COPY_BUTTON.replace("ACCENT", accent)
            + "<script>(function(){var b=document.body;if(!b)return;"
              "b.style.margin='0 auto';b.style.padding='16px 12px';"
              "b.style.background='#fff';b.style.maxWidth='700px';})();</script>"
            + root_html + "</body></html>")
    out1 = spec_dir / "article.html"
    out1.write_text(page, encoding="utf-8")

    # 完整预览版：相对路径引用全部素材（gif 动图直接展示）+ 414px 手机壳
    body_p = [f'<h1 style="margin:0 0 20px;font-size:20px;line-height:30px;color:#222;">'
              f'{esc(spec["title"])}</h1>']
    body_p.append("".join(para(t) for t in spec.get("intro", [])))
    for sec in spec.get("sections", []):
        if sec.get("heading"):
            body_p.append(h2(sec["heading"], accent))
        body_p.append(render_blocks(sec.get("blocks", []), spec_dir, False, accent))
    if notes:
        body_p.append(test_notes_block(notes))
    root_p = f'<div id="wx-article" style="{ROOT_STYLE}">{"".join(body_p)}</div>'
    # 预览版也带复制按钮（2026-10-02 城主要求：试试一次性复制进公众号编辑器）。
    # 预期与说明：预览版素材是相对路径引用，剪贴板 html 里的 src 粘贴到公众号编辑器
    # 后按其域名解析会 404——截图大概率丢失，需实验验证；gif 体积过大（全量 base64
    # 内嵌 ~100MB）无法走内嵌路线，丢失时仍需按 article.html 的占位行手动拖入。
    out2 = spec_dir / "article_preview.html"
    out2.write_text(PHONE_SHELL.format(title=spec["title"], bar="完整预览 · 素材为本地相对引用，仅本机可看",
                                       body=COPY_BUTTON.replace("ACCENT", accent) + root_p), encoding="utf-8")
    print(f"OK 复制版 {out1}（{out1.stat().st_size / 1048576:.1f}MB，截图内嵌+GIF占位+复制按钮）")
    print(f"OK 预览版 {out2}（{out2.stat().st_size / 1048576:.2f}MB，相对路径+手机壳）")
    return 0


if __name__ == "__main__":
    sys.exit(main())

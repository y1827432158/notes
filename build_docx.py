# -*- coding: utf-8 -*-
"""
把 Markdown 源文件转换成排版好的 Word 文档。

用法:
    python build_docx.py

源文件: 同目录下的 算法刷题知识点.md
输出:   桌面/算法刷题知识点.docx
"""
import json
import os
import re
from pathlib import Path

from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

NOTES_DIR = Path(__file__).parent / "notes"
MANIFEST_PATH = NOTES_DIR / "manifest.json"
OUT_PATH = Path(os.environ.get("USERPROFILE", Path.home())) / "Desktop" / "算法刷题知识点.docx"
# 桌面被重定向到 D 盘的情况
if not OUT_PATH.parent.exists():
    OUT_PATH = Path("D:/HuaweiMoveData/Users/余浩/Desktop/算法刷题知识点.docx")

CN_FONT = "微软雅黑"
CODE_FONT = "Consolas"


def set_cn_font(run, name=CN_FONT):
    """设置中英文字体（python-docx 不会自动设置东亚字体）。"""
    run.font.name = name
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.append(rfonts)
    rfonts.set(qn("w:eastAsia"), name)
    rfonts.set(qn("w:ascii"), name)
    rfonts.set(qn("w:hAnsi"), name)


def shade(paragraph, color="F2F2F2"):
    """给段落加底纹。"""
    pPr = paragraph._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), color)
    pPr.append(shd)


def add_runs_with_bold(paragraph, text, base_font=CN_FONT, size=Pt(10.5)):
    """处理 **加粗** 和 `行内代码` 两种行内标记。"""
    # 先按 **加粗** 和 `代码` 切分
    tokens = re.split(r"(\*\*.+?\*\*|`[^`]+`)", text)
    for tok in tokens:
        if not tok:
            continue
        if tok.startswith("**") and tok.endswith("**") and len(tok) > 4:
            run = paragraph.add_run(tok[2:-2])
            run.bold = True
            set_cn_font(run, base_font)
            run.font.size = size
        elif tok.startswith("`") and tok.endswith("`") and len(tok) > 2:
            run = paragraph.add_run(tok[1:-1])
            set_cn_font(run, CODE_FONT)
            run.font.size = Pt(10)
            run.font.color.rgb = RGBColor(0xC7, 0x25, 0x4E)
        else:
            run = paragraph.add_run(tok)
            set_cn_font(run, base_font)
            run.font.size = size
    return paragraph


def add_code_block(doc, lines):
    """代码块：等宽字体 + 灰底 + 单倍行距。"""
    for i, line in enumerate(lines):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(6 if i == 0 else 0)
        p.paragraph_format.space_after = Pt(6 if i == len(lines) - 1 else 0)
        p.paragraph_format.line_spacing = 1.0
        p.paragraph_format.left_indent = Inches(0.2)
        run = p.add_run(line if line else " ")
        set_cn_font(run, CODE_FONT)
        run.font.size = Pt(9.5)
        shade(p)


def add_table(doc, rows):
    """把 | a | b | 形式的表格转成 Word 表格。"""
    cells = [[c.strip() for c in r.strip().strip("|").split("|")] for r in rows]
    cells = [r for r in cells if not all(re.fullmatch(r":?-{2,}:?", c or "") for c in r)]
    if not cells:
        return
    ncol = max(len(r) for r in cells)
    table = doc.add_table(rows=len(cells), cols=ncol)
    table.style = "Table Grid"
    for i, row in enumerate(cells):
        for j in range(ncol):
            text = row[j] if j < len(row) else ""
            cell = table.cell(i, j)
            cell.text = ""
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            add_runs_with_bold(p, text, size=Pt(9.5))
            if i == 0:
                for run in p.runs:
                    run.bold = True
                shade(p, "E7E6E6")
    doc.add_paragraph().paragraph_format.space_after = Pt(4)


def load_md():
    """按 manifest 的顺序，把 notes/ 下的章节合并成一份 Markdown。"""
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    parts = [f"# {manifest['title']}\n"]
    if manifest.get("subtitle"):
        parts.append(f"> {manifest['subtitle']}\n")

    in_fence = False
    for name in manifest["files"]:
        for line in (NOTES_DIR / name).read_text(encoding="utf-8").splitlines():
            if line.startswith("```"):
                in_fence = not in_fence
            # 整体下沉一级：文件标题成为 Word 的一级标题，小节成为二级
            if not in_fence and line.startswith("#"):
                line = "#" + line
            parts.append(line)
        parts.append("")
    return "\n".join(parts)


def build():
    md = load_md()
    doc = Document()

    # 全局默认字体
    style = doc.styles["Normal"]
    style.font.name = CN_FONT
    style.font.size = Pt(10.5)
    style.element.rPr.rFonts.set(qn("w:eastAsia"), CN_FONT)

    lines = md.splitlines()
    i = 0
    buf_table = []

    def flush_table():
        nonlocal buf_table
        if buf_table:
            add_table(doc, buf_table)
            buf_table = []

    while i < len(lines):
        line = lines[i]

        # 代码块
        if line.startswith("```"):
            flush_table()
            i += 1
            code = []
            while i < len(lines) and not lines[i].startswith("```"):
                code.append(lines[i])
                i += 1
            add_code_block(doc, code)
            i += 1
            continue

        # 表格
        if line.strip().startswith("|"):
            buf_table.append(line)
            i += 1
            continue
        flush_table()

        # 标题
        m = re.match(r"^(#{1,4})\s+(.*)", line)
        if m:
            level, text = len(m.group(1)), m.group(2).strip()
            if level == 1:
                h = doc.add_heading("", level=0)
                add_runs_with_bold(h, text)
                for run in h.runs:
                    run.font.size = Pt(22)
                    run.font.color.rgb = RGBColor(0x1F, 0x38, 0x64)
            else:
                h = doc.add_heading("", level=level - 1)
                add_runs_with_bold(h, text)
                for run in h.runs:
                    run.font.color.rgb = RGBColor(0x1F, 0x38, 0x64)
                    if level == 2:
                        run.font.size = Pt(16)
                    elif level == 3:
                        run.font.size = Pt(13)
                    else:
                        run.font.size = Pt(11.5)
            i += 1
            continue

        # 引用
        if line.strip().startswith(">"):
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Inches(0.3)
            add_runs_with_bold(p, line.strip().lstrip(">").strip())
            shade(p, "FFF7E6")
            i += 1
            continue

        # 无序列表
        m = re.match(r"^(\s*)-\s+(.*)", line)
        if m:
            indent = len(m.group(1)) // 2
            p = doc.add_paragraph(style="List Bullet")
            p.paragraph_format.left_indent = Inches(0.3 + 0.25 * indent)
            add_runs_with_bold(p, m.group(2))
            i += 1
            continue

        # 有序列表
        m = re.match(r"^(\s*)(\d+)\.\s+(.*)", line)
        if m:
            p = doc.add_paragraph(style="List Number")
            p.paragraph_format.left_indent = Inches(0.3)
            add_runs_with_bold(p, m.group(3))
            i += 1
            continue

        # 空行
        if not line.strip():
            i += 1
            continue

        # 普通段落
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(6)
        add_runs_with_bold(p, line.strip())
        i += 1

    flush_table()

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(OUT_PATH))
    print(f"已生成: {OUT_PATH}")


if __name__ == "__main__":
    build()

"""方案导出 Service — 生成 XLSX/PDF 文件并返回下载 URL。

对应 OpenSpec: (in_scope id: document-export)
"""

import logging
import re
from datetime import date
from pathlib import Path

from app.services.plan_generation_service import _checkpoint_state

logger = logging.getLogger(__name__)

_OUTPUT_DIR = Path("generated_xlsx")


async def export_plan_xlsx(run_id: str) -> str:
    """返回方案 XLSX 文件的绝对路径。

    XLSX 文件在 plan_generator agent 执行时已生成并存在磁盘上，
    这里直接读取 checkpoint 中保存的路径，无需重复调用 LLM。
    """
    state = await _checkpoint_state(run_id)
    if state is None:
        raise ValueError(f"Run {run_id} not found")

    plan_gen = state.get("plan_generator") or {}
    xlsx_url_path: str = plan_gen.get("xlsx_path") or ""

    if not xlsx_url_path:
        raise ValueError(f"Run {run_id} 没有已生成的 XLSX 文件（pipeline 未完成？）")

    # xlsx_path 在 checkpoint 中是 URL 路径格式 /xlsx/xxx.xlsx
    # 转为文件系统绝对路径
    filename = xlsx_url_path.rsplit("/", 1)[-1]
    abs_path = str((_OUTPUT_DIR / filename).resolve())

    if not Path(abs_path).exists():
        raise FileNotFoundError(f"XLSX 文件未找到（可能已被清理）: {abs_path}")

    return abs_path


async def export_plan_pdf(run_id: str) -> str:
    """生成方案 PDF，返回文件的绝对路径。

    以 9 章完整 Markdown 方案内容为核心，渲染为专业文档格式。
    """
    state = await _checkpoint_state(run_id)
    if state is None:
        raise ValueError(f"Run {run_id} not found")

    chapters = (state.get("plan_generator") or {}).get("chapters") or []
    if not chapters:
        raise ValueError(f"Run {run_id} 没有方案章节数据（pipeline 未完成？）")

    brand_input = state.get("brand_input") or {}
    brand_name = brand_input.get("brand_name", "营销方案")
    marketing_goal = brand_input.get("marketing_goal", "")
    category = brand_input.get("category", "")
    budget = brand_input.get("budget", 0)
    period = brand_input.get("period", 3)

    # ── ReportLab PDF ──
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm, mm
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.enums import TA_CENTER
    from reportlab.platypus import (
        PageBreak, Paragraph, SimpleDocTemplate, Spacer,
    )

    # ponytail: 按平台探测中文字体路径，macOS/Linux/Windows 全覆盖
    _FONT_NAME = 'Helvetica'
    _CANDIDATE_FONTS = [
        # macOS 15 Sequoia — 华文黑体 / 苹方（路径随系统版本变）
        '/System/Library/Fonts/PingFang.ttc',
        '/System/Library/Fonts/STHeiti Light.ttc',
        '/System/Library/Fonts/STHeiti Medium.ttc',
        '/Library/Fonts/Arial Unicode.ttf',
        '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
        # Windows
        'C:/Windows/Fonts/msyh.ttc',
        'C:/Windows/Fonts/msyhbd.ttc',
        'C:/Windows/Fonts/simsun.ttc',
        # Linux — 常见中文字体
        '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
        '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc',
        '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',
    ]
    for _fp in _CANDIDATE_FONTS:
        p = Path(_fp)
        if p.exists():
            try:
                from reportlab.pdfbase import pdfmetrics
                from reportlab.pdfbase.ttfonts import TTFont
                pdfmetrics.registerFont(TTFont('CJK', str(p)))
                _FONT_NAME = 'CJK'
                logger.info("PDF font registered: %s", _fp)
                break
            except Exception as exc:
                logger.warning("PDF font register failed for %s: %s", _fp, exc)

    _OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    today = date.today().strftime("%Y%m%d")
    filename = f"{brand_name}_{today}_营销方案.pdf"
    filepath = _OUTPUT_DIR / filename

    # ── Styles ──
    styles: dict[str, ParagraphStyle] = {}
    _S = lambda name, **kw: ParagraphStyle(name, fontName=_FONT_NAME, **kw)

    styles['cover_title'] = _S('CoverTitle', fontSize=24, leading=32,
                               spaceAfter=6, textColor=colors.HexColor('#1F4E79'),
                               alignment=TA_CENTER)
    styles['cover_sub'] = _S('CoverSub', fontSize=11, leading=15, spaceAfter=3,
                             textColor=colors.HexColor('#4A5568'), alignment=TA_CENTER)
    styles['cover_date'] = _S('CoverDate', fontSize=9, leading=12, spaceBefore=30,
                              textColor=colors.HexColor('#718096'), alignment=TA_CENTER)
    styles['ch_title'] = _S('ChTitle', fontSize=16, leading=22, spaceBefore=6,
                            spaceAfter=8, textColor=colors.HexColor('#1F4E79'))
    styles['ch_subtitle'] = _S('ChSubtitle', fontSize=10, leading=13, spaceAfter=10,
                               textColor=colors.HexColor('#718096'))
    styles['h2'] = _S('H2', fontSize=12, leading=17, spaceBefore=12, spaceAfter=4,
                      textColor=colors.HexColor('#1A202C'))
    styles['h3'] = _S('H3', fontSize=11, leading=15, spaceBefore=10, spaceAfter=3,
                      textColor=colors.HexColor('#2D3748'))
    styles['body'] = _S('Body', fontSize=10, leading=17, spaceAfter=3)
    styles['bullet'] = _S('Bullet', fontSize=10, leading=16, spaceAfter=2, leftIndent=14)
    styles['toc_h1'] = _S('TOC_H1', fontSize=11, leading=15, spaceAfter=3,
                          textColor=colors.HexColor('#1F4E79'))
    styles['footer'] = _S('Footer', fontSize=8, leading=10, spaceBefore=0, spaceAfter=0,
                          textColor=colors.HexColor('#A0AEC0'), alignment=TA_CENTER)

    def _escape(s: str) -> str:
        """Escape XML special characters for ReportLab Paragraph."""
        return (s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                 .replace('"', '&quot;').replace("'", '&#39;'))

    def _render_md(text: str) -> list:
        """Render a Markdown text block into PDF story elements.

        Merges consecutive non-special lines into a single Paragraph so
        wrapped paragraphs read naturally — the big fix over the old version.
        """
        elements: list = []
        lines = text.split('\n')

        # First pass: classify lines and merge consecutive body/bullet lines
        # so a paragraph split across source lines becomes one Paragraph.
        blocks: list[tuple[str, str]] = []  # (type, content)
        for line in lines:
            stripped = line.strip()
            if not stripped:
                # Empty line acts as paragraph separator
                if blocks and blocks[-1][0] in ('body', 'bullet', 'table'):
                    blocks.append(('sep', ''))
                continue

            safe = _escape(stripped)

            # ATX headings
            m = re.match(r'^(#{1,6})\s+(.+)$', safe)
            if m:
                blocks.append(('h' + str(len(m.group(1))), m.group(2)))
                continue
            # Horizontal rules
            if re.match(r'^[-*]{3,}$', safe):
                blocks.append(('hr', ''))
                continue
            # Tables (rough detection: pipe-separated)
            if '|' in stripped and re.match(r'^[\s|:\-0-9a-zA-Z一-鿿.%,≥≤\+\s]+$', stripped):
                blocks.append(('table_line', safe))
                continue
            # Tables: alignment row (|:---:|)
            if re.match(r'^[\s|:\-]+$', stripped):
                blocks.append(('sep', ''))
                continue
            # Bullet and numbered lists → merge consecutive
            if re.match(r'^[\-\*]\s+', stripped):
                text_bullet = re.sub(r'^[\-\*\s]+\s*', '', safe)
                blocks.append(('bullet', text_bullet))
                continue
            if re.match(r'^\d+[\.\)]\s+', stripped):
                text_num = re.sub(r'^\d+[\.\)]\s+', '', safe)
                blocks.append(('bullet', text_num))
                continue
            # Regular body text
            blocks.append(('body', safe))

        # Second pass: merge consecutive body and bullet lines
        merged: list[tuple[str, str]] = []
        for btype, content in blocks:
            if btype == 'sep':
                merged.append(('sep', ''))
                continue
            if btype in ('body', 'bullet'):
                # Look back: if previous entry is same type and not sep, merge
                if merged and merged[-1][0] == btype:
                    merged[-1] = (btype, merged[-1][1] + ' ' + content)
                else:
                    merged.append((btype, content))
            else:
                merged.append((btype, content))

        # Third pass: emit PDF elements
        for btype, content in merged:
            if btype == 'sep':
                elements.append(Spacer(1, 2 * mm))
                continue
            if btype == 'hr':
                elements.append(Spacer(1, 4 * mm))
                elements.append(Paragraph('—' * 40, _S('_hr', fontSize=6, leading=8,
                                                       textColor=colors.HexColor('#CBD5E0'))))
                elements.append(Spacer(1, 4 * mm))
                continue
            if btype in ('h1', 'h2'):
                elements.append(Paragraph(content, styles['h2']))
                continue
            if btype in ('h3', 'h4', 'h5', 'h6'):
                elements.append(Paragraph(content, styles['h3']))
                continue
            if btype == 'bullet':
                fmt = content
                fmt = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', fmt)
                fmt = re.sub(r'\*(.+?)\*', r'<i>\1</i>', fmt)
                elements.append(Paragraph(f"• {fmt}", styles['bullet']))
                continue
            if btype == 'table_line':
                elements.append(Paragraph(content, styles['body']))
                continue
            if btype == 'body':
                # Apply inline formatting (content already _escape'd in pass 1)
                fmt = content
                fmt = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', fmt)
                fmt = re.sub(r'\*(.+?)\*', r'<i>\1</i>', fmt)
                fmt = re.sub(r'`(.+?)`', r'<font face="Courier" size="8">\1</font>', fmt)
                elements.append(Paragraph(fmt, styles['body']))
                continue

        return elements

    story = []

    # ── Cover page ──
    story.append(Spacer(1, 60 * mm))
    story.append(Paragraph("营销方案报告", styles['cover_title']))
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph(brand_name, styles['cover_sub']))
    story.append(Spacer(1, 15 * mm))
    if category:
        story.append(Paragraph(f"品类：{category}", styles['cover_sub']))
    story.append(Paragraph(f"预算：{budget} 万元　周期：{period} 个月", styles['cover_sub']))
    if marketing_goal:
        story.append(Paragraph(f"营销目标：{marketing_goal}", styles['cover_sub']))
    story.append(Paragraph(f"生成日期：{today[:4]}年{int(today[4:6])}月{int(today[6:])}日", styles['cover_date']))
    story.append(PageBreak())

    # ── Table of contents ──
    story.append(Spacer(1, 15 * mm))
    story.append(Paragraph("目录", styles['cover_title']))
    story.append(Spacer(1, 8 * mm))
    for idx, chapter in enumerate(chapters):
        story.append(Paragraph(f"第{idx+1}章　{chapter['title']}", styles['toc_h1']))
    story.append(PageBreak())

    # ── Chapters ──
    for idx, chapter in enumerate(chapters):
        story.append(Paragraph(f"第{idx+1}章　{chapter['title']}", styles['ch_title']))
        if chapter.get('subtitle'):
            story.append(Paragraph(chapter['subtitle'], styles['ch_subtitle']))
        story.append(Spacer(1, 2 * mm))
        story.extend(_render_md(chapter.get('content', '')))
        story.append(PageBreak())

    # ── Page template with footer ──
    def _footer(canvas, doc):
        canvas.saveState()
        canvas.setFont(_FONT_NAME, 8)
        canvas.setFillColor(colors.HexColor('#A0AEC0'))
        canvas.drawCentredString(A4[0] / 2, 1.2 * cm,
                                 f"— {brand_name} 营销方案 — 第 {doc.page} 页 —")
        canvas.restoreState()

    doc = SimpleDocTemplate(
        str(filepath), pagesize=A4,
        topMargin=1.5 * cm, bottomMargin=2.5 * cm,
        leftMargin=1.5 * cm, rightMargin=1.5 * cm,
    )
    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)
    logger.info("PDF exported to %s", filepath)
    return str(filepath)

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

    styles = {}
    styles['cover_title'] = ParagraphStyle(
        'CoverTitle', fontName=_FONT_NAME, fontSize=22, leading=28,
        spaceAfter=10, textColor=colors.HexColor('#1F4E79'),
    )
    styles['cover_meta'] = ParagraphStyle(
        'CoverMeta', fontName=_FONT_NAME, fontSize=10, leading=14,
        spaceAfter=4, textColor=colors.HexColor('#4A5568'),
    )
    styles['ch_title'] = ParagraphStyle(
        'ChTitle', fontName=_FONT_NAME, fontSize=15, leading=20,
        spaceBefore=18, spaceAfter=2, textColor=colors.HexColor('#1F4E79'),
    )
    styles['ch_subtitle'] = ParagraphStyle(
        'ChSubtitle', fontName=_FONT_NAME, fontSize=10, leading=13,
        spaceAfter=10, textColor=colors.HexColor('#718096'),
    )
    styles['h2'] = ParagraphStyle(
        'ChH2', fontName=_FONT_NAME, fontSize=12, leading=16,
        spaceBefore=10, spaceAfter=4, textColor=colors.HexColor('#1A202C'),
    )
    styles['h3'] = ParagraphStyle(
        'ChH3', fontName=_FONT_NAME, fontSize=11, leading=15,
        spaceBefore=8, spaceAfter=3, textColor=colors.HexColor('#2D3748'),
    )
    styles['bold_lead'] = ParagraphStyle(
        'ChBoldLead', fontName=_FONT_NAME, fontSize=9.5, leading=14.5,
        spaceBefore=6, spaceAfter=4,
    )
    styles['body'] = ParagraphStyle(
        'ChBody', fontName=_FONT_NAME, fontSize=9.5, leading=14.5,
        spaceAfter=4,
    )
    styles['bullet'] = ParagraphStyle(
        'ChBullet', fontName=_FONT_NAME, fontSize=9.5, leading=14,
        spaceAfter=2,
    )
    styles['sep'] = ParagraphStyle(
        'ChSep', fontName=_FONT_NAME, fontSize=6, leading=8,
        spaceAfter=2, textColor=colors.HexColor('#CBD5E0'),
    )

    def _render_md(text: str) -> list:
        """将一段 Markdown 文本转为 PDF story 元素列表。"""
        elements = []
        for line in text.split('\n'):
            line = line.strip()
            if not line:
                continue
            # escape XML
            safe = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            safe = safe.replace('"', '&quot;').replace("'", '&#39;')
            # ATX headings
            m = re.match(r'^(#{1,6})\s+(.+)$', safe)
            if m:
                level = len(m.group(1))
                content = m.group(2)
                if level <= 2:
                    elements.append(Paragraph(content, styles['h2']))
                else:
                    elements.append(Paragraph(content, styles['h3']))
                continue
            # bullet lists
            if re.match(r'^[\-\*]\s+', safe):
                text_bullet = re.sub(r'^[\-\*]\s+', '', safe)
                elements.append(Paragraph(f"• {text_bullet}", styles['bullet']))
                continue
            # numbered lists
            if re.match(r'^\d+[\.\)]\s+', safe):
                text_num = re.sub(r'^\d+[\.\)]\s+', '', safe)
                elements.append(Paragraph(f"• {text_num}", styles['bullet']))
                continue
            # horizontal rule
            if re.match(r'^[-]{3,}$', safe) or re.match(r'^[*]{3,}$', safe):
                elements.append(Paragraph('—' * 20, styles['sep']))
                continue
            # bold / italic
            safe = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', safe)
            safe = re.sub(r'\*(.+?)\*', r'<i>\1</i>', safe)
            # inline code
            safe = re.sub(r'`(.+?)`', r'<font face="Courier" size="8">\1</font>', safe)
            # 行首粗体 → 加上方间距
            style = styles['bold_lead'] if safe.startswith('<b>') else styles['body']
            elements.append(Paragraph(safe, style))
        return elements

    story = []

    # ── Cover page ──
    story.append(Spacer(1, 50 * mm))
    story.append(Paragraph("营销方案报告", styles['cover_title']))
    story.append(Spacer(1, 15 * mm))
    story.append(Paragraph(f"品牌名称：{brand_name}", styles['cover_meta']))
    if category:
        story.append(Paragraph(f"所属品类：{category}", styles['cover_meta']))
    story.append(Paragraph(f"预算规模：{budget} 万元", styles['cover_meta']))
    story.append(Paragraph(f"执行周期：{period} 个月", styles['cover_meta']))
    if marketing_goal:
        story.append(Paragraph(f"营销目标：{marketing_goal}", styles['cover_meta']))
    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph(f"生成日期：{date.today().strftime('%Y年%m月%d日')}", styles['cover_meta']))
    story.append(PageBreak())

    # ── Chapter pages (连续排版，不分页) ──
    for idx, chapter in enumerate(chapters):
        if idx > 0:
            story.append(Spacer(1, 4 * mm))
        story.append(Paragraph(f"第{idx+1}章 {chapter['title']}", styles['ch_title']))
        if chapter.get('subtitle'):
            story.append(Paragraph(chapter['subtitle'], styles['ch_subtitle']))
        story.append(Spacer(1, 2 * mm))
        story.extend(_render_md(chapter.get('content', '')))

    doc = SimpleDocTemplate(
        str(filepath), pagesize=A4,
        topMargin=2 * cm, bottomMargin=2 * cm,
        leftMargin=0.5 * cm, rightMargin=0.5 * cm,
    )
    doc.build(story)
    logger.info("PDF exported to %s", filepath)
    return str(filepath)

"""方案导出 Service — 生成 XLSX/PDF 文件并返回下载 URL。

Corresponding OpenSpec: (in_scope id: document-export)
"""

import logging
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
    """生成方案 PDF，返回文件的绝对路径。"""
    state = await _checkpoint_state(run_id)
    if state is None:
        raise ValueError(f"Run {run_id} not found")

    brand_input = state.get("brand_input") or {}
    strategy_gen = state.get("strategy_generation") or {}
    exec_plan = state.get("execution_planning") or {}
    budget_kpi = state.get("budget_kpi") or {}
    action_rec = state.get("action_recommendations") or {}

    brand_name = brand_input.get("brand_name", "营销方案")
    positioning = strategy_gen.get("positioning", "")
    key_messages = strategy_gen.get("key_messages") or []
    marketing_goal = brand_input.get("marketing_goal", "")
    category = brand_input.get("category", "")
    budget = brand_input.get("budget", 0)
    period = brand_input.get("period", 3)

    exec_items: list[tuple[str, str]] = []
    for field, label in [
        ("leagues_plan", "盟域共建"),
        ("events_plan", "赛事活动"),
        ("influencer_plan", "达人合作"),
        ("content_plan", "内容运营"),
        ("store_plan", "经营社联动"),
    ]:
        val = exec_plan.get(field, "")
        if val:
            exec_items.append((label, str(val)[:200]))

    allocations = budget_kpi.get("budget_allocation") or budget_kpi.get("allocations") or []
    actions = action_rec.get("actions") or []

    # ── ReportLab PDF ──
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm, mm
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import (
        PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
    )

    # Chinese font registration
    _FONT_NAME = 'Helvetica'
    for _fp in [
        'C:/Windows/Fonts/msyh.ttf',
        'C:/Windows/Fonts/msyhbd.ttf',
        'C:/Windows/Fonts/simsun.ttc',
    ]:
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

    styles = getSampleStyleSheet()
    t_h1 = ParagraphStyle('PdfH1', fontName=_FONT_NAME, fontSize=22, leading=28,
                          spaceAfter=10, textColor=colors.HexColor('#1F4E79'))
    t_h2 = ParagraphStyle('PdfH2', fontName=_FONT_NAME, fontSize=14, leading=18,
                          spaceBefore=12, spaceAfter=6, textColor=colors.HexColor('#1F4E79'))
    t_body = ParagraphStyle('PdfBody', fontName=_FONT_NAME, fontSize=10, leading=15,
                            spaceAfter=6)
    t_meta = ParagraphStyle('PdfMeta', fontName=_FONT_NAME, fontSize=10, leading=14,
                            spaceAfter=4, textColor=colors.HexColor('#4A5568'))
    t_bullet = ParagraphStyle('PdfBullet', fontName=_FONT_NAME, fontSize=10, leading=14,
                              spaceAfter=3, leftIndent=12)

    story: list = []

    # Cover page
    story.append(Spacer(1, 50 * mm))
    story.append(Paragraph("营销方案报告", t_h1))
    story.append(Spacer(1, 15 * mm))
    story.append(Paragraph(f"品牌名称：{brand_name}", t_meta))
    if category:
        story.append(Paragraph(f"所属品类：{category}", t_meta))
    story.append(Paragraph(f"预算规模：{budget} 万元", t_meta))
    story.append(Paragraph(f"执行周期：{period} 个月", t_meta))
    if marketing_goal:
        story.append(Paragraph(f"营销目标：{marketing_goal}", t_meta))
    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph(f"生成日期：{date.today().strftime('%Y年%m月%d日')}", t_meta))
    story.append(PageBreak())

    # 1. Strategy
    story.append(Paragraph("一、策略定位", t_h2))
    if positioning:
        story.append(Paragraph(positioning, t_body))
    if key_messages:
        story.append(Spacer(1, 3 * mm))
        story.append(Paragraph("核心传播信息：", t_body))
        for msg in key_messages[:6]:
            story.append(Paragraph(f"• {msg}", t_bullet))
    story.append(Spacer(1, 6 * mm))

    # 2. Execution
    if exec_items:
        story.append(Paragraph("二、执行规划", t_h2))
        for label, desc in exec_items:
            safe_desc = desc.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            story.append(Paragraph(f"<b>{label}：</b>{safe_desc}", t_body))
        story.append(Spacer(1, 6 * mm))

    # 3. Budget
    if allocations:
        story.append(Paragraph("三、预算分配", t_h2))
        table_data = [["费用项目", "金额(万元)", "占比"]]
        for a in allocations:
            cat = str(a.get("category", ""))
            amt = a.get("amount", 0)
            pct = f'{a.get("percentage", 0)}%'
            try:
                table_data.append([cat, str(amt) if amt else "0", pct])
            except Exception:
                pass
        if len(table_data) > 1:
            col_w = [130, 80, 60]
            t = Table(table_data, colWidths=col_w)
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2D3748')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#BFBFBF')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F7F8FA')]),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(t)
        story.append(Spacer(1, 6 * mm))

    # 4. Actions
    if actions:
        story.append(Paragraph("四、行动建议", t_h2))
        for a in actions[:6]:
            title = str(a.get("title", ""))
            desc = str(a.get("description", ""))[:120]
            safe = desc.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            story.append(Paragraph(f"<b>{title}</b>：{safe}", t_body))

    doc = SimpleDocTemplate(
        str(filepath), pagesize=A4,
        topMargin=2 * cm, bottomMargin=2 * cm,
        leftMargin=2.5 * cm, rightMargin=2.5 * cm,
    )
    doc.build(story)
    logger.info("PDF exported to %s", filepath)
    return str(filepath)

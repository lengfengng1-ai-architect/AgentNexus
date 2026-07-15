"""Plan generation HTTP router.

Corresponding OpenSpec: docs/api/paths/plan.yaml
Corresponding in_scope ID: plan-generation
"""

import json
import logging
import uuid

from fastapi import APIRouter, Path, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from app.schemas.common import APIError, APIResponse, ErrorCode
from app.schemas.xlsx_generation import XlsxData, BrandInfo, BudgetOverviewSheet, BudgetOverviewRow, BudgetDetailSheet, BudgetDetailItem, TimelineSheet, TimelineItem, GanttItem, KPISheet, KPIRow, ROIRow, ROIChartPoint, RadarScore
from app.schemas.plan_run import ApproveRequest, PlanRunRequest, RejectRequest, StrategyOptimizeRequest, StrategyOptimizeResponse
from app.schemas.plan_summary import PlanSummaryRequest
from app.services.plan_generation_service import (
    approve_run,
    delete_run,
    get_media_status,
    get_status,
    list_runs,
    regenerate_poster,
    regenerate_promo_video,
    reject_run,
    rerun_run,
    run_exists,
    start_run,
)
from app.services.plan_summary_service import generate_plan_summary

router = APIRouter(tags=["plan"])
logger = logging.getLogger(__name__)


def _sse_headers(run_id: str | None = None) -> dict[str, str]:
    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        "Content-Type": "text/event-stream; charset=utf-8",
    }
    if run_id:
        headers["X-Run-Id"] = run_id
    return headers


def _error_response(status_code: int, detail: str, code: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=APIError(detail=detail, code=code, errors=None).model_dump(),
    )


async def _require_run(run_id: str) -> JSONResponse | None:
    """Return a 404 response if the run_id has no checkpoint; otherwise None."""
    if not await run_exists(run_id):
        return _error_response(
            404,
            f"Run {run_id} not found",
            ErrorCode.NOT_FOUND,
        )
    return None


@router.post("/plan/run")
async def plan_run(request: Request, body: PlanRunRequest):
    """方案生成，SSE 流式返回每节点进度和最终结果。"""
    run_id = body.brand_input.get("run_id") if isinstance(body.brand_input, dict) else None
    if run_id is not None and (not isinstance(run_id, str) or not run_id.strip()):
        return _error_response(
            400,
            "run_id must be a non-empty string",
            ErrorCode.BAD_REQUEST,
        )
    run_id = run_id or str(uuid.uuid4())

    async def event_stream():
        async for frame in start_run(body.brand_input, run_id=run_id):
            yield frame

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers=_sse_headers(run_id),
    )


@router.post("/plan/runs/{run_id}/approve")
async def plan_run_approve(
    run_id: str = Path(..., description="运行实例 ID"),
    body: ApproveRequest = ApproveRequest(),  # type: ignore[call-arg]
):
    """通过当前审核检查点并继续执行。"""
    if not_found := await _require_run(run_id):
        return not_found
    return StreamingResponse(
        approve_run(run_id, edited_input=body.edited_input),
        media_type="text/event-stream",
        headers=_sse_headers(run_id),
    )


@router.post("/plan/runs/{run_id}/reject")
async def plan_run_reject(
    run_id: str = Path(..., description="运行实例 ID"),
    body: RejectRequest = ...,  # type: ignore[assignment]
):
    """驳回当前审核检查点，重新执行当前节点。"""
    if not_found := await _require_run(run_id):
        return not_found
    return StreamingResponse(
        reject_run(run_id, reason=body.reason),
        media_type="text/event-stream",
        headers=_sse_headers(run_id),
    )


@router.post("/plan/runs/{run_id}/rerun")
async def plan_run_rerun(
    run_id: str = Path(..., description="运行实例 ID"),
):
    """重新执行当前 pause 的 agent，清空结果后重新运行。"""
    if not_found := await _require_run(run_id):
        return not_found
    return StreamingResponse(
        rerun_run(run_id),
        media_type="text/event-stream",
        headers=_sse_headers(run_id),
    )


@router.post("/plan/runs/{run_id}/cancel")
async def plan_run_cancel(run_id: str = Path(..., description="运行实例 ID")):
    """取消运行并删除 checkpoint。"""
    if not_found := await _require_run(run_id):
        return not_found
    await delete_run(run_id)
    return APIResponse(
        success=True,
        data={"run_id": run_id, "status": "canceled"},
    )


@router.get("/plan/runs/{run_id}/status")
async def plan_run_status(run_id: str = Path(..., description="运行实例 ID")):
    """查询运行状态与暂停快照。"""
    if not_found := await _require_run(run_id):
        return not_found
    try:
        status = await get_status(run_id)
    except Exception as exc:
        logger.exception("failed to get status for run %s", run_id)
        return _error_response(
            500,
            f"Failed to get status: {exc}",
            ErrorCode.INTERNAL_ERROR,
        )
    return APIResponse(success=True, data=status)


class PosterRegenerateRequest(BaseModel):
    size: str = Field(default="2688*1536", description="分辨率，如 2688*1536、1536*2688、2048*2048")
    feedback: str = Field(default="", description="用户修改意见，影响重新生成方向")


@router.post("/plan/runs/{run_id}/poster")
async def plan_run_regenerate_poster(
    run_id: str = Path(..., description="运行实例 ID"),
    body: PosterRegenerateRequest = PosterRegenerateRequest(),  # type: ignore[call-arg]
):
    """重新生成海报图片（手动重试 / 切换尺寸 / 输入修改意见），后台异步执行。"""
    if not_found := await _require_run(run_id):
        return not_found
    try:
        poster = await regenerate_poster(run_id, size=body.size, feedback=body.feedback)
    except ValueError as exc:
        return _error_response(400, str(exc), ErrorCode.BAD_REQUEST)
    except Exception as exc:
        logger.exception("failed to regenerate poster for run %s", run_id)
        return _error_response(500, f"Failed to regenerate poster: {exc}", ErrorCode.INTERNAL_ERROR)
    return APIResponse(success=True, data=poster)


class PromoVideoRegenerateRequest(BaseModel):
    feedback: str = Field(default="", description="用户修改意见，影响重新生成方向")
    ratio: str = Field(default="16:9", description="宽高比：16:9 / 9:16 / 1:1 / 4:3 / 3:4 / 4:5 / 5:4 / 9:21 / 21:9")
    resolution: str = Field(default="720P", description="分辨率：720P / 1080P")
    duration: int = Field(default=5, ge=3, le=15, description="视频时长（秒）")


@router.post("/plan/runs/{run_id}/promo-video")
async def plan_run_regenerate_promo_video(
    run_id: str = Path(..., description="运行实例 ID"),
    body: PromoVideoRegenerateRequest = PromoVideoRegenerateRequest(),  # type: ignore[call-arg]
):
    """重新生成宣传视频（手动重试 / 输入修改意见），后台异步执行。"""
    if not_found := await _require_run(run_id):
        return not_found
    try:
        video = await regenerate_promo_video(run_id, feedback=body.feedback, ratio=body.ratio, resolution=body.resolution, duration=body.duration)
    except ValueError as exc:
        return _error_response(400, str(exc), ErrorCode.BAD_REQUEST)
    except Exception as exc:
        logger.exception("failed to regenerate promo video for run %s", run_id)
        return _error_response(500, f"Failed to regenerate promo video: {exc}", ErrorCode.INTERNAL_ERROR)
    return APIResponse(success=True, data=video)


@router.get("/plan/runs/{run_id}/media-status")
async def plan_run_media_status(run_id: str = Path(..., description="运行实例 ID")):
    """查询视频/海报媒体状态（轻量，不读 checkpoint）。"""
    try:
        status = await get_media_status(run_id)
    except Exception as exc:
        logger.exception("failed to get media status for run %s", run_id)
        return _error_response(
            500,
            f"Failed to get media status: {exc}",
            ErrorCode.INTERNAL_ERROR,
        )
    return APIResponse(success=True, data=status)


@router.get("/plan/runs")
async def plan_list_runs(limit: int = 20):
    """列出最近方案生成批次记录，含创建时间和状态。"""
    try:
        records = await list_runs(limit=limit)
        return APIResponse(success=True, data=records)
    except Exception as exc:
        logger.exception("failed to list plan runs")
        return _error_response(
            500,
            f"Failed to list runs: {exc}",
            ErrorCode.WORKFLOW_LIST_ERROR,
        )


@router.post("/plan/strategy-optimize")
async def plan_strategy_optimize(body: StrategyOptimizeRequest):
    """AI 优化核心策略文案：接收品牌/品类/目标数据，返回 LLM 生成的核心策略。"""
    try:
        from app.agents.llm_utils import invoke_json

        # Build prompt context from request fields
        parts = [f"品牌名称：{body.brand_name}"]
        if body.category:
            parts.append(f"品类：{body.category}")
        if body.product_matrix:
            parts.append(f"产品矩阵：{body.product_matrix}")
        if body.target_audience:
            parts.append(f"目标人群：{body.target_audience}")
        if body.marketing_goal:
            parts.append(f"营销目标：{body.marketing_goal}")
        context = "\n".join(parts)

        system = (
            "你是一个专业的营销策划专家。根据品牌信息生成一段核心营销策略文案。"
            "要求：包含核心定位、传播主题、差异化卖点；紧扣运动场景×品牌营销方向；"
            "语言精炼有力，300字以内。输出JSON格式：{\"strategy\": \"...\"}"
        )
        result = await invoke_json(system, context)
        strategy = result.get("strategy", "").strip()
        if not strategy:
            # fallback: use system prompt with template
            from jinja2 import Environment, FileSystemLoader
            env = Environment(loader=FileSystemLoader("app/prompt_templates"))
            template = env.get_template("strategy_optimize.md.j2")
            prompt = template.render(
                brand_name=body.brand_name,
                category=body.category or "",
                product_matrix=body.product_matrix or "",
                target_audience=body.target_audience or "",
                marketing_goal=body.marketing_goal or "",
            )
            from langchain_core.messages import HumanMessage, SystemMessage
            from app.agents.llm_utils import build_chat_model
            msg = await build_chat_model().ainvoke([
                SystemMessage(content=prompt),
                HumanMessage(content=f"请为品牌「{body.brand_name}」生成核心策略文案。"),
            ])
            strategy = (msg.content or "").strip()

        return APIResponse(success=True, data={"strategy": strategy})
    except Exception as exc:
        logger.exception("strategy optimization failed")
        return _error_response(
            500,
            f"策略优化失败：{exc}",
            ErrorCode.INTERNAL_ERROR,
        )


@router.post("/plan/summary")
async def plan_summary(body: PlanSummaryRequest):
    """获取方案摘要：读取 checkpoints 中已完成 agent 的输出，用 LLM 提炼为固定卡片结构。"""
    try:
        summary = await generate_plan_summary(body.run_id)
        return APIResponse(success=True, data=summary.model_dump())
    except ValueError as exc:
        return _error_response(404, str(exc), ErrorCode.NOT_FOUND)
    except Exception as exc:
        logger.exception("plan summary failed for run %s", body.run_id)
        return _error_response(500, f"方案摘要生成失败：{exc}", ErrorCode.INTERNAL_ERROR)


from app.agents.tools.generate_xlsx import generate_plan_xlsx


@router.post("/plan/test-xlsx")
async def plan_test_xlsx():
    """测试 xlsx 表格生成：用固定示例数据生成并返回下载URL。"""
    from app.schemas.xlsx_generation import XlsxData, BrandInfo, BudgetOverviewSheet, BudgetOverviewRow, \
        BudgetDetailSheet, BudgetDetailItem, TimelineSheet, TimelineItem, GanttItem, \
        KPISheet, KPIRow, ROIRow, ROIChartPoint, RadarScore

    data = XlsxData(
        brand_info=BrandInfo(
            brand_name="测试品牌",
            subtitle="完整版（多城市 · 400万） vs 上海版（单城 · 300万） | 执行周期：3个月",
            duration_months=3,
            version_a_name="完整版",
            version_a_budget=400.0,
            version_b_name="上海版",
            version_b_budget=300.0,
        ),
        budget_overview=BudgetOverviewSheet(
            rows=[
                BudgetOverviewRow(category="赛事/活动费用", amount_version_a=80, pct_version_a="20.0%",
                                  amount_version_b=84, pct_version_b="28.0%", diff="上海版单城密度更高"),
                BudgetOverviewRow(category="短视频内容制作与投放", amount_version_a=60, pct_version_a="15.0%",
                                  amount_version_b=45, pct_version_b="15.0%", diff="上海版缩减"),
                BudgetOverviewRow(category="达人代言与合作", amount_version_a=100, pct_version_a="25.0%",
                                  amount_version_b=90, pct_version_b="30.0%", diff="上海版聚焦本地达人"),
                BudgetOverviewRow(category="数字化平台建设", amount_version_a=30, pct_version_a="7.5%",
                                  amount_version_b=36, pct_version_b="12.0%", diff="上海版投入加大"),
                BudgetOverviewRow(category="渠道铺货与陈列支持", amount_version_a=50, pct_version_a="12.5%",
                                  amount_version_b=0, pct_version_b="0%", diff="上海版未单列"),
                BudgetOverviewRow(category="代理商培训与激励", amount_version_a=40, pct_version_a="10.0%",
                                  amount_version_b=0, pct_version_b="0%", diff="上海版未单列"),
                BudgetOverviewRow(category="盟域共建费用", amount_version_a=0, pct_version_a="0%",
                                  amount_version_b=30, pct_version_b="10.0%", diff="上海版新增专项"),
                BudgetOverviewRow(category="应急与机动预算", amount_version_a=40, pct_version_a="10.0%",
                                  amount_version_b=15, pct_version_b="5.0%", diff="完整版弹性更大"),
            ],
            total_a=400.0,
            total_b=300.0,
            note="完整版覆盖四城，预算400万；上海版单城执行，预算300万。执行周期均为3个月。",
        ),
        budget_detail=BudgetDetailSheet(
            items=[
                BudgetDetailItem(category="赛事/活动费用", sub="主题赛事（月度1场）", desc="品牌冠名主办的主题赛事", amount_a=30, amount_b=35, note="单场500-1000人"),
                BudgetDetailItem(category="赛事/活动费用", sub="联盟赛事（季度1场）", desc="联合第三方赛事机构", amount_a=25, amount_b=20),
                BudgetDetailItem(category="短视频内容制作与投放", sub="短视频拍摄制作", desc="每周3条，覆盖7大类型", amount_a=25, amount_b=20, note="12周共36条"),
                BudgetDetailItem(category="短视频内容制作与投放", sub="DOU+投放", desc="抖音信息流投放", amount_a=20, amount_b=15),
                BudgetDetailItem(category="达人代言与合作", sub="头部代言人（4-6名）", desc="百万级粉丝运动博主", amount_a=50, amount_b=40),
                BudgetDetailItem(category="达人代言与合作", sub="腰部达人（50-80名）", desc="10-50万粉KOL", amount_a=35, amount_b=35),
                BudgetDetailItem(category="数字化平台建设", sub="小程序/APP功能开发", desc="赛事报名、会员系统", amount_a=15, amount_b=18),
                BudgetDetailItem(category="数字化平台建设", sub="运营工具与数据看板", desc="数据分析、订单追踪", amount_a=10, amount_b=12),
                BudgetDetailItem(category="渠道铺货与陈列支持", sub="首批试饮装", desc="试饮装生产与派发", amount_a=20, amount_b=0),
                BudgetDetailItem(category="代理商培训与激励", sub="培训体系", desc="产品知识、销售技巧培训", amount_a=15, amount_b=0),
                BudgetDetailItem(category="盟域共建费用", sub="盟域签约与资源投入", desc="代理商盟域共建协议", amount_a=0, amount_b=18),
                BudgetDetailItem(category="应急与机动预算", sub="应急备用金", desc="突发情况备用", amount_a=25, amount_b=10),
            ],
        ),
        timeline=TimelineSheet(
            items=[
                TimelineItem(phase="筹备期", week="第1-2周", goal="搭建基础、签约资源", task="代理商签约与盟域选址", action="四城代理商签约", owner="城市代理商", deliverable="4城×4盟域总部确定"),
                TimelineItem(phase="筹备期", week="第1-2周", goal="搭建基础、签约资源", task="运动达人筛选与签约", action="确定头部+腰部达人名单", owner="品牌部", deliverable="达人合作矩阵建立"),
                TimelineItem(phase="预热期", week="第3-4周", goal="制造期待、启动招募", task="品牌悬念内容发布", action="品牌悬念海报+短视频", owner="内容团队", deliverable="预热内容上线"),
                TimelineItem(phase="预热期", week="第3-4周", goal="制造期待、启动招募", task="线下试饮与社群招募", action="首批线下试饮活动", owner="盟域运营", deliverable="试饮活动完成"),
                TimelineItem(phase="爆发期", week="第5-9周", goal="集中引爆、全量投放", task="主题赛事密集举办", action="每周1-2场赛事", owner="赛事部", deliverable="5-10场赛事落地"),
                TimelineItem(phase="爆发期", week="第5-9周", goal="集中引爆、全量投放", task="短视频集中投放", action="四线平台投放", owner="投放团队", deliverable="月均曝光≥3000万"),
                TimelineItem(phase="收割期", week="第10-12周", goal="数据复盘、持续转化", task="数据复盘与优化", action="复盘各维度数据", owner="数据分析", deliverable="复盘报告"),
                TimelineItem(phase="收割期", week="第10-12周", goal="数据复盘、持续转化", task="会员复购促活", action="会员复购优惠", owner="私域运营", deliverable="复购率≥25%"),
            ],
            gantt=[
                GanttItem(phase="筹备期", start_week=1, duration_weeks=2),
                GanttItem(phase="预热期", start_week=3, duration_weeks=2),
                GanttItem(phase="爆发期", start_week=5, duration_weeks=5),
                GanttItem(phase="收割期", start_week=10, duration_weeks=3),
            ],
        ),
        kpi=KPISheet(
            kpis=[
                KPIRow(dim="品牌传播", metric="短视频总曝光量", definition="全平台曝光总和", target_a="≥ 1亿次", target_b="≥ 240万次", target_a_num=10000, target_b_num=240, path="月均曝光≥3000万"),
                KPIRow(dim="品牌传播", metric="品牌话题讨论量", definition="话题讨论/转发/评论数", target_a="≥ 50万条", target_b="≥ 10万条", target_a_num=50, target_b_num=10, path="UGC挑战赛"),
                KPIRow(dim="用户增长", metric="私域会员沉淀", definition="社群+小程序会员总数", target_a="≥ 50万人", target_b="≥ 15万人", target_a_num=50, target_b_num=15, path="赛事报名转化"),
                KPIRow(dim="用户增长", metric="社群月均活跃率", definition="月活跃用户/总会员", target_a="≥ 30%", target_b="≥ 30%", target_a_num=30, target_b_num=30, path="每日打卡+周福利"),
                KPIRow(dim="销售转化", metric="达人带货GMV", definition="直播+短视频带货总额", target_a="≥ 500万元", target_b="≥ 150万元", target_a_num=500, target_b_num=150, path="头部+腰部达人直播"),
                KPIRow(dim="销售转化", metric="预估总营收", definition="赛事+终端+达人带货总和", target_a="≥ 2000万元", target_b="≥ 600万元", target_a_num=2000, target_b_num=600, path="GMV = 铺货量×动销率×客单价"),
                KPIRow(dim="渠道建设", metric="运动盟域总部数量", definition="城市盟域总部总数", target_a="16个", target_b="4个", target_a_num=16, target_b_num=4, path="代理商牵头"),
                KPIRow(dim="渠道建设", metric="签约运动达人", definition="三级达人矩阵总数", target_a="554人", target_b="172人", target_a_num=554, target_b_num=172, path="合作中心筛选签约"),
            ],
            roi=[
                ROIRow(type="投入", metric="总预算", definition="3个月营销总投入", value_a="400万元", value_b="300万元", note="含赛事/内容/达人/数字化/渠道"),
                ROIRow(type="产出", metric="预估总营收", definition="赛事+终端+达人带货GMV", value_a="≥ 2000万元", value_b="≥ 600万元", note="保守估算"),
                ROIRow(type="ROI", metric="投入产出比", definition="预估营收 / 总预算", value_a="≥ 5:1", value_b="≥ 2:1", note="规模效应更高"),
                ROIRow(type="效率", metric="单会员获取成本", definition="总预算 / 私域会员数", value_a="≤ 8元/人", value_b="≤ 20元/人", note="摊薄更优"),
            ],
            roi_chart=[
                ROIChartPoint(name="总预算(投入)", value_a=400, value_b=300),
                ROIChartPoint(name="预估营收(产出)", value_a=2000, value_b=600),
                ROIChartPoint(name="净收益", value_a=1600, value_b=300),
            ],
            radar_chart=[
                RadarScore(dim="品牌传播", score_a=95, score_b=60),
                RadarScore(dim="用户增长", score_a=90, score_b=55),
                RadarScore(dim="销售转化", score_a=85, score_b=50),
                RadarScore(dim="渠道建设", score_a=90, score_b=45),
            ],
        ),
    )
    try:
        data_json = data.model_dump_json(ensure_ascii=False)
        abs_path = await generate_plan_xlsx.ainvoke({"data": data_json, "brand_name": "测试品牌"})
        url_path = abs_path.replace("\\", "/")
        filename = url_path.split("/")[-1]
        download_url = f"/xlsx/{filename}"
        return APIResponse(success=True, data={"download_url": download_url, "file_path": abs_path})
    except Exception as exc:
        logger.exception("test xlsx generation failed")
        return _error_response(500, f"XLSX 生成失败: {exc}", ErrorCode.INTERNAL_ERROR)


@router.post("/plan/runs/{run_id}/export-xlsx")
async def plan_export_xlsx(
    run_id: str = Path(..., description="运行实例 ID"),
):
    """导出方案为 XLSX 表格，返回下载 URL。"""
    if not_found := await _require_run(run_id):
        return not_found
    try:
        from app.services.plan_export_service import export_plan_xlsx

        abs_path = await export_plan_xlsx(run_id)
        url_path = abs_path.replace("\\", "/")
        filename = url_path.split("/")[-1]
        download_url = f"/xlsx/{filename}"
        return APIResponse(success=True, data={"download_url": download_url, "file_path": abs_path})
    except ValueError as exc:
        return _error_response(404, str(exc), ErrorCode.NOT_FOUND)
    except Exception as exc:
        logger.exception("plan xlsx export failed for run %s", run_id)
        return _error_response(500, f"XLSX 导出失败: {exc}", ErrorCode.INTERNAL_ERROR)


@router.post("/plan/runs/{run_id}/export-pdf")
async def plan_export_pdf(
    run_id: str = Path(..., description="运行实例 ID"),
):
    """导出方案为 PDF 文档，返回下载 URL。"""
    if not_found := await _require_run(run_id):
        return not_found
    try:
        from app.services.plan_export_service import export_plan_pdf

        abs_path = await export_plan_pdf(run_id)
        url_path = abs_path.replace("\\", "/")
        filename = url_path.split("/")[-1]
        download_url = f"/xlsx/{filename}"  # reuse same /xlsx mount
        return APIResponse(success=True, data={"download_url": download_url, "file_path": abs_path})
    except ValueError as exc:
        return _error_response(404, str(exc), ErrorCode.NOT_FOUND)
    except Exception as exc:
        logger.exception("plan pdf export failed for run %s", run_id)
        return _error_response(500, f"PDF 导出失败: {exc}", ErrorCode.INTERNAL_ERROR)

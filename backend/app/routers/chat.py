import json

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from openai import OpenAI

from app.config.settings import settings

router = APIRouter(tags=["chat"])


@router.post("/chat/stream")
async def chat_stream(request: Request):
    """SSE 流式聊天，实时推送 thinking + reply。"""
    body = await request.json()
    message = body.get("message", "")

    client = OpenAI(api_key=settings.myself_api_key, base_url=settings.myself_base_url)

    async def event_stream():
        system_prompt = (
            "你是 AllyGo 营销方案 Agent，一个专业的营销方案生成助手。你的职责是：\n"
            "1. 帮助用户完善品牌营销需求，引导用户提供品牌名称、品类、目标城市、预算、周期等信息\n"
            "2. 回答关于 AllyGo 平台能力的问题（盟域、赛事、达人、场馆、经营社、人群画像等）\n"
            "3. 当用户明确表达了完整的营销需求时，引导用户进入方案生成流程\n"
            "4. 不要编造厂商、赛事、达人名称或数据数值\n"
            "5. 回复简洁友好，用中文\n"
        )
        stream = client.chat.completions.create(
            model=settings.myself_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message},
            ],
            extra_body={"enable_thinking": True},
            stream=True,
            stream_options={"include_usage": True},
        )
        reasoning_buffer = ""
        event_id = 0

        for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta

            # thinking content
            if hasattr(delta, "reasoning_content") and delta.reasoning_content:
                reasoning_buffer += delta.reasoning_content
                yield f"id: {event_id}\nevent: reasoning\ndata: {json.dumps({'text': delta.reasoning_content, 'full': reasoning_buffer})}\n\n"
                event_id += 1

            # reply content
            if hasattr(delta, "content") and delta.content:
                yield f"id: {event_id}\nevent: reply\ndata: {json.dumps({'text': delta.content})}\n\n"
                event_id += 1

        yield f"id: {event_id}\nevent: done\ndata: {{}}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

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
        from app.agents.intent_recognition_agent import _load_system_prompt
        prompt = _load_system_prompt(message, {})
        stream = client.chat.completions.create(
            model=settings.myself_model,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": message + "\n\n请按 JSON 格式输出 intent、reply、brand_input 等字段。"},
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

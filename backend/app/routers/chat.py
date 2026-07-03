"""Chat SSE streaming endpoint.

Corresponding OpenSpec: docs/api/paths/intent.yaml
Corresponding in_scope ID: brand-input
"""

import json

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.agents.intent_recognition_agent import stream_intent_recognition

router = APIRouter(tags=["chat"])


@router.post("/chat/stream")
async def chat_stream(request: Request):
    """SSE 流式聊天，通过 intent_recognition 识别意图，实时推送 thinking + 最终 intent JSON。"""
    body = await request.json()
    message = body.get("message", "")
    context = body.get("context", {})

    async def event_stream():
        event_id = 0
        async for reasoning_chunk, intent_dict in stream_intent_recognition(
            {"message": message, "context": context}
        ):
            if reasoning_chunk:
                yield f"id: {event_id}\nevent: reasoning\ndata: {json.dumps({'text': reasoning_chunk})}\n\n"
                event_id += 1
            elif intent_dict:
                yield f"id: {event_id}\nevent: intent\ndata: {json.dumps(intent_dict)}\n\n"
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

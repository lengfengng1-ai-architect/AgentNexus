## 1. Frontend: Persist and render uploaded image thumbnails

- [x] 1.1 Update `frontend/src/hooks/useChat.ts` `SEND_MESSAGE` action to accept and store `imageUrls` on the user `ChatMessage`.
- [x] 1.2 Update `frontend/src/components/ChatBubble.tsx` to render `message.imageUrls` thumbnails inside user message bubbles (single image width-capped + rounded, multiple images stacked vertically).
- [x] 1.3 Verify with browser preview that uploaded images appear in user bubbles on mobile viewport.

## 2. Backend: Pass image_urls through intent recognition and fallback to text_to_image

- [x] 2.1 Update `backend/app/agents/intent_recognition_agent.py` `_load_system_prompt` to preserve `context.image_urls` (and legacy `context.image_url`) when rendering the prompt.
- [x] 2.2 Update `backend/app/prompt_templates/intent_recognition.md.j2` to explicitly state: when `message` is empty but `image_urls` exists, default intent is `text_to_image` with a guiding reply.
- [x] 2.3 Update `_normalize_intent_output` in `intent_recognition_agent.py` to fallback `chat`/`clarify` to `text_to_image` when image URLs are present in context, setting `image_url` to the first URL and a guiding reply.
- [x] 2.4 Ensure `run_intent_recognition` and `stream_intent_recognition` pass the original context (or at least `image_urls`) to `_normalize_intent_output` for the fallback check.
- [x] 2.5 Add/update tests in `backend/tests/test_agents/test_intent_recognition.py` covering: empty message + image_urls → text_to_image; image + "做成视频" → generate_video; image + "生成海报" → text_to_image.

## 3. Verification and review

- [x] 3.1 Run backend tests (`uv run pytest backend/tests/test_agents/test_intent_recognition.py`) and ensure intent recognition tests pass.
- [x] 3.2 Run frontend type check and build to ensure no TypeScript errors from `ChatMessage.imageUrls` usage.
- [x] 3.3 Use browser preview to upload `/Users/hxq/Downloads/12.png` in mobile chat and confirm: thumbnail visible, AI reply guides image generation, `InlineImageCard` appears for AI message.
- [x] 3.4 Request code review via `code-reviewer` agent for modified frontend and backend files.

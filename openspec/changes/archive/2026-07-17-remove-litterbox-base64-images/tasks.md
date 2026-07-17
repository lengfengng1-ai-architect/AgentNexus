## 1. Backend: Base64 image utility + agent wiring

- [x] 1.1 Create `backend/app/services/image_base64.py` with a helper that reads a local `/uploads/` image (accepting both `/uploads/xxx` and `http(s)://host/uploads/xxx` forms), infers MIME from extension, validates size against the target model limit, and returns a `data:{mime};base64,{data}` URI. Pass through non-local http(s) URLs unchanged for backward compatibility.
- [x] 1.2 Update `backend/app/agents/image_generation_agent.py` so `call_qwen_image_api` converts a reference `image_url` to a Base64 data URI before building `content[].image`; remove the `X-DashScope-OssResourceResolve` header logic.
- [x] 1.3 Update `backend/app/agents/video_generation_agent.py` so reference `image_urls` are converted to Base64 data URIs in `_build_create_body`; remove the `oss://` / `X-DashScope-OssResourceResolve` header logic.

## 2. Backend: remove litterbox from upload

- [x] 2.1 Update `backend/app/routers/upload.py` to stop calling `upload_to_litterbox`; return only local `url` (no `oss_url`).
- [x] 2.2 Update `backend/app/schemas/upload.py` to remove the `oss_url` field (or keep optional but always null).
- [x] 2.3 Delete `backend/app/services/litterbox_upload.py` and `backend/tests/test_services/test_litterbox_upload.py`.
- [x] 2.4 Update `docs/api/paths/upload.yaml` to remove/deprecate the `oss_url` field.

## 3. Frontend: use local upload URL for display + model

- [x] 3.1 Update `frontend/src/pages/mobile-workbench/ScreenChat.tsx` `handleFileSelect` to use the local `/uploads/` URL (via `BACKEND_ORIGIN + url`) for both the user-bubble thumbnail and `context.image_urls`, dropping the `oss_url` branch.

## 4. Verification

- [x] 4.1 Add backend tests for `image_base64.py` (local file → data URI, MIME inference, http(s) passthrough, oversize rejection).
- [x] 4.2 Run backend tests and frontend type check.
- [x] 4.3 Verify in browser preview: upload image → thumbnail displays via local URL → AI asks three-option question → reply "宣传图" → InlineImageCard generates successfully using Base64 inline (no Failed to download image error).
- [x] 4.4 Request code review for modified files.

## 1. Backend: litterbox upload service

- [x] 1.1 Create `backend/app/services/litterbox_upload.py` with `upload_to_litterbox(file_data, filename) -> str` returning the public direct image URL (72h expiry), raising on failure.
- [x] 1.2 Update `backend/app/routers/upload.py` to call `upload_to_litterbox` and fill `oss_url` with the returned public URL (keep field name and response shape unchanged).
- [x] 1.3 Delete `backend/app/services/dashscope_upload.py` and remove its import/usage from the upload router.
- [x] 1.4 Update `backend/app/schemas/upload.py` `oss_url` description to "公网可访问的临时图片直链（litterbox，72h 有效），用于展示与模型推理".
- [x] 1.5 Update `docs/api/paths/upload.yaml` `oss_url` field description to reflect public direct image URL semantics.

## 2. Frontend: unify display + model URL

- [x] 2.1 Update `frontend/src/pages/mobile-workbench/ScreenChat.tsx` `handleFileSelect` so the uploaded public URL is used both for the user-bubble thumbnail and for `context.image_urls` sent to the model (remove oss:// special-casing comment, keep `oss_url ?? local url` fallback).

## 3. Verification

- [x] 3.1 Add backend test for `upload_to_litterbox` (mock httpx) verifying it returns the public URL and raises on non-2xx.
- [x] 3.2 Run backend tests and frontend type check.
- [x] 3.3 Verify in browser preview: upload image → thumbnail displays (public URL, no broken image) → AI asks three-option question → reply "宣传图" → InlineImageCard generates using the public URL.
- [x] 3.4 Request code review for modified files.

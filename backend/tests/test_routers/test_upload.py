"""Tests for upload endpoint caption generation.

Corresponding OpenSpec: docs/api/paths/upload.yaml
Corresponding in_scope ID: chat-attachment-file-upload / image-caption
"""

import io
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

_PNG_BYTES = bytes.fromhex(
    "89504e470d0a1a0a0000000d494844520000000100000001080600000"
    "01f15c4890000000d49444154789c626001000000ffff030000060005"
    "57bfabd40000000049454e44ae426082"
)


@pytest.fixture(autouse=True)
def _upload_dir(tmp_path, monkeypatch):
    """上传目录指向临时目录，避免污染真实 uploads/。"""
    monkeypatch.setattr("app.routers.upload.settings.upload_dir", str(tmp_path))
    monkeypatch.setattr("app.routers.upload.UPLOAD_DIR", tmp_path)
    monkeypatch.setattr("app.config.settings.settings.upload_dir", str(tmp_path))
    return tmp_path


def _post_file(name: str, data: bytes, content_type: str):
    return client.post(
        "/api/v1/upload",
        files=[("files", (name, io.BytesIO(data), content_type))],
    )


def test_upload_image_returns_caption():
    """图片上传后响应携带 VL 生成的 caption。"""
    with patch("app.routers.upload.generate_caption", new=AsyncMock(return_value="一双红色跑鞋")):
        resp = _post_file("shoe.png", _PNG_BYTES, "image/png")
    assert resp.status_code == 200
    item = resp.json()["files"][0]
    assert item["url"].startswith("/uploads/")
    assert item["caption"] == "一双红色跑鞋"


def test_upload_caption_failure_degrades_to_null():
    """caption 生成失败时 caption 为 null，上传仍成功。"""
    with patch("app.routers.upload.generate_caption", new=AsyncMock(return_value=None)):
        resp = _post_file("shoe.png", _PNG_BYTES, "image/png")
    assert resp.status_code == 200
    assert resp.json()["files"][0]["caption"] is None


def test_upload_non_image_skips_caption():
    """非图片文件不调用 VL，caption 为 null。"""
    with patch("app.routers.upload.generate_caption", new=AsyncMock(return_value="不应出现")) as mock_gen:
        resp = _post_file("doc.pdf", b"%PDF-1.4 fake", "application/pdf")
    assert resp.status_code == 200
    assert resp.json()["files"][0]["caption"] is None
    mock_gen.assert_not_called()


def test_upload_no_files_returns_400():
    """无文件返回 400。"""
    resp = client.post("/api/v1/upload", files=[])
    assert resp.status_code in (400, 422)

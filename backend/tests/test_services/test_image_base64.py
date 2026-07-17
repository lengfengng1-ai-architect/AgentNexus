"""Tests for image_base64 service.

Corresponding OpenSpec: openspec/changes/remove-litterbox-base64-images
Corresponding in_scope ID: inline-image-gen / inline-video-gen
"""

import base64

import pytest

from app.config.settings import settings
from app.services.image_base64 import to_data_uri


@pytest.fixture
def tmp_upload_dir(tmp_path, monkeypatch):
    """Point settings.upload_dir at a temp dir with sample images."""
    (tmp_path / "a.png").write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 50)
    (tmp_path / "b.jpg").write_bytes(b"\xff\xd8\xff" + b"\x00" * 50)
    (tmp_path / "c.webp").write_bytes(b"RIFF" + b"\x00" * 50)
    monkeypatch.setattr(settings, "upload_dir", str(tmp_path))
    return tmp_path


def test_to_data_uri__local_path_returns_png_data_uri(tmp_upload_dir):
    uri = to_data_uri("/uploads/a.png")
    assert uri.startswith("data:image/png;base64,")
    payload = uri.split(",", 1)[1]
    assert base64.b64decode(payload) == (tmp_upload_dir / "a.png").read_bytes()


def test_to_data_uri__full_url_form_stripped_to_local(tmp_upload_dir):
    uri = to_data_uri("http://localhost:8000/uploads/b.jpg")
    assert uri.startswith("data:image/jpeg;base64,")


def test_to_data_uri__webp_mime(tmp_upload_dir):
    uri = to_data_uri("/uploads/c.webp")
    assert uri.startswith("data:image/webp;base64,")


def test_to_data_uri__data_uri_passthrough():
    original = "data:image/png;base64,QUJD"
    assert to_data_uri(original) == original


def test_to_data_uri__external_url_passthrough():
    url = "https://example.com/some/image.png"
    assert to_data_uri(url) == url


def test_to_data_uri__oss_url_passthrough():
    url = "oss://dashscope-instant/xxx/yyy.png"
    assert to_data_uri(url) == url


def test_to_data_uri__oversize_raises(tmp_upload_dir):
    big = tmp_upload_dir / "big.png"
    big.write_bytes(b"\x00" * (11 * 1024 * 1024))  # 11MB > 10MB limit
    with pytest.raises(ValueError, match="超过大小限制"):
        to_data_uri("/uploads/big.png")


def test_to_data_uri__custom_max_bytes(tmp_upload_dir):
    with pytest.raises(ValueError):
        to_data_uri("/uploads/a.png", max_bytes=10)


def test_to_data_uri__path_traversal_rejected(tmp_upload_dir):
    # uploads 之外的文件不应被读取
    secret = tmp_upload_dir.parent / "secret.txt"
    secret.write_bytes(b"TOP_SECRET")
    with pytest.raises(ValueError, match="非法的参考图路径"):
        to_data_uri("/uploads/../secret.txt")


def test_to_data_uri__path_traversal_via_url_rejected(tmp_upload_dir):
    with pytest.raises(ValueError, match="非法的参考图路径"):
        to_data_uri("http://localhost:8000/uploads/../secret.txt")


def test_to_data_uri__missing_file_raises(tmp_upload_dir):
    with pytest.raises(ValueError, match="参考图不存在或不可读"):
        to_data_uri("/uploads/nonexistent.png")

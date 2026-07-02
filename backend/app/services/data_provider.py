"""Data provider abstraction for AllyGo platform data.

Corresponding OpenSpec: docs/api/paths/intent.yaml
Corresponding in_scope ID: data-query
"""

import json
import pathlib
from typing import Any, Protocol


class DataProvider(Protocol):
    """抽象数据提供层，便于 MVP mock 数据与真实 API 切换。"""

    def get_city_data(self, city: str) -> dict[str, Any] | None:
        """返回指定城市的完整数据，不存在返回 None。"""
        ...

    def list_cities(self) -> list[str]:
        """返回支持的城市列表。"""
        ...


class MockDataProvider:
    """从本地 JSON 文件读取 mock 数据。"""

    def __init__(self, data_path: pathlib.Path | str | None = None):
        if data_path is None:
            data_path = pathlib.Path(__file__).parent.parent.parent / "mock_data" / "allygo_city_data.json"
        self._data_path = pathlib.Path(data_path)
        self._data: dict[str, Any] | None = None

    def _load(self) -> dict[str, Any]:
        if self._data is None:
            with self._data_path.open("r", encoding="utf-8") as f:
                self._data = json.load(f)
        return self._data

    def get_city_data(self, city: str) -> dict[str, Any] | None:
        return self._load().get(city)

    def list_cities(self) -> list[str]:
        return sorted(self._load().keys())


# Global singleton for MVP; injectable for tests.
_default_provider: DataProvider | None = None


def get_data_provider() -> DataProvider:
    """Return the default data provider instance."""
    global _default_provider
    if _default_provider is None:
        _default_provider = MockDataProvider()
    return _default_provider


def set_data_provider(provider: DataProvider) -> None:
    """Override the default provider, mainly for tests."""
    global _default_provider
    _default_provider = provider

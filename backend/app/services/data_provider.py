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

    def get_filtered_leagues(
        self,
        city: str,
        sport_type: list[str] | None = None,
        min_members: int | None = None,
        sort_by: str | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """盟域查询，支持运动类型过滤、最小成员数筛选、排序。"""
        ...

    def get_filtered_influencers(
        self,
        city: str,
        sport_type: list[str] | None = None,
        tier_filter: list[str] | None = None,
        min_followers: int | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """达人查询，支持运动类型/等级/关注数过滤。"""
        ...

    def get_filtered_events(
        self,
        city: str,
        tags: list[str] | None = None,
        sort_by: str | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """赛事查询，支持标签过滤。"""
        ...

    def get_stores_by_league(
        self, league_name: str, store_type: str | None = None
    ) -> list[dict[str, Any]]:
        """经营社查询，按盟域名称和类型过滤。"""
        ...

    def get_stores_by_city(
        self, city: str, tag_filter: list[str] | None = None
    ) -> list[dict[str, Any]]:
        """经营社查询，按城市过滤，可选标签匹配。"""
        ...

    def get_brand_dimension_map(
        self, brand_name: str, category: str
    ) -> dict[str, Any] | None:
        """品牌→维度映射表查询，由 brand_name + category 联合确定。"""


class MockDataProvider:
    """从本地 JSON 文件读取 mock 数据。"""

    def __init__(self, data_path: pathlib.Path | str | None = None):
        if data_path is None:
            data_path = pathlib.Path(__file__).parent.parent.parent / "mock_data" / "allygo_city_data.json"
        self._data_path = pathlib.Path(data_path)
        self._data: dict[str, Any] | None = None

        mock_dir = pathlib.Path(__file__).parent.parent.parent / "mock_data"
        self._leagues: list[dict[str, Any]] | None = None
        self._influencers: list[dict[str, Any]] | None = None
        self._stores: list[dict[str, Any]] | None = None
        self._brand_map: list[dict[str, Any]] | None = None
        self._leagues_path = mock_dir / "leagues.json"
        self._influencers_path = mock_dir / "influencers.json"
        self._stores_path = mock_dir / "stores.json"
        self._brand_map_path = mock_dir / "brand_dimension_map.json"

    def _load(self) -> dict[str, Any]:
        if self._data is None:
            with self._data_path.open("r", encoding="utf-8") as f:
                self._data = json.load(f)
        return self._data

    def _load_leagues(self) -> list[dict[str, Any]]:
        if self._leagues is None:
            with self._leagues_path.open("r", encoding="utf-8") as f:
                self._leagues = json.load(f).get("data", [])
        return self._leagues

    def _load_influencers(self) -> list[dict[str, Any]]:
        if self._influencers is None:
            with self._influencers_path.open("r", encoding="utf-8") as f:
                self._influencers = json.load(f).get("data", [])
        return self._influencers

    def _load_stores(self) -> list[dict[str, Any]]:
        if self._stores is None:
            with self._stores_path.open("r", encoding="utf-8") as f:
                self._stores = json.load(f).get("data", [])
        return self._stores

    def _load_brand_map(self) -> list[dict[str, Any]]:
        if self._brand_map is None:
            with self._brand_map_path.open("r", encoding="utf-8") as f:
                self._brand_map = json.load(f).get("data", [])
        return self._brand_map

    def get_city_data(self, city: str) -> dict[str, Any] | None:
        return self._load().get(city)

    def list_cities(self) -> list[str]:
        return sorted(self._load().keys())

    def get_filtered_leagues(
        self,
        city: str,
        sport_type: list[str] | None = None,
        min_members: int | None = None,
        sort_by: str | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        leagues = self._load_leagues()
        result = [l for l in leagues if l["city"] == city]
        if sport_type:
            result = [l for l in result if l["sport_type"] in sport_type]
        if min_members is not None:
            result = [l for l in result if l["member_count"] >= min_members]
        if sort_by and sort_by in ("member_count", "total_fee", "credit_score", "activity_count_30d"):
            result.sort(key=lambda l: l.get(sort_by, 0), reverse=True)
        return result[:limit]

    def get_filtered_influencers(
        self,
        city: str,
        sport_type: list[str] | None = None,
        tier_filter: list[str] | None = None,
        min_followers: int | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        influencers = self._load_influencers()
        result = [i for i in influencers if i["city"] == city]
        if sport_type:
            result = [i for i in result if i["sport_type"] in sport_type]
        if tier_filter:
            result = [i for i in result if i["tier"] in tier_filter]
        if min_followers is not None:
            result = [i for i in result if i["follower_count"] >= min_followers]
        return result[:limit]

    def get_filtered_events(
        self,
        city: str,
        tags: list[str] | None = None,
        sort_by: str | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        city_data = self.get_city_data(city)
        if not city_data:
            return []
        raw_categories = city_data.get("events", {}).get("categories", [])
        if tags:
            filtered = [c for c in raw_categories if any(t in c for t in tags)]
        else:
            filtered = raw_categories
        items = [{"event_name": c, "city": city} for c in filtered]
        return items[:limit]

    def get_stores_by_league(
        self, league_name: str, store_type: str | None = None
    ) -> list[dict[str, Any]]:
        stores = self._load_stores()
        result = [s for s in stores if s["league_name"] == league_name]
        if store_type:
            result = [s for s in result if s["store_type"] == store_type]
        return result

    def get_stores_by_city(
        self, city: str, tag_filter: list[str] | None = None
    ) -> list[dict[str, Any]]:
        stores = self._load_stores()
        result = [s for s in stores if s["city"] == city]
        if tag_filter:
            result = [s for s in result if
                      any(t in (s.get("store_type", "") + s.get("description", "") + s.get("store_name", ""))
                          for t in tag_filter)]
        return result

    def get_brand_dimension_map(
        self, brand_name: str, category: str
    ) -> dict[str, Any] | None:
        brand_map = self._load_brand_map()
        for entry in brand_map:
            if entry.get("brand_name") == brand_name and entry.get("category") == category:
                return entry
        return None


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

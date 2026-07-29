"""Tests for multi-city budget weight guardrail.

Corresponding OpenSpec: openspec/changes/add-multi-city-linked-plan/specs/plan-generation-pipeline/spec.md
"""

from app.agents.budget_kpi_agent import (
    _load_default_city_weights,
    _min_weight,
    _validate_city_weights,
)


def test_min_weight_adapts_to_city_count():
    assert _min_weight(2) == 10.0
    assert _min_weight(4) == 10.0
    assert _min_weight(5) == 8.0


def test_validate_legal_weights():
    cities = ["上海", "成都", "广州"]
    weights = [
        {"city": "上海", "weight": 50, "rationale": "主城"},
        {"city": "成都", "weight": 30, "rationale": "体验"},
        {"city": "广州", "weight": 20, "rationale": "渠道"},
    ]
    assert _validate_city_weights(weights, cities)


def test_validate_rejects_sum_not_100():
    cities = ["上海", "成都"]
    weights = [{"city": "上海", "weight": 50}, {"city": "成都", "weight": 40}]
    assert not _validate_city_weights(weights, cities)


def test_validate_rejects_out_of_range_upper():
    # 单城超过 70% 上限 → 非法（防主城独大）
    cities = ["上海", "成都"]
    weights = [{"city": "上海", "weight": 85}, {"city": "成都", "weight": 15}]
    assert not _validate_city_weights(weights, cities)


def test_validate_rejects_out_of_range_lower():
    # 4 城下限 10%，9% 非法
    cities = ["上海", "成都", "广州", "北京"]
    weights = [
        {"city": "上海", "weight": 40},
        {"city": "成都", "weight": 30},
        {"city": "广州", "weight": 21},
        {"city": "北京", "weight": 9},
    ]
    assert not _validate_city_weights(weights, cities)


def test_validate_5city_allows_8_percent():
    # 5 城下限放宽至 8%，默认模板 35/25/20/12/8 全部合法
    cities = ["上海", "成都", "广州", "北京", "杭州"]
    weights = [
        {"city": "上海", "weight": 35},
        {"city": "成都", "weight": 25},
        {"city": "广州", "weight": 20},
        {"city": "北京", "weight": 12},
        {"city": "杭州", "weight": 8},
    ]
    assert _validate_city_weights(weights, cities)


def test_validate_rejects_missing_city():
    cities = ["上海", "成都", "广州"]
    weights = [{"city": "上海", "weight": 60}, {"city": "成都", "weight": 40}]
    assert not _validate_city_weights(weights, cities)


def test_load_default_weights_maps_cities_and_sums_100():
    cities = ["上海", "成都", "广州"]
    default = _load_default_city_weights(cities)
    assert [d["city"] for d in default] == cities
    assert sum(d["weight"] for d in default) == 100

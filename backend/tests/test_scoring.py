"""Tests for scoring formulas. Run with: pytest backend/tests/"""
from app.scoring import (
    deficit_score,
    demand_score,
    is_premium_brand,
    liquidity_score,
    prospect_score,
)


def _group(**overrides):
    base = {
        "active_count": 1,
        "removed_count": 0,
        "sellers_count": 1,
        "regions_count": 1,
        "has_capital_region": True,
        "is_premium": False,
    }
    base.update(overrides)
    return base


def test_deficit_high_when_few_listings():
    s = deficit_score(_group(active_count=1, sellers_count=1, regions_count=1))
    # 40 + 25 + 20 + 0 (in capital) = 85
    assert s.value >= 75
    assert "Критический" in s.interpretation or "Высокий" in s.interpretation


def test_deficit_low_when_market_saturated():
    s = deficit_score(_group(active_count=200, sellers_count=100, regions_count=80))
    assert s.value < 25
    assert "насыщен" in s.interpretation.lower()


def test_deficit_geo_bonus_when_no_capital():
    with_capital = deficit_score(_group(has_capital_region=True))
    without_capital = deficit_score(_group(has_capital_region=False))
    assert without_capital.value > with_capital.value


def test_liquidity_zero_when_no_removed():
    s = liquidity_score(_group(active_count=10, removed_count=0))
    assert s.value == 0
    assert "Нет данных" in s.interpretation


def test_liquidity_high_when_mostly_sold_off():
    s = liquidity_score(_group(active_count=2, removed_count=18))
    # ratio = 18/20 = 0.9 -> 90
    assert s.value >= 70


def test_demand_combines_deficit_and_liquidity():
    s = demand_score({}, deficit=80, liquidity=80)
    # 0.4*80 + 0.6*80 = 80
    assert 75 <= s.value <= 85


def test_prospect_includes_premium_bonus():
    a = prospect_score(_group(is_premium=False), 50, 50, 50)
    b = prospect_score(_group(is_premium=True), 50, 50, 50)
    assert b.value - a.value == 5


def test_is_premium_brand_known():
    assert is_premium_brand("BMW")
    assert is_premium_brand("Rolls-Royce")
    assert is_premium_brand("Porsche")
    assert not is_premium_brand("Kia")
    assert not is_premium_brand("Hyundai")
    assert not is_premium_brand(None)


def test_all_scores_clipped_to_0_100():
    s = deficit_score(_group(active_count=0, sellers_count=0, regions_count=0, has_capital_region=False))
    assert 0 <= s.value <= 100
    assert sum(c.value for c in s.components) >= 0

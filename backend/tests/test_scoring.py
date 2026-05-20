"""Tests for the multi-factor scoring model. Run: pytest backend/tests/"""
from app.scoring import (
    all_scores,
    arbitrage_score,
    capacity_score,
    classify_opportunity,
    deficit_score,
    grade_label,
    is_premium_brand,
    liquidity_score,
    price_spread_score,
    turnover_score,
)


def _agg(**overrides):
    base = {
        "active_count": 1,
        "removed_count": 0,
        "sellers_count": 1,
        "regions_count": 1,
        "has_capital_region": True,
        "is_premium": False,
        "avg_price": 3_000_000,
        "min_price": 3_000_000,
        "max_price": 3_000_000,
        "regional_prices": [],
        "model_total": 0,
    }
    base.update(overrides)
    return base


def test_grade_label_bands():
    assert grade_label(90) == "Очень высокий"
    assert grade_label(70) == "Высокий"
    assert grade_label(50) == "Средний"
    assert grade_label(30) == "Низкий"
    assert grade_label(10) == "Очень низкий"


def test_deficit_high_when_few_listings():
    s = deficit_score(_agg(active_count=1, sellers_count=1, regions_count=1))
    assert s.value >= 75
    assert s.grade in ("Высокий", "Очень высокий")


def test_deficit_low_when_market_saturated():
    s = deficit_score(_agg(active_count=200, sellers_count=100, regions_count=80))
    assert s.value < 25


def test_liquidity_zero_without_removed():
    s = liquidity_score(_agg(active_count=10, removed_count=0))
    assert s.value == 0


def test_liquidity_high_when_mostly_sold():
    s = liquidity_score(_agg(active_count=2, removed_count=18))
    assert s.value >= 70


def test_turnover_scales_with_removed():
    low = turnover_score(_agg(removed_count=2))
    high = turnover_score(_agg(removed_count=200))
    assert high.value > low.value
    assert turnover_score(_agg(removed_count=0)).value == 0


def test_capacity_grows_with_volume():
    small = capacity_score(_agg(active_count=2, removed_count=1))
    big = capacity_score(_agg(active_count=300, removed_count=300))
    assert big.value > small.value


def test_price_spread_detects_wide_range():
    narrow = price_spread_score(_agg(min_price=3_000_000, max_price=3_100_000, avg_price=3_050_000))
    wide = price_spread_score(_agg(min_price=2_000_000, max_price=8_000_000, avg_price=5_000_000))
    assert wide.value > narrow.value


def test_arbitrage_needs_two_regions():
    one = arbitrage_score(_agg(regional_prices=[("Москва", 5_000_000, 3)]))
    assert one.value == 0
    two = arbitrage_score(_agg(
        avg_price=5_000_000,
        regional_prices=[("Москва", 6_000_000, 3), ("Владивосток", 4_000_000, 2)],
    ))
    assert two.value > 0


def test_velocity_unavailable_without_history():
    s = all_scores(_agg())["velocity"]
    assert s["available"] is False
    assert s["grade"] == "Нет данных"


def test_classify_mass_market():
    # модель в целом широко представлена (model_total большой)
    t = classify_opportunity(_agg(active_count=150, removed_count=120, model_total=250),
                             deficit=20, liquidity=60, turnover=70,
                             capacity=80, spread=40, arbitrage=20)
    assert t == "mass_liquid"


def test_classify_arbitrage_wins():
    t = classify_opportunity(_agg(active_count=10, removed_count=5),
                             deficit=70, liquidity=30, turnover=30,
                             capacity=40, spread=20, arbitrage=60)
    assert t == "arbitrage"


def test_classify_never_illiquid_on_single_snapshot():
    # «Неликвид» не выдаётся без истории — даже при нулевой ликвидности
    t = classify_opportunity(_agg(active_count=20, removed_count=2),
                             deficit=40, liquidity=5, turnover=5,
                             capacity=30, spread=10, arbitrage=0)
    assert t not in ("illiquid", "oversaturated")


def test_classify_niche_deficit():
    t = classify_opportunity(_agg(active_count=2, removed_count=1),
                             deficit=70, liquidity=45, turnover=30,
                             capacity=30, spread=20, arbitrage=10)
    assert t == "niche_deficit"


def test_all_scores_has_full_bundle():
    s = all_scores(_agg(active_count=3, removed_count=5))
    for key in ("deficit", "liquidity", "turnover", "capacity", "price_spread",
                "arbitrage", "velocity", "trend", "demand", "attractiveness"):
        assert key in s
        assert 0 <= s[key]["value"] <= 100
    assert "opportunity" in s
    assert s["opportunity"]["key"] in (
        "niche_deficit", "mass_liquid", "arbitrage", "moderate", "illiquid", "oversaturated"
    )


def test_is_premium_brand():
    assert is_premium_brand("BMW")
    assert is_premium_brand("Rolls-Royce")
    assert not is_premium_brand("Kia")
    assert not is_premium_brand(None)

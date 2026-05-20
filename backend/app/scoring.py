"""
Scoring functions for car groups (mark, model, generation, configuration).

All metrics are 0-100. Each returns a structure with the final score plus
a breakdown (list of named components) so the UI can show the user
exactly how the score was assembled — никакого 'мы так решили'.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any


@dataclass
class ScoreComponent:
    label: str
    value: float
    explain: str


@dataclass
class Score:
    name: str
    value: int
    formula: str
    components: list[ScoreComponent]
    interpretation: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "value": self.value,
            "formula": self.formula,
            "components": [asdict(c) for c in self.components],
            "interpretation": self.interpretation,
        }


def _clip(x: float, lo: float = 0, hi: float = 100) -> int:
    return int(max(lo, min(hi, x)))


def deficit_score(agg: dict[str, Any]) -> Score:
    """
    Дефицит — сколько предложений вообще есть на рынке у этой группы.
    Шкала 0-100. Чем меньше предложений/продавцов/регионов — тем выше.
    """
    listings = agg["active_count"]
    sellers = agg["sellers_count"]
    regions = agg["regions_count"]
    has_capital = agg["has_capital_region"]

    c_listings = max(0, 40 - listings * 0.4)
    c_sellers = max(0, 25 - sellers * 0.5)
    c_regions = max(0, 20 - regions * 0.4)
    c_geo_bonus = 15 if not has_capital and listings > 0 else 0

    total = c_listings + c_sellers + c_regions + c_geo_bonus
    value = _clip(total)

    if value >= 75:
        interp = "Критический дефицит: предложений почти нет."
    elif value >= 50:
        interp = "Высокий дефицит."
    elif value >= 25:
        interp = "Средний уровень предложения."
    else:
        interp = "Рынок насыщен — предложений много."

    return Score(
        name="Дефицит",
        value=value,
        formula="40·f(listings) + 25·f(sellers) + 20·f(regions) + 15·(нет столиц)",
        components=[
            ScoreComponent("Объявлений", round(c_listings, 1), f"активных {listings}"),
            ScoreComponent("Продавцов", round(c_sellers, 1), f"уникальных {sellers}"),
            ScoreComponent("Регионов", round(c_regions, 1), f"присутствие в {regions} регионах"),
            ScoreComponent("Экзотика", round(c_geo_bonus, 1), "нет в Москве и СПб" if c_geo_bonus else "представлен в столицах"),
        ],
        interpretation=interp,
    )


def liquidity_score(agg: dict[str, Any]) -> Score:
    """
    Ликвидность — как быстро уходит с рынка.

    Считается на доле снятых объявлений среди всех (active + removed).
    Без истории по дням точную скорость продажи мы не знаем, но
    доля 'ушло из активных в архив' уже хороший прокси: если у модели
    много removed и мало active — значит уходит хорошо.
    """
    active = agg["active_count"]
    removed = agg["removed_count"]
    total = active + removed

    if total == 0:
        ratio = 0.0
        value = 0
    else:
        ratio = removed / total  # 0..1
        value = _clip(ratio * 100)

    base_component = round(ratio * 100, 1)

    if value >= 70:
        interp = "Высокая ликвидность: большая доля объявлений уже ушла с рынка."
    elif value >= 40:
        interp = "Средняя ликвидность."
    elif value > 0:
        interp = "Низкая ликвидность: уходит медленно."
    else:
        interp = "Нет данных об ушедших объявлениях."

    return Score(
        name="Ликвидность",
        value=value,
        formula="removed / (active + removed) · 100",
        components=[
            ScoreComponent("Доля снятых", base_component, f"removed={removed}, active={active}"),
        ],
        interpretation=interp,
    )


def demand_score(agg: dict[str, Any], deficit: int, liquidity: int) -> Score:
    """
    Спрос — производная метрика: дефицит + быстро уходят + цена не падает.
    Когда есть история цены, добавим price-stability компонент.
    """
    c_deficit = deficit * 0.4
    c_liquidity = liquidity * 0.6
    value = _clip(c_deficit + c_liquidity)

    if value >= 70:
        interp = "Высокий спрос: дефицитная модель быстро уходит."
    elif value >= 40:
        interp = "Средний спрос."
    else:
        interp = "Слабый спрос или нет данных."

    return Score(
        name="Спрос",
        value=value,
        formula="0.4·Дефицит + 0.6·Ликвидность",
        components=[
            ScoreComponent("От дефицита", round(c_deficit, 1), f"дефицит {deficit}"),
            ScoreComponent("От ликвидности", round(c_liquidity, 1), f"ликвидность {liquidity}"),
        ],
        interpretation=interp,
    )


def prospect_score(agg: dict[str, Any], deficit: int, liquidity: int, demand: int) -> Score:
    """
    Перспективность завоза — итоговая оценка.
    Среднее с весами + надбавка за премиальный сегмент.
    """
    premium_markup = 5 if agg["is_premium"] else 0
    base = deficit * 0.35 + liquidity * 0.3 + demand * 0.35
    value = _clip(base + premium_markup)

    if value >= 75:
        interp = "Сильная возможность — высокий дефицит и спрос, ликвидно уходит."
    elif value >= 50:
        interp = "Заслуживает внимания."
    elif value >= 25:
        interp = "Слабая возможность."
    else:
        interp = "Не интересно для завоза."

    return Score(
        name="Перспективность",
        value=value,
        formula="0.35·Дефицит + 0.3·Ликвидность + 0.35·Спрос + 5·(премиум)",
        components=[
            ScoreComponent("Дефицит·0.35", round(deficit * 0.35, 1), ""),
            ScoreComponent("Ликвидность·0.3", round(liquidity * 0.3, 1), ""),
            ScoreComponent("Спрос·0.35", round(demand * 0.35, 1), ""),
            ScoreComponent("Премиум-надбавка", float(premium_markup), "+5 если бренд из премиальных"),
        ],
        interpretation=interp,
    )


def all_scores(agg: dict[str, Any]) -> dict[str, dict[str, Any]]:
    d = deficit_score(agg)
    l = liquidity_score(agg)
    de = demand_score(agg, d.value, l.value)
    p = prospect_score(agg, d.value, l.value, de.value)
    return {
        "deficit": d.to_dict(),
        "liquidity": l.to_dict(),
        "demand": de.to_dict(),
        "prospect": p.to_dict(),
    }


# ---- Helpers --------------------------------------------------------------

PREMIUM_BRANDS = {
    "Rolls-Royce", "Bentley", "Lamborghini", "Ferrari", "Maserati",
    "Aston Martin", "McLaren", "Bugatti", "Pagani", "Porsche",
    "Mercedes-Benz", "BMW", "Audi", "Lexus", "Genesis",
    "Range Rover", "Land Rover", "Jaguar", "Cadillac", "Maybach",
    "Hongqi", "Voyah", "Zeekr",
}


def is_premium_brand(mark: str | None) -> bool:
    if not mark:
        return False
    return mark in PREMIUM_BRANDS

"""
Многофакторная оценка групп автомобилей для решения «что выгодно везти».

Идея: «редкое» — НЕ цель. Цель — заработать. Заработать можно по-разному:
нишевый дефицит (маржа на эксклюзиве) ИЛИ массовый ликвид (объём, как X5/
Range Rover) ИЛИ ценовой арбитраж между регионами. Поэтому модель считает
9 независимых метрик, а затем классифицирует ТИП возможности и даёт общий
балл «Привлекательность».

Каждая метрика 0-100, с прозрачной формулой, словесной оценкой и breakdown.

velocity (скорость продаж) и trend требуют истории ежедневных снимков —
пока данных нет, они помечаются «Нет данных» и не штрафуют общий балл.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, asdict, field
from typing import Any


# --------------------------------------------------------------------------
# Словесные градации
# --------------------------------------------------------------------------

def grade_label(value: int) -> str:
    if value >= 81:
        return "Очень высокий"
    if value >= 61:
        return "Высокий"
    if value >= 41:
        return "Средний"
    if value >= 21:
        return "Низкий"
    return "Очень низкий"


def grade_color(value: int) -> str:
    if value >= 61:
        return "green"
    if value >= 41:
        return "yellow"
    if value >= 21:
        return "slate"
    return "gray"


# --------------------------------------------------------------------------
# Определения метрик — выводятся в легенде интерфейса
# --------------------------------------------------------------------------

METRIC_DEFINITIONS: dict[str, dict[str, str]] = {
    "deficit": {
        "title": "Дефицит",
        "short": "Насколько мало модели на рынке",
        "full": "Оценивает, насколько узкое предложение: мало активных объявлений, "
                "мало продавцов, узкая география. Высокий дефицит = свободная ниша, "
                "низкая конкуренция за покупателя.",
    },
    "liquidity": {
        "title": "Ликвидность",
        "short": "Насколько активно модель уходит с рынка",
        "full": "Доля объявлений, которые уже сняты (проданы/убраны), от общего числа. "
                "Высокая ликвидность = модель реально покупают, а не она стоит мёртвым грузом.",
    },
    "turnover": {
        "title": "Оборот",
        "short": "Сколько штук уходит с рынка в абсолюте",
        "full": "Абсолютный объём снятых объявлений. Показывает масштаб рынка: "
                "большой оборот = можно продавать много единиц подряд, низкий риск зависнуть.",
    },
    "capacity": {
        "title": "Ёмкость рынка",
        "short": "Общий объём модели на рынке",
        "full": "Сколько всего объявлений прошло через рынок (активные + снятые). "
                "Большая ёмкость = есть куда лить объём, маленькая = ниша быстро упрётся в потолок.",
    },
    "price_spread": {
        "title": "Ценовой спред",
        "short": "Разброс цен на одну и ту же модель",
        "full": "Насколько широко разбросаны цены внутри группы (между минимумом и "
                "максимумом). Большой спред = есть пространство для маржи: купить ниже рынка, "
                "продать выше.",
    },
    "arbitrage": {
        "title": "Региональный арбитраж",
        "short": "Разница цен между регионами",
        "full": "Насколько отличается средняя цена модели между регионами. Высокий "
                "арбитраж = прямая возможность: купить дешевле в одном регионе, продать "
                "дороже в другом.",
    },
    "velocity": {
        "title": "Скорость продаж",
        "short": "За сколько дней модель находит покупателя",
        "full": "Среднее время жизни объявления — от появления до снятия. Требует "
                "накопления ежедневной истории, поэтому пока недоступна.",
    },
    "trend": {
        "title": "Тренд",
        "short": "Растёт или падает рынок модели",
        "full": "Динамика количества объявлений и цены за период. Требует истории "
                "ежедневных снимков, поэтому пока недоступна.",
    },
    "demand": {
        "title": "Спрос",
        "short": "Производная оценка востребованности",
        "full": "Сводная метрика востребованности: сочетает ликвидность, оборот и "
                "дефицит. Высокий спрос = модель горячая.",
    },
    "attractiveness": {
        "title": "Привлекательность к завозу",
        "short": "Итоговая оценка — стоит ли везти",
        "full": "Главный балл. Складывается из ликвидности, спроса, потенциала маржи "
                "(спред/арбитраж), дефицита и оборота. Не наказывает модель за то, что "
                "её много на рынке — массовый ликвид так же ценен, как редкая ниша.",
    },
}


# --------------------------------------------------------------------------
# Типы возможностей
# --------------------------------------------------------------------------

OPPORTUNITY_TYPES: dict[str, dict[str, str]] = {
    "niche_deficit": {
        "title": "Нишевый дефицит",
        "desc": "Модели мало, но её покупают. Маржа в эксклюзивности. "
                "Завоз точечный, под конкретного покупателя.",
    },
    "mass_liquid": {
        "title": "Массовый рынок",
        "desc": "Модель широко представлена на рынке (как BMW X5, Range Rover). "
                "Маржа на обороте и объёме, риск зависнуть низкий. Когда накопится "
                "история продаж — уточним, насколько быстро она уходит.",
    },
    "arbitrage": {
        "title": "Ценовой арбитраж",
        "desc": "Сильная разница цен между регионами. Заработок на перепродаже "
                "из дешёвого региона в дорогой.",
    },
    "moderate": {
        "title": "Умеренная возможность",
        "desc": "Структура рынка без яркого преимущества. Возможна работа, "
                "но без явного козыря.",
    },
    "illiquid": {
        "title": "Неликвид",
        "desc": "Модель редкая, но почти не покупается — стоит мёртвым грузом. "
                "Определяется по истории продаж — появится, когда накопятся "
                "ежедневные снимки.",
    },
    "oversaturated": {
        "title": "Перенасыщенный рынок",
        "desc": "Предложений много, уходят плохо, маржи нет — демпинг. "
                "Определяется по истории продаж — появится, когда накопятся "
                "ежедневные снимки.",
    },
}


# --------------------------------------------------------------------------
# Структуры
# --------------------------------------------------------------------------

@dataclass
class ScoreComponent:
    label: str
    value: float
    explain: str


@dataclass
class Score:
    key: str
    name: str
    value: int
    grade: str
    color: str
    available: bool
    formula: str
    components: list[ScoreComponent]
    interpretation: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "key": self.key,
            "name": self.name,
            "value": self.value,
            "grade": self.grade,
            "color": self.color,
            "available": self.available,
            "formula": self.formula,
            "components": [asdict(c) for c in self.components],
            "interpretation": self.interpretation,
        }


def _clip(x: float, lo: float = 0, hi: float = 100) -> int:
    return int(round(max(lo, min(hi, x))))


def _score(key: str, value: int, formula: str, components: list[ScoreComponent],
           interpretation: str, available: bool = True) -> Score:
    return Score(
        key=key,
        name=METRIC_DEFINITIONS[key]["title"],
        value=value if available else 0,
        grade=grade_label(value) if available else "Нет данных",
        color=grade_color(value) if available else "gray",
        available=available,
        formula=formula,
        components=components,
        interpretation=interpretation,
    )


# --------------------------------------------------------------------------
# Метрики
# --------------------------------------------------------------------------

def deficit_score(agg: dict[str, Any]) -> Score:
    listings = agg["active_count"]
    sellers = agg["sellers_count"]
    regions = agg["regions_count"]
    has_capital = agg["has_capital_region"]

    c_listings = max(0.0, 40 - listings * 0.4)
    c_sellers = max(0.0, 25 - sellers * 0.6)
    c_regions = max(0.0, 20 - regions * 0.5)
    c_geo = 15.0 if (not has_capital and listings > 0) else 0.0
    value = _clip(c_listings + c_sellers + c_regions + c_geo)

    interp = {
        4: "Критический дефицit — модели почти нет на рынке.",
        3: "Высокий дефицит предложения.",
        2: "Умеренное предложение.",
        1: "Рынок насыщен предложениями.",
        0: "Предложений очень много.",
    }[min(4, value // 21)]

    return _score(
        "deficit", value,
        "40·f(объявления) + 25·f(продавцы) + 20·f(регионы) + 15·(нет столиц)",
        [
            ScoreComponent("Объявлений", round(c_listings, 1), f"активных {listings}"),
            ScoreComponent("Продавцов", round(c_sellers, 1), f"уникальных {sellers}"),
            ScoreComponent("Регионов", round(c_regions, 1), f"в {regions} регионах"),
            ScoreComponent("Экзотика", round(c_geo, 1),
                           "нет в Москве и СПб" if c_geo else "есть в столицах"),
        ],
        interp,
    )


def liquidity_score(agg: dict[str, Any]) -> Score:
    active = agg["active_count"]
    removed = agg["removed_count"]
    total = active + removed
    ratio = (removed / total) if total else 0.0
    value = _clip(ratio * 100)

    if total == 0:
        interp = "Нет данных об объявлениях."
    elif value >= 70:
        interp = "Высокая ликвидность — большая часть объявлений уже ушла с рынка."
    elif value >= 40:
        interp = "Средняя ликвидность."
    elif value > 0:
        interp = "Низкая ликвидность — уходит медленно."
    else:
        interp = "Снятых объявлений нет — спрос не подтверждён."

    return _score(
        "liquidity", value,
        "снятые / (активные + снятые) · 100",
        [ScoreComponent("Доля снятых", round(ratio * 100, 1),
                        f"снято {removed}, активно {active}")],
        interp,
    )


def turnover_score(agg: dict[str, Any]) -> Score:
    removed = agg["removed_count"]
    # Логарифмическая шкала: 1→0, 10→45, 100→90, 300+→100
    value = _clip(45 * math.log10(removed + 1)) if removed > 0 else 0

    if value >= 70:
        interp = "Большой оборот — модель уходит десятками, рынок живой."
    elif value >= 40:
        interp = "Умеренный оборот."
    elif value > 0:
        interp = "Небольшой оборот."
    else:
        interp = "Оборота нет — снятых объявлений не зафиксировано."

    return _score(
        "turnover", value,
        "45 · log₁₀(снятые + 1)",
        [ScoreComponent("Снято всего", float(removed), f"{removed} объявлений ушло с рынка")],
        interp,
    )


def capacity_score(agg: dict[str, Any]) -> Score:
    total = agg["active_count"] + agg["removed_count"]
    value = _clip(40 * math.log10(total + 1)) if total > 0 else 0

    if value >= 70:
        interp = "Большой рынок — есть куда лить объём."
    elif value >= 40:
        interp = "Средняя ёмкость рынка."
    else:
        interp = "Узкий рынок — потолок объёма низкий."

    return _score(
        "capacity", value,
        "40 · log₁₀(активные + снятые + 1)",
        [ScoreComponent("Объём рынка", float(total),
                        f"{total} объявлений всего (активные + снятые)")],
        interp,
    )


def price_spread_score(agg: dict[str, Any]) -> Score:
    mn = agg.get("min_price") or 0
    mx = agg.get("max_price") or 0
    avg = agg.get("avg_price") or 0

    if avg > 0 and mx > mn:
        spread_ratio = (mx - mn) / avg
        value = _clip(spread_ratio * 100)
    else:
        spread_ratio = 0.0
        value = 0

    if value >= 60:
        interp = "Большой разброс цен — пространство для маржи широкое."
    elif value >= 30:
        interp = "Умеренный разброс цен."
    elif value > 0:
        interp = "Цены плотные — заработать на разнице сложно."
    else:
        interp = "Недостаточно данных о ценах."

    def _m(v: int) -> str:
        return f"{v/1_000_000:.1f}M" if v else "—"

    return _score(
        "price_spread", value,
        "(макс − мин) / средняя · 100",
        [ScoreComponent("Размах", round(spread_ratio * 100, 1),
                        f"от {_m(mn)} до {_m(mx)} ₽, средняя {_m(avg)}")],
        interp,
    )


def arbitrage_score(agg: dict[str, Any]) -> Score:
    # regional_prices: list of (region, avg_price, count)
    regional = agg.get("regional_prices") or []
    priced = [(r, p) for (r, p, c) in regional if p and p > 0]
    overall = agg.get("avg_price") or 0

    if len(priced) >= 2 and overall > 0:
        prices = [p for (_, p) in priced]
        rmax, rmin = max(prices), min(prices)
        arb_ratio = (rmax - rmin) / overall
        value = _clip(arb_ratio * 120)
        hi_region = max(priced, key=lambda x: x[1])[0]
        lo_region = min(priced, key=lambda x: x[1])[0]
        explain = f"{lo_region} дешевле, {hi_region} дороже на {(rmax-rmin)/1_000_000:.1f}M ₽"
    else:
        value = 0
        explain = "модель представлена в одном регионе — арбитража нет"
        arb_ratio = 0.0

    if value >= 60:
        interp = "Сильная разница цен между регионами — прямая возможность перепродажи."
    elif value >= 30:
        interp = "Заметная региональная разница цен."
    elif value > 0:
        interp = "Небольшая региональная разница."
    else:
        interp = "Арбитраж не просматривается."

    return _score(
        "arbitrage", value,
        "(макс − мин по регионам) / средняя · 120",
        [ScoreComponent("Разница регионов", round(arb_ratio * 120, 1), explain)],
        interp,
    )


def velocity_score(agg: dict[str, Any]) -> Score:
    # Требует истории снимков. agg["velocity_days"] появится позже.
    days = agg.get("velocity_days")
    if days is None:
        return _score(
            "velocity", 0,
            "f(среднее время жизни объявления)",
            [ScoreComponent("Статус", 0.0, "нужна история ежедневных снимков")],
            "Скорость продаж станет доступна, когда накопится история снимков.",
            available=False,
        )
    # 0 дней → 100, 90+ дней → 0
    value = _clip(100 - days * 1.1)
    return _score(
        "velocity", value,
        "100 − среднее_дней_до_снятия · 1.1",
        [ScoreComponent("Дней до снятия", float(days), f"медианно {days} дней на рынке")],
        f"Модель в среднем находит покупателя за {days} дней.",
    )


def trend_score(agg: dict[str, Any]) -> Score:
    delta = agg.get("trend_delta")
    if delta is None:
        return _score(
            "trend", 0,
            "f(динамика количества и цены)",
            [ScoreComponent("Статус", 0.0, "нужна история ежедневных снимков")],
            "Тренд станет доступен, когда накопится история снимков.",
            available=False,
        )
    value = _clip(50 + delta * 50)
    return _score(
        "trend", value,
        "50 + нормализованная_динамика · 50",
        [ScoreComponent("Динамика", round(delta * 50, 1), "изменение за период")],
        "Рынок модели растёт." if value >= 55 else
        "Рынок модели падает." if value < 45 else "Рынок модели стабилен.",
    )


def demand_score(agg: dict[str, Any], liquidity: int, turnover: int,
                 deficit: int, velocity: Score) -> Score:
    # velocity входит в спрос только когда доступен
    if velocity.available:
        c_liq = liquidity * 0.35
        c_turn = turnover * 0.2
        c_def = deficit * 0.15
        c_vel = velocity.value * 0.3
        comps = [
            ScoreComponent("От ликвидности", round(c_liq, 1), f"ликвидность {liquidity}"),
            ScoreComponent("От оборота", round(c_turn, 1), f"оборот {turnover}"),
            ScoreComponent("От дефицита", round(c_def, 1), f"дефицит {deficit}"),
            ScoreComponent("От скорости", round(c_vel, 1), f"скорость {velocity.value}"),
        ]
        formula = "0.35·Ликвидность + 0.2·Оборот + 0.15·Дефицит + 0.3·Скорость"
        value = _clip(c_liq + c_turn + c_def + c_vel)
    else:
        c_liq = liquidity * 0.5
        c_turn = turnover * 0.3
        c_def = deficit * 0.2
        comps = [
            ScoreComponent("От ликвидности", round(c_liq, 1), f"ликвидность {liquidity}"),
            ScoreComponent("От оборота", round(c_turn, 1), f"оборот {turnover}"),
            ScoreComponent("От дефицита", round(c_def, 1), f"дефицит {deficit}"),
        ]
        formula = "0.5·Ликвидность + 0.3·Оборот + 0.2·Дефицит (скорость недоступна)"
        value = _clip(c_liq + c_turn + c_def)

    interp = ("Высокий спрос — модель горячая." if value >= 65 else
              "Средний спрос." if value >= 40 else "Слабый спрос.")
    return _score("demand", value, formula, comps, interp)


# --------------------------------------------------------------------------
# Классификатор типа возможности + итоговый балл
# --------------------------------------------------------------------------

def classify_opportunity(agg: dict[str, Any], deficit: int, liquidity: int,
                         turnover: int, capacity: int, spread: int,
                         arbitrage: int) -> str:
    """
    Классификатор типа возможности — на ОДНОМ снимке.

    Принцип честности: на одном срезе достоверны только структурные метрики —
    дефицит (сколько модели на рынке), ёмкость, ценовой спред, арбитраж.
    А «покупается / не покупается» (ликвидность) достоверно видно лишь по
    истории: появилось объявление → через сколько дней исчезло. Поэтому
    «Неликвид» и «Перенасыщенный рынок» НЕ выдаются до накопления истории —
    иначе классификатор клеймит модели по шуму в данных.

    На одном снимке возможны 4 типа: арбитраж, массовый рынок, нишевый
    дефицит, умеренная возможность.
    """
    # «Массовость» — свойство модели в целом (все поколения), а не узкой
    # группы. model_total = сколько всего этой модели на рынке.
    model_total = agg.get("model_total", 0) or 0

    # 1. Ценовой арбитраж — надёжен и на одном снимке (цены по регионам)
    if arbitrage >= 50:
        return "arbitrage"

    # 2. Массовый рынок — модель в целом широко представлена
    if model_total >= 40:
        return "mass_liquid"

    # 3. Нишевый дефицит — модели на рынке мало и узкое предложение
    if deficit >= 50 or model_total <= 8:
        return "niche_deficit"

    # 4. Умеренная возможность — между массовым и нишевым
    return "moderate"


def attractiveness_score(agg: dict[str, Any], deficit: int, liquidity: int,
                         turnover: int, spread: int, arbitrage: int,
                         demand: int) -> Score:
    # Потенциал маржи = лучшее из «спред внутри группы» и «арбитраж между регионами»
    margin = max(spread, arbitrage)
    premium_bonus = 4 if agg.get("is_premium") else 0

    c_liq = liquidity * 0.28
    c_dem = demand * 0.22
    c_margin = margin * 0.20
    c_def = deficit * 0.15
    c_turn = turnover * 0.15
    value = _clip(c_liq + c_dem + c_margin + c_def + c_turn + premium_bonus)

    if value >= 70:
        interp = "Сильная возможность — заслуживает первоочередного внимания."
    elif value >= 50:
        interp = "Заслуживает внимания, стоит изучить детали."
    elif value >= 30:
        interp = "Слабая возможность."
    else:
        interp = "Малоинтересно для завоза."

    return _score(
        "attractiveness", value,
        "0.28·Ликвидность + 0.22·Спрос + 0.20·Маржа + 0.15·Дефицит + 0.15·Оборот + премиум",
        [
            ScoreComponent("Ликвидность·0.28", round(c_liq, 1), ""),
            ScoreComponent("Спрос·0.22", round(c_dem, 1), ""),
            ScoreComponent("Маржа·0.20", round(c_margin, 1),
                           f"лучшее из спреда ({spread}) и арбитража ({arbitrage})"),
            ScoreComponent("Дефицит·0.15", round(c_def, 1), ""),
            ScoreComponent("Оборот·0.15", round(c_turn, 1), ""),
            ScoreComponent("Премиум", float(premium_bonus),
                           "надбавка за премиальный бренд" if premium_bonus else "—"),
        ],
        interp,
    )


# --------------------------------------------------------------------------
# Сборка
# --------------------------------------------------------------------------

def all_scores(agg: dict[str, Any]) -> dict[str, Any]:
    d = deficit_score(agg)
    liq = liquidity_score(agg)
    turn = turnover_score(agg)
    cap = capacity_score(agg)
    spread = price_spread_score(agg)
    arb = arbitrage_score(agg)
    vel = velocity_score(agg)
    tr = trend_score(agg)
    dem = demand_score(agg, liq.value, turn.value, d.value, vel)
    attr = attractiveness_score(agg, d.value, liq.value, turn.value,
                                spread.value, arb.value, dem.value)

    opp_key = classify_opportunity(agg, d.value, liq.value, turn.value,
                                   cap.value, spread.value, arb.value)
    opp = OPPORTUNITY_TYPES[opp_key]

    return {
        "deficit": d.to_dict(),
        "liquidity": liq.to_dict(),
        "turnover": turn.to_dict(),
        "capacity": cap.to_dict(),
        "price_spread": spread.to_dict(),
        "arbitrage": arb.to_dict(),
        "velocity": vel.to_dict(),
        "trend": tr.to_dict(),
        "demand": dem.to_dict(),
        "attractiveness": attr.to_dict(),
        "opportunity": {
            "key": opp_key,
            "title": opp["title"],
            "description": opp["desc"],
        },
    }


# --------------------------------------------------------------------------
# Бренды
# --------------------------------------------------------------------------

PREMIUM_BRANDS = {
    "Rolls-Royce", "Bentley", "Lamborghini", "Ferrari", "Maserati",
    "Aston Martin", "McLaren", "Bugatti", "Pagani", "Porsche",
    "Mercedes-Benz", "BMW", "Audi", "Lexus", "Genesis",
    "Range Rover", "Land Rover", "Jaguar", "Cadillac", "Maybach",
    "Hongqi", "Voyah", "Zeekr",
}


def is_premium_brand(mark: str | None) -> bool:
    return bool(mark) and mark in PREMIUM_BRANDS

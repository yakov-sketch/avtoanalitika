"""
Canonical names for regions and brands, so different spellings from
auto.ru / avito / drom collapse into one value.
"""
from __future__ import annotations

# Auto.ru gives "Москва и Московская область", avito gives just "Москва".
# We map both onto a single canonical name per actual administrative subject.
REGION_ALIASES: dict[str, str] = {
    "москва": "Москва",
    "москва и московская область": "Москва",
    "московская область": "Московская область",
    "санкт-петербург": "Санкт-Петербург",
    "санкт-петербург и ленинградская область": "Санкт-Петербург",
    "ленинградская область": "Ленинградская область",
}

# LADA / ВАЗ / Лада → one canonical value.
BRAND_ALIASES: dict[str, str] = {
    "lada (ваз)": "LADA",
    "lada (лада)": "LADA",
    "lada": "LADA",
    "ваз (lada)": "LADA",
    "ваз": "LADA",
    "лада": "LADA",
    "uaz": "УАЗ",
    "уаз": "УАЗ",
    "газ": "ГАЗ",
    "gaz": "ГАЗ",
}


def normalize_region(region: str | None) -> str | None:
    if not region:
        return None
    key = region.strip().lower()
    return REGION_ALIASES.get(key, region.strip())


def normalize_brand(mark: str | None) -> str | None:
    if not mark:
        return None
    key = mark.strip().lower()
    return BRAND_ALIASES.get(key, mark.strip())

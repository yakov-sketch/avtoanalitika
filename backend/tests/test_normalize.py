from app.normalize import normalize_brand, normalize_region


def test_normalize_brand_lada_variants():
    assert normalize_brand("LADA") == "LADA"
    assert normalize_brand("ВАЗ (LADA)") == "LADA"
    assert normalize_brand("Лада") == "LADA"
    assert normalize_brand("LADA (ВАЗ)") == "LADA"


def test_normalize_brand_unknown_passthrough():
    assert normalize_brand("Audi") == "Audi"
    assert normalize_brand("BMW") == "BMW"


def test_normalize_brand_none_safe():
    assert normalize_brand(None) is None
    assert normalize_brand("") is None


def test_normalize_region_moscow_variants():
    assert normalize_region("Москва") == "Москва"
    assert normalize_region("Москва и Московская область") == "Москва"


def test_normalize_region_spb_variants():
    assert normalize_region("Санкт-Петербург") == "Санкт-Петербург"
    assert normalize_region("Санкт-Петербург и Ленинградская область") == "Санкт-Петербург"


def test_normalize_region_unknown_passthrough():
    assert normalize_region("Краснодарский край") == "Краснодарский край"

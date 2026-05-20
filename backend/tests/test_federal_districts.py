from app.federal_districts import ALL_DISTRICTS, district_of


def test_known_subjects_map_to_districts():
    assert district_of("Москва") == "Центральный"
    assert district_of("Санкт-Петербург") == "Северо-Западный"
    assert district_of("Краснодарский край") == "Южный"
    assert district_of("Свердловская область") == "Уральский"
    assert district_of("Приморский край") == "Дальневосточный"


def test_unknown_returns_none():
    assert district_of("Unknown Land") is None
    assert district_of(None) is None
    assert district_of("") is None


def test_eight_federal_districts():
    assert len(ALL_DISTRICTS) == 8

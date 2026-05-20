from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ScoreComponent(CamelModel):
    label: str
    value: float
    explain: str


class Score(CamelModel):
    name: str
    value: int = Field(ge=0, le=100)
    formula: str
    components: list[ScoreComponent]
    interpretation: str


class ScoresBundle(CamelModel):
    deficit: Score
    liquidity: Score
    demand: Score
    prospect: Score


class CarGroup(CamelModel):
    id: str
    mark: str
    model: str
    generation: str | None = None
    configuration: str | None = None
    full_name: str
    active_count: int
    removed_count: int
    avg_price: int | None = None
    min_price: int | None = None
    max_price: int | None = None
    sellers_count: int
    regions_count: int
    regions_present: list[str]
    districts_present: list[str]
    districts_missing: list[str]
    platforms: list[str]
    sections: list[str] = []
    min_year: int | None = None
    max_year: int | None = None
    is_premium: bool
    scores: ScoresBundle


class Listing(CamelModel):
    id: int
    inner_id: str
    platform: str
    status: str
    mark: str | None = None
    model: str | None = None
    generation: str | None = None
    configuration: str | None = None
    complectation: str | None = None
    body_type: str | None = None
    year: int | None = None
    price_rub: int | None = None
    km_age: int | None = None
    engine_type: str | None = None
    displacement: float | None = None
    horse_power: int | None = None
    transmission: str | None = None
    drive_type: str | None = None
    color: str | None = None
    wheel: str | None = None
    section: str | None = None
    condition: str | None = None
    owners_count: int | None = None
    no_accidents: str | None = None
    seller: str | None = None
    seller_type: str | None = None
    region: str | None = None
    city: str | None = None
    address: str | None = None
    district: str | None = None
    url: str | None = None
    seller_url: str | None = None
    vin: str | None = None
    pts: str | None = None
    custom: str | None = None
    in_stock: str | None = None
    state_not_beaten: str | None = None
    price_usd: int | None = None
    price_eur: int | None = None
    offer_updated_at: str | None = None
    image_urls: str | None = None
    options: str | None = None
    description: str | None = None


class MarketTotals(CamelModel):
    total_listings: int
    new_cars: int
    under_one_year: int
    rare_models: int
    total_groups: int = 0


class PlatformRegionStat(CamelModel):
    name: str
    value: float


class PlatformAnalytics(CamelModel):
    id: str
    total_listings: int
    new_cars: int
    under_one_year: int
    rare_models: int
    avg_price: int
    regions: list[PlatformRegionStat]
    top_brands: list[str]
    commentary: str


class RegionPlatformStat(CamelModel):
    id: str
    count: int


class RegionCityStat(CamelModel):
    name: str
    count: int


class RegionSectionStat(CamelModel):
    name: str
    count: int


class RegionAnalytics(CamelModel):
    id: str
    district: str | None = None
    total_listings: int
    avg_price: int
    competition: Literal["Низкая", "Средняя", "Высокая"]
    popular_models: list[str]
    deficit_models: list[str]
    recommendation: str
    top_platforms: list[RegionPlatformStat] = []
    top_cities: list[RegionCityStat] = []
    sections: list[RegionSectionStat] = []
    avg_year: int | None = None
    avg_km: int | None = None


class OverviewResponse(CamelModel):
    totals: MarketTotals
    platforms: list[PlatformAnalytics]
    rare_preview: list[CarGroup]
    snapshot_date: str | None = None
    districts: list[str]


class SearchMetadata(CamelModel):
    platforms: list[str]
    brands: list[str]
    body_types: list[str]
    districts: list[str]
    regions: list[str]


class SearchFilters(CamelModel):
    platform: str | None = None
    brand: str | None = None
    model: str | None = None
    body_type: str | None = None
    region: str | None = None
    district: str | None = None
    section: str | None = None
    price_from: int | None = None
    price_to: int | None = None
    year_from: int | None = None
    year_to: int | None = None
    listings_from: int | None = None
    listings_to: int | None = None
    rare_only: bool = False
    premium_only: bool = False
    sort: str = "prospect"


class SearchResponse(CamelModel):
    filters: SearchFilters
    total: int
    items: list[CarGroup]


class PipelineItem(CamelModel):
    id: int
    entity_type: str
    entity_id: str
    entity_url: str | None = None
    label: str | None = None
    status: str
    note: str | None = None
    created_at: str
    updated_at: str


class PipelineUpsert(CamelModel):
    entity_type: str
    entity_id: str
    entity_url: str | None = None
    status: str
    label: str | None = None
    note: str | None = None


class UniversalSearchResponse(CamelModel):
    groups: list[CarGroup]
    regions: list[str]
    platforms: list[str]
    brands: list[str]

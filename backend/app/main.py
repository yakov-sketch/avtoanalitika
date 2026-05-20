from __future__ import annotations

import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

_SENTRY_DSN = os.environ.get("SENTRY_DSN")
if _SENTRY_DSN:
    try:
        import sentry_sdk
        sentry_sdk.init(dsn=_SENTRY_DSN, traces_sample_rate=0.1)
    except ImportError:
        pass  # sentry-sdk not installed; skip silently

from . import pipeline, services
from .db import get_conn, init_schema
from .seed import seed_if_empty
from .schemas import (
    CarGroup,
    GlossaryResponse,
    Listing,
    OverviewResponse,
    PipelineItem,
    PipelineUpsert,
    PlatformAnalytics,
    RegionAnalytics,
    SearchFilters,
    SearchMetadata,
    SearchResponse,
    UniversalSearchResponse,
)
from .scoring import METRIC_DEFINITIONS, OPPORTUNITY_TYPES

app = FastAPI(
    title="Rovena Analytics API",
    version="0.2.0",
    description="API для аналитики авто-объявлений (auto.ru / avito / drom).",
)

_cors_env = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001",
)
_cors_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    init_schema()
    seed_if_empty()


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/status")
def status_info() -> dict[str, object]:
    conn = get_conn()
    try:
        listings = conn.execute("SELECT COUNT(*) FROM listings").fetchone()[0]
        active = conn.execute("SELECT COUNT(*) FROM listings WHERE status='active'").fetchone()[0]
        snapshot = conn.execute("SELECT value FROM meta WHERE key='last_snapshot'").fetchone()
        pipeline_n = conn.execute("SELECT COUNT(*) FROM pipeline").fetchone()[0]
    finally:
        conn.close()
    return {
        "status": "ok",
        "listings_total": listings,
        "listings_active": active,
        "last_snapshot": snapshot[0] if snapshot else None,
        "pipeline_items": pipeline_n,
    }


@app.get("/api/v1/pipeline", response_model=list[PipelineItem])
def pipeline_list(status: str | None = None) -> list[PipelineItem]:
    return [PipelineItem(**p) for p in pipeline.list_all(status)]


@app.post("/api/v1/pipeline", response_model=PipelineItem)
def pipeline_upsert(body: PipelineUpsert) -> PipelineItem:
    item = pipeline.upsert(
        body.entity_type,
        body.entity_id,
        body.status,
        body.label,
        body.note,
        entity_url=body.entity_url,
    )
    return PipelineItem(**item)


@app.delete("/api/v1/pipeline/{entity_type}/{entity_id}")
def pipeline_delete(entity_type: str, entity_id: str) -> dict[str, str]:
    pipeline.remove(entity_type, entity_id)
    return {"status": "deleted"}


@app.get("/api/v1/search-everything", response_model=UniversalSearchResponse)
def universal_search(q: str = Query(min_length=1, max_length=80)) -> UniversalSearchResponse:
    return UniversalSearchResponse(**services.universal_search(q))


@app.get("/api/v1/overview", response_model=OverviewResponse)
def overview() -> OverviewResponse:
    return OverviewResponse(**services.overview())


@app.get("/api/v1/rare-models", response_model=SearchResponse)
def rare_models(
    platform: str | None = None,
    brand: str | None = None,
    model: str | None = None,
    body_type: str | None = None,
    region: str | None = None,
    district: str | None = None,
    section: str | None = None,
    price_from: int | None = Query(default=None, ge=0),
    price_to: int | None = Query(default=None, ge=0),
    year_from: int | None = Query(default=None, ge=1990, le=2035),
    year_to: int | None = Query(default=None, ge=1990, le=2035),
    listings_from: int | None = Query(default=None, ge=0),
    listings_to: int | None = Query(default=None, ge=0),
    rare_only: bool = False,
    premium_only: bool = False,
    sort: str = Query(default="attractiveness", pattern="^(attractiveness|deficit|liquidity|demand|turnover|price_asc|price_desc)$"),
) -> SearchResponse:
    filters = SearchFilters(
        platform=platform, brand=brand, model=model, body_type=body_type,
        region=region, district=district, section=section,
        price_from=price_from, price_to=price_to,
        year_from=year_from, year_to=year_to,
        listings_from=listings_from, listings_to=listings_to,
        rare_only=rare_only, premium_only=premium_only, sort=sort,
    )
    items = services.search(filters.model_dump())
    return SearchResponse(filters=filters, total=len(items), items=[CarGroup(**i) for i in items])


@app.post("/api/v1/search", response_model=SearchResponse)
def search(filters: SearchFilters) -> SearchResponse:
    items = services.search(filters.model_dump())
    return SearchResponse(filters=filters, total=len(items), items=[CarGroup(**i) for i in items])


@app.get("/api/v1/models/{group_id}", response_model=CarGroup)
def group_details(group_id: str) -> CarGroup:
    g = services.get_group_details(group_id)
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    return CarGroup(**g)


@app.get("/api/v1/models/{group_id}/listings", response_model=list[Listing])
def group_listings(group_id: str, limit: int = Query(default=50, le=200)) -> list[Listing]:
    return [Listing(**l) for l in services.get_group_listings(group_id, limit=limit)]


@app.get("/api/v1/platforms", response_model=list[PlatformAnalytics])
def platforms_list() -> list[PlatformAnalytics]:
    return [PlatformAnalytics(**p) for p in services.overview()["platforms"]]


@app.get("/api/v1/platforms/{platform_id}", response_model=PlatformAnalytics)
def platform_one(platform_id: str) -> PlatformAnalytics:
    p = services.platform_details(platform_id)
    if not p:
        raise HTTPException(status_code=404, detail="Platform not found")
    return PlatformAnalytics(**p)


@app.get("/api/v1/regions", response_model=list[RegionAnalytics])
def regions_list() -> list[RegionAnalytics]:
    return [RegionAnalytics(**r) for r in services.all_regions()]


@app.get("/api/v1/regions/{region_id}", response_model=RegionAnalytics)
def region_one(region_id: str) -> RegionAnalytics:
    r = services.region_details(region_id)
    if not r:
        raise HTTPException(status_code=404, detail="Region not found")
    return RegionAnalytics(**r)


@app.get("/api/v1/search-metadata", response_model=SearchMetadata)
def search_metadata() -> SearchMetadata:
    return SearchMetadata(**services.metadata())


@app.get("/api/v1/glossary", response_model=GlossaryResponse)
def glossary() -> GlossaryResponse:
    metrics = [{"key": k, **v} for k, v in METRIC_DEFINITIONS.items()]
    opps = [{"key": k, "title": v["title"], "description": v["desc"]}
            for k, v in OPPORTUNITY_TYPES.items()]
    return GlossaryResponse(metrics=metrics, opportunity_types=opps)

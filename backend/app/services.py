from __future__ import annotations

from typing import Any

from .db import get_conn
from .federal_districts import ALL_DISTRICTS, district_of
from .repository import (
    get_distinct,
    get_groups,
    get_last_snapshot,
    get_market_totals,
    get_platform,
    get_platforms,
    get_region,
    get_regions_summary,
)
from .scoring import PREMIUM_BRANDS


def overview() -> dict[str, Any]:
    groups = [g for g in get_groups() if g["active_count"] > 0]
    # Top by prospect, then by active count desc as tiebreaker
    preview = sorted(groups, key=lambda g: (-g["prospect_score"], -g["active_count"]))[:30]
    return {
        "totals": get_market_totals(),
        "platforms": get_platforms(),
        "rare_preview": preview,
        "snapshot_date": get_last_snapshot(),
        "districts": ALL_DISTRICTS,
    }


def search(filters: dict[str, Any]) -> list[dict[str, Any]]:
    items = [g for g in get_groups() if g["active_count"] > 0]

    def matches(g: dict[str, Any]) -> bool:
        if (p := filters.get("platform")) and p not in g["platforms_csv"]:
            return False
        if (b := filters.get("brand")) and b.lower() not in (g["mark"] or "").lower():
            return False
        if (m := filters.get("model")) and m.lower() not in (g["model"] or "").lower():
            return False
        if (bt := filters.get("body_type")):
            # body_type is per listing, not per group; skip if any listing in the group matches
            ok = _group_has_body(g["id"], bt)
            if not ok:
                return False
        if (r := filters.get("region")) and r not in g["regions_present"]:
            return False
        if (d := filters.get("district")) and d not in g["districts_present"]:
            return False
        if (sec := filters.get("section")) and sec not in (g.get("sections") or []):
            return False
        if (pf := filters.get("price_from")) is not None and (g.get("avg_price") or 0) < pf:
            return False
        if (pt := filters.get("price_to")) is not None and (g.get("avg_price") or 0) > pt:
            return False
        if (yf := filters.get("year_from")) is not None and (g.get("max_year") or 0) < yf:
            return False
        if (yt := filters.get("year_to")) is not None and (g.get("min_year") or 9999) > yt:
            return False
        if (lf := filters.get("listings_from")) is not None and g["active_count"] < lf:
            return False
        if (lt := filters.get("listings_to")) is not None and g["active_count"] > lt:
            return False
        if filters.get("rare_only") and g["active_count"] > 10:
            return False
        if filters.get("premium_only") and not g["is_premium"]:
            return False
        return True

    filtered = [g for g in items if matches(g)]
    sort_key = filters.get("sort") or "prospect"
    return _sort(filtered, sort_key)


def _group_has_body(group_id: str, body_type: str) -> bool:
    conn = get_conn()
    try:
        row = conn.execute(
            """
            SELECT 1 FROM listings WHERE body_type = ? LIMIT 1
            """,
            (body_type,),
        ).fetchone()
        return row is not None
    finally:
        conn.close()


def _sort(items: list[dict[str, Any]], key: str) -> list[dict[str, Any]]:
    if key == "price_asc":
        return sorted(items, key=lambda g: g.get("avg_price") or 0)
    if key == "price_desc":
        return sorted(items, key=lambda g: -(g.get("avg_price") or 0))
    if key == "deficit":
        return sorted(items, key=lambda g: -g["deficit_score"])
    if key == "liquidity":
        return sorted(items, key=lambda g: -g["liquidity_score"])
    if key == "demand":
        return sorted(items, key=lambda g: -g["demand_score"])
    return sorted(items, key=lambda g: (-g["prospect_score"], g["active_count"]))


def get_group_details(group_id: str) -> dict[str, Any] | None:
    for g in get_groups():
        if g["id"] == group_id:
            return g
    return None


def get_group_listings(group_id: str, limit: int = 50) -> list[dict[str, Any]]:
    g = get_group_details(group_id)
    if not g:
        return []
    conn = get_conn()
    try:
        rows = conn.execute(
            """
            SELECT * FROM listings
            WHERE mark=? AND model=?
              AND COALESCE(generation,'')=COALESCE(?,'')
              AND COALESCE(configuration,'')=COALESCE(?,'')
            ORDER BY status, price_rub DESC
            LIMIT ?
            """,
            (g["mark"], g["model"], g.get("generation"), g.get("configuration"), limit),
        ).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            d["district"] = district_of(d.get("region"))
            out.append(d)
        return out
    finally:
        conn.close()


def metadata() -> dict[str, list[str]]:
    return {
        "platforms": get_distinct("platform"),
        "brands": get_distinct("mark"),
        "body_types": [b for b in get_distinct("body_type") if b],
        "districts": ALL_DISTRICTS,
        "regions": get_distinct("region"),
    }


def region_details(region_id: str) -> dict[str, Any] | None:
    return get_region(region_id)


def platform_details(platform_id: str) -> dict[str, Any] | None:
    return get_platform(platform_id)


def all_regions() -> list[dict[str, Any]]:
    return get_regions_summary()


def universal_search(query: str) -> dict[str, Any]:
    q = query.strip().lower()
    if not q:
        return {"groups": [], "regions": [], "platforms": [], "brands": []}

    groups = [g for g in get_groups() if g["active_count"] > 0]
    matching_groups = [
        g for g in groups
        if q in (g.get("mark") or "").lower()
        or q in (g.get("model") or "").lower()
        or q in (g.get("full_name") or "").lower()
    ][:10]

    regions = [r for r in get_distinct("region") if q in r.lower()][:5]
    platforms = [p for p in get_distinct("platform") if q in p.lower()]
    brands = [b for b in get_distinct("mark") if q in b.lower()][:10]

    return {
        "groups": matching_groups,
        "regions": regions,
        "platforms": platforms,
        "brands": brands,
    }

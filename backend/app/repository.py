"""
Repository: read aggregates and listings from the configured database.
Groups are keyed by (mark, model, generation, configuration).
"""
from __future__ import annotations

import hashlib
from datetime import datetime
from typing import Any

from .db import IS_POSTGRES, get_conn
from .federal_districts import district_of
from .scoring import all_scores, is_premium_brand

# SQLite GROUP_CONCAT(DISTINCT x) vs Postgres STRING_AGG(DISTINCT x, ',')
_AGG = "STRING_AGG(DISTINCT {col}, ',')" if IS_POSTGRES else "GROUP_CONCAT(DISTINCT {col})"

CAPITAL_REGIONS = ("Москва", "Санкт-Петербург")


def _group_id(mark: str, model: str, generation: str | None, configuration: str | None) -> str:
    key = "|".join([mark or "", model or "", generation or "", configuration or ""])
    return hashlib.sha1(key.encode("utf-8")).hexdigest()[:16]


def _enrich_group(g: dict[str, Any]) -> dict[str, Any]:
    g = dict(g)
    g["regions_present"] = [r for r in (g.get("regions_present_csv") or "").split(",") if r]
    g["platforms"] = [p for p in (g.get("platforms_csv") or "").split(",") if p]
    g["sections"] = [s for s in (g.get("sections_csv") or "").split(",") if s]
    g["sellers_count"] = g.get("sellers_count") or 0
    for fld in ("avg_price", "min_price", "max_price"):
        v = g.get(fld)
        g[fld] = int(round(v)) if v is not None else None
    g["regions_count"] = len(g["regions_present"])
    g["has_capital_region"] = any(
        any(cap in r for cap in CAPITAL_REGIONS) for r in g["regions_present"]
    )
    g["is_premium"] = is_premium_brand(g.get("mark"))
    g["id"] = _group_id(g["mark"], g["model"], g.get("generation"), g.get("configuration"))
    g["full_name"] = " ".join(
        x for x in [g.get("mark"), g.get("model"), g.get("generation"), g.get("configuration")] if x
    )
    g["scores"] = all_scores(g)
    g["prospect_score"] = g["scores"]["prospect"]["value"]
    g["deficit_score"] = g["scores"]["deficit"]["value"]
    g["liquidity_score"] = g["scores"]["liquidity"]["value"]
    g["demand_score"] = g["scores"]["demand"]["value"]
    g["districts_present"] = sorted({
        d for r in g["regions_present"] if (d := district_of(r)) is not None
    })
    g["districts_missing"] = sorted({
        d for d in ALL_DISTRICTS if d not in set(g["districts_present"])
    })
    return g


from .federal_districts import ALL_DISTRICTS  # noqa: E402  (avoids circular at first import)


def _agg_query(where_sql: str = "", params: tuple = ()) -> str:
    region_agg = _AGG.format(col="region2")
    platforms_agg = _AGG.format(col="platform")
    sections_agg = _AGG.format(col="section")
    return f"""
        SELECT
            mark, model, generation, configuration,
            SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active_count,
            SUM(CASE WHEN status='removed' THEN 1 ELSE 0 END) AS removed_count,
            AVG(CASE WHEN status='active' AND price_rub > 0 THEN price_rub END) AS avg_price,
            MIN(CASE WHEN status='active' AND price_rub > 0 THEN price_rub END) AS min_price,
            MAX(CASE WHEN status='active' AND price_rub > 0 THEN price_rub END) AS max_price,
            COUNT(DISTINCT CASE WHEN status='active' THEN seller_id END) AS sellers_count,
            (SELECT {region_agg} FROM (
                SELECT DISTINCT L2.region AS region2 FROM listings L2
                WHERE L2.mark=listings.mark AND L2.model=listings.model
                  AND COALESCE(L2.generation,'')=COALESCE(listings.generation,'')
                  AND COALESCE(L2.configuration,'')=COALESCE(listings.configuration,'')
                  AND L2.status='active' AND L2.region IS NOT NULL
            ) sub) AS regions_present_csv,
            {platforms_agg} AS platforms_csv,
            {sections_agg} AS sections_csv,
            MIN(year) AS min_year,
            MAX(year) AS max_year
        FROM listings
        {where_sql}
        GROUP BY mark, model, generation, configuration
    """


def get_groups(limit: int | None = None) -> list[dict[str, Any]]:
    conn = get_conn()
    try:
        sql = _agg_query("WHERE mark IS NOT NULL AND model IS NOT NULL")
        if limit:
            sql += f"\nLIMIT {int(limit)}"
        rows = conn.execute(sql).fetchall()
        return [_enrich_group(dict(r)) for r in rows]
    finally:
        conn.close()


def get_group(group_id: str) -> dict[str, Any] | None:
    for g in get_groups():
        if g["id"] == group_id:
            return g
    return None


def get_market_totals() -> dict[str, int]:
    conn = get_conn()
    last_year = datetime.now().year - 1
    try:
        row = conn.execute(
            """
            SELECT
                SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active_total,
                SUM(CASE WHEN status='removed' THEN 1 ELSE 0 END) AS removed_total,
                SUM(CASE WHEN status='active' AND section='NEW' THEN 1 ELSE 0 END) AS new_cars,
                SUM(CASE WHEN status='active' AND (year >= CAST(? AS INTEGER)) THEN 1 ELSE 0 END) AS under_one_year
            FROM listings
            """,
            (last_year,),
        ).fetchone()
        total_groups = conn.execute(
            "SELECT COUNT(*) FROM (SELECT mark, model, generation, configuration FROM listings WHERE status='active' GROUP BY mark, model, generation, configuration)"
        ).fetchone()[0]
        rare_groups = conn.execute(
            "SELECT COUNT(*) FROM (SELECT mark, model, generation, configuration FROM listings WHERE status='active' GROUP BY mark, model, generation, configuration HAVING COUNT(*) <= 10)"
        ).fetchone()[0]
        return {
            "total_listings": row["active_total"] or 0,
            "new_cars": row["new_cars"] or 0,
            "under_one_year": row["under_one_year"] or 0,
            "rare_models": rare_groups or 0,
            "total_groups": total_groups or 0,
        }
    finally:
        conn.close()


def get_platforms() -> list[dict[str, Any]]:
    conn = get_conn()
    last_year = datetime.now().year - 1
    try:
        rows = conn.execute(
            """
            SELECT
                platform AS id,
                SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS total_listings,
                SUM(CASE WHEN status='active' AND section='NEW' THEN 1 ELSE 0 END) AS new_cars,
                SUM(CASE WHEN status='active' AND (year >= CAST(? AS INTEGER)) THEN 1 ELSE 0 END) AS under_one_year,
                AVG(CASE WHEN status='active' AND price_rub > 0 THEN price_rub END) AS avg_price
            FROM listings
            GROUP BY platform
            """,
            (last_year,),
        ).fetchall()
        result = []
        for r in rows:
            top_brands = conn.execute(
                """
                SELECT mark, COUNT(*) AS n FROM listings
                WHERE platform=? AND status='active' AND mark IS NOT NULL
                GROUP BY mark ORDER BY n DESC LIMIT 5
                """,
                (r["id"],),
            ).fetchall()
            # Distribution by federal district
            districts = conn.execute(
                """
                SELECT region, COUNT(*) AS n FROM listings
                WHERE platform=? AND status='active' AND region IS NOT NULL
                GROUP BY region
                """,
                (r["id"],),
            ).fetchall()
            dist_agg: dict[str, int] = {}
            for d in districts:
                fd = district_of(d["region"]) or "Прочие"
                dist_agg[fd] = dist_agg.get(fd, 0) + d["n"]
            total_dist = sum(dist_agg.values()) or 1
            rare_count = conn.execute(
                """
                SELECT COUNT(*) FROM (
                    SELECT mark, model, generation, configuration FROM listings
                    WHERE platform=? AND status='active'
                    GROUP BY mark, model, generation, configuration HAVING COUNT(*) <= 10
                )
                """,
                (r["id"],),
            ).fetchone()[0]
            result.append({
                "id": r["id"],
                "total_listings": r["total_listings"] or 0,
                "new_cars": r["new_cars"] or 0,
                "under_one_year": r["under_one_year"] or 0,
                "rare_models": rare_count,
                "avg_price": int(r["avg_price"] or 0),
                "regions": [
                    {"name": k, "value": round(v / total_dist * 100, 1)}
                    for k, v in sorted(dist_agg.items(), key=lambda x: -x[1])
                ],
                "top_brands": [b["mark"] for b in top_brands],
                "commentary": f"Платформа {r['id']}: всего {r['total_listings']} активных объявлений, {rare_count} редких групп.",
            })
        return result
    finally:
        conn.close()


def get_regions_summary() -> list[dict[str, Any]]:
    conn = get_conn()
    try:
        rows = conn.execute(
            """
            SELECT
                region AS id,
                COUNT(*) AS total_listings,
                AVG(CASE WHEN price_rub > 0 THEN price_rub END) AS avg_price
            FROM listings
            WHERE status='active' AND region IS NOT NULL
            GROUP BY region
            ORDER BY total_listings DESC
            """
        ).fetchall()
        result = []
        for r in rows:
            district = district_of(r["id"])
            top_models = conn.execute(
                """
                SELECT mark, model, COUNT(*) AS n FROM listings
                WHERE region=? AND status='active'
                GROUP BY mark, model ORDER BY n DESC LIMIT 5
                """,
                (r["id"],),
            ).fetchall()
            deficit = conn.execute(
                """
                SELECT mark, model, generation, configuration, COUNT(*) AS n FROM listings
                WHERE region=? AND status='active'
                GROUP BY mark, model, generation, configuration
                HAVING n <= 2
                ORDER BY n ASC LIMIT 5
                """,
                (r["id"],),
            ).fetchall()
            n = r["total_listings"]
            avg_price = int(r["avg_price"] or 0)
            competition = "Высокая" if n > 500 else ("Средняя" if n > 100 else "Низкая")
            result.append({
                "id": r["id"],
                "district": district,
                "total_listings": n,
                "avg_price": avg_price,
                "competition": competition,
                "popular_models": [f"{m['mark']} {m['model']}" for m in top_models],
                "deficit_models": [
                    " ".join(x for x in [d['mark'], d['model'], d['generation'], d['configuration']] if x)
                    for d in deficit
                ],
                "recommendation": (
                    f"{r['id']}: {n} активных объявлений, средняя цена "
                    f"{avg_price:,} ₽ — {'насыщенный' if competition == 'Высокая' else 'умеренный' if competition == 'Средняя' else 'тонкий'} рынок."
                ).replace(",", " "),
            })
        return result
    finally:
        conn.close()


def get_region(region_id: str) -> dict[str, Any] | None:
    for r in get_regions_summary():
        if r["id"] == region_id:
            return _enrich_region(r)
    return None


def _enrich_region(r: dict[str, Any]) -> dict[str, Any]:
    """Adds top platforms, top cities, breakdown by section and year buckets."""
    rid = r["id"]
    conn = get_conn()
    try:
        platforms = conn.execute(
            """SELECT platform, COUNT(*) AS n FROM listings
               WHERE region=? AND status='active' GROUP BY platform ORDER BY n DESC""",
            (rid,),
        ).fetchall()
        cities = conn.execute(
            """SELECT city, COUNT(*) AS n FROM listings
               WHERE region=? AND status='active' AND city IS NOT NULL
               GROUP BY city ORDER BY n DESC LIMIT 10""",
            (rid,),
        ).fetchall()
        sections = conn.execute(
            """SELECT section, COUNT(*) AS n FROM listings
               WHERE region=? AND status='active' AND section IS NOT NULL
               GROUP BY section""",
            (rid,),
        ).fetchall()
        year_avg = conn.execute(
            """SELECT AVG(year) AS y, AVG(km_age) AS km FROM listings
               WHERE region=? AND status='active' AND year > 0""",
            (rid,),
        ).fetchone()
        r = dict(r)
        r["top_platforms"] = [{"id": p["platform"], "count": p["n"]} for p in platforms]
        r["top_cities"] = [{"name": c["city"], "count": c["n"]} for c in cities]
        r["sections"] = [{"name": s["section"], "count": s["n"]} for s in sections]
        r["avg_year"] = int(year_avg["y"]) if year_avg and year_avg["y"] else None
        r["avg_km"] = int(year_avg["km"]) if year_avg and year_avg["km"] else None
        return r
    finally:
        conn.close()


def get_platform(platform_id: str) -> dict[str, Any] | None:
    for p in get_platforms():
        if p["id"] == platform_id:
            return p
    return None


def get_distinct(field: str) -> list[str]:
    conn = get_conn()
    try:
        rows = conn.execute(
            f"SELECT DISTINCT {field} FROM listings WHERE {field} IS NOT NULL ORDER BY {field}"
        ).fetchall()
        return [r[0] for r in rows if r[0]]
    finally:
        conn.close()


def get_last_snapshot() -> str | None:
    conn = get_conn()
    try:
        row = conn.execute("SELECT value FROM meta WHERE key='last_snapshot'").fetchone()
        return row["value"] if row else None
    finally:
        conn.close()

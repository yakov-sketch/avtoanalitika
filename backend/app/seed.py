"""
Seed: if the listings table is empty, populate it from a versioned CSV
shipped in backend/seed/. Runs at FastAPI startup.
"""
from __future__ import annotations

import csv
import gzip
from pathlib import Path

from .db import IS_POSTGRES, get_conn

SEED_DIR = Path(__file__).parent.parent / "seed"
SEED_CSV = SEED_DIR / "listings.csv.gz"
SEED_META = SEED_DIR / "meta.csv"


def _normalize(value: str, col: str) -> object | None:
    if value is None or value == "":
        return None
    int_cols = {
        "year", "price_rub", "km_age", "horse_power", "owners_count",
        "price_usd", "price_eur",
    }
    float_cols = {"displacement"}
    if col == "id":
        return None  # skip id; let the engine auto-generate
    if col in int_cols:
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return None
    if col in float_cols:
        try:
            return float(value)
        except (ValueError, TypeError):
            return None
    return value


def seed_if_empty() -> None:
    if not SEED_CSV.exists():
        return
    conn = get_conn()
    try:
        cur = conn.execute("SELECT COUNT(*) AS n FROM listings")
        row = cur.fetchone()
        existing = row["n"] if hasattr(row, "__getitem__") else row[0]
        if existing and existing > 0:
            return

        print(f"[seed] empty DB, loading {SEED_CSV.name}…")
        with gzip.open(SEED_CSV, "rt", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            cols = [c for c in reader.fieldnames or [] if c != "id"]
            placeholders = ",".join("?" * len(cols))
            sql = f"INSERT INTO listings ({','.join(cols)}) VALUES ({placeholders})"
            batch: list[tuple] = []
            BATCH = 500
            total = 0
            for r in reader:
                batch.append(tuple(_normalize(r.get(c), c) for c in cols))
                if len(batch) >= BATCH:
                    conn.executemany(sql, batch)
                    total += len(batch)
                    batch.clear()
            if batch:
                conn.executemany(sql, batch)
                total += len(batch)
        if SEED_META.exists():
            with open(SEED_META, encoding="utf-8") as f:
                reader = csv.reader(f)
                next(reader, None)  # header
                for k, v in reader:
                    conn.execute(
                        "INSERT INTO meta(key, value) VALUES (?, ?)",
                        (k, v),
                    )
        conn.commit()
        print(f"[seed] loaded {total} listings")
    finally:
        conn.close()

"""
Database layer. Works with SQLite locally (default) and Postgres on prod
when DATABASE_URL env var is set (Railway/Heroku-style).

We avoid SQL dialect divergence by sticking to ANSI SQL + a tiny placeholder
translator: queries use '?' for both engines, and on Postgres we swap them
to '%s' transparently.
"""
from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
IS_POSTGRES = DATABASE_URL.startswith("postgres://") or DATABASE_URL.startswith("postgresql://")

# Normalize for psycopg (it doesn't like postgres:// prefix)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = "postgresql://" + DATABASE_URL[len("postgres://"):]

SQLITE_PATH = Path(__file__).parent.parent / "rovena.db"


class _Cursor:
    """Cursor wrapper: row_factory + placeholder translation."""

    def __init__(self, cur: Any) -> None:
        self._cur = cur

    def execute(self, sql: str, params: tuple | list = ()) -> "_Cursor":
        if IS_POSTGRES:
            sql = sql.replace("?", "%s")
        self._cur.execute(sql, params)
        return self

    def executemany(self, sql: str, seq: list) -> "_Cursor":
        if IS_POSTGRES:
            sql = sql.replace("?", "%s")
        self._cur.executemany(sql, seq)
        return self

    def executescript(self, sql: str) -> None:
        if IS_POSTGRES:
            self._cur.execute(sql)
        else:
            self._cur.executescript(sql)

    def fetchone(self) -> Any:
        row = self._cur.fetchone()
        return _as_dict_row(row, self._cur)

    def fetchall(self) -> list:
        rows = self._cur.fetchall()
        return [_as_dict_row(r, self._cur) for r in rows]


def _as_dict_row(row: Any, cur: Any) -> Any:
    if row is None:
        return None
    if IS_POSTGRES:
        # psycopg2 dict_row / sqlite3.Row already behave dict-like
        if isinstance(row, dict):
            return row
        cols = [d[0] for d in cur.description]
        return _RowProxy(dict(zip(cols, row)))
    return row  # sqlite3.Row supports both index and key access


class _RowProxy(dict):
    """Allow row['key'] and row[0] access for postgres tuples."""
    def __init__(self, data: dict):
        super().__init__(data)
        self._values = list(data.values())

    def __getitem__(self, key):
        if isinstance(key, int):
            return self._values[key]
        return super().__getitem__(key)


class _ConnWrapper:
    """Unifies sqlite3.Connection and psycopg2.connection."""

    def __init__(self, raw: Any) -> None:
        self._raw = raw

    def execute(self, sql: str, params: tuple | list = ()) -> _Cursor:
        cur = self._raw.cursor()
        c = _Cursor(cur)
        c.execute(sql, params)
        return c

    def executemany(self, sql: str, seq: list) -> _Cursor:
        cur = self._raw.cursor()
        c = _Cursor(cur)
        c.executemany(sql, seq)
        return c

    def executescript(self, sql: str) -> None:
        cur = self._raw.cursor()
        c = _Cursor(cur)
        c.executescript(sql)

    def commit(self) -> None:
        self._raw.commit()

    def close(self) -> None:
        self._raw.close()


def get_conn() -> _ConnWrapper:
    if IS_POSTGRES:
        import psycopg2  # imported lazily so SQLite-only dev doesn't need it
        conn = psycopg2.connect(DATABASE_URL)
        return _ConnWrapper(conn)
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return _ConnWrapper(conn)


_SCHEMA_SQLITE = """
CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inner_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    status TEXT NOT NULL,
    snapshot_date TEXT NOT NULL,
    vehicle_category TEXT,
    mark TEXT,
    model TEXT,
    generation TEXT,
    configuration TEXT,
    complectation TEXT,
    body_type TEXT,
    year INTEGER,
    price_rub INTEGER,
    km_age INTEGER,
    engine_type TEXT,
    displacement REAL,
    horse_power INTEGER,
    transmission TEXT,
    drive_type TEXT,
    color TEXT,
    wheel TEXT,
    section TEXT,
    condition TEXT,
    owners_count INTEGER,
    no_accidents TEXT,
    seller TEXT,
    seller_type TEXT,
    seller_id TEXT,
    region TEXT,
    city TEXT,
    address TEXT,
    url TEXT,
    seller_url TEXT,
    vin TEXT,
    pts TEXT,
    custom TEXT,
    in_stock TEXT,
    state_not_beaten TEXT,
    price_usd INTEGER,
    price_eur INTEGER,
    offer_updated_at TEXT,
    image_urls TEXT,
    options TEXT,
    description TEXT,
    UNIQUE(inner_id, platform, status, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_listings_group ON listings(mark, model, generation, configuration);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_region ON listings(region);
CREATE INDEX IF NOT EXISTS idx_listings_platform ON listings(platform);
CREATE INDEX IF NOT EXISTS idx_listings_mark ON listings(mark);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(vehicle_category);

CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS pipeline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_url TEXT,
    label TEXT,
    status TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_pipeline_status ON pipeline(status);
"""

_SCHEMA_POSTGRES = _SCHEMA_SQLITE.replace(
    "INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY"
).replace("REAL", "DOUBLE PRECISION")


def init_schema() -> None:
    conn = get_conn()
    try:
        conn.executescript(_SCHEMA_POSTGRES if IS_POSTGRES else _SCHEMA_SQLITE)
        conn.commit()
    finally:
        conn.close()


def has_data() -> bool:
    conn = get_conn()
    try:
        cur = conn.execute("SELECT COUNT(*) AS n FROM listings")
        row = cur.fetchone()
        return (row["n"] if hasattr(row, "__getitem__") else row[0]) > 0
    finally:
        conn.close()

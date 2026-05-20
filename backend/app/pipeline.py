"""
Personal pipeline: tag a group or a listing with a workflow status
(watching, in progress, bought, rejected). Single-user for now,
add user_id when we wire auth in.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from .db import get_conn

Status = Literal["watch", "in_progress", "bought", "rejected"]
EntityType = Literal["group", "listing"]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def upsert(
    entity_type: str,
    entity_id: str,
    status: str,
    label: str | None,
    note: str | None,
    entity_url: str | None = None,
) -> dict[str, Any]:
    conn = get_conn()
    try:
        existing = conn.execute(
            "SELECT id FROM pipeline WHERE entity_type=? AND entity_id=?",
            (entity_type, entity_id),
        ).fetchone()
        now = _now()
        if existing:
            conn.execute(
                "UPDATE pipeline SET status=?, label=?, note=?, entity_url=COALESCE(?, entity_url), updated_at=? WHERE id=?",
                (status, label, note, entity_url, now, existing["id"]),
            )
        else:
            conn.execute(
                "INSERT INTO pipeline (entity_type, entity_id, entity_url, label, status, note, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (entity_type, entity_id, entity_url, label, status, note, now, now),
            )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM pipeline WHERE entity_type=? AND entity_id=?",
            (entity_type, entity_id),
        ).fetchone()
        return dict(row)
    finally:
        conn.close()


def remove(entity_type: str, entity_id: str) -> None:
    conn = get_conn()
    try:
        conn.execute("DELETE FROM pipeline WHERE entity_type=? AND entity_id=?", (entity_type, entity_id))
        conn.commit()
    finally:
        conn.close()


def list_all(status: str | None = None) -> list[dict[str, Any]]:
    conn = get_conn()
    try:
        sql = "SELECT * FROM pipeline"
        params: tuple = ()
        if status:
            sql += " WHERE status=?"
            params = (status,)
        sql += " ORDER BY updated_at DESC"
        rows = conn.execute(sql, params).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get(entity_type: str, entity_id: str) -> dict[str, Any] | None:
    conn = get_conn()
    try:
        row = conn.execute(
            "SELECT * FROM pipeline WHERE entity_type=? AND entity_id=?",
            (entity_type, entity_id),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_many(entity_type: str, entity_ids: list[str]) -> dict[str, dict[str, Any]]:
    if not entity_ids:
        return {}
    conn = get_conn()
    try:
        placeholders = ",".join("?" * len(entity_ids))
        rows = conn.execute(
            f"SELECT * FROM pipeline WHERE entity_type=? AND entity_id IN ({placeholders})",
            (entity_type, *entity_ids),
        ).fetchall()
        return {r["entity_id"]: dict(r) for r in rows}
    finally:
        conn.close()


def counts_by_status() -> dict[str, int]:
    conn = get_conn()
    try:
        rows = conn.execute("SELECT status, COUNT(*) AS n FROM pipeline GROUP BY status").fetchall()
        return {r["status"]: r["n"] for r in rows}
    finally:
        conn.close()

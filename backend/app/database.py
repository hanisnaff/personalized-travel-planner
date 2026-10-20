import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import httpx
from . import config


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _connect() -> sqlite3.Connection:
    path = Path(config.DATABASE_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    if config.supabase_enabled():
        return
    with _connect() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS trips (
            id TEXT PRIMARY KEY,
            destination TEXT NOT NULL,
            departure_date TEXT NOT NULL,
            duration INTEGER NOT NULL,
            budget REAL NOT NULL,
            currency TEXT NOT NULL,
            created_at TEXT NOT NULL,
            payload TEXT NOT NULL
        )""")


def _supabase_headers() -> dict[str, str]:
    key = config.SUPABASE_SERVICE_ROLE_KEY
    return {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json", "Prefer": "return=representation"}


def save_trip(request: dict[str, Any], itinerary: dict[str, Any]) -> dict[str, Any]:
    trip_id = str(uuid.uuid4())
    created_at = now_iso()
    payload = {"id": trip_id, "destination": request["destination"], "departure_date": request["departure_date"],
               "duration": request["duration"], "budget": request["budget"], "currency": request["currency"],
               "created_at": created_at, "itinerary": itinerary}
    if config.supabase_enabled():
        url = f"{config.SUPABASE_URL}/rest/v1/trips"
        row = {**payload, "payload": payload}
        response = httpx.post(url, headers=_supabase_headers(), json=row, timeout=15)
        response.raise_for_status()
        rows = response.json()
        if rows:
            item = rows[0]
            return {**payload, "id": item.get("id", trip_id)}
        return payload
    with _connect() as conn:
        conn.execute("INSERT INTO trips VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                     (trip_id, payload["destination"], payload["departure_date"], payload["duration"],
                      payload["budget"], payload["currency"], created_at, json.dumps(payload)))
    return payload


def list_trips() -> list[dict[str, Any]]:
    if config.supabase_enabled():
        url = f"{config.SUPABASE_URL}/rest/v1/trips?select=id,destination,departure_date,duration,budget,currency,created_at,payload&order=created_at.desc"
        response = httpx.get(url, headers=_supabase_headers(), timeout=15)
        response.raise_for_status()
        rows = response.json()
        return [row.get("payload") or {k: row[k] for k in ("id", "destination", "departure_date", "duration", "budget", "currency", "created_at")} for row in rows]
    with _connect() as conn:
        rows = conn.execute("SELECT payload FROM trips ORDER BY created_at DESC").fetchall()
    return [json.loads(row["payload"]) for row in rows]


def delete_trip(trip_id: str) -> bool:
    if config.supabase_enabled():
        url = f"{config.SUPABASE_URL}/rest/v1/trips?id=eq.{trip_id}"
        response = httpx.delete(url, headers=_supabase_headers(), timeout=15)
        response.raise_for_status()
        return response.status_code in (200, 204)
    with _connect() as conn:
        cursor = conn.execute("DELETE FROM trips WHERE id = ?", (trip_id,))
        return cursor.rowcount > 0


def update_trip(trip_id: str, request: dict[str, Any], itinerary: dict[str, Any]) -> dict[str, Any] | None:
    payload = {"id": trip_id, "destination": request["destination"], "departure_date": request["departure_date"],
               "duration": request["duration"], "budget": request["budget"], "currency": request["currency"],
               "itinerary": itinerary}
    if config.supabase_enabled():
        url = f"{config.SUPABASE_URL}/rest/v1/trips?id=eq.{trip_id}"
        response = httpx.patch(url, headers=_supabase_headers(), json={**payload, "payload": payload}, timeout=15)
        response.raise_for_status()
        rows = response.json()
        return payload if rows else None
    with _connect() as conn:
        existing = conn.execute("SELECT created_at FROM trips WHERE id = ?", (trip_id,)).fetchone()
        if not existing:
            return None
        payload["created_at"] = existing["created_at"]
        conn.execute("UPDATE trips SET destination=?, departure_date=?, duration=?, budget=?, currency=?, payload=? WHERE id=?",
                     (payload["destination"], payload["departure_date"], payload["duration"], payload["budget"],
                      payload["currency"], json.dumps(payload), trip_id))
    return payload

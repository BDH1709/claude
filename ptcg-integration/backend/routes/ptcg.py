from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
import sqlite3
import httpx
import json
from pathlib import Path
from datetime import datetime, timedelta
import os

router = APIRouter()

DB_PATH = Path("/workspace/data/ptcg.db")
PTCG_API_KEY = os.getenv("PTCG_API_KEY", "")
LIMITLESS_BASE = "https://play.limitlesstcg.com/api"
PTCG_CARD_BASE = "https://api.pokemontcg.io/v2"


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS my_decks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                archetype TEXT DEFAULT '',
                cards TEXT NOT NULL DEFAULT '[]',
                notes TEXT DEFAULT '',
                last_played TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS tournaments (
                id TEXT PRIMARY KEY,
                name TEXT,
                date TEXT,
                players INTEGER,
                format TEXT,
                country TEXT,
                top_decks TEXT DEFAULT '[]',
                fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS meta_cache (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                archetypes TEXT NOT NULL DEFAULT '[]',
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS meta_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                snapshot_date TEXT NOT NULL DEFAULT (datetime('now')),
                archetypes TEXT NOT NULL DEFAULT '[]'
            );
        """)
        # Ensure single meta_cache row
        conn.execute(
            "INSERT OR IGNORE INTO meta_cache (id, archetypes) VALUES (1, '[]')"
        )
        conn.commit()


init_db()


# ---------------------------------------------------------------------------
# Limitless TCG helpers
# ---------------------------------------------------------------------------

def _calc_tier(wins: int, top8s: int, avg_placement: float) -> str:
    if wins >= 3 or (top8s >= 8 and avg_placement <= 3):
        return "S"
    if wins >= 1 or (top8s >= 5 and avg_placement <= 4):
        return "A"
    if top8s >= 3 and avg_placement <= 5:
        return "B"
    return "C"


async def fetch_tournaments(limit: int = 20) -> list:
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            f"{LIMITLESS_BASE}/tournaments",
            params={"game": "PTCG", "format": "standard", "type": "online", "limit": limit},
        )
        r.raise_for_status()
        data = r.json()
        return data if isinstance(data, list) else []


async def fetch_tournament_details(tid: str) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        standings, decks = [], []
        try:
            r = await client.get(f"{LIMITLESS_BASE}/tournaments/{tid}/standings")
            standings = r.json() if r.is_success else []
        except Exception:
            pass
        try:
            r = await client.get(f"{LIMITLESS_BASE}/tournaments/{tid}/decks")
            decks = r.json() if r.is_success else []
        except Exception:
            pass
    return {"standings": standings, "decks": decks}


async def build_meta_snapshot(tournaments: list) -> list:
    archetype_map: dict = {}

    for t in tournaments[:15]:
        try:
            details = await fetch_tournament_details(t.get("id", ""))
            standings = details["standings"]
            decks = details["decks"]
            top_cut = standings[:min(8, len(standings))]

            for idx, entry in enumerate(top_cut):
                name = entry.get("archetype") or entry.get("deck_archetype") or "Unknown"
                if name not in archetype_map:
                    archetype_map[name] = {
                        "name": name,
                        "appearances": 0,
                        "top8s": 0,
                        "wins": 0,
                        "placements": [],
                        "example_decklist": None,
                    }
                a = archetype_map[name]
                a["appearances"] += 1
                a["top8s"] += 1
                if idx == 0:
                    a["wins"] += 1
                a["placements"].append(idx + 1)

            for deck in (decks or []):
                arch = deck.get("archetype", "Unknown")
                if arch in archetype_map and not archetype_map[arch]["example_decklist"]:
                    archetype_map[arch]["example_decklist"] = deck.get("cards")
        except Exception:
            continue

    result = []
    for a in archetype_map.values():
        if not a["placements"]:
            continue
        avg = round(sum(a["placements"]) / len(a["placements"]), 1)
        result.append({
            **a,
            "avg_placement": avg,
            "tier": _calc_tier(a["wins"], a["top8s"], avg),
        })

    result.sort(key=lambda x: x["avg_placement"])
    return result


# ---------------------------------------------------------------------------
# Background refresh tasks
# ---------------------------------------------------------------------------

async def _refresh_meta_task():
    try:
        tournaments = await fetch_tournaments(30)
        archetypes = await build_meta_snapshot(tournaments)
        now = datetime.utcnow().isoformat()
        with get_db() as conn:
            conn.execute(
                "UPDATE meta_cache SET archetypes = ?, updated_at = ? WHERE id = 1",
                (json.dumps(archetypes), now),
            )
            conn.execute(
                "INSERT INTO meta_snapshots (snapshot_date, archetypes) VALUES (?, ?)",
                (now, json.dumps(archetypes)),
            )
            conn.commit()
    except Exception as e:
        print(f"[ptcg] Meta refresh failed: {e}")


async def _refresh_tournaments_task():
    try:
        tournaments = await fetch_tournaments(20)
        with get_db() as conn:
            for t in tournaments:
                conn.execute(
                    """INSERT OR REPLACE INTO tournaments
                       (id, name, date, players, format, country, top_decks, fetched_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))""",
                    (
                        t.get("id", ""),
                        t.get("name") or t.get("tournament_name", ""),
                        t.get("date") or t.get("tournament_date", ""),
                        t.get("players", 0),
                        t.get("format", "standard"),
                        t.get("country") or t.get("region", ""),
                        json.dumps(t.get("top_decks") or t.get("top_cut") or []),
                    ),
                )
            conn.commit()
    except Exception as e:
        print(f"[ptcg] Tournament refresh failed: {e}")


# ---------------------------------------------------------------------------
# Meta routes
# ---------------------------------------------------------------------------

@router.get("/meta")
def get_meta():
    with get_db() as conn:
        row = conn.execute(
            "SELECT archetypes, updated_at FROM meta_cache WHERE id = 1"
        ).fetchone()
    return {
        "archetypes": json.loads(row["archetypes"]),
        "updated_at": row["updated_at"],
    }


@router.post("/meta/refresh")
async def refresh_meta(background_tasks: BackgroundTasks):
    background_tasks.add_task(_refresh_meta_task)
    return {"status": "refreshing"}


@router.get("/meta/catchup")
def get_catchup():
    with get_db() as conn:
        current_row = conn.execute(
            "SELECT archetypes, updated_at FROM meta_cache WHERE id = 1"
        ).fetchone()
        two_weeks_ago = (datetime.utcnow() - timedelta(days=14)).isoformat()
        old_row = conn.execute(
            """SELECT archetypes, snapshot_date FROM meta_snapshots
               WHERE snapshot_date <= ? ORDER BY snapshot_date DESC LIMIT 1""",
            (two_weeks_ago,),
        ).fetchone()

    current = json.loads(current_row["archetypes"])
    if not old_row:
        return {
            "current": current,
            "previous": None,
            "changes": [],
            "snapshot_date": None,
            "updated_at": current_row["updated_at"],
        }

    previous = json.loads(old_row["archetypes"])
    prev_map = {a["name"]: a for a in previous}
    curr_map = {a["name"]: a for a in current}
    changes = []

    for curr in current:
        prev = prev_map.get(curr["name"])
        if not prev:
            changes.append({"type": "new", "archetype": curr["name"], "tier": curr["tier"]})
        elif prev["tier"] != curr["tier"]:
            changes.append({
                "type": "tier_change",
                "archetype": curr["name"],
                "from_tier": prev["tier"],
                "to_tier": curr["tier"],
            })

    for prev in previous:
        if prev["name"] not in curr_map:
            changes.append({"type": "dropped", "archetype": prev["name"], "tier": prev["tier"]})

    return {
        "current": current,
        "previous": previous,
        "changes": changes,
        "snapshot_date": old_row["snapshot_date"],
        "updated_at": current_row["updated_at"],
    }


# ---------------------------------------------------------------------------
# Tournament routes
# ---------------------------------------------------------------------------

@router.get("/tournaments")
async def get_tournaments(refresh: bool = False):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM tournaments ORDER BY date DESC LIMIT 20"
        ).fetchall()

    if rows and not refresh:
        return [dict(r) | {"top_decks": json.loads(r["top_decks"])} for r in rows]

    # No cache — fetch live
    try:
        tournaments = await fetch_tournaments(20)
        return tournaments
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/tournaments/refresh")
async def refresh_tournaments(background_tasks: BackgroundTasks):
    background_tasks.add_task(_refresh_tournaments_task)
    return {"status": "refreshing"}


@router.get("/tournaments/{tid}")
async def get_tournament(tid: str):
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM tournaments WHERE id = ?", (tid,)
        ).fetchone()
    if row:
        return dict(row) | {"top_decks": json.loads(row["top_decks"])}
    try:
        details = await fetch_tournament_details(tid)
        return details
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


# ---------------------------------------------------------------------------
# Deck routes
# ---------------------------------------------------------------------------

class DeckCreate(BaseModel):
    name: str
    archetype: Optional[str] = ""
    cards: Optional[list] = []
    notes: Optional[str] = ""


class DeckUpdate(BaseModel):
    name: Optional[str] = None
    archetype: Optional[str] = None
    cards: Optional[list] = None
    notes: Optional[str] = None


@router.get("/decks")
def get_decks():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM my_decks ORDER BY created_at DESC"
        ).fetchall()
    return [dict(r) | {"cards": json.loads(r["cards"])} for r in rows]


@router.post("/decks", status_code=201)
def create_deck(deck: DeckCreate):
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO my_decks (name, archetype, cards, notes) VALUES (?, ?, ?, ?)",
            (deck.name, deck.archetype, json.dumps(deck.cards), deck.notes),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM my_decks WHERE id = ?", (cur.lastrowid,)
        ).fetchone()
    return dict(row) | {"cards": json.loads(row["cards"])}


@router.put("/decks/{deck_id}")
def update_deck(deck_id: int, deck: DeckUpdate):
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM my_decks WHERE id = ?", (deck_id,)
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Deck not found")
        conn.execute(
            """UPDATE my_decks SET
               name    = COALESCE(?, name),
               archetype = COALESCE(?, archetype),
               cards   = COALESCE(?, cards),
               notes   = COALESCE(?, notes)
               WHERE id = ?""",
            (
                deck.name,
                deck.archetype,
                json.dumps(deck.cards) if deck.cards is not None else None,
                deck.notes,
                deck_id,
            ),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM my_decks WHERE id = ?", (deck_id,)
        ).fetchone()
    return dict(row) | {"cards": json.loads(row["cards"])}


@router.patch("/decks/{deck_id}/played")
def mark_played(deck_id: int):
    with get_db() as conn:
        result = conn.execute(
            "UPDATE my_decks SET last_played = datetime('now') WHERE id = ?", (deck_id,)
        )
        conn.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Deck not found")
        row = conn.execute(
            "SELECT * FROM my_decks WHERE id = ?", (deck_id,)
        ).fetchone()
    return dict(row) | {"cards": json.loads(row["cards"])}


@router.delete("/decks/{deck_id}")
def delete_deck(deck_id: int):
    with get_db() as conn:
        result = conn.execute(
            "DELETE FROM my_decks WHERE id = ?", (deck_id,)
        )
        conn.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Deck not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Card search proxy (pokemontcg.io)
# ---------------------------------------------------------------------------

@router.get("/cards/search")
async def search_cards(q: str = "", page: int = 1, pageSize: int = 20):
    if not q.strip():
        return {"data": [], "totalCount": 0}
    headers = {"X-Api-Key": PTCG_API_KEY} if PTCG_API_KEY else {}
    async with httpx.AsyncClient(timeout=8) as client:
        try:
            r = await client.get(
                f"{PTCG_CARD_BASE}/cards",
                params={"q": f"name:{q}*", "page": page, "pageSize": pageSize, "orderBy": "-set.releaseDate"},
                headers=headers,
            )
            r.raise_for_status()
            return r.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))

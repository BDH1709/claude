import json
import uuid
import asyncio
import aiofiles
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.config import settings

_db_lock = asyncio.Lock()


def _db_path() -> Path:
    return settings.klassenmap_path / "db.json"


def _ensure_dirs() -> None:
    for subdir in ["uploads", "thumbnails"]:
        (settings.klassenmap_path / subdir).mkdir(parents=True, exist_ok=True)


async def read_db() -> dict:
    path = _db_path()
    if not path.exists():
        return {"documents": [], "metadata": {"total_documents": 0, "last_updated": None}}
    async with aiofiles.open(path, "r", encoding="utf-8") as f:
        content = await f.read()
    return json.loads(content)


async def write_db(data: dict) -> None:
    data["metadata"]["last_updated"] = datetime.now(timezone.utc).isoformat()
    data["metadata"]["total_documents"] = len(data["documents"])
    path = _db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    async with aiofiles.open(tmp, "w", encoding="utf-8") as f:
        await f.write(json.dumps(data, ensure_ascii=False, indent=2))
    tmp.replace(path)


async def add_document(doc: dict) -> dict:
    async with _db_lock:
        db = await read_db()
        db["documents"].append(doc)
        await write_db(db)
    return doc


async def get_document(doc_id: str) -> dict | None:
    db = await read_db()
    return next((d for d in db["documents"] if d["id"] == doc_id), None)


async def delete_document(doc_id: str) -> bool:
    async with _db_lock:
        db = await read_db()
        before = len(db["documents"])
        db["documents"] = [d for d in db["documents"] if d["id"] != doc_id]
        if len(db["documents"]) == before:
            return False
        await write_db(db)
    return True


async def list_documents(category: str | None = None, query: str | None = None) -> list[dict]:
    db = await read_db()
    docs = db["documents"]
    if category:
        docs = [d for d in docs if d.get("category") == category]
    if query:
        q = query.lower()
        docs = [
            d for d in docs
            if q in d.get("title", "").lower()
            or q in d.get("description", "").lower()
            or q in d.get("original_filename", "").lower()
            or any(q in t.lower() for t in d.get("tags", []))
        ]
    docs.sort(key=lambda d: d.get("uploaded_at", ""), reverse=True)
    return docs


def uploads_dir(category: str) -> Path:
    _ensure_dirs()
    p = settings.klassenmap_path / "uploads" / category
    p.mkdir(parents=True, exist_ok=True)
    return p


def thumbnails_dir() -> Path:
    _ensure_dirs()
    p = settings.klassenmap_path / "thumbnails"
    p.mkdir(parents=True, exist_ok=True)
    return p


def make_document_record(
    category: str,
    original_filename: str,
    stored_filename: str,
    file_size: int,
    content_type: str,
    title: str = "",
    description: str = "",
    tags: list[str] | None = None,
) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "category": category,
        "original_filename": original_filename,
        "stored_filename": stored_filename,
        "title": title or original_filename,
        "description": description,
        "tags": tags or [],
        "file_size": file_size,
        "content_type": content_type,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "thumbnail": None,
    }

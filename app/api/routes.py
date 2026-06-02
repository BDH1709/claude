import uuid
import shutil
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import FileResponse

from app.core.config import settings, CATEGORIES
from app.core.storage import (
    add_document,
    get_document,
    delete_document,
    list_documents,
    uploads_dir,
    make_document_record,
    read_db,
)
from app.models.schemas import DocumentOut, CategoryStats, DashboardStats, SearchResult

router = APIRouter(prefix="/api")


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/stats", response_model=DashboardStats)
async def get_stats():
    db = await read_db()
    docs = db["documents"]
    cats = []
    for slug, meta in CATEGORIES.items():
        cat_docs = [d for d in docs if d.get("category") == slug]
        last = cat_docs[0]["uploaded_at"] if cat_docs else None
        cats.append(CategoryStats(
            slug=slug,
            label=meta["label"],
            description=meta["description"],
            color=meta["color"],
            icon=meta["icon"],
            document_count=len(cat_docs),
            last_upload=last,
        ))
    all_times = [d["uploaded_at"] for d in docs if d.get("uploaded_at")]
    return DashboardStats(
        total_documents=len(docs),
        categories_with_files=sum(1 for c in cats if c.document_count > 0),
        last_upload=sorted(all_times)[-1] if all_times else None,
        categories=cats,
    )


@router.get("/categories")
async def get_categories():
    return [
        {"slug": slug, **meta}
        for slug, meta in CATEGORIES.items()
    ]


@router.get("/categories/{category}/documents", response_model=list[DocumentOut])
async def get_category_documents(category: str):
    if category not in CATEGORIES:
        raise HTTPException(status_code=404, detail="Categorie niet gevonden")
    docs = await list_documents(category=category)
    return [DocumentOut(**d) for d in docs]


@router.get("/documents", response_model=list[DocumentOut])
async def get_all_documents():
    docs = await list_documents()
    return [DocumentOut(**d) for d in docs]


@router.get("/documents/{doc_id}", response_model=DocumentOut)
async def get_document_detail(doc_id: str):
    doc = await get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document niet gevonden")
    return DocumentOut(**doc)


@router.get("/documents/{doc_id}/download")
async def download_document(doc_id: str):
    doc = await get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document niet gevonden")
    file_path = uploads_dir(doc["category"]) / doc["stored_filename"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Bestand niet gevonden op schijf")
    return FileResponse(
        path=file_path,
        filename=doc["original_filename"],
        media_type=doc["content_type"],
    )


@router.post("/upload", response_model=DocumentOut)
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form(...),
    title: str = Form(""),
    description: str = Form(""),
    tags: str = Form(""),
):
    if category not in CATEGORIES:
        raise HTTPException(status_code=400, detail="Ongeldige categorie")

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in settings.allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Bestandstype {suffix} niet toegestaan")

    stored_name = f"{uuid.uuid4().hex}{suffix}"
    dest = uploads_dir(category) / stored_name

    size = 0
    with dest.open("wb") as out:
        while chunk := await file.read(64 * 1024):
            size += len(chunk)
            if size > settings.max_upload_bytes:
                dest.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="Bestand te groot (max 50 MB)")
            out.write(chunk)

    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []

    record = make_document_record(
        category=category,
        original_filename=file.filename or stored_name,
        stored_filename=stored_name,
        file_size=size,
        content_type=file.content_type or "application/octet-stream",
        title=title or file.filename or stored_name,
        description=description,
        tags=tag_list,
    )
    await add_document(record)
    return DocumentOut(**record)


@router.delete("/documents/{doc_id}")
async def delete_document_endpoint(doc_id: str):
    doc = await get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document niet gevonden")

    file_path = uploads_dir(doc["category"]) / doc["stored_filename"]
    file_path.unlink(missing_ok=True)

    await delete_document(doc_id)
    return {"deleted": True}


@router.get("/search", response_model=SearchResult)
async def search_documents(q: str = Query("", min_length=0)):
    docs = await list_documents(query=q if q else None)
    return SearchResult(
        documents=[DocumentOut(**d) for d in docs],
        total=len(docs),
        query=q,
    )

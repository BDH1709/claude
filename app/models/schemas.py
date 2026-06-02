from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DocumentOut(BaseModel):
    id: str
    category: str
    original_filename: str
    stored_filename: str
    title: str
    description: str
    tags: list[str]
    file_size: int
    content_type: str
    uploaded_at: str
    thumbnail: Optional[str]


class CategoryStats(BaseModel):
    slug: str
    label: str
    description: str
    color: str
    icon: str
    document_count: int
    last_upload: Optional[str]


class DashboardStats(BaseModel):
    total_documents: int
    categories_with_files: int
    last_upload: Optional[str]
    categories: list[CategoryStats]


class SearchResult(BaseModel):
    documents: list[DocumentOut]
    total: int
    query: str

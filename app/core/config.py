from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    app_name: str = "Klassenmap"
    klassenmap_path: Path = Path("/workspace/klassenmap")
    max_upload_bytes: int = 50 * 1024 * 1024  # 50 MB
    allowed_extensions: set[str] = {
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
        ".jpg", ".jpeg", ".png", ".gif", ".webp",
        ".mp4", ".mov", ".avi", ".mp3", ".wav",
        ".txt", ".md", ".csv", ".zip",
    }

    class Config:
        env_file = ".env"


settings = Settings()

CATEGORIES: dict[str, dict] = {
    "inhoudsopgave": {
        "label": "Inhoudsopgave",
        "description": "Overzicht en structuur van de klassenmap",
        "color": "#6366f1",
        "icon": "book-open",
    },
    "studentgegevens": {
        "label": "Studentgegevens",
        "description": "Persoonsgegevens en administratieve informatie",
        "color": "#8b5cf6",
        "icon": "user",
    },
    "pop": {
        "label": "POP",
        "description": "Persoonlijk Ontwikkelingsplan",
        "color": "#0d9488",
        "icon": "target",
    },
    "planningen": {
        "label": "Planningen",
        "description": "Lesplanningen en tijdschema's",
        "color": "#f97316",
        "icon": "calendar",
    },
    "lesvoorbereidingen": {
        "label": "Lesvoorbereidingen",
        "description": "Uitgewerkte lesplannen en didactisch materiaal",
        "color": "#10b981",
        "icon": "book",
    },
    "toetsgegevens": {
        "label": "Toetsgegevens",
        "description": "Toetsresultaten en beoordelingsoverzichten",
        "color": "#ef4444",
        "icon": "clipboard-list",
    },
    "groepsoverzicht": {
        "label": "Groepsoverzicht",
        "description": "Klassensamenstelling en groepsdynamiek",
        "color": "#3b82f6",
        "icon": "users",
    },
    "bewijsmateriaal": {
        "label": "Bewijsmateriaal",
        "description": "Onderbouwend materiaal en portfoliobewijs",
        "color": "#f59e0b",
        "icon": "folder",
    },
    "geheimhouding": {
        "label": "Geheimhouding",
        "description": "Vertrouwelijke documenten (beperkte toegang)",
        "color": "#64748b",
        "icon": "lock",
    },
}

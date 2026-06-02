#!/bin/bash
# Start the Klassenmap FastAPI application
set -e

# Ensure workspace directories exist
mkdir -p /workspace/klassenmap/uploads/{inhoudsopgave,studentgegevens,pop,planningen,lesvoorbereidingen,toetsgegevens,groepsoverzicht,bewijsmateriaal,geheimhouding}
mkdir -p /workspace/klassenmap/thumbnails

exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 2 \
    --loop uvloop \
    --no-access-log

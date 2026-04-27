import fs from "fs";
import path from "path";
import { Note, NoteMetadata } from "@/types";

const NOTES_DIR = process.env.NOTES_DIR || "/workspace/data/notes";

function ensureDir() {
  if (!fs.existsSync(NOTES_DIR)) {
    fs.mkdirSync(NOTES_DIR, { recursive: true });
  }
}

function notePath(id: string) {
  return path.join(NOTES_DIR, `${id}.md`);
}

function metaPath(id: string) {
  return path.join(NOTES_DIR, `${id}.json`);
}

export function listNotes(): NoteMetadata[] {
  ensureDir();
  const files = fs.readdirSync(NOTES_DIR).filter((f) => f.endsWith(".json"));
  const notes: NoteMetadata[] = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(NOTES_DIR, file), "utf8");
      notes.push(JSON.parse(raw));
    } catch {
      // skip corrupt files
    }
  }
  return notes.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getNote(id: string): Note | null {
  ensureDir();
  const np = notePath(id);
  const mp = metaPath(id);
  if (!fs.existsSync(np) || !fs.existsSync(mp)) return null;
  try {
    const content = fs.readFileSync(np, "utf8");
    const meta: NoteMetadata = JSON.parse(fs.readFileSync(mp, "utf8"));
    return { ...meta, content };
  } catch {
    return null;
  }
}

export function createNote(title: string, content: string): Note {
  ensureDir();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const meta: NoteMetadata = { id, title, createdAt: now, updatedAt: now };
  fs.writeFileSync(notePath(id), content, "utf8");
  fs.writeFileSync(metaPath(id), JSON.stringify(meta, null, 2), "utf8");
  return { ...meta, content };
}

export function updateNote(id: string, title: string, content: string): Note | null {
  ensureDir();
  const mp = metaPath(id);
  if (!fs.existsSync(mp)) return null;
  const meta: NoteMetadata = JSON.parse(fs.readFileSync(mp, "utf8"));
  const updated: NoteMetadata = { ...meta, title, updatedAt: new Date().toISOString() };
  fs.writeFileSync(notePath(id), content, "utf8");
  fs.writeFileSync(mp, JSON.stringify(updated, null, 2), "utf8");
  return { ...updated, content };
}

export function deleteNote(id: string): boolean {
  ensureDir();
  const np = notePath(id);
  const mp = metaPath(id);
  if (!fs.existsSync(np)) return false;
  fs.unlinkSync(np);
  if (fs.existsSync(mp)) fs.unlinkSync(mp);
  return true;
}

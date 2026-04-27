"use client";

import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Plus,
  FileText,
  Trash2,
  Save,
  Eye,
  Edit3,
  X,
} from "lucide-react";
import { Note, NoteMetadata } from "@/types";
import clsx from "clsx";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}

export function NoteEditor() {
  const [notes, setNotes] = useState<NoteMetadata[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const loadNotes = useCallback(async () => {
    const res = await fetch("/api/notes");
    if (res.ok) setNotes(await res.json());
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  async function openNote(id: string) {
    const res = await fetch(`/api/notes/${id}`);
    if (res.ok) {
      const note: Note = await res.json();
      setActiveNote(note);
      setTitle(note.title);
      setContent(note.content);
      setDirty(false);
      setPreview(false);
    }
  }

  async function saveNote() {
    if (!activeNote) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/notes/${activeNote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      if (res.ok) {
        const updated: Note = await res.json();
        setActiveNote(updated);
        setDirty(false);
        loadNotes();
      }
    } finally {
      setSaving(false);
    }
  }

  async function createNote() {
    if (!newTitle.trim()) return;
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), content: "" }),
    });
    if (res.ok) {
      const note: Note = await res.json();
      setNewTitle("");
      setCreating(false);
      await loadNotes();
      openNote(note.id);
    }
  }

  async function deleteNote(id: string) {
    if (!confirm("Delete this note?")) return;
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (activeNote?.id === id) {
      setActiveNote(null);
      setTitle("");
      setContent("");
    }
    loadNotes();
  }

  function handleContentChange(val: string) {
    setContent(val);
    setDirty(true);
  }

  function handleTitleChange(val: string) {
    setTitle(val);
    setDirty(true);
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-56 shrink-0 border-r border-border flex flex-col bg-bg-secondary">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="text-xs font-mono text-text-muted uppercase tracking-wider">Notes</span>
          <button
            onClick={() => setCreating(true)}
            className="text-text-muted hover:text-accent-blue transition-colors"
            title="New note"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* New note input */}
        {creating && (
          <div className="p-2 border-b border-border flex gap-1">
            <input
              autoFocus
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createNote();
                if (e.key === "Escape") { setCreating(false); setNewTitle(""); }
              }}
              placeholder="Note title..."
              className="flex-1 bg-bg-tertiary border border-border rounded text-xs px-2 py-1.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
            />
            <button onClick={createNote} className="text-accent-green hover:text-opacity-80">
              <Save className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setCreating(false); setNewTitle(""); }} className="text-text-muted hover:text-text-secondary">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-1">
          {notes.length === 0 && (
            <p className="text-center text-xs text-text-muted py-8 px-3">
              No notes yet. Create one!
            </p>
          )}
          {notes.map((note) => (
            <div
              key={note.id}
              className={clsx(
                "group flex items-start gap-2 px-3 py-2.5 cursor-pointer border-l-2 transition-colors",
                activeNote?.id === note.id
                  ? "border-accent-blue bg-bg-tertiary"
                  : "border-transparent hover:bg-bg-tertiary"
              )}
              onClick={() => openNote(note.id)}
            >
              <FileText className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-text-primary truncate">
                  {note.title}
                </div>
                <div className="text-xs text-text-muted">{timeAgo(note.updatedAt)}</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-red transition-all shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeNote ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="flex-1 bg-transparent text-lg font-semibold text-text-primary focus:outline-none placeholder:text-text-muted"
                placeholder="Note title"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreview(!preview)}
                  className={clsx(
                    "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border transition-colors",
                    preview
                      ? "border-accent-blue text-accent-blue"
                      : "border-border text-text-muted hover:border-text-secondary"
                  )}
                >
                  {preview ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {preview ? "Edit" : "Preview"}
                </button>
                <button
                  onClick={saveNote}
                  disabled={saving || !dirty}
                  className={clsx(
                    "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border transition-colors",
                    dirty
                      ? "border-accent-green text-accent-green hover:bg-accent-green hover:text-bg-primary"
                      : "border-border text-text-muted opacity-50 cursor-not-allowed"
                  )}
                >
                  <Save className="w-3 h-3" />
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {preview ? (
                <div className="h-full overflow-y-auto p-6 prose-dark">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content || "*Empty note*"}
                  </ReactMarkdown>
                </div>
              ) : (
                <textarea
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Start writing in Markdown..."
                  className="w-full h-full bg-transparent text-sm text-text-primary font-mono resize-none focus:outline-none p-6 leading-relaxed placeholder:text-text-muted"
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                      e.preventDefault();
                      if (dirty) saveNote();
                    }
                  }}
                />
              )}
            </div>

            <div className="px-4 py-2 border-t border-border text-xs text-text-muted font-mono flex justify-between">
              <span>
                {content.split(/\s+/).filter(Boolean).length} words ·{" "}
                {content.length} chars
              </span>
              <span>Ctrl+S to save</span>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-10 h-10 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary text-sm">Select or create a note</p>
              <button
                onClick={() => setCreating(true)}
                className="mt-4 text-xs text-accent-blue hover:underline"
              >
                + New note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

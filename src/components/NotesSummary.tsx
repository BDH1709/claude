"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, ChevronRight } from "lucide-react";
import { NoteMetadata } from "@/types";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

export function NotesSummary() {
  const [notes, setNotes] = useState<NoteMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/notes")
      .then((r) => r.json())
      .then((data) => {
        setNotes(Array.isArray(data) ? data.slice(0, 5) : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-xs text-text-muted uppercase tracking-widest">
          Recent Notes
        </span>
        <button
          onClick={() => router.push("/dashboard/notes")}
          className="font-mono text-xs text-accent-blue hover:text-glow-blue transition-colors flex items-center gap-1"
        >
          All <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="flex-1 space-y-2">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-12 rounded border border-border bg-bg-tertiary animate-pulse" />
          ))
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <FileText className="w-6 h-6 text-text-muted mb-2 opacity-40" />
            <p className="font-mono text-xs text-text-muted">No notes yet</p>
            <button
              onClick={() => router.push("/dashboard/notes")}
              className="mt-3 font-mono text-xs text-accent-blue flex items-center gap-1 hover:underline"
            >
              <Plus className="w-3 h-3" /> Create one
            </button>
          </div>
        ) : (
          notes.map((note, i) => (
            <button
              key={note.id}
              onClick={() => router.push("/dashboard/notes")}
              className="w-full text-left group jarvis-card rounded p-3 hover:border-accent-blue transition-all"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm text-text-primary truncate group-hover:text-accent-blue transition-colors">
                  {note.title}
                </span>
                <span className="font-mono text-xs text-text-muted shrink-0">
                  {timeAgo(note.updatedAt)}
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      <button
        onClick={() => router.push("/dashboard/notes")}
        className="mt-3 w-full font-mono text-xs text-text-muted border border-border rounded py-2 hover:border-accent-orange hover:text-accent-orange transition-all flex items-center justify-center gap-1"
      >
        <Plus className="w-3 h-3" /> New note
      </button>
    </div>
  );
}

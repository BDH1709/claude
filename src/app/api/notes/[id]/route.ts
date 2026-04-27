import { NextRequest, NextResponse } from "next/server";
import { getNote, updateNote, deleteNote } from "@/lib/notes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const note = getNote(params.id);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(note);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { title, content } = await request.json();
    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const note = updateNote(params.id, title.trim(), content || "");
    if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(note);
  } catch (err) {
    console.error("Update note error:", err);
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const ok = deleteNote(params.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

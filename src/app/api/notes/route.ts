import { NextRequest, NextResponse } from "next/server";
import { listNotes, createNote } from "@/lib/notes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const notes = listNotes();
    return NextResponse.json(notes);
  } catch (err) {
    console.error("List notes error:", err);
    return NextResponse.json({ error: "Failed to list notes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, content } = await request.json();
    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const note = createNote(title.trim(), content || "");
    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    console.error("Create note error:", err);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}

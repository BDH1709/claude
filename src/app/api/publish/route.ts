import { NextRequest, NextResponse } from "next/server";
import { getPublishState, setPublishState } from "@/lib/publish";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getPublishState());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const updated = setPublishState(body);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Publish state error:", err);
    return NextResponse.json({ error: "Failed to update publish state" }, { status: 500 });
  }
}

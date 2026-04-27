import { NextResponse } from "next/server";
import { getSystemStats } from "@/lib/system";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const stats = await getSystemStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("System stats error:", err);
    return NextResponse.json({ error: "Failed to read system stats" }, { status: 500 });
  }
}

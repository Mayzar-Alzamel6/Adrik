import { NextRequest, NextResponse } from "next/server";
import { runBreakdown } from "@/lib/ai/coach";
import { serverAi } from "@/lib/ai/gemini";

/** The safe order (crisis check, consent, AI, reply check) lives in coach.ts, shared with the phone's Supabase function. */
export async function POST(req: NextRequest) {
  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const reply = await runBreakdown(raw ?? {}, serverAi());
  if (!reply) return NextResponse.json({ error: "Goal is required" }, { status: 400 });
  return NextResponse.json(reply);
}

import { NextRequest, NextResponse } from "next/server";
import { runReview } from "@/lib/ai/coach";
import { serverAi } from "@/lib/ai/gemini";

/** The safe order (crisis check, consent, AI, local fallback) lives in coach.ts, shared with the phone's Supabase function. */
export async function POST(req: NextRequest) {
  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  return NextResponse.json(await runReview(raw ?? {}, serverAi()));
}

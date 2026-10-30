import { NextResponse } from "next/server";
import { hasGeminiKey } from "@/lib/ai/gemini";

/** Lets the coach screens know whether to ask for AI consent at all. Never reveals the key. */
export async function GET() {
  return NextResponse.json({ aiAvailable: hasGeminiKey() });
}

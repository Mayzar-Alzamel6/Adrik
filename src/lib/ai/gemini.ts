/**
 * Server-only: the computer's side of the coach's AI. The key never leaves the server
 * (`GEMINI_API_KEY` from the Windows env); the model comes from `GEMINI_MODEL` in `.env.local`.
 * The call itself is `geminiJson` in coach.ts, shared with the Supabase function the phone uses.
 */
import { geminiJson, type CoachAi } from "@/lib/ai/coach";

export const hasGeminiKey = () => Boolean(process.env.GEMINI_API_KEY?.trim());

export const serverAi = (): CoachAi => ({
  ready: hasGeminiKey(),
  call: (prompt, temperature) => geminiJson(prompt, temperature, { key: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL }),
});

/**
 * The phone's way to the coach's AI: the "coach" Supabase function on the founder's own project
 * (adrik-personal/supabase/functions/coach), reached with the same sign-in as sync. The Gemini key lives only
 * in that function's secrets, never in the app. Personal builds only: every other build gets coachClient.off.ts
 * (metro.config.js), so neither this nor the sync code it uses ships in a shared app file.
 */
import { refresh } from "@/lib/sync/core";
import { useSyncStore } from "@/lib/sync/native";
import type { BreakdownInput, BreakdownReply, ReviewReply, WeekSummary } from "@/lib/ai/coach";

/** Why AI is or isn't there, so the screen can say what to do about it. */
export type CoachAccess = "ready" | "no-sync" | "no-function" | "no-key" | "offline";

async function endpoint(): Promise<{ url: string; headers: Record<string, string> } | null> {
  const { config, session } = useSyncStore.getState();
  if (!config || !session) return null;
  let fresh = session;
  try {
    fresh = await refresh(config, session);
  } catch {
    return null; // Signed out or offline: sync shows and handles that itself.
  }
  if (fresh !== session) useSyncStore.setState({ session: fresh });
  return {
    url: `${config.url.replace(/\/+$/, "")}/functions/v1/coach`,
    headers: { apikey: config.key, Authorization: `Bearer ${fresh.accessToken}`, "Content-Type": "application/json" },
  };
}

/** One quick question to the function, without any of the person's data. */
export async function coachAccess(): Promise<CoachAccess> {
  const ep = await endpoint();
  if (!ep) return "no-sync";
  try {
    const res = await fetch(ep.url, { headers: ep.headers });
    if (res.status === 401) return "no-sync";
    if (!res.ok) return "no-function";
    const body = (await res.json()) as { aiAvailable?: boolean };
    return body.aiAvailable ? "ready" : "no-key";
  } catch {
    return "offline";
  }
}

async function post<T>(body: object): Promise<T> {
  const ep = await endpoint();
  if (!ep) throw new Error("no-sync");
  const res = await fetch(ep.url, { method: "POST", headers: ep.headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export const askBreakdown = (input: BreakdownInput) => post<BreakdownReply>({ action: "breakdown", ...input, useAI: true });

export const askReview = (summary: WeekSummary) => post<ReviewReply>({ action: "review", summary, useAI: true });

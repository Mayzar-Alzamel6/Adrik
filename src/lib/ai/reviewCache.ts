import type { CoachReview } from "@/lib/ai/coach";
import type { WeekRef } from "@/lib/utils";

/**
 * The coach's last reviews, kept on this device only (outside the stores: not synced, not backed up),
 * so reopening the review page doesn't ask the AI again.
 */
const KEY = "adrik-ai-coach-reviews";
const KEEP = 12;

export interface CachedReview {
  review: CoachReview;
  engine: "ai" | "local";
  createdAt: string;
}

const keyOf = (w: WeekRef) => `${w.year}-${w.week}`;

function readAll(): Record<string, CachedReview> {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function readCachedReview(week: WeekRef): CachedReview | null {
  return readAll()[keyOf(week)] ?? null;
}

export function saveCachedReview(week: WeekRef, entry: CachedReview) {
  const all = { ...readAll(), [keyOf(week)]: entry };
  const kept = Object.entries(all)
    .sort(([, a], [, b]) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, KEEP);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(kept)));
  } catch {
    /* storage blocked: the review still shows for this visit */
  }
}

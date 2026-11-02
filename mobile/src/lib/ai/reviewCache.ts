import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CoachReview } from "@/lib/ai/coach";
import type { WeekRef } from "@/lib/utils";

/**
 * The coach's last reviews, kept on this phone only (outside the stores: not synced, not backed up),
 * so reopening the review screen doesn't ask again.
 */
const KEY = "adrik-ai-coach-reviews";
const KEEP = 12;

export interface CachedReview {
  review: CoachReview;
  engine: "ai" | "local";
  createdAt: string;
}

const keyOf = (w: WeekRef) => `${w.year}-${w.week}`;

async function readAll(): Promise<Record<string, CachedReview>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function readCachedReview(week: WeekRef): Promise<CachedReview | null> {
  return (await readAll())[keyOf(week)] ?? null;
}

export async function saveCachedReview(week: WeekRef, entry: CachedReview) {
  const all = { ...(await readAll()), [keyOf(week)]: entry };
  const kept = Object.entries(all)
    .sort(([, a], [, b]) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, KEEP);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(Object.fromEntries(kept)));
  } catch {
    /* storage failed: the review still shows for this visit */
  }
}

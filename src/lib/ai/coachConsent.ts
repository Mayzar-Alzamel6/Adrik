"use client";

import { useSyncExternalStore } from "react";
import type { AiConsent } from "@/lib/safety/analysis";

/**
 * The person's choice about sending titles and weekly numbers to Gemini for the coach.
 * Separate from the thought-reframing consent (`lib/safety/aiConsent.ts`): agreeing to one is not agreeing to the other.
 * Its own localStorage key, outside the stores, so it never syncs or lands in a backup.
 */
const KEY = "adrik-ai-coach-consent";
const listeners = new Set<() => void>();
let memory: AiConsent | null = null;

export function readCoachConsent(): AiConsent | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "ai" || v === "local" ? v : memory;
  } catch {
    return memory;
  }
}

export function setCoachConsent(value: AiConsent) {
  memory = value;
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    /* storage blocked: `memory` keeps the choice for this visit */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => e.key === KEY && l();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
};

/** null = not asked yet. */
export function useCoachConsent(): AiConsent | null {
  return useSyncExternalStore(subscribe, readCoachConsent, () => null);
}

let availability: Promise<boolean> | null = null;
/** Whether the server has a Gemini key at all; asked once per page load. */
export function fetchCoachAvailable(): Promise<boolean> {
  availability ??= fetch("/api/ai/status")
    .then((r) => (r.ok ? r.json() : { aiAvailable: false }))
    .then((d: { aiAvailable?: boolean }) => Boolean(d.aiAvailable))
    .catch(() => false);
  return availability;
}

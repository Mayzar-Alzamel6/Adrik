"use client";

import { useSyncExternalStore } from "react";
import type { AiConsent } from "./analysis";

/**
 * Web adapter of the safety kit (see README.md): the person's choice about sending thoughts to Google Gemini.
 * Kept in its own localStorage key, outside the app stores, so it never syncs or lands in a backup:
 * each device asks for itself. Until a choice is made the tool uses the local analysis.
 * The phone has no AI, so it needs no counterpart; if it ever gets one, mirror this with AsyncStorage.
 */
export type { AiConsent };

const KEY = "adrik-ai-consent";
const listeners = new Set<() => void>();
// Holds the choice for this visit when storage is blocked (private mode, blocked site data).
let memory: AiConsent | null = null;

export function readAiConsent(): AiConsent | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "ai" || v === "local" ? v : memory;
  } catch {
    return memory;
  }
}

export function setAiConsent(value: AiConsent) {
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
export function useAiConsent(): AiConsent | null {
  return useSyncExternalStore(subscribe, readAiConsent, () => null);
}

/** Whether the server has a Gemini key at all; asked once per page load. */
let availability: Promise<boolean> | null = null;
export function fetchAiAvailable(): Promise<boolean> {
  availability ??= fetch("/api/cbt/analyze")
    .then((r) => (r.ok ? r.json() : { aiAvailable: false }))
    .then((d: { aiAvailable?: boolean }) => Boolean(d.aiAvailable))
    .catch(() => false);
  return availability;
}

import { useEffect, useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AiConsent } from "@/lib/safety/analysis";

/**
 * The person's choice about sending titles and weekly numbers to Gemini for the coach (the web's coachConsent.ts).
 * Separate from any thought-reframing choice, and kept outside the stores: not synced, not in a backup,
 * so each device asks for itself.
 */
const KEY = "adrik-ai-coach-consent";
let current: AiConsent | null = null;
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** The saved choice, read once per launch. null = not asked yet. */
export async function loadCoachConsent(): Promise<AiConsent | null> {
  if (!loaded) {
    try {
      const v = await AsyncStorage.getItem(KEY);
      current = v === "ai" || v === "local" ? v : null;
    } catch {
      current = null;
    }
    loaded = true;
    emit();
  }
  return current;
}

export async function setCoachConsent(value: AiConsent) {
  current = value;
  loaded = true;
  emit();
  try {
    await AsyncStorage.setItem(KEY, value);
  } catch {
    /* storage failed: the choice still holds for this launch */
  }
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function useCoachConsent(): AiConsent | null {
  const value = useSyncExternalStore(subscribe, () => current, () => current);
  useEffect(() => {
    loadCoachConsent();
  }, []);
  return value;
}

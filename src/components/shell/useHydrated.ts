"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/useAppStore";

/** True once the persisted store has loaded from localStorage (avoids SSR/default-state flashes). */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useAppStore.persist.hasHydrated());
    return unsub;
  }, []);
  return hydrated;
}

/** Keeps the <html> dark class in sync with the stored theme. */
export function useThemeClass() {
  const themeMode = useAppStore((s) => s.themeMode);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", themeMode === "dark");
  }, [themeMode]);
}

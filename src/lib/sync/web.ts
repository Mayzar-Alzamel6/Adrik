"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useAppStore } from "@/stores/useAppStore";
import { usePlannerStore } from "@/stores/usePlannerStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { useVaultStore } from "@/stores/useVaultStore";
import {
  SYNC_SLOTS,
  refresh,
  signIn,
  supabaseRemote,
  syncAll,
  type LocalSide,
  type Persisted,
  type Session,
  type Slot,
  type SyncConfig,
} from "@/lib/sync/core";

/** Connection settings for this device. Kept apart from the app's data, so backups and sync never carry them. */
interface SyncState {
  config: SyncConfig | null;
  session: Session | null;
  lastSyncAt: string | null;
  lastError: string | null;
  running: boolean;
  connect: (config: SyncConfig, password: string) => Promise<void>;
  disconnect: () => void;
}

const STORES = { main: useAppStore, vault: useVaultStore, planner: usePlannerStore, projects: useProjectsStore };

const baseKey = (slot: Slot) => `adrik-personal-sync-base-${slot}`;
const metaKey = (slot: Slot) => `adrik-personal-sync-meta-${slot}`;
const readJson = (key: string) => {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
};

let applying = false;

const webSide: LocalSide = {
  read: async (slot) => readJson(SYNC_SLOTS[slot]) as Persisted | null,
  write: async (slot, p) => {
    applying = true;
    try {
      localStorage.setItem(SYNC_SLOTS[slot], JSON.stringify(p));
      await STORES[slot].persist.rehydrate();
    } finally {
      applying = false;
    }
  },
  readBase: async (slot) => readJson(baseKey(slot)),
  writeBase: async (slot, p) => localStorage.setItem(baseKey(slot), JSON.stringify(p)),
  readMeta: async (slot) => readJson(metaKey(slot)) ?? { remoteAt: null },
  writeMeta: async (slot, m) => localStorage.setItem(metaKey(slot), JSON.stringify(m)),
};

const forgetSyncState = () =>
  (Object.keys(SYNC_SLOTS) as Slot[]).forEach((slot) => {
    localStorage.removeItem(baseKey(slot));
    localStorage.removeItem(metaKey(slot));
  });

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      config: null,
      session: null,
      lastSyncAt: null,
      lastError: null,
      running: false,
      connect: async (config, password) => {
        const session = await signIn(config, password);
        forgetSyncState();
        set({ config, session, lastError: null });
        await syncNow();
      },
      disconnect: () => {
        forgetSyncState();
        set({ config: null, session: null, lastSyncAt: null, lastError: null });
      },
    }),
    {
      name: "adrik-personal-sync-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ config, session, lastSyncAt }) => ({ config, session, lastSyncAt }),
    }
  )
);

/** One full pass. Concurrent calls collapse into the one already running. */
export async function syncNow() {
  const { config, session, running } = useSyncStore.getState();
  if (!config || !session || running) return;
  useSyncStore.setState({ running: true });
  try {
    let fresh: Session;
    try {
      fresh = await refresh(config, session);
    } catch (e) {
      const status = (e as { status?: number }).status;
      // A rejected refresh token means signing in again; anything else (offline) is retried later.
      if (status === 400 || status === 401) {
        useSyncStore.setState({ session: null });
        throw new Error("انتهت جلسة الدخول. سجّل الدخول من جديد.");
      }
      throw e;
    }
    if (fresh !== session) useSyncStore.setState({ session: fresh });
    await syncAll(supabaseRemote(config, fresh.accessToken), webSide);
    useSyncStore.setState({ lastSyncAt: new Date().toISOString(), lastError: null });
  } catch (e) {
    const message = navigator.onLine ? (e as Error).message || "تعذّرت المزامنة." : "لا اتصال بالإنترنت. ستتم المزامنة حين يعود.";
    useSyncStore.setState({ lastError: message });
  } finally {
    useSyncStore.setState({ running: false });
  }
}

/** Calls `onChange` after the user edits any synced store (not when sync itself reloads one). */
export function onLocalChange(onChange: () => void) {
  const unsubs = Object.values(STORES).map((s) =>
    (s as { subscribe: (fn: () => void) => () => void }).subscribe(() => {
      if (!applying) onChange();
    })
  );
  return () => unsubs.forEach((u) => u());
}

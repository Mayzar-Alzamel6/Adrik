import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { storeFor } from "@/lib/stores";
import {
  SYNC_SLOTS,
  refresh,
  remoteFor,
  startSession,
  syncAll,
  type LocalSide,
  type Persisted,
  type Session,
  type Slot,
  type SyncConfig,
} from "@/lib/sync/core";

import { PERSONAL_SYNC_ENABLED } from "@/lib/sync/flag";

export { PERSONAL_SYNC_ENABLED };

interface SyncState {
  config: SyncConfig | null;
  session: Session | null;
  lastSyncAt: string | null;
  lastError: string | null;
  running: boolean;
  connect: (config: SyncConfig, password: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

const baseKey = (slot: Slot) => `adrik-personal-sync-base-${slot}`;
const metaKey = (slot: Slot) => `adrik-personal-sync-meta-${slot}`;
const readJson = async (key: string) => {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
};

let applying = false;

const nativeSide: LocalSide = {
  read: async (slot) => (await readJson(SYNC_SLOTS[slot])) as Persisted | null,
  write: async (slot, p) => {
    applying = true;
    try {
      await AsyncStorage.setItem(SYNC_SLOTS[slot], JSON.stringify(p));
      await storeFor(slot).persist.rehydrate();
    } finally {
      applying = false;
    }
  },
  readBase: (slot) => readJson(baseKey(slot)),
  writeBase: (slot, p) => AsyncStorage.setItem(baseKey(slot), JSON.stringify(p)),
  readMeta: async (slot) => (await readJson(metaKey(slot))) ?? { remoteAt: null },
  writeMeta: (slot, m) => AsyncStorage.setItem(metaKey(slot), JSON.stringify(m)),
};

const forgetSyncState = () => AsyncStorage.multiRemove((Object.keys(SYNC_SLOTS) as Slot[]).flatMap((s) => [baseKey(s), metaKey(s)]));

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      config: null,
      session: null,
      lastSyncAt: null,
      lastError: null,
      running: false,
      connect: async (config, password) => {
        const session = await startSession(config, password);
        await forgetSyncState();
        set({ config, session, lastError: null });
        await syncNow();
      },
      disconnect: async () => {
        await forgetSyncState();
        set({ config: null, session: null, lastSyncAt: null, lastError: null });
      },
    }),
    {
      name: "adrik-personal-sync-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ config, session, lastSyncAt }) => ({ config, session, lastSyncAt }),
    }
  )
);

/** One full pass. Concurrent calls collapse into the one already running. */
export async function syncNow() {
  const { config, session, running } = useSyncStore.getState();
  if (!PERSONAL_SYNC_ENABLED || !config || !session || running) return;
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
    await syncAll(remoteFor(config, fresh.accessToken), nativeSide);
    useSyncStore.setState({ lastSyncAt: new Date().toISOString(), lastError: null });
  } catch (e) {
    const message = (e as Error).message;
    const lan = useSyncStore.getState().config?.mode === "lan";
    const unreachable = lan ? "تعذّر الوصول إلى الكمبيوتر. تأكد أنه شغّال وأنكما على نفس الوايفاي." : "لا اتصال بالإنترنت. ستتم المزامنة حين يعود.";
    useSyncStore.setState({ lastError: /network|fetch/i.test(message) ? unreachable : message || "تعذّرت المزامنة." });
  } finally {
    useSyncStore.setState({ running: false });
  }
}

/** Calls `onChange` after the user edits any synced store (not when sync itself reloads one). */
export function onLocalChange(onChange: () => void) {
  const unsubs = (Object.keys(SYNC_SLOTS) as Slot[]).map((slot) =>
    (storeFor(slot) as unknown as { subscribe: (fn: () => void) => () => void }).subscribe(() => {
      if (!applying) onChange();
    })
  );
  return () => unsubs.forEach((u) => u());
}

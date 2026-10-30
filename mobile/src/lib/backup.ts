import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { PHONE_KEYS, STORE_KEYS, rehydrateAll, type PhoneSlot, type Slot } from "@/lib/stores";
import { shareJsonFile } from "@/lib/files";
import { toLocalDateString } from "@/lib/utils";
import { syncDailyReminder } from "@/lib/notifications";
import { useReminderStore } from "@/stores/useReminderStore";

type Persisted = { state: Record<string, unknown>; version?: number };

/** Same shape as the web app's backup, so a backup made on either one restores on the other. */
export type BackupFile = {
  app: "adrik";
  format: 1;
  exportedAt: string;
  data: Partial<Record<Slot, Persisted>>;
  /** Phone-only stores (focus guard, reminders); absent in backups made by the web app. */
  phone?: Partial<Record<PhoneSlot, Persisted>>;
};

/** What a restore writes: the shared slots, plus the phone-only ones when the backup came from a phone. */
export type Restorable = BackupFile["data"] & { phone?: BackupFile["phone"] };

async function readSlots<K extends string>(keys: Record<K, string>) {
  const out: Partial<Record<K, Persisted>> = {};
  for (const slot of Object.keys(keys) as K[]) {
    const raw = await AsyncStorage.getItem(keys[slot]);
    if (!raw) continue;
    try {
      out[slot] = JSON.parse(raw) as Persisted;
    } catch {
      /* skip a damaged slot rather than fail the whole backup */
    }
  }
  return out;
}

const isPersisted = (entry: unknown): entry is Persisted => Boolean(entry && typeof entry === "object" && "state" in entry);

export async function exportBackup() {
  const file: BackupFile = {
    app: "adrik",
    format: 1,
    exportedAt: new Date().toISOString(),
    data: await readSlots(STORE_KEYS),
    phone: await readSlots(PHONE_KEYS),
  };
  return shareJsonFile(`adrik-backup-${toLocalDateString()}.json`, file, "نسخة احتياطية من أدرك عمرك");
}

export function parseBackup(text: string): Restorable {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("الملف ليس نسخة احتياطية صالحة.");
  }
  const file = parsed as Partial<BackupFile>;
  if (file?.app !== "adrik" || !file.data || typeof file.data !== "object") {
    throw new Error("هذا الملف ليس نسخة احتياطية من أدرك عمرك.");
  }
  const data: Restorable = {};
  for (const slot of Object.keys(STORE_KEYS) as Slot[]) {
    const entry = file.data[slot];
    if (isPersisted(entry)) data[slot] = entry;
  }
  if (!data.main) throw new Error("النسخة لا تحتوي بيانات التطبيق الأساسية.");
  const phone: BackupFile["phone"] = {};
  for (const slot of Object.keys(PHONE_KEYS) as PhoneSlot[]) {
    const entry = file.phone?.[slot];
    if (isPersisted(entry)) phone[slot] = entry;
  }
  if (Object.keys(phone).length) data.phone = phone;
  return data;
}

export function summarizeBackup(data: BackupFile["data"]) {
  const s = (data.main?.state ?? {}) as Record<string, unknown>;
  const len = (v: unknown) => (Array.isArray(v) ? v.length : 0);
  return {
    name: typeof (s.profile as { name?: string } | undefined)?.name === "string" ? (s.profile as { name: string }).name : "",
    values: len(s.values),
    sessions: len(s.focusSessions),
    days: len(s.frogHistory),
    projects: len((data.projects?.state as { projects?: unknown[] } | undefined)?.projects),
  };
}

/** Lets the user pick a backup file (from the web app or this app). Returns null if they cancel. */
export async function pickBackup(): Promise<Restorable | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/plain", "*/*"], copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const text = asset.file ? await asset.file.text() : await new File(asset.uri).text();
  return parseBackup(text);
}

/** Replaces all current data with the backup. Phone-only stores are left as they are when the backup has none. */
export async function applyBackup(data: Restorable) {
  const pairs = (Object.keys(STORE_KEYS) as Slot[])
    .filter((slot) => data[slot])
    .map((slot) => [STORE_KEYS[slot], JSON.stringify(data[slot])] as [string, string]);
  for (const slot of Object.keys(PHONE_KEYS) as PhoneSlot[]) {
    if (data.phone?.[slot]) pairs.push([PHONE_KEYS[slot], JSON.stringify(data.phone[slot])]);
  }
  await AsyncStorage.multiSet(pairs);
  await rehydrateAll();
  // Restored reminders exist only as settings until they are scheduled again.
  if (data.phone?.reminders) {
    const r = useReminderStore.getState();
    for (const which of ["morning", "evening", "weekly"] as const) await syncDailyReminder(which, r[which]).catch(() => false);
  }
}

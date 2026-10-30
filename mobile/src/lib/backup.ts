import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { STORE_KEYS, rehydrateAll, type Slot } from "@/lib/stores";
import { shareJsonFile } from "@/lib/files";
import { toLocalDateString } from "@/lib/utils";

type Persisted = { state: Record<string, unknown>; version?: number };

/** Same shape as the web app's backup, so a backup made on either one restores on the other. */
export type BackupFile = {
  app: "adrik";
  format: 1;
  exportedAt: string;
  data: Partial<Record<Slot, Persisted>>;
};

export async function exportBackup() {
  const data: BackupFile["data"] = {};
  for (const slot of Object.keys(STORE_KEYS) as Slot[]) {
    const raw = await AsyncStorage.getItem(STORE_KEYS[slot]);
    if (!raw) continue;
    try {
      data[slot] = JSON.parse(raw) as Persisted;
    } catch {
      /* skip a damaged slot rather than fail the whole backup */
    }
  }
  const file: BackupFile = { app: "adrik", format: 1, exportedAt: new Date().toISOString(), data };
  return shareJsonFile(`adrik-backup-${toLocalDateString()}.json`, file, "نسخة احتياطية من أدرك عمرك");
}

export function parseBackup(text: string): BackupFile["data"] {
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
  const data: BackupFile["data"] = {};
  for (const slot of Object.keys(STORE_KEYS) as Slot[]) {
    const entry = file.data[slot];
    if (entry && typeof entry === "object" && "state" in entry) data[slot] = entry;
  }
  if (!data.main) throw new Error("النسخة لا تحتوي بيانات التطبيق الأساسية.");
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
export async function pickBackup(): Promise<BackupFile["data"] | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/plain", "*/*"], copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const text = asset.file ? await asset.file.text() : await new File(asset.uri).text();
  return parseBackup(text);
}

/** Replaces all current data with the backup. */
export async function applyBackup(data: BackupFile["data"]) {
  const pairs = (Object.keys(data) as Slot[])
    .filter((slot) => data[slot])
    .map((slot) => [STORE_KEYS[slot], JSON.stringify(data[slot])] as [string, string]);
  await AsyncStorage.multiSet(pairs);
  await rehydrateAll();
}

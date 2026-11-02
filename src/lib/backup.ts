const KEYS = {
  main: "adrik-app-v1",
  vault: "adrik-app-vault-v1",
  planner: "adrik-app-planner-v1",
  projects: "adrik-app-projects-v1",
  journey: "adrik-app-journey-v1",
} as const;

const LEGACY_KEYS = {
  main: "adrik-omrak-storage",
  vault: "adrik-omrak-vault-store",
  planner: "adrik-omrak-planner-store",
} as const;

type Persisted = { state: Record<string, unknown>; version?: number };
type Slot = keyof typeof KEYS;

export type BackupFile = {
  app: "adrik";
  format: 1;
  exportedAt: string;
  data: Partial<Record<Slot, Persisted>>;
};

function readKey(key: string): Persisted | undefined {
  const raw = localStorage.getItem(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Persisted;
  } catch {
    return undefined;
  }
}

export function downloadBackup() {
  const data: BackupFile["data"] = {};
  (Object.keys(KEYS) as Slot[]).forEach((slot) => {
    const value = readKey(KEYS[slot]);
    if (value) data[slot] = value;
  });
  const file: BackupFile = { app: "adrik", format: 1, exportedAt: new Date().toISOString(), data };
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `adrik-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function asPersisted(value: unknown): Persisted | undefined {
  const parsed = typeof value === "string" ? safeParse(value) : value;
  if (parsed && typeof parsed === "object" && "state" in parsed && typeof (parsed as Persisted).state === "object") {
    return parsed as Persisted;
  }
  return undefined;
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

/** Accepts an adrik-app backup, or a raw localStorage dump from the old personal app. */
export function parseBackup(text: string): BackupFile["data"] {
  const json = safeParse(text) as Record<string, unknown> | undefined;
  if (!json || typeof json !== "object") throw new Error("الملف ليس بصيغة صحيحة.");

  if (json.app === "adrik" && json.data && typeof json.data === "object") {
    const data = json.data as Record<string, unknown>;
    const out: BackupFile["data"] = {};
    (Object.keys(KEYS) as Slot[]).forEach((slot) => {
      const p = asPersisted(data[slot]);
      if (p) out[slot] = p;
    });
    if (!out.main) throw new Error("النسخة لا تحتوي على بيانات.");
    return out;
  }

  const main = asPersisted(json[LEGACY_KEYS.main]);
  if (!main) throw new Error("لم أجد بيانات النسخة القديمة داخل الملف.");
  const vault = asPersisted(json[LEGACY_KEYS.vault]);
  const planner = asPersisted(json[LEGACY_KEYS.planner]);
  return fromLegacy(main, vault, planner);
}

function fromLegacy(main: Persisted, vault?: Persisted, planner?: Persisted): BackupFile["data"] {
  const current = readKey(KEYS.main)?.state ?? {};
  const currentProfile = (current.profile as { name?: string; focusArea?: string | null } | undefined) ?? {};

  const state: Record<string, unknown> = {
    ...main.state,
    profile: { name: currentProfile.name ?? "", focusArea: currentProfile.focusArea ?? null },
    onboardingDone: true,
    settings: { faithContent: true },
    isFocusRunning: false,
    focusEndsAt: null,
    focusStartedAt: null,
  };

  // The old app kept postponed impulses in two places; the new app reads them from the vault store only.
  const legacyMainVault = Array.isArray(main.state.vaultItems) ? (main.state.vaultItems as Record<string, unknown>[]) : [];
  const vaultItems = Array.isArray(vault?.state.vaultItems) ? [...(vault!.state.vaultItems as Record<string, unknown>[])] : [];
  const seen = new Set(vaultItems.map((v) => v.id));
  legacyMainVault.forEach((v) => {
    if (seen.has(v.id)) return;
    vaultItems.push({ cravingIntensity: 5, surfingCompleted: false, ...v });
  });

  return {
    main: { state, version: main.version ?? 1 },
    vault: { state: { ...(vault?.state ?? {}), vaultItems, isSurfingModalOpen: false, currentSurfingItem: null }, version: vault?.version ?? 0 },
    ...(planner ? { planner } : {}),
  };
}

export function summarize(data: BackupFile["data"]) {
  const s = data.main?.state ?? {};
  const len = (v: unknown) => (Array.isArray(v) ? v.length : 0);
  return {
    values: len(s.values),
    habits: len(s.binaryHabits),
    goals: len(s.goalIdentities),
    votes: len(s.identityVotes),
    weeks: len(s.weeklyAudits),
    events: len(s.events),
    skills: len(s.skills),
    tasks: len(data.planner?.state.tasks),
    projects: len(data.projects?.state.projects),
  };
}

export function applyBackup(data: BackupFile["data"]) {
  (Object.keys(KEYS) as Slot[]).forEach((slot) => {
    const value = data[slot];
    if (value) localStorage.setItem(KEYS[slot], JSON.stringify(value));
  });
  window.location.href = "/app";
}

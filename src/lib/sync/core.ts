/**
 * Personal sync between the founder's own devices (this web copy and the phone app) through Supabase.
 * The same file lives in adrik-personal and adrik-mobile: keep both copies identical.
 *
 * Each store's saved copy is one row per slot. A device that changed nothing takes the remote copy; a device
 * whose copy changed while the remote also changed merges the two record by record against the last copy both
 * agreed on (the "base"), so an edit on the phone and another on the computer both survive. Writes are
 * conditional on the remote timestamp last seen, so two devices can't overwrite each other blindly.
 * A device that was never set up (onboarding not done) only takes the synced copy; it never creates or changes it.
 */

export type Slot = "main" | "vault" | "planner" | "projects";

export const SYNC_SLOTS: Record<Slot, string> = {
  main: "adrik-app-v1",
  vault: "adrik-app-vault-v1",
  planner: "adrik-app-planner-v1",
  projects: "adrik-app-projects-v1",
};

/** Per-device runtime: a running timer, an open sheet, the theme. Never sent, never taken from the other device. */
const LOCAL_ONLY: Partial<Record<Slot, string[]>> = {
  main: [
    "isFocusRunning",
    "focusEndsAt",
    "focusStartedAt",
    "focusSecondsRemaining",
    "focusCommitment",
    "focusMode",
    "activeFrogId",
    "breakEndsAt",
    "breakMinutes",
    "lastBreakEndedAt",
    "breakOffer",
    "pendingSessionReviewId",
    "randomRewardAvailable",
    "lastRewardWon",
    "currentStation",
    "themeMode",
  ],
  vault: ["isSurfingModalOpen", "currentSurfingItem"],
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

export interface Persisted {
  state: Record<string, Json>;
  version?: number;
}

/* ---------------- merge ---------------- */

const isObj = (v: Json): v is Record<string, Json> => v !== null && typeof v === "object" && !Array.isArray(v);

export function deepEqual(a: Json, b: Json): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  const ka = Object.keys(a).filter((k) => a[k] !== undefined);
  const kb = Object.keys(b).filter((k) => b[k] !== undefined);
  return ka.length === kb.length && ka.every((k) => deepEqual(a[k], b[k]));
}

/** How a list item is recognised across devices: its id, or the day/week it records. */
function identity(item: Json): string | null {
  if (!isObj(item)) return null;
  if (typeof item.id === "string") return `id:${item.id}`;
  if (typeof item.date === "string") return `date:${item.date}`;
  if (typeof item.weekNumber === "number") return `week:${item.year ?? ""}-${item.weekNumber}`;
  return null;
}

const keyed = (list: Json[]) => list.every((x) => identity(x) !== null);
const primitive = (list: Json[]) => list.every((x) => x === null || typeof x !== "object");

/**
 * Three-way merge. Whatever only one side changed since `base` is taken from that side; records are matched by
 * identity so additions and deletions on both devices combine. When both sides changed the same plain value,
 * `prefer` decides: this device normally, the remote when a device joins for the first time.
 */
export function merge3(base: Json, local: Json, remote: Json, prefer: "local" | "remote" = "local"): Json {
  if (deepEqual(local, remote)) return local;
  if (deepEqual(base, local)) return remote;
  if (deepEqual(base, remote)) return local;

  if (isObj(local) && isObj(remote)) {
    const b = isObj(base) ? base : {};
    const out: Record<string, Json> = {};
    for (const k of new Set([...Object.keys(local), ...Object.keys(remote)])) {
      const inL = k in local && local[k] !== undefined;
      const inR = k in remote && remote[k] !== undefined;
      const inB = k in b && b[k] !== undefined;
      if (inL && inR) out[k] = merge3(b[k], local[k], remote[k], prefer);
      else if (inL) {
        // Gone remotely: a real deletion if the remote had it before and this side didn't touch it.
        if (!(inB && deepEqual(b[k], local[k]))) out[k] = local[k];
      } else if (inR) {
        if (!(inB && deepEqual(b[k], remote[k]))) out[k] = remote[k];
      }
    }
    return out;
  }

  if (Array.isArray(local) && Array.isArray(remote)) {
    const b: Json[] = Array.isArray(base) ? base : [];
    const all = [...b, ...local, ...remote];
    if (all.length === 0) return [];
    if (all.every((x) => identity(x) !== null)) return mergeKeyed(b, local, remote, prefer);
    if (all.every((x) => x === null || typeof x !== "object")) return mergeSet(b, local, remote);
  }

  return prefer === "remote" ? remote : local;
}

function mergeKeyed(base: Json[], local: Json[], remote: Json[], prefer: "local" | "remote"): Json[] {
  const B = new Map(base.map((x) => [identity(x)!, x]));
  const L = new Map(local.map((x) => [identity(x)!, x]));
  const R = new Map(remote.map((x) => [identity(x)!, x]));

  const resolve = (id: string): Json | undefined => {
    const b = B.get(id);
    const l = L.get(id);
    const r = R.get(id);
    if (l !== undefined && r !== undefined) return merge3(b, l, r, prefer);
    // Deleted on one side: stays deleted unless the other side edited it meanwhile (an edit beats a delete).
    if (l !== undefined) return b !== undefined && deepEqual(b, l) ? undefined : l;
    if (r !== undefined) return b !== undefined && deepEqual(b, r) ? undefined : r;
    return undefined;
  };

  const out: Json[] = [];
  const placed = new Set<string>();
  for (const x of local) {
    const id = identity(x)!;
    const v = resolve(id);
    if (v !== undefined) {
      out.push(v);
      placed.add(id);
    }
  }
  // Records only the remote has go next to their remote neighbour, so newest-first lists stay newest-first.
  let after: string | null = null;
  for (const x of remote) {
    const id = identity(x)!;
    if (!placed.has(id)) {
      const v = resolve(id);
      if (v !== undefined) {
        const at = after === null ? 0 : out.findIndex((y) => identity(y) === after) + 1;
        out.splice(at, 0, v);
        placed.add(id);
      }
    }
    if (placed.has(id)) after = id;
  }
  return out;
}

function mergeSet(base: Json[], local: Json[], remote: Json[]): Json[] {
  const has = (list: Json[], v: Json) => list.some((x) => x === v);
  const out = local.filter((v) => has(remote, v) || !has(base, v));
  for (const v of remote) if (!has(out, v) && !has(base, v)) out.push(v);
  return out;
}

/* ---------------- shared vs local fields ---------------- */

export function shared(slot: Slot, p: Persisted): Persisted {
  const drop = LOCAL_ONLY[slot] ?? [];
  const state: Record<string, Json> = {};
  for (const [k, v] of Object.entries(p.state ?? {})) if (!drop.includes(k) && typeof v !== "function") state[k] = v;
  return { ...p, state };
}

/** The synced copy with this device's runtime fields put back. */
export function withLocal(slot: Slot, synced: Persisted, current: Persisted | null): Persisted {
  const keep = LOCAL_ONLY[slot] ?? [];
  const state = { ...synced.state };
  for (const k of keep) if (current?.state && k in current.state) state[k] = current.state[k];
  return { ...synced, state };
}

/* ---------------- Supabase over plain HTTP ---------------- */

export interface SyncConfig {
  url: string;
  /** The project's publishable (or legacy anon) key: public by design, rows are protected by RLS. */
  key: string;
  email: string;
  device: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface Row {
  slot: Slot;
  data: Persisted;
  updated_at: string;
}

const base = (url: string) => url.replace(/\/+$/, "");

async function request(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = body?.msg || body?.message || body?.error_description || body?.error || `HTTP ${res.status}`;
    const err = new Error(String(msg)) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return body;
}

const toSession = (b: Json): Session => ({
  accessToken: b.access_token,
  refreshToken: b.refresh_token,
  expiresAt: (b.expires_at ? b.expires_at * 1000 : Date.now() + (b.expires_in ?? 3600) * 1000) - 60_000,
});

export async function signIn(cfg: SyncConfig, password: string): Promise<Session> {
  const b = await request(`${base(cfg.url)}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: cfg.key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: cfg.email, password }),
  });
  return toSession(b);
}

export async function refresh(cfg: SyncConfig, s: Session): Promise<Session> {
  if (Date.now() < s.expiresAt) return s;
  const b = await request(`${base(cfg.url)}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: cfg.key, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: s.refreshToken }),
  });
  return toSession(b);
}

export interface Remote {
  list(): Promise<Row[]>;
  insert(slot: Slot, data: Persisted): Promise<Row | null>;
  /** Writes only if the row still carries `ifUpdatedAt`; null means someone else wrote first. */
  update(slot: Slot, data: Persisted, ifUpdatedAt: string): Promise<Row | null>;
}

export function supabaseRemote(cfg: SyncConfig, accessToken: string): Remote {
  const table = `${base(cfg.url)}/rest/v1/adrik_sync`;
  const headers = {
    apikey: cfg.key,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  return {
    list: () => request(`${table}?select=slot,data,updated_at`, { headers }),
    insert: async (slot, data) => {
      try {
        const rows = await request(table, { method: "POST", headers, body: JSON.stringify({ slot, data, device: cfg.device }) });
        return rows?.[0] ?? null;
      } catch (e) {
        if ((e as { status?: number }).status === 409) return null;
        throw e;
      }
    },
    update: async (slot, data, ifUpdatedAt) => {
      const q = `?slot=eq.${slot}&updated_at=eq.${encodeURIComponent(ifUpdatedAt)}`;
      const rows = await request(table + q, { method: "PATCH", headers, body: JSON.stringify({ data, device: cfg.device }) });
      return rows?.[0] ?? null;
    },
  };
}

/* ---------------- the sync pass ---------------- */

export interface SlotMeta {
  /** The remote timestamp this device last saw. */
  remoteAt: string | null;
}

export interface LocalSide {
  read(slot: Slot): Promise<Persisted | null>;
  /** Saves the copy and reloads the store from it. */
  write(slot: Slot, p: Persisted): Promise<void>;
  readBase(slot: Slot): Promise<Persisted | null>;
  writeBase(slot: Slot, p: Persisted): Promise<void>;
  readMeta(slot: Slot): Promise<SlotMeta>;
  writeMeta(slot: Slot, m: SlotMeta): Promise<void>;
}

export type SlotResult = "same" | "pulled" | "pushed" | "merged";

export async function syncAll(remote: Remote, local: LocalSide): Promise<Record<Slot, SlotResult>> {
  // Decided once, before any slot is pulled: a device that was never set up (onboarding not done)
  // has nothing worth keeping or sending, in any slot.
  const main = await local.read("main");
  const fresh = !main?.state?.onboardingDone;
  const prefetchedRows = await remote.list();
  const out = {} as Record<Slot, SlotResult>;
  for (const slot of Object.keys(SYNC_SLOTS) as Slot[]) out[slot] = await syncSlot(remote, local, slot, fresh, 0, prefetchedRows);
  return out;
}

async function syncSlot(remote: Remote, local: LocalSide, slot: Slot, fresh: boolean, attempt = 0, prefetchedRows?: Row[]): Promise<SlotResult> {
  if (attempt > 3) throw new Error("تعذّرت المزامنة: البيانات تتغيّر على جهاز آخر الآن. أعد المحاولة بعد لحظة.");
  const rows = attempt === 0 && prefetchedRows ? prefetchedRows : await remote.list();
  const row = rows.find((r) => r.slot === slot);
  const current = await local.read(slot);
  const mine = current ? shared(slot, current) : null;
  const meta = await local.readMeta(slot);
  const baseCopy = await local.readBase(slot);

  const settle = async (data: Persisted, at: string) => {
    await local.writeBase(slot, data);
    await local.writeMeta(slot, { remoteAt: at });
  };

  if (!row) {
    // A device that was never set up never creates the synced copy: an empty phone must not stand in for real data.
    if (!mine || fresh) return "same";
    const created = await remote.insert(slot, mine);
    if (!created) return syncSlot(remote, local, slot, fresh, attempt + 1);
    await settle(mine, created.updated_at);
    return "pushed";
  }

  const theirs = shared(slot, row.data);
  // A device that was never set up has nothing worth keeping: it simply takes the synced copy.
  if (!mine || fresh) {
    await local.write(slot, withLocal(slot, theirs, current));
    await settle(theirs, row.updated_at);
    return "pulled";
  }

  const remoteChanged = row.updated_at !== meta.remoteAt;
  const localChanged = !baseCopy || !deepEqual(mine, baseCopy);
  if (!remoteChanged && !localChanged) return "same";
  if (remoteChanged && !localChanged) {
    await local.write(slot, withLocal(slot, theirs, current));
    await settle(theirs, row.updated_at);
    return "pulled";
  }

  // A device's first sync (no base) merges both copies as a union, so no record on either side is lost;
  // where a single value differs, the copy already synced wins.
  const merged: Persisted = remoteChanged ? merge3(baseCopy ?? { state: {} }, mine, theirs, baseCopy ? "local" : "remote") : mine;
  if (deepEqual(merged, theirs)) {
    await local.write(slot, withLocal(slot, theirs, current));
    await settle(theirs, row.updated_at);
    return "pulled";
  }
  const written = await remote.update(slot, merged, row.updated_at);
  if (!written) return syncSlot(remote, local, slot, fresh, attempt + 1);
  if (!deepEqual(merged, mine)) await local.write(slot, withLocal(slot, merged, current));
  await settle(merged, written.updated_at);
  return remoteChanged ? "merged" : "pushed";
}

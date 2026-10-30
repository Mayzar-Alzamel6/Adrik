/**
 * The computer's side of Wi-Fi sync: the same one-row-per-slot table as Supabase, kept in a JSON file on this PC.
 * Pure Node (no Next imports) so tests can run it. The route in app/api/lan-sync only adapts requests to `handleLan`.
 *
 * Every call except `info` needs the sync password in `x-sync-key`. The password is chosen only on this
 * computer with `npm run sync-password` (never over the network: a request's Host header proves nothing).
 * Only a salted scrypt hash of it is stored. Wrong passwords lock the endpoint for a minute after five misses.
 */
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, copyFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import path from "node:path";

const SLOTS = ["main", "vault", "planner", "projects"];
export const MIN_PASSWORD = 6;
const SET_ON_PC = "عيّنها على الكمبيوتر: شغّل npm run sync-password في مجلد التطبيق.";

interface Row {
  slot: string;
  data: unknown;
  updated_at: string;
  device?: string;
}

interface Auth {
  salt: string;
  hash: string;
  /** Absent on hashes saved before scrypt (single sha256); upgraded on the next correct password. */
  kdf?: "scrypt";
}

interface Db {
  auth: Auth | null;
  rows: Record<string, Row>;
}

export interface LanRequest {
  method: string;
  key: string | null;
  body: unknown;
}

export interface LanResponse {
  status: number;
  body: unknown;
}

const dir = () => process.env.LAN_SYNC_DIR || path.join(process.cwd(), ".lan-sync");
const file = () => path.join(dir(), "data.json");

function load(): Db {
  try {
    const db = JSON.parse(readFileSync(file(), "utf8"));
    return { auth: db.auth ?? null, rows: db.rows ?? {} };
  } catch {
    return { auth: null, rows: {} };
  }
}

function save(db: Db) {
  mkdirSync(dir(), { recursive: true });
  const f = file();
  // Keep the previous copy: a bad merge on a device must never be the only copy left on the PC.
  if (existsSync(f)) copyFileSync(f, `${f}.bak`);
  const tmp = `${f}.tmp`;
  writeFileSync(tmp, JSON.stringify(db));
  renameSync(tmp, f);
}

const legacyHash = (salt: string, password: string) => createHash("sha256").update(`${salt}:${password}`).digest("hex");
const scryptHash = (salt: string, password: string) => scryptSync(password, salt, 32).toString("hex");

function newAuth(password: string): Auth {
  const salt = randomBytes(16).toString("hex");
  return { salt, hash: scryptHash(salt, password), kdf: "scrypt" };
}

function passwordOk(auth: Auth | null, key: string | null): boolean {
  if (!auth || !key) return false;
  const a = Buffer.from(auth.kdf === "scrypt" ? scryptHash(auth.salt, key) : legacyHash(auth.salt, key));
  const b = Buffer.from(auth.hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Chooses or replaces the sync password. Run on this computer only, by `scripts/sync-password.mjs`. */
export function setLanPassword(password: string): { ok: true } | { ok: false; error: string } {
  if (password.length < MIN_PASSWORD) return { ok: false, error: `كلمة المزامنة ${MIN_PASSWORD} أحرف على الأقل.` };
  const db = load();
  db.auth = newAuth(password);
  save(db);
  return { ok: true };
}

let misses = 0;
let lockedUntil = 0;

/** Strictly increasing, so two writes in the same millisecond still differ. */
let lastStamp = 0;
function stamp(): string {
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  return new Date(lastStamp).toISOString().replace("Z", `${String(lastStamp % 1000).padStart(3, "0")}Z`);
}

export function lanAddresses(): string[] {
  const out: string[] = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const i of list ?? []) if (i.family === "IPv4" && !i.internal) out.push(i.address);
  }
  return out;
}

export function handleLan(req: LanRequest): LanResponse {
  const db = load();
  const body = (req.body ?? {}) as Record<string, unknown>;

  if (req.method === "GET" && !req.key) {
    return { status: 200, body: { hasPassword: Boolean(db.auth), addresses: lanAddresses() } };
  }

  // Any device on the Wi-Fi can reach this endpoint and fake its Host header, so the password is never set over HTTP.
  if (req.method === "POST" && body.action === "setup") {
    return { status: 403, body: { error: SET_ON_PC } };
  }

  if (!db.auth) return { status: 401, body: { error: `لم تُعيَّن كلمة المزامنة بعد. ${SET_ON_PC}` } };
  if (Date.now() < lockedUntil) return { status: 429, body: { error: "محاولات كثيرة خاطئة. حاول بعد دقيقة." } };
  if (!passwordOk(db.auth, req.key)) {
    if (++misses >= 5) {
      misses = 0;
      lockedUntil = Date.now() + 60_000;
    }
    return { status: 401, body: { error: "كلمة المزامنة غير صحيحة." } };
  }
  misses = 0;
  if (db.auth.kdf !== "scrypt") {
    db.auth = newAuth(req.key!);
    save(db);
  }

  if (req.method === "GET") return { status: 200, body: Object.values(db.rows).map(({ slot, data, updated_at }) => ({ slot, data, updated_at })) };

  const slot = String(body.slot ?? "");
  if (!SLOTS.includes(slot)) return { status: 400, body: { error: "slot غير معروف." } };
  const device = typeof body.device === "string" ? body.device.slice(0, 60) : undefined;

  if (req.method === "POST") {
    if (db.rows[slot]) return { status: 409, body: { error: "exists" } };
    const row: Row = { slot, data: body.data, updated_at: stamp(), device };
    db.rows[slot] = row;
    save(db);
    return { status: 200, body: [{ slot, data: row.data, updated_at: row.updated_at }] };
  }

  if (req.method === "PUT") {
    const row = db.rows[slot];
    if (!row || row.updated_at !== body.ifUpdatedAt) return { status: 409, body: { error: "changed" } };
    const next: Row = { slot, data: body.data, updated_at: stamp(), device };
    db.rows[slot] = next;
    save(db);
    return { status: 200, body: [{ slot, data: next.data, updated_at: next.updated_at }] };
  }

  return { status: 405, body: { error: "method" } };
}

/** Test hook: forget the failed-attempt counter. */
export function resetLanLimits() {
  misses = 0;
  lockedUntil = 0;
}

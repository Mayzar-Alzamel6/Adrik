/**
 * The computer's side of Wi-Fi sync: the same one-row-per-slot table as Supabase, kept in a JSON file on this PC.
 * Pure Node (no Next imports) so tests can run it. The route in app/api/lan-sync only adapts requests to `handleLan`.
 *
 * Every call except `info` and the first `setup` needs the sync password in `x-sync-key`.
 * Only a salted hash of it is stored. Wrong passwords lock the endpoint for a minute after five misses.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, copyFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import path from "node:path";

const SLOTS = ["main", "vault", "planner", "projects"];
export const MIN_PASSWORD = 6;

interface Row {
  slot: string;
  data: unknown;
  updated_at: string;
  device?: string;
}

interface Db {
  auth: { salt: string; hash: string } | null;
  rows: Record<string, Row>;
}

export interface LanRequest {
  method: string;
  key: string | null;
  /** The Host header, used to accept first-time setup only from this computer. */
  host: string | null;
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

const hash = (salt: string, password: string) => createHash("sha256").update(`${salt}:${password}`).digest("hex");

function passwordOk(db: Db, key: string | null): boolean {
  if (!db.auth || !key) return false;
  const a = Buffer.from(hash(db.auth.salt, key));
  const b = Buffer.from(db.auth.hash);
  return a.length === b.length && timingSafeEqual(a, b);
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

const isLocalHost = (host: string | null) => /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host ?? "");

export function handleLan(req: LanRequest): LanResponse {
  const db = load();
  const body = (req.body ?? {}) as Record<string, unknown>;

  if (req.method === "GET" && !req.key) {
    return { status: 200, body: { hasPassword: Boolean(db.auth), addresses: lanAddresses() } };
  }

  if (req.method === "POST" && body.action === "setup") {
    if (db.auth) return { status: 409, body: { error: "كلمة المزامنة موجودة مسبقاً." } };
    // The first password can only be chosen from this computer, not from another device on the network.
    if (!isLocalHost(req.host)) return { status: 403, body: { error: "اختر كلمة المزامنة من الكمبيوتر نفسه." } };
    const password = String(body.password ?? "");
    if (password.length < MIN_PASSWORD) return { status: 400, body: { error: `كلمة المزامنة ${MIN_PASSWORD} أحرف على الأقل.` } };
    const salt = randomBytes(16).toString("hex");
    db.auth = { salt, hash: hash(salt, password) };
    save(db);
    return { status: 200, body: { ok: true } };
  }

  if (!db.auth) return { status: 401, body: { error: "لم تُعيَّن كلمة المزامنة بعد. افتح الإعدادات على الكمبيوتر أولاً." } };
  if (Date.now() < lockedUntil) return { status: 429, body: { error: "محاولات كثيرة خاطئة. حاول بعد دقيقة." } };
  if (!passwordOk(db, req.key)) {
    if (++misses >= 5) {
      misses = 0;
      lockedUntil = Date.now() + 60_000;
    }
    return { status: 401, body: { error: "كلمة المزامنة غير صحيحة." } };
  }
  misses = 0;

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

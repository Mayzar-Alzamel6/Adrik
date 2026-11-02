/**
 * The computer's side of Wi-Fi sync: the same one-row-per-slot table as Supabase, kept in a JSON file on this PC.
 * Pure Node (no Next imports) so tests can run it. The route in app/api/lan-sync only adapts requests to `handleLan`.
 *
 * The sync password is chosen only on this computer with `npm run sync-password` (never over the network).
 * What is stored is the key derived from it (scrypt, see `LAN_KDF` in core.ts), not the password: every request
 * and reply is sealed with that key (ChaCha20-Poly1305), so the data never crosses the Wi-Fi in the clear and a
 * request that doesn't open is refused. Requests older than five minutes, or seen before, are refused too.
 * Failed requests lock the device that sent them (five misses, one minute), and any thirty misses within ten
 * minutes lock everyone for five, so rotating device names doesn't buy unlimited guesses.
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, copyFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { LAN_KDF, LAN_MIN_PASSWORD } from "./core";

const SLOTS = ["main", "vault", "planner", "projects"];
const SET_ON_PC = "عيّنها على الكمبيوتر: شغّل npm run sync-password في مجلد التطبيق.";
const AAD = "adrik-lan-v1";
const MAX_AGE_MS = 5 * 60_000;

interface Row {
  slot: string;
  data: unknown;
  updated_at: string;
  device?: string;
}

interface Auth {
  salt: string;
  /** The sync key (hex). Absent on files from before sealed sync, which held only a password hash. */
  key?: string;
}

interface Db {
  auth: Auth | null;
  rows: Record<string, Row>;
}

export interface LanRequest {
  method: string;
  /** The sender's device name (plain header), used only to scope the lockout. */
  device: string | null;
  /** True when the request names this computer as its host: decides whether `info` lists the addresses. */
  local: boolean;
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

export const deriveLanKey = (password: string, salt: string) =>
  scryptSync(password, salt, LAN_KDF.dkLen, { N: LAN_KDF.N, r: LAN_KDF.r, p: LAN_KDF.p, maxmem: 64 * 1024 * 1024 }).toString("hex");

/** Chooses or replaces the sync password. Run on this computer only, by `scripts/sync-password.mjs`. */
export function setLanPassword(password: string): { ok: true } | { ok: false; error: string } {
  if (password.length < LAN_MIN_PASSWORD) return { ok: false, error: `كلمة المزامنة ${LAN_MIN_PASSWORD} أحرف على الأقل.` };
  const db = load();
  const salt = randomBytes(16).toString("hex");
  db.auth = { salt, key: deriveLanKey(password, salt) };
  save(db);
  return { ok: true };
}

function seal(key: string, value: unknown, aad: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("chacha20-poly1305", Buffer.from(key, "hex"), nonce, { authTagLength: 16 });
  const plain = Buffer.from(JSON.stringify(value), "utf8");
  cipher.setAAD(Buffer.from(aad), { plaintextLength: plain.length });
  const c = Buffer.concat([cipher.update(plain), cipher.final(), cipher.getAuthTag()]);
  return { n: nonce.toString("base64"), c: c.toString("base64") };
}

function open(key: string, n: unknown, c: unknown): Record<string, unknown> | null {
  if (typeof n !== "string" || typeof c !== "string") return null;
  try {
    const nonce = Buffer.from(n, "base64");
    const all = Buffer.from(c, "base64");
    if (nonce.length !== 12 || all.length < 16) return null;
    const decipher = createDecipheriv("chacha20-poly1305", Buffer.from(key, "hex"), nonce, { authTagLength: 16 });
    const body = all.subarray(0, all.length - 16);
    decipher.setAAD(Buffer.from(AAD), { plaintextLength: body.length });
    decipher.setAuthTag(all.subarray(all.length - 16));
    const plain = Buffer.concat([decipher.update(body), decipher.final()]);
    return JSON.parse(plain.toString("utf8"));
  } catch {
    return null;
  }
}

// Lockout: per device, plus a ceiling over all devices.
const DEVICE_MISSES = 5;
const DEVICE_LOCK_MS = 60_000;
const GLOBAL_MISSES = 30;
const GLOBAL_WINDOW_MS = 10 * 60_000;
const GLOBAL_LOCK_MS = 5 * 60_000;
let devices = new Map<string, { misses: number; lockedUntil: number }>();
let recentMisses: number[] = [];
let globalLockedUntil = 0;
/** Nonces of accepted requests in the last few minutes, so a captured request can't be sent again. */
let seen = new Map<string, number>();

function locked(device: string, now: number) {
  return now < globalLockedUntil || now < (devices.get(device)?.lockedUntil ?? 0);
}

function miss(device: string, now: number) {
  const d = devices.get(device) ?? { misses: 0, lockedUntil: 0 };
  if (++d.misses >= DEVICE_MISSES) {
    d.misses = 0;
    d.lockedUntil = now + DEVICE_LOCK_MS;
  }
  devices.set(device, d);
  recentMisses = [...recentMisses.filter((t) => now - t < GLOBAL_WINDOW_MS), now];
  if (recentMisses.length >= GLOBAL_MISSES) {
    recentMisses = [];
    globalLockedUntil = now + GLOBAL_LOCK_MS;
  }
}

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
  const key = db.auth?.key;

  if (req.method === "GET") {
    // The Host header is the sender's to choose, so the addresses are a convenience for the computer's own page, not a secret.
    return { status: 200, body: { hasPassword: Boolean(key), salt: key ? db.auth!.salt : null, addresses: req.local ? lanAddresses() : [] } };
  }
  if (req.method !== "POST") return { status: 405, body: { error: "method" } };

  // Any device on the Wi-Fi can reach this endpoint, so the password is never set over HTTP.
  if (body.action === "setup") return { status: 403, body: { error: SET_ON_PC } };
  if (!key) {
    const again = db.auth ? "تغيّرت طريقة المزامنة: أعد تعيين كلمة المزامنة. " : "لم تُعيَّن كلمة المزامنة بعد. ";
    return { status: 401, body: { error: again + SET_ON_PC } };
  }

  const now = Date.now();
  const device = (req.device ?? "").slice(0, 60) || "?";
  if (locked(device, now)) return { status: 429, body: { error: "محاولات كثيرة خاطئة. حاول بعد دقائق." } };
  const op = open(key, body.n, body.c);
  if (!op) {
    miss(device, now);
    return { status: 401, body: { error: "كلمة المزامنة غير صحيحة." } };
  }
  for (const [n, at] of seen) if (now - at > MAX_AGE_MS) seen.delete(n);
  if (typeof op.ts !== "number" || Math.abs(now - op.ts) > MAX_AGE_MS) {
    return { status: 401, body: { error: "ساعة الجهاز لا توافق ساعة الكمبيوتر. اضبط الوقت على الجهازين." } };
  }
  if (seen.has(body.n as string)) return { status: 401, body: { error: "طلب مكرر." } };
  seen.set(body.n as string, now);
  devices.delete(device);

  const ok = (value: unknown): LanResponse => ({ status: 200, body: seal(key, value, `${AAD}:${body.n}`) });

  if (op.op === "list") return ok(Object.values(db.rows).map(({ slot, data, updated_at }) => ({ slot, data, updated_at })));

  const slot = String(op.slot ?? "");
  if (!SLOTS.includes(slot)) return { status: 400, body: { error: "slot غير معروف." } };
  const writer = typeof op.device === "string" ? op.device.slice(0, 60) : undefined;

  if (op.op === "insert") {
    if (db.rows[slot]) return { status: 409, body: { error: "exists" } };
    const row: Row = { slot, data: op.data, updated_at: stamp(), device: writer };
    db.rows[slot] = row;
    save(db);
    return ok([{ slot, data: row.data, updated_at: row.updated_at }]);
  }

  if (op.op === "update") {
    const row = db.rows[slot];
    if (!row || row.updated_at !== op.ifUpdatedAt) return { status: 409, body: { error: "changed" } };
    const next: Row = { slot, data: op.data, updated_at: stamp(), device: writer };
    db.rows[slot] = next;
    save(db);
    return ok([{ slot, data: next.data, updated_at: next.updated_at }]);
  }

  return { status: 400, body: { error: "op" } };
}

/** Test hook: forget lockouts and seen requests. */
export function resetLanLimits() {
  devices = new Map();
  recentMisses = [];
  globalLockedUntil = 0;
  seen = new Map();
}

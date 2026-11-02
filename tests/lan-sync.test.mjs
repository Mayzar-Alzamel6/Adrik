// Wi-Fi sync: the PC's file-backed store behind a real HTTP server, two devices syncing through `lanRemote`.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = mkdtempSync(path.join(os.tmpdir(), "lan-sync-"));
process.env.LAN_SYNC_DIR = dir;

const { deriveLanKey, handleLan, resetLanLimits, setLanPassword } = await import("../src/lib/sync/lanServer.ts");
const { lanInfo, lanKey, lanRemote, lanUrl, startSession, syncAll } = await import("../src/lib/sync/core.ts");

let server;
let url;
/** Every request body the computer received, as it crossed the network. */
const wire = [];

before(async () => {
  server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      if (raw) wire.push(raw);
      const host = (req.headers.host ?? "").replace(/:\d+$/, "");
      const out = handleLan({
        method: req.method,
        device: req.headers["x-sync-device"] ? decodeURIComponent(req.headers["x-sync-device"]) : null,
        local: host === "localhost",
        body: raw ? JSON.parse(raw) : null,
      });
      res.writeHead(out.status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(out.body));
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  url = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

const post = (body, headers = {}) =>
  fetch(`${url}/api/lan-sync`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });

function memoryDevice(stores = {}) {
  const data = new Map(Object.entries(stores).map(([k, v]) => [k, structuredClone(v)]));
  const bases = new Map();
  const metas = new Map();
  return {
    data,
    read: async (slot) => (data.has(slot) ? structuredClone(data.get(slot)) : null),
    write: async (slot, p) => void data.set(slot, structuredClone(p)),
    readBase: async (slot) => bases.get(slot) ?? null,
    writeBase: async (slot, p) => void bases.set(slot, structuredClone(p)),
    readMeta: async (slot) => metas.get(slot) ?? { remoteAt: null },
    writeMeta: async (slot, m) => void metas.set(slot, m),
  };
}

const cfg = (key, device = "pc") => ({ url, key, email: "", device, mode: "lan" });
const dataFile = () => JSON.parse(readFileSync(path.join(dir, "data.json"), "utf8"));
let key;

test("lanUrl fills in the scheme and port", () => {
  assert.equal(lanUrl("192.168.2.105"), "http://192.168.2.105:3334");
  assert.equal(lanUrl(" 192.168.2.105:4000/ "), "http://192.168.2.105:4000");
  assert.equal(lanUrl("http://localhost:3334"), "http://localhost:3334");
});

test("nothing works before the password is chosen, and a short one is refused", async () => {
  const info = await lanInfo(url);
  assert.equal(info.hasPassword, false);
  assert.equal(info.salt, null);
  await assert.rejects(() => lanKey(url, "whatever-pass"), /لم تُعيَّن/);
  assert.equal(setLanPassword("1234567").ok, false);
});

test("the password is never set over the network", async () => {
  const res = await post({ action: "setup", password: "secret-pass" }, { Host: "localhost" });
  assert.equal(res.status, 403);
  assert.equal((await lanInfo(url)).hasPassword, false);
  wire.length = 0; // that refused request carried a password on purpose; from here on, the wire is checked
});

test("the computer keeps the derived key, never the password; devices derive the same key", async () => {
  assert.equal(setLanPassword("secret-pass").ok, true);
  const { auth } = dataFile();
  assert.ok(!JSON.stringify(auth).includes("secret-pass"));
  key = await lanKey(url, "secret-pass");
  assert.equal(key, auth.key);
  assert.equal(key, deriveLanKey("secret-pass", auth.salt));
  await startSession(cfg(key), "");
});

test("the addresses are listed only on the computer's own page", async () => {
  assert.deepEqual((await lanInfo(url)).addresses, []);
  const local = await (await fetch(`${url}/api/lan-sync`, { headers: { Host: "localhost" } })).json();
  assert.ok(Array.isArray(local.addresses));
});

test("a device holding a password instead of a key is asked to connect again", async () => {
  await assert.rejects(() => startSession(cfg("secret-pass"), ""), /أعد ربط المزامنة/);
});

test("a wrong key locks only its own device; many misses from rotating names lock everyone", async () => {
  resetLanLimits();
  const wrong = await lanKey(url, "wrong-password");
  await assert.rejects(() => startSession(cfg(wrong, "intruder"), ""), /غير صحيحة/);
  for (let i = 0; i < 4; i++) await assert.rejects(() => startSession(cfg(wrong, "intruder"), ""));
  await assert.rejects(() => startSession(cfg(wrong, "intruder"), ""), /محاولات كثيرة/);
  await startSession(cfg(key, "phone"), "");

  for (let i = 0; i < 30; i++) await assert.rejects(() => startSession(cfg(wrong, `name-${i}`), ""));
  await assert.rejects(() => startSession(cfg(key, "phone"), ""), /محاولات كثيرة/);
  resetLanLimits();
  await startSession(cfg(key, "phone"), "");
});

test("an old password-hash file asks for the password to be set again", async () => {
  const saved = readFileSync(path.join(dir, "data.json"), "utf8");
  const db = dataFile();
  db.auth = { salt: "abc", hash: "00", kdf: "scrypt" };
  writeFileSync(path.join(dir, "data.json"), JSON.stringify(db));
  assert.equal((await lanInfo(url)).hasPassword, false);
  await assert.rejects(() => startSession(cfg(key), ""), /أعد تعيين/);
  writeFileSync(path.join(dir, "data.json"), saved);
});

test("two devices converge through the computer, edits on both sides survive, a fresh phone only pulls", async () => {
  const pc = memoryDevice({
    main: { version: 2, state: { onboardingDone: true, userName: "م", frogs: [{ id: "f-1", title: "تقرير" }] } },
  });
  const pcRemote = lanRemote(cfg(key, "pc"));
  const phoneRemote = lanRemote(cfg(key, "phone"));

  assert.equal((await syncAll(pcRemote, pc)).main, "pushed");

  const phone = memoryDevice({ main: { version: 2, state: { onboardingDone: false, frogs: [] } } });
  assert.equal((await syncAll(phoneRemote, phone)).main, "pulled");
  assert.deepEqual((await phone.read("main")).state.frogs, [{ id: "f-1", title: "تقرير" }]);

  const phoneMain = await phone.read("main");
  phoneMain.state.frogs.push({ id: "f-2", title: "من الجوال" });
  phone.data.set("main", phoneMain);
  const pcMain = await pc.read("main");
  pcMain.state.frogs.push({ id: "f-3", title: "من الكمبيوتر" });
  pc.data.set("main", pcMain);

  assert.equal((await syncAll(phoneRemote, phone)).main, "pushed");
  assert.equal((await syncAll(pcRemote, pc)).main, "merged");
  assert.equal((await syncAll(phoneRemote, phone)).main, "pulled");

  const ids = async (d) => (await d.read("main")).state.frogs.map((f) => f.id).sort();
  assert.deepEqual(await ids(pc), ["f-1", "f-2", "f-3"]);
  assert.deepEqual(await ids(phone), ["f-1", "f-2", "f-3"]);
});

test("a stale conditional write is refused instead of overwriting", async () => {
  const remote = lanRemote(cfg(key));
  const [row] = (await remote.list()).filter((r) => r.slot === "main");
  const first = await remote.update("main", row.data, row.updated_at);
  assert.ok(first);
  assert.equal(await remote.update("main", row.data, row.updated_at), null);
  assert.equal(await remote.insert("main", row.data), null);
});

test("nothing crosses the Wi-Fi in the clear: no data, no password, no key", () => {
  const all = wire.join("\n");
  assert.ok(wire.length > 5);
  for (const secret of ["تقرير", "من الجوال", "onboardingDone", "secret-pass", key]) assert.ok(!all.includes(secret), secret);
});

test("a captured request can't be sent again, and a stale one is refused", async () => {
  const captured = JSON.parse(wire.at(-1));
  const again = await post(captured);
  assert.equal(again.status, 401);
  assert.match((await again.json()).error, /مكرر/);
  const forged = await post({ ...captured, c: captured.c.slice(0, -4) + "AAAA" });
  assert.equal(forged.status, 401);
  resetLanLimits();
});

// Wi-Fi sync: the PC's file-backed store behind a real HTTP server, two devices syncing through `lanRemote`.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";

const dir = mkdtempSync(path.join(os.tmpdir(), "lan-sync-"));
process.env.LAN_SYNC_DIR = dir;

const { handleLan, resetLanLimits, setLanPassword } = await import("../src/lib/sync/lanServer.ts");
const { lanRemote, lanInfo, lanSetup, lanUrl, startSession, syncAll } = await import("../src/lib/sync/core.ts");

let server;
let url;

before(async () => {
  server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const out = handleLan({
        method: req.method,
        key: req.headers["x-sync-key"] ?? null,
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

test("lanUrl fills in the scheme and port", () => {
  assert.equal(lanUrl("192.168.2.105"), "http://192.168.2.105:3334");
  assert.equal(lanUrl(" 192.168.2.105:4000/ "), "http://192.168.2.105:4000");
  assert.equal(lanUrl("http://localhost:3334"), "http://localhost:3334");
});

const dataFile = () => JSON.parse(readFileSync(path.join(dir, "data.json"), "utf8"));

test("nothing works before the password is chosen, and a short one is refused", async () => {
  assert.equal((await lanInfo(url)).hasPassword, false);
  await assert.rejects(() => startSession(cfg("whatever"), ""), /لم تُعيَّن/);
  assert.equal(setLanPassword("123").ok, false);
});

test("the password is never set over the network, whatever the Host header says", async () => {
  await assert.rejects(() => lanSetup(url, "secret-pass"), /npm run sync-password/);
  const forged = handleLan({ method: "POST", key: null, body: { action: "setup", password: "secret-pass" } });
  assert.equal(forged.status, 403);
  assert.equal((await lanInfo(url)).hasPassword, false);
});

test("the password set on the computer is stored as a salted scrypt hash", async () => {
  assert.equal(setLanPassword("secret-pass").ok, true);
  assert.equal((await lanInfo(url)).hasPassword, true);
  const { auth } = dataFile();
  assert.equal(auth.kdf, "scrypt");
  assert.ok(!JSON.stringify(auth).includes("secret-pass"));
  await startSession(cfg("secret-pass"), "");
});

test("an old sha256 hash still works once and is upgraded to scrypt", async () => {
  const saved = readFileSync(path.join(dir, "data.json"), "utf8");
  const salt = "abc";
  const db = dataFile();
  db.auth = { salt, hash: createHash("sha256").update(`${salt}:old-password`).digest("hex") };
  writeFileSync(path.join(dir, "data.json"), JSON.stringify(db));
  await startSession(cfg("old-password"), "");
  assert.equal(dataFile().auth.kdf, "scrypt");
  await startSession(cfg("old-password"), "");
  writeFileSync(path.join(dir, "data.json"), saved);
});

test("a wrong password is refused, five misses lock for a minute", async () => {
  await assert.rejects(() => startSession(cfg("nope-nope"), ""), /غير صحيحة/);
  for (let i = 0; i < 4; i++) await assert.rejects(() => startSession(cfg("nope-nope"), ""));
  await assert.rejects(() => startSession(cfg("secret-pass"), ""), /محاولات كثيرة/);
  resetLanLimits();
  await startSession(cfg("secret-pass"), "");
});

test("two devices converge through the computer, edits on both sides survive, a fresh phone only pulls", async () => {
  const pc = memoryDevice({
    main: { version: 2, state: { onboardingDone: true, userName: "م", frogs: [{ id: "f-1", title: "تقرير" }] } },
  });
  const pcRemote = lanRemote(cfg("secret-pass", "pc"));
  const phoneRemote = lanRemote(cfg("secret-pass", "phone"));

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
  const remote = lanRemote(cfg("secret-pass"));
  const [row] = (await remote.list()).filter((r) => r.slot === "main");
  const first = await remote.update("main", row.data, row.updated_at);
  assert.ok(first);
  assert.equal(await remote.update("main", row.data, row.updated_at), null);
  assert.equal(await remote.insert("main", row.data), null);
});

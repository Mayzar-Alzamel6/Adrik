// The sync engine between the founder's devices: a device that was never set up only pulls and never writes,
// and a device already in use still joins as a union. Same file in adrik-personal and adrik-mobile.
import { test } from "node:test";
import assert from "node:assert/strict";
import { merge3, syncAll } from "../src/lib/sync/core.ts";

/** An in-memory `adrik_sync` table with the same conditional writes as Supabase. */
function memoryRemote(rows = {}) {
  let clock = 0;
  const table = new Map(Object.entries(rows).map(([slot, data]) => [slot, { slot, data, updated_at: `t${++clock}` }]));
  const writes = [];
  return {
    table,
    writes,
    list: async () => [...table.values()].map((r) => structuredClone(r)),
    insert: async (slot, data) => {
      if (table.has(slot)) return null;
      const row = { slot, data: structuredClone(data), updated_at: `t${++clock}` };
      table.set(slot, row);
      writes.push(`insert:${slot}`);
      return structuredClone(row);
    },
    update: async (slot, data, ifUpdatedAt) => {
      const row = table.get(slot);
      if (!row || row.updated_at !== ifUpdatedAt) return null;
      const next = { slot, data: structuredClone(data), updated_at: `t${++clock}` };
      table.set(slot, next);
      writes.push(`update:${slot}`);
      return structuredClone(next);
    },
  };
}

/** One device's storage: the stores' saved copies plus the sync bookkeeping. */
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

const pcMain = {
  version: 2,
  state: {
    onboardingDone: true,
    userName: "المؤسس",
    values: [{ id: "val-a", title: "الإتقان" }],
    binaryHabits: [{ id: "h-1", title: "مشي" }],
    frogs: [{ id: "f-1", title: "تقرير" }],
    themeMode: "light",
  },
};
const pcProjects = { version: 0, state: { projects: [{ id: "prj-1", name: "التطبيق", tasks: [] }] } };
/** What a phone saves before onboarding: defaults only. */
const freshMain = { version: 2, state: { onboardingDone: false, userName: "", values: [], frogs: [], themeMode: "dark" } };
/** A phone that went through onboarding on its own: its records have their own ids. */
const usedPhoneMain = {
  version: 2,
  state: { onboardingDone: true, userName: "تجربة", values: [{ id: "val-x", title: "الإتقان" }], frogs: [{ id: "f-x", title: "شيء" }] },
};

const ids = (list) => list.map((x) => x.id).sort();

test("a phone that was never set up takes everything and writes nothing", async () => {
  const remote = memoryRemote({ main: pcMain, projects: pcProjects });
  const phone = memoryDevice({ main: freshMain });
  const res = await syncAll(remote, phone);
  assert.deepEqual(res, { main: "pulled", vault: "same", planner: "same", projects: "pulled" });
  assert.deepEqual(remote.writes, []);
  const main = phone.data.get("main").state;
  assert.equal(main.onboardingDone, true);
  assert.deepEqual(ids(main.values), ["val-a"]);
  assert.equal(main.userName, "المؤسس");
  assert.equal(main.themeMode, "dark", "runtime fields stay this device's own");
  assert.deepEqual(ids(phone.data.get("projects").state.projects), ["prj-1"]);
});

test("a phone with nothing saved at all also just pulls", async () => {
  const remote = memoryRemote({ main: pcMain });
  const phone = memoryDevice();
  const res = await syncAll(remote, phone);
  assert.equal(res.main, "pulled");
  assert.deepEqual(remote.writes, []);
  assert.equal(phone.data.get("main").state.onboardingDone, true);
});

test("a phone that was never set up never creates the synced copy, even when it is empty", async () => {
  const remote = memoryRemote();
  const phone = memoryDevice({ main: freshMain, planner: { state: { tasks: [] } } });
  const res = await syncAll(remote, phone);
  assert.deepEqual(res, { main: "same", vault: "same", planner: "same", projects: "same" });
  assert.equal(remote.table.size, 0);
});

test("after its first pull, the phone's own edits go up as usual, without duplicates", async () => {
  const remote = memoryRemote({ main: pcMain });
  const phone = memoryDevice({ main: freshMain });
  await syncAll(remote, phone);
  const main = phone.data.get("main");
  main.state.frogs = [...main.state.frogs, { id: "f-2", title: "من الهاتف" }];
  await phone.write("main", main);
  const res = await syncAll(remote, phone);
  assert.equal(res.main, "pushed");
  const synced = remote.table.get("main").data.state;
  assert.deepEqual(ids(synced.frogs), ["f-1", "f-2"]);
  assert.deepEqual(ids(synced.values), ["val-a"]);
});

test("a device already in use still joins as a union: nothing on either side is lost", async () => {
  const remote = memoryRemote({ main: pcMain });
  const phone = memoryDevice({ main: usedPhoneMain });
  const res = await syncAll(remote, phone);
  assert.equal(res.main, "merged");
  const synced = remote.table.get("main").data.state;
  assert.deepEqual(ids(synced.values), ["val-a", "val-x"]);
  assert.equal(synced.userName, "المؤسس", "on a first join the synced copy wins a plain value");
});

test("the computer, already set up, still creates the synced copy on its first sync", async () => {
  const remote = memoryRemote();
  const pc = memoryDevice({ main: pcMain, projects: pcProjects });
  const res = await syncAll(remote, pc);
  assert.equal(res.main, "pushed");
  assert.equal(res.projects, "pushed");
  assert.equal(remote.table.get("main").data.state.themeMode, undefined, "runtime fields are never sent");
});

test("merge3 merges primitive arrays correctly when one or more arrays are empty", () => {
  // Empty base, populated local, empty remote
  const res1 = merge3([], ["tag-1", "tag-2"], []);
  assert.deepEqual(res1, ["tag-1", "tag-2"]);

  // Empty base, empty local, populated remote
  const res2 = merge3([], [], ["tag-a", "tag-b"]);
  assert.deepEqual(res2, ["tag-a", "tag-b"]);

  // Empty base, populated on both sides
  const res3 = merge3([], ["alpha"], ["beta"]);
  assert.deepEqual([...res3].sort(), ["alpha", "beta"]);

  // All empty
  const res4 = merge3([], [], []);
  assert.deepEqual(res4, []);
});

test("merge3 merges keyed object arrays correctly when one or more arrays are empty", () => {
  // Empty base, populated local, empty remote
  const res1 = merge3([], [{ id: "t-1", title: "مهمة 1" }], []);
  assert.deepEqual(res1, [{ id: "t-1", title: "مهمة 1" }]);

  // Empty base, empty local, populated remote
  const res2 = merge3([], [], [{ id: "t-2", title: "مهمة 2" }]);
  assert.deepEqual(res2, [{ id: "t-2", title: "مهمة 2" }]);

  // Empty base, populated on both sides
  const res3 = merge3([], [{ id: "t-1", title: "1" }], [{ id: "t-2", title: "2" }]);
  assert.equal(res3.length, 2);
  assert.deepEqual(ids(res3), ["t-1", "t-2"]);

  // Populated base, one side deleted (empty), other side unmodified
  const res4 = merge3([{ id: "t-1", title: "1" }], [], [{ id: "t-1", title: "1" }]);
  assert.deepEqual(res4, [], "deletion on local side is preserved when remote did not modify");
});


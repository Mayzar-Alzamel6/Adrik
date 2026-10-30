import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyTuning,
  avgReturnMinutes,
  awayTrigger,
  deepBlocksOn,
  deepMinutesOn,
  drainShare,
  escalationFor,
  frogRate,
  isEarlyQuit,
  isNoStart,
  topDistractions,
  tuningChange,
} from "../src/lib/focusGuard.ts";
import { groupByAnchor } from "../src/stores/useAppStore.ts";

const at = (h, m = 0) => new Date(2026, 9, 30, h, m).toISOString();

test("awayTrigger: two exits or more than five minutes away is a slip", () => {
  assert.equal(awayTrigger(1, 60000), null);
  assert.equal(awayTrigger(2, 1000), "exits");
  assert.equal(awayTrigger(1, 5 * 60000 + 1), "away");
});

test("early quit and no-start thresholds", () => {
  assert.equal(isEarlyQuit(9 * 60000), true);
  assert.equal(isEarlyQuit(10 * 60000), false);
  assert.equal(isNoStart(0, 29 * 60000, false), false);
  assert.equal(isNoStart(0, 30 * 60000, false), true);
  assert.equal(isNoStart(0, 60 * 60000, true), false);
  assert.equal(isNoStart(null, 60 * 60000, false), false);
});

test("escalation ladder: third slip shortens, fourth recharges", () => {
  assert.equal(escalationFor(2), "none");
  assert.equal(escalationFor(3), "shorten");
  assert.equal(escalationFor(4), "recharge");
  assert.equal(escalationFor(7), "recharge");
});

test("avgReturnMinutes counts only slips that ended in a return", () => {
  const events = [
    { id: "1", date: "d", at: 0, trigger: "manual", resumedAt: 4 * 60000 },
    { id: "2", date: "d", at: 0, trigger: "manual", resumedAt: 8 * 60000 },
    { id: "3", date: "d", at: 0, trigger: "manual" },
  ];
  assert.equal(avgReturnMinutes(events), 6);
  assert.equal(avgReturnMinutes([]), null);
});

test("topDistractions ranks named kinds with a prevention tip", () => {
  const ev = (kind) => ({ id: kind + Math.random(), date: "d", at: 0, trigger: "manual", kind });
  const top = topDistractions([ev("phone"), ev("phone"), ev("idea"), ev("fatigue"), ev("fatigue"), ev("fatigue"), { id: "x", date: "d", at: 0, trigger: "exits" }]);
  assert.deepEqual(top.map((t) => [t.kind, t.count]), [["fatigue", 3], ["phone", 2], ["idea", 1]]);
  assert.ok(top[0].prevention.length > 0);
});

test("deep minutes: full sessions on non-drain work, misses and early exits excluded", () => {
  const sessions = [
    { endedAt: at(9), actualMinutes: 90, plannedMinutes: 90, completed: true, outcome: "DONE", taskId: "a" },
    { endedAt: at(11), actualMinutes: 60, plannedMinutes: 60, completed: true, outcome: null, taskId: "drain" },
    { endedAt: at(13), actualMinutes: 20, plannedMinutes: 45, completed: false, outcome: null, taskId: "a" },
    { endedAt: at(15), actualMinutes: 45, plannedMinutes: 45, completed: true, outcome: "NOT", taskId: "a" },
  ];
  const energy = (id) => (id === "drain" ? "drain" : "genius");
  assert.equal(deepMinutesOn("2026-10-30", sessions, energy), 90);
  assert.equal(deepBlocksOn("2026-10-30", sessions), 3);
});

test("frogRate: days whose first priority was delivered", () => {
  const days = [
    { date: "1", frogs: [{ order: 1, completedAt: "x" }, { order: 2 }] },
    { date: "2", frogs: [{ order: 2, completedAt: "x" }, { order: 1 }] },
    { date: "3", frogs: [] },
  ];
  assert.equal(frogRate(days), 50);
  assert.equal(frogRate([]), null);
});

test("tuning rules and the 2–4 cap", () => {
  assert.equal(tuningChange({ completionRate: 95, rcaC: 0, drainPct: 10 }), "up");
  assert.equal(tuningChange({ completionRate: 95, rcaC: 1, drainPct: 10 }), "hold");
  assert.equal(tuningChange({ completionRate: 80, rcaC: 0, drainPct: 10 }), "hold");
  assert.equal(tuningChange({ completionRate: 60, rcaC: 0, drainPct: 10 }), "down");
  assert.equal(tuningChange({ completionRate: 95, rcaC: 3, drainPct: 10 }), "down");
  assert.equal(tuningChange({ completionRate: 95, rcaC: 0, drainPct: 31 }), "down");
  assert.equal(tuningChange({ completionRate: null, rcaC: 0, drainPct: 0 }), "hold");
  assert.equal(applyTuning(4, "up"), 4);
  assert.equal(applyTuning(2, "down"), 2);
  assert.equal(applyTuning(3, "up"), 4);
});

test("drainShare over planned priorities", () => {
  assert.equal(drainShare([{ frogs: [{ energyTag: "drain" }, { energyTag: "genius" }] }, { frogs: [{}, {}] }]), 25);
  assert.equal(drainShare([]), 0);
});

test("groupByAnchor: tasks follow anchor order, so the frog is the first task under anchor #1", () => {
  const anchors = [
    { id: "A", order: 2, title: "", projectId: "p1", goal: "", createdAt: "" },
    { id: "B", order: 1, title: "", projectId: "p2", goal: "", createdAt: "" },
    { id: "C", order: 3, title: "", projectId: "p3", goal: "", createdAt: "", closedAt: "x" },
  ];
  const frogs = [
    { id: "free", order: 1 },
    { id: "a1", order: 2, anchorId: "A" },
    { id: "b1", order: 3, anchorId: "B" },
    { id: "c1", order: 4, anchorId: "C" },
    { id: "b2", order: 5, anchorId: "B" },
  ];
  const out = groupByAnchor(frogs, anchors);
  assert.deepEqual(out.map((f) => f.id), ["b1", "b2", "a1", "free", "c1"]);
  assert.deepEqual(out.map((f) => f.order), [1, 2, 3, 4, 5]);
});

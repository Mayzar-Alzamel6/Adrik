import { test } from "node:test";
import assert from "node:assert/strict";
import { useVaultStore } from "../src/stores/useVaultStore.ts";
import { useAppStore } from "../src/stores/useAppStore.ts";

test("useVaultStore: addArchitectVaultItem creates 48h locked item with architectural rationale", () => {
  const store = useVaultStore.getState();
  const item = store.addArchitectVaultItem(
    "Architecture Sandbox Idea",
    "Bottleneck in data flow",
    "Asynchronous worker queue",
    "Reduces latency by 40%"
  );

  assert.equal(item.impulseTitle, "Architecture Sandbox Idea");
  assert.equal(item.itemType, "architect");
  assert.equal(item.delayHours, 48);
  assert.equal(item.realProblem, "Bottleneck in data flow");
  assert.equal(item.mechanism, "Asynchronous worker queue");
  assert.equal(item.roiReason, "Reduces latency by 40%");
  assert.equal(item.isResolved, false);

  const durationMs = item.unlocksAt - item.lockedAt;
  assert.equal(durationMs, 48 * 60 * 60 * 1000);

  const inStore = useVaultStore.getState().vaultItems.find((v) => v.id === item.id);
  assert.ok(inStore);
  assert.equal(inStore.itemType, "architect");
});

test("useAppStore: rolloverIfNewDay preserves INTJ-A fields into closed frogHistory", () => {
  const store = useAppStore.getState();

  // Seed state with INTJ-A priority items
  useAppStore.setState({
    currentDay: "2026-10-10",
    frogs: [
      {
        id: "frog-intj-1",
        title: "Build Core Engine",
        order: 1,
        isCompleted: true,
        completedAt: "2026-10-10T11:00:00.000Z",
        category: "QUALITY",
        energyTag: "genius",
        definitionOfDone: "Zero warnings, tests passing",
        isRerouted: true,
      },
      {
        id: "frog-intj-2",
        title: "Triage Production Bug",
        order: 2,
        isCompleted: true,
        completedAt: "2026-10-10T15:00:00.000Z",
        category: "EMERGENCY",
        energyTag: "drain",
        definitionOfDone: "Patch deployed",
        isDropped: true,
        dropReason: "Delegated to DevOps",
      },
    ],
    frogHistory: [],
  });

  // Trigger rollover for a new day
  useAppStore.getState().rolloverIfNewDay();

  const state = useAppStore.getState();
  assert.notEqual(state.currentDay, "2026-10-10");
  assert.equal(state.frogHistory.length, 1);

  const closedDay = state.frogHistory[0];
  assert.equal(closedDay.date, "2026-10-10");
  assert.equal(closedDay.frogs.length, 2);

  const closed1 = closedDay.frogs.find((f) => f.id === "frog-intj-1");
  assert.ok(closed1);
  assert.equal(closed1.energyTag, "genius");
  assert.equal(closed1.definitionOfDone, "Zero warnings, tests passing");
  assert.equal(closed1.isRerouted, true);

  const closed2 = closedDay.frogs.find((f) => f.id === "frog-intj-2");
  assert.ok(closed2);
  assert.equal(closed2.energyTag, "drain");
  assert.equal(closed2.definitionOfDone, "Patch deployed");
  assert.equal(closed2.isDropped, true);
  assert.equal(closed2.dropReason, "Delegated to DevOps");
});

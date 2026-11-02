import { test } from "node:test";
import assert from "node:assert/strict";
import { computeIntjAuditMetrics, completionByType, completionByDay, canActivateDrain } from "../src/lib/completion.ts";

test("computeIntjAuditMetrics: empty period returns safe defaults", () => {
  const result = computeIntjAuditMetrics([], {});
  assert.equal(result.highLeverageRate, null);
  assert.equal(result.highLeverageDone, 0);
  assert.equal(result.highLeverageTotal, 0);
  assert.equal(result.geniusCount, 0);
  assert.equal(result.drainCount, 0);
  assert.equal(result.drainRatio, 0);
  assert.equal(result.isDrainWarning, false);
  assert.equal(result.qualityPassedDays, 0);
  assert.equal(result.qualityAuditedDays, 0);
  assert.equal(result.qualityPassRate, null);
});

test("computeIntjAuditMetrics: accurately calculates high-leverage velocity", () => {
  const days = [
    {
      date: "2026-10-10",
      planned: 3,
      done: 3,
      rate: 100,
      frogs: [
        { id: "1", title: "Frog 1", order: 1, isCompleted: true, completedAt: "2026-10-10T10:00:00", category: "QUALITY", energyTag: "genius" },
        { id: "2", title: "Frog 2", order: 2, isCompleted: true, completedAt: "2026-10-10T12:00:00", category: "EMERGENCY", energyTag: "drain" },
        { id: "3", title: "Frog 3", order: 3, isCompleted: true, completedAt: "2026-10-10T14:00:00", category: "ESCAPE", energyTag: "neutral" },
      ],
    },
  ];

  const result = computeIntjAuditMetrics(days, {});
  // highLeverage: frog 1 has category QUALITY and genius -> 1 out of 3 done frogs
  assert.equal(result.highLeverageDone, 1);
  assert.equal(result.highLeverageTotal, 3);
  assert.equal(result.highLeverageRate, 33);
});

test("computeIntjAuditMetrics: triggers drain warning when drainRatio > 30%", () => {
  // 2 drain frogs out of 3 total planned frogs = 67% drain ratio (> 30%)
  const days = [
    {
      date: "2026-10-11",
      planned: 3,
      done: 2,
      rate: 67,
      frogs: [
        { id: "1", title: "Frog 1", order: 1, category: "QUALITY", energyTag: "drain" },
        { id: "2", title: "Frog 2", order: 2, category: "QUALITY", energyTag: "drain" },
        { id: "3", title: "Frog 3", order: 3, category: "QUALITY", energyTag: "genius" },
      ],
    },
  ];

  const result = computeIntjAuditMetrics(days, {});
  assert.equal(result.geniusCount, 1);
  assert.equal(result.drainCount, 2);
  assert.equal(result.drainRatio, 67);
  assert.equal(result.isDrainWarning, true);
});

test("computeIntjAuditMetrics: stays balanced when drainRatio <= 30%", () => {
  // 1 drain frog out of 4 total frogs = 25% drain ratio (<= 30%)
  const days = [
    {
      date: "2026-10-11",
      planned: 4,
      done: 4,
      rate: 100,
      frogs: [
        { id: "1", title: "Frog 1", order: 1, category: "QUALITY", energyTag: "genius" },
        { id: "2", title: "Frog 2", order: 2, category: "QUALITY", energyTag: "genius" },
        { id: "3", title: "Frog 3", order: 3, category: "QUALITY", energyTag: "neutral" },
        { id: "4", title: "Frog 4", order: 4, category: "QUALITY", energyTag: "drain" },
      ],
    },
  ];

  const result = computeIntjAuditMetrics(days, {});
  assert.equal(result.geniusCount, 2);
  assert.equal(result.drainCount, 1);
  assert.equal(result.drainRatio, 25);
  assert.equal(result.isDrainWarning, false);
});

test("computeIntjAuditMetrics: calculates binary evening quality check pass rate", () => {
  const days = [
    { date: "2026-10-09", planned: 3, done: 3, rate: 100, frogs: [] },
    { date: "2026-10-10", planned: 2, done: 2, rate: 100, frogs: [] },
    { date: "2026-10-11", planned: 1, done: 0, rate: 0, frogs: [] },
    { date: "2026-10-12", planned: 0, done: 0, rate: null, frogs: [] }, // no plan, should be skipped
  ];

  const qualityCheck = {
    "2026-10-09": true,
    "2026-10-10": true,
    "2026-10-11": false,
  };

  const result = computeIntjAuditMetrics(days, qualityCheck);
  assert.equal(result.qualityAuditedDays, 3);
  assert.equal(result.qualityPassedDays, 2);
  assert.equal(result.qualityPassRate, 67); // 2/3 = 67%
});

test("completionByType: groups correctly by energy taxonomy", () => {
  const days = [
    {
      date: "2026-10-10",
      planned: 3,
      done: 2,
      rate: 67,
      frogs: [
        { id: "1", title: "Genius Task", order: 1, completedAt: "2026-10-10T10:00:00", energyTag: "genius" },
        { id: "2", title: "Drain Task", order: 2, energyTag: "drain" },
        { id: "3", title: "Neutral Task", order: 3, completedAt: "2026-10-10T12:00:00", energyTag: "neutral" },
      ],
    },
  ];

  const data = { frogs: [], frogHistory: [], currentDay: "2026-10-10", projects: [], values: [], skills: [] };
  const rows = completionByType(days, "energy", data);

  const geniusRow = rows.find((r) => r.key === "genius");
  const drainRow = rows.find((r) => r.key === "drain");
  const neutralRow = rows.find((r) => r.key === "neutral");

  assert.ok(geniusRow);
  assert.equal(geniusRow.planned, 1);
  assert.equal(geniusRow.done, 1);
  assert.equal(geniusRow.rate, 100);

  assert.ok(drainRow);
  assert.equal(drainRow.planned, 1);
  assert.equal(drainRow.done, 0);
  assert.equal(drainRow.rate, 0);

  assert.ok(neutralRow);
  assert.equal(neutralRow.planned, 1);
  assert.equal(neutralRow.done, 1);
  assert.equal(neutralRow.rate, 100);
});

test("computeIntjAuditMetrics: excludes dropped tasks from done and high-leverage count even if completedAt is set", () => {
  const days = [
    {
      date: "2026-10-10",
      planned: 2,
      done: 1,
      rate: 50,
      frogs: [
        {
          id: "1",
          title: "Quality Genius Task",
          order: 1,
          isCompleted: true,
          completedAt: "2026-10-10T10:00:00",
          category: "QUALITY",
          energyTag: "genius",
        },
        {
          id: "2",
          title: "Dropped Drain Task",
          order: 2,
          isCompleted: true,
          completedAt: "2026-10-10T12:00:00",
          isDropped: true,
          dropReason: "Conscious strategic drop",
          category: "QUALITY",
          energyTag: "drain",
        },
      ],
    },
  ];

  const result = computeIntjAuditMetrics(days, {});
  // Dropped task must NOT count toward done or high-leverage
  assert.equal(result.highLeverageDone, 1);
  assert.equal(result.highLeverageTotal, 1);
  assert.equal(result.highLeverageRate, 100);
  // Total planned energy counts still track what was planned
  assert.equal(result.geniusCount, 1);
  assert.equal(result.drainCount, 1);
});

test("completionByDay: excludes dropped tasks from completed count", () => {
  const data = {
    frogs: [
      {
        id: "1",
        title: "Active Task",
        order: 1,
        isCompleted: true,
        completedAt: "2026-10-10T10:00:00",
        energyTag: "genius",
      },
      {
        id: "2",
        title: "Dropped Task",
        order: 2,
        isCompleted: true,
        completedAt: "2026-10-10T11:00:00",
        isDropped: true,
        dropReason: "Killed",
        energyTag: "drain",
      },
    ],
    frogHistory: [],
    currentDay: "2026-10-10",
    projects: [],
    values: [],
    skills: [],
  };

  const days = completionByDay(1, data, "2026-10-10");
  assert.equal(days.length, 1);
  assert.equal(days[0].planned, 2);
  assert.equal(days[0].done, 1);
  assert.equal(days[0].rate, 50);
});

test("canActivateDrain: correctly enforces max 1 active drain constraint", () => {
  const frogs = [
    { id: "1", title: "Task 1", order: 1, isCompleted: false, energyTag: "drain" },
    { id: "2", title: "Task 2", order: 2, isCompleted: false, energyTag: "neutral" },
  ];

  // Trying to add a new drain frog when one is already active -> false
  assert.equal(canActivateDrain(frogs), false);

  // Updating the existing drain frog itself -> true
  assert.equal(canActivateDrain(frogs, "1"), true);

  // If the existing drain frog is completed -> can activate another drain
  const frogsWithDoneDrain = [
    { id: "1", title: "Task 1", order: 1, isCompleted: true, energyTag: "drain" },
    { id: "2", title: "Task 2", order: 2, isCompleted: false, energyTag: "neutral" },
  ];
  assert.equal(canActivateDrain(frogsWithDoneDrain), true);

  // If the existing drain frog is dropped -> can activate another drain
  const frogsWithDroppedDrain = [
    { id: "1", title: "Task 1", order: 1, isCompleted: true, isDropped: true, energyTag: "drain" },
    { id: "2", title: "Task 2", order: 2, isCompleted: false, energyTag: "neutral" },
  ];
  assert.equal(canActivateDrain(frogsWithDroppedDrain), true);
});

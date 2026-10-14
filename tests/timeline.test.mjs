import { test } from "node:test";
import assert from "node:assert/strict";
import { useProjectsStore } from "../src/stores/useProjectsStore.ts";

test("Timeline Tasks: initial store has empty array and safe fallback", () => {
  const state = useProjectsStore.getState();
  assert.ok(Array.isArray(state.timelineTasks));
});

test("Timeline Tasks: adds standalone daily, weekly, and monthly tasks", () => {
  const store = useProjectsStore.getState();

  // 1. Daily Task
  const dailyId = store.addTimelineTask({
    title: "مراجعة الكود الصباحية",
    horizon: "DAILY",
    scheduledDate: "2026-10-15",
    definitionOfDone: "فحص 5 ملفات واجتياز الاختبارات",
    energyTag: "genius",
  });
  assert.ok(dailyId);

  // 2. Weekly Task linked to a project
  const weeklyId = store.addTimelineTask({
    title: "تسليم النموذج الأولي للوحة المشاريع",
    horizon: "WEEKLY",
    scheduledDate: "2026-10-16",
    weekNumber: 42,
    projectId: "prj-test-1",
    energyTag: "neutral",
  });
  assert.ok(weeklyId);

  // 3. Monthly Milestone
  const monthlyId = store.addTimelineTask({
    title: "إطلاق الإصدار التجريبي للمنظومة",
    horizon: "MONTHLY",
    scheduledDate: "2026-10-31",
    monthYear: "2026-10",
    definitionOfDone: "نشر التطبيق على السيرفر وربط المزامنة",
  });
  assert.ok(monthlyId);

  const updated = useProjectsStore.getState().timelineTasks;
  const daily = updated.find((t) => t.id === dailyId);
  assert.equal(daily.title, "مراجعة الكود الصباحية");
  assert.equal(daily.horizon, "DAILY");
  assert.equal(daily.status, "TODO");
  assert.equal(daily.definitionOfDone, "فحص 5 ملفات واجتياز الاختبارات");
  assert.equal(daily.energyTag, "genius");

  const weekly = updated.find((t) => t.id === weeklyId);
  assert.equal(weekly.projectId, "prj-test-1");
  assert.equal(weekly.weekNumber, 42);

  const monthly = updated.find((t) => t.id === monthlyId);
  assert.equal(monthly.monthYear, "2026-10");
});

test("Timeline Tasks: setTimelineTaskStatus updates status and doneAt", () => {
  const store = useProjectsStore.getState();
  const id = store.addTimelineTask({
    title: "مهمة للفحص",
    horizon: "DAILY",
    scheduledDate: "2026-10-14",
  });

  store.setTimelineTaskStatus(id, "DONE");
  let task = useProjectsStore.getState().timelineTasks.find((t) => t.id === id);
  assert.equal(task.status, "DONE");
  assert.ok(task.doneAt);

  store.setTimelineTaskStatus(id, "TODO");
  task = useProjectsStore.getState().timelineTasks.find((t) => t.id === id);
  assert.equal(task.status, "TODO");
  assert.equal(task.doneAt, undefined);
});

test("Timeline Tasks: updateTimelineTask modifies fields", () => {
  const store = useProjectsStore.getState();
  const id = store.addTimelineTask({
    title: "عنوان قديم",
    horizon: "DAILY",
    scheduledDate: "2026-10-14",
  });

  store.updateTimelineTask(id, {
    title: "عنوان محدث",
    scheduledDate: "2026-10-20",
    energyTag: "drain",
  });

  const task = useProjectsStore.getState().timelineTasks.find((t) => t.id === id);
  assert.equal(task.title, "عنوان محدث");
  assert.equal(task.scheduledDate, "2026-10-20");
  assert.equal(task.energyTag, "drain");
});

test("Timeline Tasks: deleteTimelineTask removes the task", () => {
  const store = useProjectsStore.getState();
  const id = store.addTimelineTask({
    title: "مهمة للحذف",
    horizon: "DAILY",
    scheduledDate: "2026-10-14",
  });

  assert.ok(useProjectsStore.getState().timelineTasks.some((t) => t.id === id));
  store.deleteTimelineTask(id);
  assert.ok(!useProjectsStore.getState().timelineTasks.some((t) => t.id === id));
});

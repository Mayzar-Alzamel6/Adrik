// The coach's contract: prompts carry the risk instruction, AI replies are checked strictly, and the local review always answers.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  breakdownPrompt,
  isEmptyWeek,
  runBreakdown,
  runReview,
  localReview,
  readBreakdown,
  readReview,
  reviewPrompt,
  sanitizeBreakdownInput,
  sanitizeWeekSummary,
} from "../src/lib/ai/coach.ts";
import { AI_RISK_INSTRUCTION } from "../src/lib/safety/analysis.ts";

const ctx = { valueIds: ["val-1", "val-2"], existing: ["اقرأ الفصل الأول"] };
const good = {
  risk: false,
  projectName: "تعلم البرمجة",
  description: "من الصفر إلى أول مشروع",
  valueIds: ["val-1", "invented"],
  tasks: ["اختر لغة واحدة", "اقرأ الفصل الأول", "اختر لغة واحدة", "حل 5 تمارين"],
  firstStep: "ثبّت المحرر واكتب سطراً واحداً",
};

test("both prompts carry the risk instruction", () => {
  const input = sanitizeBreakdownInput({ goal: "أتعلم البرمجة", values: [] });
  assert.ok(breakdownPrompt(input).includes(AI_RISK_INSTRUCTION));
  assert.ok(reviewPrompt(sanitizeWeekSummary({})).includes(AI_RISK_INSTRUCTION));
});

test("breakdown: anything but an explicit risk:false is a crisis", () => {
  assert.deepEqual(readBreakdown({ ...good, risk: true }, ctx), { risk: true });
  assert.deepEqual(readBreakdown({ ...good, risk: "false" }, ctx), { risk: true });
  assert.deepEqual(readBreakdown({ tasks: good.tasks, firstStep: "x" }, ctx), { risk: true });
});

test("breakdown: unusable replies are null", () => {
  assert.equal(readBreakdown(null, ctx), null);
  assert.equal(readBreakdown({ ...good, firstStep: "" }, ctx), null);
  assert.equal(readBreakdown({ ...good, tasks: ["اقرأ الفصل الأول"] }, ctx), null);
});

test("breakdown: drops invented values, duplicates and existing tasks", () => {
  const r = readBreakdown(good, ctx);
  assert.equal(r.risk, false);
  assert.deepEqual(r.valueIds, ["val-1"]);
  assert.deepEqual(r.tasks, ["اختر لغة واحدة", "حل 5 تمارين"]);
});

test("breakdown: clips long text and caps at 7 tasks", () => {
  const many = Array.from({ length: 10 }, (_, i) => `مهمة ${i} ${"أ".repeat(200)}`);
  const r = readBreakdown({ ...good, tasks: many }, ctx);
  assert.equal(r.tasks.length, 7);
  assert.ok(r.tasks.every((t) => t.length <= 140));
});

test("review: risk, unusable and good replies", () => {
  assert.deepEqual(readReview({ observations: ["أ"], suggestion: { title: "ب" } }), { risk: true });
  assert.equal(readReview({ risk: false, observations: [], suggestion: { title: "ب" } }), null);
  const r = readReview({ risk: false, observations: ["1", "2", "3", "4"], suggestion: { title: "ابدأ", why: "لأن" } });
  assert.equal(r.observations.length, 3);
  assert.deepEqual(r.suggestion, { title: "ابدأ", why: "لأن" });
});

test("summary sanitizer survives garbage", () => {
  const s = sanitizeWeekSummary({ priorities: { rate: "x", planned: -3 }, focus: { exitReasons: "no" }, values: [1, null] });
  assert.equal(s.priorities.rate, null);
  assert.equal(s.priorities.planned, 0);
  assert.deepEqual(s.focus.exitReasons, []);
  assert.deepEqual(s.values, []);
});

test("local review: an empty week still answers in shape", () => {
  const r = localReview(sanitizeWeekSummary({}));
  assert.ok(r.observations.length >= 2 && r.observations.length <= 3);
  assert.ok(r.suggestion.title);
});

test("local review: a habit at risk wins the suggestion, with its minimum", () => {
  const r = localReview(
    sanitizeWeekSummary({
      priorities: { planned: 9, done: 8, rate: 89 },
      neglectedValues: ["الصحة"],
      habits: [{ title: "الرياضة", done: 2, due: 4, streak: 2, atRisk: true, minimum: "5 تمارين ضغط" }],
    })
  );
  assert.ok(r.suggestion.title.includes("5 تمارين ضغط"));
  assert.ok(r.observations[0].includes("89%"));
});

test("local review: a neglected value gets a session", () => {
  const r = localReview(sanitizeWeekSummary({ values: [{ title: "العلم", minutes: 120 }], neglectedValues: ["الصحة"] }));
  assert.ok(r.suggestion.title.includes("الصحة"));
  assert.ok(r.observations.some((o) => o.includes("العلم") && o.includes("الصحة")));
});

test("an empty week is recognized, a week with one session is not", () => {
  assert.equal(isEmptyWeek(sanitizeWeekSummary({})), true);
  assert.equal(isEmptyWeek(sanitizeWeekSummary({ focus: { sessions: 1, minutes: 8 } })), false);
  assert.equal(isEmptyWeek(sanitizeWeekSummary({ habits: [{ title: "مشي", done: 1, due: 1 }] })), false);
});

test("local review: the first days of a running week are not judged like a finished one", () => {
  const r = localReview(sanitizeWeekSummary({ isCurrentWeek: true, daysElapsed: 1, priorities: { planned: 2, done: 0, rate: 0 } }));
  assert.ok(r.observations[0].startsWith("الأسبوع في بدايته"));
});

/** A stand-in AI that records every prompt it was asked. */
const fakeAi = (reply, ready = true) => {
  const prompts = [];
  return { prompts, ready, call: async (prompt) => (prompts.push(prompt), reply) };
};

test("run breakdown: a crisis stops before the AI is asked", async () => {
  const ai = fakeAi(good);
  assert.deepEqual(await runBreakdown({ goal: "ما أبي أعيش", useAI: true }, ai), { status: "crisis" });
  assert.equal(ai.prompts.length, 0);
});

test("run breakdown: no consent or no key means no AI call", async () => {
  const ai = fakeAi(good);
  assert.deepEqual(await runBreakdown({ goal: "أتعلم البرمجة" }, ai), { status: "unavailable" });
  assert.deepEqual(await runBreakdown({ goal: "أتعلم البرمجة", useAI: true }, fakeAi(good, false)), { status: "unavailable" });
  assert.equal(ai.prompts.length, 0);
});

test("run breakdown: an empty goal is a bad request, a broken reply fails, the AI's own risk flag is a crisis", async () => {
  assert.equal(await runBreakdown({ goal: "  " }, fakeAi(good)), null);
  assert.deepEqual(await runBreakdown({ goal: "أتعلم", useAI: true }, fakeAi(null)), { status: "failed" });
  assert.deepEqual(await runBreakdown({ goal: "أتعلم", useAI: true }, fakeAi({ ...good, risk: true })), { status: "crisis" });
});

test("run breakdown: a good reply comes back checked", async () => {
  const reply = await runBreakdown({ goal: "أتعلم البرمجة", useAI: true, values: [{ id: "val-1", title: "العلم" }] }, fakeAi(good));
  assert.equal(reply.status, "ok");
  assert.deepEqual(reply.breakdown.valueIds, ["val-1"]);
  assert.equal(reply.breakdown.firstStep, good.firstStep);
});

test("run review: crisis words in exit reasons stop everything", async () => {
  const ai = fakeAi({ risk: false, observations: ["1"], suggestion: { title: "ب" } });
  const summary = { focus: { exitReasons: ["ما أبي أعيش"] } };
  assert.deepEqual(await runReview({ summary, useAI: true }, ai), { status: "crisis" });
  assert.equal(ai.prompts.length, 0);
});

test("run review: AI when allowed, local rules otherwise or when the AI fails", async () => {
  const good = { risk: false, observations: ["أ", "ب", "ج"], suggestion: { title: "ابدأ", why: "لأن" } };
  assert.equal((await runReview({ summary: {}, useAI: true }, fakeAi(good))).engine, "ai");
  assert.equal((await runReview({ summary: {}, useAI: false }, fakeAi(good))).engine, "local");
  assert.equal((await runReview({ summary: {}, useAI: true }, fakeAi(null))).engine, "local");
  assert.deepEqual(await runReview({ summary: {}, useAI: true }, fakeAi({ risk: true })), { status: "crisis" });
});

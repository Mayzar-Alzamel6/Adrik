// The parts of the safety kit around the detector: the analysis order, the AI reply contract, the helplines.
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeSafely, readAiReply } from "../src/lib/safety/analysis.ts";
import { HELPLINES, helplinesFor } from "../src/lib/safety/helplines.ts";

const calm = { automaticThought: "أنا فاشل لأني أجلت المهمة" };
const crisis = { automaticThought: "ما أبي أعيش" };
const reframe = { risk: false, engine: "local", distortionType: "أ", reframedThought: "ب", nextSmallAction: "ج" };

/** Records whether the analysis was ever requested, and with which mode. */
const spy = (reply = reframe) => {
  const calls = [];
  return { calls, analyze: async (useAI) => (calls.push(useAI), reply) };
};

test("a crisis stops everything: no consent question, no request", async () => {
  const s = spy();
  const out = await analyzeSafely(crisis, { consent: "ai", aiAvailable: () => true, analyze: s.analyze });
  assert.deepEqual(out, { kind: "crisis" });
  assert.equal(s.calls.length, 0);
});

test("asks for consent first when AI exists and nobody chose yet", async () => {
  const s = spy();
  const out = await analyzeSafely(calm, { consent: null, aiAvailable: async () => true, analyze: s.analyze });
  assert.deepEqual(out, { kind: "needs-consent" });
  assert.equal(s.calls.length, 0);
});

test("without AI there is nothing to ask: local analysis straight away", async () => {
  const s = spy();
  const out = await analyzeSafely(calm, { consent: null, aiAvailable: () => false, analyze: s.analyze });
  assert.equal(out.kind, "result");
  assert.deepEqual(s.calls, [false]);
});

test("AI is used only after an explicit yes", async () => {
  const yes = spy();
  await analyzeSafely(calm, { consent: "ai", aiAvailable: () => true, analyze: yes.analyze });
  assert.deepEqual(yes.calls, [true]);
  const no = spy();
  await analyzeSafely(calm, { consent: "local", aiAvailable: () => true, analyze: no.analyze });
  assert.deepEqual(no.calls, [false]);
});

test("the AI's own risk flag is a crisis too", async () => {
  const s = spy({ risk: true, source: "ai" });
  const out = await analyzeSafely(calm, { consent: "ai", aiAvailable: () => true, analyze: s.analyze });
  assert.deepEqual(out, { kind: "crisis" });
});

test("AI reply: anything but an explicit risk:false is a crisis", () => {
  assert.deepEqual(readAiReply({ risk: true }), { risk: true, source: "ai" });
  assert.deepEqual(readAiReply({ distortionType: "أ", reframedThought: "ب", nextSmallAction: "ج" }), { risk: true, source: "ai" });
  assert.deepEqual(readAiReply({ risk: "false" }), { risk: true, source: "ai" });
});

test("AI reply: a usable analysis passes, a broken one falls back (null)", () => {
  assert.deepEqual(readAiReply({ risk: false, distortionType: "أ", reframedThought: "ب", nextSmallAction: "ج" }), {
    risk: false,
    engine: "ai",
    distortionType: "أ",
    reframedThought: "ب",
    nextSmallAction: "ج",
  });
  assert.equal(readAiReply({ risk: false, distortionType: "أ" }), null);
  assert.equal(readAiReply(null), null);
  assert.equal(readAiReply("text"), null);
});

test("helplines: lines without a verified number are never shown", () => {
  for (const zone of Object.keys(HELPLINES)) {
    for (const line of helplinesFor(zone)) assert.ok(line.number.trim(), `${zone}: ${line.area}`);
  }
});

test("helplines: every zone answers, even an unknown one", () => {
  for (const zone of ["eg", "gulf", "mid", "global", "unknown"]) assert.ok(Array.isArray(helplinesFor(zone)));
});

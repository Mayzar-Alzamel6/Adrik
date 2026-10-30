// The phone's coach function (supabase/functions/coach): only the signed-in founder gets through,
// the key is never needed to answer "is AI available", and every request follows coach.ts's safe order.
import { test } from "node:test";
import assert from "node:assert/strict";
import { handleCoach } from "../supabase/functions/coach/handler.ts";

const SUPABASE_URL = "https://proj.supabase.co";
const breakdownReply = {
  risk: false,
  projectName: "تعلم البرمجة",
  description: "خطوة خطوة",
  valueIds: [],
  tasks: ["اختر لغة واحدة", "حل 5 تمارين"],
  firstStep: "ثبّت المحرر",
};

/** Supabase Auth and Gemini, faked; records which outside services were called. */
function deps({ key = "gemini-key", ai = breakdownReply } = {}) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    const u = String(url);
    if (u === `${SUPABASE_URL}/auth/v1/user`) {
      calls.push("auth");
      const ok = init.headers?.Authorization === "Bearer founder-token";
      return new Response(JSON.stringify(ok ? { id: "u1", role: "authenticated" } : { msg: "bad jwt" }), { status: ok ? 200 : 401 });
    }
    if (u.startsWith("https://generativelanguage.googleapis.com/")) {
      calls.push("gemini");
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(ai) }] } }] }));
    }
    throw new Error(`unexpected fetch ${u}`);
  };
  const env = { SUPABASE_URL, ...(key ? { GEMINI_API_KEY: key } : {}) };
  return { calls, deps: { env: (n) => env[n], fetch } };
}

const req = (method, body, token = "founder-token") =>
  new Request("https://proj.supabase.co/functions/v1/coach", {
    method,
    headers: { apikey: "sb_publishable_x", ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });

test("preflight answers without asking anyone", async () => {
  const d = deps();
  const res = await handleCoach(new Request("https://x/functions/v1/coach", { method: "OPTIONS" }), d.deps);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "*");
  assert.deepEqual(d.calls, []);
});

test("no token or a wrong one: 401, and Gemini is never asked", async () => {
  for (const token of [null, "stolen"]) {
    const d = deps();
    const res = await handleCoach(req("POST", { action: "breakdown", goal: "أتعلم", useAI: true }, token), d.deps);
    assert.equal(res.status, 401);
    assert.ok(!d.calls.includes("gemini"));
  }
});

test("status: says whether a key exists, without revealing it", async () => {
  const withKey = await (await handleCoach(req("GET"), deps().deps)).json();
  const without = await (await handleCoach(req("GET"), deps({ key: null }).deps)).json();
  assert.deepEqual(withKey, { aiAvailable: true });
  assert.deepEqual(without, { aiAvailable: false });
});

test("breakdown: AI after sign-in, crisis words never reach Gemini", async () => {
  const ok = deps();
  const reply = await (await handleCoach(req("POST", { action: "breakdown", goal: "أتعلم البرمجة", useAI: true }), ok.deps)).json();
  assert.equal(reply.status, "ok");
  assert.deepEqual(ok.calls, ["auth", "gemini"]);

  const crisis = deps();
  const reply2 = await (await handleCoach(req("POST", { action: "breakdown", goal: "ما أبي أعيش", useAI: true }), crisis.deps)).json();
  assert.deepEqual(reply2, { status: "crisis" });
  assert.deepEqual(crisis.calls, ["auth"]);
});

test("review: without a key the local rules answer", async () => {
  const d = deps({ key: null });
  const reply = await (await handleCoach(req("POST", { action: "review", summary: {}, useAI: true }), d.deps)).json();
  assert.equal(reply.status, "ok");
  assert.equal(reply.engine, "local");
  assert.ok(!d.calls.includes("gemini"));
});

test("bad requests: unknown action, broken JSON, too large", async () => {
  assert.equal((await handleCoach(req("POST", { action: "nope" }), deps().deps)).status, 400);
  assert.equal((await handleCoach(req("POST", "{not json"), deps().deps)).status, 400);
  assert.equal((await handleCoach(req("POST", { action: "review", pad: "x".repeat(40_000) }), deps().deps)).status, 413);
  assert.equal((await handleCoach(req("POST", { action: "breakdown", goal: "" }), deps().deps)).status, 400);
});

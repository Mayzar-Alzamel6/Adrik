import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatTimerSeconds,
  calculateBlockProgress,
  validateContract,
  BUG_DEFINITIONS,
} from "../src/lib/intj/protocol-utils.ts";

test("formatTimerSeconds: formats seconds into MM:SS correctly", () => {
  assert.equal(formatTimerSeconds(5400), "90:00");
  assert.equal(formatTimerSeconds(3600), "60:00");
  assert.equal(formatTimerSeconds(2700), "45:00");
  assert.equal(formatTimerSeconds(65), "01:05");
  assert.equal(formatTimerSeconds(5), "00:05");
  assert.equal(formatTimerSeconds(0), "00:00");
  assert.equal(formatTimerSeconds(-10), "00:00");
});

test("calculateBlockProgress: calculates accurate completion percentage", () => {
  assert.equal(calculateBlockProgress(5400, 5400), 0);
  assert.equal(calculateBlockProgress(2700, 5400), 0.5);
  assert.equal(calculateBlockProgress(0, 5400), 1);
  assert.equal(calculateBlockProgress(0, 0), 0);
});

test("validateContract: requires deliverable and doneWhen", () => {
  const invalidEmpty = validateContract({ deliverable: "", doneWhen: "" });
  assert.equal(invalidEmpty.valid, false);
  assert.equal(invalidEmpty.errors.length, 2);

  const missingDoneWhen = validateContract({ deliverable: "بناء واجهة", doneWhen: "   " });
  assert.equal(missingDoneWhen.valid, false);
  assert.equal(missingDoneWhen.errors.length, 1);

  const valid = validateContract({
    deliverable: "واجهة الهاتف",
    doneWhen: "تعمل وتجتاز الفحص بدون أخطاء",
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.errors.length, 0);
});

test("BUG_DEFINITIONS: contains exactly 3 standard INTJ triage patches", () => {
  assert.equal(BUG_DEFINITIONS.length, 3);
  const types = BUG_DEFINITIONS.map((b) => b.type);
  assert.deepEqual(types, ["BUG_A", "BUG_B", "BUG_C"]);

  for (const bug of BUG_DEFINITIONS) {
    assert.ok(bug.title.length > 5);
    assert.ok(bug.patch.length > 10);
  }
});

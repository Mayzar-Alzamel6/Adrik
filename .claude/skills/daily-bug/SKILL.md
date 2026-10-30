---
name: daily-bug
description: Handle a bug or annoyance the founder hit while using adrik-personal day to day — reproduce it safely, fix it in the right copies, and verify. Use when the founder describes something broken or odd in their app ("في مشكلة", "ما اشتغل", "صار كذا", "خطأ", a screenshot of the app), even without the word "bug".
---

# Fix a bug from daily use

## 1. Understand before touching code

Get these from the founder's message. Ask only for what is missing:
- Which screen, and what they did.
- What they expected, and what happened.
- Whether it is on the PC (adrik-personal) or the phone (adrik-mobile).

## 2. Find the cause

- Find the code with Grep. UI text is Arabic, so search the exact Arabic words they saw.
- Reproduce on the test server: `preview_start` with `adrik-personal-test` (port 3337).
  Never use port 3334: that is the founder's real data.
- If it depends on their data, ask for a backup file (الإعدادات → البيانات → «تنزيل نسخة احتياطية») and import it on 3337
  with «استيراد نسخة».
- For logic bugs, a small `node --test` case in `tests/` that fails first is better than clicking.
  Only modules without `@/` imports can be loaded there; see `tests/ts-resolve.mjs`.

## 3. Decide which copies to fix

Check the same code in `../adrik-app/src` and `../adrik-mobile/src`. Then tell the founder in one line,
for example "المشكلة موجودة كمان في adrik-app والموبايل — أصلحها في الثلاثة؟", and wait for the answer.

## 4. Fix

- Keep the fix small, and match the surrounding code.
- If the bug corrupted saved data, fix it with a persist migration (bump `version`), never by asking
  the founder to reset.
- `src/lib/sync/core.ts` and the files in `src/lib/safety/` must stay identical across copies.
- Mobile gotcha: never call a zero-argument store getter during render (React Compiler memoizes it).

## 5. Verify and report

- Run the `verify-personal` skill. Re-run the exact steps that failed and show that they now work.
- Report in Arabic: the cause in one sentence, what changed, and which copies were fixed.
- The PC app updates the next time the founder runs `start-app.bat`.

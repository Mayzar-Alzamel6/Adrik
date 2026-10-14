---
name: verify-personal
description: Run the full safe check on adrik-personal (types, tests, build into .next-test, browser check on port 3337) without touching the founder's running app or real data. Use after any change in adrik-personal, before telling the founder a change is done, or when they say "تأكد إنه شغال", "جرّب", "اختبر".
---

# Verify adrik-personal safely

The founder's real app runs from `.next` on port 3334, and their data is in that origin's localStorage.
Every step here stays away from both.

## Steps

Run from `adrik-personal/`. Stop at the first failure, fix it, and start again from step 1.

1. **Types:** `npx tsc --noEmit`
2. **Tests:** `npm test`
3. **Build** into the test folder, never `.next`:
   - PowerShell: `$env:NEXT_DIST_DIR='.next-test'; npx next build`
   - cmd: `set NEXT_DIST_DIR=.next-test&& npx next build`
4. **Browser** (only when the change is visible in the UI):
   - `preview_start` with name `adrik-personal-test` (port 3337).
   - The test origin starts empty: go through onboarding, or import a backup the founder gave you.
     Never read or copy data from port 3334.
   - Go to the changed screen, do the action, and confirm with `read_page`.
   - Check `read_console_messages` with `onlyErrors`.
   - Check at mobile width (`resize_window` preset `mobile`) when layout changed, then reset to `desktop`.
   - Take one screenshot as proof.
5. **Sync guard** (only when `src/lib/sync/core.ts` changed):
   compare it with `../adrik-mobile/src/lib/sync/core.ts`. The two files must be identical.
6. **Safety kit guard** (only when `src/lib/safety/` changed):
   `node scripts/copy-safety-kit.mjs ../adrik-mobile --check` and the same for `../adrik-app`.
   Report what is out of date. Copy only if the founder asks.

## Report

Tell the founder in Arabic, in a few lines:
- What passed, with real numbers (for example "64 اختبار نجحت").
- What failed, with the error.
- That the change reaches their app the next time they run `start-app.bat`, which rebuilds by itself.
  Do not rebuild `.next` yourself.

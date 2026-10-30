---
name: port-from-app
description: Bring a feature or fix from adrik-app (the product) into adrik-personal (the founder's daily copy) without losing personal-only work (sync, CBT safety layer, founder page, week migration). Use when the founder says "انقل الميزة للنسخة الشخصية", "حدّث نسختي", "زي adrik-app", or names a feature that exists in adrik-app but not here.
---

# Port from adrik-app to adrik-personal

Paths are relative to `adrik-personal/`. The source is `../adrik-app/`.

## 1. See what differs

Run `diff -rq ../adrik-app/src src` (Bash). Sort every difference into one of three groups:

- **Personal-only:** listed under "What exists only in this copy" in `CLAUDE.md`. Never overwrite these.
- **Feature to port:** what the founder asked for.
- **Other drift:** report it, do not port it unasked.

If the founder named one feature, find its files with Grep in `../adrik-app/src` and limit the port to them.

## 2. Port

- **Files that only exist in adrik-app, or are not personal-only:** copy them over as they are.
- **Personal-only files the feature touches** (common: `useAppStore.ts`, `settings/page.tsx`, `AppShell.tsx`):
  merge by hand. Take adrik-app's new code, and keep:
  - `useAppStore.ts`: persist `version: 2` and `migrateLegacyAudits`. If adrik-app added a migration step,
    give it the next version number here; don't reuse adrik-app's number.
  - `settings/page.tsx`: `SyncPanel`, no subscription card, usage card titled "تقرير الاستخدام".
  - `AppShell.tsx`: "نسختي الشخصية" and `<SyncWatcher />`.
  - `app/page.tsx`: no pricing section.
- **Never port:** pricing (`data/pricing.ts` UI on the landing page), the subscription card, payments.

## 3. Data checks

- New persisted field: does existing data load without it? Add a default or a migration step.
- New store: add it to `src/lib/backup.ts`, and ask the founder whether it should sync.
- New runtime-only field in the main store (timers, open sheets): add it to `LOCAL_ONLY` in
  `src/lib/sync/core.ts`, and make the **same edit** in `../adrik-mobile/src/lib/sync/core.ts`.

## 4. Verify

Run the `verify-personal` skill.

## 5. Report and remember

- Tell the founder in Arabic: what was ported, what was kept personal, and what drift remains.
- Ask whether adrik-mobile needs the same feature. Mobile needs React Native screens, so it is a separate job.
- Update the memory file `personal-copies-feature-parity` with the date and what was ported.

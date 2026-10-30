# adrik-personal: the founder's daily copy

This is the founder's **personal, daily-use copy** of «أدرك عمرك» (Next.js 15 + Zustand, Arabic RTL UI).
It is not the product. Real personal data lives here, so **protecting that data comes before any feature**.

Reply to the founder in Arabic.

## The family of copies

| Folder | Role | Port |
|---|---|---|
| `adrik-personal/` (here) | Founder's daily copy, PC | **3334** (prod), **3337** (test) |
| `../adrik-app/` | Consumer product: pricing, usage report, new features land here first | 3336 (prod), 3335 (test) |
| `../adrik-mobile/` | Expo / React Native phone app; its personal build syncs with this copy | 8088 (web preview) |
| `../zero step/` | Old personal app | 3333, **never edit** |

New features are usually built in adrik-app first, then ported here with `/port-from-app`.
A bug the founder reports from daily use happens here, but often also exists in adrik-app and adrik-mobile:
**ask which copies to fix** before changing more than this one.

## Data safety (hard rules)

- The data lives in the browser's localStorage for origin `http://localhost:3334`, not in this folder.
  Never change the port, and never change a persist key (`name:` in `src/stores/*`).
- Persist keys: `adrik-app-v1` (main, **version 2**), `adrik-app-vault-v1`, `adrik-app-planner-v1`,
  `adrik-app-projects-v1`, `adrik-app-journey-v1`. `src/lib/backup.ts` mirrors this list.
- Changing the shape of persisted state means bumping `version` and adding a step to `migrate`.
  Existing data must load without loss (see `migrateLegacyAudits` in `useAppStore.ts`).
- Adding a new store means adding it to `backup.ts` too, and deciding whether it syncs.

## Running and testing

- `start-app.bat` serves production on 3334. It rebuilds `.next` itself when `src` changed.
  **Never run `next dev` or `next build` into `.next`**: it breaks the running app.
- Test with the launch config `adrik-personal-test` (port 3337, `NEXT_DIST_DIR=.next-test`).
  The test origin has its own empty localStorage, so it never touches real data.
- Checks, from this folder:
  - `npx tsc --noEmit`
  - `npm test` (node --test on `tests/*.test.mjs`, no dependencies)
  - Build check: `set NEXT_DIST_DIR=.next-test&& npx next build` (cmd), never plain `npm run build`.

Use `/verify-personal` for the full sequence.

## What exists only in this copy

Keep these when porting from adrik-app (overwriting them loses personal work):

- `src/app/page.tsx`: landing page without pricing.
- `src/app/founder/page.tsx`, `src/data/founder-example.ts`: the founder's own version.
- `src/app/app/settings/page.tsx`: has `SyncPanel`, no subscription card, the usage card is titled "تقرير الاستخدام".
- `src/components/shell/AppShell.tsx`: label "نسختي الشخصية" and `<SyncWatcher />`.
- `src/stores/useAppStore.ts`: persist version 2 with `migrateLegacyAudits` (adrik-app is still version 1).
- `src/lib/sync/*`, `src/components/settings/SyncPanel.tsx`, `supabase/sync.sql`: personal sync.
- `src/lib/safety/*`, `src/components/cbt/AiConsent.tsx`, `CrisisSupport.tsx`, the changed `CbtTriangleModal.tsx`,
  `src/app/api/cbt/analyze/route.ts`, `scripts/copy-safety-kit.mjs`, `tests/*`: the CBT safety layer.
- `src/lib/ai/*`, `src/app/api/ai/*`, `src/components/ai/*`, `src/components/review/CoachReviewPanel.tsx`, `tests/coach.test.mjs`,
  plus the coach hooks in `ProjectsView.tsx`, `app/review/page.tsx` and the settings page: the AI coach prototype.

## Sync (PC ↔ phone)

- `src/lib/sync/core.ts` must stay **byte-identical** with `../adrik-mobile/src/lib/sync/core.ts`. Change both or neither.
- Synced slots: main, vault, planner, projects. The journey store is **not** synced.
- A device that was never set up (`onboardingDone` false or nothing saved) only pulls: it never creates or changes
  the synced copy (`syncAll` decides this once, before any slot). The phone's personal build offers
  "اربط المزامنة" on its first onboarding screen, so a new phone pulls everything instead of merging onboarding samples.
  Tests: `tests/sync-core.test.mjs` (same file in both copies).
- Runtime fields (timer, break, theme, `activeFrogId`…) are in `LOCAL_ONLY` in `core.ts`.
  A new runtime-only field in the main store belongs there too.
- Supabase setup is still waiting on the founder (project, SQL, single user, connect PC first, then phone).

## CBT safety layer

- `crisis-detector.ts`, `analysis.ts`, `helplines.ts`, `texts.ts` are a portable kit: no `@/` imports, no React.
  Copy them to other projects only with `node scripts/copy-safety-kit.mjs <project>`.
- **Never write a helpline number** without an official source. The founder fills them in.
- Gemini is called only when the request has `useAI: true`. The key comes from the Windows env `GEMINI_API_KEY`
  (`.env` has it empty). The default model `gemini-2.5-flash` returns 404; `GEMINI_MODEL=gemini-3.8-flash` works.

## AI coach (prototype, this copy only)

- Two jobs: goal breakdown (projects: «ابدأ من هدف» and «اقترح الخطوات التالية») and the weekly coach review (review page).
- Its own consent, `adrik-ai-coach-consent`, separate from the CBT one. Saved reviews live in `adrik-ai-coach-reviews`.
  Both are plain localStorage keys outside the stores: not synced, not backed up, no persist version touched.
- Same safety order as CBT: local crisis check first, `AI_RISK_INSTRUCTION` in every prompt, anything but `risk:false` is a crisis.
- Only titles and numbers are sent (`lib/ai/weekSummary.ts`); the one free text is early-exit reasons, crisis-checked first.
- Prompts, reply checks and the local review engine are pure in `lib/ai/coach.ts` (relative imports only, tested by `npm test`).
- The AI suggests; nothing lands in a store until the person confirms, through `useProjectsStore` / `SendTo`.
- The phone's personal build reaches the same flow through the Supabase Edge Function `supabase/functions/coach/`
  (`handler.ts` checks the sign-in itself via `/auth/v1/user`; the other files there are generated).
  After changing `lib/ai/coach.ts` or the safety kit:
  1. Run `node scripts/copy-coach.mjs`. It regenerates the function copies and the mobile copy; `--check` verifies them.
  2. Redeploy: `npx supabase functions deploy coach --project-ref eazyazzgtrblnfbvlfoo --use-api --no-verify-jwt`.
  The Gemini key there is the Supabase secret `GEMINI_API_KEY`, which the founder sets; optional `GEMINI_MODEL`.

## Product conventions

- Look: calm, premium, light "paper"; olive `#2F5D50`, gold `#B8925A`. Use the existing tokens in
  `tailwind.config.ts` and `components/ui/*`, not new colors.
- Weeks run Saturday → Friday (`weekOf` / `weekRange` in `lib/utils.ts`).
- The focus timer follows **completion + challenge**: no pause, a written commitment, "end early" with a reason,
  and the streak follows "never miss twice". Keep new features in that spirit.
- Tools are linked, not isolated: hand work off through `lib/flow.ts` (`sendToInbox`, `sendToToday`) and
  `components/flow/SendTo.tsx`. Link new features into the chain Values → Projects → Skills → Priorities.
- Faith content is optional, and on for the founder.

# Safety kit: thought-reframing tool (CBT)

The protection around «تفكيك الأفكار»: a crisis check before anything is sent, AI consent, a calm support screen
with helplines, and the "not a substitute for a professional" notice.

It is built to be copied between the copies of the app (adrik-personal, adrik-app, adrik-mobile).

## Portable files: copy verbatim, keep identical everywhere

They have no `@/` imports, no React and no platform APIs.

| File | What it holds |
|---|---|
| `crisis-detector.ts` | Whole-phrase detector (MSA, Gulf, Egyptian, Levantine, English) with everyday idioms excluded. |
| `analysis.ts` | The safe order (`analyzeSafely`), the reply contract (`CbtReply`), the AI risk instruction and `readAiReply`. |
| `helplines.ts` | Support lines by region. Numbers stay empty until checked against an official source. |
| `texts.ts` | Every sentence the screens show, so the web and phone say the same thing. |

The tests are in `tests/crisis-detector.test.mjs` and `tests/safety-kit.test.mjs`, plus `tests/ts-resolve.mjs`.

- Run them with `npm test`: `node --no-warnings --import ./tests/ts-resolve.mjs --test "tests/*.test.mjs"`.
- They need no dependency.

To copy, run from the project that holds the newest kit:

```
node scripts/copy-safety-kit.mjs ../adrik-app            # copy
node scripts/copy-safety-kit.mjs ../adrik-mobile --check  # list what differs
```

## Platform pieces: written once per platform

| Piece | Web (this project) | Phone (adrik-mobile) |
|---|---|---|
| Consent storage | `aiConsent.ts` (localStorage `adrik-ai-consent`, not synced) | Not needed while the phone has no AI. Pass `consent: "local"` and `aiAvailable: () => false`. |
| Region for helplines | `region.ts` (pricing page logic: saved zone, else time zone) | No pricing data there yet. Map the time zone (expo-localization) to `HelplineZone`. |
| Analysis | `POST /api/cbt/analyze` (Gemini only when `useAI: true`, else the rules engine) | The local `reframeThought`, wrapped to return a `CbtReply`. |
| Screens | `components/cbt/CrisisSupport.tsx`, `AiConsent.tsx`, `CbtTriangleModal.tsx`, the settings row | Same screens in React Native, using `SAFETY_TEXT`. Replaces the old `soundsLikeCrisis` in `lib/reframe.ts`. |

## Porting checklist

**adrik-app** (same code as this project):
- Run the copy script.
- Copy `aiConsent.ts`, `region.ts`, the three `components/cbt` files, the route and the settings row as they are.
- Add the `test` script to package.json.

**adrik-mobile:**
- Run the copy script.
- In `CbtTool`, call `analyzeSafely` with the phone pieces from the table above.
- Show the crisis screen and `SAFETY_TEXT.disclaimer`.
- Add the `test` script.
- Run `npx tsc --noEmit` and `npx expo lint`.

**Never** write a helpline number without an official source.

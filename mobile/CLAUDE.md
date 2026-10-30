@AGENTS.md

# adrik-mobile
Expo/RN phone app «أدرك عمرك». Arabic RTL. Reply founder in Arabic. Sibling copies: `../adrik-personal` (PC daily copy), `../adrik-app` (product).

## Build variants (`eas.json`, `app.config.js`)
- `personal`: `APP_VARIANT=personal`, `EXPO_PUBLIC_PERSONAL_SYNC=1`, pkg `com.adrikomrak.app.personal`. Founder only. Has sync + AI coach.
- `preview`/`production`: sync `0`. Consumer.
- APKs saved in `../releases/`.

## Rules
- `src/lib/sync/core.ts` byte-identical with `../adrik-personal/src/lib/sync/core.ts`. Change both or neither.
- Coach/safety-kit copies generated from adrik-personal: run `node scripts/copy-coach.mjs` there, never hand-edit copies.
- New persisted/synced field → check `LOCAL_ONLY` in sync core.
- Wi-Fi sync key lives in SecureStore (`lib/sync/native.ts`), never in AsyncStorage. `expo-crypto` polyfills `crypto.getRandomValues` for the sealed requests.

## Check
`npx tsc --noEmit`, `npm test` (node --test `tests/*.test.mjs`), `npx expo lint`. Web preview: `npm run web` (port 8088).
Specs: `docs/SPEC_INTJ_*.md`; tasks: `tasks/todo.md`.

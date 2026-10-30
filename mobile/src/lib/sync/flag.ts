/**
 * Personal sync is for the founder's own phone only: it exists only in a build started with
 * EXPO_PUBLIC_PERSONAL_SYNC=1 (.env.local, or the "personal" EAS profile).
 * Every other build swaps the sync screens for empty stubs (metro.config.js), so the sync code is not even
 * in the app file that gets shared.
 */
export const PERSONAL_SYNC_ENABLED = process.env.EXPO_PUBLIC_PERSONAL_SYNC === "1";

/**
 * Stand-in for SyncPanel.tsx in every build without personal sync (see metro.config.js).
 * Nothing here imports the sync code, so it never reaches a shared app file.
 * The types come from the real file so the two cannot drift apart.
 */
export const SyncWatcher: typeof import("./SyncPanel").SyncWatcher = () => null;
export const SyncPanel: typeof import("./SyncPanel").SyncPanel = () => null;

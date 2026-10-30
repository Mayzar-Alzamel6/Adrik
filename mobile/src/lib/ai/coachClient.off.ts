/**
 * Stand-in for coachClient.ts in every build without personal sync (see metro.config.js):
 * no AI there, and no sync code in the app file. The coach screens fall back to their local rules.
 */
export type { CoachAccess } from "./coachClient";

export const coachAccess: typeof import("./coachClient").coachAccess = async () => "no-sync";

export const askBreakdown: typeof import("./coachClient").askBreakdown = async () => {
  throw new Error("no-sync");
};

export const askReview: typeof import("./coachClient").askReview = async () => {
  throw new Error("no-sync");
};

import type { useAppStore } from "@/stores/useAppStore";
import { toLocalDateString } from "@/lib/utils";

type AppData = Pick<
  ReturnType<typeof useAppStore.getState>,
  "focusSessions" | "frogHistory" | "frogs" | "identityVotes" | "cbtLogs" | "timeEntries"
>;

const dayOf = (iso?: string) => (iso ? toLocalDateString(new Date(iso)) : null);

/** Days with a recorded action: a session, a finished priority, an identity vote, a reframe or logged time. */
export function activeDays(app: AppData): Set<string> {
  const days = new Set<string>();
  const add = (d: string | null) => d && days.add(d);
  app.focusSessions.forEach((s) => add(dayOf(s.startedAt)));
  app.frogHistory.forEach((r) => r.frogs.forEach((f) => add(dayOf(f.completedAt))));
  app.frogs.forEach((f) => add(dayOf(f.completedAt)));
  app.identityVotes.forEach((v) => add(v.date));
  app.cbtLogs.forEach((c) => add(dayOf(c.createdAt)));
  app.timeEntries.forEach((t) => add(dayOf(t.createdAt)));
  return days;
}

export function doneFrogCount(app: Pick<AppData, "frogHistory" | "frogs">) {
  return app.frogHistory.reduce((n, r) => n + r.frogs.filter((f) => f.completedAt).length, 0) + app.frogs.filter((f) => f.isCompleted).length;
}

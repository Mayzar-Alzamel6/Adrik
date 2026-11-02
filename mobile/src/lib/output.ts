import type { FocusSessionLog, FrogDayRecord, FrogTask } from "@/stores/useAppStore";
import { dayRecords } from "@/lib/completion";
import type { RcaEntry } from "@/stores/useFocusGuardStore";
import { lastDays } from "@/lib/habits";
import { weekRange, toLocalDateString, type WeekRef } from "@/lib/utils";
import {
  DEEP_MIN_MINUTES,
  deepMinutesOn,
  type DistractionEvent,
  drainShare,
  frogRate,
  sessionCompletionRate,
  tuningChange,
  TUNING_MIN_SESSIONS,
  weekDistractionSummary,
} from "@/lib/focusGuard";

interface Data {
  frogs: FrogTask[];
  frogHistory: FrogDayRecord[];
  currentDay: string;
  focusSessions: FocusSessionLog[];
}

function energyLookup(data: Data) {
  const map = new Map<string, "genius" | "neutral" | "drain">();
  for (const d of data.frogHistory) for (const f of d.frogs) if (f.energyTag) map.set(f.id, f.energyTag);
  for (const f of data.frogs) if (f.energyTag) map.set(f.id, f.energyTag);
  return (id?: string) => (id ? map.get(id) : undefined);
}

export const weekDates = (ref: WeekRef) => {
  const { start } = weekRange(ref);
  return Array.from({ length: 7 }, (_, i) => toLocalDateString(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)));
};

/** Deep minutes delivered per day over the last `n` days, oldest first. */
export function deepMinutesSeries(data: Data, n: number) {
  const energy = energyLookup(data);
  return lastDays(data.currentDay, n).map((date) => ({ date, minutes: deepMinutesOn(date, data.focusSessions, energy) }));
}

export function weekFrogRate(data: Data, dates: string[]) {
  const map = dayRecords(data);
  return frogRate(dates.filter((d) => map.has(d)).map((date) => ({ date, frogs: map.get(date)! })));
}

/** The weekly load suggestion from the last seven days. */
export function weeklyTuning(data: Data, rcaLog: RcaEntry[]) {
  const dates = lastDays(data.currentDay, 7);
  const sessions = data.focusSessions.filter((s) => s.plannedMinutes >= DEEP_MIN_MINUTES && dates.includes(toLocalDateString(new Date(s.endedAt))));
  if (sessions.length < TUNING_MIN_SESSIONS) return "hold" as const;
  const map = dayRecords(data);
  return tuningChange({
    completionRate: sessionCompletionRate(data.focusSessions, dates),
    rcaC: rcaLog.filter((r) => r.bug === "BUG_C" && dates.includes(r.date)).length,
    drainPct: drainShare(dates.filter((d) => map.has(d)).map((d) => ({ frogs: map.get(d)! }))),
  });
}

export function weekDistractions(events: DistractionEvent[], ref: WeekRef) {
  return weekDistractionSummary(events, weekDates(ref));
}

/**
 * Pure rules of the focus guard: when a slip counts as distraction, how the day escalates,
 * the output metrics and the weekly load tuning. No React, no stores, so `npm test` covers it.
 */

export type DistractionTrigger = "exits" | "away" | "no-start" | "early-quit" | "manual";
export type DistractionKind = "phone" | "idea" | "person" | "boredom" | "fatigue" | "anxiety";

export interface DistractionEvent {
  id: string;
  /** Local day "YYYY-MM-DD". */
  date: string;
  at: number;
  trigger: DistractionTrigger;
  kind?: DistractionKind;
  /** When work started again; absent while the person has not come back. */
  resumedAt?: number;
}

export const DISTRACTION_KINDS: { id: DistractionKind; label: string; emoji: string }[] = [
  { id: "phone", label: "هاتف", emoji: "📱" },
  { id: "idea", label: "فكرة", emoji: "💡" },
  { id: "person", label: "شخص", emoji: "🗣️" },
  { id: "boredom", label: "ملل", emoji: "😐" },
  { id: "fatigue", label: "تعب", emoji: "🥱" },
  { id: "anxiety", label: "قلق", emoji: "😟" },
];

/** One preventive move for each recurring distraction, shown in the weekly review. */
export const PREVENTION: Record<DistractionKind, string> = {
  phone: "ضع الهاتف في غرفة أخرى أو فعّل «لا تزعجني» قبل كل كتلة.",
  idea: "ابدأ الكتلة بفتح 💡 Vault، وفرّغ كل فكرة فوراً بدل ملاحقتها.",
  person: "أعلن وقت الكتلة لمن حولك، وأغلق الباب.",
  boredom: "قسّم المهمة: اكتب أول فعل خلال دقيقتين قبل البدء.",
  fatigue: "انقل الكتلة العميقة إلى أعلى ساعات طاقتك، ولا تتجاوز الاستراحة.",
  anxiety: "اكتب سطراً في اليوميات قبل البدء: ما الذي يقلقك وما خطوتك التالية؟",
};

export const AWAY_LIMIT_MS = 5 * 60000;
export const EARLY_QUIT_MS = 10 * 60000;
export const NO_START_MS = 30 * 60000;
export const KICKOFF_MINUTES = 10;
export const DEEP_CAP_MIN = 2;
export const DEEP_CAP_MAX = 4;

/** Leaving the app twice in one session, or staying away more than five minutes, is a slip. */
export function awayTrigger(exits: number, awayMs: number): DistractionTrigger | null {
  if (awayMs > AWAY_LIMIT_MS) return "away";
  if (exits >= 2) return "exits";
  return null;
}

export const isEarlyQuit = (elapsedMs: number) => elapsedMs < EARLY_QUIT_MS;

/** Half an hour into the working day with no session started. */
export function isNoStart(dayStartedAt: number | null, now: number, startedToday: boolean) {
  return !startedToday && dayStartedAt !== null && now - dayStartedAt >= NO_START_MS;
}

export type Escalation = "none" | "shorten" | "recharge";

/** The third slip of a day suggests a lighter block; the fourth and later suggest recharging. */
export function escalationFor(slipsToday: number): Escalation {
  if (slipsToday >= 4) return "recharge";
  if (slipsToday === 3) return "shorten";
  return "none";
}

/** Average minutes from a detected slip to work starting again, over the slips that ended in a return. */
export function avgReturnMinutes(events: DistractionEvent[]): number | null {
  const back = events.filter((e) => e.resumedAt && e.resumedAt >= e.at);
  if (!back.length) return null;
  const total = back.reduce((sum, e) => sum + (e.resumedAt! - e.at), 0);
  return Math.round(total / back.length / 60000);
}

export function topDistractions(events: DistractionEvent[], n = 3) {
  const counts = new Map<DistractionKind, number>();
  for (const e of events) if (e.kind) counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([kind, count]) => ({ kind, count, prevention: PREVENTION[kind] }));
}

export function weekDistractionSummary(events: DistractionEvent[], dates: string[]) {
  const inWeek = events.filter((e) => dates.includes(e.date));
  return {
    total: inWeek.length,
    returned: inWeek.filter((e) => e.resumedAt).length,
    top: topDistractions(inWeek),
    avgReturnMin: avgReturnMinutes(inWeek),
  };
}

type Energy = "genius" | "neutral" | "drain";

interface SessionLike {
  endedAt: string;
  actualMinutes: number;
  plannedMinutes: number;
  completed: boolean;
  outcome: "DONE" | "PARTIAL" | "NOT" | null;
  taskId?: string;
}

const localDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Deep work delivered on a day: full sessions on genius or neutral work that were not rated as a miss.
 * Ended-early and dropped work never count.
 */
export function deepMinutesOn(date: string, sessions: SessionLike[], energyOf: (taskId?: string) => Energy | undefined) {
  return sessions
    .filter((s) => localDate(s.endedAt) === date && s.completed && s.outcome !== "NOT" && energyOf(s.taskId) !== "drain")
    .reduce((sum, s) => sum + s.actualMinutes, 0);
}

/** Full deep blocks (45 minutes or more) finished today — what the "enough" alert counts. */
export function deepBlocksOn(date: string, sessions: SessionLike[]) {
  return sessions.filter((s) => localDate(s.endedAt) === date && s.completed && s.plannedMinutes >= 45).length;
}

interface DayLike {
  date: string;
  frogs: { order: number; completedAt?: string; isDropped?: boolean }[];
}

/** Days whose first priority (the frog) was delivered, out of the days that had a plan. */
export function frogRate(days: DayLike[]) {
  const planned = days.filter((d) => d.frogs.length);
  if (!planned.length) return null;
  const won = planned.filter((d) => {
    const frog = [...d.frogs].sort((a, b) => a.order - b.order)[0];
    return Boolean(frog.completedAt) && !frog.isDropped;
  }).length;
  return Math.round((won / planned.length) * 100);
}

export type TuningChange = "up" | "hold" | "down";

export interface TuningInput {
  /** Share of started sessions that ran to the end, 0–100. */
  completionRate: number | null;
  /** Energy-crash (Bug C) RCAs in the window. */
  rcaC: number;
  /** Share of drain work, 0–100. */
  drainPct: number;
}

/** The weekly rule: push when everything is green, pull back on any red sign, otherwise hold. */
export function tuningChange({ completionRate, rcaC, drainPct }: TuningInput): TuningChange {
  if (completionRate === null) return "hold";
  if (completionRate < 70 || rcaC >= 3 || drainPct > 30) return "down";
  if (completionRate >= 90 && rcaC === 0 && drainPct < 20) return "up";
  return "hold";
}

export function applyTuning(cap: number, change: TuningChange) {
  const next = change === "up" ? cap + 1 : change === "down" ? cap - 1 : cap;
  return Math.max(DEEP_CAP_MIN, Math.min(DEEP_CAP_MAX, next));
}

/** Share of sessions in the window that ran to the end. */
export function sessionCompletionRate(sessions: SessionLike[], dates: string[]) {
  const inWindow = sessions.filter((s) => dates.includes(localDate(s.endedAt)));
  if (!inWindow.length) return null;
  return Math.round((inWindow.filter((s) => s.completed).length / inWindow.length) * 100);
}

/** Share of drain work among the priorities planned over the window, 0–100. */
export function drainShare(days: { frogs: { energyTag?: Energy }[] }[]) {
  const all = days.flatMap((d) => d.frogs);
  if (!all.length) return 0;
  return Math.round((all.filter((f) => f.energyTag === "drain").length / all.length) * 100);
}

/** Fewer sessions than this in the week leave the load as it is: too little to judge. */
export const TUNING_MIN_SESSIONS = 3;

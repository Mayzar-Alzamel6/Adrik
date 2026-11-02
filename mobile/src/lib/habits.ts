import type { BinaryHabit } from "@/stores/useAppStore";
import { toLocalDateString } from "@/lib/utils";

export type HabitHistory = Record<string, string[]>;

/** In display order: the week runs Saturday → Friday. `day` is the `Date.getDay()` number, so look days up with `weekday()`. */
export const WEEKDAYS = [
  { day: 6, short: "س", long: "السبت" },
  { day: 0, short: "ح", long: "الأحد" },
  { day: 1, short: "ن", long: "الاثنين" },
  { day: 2, short: "ث", long: "الثلاثاء" },
  { day: 3, short: "ر", long: "الأربعاء" },
  { day: 4, short: "خ", long: "الخميس" },
  { day: 5, short: "ج", long: "الجمعة" },
];

export const weekday = (getDay: number) => WEEKDAYS.find((w) => w.day === getDay)!;

export const parseDay = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const shiftDay = (day: string, by: number) => {
  const d = parseDay(day);
  d.setDate(d.getDate() + by);
  return toLocalDateString(d);
};

/** The last `n` days ending at `today`, oldest first. */
export const lastDays = (today: string, n: number) => Array.from({ length: n }, (_, i) => shiftDay(today, i - n + 1));

export const isDue = (h: BinaryHabit, day: string) => !h.days?.length || h.days.includes(parseDay(day).getDay());

export const isDone = (history: HabitHistory, id: string, day: string) => Boolean(history[day]?.includes(id));

/** The first day a habit can be judged on: its creation, or the oldest day it was ticked. */
export function habitStart(h: BinaryHabit, history: HabitHistory, today: string) {
  let start = h.createdAt ? toLocalDateString(new Date(h.createdAt)) : today;
  for (const [day, ids] of Object.entries(history)) if (day < start && ids.includes(h.id)) start = day;
  return start;
}

export interface HabitStats {
  /** Due days kept in a row, forgiving a single miss ("never miss twice"). */
  streak: number;
  best: number;
  /** % of due days done in the last 30 days (today counts only once done). */
  rate30: number;
  totalDone: number;
  dueToday: boolean;
  doneToday: boolean;
  /** The last due day before today was missed: today decides whether the chain survives. */
  missedLast: boolean;
}

/**
 * One missed due day bends the chain; two in a row break it. A miss never adds to the count,
 * and an unfinished today never counts against it — the day isn't over yet.
 */
export function habitStats(h: BinaryHabit, history: HabitHistory, today: string): HabitStats {
  const start = habitStart(h, history, today);
  const doneToday = isDone(history, h.id, today);
  const dueToday = isDue(h, today);

  // Walk forward from the start to compute best and current streak with the same rule.
  let run = 0;
  let best = 0;
  let misses = 0;
  let totalDone = 0;
  for (let day = start; day <= today; day = shiftDay(day, 1)) {
    const done = isDone(history, h.id, day);
    if (done) totalDone += 1;
    if (!isDue(h, day)) continue;
    if (day === today && !done) break;
    if (done) {
      run += 1;
      misses = 0;
    } else {
      misses += 1;
      if (misses >= 2) run = 0;
    }
    best = Math.max(best, run);
  }

  const window = lastDays(today, 30).filter((d) => d >= start && isDue(h, d) && (d !== today || doneToday));
  const doneInWindow = window.filter((d) => isDone(history, h.id, d)).length;

  let prevDue = shiftDay(today, -1);
  for (let i = 0; i < 7 && !isDue(h, prevDue); i++) prevDue = shiftDay(prevDue, -1);
  const missedLast = prevDue >= start && isDue(h, prevDue) && !isDone(history, h.id, prevDue);

  return {
    streak: run,
    best,
    rate30: window.length ? Math.round((doneInWindow / window.length) * 100) : 0,
    totalDone,
    dueToday,
    doneToday,
    missedLast,
  };
}

/** A habit is a 21-day commitment: no editing, archiving or deleting until it has had its chance. */
export const HABIT_COMMITMENT_DAYS = 21;
/** The first hours after adding stay open, to fix a typo or drop a habit added by mistake. */
export const HABIT_GRACE_HOURS = 24;

export interface HabitLock {
  locked: boolean;
  /** Within the first hours after it was added. */
  inGrace: boolean;
  /** Day of the commitment the habit is on (1…21). */
  day: number;
  daysLeft: number;
  unlockDay: string;
}

export function habitLock(h: BinaryHabit, history: HabitHistory, today: string, now = Date.now()): HabitLock {
  const start = habitStart(h, history, today);
  const createdMs = h.createdAt ? Date.parse(h.createdAt) : parseDay(start).getTime();
  const inGrace = now - createdMs < HABIT_GRACE_HOURS * 3600000;
  const unlockDay = shiftDay(start, HABIT_COMMITMENT_DAYS);
  const daysLeft = Math.max(0, Math.round((parseDay(unlockDay).getTime() - parseDay(today).getTime()) / 86400000));
  return {
    locked: !inGrace && daysLeft > 0,
    inGrace,
    day: Math.min(HABIT_COMMITMENT_DAYS, HABIT_COMMITMENT_DAYS - daysLeft + 1),
    daysLeft,
    unlockDay,
  };
}

/** Share of due habit-days done over a set of days, across all active habits. */
export function overallRate(habits: BinaryHabit[], history: HabitHistory, days: string[], today: string) {
  let due = 0;
  let done = 0;
  for (const h of habits) {
    const start = habitStart(h, history, today);
    for (const d of days) {
      if (d < start || !isDue(h, d)) continue;
      const ok = isDone(history, h.id, d);
      if (d === today && !ok) continue;
      due += 1;
      if (ok) done += 1;
    }
  }
  return due ? Math.round((done / due) * 100) : 0;
}

/** Local calendar date as "YYYY-MM-DD" (toISOString() would give the UTC date instead). */
export function toLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Week of the year (1-52) using the same formula as the 52-week matrix. */
/**
 * Weeks run Saturday → Friday, so Friday's review covers the week just lived.
 * A week belongs to the year its Friday falls in; week 1 holds the year's first Friday.
 */
export interface WeekRef {
  year: number;
  week: number;
}

const fridayOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + ((5 - date.getDay() + 7) % 7));

export function weekOf(date: Date = new Date()): WeekRef {
  const friday = fridayOf(date);
  const year = friday.getFullYear();
  // Rounded, so a daylight-saving hour never shifts the count.
  const week = Math.round((friday.getTime() - fridayOf(new Date(year, 0, 1)).getTime()) / (7 * 86400000)) + 1;
  return { year, week };
}

/** 52 or 53: one week per Friday in the year. */
export function weeksInYear(year: number) {
  const dec31 = new Date(year, 11, 31);
  return weekOf(new Date(year, 11, 31 - ((dec31.getDay() + 2) % 7))).week;
}

/** Saturday 00:00 that opens the week, and the next Saturday 00:00 (exclusive). */
export function weekRange({ year, week }: WeekRef) {
  const first = fridayOf(new Date(year, 0, 1));
  const start = new Date(year, first.getMonth(), first.getDate() + (week - 1) * 7 - 6);
  return { start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7) };
}

export const shiftWeek = (ref: WeekRef, by: number) => {
  const { start } = weekRange(ref);
  return weekOf(new Date(start.getFullYear(), start.getMonth(), start.getDate() + by * 7));
};

export const isInWeek = (date: Date, ref: WeekRef) => {
  const w = weekOf(date);
  return w.year === ref.year && w.week === ref.week;
};

export const sameWeek = (a: WeekRef, b: WeekRef) => a.year === b.year && a.week === b.week;

const WEEK_DAY = new Intl.DateTimeFormat("ar", { day: "numeric", month: "long" });

/** The week's Saturday and Friday: "26 سبتمبر – 2 أكتوبر". */
export function weekRangeLabel(ref: WeekRef) {
  const { start, end } = weekRange(ref);
  return `${WEEK_DAY.format(start)} – ${WEEK_DAY.format(new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1))}`;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/** "45 د" under an hour, "1س 20د" above it. */
export function formatMinutes(total: number): string {
  if (total < 60) return `${total} د`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}س ${m}د` : `${h} س`;
}

/** Arabic number agreement for "full session(s)". */
export function fullSessions(n: number) {
  if (n === 1) return "جلسة كاملة واحدة";
  if (n === 2) return "جلستان كاملتان";
  if (n >= 3 && n <= 10) return `${n} جلسات كاملة`;
  return `${n} جلسة كاملة`;
}

/** Arabic number agreement for minutes: "5 دقائق", "20 دقيقة". */
export function minutesAr(n: number) {
  if (n === 1) return "دقيقة واحدة";
  if (n === 2) return "دقيقتان";
  if (n >= 3 && n <= 10) return `${n} دقائق`;
  return `${n} دقيقة`;
}

/** Gregorian date line plus the Hijri date when the engine supports the calendar. */
export function dateLines(now: Date = new Date()) {
  let greg = "";
  let hijri = "";
  try {
    greg = new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long" }).format(now);
  } catch {
    greg = toLocalDateString(now);
  }
  try {
    hijri = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" }).format(now);
  } catch {
    /* calendar not supported by this JS engine */
  }
  return { greg, hijri };
}

export function greeting(hour: number) {
  if (hour < 5) return "ليلة هادئة";
  if (hour < 12) return "صباح الخير";
  if (hour < 17) return "نهارك سعيد";
  return "مساء الخير";
}

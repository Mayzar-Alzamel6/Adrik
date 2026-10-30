/**
 * Beta usage report: numbers about how someone uses the app, never what they wrote.
 * No task titles, thoughts, feelings, commitments, values text or names leave the device.
 * The only free text is the optional note the user types into the report form themselves.
 */
import { useAppStore } from "@/stores/useAppStore";
import { usePlannerStore } from "@/stores/usePlannerStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { useVaultStore } from "@/stores/useVaultStore";
import { useJourneyStore } from "@/stores/useJourneyStore";
import { habitStats, lastDays, overallRate } from "@/lib/habits";
import { toLocalDateString } from "@/lib/utils";

/**
 * TODO(المؤسس): رابط واتساب أو بريد يستقبل التقارير (مثلاً https://wa.me/<رقمك>).
 * While empty, the panel just asks testers to send the downloaded file to you.
 */
export const REPORT_CONTACT_URL = "";

const DAY_MS = 24 * 60 * 60 * 1000;

const dayOf = (iso?: string) => (iso ? toLocalDateString(new Date(iso)) : null);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS);
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

export function buildUsageReport(note?: string) {
  const app = useAppStore.getState();
  const { tasks } = usePlannerStore.getState();
  const { projects } = useProjectsStore.getState();
  const { vaultItems } = useVaultStore.getState();
  const journey = useJourneyStore.getState();
  const today = toLocalDateString();

  // Active days: any day with a recorded action (session, finished priority, vote, reframe, time entry).
  const days = new Set<string>();
  const add = (d: string | null) => d && days.add(d);
  app.focusSessions.forEach((s) => add(dayOf(s.startedAt)));
  app.frogHistory.forEach((r) => r.frogs.forEach((f) => add(dayOf(f.completedAt))));
  app.frogs.forEach((f) => add(dayOf(f.completedAt)));
  app.identityVotes.forEach((v) => add(v.date));
  app.cbtLogs.forEach((c) => add(dayOf(c.createdAt)));
  app.timeEntries.forEach((t) => add(dayOf(t.createdAt)));
  const sortedDays = [...days].sort();

  // A break is 2+ missed days in a row; the day after it is a return.
  const gaps = sortedDays.slice(1).map((d, i) => daysBetween(sortedDays[i], d) - 1);
  const breaks = gaps.filter((g) => g >= 2);
  const within = (d: string, n: number) => daysBetween(d, today) < n;

  const sessions = app.focusSessions;
  const recent = sessions.filter((s) => within(dayOf(s.startedAt) ?? "1970-01-01", 7));
  const byLength = { "15": 0, "25": 0, "90": 0, other: 0 };
  sessions.forEach((s) => {
    const key = String(s.plannedMinutes) as keyof typeof byLength;
    byLength[key in byLength ? key : "other"] += 1;
  });
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.actualMinutes || 0), 0);

  const historyFrogs = app.frogHistory.flatMap((r) => r.frogs);
  const plannedFrogs = historyFrogs.length + app.frogs.length;
  const doneFrogs = historyFrogs.filter((f) => f.completedAt).length + app.frogs.filter((f) => f.isCompleted).length;

  const minutesByCategory = { QUALITY: 0, EMERGENCY: 0, DELEGATE: 0, ESCAPE: 0 };
  app.timeEntries.forEach((t) => (minutesByCategory[t.category] += t.durationMinutes || 0));

  // The 52-week map is pre-filled with PENDING weeks; only submitted reviews count as use.
  const audits = app.weeklyAudits.filter((a) => a.colorStatus !== "PENDING");
  const colors = { GREEN: 0, YELLOW: 0, RED: 0 };
  audits.forEach((a) => {
    if (a.colorStatus !== "PENDING") colors[a.colorStatus] += 1;
  });

  const projectTasks = projects.flatMap((p) => p.tasks);

  const standalone = typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches;

  return {
    app: "adrik",
    kind: "usage-report",
    format: 1,
    generatedAt: new Date().toISOString(),
    environment: {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: typeof navigator !== "undefined" ? navigator.language : null,
      screen: typeof window !== "undefined" && window.innerWidth < 768 ? "narrow" : "wide",
      installedAsApp: Boolean(standalone),
    },
    settings: {
      onboardingDone: app.onboardingDone,
      focusArea: app.profile.focusArea,
      faithContent: app.settings.faithContent,
      sound: app.settings.sound !== false,
      theme: app.themeMode,
    },
    // Which stages opened and when: shows where gradual setup stalls, without any content.
    journey: {
      mode: journey.mode,
      stagesOpen: journey.unlocked,
      openedOn: Object.fromEntries(Object.entries(journey.unlockedAt).map(([k, v]) => [k, v ? v.slice(0, 10) : null])),
    },
    activity: {
      firstActiveDay: sortedDays[0] ?? null,
      lastActiveDay: sortedDays[sortedDays.length - 1] ?? null,
      activeDays: sortedDays.length,
      activeDaysLast7: sortedDays.filter((d) => within(d, 7)).length,
      activeDaysLast30: sortedDays.filter((d) => within(d, 30)).length,
      breaks: breaks.length,
      longestBreakDays: breaks.length ? Math.max(...breaks) : 0,
    },
    focus: {
      sessions: sessions.length,
      completed: sessions.filter((s) => s.completed).length,
      endedEarly: sessions.filter((s) => !s.completed).length,
      byPlannedMinutes: byLength,
      totalMinutes,
      averageMinutes: sessions.length ? Math.round(totalMinutes / sessions.length) : 0,
      outcomes: {
        done: sessions.filter((s) => s.outcome === "DONE").length,
        partial: sessions.filter((s) => s.outcome === "PARTIAL").length,
        not: sessions.filter((s) => s.outcome === "NOT").length,
        unrated: sessions.filter((s) => !s.outcome).length,
      },
      sessionsLast7Days: recent.length,
      minutesLast7Days: recent.reduce((sum, s) => sum + (s.actualMinutes || 0), 0),
      currentStreak: app.focusStreak,
      bestStreak: app.bestFocusStreak,
      distractionsCapturedNow: app.distractions.length,
    },
    priorities: {
      daysPlanned: app.frogHistory.length,
      planned: plannedFrogs,
      completed: doneFrogs,
      completionRate: pct(doneFrogs, plannedFrogs),
      todayLinkedToProjectOrSkill: app.frogs.filter((f) => f.projectId || f.skillId).length,
    },
    tools: {
      thoughtReframes: app.cbtLogs.length,
      impulseDelays: {
        total: vaultItems.length,
        resolved: vaultItems.filter((v) => v.isResolved).length,
        twoHours: vaultItems.filter((v) => v.delayHours === 2).length,
        oneDay: vaultItems.filter((v) => v.delayHours === 24).length,
      },
      identityVotes: app.identityVotes.length,
      values: app.values.length,
      beliefAudits: app.beliefAudits.length,
      reframedStories: app.reframedStories.length,
      goalIdentities: app.goalIdentities.length,
      eveningHabits: app.binaryHabits.length,
      habits: (() => {
        const active = app.binaryHabits.filter((h) => !h.archived);
        const stats = active.map((h) => habitStats(h, app.habitHistory, app.currentDay));
        return {
          active: active.length,
          archived: app.binaryHabits.length - active.length,
          linkedToValues: active.filter((h) => h.valueId).length,
          withCue: active.filter((h) => h.cue).length,
          withMinimum: active.filter((h) => h.minimum).length,
          daysTracked: Object.keys(app.habitHistory).length,
          rate30: overallRate(active, app.habitHistory, lastDays(app.currentDay, 30), app.currentDay),
          longestStreak: Math.max(0, ...stats.map((s) => s.streak)),
          bestStreak: Math.max(0, ...stats.map((s) => s.best)),
        };
      })(),
      calendarEvents: app.events.length,
      timeEntries: app.timeEntries.length,
      minutesByCategory,
      weeklyReviews: {
        count: audits.length,
        averageCompletionRate: audits.length
          ? Math.round(audits.reduce((sum, a) => sum + a.completionRate, 0) / audits.length)
          : 0,
        colors,
      },
      skills: { count: app.skills.length, loggedHours: app.skills.reduce((sum, s) => sum + (s.loggedHours || 0), 0) },
      projects: {
        count: projects.length,
        tasks: projectTasks.length,
        tasksDone: projectTasks.filter((t) => t.status === "DONE").length,
        linkedToValues: projects.filter((p) => p.valueIds?.length).length,
        linkedToSkills: projects.filter((p) => p.skillIds?.length).length,
      },
      eisenhowerTasks: { count: tasks.length, completed: tasks.filter((t) => t.isCompleted).length },
    },
    note: note?.trim() ? note.trim().slice(0, 2000) : null,
  };
}

export type UsageReport = ReturnType<typeof buildUsageReport>;

/** Short, readable lines so testers see exactly what they are about to send. */
export function summarizeUsageReport(r: UsageReport): string[] {
  const hours = Math.round((r.focus.totalMinutes / 60) * 10) / 10;
  return [
    `الأيام النشطة: ${r.activity.activeDays}، منها ${r.activity.activeDaysLast7} في آخر 7 أيام`,
    `جلسات التركيز: ${r.focus.completed} مكتملة من ${r.focus.sessions}، بمجموع ${hours} ساعة`,
    `الأولويات: أنجزت ${r.priorities.completed} من ${r.priorities.planned} (${r.priorities.completionRate}%)`,
    `فترات الانقطاع: ${r.activity.breaks}، وأطولها ${r.activity.longestBreakDays} يوماً`,
    `الأدوات: تفكيك الأفكار ${r.tools.thoughtReframes} · تأجيل الاندفاع ${r.tools.impulseDelays.total} · مراجعات أسبوعية ${r.tools.weeklyReviews.count} · مشاريع ${r.tools.projects.count}`,
  ];
}

export const usageReportFileName = (r: UsageReport) => `adrik-usage-${r.generatedAt.slice(0, 10)}.json`;

/** Opens the phone's share sheet (WhatsApp, email…) when it can take files; otherwise downloads the file. */
export async function shareUsageReport(r: UsageReport): Promise<"shared" | "downloaded" | "cancelled"> {
  const name = usageReportFileName(r);
  const file = new File([JSON.stringify(r, null, 2)], name, { type: "application/json" });

  if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "تقرير استخدام أدرك عمرك" });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
      // Any other share failure falls back to a plain download below.
    }
  }

  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
  return "downloaded";
}

import { useMemo } from "react";
import { EXTERNAL_INTERRUPTION, useAppStore, type FocusSessionLog } from "@/stores/useAppStore";
import { projectProgress } from "@/stores/useProjectsStore";
import { computeValueWeek, useValueData } from "@/lib/valueInsights";
import { completionByDay, summarize } from "@/lib/completion";
import { habitStart, habitStats, isDone, isDue, lastDays } from "@/lib/habits";
import { isInWeek, sameWeek, toLocalDateString, weekOf, weekRange, weekRangeLabel, type WeekRef } from "@/lib/utils";
import type { WeekSummary } from "@/lib/ai/coach";

/** Same as the web's lib/ai/weekSummary.ts, on the phone's stores. */
type Data = ReturnType<typeof useValueData> & { focusSessions: FocusSessionLog[] };

export function useCoachWeekData(): Data {
  const base = useValueData();
  const focusSessions = useAppStore((s) => s.focusSessions);
  return useMemo(() => ({ ...base, focusSessions }), [base, focusSessions]);
}

/**
 * What the coach sees of a week: numbers and titles only. Commitments, notes and thoughts stay on the phone;
 * the one free text is the early-exit reasons, which are checked for crisis words before anything is sent.
 */
export function buildWeekSummary(week: WeekRef, data: Data, today = toLocalDateString()): WeekSummary {
  const { start, end } = weekRange(week);
  const lastOfWeek = toLocalDateString(new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1));
  const endDay = lastOfWeek < today ? lastOfWeek : today;
  const firstDay = toLocalDateString(start);
  const days = lastDays(endDay, 7).filter((d) => d >= firstDay);
  const isCurrentWeek = sameWeek(week, weekOf());

  const vw = computeValueWeek(week, data);
  const priorities = summarize(completionByDay(days.length, data, endDay));

  const sessions = data.focusSessions.filter((s) => isInWeek(new Date(s.endedAt), week));
  const interrupted = sessions.filter((s) => !s.completed && s.earlyExitReason === EXTERNAL_INTERRUPTION);
  const exits = sessions.filter((s) => !s.completed && s.earlyExitReason !== EXTERNAL_INTERRUPTION);

  const projectMinutes = new Map<string, number>();
  for (const s of sessions) if (s.projectId) projectMinutes.set(s.projectId, (projectMinutes.get(s.projectId) ?? 0) + s.actualMinutes);

  return {
    weekLabel: `الأسبوع ${week.week} (${weekRangeLabel(week)})`,
    isCurrentWeek,
    daysElapsed: days.length,
    priorities,
    focus: {
      minutes: vw.focusMinutes,
      linkedMinutes: vw.linkedMinutes,
      sessions: sessions.length,
      completed: sessions.filter((s) => s.completed).length,
      earlyExits: exits.length,
      interruptions: interrupted.length,
      exitReasons: exits.map((s) => s.earlyExitReason?.trim() ?? "").filter(Boolean).slice(0, 10),
    },
    values: vw.rows.map((r) => ({ title: r.value.title, minutes: r.minutes, prioritiesDone: r.frogsDone, habitsDone: r.habitsDone })),
    neglectedValues: vw.neglected.map((v) => v.title),
    projects: data.projects
      .filter((p) => projectMinutes.has(p.id))
      .map((p) => ({ name: p.name, minutes: projectMinutes.get(p.id)!, progress: projectProgress(p).percent }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5),
    skills: vw.skillMinutes.slice(0, 5).map((x) => ({ title: x.skill.title, minutes: x.minutes })),
    habits: data.binaryHabits
      .filter((h) => !h.archived)
      .map((h) => {
        const from = habitStart(h, data.habitHistory, today);
        const due = days.filter((d) => d >= from && isDue(h, d) && (d !== today || isDone(data.habitHistory, h.id, d)));
        const stats = habitStats(h, data.habitHistory, today);
        return {
          title: h.title,
          done: due.filter((d) => isDone(data.habitHistory, h.id, d)).length,
          due: due.length,
          streak: stats.streak,
          atRisk: isCurrentWeek && stats.missedLast && stats.dueToday && !stats.doneToday,
          ...(h.minimum ? { minimum: h.minimum } : {}),
        };
      })
      .filter((h) => h.due > 0),
  };
}

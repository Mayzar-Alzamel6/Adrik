import { useMemo } from "react";
import {
  useAppStore,
  type BinaryHabit,
  type CoreValueItem,
  type FrogDayRecord,
  type FrogLinks,
  type FrogTask,
  type SkillProjectItem,
  type TimeEntryItem,
} from "@/stores/useAppStore";
import { useProjectsStore, type Project } from "@/stores/useProjectsStore";
import { resolveLineage } from "@/lib/lineage";
import { isInWeek, type WeekRef } from "@/lib/utils";

interface Data {
  binaryHabits: BinaryHabit[];
  habitHistory: Record<string, string[]>;
  values: CoreValueItem[];
  projects: Project[];
  skills: SkillProjectItem[];
  frogs: FrogTask[];
  frogHistory: FrogDayRecord[];
  timeEntries: TimeEntryItem[];
  currentDay: string;
}

/**
 * Entries logged before lineage snapshots existed only carry the frog id;
 * recover their links from today's frogs or the planning history.
 */
function linksIndex(data: Pick<Data, "frogs" | "frogHistory">) {
  const byFrog = new Map<string, FrogLinks>();
  const put = (id: string, l: FrogLinks) => (l.projectId || l.skillId) && !byFrog.has(id) && byFrog.set(id, l);
  data.frogs.forEach((f) => put(f.id, { projectId: f.projectId, skillId: f.skillId }));
  data.frogHistory.forEach((d) => d.frogs.forEach((f) => put(f.id, { projectId: f.projectId, skillId: f.skillId })));
  return (entry: Pick<TimeEntryItem, "taskId" | "projectId" | "skillId">): FrogLinks =>
    entry.projectId || entry.skillId
      ? { projectId: entry.projectId, skillId: entry.skillId }
      : (entry.taskId && byFrog.get(entry.taskId)) || {};
}

const fromDay = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export interface ValueWeekRow {
  value: CoreValueItem;
  minutes: number;
  frogsDone: number;
  projects: string[];
  /** Times a habit serving this value was done in the week. */
  habitsDone: number;
}

export interface ValueWeek {
  rows: ValueWeekRow[];
  /** Focus minutes (not escape) in the week. */
  focusMinutes: number;
  /** Minutes whose frog reached at least one value through its project. */
  linkedMinutes: number;
  unlinkedMinutes: number;
  /** Values that got neither minutes nor finished priorities. */
  neglected: CoreValueItem[];
  skillMinutes: { skill: SkillProjectItem; minutes: number }[];
}

export function computeValueWeek(week: WeekRef, data: Data): ValueWeek {
  const inWeek = (d: Date) => isInWeek(d, week);
  const linksOf = linksIndex(data);
  const resolve = (l: FrogLinks) => resolveLineage(l, data);

  const rows = new Map<string, ValueWeekRow>(
    data.values.map((v) => [v.id, { value: v, minutes: 0, frogsDone: 0, projects: [] as string[], habitsDone: 0 }])
  );
  const skillMins = new Map<string, number>();
  let focusMinutes = 0;
  let linkedMinutes = 0;

  for (const te of data.timeEntries) {
    if (te.category === "ESCAPE" || !inWeek(new Date(te.startTime))) continue;
    focusMinutes += te.durationMinutes;
    const lineage = resolve(linksOf(te));
    if (lineage.skill) skillMins.set(lineage.skill.id, (skillMins.get(lineage.skill.id) ?? 0) + te.durationMinutes);
    if (lineage.values.length === 0) continue;
    linkedMinutes += te.durationMinutes;
    // A project serving two values counts fully toward both: each value really was served by that time.
    for (const v of lineage.values) {
      const row = rows.get(v.id)!;
      row.minutes += te.durationMinutes;
      if (lineage.project && !row.projects.includes(lineage.project.name)) row.projects.push(lineage.project.name);
    }
  }

  const days: FrogDayRecord[] = [
    {
      date: data.currentDay,
      frogs: data.frogs.map((f) => ({ ...f, completedAt: f.isCompleted ? f.completedAt ?? `${data.currentDay}T12:00:00` : undefined })),
    },
    ...data.frogHistory.filter((d) => d.date !== data.currentDay),
  ].filter((d) => inWeek(fromDay(d.date)));

  for (const f of days.flatMap((d) => d.frogs)) {
    if (!f.completedAt) continue;
    for (const v of resolve({ projectId: f.projectId, skillId: f.skillId }).values) rows.get(v.id)!.frogsDone += 1;
  }

  for (const [day, ids] of Object.entries(data.habitHistory)) {
    if (!inWeek(fromDay(day))) continue;
    for (const id of ids) {
      const valueId = data.binaryHabits.find((h) => h.id === id)?.valueId;
      const row = valueId ? rows.get(valueId) : undefined;
      if (row) row.habitsDone += 1;
    }
  }

  const list = [...rows.values()].sort((a, b) => b.minutes - a.minutes || b.frogsDone - a.frogsDone || a.value.order - b.value.order);
  return {
    rows: list,
    focusMinutes,
    linkedMinutes,
    unlinkedMinutes: focusMinutes - linkedMinutes,
    neglected: list.filter((r) => r.minutes === 0 && r.frogsDone === 0 && r.habitsDone === 0).map((r) => r.value),
    skillMinutes: data.skills
      .map((skill) => ({ skill, minutes: skillMins.get(skill.id) ?? 0 }))
      .filter((x) => x.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes),
  };
}

/** Focus minutes per project over the last `days` days, for the vision map. */
export function projectMinutesSince(days: number, data: Pick<Data, "frogs" | "frogHistory" | "timeEntries" | "projects" | "skills" | "values">) {
  const since = Date.now() - days * 86400000;
  const linksOf = linksIndex(data);
  const out = new Map<string, number>();
  const skillOut = new Map<string, number>();
  for (const te of data.timeEntries) {
    if (te.category === "ESCAPE" || Date.parse(te.startTime) < since) continue;
    const lineage = resolveLineage(linksOf(te), data);
    if (lineage.project) out.set(lineage.project.id, (out.get(lineage.project.id) ?? 0) + te.durationMinutes);
    if (lineage.skill) skillOut.set(lineage.skill.id, (skillOut.get(lineage.skill.id) ?? 0) + te.durationMinutes);
  }
  return { byProject: out, bySkill: skillOut };
}

export function useValueData(): Data {
  const values = useAppStore((s) => s.values);
  const skills = useAppStore((s) => s.skills);
  const frogs = useAppStore((s) => s.frogs);
  const frogHistory = useAppStore((s) => s.frogHistory);
  const timeEntries = useAppStore((s) => s.timeEntries);
  const currentDay = useAppStore((s) => s.currentDay);
  const binaryHabits = useAppStore((s) => s.binaryHabits);
  const habitHistory = useAppStore((s) => s.habitHistory);
  const projects = useProjectsStore((s) => s.projects);
  return useMemo(
    () => ({ values, skills, frogs, frogHistory, timeEntries, currentDay, projects, binaryHabits, habitHistory }),
    [values, skills, frogs, frogHistory, timeEntries, currentDay, projects, binaryHabits, habitHistory]
  );
}

export function formatMinutes(total: number) {
  if (total < 60) return `${total} د`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}س ${m}د` : `${h} س`;
}

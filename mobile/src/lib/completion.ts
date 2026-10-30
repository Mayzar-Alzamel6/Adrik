import type { CoreValueItem, FrogDayRecord, FrogTask, SkillProjectItem, TaskCategory } from "@/stores/useAppStore";
import type { Project } from "@/stores/useProjectsStore";
import { resolveLineage } from "@/lib/lineage";
import { lastDays } from "@/lib/habits";

type DayFrog = FrogDayRecord["frogs"][number];

interface Data {
  frogs: FrogTask[];
  frogHistory: FrogDayRecord[];
  currentDay: string;
  projects: Project[];
  values: CoreValueItem[];
  skills: SkillProjectItem[];
}

export interface DayCompletion {
  date: string;
  planned: number;
  done: number;
  /** null when nothing was planned that day — no plan is not a 0%. */
  rate: number | null;
  frogs: DayFrog[];
}

/** Returns true if activating or adding a drain task is allowed (strictly max 1 active drain task per day). */
export function canActivateDrain(frogs: FrogTask[], targetId?: string): boolean {
  return frogs.filter((f) => f.id !== targetId && !f.isCompleted && !f.isDropped && f.energyTag === "drain").length === 0;
}

/** One record per day: closed days from the history, today from the live list. */
export function dayRecords(data: Pick<Data, "frogs" | "frogHistory" | "currentDay">): Map<string, DayFrog[]> {
  const map = new Map<string, DayFrog[]>();
  for (const d of data.frogHistory) if (d.date !== data.currentDay) map.set(d.date, d.frogs);
  map.set(
    data.currentDay,
    data.frogs.map(({ id, title, order, isCompleted, completedAt, projectId, skillId, category, energyTag, definitionOfDone, isRerouted, isDropped, dropReason }) => ({
      id,
      title,
      order,
      category,
      energyTag,
      definitionOfDone,
      isRerouted,
      isDropped,
      dropReason,
      projectId,
      skillId,
      completedAt: isCompleted ? completedAt ?? `${data.currentDay}T12:00:00` : undefined,
    }))
  );
  return map;
}

const pct = (done: number, planned: number) => (planned ? Math.round((done / planned) * 100) : null);

export function completionByDay(days: number, data: Data, endDay = data.currentDay): DayCompletion[] {
  const records = dayRecords(data);
  return lastDays(endDay, days).map((date) => {
    const frogs = records.get(date) ?? [];
    const done = frogs.filter((f) => Boolean(f.completedAt) && !f.isDropped).length;
    return { date, planned: frogs.length, done, rate: pct(done, frogs.length), frogs };
  });
}

export interface PeriodSummary {
  planned: number;
  done: number;
  rate: number | null;
  daysWithPlan: number;
}

export function summarize(days: DayCompletion[]): PeriodSummary {
  const planned = days.reduce((a, d) => a + d.planned, 0);
  const done = days.reduce((a, d) => a + d.done, 0);
  return { planned, done, rate: pct(done, planned), daysWithPlan: days.filter((d) => d.planned > 0).length };
}

export type GroupBy = "project" | "value" | "quadrant" | "energy";

export const QUADRANT_LABELS: Record<TaskCategory, string> = {
  QUALITY: "مهم غير عاجل",
  EMERGENCY: "مهم وعاجل",
  DELEGATE: "عاجل غير مهم",
  ESCAPE: "غير مهم",
};

export interface TypeRow {
  key: string;
  label: string;
  planned: number;
  done: number;
  rate: number;
  /** "No project", "no value", "unsorted": rows that show a gap rather than a type. */
  unlinked?: boolean;
}

/** How many rows a breakdown shows before folding the tail into "أخرى". */
const MAX_ROWS = 6;

export function completionByType(days: DayCompletion[], groupBy: GroupBy, data: Data): TypeRow[] {
  const rows = new Map<string, TypeRow>();
  const add = (key: string, label: string, done: boolean, unlinked = false) => {
    const row = rows.get(key) ?? { key, label, planned: 0, done: 0, rate: 0, unlinked };
    row.planned += 1;
    if (done) row.done += 1;
    rows.set(key, row);
  };

  for (const f of days.flatMap((d) => d.frogs)) {
    const done = Boolean(f.completedAt) && !f.isDropped;
    if (groupBy === "quadrant") {
      if (f.category) add(f.category, QUADRANT_LABELS[f.category], done);
      else add("none", "غير مصنّفة", done, true);
    } else if (groupBy === "energy") {
      const tag = f.energyTag ?? "neutral";
      if (tag === "genius") add("genius", "عبقرية فطرية (Genius)", done);
      else if (tag === "drain") add("drain", "استنزاف طاقي (Drain)", done);
      else add("neutral", "محايدة / تشغيلية (Neutral)", done);
    } else if (groupBy === "project") {
      const project = f.projectId ? data.projects.find((p) => p.id === f.projectId) : undefined;
      if (project) add(project.id, project.name, done);
      else add("none", f.projectId ? "مشروع محذوف" : "بلا مشروع", done, true);
    } else {
      const values = resolveLineage({ projectId: f.projectId, skillId: f.skillId }, data).values;
      if (values.length === 0) add("none", "بلا قيمة", done, true);
      // A priority serving two values counts for both: each value really was served by it.
      for (const v of values) add(v.id, v.title, done);
    }
  }

  const all = [...rows.values()].map((r) => ({ ...r, rate: Math.round((r.done / r.planned) * 100) }));
  const linked = all.filter((r) => !r.unlinked).sort((a, b) => b.planned - a.planned);
  // The unlinked row is the gap the reader should see, so it is never folded away.
  const unlinked = all.filter((r) => r.unlinked);
  const room = MAX_ROWS - unlinked.length;
  if (linked.length <= room) return [...linked, ...unlinked];

  const head = linked.slice(0, room - 1);
  const tail = linked.slice(room - 1);
  const planned = tail.reduce((a, r) => a + r.planned, 0);
  const done = tail.reduce((a, r) => a + r.done, 0);
  return [...head, { key: "other", label: "أخرى", planned, done, rate: Math.round((done / planned) * 100) }, ...unlinked];
}

export interface IntjAuditMetrics {
  highLeverageRate: number | null; // % of completed frogs that are QUALITY or genius
  highLeverageDone: number;
  highLeverageTotal: number;
  geniusCount: number;
  drainCount: number;
  neutralCount: number;
  drainRatio: number; // percentage of drain tasks among all planned
  isDrainWarning: boolean; // drainRatio > 30%
  qualityPassedDays: number;
  qualityAuditedDays: number;
  qualityPassRate: number | null;
}

export function computeIntjAuditMetrics(
  days: DayCompletion[],
  eveningQualityCheck: Record<string, boolean> = {}
): IntjAuditMetrics {
  const allFrogs = days.flatMap((d) => d.frogs);
  const doneFrogs = allFrogs.filter((f) => Boolean(f.completedAt) && !f.isDropped);

  // High-Leverage: category === 'QUALITY' or energyTag === 'genius'
  const highLeverageFrogs = doneFrogs.filter(
    (f) => f.category === "QUALITY" || f.energyTag === "genius"
  );
  const highLeverageDone = highLeverageFrogs.length;
  const highLeverageTotal = doneFrogs.length;
  const highLeverageRate = highLeverageTotal > 0 ? Math.round((highLeverageDone / highLeverageTotal) * 100) : null;

  // Energy Taxonomy counts among all frogs
  let geniusCount = 0;
  let drainCount = 0;
  let neutralCount = 0;

  for (const f of allFrogs) {
    if (f.energyTag === "genius") geniusCount++;
    else if (f.energyTag === "drain") drainCount++;
    else neutralCount++;
  }

  const totalEnergyTasks = geniusCount + drainCount + neutralCount;
  const drainRatio = totalEnergyTasks > 0 ? Math.round((drainCount / totalEnergyTasks) * 100) : 0;
  const isDrainWarning = drainRatio > 30;

  // Evening quality gate stats across days with a plan
  const planDays = days.filter((d) => d.planned > 0);
  let qualityPassedDays = 0;
  let qualityAuditedDays = 0;

  for (const d of planDays) {
    const check = eveningQualityCheck[d.date];
    if (check !== undefined) {
      qualityAuditedDays++;
      if (check === true) {
        qualityPassedDays++;
      }
    }
  }

  const qualityPassRate = qualityAuditedDays > 0 ? Math.round((qualityPassedDays / qualityAuditedDays) * 100) : null;

  return {
    highLeverageRate,
    highLeverageDone,
    highLeverageTotal,
    geniusCount,
    drainCount,
    neutralCount,
    drainRatio,
    isDrainWarning,
    qualityPassedDays,
    qualityAuditedDays,
    qualityPassRate,
  };
}

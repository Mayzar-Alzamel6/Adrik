import { useMemo } from "react";
import type { IconName } from "@/components/ui";
import { useAppStore } from "@/stores/useAppStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { useJourneyStore } from "@/stores/useJourneyStore";
import { activeDays, doneFrogCount } from "@/lib/activity";
import type { ToolId } from "@/lib/tools";

export type StageId = "foundation" | "values" | "projects" | "skills";

export interface StageDef {
  id: StageId;
  title: string;
  /** What this stage gives the user, in one line. */
  promise: string;
  icon: IconName;
  tools: ToolId[];
  /** Screens outside the tools page that open with this stage. */
  features: { id: "vision"; label: string; href: string }[];
}

export const STAGES: StageDef[] = [
  {
    id: "foundation",
    title: "الأساس",
    promise: "ثلاث أولويات كل يوم، وجلسة تركيز تحميها. هذا وحده يغيّر الأسبوع.",
    icon: "flag",
    tools: ["eisenhower", "calendar", "cbt", "vault", "habits"],
    features: [],
  },
  {
    id: "values",
    title: "القيم",
    promise: "اكتب دستورك: لماذا تفعل ما تفعل، وما خطوطك الحمراء.",
    icon: "heart",
    tools: ["identity", "compound"],
    features: [],
  },
  {
    id: "projects",
    title: "المشاريع",
    promise: "حوّل كل قيمة إلى مشروع له موعد، واربط أولويات يومك به.",
    icon: "folder",
    tools: ["projects", "tawahhum"],
    features: [{ id: "vision", label: "خريطة الرؤية", href: "/vision" }],
  },
  {
    id: "skills",
    title: "المهارات",
    promise: "فكّك المهارة التي يحتاجها مشروعك، والتزم بأول 20 ساعة فيها.",
    icon: "layers",
    tools: ["meta"],
    features: [],
  },
];

export interface Criterion {
  label: string;
  current: number;
  target: number;
  met: boolean;
}

export interface StageStatus extends StageDef {
  unlocked: boolean;
  criteria: Criterion[];
  /** 0..100 over all criteria, each capped at its target. */
  progress: number;
  ready: boolean;
}

const criterion = (label: string, current: number, target: number): Criterion => ({
  label,
  current: Math.min(current, target),
  target,
  met: current >= target,
});

export function useJourney() {
  const mode = useJourneyStore((s) => s.mode);
  const unlocked = useJourneyStore((s) => s.unlocked);
  const focusSessions = useAppStore((s) => s.focusSessions);
  const frogHistory = useAppStore((s) => s.frogHistory);
  const frogs = useAppStore((s) => s.frogs);
  const identityVotes = useAppStore((s) => s.identityVotes);
  const cbtLogs = useAppStore((s) => s.cbtLogs);
  const timeEntries = useAppStore((s) => s.timeEntries);
  const values = useAppStore((s) => s.values);
  const projects = useProjectsStore((s) => s.projects);

  return useMemo(() => {
    const app = { focusSessions, frogHistory, frogs, identityVotes, cbtLogs, timeEntries };
    const sessions = focusSessions.filter((s) => s.completed).length;
    const days = activeDays(app).size;
    const doneFrogs = doneFrogCount(app);
    const linkedDone =
      frogHistory.reduce((n, r) => n + r.frogs.filter((f) => f.completedAt && f.projectId).length, 0) +
      frogs.filter((f) => f.isCompleted && f.projectId).length;
    const projectsWithValue = projects.filter((p) => p.valueIds?.length).length;

    const criteriaFor: Record<StageId, Criterion[]> = {
      foundation: [],
      values: [criterion("جلسة تركيز كاملة", sessions, 1), criterion("أولويات أنجزتها", doneFrogs, 3)],
      projects: [
        criterion("قيمة في دستورك", values.length, 1),
        criterion("جلسات تركيز كاملة", sessions, 3),
        criterion("أيام حضرت فيها", days, 3),
      ],
      skills: [
        criterion("مشروع مربوط بقيمة", projectsWithValue, 1),
        criterion("أولوية مربوطة بمشروع أنجزتها", linkedDone, 1),
        criterion("أيام حضرت فيها", days, 5),
      ],
    };

    const open = mode !== "guided";
    const stages: StageStatus[] = STAGES.map((def) => {
      const criteria = criteriaFor[def.id];
      const progress = criteria.length
        ? Math.round((criteria.reduce((a, c) => a + c.current / c.target, 0) / criteria.length) * 100)
        : 100;
      return {
        ...def,
        unlocked: open || unlocked.includes(def.id),
        criteria,
        progress,
        ready: criteria.every((c) => c.met),
      };
    });

    const next = stages.find((s) => !s.unlocked);
    const isToolOpen = (id: ToolId) => stages.some((s) => s.unlocked && s.tools.includes(id));
    const stageOfTool = (id: ToolId) => stages.find((s) => s.tools.includes(id));
    const isFeatureOpen = (id: StageDef["features"][number]["id"]) =>
      stages.some((s) => s.unlocked && s.features.some((f) => f.id === id));
    const stageOfFeature = (id: StageDef["features"][number]["id"]) =>
      stages.find((s) => s.features.some((f) => f.id === id));

    return { mode, guided: mode === "guided", stages, next, isToolOpen, stageOfTool, isFeatureOpen, stageOfFeature };
  }, [mode, unlocked, focusSessions, frogHistory, frogs, identityVotes, cbtLogs, timeEntries, values, projects]);
}

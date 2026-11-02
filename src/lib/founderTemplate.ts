import { FOUNDER_EXAMPLE, type FounderExample } from "@/data/founder-example";
import {
  useAppStore,
  type CoreValueItem,
  type FocusAreaId,
  type HabitChoice,
  type SkillProjectItem,
} from "@/stores/useAppStore";
import { useProjectsStore, type Project } from "@/stores/useProjectsStore";
import { useJourneyStore } from "@/stores/useJourneyStore";
import { toLocalDateString } from "@/lib/utils";

/**
 * Turns the founder example into fresh user records with new ids, so the copy is fully independent.
 * Progress starts at zero. Only one skill is an active commitment: the meta-learning tool allows a single
 * unfinished locked track, and locking all of them would stop the user from adding their own.
 * The founder's priorities are not copied: onboarding shows them as examples and the user writes their own.
 */
export function buildFounderCopy(example: FounderExample = FOUNDER_EXAMPLE) {
  const stamp = Date.now();
  const rid = (prefix: string, i: number) => `${prefix}-${stamp}-${i}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  const valueIds = new Map(example.values.map((v, i) => [v.key, rid("val", i)]));
  const skillIds = new Map(example.skills.map((s, i) => [s.key, rid("skill", i)]));
  const projectIds = new Map(example.projects.map((p, i) => [p.key, rid("prj", i)]));
  const activeSkillKey = example.frogs.find((f) => f.skillKey)?.skillKey ?? example.skills[0]?.key;

  const values: CoreValueItem[] = example.values.map((v, i) => ({
    id: valueIds.get(v.key)!,
    title: v.title,
    englishTitle: v.englishTitle,
    definition: v.definition,
    dailyAction: v.dailyAction,
    redLine: v.redLine,
    order: i + 1,
  }));

  const skills: SkillProjectItem[] = example.skills.map((s) => {
    const id = skillIds.get(s.key)!;
    return {
      id,
      title: s.title,
      targetHours: 20,
      loggedHours: 0,
      isLocked: s.key === activeSkillKey,
      elements: s.elements.map((e, i) => ({ id: rid("el", i), projectId: id, category: e.category, content: e.content, isMastered: false })),
      createdAt: now,
    };
  });

  const projects: Project[] = example.projects.map((p) => {
    const target = p.targetInDays !== undefined ? new Date(Date.now() + p.targetInDays * 86400000) : undefined;
    return {
      id: projectIds.get(p.key)!,
      name: p.name,
      description: p.description,
      targetDate: target ? toLocalDateString(target) : undefined,
      createdAt: now,
      tasks: p.tasks.map((t, i) => ({ id: rid("ptk", i), title: t.title, status: "TODO" as const, createdAt: now })),
      valueIds: p.valueKeys.map((k) => valueIds.get(k)).filter((x): x is string => Boolean(x)),
      skillIds: example.skills.filter((s) => s.projectKeys.includes(p.key)).map((s) => skillIds.get(s.key)!),
    };
  });

  return { values, skills, projects };
}

/**
 * The template opens gradually like everything else: its values now, its projects when the projects stage opens,
 * its skills with the skills stage. Copying everything up front only showed the user locked screens of their own data.
 */
export function startFromFounderTemplate(input: {
  name: string;
  focusArea: FocusAreaId | null;
  faithContent: boolean;
  priorities: string[];
  habits: HabitChoice;
}) {
  const copy = buildFounderCopy();
  useProjectsStore.getState().replaceProjects([]);
  useAppStore.getState().completeOnboardingWithTemplate({ ...input, values: copy.values });
  useJourneyStore.getState().setPendingTemplate({
    projects: copy.projects.map((p) => ({ ...p, skillIds: [] })),
    skills: copy.skills,
    links: Object.fromEntries(copy.projects.map((p) => [p.id, p.skillIds ?? []])),
  });
}

/** Hands over whatever part of the template the open stages allow. Safe to call on every render: it only acts once per part. */
export function deliverFounderTemplate(open: { projects: boolean; skills: boolean }) {
  const journey = useJourneyStore.getState();
  const pending = journey.pendingTemplate;
  if (!pending) return;
  const giveSkills = open.skills && pending.skills.length > 0;
  const giveProjects = open.projects && pending.projects.length > 0;
  if (!giveSkills && !giveProjects) return;

  if (giveSkills) {
    // One unfinished committed skill at a time: if the user already committed to their own, the founder's wait unlocked.
    const committed = useAppStore.getState().skills.some((s) => s.isLocked && s.loggedHours < s.targetHours);
    const skills = pending.skills.map((s) => (committed ? { ...s, isLocked: false } : s));
    useAppStore.setState((s) => ({ skills: [...s.skills, ...skills] }));
    journey.markTemplateDelivered("skills", skills.length);
  }
  if (giveProjects) {
    useProjectsStore.getState().replaceProjects([...useProjectsStore.getState().projects, ...pending.projects]);
    journey.markTemplateDelivered("projects", pending.projects.length);
  }

  // Link each template project to its skills once both are in the app (projects the user deleted are skipped).
  const skillIds = new Set(useAppStore.getState().skills.map((s) => s.id));
  const { projects, linkSkill } = useProjectsStore.getState();
  for (const [projectId, ids] of Object.entries(pending.links)) {
    if (!projects.some((p) => p.id === projectId)) continue;
    for (const id of ids) if (skillIds.has(id)) linkSkill(projectId, id);
  }

  const rest = {
    ...pending,
    projects: giveProjects ? [] : pending.projects,
    skills: giveSkills ? [] : pending.skills,
  };
  journey.setPendingTemplate(rest.projects.length || rest.skills.length ? rest : null);
}

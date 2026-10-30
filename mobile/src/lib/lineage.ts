import { useAppStore, type CoreValueItem, type FrogLinks, type SkillProjectItem } from "@/stores/useAppStore";
import { useProjectsStore, type Project } from "@/stores/useProjectsStore";

export interface Lineage {
  values: CoreValueItem[];
  project?: Project;
  skill?: SkillProjectItem;
}

/**
 * Resolves the chain value ← project ← skill for a frog. Links are all optional and may point at
 * deleted items, so every step tolerates gaps. A skill-only frog borrows its project when exactly
 * one project needs that skill.
 */
export function resolveLineage(
  links: FrogLinks,
  data: { values: CoreValueItem[]; projects: Project[]; skills: SkillProjectItem[] }
): Lineage {
  const skill = links.skillId ? data.skills.find((s) => s.id === links.skillId) : undefined;
  let project = links.projectId ? data.projects.find((p) => p.id === links.projectId) : undefined;
  if (!project && skill) {
    const owners = data.projects.filter((p) => p.skillIds?.includes(skill.id));
    if (owners.length === 1) project = owners[0];
  }
  const values = (project?.valueIds ?? [])
    .map((id) => data.values.find((v) => v.id === id))
    .filter((v): v is CoreValueItem => Boolean(v));
  return { values, project, skill };
}

export function lineageParts(l: Lineage): string[] {
  return [l.values.map((v) => v.title).join("، "), l.project?.name, l.skill?.title].filter(
    (x): x is string => Boolean(x)
  );
}

export function useLineageResolver() {
  const values = useAppStore((s) => s.values);
  const skills = useAppStore((s) => s.skills);
  const projects = useProjectsStore((s) => s.projects);
  return (links: FrogLinks) => resolveLineage(links, { values, projects, skills });
}

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { EisenhowerCategory } from "@/stores/usePlannerStore";

export type ProjectTaskStatus = "TODO" | "DOING" | "DONE";
export type TaskHorizon = "DAILY" | "WEEKLY" | "MONTHLY";

export interface ProjectTask {
  id: string;
  title: string;
  status: ProjectTaskStatus;
  createdAt: string;
  doneAt?: string;
  /** Where the task sits in the priority matrix; unset means it waits in the matrix inbox. */
  quadrant?: EisenhowerCategory;
}

export interface TimelineTask {
  id: string;
  title: string;
  horizon: TaskHorizon;
  scheduledDate: string; // "YYYY-MM-DD"
  weekNumber?: number;
  monthYear?: string;    // "YYYY-MM"
  projectId?: string;    // Optional link to project
  status: ProjectTaskStatus;
  definitionOfDone?: string;
  energyTag?: "genius" | "drain" | "neutral";
  createdAt: string;
  doneAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  targetDate?: string; // "YYYY-MM-DD"
  createdAt: string;
  tasks: ProjectTask[];
  /** Skills from the meta-learning tool this project needs. */
  skillIds?: string[];
  /** Core values (identity constitution) this project serves. */
  valueIds?: string[];
}

interface ProjectsState {
  projects: Project[];
  timelineTasks: TimelineTask[];
  addProject: (input: { name: string; description: string; targetDate?: string; valueIds?: string[] }) => string;
  updateProject: (id: string, updates: Partial<Pick<Project, "name" | "description" | "targetDate" | "valueIds">>) => void;
  replaceProjects: (projects: Project[]) => void;
  deleteProject: (id: string) => void;
  /** Returns the new task id, or null when the title is empty. */
  addTask: (projectId: string, title: string, quadrant?: EisenhowerCategory) => string | null;
  setTaskQuadrant: (projectId: string, taskId: string, quadrant: EisenhowerCategory | undefined) => void;
  setTaskStatus: (projectId: string, taskId: string, status: ProjectTaskStatus) => void;
  deleteTask: (projectId: string, taskId: string) => void;
  linkSkill: (projectId: string, skillId: string) => void;
  unlinkSkill: (projectId: string, skillId: string) => void;

  // Timeline Tasks Actions
  addTimelineTask: (input: {
    title: string;
    horizon: TaskHorizon;
    scheduledDate: string;
    weekNumber?: number;
    monthYear?: string;
    projectId?: string;
    definitionOfDone?: string;
    energyTag?: "genius" | "drain" | "neutral";
  }) => string;
  updateTimelineTask: (id: string, updates: Partial<Omit<TimelineTask, "id" | "createdAt">>) => void;
  setTimelineTaskStatus: (id: string, status: ProjectTaskStatus) => void;
  deleteTimelineTask: (id: string) => void;
}

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export function projectProgress(p: Project) {
  const tasks = p.tasks || [];
  const done = tasks.filter((t) => t.status === "DONE").length;
  return { done, total: tasks.length, percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
}

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set, get) => {
      const mapProject = (id: string, fn: (p: Project) => Project) =>
        set({ projects: get().projects.map((p) => (p.id === id ? fn(p) : p)) });

      return {
        projects: [],
        timelineTasks: [],
        addProject: ({ name, description, targetDate, valueIds }) => {
          const project: Project = {
            id: uid("prj"),
            name: name.trim(),
            description: description.trim(),
            targetDate: targetDate || undefined,
            createdAt: new Date().toISOString(),
            tasks: [],
            ...(valueIds?.length ? { valueIds } : {}),
          };
          set({ projects: [project, ...get().projects] });
          return project.id;
        },
        updateProject: (id, updates) => mapProject(id, (p) => ({ ...p, ...updates })),
        deleteProject: (id) => set({ projects: get().projects.filter((p) => p.id !== id) }),
        replaceProjects: (projects) => set({ projects }),
        addTask: (projectId, title, quadrant) => {
          if (!title.trim()) return null;
          const task: ProjectTask = {
            id: uid("ptk"),
            title: title.trim(),
            status: "TODO",
            createdAt: new Date().toISOString(),
            ...(quadrant ? { quadrant } : {}),
          };
          mapProject(projectId, (p) => ({ ...p, tasks: [...p.tasks, task] }));
          return task.id;
        },
        setTaskStatus: (projectId, taskId, status) =>
          mapProject(projectId, (p) => ({
            ...p,
            tasks: p.tasks.map((t) =>
              t.id === taskId ? { ...t, status, doneAt: status === "DONE" ? new Date().toISOString() : undefined } : t
            ),
          })),
        setTaskQuadrant: (projectId, taskId, quadrant) =>
          mapProject(projectId, (p) => ({
            ...p,
            tasks: p.tasks.map((t) => {
              if (t.id !== taskId) return t;
              const { quadrant: _old, ...rest } = t;
              return quadrant ? { ...rest, quadrant } : rest;
            }),
          })),
        deleteTask: (projectId, taskId) =>
          mapProject(projectId, (p) => ({ ...p, tasks: p.tasks.filter((t) => t.id !== taskId) })),
        linkSkill: (projectId, skillId) =>
          mapProject(projectId, (p) =>
            p.skillIds?.includes(skillId) ? p : { ...p, skillIds: [...(p.skillIds ?? []), skillId] }
          ),
        unlinkSkill: (projectId, skillId) =>
          mapProject(projectId, (p) => ({ ...p, skillIds: (p.skillIds ?? []).filter((id) => id !== skillId) })),

        addTimelineTask: ({
          title,
          horizon,
          scheduledDate,
          weekNumber,
          monthYear,
          projectId,
          definitionOfDone,
          energyTag,
        }) => {
          const task: TimelineTask = {
            id: uid("tsk"),
            title: title.trim(),
            horizon,
            scheduledDate,
            status: "TODO",
            createdAt: new Date().toISOString(),
            ...(weekNumber !== undefined ? { weekNumber } : {}),
            ...(monthYear ? { monthYear } : {}),
            ...(projectId ? { projectId } : {}),
            ...(definitionOfDone?.trim() ? { definitionOfDone: definitionOfDone.trim() } : {}),
            ...(energyTag ? { energyTag } : {}),
          };
          set({ timelineTasks: [task, ...(get().timelineTasks || [])] });
          return task.id;
        },
        updateTimelineTask: (id, updates) => {
          set({
            timelineTasks: (get().timelineTasks || []).map((t) =>
              t.id === id ? { ...t, ...updates } : t
            ),
          });
        },
        setTimelineTaskStatus: (id, status) => {
          set({
            timelineTasks: (get().timelineTasks || []).map((t) =>
              t.id === id
                ? {
                    ...t,
                    status,
                    doneAt: status === "DONE" ? new Date().toISOString() : undefined,
                  }
                : t
            ),
          });
        },
        deleteTimelineTask: (id) => {
          set({
            timelineTasks: (get().timelineTasks || []).filter((t) => t.id !== id),
          });
        },
      };
    },
    {
      name: "adrik-app-projects-v1",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

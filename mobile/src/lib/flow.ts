/**
 * The one way any tool hands work to the task system. Keeping it in one place means every tool
 * lands work in the same inbox, the same projects and the same three daily priorities.
 */
import { useAppStore, type FrogLinks } from "@/stores/useAppStore";
import { usePlannerStore } from "@/stores/usePlannerStore";
import { useProjectsStore } from "@/stores/useProjectsStore";

export type FlowResult = { ok: true; message: string } | { ok: false; message: string };

/** Unsorted capture: a project's task list when a project is given, otherwise the matrix inbox. */
export function sendToInbox(title: string, projectId?: string): FlowResult {
  const text = title.trim();
  if (!text) return { ok: false, message: "لا يوجد نص لإرساله." };
  if (projectId) {
    const project = useProjectsStore.getState().projects.find((p) => p.id === projectId);
    if (!project) return { ok: false, message: "لم أجد المشروع." };
    useProjectsStore.getState().addTask(projectId, text);
    return { ok: true, message: `أُضيفت إلى مشروع «${project.name}».` };
  }
  usePlannerStore.getState().addTask(text, "INBOX");
  return { ok: true, message: "أُضيفت إلى صندوق المهام." };
}

/**
 * Makes it one of today's priorities. With a project it becomes a project task first,
 * so finishing the priority also moves the project forward.
 */
export function sendToToday(title: string, links: FrogLinks = {}): FlowResult {
  const text = title.trim();
  if (!text) return { ok: false, message: "لا يوجد نص لإرساله." };
  const app = useAppStore.getState();
  // Checked before touching the project, so a refused priority doesn't leave a stray project task behind.
  if (app.frogs.filter((f) => !f.isCompleted).length >= 3) {
    return { ok: false, message: "لديك ثلاث أولويات مفتوحة. أنجز واحدة أولاً، أو أرسل هذه إلى صندوق المهام." };
  }

  if (links.projectId) {
    const taskId = useProjectsStore.getState().addTask(links.projectId, text);
    if (!taskId) return { ok: false, message: "تعذّرت الإضافة." };
    const res = app.addFrogFromProjectTask(links.projectId, taskId);
    if (!res.ok) return res;
    // A skill chosen by the caller beats the one inferred from the project.
    if (links.skillId) {
      const frog = useAppStore.getState().frogs.find((f) => f.projectTaskId === taskId);
      if (frog) app.updateFrog(frog.id, { skillId: links.skillId });
    }
    return { ok: true, message: "أُضيفت إلى أولويات اليوم وإلى مشروعها." };
  }

  const res = app.appendFrog(text, "QUALITY", links);
  return res.ok ? { ok: true, message: "أُضيفت إلى أولويات اليوم." } : res;
}

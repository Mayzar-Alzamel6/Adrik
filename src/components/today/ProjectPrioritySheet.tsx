"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FolderKanban, Plus, Target } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { EmptyState, Input, Label } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";

/**
 * Today's priorities come out of projects: pick an open project task, or write a new one,
 * which is added to the project too so both lists stay one.
 */
export interface PickedTask {
  title: string;
  projectId: string;
  taskId: string;
  skillId?: string;
}

/** Without `onPick` the task becomes one of today's priorities; with it, the caller decides (e.g. tomorrow's plan). */
export function ProjectPrioritySheet({
  open,
  onClose,
  onPick,
  title = "أولوية من مشاريعك",
}: {
  open: boolean;
  onClose: () => void;
  onPick?: (task: PickedTask) => void;
  title?: string;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      description="كل أولوية تخدم مشروعاً، وإنجازها يُحتسب في تقدّمه تلقائياً."
      size="md"
    >
      {open && <Picker onDone={onClose} onPick={onPick} />}
    </Sheet>
  );
}

function Picker({ onDone, onPick }: { onDone: () => void; onPick?: (task: PickedTask) => void }) {
  const projects = useProjectsStore((s) => s.projects);
  const values = useAppStore((s) => s.values);
  const frogs = useAppStore((s) => s.frogs);
  const [projectId, setProjectId] = useState(projects[0]?.id);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="لا مشاريع بعد"
        description="أنشئ مشروعاً وقسّمه إلى مهام، ثم اختر منها أولويات يومك."
        action={
          <Link href="/app/tools/projects" onClick={onDone} className="text-ui font-medium text-brand hover:underline underline-offset-4">
            أنشئ أول مشروع
          </Link>
        }
      />
    );
  }

  const project = projects.find((p) => p.id === projectId) ?? projects[0];
  const inToday = new Set(onPick ? [] : frogs.filter((f) => !f.isCompleted && f.projectTaskId).map((f) => f.projectTaskId));
  const openTasks = project.tasks.filter((t) => t.status !== "DONE");
  const valueNames = (project.valueIds ?? []).map((id) => values.find((v) => v.id === id)?.title).filter(Boolean);

  const pick = (taskId: string) => {
    if (onPick) {
      const task = useProjectsStore.getState().projects.find((p) => p.id === project.id)?.tasks.find((t) => t.id === taskId);
      if (!task) return;
      onPick({
        title: task.title,
        projectId: project.id,
        taskId,
        skillId: project.skillIds?.length === 1 ? project.skillIds[0] : undefined,
      });
      onDone();
      return;
    }
    const res = useAppStore.getState().addFrogFromProjectTask(project.id, taskId);
    if (res.ok) onDone();
    else setError(res.message);
  };

  const addNew = (e: React.FormEvent) => {
    e.preventDefault();
    const taskId = useProjectsStore.getState().addTask(project.id, title);
    if (taskId) pick(taskId);
  };

  return (
    <div className="space-y-5 pt-2">
      <div>
        <Label>المشروع</Label>
        <div className="flex flex-wrap gap-2">
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setProjectId(p.id);
                setError(null);
              }}
              aria-pressed={p.id === project.id}
              className={cn(
                "h-9 px-3 rounded-xl border text-small transition max-w-full truncate",
                p.id === project.id ? "bg-brand-soft border-brand/40 text-brand font-medium" : "border-line text-ink-2 hover:border-ink-3"
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
        {valueNames.length > 0 && <p className="text-caption text-accent-strong mt-2">يخدم: {valueNames.join("، ")}</p>}
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-accent-soft text-accent-strong px-4 py-2.5 text-ui">
          {error}
        </p>
      )}

      <div>
        <Label>مهامه المفتوحة</Label>
        {openTasks.length === 0 ? (
          <p className="text-small text-ink-3">لا مهام مفتوحة في هذا المشروع. أضف واحدة بالأسفل.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line max-h-64 overflow-y-auto">
            {openTasks.map((t) => {
              const already = inToday.has(t.id);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    disabled={already}
                    onClick={() => pick(t.id)}
                    className="w-full flex items-center gap-3 py-3 px-1 text-right hover:bg-surface-2 transition disabled:opacity-60 disabled:hover:bg-transparent"
                  >
                    <span
                      className={cn("w-2 h-2 rounded-full shrink-0", t.status === "DOING" ? "bg-accent" : "bg-line-strong")}
                      aria-hidden
                    />
                    <span className="flex-1 text-body text-ink break-words">{t.title}</span>
                    {already ? (
                      <span className="text-caption text-brand shrink-0">في اليوم</span>
                    ) : (
                      <Target className="w-4 h-4 text-ink-3 shrink-0" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form onSubmit={addNew}>
        <Label htmlFor="pp-new" hint={onPick ? "تُضاف إلى المشروع وإلى هذه الخطة معاً." : "تُضاف إلى المشروع وإلى أولويات اليوم معاً."}>
          أو مهمة جديدة لهذا المشروع
        </Label>
        <div className="flex gap-2">
          <Input id="pp-new" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: مسودة الفصل الثاني" maxLength={140} />
          <Button type="submit" disabled={!title.trim()} className="shrink-0">
            <Plus className="w-4 h-4" />
            أضف
          </Button>
        </div>
      </form>
    </div>
  );
}

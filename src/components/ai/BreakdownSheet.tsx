"use client";

import React, { useEffect, useState } from "react";
import { Heart, Loader2, Sparkles, Target } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { useProjectsStore, type Project } from "@/stores/useProjectsStore";
import { isCrisis, type AiConsent } from "@/lib/safety/analysis";
import { fetchCoachAvailable, readCoachConsent } from "@/lib/ai/coachConsent";
import { COACH_TEXT } from "@/lib/ai/texts";
import type { BreakdownReply } from "@/lib/ai/coach";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/primitives";
import { SendTo } from "@/components/flow/SendTo";
import { CrisisSupport } from "@/components/cbt/CrisisSupport";
import { CoachConsentPanel } from "@/components/ai/CoachConsent";

export type BreakdownTarget = { kind: "new" } | { kind: "project"; project: Project };

interface Draft {
  projectName: string;
  description: string;
  valueIds: string[];
  tasks: { title: string; checked: boolean }[];
  firstStep: string;
}

type Phase =
  | { name: "input" }
  | { name: "consent" }
  | { name: "loading" }
  | { name: "message"; text: string }
  | { name: "crisis" }
  | { name: "result"; draft: Draft }
  | { name: "done"; projectId: string; firstStep: string; text: string };

/**
 * The coach's first job: a vague goal becomes a project with small tasks and one first step for today.
 * The AI only suggests; nothing lands in the projects until the person picks and confirms.
 */
export function BreakdownSheet({
  target,
  onClose,
  onCreated,
}: {
  target: BreakdownTarget | null;
  onClose: () => void;
  onCreated?: (projectId: string) => void;
}) {
  const values = useAppStore((s) => s.values);
  const [phase, setPhase] = useState<Phase>({ name: "input" });
  const [goal, setGoal] = useState("");
  const [details, setDetails] = useState("");

  // Every opening starts fresh.
  useEffect(() => {
    if (!target) return;
    setPhase({ name: "input" });
    setGoal("");
    setDetails("");
  }, [target]);

  const project = target?.kind === "project" ? target.project : null;
  const goalText = project ? project.name : goal;
  const detailText = project ? [project.description, details].filter(Boolean).join("\n") : details;

  const run = async (consent: AiConsent | null) => {
    if (isCrisis({ automaticThought: goalText, event: detailText })) return setPhase({ name: "crisis" });
    const available = await fetchCoachAvailable();
    if (!available) return setPhase({ name: "message", text: COACH_TEXT.unavailable.noKey });
    if (consent === null) return setPhase({ name: "consent" });
    if (consent !== "ai") return setPhase({ name: "message", text: COACH_TEXT.unavailable.noConsent });

    setPhase({ name: "loading" });
    try {
      const res = await fetch("/api/ai/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: project ? "project" : "new",
          goal: goalText,
          details: detailText,
          values: values.map((v) => ({ id: v.id, title: v.title })),
          existingTasks: project?.tasks.filter((t) => t.status !== "DONE").map((t) => t.title) ?? [],
          doneTasks: project?.tasks.filter((t) => t.status === "DONE").map((t) => t.title) ?? [],
          useAI: true,
        }),
      });
      const reply = (await res.json()) as BreakdownReply;
      if (reply.status === "crisis") return setPhase({ name: "crisis" });
      if (reply.status === "unavailable") return setPhase({ name: "message", text: COACH_TEXT.unavailable.noKey });
      if (reply.status !== "ok") return setPhase({ name: "message", text: COACH_TEXT.unavailable.failed });
      const b = reply.breakdown;
      setPhase({
        name: "result",
        draft: {
          projectName: b.projectName || goalText.slice(0, 80),
          description: b.description,
          valueIds: b.valueIds,
          tasks: b.tasks.map((title) => ({ title, checked: true })),
          firstStep: b.firstStep,
        },
      });
    } catch {
      setPhase({ name: "message", text: COACH_TEXT.unavailable.failed });
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (goalText.trim()) run(readCoachConsent());
  };

  const apply = (draft: Draft) => {
    const store = useProjectsStore.getState();
    const picked = draft.tasks.filter((t) => t.checked && t.title.trim());
    let projectId = project?.id;
    if (!projectId) {
      projectId = store.addProject({ name: draft.projectName || goalText, description: draft.description, valueIds: draft.valueIds });
      onCreated?.(projectId);
    }
    picked.forEach((t) => store.addTask(projectId!, t.title));
    const count = picked.length === 1 ? "مهمة واحدة" : picked.length === 2 ? "مهمتان" : `${picked.length} مهام`;
    setPhase({
      name: "done",
      projectId,
      firstStep: draft.firstStep,
      text: project ? `أُضيفت ${count} إلى المشروع.` : `أُنشئ المشروع ومعه ${count}.`,
    });
  };

  const title = project ? "اقترح الخطوات التالية" : "ابدأ من هدف";
  const description = project ? `«${project.name}»: مهام صغيرة لم تكتبها بعد، وخطوة أولى لليوم.` : "اكتب ما تريده كما هو، ولو كان ضبابياً. المدرّب يحوّله إلى مشروع ومهام صغيرة.";

  return (
    <Sheet open={Boolean(target)} onClose={onClose} size="md" title={title} description={description}>
      {phase.name === "input" && (
        <form onSubmit={submit} className="space-y-4 pt-2">
          {!project && (
            <div>
              <Label htmlFor="coach-goal">ماذا تريد؟</Label>
              <Textarea
                id="coach-goal"
                autoFocus
                rows={2}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="مثال: أبغى أتعلم البرمجة وأشتغل فيها"
                maxLength={500}
              />
            </div>
          )}
          <div>
            <Label htmlFor="coach-details" hint="اختياري">
              {project ? "ما الذي تريد الوصول إليه الآن؟" : "ما الذي تعرفه عنه حتى الآن؟"}
            </Label>
            <Textarea
              id="coach-details"
              autoFocus={Boolean(project)}
              rows={2}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={project ? "مثال: أريد نسخة أولى قبل نهاية الشهر" : "مثال: عندي ساعة مساءً، وبدأت مرة ولم أكمل"}
              maxLength={1000}
            />
          </div>
          <Button type="submit" className="w-full" disabled={!goalText.trim()}>
            <Sparkles className="w-4 h-4" />
            فكّك
          </Button>
        </form>
      )}

      {phase.name === "consent" && <CoachConsentPanel onChoose={(c) => run(c)} />}

      {phase.name === "loading" && (
        <div className="py-10 flex flex-col items-center gap-3 text-ink-2" role="status">
          <Loader2 className="w-6 h-6 animate-spin text-brand" />
          <p className="text-ui">المدرّب يفكك الهدف…</p>
        </div>
      )}

      {phase.name === "message" && (
        <div className="space-y-4 pt-2">
          <p className="rounded-xl2 bg-surface-2 p-4 text-body text-ink leading-relaxed">{phase.text}</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPhase({ name: "input" })}>
              رجوع
            </Button>
            <Button variant="ghost" onClick={onClose}>
              إغلاق
            </Button>
          </div>
        </div>
      )}

      {phase.name === "crisis" && <CrisisSupport onDone={onClose} />}

      {phase.name === "result" && (
        <ResultForm
          draft={phase.draft}
          isNew={!project}
          values={values}
          onChange={(draft) => setPhase({ name: "result", draft })}
          onApply={apply}
          onRetry={() => run(readCoachConsent())}
        />
      )}

      {phase.name === "done" && (
        <div className="space-y-4 pt-2">
          <p role="status" className="text-body text-brand font-medium">
            {phase.text}
          </p>
          <div className="rounded-xl2 border border-accent/40 bg-accent-soft/40 p-4 space-y-3">
            <p className="text-caption font-medium text-accent-strong inline-flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              الخطوة الأولى (25 دقيقة أو أقل)
            </p>
            <p className="text-body text-ink font-medium">{phase.firstStep}</p>
            <SendTo title={phase.firstStep} links={{ projectId: phase.projectId }} label="ابدأ بها:" />
          </div>
          <Button variant="secondary" className="w-full" onClick={onClose}>
            تم
          </Button>
        </div>
      )}
    </Sheet>
  );
}

function ResultForm({
  draft,
  isNew,
  values,
  onChange,
  onApply,
  onRetry,
}: {
  draft: Draft;
  isNew: boolean;
  values: { id: string; title: string }[];
  onChange: (d: Draft) => void;
  onApply: (d: Draft) => void;
  onRetry: () => void;
}) {
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });
  const setTask = (i: number, patch: Partial<Draft["tasks"][number]>) =>
    set({ tasks: draft.tasks.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const toggleValue = (id: string) =>
    set({ valueIds: draft.valueIds.includes(id) ? draft.valueIds.filter((v) => v !== id) : [...draft.valueIds, id] });
  const picked = draft.tasks.filter((t) => t.checked && t.title.trim()).length;

  return (
    <div className="space-y-5 pt-2">
      {isNew && (
        <>
          <div>
            <Label htmlFor="coach-name">اسم المشروع</Label>
            <Input id="coach-name" value={draft.projectName} onChange={(e) => set({ projectName: e.target.value })} maxLength={80} />
          </div>
          <div>
            <Label htmlFor="coach-desc">الوصف</Label>
            <Textarea id="coach-desc" rows={2} value={draft.description} onChange={(e) => set({ description: e.target.value })} maxLength={300} />
          </div>
          {values.length > 0 && (
            <div>
              <Label>يخدم قيمك</Label>
              <div className="flex flex-wrap gap-1.5">
                {values.map((v) => {
                  const on = draft.valueIds.includes(v.id);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleValue(v.id)}
                      className={cn(
                        "h-8 px-2.5 rounded-lg border text-small inline-flex items-center gap-1.5 transition",
                        on ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink-2 hover:border-brand/50"
                      )}
                    >
                      <Heart className="w-3.5 h-3.5" />
                      {v.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <div>
        <Label hint="اختر ما يناسبك وعدّل الصياغة">المهام المقترحة</Label>
        <ul className="space-y-2">
          {draft.tasks.map((t, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={t.checked}
                onChange={(e) => setTask(i, { checked: e.target.checked })}
                aria-label={`اختيار المهمة ${i + 1}`}
                className="w-4 h-4 shrink-0 accent-brand"
              />
              <Input
                value={t.title}
                onChange={(e) => setTask(i, { title: e.target.value })}
                maxLength={140}
                aria-label={`المهمة ${i + 1}`}
                className={cn(!t.checked && "opacity-50")}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl2 border border-accent/40 bg-accent-soft/40 p-4">
        <Label htmlFor="coach-first">الخطوة الأولى لليوم</Label>
        <Input id="coach-first" value={draft.firstStep} onChange={(e) => set({ firstStep: e.target.value })} maxLength={140} />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button className="flex-1" disabled={picked === 0 || (isNew && !draft.projectName.trim())} onClick={() => onApply(draft)}>
          {isNew ? "أنشئ المشروع" : `أضف ${picked} إلى المشروع`}
        </Button>
        <Button variant="secondary" onClick={onRetry}>
          <Sparkles className="w-4 h-4" />
          اقتراح آخر
        </Button>
      </div>
      <p className="text-caption text-ink-3">{COACH_TEXT.engine.ai}</p>
    </div>
  );
}

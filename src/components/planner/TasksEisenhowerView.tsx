"use client";

import React, { useMemo, useState } from "react";
import { ArrowLeftRight, Check, FolderKanban, Inbox, Plus, Target, Trash2 } from "lucide-react";
import { usePlannerStore, type EisenhowerCategory, type PlannerCategory } from "@/stores/usePlannerStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { useAppStore } from "@/stores/useAppStore";
import { cn, toLocalDateString } from "@/lib/utils";
import { Card } from "@/components/ui/primitives";
import { sendToToday } from "@/lib/flow";

const QUADRANTS: {
  id: EisenhowerCategory;
  title: string;
  axis: string;
  hint: string;
  tone: string;
  /** Label on the sorting chips. */
  short: string;
}[] = [
  {
    id: "EMERGENCY",
    title: "مربع الطوارئ",
    axis: "مهم · عاجل — نفّذه فوراً",
    hint: "تسليمات ومواعيد لا تقبل التأجيل، أو عُطل طارئ. بعد أي طارئ ارجع لخطتك فوراً.",
    tone: "bg-danger",
    short: "طوارئ",
  },
  {
    id: "QUALITY",
    title: "استثمر فيه",
    axis: "مهم · غير عاجل",
    hint: "التعلّم، والمشاريع الكبرى، والتخطيط. هنا يُصنع مستقبلك — احمِ له وقتاً يومياً.",
    tone: "bg-brand",
    short: "استثمر فيه",
  },
  {
    id: "DELEGATE",
    title: "فوّضه أو اختصره",
    axis: "عاجل · غير مهم",
    hint: "مقاطعات ورسائل وأعمال روتينية تبدو ملحّة ولا تصنع فرقاً.",
    tone: "bg-accent",
    short: "فوّضه",
  },
  {
    id: "ESCAPE",
    title: "قلّصه",
    axis: "غير مهم · غير عاجل",
    hint: "التصفح والتسلية بلا هدف. اعرفه لتحاصره.",
    tone: "bg-ink-3",
    short: "قلّصه",
  },
];

/**
 * One task list, two homes: tasks written here, and the tasks of every project.
 * A project task is sorted on the task itself, so the matrix and the project never disagree.
 */
type Item = {
  key: string;
  title: string;
  category: PlannerCategory;
  done: boolean;
  source: { kind: "planner"; id: string } | { kind: "project"; projectId: string; taskId: string; projectName: string };
};

function SortChips({
  current,
  onPick,
  withInbox,
}: {
  current: PlannerCategory;
  onPick: (c: PlannerCategory) => void;
  withInbox?: boolean;
}) {
  const options: { id: PlannerCategory; short: string; tone: string }[] = [
    ...QUADRANTS.map(({ id, short, tone }) => ({ id, short, tone })),
    ...(withInbox ? [{ id: "INBOX" as const, short: "الصندوق", tone: "bg-line-strong" }] : []),
  ];
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="صنّف المهمة">
      {options
        .filter((o) => o.id !== current)
        .map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onPick(o.id)}
            className="h-8 px-2.5 rounded-lg border border-line text-small text-ink-2 hover:border-ink-3 hover:text-ink inline-flex items-center gap-1.5 transition"
          >
            <span className={cn("w-2 h-2 rounded-full", o.tone)} />
            {o.short}
          </button>
        ))}
    </div>
  );
}

const selectClass =
  "h-9 rounded-lg border border-line bg-surface px-2 text-small text-ink-2 focus:outline-none focus:border-brand max-w-[11rem]";

export const TasksEisenhowerView: React.FC = () => {
  const tasks = usePlannerStore((s) => s.tasks);
  const addTask = usePlannerStore((s) => s.addTask);
  const toggleTask = usePlannerStore((s) => s.toggleTask);
  const deleteTask = usePlannerStore((s) => s.deleteTask);
  const updateTaskCategory = usePlannerStore((s) => s.updateTaskCategory);
  const projects = useProjectsStore((s) => s.projects);
  const frogs = useAppStore((s) => s.frogs);

  const [draft, setDraft] = useState("");
  const [draftProject, setDraftProject] = useState("");
  const [draftQuadrant, setDraftQuadrant] = useState<PlannerCategory>("INBOX");
  const [drafts, setDrafts] = useState<Record<EisenhowerCategory, string>>({ QUALITY: "", EMERGENCY: "", DELEGATE: "", ESCAPE: "" });
  const [movingKey, setMovingKey] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const today = toLocalDateString();
  const items: Item[] = useMemo(
    () => [
      ...tasks.map<Item>((t) => ({
        key: t.id,
        title: t.title,
        category: t.category,
        done: t.isCompleted,
        source: { kind: "planner", id: t.id },
      })),
      ...projects.flatMap((p) =>
        p.tasks
          // Finished project tasks stay visible on the day they were finished, like ticked matrix tasks.
          .filter((t) => t.status !== "DONE" || (t.doneAt && toLocalDateString(new Date(t.doneAt)) === today))
          .map<Item>((t) => ({
            key: t.id,
            title: t.title,
            category: t.quadrant ?? "INBOX",
            done: t.status === "DONE",
            source: { kind: "project", projectId: p.id, taskId: t.id, projectName: p.name },
          }))
      ),
    ],
    [tasks, projects, today]
  );
  const inbox = items.filter((i) => i.category === "INBOX" && !i.done);

  const notify = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2400);
  };

  const create = (title: string, quadrant: PlannerCategory, projectId: string) => {
    if (!title.trim()) return;
    if (projectId) {
      useProjectsStore.getState().addTask(projectId, title, quadrant === "INBOX" ? undefined : quadrant);
    } else {
      addTask(title.trim(), quadrant);
    }
  };

  const submitMain = (e: React.FormEvent) => {
    e.preventDefault();
    create(draft, draftQuadrant, draftProject);
    setDraft("");
  };

  const submitQuadrant = (e: React.FormEvent, cat: EisenhowerCategory) => {
    e.preventDefault();
    create(drafts[cat], cat, "");
    setDrafts((d) => ({ ...d, [cat]: "" }));
  };

  const move = (item: Item, c: PlannerCategory) => {
    if (item.source.kind === "planner") updateTaskCategory(item.source.id, c);
    else useProjectsStore.getState().setTaskQuadrant(item.source.projectId, item.source.taskId, c === "INBOX" ? undefined : c);
    setMovingKey(null);
  };

  /** Moves a loose matrix task into a project, keeping its quadrant. */
  const attachToProject = (item: Item, projectId: string) => {
    if (item.source.kind !== "planner" || !projectId) return;
    useProjectsStore.getState().addTask(projectId, item.title, item.category === "INBOX" ? undefined : item.category);
    deleteTask(item.source.id);
    setMovingKey(null);
    notify(`نُقلت إلى مشروع «${projects.find((p) => p.id === projectId)?.name ?? ""}».`);
  };

  const toggle = (item: Item) => {
    if (item.source.kind === "planner") return toggleTask(item.source.id);
    const done = !item.done;
    useProjectsStore.getState().setTaskStatus(item.source.projectId, item.source.taskId, done ? "DONE" : "DOING");
    useAppStore.getState().syncFrogWithProjectTask(item.source.taskId, done);
  };

  const remove = (item: Item) => {
    if (item.source.kind === "planner") deleteTask(item.source.id);
  };

  const inToday = (item: Item) =>
    frogs.some(
      (f) => !f.isCompleted && (item.source.kind === "project" ? f.projectTaskId === item.source.taskId : f.title === item.title)
    );

  const promote = (item: Item) => {
    if (item.source.kind === "project") {
      const res = useAppStore.getState().addFrogFromProjectTask(item.source.projectId, item.source.taskId);
      return notify(res.ok ? "أُضيفت إلى أولويات اليوم." : res.message);
    }
    const res = sendToToday(item.title);
    if (res.ok && item.category === "EMERGENCY") {
      const added = useAppStore.getState().frogs.at(-1);
      if (added) useAppStore.getState().updateFrog(added.id, { category: "EMERGENCY" });
    }
    notify(res.message);
  };

  const ProjectTag = ({ item }: { item: Item }) =>
    item.source.kind === "project" ? (
      <span className="inline-flex items-center gap-1 text-caption text-ink-3 max-w-[9rem] truncate shrink-0" title={item.source.projectName}>
        <FolderKanban className="w-3 h-3 shrink-0" />
        <span className="truncate">{item.source.projectName}</span>
      </span>
    ) : null;

  const MoveTools = ({ item, withInbox }: { item: Item; withInbox?: boolean }) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <SortChips current={item.category} onPick={(c) => move(item, c)} withInbox={withInbox} />
      {item.source.kind === "planner" && projects.length > 0 && (
        <select
          aria-label="انقلها إلى مشروع"
          defaultValue=""
          onChange={(e) => attachToProject(item, e.target.value)}
          className={selectClass}
        >
          <option value="" disabled>
            انقلها إلى مشروع…
          </option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );

  const PromoteButton = ({ item }: { item: Item }) =>
    item.done || item.category === "ESCAPE" ? null : inToday(item) ? (
      <span className="text-caption text-brand shrink-0">في اليوم</span>
    ) : (
      <button
        type="button"
        onClick={() => promote(item)}
        title="أضف لأولويات اليوم"
        aria-label="أضف لأولويات اليوم"
        className="w-7 h-7 shrink-0 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-brand hover:bg-brand-soft opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
      >
        <Target className="w-4 h-4" />
      </button>
    );

  return (
    <div className="space-y-4">
      {flash && (
        <p role="status" className="rounded-xl bg-brand-soft text-brand px-4 py-3 text-ui animate-rise-in">
          {flash}
        </p>
      )}

      <Card as="section" aria-labelledby="inbox-title" className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="inbox-title" className="font-display text-title-sm font-semibold text-ink inline-flex items-center gap-2">
              <Inbox className="w-5 h-5 text-ink-3" strokeWidth={1.8} />
              صندوق المهام
            </h2>
            <p className="text-small text-ink-2 mt-1 leading-relaxed">
              كل مهامك في مكان واحد: ما تكتبه هنا ومهام مشاريعك. اكتب الآن، وصنّف حين يهدأ ذهنك.
            </p>
          </div>
          <span className="text-small text-ink-3 tabular">{inbox.length}</span>
        </div>

        <form onSubmit={submitMain} className="mt-4 space-y-2">
          <div className="flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-3 h-11 focus-within:border-brand focus-within:shadow-ring transition">
            <Plus className="w-4 h-4 text-ink-3 shrink-0" />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="مهمة جديدة… اضغط Enter"
              aria-label="إضافة مهمة"
              className="flex-1 bg-transparent text-body text-ink placeholder:text-ink-3 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-small text-ink-3">
            {projects.length > 0 && (
              <select aria-label="المشروع" value={draftProject} onChange={(e) => setDraftProject(e.target.value)} className={selectClass}>
                <option value="">بلا مشروع</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            <select
              aria-label="المربع"
              value={draftQuadrant}
              onChange={(e) => setDraftQuadrant(e.target.value as PlannerCategory)}
              className={selectClass}
            >
              <option value="INBOX">صنّفها لاحقاً</option>
              {QUADRANTS.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.short}
                </option>
              ))}
            </select>
          </div>
        </form>

        {inbox.length > 0 && (
          <ul className="mt-3 divide-y divide-line">
            {inbox.map((item) => (
              <li key={item.key} className="group py-3 space-y-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex-1 text-body text-ink break-words">{item.title}</span>
                  <ProjectTag item={item} />
                  <PromoteButton item={item} />
                  {item.source.kind === "planner" && (
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      aria-label="حذف"
                      className="w-7 h-7 shrink-0 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-danger hover:bg-danger-soft transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <MoveTools item={item} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {QUADRANTS.map((q) => {
          const list = items.filter((i) => i.category === q.id);
          return (
            <Card as="section" key={q.id} className="p-5 flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-caption text-ink-3">
                    <span className={cn("w-2 h-2 rounded-full", q.tone)} />
                    {q.axis}
                  </p>
                  <h2 className="font-display text-title-sm font-semibold text-ink mt-1">{q.title}</h2>
                </div>
                <span className="text-small text-ink-3 tabular">{list.filter((i) => !i.done).length}</span>
              </div>
              <p className="text-small text-ink-2 mt-1 leading-relaxed">{q.hint}</p>

              <ul className="mt-4 space-y-1 flex-1">
                {list.map((item) => (
                  <React.Fragment key={item.key}>
                    <li className="group flex items-center gap-2.5 rounded-lg px-2 py-2 -mx-2 hover:bg-surface-2 transition">
                      <button
                        type="button"
                        onClick={() => toggle(item)}
                        aria-label={item.done ? "إلغاء الإتمام" : "إتمام"}
                        className={cn(
                          "w-5 h-5 shrink-0 rounded-full border-[1.5px] inline-flex items-center justify-center transition",
                          item.done ? "bg-brand border-brand text-brand-ink" : "border-ink-3/60 text-transparent hover:border-brand"
                        )}
                      >
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </button>
                      <span className="flex-1 min-w-0">
                        <span className={cn("block text-body break-words", item.done ? "text-ink-3 line-through" : "text-ink")}>
                          {item.title}
                        </span>
                      </span>
                      <ProjectTag item={item} />
                      <PromoteButton item={item} />
                      <button
                        type="button"
                        onClick={() => setMovingKey(movingKey === item.key ? null : item.key)}
                        title="إعادة تصنيف"
                        aria-label="إعادة تصنيف"
                        aria-expanded={movingKey === item.key}
                        className={cn(
                          "w-7 h-7 shrink-0 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-ink hover:bg-surface transition",
                          movingKey === item.key ? "text-ink bg-surface" : "sm:opacity-0 sm:group-hover:opacity-100"
                        )}
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                      </button>
                      {item.source.kind === "planner" && (
                        <button
                          type="button"
                          onClick={() => remove(item)}
                          aria-label="حذف"
                          className="w-7 h-7 shrink-0 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-danger hover:bg-danger-soft opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </li>
                    {movingKey === item.key && (
                      <li className="pb-2 pt-1">
                        <MoveTools item={item} withInbox />
                      </li>
                    )}
                  </React.Fragment>
                ))}
              </ul>

              <form onSubmit={(e) => submitQuadrant(e, q.id)} className="mt-3 flex items-center gap-2 border-t border-line pt-3">
                <Plus className="w-4 h-4 text-ink-3 shrink-0" />
                <input
                  value={drafts[q.id]}
                  onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
                  placeholder="أضف مهمة واضغط Enter"
                  aria-label={`إضافة مهمة إلى ${q.title}`}
                  className="flex-1 bg-transparent text-body text-ink placeholder:text-ink-3 focus:outline-none"
                />
              </form>
            </Card>
          );
        })}
      </div>
      <p className="text-small text-ink-3">
        <Target className="inline w-3.5 h-3.5 -mt-0.5" /> لإضافتها إلى أولويات اليوم ·{" "}
        <ArrowLeftRight className="inline w-3.5 h-3.5 -mt-0.5" /> لنقلها إلى مربع آخر أو إلى مشروع. مهام المشاريع تُحذف من صفحة مشروعها.
      </p>
    </div>
  );
};

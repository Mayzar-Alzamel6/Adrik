"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useShallow } from "zustand/react/shallow";
import { CalendarDays, ChevronRight, FolderKanban, Heart, Layers, Pencil, Plus, Sparkles, Target, Trash2, X } from "lucide-react";
import { useAppStore, type CoreValueItem, type SkillProjectItem } from "@/stores/useAppStore";
import {
  projectProgress,
  useProjectsStore,
  type Project,
  type ProjectTaskStatus,
} from "@/stores/useProjectsStore";
import { cn, toLocalDateString } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge, Card, EmptyState, Input, Label, SegmentedControl, Textarea } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";
import { BreakdownSheet, type BreakdownTarget } from "@/components/ai/BreakdownSheet";
import { InteractiveTimeline } from "./InteractiveTimeline";

const STATUS: { value: ProjectTaskStatus; label: string }[] = [
  { value: "TODO", label: "لم تبدأ" },
  { value: "DOING", label: "قيد العمل" },
  { value: "DONE", label: "منجزة" },
];

type Filter = "ALL" | ProjectTaskStatus;

/** Where each task sits in the priority matrix; sorting itself happens in the matrix. */
const QUADRANT_LABEL: Record<string, { label: string; dot: string }> = {
  EMERGENCY: { label: "طوارئ", dot: "bg-danger" },
  QUALITY: { label: "استثمر فيه", dot: "bg-brand" },
  DELEGATE: { label: "فوّضه", dot: "bg-accent" },
  ESCAPE: { label: "قلّصه", dot: "bg-ink-3" },
};
type Draft = { name: string; description: string; targetDate: string; skill: string; valueIds: string[] };
const EMPTY_DRAFT: Draft = { name: "", description: "", targetDate: "", skill: "", valueIds: [] };

type SkillResult = { ok: true; id: string } | { ok: false; openSkill?: string };

/**
 * Links an existing skill by name, or starts a new learning track. The meta-learning tool allows one
 * unfinished track at a time, so a blocked request reports which track is still open.
 */
function resolveSkill(name: string): SkillResult {
  const app = useAppStore.getState();
  const title = name.trim();
  const existing = app.skills.find((s) => s.title.trim() === title);
  if (existing) return { ok: true, id: existing.id };
  const res = app.addSkillProject(title, 20);
  if (!res.success) {
    const open = app.skills.find((s) => s.isLocked && s.loggedHours < s.targetHours);
    return { ok: false, openSkill: open?.title };
  }
  const created = useAppStore.getState().skills.at(-1);
  return created ? { ok: true, id: created.id } : { ok: false };
}

const DATE_FORMAT = new Intl.DateTimeFormat("ar", { day: "numeric", month: "long", year: "numeric" });

function days(n: number) {
  if (n === 1) return "يوم واحد";
  if (n === 2) return "يومان";
  if (n >= 3 && n <= 10) return `${n} أيام`;
  return `${n} يوماً`;
}

function deadline(p: Project, percent: number): { text: string; tone: "neutral" | "brand" | "accent" | "danger" } | null {
  if (!p.targetDate) return null;
  const tasks = p.tasks || [];
  if (percent === 100 && tasks.length > 0) return { text: "مكتمل", tone: "brand" };
  const [y, m, d] = p.targetDate.split("-").map(Number);
  const [ty, tm, td] = toLocalDateString().split("-").map(Number);
  const diff = Math.round((new Date(y, m - 1, d).getTime() - new Date(ty, tm - 1, td).getTime()) / 86400000);
  if (diff < 0) return { text: `متأخر ${days(-diff)}`, tone: "danger" };
  if (diff === 0) return { text: "الموعد اليوم", tone: "accent" };
  return { text: `باقٍ ${days(diff)}`, tone: diff <= 7 ? "accent" : "neutral" };
}

export function ProjectsView() {
  const { projects, addProject, updateProject, deleteProject, addTask, setTaskStatus, deleteTask, linkSkill, unlinkSkill } =
    useProjectsStore(
      useShallow((s) => ({
        projects: s.projects,
        addProject: s.addProject,
        updateProject: s.updateProject,
        deleteProject: s.deleteProject,
        addTask: s.addTask,
        setTaskStatus: s.setTaskStatus,
        deleteTask: s.deleteTask,
        linkSkill: s.linkSkill,
        unlinkSkill: s.unlinkSkill,
      }))
    );
  const skills = useAppStore((s) => s.skills);
  const values = useAppStore((s) => s.values);
  const [skillError, setSkillError] = useState<string | undefined | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ mode: "new" | "edit"; draft: Draft } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [newTask, setNewTask] = useState("");
  const [breakdown, setBreakdown] = useState<BreakdownTarget | null>(null);
  const [projectViewMode, setProjectViewMode] = useState<"PROJECTS" | "TIMELINE">("PROJECTS");
  const [selectedTimelineProjectId, setSelectedTimelineProjectId] = useState<string | undefined>(undefined);

  const selected = projects.find((p) => p.id === selectedId);

  const openNew = () => setSheet({ mode: "new", draft: EMPTY_DRAFT });
  const openEdit = (p: Project) =>
    setSheet({ mode: "edit", draft: { name: p.name, description: p.description, targetDate: p.targetDate ?? "", skill: "", valueIds: p.valueIds ?? [] } });
  const closeSheet = () => {
    setSheet(null);
    setConfirmDelete(false);
    setSkillError(null);
  };

  const saveSheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheet || !sheet.draft.name.trim()) return;
    if (sheet.mode === "new") {
      let skillId: string | undefined;
      if (sheet.draft.skill.trim()) {
        const res = resolveSkill(sheet.draft.skill);
        if (!res.ok) {
          setSkillError(res.openSkill);
          return;
        }
        skillId = res.id;
      }
      const id = addProject(sheet.draft);
      if (skillId) linkSkill(id, skillId);
      setSelectedId(id);
    } else if (selected) {
      updateProject(selected.id, {
        name: sheet.draft.name.trim(),
        description: sheet.draft.description.trim(),
        targetDate: sheet.draft.targetDate || undefined,
        valueIds: sheet.draft.valueIds,
      });
    }
    closeSheet();
  };

  const removeSelected = () => {
    if (!selected) return;
    deleteProject(selected.id);
    setSelectedId(null);
    closeSheet();
  };

  const submitTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !newTask.trim()) return;
    addTask(selected.id, newTask);
    setNewTask("");
  };

  const setDraft = (patch: Partial<Draft>) => sheet && setSheet({ ...sheet, draft: { ...sheet.draft, ...patch } });

  return (
    <div className="space-y-6">
      {/* Top Segmented Switcher: Projects Cards vs Interactive Timeline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
        <SegmentedControl
          options={[
            { value: "PROJECTS", label: "بطاقات المشاريع 📁" },
            { value: "TIMELINE", label: "المسار الزمني والتقويم 📅" },
          ]}
          value={projectViewMode}
          onChange={(val) => {
            setProjectViewMode(val as "PROJECTS" | "TIMELINE");
            if (val === "TIMELINE") {
              setSelectedTimelineProjectId(selectedId || undefined);
            }
          }}
        />
      </div>

      {projectViewMode === "TIMELINE" ? (
        <InteractiveTimeline initialProjectId={selectedTimelineProjectId} />
      ) : selected ? (
        <ProjectDetail
          project={selected}
          filter={filter}
          onFilter={setFilter}
          newTask={newTask}
          onNewTask={setNewTask}
          onSubmitTask={submitTask}
          onBack={() => {
            setSelectedId(null);
            setFilter("ALL");
          }}
          onEdit={() => openEdit(selected)}
          onOpenTimeline={() => {
            setSelectedTimelineProjectId(selected.id);
            setProjectViewMode("TIMELINE");
          }}
          onStatus={(taskId, status) => {
            setTaskStatus(selected.id, taskId, status);
            useAppStore.getState().syncFrogWithProjectTask(taskId, status === "DONE");
          }}
          onDeleteTask={(taskId) => deleteTask(selected.id, taskId)}
          onSuggest={() => setBreakdown({ kind: "project", project: selected })}
          skillsSlot={
            <LinkedSkills
              project={selected}
              skills={skills}
              onLink={(name) => {
                const res = resolveSkill(name);
                if (res.ok) linkSkill(selected.id, res.id);
                return res;
              }}
              onUnlink={(skillId) => unlinkSkill(selected.id, skillId)}
            />
          }
        />
      ) : projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderKanban}
            title="ابدأ مشروعك الأول"
            description="مشروع = هدف له موعد، مقسّم إلى مهام صغيرة تتقدّم فيها خطوة خطوة وترى نسبة إنجازك."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={openNew}>
                  <Plus className="w-4 h-4" />
                  مشروع جديد
                </Button>
                <Button variant="secondary" onClick={() => setBreakdown({ kind: "new" })}>
                  <Sparkles className="w-4 h-4" />
                  ابدأ من هدف
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-ui text-ink-2">
              {projects.length === 1 ? "مشروع واحد" : projects.length === 2 ? "مشروعان" : `${projects.length} مشاريع`}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setBreakdown({ kind: "new" })}>
                <Sparkles className="w-4 h-4" />
                ابدأ من هدف
              </Button>
              <Button size="sm" onClick={openNew}>
                <Plus className="w-4 h-4" />
                مشروع جديد
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((p) => {
              const prog = projectProgress(p);
              const due = deadline(p, prog.percent);
              return (
                <button key={p.id} type="button" onClick={() => setSelectedId(p.id)} className="group text-right">
                  <Card className="h-full p-5 flex flex-col gap-3 transition group-hover:shadow-lift group-hover:-translate-y-0.5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-subtitle font-semibold text-ink leading-snug">{p.name}</h3>
                      {due && <Badge tone={due.tone}>{due.text}</Badge>}
                    </div>
                    {p.description && <p className="text-ui text-ink-2 leading-relaxed line-clamp-2">{p.description}</p>}
                    <ProjectValues project={p} values={values} compact />
                    <div className="mt-auto pt-1">
                      <ProgressBar percent={prog.percent} />
                      <p className="text-small text-ink-3 mt-1.5 tabular">
                        {prog.total === 0 ? "لا مهام بعد" : `${prog.done} من ${prog.total} مهام · ${prog.percent}%`}
                      </p>
                    </div>
                  </Card>
                </button>
              );
            })}
          </div>
        </>
      )}

      <BreakdownSheet target={breakdown} onClose={() => setBreakdown(null)} onCreated={(id) => setSelectedId(id)} />

      <Sheet
        open={Boolean(sheet)}
        onClose={closeSheet}
        title={sheet?.mode === "edit" ? "تعديل المشروع" : "مشروع جديد"}
        size="sm"
      >
        {sheet && (
          <form onSubmit={saveSheet} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="prj-name">اسم المشروع</Label>
              <Input
                id="prj-name"
                autoFocus
                required
                maxLength={80}
                value={sheet.draft.name}
                onChange={(e) => setDraft({ name: e.target.value })}
                placeholder="مثال: إطلاق المتجر"
              />
            </div>
            <div>
              <Label htmlFor="prj-desc" hint="اختياري: ما شكل النجاح في هذا المشروع؟">
                الوصف
              </Label>
              <Textarea
                id="prj-desc"
                rows={3}
                value={sheet.draft.description}
                onChange={(e) => setDraft({ description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="prj-date" hint="اختياري">
                التاريخ الهدف
              </Label>
              <Input
                id="prj-date"
                type="date"
                value={sheet.draft.targetDate}
                onChange={(e) => setDraft({ targetDate: e.target.value })}
              />
            </div>
            <div>
              <Label hint="القيمة هي «لماذا» المشروع. اختر قيمة أو أكثر من دستورك.">القيم التي يخدمها</Label>
              {values.length === 0 ? (
                <p className="text-small text-ink-3">
                  لا قيم بعد.{" "}
                  <Link href="/app/tools/identity" className="text-brand hover:underline underline-offset-4">
                    أضفها من دستور القيم
                  </Link>
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {values.map((v) => {
                    const on = sheet.draft.valueIds.includes(v.id);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          setDraft({
                            valueIds: on ? sheet.draft.valueIds.filter((x) => x !== v.id) : [...sheet.draft.valueIds, v.id],
                          })
                        }
                        className={cn(
                          "h-9 px-3 rounded-xl border text-small transition inline-flex items-center gap-1.5",
                          on ? "bg-accent-soft border-accent/40 text-ink font-medium" : "border-line text-ink-2 hover:border-ink-3"
                        )}
                      >
                        <Heart className={cn("w-3.5 h-3.5", on ? "text-accent-strong fill-current" : "text-ink-3")} />
                        {v.title}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {sheet.mode === "new" && (
              <div>
                <Label htmlFor="prj-skill" hint="اختياري: تُضاف إلى «تعلّم مهارة» مرتبطةً بهذا المشروع.">
                  مهارة تحتاج تعلّمها
                </Label>
                <Input
                  id="prj-skill"
                  list="skill-options"
                  maxLength={60}
                  value={sheet.draft.skill}
                  onChange={(e) => {
                    setDraft({ skill: e.target.value });
                    setSkillError(null);
                  }}
                  placeholder="مثال: التسويق بالمحتوى"
                />
                <SkillOptions skills={skills} />
                {skillError !== null && (
                  <SkillBlocked openSkill={skillError} onUseOpen={(title) => setDraft({ skill: title })} />
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              {sheet.mode === "edit" ? (
                confirmDelete ? (
                  <span className="flex items-center gap-2">
                    <Button variant="danger" size="sm" onClick={removeSelected}>
                      نعم، احذفه
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                      تراجع
                    </Button>
                  </span>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="text-danger">
                    <Trash2 className="w-4 h-4" />
                    حذف المشروع
                  </Button>
                )
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={closeSheet}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={!sheet.draft.name.trim()}>
                  {sheet.mode === "edit" ? "حفظ" : "إنشاء"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </Sheet>
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 rounded-full bg-surface-2 overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
    </div>
  );
}

function ProjectDetail({
  project,
  filter,
  onFilter,
  newTask,
  onNewTask,
  onSubmitTask,
  onBack,
  onEdit,
  onOpenTimeline,
  onStatus,
  onDeleteTask,
  onSuggest,
  skillsSlot,
}: {
  skillsSlot: React.ReactNode;
  onSuggest: () => void;
  project: Project;
  filter: Filter;
  onFilter: (f: Filter) => void;
  newTask: string;
  onNewTask: (v: string) => void;
  onSubmitTask: (e: React.FormEvent) => void;
  onBack: () => void;
  onEdit: () => void;
  onOpenTimeline?: () => void;
  onStatus: (taskId: string, status: ProjectTaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  const values = useAppStore((s) => s.values);
  const frogs = useAppStore((s) => s.frogs);
  const [todayNote, setTodayNote] = useState<string | null>(null);
  const inToday = new Set(frogs.filter((f) => !f.isCompleted && f.projectTaskId).map((f) => f.projectTaskId));
  const toToday = (taskId: string) => {
    const res = useAppStore.getState().addFrogFromProjectTask(project.id, taskId);
    setTodayNote(res.ok ? "أُضيفت إلى أولويات اليوم." : res.message);
    setTimeout(() => setTodayNote(null), 2600);
  };
  const prog = projectProgress(project);
  const due = deadline(project, prog.percent);
  const count =(s: ProjectTaskStatus) => project.tasks.filter((t) => t.status === s).length;
  const visible = filter === "ALL" ? project.tasks : project.tasks.filter((t) => t.status === filter);

  return (
    <>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-ui text-ink-2 hover:text-ink transition">
        <ChevronRight className="w-4 h-4" />
        كل المشاريع
      </button>

      <Card as="section" className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-title-lg font-semibold text-ink leading-snug">{project.name}</h2>
            {project.description && <p className="text-body text-ink-2 mt-1 leading-relaxed">{project.description}</p>}
            <ProjectValues project={project} values={values} onLink={onEdit} className="mt-3" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenTimeline && (
              <Button variant="secondary" size="sm" onClick={onOpenTimeline} aria-label="عرض على المسار الزمني">
                <CalendarDays className="w-4 h-4" />
                المسار الزمني
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onEdit} aria-label="تعديل المشروع">
              <Pencil className="w-4 h-4" />
              تعديل
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-small text-ink-2">
          {project.targetDate && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-ink-3" />
              {DATE_FORMAT.format(new Date(`${project.targetDate}T12:00:00`))}
            </span>
          )}
          {due && <Badge tone={due.tone}>{due.text}</Badge>}
        </div>

        <div className="mt-5">
          <div className="flex items-end justify-between mb-2">
            <span className="font-display text-heading-lg text-ink tabular leading-none">{prog.percent}%</span>
            <span className="text-ui text-ink-2 tabular">
              {prog.done} من {prog.total} مهام
            </span>
          </div>
          <ProgressBar percent={prog.percent} />
        </div>
      </Card>

      {skillsSlot}

      <Card as="section" className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-subtitle font-semibold text-ink">المهام</h3>
            <Button variant="ghost" size="sm" onClick={onSuggest}>
              <Sparkles className="w-4 h-4 text-accent-strong" />
              اقترح الخطوات التالية
            </Button>
          </div>
          <SegmentedControl<Filter>
            size="sm"
            ariaLabel="تصفية المهام"
            value={filter}
            onChange={onFilter}
            options={[
              { value: "ALL", label: `الكل ${project.tasks.length}` },
              ...STATUS.map((s) => ({ value: s.value as Filter, label: `${s.label} ${count(s.value)}` })),
            ]}
            className="max-w-full overflow-x-auto"
          />
        </div>

        <form onSubmit={onSubmitTask} className="mt-5 flex gap-2">
          <Input
            value={newTask}
            onChange={(e) => onNewTask(e.target.value)}
            placeholder="مهمة جديدة، مثال: تصميم صفحة الدفع"
            aria-label="مهمة جديدة"
            maxLength={140}
          />
          <Button type="submit" variant="secondary" disabled={!newTask.trim()} className="shrink-0">
            <Plus className="w-4 h-4" />
            إضافة
          </Button>
        </form>

        {todayNote && (
          <p role="status" className="mt-4 rounded-xl bg-brand-soft text-brand px-4 py-2.5 text-ui">
            {todayNote}
          </p>
        )}

        {visible.length === 0 ? (
          <p className="mt-6 text-center text-ui text-ink-3">
            {project.tasks.length === 0 ? "قسّم المشروع إلى مهام صغيرة، كل واحدة تُنجز في جلسة أو جلستين." : "لا مهام في هذه الحالة."}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {visible.map((t) => (
              <li key={t.id} className="group py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <span
                    className={cn(
                      "mt-2 w-2 h-2 rounded-full shrink-0",
                      t.status === "DONE" ? "bg-brand" : t.status === "DOING" ? "bg-accent" : "bg-line"
                    )}
                    aria-hidden
                  />
                  <span className={cn("text-body leading-relaxed break-words", t.status === "DONE" ? "text-ink-3 line-through" : "text-ink")}>
                    {t.title}
                  </span>
                  {t.quadrant && QUADRANT_LABEL[t.quadrant] && (
                    <Link
                      href="/app/tools/eisenhower"
                      title="صنّفها في مصفوفة الأولويات"
                      className="mt-1 shrink-0 inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-caption text-ink-2 hover:text-ink"
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", QUADRANT_LABEL[t.quadrant].dot)} />
                      {QUADRANT_LABEL[t.quadrant].label}
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-1 self-end sm:self-auto">
                  {t.status !== "DONE" &&
                    (inToday.has(t.id) ? (
                      <span className="text-caption font-medium text-brand bg-brand-soft rounded-full px-2.5 py-1 shrink-0">في اليوم</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toToday(t.id)}
                        title="أضفها لأولويات اليوم"
                        aria-label={`أضف ${t.title} لأولويات اليوم`}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-brand hover:bg-brand-soft transition"
                      >
                        <Target className="w-4 h-4" />
                      </button>
                    ))}
                  <SegmentedControl<ProjectTaskStatus>
                    size="sm"
                    ariaLabel={`حالة ${t.title}`}
                    value={t.status}
                    onChange={(s) => onStatus(t.id, s)}
                    options={STATUS}
                  />
                  <button
                    type="button"
                    onClick={() => onDeleteTask(t.id)}
                    aria-label={`حذف ${t.title}`}
                    className="w-8 h-8 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-danger hover:bg-danger-soft transition sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function SkillOptions({ skills }: { skills: SkillProjectItem[] }) {
  return (
    <datalist id="skill-options">
      {skills.map((s) => (
        <option key={s.id} value={s.title} />
      ))}
    </datalist>
  );
}

function SkillBlocked({ openSkill, onUseOpen }: { openSkill?: string; onUseOpen: (title: string) => void }) {
  return (
    <div className="mt-2 rounded-xl bg-accent-soft/70 px-3 py-2.5 text-small text-ink leading-relaxed" role="alert">
      {openSkill ? (
        <>
          ما زال مسار «{openSkill}» مفتوحاً قبل أول 20 ساعة، ولا يُفتح مسار جديد قبله حتى لا تتشتّت بين المصادر.
          <button
            type="button"
            onClick={() => onUseOpen(openSkill)}
            className="block mt-1.5 font-medium text-brand hover:underline underline-offset-4"
          >
            اربط «{openSkill}» بدلاً منها
          </button>
        </>
      ) : (
        "تعذّر إضافة المهارة."
      )}
    </div>
  );
}

function LinkedSkills({
  project,
  skills,
  onLink,
  onUnlink,
}: {
  project: Project;
  skills: SkillProjectItem[];
  onLink: (name: string) => SkillResult;
  onUnlink: (skillId: string) => void;
}) {
  const linked = (project.skillIds ?? [])
    .map((id) => skills.find((s) => s.id === id))
    .filter((s): s is SkillProjectItem => Boolean(s));
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [blocked, setBlocked] = useState<string | undefined | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const res = onLink(name);
    if (!res.ok) {
      setBlocked(res.openSkill);
      return;
    }
    setName("");
    setBlocked(null);
    setAdding(false);
  };

  return (
    <Card as="section" className="p-5 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-subtitle font-semibold text-ink inline-flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand" strokeWidth={1.8} />
          مهارات يحتاجها المشروع
        </h3>
        {!adding && (
          <Button size="sm" variant="ghost" onClick={() => setAdding(true)}>
            <Plus className="w-4 h-4" />
            ربط مهارة
          </Button>
        )}
      </div>

      {linked.length === 0 && !adding && (
        <p className="mt-3 text-ui text-ink-3">ما المهارة التي يتوقف عليها نجاح هذا المشروع؟ اربطها لتتابع ساعات تعلّمها من هنا.</p>
      )}

      {linked.length > 0 && (
        <ul className="mt-4 space-y-3">
          {linked.map((s) => {
            const pct = Math.min(100, Math.round((s.loggedHours / s.targetHours) * 100));
            return (
              <li key={s.id} className="rounded-xl border border-line p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/app/tools/meta?skill=${s.id}`} className="text-body font-medium text-ink hover:text-brand transition truncate">
                    {s.title}
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-small text-ink-3 tabular">
                      {s.loggedHours} من {s.targetHours} س
                    </span>
                    <button
                      type="button"
                      onClick={() => onUnlink(s.id)}
                      aria-label={`فك ربط ${s.title}`}
                      title="فك الربط"
                      className="w-7 h-7 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-danger hover:bg-danger-soft transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {adding && (
        <form onSubmit={submit} className="mt-4">
          <div className="flex gap-2">
            <Input
              autoFocus
              list="skill-options"
              value={name}
              maxLength={60}
              onChange={(e) => {
                setName(e.target.value);
                setBlocked(null);
              }}
              placeholder="اسم المهارة، جديدة أو من مساراتك"
              aria-label="اسم المهارة"
            />
            <Button type="submit" variant="secondary" disabled={!name.trim()} className="shrink-0">
              ربط
            </Button>
            <Button variant="ghost" onClick={() => setAdding(false)} className="shrink-0">
              إلغاء
            </Button>
          </div>
          <SkillOptions skills={skills} />
          {blocked !== null && <SkillBlocked openSkill={blocked} onUseOpen={setName} />}
        </form>
      )}
    </Card>
  );
}

function ProjectValues({
  project,
  values,
  compact,
  onLink,
  className,
}: {
  project: Project;
  values: CoreValueItem[];
  compact?: boolean;
  onLink?: () => void;
  className?: string;
}) {
  const served = (project.valueIds ?? [])
    .map((id) => values.find((v) => v.id === id))
    .filter((v): v is CoreValueItem => Boolean(v));
  if (served.length === 0) {
    return (
      <p className={cn("text-small text-ink-3 inline-flex flex-wrap items-center gap-1.5", className)}>
        <Heart className="w-3.5 h-3.5" />
        هذا المشروع لا يخدم أي قيمة عندك.
        {onLink && (
          <button type="button" onClick={onLink} className="font-medium text-brand hover:underline underline-offset-4">
            اربطه بقيمة
          </button>
        )}
      </p>
    );
  }
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {!compact && <span className="text-small text-ink-3">يخدم:</span>}
      {served.map((v) => (
        <span key={v.id} className="inline-flex items-center gap-1 rounded-full bg-accent-soft text-ink px-2.5 py-0.5 text-caption font-medium">
          <Heart className="w-3 h-3 text-accent-strong fill-current" />
          {v.title}
        </span>
      ))}
    </div>
  );
}

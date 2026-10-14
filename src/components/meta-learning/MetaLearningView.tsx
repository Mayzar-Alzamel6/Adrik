"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useShallow } from "zustand/react/shallow";
import { BookOpen, Brain, Check, FolderKanban, Layers, Lock, Plus, ShieldAlert, Target, Timer, Trash2, Wrench, X } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { useProjectsStore, type Project } from "@/stores/useProjectsStore";
import { cn } from "@/lib/utils";
import { sendToToday } from "@/lib/flow";
import { formatMinutes, projectMinutesSince, useValueData } from "@/lib/valueInsights";
import { Button } from "@/components/ui/Button";
import { Badge, Card, EmptyState, Input, Label, SectionHeader } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";

type Category = "CONCEPT" | "FACT" | "PROCEDURE";
const COLUMNS: { id: Category; title: string; hint: string; icon: typeof Brain; placeholder: string }[] = [
  { id: "CONCEPT", title: "مفاهيم", hint: "ما يحتاج فهماً عميقاً لا حفظاً.", icon: Brain, placeholder: "مثال: كيف يعمل نموذج التسعير" },
  { id: "FACT", title: "حقائق", hint: "ما يحتاج استدعاءً: مفردات، قواعد، أرقام.", icon: BookOpen, placeholder: "مثال: أهم 50 مصطلحاً" },
  { id: "PROCEDURE", title: "تطبيقات", hint: "ما لا يُتقن إلا بالممارسة المتكررة.", icon: Wrench, placeholder: "مثال: حل تمرين يومياً" },
];

/** Break a skill into concepts, facts and procedures, and commit to its first 20 hours before switching. */
export const MetaLearningView: React.FC = () => {
  const { skills, addSkillProject, addSkillElement, toggleSkillElement, deleteSkillElement, addSkillLoggedTime } = useAppStore(
    useShallow((s) => ({
      skills: s.skills,
      addSkillProject: s.addSkillProject,
      addSkillElement: s.addSkillElement,
      toggleSkillElement: s.toggleSkillElement,
      deleteSkillElement: s.deleteSkillElement,
      addSkillLoggedTime: s.addSkillLoggedTime,
    }))
  );
  const [selectedId, setSelectedId] = useState(() => {
    const fromLink = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("skill") : null;
    return fromLink && skills.some((s) => s.id === fromLink) ? fromLink : skills[0]?.id ?? "";
  });
  const { projects, linkSkill, unlinkSkill } = useProjectsStore(
    useShallow((s) => ({
      projects: s.projects,
      linkSkill: s.linkSkill,
      unlinkSkill: s.unlinkSkill,
    }))
  );
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newProjectId, setNewProjectId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<Category, string>>({ CONCEPT: "", FACT: "", PROCEDURE: "" });

  const skill = skills.find((s) => s.id === selectedId) ?? skills[0];
  const progress = skill ? Math.min(100, Math.round((skill.loggedHours / skill.targetHours) * 100)) : 0;
  const locked = skill ? skill.isLocked && skill.loggedHours < skill.targetHours : false;
  // Tracks copied from the founder template start unlocked and unstarted.
  const deferred = skill ? !skill.isLocked && skill.loggedHours < skill.targetHours : false;
  const linkedProjects = skill ? projects.filter((p) => p.skillIds?.includes(skill.id)) : [];
  const valueData = useValueData();
  // All focus time ever spent on priorities linked to this skill (it is already inside loggedHours).
  const focusMinutes = useMemo(
    () => (skill ? projectMinutesSince(36500, valueData).bySkill.get(skill.id) ?? 0 : 0),
    [skill, valueData]
  );
  const [practiceNote, setPracticeNote] = useState<string | null>(null);

  /** A procedure is practised, not read: make it one of today's priorities, linked back to this skill. */
  const practiceToday = (content: string) => {
    if (!skill) return;
    const res = sendToToday(`تدرّب: ${content}`, {
      skillId: skill.id,
      projectId: linkedProjects.length === 1 ? linkedProjects[0].id : undefined,
    });
    setPracticeNote(res.message);
    setTimeout(() => setPracticeNote(null), 2600);
  };

  const tryNew = () => {
    const open = skills.find((s) => s.isLocked && s.loggedHours < s.targetHours);
    if (open) {
      setBlocked(
        `ما زال أمامك ${Math.round((open.targetHours - open.loggedHours) * 10) / 10} ساعة في «${open.title}». التنقل بين المصادر هروب لطيف من ألم الممارسة — أكمل ما بين يديك أولاً.`
      );
      return;
    }
    setNewOpen(true);
  };

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const res = addSkillProject(newTitle.trim(), 20);
    if (!res.success) {
      setNewOpen(false);
      setBlocked(res.message ?? "أكمل مسارك الحالي أولاً.");
      return;
    }
    setNewTitle("");
    setNewOpen(false);
    const created = useAppStore.getState().skills.at(-1);
    if (created) {
      setSelectedId(created.id);
      if (newProjectId) linkSkill(newProjectId, created.id);
    }
    setNewProjectId(null);
  };

  const addElement = (e: React.FormEvent, cat: Category) => {
    e.preventDefault();
    if (!skill || !drafts[cat].trim()) return;
    addSkillElement(skill.id, cat, drafts[cat].trim());
    setDrafts((d) => ({ ...d, [cat]: "" }));
  };

  return (
    <div className="space-y-6">
      {skills.length === 0 ? (
        <Card>
          <EmptyState
            icon={Layers}
            title="ما المهارة التي تريد إتقانها؟"
            description="أول 20 ساعة من الممارسة المركّزة تكفي لتجاوز مرحلة الارتباك في معظم المهارات. اختر واحدة والتزم بها."
            action={
              <Button onClick={tryNew}>
                <Plus className="w-4 h-4" />
                ابدأ مساراً
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {skills.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={cn(
                  "inline-flex items-center gap-2 h-10 px-4 rounded-xl border text-ui transition",
                  s.id === skill?.id ? "bg-surface border-brand/40 text-ink font-medium shadow-soft" : "border-line text-ink-2 hover:border-ink-3"
                )}
              >
                {s.title}
                <span className="text-caption text-ink-3 tabular">
                  {s.loggedHours} من {s.targetHours} س
                </span>
              </button>
            ))}
            <Button variant="ghost" size="sm" onClick={tryNew}>
              <Plus className="w-4 h-4" />
              مسار جديد
            </Button>
          </div>

          {skill && (
            <>
              <Card as="section" className="p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-title font-semibold text-ink">{skill.title}</h2>
                    <p className="text-ui text-ink-2 mt-1">
                      {locked
                        ? "التزم بهذا المسار وحده حتى تُتم أول 20 ساعة."
                        : deferred
                        ? "مسار مؤجل: ابدأه بعد أن تُتم أول 20 ساعة في مسارك الحالي."
                        : "تجاوزت أول 20 ساعة. يمكنك الآن فتح مسار موازٍ."}
                    </p>
                    <ProjectLinks
                      key={skill.id}
                      skillId={skill.id}
                      linked={linkedProjects}
                      available={projects.filter((p) => !p.skillIds?.includes(skill.id))}
                      hasProjects={projects.length > 0}
                      onLink={(projectId) => linkSkill(projectId, skill.id)}
                      onUnlink={(projectId) => unlinkSkill(projectId, skill.id)}
                    />
                  </div>
                  {locked ? (
                    <Badge tone="accent">
                      <Lock className="w-3.5 h-3.5" />
                      التزام
                    </Badge>
                  ) : deferred ? (
                    <Badge tone="neutral">مؤجل</Badge>
                  ) : (
                    <Badge tone="brand">
                      <Check className="w-3.5 h-3.5" />
                      اجتزت العتبة
                    </Badge>
                  )}
                </div>
                <div className="mt-6">
                  <div className="flex items-end justify-between mb-2">
                    <span className="font-display text-display-sm text-ink tabular leading-none">
                      {skill.loggedHours}
                      <span className="text-body text-ink-3"> من {skill.targetHours} ساعة</span>
                    </span>
                    <span className="text-ui text-ink-2 tabular">{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <p className="mt-3 text-small text-ink-2 inline-flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5 text-brand" />
                  {focusMinutes > 0
                    ? `تركيزك المربوط بهذه المهارة: ${formatMinutes(focusMinutes)}. كل جلسة جديدة تُضاف إلى رصيدها تلقائياً.`
                    : "اربط أولويات يومك بهذه المهارة، وستُحتسب جلسات تركيزك هنا تلقائياً."}
                </p>
                <p className="mt-3 text-caption text-ink-3">تدرّبت خارج التطبيق؟ أضفه يدوياً:</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <Button size="sm" variant="quiet" onClick={() => addSkillLoggedTime(skill.id, 0.5)}>
                    + 30 دقيقة
                  </Button>
                  <Button size="sm" variant="quiet" onClick={() => addSkillLoggedTime(skill.id, 1)}>
                    + ساعة
                  </Button>
                  <Button size="sm" variant="quiet" onClick={() => addSkillLoggedTime(skill.id, 1.5)}>
                    + جلسة 90 دقيقة
                  </Button>
                </div>
              </Card>

              {practiceNote && (
                <p role="status" className="rounded-xl bg-brand-soft text-brand px-4 py-2.5 text-ui animate-rise-in">
                  {practiceNote}
                </p>
              )}
              <div className="grid gap-4 md:grid-cols-3">
                {COLUMNS.map((col) => {
                  const items = skill.elements.filter((e) => e.category === col.id);
                  const Icon = col.icon;
                  return (
                    <Card as="section" key={col.id} className="p-5 flex flex-col">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-lead font-semibold text-ink inline-flex items-center gap-2">
                          <Icon className="w-4 h-4 text-brand" strokeWidth={1.8} />
                          {col.title}
                        </h3>
                        <span className="text-small text-ink-3 tabular">
                          {items.filter((i) => i.isMastered).length} من {items.length}
                        </span>
                      </div>
                      <p className="text-small text-ink-2 mt-1">{col.hint}</p>
                      <ul className="mt-3 space-y-1 flex-1">
                        {items.map((item) => (
                          <li key={item.id} className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 -mx-2 hover:bg-surface-2 transition">
                            <button
                              type="button"
                              onClick={() => toggleSkillElement(skill.id, item.id)}
                              aria-label={item.isMastered ? "إلغاء الإتقان" : "أتقنته"}
                              className={cn(
                                "w-5 h-5 mt-0.5 shrink-0 rounded-full border-[1.5px] inline-flex items-center justify-center transition",
                                item.isMastered ? "bg-brand border-brand text-brand-ink" : "border-ink-3/60 text-transparent hover:border-brand"
                              )}
                            >
                              <Check className="w-3 h-3" strokeWidth={3} />
                            </button>
                            <span className={cn("flex-1 text-ui leading-relaxed", item.isMastered ? "text-ink-3 line-through" : "text-ink")}>
                              {item.content}
                            </span>
                            {!item.isMastered && (
                              <button
                                type="button"
                                onClick={() => practiceToday(item.content)}
                                title="تدرّب عليها اليوم"
                                aria-label={`اجعل «${item.content}» من أولويات اليوم`}
                                className="w-6 h-6 shrink-0 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-brand sm:opacity-0 sm:group-hover:opacity-100 transition"
                              >
                                <Target className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteSkillElement(skill.id, item.id)}
                              aria-label="حذف"
                              className="w-6 h-6 shrink-0 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-danger sm:opacity-0 sm:group-hover:opacity-100 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                      <form onSubmit={(e) => addElement(e, col.id)} className="mt-3 flex items-center gap-2 border-t border-line pt-3">
                        <Plus className="w-4 h-4 text-ink-3 shrink-0" />
                        <input
                          value={drafts[col.id]}
                          onChange={(e) => setDrafts((d) => ({ ...d, [col.id]: e.target.value }))}
                          placeholder={col.placeholder}
                          aria-label={`إضافة إلى ${col.title}`}
                          className="flex-1 bg-transparent text-ui text-ink placeholder:text-ink-3 focus:outline-none"
                        />
                      </form>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      <Sheet open={newOpen} onClose={() => setNewOpen(false)} title="مسار تعلّم جديد" size="sm">
        <form onSubmit={create} className="space-y-4 pt-2">
          <div>
            <Label htmlFor="skill-title">ما المهارة؟</Label>
            <Input id="skill-title" autoFocus required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="مثال: التصميم، البرمجة، لغة جديدة" />
          </div>
          {projects.length > 0 && (
            <div>
              <Label hint="اختياري: لأي مشروع تتعلّم هذه المهارة؟">ربطها بمشروع</Label>
              <div className="flex flex-wrap gap-2">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setNewProjectId((cur) => (cur === p.id ? null : p.id))}
                    aria-pressed={newProjectId === p.id}
                    className={cn(
                      "h-9 px-3 rounded-xl border text-small transition inline-flex items-center gap-1.5",
                      newProjectId === p.id ? "bg-brand-soft border-brand/40 text-brand font-medium" : "border-line text-ink-2 hover:border-ink-3"
                    )}
                  >
                    <FolderKanban className="w-3.5 h-3.5" />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="text-ui text-ink-2 rounded-xl bg-surface-2 p-3">
            ستلتزم بهذا المسار وحده حتى تُتم أول 20 ساعة، ولن تستطيع فتح مسار آخر قبلها. هكذا تتجاوز مرحلة الارتباك بدل القفز بين المصادر.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNewOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit">ابدأ المسار</Button>
          </div>
        </form>
      </Sheet>

      <Sheet open={Boolean(blocked)} onClose={() => setBlocked(null)} size="sm">
        <div className="text-center pt-2">
          <div className="w-12 h-12 rounded-full bg-accent-soft text-accent-strong mx-auto flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="font-display text-title font-semibold text-ink mt-4">ليس بعد</h2>
          <p className="text-ink-2 mt-2 leading-relaxed">{blocked}</p>
          <Button className="w-full mt-6" onClick={() => setBlocked(null)}>
            سأكمل مساري
          </Button>
        </div>
      </Sheet>
    </div>
  );
};

function ProjectLinks({
  linked,
  available,
  hasProjects,
  onLink,
  onUnlink,
}: {
  skillId: string;
  linked: Project[];
  available: Project[];
  hasProjects: boolean;
  onLink: (projectId: string) => void;
  onUnlink: (projectId: string) => void;
}) {
  const [picking, setPicking] = useState(false);

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-1.5 text-small text-ink-2">
        <FolderKanban className="w-3.5 h-3.5 text-brand" />
        {linked.length > 0 ? "لمشروع:" : "غير مرتبطة بمشروع"}
        {linked.map((p) => (
          <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-brand-soft text-brand pr-2.5 pl-1 py-0.5 text-caption font-medium">
            <Link href="/app/tools/projects" className="hover:underline underline-offset-2">
              {p.name}
            </Link>
            <button
              type="button"
              onClick={() => onUnlink(p.id)}
              aria-label={`فك الربط مع ${p.name}`}
              title="فك الربط"
              className="w-4 h-4 inline-flex items-center justify-center rounded-full hover:bg-brand/15 transition"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {!picking &&
          (available.length > 0 ? (
            <button type="button" onClick={() => setPicking(true)} className="text-small font-medium text-brand hover:underline underline-offset-4">
              + ربط بمشروع
            </button>
          ) : (
            !hasProjects && (
              <Link href="/app/tools/projects" className="text-small font-medium text-brand hover:underline underline-offset-4">
                + أنشئ مشروعاً
              </Link>
            )
          ))}
      </div>

      {picking && (
        <div className="mt-2 flex flex-wrap items-center gap-2 animate-rise-in">
          {available.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onLink(p.id);
                setPicking(false);
              }}
              className="h-8 px-3 rounded-xl border border-line text-small text-ink-2 hover:border-brand/50 hover:text-ink transition"
            >
              {p.name}
            </button>
          ))}
          <button type="button" onClick={() => setPicking(false)} className="text-small text-ink-3 hover:text-ink transition">
            إلغاء
          </button>
        </div>
      )}
    </div>
  );
}

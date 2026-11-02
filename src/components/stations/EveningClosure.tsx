"use client";

import React, { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { AlertTriangle, Check, Clock, Flag, FolderKanban, Link2, Lock, Plus, Settings2, Unlock, X } from "lucide-react";
import { useAppStore, type FrogLinks, type FrogTask } from "@/stores/useAppStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { ProjectPrioritySheet } from "@/components/today/ProjectPrioritySheet";
import { toLocalDateString } from "@/lib/utils";
import { habitLock, habitStats, isDue } from "@/lib/habits";
import { sendToInbox } from "@/lib/flow";
import { usePlannerStore } from "@/stores/usePlannerStore";
import Link from "next/link";
import { FrogLinkSheet, LineageLine } from "@/components/lineage/Lineage";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge, Card, Input, SectionHeader } from "@/components/ui/primitives";
import { FourGatesCheck } from "../audit/FourGatesCheck";

const TOMORROW_HINTS = [
  "الأثقل والأهم — ما يصعب تأجيله",
  "خطوة في مشروع نموك أو تعلّمك",
  "التزام محدد أو مهمة عاجلة (اختياري)",
];

/** Tomorrow's links also remember the project task a row came from, so finishing it finishes the task. */
type PlanLinks = FrogLinks & { projectTaskId?: string };

export const EveningClosure: React.FC = () => {
  const {
    binaryHabits,
    toggleBinaryHabit,
    addBinaryHabit,
    removeBinaryHabit,
    identityVotes,
    addIdentityVote,
    frogs,
    tomorrowFrogs,
    setTomorrowFrogs,
    isEveningLocked,
    commitEveningPlan,
    unlockMorningOverride,
    getTomorrowEvents,
    settings,
    values,
    habitHistory,
    currentDay,
    eveningQualityCheck,
    setEveningQualityCheck,
  } = useAppStore(
    useShallow((s) => ({
      binaryHabits: s.binaryHabits,
      toggleBinaryHabit: s.toggleBinaryHabit,
      addBinaryHabit: s.addBinaryHabit,
      removeBinaryHabit: s.removeBinaryHabit,
      identityVotes: s.identityVotes,
      addIdentityVote: s.addIdentityVote,
      frogs: s.frogs,
      tomorrowFrogs: s.tomorrowFrogs,
      setTomorrowFrogs: s.setTomorrowFrogs,
      isEveningLocked: s.isEveningLocked,
      commitEveningPlan: s.commitEveningPlan,
      unlockMorningOverride: s.unlockMorningOverride,
      getTomorrowEvents: s.getTomorrowEvents,
      settings: s.settings,
      values: s.values,
      habitHistory: s.habitHistory,
      currentDay: s.currentDay,
      eveningQualityCheck: s.eveningQualityCheck,
      setEveningQualityCheck: s.setEveningQualityCheck,
    }))
  );
  const todayQualityPassed = eveningQualityCheck ? eveningQualityCheck[currentDay] : undefined;
  const habitsToday = binaryHabits.filter((h) => !h.archived && isDue(h, currentDay));
  const projects = useProjectsStore((s) => s.projects);

  // Tomorrow's rows start from the plan already made, or from what is still open today.
  const carry = (tomorrowFrogs?.length ? [...tomorrowFrogs] : frogs.filter((f) => !f.isCompleted)).sort((a, b) => a.order - b.order);
  const initialTitle = (order: number) => carry[order - 1]?.title ?? "";
  const [movedNote, setMovedNote] = useState<string | null>(null);

  const [voteText, setVoteText] = useState("");
  const [plan, setPlan] = useState([initialTitle(1), initialTitle(2), initialTitle(3)]);
  const initialLinks = (order: number): PlanLinks => {
    const f = carry[order - 1];
    return { projectId: f?.projectId, skillId: f?.skillId, projectTaskId: f?.projectTaskId };
  };
  const [planLinks, setPlanLinks] = useState<PlanLinks[]>([initialLinks(1), initialLinks(2), initialLinks(3)]);
  const [pickingRow, setPickingRow] = useState<number | null>(null);
  // Tomorrow can come from the matrix too: what's important first, then the inbox.
  const plannerTasks = usePlannerStore((s) => s.tasks);
  const RANK: Record<string, number> = { QUALITY: 0, EMERGENCY: 1, INBOX: 2, DELEGATE: 3, ESCAPE: 4 };
  const matrixSuggestions = plannerTasks
    .filter((t) => !t.isCompleted && t.category !== "ESCAPE" && !plan.some((p) => p.trim() === t.title.trim()))
    .sort((a, b) => RANK[a.category] - RANK[b.category])
    .slice(0, 6);
  const freeRow = plan.findIndex((p) => !p.trim());
  const [voteValue, setVoteValue] = useState<string | null>(null);
  const [linkingRow, setLinkingRow] = useState<number | null>(null);
  const [editingHabits, setEditingHabits] = useState(false);
  const [newHabit, setNewHabit] = useState("");

  const doneFrogs = frogs.filter((f) => f.isCompleted).length;
  const doneHabits = habitsToday.filter((h) => h.isCompleted).length;
  const tomorrowStr = toLocalDateString(new Date(Date.now() + 86_400_000));
  const tomorrowEvents = [
    ...getTomorrowEvents(),
    ...projects
      .filter((p) => p.targetDate === tomorrowStr)
      .map((p) => ({ id: `deadline-${p.id}`, title: `موعد تسليم: ${p.name}`, time: undefined as string | undefined, deadline: true })),
  ];
  // Today's finished priorities are the most honest identity votes there are.
  const voteSuggestions = frogs.filter((f) => f.isCompleted).map((f) => `أنجزت «${f.title}»`);
  const todayVote = identityVotes[0];

  const submitVote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voteText.trim()) return;
    addIdentityVote(voteValue ? `${voteText.trim()} — لقيمة: ${voteValue}` : voteText.trim());
    setVoteText("");
    setVoteValue(null);
  };

  const submitHabit = (e: React.FormEvent) => {
    e.preventDefault();
    addBinaryHabit(newHabit);
    setNewHabit("");
  };

  const commitTomorrow = () => {
    const now = Date.now();
    const next: FrogTask[] = plan
      .map((t, row) => ({ title: t.trim(), links: planLinks[row] }))
      .filter((x) => x.title)
      .map(({ title, links }, i) => ({
        id: `frog-tomorrow-${i + 1}-${now}`,
        title,
        order: i + 1,
        isCompleted: false,
        category: i === 2 ? "EMERGENCY" : "QUALITY",
        createdAt: new Date().toISOString(),
        ...(links.projectId ? { projectId: links.projectId } : {}),
        ...(links.skillId ? { skillId: links.skillId } : {}),
        ...(links.projectTaskId ? { projectTaskId: links.projectTaskId } : {}),
      }));
    if (!next.length) return;
    setTomorrowFrogs(next);
    commitEveningPlan();

    // Anything open today that didn't make tomorrow's plan goes to the inbox instead of disappearing.
    // Project tasks are already safe in their project.
    const planned = new Set(next.map((f) => f.title));
    const inboxTitles = new Set(usePlannerStore.getState().tasks.filter((t) => t.category === "INBOX").map((t) => t.title));
    const left = frogs.filter((f) => !f.isCompleted && !f.projectTaskId && !planned.has(f.title) && !inboxTitles.has(f.title));
    left.forEach((f) => sendToInbox(f.title));
    setMovedNote(left.length ? `نقلنا ${left.length === 1 ? "أولوية لم تُنجز" : `${left.length} أولويات لم تُنجز`} إلى صندوق المهام، حتى لا تضيع.` : null);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Summary */}
      <Card className="p-6 sm:p-8">
        <Badge tone="accent">محطة المساء · 3 دقائق</Badge>
        <h2 className="font-display text-title-lg sm:text-heading-lg font-semibold text-ink mt-3">أغلق يومك بهدوء</h2>
        <p className="text-ink-2 mt-1 max-w-lg">جرد صادق بلا تبرير، صوت واحد لهويتك، ثم أولويات الغد قبل النوم.</p>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Summary label="أولويات أُنجزت" value={`${doneFrogs} من ${frogs.length || 3}`} />
          <Summary label="عادات اليوم" value={`${doneHabits} من ${habitsToday.length}`} />
          <Summary label="أصوات الهوية" value={String(identityVotes.length)} className="hidden sm:block" />
        </div>
      </Card>

      {/* INTJ-A Quality Gate (0 or 1) */}
      <Card as="section" className="p-5 sm:p-7 border-brand/20 bg-surface">
        <SectionHeader
          eyebrow="بوابة فحص الجودة · INTJ-A Quality Gate"
          title="فحص جودة اليوم (0 أو 1)"
          description="تقييم بروتوكولي صارم: هل نُفذت مهام اليوم بإتقان حقيقي واستيفاء كامل للـ DoD أم بدافع التخلص منها وشطبها فقط؟"
        />
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => setEveningQualityCheck(currentDay, true)}
            aria-pressed={todayQualityPassed === true}
            className={cn(
              "flex-1 flex items-center justify-between p-4 rounded-xl border text-right transition cursor-pointer",
              todayQualityPassed === true
                ? "bg-brand-soft border-brand text-brand font-medium shadow-sm"
                : "bg-surface-2 border-line text-ink-2 hover:border-ink-3"
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "w-7 h-7 rounded-full border flex items-center justify-center transition shrink-0",
                  todayQualityPassed === true
                    ? "bg-brand border-brand text-brand-ink"
                    : "border-ink-3/50 text-transparent"
                )}
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
              </span>
              <div>
                <p className="text-body font-semibold text-ink">إتقان حقيقي واستيفاء كامل للـ DoD</p>
                <p className="text-caption text-ink-3 mt-0.5">تسليم وفق المعيار المحدد بنسبة 100% بلا مساومات (1)</p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setEveningQualityCheck(currentDay, false)}
            aria-pressed={todayQualityPassed === false}
            className={cn(
              "flex-1 flex items-center justify-between p-4 rounded-xl border text-right transition cursor-pointer",
              todayQualityPassed === false
                ? "bg-danger-soft border-danger/40 text-danger font-medium shadow-sm"
                : "bg-surface-2 border-line text-ink-2 hover:border-ink-3"
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "w-7 h-7 rounded-full border flex items-center justify-center transition shrink-0",
                  todayQualityPassed === false
                    ? "bg-danger border-danger text-white"
                    : "border-ink-3/50 text-transparent"
                )}
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </span>
              <div>
                <p className="text-body font-semibold text-ink">شطب سطحي / تفريغ ذمة</p>
                <p className="text-caption text-ink-3 mt-0.5">أُنجزت على عجل دون عمق أو هروباً من الذنب فقط (0)</p>
              </div>
            </div>
          </button>
        </div>
        {todayQualityPassed === true && (
          <p className="mt-3 text-caption text-brand inline-flex items-center gap-1.5 font-medium">
            <Check className="w-3.5 h-3.5" />
            تم توثيق إتقان اليوم (1) في ميزان الجودة وسجل المراجعة الأسبوعية.
          </p>
        )}
        {todayQualityPassed === false && (
          <p className="mt-3 text-caption text-danger inline-flex items-center gap-1.5 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            تم تسجيل الخلل بصدق (0). يُعاد ضبط معيار الـ DoD غداً لرفع جودة التنفيذ.
          </p>
        )}
      </Card>

      {/* Habits */}
      <Card as="section" className="p-5 sm:p-7">
        <SectionHeader
          title="عادات اليوم"
          description="نعم أو لا. التقييم الصادق أهم من الرقم الجميل."
          action={
            <Button size="sm" variant="ghost" onClick={() => setEditingHabits((v) => !v)}>
              <Settings2 className="w-4 h-4" />
              {editingHabits ? "تم" : "تعديل"}
            </Button>
          }
        />
        <ul className="mt-5 space-y-2">
          {habitsToday.map((h) => {
            const streak = habitStats(h, habitHistory, currentDay).streak;
            return (
            <li key={h.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleBinaryHabit(h.id)}
                aria-pressed={h.isCompleted}
                className={cn(
                  "flex-1 flex items-center gap-3 rounded-xl border px-4 h-12 text-right transition",
                  h.isCompleted ? "bg-brand-soft border-brand/30 text-ink" : "bg-surface border-line text-ink-2 hover:border-ink-3"
                )}
              >
                <span
                  className={cn(
                    "w-6 h-6 shrink-0 rounded-full border-[1.5px] inline-flex items-center justify-center transition",
                    h.isCompleted ? "bg-brand border-brand text-brand-ink" : "border-ink-3/60 text-transparent"
                  )}
                >
                  <Check className="w-3.5 h-3.5" strokeWidth={2.8} />
                </span>
                <span className="text-body flex-1 truncate">{h.title}</span>
                {streak > 0 && (
                  <span className="shrink-0 text-caption text-accent-strong tabular" title="سلسلة الأيام">
                    {streak} يوم
                  </span>
                )}
              </button>
              {editingHabits &&
                (habitLock(h, habitHistory, currentDay).locked ? (
                  <span
                    className="w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-full text-ink-3"
                    title={`ملتزم بها حتى يكتمل الـ21 يوماً (بقي ${habitLock(h, habitHistory, currentDay).daysLeft})`}
                    aria-label="لا تُحذف قبل 21 يوماً"
                  >
                    <Lock className="w-4 h-4" />
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => removeBinaryHabit(h.id)}
                    aria-label={`حذف ${h.title}`}
                    className="w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-danger hover:bg-danger-soft transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ))}
            </li>
            );
          })}
        </ul>
        <Link
          href="/app/tools/habits"
          className="mt-4 inline-block text-small font-medium text-brand hover:underline underline-offset-4"
        >
          سلاسلك وأسابيعك في متابعة العادات
        </Link>
        {editingHabits && (
          <form onSubmit={submitHabit} className="mt-3 flex gap-2">
            <Input value={newHabit} onChange={(e) => setNewHabit(e.target.value)} placeholder="عادة جديدة، مثال: قراءة 10 صفحات" />
            <Button type="submit" variant="secondary" disabled={!newHabit.trim()}>
              <Plus className="w-4 h-4" />
              إضافة
            </Button>
          </form>
        )}
      </Card>

      {settings.faithContent && <FourGatesCheck />}

      {/* Identity vote */}
      <Card as="section" className="p-5 sm:p-7">
        <SectionHeader
          title="صوت لهويتك"
          description="ما الفعل الملموس الذي قمت به اليوم وكان تصويتاً للشخص الذي تريد أن تكونه؟"
        />
        <form onSubmit={submitVote} className="mt-5 flex flex-col sm:flex-row gap-2">
          <Input
            value={voteText}
            onChange={(e) => setVoteText(e.target.value)}
            placeholder="مثال: أكملت جلسة تركيز دون أن ألمس الهاتف"
          />
          <Button type="submit" disabled={!voteText.trim()} className="shrink-0">
            تسجيل
          </Button>
        </form>
        {voteSuggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-caption text-ink-3 ml-1">من يومك:</span>
            {voteSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setVoteText(s)}
                className="h-8 px-2.5 rounded-full border border-line text-small text-ink-2 hover:border-brand/50 hover:text-brand transition max-w-full truncate"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {values.length > 0 && voteText.trim() && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-caption text-ink-3 ml-1">لأي قيمة؟</span>
            {values.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVoteValue(voteValue === v.title ? null : v.title)}
                aria-pressed={voteValue === v.title}
                className={cn(
                  "h-8 px-3 rounded-full border text-small transition",
                  voteValue === v.title ? "bg-brand-soft border-brand/40 text-brand font-medium" : "border-line text-ink-2 hover:border-ink-3"
                )}
              >
                {v.title}
              </button>
            ))}
          </div>
        )}
        {todayVote && (
          <p className="mt-4 text-ui text-ink-2 border-r-2 border-accent pr-3">
            آخر صوت: <span className="text-ink">{todayVote.voteText}</span>
          </p>
        )}
      </Card>

      {/* Tomorrow */}
      <Card as="section" className="p-5 sm:p-7">
        <SectionHeader
          title="أولويات الغد"
          description="اعتمدها الليلة لتستيقظ وقرارك جاهز، فلا تستنزف صباحك في التفكير."
          action={isEveningLocked ? <Badge tone="brand"><Lock className="w-3.5 h-3.5" />معتمدة</Badge> : undefined}
        />

        {tomorrowEvents.length > 0 && (
          <div className="mt-5 rounded-xl bg-accent-soft/70 p-4">
            <p className="text-small font-medium text-accent-strong mb-2">التزامات ثابتة غداً — خطّط حولها</p>
            <ul className="space-y-1.5">
              {tomorrowEvents.map((ev) => (
                <li key={ev.id} className="flex items-center justify-between gap-3 text-ui">
                  <span className="text-ink truncate inline-flex items-center gap-1.5">
                    {"deadline" in ev && ev.deadline && <Flag className="w-3.5 h-3.5 text-danger shrink-0" />}
                    {ev.title}
                  </span>
                  {ev.time && (
                    <span className="shrink-0 inline-flex items-center gap-1 text-ink-2 text-small">
                      <Clock className="w-3.5 h-3.5" />
                      {ev.time}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 space-y-2.5">
          {plan.map((value, i) => (
            <div key={i}>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 shrink-0 inline-flex items-center justify-center rounded-full bg-surface-2 text-small font-semibold text-ink-2 tabular">
                  {i + 1}
                </span>
                <Input
                  value={value}
                  disabled={isEveningLocked}
                  onChange={(e) => {
                    setPlan((p) => p.map((x, j) => (j === i ? e.target.value : x)));
                    if (planLinks[i].projectTaskId) {
                      setPlanLinks((l) => l.map((x, j) => (j === i ? { projectId: x.projectId, skillId: x.skillId } : x)));
                    }
                  }}
                  placeholder={TOMORROW_HINTS[i]}
                  aria-label={`أولوية الغد ${i + 1}`}
                  className="disabled:bg-surface-2 disabled:text-ink-2"
                />
                {projects.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPickingRow(i)}
                    disabled={isEveningLocked}
                    aria-label={`اختر أولوية الغد ${i + 1} من مشاريعك`}
                    title="اختر من مشاريعك"
                    className="shrink-0 w-10 h-10 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-brand hover:bg-brand-soft transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FolderKanban className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setLinkingRow(i)}
                  disabled={isEveningLocked || !value.trim()}
                  aria-label={`ربط أولوية الغد ${i + 1} بمشروع أو مهارة`}
                  title="ربط بمشروع أو مهارة"
                  className={cn(
                    "shrink-0 w-10 h-10 inline-flex items-center justify-center rounded-full transition disabled:opacity-40 disabled:cursor-not-allowed",
                    planLinks[i].projectId || planLinks[i].skillId
                      ? "text-brand hover:bg-brand-soft"
                      : "text-ink-3 hover:text-ink hover:bg-surface-2"
                  )}
                >
                  <Link2 className="w-4 h-4" />
                </button>
              </div>
              <LineageLine links={planLinks[i]} className="mt-1 pr-10" />
            </div>
          ))}
        </div>

        {!isEveningLocked && matrixSuggestions.length > 0 && (
          <div className="mt-4">
            <p className="text-small text-ink-3 mb-2">من مصفوفة الأولويات:</p>
            <div className="flex flex-wrap gap-2">
              {matrixSuggestions.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={freeRow < 0}
                  onClick={() => setPlan((p) => p.map((x, j) => (j === freeRow ? t.title : x)))}
                  title={freeRow < 0 ? "الخانات الثلاث ممتلئة" : "أضفها إلى أولويات الغد"}
                  className="max-w-full truncate rounded-xl border border-dashed border-line-strong px-3 py-1.5 text-small text-ink-2 hover:border-brand hover:text-ink transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="inline w-3.5 h-3.5 ml-1 -mt-0.5" />
                  {t.title}
                  {t.category === "INBOX" && <span className="text-ink-3"> · صندوق المهام</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          {isEveningLocked ? (
            <>
              <div>
                <p className="text-ui text-brand inline-flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  خطة الغد جاهزة. نوماً هنيئاً.
                </p>
                {movedNote && <p className="text-small text-ink-2 mt-1">{movedNote}</p>}
              </div>
              <Button variant="ghost" size="sm" onClick={unlockMorningOverride}>
                <Unlock className="w-4 h-4" />
                تعديل
              </Button>
            </>
          ) : (
            <Button onClick={commitTomorrow} disabled={!plan.some((p) => p.trim())} className="w-full sm:w-auto">
              <Lock className="w-4 h-4" />
              اعتماد أولويات الغد
            </Button>
          )}
        </div>
      </Card>

      <ProjectPrioritySheet
        open={pickingRow !== null}
        title="أولوية الغد من مشاريعك"
        onClose={() => setPickingRow(null)}
        onPick={(t) => {
          if (pickingRow === null) return;
          const row = pickingRow;
          setPlan((p) => p.map((x, j) => (j === row ? t.title : x)));
          setPlanLinks((l) => l.map((x, j) => (j === row ? { projectId: t.projectId, skillId: t.skillId, projectTaskId: t.taskId } : x)));
        }}
      />

      <FrogLinkSheet
        open={linkingRow !== null}
        title={linkingRow !== null ? plan[linkingRow] : undefined}
        initial={linkingRow !== null ? planLinks[linkingRow] : {}}
        onClose={() => setLinkingRow(null)}
        onSave={(links) => {
          if (linkingRow !== null)
            setPlanLinks((l) =>
              l.map((x, j) =>
                // Re-linking to another project drops the tie to the old project's task.
                j === linkingRow ? { ...links, ...(links.projectId === x.projectId && x.projectTaskId ? { projectTaskId: x.projectTaskId } : {}) } : x
              )
            );
          setLinkingRow(null);
        }}
      />
    </div>
  );
};

function Summary({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("rounded-xl bg-surface-2 px-4 py-3", className)}>
      <p className="font-display text-title-lg font-medium text-ink tabular leading-tight">
        {value}
      </p>
      <p className="text-small text-ink-2 mt-0.5">{label}</p>
    </div>
  );
}

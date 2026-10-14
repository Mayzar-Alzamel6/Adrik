"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useShallow } from "zustand/react/shallow";
import { Archive, ArchiveRestore, Check, Flame, Heart, Layers, Lock, Pencil, Plus, Repeat, Sparkles, Trash2, Trophy, TriangleAlert } from "lucide-react";
import { starterHabitOptions, useAppStore, type BinaryHabit } from "@/stores/useAppStore";
import {
  HABIT_COMMITMENT_DAYS,
  HABIT_GRACE_HOURS,
  WEEKDAYS,
  habitLock,
  habitStart,
  habitStats,
  isDone,
  isDue,
  lastDays,
  overallRate,
  parseDay,
  shiftDay,
  weekday,
  type HabitHistory,
} from "@/lib/habits";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge, Card, EmptyState, SectionHeader } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";
import { HabitForm, draftFromHabit, emptyDraft, type HabitDraft } from "./HabitForm";

const DAY_NUM = new Intl.DateTimeFormat("ar", { day: "numeric" });
const DAY_FULL = new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long" });

/** Habit tracking: a week you can tick (and catch up on), streaks that forgive one slip, and a 12-week map per habit. */
export function HabitTracker() {
  const {
    binaryHabits,
    habitHistory,
    currentDay,
    values,
    skills,
    goalIdentities,
    settings,
    setHabitDay,
    addBinaryHabit,
    updateHabit,
    removeBinaryHabit,
  } = useAppStore(
    useShallow((s) => ({
      binaryHabits: s.binaryHabits,
      habitHistory: s.habitHistory,
      currentDay: s.currentDay,
      values: s.values,
      skills: s.skills,
      goalIdentities: s.goalIdentities,
      settings: s.settings,
      setHabitDay: s.setHabitDay,
      addBinaryHabit: s.addBinaryHabit,
      updateHabit: s.updateHabit,
      removeBinaryHabit: s.removeBinaryHabit,
    }))
  );
  const today = currentDay;
  const week = lastDays(today, 7);
  const active = binaryHabits.filter((h) => !h.archived);
  const archived = binaryHabits.filter((h) => h.archived);
  const stats = useMemo(
    () => new Map(binaryHabits.filter((h) => !h.archived).map((h) => [h.id, habitStats(h, habitHistory, today)])),
    [binaryHabits, habitHistory, today]
  );

  const [formOpen, setFormOpen] = useState<null | { mode: "add"; draft: HabitDraft } | { mode: "edit"; habit: BinaryHabit }>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = binaryHabits.find((h) => h.id === detailId);

  const dueToday = active.filter((h) => isDue(h, today));
  const doneToday = dueToday.filter((h) => isDone(habitHistory, h.id, today)).length;
  const rate30 = overallRate(active, habitHistory, lastDays(today, 30), today);
  const longest = Math.max(0, ...[...stats.values()].map((s) => s.streak));
  const atRisk = active.filter((h) => {
    const s = stats.get(h.id)!;
    return s.dueToday && !s.doneToday && s.missedLast && s.streak > 0;
  });

  // Suggestions come from what the user already wrote: each value's daily behaviour, each goal's habit.
  // With faith content on, the prayer and wird habits wait here too: a habit is a 21-day commitment, never added for the user.
  const titles = new Set(binaryHabits.map((h) => h.title.trim()));
  const faithValue = values.find((v) => v.id === "val-faith");
  const suggestions = [
    ...(settings.faithContent ? starterHabitOptions(true).filter((h) => h.id.startsWith("h-faith")) : [])
      .filter((h) => !binaryHabits.some((b) => b.id === h.id) && !titles.has(h.title))
      .map((h) => ({ key: `f-${h.id}`, from: faithValue?.title ?? "المحتوى الإيماني", draft: emptyDraft({ title: h.title, valueId: faithValue?.id }) })),
    ...values
      .filter((v) => v.dailyAction && !titles.has(v.dailyAction.trim()) && !binaryHabits.some((h) => !h.archived && h.valueId === v.id))
      .map((v) => ({ key: `v-${v.id}`, from: v.title, draft: emptyDraft({ title: v.dailyAction, valueId: v.id }) })),
    ...goalIdentities
      .filter((g) => g.microHabit && !titles.has(g.microHabit.trim()))
      .map((g) => ({
        key: `g-${g.id}`,
        from: g.goal,
        draft: emptyDraft({ title: g.microHabit, valueId: values.find((v) => v.title === g.coreValue)?.id }),
      })),
  ].slice(0, 6);

  const save = (d: HabitDraft) => {
    const input = { cue: d.cue || undefined, minimum: d.minimum || undefined, days: d.days, valueId: d.valueId, skillId: d.skillId };
    if (formOpen?.mode === "edit") updateHabit(formOpen.habit.id, { title: d.title, ...input });
    else addBinaryHabit(d.title, input);
    setFormOpen(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat label="عادات اليوم" value={`${doneToday} من ${dueToday.length}`} tone="brand" />
        <Stat label="الالتزام في 30 يوماً" value={`${rate30}%`} tone={rate30 >= 70 ? "brand" : "accent"} />
        <Stat label="أطول سلسلة الآن" value={String(longest)} icon={Flame} tone="accent" />
        <Stat label="عادات نشطة" value={String(active.length)} tone="neutral" />
      </div>

      {atRisk.length > 0 && (
        <Card className="p-4 sm:p-5 bg-accent-soft/60 border-accent/30">
          <p className="text-body font-medium text-ink inline-flex items-center gap-2">
            <TriangleAlert className="w-4 h-4 text-accent-strong" />
            لا تفوّتها مرتين
          </p>
          <p className="text-ui text-ink-2 mt-1">فاتتك مرة. مرة واحدة لا تهدم شيئاً، لكن اليوم يقرّر إن كانت السلسلة ستبقى.</p>
          <ul className="mt-3 space-y-2">
            {atRisk.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHabitDay(h.id, today, true)}
                  className="h-9 px-3 rounded-xl bg-surface border border-line text-ui text-ink hover:border-brand inline-flex items-center gap-2"
                >
                  <Check className="w-4 h-4 text-brand" />
                  {h.title}
                </button>
                {h.minimum && <span className="text-small text-ink-2">النسخة الصغرى تكفي: {h.minimum}</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card as="section" className="p-5 sm:p-7">
        <SectionHeader
          title="أسبوعك"
          description="اضغط أي يوم لتسجيله. نسيت أمس؟ سجّله الآن بصدق."
          action={
            <Button onClick={() => setFormOpen({ mode: "add", draft: emptyDraft() })}>
              <Plus className="w-4 h-4" />
              عادة جديدة
            </Button>
          }
        />

        {active.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="لا عادات بعد"
            description="ابدأ بعادة واحدة صغيرة جداً. الثبات أولاً، ثم الحجم."
            className="py-8"
          />
        ) : (
          <>
            <div className="mt-6 flex items-end gap-2 sm:gap-3 pb-2 border-b border-line">
              <span className="hidden sm:block flex-1" />
              <div className="flex gap-1 sm:gap-1.5">
                {week.map((d) => (
                  <span key={d} className={cn("w-8 sm:w-9 text-center text-caption", d === today ? "text-brand font-semibold" : "text-ink-3")}>
                    {weekday(parseDay(d).getDay()).short}
                    <span className="block tabular">{DAY_NUM.format(parseDay(d))}</span>
                  </span>
                ))}
              </div>
              <span className="w-12 sm:w-16 text-caption text-ink-3 text-center">سلسلة</span>
            </div>
            <ul className="divide-y divide-line">
              {active.map((h) => (
                <HabitRow
                  key={h.id}
                  habit={h}
                  week={week}
                  today={today}
                  history={habitHistory}
                  streak={stats.get(h.id)!.streak}
                  locked={habitLock(h, habitHistory, today).locked}
                  valueTitle={values.find((v) => v.id === h.valueId)?.title}
                  onToggle={(d) => setHabitDay(h.id, d, !isDone(habitHistory, h.id, d))}
                  onOpen={() => setDetailId(h.id)}
                />
              ))}
            </ul>
          </>
        )}
      </Card>

      {suggestions.length > 0 && (
        <Card as="section" className="p-5 sm:p-7">
          <SectionHeader title="عادات تنتظرك" description="من سلوك قيمك اليومي وعادات أهدافك التي كتبتها في دستور القيم. اختر واحدة إن كنت مستعداً لـ21 يوماً." />
          <div className="mt-4 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setFormOpen({ mode: "add", draft: s.draft })}
                className="text-right rounded-xl2 border border-dashed border-line-strong px-3.5 py-2.5 hover:border-brand transition max-w-full"
              >
                <span className="block text-ui text-ink">{s.draft.title}</span>
                <span className="block text-caption text-accent-strong mt-0.5">من: {s.from}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {archived.length > 0 && (
        <details className="rounded-xl2 border border-line bg-surface p-5">
          <summary className="cursor-pointer text-ui font-medium text-ink-2">عادات مؤرشفة ({archived.length})</summary>
          <ul className="mt-3 divide-y divide-line">
            {archived.map((h) => (
              <li key={h.id} className="py-2.5 flex items-center gap-2">
                <span className="flex-1 text-ui text-ink-2">{h.title}</span>
                <Button size="sm" variant="ghost" onClick={() => updateHabit(h.id, { archived: false })}>
                  <ArchiveRestore className="w-4 h-4" />
                  استعادة
                </Button>
                <button
                  type="button"
                  onClick={() => removeBinaryHabit(h.id)}
                  aria-label={`حذف ${h.title} نهائياً`}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-danger hover:bg-danger-soft"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <Sheet
        open={Boolean(formOpen)}
        onClose={() => setFormOpen(null)}
        title={formOpen?.mode === "edit" ? "تعديل العادة" : "عادة جديدة"}
        description="صغيرة، ومحددة الموعد، ومربوطة بقيمة. هكذا تبقى."
        size="md"
      >
        {formOpen && (
          <HabitForm
            initial={formOpen.mode === "edit" ? draftFromHabit(formOpen.habit) : formOpen.draft}
            submitLabel={formOpen.mode === "edit" ? "حفظ" : "أضف العادة"}
            onSubmit={save}
            onCancel={() => setFormOpen(null)}
          />
        )}
      </Sheet>

      <Sheet open={Boolean(detail)} onClose={() => setDetailId(null)} title={detail?.title} size="md">
        {detail && (
          <HabitDetail
            habit={detail}
            history={habitHistory}
            today={today}
            valueTitle={values.find((v) => v.id === detail.valueId)?.title}
            skillTitle={skills.find((s) => s.id === detail.skillId)?.title}
            onEdit={() => {
              setDetailId(null);
              setFormOpen({ mode: "edit", habit: detail });
            }}
            onArchive={() => {
              updateHabit(detail.id, { archived: true });
              setDetailId(null);
            }}
          />
        )}
      </Sheet>
    </div>
  );
}

function HabitRow({
  habit,
  week,
  today,
  history,
  streak,
  valueTitle,
  onToggle,
  onOpen,
  locked,
}: {
  locked: boolean;
  habit: BinaryHabit;
  week: string[];
  today: string;
  history: HabitHistory;
  streak: number;
  valueTitle?: string;
  onToggle: (day: string) => void;
  onOpen: () => void;
}) {
  return (
    <li className="py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
      <button type="button" onClick={onOpen} className="flex-1 min-w-0 text-right group">
        <span className="flex items-center gap-1.5 text-body font-medium text-ink group-hover:text-brand transition min-w-0">
          <span className="truncate">{habit.title}</span>
          {locked && <Lock className="w-3.5 h-3.5 text-ink-3 shrink-0" aria-label="ملتزم بها 21 يوماً" />}
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-caption text-ink-3">
          {habit.cue && <span>بعد أن {habit.cue}</span>}
          {valueTitle && (
            <span className="inline-flex items-center gap-1 text-accent-strong">
              <Heart className="w-3 h-3" />
              {valueTitle}
            </span>
          )}
          {habit.days?.length ? (
            <span>
              {WEEKDAYS.filter((w) => habit.days!.includes(w.day))
                .map((w) => w.short)
                .join(" ")}
            </span>
          ) : null}
        </span>
      </button>
      <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto">
        <div className="flex gap-1 sm:gap-1.5">
          {week.map((d) => {
            const done = isDone(history, habit.id, d);
            const due = isDue(habit, d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => onToggle(d)}
                aria-pressed={done}
                aria-label={`${habit.title} — ${DAY_FULL.format(parseDay(d))}${due ? "" : " (ليس من أيامها)"}`}
                title={DAY_FULL.format(parseDay(d))}
                className={cn(
                  "w-8 h-8 sm:w-9 sm:h-9 rounded-lg inline-flex items-center justify-center transition",
                  done
                    ? "bg-brand text-brand-ink"
                    : due
                    ? "border border-line-strong text-transparent hover:border-brand"
                    : "border border-dashed border-line text-transparent",
                  d === today && !done && "ring-2 ring-brand/30"
                )}
              >
                <Check className="w-4 h-4" strokeWidth={2.8} />
              </button>
            );
          })}
        </div>
        <span
          className={cn(
            "w-12 sm:w-16 inline-flex items-center justify-center gap-1 text-ui tabular",
            streak > 0 ? "text-accent-strong font-semibold" : "text-ink-3"
          )}
          title="سلسلة الأيام المتتالية"
        >
          <Flame className="w-4 h-4" />
          {streak}
        </span>
      </div>
    </li>
  );
}

function HabitDetail({
  habit,
  history,
  today,
  valueTitle,
  skillTitle,
  onEdit,
  onArchive,
}: {
  habit: BinaryHabit;
  history: HabitHistory;
  today: string;
  valueTitle?: string;
  skillTitle?: string;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const s = habitStats(habit, history, today);
  const start = habitStart(habit, history, today);
  const lock = habitLock(habit, history, today);
  // 12 full weeks, Saturday-first columns like the rest of the app, ending with the current week.
  const thisSaturday = shiftDay(today, -((parseDay(today).getDay() + 1) % 7));
  const firstSaturday = shiftDay(thisSaturday, -7 * 11);
  const weeks = Array.from({ length: 12 }, (_, w) => Array.from({ length: 7 }, (_, d) => shiftDay(firstSaturday, w * 7 + d)));

  return (
    <div className="space-y-5 pt-2">
      <div className="flex flex-wrap gap-2">
        {valueTitle && (
          <Badge tone="accent">
            <Heart className="w-3 h-3" />
            {valueTitle}
          </Badge>
        )}
        {skillTitle && (
          <Badge tone="neutral">
            <Layers className="w-3 h-3" />
            {skillTitle}
          </Badge>
        )}
        {habit.cue && <Badge tone="neutral">بعد أن {habit.cue}</Badge>}
      </div>
      {habit.minimum && (
        <p className="text-ui text-ink-2 inline-flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-accent-strong" />
          النسخة الصغرى: <span className="text-ink">{habit.minimum}</span>
        </p>
      )}

      <CommitmentBar lock={lock} />

      <div className="grid grid-cols-4 gap-2">
        <Mini label="السلسلة" value={s.streak} icon={Flame} />
        <Mini label="الأفضل" value={s.best} icon={Trophy} />
        <Mini label="30 يوماً" value={`${s.rate30}%`} />
        <Mini label="مجموع" value={s.totalDone} />
      </div>

      <div>
        <p className="text-small text-ink-3 mb-2">آخر 12 أسبوعاً</p>
        <div className="flex gap-1 overflow-x-auto pb-1">
          <div className="flex flex-col gap-1 pl-1">
            {WEEKDAYS.map((w) => (
              <span key={w.day} className="h-4 text-[10px] leading-4 text-ink-3">
                {w.short}
              </span>
            ))}
          </div>
          {weeks.map((days, i) => (
            <div key={i} className="flex flex-col gap-1">
              {days.map((d) => {
                const future = d > today;
                const before = d < start;
                const done = isDone(history, habit.id, d);
                return (
                  <span
                    key={d}
                    title={DAY_FULL.format(parseDay(d))}
                    className={cn(
                      "w-4 h-4 rounded-[4px]",
                      future
                        ? "bg-transparent"
                        : before
                        ? "bg-surface-2/50"
                        : done
                        ? "bg-brand"
                        : isDue(habit, d)
                        ? "bg-line"
                        : "bg-surface-2",
                      d === today && "ring-1 ring-ink"
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <p className="text-caption text-ink-3 mt-2">
          السلسلة تتحمّل يوماً فائتاً واحداً، وتنقطع بيومين متتاليين. القاعدة: لا تفوّتها مرتين.
        </p>
      </div>

      <div className="flex flex-wrap justify-between gap-2 pt-2 border-t border-line">
        <Link href="/app/vision" className="text-small font-medium text-brand hover:underline underline-offset-4 pt-3">
          مكانها في خريطة الرؤية
        </Link>
        {lock.locked ? (
          <p className="pt-3 text-small text-ink-3 inline-flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            التعديل والأرشفة بعد {lock.daysLeft} {lock.daysLeft === 1 ? "يوم" : "يوماً"}
          </p>
        ) : (
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={onArchive}>
              <Archive className="w-4 h-4" />
              أرشفة
            </Button>
            <Button variant="secondary" size="sm" onClick={onEdit}>
              <Pencil className="w-4 h-4" />
              تعديل
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Day N of 21: the commitment made visible, and why the edit buttons wait. */
function CommitmentBar({ lock }: { lock: ReturnType<typeof habitLock> }) {
  if (!lock.locked && !lock.inGrace) {
    return (
      <p className="rounded-xl bg-brand-soft text-brand px-4 py-2.5 text-ui inline-flex items-center gap-2">
        <Trophy className="w-4 h-4" />
        أتممت التزام الـ{HABIT_COMMITMENT_DAYS} يوماً. صارت جزءاً منك — عدّلها إن احتجت.
      </p>
    );
  }
  return (
    <div className="rounded-xl2 border border-line p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-ui font-medium text-ink inline-flex items-center gap-1.5">
          <Lock className="w-4 h-4 text-accent-strong" />
          التزام {HABIT_COMMITMENT_DAYS} يوماً
        </p>
        <span className="text-small text-ink-2 tabular">
          اليوم {lock.day} من {HABIT_COMMITMENT_DAYS}
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div className="h-full rounded-full bg-accent" style={{ width: `${(lock.day / HABIT_COMMITMENT_DAYS) * 100}%` }} />
      </div>
      <p className="text-small text-ink-3 mt-2">
        {lock.inGrace
          ? `أول ${HABIT_GRACE_HOURS} ساعة مفتوحة لتصحيح ما كتبت، ثم تُقفل حتى يكتمل الالتزام.`
          : "لا تعديل ولا أرشفة قبل اكتماله. العادة تحتاج وقتها لتثبت، والتغيير المبكر هروب لطيف."}
      </p>
    </div>
  );
}

function Stat({ label, value, tone, icon: Icon }: { label: string; value: string; tone: "brand" | "accent" | "neutral"; icon?: typeof Flame }) {
  return (
    <Card className="p-4">
      <p className="text-small text-ink-3">{label}</p>
      <p
        className={cn(
          "font-display text-heading font-medium tabular mt-2 leading-none inline-flex items-center gap-1.5",
          tone === "brand" ? "text-brand" : tone === "accent" ? "text-accent-strong" : "text-ink"
        )}
      >
        {Icon && <Icon className="w-5 h-5" />}
        {value}
      </p>
    </Card>
  );
}

function Mini({ label, value, icon: Icon }: { label: string; value: number | string; icon?: typeof Flame }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5 text-center">
      <p className="font-display text-title font-medium text-ink tabular leading-none inline-flex items-center gap-1">
        {Icon && <Icon className="w-4 h-4 text-accent-strong" />}
        {value}
      </p>
      <p className="text-caption text-ink-3 mt-1">{label}</p>
    </div>
  );
}

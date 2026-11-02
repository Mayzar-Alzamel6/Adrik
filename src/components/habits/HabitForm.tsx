"use client";

import React, { useState } from "react";
import { useAppStore, type BinaryHabit } from "@/stores/useAppStore";
import { HABIT_COMMITMENT_DAYS, HABIT_GRACE_HOURS, WEEKDAYS } from "@/lib/habits";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/primitives";

export interface HabitDraft {
  title: string;
  cue: string;
  minimum: string;
  days: number[];
  valueId?: string;
  skillId?: string;
}

export const emptyDraft = (over: Partial<HabitDraft> = {}): HabitDraft => ({
  title: "",
  cue: "",
  minimum: "",
  days: [],
  ...over,
});

export const draftFromHabit = (h: BinaryHabit): HabitDraft => ({
  title: h.title,
  cue: h.cue ?? "",
  minimum: h.minimum ?? "",
  days: h.days ?? [],
  valueId: h.valueId,
  skillId: h.skillId,
});

const chip = (on: boolean) =>
  cn(
    "h-9 px-3 rounded-xl border text-small transition",
    on ? "bg-brand-soft border-brand/40 text-brand font-medium" : "border-line text-ink-2 hover:border-ink-3"
  );

/** One form for adding and editing: what, when (cue + days), the bad-day version, and which value it serves. */
export function HabitForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: HabitDraft;
  submitLabel: string;
  onSubmit: (d: HabitDraft) => void;
  onCancel: () => void;
}) {
  const values = useAppStore((s) => s.values);
  const skills = useAppStore((s) => s.skills);
  const [d, setD] = useState<HabitDraft>(initial);
  const everyDay = d.days.length === 0 || d.days.length === 7;

  const toggleDay = (day: number) => {
    const base = everyDay ? WEEKDAYS.map((w) => w.day) : d.days;
    const next = base.includes(day) ? base.filter((x) => x !== day) : [...base, day].sort();
    setD({ ...d, days: next.length === 7 ? [] : next });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (d.title.trim()) onSubmit({ ...d, title: d.title.trim(), cue: d.cue.trim(), minimum: d.minimum.trim() });
      }}
      className="space-y-5 pt-2"
    >
      <div>
        <Label htmlFor="hb-title">العادة</Label>
        <Input id="hb-title" autoFocus value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="مثال: قراءة 10 صفحات" maxLength={80} />
      </div>

      <div>
        <Label htmlFor="hb-cue" hint="اربطها بشيء تفعله كل يوم أصلاً، فيصير هو المنبّه.">
          متى بالضبط؟
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-ui text-ink-2 shrink-0">بعد أن</span>
          <Input id="hb-cue" value={d.cue} onChange={(e) => setD({ ...d, cue: e.target.value })} placeholder="أصلّي الفجر / أشرب قهوة الصباح" maxLength={80} />
        </div>
      </div>

      <div>
        <Label htmlFor="hb-min" hint="في أسوأ أيامك: أصغر شيء يُحسب. القليل الدائم يغلب الكثير المنقطع.">
          النسخة الصغرى
        </Label>
        <Input id="hb-min" value={d.minimum} onChange={(e) => setD({ ...d, minimum: e.target.value })} placeholder="مثال: صفحة واحدة" maxLength={80} />
      </div>

      <div>
        <Label>الأيام</Label>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setD({ ...d, days: [] })} className={chip(everyDay)} aria-pressed={everyDay}>
            كل يوم
          </button>
          {WEEKDAYS.map((w) => {
            const on = everyDay || d.days.includes(w.day);
            return (
              <button
                key={w.day}
                type="button"
                onClick={() => toggleDay(w.day)}
                aria-pressed={on}
                aria-label={w.long}
                title={w.long}
                className={cn(chip(on && !everyDay), "w-9 px-0", everyDay && "text-ink-3")}
              >
                {w.short}
              </button>
            );
          })}
        </div>
      </div>

      {values.length > 0 && (
        <div>
          <Label hint="كل مرة تفعلها صوتٌ لهذه القيمة.">لأي قيمة؟</Label>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setD({ ...d, valueId: undefined })} className={chip(!d.valueId)}>
              بلا قيمة
            </button>
            {values.map((v) => (
              <button key={v.id} type="button" onClick={() => setD({ ...d, valueId: v.id })} className={chip(d.valueId === v.id)}>
                {v.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {skills.length > 0 && (
        <div>
          <Label htmlFor="hb-skill" hint="اختياري">
            تبني مهارة؟
          </Label>
          <select
            id="hb-skill"
            value={d.skillId ?? ""}
            onChange={(e) => setD({ ...d, skillId: e.target.value || undefined })}
            className="w-full h-11 bg-surface border border-line-strong rounded-xl px-3 text-body text-ink focus:outline-none focus:border-brand"
          >
            <option value="">لا</option>
            {skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <p className="rounded-xl bg-accent-soft/60 px-4 py-2.5 text-small text-ink-2">
        العادة التزام {HABIT_COMMITMENT_DAYS} يوماً: بعد أول {HABIT_GRACE_HOURS} ساعة لا تُعدَّل ولا تُؤرشف حتى يكتمل. اخترها صغيرة بما يكفي لتصمد.
      </p>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel}>
          إلغاء
        </Button>
        <Button type="submit" disabled={!d.title.trim()}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

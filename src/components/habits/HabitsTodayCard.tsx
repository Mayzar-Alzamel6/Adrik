"use client";

import React from "react";
import Link from "next/link";
import { useShallow } from "zustand/react/shallow";
import { Check, ChevronLeft, Flame } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { habitStats, isDue } from "@/lib/habits";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/primitives";

/** Habits happen during the day, not only at the evening review: tick them where you already are. */
export function HabitsTodayCard() {
  const { binaryHabits, habitHistory, currentDay, toggleBinaryHabit } = useAppStore(
    useShallow((s) => ({
      binaryHabits: s.binaryHabits,
      habitHistory: s.habitHistory,
      currentDay: s.currentDay,
      toggleBinaryHabit: s.toggleBinaryHabit,
    }))
  );
  const due = binaryHabits.filter((h) => !h.archived && isDue(h, currentDay));
  if (due.length === 0) return null;
  const done = due.filter((h) => h.isCompleted).length;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-small text-ink-3">عادات اليوم</p>
        <span className="text-caption text-ink-3 tabular">
          {done} من {due.length}
        </span>
      </div>
      <ul className="mt-3 space-y-1">
        {due.map((h) => {
          const streak = habitStats(h, habitHistory, currentDay).streak;
          return (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => toggleBinaryHabit(h.id)}
                aria-pressed={h.isCompleted}
                className="w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 -mx-2 text-right hover:bg-surface-2 transition"
              >
                <span
                  className={cn(
                    "w-5 h-5 shrink-0 rounded-full border-[1.5px] inline-flex items-center justify-center transition",
                    h.isCompleted ? "bg-brand border-brand text-brand-ink" : "border-ink-3/60 text-transparent"
                  )}
                >
                  <Check className="w-3 h-3" strokeWidth={3} />
                </span>
                <span className={cn("flex-1 text-ui truncate", h.isCompleted ? "text-ink-3 line-through" : "text-ink")}>{h.title}</span>
                {streak > 0 && (
                  <span className="shrink-0 inline-flex items-center gap-0.5 text-caption text-accent-strong tabular">
                    <Flame className="w-3 h-3" />
                    {streak}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <Link href="/app/tools/habits" className="mt-3 inline-flex items-center gap-1 text-small font-medium text-brand hover:underline underline-offset-4">
        متابعة العادات
        <ChevronLeft className="w-3.5 h-3.5" />
      </Link>
    </Card>
  );
}

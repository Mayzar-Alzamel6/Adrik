"use client";

import React, { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Check, Coffee, Flame, Repeat, Trophy } from "lucide-react";
import { breakMinutesFor, useAppStore, type SessionOutcome } from "@/stores/useAppStore";
import { fullSessions, minutesAr } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

const OUTCOMES: { value: SessionOutcome; label: string; variant: "primary" | "secondary" | "ghost" }[] = [
  { value: "DONE", label: "أنهيته", variant: "primary" },
  { value: "PARTIAL", label: "جزئياً", variant: "secondary" },
  { value: "NOT", label: "لا", variant: "ghost" },
];

const OUTCOME_NOTE: Record<SessionOutcome, string> = {
  DONE: "عقد مُنجز. أحسنت.",
  PARTIAL: "تقدّم حقيقي، والباقي للجلسة القادمة.",
  NOT: "سجّلناها بصدق. الجلسة القادمة فرصة جديدة.",
};

export function SessionReviewSheet() {
  const {
    pendingSessionReviewId,
    focusSessions,
    focusStreak,
    bestFocusStreak,
    rateFocusSession,
    repeatLastSession,
    startBreak,
    frogs,
    toggleFrog,
  } = useAppStore(
    useShallow((s) => ({
      pendingSessionReviewId: s.pendingSessionReviewId,
      focusSessions: s.focusSessions,
      focusStreak: s.focusStreak,
      bestFocusStreak: s.bestFocusStreak,
      rateFocusSession: s.rateFocusSession,
      repeatLastSession: s.repeatLastSession,
      startBreak: s.startBreak,
      frogs: s.frogs,
      toggleFrog: s.toggleFrog,
    }))
  );
  const session = pendingSessionReviewId ? focusSessions.find((s) => s.id === pendingSessionReviewId) : undefined;
  const newRecord = focusStreak > 1 && focusStreak === bestFocusStreak;
  const [picked, setPicked] = useState<SessionOutcome | null>(null);

  useEffect(() => setPicked(null), [pendingSessionReviewId]);

  const close = () => rateFocusSession(picked);
  const breakLen = session ? breakMinutesFor(session.plannedMinutes) : 5;
  const takeBreak = () => {
    rateFocusSession(picked);
    startBreak(breakLen);
  };
  const repeat = () => {
    rateFocusSession(picked);
    repeatLastSession();
  };
  const openPriority = session?.taskId ? frogs.find((f) => f.id === session.taskId && !f.isCompleted) : undefined;
  const finishPriority = () => {
    rateFocusSession(picked);
    if (openPriority) toggleFrog(openPriority.id);
  };

  return (
    <Sheet open={Boolean(session)} onClose={close} size="sm">
      {session && (
        <div className="text-center pt-2">
          <div className="w-14 h-14 rounded-full bg-brand-soft text-brand mx-auto flex items-center justify-center animate-rise-in">
            {newRecord ? <Trophy className="w-6 h-6" strokeWidth={1.8} /> : <Flame className="w-6 h-6" strokeWidth={1.8} />}
          </div>
          <h2 className="font-display text-title-lg font-semibold text-ink mt-5">أكملت الجلسة كاملة</h2>
          <p className="text-ink-2 mt-1">
            {session.plannedMinutes} دقيقة دون انسحاب.{" "}
            {newRecord ? (
              <span className="text-accent-strong font-medium">رقم قياسي جديد: {fullSessions(focusStreak)} متتالية.</span>
            ) : focusStreak > 1 ? (
              `سلسلتك الآن ${fullSessions(focusStreak)} متتالية.`
            ) : null}
          </p>

          {session.commitment && (
            <div className="mt-6 rounded-xl2 bg-surface-2 px-5 py-4 text-right">
              <p className="text-small text-ink-3">عقدك كان</p>
              <p className="font-display text-subtitle text-ink mt-1 leading-relaxed">{session.commitment}</p>
            </div>
          )}

          {picked === null ? (
            <>
              <p className="text-body font-medium text-ink mt-6">هل أنهيته؟</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {OUTCOMES.map((o) => (
                  <Button key={o.value} variant={o.variant} onClick={() => setPicked(o.value)}>
                    {o.label}
                  </Button>
                ))}
              </div>
              <p className="text-small text-ink-3 mt-4">الجواب الصادق يجعل عقودك القادمة أدق.</p>
            </>
          ) : (
            <div className="animate-rise-in">
              <p className="text-body text-brand font-medium mt-6">{OUTCOME_NOTE[picked]}</p>
              <p className="text-ui text-ink-2 mt-1">ماذا بعد؟</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button onClick={repeat}>
                  <Repeat className="w-4 h-4" />
                  كرر الجلسة
                </Button>
                <Button variant="secondary" onClick={takeBreak}>
                  <Coffee className="w-4 h-4" />
                  استراحة {minutesAr(breakLen)}
                </Button>
              </div>
              {picked === "DONE" && openPriority && (
                <Button variant="ghost" className="w-full mt-2" onClick={finishPriority}>
                  <Check className="w-4 h-4" />
                  الأولوية كلها تمّت: «{openPriority.title}»
                </Button>
              )}
              <p className="text-small text-ink-3 mt-4">
                التكرار يبدأ فوراً بنفس المدة ({session.plannedMinutes} د) ونفس العقد والمهمة.
              </p>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

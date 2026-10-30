"use client";

import React from "react";
import { HeartHandshake } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { toLocalDateString } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, IconTile } from "@/components/ui/primitives";

/** Shown once after a day or more away: no lost-day counters, just one small step back in. */
export const RecoveryFlywheel: React.FC = () => {
  const lastActiveDate = useAppStore((s) => s.lastActiveDate);
  const dismissRecovery = useAppStore((s) => s.dismissRecovery);
  const performKaizenReset = useAppStore((s) => s.performKaizenReset);
  // lastActiveDate is refreshed by real actions. Yesterday's date is a normal morning, not an absence:
  // only a whole day with nothing recorded earns the welcome back.
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (!(lastActiveDate < toLocalDateString(yesterday))) return null;

  const smallStep = () => {
    performKaizenReset();
    // The reset prepares a 15-minute start; take the user straight to its one-line commitment.
    setTimeout(() => {
      const input = document.getElementById("focus-commitment") as HTMLInputElement | null;
      input?.scrollIntoView({ behavior: "smooth", block: "center" });
      input?.focus({ preventScroll: true });
    }, 150);
  };

  return (
    <Card className="p-5 sm:p-6 bg-brand-soft/60 border-brand/20 animate-rise-in">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <IconTile icon={HeartHandshake} tone="brand" size="lg" />
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-title-sm font-semibold text-ink">أهلاً بعودتك</h2>
          <p className="text-ui text-ink-2 mt-0.5 max-w-xl">
            الانقطاع ثقب في الطريق، لا سقوط عنه. لا عدّادات صُفّرت ولا لوم — خطوة صغيرة واحدة الآن تعيدك إلى الدوران.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={smallStep}>جلسة 15 دقيقة الآن</Button>
          <Button variant="ghost" onClick={dismissRecovery}>
            لاحقاً
          </Button>
        </div>
      </div>
    </Card>
  );
};

"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { setCoachConsent } from "@/lib/ai/coachConsent";
import { COACH_TEXT } from "@/lib/ai/texts";
import type { AiConsent } from "@/lib/safety/analysis";

const T = COACH_TEXT.consent;

/** Asked once, before the coach first sends anything. Inline, for screens that are already a sheet. */
export function CoachConsentPanel({ onChoose }: { onChoose: (choice: AiConsent) => void }) {
  const choose = (choice: AiConsent) => {
    setCoachConsent(choice);
    onChoose(choice);
  };
  return (
    <div className="space-y-4">
      <p className="font-display text-subtitle font-semibold text-ink">{T.title}</p>
      <div className="flex items-start gap-3 rounded-xl2 bg-surface-2 p-4">
        <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-accent-strong" />
        <p className="text-body text-ink leading-relaxed">{T.body}</p>
      </div>
      <p className="text-ui text-ink-2">{T.note}</p>
      <div className="flex flex-col gap-2">
        <Button onClick={() => choose("ai")}>{T.accept}</Button>
        <Button variant="secondary" onClick={() => choose("local")}>
          {T.decline}
        </Button>
      </div>
    </div>
  );
}

/** The same question as a sheet. Closing without choosing keeps the local engine. */
export function CoachConsentSheet({ open, onChoose }: { open: boolean; onChoose: (choice: AiConsent) => void }) {
  return (
    <Sheet
      open={open}
      onClose={() => {
        setCoachConsent("local");
        onChoose("local");
      }}
      size="sm"
    >
      <CoachConsentPanel onChoose={onChoose} />
    </Sheet>
  );
}

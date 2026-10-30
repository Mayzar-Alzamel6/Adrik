"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { setAiConsent, type AiConsent } from "@/lib/safety/aiConsent";
import { SAFETY_TEXT } from "@/lib/safety/texts";

const T = SAFETY_TEXT.consent;

/** Asked once, before the first thought would go to Gemini. Closing without choosing keeps the local analysis. */
export function AiConsentSheet({ open, onChoose }: { open: boolean; onChoose: (choice: AiConsent) => void }) {
  const choose = (choice: AiConsent) => {
    setAiConsent(choice);
    onChoose(choice);
  };

  return (
    <Sheet open={open} onClose={() => choose("local")} size="sm" title={T.title}>
      <div className="space-y-4">
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
    </Sheet>
  );
}

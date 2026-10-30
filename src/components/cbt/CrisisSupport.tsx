"use client";

import React, { useEffect, useState } from "react";
import { HeartHandshake, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/primitives";
import { helplinesFor, type Helpline } from "@/lib/safety/helplines";
import { currentZone } from "@/lib/safety/region";
import { SAFETY_TEXT } from "@/lib/safety/texts";

const T = SAFETY_TEXT.crisis;

/**
 * Shown instead of any analysis when the words point to suicide, self-harm or deep hopelessness.
 * Calm and short: empathy, a nudge toward a trusted person or a professional, and the local support lines.
 */
export function CrisisSupport({ onDone }: { onDone: () => void }) {
  const [lines, setLines] = useState<Helpline[]>([]);

  // The region is read on the client only (storage + time zone), like the pricing page.
  useEffect(() => setLines(helplinesFor(currentZone())), []);

  return (
    <Card as="section" className="p-5 sm:p-7 space-y-5 animate-rise-in" aria-live="polite">
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-10 h-10 rounded-full bg-brand-soft text-brand inline-flex items-center justify-center">
          <HeartHandshake className="w-5 h-5" />
        </span>
        <div>
          <h2 className="font-display text-title-sm font-semibold text-ink">{T.title}</h2>
          <p className="text-body text-ink-2 mt-1 leading-relaxed">{T.body}</p>
        </div>
      </div>

      <div className="rounded-xl2 bg-surface-2 p-4">
        <p className="text-body text-ink leading-relaxed">{T.reachOut}</p>
      </div>

      <div>
        {lines.length > 0 && (
          <ul className="space-y-2 mb-3">
            {lines.map((h) => (
              <li key={`${h.area}-${h.number}`}>
                <a
                  href={`tel:${h.number}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 hover:bg-surface-2 transition"
                >
                  <span>
                    <span className="block text-body font-medium text-ink">{h.name}</span>
                    <span className="block text-ui text-ink-2">{h.area}{h.note ? ` · ${h.note}` : ""}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 text-body font-semibold text-brand" dir="ltr">
                    <Phone className="w-4 h-4" />
                    {h.number}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="text-ui text-ink-2">{T.emergency}</p>
      </div>

      <Button variant="secondary" onClick={onDone}>
        {T.done}
      </Button>
    </Card>
  );
}

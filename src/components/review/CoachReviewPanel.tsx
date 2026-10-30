"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Sparkles, Target } from "lucide-react";
import { isCrisis, type AiConsent } from "@/lib/safety/analysis";
import { fetchCoachAvailable, readCoachConsent } from "@/lib/ai/coachConsent";
import { isEmptyWeek, localReview, type ReviewReply } from "@/lib/ai/coach";
import { buildWeekSummary, useCoachWeekData } from "@/lib/ai/weekSummary";
import { readCachedReview, saveCachedReview, type CachedReview } from "@/lib/ai/reviewCache";
import { COACH_TEXT } from "@/lib/ai/texts";
import { shiftWeek, weekOf, weekRangeLabel } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader, SegmentedControl } from "@/components/ui/primitives";
import { SendTo } from "@/components/flow/SendTo";
import { CrisisSupport } from "@/components/cbt/CrisisSupport";
import { CoachConsentSheet } from "@/components/ai/CoachConsent";

type Which = "this" | "last";
type Status = "idle" | "consent" | "loading" | "crisis" | "empty";

/** The coach's weekly review: three observations from the week's numbers, and one small act to send to the plan. */
export function CoachReviewPanel() {
  const data = useCoachWeekData();
  // On Saturday the new week has barely started, so open on the one just lived.
  const [which, setWhich] = useState<Which>(() => (new Date().getDay() === 6 ? "last" : "this"));
  const week = useMemo(() => shiftWeek(weekOf(), which === "last" ? -1 : 0), [which]);
  const [entry, setEntry] = useState<CachedReview | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    setEntry(readCachedReview(week));
    setStatus("idle");
  }, [week]);

  const generate = async (consent: AiConsent | null) => {
    const summary = buildWeekSummary(week, data);
    const reasons = summary.focus.exitReasons.join("\n");
    if (reasons && isCrisis({ automaticThought: reasons })) return setStatus("crisis");
    if (isEmptyWeek(summary)) return setStatus("empty");

    const available = await fetchCoachAvailable();
    if (available && consent === null) return setStatus("consent");

    setStatus("loading");
    let next: CachedReview;
    try {
      const res = await fetch("/api/ai/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary, useAI: available && consent === "ai" }),
      });
      const reply = (await res.json()) as ReviewReply;
      if (reply.status === "crisis") return setStatus("crisis");
      next = { review: reply.review, engine: reply.engine, createdAt: new Date().toISOString() };
    } catch {
      // Offline or the server is down: the same rules run here.
      next = { review: localReview(summary), engine: "local", createdAt: new Date().toISOString() };
    }
    saveCachedReview(week, next);
    setEntry(next);
    setStatus("idle");
  };

  return (
    <Card as="section" className="p-5 sm:p-7">
      <SectionHeader
        eyebrow="المدرّب"
        title="مراجعة المدرّب"
        description={`ثلاث ملاحظات من أرقام ${weekRangeLabel(week)}، وفعل صغير واحد تحوّله إلى خطة.`}
        action={
          <SegmentedControl<Which>
            size="sm"
            ariaLabel="أي أسبوع"
            value={which}
            onChange={setWhich}
            options={[
              { value: "this", label: "هذا الأسبوع" },
              { value: "last", label: "الأسبوع الماضي" },
            ]}
          />
        }
      />

      <div className="mt-5">
        {status === "crisis" ? (
          <CrisisSupport onDone={() => setStatus("idle")} />
        ) : status === "loading" ? (
          <div className="py-8 flex flex-col items-center gap-3 text-ink-2" role="status">
            <Loader2 className="w-6 h-6 animate-spin text-brand" />
            <p className="text-ui">المدرّب يقرأ أسبوعك…</p>
          </div>
        ) : status === "empty" ? (
          <div className="flex flex-col items-center text-center gap-3 py-6">
            <p className="text-body text-ink max-w-sm">لا أرقام في هذا الأسبوع بعد: لا أولويات مخططة ولا جلسات تركيز.</p>
            <p className="text-ui text-ink-2 max-w-sm">اكتب أولويات يومك وأكمل جلسة واحدة، ثم ارجع هنا يوم الجمعة.</p>
          </div>
        ) : entry ? (
          <div className="space-y-4 animate-rise-in">
            <ol className="space-y-2.5">
              {entry.review.observations.map((o, i) => (
                <li key={i} className="flex gap-3 rounded-xl2 bg-surface-2 p-4">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-brand-soft text-brand text-small font-semibold inline-flex items-center justify-center tabular">
                    {i + 1}
                  </span>
                  <p className="text-body text-ink leading-relaxed">{o}</p>
                </li>
              ))}
            </ol>

            <div className="rounded-xl2 border border-accent/40 bg-accent-soft/40 p-4 space-y-3">
              <p className="text-caption font-medium text-accent-strong inline-flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                اقتراح المدرّب
              </p>
              <div>
                <p className="text-body text-ink font-medium">{entry.review.suggestion.title}</p>
                {entry.review.suggestion.why && <p className="text-ui text-ink-2 mt-0.5">{entry.review.suggestion.why}</p>}
              </div>
              <SendTo key={entry.createdAt} title={entry.review.suggestion.title} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-caption text-ink-3">{COACH_TEXT.engine[entry.engine]}</p>
              <Button variant="ghost" size="sm" onClick={() => generate(readCoachConsent())}>
                <RefreshCw className="w-4 h-4" />
                أعد الكتابة
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-3 py-6">
            <span className="w-11 h-11 rounded-full bg-accent-soft text-accent-strong inline-flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </span>
            <p className="text-ui text-ink-2 max-w-sm">
              يقرأ المدرّب أرقامك فقط: الأولويات، وجلسات التركيز، والقيم، والعادات. لا يقرأ ملاحظاتك ولا أفكارك.
            </p>
            <Button onClick={() => generate(readCoachConsent())}>
              <Sparkles className="w-4 h-4" />
              اكتب مراجعتي
            </Button>
          </div>
        )}
      </div>

      <CoachConsentSheet open={status === "consent"} onChoose={(c) => generate(c)} />
    </Card>
  );
}

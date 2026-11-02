"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Compass, Heart, Layers, Link2Off } from "lucide-react";
import { computeValueWeek, formatMinutes, useValueData } from "@/lib/valueInsights";
import { cn, shiftWeek, weekOf, weekRangeLabel } from "@/lib/utils";
import { Card, EmptyState, SectionHeader } from "@/components/ui/primitives";

/** Where the week's focus time went, value by value: the honest answer to "did I live by what I wrote?". */
export function ValueWeekPanel() {
  const data = useValueData();
  // Steps back from this week, so the arrows cross into last year without a reset.
  const [offset, setOffset] = useState(0);
  const week = useMemo(() => shiftWeek(weekOf(), offset), [offset]);
  const result = useMemo(() => computeValueWeek(week, data), [week, data]);

  if (data.values.length === 0) {
    return (
      <Card as="section" className="p-5 sm:p-7">
        <EmptyState
          icon={Heart}
          title="أسبوعك بميزان قيمك"
          description="اكتب قيمك في دستور القيم، واربط مشاريعك بها، وسترى هنا أين ذهب وقتك قيمةً قيمة."
          action={
            <Link href="/app/tools/identity" className="text-ui font-medium text-brand hover:underline underline-offset-4">
              افتح دستور القيم
            </Link>
          }
        />
      </Card>
    );
  }

  const max = Math.max(1, ...result.rows.map((r) => r.minutes));
  const linkedPct = result.focusMinutes ? Math.round((result.linkedMinutes / result.focusMinutes) * 100) : 0;
  const top = result.rows[0];

  return (
    <Card as="section" className="p-5 sm:p-7">
      <SectionHeader
        eyebrow="المراجعة بالقيم"
        title="أين ذهب أسبوعك؟"
        description="وقت التركيز موزّعاً على قيمك، عبر المشاريع التي ربطت بها أولوياتك."
        action={
          <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface-2 p-1">
            <button
              type="button"
              onClick={() => setOffset((o) => Math.max(-52, o - 1))}
              disabled={offset <= -52}
              aria-label="الأسبوع السابق"
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-ink-2 hover:bg-surface disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="px-2 text-small font-medium text-ink tabular min-w-[92px] text-center" title={weekRangeLabel(week)}>
              {offset === 0 ? "هذا الأسبوع" : offset === -1 ? "الأسبوع الماضي" : `الأسبوع ${week.week}`}
            </span>
            <button
              type="button"
              onClick={() => setOffset((o) => Math.min(0, o + 1))}
              disabled={offset >= 0}
              aria-label="الأسبوع التالي"
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-ink-2 hover:bg-surface disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Metric label="وقت التركيز" value={formatMinutes(result.focusMinutes)} />
        <Metric label="موصول بقيمة" value={`${linkedPct}%`} hint={formatMinutes(result.linkedMinutes)} tone={linkedPct >= 60 ? "brand" : "accent"} />
        <Metric
          label="قيم بلا نصيب"
          value={`${result.neglected.length} من ${result.rows.length}`}
          tone={result.neglected.length ? "danger" : "brand"}
        />
      </div>

      {result.focusMinutes === 0 ? (
        <p className="mt-6 rounded-xl bg-surface-2 px-4 py-3 text-ui text-ink-2">لا جلسات تركيز مسجّلة في هذا الأسبوع بعد.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {result.rows.map((r) => (
            <li key={r.value.id}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-body font-medium text-ink truncate">{r.value.title}</span>
                <span className="text-ui text-ink-2 tabular shrink-0">
                  {formatMinutes(r.minutes)}
                  {r.frogsDone > 0 && <span className="text-ink-3"> · {r.frogsDone} أولوية</span>}
                  {r.habitsDone > 0 && <span className="text-ink-3"> · {r.habitsDone} عادة</span>}
                </span>
              </div>
              <div className="mt-1.5 h-2.5 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", r.minutes ? "bg-brand" : "bg-transparent")}
                  style={{ width: `${(r.minutes / max) * 100}%` }}
                />
              </div>
              {r.projects.length > 0 && <p className="text-caption text-ink-3 mt-1 truncate">عبر: {r.projects.join("، ")}</p>}
            </li>
          ))}
          {result.unlinkedMinutes > 0 && (
            <li className="flex items-center gap-2 text-ui text-ink-2 pt-3 border-t border-line">
              <Link2Off className="w-4 h-4 text-ink-3 shrink-0" />
              <span className="flex-1">
                <span className="tabular font-medium text-ink">{formatMinutes(result.unlinkedMinutes)}</span> بلا مسار: أولويات غير مربوطة
                بمشروع.
              </span>
            </li>
          )}
        </ul>
      )}

      {result.skillMinutes.length > 0 && (
        <div className="mt-6 pt-5 border-t border-line">
          <p className="text-small text-ink-3 mb-2 inline-flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            تدرّبت هذا الأسبوع على
          </p>
          <div className="flex flex-wrap gap-2">
            {result.skillMinutes.map(({ skill, minutes }) => (
              <span key={skill.id} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-surface-2 text-small text-ink">
                {skill.title}
                <span className="text-ink-3 tabular">{formatMinutes(minutes)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {result.focusMinutes > 0 && (
        <Insight
          topTitle={top && top.minutes > 0 ? top.value.title : undefined}
          neglected={result.neglected.map((v) => v.title)}
          linkedPct={linkedPct}
        />
      )}

      <p className="text-caption text-ink-3 mt-4">المشروع الذي يخدم قيمتين يُحسب وقته لكلتيهما.</p>
    </Card>
  );
}

function Insight({ topTitle, neglected, linkedPct }: { topTitle?: string; neglected: string[]; linkedPct: number }) {
  const lines: string[] = [];
  if (topTitle) lines.push(`أكثر قيمة خدمتها هذا الأسبوع: «${topTitle}».`);
  if (neglected.length === 1) lines.push(`«${neglected[0]}» لم تأخذ شيئاً. هل تستحق أولوية واحدة الأسبوع القادم؟`);
  if (neglected.length > 1) lines.push(`${neglected.length} قيم لم تأخذ شيئاً. اختر واحدة منها فقط، وامنحها أولوية الأسبوع القادم.`);
  if (linkedPct < 50) lines.push("أغلب وقتك بلا مسار. اربط أولوياتك بمشاريعها ليصير الأسبوع مقروءاً.");
  if (lines.length === 0) return null;
  return (
    <div className="mt-6 rounded-xl2 bg-accent-soft/60 p-4 flex items-start gap-3">
      <Compass className="w-5 h-5 text-accent-strong shrink-0 mt-0.5" strokeWidth={1.8} />
      <div className="space-y-1 text-ui text-ink leading-relaxed">
        {lines.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, hint, tone = "brand" }: { label: string; value: string; hint?: string; tone?: "brand" | "accent" | "danger" }) {
  return (
    <div className="rounded-xl2 border border-line px-4 py-3">
      <p className="text-small text-ink-3">{label}</p>
      <p
        className={cn(
          "font-display text-title font-semibold tabular mt-1 leading-none",
          tone === "brand" ? "text-brand" : tone === "accent" ? "text-accent-strong" : "text-danger"
        )}
      >
        {value}
      </p>
      {hint && <p className="text-caption text-ink-3 mt-1 tabular">{hint}</p>}
    </div>
  );
}

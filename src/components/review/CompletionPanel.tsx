"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, BarChart3, Minus, Table2, Zap } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import {
  completionByDay,
  completionByType,
  computeIntjAuditMetrics,
  summarize,
  type DayCompletion,
  type GroupBy,
} from "@/lib/completion";
import { parseDay, shiftDay } from "@/lib/habits";
import { cn } from "@/lib/utils";
import { Card, EmptyState, SectionHeader, SegmentedControl } from "@/components/ui/primitives";

const PERIODS = ["7", "14", "30"] as const;
type Period = (typeof PERIODS)[number];

const DAY_FULL = new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long" });
const WEEKDAY = new Intl.DateTimeFormat("ar", { weekday: "narrow" });
const PLOT_H = 160;

/**
 * Completion rate over time, and which kinds of priorities get finished.
 * One measure, one hue (the validated --chart-1); the type breakdown is a list of meters, not a rainbow.
 */
export function CompletionPanel() {
  const frogs = useAppStore((s) => s.frogs);
  const frogHistory = useAppStore((s) => s.frogHistory);
  const currentDay = useAppStore((s) => s.currentDay);
  const values = useAppStore((s) => s.values);
  const skills = useAppStore((s) => s.skills);
  const projects = useProjectsStore((s) => s.projects);
  const eveningQualityCheck = useAppStore((s) => s.eveningQualityCheck);
  const data = useMemo(
    () => ({ frogs, frogHistory, currentDay, values, skills, projects }),
    [frogs, frogHistory, currentDay, values, skills, projects]
  );

  const [period, setPeriod] = useState<Period>("14");
  const [asTable, setAsTable] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>(projects.length ? "project" : "quadrant");

  const n = Number(period);
  const days = useMemo(() => completionByDay(n, data), [n, data]);
  const prev = useMemo(() => summarize(completionByDay(n, data, shiftDay(currentDay, -n))), [n, data, currentDay]);
  const now = summarize(days);
  const types = useMemo(() => completionByType(days, groupBy, data), [days, groupBy, data]);
  const auditMetrics = useMemo(() => computeIntjAuditMetrics(days, eveningQualityCheck), [days, eveningQualityCheck]);
  const delta = now.rate !== null && prev.rate !== null ? now.rate - prev.rate : null;

  return (
    <Card as="section" className="p-5 sm:p-7" aria-label="معدل الإنجاز">
      <SectionHeader
        eyebrow="معدل الإنجاز"
        title="كيف تُنجز أولوياتك؟"
        description="نسبة الأولويات التي أنجزتها كل يوم، وأي أنواع المهام تُنجَز وأيها يتعثّر."
      />

      {/* One row of controls, scoping everything below it. */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl<Period>
          size="sm"
          ariaLabel="الفترة"
          value={period}
          onChange={setPeriod}
          options={[
            { value: "7", label: "7 أيام" },
            { value: "14", label: "14 يوماً" },
            { value: "30", label: "30 يوماً" },
          ]}
        />
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          aria-pressed={asTable}
          className="h-9 px-3 rounded-lg border border-line text-small text-ink-2 hover:text-ink hover:border-ink-3 inline-flex items-center gap-1.5 transition"
        >
          {asTable ? <BarChart3 className="w-4 h-4" /> : <Table2 className="w-4 h-4" />}
          {asTable ? "عرض كرسم" : "عرض كجدول"}
        </button>
      </div>

      {now.planned === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="لا أولويات في هذه الفترة"
          description="حين تخطّط أولويات يومك وتنجزها، يظهر هنا إيقاع إنجازك يوماً بيوم."
          className="py-8"
        />
      ) : (
        <>
          <div className="mt-5 grid gap-3 grid-cols-2 sm:grid-cols-3">
            <Tile label="معدل الإنجاز" value={`${now.rate}%`} delta={delta} className="col-span-2 sm:col-span-1" />
            <Tile label="أولويات أنجزتها" value={`${now.done} من ${now.planned}`} />
            <Tile label="أيام فيها خطة" value={`${now.daysWithPlan} من ${n}`} />
          </div>

          {/* INTJ-A Operating Metrics Panel */}
          <div className="mt-4 rounded-xl border border-line bg-surface-2/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-small font-semibold text-ink inline-flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-brand" />
                مؤشرات المنظومة المعمارية (INTJ-A System Metrics)
              </span>
              <span className="text-caption text-ink-3">آخر {n} يوماً</span>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-3">
              {/* High-Leverage Velocity */}
              <div className="rounded-lg border border-line bg-surface p-3">
                <p className="text-caption text-ink-3">سرعة الرافعة العالية (Velocity)</p>
                <p className="font-display text-title font-semibold text-ink mt-1">
                  {auditMetrics.highLeverageRate !== null ? `${auditMetrics.highLeverageRate}%` : "—"}
                </p>
                <p className="text-caption text-ink-2 mt-0.5">
                  {auditMetrics.highLeverageDone} من {auditMetrics.highLeverageTotal} مهام رافعة استراتيجية
                </p>
              </div>

              {/* Energy Flow Index */}
              <div className="rounded-lg border border-line bg-surface p-3">
                <div className="flex items-center justify-between">
                  <p className="text-caption text-ink-3">مؤشر التدفق الطاقي</p>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                      auditMetrics.isDrainWarning ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand"
                    )}
                  >
                    {auditMetrics.isDrainWarning ? "تحذير استنزاف" : "متزن"}
                  </span>
                </div>
                <p className="font-display text-title font-semibold text-ink mt-1">
                  {auditMetrics.geniusCount} عبقرية <span className="text-ink-3 font-normal text-small">/</span> {auditMetrics.drainCount} استنزاف
                </p>
                <p className="text-caption text-ink-2 mt-0.5">
                  نسبة الاستنزاف: {auditMetrics.drainRatio}% (الحد الآمن ≤ 30%)
                </p>
              </div>

              {/* Mastery Quality Rate */}
              <div className="rounded-lg border border-line bg-surface p-3">
                <p className="text-caption text-ink-3">بوابة الجودة (DoD Gate)</p>
                <p className="font-display text-title font-semibold text-ink mt-1">
                  {auditMetrics.qualityPassRate !== null ? `${auditMetrics.qualityPassRate}%` : "—"}
                </p>
                <p className="text-caption text-ink-2 mt-0.5">
                  {auditMetrics.qualityPassedDays} من {auditMetrics.qualityAuditedDays} أيام استوفت معيار الإتقان
                </p>
              </div>
            </div>

            {/* Drain Warning Banner */}
            {auditMetrics.isDrainWarning && (
              <div className="rounded-lg bg-danger-soft border border-danger/30 p-2.5 flex items-center gap-2.5 text-danger text-small">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  تحذير استنزاف إدراكي: نسبة مهام الاستنزاف بلغت {auditMetrics.drainRatio}%. قم بأتمتة، تفويض، أو شطب هذه المهام فوراً.
                </span>
              </div>
            )}
          </div>

          {asTable ? <DaysTable days={days} today={currentDay} /> : <DailyColumns days={days} today={currentDay} />}

          <div className="mt-8 pt-6 border-t border-line">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="font-display text-subtitle font-semibold text-ink">حسب نوع المهمة</h3>
                <p className="text-small text-ink-2 mt-0.5">كم خطّطت من كل نوع، وكم أنجزت منه.</p>
              </div>
              <SegmentedControl<GroupBy>
                size="sm"
                ariaLabel="صنّف حسب"
                value={groupBy}
                onChange={setGroupBy}
                options={[
                  { value: "project", label: "المشروع" },
                  { value: "value", label: "القيمة" },
                  { value: "quadrant", label: "الأهمية" },
                  { value: "energy", label: "الطاقة" },
                ]}
              />
            </div>
            <ul className="mt-4 space-y-3.5">
              {types.map((r) => (
                <li key={r.key}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className={cn("text-ui truncate", r.unlinked ? "text-ink-3" : "text-ink font-medium")}>{r.label}</span>
                    <span className="text-small text-ink-2 shrink-0" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {r.done} من {r.planned} ·{" "}
                      {/* Isolated LTR: at the end of an RTL line the browser otherwise draws "%84". */}
                      <span dir="ltr" className="inline-block font-semibold text-ink">{`${r.rate}%`}</span>
                    </span>
                  </div>
                  <div
                    className="mt-1.5 h-2 rounded-full bg-chart/15 overflow-hidden"
                    role="meter"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={r.rate}
                    aria-label={`${r.label}: ${r.rate}%`}
                  >
                    <div className="h-full rounded-full bg-chart transition-[width] duration-500" style={{ width: `${r.rate}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <TypeInsight rows={types} />
          </div>
        </>
      )}
    </Card>
  );
}

function Tile({ label, value, delta, className }: { label: string; value: string; delta?: number | null; className?: string }) {
  return (
    <div className={cn("rounded-xl2 border border-line px-4 py-3", className)}>
      <p className="text-small text-ink-3">{label}</p>
      <p className="font-display text-title-lg font-semibold text-ink mt-1 leading-none whitespace-nowrap">{value}</p>
      {delta !== undefined && delta !== null && (
        <p className="mt-1.5 text-caption text-ink-2 inline-flex items-center gap-1">
          {delta > 0 ? (
            <ArrowUp className="w-3.5 h-3.5 text-brand" aria-hidden />
          ) : delta < 0 ? (
            <ArrowDown className="w-3.5 h-3.5 text-danger" aria-hidden />
          ) : (
            <Minus className="w-3.5 h-3.5 text-ink-3" aria-hidden />
          )}
          <span>
            {delta > 0 ? "+" : ""}
            {delta} نقطة عن الفترة السابقة
          </span>
        </p>
      )}
    </div>
  );
}

/** Columns: rate per day on a 0–100 scale. "No plan" is an empty slot, not a zero. */
function DailyColumns({ days, today }: { days: DayCompletion[]; today: string }) {
  const [active, setActive] = useState<number | null>(null);
  const labelEvery = days.length <= 14 ? 1 : 5;

  return (
    <figure className="mt-6" aria-label="معدل الإنجاز اليومي">
      <div className="flex gap-2">
        {/* y-axis: three clean ticks */}
        <div className="relative w-9 shrink-0 text-[10px] text-ink-3" style={{ height: PLOT_H, fontVariantNumeric: "tabular-nums" }} aria-hidden>
          {[100, 50, 0].map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - t}%` }}>
              {t}%
            </span>
          ))}
        </div>
        <div className="relative flex-1 min-w-0">
          {/* hairline grid, solid, one step off the surface */}
          <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: PLOT_H }} aria-hidden>
            {[0, 50, 100].map((t) => (
              <span key={t} className={cn("absolute inset-x-0 h-px", t === 0 ? "bg-line-strong/50" : "bg-line")} style={{ top: `${100 - t}%` }} />
            ))}
          </div>
          <div className="relative flex items-end gap-[2px]" style={{ height: PLOT_H }}>
            {days.map((d, i) => {
              const isToday = d.date === today;
              const h = d.rate === null ? 0 : Math.max(3, (d.rate / 100) * PLOT_H);
              return (
                <button
                  key={d.date}
                  type="button"
                  className="relative flex-1 h-full flex items-end justify-center focus:outline-none group"
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  aria-label={`${DAY_FULL.format(parseDay(d.date))}: ${
                    d.rate === null ? "لا أولويات مخطّطة" : `أنجزت ${d.done} من ${d.planned}، ${d.rate}%`
                  }`}
                >
                  {d.rate !== null && (
                    <span
                      className={cn(
                        "block w-full max-w-[24px] rounded-t-[4px] bg-chart transition-[height,opacity] duration-500",
                        isToday && "opacity-60",
                        active === i && "ring-2 ring-chart/35 ring-offset-1 ring-offset-surface"
                      )}
                      style={{ height: h }}
                    />
                  )}
                  {active === i && <Tooltip day={d} isToday={isToday} align={i < 2 ? "start" : i > days.length - 3 ? "end" : "center"} />}
                </button>
              );
            })}
          </div>
          {/* x-axis band, inside the figure so the card never scrolls */}
          <div className="flex gap-[2px] mt-1.5 text-[10px] text-ink-3" aria-hidden style={{ fontVariantNumeric: "tabular-nums" }}>
            {days.map((d, i) => {
              const show = i % labelEvery === labelEvery - 1 || i === days.length - 1 || labelEvery === 1;
              const date = parseDay(d.date);
              return (
                <span key={d.date} className={cn("flex-1 text-center leading-tight", d.date === today && "text-ink font-semibold")}>
                  {show && (
                    <>
                      {days.length <= 7 && <span className="block">{WEEKDAY.format(date)}</span>}
                      {date.getDate()}
                    </>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-caption text-ink-3">
        العمود الباهت هو اليوم، ما زال جارياً. اليوم بلا عمود هو يوم بلا أولويات مخطّطة.
      </figcaption>
    </figure>
  );
}

function Tooltip({ day, isToday, align }: { day: DayCompletion; isToday: boolean; align: "start" | "center" | "end" }) {
  return (
    <span
      role="tooltip"
      className={cn(
        "absolute bottom-full mb-2 z-20 w-max max-w-[220px] rounded-xl bg-ink text-bg px-3 py-2 text-right shadow-lift pointer-events-none",
        align === "center" && "left-1/2 -translate-x-1/2",
        align === "start" && "right-0",
        align === "end" && "left-0"
      )}
    >
      <span className="block text-body font-semibold leading-tight">
        {day.rate === null ? "لا أولويات" : `${day.rate}%`}
        {day.rate !== null && <span className="text-small font-normal opacity-80"> · {day.done} من {day.planned}</span>}
      </span>
      <span className="block text-caption opacity-80 mt-0.5">
        {DAY_FULL.format(parseDay(day.date))}
        {isToday ? " (جارٍ)" : ""}
      </span>
      {day.frogs.slice(0, 4).map((f) => (
        <span key={f.id} className="flex items-center gap-1.5 text-caption mt-1">
          <span className={cn("w-2 h-[2px] shrink-0 rounded", f.completedAt ? "bg-chart" : "bg-bg/40")} aria-hidden />
          <span className={cn("truncate", !f.completedAt && "opacity-60")}>{f.title}</span>
        </span>
      ))}
    </span>
  );
}

function DaysTable({ days, today }: { days: DayCompletion[]; today: string }) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full text-ui" style={{ fontVariantNumeric: "tabular-nums" }}>
        <caption className="sr-only">معدل الإنجاز اليومي</caption>
        <thead>
          <tr className="text-small text-ink-3 border-b border-line">
            <th scope="col" className="text-right font-medium py-2">اليوم</th>
            <th scope="col" className="text-center font-medium py-2">المخطّط</th>
            <th scope="col" className="text-center font-medium py-2">المنجز</th>
            <th scope="col" className="text-center font-medium py-2">النسبة</th>
          </tr>
        </thead>
        <tbody>
          {[...days].reverse().map((d) => (
            <tr key={d.date} className="border-b border-line last:border-0">
              <td className="py-2 text-ink">
                {DAY_FULL.format(parseDay(d.date))}
                {d.date === today && <span className="text-ink-3"> (جارٍ)</span>}
              </td>
              <td className="py-2 text-center text-ink-2">{d.planned || "—"}</td>
              <td className="py-2 text-center text-ink-2">{d.planned ? d.done : "—"}</td>
              <td className="py-2 text-center font-medium text-ink">{d.rate === null ? "—" : `${d.rate}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One sentence: what gets finished, and the gap that doesn't. */
function TypeInsight({ rows }: { rows: ReturnType<typeof completionByType> }) {
  const linked = rows.filter((r) => !r.unlinked && r.key !== "other" && r.planned >= 2);
  const gap = rows.find((r) => r.unlinked);
  const best = [...linked].sort((a, b) => b.rate - a.rate)[0];
  const lines: string[] = [];
  if (best) lines.push(`أعلى إنجاز: «${best.label}» بنسبة ${best.rate}%.`);
  if (gap && best && gap.planned >= 2 && gap.rate + 15 <= best.rate) {
    lines.push(`«${gap.label}» تُنجز بنسبة ${gap.rate}% فقط — الأولوية المربوطة بمسار تُنجَز أكثر.`);
  }
  if (!lines.length) return null;
  return (
    <div className="mt-5 rounded-xl2 bg-accent-soft/60 px-4 py-3 space-y-1 text-ui text-ink leading-relaxed">
      {lines.map((l) => (
        <p key={l}>{l}</p>
      ))}
    </div>
  );
}

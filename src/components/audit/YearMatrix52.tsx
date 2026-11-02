"use client";

import React, { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Calculator, Check, ChevronLeft, ChevronRight, Gift, Target } from "lucide-react";
import { computeWeekColor, useAppStore, weeksOfYear, type WeekAuditItem, type WeeklyFrogStats } from "@/stores/useAppStore";
import { cn, weekOf, weekRangeLabel } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge, Card, Input, Label, SectionHeader, Textarea } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";

type Level = 1 | 2 | 3 | 4;

const LEVELS: { value: Level; title: string; hint: string }[] = [
  { value: 4, title: "فعل هائل", hint: "تقدّم واضح في أولوياتك" },
  { value: 3, title: "فعل عادي", hint: "أسبوع روتيني مقبول" },
  { value: 2, title: "تراجع", hint: "تسويف مقنّع وانشغال بالهامش" },
  { value: 1, title: "توقف", hint: "لم يتحرك شيء يُذكر" },
];

const STATUS = {
  GREEN: { label: "أسبوع ممتاز", dot: "bg-brand", badge: "brand" as const },
  YELLOW: { label: "أسبوع عادي", dot: "bg-accent", badge: "accent" as const },
  RED: { label: "أسبوع متعثّر", dot: "bg-danger", badge: "danger" as const },
  PENDING: { label: "لم يُراجَع", dot: "bg-line", badge: "neutral" as const },
};

const ref = (w: WeekAuditItem) => ({ year: w.year, week: w.weekNumber });

export const YearMatrix52: React.FC = () => {
  const { weeklyAudits, submitWeeklyAudit, claimWeeklyReward, getWeeklyAggregatedMinutes, getWeeklyFrogStats } = useAppStore(
    useShallow((s) => ({
      weeklyAudits: s.weeklyAudits,
      submitWeeklyAudit: s.submitWeeklyAudit,
      claimWeeklyReward: s.claimWeeklyReward,
      getWeeklyAggregatedMinutes: s.getWeeklyAggregatedMinutes,
      getWeeklyFrogStats: s.getWeeklyFrogStats,
    }))
  );
  // Subscribing keeps the counts live when frogs change or the day rolls over.
  useAppStore((s) => s.frogs);
  useAppStore((s) => s.frogHistory);
  // Weeks run Saturday → Friday, so Friday's review is still "this week".
  const now = weekOf();
  const thisWeekFrogs = getWeeklyFrogStats(now);
  const [year, setYear] = useState(now.year);
  const weeks = weeksOfYear(weeklyAudits, year);
  const years = [...new Set([now.year, ...weeklyAudits.filter((w) => w.colorStatus !== "PENDING").map((w) => w.year)])].sort();

  const [selected, setSelected] = useState<WeekAuditItem | null>(null);
  const [escapeHours, setEscapeHours] = useState(0);
  const [completion, setCompletion] = useState(70);
  const [level, setLevel] = useState<Level>(3);
  const [notes, setNotes] = useState("");
  const [autoCalculated, setAutoCalculated] = useState(false);

  const open = (week: WeekAuditItem) => {
    const agg = getWeeklyAggregatedMinutes(ref(week));
    const escape = Math.round((agg.escapeMinutes / 60) * 10) / 10;
    const quality = Math.round(((agg.qualityMinutes + agg.emergencyMinutes) / 60) * 10) / 10;
    const frogsOfWeek = getWeeklyFrogStats(ref(week));
    let rate = week.colorStatus === "PENDING" ? 70 : week.completionRate;
    let lvl: Level = week.actionLevel;
    if (week.colorStatus === "PENDING" && (frogsOfWeek.total > 0 || quality + escape > 0)) {
      // Finished priorities are the real completion. Focus vs. escape time only stands in when no
      // priorities were planned — and escape that is never logged would otherwise make every week 100%.
      rate = frogsOfWeek.total > 0 ? frogsOfWeek.rate : Math.min(100, Math.round((quality / (quality + escape)) * 100));
      lvl = rate >= 70 ? 4 : rate >= 50 ? 3 : 2;
      setAutoCalculated(true);
    } else {
      setAutoCalculated(false);
    }
    setEscapeHours(week.colorStatus === "PENDING" ? escape : week.escapeHoursTotal);
    setCompletion(rate);
    setLevel(lvl);
    setNotes(week.notes ?? "");
    setSelected(week);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    submitWeeklyAudit(ref(selected), escapeHours, completion, level, notes);
    setSelected({
      ...selected,
      escapeHoursTotal: escapeHours,
      completionRate: completion,
      actionLevel: level,
      colorStatus: computeWeekColor(completion, level),
      notes,
    });
  };

  const counts = {
    GREEN: weeks.filter((w) => w.colorStatus === "GREEN").length,
    YELLOW: weeks.filter((w) => w.colorStatus === "YELLOW").length,
    RED: weeks.filter((w) => w.colorStatus === "RED").length,
  };
  const reviewed = counts.GREEN + counts.YELLOW + counts.RED;
  const thisWeek = weeksOfYear(weeklyAudits, now.year)[now.week - 1];

  // A year with 53 Fridays puts its extra week in the last quarter.
  const quarters = [0, 1, 2, 3].map((q) => weeks.slice(q * 13, q === 3 ? undefined : q * 13 + 13));
  const columns = Math.max(...quarters.map((q) => q.length));
  const previewColor = computeWeekColor(completion, level);
  // The first review sets a baseline; a red verdict on week one reads as failure before the habit even forms.
  const isFirstReview = (w: WeekAuditItem) =>
    weeklyAudits.every((a) => a.colorStatus === "PENDING" || (a.year === w.year && a.weekNumber === w.weekNumber));
  const firstBaseline = selected ? isFirstReview(selected) && previewColor !== "GREEN" : false;

  return (
    <div className="space-y-6">
      {/* This week + stats */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="p-5 sm:p-6 flex flex-col justify-between gap-5">
          <div>
            <p className="text-small text-ink-3">هذا الأسبوع</p>
            <p className="font-display text-title-lg font-semibold text-ink mt-1">
              الأسبوع {now.week} من {weeksOfYear(weeklyAudits, now.year).length}
            </p>
            <p className="text-small text-ink-3 mt-0.5">من السبت إلى الجمعة: {weekRangeLabel(now)}</p>
            <p className="text-ui text-ink-2 mt-1">
              {thisWeek && thisWeek.colorStatus !== "PENDING"
                ? isFirstReview(thisWeek) && thisWeek.colorStatus !== "GREEN"
                  ? "راجعت أول أسابيعك. هذا خط البداية الذي ستقيس عليه ما بعده."
                  : `راجعته: ${STATUS[thisWeek.colorStatus].label}.`
                : "خصص عشر دقائق يوم الجمعة لمراجعة صادقة لأسبوعك."}
            </p>
            {thisWeekFrogs.total > 0 && (
              <p className="text-ui text-ink mt-3 inline-flex items-center gap-2">
                <Target className="w-4 h-4 text-brand" />
                أولويات أُنجزت هذا الأسبوع:{" "}
                <span className="font-semibold tabular">
                  {thisWeekFrogs.done} من {thisWeekFrogs.total}
                </span>
                <span className="text-ink-3 tabular">({thisWeekFrogs.rate}%)</span>
              </p>
            )}
          </div>
          {thisWeek && (
            <Button onClick={() => open(thisWeek)} className="self-start">
              {thisWeek.colorStatus === "PENDING" ? "راجع هذا الأسبوع" : "عرض المراجعة"}
            </Button>
          )}
        </Card>
        <div className="grid grid-cols-3 gap-3">
          {(["GREEN", "YELLOW", "RED"] as const).map((k) => (
            <Card key={k} className="p-4 sm:p-5">
              <span className={cn("block w-2.5 h-2.5 rounded-full", STATUS[k].dot)} />
              <p className="font-display text-heading-lg font-medium text-ink tabular mt-3 leading-none">{counts[k]}</p>
              <p className="text-small text-ink-2 mt-1.5">{STATUS[k].label}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Year grid */}
      <Card as="section" className="p-5 sm:p-7">
        <SectionHeader
          title={`عامك ${year} في ${weeks.length} أسبوعاً`}
          description={`راجعت ${reviewed} أسبوعاً ${year === now.year ? "حتى الآن" : "في ذلك العام"}. اضغط على أي أسبوع لمراجعته.`}
          action={
            <div className="flex flex-wrap items-center gap-3 text-small text-ink-2">
              {years.length > 1 && (
                <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface-2 p-1">
                  <button
                    type="button"
                    onClick={() => setYear(years[years.indexOf(year) - 1])}
                    disabled={year === years[0]}
                    aria-label="العام السابق"
                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-ink-2 hover:bg-surface disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span className="px-1.5 text-small font-medium text-ink tabular">{year}</span>
                  <button
                    type="button"
                    onClick={() => setYear(years[years.indexOf(year) + 1])}
                    disabled={year === years[years.length - 1]}
                    aria-label="العام التالي"
                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-ink-2 hover:bg-surface disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              )}
              {(["GREEN", "YELLOW", "RED"] as const).map((k) => (
                <span key={k} className="inline-flex items-center gap-1.5">
                  <span className={cn("w-2.5 h-2.5 rounded-full", STATUS[k].dot)} />
                  {STATUS[k].label}
                </span>
              ))}
            </div>
          }
        />
        <div className="mt-6 space-y-4 overflow-x-auto">
          {quarters.map((qWeeks, qi) => (
            <div key={qi} className="flex items-center gap-3 min-w-[560px]">
              <span className="w-14 shrink-0 text-small text-ink-3">الربع {qi + 1}</span>
              <div className="flex-1 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                {qWeeks.map((w) => {
                  const isCurrent = w.year === now.year && w.weekNumber === now.week;
                  const isFuture = w.year > now.year || (w.year === now.year && w.weekNumber > now.week);
                  return (
                    <button
                      key={w.weekNumber}
                      type="button"
                      onClick={() => open(w)}
                      disabled={isFuture}
                      title={`الأسبوع ${w.weekNumber}: ${weekRangeLabel(ref(w))}`}
                      aria-label={`الأسبوع ${w.weekNumber}: ${STATUS[w.colorStatus].label}`}
                      className={cn(
                        "aspect-square rounded-lg text-micro tabular font-medium transition inline-flex items-center justify-center",
                        w.colorStatus === "GREEN" && "bg-brand text-brand-ink",
                        w.colorStatus === "YELLOW" && "bg-accent text-accent-ink",
                        w.colorStatus === "RED" && "bg-danger text-danger-ink",
                        w.colorStatus === "PENDING" && (isFuture ? "bg-surface-2/60 text-ink-3/50" : "bg-surface-2 text-ink-3 hover:bg-line"),
                        isCurrent && "ring-2 ring-ink ring-offset-2 ring-offset-surface",
                        isFuture ? "cursor-default" : "hover:scale-105"
                      )}
                    >
                      {w.weekNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Sheet
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `مراجعة الأسبوع ${selected.weekNumber}` : undefined}
        description="بلا تجميل وبلا جلد للذات. الرقم الصادق هو ما يحسّن الأسبوع القادم."
        size="md"
      >
        {selected && (
          <form onSubmit={save} className="space-y-6 pt-2">
            <p className="text-small text-ink-3 -mb-2">من السبت إلى الجمعة: {weekRangeLabel(ref(selected))}</p>
            {autoCalculated && (
              <p className="flex items-start gap-2 rounded-xl bg-brand-soft text-brand px-4 py-3 text-ui">
                <Calculator className="w-4 h-4 shrink-0 mt-1" />
                حسبنا النسبة من أولوياتك المنجزة، والتشتت من الوقت الذي سجّلته. عدّلها إن لزم.
              </p>
            )}

            <WeekFrogsPanel
              stats={getWeeklyFrogStats(ref(selected))}
              onUseRate={(rate) => setCompletion(rate)}
              currentRate={completion}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="wk-rate">نسبة الإنجاز %</Label>
                <Input
                  id="wk-rate"
                  type="number"
                  min={0}
                  max={100}
                  value={completion}
                  onChange={(e) => setCompletion(Math.max(0, Math.min(100, Number(e.target.value))))}
                />
              </div>
              <div>
                <Label htmlFor="wk-escape">ساعات التشتت</Label>
                <Input
                  id="wk-escape"
                  type="number"
                  min={0}
                  step={0.5}
                  value={escapeHours}
                  onChange={(e) => setEscapeHours(Math.max(0, Number(e.target.value)))}
                />
              </div>
            </div>

            <div>
              <Label>كيف كان فعلك هذا الأسبوع؟</Label>
              <div className="grid grid-cols-2 gap-2">
                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setLevel(l.value)}
                    aria-pressed={level === l.value}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-right transition",
                      level === l.value ? "border-brand shadow-ring bg-surface" : "border-line hover:border-ink-3"
                    )}
                  >
                    <span className="block text-body font-medium text-ink">{l.title}</span>
                    <span className="block text-caption text-ink-3 mt-0.5">{l.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="wk-notes" hint="أين تسرّب الوقت؟ وما التعديل الواحد للأسبوع القادم؟">
                ملاحظات
              </Label>
              <Textarea id="wk-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line">
              <span className="inline-flex items-center gap-2 text-ui text-ink-2 pt-3">
                النتيجة:
                {firstBaseline ? (
                  <Badge tone="accent">أسبوع البداية</Badge>
                ) : (
                  <Badge tone={STATUS[previewColor].badge}>{STATUS[previewColor].label}</Badge>
                )}
              </span>
              <Button type="submit" className="mt-3">
                حفظ المراجعة
              </Button>
            </div>
            {firstBaseline && (
              <p className="rounded-xl bg-accent-soft/70 px-4 py-3 text-ui text-ink leading-relaxed">
                هذه أول مراجعة لك، وهي لا تحكم عليك بل ترسم نقطة البداية. أغلب الناس يبدأون أقل مما يتمنون، والمهم أن يكون الأسبوع
                القادم أفضل من هذا بخطوة واحدة.
              </p>
            )}
            <p className="text-small text-ink-3 -mt-3">
              الأسبوع الممتاز يتطلب إنجازاً 70% فأكثر مع فعل هائل — ويفتح لك مكافأة الأسبوع.
            </p>

            {selected.colorStatus === "GREEN" && (
              <div className="rounded-xl2 bg-accent-soft/70 p-4 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-body text-ink">
                  <Gift className="w-5 h-5 text-accent-strong" />
                  استحققت مكافأة هذا الأسبوع
                </span>
                {selected.rewardClaimed ? (
                  <span className="inline-flex items-center gap-1 text-ui text-brand">
                    <Check className="w-4 h-4" />
                    استُلمت
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      claimWeeklyReward(ref(selected));
                      setSelected({ ...selected, rewardClaimed: true });
                    }}
                  >
                    استلمها
                  </Button>
                )}
              </div>
            )}
          </form>
        )}
      </Sheet>
    </div>
  );
};

const DAY_FORMAT = new Intl.DateTimeFormat("ar", { weekday: "short" });

function WeekFrogsPanel({
  stats,
  currentRate,
  onUseRate,
}: {
  stats: WeeklyFrogStats;
  currentRate: number;
  onUseRate: (rate: number) => void;
}) {
  if (stats.total === 0) {
    return (
      <p className="rounded-xl bg-surface-2 px-4 py-3 text-ui text-ink-2">
        لا توجد أولويات يومية مسجّلة لهذا الأسبوع.
      </p>
    );
  }
  return (
    <section className="rounded-xl2 border border-line p-4" aria-label="أولويات الأسبوع">
      <div className="flex items-center justify-between gap-3">
        <p className="text-body font-medium text-ink inline-flex items-center gap-2">
          <Target className="w-4 h-4 text-brand" />
          أولويات الأسبوع
        </p>
        <span className="text-ui text-ink-2 tabular">
          <span className="font-semibold text-ink">{stats.done}</span> من {stats.total} · {stats.rate}%
        </span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-surface-2 overflow-hidden">
        <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${stats.rate}%` }} />
      </div>
      {stats.items.length > 0 && (
        <ul className="mt-3 space-y-1.5 max-h-36 overflow-y-auto">
          {stats.items.map((f) => (
            <li key={`${f.id}-${f.completedAt}`} className="flex items-center gap-2 text-ui">
              <Check className="w-3.5 h-3.5 text-brand shrink-0" strokeWidth={2.6} />
              <span className="flex-1 truncate text-ink">{f.title}</span>
              <span className="text-caption text-ink-3 shrink-0">{DAY_FORMAT.format(new Date(f.completedAt))}</span>
            </li>
          ))}
        </ul>
      )}
      {currentRate !== stats.rate && (
        <button
          type="button"
          onClick={() => onUseRate(stats.rate)}
          className="mt-3 text-small font-medium text-brand hover:underline underline-offset-4"
        >
          استخدم {stats.rate}% كنسبة الإنجاز
        </button>
      )}
    </section>
  );
}

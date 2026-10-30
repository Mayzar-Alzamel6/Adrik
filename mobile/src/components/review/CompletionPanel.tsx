import React, { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
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
import { ROW, radius, useColors } from "@/theme";
import { Card, MiniChip, Row, SectionHeader, Segmented, Txt } from "@/components/ui";

type Period = "7" | "14" | "30";

const DAY_FULL = new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long" });
const PLOT_H = 140;

/**
 * Completion rate over time, and which kinds of priorities get finished.
 * One measure, one hue; the type breakdown is a list of meters. Tap a column for that day's detail.
 */
export function CompletionPanel() {
  const c = useColors();
  const frogs = useAppStore((s) => s.frogs);
  const frogHistory = useAppStore((s) => s.frogHistory);
  const currentDay = useAppStore((s) => s.currentDay);
  const values = useAppStore((s) => s.values);
  const skills = useAppStore((s) => s.skills);
  const projects = useProjectsStore((s) => s.projects);
  const eveningQualityCheck = useAppStore((s) => s.eveningQualityCheck);
  const data = useMemo(() => ({ frogs, frogHistory, currentDay, values, skills, projects }), [frogs, frogHistory, currentDay, values, skills, projects]);

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
    <Card style={{ gap: 14 }}>
      <View>
        <Txt variant="caption" weight="medium" color="accentStrong">
          معدل الإنجاز
        </Txt>
        <SectionHeader title="كيف تُنجز أولوياتك؟" description="نسبة الأولويات التي أنجزتها كل يوم، وأي أنواع المهام تُنجَز وأيها يتعثّر." />
      </View>

      <Segmented<Period>
        value={period}
        onChange={setPeriod}
        options={[
          { value: "7", label: "7 أيام" },
          { value: "14", label: "14 يوماً" },
          { value: "30", label: "30 يوماً" },
        ]}
      />

      {now.planned === 0 ? (
        <View style={{ paddingVertical: 16, gap: 4, alignItems: "center" }}>
          <Feather name="bar-chart-2" size={22} color={c.ink3} />
          <Txt weight="semibold" align="center">
            لا أولويات في هذه الفترة
          </Txt>
          <Txt variant="ui" color="ink2" align="center">
            حين تخطّط أولويات يومك وتنجزها، يظهر هنا إيقاع إنجازك يوماً بيوم.
          </Txt>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 8 }}>
            <Tile label="معدل الإنجاز" value={`${now.rate}%`} delta={delta} wide />
            <Tile label="أولويات أنجزتها" value={`${now.done} من ${now.planned}`} />
            <Tile label="أيام فيها خطة" value={`${now.daysWithPlan} من ${n}`} />
          </View>

          {/* INTJ-A Operating Metrics Panel */}
          <View
            style={{
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: c.line,
              backgroundColor: c.surface2,
              padding: 12,
              gap: 10,
            }}
          >
            <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
              <Row gap={6} style={{ alignItems: "center" }}>
                <Feather name="zap" size={15} color={c.brand} />
                <Txt variant="ui" weight="bold">
                  مؤشرات المنظومة المعمارية (INTJ-A)
                </Txt>
              </Row>
              <Txt variant="caption" color="ink3">
                آخر {n} يوماً
              </Txt>
            </Row>

            <View style={{ gap: 8 }}>
              {/* High-Leverage Velocity */}
              <View
                style={{
                  backgroundColor: c.surface,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: c.line,
                  padding: 10,
                }}
              >
                <Txt variant="caption" color="ink3">
                  سرعة الرافعة العالية (High-Leverage Velocity)
                </Txt>
                <Txt
                  variant="title"
                  weight="bold"
                  color={auditMetrics.highLeverageRate === null ? "ink" : auditMetrics.highLeverageRate >= 70 ? "brand" : "danger"}
                  style={{ marginTop: 2 }}
                >
                  {auditMetrics.highLeverageRate !== null ? `${auditMetrics.highLeverageRate}%` : "—"}
                  <Txt variant="caption" color="ink3"> · الهدف ≥ 70%</Txt>
                </Txt>
                <Txt variant="caption" color="ink2" style={{ marginTop: 2 }}>
                  {auditMetrics.highLeverageDone} من {auditMetrics.highLeverageTotal} مهام رافعة استراتيجية
                </Txt>
              </View>

              {/* Energy Flow Index */}
              <View
                style={{
                  backgroundColor: c.surface,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: c.line,
                  padding: 10,
                }}
              >
                <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <Txt variant="caption" color="ink3">
                    مؤشر التدفق الطاقي (Energy Flow)
                  </Txt>
                  <View
                    style={{
                      borderRadius: radius.full,
                      backgroundColor: auditMetrics.isDrainWarning ? c.dangerSoft : c.brandSoft,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    }}
                  >
                    <Txt
                      variant="caption"
                      weight="medium"
                      color={auditMetrics.isDrainWarning ? "danger" : "brand"}
                    >
                      {auditMetrics.isDrainWarning ? "تحذير استنزاف" : "متزن"}
                    </Txt>
                  </View>
                </Row>
                <Txt variant="title" weight="bold" style={{ marginTop: 2 }}>
                  {auditMetrics.geniusCount} عبقرية / {auditMetrics.drainCount} استنزاف
                </Txt>
                <Txt variant="caption" color="ink2" style={{ marginTop: 2 }}>
                  نسبة الاستنزاف: {auditMetrics.drainRatio}% (الحد الآمن ≤ 30%)
                </Txt>
              </View>

              {/* DoD Quality Gate */}
              <View
                style={{
                  backgroundColor: c.surface,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: c.line,
                  padding: 10,
                }}
              >
                <Txt variant="caption" color="ink3">
                  بوابة الجودة وإتقان الـ DoD
                </Txt>
                <Txt
                  variant="title"
                  weight="bold"
                  color={auditMetrics.qualityPassRate === null ? "ink" : auditMetrics.qualityPassRate >= 80 ? "brand" : "danger"}
                  style={{ marginTop: 2 }}
                >
                  {auditMetrics.qualityPassRate !== null ? `${auditMetrics.qualityPassRate}%` : "—"}
                  <Txt variant="caption" color="ink3"> · الهدف ≥ 80%</Txt>
                </Txt>
                <Txt variant="caption" color="ink2" style={{ marginTop: 2 }}>
                  {auditMetrics.qualityPassedDays} من {auditMetrics.qualityAuditedDays} أيام استوفت معيار الإتقان
                </Txt>
              </View>
            </View>

            {/* Drain Warning Banner */}
            {auditMetrics.isDrainWarning ? (
              <Row
                gap={8}
                style={{
                  backgroundColor: c.dangerSoft,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: c.danger,
                  padding: 10,
                  alignItems: "flex-start",
                }}
              >
                <Feather name="alert-triangle" size={16} color={c.danger} style={{ marginTop: 2 }} />
                <Txt variant="small" color="danger" style={{ flex: 1, lineHeight: 18 }}>
                  تحذير استنزاف إدراكي: نسبة مهام الاستنزاف بلغت {auditMetrics.drainRatio}%. قم بأتمتة أو تفويض أو شطب هذه المهام لحماية تركيزك.
                </Txt>
              </Row>
            ) : null}
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <MiniChip icon={asTable ? "bar-chart-2" : "list"} label={asTable ? "عرض كرسم" : "عرض كجدول"} onPress={() => setAsTable((v) => !v)} />
          </View>
          {asTable ? <DaysTable days={days} today={currentDay} /> : <DailyColumns days={days} today={currentDay} />}

          <View style={{ paddingTop: 14, borderTopWidth: 1, borderTopColor: c.line, gap: 12 }}>
            <View>
              <Txt variant="subtitle" weight="semibold">
                حسب نوع المهمة
              </Txt>
              <Txt variant="small" color="ink2">
                كم خطّطت من كل نوع، وكم أنجزت منه.
              </Txt>
            </View>
            <Segmented<GroupBy>
              value={groupBy}
              onChange={setGroupBy}
              options={[
                { value: "project", label: "المشروع" },
                { value: "value", label: "القيمة" },
                { value: "quadrant", label: "الأهمية" },
                { value: "energy", label: "الطاقة" },
              ]}
            />
            {types.map((r) => (
              <View key={r.key} style={{ gap: 4 }}>
                <Row gap={8} style={{ justifyContent: "space-between" }}>
                  <Txt variant="ui" weight={r.unlinked ? "regular" : "medium"} color={r.unlinked ? "ink3" : "ink"} numberOfLines={1} style={{ flex: 1 }}>
                    {r.label}
                  </Txt>
                  <Txt variant="small" color="ink2">
                    {r.done} من {r.planned} · <Txt variant="small" weight="semibold">{`${r.rate}%`}</Txt>
                  </Txt>
                </Row>
                <View
                  accessibilityRole="progressbar"
                  accessibilityLabel={`${r.label}: ${r.rate}%`}
                  style={{ height: 8, borderRadius: 4, backgroundColor: c.brandSoft, overflow: "hidden", flexDirection: ROW }}
                >
                  <View style={{ width: `${r.rate}%`, backgroundColor: c.brand, borderRadius: 4 }} />
                </View>
              </View>
            ))}
            <TypeInsight rows={types} />
          </View>
        </>
      )}
    </Card>
  );
}

function Tile({ label, value, delta, wide }: { label: string; value: string; delta?: number | null; wide?: boolean }) {
  const c = useColors();
  return (
    <View style={{ flexGrow: 1, flexBasis: wide ? "100%" : "45%", borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, paddingHorizontal: 14, paddingVertical: 10 }}>
      <Txt variant="small" color="ink3">
        {label}
      </Txt>
      <Txt variant="titleLg" weight="semibold">
        {value}
      </Txt>
      {delta !== undefined && delta !== null ? (
        <Row gap={4}>
          <Feather name={delta >= 0 ? "arrow-up" : "arrow-down"} size={13} color={delta >= 0 ? c.brand : c.accent} />
          <Txt variant="small" color={delta >= 0 ? "brand" : "accent"}>
            {delta > 0 ? `+${delta}%` : `${delta}%`} عن الفترة السابقة
          </Txt>
        </Row>
      ) : null}
    </View>
  );
}

function DailyColumns({ days, today }: { days: DayCompletion[]; today: string }) {
  const c = useColors();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selected = days.find((d) => d.date === selectedDate);

  return (
    <View style={{ gap: 8 }}>
      <View style={{ height: PLOT_H, flexDirection: ROW, alignItems: "flex-end", gap: 3, paddingTop: 16 }}>
        {days.map((d) => {
          const isToday = d.date === today;
          const isSelected = d.date === selectedDate;
          const hasPlan = d.planned > 0;
          const rate = d.rate ?? 0;
          const h = hasPlan ? Math.max(6, Math.round((rate / 100) * (PLOT_H - 24))) : 3;

          return (
            <Pressable
              key={d.date}
              onPress={() => setSelectedDate((cur) => (cur === d.date ? null : d.date))}
              accessibilityLabel={`${d.date}: ${hasPlan ? `${rate}%` : "بلا خطة"}`}
              style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" }}
            >
              <View
                style={{
                  width: "100%",
                  height: h,
                  borderRadius: 4,
                  backgroundColor: isSelected ? c.ink : isToday ? c.brand : hasPlan ? c.brandSoft : c.surface2,
                }}
              />
            </Pressable>
          );
        })}
      </View>

      <Row style={{ justifyContent: "space-between" }}>
        <Txt variant="caption" color="ink3">
          {days[0]?.date ? DAY_FULL.format(parseDay(days[0].date)) : ""}
        </Txt>
        <Txt variant="caption" color="ink3">
          {days[days.length - 1]?.date ? DAY_FULL.format(parseDay(days[days.length - 1].date)) : ""}
        </Txt>
      </Row>

      {selected ? (
        <View style={{ borderRadius: radius.md, backgroundColor: c.surface2, padding: 12, gap: 4 }}>
          <Txt weight="semibold">{DAY_FULL.format(parseDay(selected.date))}</Txt>
          <Txt variant="small" color="ink2">
            {selected.planned ? `أُنجزت ${selected.done} من ${selected.planned} (${selected.rate}%)` : "لم تكن هناك أولويات مخططة في هذا اليوم."}
          </Txt>
          {selected.frogs.map((f) => (
            <Row key={f.id} gap={6} style={{ marginTop: 2 }}>
              <Feather name={f.completedAt ? "check" : "circle"} size={13} color={f.completedAt ? c.brand : c.ink3} />
              <Txt variant="small" color={f.completedAt ? "ink" : "ink3"} style={{ flex: 1 }}>
                {f.title}
              </Txt>
            </Row>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function DaysTable({ days, today }: { days: DayCompletion[]; today: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 4 }}>
      {days.map((d) => (
        <Row key={d.date} style={{ justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.line }}>
          <Row gap={6}>
            <Txt variant="small" weight={d.date === today ? "bold" : "regular"}>
              {DAY_FULL.format(parseDay(d.date))}
            </Txt>
            {d.date === today ? (
              <Txt variant="caption" color="brand">
                (اليوم)
              </Txt>
            ) : null}
          </Row>
          <Txt variant="small" color="ink2">
            {d.planned > 0 ? `${d.done} من ${d.planned} (${d.rate}%)` : "—"}
          </Txt>
        </Row>
      ))}
    </View>
  );
}

function TypeInsight({ rows }: { rows: { key: string; label: string; rate: number; unlinked?: boolean }[] }) {
  const c = useColors();
  const unlinked = rows.find((r) => r.unlinked);
  if (!unlinked || unlinked.rate === 0) return null;
  return (
    <Row gap={8} style={{ borderRadius: radius.md, backgroundColor: c.accentSoft, padding: 10, alignItems: "flex-start" }}>
      <Feather name="info" size={15} color={c.accentStrong} style={{ marginTop: 2 }} />
      <Txt variant="small" color="accentStrong" style={{ flex: 1 }}>
        {unlinked.label}: أنجزت منها {unlinked.rate}%. ربط المهام بمشاريع وقيم يرفع وضوح الهدف واستمراريته.
      </Txt>
    </Row>
  );
}

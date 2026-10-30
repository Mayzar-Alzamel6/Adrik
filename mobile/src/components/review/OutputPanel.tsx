import React from "react";
import { View } from "react-native";
import { useAppStore } from "@/stores/useAppStore";
import { useFocusGuardStore } from "@/stores/useFocusGuardStore";
import { DISTRACTION_KINDS } from "@/lib/focusGuard";
import { deepMinutesSeries, weekDates, weekDistractions, weekFrogRate } from "@/lib/output";
import { formatMinutes, weekOf } from "@/lib/utils";
import { radius, useColors } from "@/theme";
import { Card, Row, Txt } from "@/components/ui";

const avg = (xs: { minutes: number }[]) => Math.round(xs.reduce((s, x) => s + x.minutes, 0) / (xs.length || 1));

/** Output, not effort: deep minutes delivered, frogs eaten, and how fast the way back is after a slip. */
export function OutputPanel() {
  const c = useColors();
  const frogs = useAppStore((s) => s.frogs);
  const frogHistory = useAppStore((s) => s.frogHistory);
  const currentDay = useAppStore((s) => s.currentDay);
  const focusSessions = useAppStore((s) => s.focusSessions);
  const distractions = useFocusGuardStore((s) => s.distractions);
  const deepCap = useFocusGuardStore((s) => s.deepCap);

  const data = { frogs, frogHistory, currentDay, focusSessions };
  const series30 = deepMinutesSeries(data, 30);
  const series7 = series30.slice(-7);
  const today = series30[series30.length - 1]?.minutes ?? 0;
  const week = weekOf();
  const frogPct = weekFrogRate(data, weekDates(week));
  const dx = weekDistractions(distractions, week);
  const max = Math.max(60, ...series7.map((d) => d.minutes));

  return (
    <Card style={{ gap: 12 }}>
      <Txt variant="title" weight="semibold">
        مؤشر الإنجاز
      </Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Tile label="عمل عميق منجز اليوم" value={formatMinutes(today)} hint={`متوسط 7 أيام ${formatMinutes(avg(series7))} · 30 يوماً ${formatMinutes(avg(series30))}`} />
        <Tile
          label="الضفادع المنجزة هذا الأسبوع"
          value={frogPct === null ? "—" : `${frogPct}%`}
          tone={frogPct === null ? undefined : frogPct >= 70 ? "brand" : "danger"}
          hint="أيام أنجزت فيها أولوية #1"
        />
        <Tile label="زمن العودة" value={dx.avgReturnMin === null ? "—" : `${dx.avgReturnMin} د`} hint="من التشتت حتى استئناف العمل" />
        <Tile label="حد الكتل العميقة" value={`${deepCap} يومياً`} hint="يُضبط أسبوعياً باقتراح منك" />
      </View>

      <View>
        <Txt variant="caption" color="ink3" style={{ marginBottom: 6 }}>
          آخر 7 أيام (دقائق عميقة)
        </Txt>
        <Row gap={6} style={{ alignItems: "flex-end", height: 70 }}>
          {series7.map((d) => (
            <View key={d.date} style={{ flex: 1, alignItems: "center", gap: 4 }}>
              <View style={{ width: "70%", height: Math.max(2, (d.minutes / max) * 56), borderRadius: 3, backgroundColor: d.minutes ? c.brand : c.line }} />
            </View>
          ))}
        </Row>
      </View>

      <View style={{ gap: 6 }}>
        <Txt weight="semibold">المشتتات هذا الأسبوع</Txt>
        {dx.total === 0 ? (
          <Txt variant="ui" color="ink3">
            لا تشتت مسجّل هذا الأسبوع.
          </Txt>
        ) : (
          <>
            <Txt variant="ui" color="ink2">
              {dx.total} مرة · عدت {dx.returned} منها
            </Txt>
            {dx.top.map((t) => {
              const k = DISTRACTION_KINDS.find((x) => x.id === t.kind)!;
              return (
                <View key={t.kind} style={{ borderRadius: radius.md, backgroundColor: c.surface2, padding: 10 }}>
                  <Txt variant="ui" weight="medium">
                    {k.emoji} {k.label} · {t.count}
                  </Txt>
                  <Txt variant="caption" color="ink2">
                    الوقاية: {t.prevention}
                  </Txt>
                </View>
              );
            })}
          </>
        )}
      </View>
    </Card>
  );
}

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "brand" | "danger" }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, minWidth: 140, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, padding: 10 }}>
      <Txt variant="caption" color="ink3">
        {label}
      </Txt>
      <Txt variant="title" weight="bold" color={tone ?? "ink"} style={{ marginTop: 2 }}>
        {value}
      </Txt>
      {hint ? (
        <Txt variant="caption" color="ink2">
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

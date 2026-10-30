import React from "react";
import { View } from "react-native";
import { useAppStore } from "@/stores/useAppStore";
import { formatMinutes, toLocalDateString } from "@/lib/utils";
import { radius, ROW, useColors } from "@/theme";
import { Card, Row, Screen, Txt } from "@/components/ui";
import { YearMatrix52 } from "@/components/review/YearMatrix52";
import { CompletionPanel } from "@/components/review/CompletionPanel";
import { ValueWeekPanel } from "@/components/review/ValueWeekPanel";
import { CoachReviewPanel } from "@/components/review/CoachReviewPanel";
import { PERSONAL_SYNC_ENABLED } from "@/lib/sync/flag";

const DAY_NAMES = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default function ReviewScreen() {
  const c = useColors();
  const { timeEntries, focusSessions } = useAppStore();

  // Last 7 days of focus minutes, oldest first.
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = toLocalDateString(d);
    const minutes = timeEntries
      .filter((t) => t.category !== "ESCAPE" && toLocalDateString(new Date(t.startTime)) === key)
      .reduce((a, t) => a + t.durationMinutes, 0);
    return { key, label: DAY_NAMES[d.getDay()], minutes };
  });
  const weekMinutes = days.reduce((a, d) => a + d.minutes, 0);
  const escape = timeEntries
    .filter((t) => t.category === "ESCAPE" && days.some((d) => d.key === toLocalDateString(new Date(t.startTime))))
    .reduce((a, t) => a + t.durationMinutes, 0);
  const weekSessions = focusSessions.filter((s) => days.some((d) => d.key === toLocalDateString(new Date(s.startedAt))));
  const completed = weekSessions.filter((s) => s.completed).length;
  const max = Math.max(60, ...days.map((d) => d.minutes));

  return (
    <Screen>
      <View>
        <Txt variant="heading" weight="semibold">
          المراجعة الأسبوعية
        </Txt>
        <Txt variant="ui" color="ink2">
          كل جمعة: نسبة إنجاز صادقة، ووقت التشتت، ومستوى فعلك. أسبوعاً بعد أسبوع، ترى عامك كما هو.
        </Txt>
      </View>

      <CompletionPanel />
      {/* The coach is the founder's prototype: personal builds only. */}
      {PERSONAL_SYNC_ENABLED ? <CoachReviewPanel /> : null}
      <YearMatrix52 />
      <ValueWeekPanel />

      <Txt variant="subtitle" weight="semibold">آخر 7 أيام</Txt>
      <Row gap={10}>
        <Metric label="وقت التركيز" value={formatMinutes(weekMinutes)} />
        <Metric label="جلسات كاملة" value={`${completed} من ${weekSessions.length}`} />
        <Metric label="وقت مشتّت" value={formatMinutes(escape)} />
      </Row>

      <Card>
        <Txt variant="small" color="ink3">
          دقائق التركيز يومياً
        </Txt>
        <View style={{ flexDirection: ROW, alignItems: "flex-end", justifyContent: "space-between", height: 140, marginTop: 14 }}>
          {days.map((d) => (
            <View key={d.key} style={{ alignItems: "center", flex: 1, gap: 6 }}>
              <Txt variant="caption" color="ink3" align="center">
                {d.minutes || ""}
              </Txt>
              <View
                style={{
                  width: 18,
                  height: Math.max(4, (d.minutes / max) * 100),
                  borderRadius: radius.sm,
                  backgroundColor: d.key === toLocalDateString() ? c.brand : c.brandSoft,
                }}
              />
              <Txt variant="caption" color="ink2" align="center">
                {d.label.slice(0, 3)}
              </Txt>
            </View>
          ))}
        </View>
      </Card>

    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flex: 1, padding: 12 }}>
      <Txt variant="title" weight="medium">
        {value}
      </Txt>
      <Txt variant="caption" color="ink2">
        {label}
      </Txt>
    </Card>
  );
}

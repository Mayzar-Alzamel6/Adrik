import React, { useMemo, useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useAppStore } from "@/stores/useAppStore";
import { formatMinutes, projectMinutesSince, useValueData } from "@/lib/valueInsights";
import { radius, useColors } from "@/theme";
import { Card, Label, LinkButton, Row, SectionHeader, Segmented, Txt } from "@/components/ui";

const MINUTES = ["15", "30", "60", "90"] as const;
const DAYS = ["5", "6", "7"] as const;
/** The window the "real pace" is measured over. */
const PACE_DAYS = 14;
const ETA_FORMAT = new Intl.DateTimeFormat("ar", { day: "numeric", month: "long", year: "numeric" });

/** "A little, consistently": projects what a steady daily block adds up to over a year. */
export function CompoundTool() {
  const c = useColors();
  const timeEntries = useAppStore((s) => s.timeEntries);
  const skills = useAppStore((s) => s.skills);
  const valueData = useValueData();
  const recent = useMemo(() => projectMinutesSince(PACE_DAYS, valueData), [valueData]);
  // Read once per visit: the pace window and ETAs don't need to move while the screen is open.
  const [now] = useState(() => Date.now());
  const since = now - PACE_DAYS * 86400000;
  const recentFocus = timeEntries
    .filter((t) => t.category !== "ESCAPE" && Date.parse(t.startTime) >= since)
    .reduce((a, t) => a + t.durationMinutes, 0);
  const dailyPace = Math.round(recentFocus / PACE_DAYS);
  const paceYearHours = Math.round((dailyPace * 365) / 60);
  const openSkills = skills.filter((s) => s.loggedHours < s.targetHours);
  const [minutes, setMinutes] = useState<(typeof MINUTES)[number]>("60");
  const [days, setDays] = useState<(typeof DAYS)[number]>("6");

  const yearlyHours = Math.round((Number(minutes) * Number(days) * 52) / 60);
  const loggedHours =
    Math.round((timeEntries.filter((t) => t.category !== "ESCAPE").reduce((a, t) => a + t.durationMinutes, 0) / 60) * 10) / 10;

  const outcomes = [
    { icon: "book-open" as const, value: Math.floor(yearlyHours / 8), unit: "كتاباً", text: "بمعدل 8 ساعات قراءة للكتاب" },
    { icon: "award" as const, value: Math.floor(yearlyHours / 40), unit: "دورة مهنية", text: "بمعدل 40 ساعة للدورة الكاملة" },
    {
      icon: "globe" as const,
      value: Math.min(100, Math.round((yearlyHours / 400) * 100)),
      unit: "%",
      text: "من الطريق إلى مستوى متوسط في لغة جديدة (نحو 400 ساعة)",
    },
  ];

  return (
    <View style={{ gap: 16 }}>
      <Card style={{ gap: 14 }}>
        <SectionHeader title="احسب أثر عادتك" description="«قليلٌ دائم خيرٌ من كثيرٍ منقطع»، بالأرقام." />
        <View>
          <Label>دقائق يومياً</Label>
          <Segmented value={minutes} onChange={setMinutes} options={MINUTES.map((m) => ({ value: m, label: `${m} د` }))} />
        </View>
        <View>
          <Label>أيام في الأسبوع</Label>
          <Segmented value={days} onChange={setDays} options={DAYS.map((d) => ({ value: d, label: d }))} />
        </View>
        <View style={{ borderRadius: radius.lg, backgroundColor: c.brandSoft, padding: 18 }}>
          <Txt variant="ui" color="ink2" align="center">
            خلال سنة واحدة
          </Txt>
          <Txt variant="display" weight="semibold" color="brand" align="center">
            {yearlyHours}
          </Txt>
          <Txt align="center">ساعة عمل مركّز</Txt>
        </View>
        {outcomes.map((o) => (
          <Row key={o.text} gap={12} style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: 12 }}>
            <Feather name={o.icon} size={20} color={c.ink2} />
            <View style={{ flex: 1 }}>
              <Txt variant="title" weight="medium">
                {o.value} <Txt color="ink2">{o.unit}</Txt>
              </Txt>
              <Txt variant="small" color="ink2">
                {o.text}
              </Txt>
            </View>
          </Row>
        ))}
        <Txt variant="caption" color="ink3">
          أرقام تقريبية للتوضيح.
        </Txt>
      </Card>
      <Card style={{ gap: 12 }}>
        <SectionHeader title="بإيقاعك الحقيقي" description={`محسوب من جلسات تركيزك في آخر ${PACE_DAYS} يوماً، لا من الأمنيات.`} />
        <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: 14 }}>
          <Txt variant="small" color="ink3">
            متوسطك اليومي
          </Txt>
          <Txt variant="titleLg" weight="medium">
            {formatMinutes(dailyPace)}
          </Txt>
          <Txt variant="small" color="ink2">
            {dailyPace > 0 ? `≈ ${paceYearHours} ساعة في السنة إن استمررت هكذا.` : "ابدأ بجلسة واحدة يومياً، وسيظهر أثرها هنا."}
          </Txt>
        </View>
        <Row style={{ justifyContent: "space-between", borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: 14 }}>
          <Txt variant="small" color="ink3">
            كل ما سجّلته من تركيز
          </Txt>
          <Txt variant="title">{loggedHours} س</Txt>
        </Row>
        {openSkills.map((s) => {
          const perDay = (recent.bySkill.get(s.id) ?? 0) / PACE_DAYS;
          const leftMinutes = (s.targetHours - s.loggedHours) * 60;
          const eta = perDay > 0 ? new Date(now + Math.ceil(leftMinutes / perDay) * 86400000) : null;
          return (
            <View key={s.id} style={{ paddingTop: 10, borderTopWidth: 1, borderTopColor: c.line, gap: 2 }}>
              <Row gap={8}>
                <Feather name="layers" size={15} color={c.brand} />
                <Txt weight="medium" style={{ flex: 1 }}>
                  {s.title}
                </Txt>
                <Txt variant="small" color="ink3">
                  {s.loggedHours} من {s.targetHours} س
                </Txt>
              </Row>
              <Txt variant="small" color="ink2">
                {eta
                  ? `بإيقاعك الحالي تُتم أول ${s.targetHours} ساعة في ${ETA_FORMAT.format(eta)}`
                  : "لم تتدرّب عليها في آخر أسبوعين — اربط بها أولوية الغد"}
              </Txt>
              <View style={{ alignItems: "flex-end" }}>
                <LinkButton title="افتح المهارة" icon="arrow-left" onPress={() => router.push({ pathname: "/tool/[id]", params: { id: "meta", skill: s.id } })} />
              </View>
            </View>
          );
        })}
      </Card>
    </View>
  );
}

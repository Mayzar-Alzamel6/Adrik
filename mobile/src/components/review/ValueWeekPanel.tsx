import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { computeValueWeek, formatMinutes, useValueData } from "@/lib/valueInsights";
import { shiftWeek, weekOf, weekRangeLabel } from "@/lib/utils";
import { ROW, radius, useColors } from "@/theme";
import { Card, IconButton, LinkButton, Row, SectionHeader, Txt } from "@/components/ui";

/** Where the week's focus time went, value by value: the honest answer to "did I live by what I wrote?". */
export function ValueWeekPanel() {
  const c = useColors();
  const data = useValueData();
  // Steps back from this week, so the arrows cross into last year without a reset.
  const [offset, setOffset] = useState(0);
  const week = useMemo(() => shiftWeek(weekOf(), offset), [offset]);
  const result = useMemo(() => computeValueWeek(week, data), [week, data]);

  if (data.values.length === 0) {
    return (
      <Card style={{ gap: 6, alignItems: "center" }}>
        <Feather name="heart" size={22} color={c.ink3} />
        <Txt weight="semibold" align="center">
          أسبوعك بميزان قيمك
        </Txt>
        <Txt variant="ui" color="ink2" align="center">
          اكتب قيمك في دستور القيم، واربط مشاريعك بها، وسترى هنا أين ذهب وقتك قيمةً قيمة.
        </Txt>
        <LinkButton title="افتح دستور القيم" onPress={() => router.push("/tool/identity")} />
      </Card>
    );
  }

  const max = Math.max(1, ...result.rows.map((r) => r.minutes));
  const linkedPct = result.focusMinutes ? Math.round((result.linkedMinutes / result.focusMinutes) * 100) : 0;
  const top = result.rows[0];

  return (
    <Card style={{ gap: 14 }}>
      <View>
        <Txt variant="caption" weight="medium" color="accentStrong">
          المراجعة بالقيم
        </Txt>
        <SectionHeader title="أين ذهب أسبوعك؟" description="وقت التركيز موزّعاً على قيمك، عبر المشاريع التي ربطت بها أولوياتك." />
      </View>
      <Row gap={4} style={{ alignSelf: "flex-end", borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface2, padding: 2 }}>
        <IconButton icon="chevron-right" label="الأسبوع السابق" onPress={() => setOffset((o) => Math.max(-52, o - 1))} />
        <View style={{ minWidth: 100 }}>
          <Txt variant="small" weight="medium" align="center">
            {offset === 0 ? "هذا الأسبوع" : offset === -1 ? "الأسبوع الماضي" : `الأسبوع ${week.week}`}
          </Txt>
          <Txt variant="caption" color="ink3" align="center" style={{ fontSize: 10, lineHeight: 14 }}>
            {weekRangeLabel(week)}
          </Txt>
        </View>
        <IconButton icon="chevron-left" label="الأسبوع التالي" onPress={() => setOffset((o) => Math.min(0, o + 1))} />
      </Row>

      <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 8 }}>
        <Metric label="وقت التركيز" value={formatMinutes(result.focusMinutes)} />
        <Metric label="موصول بقيمة" value={`${linkedPct}%`} hint={formatMinutes(result.linkedMinutes)} tone={linkedPct >= 60 ? "brand" : "accent"} />
        <Metric label="قيم بلا نصيب" value={`${result.neglected.length} من ${result.rows.length}`} tone={result.neglected.length ? "danger" : "brand"} />
      </View>

      {result.focusMinutes === 0 ? (
        <View style={{ borderRadius: radius.md, backgroundColor: c.surface2, padding: 12 }}>
          <Txt variant="ui" color="ink2">
            لا جلسات تركيز مسجّلة في هذا الأسبوع بعد.
          </Txt>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {result.rows.map((r) => (
            <View key={r.value.id} style={{ gap: 4 }}>
              <Row style={{ justifyContent: "space-between" }} gap={8}>
                <Txt weight="medium" numberOfLines={1} style={{ flex: 1 }}>
                  {r.value.title}
                </Txt>
                <Txt variant="small" color="ink2">
                  {formatMinutes(r.minutes)}
                  {r.frogsDone > 0 ? ` · ${r.frogsDone} أولوية` : ""}
                  {r.habitsDone > 0 ? ` · ${r.habitsDone} عادة` : ""}
                </Txt>
              </Row>
              <View style={{ height: 10, borderRadius: 5, backgroundColor: c.surface2, overflow: "hidden", flexDirection: ROW }}>
                <View style={{ width: `${(r.minutes / max) * 100}%`, backgroundColor: r.minutes ? c.brand : "transparent", borderRadius: 5 }} />
              </View>
              {r.projects.length > 0 ? (
                <Txt variant="caption" color="ink3" numberOfLines={1}>
                  عبر: {r.projects.join("، ")}
                </Txt>
              ) : null}
            </View>
          ))}
          {result.unlinkedMinutes > 0 ? (
            <Row gap={8} style={{ paddingTop: 10, borderTopWidth: 1, borderTopColor: c.line }}>
              <Feather name="link-2" size={15} color={c.ink3} />
              <Txt variant="ui" color="ink2" style={{ flex: 1 }}>
                <Txt variant="ui" weight="medium">
                  {formatMinutes(result.unlinkedMinutes)}
                </Txt>{" "}
                بلا مسار: أولويات غير مربوطة بمشروع.
              </Txt>
            </Row>
          ) : null}
        </View>
      )}

      {result.skillMinutes.length > 0 ? (
        <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line, gap: 8 }}>
          <Row gap={6}>
            <Feather name="layers" size={13} color={c.ink3} />
            <Txt variant="small" color="ink3">
              تدرّبت هذا الأسبوع على
            </Txt>
          </Row>
          <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6 }}>
            {result.skillMinutes.map(({ skill, minutes }) => (
              <View key={skill.id} style={{ borderRadius: radius.full, backgroundColor: c.surface2, paddingHorizontal: 12, paddingVertical: 4 }}>
                <Txt variant="small">
                  {skill.title} <Txt variant="small" color="ink3">{formatMinutes(minutes)}</Txt>
                </Txt>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {result.focusMinutes > 0 ? (
        <Insight topTitle={top && top.minutes > 0 ? top.value.title : undefined} neglected={result.neglected.map((v) => v.title)} linkedPct={linkedPct} />
      ) : null}

      <Txt variant="caption" color="ink3">
        المشروع الذي يخدم قيمتين يُحسب وقته لكلتيهما.
      </Txt>
    </Card>
  );
}

function Insight({ topTitle, neglected, linkedPct }: { topTitle?: string; neglected: string[]; linkedPct: number }) {
  const c = useColors();
  const lines: string[] = [];
  if (topTitle) lines.push(`أكثر قيمة خدمتها هذا الأسبوع: «${topTitle}».`);
  if (neglected.length === 1) lines.push(`«${neglected[0]}» لم تأخذ شيئاً. هل تستحق أولوية واحدة الأسبوع القادم؟`);
  if (neglected.length > 1) lines.push(`${neglected.length} قيم لم تأخذ شيئاً. اختر واحدة منها فقط، وامنحها أولوية الأسبوع القادم.`);
  if (linkedPct < 50) lines.push("أغلب وقتك بلا مسار. اربط أولوياتك بمشاريعها ليصير الأسبوع مقروءاً.");
  if (lines.length === 0) return null;
  return (
    <Row gap={10} style={{ alignItems: "flex-start", borderRadius: radius.lg, backgroundColor: c.accentSoft, padding: 14 }}>
      <Feather name="compass" size={18} color={c.accentStrong} style={{ marginTop: 3 }} />
      <View style={{ flex: 1, gap: 4 }}>
        {lines.map((l) => (
          <Txt key={l} variant="ui">
            {l}
          </Txt>
        ))}
      </View>
    </Row>
  );
}

function Metric({ label, value, hint, tone = "brand" }: { label: string; value: string; hint?: string; tone?: "brand" | "accent" | "danger" }) {
  const c = useColors();
  return (
    <View style={{ flexGrow: 1, flexBasis: "30%", borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, paddingHorizontal: 12, paddingVertical: 10 }}>
      <Txt variant="small" color="ink3">
        {label}
      </Txt>
      <Txt variant="title" weight="semibold" color={tone === "brand" ? "brand" : tone === "accent" ? "accentStrong" : "danger"}>
        {value}
      </Txt>
      {hint ? (
        <Txt variant="caption" color="ink3">
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

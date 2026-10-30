import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { computeWeekColor, useAppStore, weeksOfYear, type WeekAuditItem, type WeeklyFrogStats } from "@/stores/useAppStore";
import { weekOf, weekRangeLabel } from "@/lib/utils";
import { ROW, radius, useColors, type ColorName } from "@/theme";
import { Badge, Button, Card, IconButton, Input, Label, LinkButton, ProgressBar, Row, SectionHeader, Sheet, Txt } from "@/components/ui";

type Level = 1 | 2 | 3 | 4;

const LEVELS: { value: Level; title: string; hint: string }[] = [
  { value: 4, title: "فعل هائل", hint: "تقدّم واضح في أولوياتك" },
  { value: 3, title: "فعل عادي", hint: "أسبوع روتيني مقبول" },
  { value: 2, title: "تراجع", hint: "تسويف مقنّع وانشغال بالهامش" },
  { value: 1, title: "توقف", hint: "لم يتحرك شيء يُذكر" },
];

const STATUS = {
  GREEN: { label: "أسبوع ممتاز", fill: "brand", ink: "brandInk", badge: "brand" },
  YELLOW: { label: "أسبوع عادي", fill: "accent", ink: "accentInk", badge: "accent" },
  RED: { label: "أسبوع متعثّر", fill: "danger", ink: "dangerInk", badge: "danger" },
  PENDING: { label: "لم يُراجَع", fill: "surface2", ink: "ink3", badge: "neutral" },
} as const satisfies Record<string, { label: string; fill: ColorName; ink: ColorName; badge: "brand" | "accent" | "danger" | "neutral" }>;

const ref = (w: WeekAuditItem) => ({ year: w.year, week: w.weekNumber });

const numberInput = (text: string, max: number) => Math.max(0, Math.min(max, Number(text.replace(/[^\d.]/g, "")) || 0));

export function YearMatrix52() {
  const c = useColors();
  const { weeklyAudits, submitWeeklyAudit, claimWeeklyReward, getWeeklyAggregatedMinutes, getWeeklyFrogStats } = useAppStore();
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
    const auto = week.colorStatus === "PENDING" && (frogsOfWeek.total > 0 || quality + escape > 0);
    if (auto) {
      // Finished priorities are the real completion. Focus vs. escape time only stands in when no
      // priorities were planned — and escape that is never logged would otherwise make every week 100%.
      rate = frogsOfWeek.total > 0 ? frogsOfWeek.rate : Math.min(100, Math.round((quality / (quality + escape)) * 100));
      lvl = rate >= 70 ? 4 : rate >= 50 ? 3 : 2;
    }
    setAutoCalculated(auto);
    setEscapeHours(week.colorStatus === "PENDING" ? escape : week.escapeHoursTotal);
    setCompletion(rate);
    setLevel(lvl);
    setNotes(week.notes ?? "");
    setSelected(week);
  };

  const save = () => {
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
  const thisYearWeeks = weeksOfYear(weeklyAudits, now.year);
  const thisWeek = thisYearWeeks[now.week - 1];
  // A year with 53 Fridays puts its extra week in the last quarter.
  const quarters = [0, 1, 2, 3].map((q) => weeks.slice(q * 13, q === 3 ? undefined : q * 13 + 13));
  const columns = Math.max(...quarters.map((q) => q.length));
  const previewColor = computeWeekColor(completion, level);

  // The first review sets a baseline; a red verdict on week one reads as failure before the habit even forms.
  const isFirstReview = (w: WeekAuditItem) =>
    weeklyAudits.every((a) => a.colorStatus === "PENDING" || (a.year === w.year && a.weekNumber === w.weekNumber));
  const firstBaseline = selected ? isFirstReview(selected) && previewColor !== "GREEN" : false;

  return (
    <View style={{ gap: 16 }}>
      <Card style={{ gap: 6 }}>
        <Txt variant="small" color="ink3">
          هذا الأسبوع
        </Txt>
        <Txt variant="titleLg" weight="semibold">
          الأسبوع {now.week} من {thisYearWeeks.length}
        </Txt>
        <Txt variant="small" color="ink3">
          من السبت إلى الجمعة: {weekRangeLabel(now)}
        </Txt>
        <Txt variant="ui" color="ink2">
          {thisWeek && thisWeek.colorStatus !== "PENDING"
            ? isFirstReview(thisWeek) && thisWeek.colorStatus !== "GREEN"
              ? "راجعت أول أسابيعك. هذا خط البداية الذي ستقيس عليه ما بعده."
              : `راجعته: ${STATUS[thisWeek.colorStatus].label}.`
            : "خصص عشر دقائق يوم الجمعة لمراجعة صادقة لأسبوعك."}
        </Txt>
        {thisWeekFrogs.total > 0 ? (
          <Txt variant="ui">
            أولويات أُنجزت هذا الأسبوع: <Txt variant="ui" weight="semibold">{thisWeekFrogs.done} من {thisWeekFrogs.total}</Txt> ({thisWeekFrogs.rate}%)
          </Txt>
        ) : null}
        {thisWeek ? (
          <Button
            title={thisWeek.colorStatus === "PENDING" ? "راجع هذا الأسبوع" : "عرض المراجعة"}
            onPress={() => open(thisWeek)}
            style={{ alignSelf: "flex-end", marginTop: 6 }}
          />
        ) : null}
      </Card>

      <Row gap={10}>
        {(["GREEN", "YELLOW", "RED"] as const).map((k) => (
          <Card key={k} style={{ flex: 1, padding: 12 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c[STATUS[k].fill] }} />
            <Txt variant="heading" weight="medium" style={{ marginTop: 6 }}>
              {counts[k]}
            </Txt>
            <Txt variant="caption" color="ink2">
              {STATUS[k].label}
            </Txt>
          </Card>
        ))}
      </Row>

      <Card style={{ gap: 12 }}>
        <SectionHeader
          title={`عامك ${year} في ${weeks.length} أسبوعاً`}
          description={`راجعت ${reviewed} أسبوعاً ${year === now.year ? "حتى الآن" : "في ذلك العام"}. اضغط على أي أسبوع لمراجعته.`}
        />
        {years.length > 1 ? (
          <Row gap={4} style={{ alignSelf: "flex-end", borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface2, padding: 2 }}>
            <IconButton icon="chevron-right" label="العام السابق" onPress={() => year !== years[0] && setYear(years[years.indexOf(year) - 1])} />
            <Txt variant="small" weight="medium">
              {year}
            </Txt>
            <IconButton icon="chevron-left" label="العام التالي" onPress={() => year !== years[years.length - 1] && setYear(years[years.indexOf(year) + 1])} />
          </Row>
        ) : null}
        {quarters.map((qWeeks, qi) => (
          <View key={qi} style={{ gap: 4 }}>
            <Txt variant="caption" color="ink3">
              الربع {qi + 1}
            </Txt>
            <View style={{ flexDirection: ROW, gap: 3 }}>
              {qWeeks.map((w) => {
                const isCurrent = w.year === now.year && w.weekNumber === now.week;
                const isFuture = w.year > now.year || (w.year === now.year && w.weekNumber > now.week);
                const s = STATUS[w.colorStatus];
                return (
                  <Pressable
                    key={w.weekNumber}
                    onPress={() => open(w)}
                    disabled={isFuture}
                    accessibilityLabel={`الأسبوع ${w.weekNumber}: ${weekRangeLabel(ref(w))} — ${s.label}`}
                    style={{
                      width: `${100 / columns}%`,
                      flexShrink: 1,
                      aspectRatio: 1,
                      borderRadius: 6,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: c[s.fill],
                      opacity: isFuture ? 0.45 : 1,
                      borderWidth: isCurrent ? 2 : 0,
                      borderColor: c.ink,
                    }}
                  >
                    <Txt variant="caption" color={s.ink} align="center" style={{ fontSize: 10, lineHeight: 14 }}>
                      {w.weekNumber}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
        <Row gap={12} style={{ flexWrap: "wrap" }}>
          {(["GREEN", "YELLOW", "RED"] as const).map((k) => (
            <Row key={k} gap={5}>
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c[STATUS[k].fill] }} />
              <Txt variant="caption" color="ink2">
                {STATUS[k].label}
              </Txt>
            </Row>
          ))}
        </Row>
      </Card>

      <Sheet
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `مراجعة الأسبوع ${selected.weekNumber}` : undefined}
        description="بلا تجميل وبلا جلد للذات. الرقم الصادق هو ما يحسّن الأسبوع القادم."
      >
        {selected ? (
          <View style={{ gap: 14 }}>
            <Txt variant="small" color="ink3">
              من السبت إلى الجمعة: {weekRangeLabel(ref(selected))}
            </Txt>
            {autoCalculated ? (
              <View style={{ borderRadius: radius.md, backgroundColor: c.brandSoft, padding: 12 }}>
                <Txt variant="ui" color="brand">
                  حسبنا النسبة من أولوياتك المنجزة، والتشتت من الوقت الذي سجّلته. عدّلها إن لزم.
                </Txt>
              </View>
            ) : null}

            <WeekFrogsPanel stats={getWeeklyFrogStats(ref(selected))} currentRate={completion} onUseRate={setCompletion} />

            <Row gap={10}>
              <View style={{ flex: 1 }}>
                <Label>نسبة الإنجاز %</Label>
                <Input keyboardType="number-pad" value={String(completion)} onChangeText={(t) => setCompletion(numberInput(t, 100))} />
              </View>
              <View style={{ flex: 1 }}>
                <Label>ساعات التشتت</Label>
                <Input keyboardType="decimal-pad" value={String(escapeHours)} onChangeText={(t) => setEscapeHours(numberInput(t, 168))} />
              </View>
            </Row>

            <View>
              <Label>كيف كان فعلك هذا الأسبوع؟</Label>
              <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 8 }}>
                {LEVELS.map((l) => (
                  <Pressable
                    key={l.value}
                    onPress={() => setLevel(l.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: level === l.value }}
                    style={{
                      width: "48%",
                      borderRadius: radius.md,
                      borderWidth: level === l.value ? 2 : 1,
                      borderColor: level === l.value ? c.brand : c.line,
                      padding: 10,
                    }}
                  >
                    <Txt weight="medium">{l.title}</Txt>
                    <Txt variant="caption" color="ink3">
                      {l.hint}
                    </Txt>
                  </Pressable>
                ))}
              </View>
            </View>

            <View>
              <Label hint="أين تسرّب الوقت؟ وما التعديل الواحد للأسبوع القادم؟">ملاحظات</Label>
              <Input multiline value={notes} onChangeText={setNotes} />
            </View>

            <Row style={{ justifyContent: "space-between", paddingTop: 10, borderTopWidth: 1, borderTopColor: c.line }}>
              <Row gap={6}>
                <Txt variant="ui" color="ink2">
                  النتيجة:
                </Txt>
                {firstBaseline ? <Badge tone="accent">أسبوع البداية</Badge> : <Badge tone={STATUS[previewColor].badge}>{STATUS[previewColor].label}</Badge>}
              </Row>
              <Button title="حفظ المراجعة" onPress={save} />
            </Row>
            {firstBaseline ? (
              <View style={{ borderRadius: radius.md, backgroundColor: c.accentSoft, padding: 12 }}>
                <Txt variant="ui">
                  هذه أول مراجعة لك، وهي لا تحكم عليك بل ترسم نقطة البداية. أغلب الناس يبدأون أقل مما يتمنون، والمهم أن يكون الأسبوع القادم أفضل من هذا بخطوة واحدة.
                </Txt>
              </View>
            ) : null}
            <Txt variant="small" color="ink3">
              الأسبوع الممتاز يتطلب إنجازاً 70% فأكثر مع فعل هائل، ويفتح لك مكافأة الأسبوع.
            </Txt>

            {selected.colorStatus === "GREEN" ? (
              <Row style={{ justifyContent: "space-between", borderRadius: radius.lg, backgroundColor: c.accentSoft, padding: 12 }}>
                <Row gap={8}>
                  <Feather name="gift" size={18} color={c.accentStrong} />
                  <Txt>استحققت مكافأة هذا الأسبوع</Txt>
                </Row>
                {selected.rewardClaimed ? (
                  <Txt variant="ui" color="brand">
                    استُلمت
                  </Txt>
                ) : (
                  <Button
                    title="استلمها"
                    size="sm"
                    onPress={() => {
                      claimWeeklyReward(ref(selected));
                      setSelected({ ...selected, rewardClaimed: true });
                    }}
                  />
                )}
              </Row>
            ) : null}
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

function WeekFrogsPanel({ stats, currentRate, onUseRate }: { stats: WeeklyFrogStats; currentRate: number; onUseRate: (rate: number) => void }) {
  const c = useColors();
  if (stats.total === 0) {
    return (
      <View style={{ borderRadius: radius.md, backgroundColor: c.surface2, padding: 12 }}>
        <Txt variant="ui" color="ink2">
          لا توجد أولويات يومية مسجّلة لهذا الأسبوع.
        </Txt>
      </View>
    );
  }
  let dayFormat: Intl.DateTimeFormat | null = null;
  try {
    dayFormat = new Intl.DateTimeFormat("ar", { weekday: "short" });
  } catch {
    /* engine without Arabic weekdays */
  }
  return (
    <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: 12, gap: 8 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Txt weight="medium">أولويات الأسبوع</Txt>
        <Txt variant="ui" color="ink2">
          {stats.done} من {stats.total} · {stats.rate}%
        </Txt>
      </Row>
      <ProgressBar value={stats.rate} />
      {stats.items.map((f) => (
        <Row key={`${f.id}-${f.completedAt}`} gap={6}>
          <Feather name="check" size={13} color={c.brand} />
          <Txt variant="ui" numberOfLines={1} style={{ flex: 1 }}>
            {f.title}
          </Txt>
          {dayFormat ? (
            <Txt variant="caption" color="ink3">
              {dayFormat.format(new Date(f.completedAt))}
            </Txt>
          ) : null}
        </Row>
      ))}
      {currentRate !== stats.rate ? <LinkButton title={`استخدم ${stats.rate}% كنسبة الإنجاز`} onPress={() => onUseRate(stats.rate)} /> : null}
    </View>
  );
}

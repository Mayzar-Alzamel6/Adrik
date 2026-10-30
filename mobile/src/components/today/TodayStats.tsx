import React, { useState } from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { HIMMA_VERSES, useAppStore } from "@/stores/useAppStore";
import { formatMinutes, toLocalDateString } from "@/lib/utils";
import { ROW, radius, useColors } from "@/theme";
import { Button, Card, Chip, IconButton, Input, Label, ProgressBar, Row, Sheet, Txt } from "@/components/ui";

const PRINCIPLES = [
  "الفعل يسبق الشعور. ابدأ خطوة صغيرة، وسيلحق بك المزاج.",
  "التعثّر ثقب في الطريق، لا سقوط. العودة الفورية هي كل شيء.",
  "حدّد الأوقات لا الأعمال. جلسة واحدة محمية تكفي لتحريك اليوم.",
  "القليل الدائم يغلب الكثير المنقطع.",
];

export function TodayStats() {
  const c = useColors();
  const { timeEntries, completedDeepWorkSessions, focusStreak, bestFocusStreak, logEscapeMinutes, settings, himmaIndex, nextHimmaVerse } =
    useAppStore();
  const [logOpen, setLogOpen] = useState(false);
  const [mins, setMins] = useState(20);
  const [note, setNote] = useState("");

  const today = toLocalDateString();
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = toLocalDateString(y);
  const focusOn = (day: string) =>
    timeEntries
      .filter((t) => t.category !== "ESCAPE" && toLocalDateString(new Date(t.startTime)) === day)
      .reduce((a, t) => a + t.durationMinutes, 0);
  const focusMin = focusOn(today);
  const yesterdayMin = focusOn(yesterday);
  const escapeMin = timeEntries
    .filter((t) => t.category === "ESCAPE" && toLocalDateString(new Date(t.startTime)) === today)
    .reduce((a, t) => a + t.durationMinutes, 0);
  const target = yesterdayMin > 0 ? yesterdayMin + 1 : 25;
  const won = focusMin >= target;
  const verse = HIMMA_VERSES[himmaIndex % HIMMA_VERSES.length];
  const principle = PRINCIPLES[new Date().getDate() % PRINCIPLES.length];

  const submit = () => {
    if (mins > 0) logEscapeMinutes(mins, note.trim() || undefined);
    setNote("");
    setLogOpen(false);
  };

  return (
    <View style={{ gap: 16 }}>
      <Card>
        <Txt variant="small" color="ink3">
          حصيلة اليوم
        </Txt>
        <Row gap={12} style={{ marginTop: 10 }}>
          <Stat icon="clock" label="وقت التركيز" value={formatMinutes(focusMin)} tone="brand" />
          <Stat icon="hourglass" label="وقت مشتّت" value={formatMinutes(escapeMin)} tone="danger" />
        </Row>
        <Row style={{ justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line }}>
          <Txt variant="small" color="ink2">
            جلسات كاملة اليوم: <Txt variant="small" weight="semibold">{completedDeepWorkSessions}</Txt>
          </Txt>
          <Button title="تسجيل وقت مشتّت" variant="quiet" size="sm" onPress={() => setLogOpen(true)} />
        </Row>
      </Card>

      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <Txt variant="small" color="ink3">
            تحدّي اليوم
          </Txt>
          {won ? (
            <Txt variant="caption" weight="medium" color="brand">
              تجاوزته
            </Txt>
          ) : null}
        </Row>
        <Txt style={{ marginTop: 6 }}>
          {yesterdayMin > 0 ? `تجاوز تركيز أمس: ${formatMinutes(yesterdayMin)}` : "أكمل 25 دقيقة تركيز على الأقل"}
        </Txt>
        <View style={{ marginTop: 10 }}>
          <ProgressBar value={Math.round((focusMin / target) * 100)} tone={won ? "brand" : "accent"} />
        </View>
        <Txt variant="caption" color="ink3" style={{ marginTop: 4 }}>
          {formatMinutes(focusMin)} من {formatMinutes(target)}
        </Txt>
        <Row gap={12} style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line }}>
          <View style={{ flex: 1 }}>
            <Txt variant="titleLg" weight="medium">
              {focusStreak}
            </Txt>
            <Txt variant="caption" color="ink2">
              سلسلة الجلسات الكاملة
            </Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="titleLg" weight="medium">
              {bestFocusStreak}
            </Txt>
            <Txt variant="caption" color="ink2">
              رقمك القياسي
            </Txt>
          </View>
        </Row>
      </Card>

      {settings.faithContent ? (
        <Card tone="accent">
          <Txt variant="caption" weight="medium" color="accentStrong">
            وقفة
          </Txt>
          <Txt variant="subtitle" style={{ marginTop: 8, lineHeight: 36 }}>
            ﴿{verse.verse}﴾
          </Txt>
          <Row style={{ justifyContent: "space-between", marginTop: 8 }}>
            <Txt variant="caption" color="ink3">
              {verse.source}
            </Txt>
            <IconButton icon="refresh-cw" label="آية أخرى" onPress={nextHimmaVerse} />
          </Row>
        </Card>
      ) : (
        <Card>
          <Txt variant="caption" weight="medium" color="accentStrong">
            مبدأ اليوم
          </Txt>
          <Txt variant="subtitle" style={{ marginTop: 6 }}>
            {principle}
          </Txt>
        </Card>
      )}

      <Sheet open={logOpen} onClose={() => setLogOpen(false)} title="تسجيل وقت مشتّت" description="بلا لوم. الرقم الصادق هو ما يصنع مراجعة أسبوعية مفيدة.">
        <Label>كم دقيقة تقريباً؟</Label>
        <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 8 }}>
          {[10, 20, 30, 60].map((m) => (
            <Chip key={m} label={`${m} د`} selected={mins === m} onPress={() => setMins(m)} />
          ))}
        </View>
        <Input
          keyboardType="number-pad"
          value={String(mins || "")}
          onChangeText={(t) => setMins(Math.min(600, Number(t.replace(/\D/g, "")) || 0))}
          accessibilityLabel="عدد الدقائق"
        />
        <Label hint="اختياري">فيمَ ذهب؟</Label>
        <Input value={note} onChangeText={setNote} placeholder="مثال: تصفّح الجوال" />
        <Row style={{ justifyContent: "flex-start" }}>
          <Button title="تسجيل" onPress={submit} disabled={mins <= 0} />
          <Button title="إلغاء" variant="ghost" onPress={() => setLogOpen(false)} />
        </Row>
      </Sheet>
    </View>
  );
}

function Stat({ icon, label, value, tone }: { icon: "clock" | "hourglass"; label: string; value: string; tone: "brand" | "danger" }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, borderRadius: radius.md, backgroundColor: c.surface2, padding: 12 }}>
      <Feather name={icon === "clock" ? "clock" : "watch"} size={16} color={tone === "brand" ? c.brand : c.danger} />
      <Txt variant="heading" weight="medium" style={{ marginTop: 6 }}>
        {value}
      </Txt>
      <Txt variant="small" color="ink2">
        {label}
      </Txt>
    </View>
  );
}

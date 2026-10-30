import React, { useEffect } from "react";
import { View } from "react-native";
import { useAppStore } from "@/stores/useAppStore";
import { useFocusGuardStore } from "@/stores/useFocusGuardStore";
import { applyTuning } from "@/lib/focusGuard";
import { weeklyTuning } from "@/lib/output";
import { weekOf } from "@/lib/utils";
import { radius, useColors } from "@/theme";
import { Button, Row, Txt } from "@/components/ui";

/** Once a week in the morning: one-tap suggestion to raise or lower the day's deep-block limit. Never applied silently. */
export function TuningCard() {
  const c = useColors();
  const tuning = useFocusGuardStore((s) => s.tuning);
  const deepCap = useFocusGuardStore((s) => s.deepCap);
  const offerTuning = useFocusGuardStore((s) => s.offerTuning);
  const answerTuning = useFocusGuardStore((s) => s.answerTuning);
  const { year, week } = weekOf();
  const key = `${year}-W${week}`;

  useEffect(() => {
    if (useFocusGuardStore.getState().tuning?.week === key) return;
    const s = useAppStore.getState();
    offerTuning(key, weeklyTuning(s, useFocusGuardStore.getState().rcaLog));
  }, [key, offerTuning]);

  if (!tuning || tuning.week !== key || tuning.answered) return null;
  const next = applyTuning(deepCap, tuning.change);
  if (next === deepCap) return null;

  return (
    <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, padding: 14, gap: 10 }}>
      <Txt weight="semibold">{tuning.change === "up" ? "📈 أسبوعك الماضي كان قوياً" : "📉 أسبوعك الماضي كان ثقيلاً"}</Txt>
      <Txt variant="ui" color="ink2">
        {tuning.change === "up"
          ? `أكملت أغلب كتلك بلا انهيار طاقة. ارفع الحد إلى ${next} كتل عميقة يومياً؟`
          : `إكمال منخفض أو استنزاف مرتفع. خفّض الحد إلى ${next} كتل عميقة يومياً؟`}
      </Txt>
      <Row>
        <Button title="موافق" size="sm" onPress={() => answerTuning(true)} />
        <Button title={`أبقِه ${deepCap}`} variant="ghost" size="sm" onPress={() => answerTuning(false)} />
      </Row>
    </View>
  );
}

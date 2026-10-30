import React from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppStore } from "@/stores/useAppStore";
import { toLocalDateString } from "@/lib/utils";
import { useColors } from "@/theme";
import { Button, Card, Row, Txt } from "@/components/ui";

/** Shown once after a day or more away: no lost-day counters, just one small step back in. */
export function RecoveryBanner() {
  const c = useColors();
  const { lastActiveDate, dismissRecovery, performKaizenReset } = useAppStore();
  // lastActiveDate is refreshed by real actions. Yesterday's date is a normal morning, not an absence:
  // only a whole day with nothing recorded earns the welcome back.
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (!(lastActiveDate < toLocalDateString(yesterday))) return null;

  return (
    <Card tone="brand" style={{ gap: 10 }}>
      <Row gap={10}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
          <Feather name="heart" size={18} color={c.brand} />
        </View>
        <Txt variant="subtitle" weight="semibold" style={{ flex: 1 }}>
          أهلاً بعودتك
        </Txt>
      </Row>
      <Txt variant="ui" color="ink2">
        الانقطاع ثقب في الطريق، لا سقوط عنه. لا عدّادات صُفّرت ولا لوم. خطوة صغيرة واحدة الآن تعيدك إلى الدوران.
      </Txt>
      <Row>
        <Button title="جلسة 15 دقيقة الآن" onPress={performKaizenReset} />
        <Button title="لاحقاً" variant="ghost" onPress={dismissRecovery} />
      </Row>
    </Card>
  );
}

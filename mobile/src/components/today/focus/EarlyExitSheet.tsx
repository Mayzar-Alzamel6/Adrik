import React, { useState } from "react";
import { View } from "react-native";
import { EXTERNAL_INTERRUPTION } from "@/stores/useAppStore";
import { fullSessions } from "@/lib/utils";
import { ROW, radius, useColors } from "@/theme";
import { Button, Chip, Input, Label, Row, Sheet, Txt } from "@/components/ui";

const EXIT_REASONS = [EXTERNAL_INTERRUPTION, "تعب أو إرهاق", "تشتّت وهروب", "المهمة لم تكن واضحة"];

/** Ending a session before its time: delivered early, or a written reason; the streak's stake is spelled out. */
export function EarlyExitSheet({
  open,
  onClose,
  streak,
  streakAtRisk,
  onDelivered,
  onEndEarly,
}: {
  open: boolean;
  onClose: () => void;
  streak: number;
  streakAtRisk: boolean;
  onDelivered: () => void;
  onEndEarly: (reason: string) => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="إنهاء الجلسة قبل وقتها؟"
      description={
        streak === 0
          ? "لا بأس، لكن سجّلها بصدق."
          : streakAtRisk
            ? `هذا ثاني تعثّر على التوالي: سلسلتك (${fullSessions(streak)}) ستعود إلى الصفر، إلا إن كانت مقاطعة خارجية لا مفر منها.`
            : `سلسلتك (${fullSessions(streak)}) تتحمّل تعثّراً واحداً. لا تفوّتها مرتين: الجلسة التالية يجب أن تكتمل.`
      }
    >
      {open ? <Body onClose={onClose} onDelivered={onDelivered} onEndEarly={onEndEarly} /> : null}
    </Sheet>
  );
}

function Body({ onClose, onDelivered, onEndEarly }: { onClose: () => void; onDelivered: () => void; onEndEarly: (reason: string) => void }) {
  const c = useColors();
  const [reason, setReason] = useState("");
  return (
    <>
      <View style={{ borderRadius: radius.md, backgroundColor: c.brandSoft, padding: 14, gap: 10 }}>
        <Txt variant="ui">هل أنهيت ما التزمت به قبل الوقت؟</Txt>
        <Button title="نعم، أنجزت العقد" icon="check" size="sm" onPress={onDelivered} style={{ alignSelf: "flex-end" }} />
      </View>
      <Label>وإن لم تُنجزه، ما الذي قطعك؟</Label>
      <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 8 }}>
        {EXIT_REASONS.map((r) => (
          <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />
        ))}
      </View>
      <Input value={reason} onChangeText={setReason} placeholder="أو اكتب السبب" />
      <Row style={{ justifyContent: "space-between" }}>
        <Button title="سأكمل الجلسة" onPress={onClose} />
        <Button title="إنهاء الآن" variant="ghost" disabled={!reason.trim()} onPress={() => onEndEarly(reason.trim())} />
      </Row>
    </>
  );
}

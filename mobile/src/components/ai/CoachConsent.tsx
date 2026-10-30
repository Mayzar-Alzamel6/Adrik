import React from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ROW, radius, useColors } from "@/theme";
import { Button, Sheet, Txt } from "@/components/ui";
import { setCoachConsent } from "@/lib/ai/coachConsent";
import { COACH_TEXT } from "@/lib/ai/texts";
import type { AiConsent } from "@/lib/safety/analysis";

const T = COACH_TEXT.consent;

/** Asked once, before the coach first sends anything. Inline, for screens that are already a sheet. */
export function CoachConsentPanel({ onChoose }: { onChoose: (choice: AiConsent) => void }) {
  const c = useColors();
  const choose = (choice: AiConsent) => {
    setCoachConsent(choice);
    onChoose(choice);
  };
  return (
    <View style={{ gap: 12 }}>
      <Txt variant="subtitle" weight="semibold">
        {T.title}
      </Txt>
      <View style={{ flexDirection: ROW, gap: 10, borderRadius: radius.md, backgroundColor: c.surface2, padding: 14 }}>
        <Feather name="zap" size={18} color={c.accentStrong} style={{ marginTop: 2 }} />
        <Txt style={{ flex: 1 }}>{T.body}</Txt>
      </View>
      <Txt variant="ui" color="ink2">
        {T.note}
      </Txt>
      <Button title={T.accept} onPress={() => choose("ai")} />
      <Button title={T.decline} variant="secondary" onPress={() => choose("local")} />
    </View>
  );
}

/** The same question as a sheet. Closing without choosing keeps the local rules. */
export function CoachConsentSheet({ open, onChoose }: { open: boolean; onChoose: (choice: AiConsent) => void }) {
  return (
    <Sheet
      open={open}
      onClose={() => {
        setCoachConsent("local");
        onChoose("local");
      }}
    >
      <CoachConsentPanel onChoose={onChoose} />
    </Sheet>
  );
}

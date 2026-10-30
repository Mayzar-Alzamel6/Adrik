import React, { useState } from "react";
import { Linking, Pressable, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { radius, useColors } from "@/theme";
import { Button, Card, Row, Txt } from "@/components/ui";
import { helplinesFor } from "@/lib/safety/helplines";
import { currentZone } from "@/lib/safety/region";
import { SAFETY_TEXT } from "@/lib/safety/texts";

const T = SAFETY_TEXT.crisis;

/**
 * Shown instead of any analysis when the words point to suicide, self-harm or deep hopelessness.
 * Calm and short: empathy, a nudge toward a trusted person or a professional, and the local support lines.
 */
export function CrisisSupport({ onDone }: { onDone: () => void }) {
  const c = useColors();
  const [lines] = useState(() => helplinesFor(currentZone()));

  return (
    <Card style={{ gap: 14 }}>
      <Row gap={10} style={{ alignItems: "flex-start" }}>
        <View
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}
        >
          <Feather name="heart" size={18} color={c.brand} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt variant="subtitle" weight="semibold">
            {T.title}
          </Txt>
          <Txt color="ink2">{T.body}</Txt>
        </View>
      </Row>

      <View style={{ borderRadius: radius.lg, backgroundColor: c.surface2, padding: 12 }}>
        <Txt>{T.reachOut}</Txt>
      </View>

      {lines.map((h) => (
        <Pressable
          key={`${h.area}-${h.number}`}
          onPress={() => Linking.openURL(`tel:${h.number}`)}
          accessibilityRole="link"
          accessibilityLabel={`اتصل بـ ${h.name}، ${h.area}`}
          style={{ borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: 12 }}
        >
          <Row style={{ justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Txt weight="medium">{h.name}</Txt>
              <Txt variant="ui" color="ink2">
                {h.area}
                {h.note ? ` · ${h.note}` : ""}
              </Txt>
            </View>
            <Row gap={6}>
              <Feather name="phone" size={16} color={c.brand} />
              <Txt weight="semibold" color="brand">
                {h.number}
              </Txt>
            </Row>
          </Row>
        </Pressable>
      ))}
      <Txt variant="ui" color="ink2">
        {T.emergency}
      </Txt>

      <Button title={T.done} variant="secondary" onPress={onDone} />
    </Card>
  );
}

import React from "react";
import { Pressable, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { useAppStore } from "@/stores/useAppStore";
import { habitStats, isDue } from "@/lib/habits";
import { useColors } from "@/theme";
import { Card, LinkButton, Row, Txt } from "@/components/ui";

/** Habits happen during the day, not only at the evening review: tick them where you already are. */
export function HabitsTodayCard() {
  const c = useColors();
  const { binaryHabits, habitHistory, currentDay, toggleBinaryHabit } = useAppStore();
  const due = binaryHabits.filter((h) => !h.archived && isDue(h, currentDay));
  if (due.length === 0) return null;
  const done = due.filter((h) => h.isCompleted).length;

  return (
    <Card style={{ gap: 8 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Txt variant="small" color="ink3">
          عادات اليوم
        </Txt>
        <Txt variant="caption" color="ink3">
          {done} من {due.length}
        </Txt>
      </Row>
      {due.map((h) => {
        const streak = habitStats(h, habitHistory, currentDay).streak;
        return (
          <Pressable
            key={h.id}
            onPress={() => toggleBinaryHabit(h.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: h.isCompleted }}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, paddingVertical: 4 })}
          >
            <Row gap={10}>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 1.5,
                  borderColor: h.isCompleted ? c.brand : c.lineStrong,
                  backgroundColor: h.isCompleted ? c.brand : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {h.isCompleted ? <Feather name="check" size={12} color={c.brandInk} /> : null}
              </View>
              <Txt variant="ui" numberOfLines={1} color={h.isCompleted ? "ink3" : "ink"} style={[{ flex: 1 }, h.isCompleted ? { textDecorationLine: "line-through" } : null]}>
                {h.title}
              </Txt>
              {streak > 0 ? (
                <Row gap={2}>
                  <Feather name="zap" size={12} color={c.accentStrong} />
                  <Txt variant="caption" color="accentStrong">
                    {streak}
                  </Txt>
                </Row>
              ) : null}
            </Row>
          </Pressable>
        );
      })}
      <View style={{ alignItems: "flex-end" }}>
        <LinkButton title="متابعة العادات" icon="chevron-left" onPress={() => router.push("/tool/habits")} />
      </View>
    </Card>
  );
}

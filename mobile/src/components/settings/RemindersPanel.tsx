import React, { useState } from "react";
import { View } from "react-native";
import { useReminderStore, type DailyReminder } from "@/stores/useReminderStore";
import { notificationsSupported, syncDailyReminder } from "@/lib/notifications";
import { ROW, useColors } from "@/theme";
import { Chip, SwitchRow, Txt } from "@/components/ui";

const TIMES = {
  morning: [6, 7, 8, 9],
  evening: [20, 21, 22, 23],
} as const;

const label = (hour: number) => `${hour > 12 ? hour - 12 : hour}:00 ${hour < 12 ? "ص" : "م"}`;

export function RemindersPanel() {
  const c = useColors();
  const { morning, evening, setReminder } = useReminderStore();
  const [denied, setDenied] = useState(false);

  const update = async (which: "morning" | "evening", current: DailyReminder, changes: Partial<DailyReminder>) => {
    const next = { ...current, ...changes };
    const ok = await syncDailyReminder(which, next);
    if (!ok) {
      setDenied(true);
      setReminder(which, { enabled: false });
      return;
    }
    setDenied(false);
    setReminder(which, next);
  };

  if (!notificationsSupported) {
    return (
      <Txt variant="ui" color="ink3">
        التذكيرات تعمل في تطبيق الهاتف فقط.
      </Txt>
    );
  }

  return (
    <View>
      {(["morning", "evening"] as const).map((which, i) => {
        const r = which === "morning" ? morning : evening;
        return (
          <View key={which} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: c.line, paddingBottom: 8 }}>
            <SwitchRow
              title={which === "morning" ? "تذكير الصباح" : "تذكير المساء"}
              description={which === "morning" ? "ابدأ أولويتك الأولى قبل أن يسبقك شيء." : "أغلق يومك واعتمد أولويات الغد."}
              value={r.enabled}
              onChange={(enabled) => update(which, r, { enabled })}
            />
            {r.enabled ? (
              <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 8 }}>
                {TIMES[which].map((h) => (
                  <Chip key={h} label={label(h)} selected={r.hour === h} onPress={() => update(which, r, { hour: h, minute: 0 })} />
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
      {denied ? (
        <Txt variant="small" color="danger" style={{ marginTop: 8 }}>
          الإشعارات مرفوضة لهذا التطبيق. فعّلها من إعدادات الهاتف ثم حاول مجدداً.
        </Txt>
      ) : null}
      <Txt variant="small" color="ink3" style={{ marginTop: 8 }}>
        تنبيه نهاية الجلسة والاستراحة يصلك تلقائياً، حتى لو كانت الشاشة مقفلة.
      </Txt>
    </View>
  );
}

import React, { useState } from "react";
import { View } from "react-native";
import { applyBackup, exportBackup, pickBackup, summarizeBackup, type BackupFile } from "@/lib/backup";
import { radius, useColors } from "@/theme";
import { Button, Row, Txt } from "@/components/ui";

/** Export and import use the web app's backup format, so data moves between web and phone. */
export function BackupPanel() {
  const c = useColors();
  const [pending, setPending] = useState<BackupFile["data"] | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: "brand" | "danger" } | null>(null);

  const pick = async () => {
    setMessage(null);
    try {
      const data = await pickBackup();
      if (data) setPending(data);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "تعذّر قراءة الملف.", tone: "danger" });
    }
  };

  const restore = async () => {
    if (!pending) return;
    await applyBackup(pending);
    setPending(null);
    setMessage({ text: "استُعيدت بياناتك.", tone: "brand" });
  };

  const s = pending ? summarizeBackup(pending) : null;

  return (
    <View style={{ gap: 10 }}>
      <Row>
        <Button title="تصدير نسخة" icon="download" variant="secondary" size="sm" onPress={() => exportBackup().catch(() => setMessage({ text: "تعذّر التصدير.", tone: "danger" }))} />
        <Button title="استيراد نسخة" icon="upload" variant="secondary" size="sm" onPress={pick} />
      </Row>
      <Txt variant="small" color="ink3">
        تقبل النسخ المصدّرة من نسخة الويب أيضاً، فتنقل بياناتك إلى هاتفك.
      </Txt>

      {s && pending ? (
        <View style={{ borderRadius: radius.md, backgroundColor: c.surface2, padding: 12, gap: 6 }}>
          <Txt variant="ui" weight="medium">
            جاهزة للاستيراد{s.name ? ` (${s.name})` : ""}:
          </Txt>
          <Txt variant="ui" color="ink2">
            القيم: {s.values} · جلسات التركيز: {s.sessions} · أيام مسجّلة: {s.days} · مشاريع: {s.projects}
          </Txt>
          <Txt variant="small" color="danger">
            ستحلّ محل بياناتك الحالية على هذا الهاتف.
          </Txt>
          <Row>
            <Button title="استيراد الآن" size="sm" onPress={restore} />
            <Button title="إلغاء" variant="ghost" size="sm" onPress={() => setPending(null)} />
          </Row>
        </View>
      ) : null}

      {message ? (
        <Txt variant="ui" color={message.tone}>
          {message.text}
        </Txt>
      ) : null}
    </View>
  );
}

import React, { useState } from "react";
import { View } from "react-native";
import { buildUsageReport, shareUsageReport, summarizeUsageReport, type UsageReport } from "@/lib/usageReport";
import { radius, useColors } from "@/theme";
import { Button, Input, Label, Row, Txt } from "@/components/ui";

export function UsageReportPanel() {
  const c = useColors();
  const [note, setNote] = useState("");
  const [report, setReport] = useState<UsageReport | null>(null);
  const [result, setResult] = useState<"shared" | "downloaded" | "error" | null>(null);

  const send = async () => {
    if (!report) return;
    try {
      setResult(await shareUsageReport(report));
    } catch {
      setResult("error");
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={{ borderRadius: radius.md, backgroundColor: c.surface2, padding: 12 }}>
        <Txt variant="ui" color="ink2">
          التقرير أرقام فقط: أيام نشاطك، وعدد جلساتك ومدتها، ونسبة إنجاز أولوياتك، والأدوات التي استخدمتها.
        </Txt>
        <Txt variant="ui" weight="medium" style={{ marginTop: 4 }}>
          لا يحتوي أي نص كتبته: لا مهامك، ولا أفكارك، ولا مشاعرك، ولا اسمك.
        </Txt>
      </View>

      <View>
        <Label hint="اختياري. هذه الملاحظة وحدها تُرسل كما كتبتها.">ملاحظة للمؤسس</Label>
        <Input
          multiline
          value={note}
          onChangeText={(t) => {
            setNote(t);
            setReport(null);
          }}
          placeholder="ما الذي أعجبك؟ وما الذي أزعجك أو لم تفهمه؟"
        />
      </View>

      {!report ? (
        <Button title="جهّز التقرير" icon="bar-chart-2" variant="secondary" onPress={() => { setReport(buildUsageReport(note)); setResult(null); }} />
      ) : (
        <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: c.line, padding: 12, gap: 6 }}>
          <Txt variant="ui" weight="medium">
            هذا ما سيُرسل:
          </Txt>
          {summarizeUsageReport(report).map((line) => (
            <Txt key={line} variant="ui" color="ink2">
              • {line}
            </Txt>
          ))}
          {report.note ? (
            <Txt variant="ui" color="ink2">
              • ملاحظتك كما كتبتها
            </Txt>
          ) : null}
          <Row style={{ marginTop: 6 }}>
            <Button title="أرسل التقرير" icon="send" size="sm" onPress={send} />
            <Button title="إلغاء" variant="ghost" size="sm" onPress={() => setReport(null)} />
          </Row>
          {result === "shared" ? (
            <Txt variant="ui" color="brand">
              شكراً لك! اختر واتساب أو البريد وأرسله للمؤسس.
            </Txt>
          ) : result === "downloaded" ? (
            <Txt variant="ui" color="brand">
              نُزّل الملف. أرسله للمؤسس، وشكراً لك!
            </Txt>
          ) : result === "error" ? (
            <Txt variant="ui" color="danger">
              تعذّر فتح المشاركة على هذا الجهاز.
            </Txt>
          ) : null}
        </View>
      )}
    </View>
  );
}

import React, { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { useAppStore } from "@/stores/useAppStore";
import { reframeThought } from "@/lib/reframe";
import { analyzeSafely, type Reframe } from "@/lib/safety/analysis";
import { SAFETY_TEXT } from "@/lib/safety/texts";
import { radius, useColors } from "@/theme";
import { Badge, Button, Card, Input, Label, Row, SectionHeader, Txt } from "@/components/ui";
import { SendTo } from "@/components/flow/SendTo";
import { CrisisSupport } from "@/components/tools/CrisisSupport";

/**
 * Thought reframing: event → automatic thought → feeling → urge, then a calmer thought and one small step.
 * Everything stays on the phone: the safety kit's order (crisis check first) with the local rule engine only.
 */
export function CbtTool() {
  const c = useColors();
  const cbtLogs = useAppStore((s) => s.cbtLogs);
  const addCbtLog = useAppStore((s) => s.addCbtLog);
  // Arriving from an interrupted focus session: the situation is already known.
  const { event } = useLocalSearchParams<{ event?: string }>();
  const [eventText, setEventText] = useState(typeof event === "string" ? event : "");
  const [thought, setThought] = useState("");
  const [emotion, setEmotion] = useState("");
  const [body, setBody] = useState("");
  const [urge, setUrge] = useState("");
  const [result, setResult] = useState<Reframe | null>(null);
  const [crisis, setCrisis] = useState(false);

  const submit = async () => {
    if (!thought.trim()) return;
    setResult(null);
    const outcome = await analyzeSafely(
      { event: eventText, automaticThought: thought, emotion, bodyLocation: body, actionTendency: urge },
      // No AI on the phone: nothing leaves the device, so there is no consent to ask.
      { consent: "local", aiAvailable: () => false, analyze: async () => ({ risk: false, engine: "local", ...reframeThought(thought) }) }
    );
    // A crisis is never saved to the log: it syncs and shows up in reports.
    if (outcome.kind === "crisis") return setCrisis(true);
    if (outcome.kind !== "result") return;
    const { distortionType, reframedThought, nextSmallAction } = outcome.result;
    setResult(outcome.result);
    addCbtLog({
      event: eventText || "—",
      automaticThought: thought,
      emotion: emotion || "—",
      bodyLocation: body || "—",
      distortionType,
      reframedThought,
      nextSmallAction,
    });
  };

  const reset = () => {
    setEventText("");
    setThought("");
    setEmotion("");
    setBody("");
    setUrge("");
    setResult(null);
    setCrisis(false);
  };

  if (crisis) return <CrisisSupport onDone={reset} />;

  return (
    <View style={{ gap: 16 }}>
      <Card style={{ gap: 12 }}>
        <View>
          <Label hint="ماذا حدث بالضبط؟ الوقائع فقط.">الموقف</Label>
          <Input value={eventText} onChangeText={setEventText} placeholder="مثال: تأخرت ساعة عن بدء العمل" />
        </View>
        <View>
          <Label hint="الجملة التي قالها عقلك في تلك اللحظة.">الفكرة التلقائية</Label>
          <Input multiline value={thought} onChangeText={setThought} placeholder="مثال: ضاع اليوم كله، أنا لا أنجز شيئاً أبداً" />
        </View>
        <Row gap={10}>
          <View style={{ flex: 1 }}>
            <Label>الشعور</Label>
            <Input value={emotion} onChangeText={setEmotion} placeholder="قلق، إحباط…" />
          </View>
          <View style={{ flex: 1 }}>
            <Label>أين في جسدك؟</Label>
            <Input value={body} onChangeText={setBody} placeholder="ضيق في الصدر…" />
          </View>
        </Row>
        <View>
          <Label>ماذا تدفعك الفكرة لأن تفعل؟</Label>
          <Input value={urge} onChangeText={setUrge} placeholder="مثال: فتح الهاتف وترك المهمة" />
        </View>
        <Row>
          <Button title="فكّك الفكرة" icon="cpu" onPress={submit} disabled={!thought.trim()} />
          {result ? <Button title="فكرة جديدة" variant="ghost" onPress={reset} /> : null}
        </Row>
        <Txt variant="caption" color="ink3">
          {SAFETY_TEXT.disclaimer}
        </Txt>
      </Card>

      {result ? (
        <Card style={{ gap: 12 }}>
          <View>
            <Badge tone="accent">الفخ الذي وقعت فيه</Badge>
            <Txt variant="subtitle" weight="semibold" style={{ marginTop: 6 }}>
              {result.distortionType}
            </Txt>
          </View>
          <View style={{ borderRadius: radius.lg, backgroundColor: c.surface2, padding: 12 }}>
            <Txt variant="small" weight="medium" color="ink2">
              فكرة أهدأ وأصدق
            </Txt>
            <Txt style={{ marginTop: 4 }}>{result.reframedThought}</Txt>
          </View>
          <View style={{ borderRadius: radius.lg, backgroundColor: c.brandSoft, padding: 12 }}>
            <Txt variant="small" weight="medium" color="brand">
              خطوتك التالية الصغيرة
            </Txt>
            <Txt style={{ marginTop: 4 }}>{result.nextSmallAction}</Txt>
            <Button
              title="نفّذ هذه الخطوة الآن (أضفها لأولويات اليوم)"
              icon="play"
              size="sm"
              style={{ marginTop: 10, alignSelf: "flex-end" }}
              onPress={() => {
                const state = useAppStore.getState();
                if (state.frogs.filter((f) => !f.isCompleted).length < 3) {
                  const res = state.appendFrog(result.nextSmallAction, "QUALITY");
                  if (res.ok) {
                    state.updateFrog(res.id, { definitionOfDone: result.nextSmallAction });
                  }
                }
                state.resetFocus("FLUENCY_15");
                router.navigate("/");
              }}
            />
            <View style={{ marginTop: 10 }}>
              <SendTo title={result.nextSmallAction} label="أو احفظها:" />
            </View>
          </View>
          <Txt variant="caption" color="ink3">
            {SAFETY_TEXT.engine.local}
          </Txt>
        </Card>
      ) : (
        <Card style={{ gap: 4 }}>
          <Txt weight="semibold" align="center">
            الفكرة ليست حقيقة
          </Txt>
          <Txt variant="ui" color="ink2" align="center">
            اكتب ما يقوله لك عقلك الآن. سنكشف الفخ الذي فيه، ونقترح فكرة أهدأ وخطوة صغيرة تعيدك للحركة.
          </Txt>
        </Card>
      )}

      {cbtLogs.length > 0 ? (
        <Card style={{ gap: 10 }}>
          <SectionHeader title="سجلّك" description={`${cbtLogs.length} فكرة فكّكتها حتى الآن.`} />
          {cbtLogs.slice(0, 5).map((log, i) => (
            <View key={log.id} style={{ paddingTop: i ? 10 : 0, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <Txt variant="ui" color="ink3" style={{ textDecorationLine: "line-through" }}>
                {log.automaticThought}
              </Txt>
              <Txt>← {log.reframedThought}</Txt>
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

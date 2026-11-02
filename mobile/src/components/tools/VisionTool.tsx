import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useAppStore } from "@/stores/useAppStore";
import { ROW, radius, useColors } from "@/theme";
import { Badge, Button, Card, Input, Label, LinkButton, ProgressRing, Row, Txt } from "@/components/ui";

const TOTAL = 60;
const STAGES = [
  { title: "المكان", prompt: "أغمض عينيك وتخيّل المكان الذي تقف فيه بعد أن وصلت: ما الذي تراه حولك؟ الضوء، والأشياء، ووجوه من معك." },
  { title: "الصوت والفعل", prompt: "اسمع صوتك وأنت تتحدث بثقة، وترى يديك تنجز ما كان صعباً عليك يوماً. لاحظ هدوءك وتمكّنك." },
  { title: "الشعور", prompt: "اشعر بطمأنينة من لم يضيّع عمره: أنك تحمّلت المسؤولية، وبدأت حين كان البدء ثقيلاً." },
];

/** 60-second guided visualization of the user's own vision, then straight into a focus session. */
export function VisionTool() {
  const c = useColors();
  const { profile, updateProfile, resetFocus, values } = useAppStore();
  const current = useAppStore((s) => s.getCurrentFrog());
  const nextStep = current && !current.isCompleted ? current : undefined;
  const [editing, setEditing] = useState(!profile.vision);
  const [draft, setDraft] = useState(profile.vision ?? "");
  // Paused time is banked in `spent`; while running, elapsed also counts from `runningSince`.
  const [spent, setSpent] = useState(0);
  const [runningSince, setRunningSince] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (runningSince === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [runningSince]);

  const elapsed = Math.min(TOTAL, Math.floor((spent + (runningSince !== null ? now - runningSince : 0)) / 1000));
  const left = TOTAL - elapsed;
  const done = left <= 0;
  const running = runningSince !== null && !done;
  const stage = STAGES[Math.min(2, Math.floor(elapsed / 20))];

  const toggle = () => {
    const t = Date.now();
    if (runningSince !== null) {
      setSpent((s) => s + (t - runningSince));
      setRunningSince(null);
    } else {
      setRunningSince(t);
      setNow(t);
    }
  };

  const startSession = (mode: "WORDS_25" | "WORK_90") => {
    // The session starts on the Today screen, where the user writes its commitment.
    resetFocus(mode);
    router.navigate("/");
  };

  if (editing) {
    return (
      <Card style={{ gap: 12 }}>
        <Txt variant="title" weight="semibold">
          أين تريد أن تكون؟
        </Txt>
        <Txt color="ink2">اكتب رؤيتك في جملة واحدة، بصيغة الحاضر كأنها تحققت. ستعود إليها كلما ثقل عليك البدء.</Txt>
        <View>
          <Label>رؤيتي</Label>
          <Input multiline value={draft} onChangeText={setDraft} placeholder="مثال: أعمل في مجال أحبه، مستقل مالياً، وأتقن مهارتي حتى يُعتمد عليّ." />
        </View>
        <Row>
          <Button
            title="حفظ الرؤية"
            disabled={!draft.trim()}
            onPress={() => {
              updateProfile({ vision: draft.trim() });
              setEditing(false);
            }}
          />
          {profile.vision ? <Button title="إلغاء" variant="ghost" onPress={() => setEditing(false)} /> : null}
        </Row>
      </Card>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      <Card tone="accent" style={{ gap: 10 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <Badge tone="accent">رؤيتك</Badge>
          <LinkButton title="تعديل" icon="edit-2" color="ink2" onPress={() => setEditing(true)} />
        </Row>
        <Txt variant="title" style={{ lineHeight: 36 }}>
          «{profile.vision}»
        </Txt>
        <Txt variant="ui" color="ink2">
          حين يثقل عليك البدء، لا تجلد ذاتك. خذ دقيقة، واستحضر المشهد كأنك فيه، ثم ابدأ فوراً.
        </Txt>
        {values.length > 0 ? (
          <View style={{ marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line, gap: 8 }}>
            <Txt variant="caption" color="ink3">
              تُبنى عبر قيمك
            </Txt>
            <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6 }}>
              {values.map((v) => (
                <View key={v.id} style={{ borderRadius: radius.full, backgroundColor: c.surface, paddingHorizontal: 10, paddingVertical: 3 }}>
                  <Txt variant="small">{v.title}</Txt>
                </View>
              ))}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <LinkButton title="من رؤيتك إلى أولوية اليوم" icon="map" onPress={() => router.push("/vision")} />
            </View>
          </View>
        ) : null}
      </Card>

      <Card style={{ alignItems: "stretch", gap: 14 }}>
        <View style={{ alignItems: "center" }}>
          <ProgressRing value={(elapsed / TOTAL) * 100} size={190} stroke={4}>
            <Txt variant="display" align="center">
              {left}
            </Txt>
            <Txt variant="small" color="ink3" align="center">
              ثانية
            </Txt>
          </ProgressRing>
        </View>
        {done ? (
          <>
            <Txt variant="subtitle" weight="semibold" align="center">
              الآن، حوّل المشهد إلى فعل.
            </Txt>
            {nextStep ? (
              <Txt variant="ui" color="ink2" align="center">
                خطوتك التالية: <Txt variant="ui" weight="medium">{nextStep.title}</Txt>
              </Txt>
            ) : null}
            <Row style={{ justifyContent: "center", flexWrap: "wrap" }}>
              <Button title="ابدأ جلسة 25 دقيقة" onPress={() => startSession("WORDS_25")} />
              <Button title="جلسة عميقة 90 دقيقة" variant="secondary" onPress={() => startSession("WORK_90")} />
            </Row>
          </>
        ) : (
          <>
            <View style={{ minHeight: 110, borderRadius: radius.lg, backgroundColor: c.surface2, padding: 14 }}>
              <Txt variant="small" weight="medium" color="accentStrong">
                {elapsed > 0 ? stage.title : "استعد"}
              </Txt>
              <Txt style={{ marginTop: 4 }}>
                {elapsed > 0 ? stage.prompt : "اجلس مستقيماً، وخذ نفساً عميقاً، ثم اضغط ابدأ وأغمض عينيك."}
              </Txt>
            </View>
            <Row style={{ justifyContent: "center" }}>
              <Button title={running ? "إيقاف مؤقت" : elapsed > 0 ? "متابعة" : "ابدأ"} icon={running ? "pause" : "play"} onPress={toggle} />
              {elapsed > 0 ? (
                <Button
                  title="إعادة"
                  icon="rotate-ccw"
                  variant="ghost"
                  onPress={() => {
                    setSpent(0);
                    setRunningSince(null);
                  }}
                />
              ) : null}
            </Row>
          </>
        )}
      </Card>
    </View>
  );
}

import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useAppStore } from "@/stores/useAppStore";
import { useFocusGuardStore } from "@/stores/useFocusGuardStore";
import { DISTRACTION_KINDS, escalationFor, KICKOFF_MINUTES, type DistractionKind } from "@/lib/focusGuard";
import { tapFeedback } from "@/lib/feedback";
import { toLocalDateString } from "@/lib/utils";
import { ROW, radius, useColors } from "@/theme";
import { Button, Chip, Input, Label, Row, Sheet, Txt } from "@/components/ui";

const TRIGGER_TEXT = {
  exits: "خرجت من التطبيق أكثر من مرة في هذه الجلسة.",
  away: "غبت عن الجلسة أكثر من 5 دقائق.",
  "no-start": "مرّت نصف ساعة ولم تبدأ أي كتلة.",
  "early-quit": "تركت الكتلة في دقائقها الأولى.",
  manual: "لا بأس. أربع نقرات وتعود.",
} as const;

type Step = 1 | 2 | 3 | 4;

/**
 * 🧭 The way back from a slip, one tap per step: name it, empty it, write the smallest next move,
 * then a 10-minute kickoff block (or, mid-session, straight back to the running one).
 */
export function ReturnSheet() {
  const recoveryId = useFocusGuardStore((s) => s.recoveryId);
  const event = useFocusGuardStore((s) => s.distractions.find((e) => e.id === s.recoveryId));
  const close = useFocusGuardStore((s) => s.closeRecovery);
  return (
    <Sheet open={Boolean(recoveryId)} onClose={() => close(false)} title="🧭 العودة" description={event ? TRIGGER_TEXT[event.trigger] : undefined}>
      {recoveryId ? <Steps key={recoveryId} /> : null}
    </Sheet>
  );
}

function Steps() {
  const c = useColors();
  const guard = useFocusGuardStore();
  const app = useAppStore();
  const current = app.getCurrentFrog();
  const [step, setStep] = useState<Step>(1);
  const [kind, setKind] = useState<DistractionKind | null>(null);
  const [note, setNote] = useState("");
  const [nextStep, setNextStep] = useState(() => (current ? guard.nextSteps[current.id] ?? "" : ""));

  const slipsToday = guard.distractions.filter((e) => e.date === toLocalDateString()).length;
  const escalation = escalationFor(slipsToday);

  const pick = (k: DistractionKind) => {
    tapFeedback();
    setKind(k);
    guard.nameDistraction(k);
    setStep(2);
  };

  const empty = () => {
    const text = note.trim();
    if (kind === "idea" && text) app.addDistraction(`💡 ${text}`);
    if (kind === "anxiety" && text) app.addDistraction(`😟 ${text}`);
    setNote("");
    setStep(3);
  };

  const finish = (startKickoff: boolean) => {
    if (current && nextStep.trim()) guard.setNextStep(current.id, nextStep);
    guard.closeRecovery(true);
    if (!startKickoff || app.isFocusRunning || !current) return;
    useAppStore.getState().resetFocus("KICKOFF_10");
    guard.setKickoffActive(true);
    useAppStore.getState().startFocus(nextStep.trim() || current.definitionOfDone || current.title);
  };

  const shorten = () => {
    guard.closeRecovery(true);
    if (!app.isFocusRunning) app.resetFocus("WORK_45");
  };

  const recharge = () => {
    guard.closeRecovery(true);
    if (!app.isFocusRunning) app.startBreak(20);
  };

  return (
    <View style={{ gap: 14 }}>
      <Row gap={6}>
        {[1, 2, 3, 4].map((n) => (
          <View key={n} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: n <= step ? c.brand : c.line }} />
        ))}
      </Row>

      {escalation !== "none" ? (
        <View style={{ borderRadius: radius.md, backgroundColor: c.accentSoft, padding: 12, gap: 8 }}>
          <Txt variant="ui" weight="medium" color="accentStrong">
            {escalation === "shorten"
              ? "التشتت الثالث اليوم: الحمل أثقل من طاقتك الآن. خفّفه."
              : "تشتت متكرر اليوم: طاقتك تحتاج شحناً قبل أي كتلة."}
          </Txt>
          {app.isFocusRunning ? null : escalation === "shorten" ? (
            <Button title="قصّر الكتلة إلى 45 دقيقة" icon="scissors" size="sm" variant="secondary" onPress={shorten} />
          ) : (
            <Button title="🔋 شحن 20 دقيقة" size="sm" variant="secondary" onPress={recharge} />
          )}
        </View>
      ) : null}

      {step === 1 ? (
        <View>
          <Label>1 · سمِّ المشتت</Label>
          <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 8 }}>
            {DISTRACTION_KINDS.map((k) => (
              <Chip key={k.id} label={`${k.emoji} ${k.label}`} selected={kind === k.id} onPress={() => pick(k.id)} />
            ))}
          </View>
        </View>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: 10 }}>
          <Label>2 · أفرغه</Label>
          {kind === "idea" || kind === "anxiety" ? (
            <>
              <Input
                autoFocus
                value={note}
                onChangeText={setNote}
                placeholder={kind === "idea" ? "الفكرة في سطر واحد" : "ما الذي يقلقك؟ سطر واحد"}
                maxLength={200}
                returnKeyType="done"
                onSubmitEditing={empty}
              />
              <Button title={kind === "idea" ? "💡 احفظها وتابع" : "اكتبه وتابع"} onPress={empty} />
              {kind === "anxiety" ? (
                <Button
                  title="فكّكه في مثلث الإدراك"
                  icon="triangle"
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    guard.closeRecovery(false);
                    router.push("/tool/cbt");
                  }}
                />
              ) : null}
            </>
          ) : kind === "fatigue" ? (
            <>
              <Txt variant="ui" color="ink2">
                التعب لا يُقاوَم بالإرادة. استراحة قصيرة بعيداً عن الشاشة، ثم تعود.
              </Txt>
              {app.isFocusRunning ? (
                <Button title="تابع" onPress={() => setStep(3)} />
              ) : (
                <Button
                  title="استراحة 5 دقائق"
                  icon="coffee"
                  onPress={() => {
                    guard.closeRecovery(true);
                    app.startBreak(5);
                  }}
                />
              )}
            </>
          ) : (
            <>
              <Txt variant="ui" color="ink2">
                {kind === "phone" ? "اقلب الهاتف أو ضعه بعيداً عن يدك." : kind === "person" ? "أنهِ الحديث بلطف: «سأعود إليك بعد الكتلة»." : "الملل علامة أن الخطوة كبيرة. صغّرها في الخطوة التالية."}
              </Txt>
              <Button title="تم" onPress={() => setStep(3)} />
            </>
          )}
        </View>
      ) : null}

      {step === 3 ? (
        <View style={{ gap: 10 }}>
          <Label hint={current?.definitionOfDone ? `🎯 الإتقان: ${current.definitionOfDone}` : undefined}>
            3 · أصغر خطوة تالية{current ? ` في «${current.title}»` : ""}
          </Label>
          <Input
            autoFocus
            value={nextStep}
            onChangeText={setNextStep}
            placeholder="أول فعل يأخذ دقيقتين، مثل: افتح الملف واكتب العنوان"
            maxLength={160}
            returnKeyType="done"
            onSubmitEditing={() => nextStep.trim() && setStep(4)}
          />
          <Button title="التالي" disabled={!nextStep.trim()} onPress={() => setStep(4)} />
        </View>
      ) : null}

      {step === 4 ? (
        <View style={{ gap: 10 }}>
          <Label>4 · ابدأ الآن</Label>
          {app.isFocusRunning ? (
            <>
              <Txt variant="ui" color="ink2">
                جلستك ما زالت تعمل. نفّذ: «{nextStep.trim()}».
              </Txt>
              <Button title="عُد إلى الجلسة" icon="play" size="lg" onPress={() => finish(false)} />
            </>
          ) : current ? (
            <>
              <Txt variant="ui" color="ink2">
                {KICKOFF_MINUTES} دقائق فقط على «{current.title}». بعدها تقرر.
              </Txt>
              <Button title={`ابدأ كتلة إقلاع ${KICKOFF_MINUTES} دقائق`} icon="play" size="lg" onPress={() => finish(true)} />
            </>
          ) : (
            <Button title="حسناً" onPress={() => finish(false)} />
          )}
        </View>
      ) : null}
    </View>
  );
}

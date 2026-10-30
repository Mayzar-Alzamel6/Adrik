import React, { useEffect, useState } from "react";
import { Animated, Easing, Modal, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAppStore } from "@/stores/useAppStore";
import { useLineageResolver } from "@/lib/lineage";
import { successFeedback, tapFeedback } from "@/lib/feedback";
import { playBreathCue, playEnd, playStart } from "@/lib/sounds";
import { radius, useColors } from "@/theme";
import { Badge, Button, IconButton, LinkButton, ProgressBar, ProgressRing, Row, Txt } from "@/components/ui";

const BREATH_CYCLES = 10;
const PHASE_SECONDS = 4;
const CYCLE_SECONDS = PHASE_SECONDS * 3;
const GAZE_SECONDS = 60;
const PHASES = ["in", "hold", "out"] as const;
const PHASE_LABEL = { in: "شهيق", hold: "ثبات", out: "زفير" } as const;

/** Morning station: guided breathing, then a one-minute fixed gaze, then straight to priority one. */
export function NeuroGate() {
  const c = useColors();
  const open = useAppStore((s) => s.currentStation === "NEURO_GATE");
  const skipNeuroGate = useAppStore((s) => s.skipNeuroGate);
  const hour = new Date().getHours();
  const isMorningMandatory = hour >= 4 && hour < 10;

  return (
    <Modal visible={open} animationType="fade" onRequestClose={isMorningMandatory ? undefined : skipNeuroGate}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        {/* Mounted only while open, so every visit starts fresh from the intro. */}
        {open ? <GateFlow isMorningMandatory={isMorningMandatory} /> : null}
      </SafeAreaView>
    </Modal>
  );
}

type Step = "intro" | "breath" | "gaze" | "done";

function GateFlow({ isMorningMandatory }: { isMorningMandatory: boolean }) {
  const c = useColors();
  const passNeuroGate = useAppStore((s) => s.passNeuroGate);
  const skipNeuroGate = useAppStore((s) => s.skipNeuroGate);
  const firstFrog = useAppStore((s) => s.getCurrentFrog());
  const resolveLineage = useLineageResolver();
  const firstValues = firstFrog && !firstFrog.isCompleted ? resolveLineage(firstFrog).values : [];

  const [step, setStep] = useState<Step>("intro");
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [scale] = useState(() => new Animated.Value(0.7));
  const [skipCountdown, setSkipCountdown] = useState(isMorningMandatory ? 15 : 0);

  useEffect(() => {
    if (!isMorningMandatory) return;
    setSkipCountdown(15);
    const id = setInterval(() => {
      setSkipCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isMorningMandatory]);

  const go = (next: Step) => {
    const t = Date.now();
    setStep(next);
    setStartedAt(t);
    setNow(t);
  };

  // Everything below is derived from the seconds elapsed since the step began.
  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  const cycle = Math.min(BREATH_CYCLES, Math.floor(elapsed / CYCLE_SECONDS) + 1);
  const phase = PHASES[Math.floor((elapsed % CYCLE_SECONDS) / PHASE_SECONDS)];
  const phaseLeft = PHASE_SECONDS - (elapsed % PHASE_SECONDS);
  const gazeLeft = Math.max(0, GAZE_SECONDS - elapsed);

  useEffect(() => {
    if (step !== "breath" && step !== "gaze") return;
    const id = setInterval(() => {
      const t = Date.now();
      const secs = Math.floor((t - startedAt) / 1000);
      if (step === "breath" && secs >= BREATH_CYCLES * CYCLE_SECONDS) {
        setStep("gaze");
        setStartedAt(t);
        playStart();
      } else if (step === "gaze" && secs >= GAZE_SECONDS) {
        setStep("done");
        successFeedback();
        playEnd();
      }
      setNow(t);
    }, 250);
    return () => clearInterval(id);
  }, [step, startedAt]);

  // The circle grows on the in-breath, holds, and shrinks on the out-breath.
  const phaseKey = step === "breath" ? `${cycle}-${phase}` : "";
  useEffect(() => {
    if (!phaseKey) return;
    const current = phaseKey.split("-")[1];
    if (current !== "hold") tapFeedback();
    playBreathCue(current as "in" | "hold" | "out");
    Animated.timing(scale, {
      toValue: current === "out" ? 0.7 : 1,
      duration: current === "hold" ? 0 : PHASE_SECONDS * 1000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [phaseKey, scale]);

  return (
    <>
      <Row style={{ padding: 12, justifyContent: "space-between", alignItems: "center" }}>
        {isMorningMandatory && skipCountdown > 0 ? (
          <Badge tone="accent">تخطي بعد {skipCountdown} ث</Badge>
        ) : (
          <IconButton icon="x" label="تخطٍّ" onPress={skipNeuroGate} />
        )}
      </Row>
      <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16 }}>
        {step === "intro" ? (
          <>
            <Badge tone="accent">محطة الصباح · 3 دقائق</Badge>
            <Txt variant="heading" weight="semibold" align="center">
              ادخل يومك بهدوء
            </Txt>
            <Txt color="ink2" align="center">
              قبل أن تلمس أي مهمة: تنفّس يوقظ جسدك، ثم تركيز بصري قصير يجمع انتباهك.
            </Txt>
            <Row gap={10}>
              <StepTile icon="wind" title="تنفّس عميق" text={`${BREATH_CYCLES} دورات: شهيق، ثبات، زفير`} />
              <StepTile icon="eye" title="تركيز بصري" text="دقيقة واحدة على نقطة ثابتة" />
            </Row>
            <Button title="ابدأ" size="lg" icon="arrow-left" onPress={() => go("breath")} />
            {isMorningMandatory && skipCountdown > 0 ? (
              <Txt variant="small" color="ink3" align="center">
                يمكنك التخطي بعد {skipCountdown} ثانية (المهم أن تبدأ هادئاً)
              </Txt>
            ) : (
              <LinkButton title="تخطي لليوم (المهم أنك بدأت)" color="ink3" onPress={skipNeuroGate} />
            )}
          </>
        ) : null}

        {step === "breath" ? (
          <>
            <Txt variant="ui" color="ink3" align="center">
              الدورة {cycle} من {BREATH_CYCLES}
            </Txt>
            <View style={{ alignItems: "center", justifyContent: "center", height: 260 }}>
              <Animated.View
                style={{ position: "absolute", width: 250, height: 250, borderRadius: 125, backgroundColor: c.brandSoft, transform: [{ scale }] }}
              />
              <View style={{ width: 150, height: 150, borderRadius: 75, backgroundColor: c.brand, alignItems: "center", justifyContent: "center" }}>
                <Txt variant="title" weight="semibold" color="brandInk" align="center">
                  {PHASE_LABEL[phase]}
                </Txt>
                <Txt variant="display" weight="medium" color="brandInk" align="center">
                  {phaseLeft}
                </Txt>
              </View>
            </View>
            <ProgressBar value={(cycle / BREATH_CYCLES) * 100} />
            <Row gap={10} style={{ justifyContent: "center", alignItems: "center" }}>
              <LinkButton title="انتقل إلى التركيز البصري" color="ink3" onPress={() => go("gaze")} />
              {!isMorningMandatory || skipCountdown === 0 ? (
                <LinkButton title="تخطي لليوم (المهم أنك بدأت)" color="ink3" onPress={skipNeuroGate} />
              ) : null}
            </Row>
          </>
        ) : null}

        {step === "gaze" ? (
          <>
            <Txt color="ink2" align="center">
              ثبّت عينيك على النقطة، وسكّن جسدك.
            </Txt>
            <View style={{ alignItems: "center" }}>
              <ProgressRing value={((GAZE_SECONDS - gazeLeft) / GAZE_SECONDS) * 100} size={220} stroke={4}>
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: c.accent }} />
              </ProgressRing>
            </View>
            <Txt variant="titleLg" align="center">
              {gazeLeft} ث
            </Txt>
            <Row gap={10} style={{ justifyContent: "center", alignItems: "center" }}>
              <LinkButton title="إنهاء" color="ink3" onPress={() => go("done")} />
              {!isMorningMandatory || skipCountdown === 0 ? (
                <LinkButton title="تخطي لليوم (المهم أنك بدأت)" color="ink3" onPress={skipNeuroGate} />
              ) : null}
            </Row>
          </>
        ) : null}

        {step === "done" ? (
          <>
            <Txt variant="heading" weight="semibold" align="center">
              جاهز
            </Txt>
            <Txt color="ink2" align="center">
              ذهن ساكن وجسد يقظ. ابدأ بأولويتك الأولى الآن، قبل أن يسبقك أي شيء آخر.
            </Txt>
            {firstFrog ? (
              <View style={{ borderRadius: radius.lg, backgroundColor: c.surface2, padding: 16, gap: 4 }}>
                <Txt variant="small" color="ink3">
                  أولويتك الأولى
                </Txt>
                <Txt variant="subtitle">{firstFrog.title}</Txt>
                {firstValues.length > 0 ? (
                  <Row gap={6}>
                    <Feather name="heart" size={14} color={c.accentStrong} />
                    <Txt variant="ui">
                      تخدم قيمة: <Txt variant="ui" weight="semibold">{firstValues.map((v) => v.title).join("، ")}</Txt>
                    </Txt>
                  </Row>
                ) : null}
              </View>
            ) : null}
            <Button title="إلى أولوية اليوم" size="lg" icon="arrow-left" onPress={passNeuroGate} />
          </>
        ) : null}
      </View>
    </>
  );
}

function StepTile({ icon, title, text }: { icon: "wind" | "eye"; title: string; text: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, borderRadius: radius.lg, backgroundColor: c.surface2, padding: 14, gap: 4 }}>
      <Feather name={icon} size={20} color={c.brand} />
      <Txt weight="semibold">{title}</Txt>
      <Txt variant="small" color="ink2">
        {text}
      </Txt>
    </View>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, Check, Eye, Heart, Wind, X } from "lucide-react";
import { useLineageResolver } from "@/lib/lineage";
import { useAppStore } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge, ProgressRing } from "@/components/ui/primitives";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { playBreathCue, playEnd, playStart } from "@/lib/sounds";

const BREATH_CYCLES = 10;
const PHASE_SECONDS = 4;
const GAZE_SECONDS = 60;
type Phase = "in" | "hold" | "out";
const PHASE_LABEL: Record<Phase, string> = { in: "شهيق", hold: "ثبات", out: "زفير" };

export const NeuroGateModal: React.FC = () => {
  const passNeuroGate = useAppStore((s) => s.passNeuroGate);
  const skipNeuroGate = useAppStore((s) => s.skipNeuroGate);
  const currentStation = useAppStore((s) => s.currentStation);
  const [step, setStep] = useState<"intro" | "breath" | "gaze" | "done">("intro");
  const [cycle, setCycle] = useState(1);
  const [phase, setPhase] = useState<Phase>("in");
  const [phaseLeft, setPhaseLeft] = useState(PHASE_SECONDS);
  const [gazeLeft, setGazeLeft] = useState(GAZE_SECONDS);
  const [skipCountdown, setSkipCountdown] = useState(15);

  const hour = new Date().getHours();
  const isMorningMandatory = hour >= 4 && hour < 10;

  const soundOn = useAppStore((s) => s.settings.sound !== false);
  const firstFrog = useAppStore((s) => s.getCurrentFrog());
  const resolveLineage = useLineageResolver();
  const firstValues = firstFrog && !firstFrog.isCompleted ? resolveLineage(firstFrog).values : [];
  const open = currentStation === "NEURO_GATE";

  useEffect(() => {
    if (!open || step !== "breath") return;
    playBreathCue(phase, soundOn);
  }, [open, step, phase, cycle, soundOn]);

  useEffect(() => {
    if (!open) return;
    if (step === "gaze") playStart(soundOn);
    if (step === "done") playEnd(soundOn);
    // soundOn is read at the moment of the step change only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  // Reset whenever the gate is reopened
  useEffect(() => {
    if (!open) return;
    setStep("intro");
    setCycle(1);
    setPhase("in");
    setPhaseLeft(PHASE_SECONDS);
    setGazeLeft(GAZE_SECONDS);
  }, [open]);

  // 15-second habit building countdown during mandatory morning (04:00 - 10:00)
  useEffect(() => {
    if (!open || !isMorningMandatory) return;
    setSkipCountdown(15);
    const id = setInterval(() => {
      setSkipCountdown((c) => {
        if (c <= 1) {
          clearInterval(id);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [open, isMorningMandatory]);

  useEffect(() => {
    if (!open || step !== "breath") return;
    const id = setInterval(() => {
      setPhaseLeft((left) => {
        if (left > 1) return left - 1;
        if (phase === "in") setPhase("hold");
        else if (phase === "hold") setPhase("out");
        else if (cycle >= BREATH_CYCLES) setStep("gaze");
        else {
          setCycle((c) => c + 1);
          setPhase("in");
        }
        return PHASE_SECONDS;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [open, step, phase, cycle]);

  useEffect(() => {
    if (!open || step !== "gaze") return;
    if (gazeLeft <= 0) {
      setStep("done");
      return;
    }
    const id = setInterval(() => setGazeLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [open, step, gazeLeft]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-bg/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="relative w-full max-w-lg bg-surface border border-line rounded-4xl shadow-lift px-6 py-10 sm:px-10 text-center">
        {isMorningMandatory && skipCountdown > 0 ? (
          <div
            className="absolute top-4 left-4 h-9 px-3 inline-flex items-center justify-center rounded-full bg-surface-2 border border-line text-caption text-ink-3 tabular select-none"
            title="قاعدة الـ 15 ثانية لبناء العادة دون نفور"
          >
            تخطي بعد {skipCountdown} ث
          </div>
        ) : (
          <button
            type="button"
            onClick={skipNeuroGate}
            aria-label="تخطٍّ"
            className="absolute top-4 left-4 w-9 h-9 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-ink hover:bg-surface-2 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <SoundToggle className="absolute top-4 right-4" />

        {step === "intro" && (
          <div className="animate-rise-in">
            <Badge tone="accent">محطة الصباح · 3 دقائق</Badge>
            <h2 className="font-display text-heading-lg font-semibold text-ink mt-4">ادخل يومك بهدوء</h2>
            <p className="text-ink-2 mt-2 max-w-sm mx-auto">
              قبل أن تلمس أي مهمة: تنفّس يوقظ جسدك، ثم تركيز بصري قصير يجمع انتباهك.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-8 text-right">
              <Step icon={Wind} title="تنفّس عميق" text={`${BREATH_CYCLES} دورات: شهيق، ثبات، زفير`} />
              <Step icon={Eye} title="تركيز بصري" text="دقيقة واحدة على نقطة ثابتة" />
            </div>
            <Button size="lg" className="w-full mt-8" onClick={() => setStep("breath")}>
              ابدأ
              <ArrowLeft className="w-4 h-4" />
            </Button>
            {isMorningMandatory ? (
              skipCountdown === 0 ? (
                <button
                  type="button"
                  onClick={skipNeuroGate}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 text-ui text-brand font-medium hover:text-brand-strong transition animate-fade-in"
                >
                  <Check className="w-4 h-4" />
                  تخطي لليوم (المهم أنك بدأت)
                </button>
              ) : (
                <p className="mt-4 text-caption text-ink-3">
                  يمكنك التخطي بعد {skipCountdown} ثانية · قاعدة بناء العادة دون نفور
                </p>
              )
            ) : (
              <button type="button" onClick={skipNeuroGate} className="mt-4 text-ui text-ink-3 hover:text-ink transition">
                ليس الآن، خذني إلى يومي
              </button>
            )}
          </div>
        )}

        {step === "breath" && (
          <div className="animate-rise-in">
            <p className="text-ui text-ink-3 tabular">
              الدورة {cycle} من {BREATH_CYCLES}
            </p>
            <div className="relative w-64 h-64 mx-auto my-8 flex items-center justify-center">
              <div
                className={cn(
                  "absolute inset-0 rounded-full bg-brand-soft transition-transform duration-[4000ms] ease-in-out",
                  phase === "in" ? "scale-100" : phase === "hold" ? "scale-100" : "scale-[0.6]"
                )}
              />
              <div
                className={cn(
                  "relative w-40 h-40 rounded-full bg-brand flex flex-col items-center justify-center text-brand-ink transition-transform duration-[4000ms] ease-in-out",
                  phase === "out" ? "scale-[0.8]" : "scale-100"
                )}
              >
                <span className="font-display text-title font-semibold">{PHASE_LABEL[phase]}</span>
                <span className="font-display text-display-md tabular leading-none mt-1">{phaseLeft}</span>
              </div>
            </div>
            <div className="h-1 max-w-xs mx-auto rounded-full bg-line overflow-hidden">
              <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${(cycle / BREATH_CYCLES) * 100}%` }} />
            </div>
            <button type="button" onClick={() => setStep("gaze")} className="mt-6 text-ui text-ink-3 hover:text-ink transition">
              انتقل إلى التركيز البصري
            </button>
            {isMorningMandatory && skipCountdown === 0 && (
              <button
                type="button"
                onClick={skipNeuroGate}
                className="mt-3 block mx-auto text-small text-brand font-medium hover:text-brand-strong transition animate-fade-in"
              >
                تخطي لليوم (المهم أنك بدأت)
              </button>
            )}
          </div>
        )}

        {step === "gaze" && (
          <div className="animate-rise-in">
            <p className="text-ui text-ink-2">ثبّت عينيك على النقطة، وسكّن جسدك.</p>
            <div className="flex justify-center my-8">
              <ProgressRing value={((GAZE_SECONDS - gazeLeft) / GAZE_SECONDS) * 100} size={220} stroke={4}>
                <span className="w-5 h-5 rounded-full bg-accent animate-gaze-point" />
              </ProgressRing>
            </div>
            <p className="font-display text-title-lg text-ink tabular">{gazeLeft} ث</p>
            <button type="button" onClick={() => setStep("done")} className="mt-4 text-ui text-ink-3 hover:text-ink transition">
              إنهاء
            </button>
            {isMorningMandatory && skipCountdown === 0 && (
              <button
                type="button"
                onClick={skipNeuroGate}
                className="mt-2 block mx-auto text-small text-brand font-medium hover:text-brand-strong transition animate-fade-in"
              >
                تخطي لليوم (المهم أنك بدأت)
              </button>
            )}
          </div>
        )}

        {step === "done" && (
          <div className="animate-rise-in">
            <div className="w-14 h-14 rounded-full bg-brand-soft text-brand mx-auto flex items-center justify-center">
              <Wind className="w-6 h-6" />
            </div>
            <h2 className="font-display text-heading font-semibold text-ink mt-5">أنت جاهز</h2>
            <p className="text-ink-2 mt-2 max-w-sm mx-auto">ذهن ساكن وجسد يقظ. ابدأ بأولويتك الأولى الآن، قبل أن يسبقك أي شيء آخر.</p>
            {firstFrog && (
              <div className="mt-6 rounded-xl2 bg-surface-2 px-5 py-4 text-right">
                <p className="text-small text-ink-3">أولويتك الأولى</p>
                <p className="font-display text-subtitle text-ink mt-0.5">{firstFrog.title}</p>
                {firstValues.length > 0 && (
                  <p className="mt-2 text-ui text-ink inline-flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-accent-strong fill-current" />
                    تخدم قيمة: <span className="font-semibold">{firstValues.map((v) => v.title).join("، ")}</span>
                  </p>
                )}
              </div>
            )}
            <Button size="lg" className="w-full mt-8" onClick={passNeuroGate}>
              إلى أولوية اليوم
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

function Step({ icon: Icon, title, text }: { icon: typeof Wind; title: string; text: string }) {
  return (
    <div className="rounded-xl2 bg-surface-2 p-4">
      <Icon className="w-5 h-5 text-brand" strokeWidth={1.8} />
      <p className="font-display text-body font-semibold text-ink mt-3">{title}</p>
      <p className="text-small text-ink-2 mt-0.5">{text}</p>
    </div>
  );
}

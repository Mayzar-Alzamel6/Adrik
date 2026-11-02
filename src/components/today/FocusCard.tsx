"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { AlertCircle, Check, Coffee, Eye, Flag, Flame, Heart, Link2, Mountain, Play, Repeat, Target, Wrench, Zap } from "lucide-react";
import { FrogLinkSheet, LineageLine } from "@/components/lineage/Lineage";
import { useLineageResolver } from "@/lib/lineage";
import { EXTERNAL_INTERRUPTION, useAppStore, type FocusTimerMode } from "@/stores/useAppStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { cn, formatTime, fullSessions, minutesAr, toLocalDateString } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge, Card, Input, Label, ProgressRing, SegmentedControl } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { RcaTriageModal, type BugType } from "./RcaTriageModal";

const MODES: { value: FocusTimerMode; label: string; minutes: number; caption: string }[] = [
  { value: "WORK_90", label: "كتلة 1 (90 د)", minutes: 90, caption: "الضفدع الأساسي · تركيز عميق" },
  { value: "WORK_60", label: "كتلة 2 (60 د)", minutes: 60, caption: "المهمة الثانوية الحاسمة" },
  { value: "WORK_45", label: "كتلة 3 (45 د)", minutes: 45, caption: "إغلاق الالتزامات" },
  { value: "WORDS_25", label: "25 د", minutes: 25, caption: "جلسة قصيرة" },
  { value: "FLUENCY_15", label: "15 د", minutes: 15, caption: "دفعة بدء" },
];

const EXIT_REASONS = [EXTERNAL_INTERRUPTION, "تعب أو إرهاق", "تشتّت وهروب", "المهمة لم تكن واضحة"];

/** Full shorter sessions before the 90-minute block is suggested. */
const DEEP_NUDGE_AFTER = 3;

export function FocusCard() {
  const {
    frogs,
    activeFrogId,
    getCurrentFrog,
    toggleFrog,
    updateFrog,
    focusSecondsRemaining,
    focusEndsAt,
    isFocusRunning,
    focusMode,
    focusCommitment,
    focusStreak,
    focusStreakAtRisk,
    deepSessionNudgeDone,
    answerDeepSessionNudge,
    startFocus,
    resetFocus,
    finishFocusSession,
    focusSessions,
    repeatLastSession,
    pendingSessionReviewId,
    breakEndsAt,
    breakMinutes,
    lastBreakEndedAt,
    breakOffer,
    startBreak,
    endBreak,
    dismissBreakOffer,
  } = useAppStore(
    useShallow((s) => ({
      frogs: s.frogs,
      activeFrogId: s.activeFrogId,
      getCurrentFrog: s.getCurrentFrog,
      toggleFrog: s.toggleFrog,
      updateFrog: s.updateFrog,
      focusSecondsRemaining: s.focusSecondsRemaining,
      focusEndsAt: s.focusEndsAt,
      isFocusRunning: s.isFocusRunning,
      focusMode: s.focusMode,
      focusCommitment: s.focusCommitment,
      focusStreak: s.focusStreak,
      focusStreakAtRisk: s.focusStreakAtRisk,
      deepSessionNudgeDone: s.deepSessionNudgeDone,
      answerDeepSessionNudge: s.answerDeepSessionNudge,
      startFocus: s.startFocus,
      resetFocus: s.resetFocus,
      finishFocusSession: s.finishFocusSession,
      focusSessions: s.focusSessions,
      repeatLastSession: s.repeatLastSession,
      pendingSessionReviewId: s.pendingSessionReviewId,
      breakEndsAt: s.breakEndsAt,
      breakMinutes: s.breakMinutes,
      lastBreakEndedAt: s.lastBreakEndedAt,
      breakOffer: s.breakOffer,
      startBreak: s.startBreak,
      endBreak: s.endBreak,
      dismissBreakOffer: s.dismissBreakOffer,
    }))
  );
  const onBreak = Boolean(breakEndsAt);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!onBreak) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [onBreak]);
  const breakLeft = breakEndsAt ? Math.max(0, Math.ceil((breakEndsAt - now) / 1000)) : 0;
  const breakTotal = breakMinutes * 60 || 1;
  // `now` only ticks during a break, so the "break is over" note gets its own expiry timer.
  const [breakNoteUntil, setBreakNoteUntil] = useState(0);
  useEffect(() => {
    if (!lastBreakEndedAt) return;
    const until = lastBreakEndedAt + 15 * 60000;
    setBreakNoteUntil(until);
    const left = until - Date.now();
    if (left <= 0) return;
    const id = setTimeout(() => setBreakNoteUntil(0), left);
    return () => clearTimeout(id);
  }, [lastBreakEndedAt]);
  const breakJustEnded = Boolean(lastBreakEndedAt && breakNoteUntil > Date.now());
  const lastSession = focusSessions[0];
  const [commitment, setCommitment] = useState("");
  const [outOfScope, setOutOfScope] = useState("");
  const [rcaOpen, setRcaOpen] = useState(false);
  const [rcaNotice, setRcaNotice] = useState<string | null>(null);
  const [showBreak, setShowBreak] = useState(false);
  const [justDone, setJustDone] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [exitReason, setExitReason] = useState("");
  const [endedEarly, setEndedEarly] = useState(false);
  const [masteryGateOpen, setMasteryGateOpen] = useState(false);
  const [focusMasteryDod, setFocusMasteryDod] = useState("");

  const current = getCurrentFrog();

  // Prefill commitment with current frog's Definition of Done if available
  useEffect(() => {
    if (current?.definitionOfDone && !commitment) {
      setCommitment(current.definitionOfDone);
    }
  }, [current?.id, current?.definitionOfDone, commitment]);

  // Repeating only makes sense for the same priority; another priority needs its own commitment.
  const canRepeat =
    Boolean(lastSession?.commitment) &&
    !pendingSessionReviewId &&
    lastSession.taskId === current?.id &&
    toLocalDateString(new Date(lastSession.endedAt)) === toLocalDateString();
  const hasProjects = useProjectsStore((s) => s.projects.length > 0);
  const hasSkills = useAppStore((s) => s.skills.length > 0);
  const canLink = hasProjects || hasSkills;
  const resolveLineage = useLineageResolver();
  const servedValues = current ? resolveLineage(current).values : [];
  const [linkOpen, setLinkOpen] = useState(false);
  const allDone = frogs.length > 0 && frogs.every((f) => f.isCompleted);
  const fullShortSessions = focusSessions.filter((s) => s.completed && s.plannedMinutes < 90).length;
  const showDeepNudge = !deepSessionNudgeDone && focusMode !== "WORK_90" && fullShortSessions >= DEEP_NUDGE_AFTER;
  const mode = MODES.find((m) => m.value === focusMode) ?? MODES[0];
  const total = mode.minutes * 60;
  const secondsLeft = isFocusRunning && focusEndsAt
    ? Math.max(0, Math.ceil((focusEndsAt - Date.now()) / 1000))
    : focusSecondsRemaining;
  const progress = ((total - secondsLeft) / total) * 100;
  const isLocked = Boolean(activeFrogId && frogs.some((f) => f.id === activeFrogId && !f.isCompleted));
  const lastMileAt = Math.min(600, total / 5);
  const inLastMile = isFocusRunning && secondsLeft <= lastMileAt;

  // Sessions can't be paused, so an idle timer always starts from the full duration.
  useEffect(() => {
    if (!isFocusRunning && focusSecondsRemaining !== total) resetFocus(mode.value);
  }, [isFocusRunning, focusSecondsRemaining, total, mode.value, resetFocus]);

  // 10-second eye break every 15 minutes of a deep session
  useEffect(() => {
    if (!isFocusRunning || focusMode !== "WORK_90") return;
    const elapsed = total - secondsLeft;
    if (elapsed > 0 && elapsed % 900 === 0) setShowBreak(true);
  }, [secondsLeft, isFocusRunning, focusMode, total]);

  const start = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitment.trim() || !current || allDone) return;
    setEndedEarly(false);
    const fullCommitment = outOfScope.trim()
      ? `${commitment.trim()} [حظر: ${outOfScope.trim()}]`
      : commitment.trim();
    startFocus(fullCommitment);
    setCommitment("");
    setOutOfScope("");
  };

  const handleApplyRcaPatch = (bugType: BugType, patch: string) => {
    setRcaNotice(`ترقيع خوارزمي: ${patch}`);
    setTimeout(() => setRcaNotice(null), 5000);
  };

  const completeCurrent = () => {
    if (!current || current.isCompleted) return;
    setFocusMasteryDod(current.definitionOfDone || commitment || "");
    setMasteryGateOpen(true);
  };

  const confirmFocusMastery = () => {
    if (!current || current.isCompleted || !focusMasteryDod.trim()) return;
    if (isFocusRunning) finishFocusSession({ completed: true, outcome: "DONE" });
    if (focusMasteryDod.trim() !== current.definitionOfDone) {
      updateFrog(current.id, { definitionOfDone: focusMasteryDod.trim() });
    }
    toggleFrog(current.id);
    setJustDone(true);
    setMasteryGateOpen(false);
    setTimeout(() => setJustDone(false), 1600);
  };

  const deliveredEarly = () => {
    finishFocusSession({ completed: true, outcome: "DONE" });
    setExitOpen(false);
  };

  const endEarly = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exitReason.trim()) return;
    finishFocusSession({ completed: false, earlyExitReason: exitReason.trim() });
    setExitReason("");
    setExitOpen(false);
    setEndedEarly(true);
    setShowBreak(false);
  };

  const shorterSession = (m: FocusTimerMode) => {
    resetFocus(m);
    setEndedEarly(false);
  };

  return (
    <Card as="section" className="relative overflow-hidden px-5 py-8 sm:px-10 sm:py-10 text-center">
      <div className="absolute inset-x-0 top-0 h-40 paper-grain opacity-60 pointer-events-none" aria-hidden />
      <SoundToggle className="absolute top-3 left-3 z-10" />

      <div className="relative">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {onBreak ? (
            <Badge tone="brand">
              <Coffee className="w-3.5 h-3.5" />
              استراحة
            </Badge>
          ) : (
            <Badge tone={inLastMile ? "accent" : isFocusRunning ? "brand" : "neutral"}>
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  inLastMile ? "bg-accent animate-pulse" : isFocusRunning ? "bg-brand animate-pulse" : "bg-ink-3"
                )}
              />
              {inLastMile ? "الميل الأخير" : isFocusRunning ? "في جلسة تركيز" : "التركيز الآن على"}
            </Badge>
          )}
          {focusStreak > 0 && (
            <Badge tone={focusStreakAtRisk ? "danger" : "accent"}>
              <Flame className="w-3.5 h-3.5" />
              {focusStreakAtRisk
                ? "سلسلتك تنتظر جلسة كاملة"
                : focusStreak === 1
                ? "أول جلسة كاملة"
                : `${fullSessions(focusStreak)} متتالية`}
            </Badge>
          )}
        </div>

        <h1 className="font-display text-title-lg sm:text-display-sm font-semibold text-ink mt-4 max-w-xl mx-auto leading-snug">
          {allDone ? "أنجزت أولويات اليوم كلها" : current ? current.title : "حدّد أولوية واحدة لتبدأ"}
        </h1>
        {allDone && <p className="text-ink-2 mt-2">خذ راحتك المستحقة، وخطّط للغد من محطة المساء.</p>}
        {current && !allDone && <LineageLine links={current} className="mt-2 text-small max-w-md mx-auto" />}

        {isFocusRunning && focusCommitment && (
          <p className="mt-3 mx-auto max-w-md rounded-xl bg-surface-2 px-4 py-2.5 text-ui text-ink-2">
            <span className="text-ink-3">عقد الجلسة: </span>
            <span className="text-ink font-medium">{focusCommitment}</span>
          </p>
        )}

        <div className="flex justify-center mt-8">
          {onBreak ? (
            <ProgressRing value={((breakTotal - breakLeft) / breakTotal) * 100} size={236} stroke={5}>
              <span className="font-display tabular text-hero sm:text-timer font-medium text-ink leading-none" dir="ltr">
                {formatTime(breakLeft)}
              </span>
              <span className="text-small mt-2 text-ink-3">استراحة {minutesAr(breakMinutes)}</span>
            </ProgressRing>
          ) : (
            <ProgressRing value={progress} size={236} stroke={inLastMile ? 7 : 5} tone={inLastMile ? "accent" : "brand"}>
              <span className="font-display tabular text-hero sm:text-timer font-medium text-ink leading-none" dir="ltr">
                {formatTime(secondsLeft)}
              </span>
              <span className={cn("text-small mt-2", inLastMile ? "text-accent-strong font-medium" : "text-ink-3")}>
                {inLastMile ? "لا تتوقف الآن" : mode.caption}
              </span>
            </ProgressRing>
          )}
        </div>

        {inLastMile && (
          <p role="status" className="mt-5 font-display text-lead text-accent-strong animate-rise-in">
            أنت في الميل الأخير. هنا ينسحب أغلب الناس، أكمل.
          </p>
        )}

        {rcaNotice && (
          <div role="status" className="mt-4 mx-auto max-w-md flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 px-4 py-2.5 text-small animate-rise-in">
            <Wrench className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{rcaNotice}</span>
          </div>
        )}

        <div className="mt-8 flex flex-col items-center gap-5">
          {isFocusRunning ? (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={() => window.dispatchEvent(new CustomEvent("open-scratchpad"))}
                className="shadow-glow"
              >
                <Zap className="w-4 h-4 ml-1.5 fill-current text-amber-300" />
                ⚡ تفريغ خاطرة سريعة
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => setRcaOpen(true)}
                className="text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
              >
                <Wrench className="w-4 h-4 ml-1.5" />
                تشخيص العطل (2-Min RCA)
              </Button>
              <Button size="lg" variant="ghost" onClick={() => setExitOpen(true)} className="min-w-[140px]">
                <Flag className="w-4 h-4 ml-1.5" />
                إنهاء مبكر
              </Button>
            </div>
          ) : onBreak ? (
            <>
              <p className="text-ui text-ink-2 max-w-sm">ابتعد عن الشاشة: تحرّك، اشرب ماءً، وانظر بعيداً. الراحة جزء من الجلسة القادمة.</p>
              <Button size="lg" variant="ghost" onClick={endBreak} className="min-w-[164px]">
                أنهِ الاستراحة
              </Button>
            </>
          ) : (
            <>
              {breakOffer && (
                <div className="w-full max-w-md rounded-xl bg-brand-soft px-4 py-3 animate-rise-in">
                  <p className="text-ui text-ink">
                    أنجزت «{breakOffer.frogTitle}». استراحة {minutesAr(breakOffer.minutes)} تناسب جلستك.
                  </p>
                  <div className="mt-2 flex justify-center gap-2">
                    <Button size="sm" onClick={() => startBreak(breakOffer.minutes)}>
                      <Coffee className="w-4 h-4" />
                      ابدأ الاستراحة
                    </Button>
                    <Button size="sm" variant="ghost" onClick={dismissBreakOffer}>
                      لاحقاً
                    </Button>
                  </div>
                </div>
              )}
              {!breakOffer && breakJustEnded && (
                <p role="status" className="text-ui text-brand font-medium animate-rise-in">
                  انتهت الاستراحة. جاهز للجلسة التالية؟
                </p>
              )}
              {showDeepNudge && !breakOffer && !endedEarly && (
                <div className="w-full max-w-md rounded-xl bg-accent-soft/70 px-4 py-3 text-right animate-rise-in">
                  <p className="text-ui text-ink flex items-start gap-2">
                    <Mountain className="w-4 h-4 text-accent-strong shrink-0 mt-1" />
                    <span>
                      أكملت {fullSessions(fullShortSessions)}. ذهنك اعتاد البدء، فجرّب الآن جلسة عميقة 90 دقيقة لأصعب أولوياتك.
                    </span>
                  </p>
                  <div className="mt-2 flex justify-center gap-2">
                    <Button size="sm" onClick={() => answerDeepSessionNudge(true)}>
                      جرّب 90 دقيقة
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => answerDeepSessionNudge(false)}>
                      أبقى على الأقصر
                    </Button>
                  </div>
                </div>
              )}
              {endedEarly && (
                <div className="w-full max-w-md rounded-xl bg-surface-2 px-4 py-3 animate-rise-in">
                  <p className="text-ui text-ink">
                    سجّلناها كما هي.
                    {focusStreakAtRisk && " سلسلتك لم تنقطع، والجلسة الكاملة التالية تحميها."} الجلسة القادمة أقصر؟
                  </p>
                  <div className="mt-2 flex justify-center gap-2">
                    <Button size="sm" variant="quiet" onClick={() => shorterSession("WORDS_25")}>
                      25 دقيقة
                    </Button>
                    <Button size="sm" variant="quiet" onClick={() => shorterSession("FLUENCY_15")}>
                      15 دقيقة
                    </Button>
                  </div>
                  <Link
                    href={`/app/tools/cbt?event=${encodeURIComponent(
                      `قطعت جلسة «${lastSession?.taskTitle ?? lastSession?.commitment ?? ""}»: ${lastSession?.earlyExitReason ?? ""}`
                    )}`}
                    className="mt-2 inline-block text-small font-medium text-brand hover:underline underline-offset-4"
                  >
                    قطعتك فكرة أو شعور؟ فكّكه في دقيقتين
                  </Link>
                </div>
              )}

              <SegmentedControl
                ariaLabel="مدة الجلسة"
                value={focusMode as FocusTimerMode}
                onChange={(v) => resetFocus(v)}
                options={MODES.map((m) => ({ value: m.value, label: m.label }))}
              />

              {current && !allDone && (
                <form onSubmit={start} className="w-full max-w-md text-right">
                  {servedValues.length > 0 ? (
                    <p className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-accent-soft/70 px-4 py-2.5 text-ui text-ink">
                      <Heart className="w-4 h-4 text-accent-strong fill-current shrink-0" />
                      هذه الجلسة تخدم قيمة: <span className="font-semibold">{servedValues.map((v) => v.title).join("، ")}</span>
                    </p>
                  ) : (
                    canLink && (
                    <button
                      type="button"
                      onClick={() => setLinkOpen(true)}
                      className="mb-4 w-full flex items-center justify-center gap-2 text-small text-ink-3 hover:text-brand transition"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      اربط هذه الأولوية بمشروع لترى القيمة التي تخدمها
                    </button>
                    )
                  )}
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="focus-commitment" hint="شرط الإنجاز الثنائي الواضح (Done When)">
                        عقد ما قبل الانطلاق (شرط الإنجاز):
                      </Label>
                      <Input
                        id="focus-commitment"
                        value={commitment}
                        onChange={(e) => setCommitment(e.target.value)}
                        placeholder="مثال: إنهاء 5 مسائل بدقة ≥ 80%"
                        maxLength={140}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="focus-out-of-scope" hint="حظر التشعب والهندسة المفرطة (Out of Scope)">
                        ما هو خارج النطاق بصرامة؟
                      </Label>
                      <Input
                        id="focus-out-of-scope"
                        value={outOfScope}
                        onChange={(e) => setOutOfScope(e.target.value)}
                        placeholder="مثال: لا تعديل على الألوان، لا بحث جانبي"
                        maxLength={140}
                      />
                    </div>
                  </div>

                  <Button type="submit" size="lg" disabled={!commitment.trim()} className="w-full mt-3">
                    <Play className="w-4 h-4 fill-current ml-1.5" />
                    توقيع العقد وبدء التركيز
                  </Button>
                  {canRepeat && (
                    <button
                      type="button"
                      onClick={() => {
                        setEndedEarly(false);
                        repeatLastSession();
                      }}
                      className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-line px-4 py-2.5 text-ui text-ink-2 hover:border-brand/50 hover:text-ink transition"
                    >
                      <Repeat className="w-4 h-4 text-brand shrink-0" />
                      <span className="truncate">
                        كرر الجلسة: {lastSession.plannedMinutes} د · «{lastSession.commitment}»
                      </span>
                    </button>
                  )}
                </form>
              )}
            </>
          )}

          {current && !current.isCompleted && (
            <button
              type="button"
              onClick={completeCurrent}
              className="inline-flex items-center gap-1.5 text-ui font-medium text-brand hover:underline underline-offset-4"
            >
              <Check className="w-4 h-4" />
              {isLocked ? "أنهيت هذه المهمة — انتقل للتالية" : "تمّت — انتقل للتالية"}
            </button>
          )}
          {justDone && (
            <p role="status" className="text-ui text-brand animate-rise-in">
              أحسنت. خطوة حقيقية إلى الأمام.
            </p>
          )}
        </div>

        {showBreak && (
          <div className="mt-6 mx-auto max-w-md flex items-center justify-between gap-3 rounded-xl bg-brand-soft text-brand px-4 py-3 text-right animate-rise-in">
            <span className="flex items-center gap-2 text-ui">
              <Eye className="w-4 h-4 shrink-0" />
              مرّت 15 دقيقة. انظر بعيداً عن الشاشة 10 ثوانٍ.
            </span>
            <button type="button" onClick={() => setShowBreak(false)} className="text-small font-semibold shrink-0 hover:underline">
              تم
            </button>
          </div>
        )}
      </div>

      <FrogLinkSheet
        open={linkOpen && Boolean(current)}
        title={current?.title}
        initial={{ projectId: current?.projectId, skillId: current?.skillId }}
        onClose={() => setLinkOpen(false)}
        onSave={(links) => {
          if (current) updateFrog(current.id, links);
          setLinkOpen(false);
        }}
      />

      <Sheet
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        title="إنهاء الجلسة قبل وقتها؟"
        description={
          focusStreak === 0
            ? "لا بأس، لكن سجّلها بصدق."
            : focusStreakAtRisk
            ? `هذا ثاني تعثّر على التوالي: سلسلتك (${fullSessions(focusStreak)}) ستعود إلى الصفر، إلا إن كانت مقاطعة خارجية لا مفر منها.`
            : `سلسلتك (${fullSessions(focusStreak)}) تتحمّل تعثّراً واحداً. لا تفوّتها مرتين: الجلسة التالية يجب أن تكتمل.`
        }
        size="sm"
      >
        <div className="space-y-5 pt-2 text-right">
          <div className="rounded-xl bg-brand-soft p-4">
            <p className="text-ui text-ink">هل أنهيت ما التزمت به قبل الوقت؟</p>
            <Button size="sm" className="mt-3" onClick={deliveredEarly}>
              <Check className="w-4 h-4 ml-1" />
              نعم، أنجزت العقد
            </Button>
          </div>

          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 space-y-2">
            <p className="text-small text-amber-900 dark:text-amber-300 font-medium">
              هل واجهت تشعباً هندسياً (Bug A)، ضبابية DoD (Bug B)، أو انهيار طاقة (Bug C)؟
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setExitOpen(false);
                setRcaOpen(true);
              }}
              className="text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
            >
              <Wrench className="w-3.5 h-3.5 ml-1" />
              تشخيص العطل وتطبيق الترقيع (2-Min RCA)
            </Button>
          </div>

          <form onSubmit={endEarly} className="space-y-3">
            <Label htmlFor="exit-reason">وإن لم تُنجزه، ما الذي قطعك؟</Label>
            <div className="flex flex-wrap gap-2">
              {EXIT_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setExitReason(r)}
                  className={cn(
                    "h-9 px-3 rounded-xl border text-small transition",
                    exitReason === r ? "bg-ink text-bg border-ink" : "border-line text-ink-2 hover:border-ink-3"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <Input id="exit-reason" value={exitReason} onChange={(e) => setExitReason(e.target.value)} placeholder="أو اكتب السبب" />
            <div className="flex justify-between gap-2 pt-1">
              <Button onClick={() => setExitOpen(false)}>سأكمل الجلسة</Button>
              <Button type="submit" variant="ghost" disabled={!exitReason.trim()}>
                إنهاء الآن
              </Button>
            </div>
          </form>
        </div>
      </Sheet>

      <RcaTriageModal
        isOpen={rcaOpen}
        onClose={() => setRcaOpen(false)}
        onApplyPatch={handleApplyRcaPatch}
      />

      {/* Mastery Confirmation Gate Sheet */}
      <Sheet
        open={masteryGateOpen}
        onClose={() => setMasteryGateOpen(false)}
        size="md"
        title="بوابة تأكيد الإتقان (Mastery Gate 🎯)"
        description="حماية جودة الإنجاز ومكافحة الشطب المتسرع (Zeigarnik Effect)"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3.5 rounded-xl bg-surface-2 border border-line">
            <div className="text-caption font-semibold text-ink-3">الأولوية المستهدفة:</div>
            <div className="text-body font-bold text-ink">{current?.title}</div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="focus-mastery-dod" className="font-medium text-ink flex items-center gap-1.5">
              <Target className="w-4 h-4 text-brand" />
              معيار الاكتمال النوعي (Definition of Done):
            </Label>
            <Input
              id="focus-mastery-dod"
              value={focusMasteryDod}
              onChange={(e) => setFocusMasteryDod(e.target.value)}
              placeholder="ما الشرط الحقيقي ليكون هذا العمل منجزاً 100%؟"
              required
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-small text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <p>
              هل تم استيفاء معيار الـ DoD أعلاه بنسبة 100% بإتقان حقيقي؟ أم أن الرغبة القهرية في شطب المهمة وإغلاق
              الدائرة (Zeigarnik Effect) هي التي تدفعك للإنهاء السريع؟
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-line">
            <Button variant="secondary" onClick={() => setMasteryGateOpen(false)}>
              متابعة العمل والتدقيق ⏳
            </Button>
            <Button onClick={confirmFocusMastery} disabled={!focusMasteryDod.trim()}>
              <Check className="w-4 h-4 ml-1.5" />
              أؤكد الإتقان واستيفاء الـ DoD بنسبة 100% ✅
            </Button>
          </div>
        </div>
      </Sheet>
    </Card>
  );
}

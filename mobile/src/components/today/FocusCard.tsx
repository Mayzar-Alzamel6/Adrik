import React, { useEffect, useState } from "react";
import { Linking, Platform, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { EXTERNAL_INTERRUPTION, useAppStore, type FocusTimerMode } from "@/stores/useAppStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { useLineageResolver } from "@/lib/lineage";
import { formatTime, fullSessions, minutesAr, toLocalDateString } from "@/lib/utils";
import { successFeedback } from "@/lib/feedback";
import { radius, useColors } from "@/theme";
import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  LinkButton,
  ProgressRing,
  Row,
  Segmented,
  Txt,
} from "@/components/ui";
import { FrogLinkSheet, LineageLine } from "@/components/today/FrogLinkSheet";
import { MasteryGateSheet } from "@/components/today/priorities/PrioritySheets";
import { EarlyExitSheet } from "@/components/today/focus/EarlyExitSheet";
import { RcaTriageModal, type BugType } from "@/components/today/RcaTriageModal";
import { useFocusGuardStore } from "@/stores/useFocusGuardStore";
import { deepBlocksOn, isEarlyQuit } from "@/lib/focusGuard";

const MODES: { value: FocusTimerMode; label: string; minutes: number; caption: string }[] = [
  { value: "WORK_90", label: "كتلة 1 (90 د)", minutes: 90, caption: "الضفدع الأساسي · تركيز عميق" },
  { value: "WORK_60", label: "كتلة 2 (60 د)", minutes: 60, caption: "المهمة الثانوية الحاسمة" },
  { value: "WORK_45", label: "كتلة 3 (45 د)", minutes: 45, caption: "إغلاق الالتزامات" },
  { value: "WORDS_25", label: "25 د", minutes: 25, caption: "جلسة قصيرة" },
  { value: "FLUENCY_15", label: "15 د", minutes: 15, caption: "دفعة بدء" },
  { value: "KICKOFF_10", label: "10 د", minutes: 10, caption: "كتلة إقلاع" },
];

/** Full shorter sessions before the 90-minute block is suggested. */
const DEEP_NUDGE_AFTER = 3;

export function FocusCard({ onOpenScratchpad }: { onOpenScratchpad: () => void }) {
  const c = useColors();
  const s = useAppStore();
  const resetFocus = useAppStore((st) => st.resetFocus);
  const {
    frogs,
    activeFrogId,
    focusSecondsRemaining,
    isFocusRunning,
    focusMode,
    focusCommitment,
    focusStreak,
    focusSessions,
    pendingSessionReviewId,
    breakEndsAt,
    breakMinutes,
    lastBreakEndedAt,
    breakOffer,
    focusStreakAtRisk,
    deepSessionNudgeDone,
    answerDeepSessionNudge,
  } = s;

  const onBreak = Boolean(breakEndsAt);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!onBreak && !lastBreakEndedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [onBreak, lastBreakEndedAt]);
  const breakTotal = breakMinutes * 60 || 1;
  const breakLeft = breakEndsAt ? Math.min(breakTotal, Math.max(0, Math.ceil((breakEndsAt - now) / 1000))) : 0;
  const breakJustEnded = Boolean(lastBreakEndedAt && now - lastBreakEndedAt < 15 * 60000);

  const lastSession = focusSessions[0];
  const current = s.getCurrentFrog();

  const [commitment, setCommitment] = useState(() => current?.definitionOfDone ?? "");
  const [outOfScope, setOutOfScope] = useState("");
  const [eyeDismissedBlock, setEyeDismissedBlock] = useState(0);
  const [justDone, setJustDone] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [endedEarly, setEndedEarly] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  // INTJ-A additions: RCA & Mastery Gate
  const [rcaOpen, setRcaOpen] = useState(false);
  const [rcaNotice, setRcaNotice] = useState<string | null>(null);
  const [masteryGateOpen, setMasteryGateOpen] = useState(false);

  // Focus guard
  const guard = useFocusGuardStore();
  const today = toLocalDateString();
  const [drainAsk, setDrainAsk] = useState(false);
  const deepToday = deepBlocksOn(today, focusSessions);
  const showEnough = !isFocusRunning && deepToday >= guard.deepCap && guard.enoughShownDate !== today;
  const showDnd = Platform.OS === "android" && !isFocusRunning && guard.dndPromptDate !== today;
  const kickoffDone = guard.kickoffActive && !isFocusRunning;
  const openDnd = () => {
    guard.markDndPrompted();
    Linking.sendIntent("android.settings.ZEN_MODE_SETTINGS").catch(() => Linking.openSettings());
  };

  const [prevFrogId, setPrevFrogId] = useState(current?.id);
  if (current?.id !== prevFrogId) {
    setPrevFrogId(current?.id);
    setCommitment(current?.definitionOfDone ?? "");
  }

  // Repeating only makes sense for the same priority; another priority needs its own commitment.
  const canRepeat =
    Boolean(lastSession?.commitment) &&
    !pendingSessionReviewId &&
    lastSession.taskId === current?.id &&
    toLocalDateString(new Date(lastSession.endedAt)) === toLocalDateString();
  const hasProjects = useProjectsStore((st) => st.projects.length > 0);
  const hasSkills = useAppStore((st) => st.skills.length > 0);
  const canLink = hasProjects || hasSkills;
  const fullShortSessions = focusSessions.filter((f) => f.completed && f.plannedMinutes < 90).length;
  const showDeepNudge = !deepSessionNudgeDone && focusMode !== "WORK_90" && fullShortSessions >= DEEP_NUDGE_AFTER;
  // One idle banner at a time, the most urgent first, so the start button stays in reach.
  const banner = kickoffDone
    ? "kickoff"
    : endedEarly
      ? "endedEarly"
      : showEnough
        ? "enough"
        : breakOffer
          ? "breakOffer"
          : breakJustEnded
            ? "breakEnded"
            : showDeepNudge
              ? "nudge"
              : null;
  const resolveLineage = useLineageResolver();
  const servedValues = current ? resolveLineage(current).values : [];
  const allDone = frogs.length > 0 && frogs.every((f) => f.isCompleted);
  const mode = MODES.find((m) => m.value === focusMode) ?? MODES[0];
  const total = mode.minutes * 60;
  const progress = ((total - focusSecondsRemaining) / total) * 100;
  const isLocked = Boolean(activeFrogId && frogs.some((f) => f.id === activeFrogId && !f.isCompleted));
  const lastMileAt = Math.min(600, total / 5);
  const inLastMile = isFocusRunning && focusSecondsRemaining <= lastMileAt;

  // Sessions can't be paused, so an idle timer always starts from the full duration.
  useEffect(() => {
    if (!isFocusRunning && focusSecondsRemaining !== total) resetFocus(mode.value);
  }, [isFocusRunning, focusSecondsRemaining, total, mode.value, resetFocus]);

  // 10-second eye break every 15 minutes of a deep session
  const elapsed = total - focusSecondsRemaining;
  const eyeBlock = Math.floor(elapsed / 900);
  const eyeBreak = isFocusRunning && focusMode === "WORK_90" && eyeBlock > 0 && eyeBlock !== eyeDismissedBlock && elapsed % 900 < 60;

  const start = (confirmedDrain = false) => {
    if (!commitment.trim() || !current || allDone) return;
    // A 90-minute block on draining work burns the day's best hours.
    if (!confirmedDrain && focusMode === "WORK_90" && current.energyTag === "drain") {
      setDrainAsk(true);
      return;
    }
    setDrainAsk(false);
    guard.setKickoffActive(false);
    setEndedEarly(false);
    const trimmedCommitment = commitment.trim();
    if (!current.definitionOfDone) {
      s.updateFrog(current.id, { definitionOfDone: trimmedCommitment });
    }
    const fullContract = outOfScope.trim()
      ? `${trimmedCommitment} [خارج النطاق: ${outOfScope.trim()}]`
      : trimmedCommitment;
    s.startFocus(fullContract);
    setCommitment("");
    setOutOfScope("");
  };

  // Open Mastery Gate instead of blind completion
  const handleCompleteClick = () => {
    if (current && !current.isCompleted) setMasteryGateOpen(true);
  };

  const confirmMasteryCompletion = (dod: string) => {
    if (!current) return;
    if (dod !== current.definitionOfDone) s.updateFrog(current.id, { definitionOfDone: dod });

    if (isFocusRunning) {
      s.finishFocusSession({ completed: true, outcome: "DONE" });
    }
    s.toggleFrog(current.id);
    successFeedback();
    setMasteryGateOpen(false);
    setJustDone(true);
    setTimeout(() => setJustDone(false), 2400);
  };

  const deliveredEarly = () => {
    s.finishFocusSession({ completed: true, outcome: "DONE" });
    setExitOpen(false);
  };

  const endEarly = (reason: string) => {
    const startedAt = s.focusStartedAt;
    const quitEarly = Boolean(startedAt && isEarlyQuit(Date.now() - startedAt)) && reason !== EXTERNAL_INTERRUPTION;
    if (quitEarly) guard.setResumable({ mode: focusMode, secondsLeft: focusSecondsRemaining, commitment: focusCommitment });
    s.finishFocusSession({ completed: false, earlyExitReason: reason });
    if (quitEarly) guard.flagDistraction("early-quit");
    setExitOpen(false);
    setEndedEarly(true);
  };

  const handleApplyRcaPatch = (bugType: BugType, patch: string) => {
    guard.logRca(bugType);
    setRcaNotice(`تم تطبيق الترقيع: ${patch}`);
    setTimeout(() => setRcaNotice(null), 5000);
  };

  const statusTone = inLastMile ? "accent" : isFocusRunning ? "brand" : "neutral";
  const statusText = inLastMile ? "الميل الأخير" : isFocusRunning ? "في جلسة تركيز" : "التركيز الآن على";

  return (
    <Card style={{ paddingVertical: 26, alignItems: "stretch" }}>
      <Row style={{ justifyContent: "center", flexWrap: "wrap" }}>
        {onBreak ? <Badge tone="brand" icon="coffee">استراحة</Badge> : <Badge tone={statusTone}>{statusText}</Badge>}
        {focusStreak > 0 ? (
          <Badge tone={focusStreakAtRisk ? "danger" : "accent"}>
            {focusStreakAtRisk ? "سلسلتك تنتظر جلسة كاملة" : focusStreak === 1 ? "أول جلسة كاملة" : `${fullSessions(focusStreak)} متتالية`}
          </Badge>
        ) : null}
      </Row>

      <Txt variant="titleLg" weight="semibold" align="center" style={{ marginTop: 14 }}>
        {allDone ? "أنجزت أولويات اليوم كلها" : current ? current.title : "حدّد أولوية واحدة لتبدأ"}
      </Txt>
      {current && !allDone ? (
        <View style={{ alignItems: "center", marginTop: 6 }}>
          <LineageLine links={current} />
        </View>
      ) : null}
      {allDone ? (
        <Txt color="ink2" align="center" style={{ marginTop: 4 }}>
          خذ راحتك المستحقة، وخطّط للغد من محطة المساء.
        </Txt>
      ) : null}

      {/* Focus Contract Display */}
      {isFocusRunning && focusCommitment ? (
        <View style={{ marginTop: 12, borderRadius: radius.md, backgroundColor: c.surface2, padding: 12 }}>
          <Txt variant="ui" color="ink2" align="center">
            عقد الجلسة: <Txt variant="ui" weight="medium">{focusCommitment}</Txt>
          </Txt>
        </View>
      ) : null}

      {/* RCA Notice Banner */}
      {rcaNotice ? (
        <Row
          gap={8}
          style={{
            marginTop: 10,
            borderRadius: radius.md,
            backgroundColor: c.accentSoft,
            borderWidth: 1,
            borderColor: c.accent,
            padding: 10,
          }}
        >
          <Feather name="tool" size={16} color={c.accentStrong} />
          <Txt variant="small" weight="medium" color="accentStrong" style={{ flex: 1 }}>
            {rcaNotice}
          </Txt>
        </Row>
      ) : null}

      {/* Timer Progress Ring */}
      <View style={{ alignItems: "center", marginTop: 24 }}>
        {onBreak ? (
          <ProgressRing value={((breakTotal - breakLeft) / breakTotal) * 100} size={230}>
            <Txt variant="timer" weight="medium" align="center">
              {formatTime(breakLeft)}
            </Txt>
            <Txt variant="small" color="ink3" align="center">
              استراحة {minutesAr(breakMinutes)}
            </Txt>
          </ProgressRing>
        ) : (
          <ProgressRing value={progress} size={230} stroke={inLastMile ? 7 : 5} tone={inLastMile ? "accent" : "brand"}>
            <Txt variant="timer" weight="medium" align="center">
              {formatTime(focusSecondsRemaining)}
            </Txt>
            <Txt variant="small" weight={inLastMile ? "medium" : "regular"} color={inLastMile ? "accentStrong" : "ink3"} align="center">
              {inLastMile ? "لا تتوقف الآن" : mode.caption}
            </Txt>
          </ProgressRing>
        )}
      </View>

      {inLastMile ? (
        <Txt variant="lead" weight="medium" color="accentStrong" align="center" style={{ marginTop: 16 }}>
          أنت في الميل الأخير. هنا ينسحب أغلب الناس، أكمل.
        </Txt>
      ) : null}

      {/* Action Controls */}
      <View style={{ marginTop: 22, gap: 14, alignItems: "stretch" }}>
        {isFocusRunning ? (
          <Row style={{ justifyContent: "center", flexWrap: "wrap" }} gap={8}>
            <Button title="💡 فكرة" size="sm" onPress={onOpenScratchpad} />
            <Button title="😵 مشتت" variant="secondary" size="sm" onPress={() => guard.flagDistraction("manual")} />
            <Button
              title="2-Min RCA"
              icon="tool"
              variant="secondary"
              size="sm"
              onPress={() => setRcaOpen(true)}
            />
            <Button
              title="إنهاء مبكر"
              icon="flag"
              variant="ghost"
              size="sm"
              onPress={() => setExitOpen(true)}
            />
          </Row>
        ) : onBreak ? (
          <>
            <Txt variant="ui" color="ink2" align="center">
              ابتعد عن الشاشة: تحرّك، اشرب ماءً، وانظر بعيداً. الراحة جزء من الجلسة القادمة.
            </Txt>
            <Button title="أنهِ الاستراحة" variant="ghost" size="lg" onPress={s.endBreak} />
          </>
        ) : (
          <>
            {banner === "breakOffer" && breakOffer ? (
              <View style={{ borderRadius: radius.md, backgroundColor: c.brandSoft, padding: 14, gap: 10 }}>
                <Txt variant="ui" align="center">
                  أنجزت «{breakOffer.frogTitle}». استراحة {minutesAr(breakOffer.minutes)} تناسب جلستك.
                </Txt>
                <Row style={{ justifyContent: "center" }}>
                  <Button title="ابدأ الاستراحة" icon="coffee" size="sm" onPress={() => s.startBreak(breakOffer.minutes)} />
                  <Button title="لاحقاً" variant="ghost" size="sm" onPress={s.dismissBreakOffer} />
                </Row>
              </View>
            ) : banner === "breakEnded" ? (
              <Txt variant="ui" weight="medium" color="brand" align="center">
                انتهت الاستراحة. جاهز للجلسة التالية؟
              </Txt>
            ) : null}

            {banner === "nudge" ? (
              <View style={{ borderRadius: radius.md, backgroundColor: c.accentSoft, padding: 14, gap: 10 }}>
                <Row gap={8} style={{ alignItems: "flex-start" }}>
                  <Feather name="trending-up" size={16} color={c.accentStrong} style={{ marginTop: 4 }} />
                  <Txt variant="ui" style={{ flex: 1 }}>
                    أكملت {fullSessions(fullShortSessions)}. ذهنك اعتاد البدء، فجرّب الآن جلسة عميقة 90 دقيقة لأصعب أولوياتك.
                  </Txt>
                </Row>
                <Row style={{ justifyContent: "center" }}>
                  <Button title="جرّب 90 دقيقة" size="sm" onPress={() => answerDeepSessionNudge(true)} />
                  <Button title="أبقى على الأقصر" variant="ghost" size="sm" onPress={() => answerDeepSessionNudge(false)} />
                </Row>
              </View>
            ) : null}

            {banner === "endedEarly" ? (
              <View style={{ borderRadius: radius.md, backgroundColor: c.surface2, padding: 14, gap: 10 }}>
                <Txt variant="ui" align="center">
                  سجّلناها كما هي.
                  {focusStreakAtRisk ? " سلسلتك لم تنقطع، والجلسة الكاملة التالية تحميها." : ""} الجلسة القادمة أقصر؟
                </Txt>
                <Row style={{ justifyContent: "center" }}>
                  <Button title="25 دقيقة" variant="quiet" size="sm" onPress={() => { s.resetFocus("WORDS_25"); setEndedEarly(false); }} />
                  <Button title="15 دقيقة" variant="quiet" size="sm" onPress={() => { s.resetFocus("FLUENCY_15"); setEndedEarly(false); }} />
                </Row>
                <View style={{ alignItems: "center" }}>
                  <LinkButton
                    title="قطعتك فكرة أو شعور؟ فكّكه في دقيقتين"
                    onPress={() =>
                      router.push({
                        pathname: "/tool/[id]",
                        params: {
                          id: "cbt",
                          event: `قطعت جلسة «${lastSession?.taskTitle ?? lastSession?.commitment ?? ""}»: ${lastSession?.earlyExitReason ?? ""}`,
                        },
                      })
                    }
                  />
                </View>
              </View>
            ) : null}

            {banner === "kickoff" ? (
              <View style={{ borderRadius: radius.md, backgroundColor: c.brandSoft, padding: 14, gap: 10 }}>
                <Txt variant="ui" weight="medium" align="center">
                  أقلعت. أكمل الكتلة الأصلية؟
                </Txt>
                <Row style={{ justifyContent: "center", flexWrap: "wrap" }}>
                  <Button
                    title={guard.resumable ? `نعم · باقي ${formatTime(guard.resumable.secondsLeft)}` : "نعم · كتلة كاملة"}
                    icon="play"
                    size="sm"
                    onPress={() => guard.resumeAfterKickoff(current?.definitionOfDone || current?.title || "")}
                  />
                  <Button
                    title="لاحقاً"
                    variant="ghost"
                    size="sm"
                    onPress={() => {
                      guard.setKickoffActive(false);
                      guard.setResumable(null);
                    }}
                  />
                </Row>
              </View>
            ) : null}

            {banner === "enough" ? (
              <View style={{ borderRadius: radius.md, backgroundColor: c.accentSoft, padding: 14, gap: 10 }}>
                <Txt variant="ui" weight="medium" align="center">
                  اكتفيت: {deepToday} كتل عميقة اليوم. ما بعدها صيانة خفيفة أو راحة، لا كتلة عميقة جديدة.
                </Txt>
                <Row style={{ justifyContent: "center" }}>
                  <Button title="حسناً" variant="ghost" size="sm" onPress={guard.markEnoughShown} />
                </Row>
              </View>
            ) : null}

            {/* Block mode selector */}
            <Segmented<FocusTimerMode>
              value={focusMode}
              onChange={(v) => s.resetFocus(v)}
              options={MODES.filter((m) => m.value !== "KICKOFF_10" || focusMode === "KICKOFF_10").map((m) => ({ value: m.value, label: m.label }))}
            />

            {/* Preflight Contract Inputs */}
            {current && !allDone ? (
              <View style={{ gap: 10 }}>
                {servedValues.length > 0 ? (
                  <Row gap={8} style={{ justifyContent: "center", borderRadius: radius.md, backgroundColor: c.accentSoft, padding: 10 }}>
                    <Feather name="heart" size={15} color={c.accentStrong} />
                    <Txt variant="ui">
                      هذه الجلسة تخدم قيمة: <Txt variant="ui" weight="semibold">{servedValues.map((v) => v.title).join("، ")}</Txt>
                    </Txt>
                  </Row>
                ) : canLink ? (
                  <View style={{ alignItems: "center" }}>
                    <LinkButton title="اربط هذه الأولوية بمشروع لترى القيمة التي تخدمها" icon="link-2" color="ink3" onPress={() => setLinkOpen(true)} />
                  </View>
                ) : null}

                <View>
                  <Label hint="محدد ثنائياً: ما النتيجة الملموسة بعد انقضاء الوقت؟">1. شرط الإنجاز (Done When)</Label>
                  <Input
                    value={commitment}
                    onChangeText={setCommitment}
                    placeholder="مثال: مسودة التقرير منتهية وفق معيار الإتقان..."
                    maxLength={140}
                  />
                </View>

                <View>
                  <Label hint="ما الذي لن تفعله في هذه الجلسة لحماية تركيزك؟">2. خارج النطاق (Out of Scope)</Label>
                  <Input
                    value={outOfScope}
                    onChangeText={setOutOfScope}
                    placeholder="مثال: لن أفتح المراجع الإضافية / لا تحسينات بصرية..."
                    maxLength={140}
                  />
                </View>

                {drainAsk ? (
                  <View style={{ borderRadius: radius.md, backgroundColor: c.dangerSoft, padding: 14, gap: 10 }}>
                    <Txt variant="ui" weight="medium" color="danger" align="center">
                      «{current.title}» مهمة استنزاف. كتلة 90 دقيقة عليها تحرق أفضل ساعات يومك.
                    </Txt>
                    <Row style={{ justifyContent: "center", flexWrap: "wrap" }}>
                      <Button
                        title="أجّلها لآخر اليوم"
                        icon="corner-down-left"
                        size="sm"
                        onPress={() => {
                          s.reorderFrog(current.id, frogs.length - 1);
                          setDrainAsk(false);
                        }}
                      />
                      <Button title="ابدأ رغم ذلك" variant="ghost" size="sm" onPress={() => start(true)} />
                    </Row>
                  </View>
                ) : null}
                <Segmented<"off" | "on">
                  value={guard.onPhone ? "on" : "off"}
                  onChange={(v) => guard.setOnPhone(v === "on")}
                  options={[
                    { value: "off", label: "📖 خارج الهاتف" },
                    { value: "on", label: "📱 على الهاتف" },
                  ]}
                />
                <Txt variant="small" color="ink3" align="center">
                  {guard.onPhone ? "الخروج من التطبيق أثناء الكتلة يُذكّرك بالعودة." : "اقفل الهاتف بحرية: لا تذكيرات، فقط تنبيه النهاية."}
                </Txt>
                {showDnd ? (
                  <Button title="🔕 فعّل «لا تزعجني» قبل البدء" variant="secondary" size="sm" onPress={openDnd} />
                ) : null}
                <Button title="ألتزم بالعقد وأبدأ 🚀" icon="play" size="lg" disabled={!commitment.trim()} onPress={() => start()} />
                <View style={{ alignItems: "center" }}>
                  <LinkButton title="😵 مشتت؟ أربع نقرات للعودة" color="ink3" onPress={() => guard.flagDistraction("manual")} />
                </View>
                {canRepeat ? (
                  <Button
                    title={`كرر الجلسة: ${lastSession.plannedMinutes} د · «${lastSession.commitment}»`}
                    icon="repeat"
                    variant="secondary"
                    onPress={() => {
                      setEndedEarly(false);
                      s.repeatLastSession();
                    }}
                  />
                ) : null}
              </View>
            ) : null}
          </>
        )}

        {current && !current.isCompleted ? (
          <LinkButton
            icon="check"
            title={isLocked ? "أنهيت هذه المهمة، انتقل للتالية" : "تمّت، انتقل للتالية"}
            onPress={handleCompleteClick}
          />
        ) : null}
        {justDone ? (
          <Txt variant="ui" color="brand" align="center">
            أحسنت. أغلقت الدائرة بإتقان تام 🎯
          </Txt>
        ) : null}

        {eyeBreak ? (
          <Row gap={10} style={{ justifyContent: "space-between", borderRadius: radius.md, backgroundColor: c.brandSoft, padding: 12 }}>
            <Row gap={8} style={{ flex: 1 }}>
              <Feather name="eye" size={16} color={c.brand} />
              <Txt variant="ui" color="brand" style={{ flex: 1 }}>
                مرّت 15 دقيقة. انظر بعيداً عن الشاشة 10 ثوانٍ.
              </Txt>
            </Row>
            <LinkButton title="تم" onPress={() => setEyeDismissedBlock(eyeBlock)} />
          </Row>
        ) : null}
      </View>

      {/* Sheets & Modals */}
      <FrogLinkSheet
        open={linkOpen && Boolean(current)}
        title={current?.title}
        initial={{ projectId: current?.projectId, skillId: current?.skillId }}
        onClose={() => setLinkOpen(false)}
        onSave={(links) => {
          if (current) s.updateFrog(current.id, links);
          setLinkOpen(false);
        }}
      />

      <RcaTriageModal
        isOpen={rcaOpen}
        onClose={() => setRcaOpen(false)}
        onApplyPatch={handleApplyRcaPatch}
      />

      <MasteryGateSheet frog={masteryGateOpen && current ? current : null} onClose={() => setMasteryGateOpen(false)} onConfirm={confirmMasteryCompletion} />
      <EarlyExitSheet
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        streak={focusStreak}
        streakAtRisk={focusStreakAtRisk}
        onDelivered={deliveredEarly}
        onEndEarly={endEarly}
      />
    </Card>
  );
}

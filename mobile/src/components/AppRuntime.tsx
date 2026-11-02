import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { breakMinutesFor, useAppStore } from "@/stores/useAppStore";
import { successFeedback, tapFeedback } from "@/lib/feedback";
import { cancelAwayReminders, ensureNotificationPermission, scheduleAwayReminders, syncBreakEnd, syncSessionEnd } from "@/lib/notifications";
import { useFocusGuardStore } from "@/stores/useFocusGuardStore";
import { awayTrigger, isNoStart } from "@/lib/focusGuard";
import { toLocalDateString } from "@/lib/utils";
import { ReturnSheet } from "@/components/today/ReturnSheet";
import { playEnd, playStart } from "@/lib/sounds";
import { SessionReviewSheet } from "@/components/today/SessionReviewSheet";
import { SyncWatcher } from "@/components/settings/SyncPanel";
import { JourneyWatcher } from "@/components/journey/Journey";

/**
 * App-wide background work, mounted once: day rollover, the focus timer tick, break end,
 * keeping the screen on during a session, vibration and sound cues, and the end-of-session review.
 */
export function AppRuntime() {
  const isFocusRunning = useAppStore((s) => s.isFocusRunning);
  const tickFocus = useAppStore((s) => s.tickFocus);
  const rolloverIfNewDay = useAppStore((s) => s.rolloverIfNewDay);
  const breakEndsAt = useAppStore((s) => s.breakEndsAt);
  const pendingReviewId = useAppStore((s) => s.pendingSessionReviewId);
  const focusEndsAt = useAppStore((s) => s.focusEndsAt);
  const sessionLabel = useAppStore((s) => (s.isFocusRunning ? sessionLabelOf(s) : ""));

  // Asked on first launch, so the first session's alerts are never lost to a missing permission.
  useEffect(() => {
    ensureNotificationPermission().catch(() => {});
  }, []);

  // Scheduled alerts follow the session and the break; ending either early cancels its alert.
  useEffect(() => {
    syncSessionEnd(isFocusRunning ? focusEndsAt : null, sessionLabel).catch(() => {});
  }, [isFocusRunning, focusEndsAt, sessionLabel]);
  useEffect(() => {
    syncBreakEnd(breakEndsAt).catch(() => {});
  }, [breakEndsAt]);

  // New day on launch and whenever the app comes back to the foreground.
  // Leaving mid-session is the focus guard's cue: reminders to come back, and a slip if it repeats or lasts.
  useEffect(() => {
    rolloverIfNewDay();
    useFocusGuardStore.getState().touchDay();
    const sub = AppState.addEventListener("change", (state) => {
      const app = useAppStore.getState();
      const guard = useFocusGuardStore.getState();
      if (state === "background") {
        if (!app.isFocusRunning || !app.focusEndsAt || !guard.onPhone) return;
        guard.noteLeft();
        scheduleAwayReminders(app.focusEndsAt, sessionLabelOf(app)).catch(() => {});
        return;
      }
      if (state !== "active") return;
      rolloverIfNewDay();
      guard.touchDay();
      cancelAwayReminders().catch(() => {});
      const awayMs = guard.noteBack();
      if (app.isFocusRunning) app.tickFocus();
      if (!guard.onPhone) return;
      const trigger = awayTrigger(useFocusGuardStore.getState().sessionExits, awayMs);
      if (trigger && useAppStore.getState().isFocusRunning) guard.flagDistraction(trigger);
    });
    return () => sub.remove();
  }, [rolloverIfNewDay]);

  // Half an hour into the day with nothing started opens the way back, once a day.
  useEffect(() => {
    const check = () => {
      const app = useAppStore.getState();
      const guard = useFocusGuardStore.getState();
      const today = toLocalDateString();
      if (app.currentStation !== "DAY_FOCUS" || guard.noStartFlaggedDate === today || app.breakEndsAt) return;
      if (!app.frogs.some((f) => !f.isCompleted && !f.isDropped)) return;
      const startedToday = app.isFocusRunning || app.focusSessions.some((s) => toLocalDateString(new Date(s.startedAt)) === today);
      if (!isNoStart(guard.dayStartedDate === today ? guard.dayStartedAt : null, Date.now(), startedToday)) return;
      guard.markNoStartFlagged();
      guard.flagDistraction("no-start");
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, []);

  // The timer is derived from wall-clock time, so it stays right after the phone sleeps.
  useEffect(() => {
    if (!isFocusRunning) return;
    tickFocus();
    const id = setInterval(tickFocus, 1000);
    return () => clearInterval(id);
  }, [isFocusRunning, tickFocus]);

  // Keep the screen on for the whole session.
  useEffect(() => {
    if (!isFocusRunning) return;
    activateKeepAwakeAsync("focus").catch(() => {});
    return () => {
      deactivateKeepAwake("focus").catch(() => {});
    };
  }, [isFocusRunning]);

  useEffect(() => {
    if (!breakEndsAt) return;
    const check = () => {
      if (Date.now() < breakEndsAt) return;
      useAppStore.getState().endBreak();
      successFeedback();
      playEnd();
    };
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [breakEndsAt]);

  // Cues on start and on a completed session; refs start from the loaded state so relaunching is silent.
  const prevRunning = useRef(isFocusRunning);
  useEffect(() => {
    if (!prevRunning.current && isFocusRunning) {
      tapFeedback();
      playStart();
      useFocusGuardStore.getState().resetSession();
      useFocusGuardStore.getState().markResumed();
    }
    prevRunning.current = isFocusRunning;
  }, [isFocusRunning]);
  const prevPending = useRef(pendingReviewId);
  useEffect(() => {
    if (!prevPending.current && pendingReviewId) {
      successFeedback();
      playEnd();
      // Rest follows every full block by itself; the break's end alert calls the person back.
      const app = useAppStore.getState();
      const done = app.focusSessions.find((f) => f.id === pendingReviewId);
      if (done && done.plannedMinutes >= 45 && !app.breakEndsAt) app.startBreak(breakMinutesFor(done.plannedMinutes));
    }
    prevPending.current = pendingReviewId;
  }, [pendingReviewId]);

  return (
    <>
      <SessionReviewSheet />
      <ReturnSheet />
      <SyncWatcher />
      <JourneyWatcher />
    </>
  );
}

/** "🎯 Priority › Task" for the timer and its notifications; the task alone when it has no anchor. */
export function sessionLabelOf(s: ReturnType<typeof useAppStore.getState>) {
  const frog = s.getCurrentFrog();
  if (!frog) return s.focusCommitment;
  const anchor = frog.anchorId ? s.anchors.find((a) => a.id === frog.anchorId) : undefined;
  return anchor ? `${anchor.title} › ${frog.title}` : frog.title;
}

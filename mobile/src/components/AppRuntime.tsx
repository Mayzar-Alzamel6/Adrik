import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useAppStore } from "@/stores/useAppStore";
import { successFeedback, tapFeedback } from "@/lib/feedback";
import { syncBreakEnd, syncSessionEnd } from "@/lib/notifications";
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
  const focusCommitment = useAppStore((s) => s.focusCommitment);

  // Scheduled alerts follow the session and the break; ending either early cancels its alert.
  useEffect(() => {
    syncSessionEnd(isFocusRunning ? focusEndsAt : null, focusCommitment).catch(() => {});
  }, [isFocusRunning, focusEndsAt, focusCommitment]);
  useEffect(() => {
    syncBreakEnd(breakEndsAt).catch(() => {});
  }, [breakEndsAt]);

  // New day on launch and whenever the app comes back to the foreground.
  useEffect(() => {
    rolloverIfNewDay();
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      rolloverIfNewDay();
      if (useAppStore.getState().isFocusRunning) useAppStore.getState().tickFocus();
    });
    return () => sub.remove();
  }, [rolloverIfNewDay]);

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
    }
    prevRunning.current = isFocusRunning;
  }, [isFocusRunning]);
  const prevPending = useRef(pendingReviewId);
  useEffect(() => {
    if (!prevPending.current && pendingReviewId) {
      successFeedback();
      playEnd();
    }
    prevPending.current = pendingReviewId;
  }, [pendingReviewId]);

  return (
    <>
      <SessionReviewSheet />
      <SyncWatcher />
      <JourneyWatcher />
    </>
  );
}

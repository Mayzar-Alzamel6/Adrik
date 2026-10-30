import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FocusTimerMode } from "@/stores/useAppStore";
import { applyTuning, type DistractionEvent, type DistractionKind, type DistractionTrigger, type TuningChange } from "@/lib/focusGuard";
import { toLocalDateString } from "@/lib/utils";

export interface RcaEntry {
  date: string;
  bug: "BUG_A" | "BUG_B" | "BUG_C";
}

/** A session cut short early: kept so the kickoff block can hand its remaining time back. */
export interface ResumableBlock {
  mode: FocusTimerMode;
  secondsLeft: number;
  commitment: string;
}

interface FocusGuardState {
  // Away from the app during a session
  sessionExits: number;
  awaySince: number | null;
  noteLeft: () => void;
  /** Coming back; returns how long the app was away, in ms. */
  noteBack: () => number;
  resetSession: () => void;

  // Distraction log and the recovery card
  distractions: DistractionEvent[];
  /** The slip the 🧭 card is open for, or null. */
  recoveryId: string | null;
  flagDistraction: (trigger: DistractionTrigger) => void;
  nameDistraction: (kind: DistractionKind) => void;
  closeRecovery: (resumed: boolean) => void;
  /** Work started again: closes every open slip of today. */
  markResumed: () => void;

  /** The first time the app was open today, for the "no session started" check. */
  dayStartedAt: number | null;
  dayStartedDate: string | null;
  noStartFlaggedDate: string | null;
  touchDay: () => void;
  markNoStartFlagged: () => void;

  resumable: ResumableBlock | null;
  setResumable: (r: ResumableBlock | null) => void;
  /** The kickoff block is running for this slip. */
  kickoffActive: boolean;
  setKickoffActive: (on: boolean) => void;

  /** The smallest next step written for each task, offered again next time. */
  nextSteps: Record<string, string>;
  setNextStep: (taskId: string, step: string) => void;

  dndPromptDate: string | null;
  markDndPrompted: () => void;

  /** Days the 🔋 recharge habit was done. */
  rechargeDates: string[];
  toggleRecharge: (date: string) => void;

  rcaLog: RcaEntry[];
  logRca: (bug: RcaEntry["bug"]) => void;

  // Load tuning
  /** Deep blocks a day before the "enough" alert. */
  deepCap: number;
  enoughShownDate: string | null;
  markEnoughShown: () => void;
  /** The suggestion of the week; answered ones stay so the morning shows it only once. */
  tuning: { week: string; change: TuningChange; answered: boolean } | null;
  offerTuning: (week: string, change: TuningChange) => void;
  answerTuning: (accept: boolean) => void;
}

const newId = () => `dx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

/** Phone-only, like the reminder settings: not synced with the PC copy. */
export const useFocusGuardStore = create<FocusGuardState>()(
  persist(
    (set, get) => ({
      sessionExits: 0,
      awaySince: null,
      noteLeft: () => set({ awaySince: Date.now(), sessionExits: get().sessionExits + 1 }),
      noteBack: () => {
        const since = get().awaySince;
        set({ awaySince: null });
        return since ? Date.now() - since : 0;
      },
      resetSession: () => set({ sessionExits: 0, awaySince: null }),

      distractions: [],
      recoveryId: null,
      flagDistraction: (trigger) => {
        if (get().recoveryId) return;
        const event: DistractionEvent = { id: newId(), date: toLocalDateString(), at: Date.now(), trigger };
        set({ distractions: [event, ...get().distractions].slice(0, 500), recoveryId: event.id });
      },
      nameDistraction: (kind) =>
        set({ distractions: get().distractions.map((e) => (e.id === get().recoveryId ? { ...e, kind } : e)) }),
      closeRecovery: (resumed) => {
        const id = get().recoveryId;
        set({
          recoveryId: null,
          distractions: resumed ? get().distractions.map((e) => (e.id === id && !e.resumedAt ? { ...e, resumedAt: Date.now() } : e)) : get().distractions,
        });
      },
      markResumed: () => {
        const today = toLocalDateString();
        const now = Date.now();
        if (!get().distractions.some((e) => e.date === today && !e.resumedAt)) return;
        set({ distractions: get().distractions.map((e) => (e.date === today && !e.resumedAt ? { ...e, resumedAt: now } : e)) });
      },

      dayStartedAt: null,
      dayStartedDate: null,
      noStartFlaggedDate: null,
      touchDay: () => {
        const today = toLocalDateString();
        if (get().dayStartedDate !== today) set({ dayStartedDate: today, dayStartedAt: Date.now() });
      },
      markNoStartFlagged: () => set({ noStartFlaggedDate: toLocalDateString() }),

      resumable: null,
      setResumable: (resumable) => set({ resumable }),
      kickoffActive: false,
      setKickoffActive: (kickoffActive) => set({ kickoffActive }),

      nextSteps: {},
      setNextStep: (taskId, step) => set({ nextSteps: { ...get().nextSteps, [taskId]: step.trim() } }),

      dndPromptDate: null,
      markDndPrompted: () => set({ dndPromptDate: toLocalDateString() }),

      rechargeDates: [],
      toggleRecharge: (date) => {
        const has = get().rechargeDates.includes(date);
        set({ rechargeDates: has ? get().rechargeDates.filter((d) => d !== date) : [date, ...get().rechargeDates].slice(0, 400) });
      },

      rcaLog: [],
      logRca: (bug) => set({ rcaLog: [{ date: toLocalDateString(), bug }, ...get().rcaLog].slice(0, 300) }),

      deepCap: 3,
      enoughShownDate: null,
      markEnoughShown: () => set({ enoughShownDate: toLocalDateString() }),
      tuning: null,
      offerTuning: (week, change) => {
        if (get().tuning?.week === week) return;
        set({ tuning: { week, change, answered: change === "hold" } });
      },
      answerTuning: (accept) => {
        const t = get().tuning;
        if (!t) return;
        set({ tuning: { ...t, answered: true }, deepCap: accept ? applyTuning(get().deepCap, t.change) : get().deepCap });
      },
    }),
    { name: "adrik-mobile-focus-v1", storage: createJSONStorage(() => AsyncStorage) }
  )
);

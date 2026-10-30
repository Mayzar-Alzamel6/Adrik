import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface DailyReminder {
  enabled: boolean;
  hour: number;
  minute: number;
}

export type ReminderKind = "morning" | "evening" | "weekly";

interface ReminderState {
  morning: DailyReminder;
  evening: DailyReminder;
  /** Friday evening: the weekly review. */
  weekly: DailyReminder;
  setReminder: (which: ReminderKind, updates: Partial<DailyReminder>) => void;
}

/** Phone-only settings for the daily reminders (the web app has none). */
export const useReminderStore = create<ReminderState>()(
  persist(
    (set, get) => ({
      morning: { enabled: false, hour: 8, minute: 0 },
      evening: { enabled: false, hour: 21, minute: 0 },
      weekly: { enabled: false, hour: 18, minute: 0 },
      setReminder: (which, updates) => set({ [which]: { ...get()[which], ...updates } } as Pick<ReminderState, typeof which>),
    }),
    { name: "adrik-mobile-reminders-v1", storage: createJSONStorage(() => AsyncStorage) }
  )
);

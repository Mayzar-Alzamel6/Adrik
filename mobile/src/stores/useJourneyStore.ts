import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StageId } from "@/lib/journey";
import type { SkillProjectItem } from "@/stores/useAppStore";
import type { Project } from "@/stores/useProjectsStore";

/** Founder-template records still waiting for their stage. `links` restores project → skill links once both exist. */
export interface PendingTemplate {
  projects: Project[];
  skills: SkillProjectItem[];
  links: Record<string, string[]>;
}

/**
 * Gradual setup: a new user starts with the daily loop only, and each stage of the system
 * (values → projects → skills) opens once the previous habits are real.
 * `mode` is null until decided: onboarding starts "guided"; anyone who was already using the app
 * before this existed becomes "open" so nothing they rely on disappears.
 */
interface JourneyState {
  mode: "guided" | "open" | null;
  unlocked: StageId[];
  /** Stages whose "unlocked" announcement was already shown. */
  announced: StageId[];
  /** Unlock time per stage, for the usage report and the journey card. */
  unlockedAt: Partial<Record<StageId, string>>;
  startGuided: () => void;
  setMode: (mode: "guided" | "open") => void;
  unlock: (id: StageId) => void;
  markAnnounced: (id: StageId) => void;
  pendingTemplate: PendingTemplate | null;
  /** What the founder template added when each stage opened, for that stage's announcement. */
  templateDelivered: Partial<Record<StageId, number>>;
  setPendingTemplate: (pending: PendingTemplate | null) => void;
  markTemplateDelivered: (id: StageId, count: number) => void;
}

export const useJourneyStore = create<JourneyState>()(
  persist(
    (set, get) => ({
      mode: null,
      unlocked: ["foundation"],
      announced: ["foundation"],
      unlockedAt: {},
      startGuided: () =>
        set({
          mode: "guided",
          unlocked: ["foundation"],
          announced: ["foundation"],
          unlockedAt: { foundation: new Date().toISOString() },
          pendingTemplate: null,
          templateDelivered: {},
        }),
      setMode: (mode) => set({ mode }),
      unlock: (id) => {
        if (get().unlocked.includes(id)) return;
        set({ unlocked: [...get().unlocked, id], unlockedAt: { ...get().unlockedAt, [id]: new Date().toISOString() } });
      },
      markAnnounced: (id) => {
        if (get().announced.includes(id)) return;
        set({ announced: [...get().announced, id] });
      },
      pendingTemplate: null,
      templateDelivered: {},
      setPendingTemplate: (pendingTemplate) => set({ pendingTemplate }),
      markTemplateDelivered: (id, count) => set({ templateDelivered: { ...get().templateDelivered, [id]: count } }),
    }),
    {
      name: "adrik-app-journey-v1",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAppStore } from "@/stores/useAppStore";
import { usePlannerStore } from "@/stores/usePlannerStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { useVaultStore } from "@/stores/useVaultStore";
import { useReminderStore } from "@/stores/useReminderStore";
import { useJourneyStore } from "@/stores/useJourneyStore";

/** Saved-copy key of each store; identical to the web app so backups move between the two. */
export const STORE_KEYS = {
  main: "adrik-app-v1",
  vault: "adrik-app-vault-v1",
  planner: "adrik-app-planner-v1",
  projects: "adrik-app-projects-v1",
  journey: "adrik-app-journey-v1",
} as const;

export type Slot = keyof typeof STORE_KEYS;

const ALL = { main: useAppStore, vault: useVaultStore, planner: usePlannerStore, projects: useProjectsStore, journey: useJourneyStore };

// Every persisted store, including the phone-only reminder settings that backups leave out.
const HYDRATED = [...Object.values(ALL), useReminderStore];
const allHydrated = () => HYDRATED.every((s) => s.persist.hasHydrated());
const subscribeHydration = (onChange: () => void) => {
  const unsubs = HYDRATED.map((s) => s.persist.onFinishHydration(onChange));
  return () => unsubs.forEach((u) => u());
};

/** AsyncStorage loads asynchronously; screens wait for every store before rendering. */
export function useStoresHydrated() {
  return useSyncExternalStore(subscribeHydration, allHydrated, allHydrated);
}

/** Deletes every saved copy and returns all stores to their first-run state. */
export async function resetEverything() {
  await AsyncStorage.multiRemove(Object.values(STORE_KEYS));
  useAppStore.getState().resetAllData();
  useVaultStore.setState(useVaultStore.getInitialState(), true);
  usePlannerStore.setState(usePlannerStore.getInitialState(), true);
  useProjectsStore.setState(useProjectsStore.getInitialState(), true);
  useJourneyStore.setState(useJourneyStore.getInitialState(), true);
}

/** Reloads every store from its saved copy, e.g. after importing a backup. */
export async function rehydrateAll() {
  await Promise.all(Object.values(ALL).map((s) => s.persist.rehydrate()));
}

export const storeFor = (slot: Slot) => ALL[slot];

import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useAppStore } from "@/stores/useAppStore";

/** Vibration cues follow the "sounds" setting; the web preview has no haptics. */
const allowed = () => Platform.OS !== "web" && useAppStore.getState().settings.sound !== false;

export function tapFeedback() {
  if (allowed()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function successFeedback() {
  if (allowed()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function warningFeedback() {
  if (allowed()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

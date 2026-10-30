import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import type * as NotificationsModule from "expo-notifications";
import type { DailyReminder } from "@/stores/useReminderStore";

/**
 * Local notifications only (no server). Each kind has a fixed identifier, so scheduling it again
 * replaces the previous one and cancelling never needs a stored id.
 */
const IDS = { sessionEnd: "session-end", breakEnd: "break-end", morning: "daily-morning", evening: "daily-evening" } as const;
const CHANNEL = "focus";
/** Expo Go on Android throws as soon as expo-notifications loads (SDK 53+), so it is only loaded where it works. */
const inExpoGoAndroid = Platform.OS === "android" && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const supported = Platform.OS !== "web" && !inExpoGoAndroid;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Notifications: typeof NotificationsModule = supported ? require("expo-notifications") : (null as never);

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

let channelReady = false;

/** Asks once (the system remembers the answer) and prepares the Android channel. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!supported) return false;
  if (!channelReady && Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: "التركيز والتذكيرات",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 200, 250],
      lightColor: "#2F5D50",
    });
    channelReady = true;
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

async function scheduleAt(identifier: string, date: Date, title: string, body: string) {
  if (!(await ensureNotificationPermission())) return;
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL },
  });
}

const cancel = (identifier: string) =>
  supported ? Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {}) : Promise.resolve();

/** Alerts at the session's end even when the phone is locked or another app is open. */
export async function syncSessionEnd(endsAt: number | null, commitment: string) {
  if (!supported) return;
  if (!endsAt || endsAt <= Date.now()) return cancel(IDS.sessionEnd);
  await scheduleAt(IDS.sessionEnd, new Date(endsAt), "أكملت جلستك كاملة", commitment ? `هل أنهيت «${commitment}»؟` : "ارجع وسجّل ما أنجزته.");
}

export async function syncBreakEnd(endsAt: number | null) {
  if (!supported) return;
  if (!endsAt || endsAt <= Date.now()) return cancel(IDS.breakEnd);
  await scheduleAt(IDS.breakEnd, new Date(endsAt), "انتهت الاستراحة", "جاهز للجلسة التالية؟");
}

const DAILY_TEXT = {
  morning: { title: "صباح الخير", body: "أولويتك الأولى تنتظرك. ربع ساعة تكفي لتبدأ." },
  evening: { title: "أغلق يومك بهدوء", body: "جرد صادق، ثم اعتمد أولويات الغد قبل النوم." },
} as const;

/** Schedules or removes one daily reminder to match the settings. Returns false if permission was refused. */
export async function syncDailyReminder(which: "morning" | "evening", r: DailyReminder): Promise<boolean> {
  if (!supported) return true;
  const id = IDS[which];
  await cancel(id);
  if (!r.enabled) return true;
  if (!(await ensureNotificationPermission())) return false;
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { ...DAILY_TEXT[which], sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: r.hour, minute: r.minute, channelId: CHANNEL },
  });
  return true;
}

export const notificationsSupported = supported;

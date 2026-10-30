import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import type * as NotificationsModule from "expo-notifications";
import type { DailyReminder } from "@/stores/useReminderStore";

/**
 * Local notifications only (no server). Each kind has a fixed identifier, so scheduling it again
 * replaces the previous one and cancelling never needs a stored id.
 */
const IDS = {
  /** Older builds scheduled the end alert under its own id; still cancelled so an update leaves none behind. */
  sessionEnd: "session-end",
  sessionOngoing: "session-ongoing",
  breakEnd: "break-end",
  morning: "daily-morning",
  evening: "daily-evening",
  weekly: "weekly-review",
} as const;
/** Reminders while the phone is away from a running session: right away, then after 2 and 5 minutes. */
const AWAY_DELAYS_SEC = [1, 120, 300];
const awayId = (i: number) => `session-away-${i}`;
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

const clock = (ms: number) => new Date(ms).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
const mmss = (ms: number) => {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
};

/**
 * While a session runs: a sticky notification naming the task, and an alert at its end
 * even when the phone is locked or the app was closed. The end alert reuses the sticky one's identifier,
 * so it replaces it in the tray: no sticky notification is left behind if the app was killed.
 */
export async function syncSessionEnd(endsAt: number | null, label: string) {
  if (!supported) return;
  if (!endsAt || endsAt <= Date.now()) {
    await cancel(IDS.sessionEnd);
    await cancel(IDS.sessionOngoing);
    await Notifications.dismissNotificationAsync(IDS.sessionOngoing).catch(() => {});
    return;
  }
  if (!(await ensureNotificationPermission())) return;
  await cancel(IDS.sessionEnd);
  await Notifications.scheduleNotificationAsync({
    identifier: IDS.sessionOngoing,
    content: { title: `🎯 ${label || "جلسة تركيز"}`, body: `تنتهي الساعة ${clock(endsAt)}`, sticky: true, autoDismiss: false },
    trigger: Platform.OS === "android" ? { channelId: CHANNEL } : null,
  });
  await scheduleAt(IDS.sessionOngoing, new Date(endsAt), `✅ انتهت جلسة: ${label || "التركيز"}`, "ارجع وسجّل ما أنجزته.");
}

/** Leaving the app mid-session: three reminders to come back. The session keeps running meanwhile. */
export async function scheduleAwayReminders(endsAt: number, label: string) {
  if (!supported || !(await ensureNotificationPermission())) return;
  for (const [i, delay] of AWAY_DELAYS_SEC.entries()) {
    const at = Date.now() + delay * 1000;
    if (at >= endsAt) break;
    await Notifications.scheduleNotificationAsync({
      identifier: awayId(i),
      content: { title: `🎯 ${label || "جلستك"}`, body: `الجلسة مستمرة، باقي ${mmss(endsAt - at)}. عُد.`, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delay, channelId: CHANNEL },
    });
  }
}

export async function cancelAwayReminders() {
  if (!supported) return;
  await Promise.all(AWAY_DELAYS_SEC.map((_, i) => cancel(awayId(i))));
  await Promise.all(AWAY_DELAYS_SEC.map((_, i) => Notifications.dismissNotificationAsync(awayId(i)).catch(() => {})));
}

export async function syncBreakEnd(endsAt: number | null) {
  if (!supported) return;
  if (!endsAt || endsAt <= Date.now()) return cancel(IDS.breakEnd);
  await scheduleAt(IDS.breakEnd, new Date(endsAt), "انتهت الاستراحة", "جاهز للجلسة التالية؟");
}

const DAILY_TEXT = {
  morning: { title: "صباح الخير", body: "أولويتك الأولى تنتظرك. ربع ساعة تكفي لتبدأ." },
  evening: { title: "أغلق يومك بهدوء", body: "جرد صادق، ثم اعتمد أولويات الغد قبل النوم." },
  weekly: { title: "المراجعة الأسبوعية", body: "ربع ساعة: الضفادع، المشتتات، وزمن العودة. ثم اضبط الأسبوع القادم." },
} as const;

/** Schedules or removes one daily reminder to match the settings. Returns false if permission was refused. */
export async function syncDailyReminder(which: "morning" | "evening" | "weekly", r: DailyReminder): Promise<boolean> {
  if (!supported) return true;
  const id = IDS[which];
  await cancel(id);
  if (!r.enabled) return true;
  if (!(await ensureNotificationPermission())) return false;
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { ...DAILY_TEXT[which], sound: true },
    trigger:
      which === "weekly"
        ? // Weeks end on Friday; expo counts weekdays from Sunday = 1.
          { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 6, hour: r.hour, minute: r.minute, channelId: CHANNEL }
        : { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: r.hour, minute: r.minute, channelId: CHANNEL },
  });
  return true;
}

export const notificationsSupported = supported;

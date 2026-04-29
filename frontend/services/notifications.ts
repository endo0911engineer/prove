import { Platform } from "react-native";
import Constants from "expo-constants";

const isExpoGo = Constants.executionEnvironment === "storeClient";

let Notifications: typeof import("expo-notifications") | null = null;

if (!isExpoGo || Platform.OS === "ios") {
  try {
    Notifications = require("expo-notifications");
    Notifications!.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    Notifications = null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

/**
 * 毎日 reminderHour 時に投稿リマインドをスケジュール。
 * 設定変更・オンボーディング完了・アプリ起動時に呼ぶ。
 */
export async function schedulePostingNotifications(
  reminderHour: number,
  enabled: boolean
): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!enabled) return;

    const granted = await requestNotificationPermission();
    if (!granted) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔥 今日の努力を記録しよう",
        body: "まだ今日の投稿が完了していません！",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: reminderHour,
        minute: 0,
      },
    });
  } catch {
    // 通知が使えない環境では無視
  }
}

import { Platform } from "react-native";
import Constants from "expo-constants";

// Expo Go かどうかを判定（SDK 53 以降、Expo Go では Android 通知が使えない）
const isExpoGo = Constants.executionEnvironment === "storeClient";

let Notifications: typeof import("expo-notifications") | null = null;

// Expo Go + Android では通知モジュール自体を読み込まない
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
 * 投稿時間に関するローカル通知をスケジュール。
 * 設定変更・オンボーディング完了・アプリ起動時に呼ぶ。
 */
export async function schedulePostingNotifications(
  windowStart: number,
  windowEnd: number,
  enabled: boolean
): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!enabled) return;

    const granted = await requestNotificationPermission();
    if (!granted) return;

    // 開始通知
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔥 投稿時間が始まりました",
        body: "今日の努力を記録しよう！",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: windowStart,
        minute: 0,
      },
    });

    // 終了30分前の通知
    const warningTotalMinutes = windowEnd * 60 - 30;
    if (warningTotalMinutes > windowStart * 60) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "⏰ 投稿時間終了まであと30分",
          body: "まだ投稿していない方は今すぐ記録しよう！",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: Math.floor(warningTotalMinutes / 60),
          minute: warningTotalMinutes % 60,
        },
      });
    }

    // 終了通知
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "😞 今日の投稿時間が終了しました",
        body: "明日こそ忘れずに記録しよう。",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: windowEnd,
        minute: 0,
      },
    });
  } catch {
    // 通知が使えない環境では無視
  }
}

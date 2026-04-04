import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTodayStatus } from "../../hooks/usePosts";
import { useCurrentUser } from "../../hooks/useCurrentUser";

/** JST現在時刻を返す */
function nowJST(): Date {
  return new Date(Date.now() + 9 * 3600 * 1000);
}

/** 今日のJST hh:00 を UTC の Date で返す */
function todayJSTHour(hour: number): Date {
  const jst = nowJST();
  // UTC日付ベースで今日の JST 0時 を算出
  const jstMidnight = new Date(
    Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate())
  );
  // JST midnight の UTC = JST midnight - 9h
  // ただし jst は already offset されているので、UTC midnight = jst midnight - 0
  // 正確には: JST H:00 = UTC (H-9):00
  return new Date(jstMidnight.getTime() + (hour - 9) * 3600 * 1000 + 9 * 3600 * 1000);
}

// より正確な実装:
function makeJSTDate(hour: number): Date {
  const now = new Date();
  // JST の today
  const jstNow = new Date(now.getTime() + 9 * 3600 * 1000);
  const y = jstNow.getUTCFullYear();
  const mo = jstNow.getUTCMonth();
  const d = jstNow.getUTCDate();
  // JST hour:00:00 → UTC
  return new Date(Date.UTC(y, mo, d, hour - 9, 0, 0));
}

type WindowState = "before" | "open" | "closed";

function getWindowState(windowStart: number, windowEnd: number): WindowState {
  const now = new Date();
  const start = makeJSTDate(windowStart);
  const end = makeJSTDate(windowEnd);
  if (now < start) return "before";
  if (now > end) return "closed";
  return "open";
}

function useCountdown(targetDate: Date | null) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!targetDate) return;
    const tick = () => {
      const diff = Math.max(0, targetDate.getTime() - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate?.getTime()]);

  return remaining;
}

export default function HomeScreen() {
  const { data, isLoading } = useTodayStatus();
  const { data: user } = useCurrentUser();

  const windowStart = data?.postingWindowStart ?? 0;
  const windowEnd = data?.postingWindowEnd ?? 23;
  const windowState = getWindowState(windowStart, windowEnd);

  // カウントダウン対象: open→締め切り時刻、before→開始時刻
  const countdownTarget =
    windowState === "open"
      ? makeJSTDate(windowEnd)
      : windowState === "before"
      ? makeJSTDate(windowStart)
      : null;

  const countdown = useCountdown(countdownTarget);

  const posted = data?.status === "POSTED";
  const missed = data?.status === "MISSED";

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 px-5 pt-2">

        {/* ヘッダー */}
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-xs text-gray-300 mb-0.5">おはよう 👋</Text>
            <Text className="text-2xl font-black text-white">@{user?.username ?? "..."}</Text>
          </View>
          <View className="bg-gray-900 border border-gray-700 rounded-full px-4 py-1.5">
            <Text className="text-gray-300 text-xs font-bold">{user?.goal}</Text>
          </View>
        </View>

        {/* ストリークカード */}
        <View className="bg-gray-900 border border-gray-800 rounded-3xl p-7 mb-4 flex-row items-center">
          <View className="flex-1">
            <Text className="text-8xl font-black text-white leading-none">{data?.streak ?? 0}</Text>
            <Text className="text-gray-300 text-base mt-1 font-medium">日連続</Text>
          </View>
          <View className="items-center gap-2 pl-6 border-l border-gray-800">
            <Text className="text-4xl">🔥</Text>
            <Text className="text-gray-400 text-xs">最大記録</Text>
            <Text className="text-white font-black text-xl">{data?.maxStreak ?? 0}日</Text>
          </View>
        </View>

        {/* 今日の状態カード */}
        {posted ? (
          <View className="bg-gray-900 border border-green-900 rounded-2xl p-5 mb-4 flex-row items-center gap-4">
            <Text className="text-3xl">✅</Text>
            <View className="flex-1">
              <Text className="font-bold text-green-400 text-base">今日の記録完了！</Text>
              <Text className="text-gray-300 text-sm mt-0.5">明日も続けよう。継続は力なり。</Text>
            </View>
          </View>
        ) : missed ? (
          <View className="bg-gray-900 border border-red-900 rounded-2xl p-5 mb-4 flex-row items-center gap-4">
            <Text className="text-3xl">😞</Text>
            <View className="flex-1">
              <Text className="font-bold text-red-400 text-base">今日は投稿できませんでした</Text>
              <Text className="text-gray-300 text-sm mt-0.5">ストリークがリセットされます。明日また頑張ろう。</Text>
            </View>
          </View>
        ) : windowState === "before" ? (
          <View className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-4 flex-row items-center gap-4">
            <Text className="text-3xl">🕐</Text>
            <View className="flex-1">
              <Text className="font-bold text-gray-300 text-sm">
                投稿時間は {windowStart}:00〜{windowEnd}:00
              </Text>
              <Text className="text-gray-400 text-xs mt-0.5">開始まで</Text>
              <Text className="text-white font-black text-2xl mt-1 tracking-widest">{countdown}</Text>
            </View>
          </View>
        ) : (
          <View className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-4 flex-row items-center gap-4">
            <Text className="text-3xl">⏳</Text>
            <View className="flex-1">
              <Text className="font-bold text-gray-300 text-sm">
                今日はまだ未投稿（〜{windowEnd}:00まで）
              </Text>
              <Text className="text-orange-500 font-black text-2xl mt-1 tracking-widest">{countdown}</Text>
            </View>
          </View>
        )}

        {/* CTA */}
        {!posted && !missed && windowState === "open" && (
          <TouchableOpacity
            className="bg-white rounded-2xl py-5 flex-row items-center justify-center gap-3"
            onPress={() => router.push("/(tabs)/post")}
          >
            <Text className="text-2xl">📸</Text>
            <Text className="text-black font-bold text-base">今日の努力を記録する</Text>
          </TouchableOpacity>
        )}

        {!posted && !missed && windowState === "before" && (
          <View className="bg-gray-900 border border-gray-800 rounded-2xl py-5 items-center">
            <Text className="text-gray-400 text-sm">投稿時間になったら記録しよう</Text>
          </View>
        )}

        {posted && (
          <TouchableOpacity
            className="bg-gray-900 border border-gray-700 rounded-2xl py-4 items-center"
            onPress={() => router.push("/(tabs)/feed")}
          >
            <Text className="text-gray-300 font-semibold">仲間の投稿を見る →</Text>
          </TouchableOpacity>
        )}

        {missed && (
          <View className="mt-4 items-center">
            <Text className="text-gray-600 text-xs">
              投稿可能時間: {windowStart}:00〜{windowEnd}:00
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

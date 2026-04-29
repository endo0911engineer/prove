import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useTodayStatus } from "../../hooks/usePosts";
import { useCurrentUser } from "../../hooks/useCurrentUser";

function getLocalMidnight(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
}

function useCountdown(targetDate: Date) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
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
  }, [targetDate.getTime()]);

  return remaining;
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const { data, isLoading } = useTodayStatus();
  const { data: user } = useCurrentUser();
  const midnight = getLocalMidnight();
  const countdown = useCountdown(midnight);

  const posted = data?.status === "POSTED";

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
            <Text className="text-gray-300 text-base mt-1 font-medium">{t("common.dayStreak", { count: "" }).replace("{{count}} ", "")}</Text>
          </View>
          <View className="items-center gap-2 pl-6 border-l border-gray-800">
            <Text className="text-4xl">🔥</Text>
            <Text className="text-gray-400 text-xs">{t("home.maxStreak")}</Text>
            <Text className="text-white font-black text-xl">{data?.maxStreak ?? 0}</Text>
          </View>
        </View>

        {/* 今日の状態カード */}
        {posted ? (
          <View className="bg-gray-900 border border-green-900 rounded-2xl p-5 mb-4 flex-row items-center gap-4">
            <Text className="text-3xl">✅</Text>
            <View className="flex-1">
              <Text className="font-bold text-green-400 text-base">{t("home.postedToday")}</Text>
              <Text className="text-gray-300 text-sm mt-0.5">{t("home.postedMessage")}</Text>
            </View>
          </View>
        ) : (
          <View className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-4 flex-row items-center gap-4">
            <Text className="text-3xl">⏳</Text>
            <View className="flex-1">
              <Text className="font-bold text-gray-300 text-sm">{t("home.notPostedYet")}</Text>
              <Text className="text-orange-500 font-black text-2xl mt-1 tracking-widest">{countdown}</Text>
            </View>
          </View>
        )}

        {/* CTA */}
        {!posted && (
          <TouchableOpacity
            className="bg-white rounded-2xl py-5 flex-row items-center justify-center gap-3"
            onPress={() => router.push("/(tabs)/post")}
          >
            <Text className="text-2xl">📸</Text>
            <Text className="text-black font-bold text-base">{t("common.recordTodayEffort")}</Text>
          </TouchableOpacity>
        )}

        {posted && (
          <TouchableOpacity
            className="bg-gray-900 border border-gray-700 rounded-2xl py-4 items-center"
            onPress={() => router.push("/(tabs)/feed")}
          >
            <Text className="text-gray-300 font-semibold">{t("home.viewFeed")}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

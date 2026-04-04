import { View, Text, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLogout } from "../hooks/useAuth";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { Avatar } from "../components/Avatar";

type SettingItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  desc?: string;
  onPress: () => void;
  danger?: boolean;
};

export default function SettingsScreen() {
  const logout = useLogout();
  const { data: user } = useCurrentUser();

  const items: SettingItem[] = [
    {
      icon: "notifications-outline",
      label: "通知設定",
      desc: user?.notificationEnabled ? "オン" : "オフ",
      onPress: () => router.push("/settings-notifications"),
    },
    {
      icon: "time-outline",
      label: "投稿可能時間",
      desc: `${String(user?.postingWindowStart ?? 0).padStart(2, "0")}:00 〜 ${String(user?.postingWindowEnd ?? 23).padStart(2, "0")}:59`,
      onPress: () => router.push("/settings-post-time"),
    },
    {
      icon: "shield-outline",
      label: "プライバシー",
      desc: user?.isPrivate ? "非公開" : "公開",
      onPress: () => router.push("/settings-privacy"),
    },
    {
      icon: "log-out-outline",
      label: "ログアウト",
      danger: true,
      onPress: () => {
        Alert.alert("ログアウト", "ログアウトしますか？", [
          { text: "キャンセル", style: "cancel" },
          { text: "ログアウト", style: "destructive", onPress: logout },
        ]);
      },
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* ヘッダー */}
      <View className="flex-row items-center px-5 py-4 gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 items-center justify-center rounded-full bg-gray-900"
        >
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text className="text-xl font-black text-white">設定</Text>
      </View>

      {/* ユーザー情報 */}
      <View className="mx-5 bg-gray-900 border border-gray-800 rounded-2xl p-4 flex-row items-center gap-3 mb-6">
        <Avatar username={user?.username ?? "?"} avatarUrl={user?.avatarUrl} size={48} />
        <View className="flex-1">
          <Text className="font-bold text-white">@{user?.username}</Text>
          <Text className="text-gray-300 text-sm" numberOfLines={1}>{user?.goal}</Text>
        </View>
      </View>

      {/* 設定項目 */}
      <View className="mx-5 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {items.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            onPress={item.onPress}
            className={`flex-row items-center px-4 py-4 gap-3 ${
              i < items.length - 1 ? "border-b border-gray-800" : ""
            }`}
          >
            <View className={`w-8 h-8 rounded-full items-center justify-center ${
              item.danger ? "bg-red-950" : "bg-gray-800"
            }`}>
              <Ionicons name={item.icon} size={16} color={item.danger ? "#EF4444" : "#aaa"} />
            </View>
            <View className="flex-1">
              <Text className={`font-medium text-base ${item.danger ? "text-red-500" : "text-white"}`}>
                {item.label}
              </Text>
              {item.desc && (
                <Text className="text-gray-400 text-xs mt-0.5">{item.desc}</Text>
              )}
            </View>
            {!item.danger && (
              <Ionicons name="chevron-forward" size={16} color="#444" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

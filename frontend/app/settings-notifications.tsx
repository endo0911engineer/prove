import { useState } from "react";
import { View, Text, TouchableOpacity, Switch, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { usersApi } from "../api/users";

export default function NotificationsScreen() {
  const { data: user } = useCurrentUser();
  const [enabled, setEnabled] = useState(user?.notificationEnabled ?? true);
  const queryClient = useQueryClient();

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => usersApi.updateProfile({ notificationEnabled: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      Alert.alert("保存しました");
    },
    onError: () => Alert.alert("エラー", "保存に失敗しました"),
  });

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-row items-center px-5 py-4 gap-3 border-b border-gray-900">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 items-center justify-center rounded-full bg-gray-900"
        >
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text className="text-xl font-black text-white flex-1">通知設定</Text>
        <TouchableOpacity onPress={() => save()} disabled={isPending}>
          {isPending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text className="text-white font-bold">保存</Text>
          }
        </TouchableOpacity>
      </View>

      <View className="px-5 pt-6">
        {/* 通知ON/OFF */}
        <View className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-4">
          <View className="flex-row items-center px-4 py-4 gap-3">
            <View className="w-8 h-8 rounded-full bg-gray-800 items-center justify-center">
              <Ionicons name="notifications-outline" size={16} color="#aaa" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-medium">通知を受け取る</Text>
              <Text className="text-gray-400 text-xs mt-0.5">投稿リマインドやリアクション通知</Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: "#333", true: "#fff" }}
              thumbColor={enabled ? "#000" : "#666"}
            />
          </View>
        </View>

        {/* 通知の種類 */}
        <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">通知の種類</Text>
        <View className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {[
            { icon: "alarm-outline" as const, label: "投稿リマインド", desc: "設定時間前にお知らせ" },
            { icon: "heart-outline" as const, label: "リアクション通知", desc: "投稿にリアクションがついたとき" },
            { icon: "person-add-outline" as const, label: "フォロー通知", desc: "新しいフォロワーが増えたとき" },
          ].map((item, i, arr) => (
            <View
              key={item.label}
              className={`flex-row items-center px-4 py-4 gap-3 ${i < arr.length - 1 ? "border-b border-gray-800" : ""}`}
            >
              <View className="w-8 h-8 rounded-full bg-gray-800 items-center justify-center">
                <Ionicons name={item.icon} size={16} color={enabled ? "#aaa" : "#444"} />
              </View>
              <View className="flex-1">
                <Text className={`font-medium ${enabled ? "text-white" : "text-gray-400"}`}>{item.label}</Text>
                <Text className="text-gray-400 text-xs mt-0.5">{item.desc}</Text>
              </View>
              {!enabled && <Text className="text-gray-300 text-xs">無効</Text>}
            </View>
          ))}
        </View>

        {!enabled && (
          <View className="mt-4 bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
            <Text className="text-gray-300 text-sm text-center">通知がオフになっています</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

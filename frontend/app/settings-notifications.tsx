import { useState } from "react";
import { View, Text, TouchableOpacity, Switch, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { usersApi } from "../api/users";
import { schedulePostingNotifications } from "../services/notifications";

function HourPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View className="flex-row items-center gap-4">
      <TouchableOpacity
        onPress={() => onChange(Math.max(0, value - 1))}
        className="w-10 h-10 bg-gray-800 rounded-full items-center justify-center"
      >
        <Ionicons name="remove" size={20} color="#fff" />
      </TouchableOpacity>
      <Text className="text-white font-black text-3xl w-16 text-center">
        {String(value).padStart(2, "0")}
      </Text>
      <TouchableOpacity
        onPress={() => onChange(Math.min(23, value + 1))}
        className="w-10 h-10 bg-gray-800 rounded-full items-center justify-center"
      >
        <Ionicons name="add" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

export default function NotificationsScreen() {
  const { data: user } = useCurrentUser();
  const [enabled, setEnabled] = useState(user?.notificationEnabled ?? true);
  const [reminderHour, setReminderHour] = useState(user?.reminderHour ?? 21);
  const queryClient = useQueryClient();

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => usersApi.updateProfile({ notificationEnabled: enabled, reminderHour }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      await schedulePostingNotifications(reminderHour, enabled);
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
        <View className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-6">
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

        {/* リマインド時間 */}
        {enabled && (
          <>
            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">
              リマインド時間
            </Text>
            <View className="bg-gray-900 border border-gray-800 rounded-2xl px-6 py-6 mb-2">
              <Text className="text-gray-400 text-xs mb-4">
                この時間に「まだ記録していません」と通知します
              </Text>
              <View className="flex-row items-center justify-between">
                <HourPicker value={reminderHour} onChange={setReminderHour} />
                <Text className="text-gray-300 text-2xl font-bold">時</Text>
              </View>
            </View>
            <Text className="text-gray-600 text-xs px-1 mb-6">
              毎日 {String(reminderHour).padStart(2, "0")}:00 に通知
            </Text>
          </>
        )}

        {!enabled && (
          <View className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
            <Text className="text-gray-300 text-sm text-center">通知がオフになっています</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

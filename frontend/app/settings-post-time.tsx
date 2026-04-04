import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { usersApi } from "../api/users";
import { schedulePostingNotifications } from "../services/notifications";

function HourPicker({ value, onChange, min, max }: {
  value: number; onChange: (v: number) => void; min: number; max: number;
}) {
  return (
    <View className="flex-row items-center gap-4">
      <TouchableOpacity
        onPress={() => onChange(Math.max(min, value - 1))}
        className="w-10 h-10 bg-gray-800 rounded-full items-center justify-center"
      >
        <Ionicons name="remove" size={20} color="#fff" />
      </TouchableOpacity>
      <Text className="text-white font-black text-3xl w-16 text-center">
        {String(value).padStart(2, "0")}
      </Text>
      <TouchableOpacity
        onPress={() => onChange(Math.min(max, value + 1))}
        className="w-10 h-10 bg-gray-800 rounded-full items-center justify-center"
      >
        <Ionicons name="add" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

export default function PostTimeScreen() {
  const { data: user } = useCurrentUser();
  const [start, setStart] = useState(user?.postingWindowStart ?? 0);
  const [end, setEnd] = useState(user?.postingWindowEnd ?? 23);
  const queryClient = useQueryClient();

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => usersApi.updateProfile({
      postingWindowStart: start,
      postingWindowEnd: end,
    }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      // 通知を新しい時間で再スケジュール
      await schedulePostingNotifications(start, end, user?.notificationEnabled ?? true);
      Alert.alert("保存しました");
    },
    onError: () => Alert.alert("エラー", "保存に失敗しました"),
  });

  const handleSave = () => {
    if (start >= end) {
      Alert.alert("設定エラー", "開始時間は終了時間より前にしてください");
      return;
    }
    save();
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-row items-center px-5 py-4 gap-3 border-b border-gray-900">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 items-center justify-center rounded-full bg-gray-900"
        >
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text className="text-xl font-black text-white flex-1">投稿可能時間</Text>
        <TouchableOpacity onPress={handleSave} disabled={isPending}>
          {isPending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text className="text-white font-bold">保存</Text>
          }
        </TouchableOpacity>
      </View>

      <View className="px-5 pt-8">
        <Text className="text-gray-300 text-sm mb-8 leading-6">
          毎日この時間帯に投稿することで努力を記録できます。{"\n"}
          時間外の投稿はLATE扱いになります。
        </Text>

        {/* 開始時間 */}
        <View className="bg-gray-900 border border-gray-800 rounded-2xl px-6 py-6 mb-4">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">開始時間</Text>
          <View className="flex-row items-center justify-between">
            <HourPicker value={start} onChange={setStart} min={0} max={end - 1} />
            <Text className="text-gray-300 text-2xl font-bold">時</Text>
          </View>
        </View>

        {/* 終了時間 */}
        <View className="bg-gray-900 border border-gray-800 rounded-2xl px-6 py-6 mb-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">終了時間</Text>
          <View className="flex-row items-center justify-between">
            <HourPicker value={end} onChange={setEnd} min={start + 1} max={23} />
            <Text className="text-gray-300 text-2xl font-bold">時</Text>
          </View>
        </View>

        {/* プレビュー */}
        <View className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 flex-row items-center gap-3">
          <Ionicons name="time-outline" size={18} color="#666" />
          <Text className="text-gray-400 text-sm">
            毎日 <Text className="text-white font-bold">{String(start).padStart(2, "0")}:00</Text>
            {" "}〜{" "}
            <Text className="text-white font-bold">{String(end).padStart(2, "0")}:59</Text> に投稿
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

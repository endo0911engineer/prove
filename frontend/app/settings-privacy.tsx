import { useState } from "react";
import { View, Text, TouchableOpacity, Switch, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { usersApi } from "../api/users";

export default function PrivacyScreen() {
  const { data: user } = useCurrentUser();
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate ?? false);
  const queryClient = useQueryClient();

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => usersApi.updateProfile({ isPrivate }),
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
        <Text className="text-xl font-black text-white flex-1">プライバシー</Text>
        <TouchableOpacity onPress={() => save()} disabled={isPending}>
          {isPending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text className="text-white font-bold">保存</Text>
          }
        </TouchableOpacity>
      </View>

      <View className="px-5 pt-6">
        {/* 非公開設定 */}
        <View className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-4">
          <View className="flex-row items-center px-4 py-4 gap-3">
            <View className="w-8 h-8 rounded-full bg-gray-800 items-center justify-center">
              <Ionicons name={isPrivate ? "lock-closed-outline" : "lock-open-outline"} size={16} color="#aaa" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-medium">非公開アカウント</Text>
              <Text className="text-gray-400 text-xs mt-0.5">
                {isPrivate ? "フォロワーのみ投稿を見られます" : "誰でも投稿を見られます"}
              </Text>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ false: "#333", true: "#fff" }}
              thumbColor={isPrivate ? "#000" : "#666"}
            />
          </View>
        </View>

        {/* 現在の状態 */}
        <View className={`rounded-2xl px-4 py-4 border ${
          isPrivate ? "bg-gray-900 border-gray-700" : "bg-gray-900 border-gray-800"
        }`}>
          <View className="flex-row items-center gap-3 mb-2">
            <Ionicons
              name={isPrivate ? "lock-closed" : "globe-outline"}
              size={18}
              color={isPrivate ? "#fff" : "#666"}
            />
            <Text className={`font-bold ${isPrivate ? "text-white" : "text-gray-300"}`}>
              {isPrivate ? "非公開" : "公開"}アカウント
            </Text>
          </View>
          <Text className="text-gray-300 text-sm leading-5">
            {isPrivate
              ? "あなたの投稿はフォロワーのみ閲覧できます。新しいフォロワーはリクエスト制になります。"
              : "あなたの投稿は全てのユーザーが閲覧できます。同じ目標を持つ仲間にも表示されます。"
            }
          </Text>
        </View>

        {/* その他の項目（将来実装） */}
        <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-6 mb-3 px-1">その他</Text>
        <View className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {[
            { icon: "eye-off-outline" as const, label: "アクティビティを隠す", desc: "ストリーク数を非表示にする" },
            { icon: "search-outline" as const, label: "検索から除外", desc: "検索結果に表示されない" },
          ].map((item, i, arr) => (
            <View
              key={item.label}
              className={`flex-row items-center px-4 py-4 gap-3 ${i < arr.length - 1 ? "border-b border-gray-800" : ""}`}
            >
              <View className="w-8 h-8 rounded-full bg-gray-800 items-center justify-center">
                <Ionicons name={item.icon} size={16} color="#444" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-400 font-medium">{item.label}</Text>
                <Text className="text-gray-300 text-xs mt-0.5">{item.desc}</Text>
              </View>
              <Text className="text-gray-300 text-xs">近日公開</Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { achievementsApi } from "../api/achievements";

export default function AchieveGoalScreen() {
  const { data: user } = useCurrentUser();
  const [comment, setComment] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const queryClient = useQueryClient();

  const { mutate: achieve, isPending } = useMutation({
    mutationFn: () => achievementsApi.achieve({
      comment: comment.trim() || undefined,
      isPublic,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      queryClient.invalidateQueries({ queryKey: ["my-achievements"] });
      Alert.alert("🎉 目標達成！", "おめでとうございます！達成履歴に記録されました。", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: () => Alert.alert("エラー", "記録に失敗しました"),
  });

  const handleAchieve = () => {
    Alert.alert(
      "目標を達成としてマークしますか？",
      "達成履歴に記録されます。",
      [
        { text: "キャンセル", style: "cancel" },
        { text: "達成！", onPress: () => achieve() },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-row items-center px-4 py-3 border-b border-gray-900 gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 items-center justify-center rounded-full bg-gray-900"
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text className="font-black text-white text-base flex-1">目標を達成する</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6">
        {/* 達成する目標 */}
        <View className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">達成した目標</Text>
          <Text className="text-white font-semibold text-base leading-6">{user?.goal}</Text>
        </View>

        {/* コメント */}
        <View className="mb-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            達成コメント（任意）
          </Text>
          <TextInput
            className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 text-sm text-white"
            placeholder="どうやって達成しましたか？振り返りを残しましょう"
            placeholderTextColor="#555"
            value={comment}
            onChangeText={setComment}
            maxLength={300}
            multiline
            style={{ minHeight: 100, textAlignVertical: "top" }}
          />
          <Text className="text-xs text-gray-400 text-right mt-1">{comment.length}/300</Text>
        </View>

        {/* 公開設定 */}
        <View className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 mb-8 flex-row items-center gap-3">
          <View className="flex-1">
            <Text className="text-white font-medium">プロフィールに公開</Text>
            <Text className="text-gray-400 text-xs mt-0.5">他のユーザーの達成履歴に表示されます</Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: "#333", true: "#fff" }}
            thumbColor={isPublic ? "#000" : "#666"}
          />
        </View>

        {/* 達成ボタン */}
        <TouchableOpacity
          className="bg-white rounded-2xl py-5 items-center flex-row justify-center gap-3"
          onPress={handleAchieve}
          disabled={isPending}
        >
          {isPending
            ? <ActivityIndicator color="#000" />
            : <>
                <Text className="text-2xl">🏆</Text>
                <Text className="text-black font-bold text-base">目標達成を記録する</Text>
              </>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

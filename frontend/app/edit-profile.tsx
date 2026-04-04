import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { usersApi } from "../api/users";
import { useAuthStore } from "../stores/authStore";
import { getApiUrl } from "../api/client";

function buildUrl(url: string) {
  return url.startsWith("http") ? url : `${getApiUrl()}${url}`;
}

const PRESET_TAGS = [
  "朝活", "夜活", "読書", "プログラミング", "英語", "筋トレ",
  "副業", "起業", "ダイエット", "瞑想", "ランニング", "料理",
  "投資", "デザイン", "音楽",
];

export default function EditProfileScreen() {
  const { data: user } = useCurrentUser();
  const [bio, setBio] = useState("");
  const [goal, setGoal] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user && !initialized) {
      setBio(user.bio ?? "");
      setGoal(user.goal ?? "");
      setTags(user.tags ?? []);
      setInitialized(true);
    }
  }, [user, initialized]);

  const { mutate: uploadAvatar, isPending: avatarPending } = useMutation({
    mutationFn: (uri: string) => usersApi.uploadAvatar(uri),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.setQueryData(["me"], updatedUser);
    },
    onError: () => Alert.alert("エラー", "アイコンの更新に失敗しました"),
  });

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("権限が必要です", "カメラロールへのアクセスを許可してください");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setLocalAvatarUri(uri);
      uploadAvatar(uri);
    }
  };

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 5 ? [...prev, tag] : prev
    );
  };

  const addCustomTag = () => {
    const t = customTag.trim();
    if (!t || tags.includes(t) || tags.length >= 5) return;
    setTags((prev) => [...prev, t]);
    setCustomTag("");
  };

  const { setUser } = useAuthStore();

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => usersApi.updateProfile({
      bio: bio.trim() || undefined,
      goal: goal.trim() || undefined,
      tags,
    }),
    onSuccess: (updatedUser) => {
      // Zustand ストアを即時更新（画面遷移前に反映）
      setUser(updatedUser);
      queryClient.setQueryData(["me"], updatedUser);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      router.back();
    },
    onError: () => Alert.alert("エラー", "更新に失敗しました"),
  });

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* ヘッダー */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-gray-400">キャンセル</Text>
        </TouchableOpacity>
        <Text className="font-black text-white text-base">プロフィールを編集</Text>
        <TouchableOpacity onPress={() => save()} disabled={isPending}>
          {isPending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text className="font-bold text-white">完了</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        {/* アイコン */}
        <View className="items-center mb-8">
          <TouchableOpacity onPress={pickAvatar} className="relative">
            <View className="w-24 h-24 rounded-full overflow-hidden bg-gray-800 items-center justify-center border-2 border-gray-700">
              {localAvatarUri ? (
                <Image source={{ uri: localAvatarUri }} style={{ width: 96, height: 96 }} resizeMode="cover" />
              ) : user?.avatarUrl ? (
                <Image source={{ uri: buildUrl(user.avatarUrl) }} style={{ width: 96, height: 96 }} resizeMode="cover" />
              ) : (
                <Text className="text-4xl font-black text-white">
                  {(user?.username ?? "?")[0].toUpperCase()}
                </Text>
              )}
            </View>
            <View className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full items-center justify-center border-2 border-black">
              {avatarPending
                ? <ActivityIndicator size="small" color="#000" />
                : <Ionicons name="camera" size={14} color="#000" />
              }
            </View>
          </TouchableOpacity>
          <Text className="text-xs text-gray-400 mt-2">タップして変更</Text>
        </View>

        {/* 目標（自由入力） */}
        <View className="mb-6">
          <Text className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">目標</Text>
          <TextInput
            className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 text-sm text-white"
            placeholder="例: 毎日英語を1時間勉強して1年でTOEIC900点を取る"
            placeholderTextColor="#555"
            value={goal}
            onChangeText={setGoal}
            maxLength={200}
            multiline
            style={{ minHeight: 72, textAlignVertical: "top" }}
          />
          <Text className="text-xs text-gray-300 text-right mt-1">{goal.length}/200</Text>
        </View>

        {/* Bio */}
        <View className="mb-6">
          <Text className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">一言コメント</Text>
          <TextInput
            className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 text-sm text-white"
            placeholder="例: 毎日コードを書いて成長する 💻"
            placeholderTextColor="#555"
            value={bio}
            onChangeText={setBio}
            maxLength={100}
            multiline
            style={{ minHeight: 72, textAlignVertical: "top" }}
          />
          <Text className="text-xs text-gray-300 text-right mt-1">{bio.length}/100</Text>
        </View>

        {/* タグ */}
        <View className="mb-8">
          <Text className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">タグ</Text>
          <Text className="text-xs text-gray-300 mb-3">最大5つまで選択できます（選択中: {tags.length}/5）</Text>

          {/* 選択中タグ */}
          {tags.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mb-3">
              {tags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  className="flex-row items-center gap-1 bg-white rounded-full px-3 py-1.5"
                >
                  <Text className="text-black text-xs font-bold">#{tag}</Text>
                  <Text className="text-gray-300 text-xs">×</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* プリセットタグ */}
          <View className="flex-row flex-wrap gap-2 mb-3">
            {PRESET_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => toggleTag(tag)}
                className="bg-gray-900 border border-gray-800 rounded-full px-3 py-1.5"
              >
                <Text className="text-gray-400 text-xs">#{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* カスタムタグ入力 */}
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-white"
              placeholder="カスタムタグを追加..."
              placeholderTextColor="#555"
              value={customTag}
              onChangeText={setCustomTag}
              onSubmitEditing={addCustomTag}
              maxLength={20}
            />
            <TouchableOpacity
              onPress={addCustomTag}
              className="bg-gray-800 rounded-xl px-4 items-center justify-center"
            >
              <Text className="text-white font-bold text-sm">追加</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

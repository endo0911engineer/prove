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
import { useTranslation } from "react-i18next";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { usersApi } from "../api/users";
import { useAuthStore } from "../stores/authStore";
import { getApiUrl } from "../api/client";

function buildUrl(url: string) {
  return url.startsWith("http") ? url : `${getApiUrl()}${url}`;
}

const PRESET_TAG_KEYS: { apiValue: string; i18nKey: string }[] = [
  { apiValue: "朝活",         i18nKey: "search.tags.morningActivity" },
  { apiValue: "夜活",         i18nKey: "search.tags.eveningActivity" },
  { apiValue: "読書",         i18nKey: "search.tags.reading" },
  { apiValue: "プログラミング", i18nKey: "search.tags.programming" },
  { apiValue: "英語",         i18nKey: "search.tags.english" },
  { apiValue: "筋トレ",       i18nKey: "search.tags.workout" },
  { apiValue: "副業",         i18nKey: "search.tags.sideJob" },
  { apiValue: "起業",         i18nKey: "search.tags.entrepreneurship" },
  { apiValue: "ダイエット",    i18nKey: "search.tags.diet" },
  { apiValue: "瞑想",         i18nKey: "search.tags.meditation" },
  { apiValue: "ランニング",    i18nKey: "search.tags.running" },
  { apiValue: "料理",         i18nKey: "search.tags.cooking" },
  { apiValue: "投資",         i18nKey: "search.tags.investment" },
  { apiValue: "デザイン",     i18nKey: "search.tags.design" },
  { apiValue: "音楽",         i18nKey: "search.tags.music" },
];

export default function EditProfileScreen() {
  const { t } = useTranslation();
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
    onError: () => Alert.alert(t("editProfile.errorTitle"), t("editProfile.avatarError")),
  });

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("editProfile.permissionRequired"), t("editProfile.cameraRollPermission"));
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
    const trimmed = customTag.trim();
    if (!trimmed || tags.includes(trimmed) || tags.length >= 5) return;
    setTags((prev) => [...prev, trimmed]);
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
      setUser(updatedUser);
      queryClient.setQueryData(["me"], updatedUser);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      router.back();
    },
    onError: () => Alert.alert(t("editProfile.errorTitle"), t("editProfile.updateError")),
  });

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* ヘッダー */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-gray-400">{t("editProfile.cancel")}</Text>
        </TouchableOpacity>
        <Text className="font-black text-white text-base">{t("editProfile.title")}</Text>
        <TouchableOpacity onPress={() => save()} disabled={isPending}>
          {isPending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text className="font-bold text-white">{t("editProfile.done")}</Text>
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
          <Text className="text-xs text-gray-400 mt-2">{t("editProfile.tapToChange")}</Text>
        </View>

        {/* 目標（自由入力） */}
        <View className="mb-6">
          <Text className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
            {t("editProfile.goalLabel")}
          </Text>
          <TextInput
            className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 text-sm text-white"
            placeholder={t("editProfile.goalPlaceholder")}
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
          <Text className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
            {t("editProfile.bioLabel")}
          </Text>
          <TextInput
            className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 text-sm text-white"
            placeholder={t("editProfile.bioPlaceholder")}
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
          <Text className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
            {t("editProfile.tagsLabel")}
          </Text>
          <Text className="text-xs text-gray-300 mb-3">
            {t("editProfile.tagsHint", { count: tags.length })}
          </Text>

          {/* 選択中タグ */}
          {tags.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mb-3">
              {tags.map((tag) => {
                const preset = PRESET_TAG_KEYS.find((k) => k.apiValue === tag);
                const label = preset ? t(preset.i18nKey) : tag;
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    className="flex-row items-center gap-1 bg-white rounded-full px-3 py-1.5"
                  >
                    <Text className="text-black text-xs font-bold">#{label}</Text>
                    <Text className="text-gray-300 text-xs">×</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* プリセットタグ */}
          <View className="flex-row flex-wrap gap-2 mb-3">
            {PRESET_TAG_KEYS.filter(({ apiValue }) => !tags.includes(apiValue)).map(({ apiValue, i18nKey }) => (
              <TouchableOpacity
                key={apiValue}
                onPress={() => toggleTag(apiValue)}
                className="bg-gray-900 border border-gray-800 rounded-full px-3 py-1.5"
              >
                <Text className="text-gray-400 text-xs">#{t(i18nKey)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* カスタムタグ入力 */}
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-white"
              placeholder={t("editProfile.customTagPlaceholder")}
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
              <Text className="text-white font-bold text-sm">{t("editProfile.addTag")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

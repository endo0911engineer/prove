import { useState } from "react";
import {
  View, Text, TouchableOpacity, TextInput, Image, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { useCreatePost, useTodayStatus } from "../../hooks/usePosts";

export default function PostScreen() {
  const { t } = useTranslation();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [text, setText] = useState("");
  const { mutate: createPost, isPending } = useCreatePost();
  const { data: todayStatus } = useTodayStatus();
  const alreadyPosted = todayStatus?.status === "POSTED";
  const isMissed = todayStatus?.status === "MISSED";

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("post.permissionRequired"), t("post.cameraRollPermission"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("post.permissionRequired"), t("post.cameraPermission"));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleSubmit = () => {
    if (!imageUri) return;
    const formData = new FormData();
    formData.append("image", { uri: imageUri, type: "image/jpeg", name: "photo.jpg" } as any);
    if (text.trim()) formData.append("text", text.trim());

    createPost(formData, {
      onSuccess: () => {
        Alert.alert(t("post.successTitle"), t("post.successMessage"), [
          { text: t("common.ok"), onPress: () => router.replace("/(tabs)") },
        ]);
      },
      onError: (err: any) => {
        const detail = err?.response?.data?.detail ?? "";
        const msg = detail === "Already posted today"
          ? t("post.alreadyPosted")
          : detail.includes("hasn't started yet")
          ? t("post.windowNotStarted", { start: todayStatus?.postingWindowStart ?? 0 })
          : detail.includes("has closed")
          ? t("post.windowEnded", { end: todayStatus?.postingWindowEnd ?? 23 })
          : t("post.postFailed");
        Alert.alert(t("common.error"), msg);
      },
    });
  };

  if (alreadyPosted) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center px-6">
        <Text className="text-5xl mb-4">✅</Text>
        <Text className="text-xl font-bold text-white text-center mb-2">{t("post.completedTitle")}</Text>
        <Text className="text-gray-300 text-center mb-8">{t("post.completedMessage")}</Text>
        <TouchableOpacity
          className="border border-gray-700 rounded-xl px-8 py-3"
          onPress={() => router.push("/(tabs)/feed")}
        >
          <Text className="text-gray-300 font-medium">{t("post.viewFeed")}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (isMissed) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center px-6">
        <Text className="text-5xl mb-4">😞</Text>
        <Text className="text-xl font-bold text-white text-center mb-2">{t("post.endedTitle")}</Text>
        <Text className="text-gray-300 text-center mb-2">
          {t("home.postingWindow", { start: todayStatus?.postingWindowStart, end: todayStatus?.postingWindowEnd })}
        </Text>
        <Text className="text-gray-400 text-sm text-center mb-8">{t("post.endedMessage")}</Text>
      </SafeAreaView>
    );
  }

  // ── ステップ1: 画像選択 ──────────────────────────
  if (!imageUri) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="px-5 pt-4 pb-2">
          <Text className="text-2xl font-black text-white">{t("post.title")}</Text>
          <Text className="text-gray-400 text-sm mt-1">{t("post.selectPhoto")}</Text>
        </View>

        <View className="flex-1 px-5 justify-center gap-4">
          <TouchableOpacity
            className="bg-gray-900 border-2 border-gray-700 rounded-3xl items-center justify-center py-14"
            onPress={takePhoto}
            activeOpacity={0.7}
          >
            <Text className="text-5xl mb-4">📸</Text>
            <Text className="text-white font-bold text-lg">{t("post.takePhoto")}</Text>
            <Text className="text-gray-400 text-sm mt-1">{t("post.takePhotoSub")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-gray-900 border border-gray-800 rounded-3xl items-center justify-center py-10"
            onPress={pickImage}
            activeOpacity={0.7}
          >
            <Text className="text-4xl mb-3">🖼️</Text>
            <Text className="text-white font-semibold text-base">{t("post.selectFromLibrary")}</Text>
            <Text className="text-gray-400 text-sm mt-1">{t("post.selectFromLibrarySub")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── ステップ2: コメント入力＋投稿 ───────────────
  return (
    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-5 pt-4 pb-8 flex-1">
            <Text className="text-2xl font-black text-white mb-4">{t("post.title")}</Text>

            {/* 画像プレビュー */}
            <View className="mb-5">
              <Image
                source={{ uri: imageUri }}
                className="w-full rounded-2xl"
                style={{ aspectRatio: 4 / 3 }}
                resizeMode="cover"
              />
              <TouchableOpacity
                className="mt-2 items-center py-1"
                onPress={() => setImageUri(null)}
              >
                <Text className="text-gray-400 text-sm">{t("post.retakePhoto")}</Text>
              </TouchableOpacity>
            </View>

            {/* コメント入力 */}
            <Text className="text-sm font-semibold text-gray-300 mb-2">{t("post.commentLabel")}</Text>
            <TextInput
              className="border border-gray-700 bg-gray-900 rounded-2xl px-4 py-3 text-base text-white mb-6"
              placeholder={t("post.commentPlaceholder")}
              placeholderTextColor="#555"
              multiline
              value={text}
              onChangeText={setText}
              style={{ minHeight: 90, textAlignVertical: "top" }}
              scrollEnabled={false}
            />

            {/* 投稿ボタン */}
            <TouchableOpacity
              className="bg-white rounded-2xl py-5 items-center"
              onPress={handleSubmit}
              disabled={isPending}
            >
              {isPending ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text className="font-bold text-lg text-black">{t("post.submitButton")}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

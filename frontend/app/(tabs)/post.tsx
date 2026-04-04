import { useState } from "react";
import {
  View, Text, TouchableOpacity, TextInput, Image, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useCreatePost, useTodayStatus } from "../../hooks/usePosts";

export default function PostScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [text, setText] = useState("");
  const { mutate: createPost, isPending } = useCreatePost();
  const { data: todayStatus } = useTodayStatus();
  const alreadyPosted = todayStatus?.status === "POSTED";
  const isMissed = todayStatus?.status === "MISSED";

  const pickImage = async () => {
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
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("権限が必要です", "カメラへのアクセスを許可してください");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleSubmit = () => {
    if (!imageUri) {
      Alert.alert("画像を選択してください", "努力の証拠となる画像は必須です");
      return;
    }
    const formData = new FormData();
    formData.append("image", { uri: imageUri, type: "image/jpeg", name: "photo.jpg" } as any);
    if (text.trim()) formData.append("text", text.trim());

    createPost(formData, {
      onSuccess: () => {
        Alert.alert("投稿完了！", "今日の努力を記録しました 🔥", [
          { text: "OK", onPress: () => router.replace("/(tabs)") },
        ]);
      },
      onError: (err: any) => {
        const detail = err?.response?.data?.detail ?? "";
        const msg = detail === "Already posted today"
          ? "今日はすでに投稿済みです"
          : detail.includes("hasn't started yet")
          ? `まだ投稿時間ではありません（${todayStatus?.postingWindowStart ?? 0}:00〜）`
          : detail.includes("has closed")
          ? `投稿時間が終了しました（〜${todayStatus?.postingWindowEnd ?? 23}:00）`
          : "投稿に失敗しました。もう一度試してください";
        Alert.alert("エラー", msg);
      },
    });
  };

  if (alreadyPosted) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center px-6">
        <Text className="text-5xl mb-4">✅</Text>
        <Text className="text-xl font-bold text-white text-center mb-2">今日の記録は完了しています</Text>
        <Text className="text-gray-300 text-center mb-8">明日また頑張りましょう！</Text>
        <TouchableOpacity
          className="border border-gray-700 rounded-xl px-8 py-3"
          onPress={() => router.push("/(tabs)/feed")}
        >
          <Text className="text-gray-300 font-medium">フィードを見る</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (isMissed) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center px-6">
        <Text className="text-5xl mb-4">😞</Text>
        <Text className="text-xl font-bold text-white text-center mb-2">今日の投稿時間が終了しました</Text>
        <Text className="text-gray-300 text-center mb-2">
          投稿可能時間: {todayStatus?.postingWindowStart}:00〜{todayStatus?.postingWindowEnd}:00
        </Text>
        <Text className="text-gray-400 text-sm text-center mb-8">明日また頑張りましょう</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="px-5 pt-4 pb-8 flex-1">
            <Text className="text-2xl font-black text-white mb-6">今日の努力を記録</Text>

            {/* 画像選択エリア */}
            {imageUri ? (
              <View className="mb-4">
                <Image
                  source={{ uri: imageUri }}
                  className="w-full rounded-2xl"
                  style={{ aspectRatio: 1 }}
                />
                <TouchableOpacity className="mt-2 items-center" onPress={() => setImageUri(null)}>
                  <Text className="text-gray-400 text-sm">画像を変更する</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="mb-4">
                <TouchableOpacity
                  className="border-2 border-dashed border-gray-800 rounded-2xl items-center justify-center py-12 mb-3 bg-gray-900"
                  onPress={pickImage}
                >
                  <Text className="text-4xl mb-3">📷</Text>
                  <Text className="font-bold text-gray-300">ライブラリから選択</Text>
                  <Text className="text-gray-400 text-sm mt-1">※ 画像は必須です</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="border border-gray-800 bg-gray-900 rounded-xl py-3 items-center"
                  onPress={takePhoto}
                >
                  <Text className="text-gray-300 font-medium">📸 カメラで撮影</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* テキスト入力 */}
            <Text className="text-sm font-medium text-gray-300 mb-2">一言コメント（任意）</Text>
            <TextInput
              className="border border-gray-800 bg-gray-900 rounded-xl px-4 py-3 text-base text-white mb-6"
              placeholder="今日の努力を一言で..."
              placeholderTextColor="#555"
              multiline
              numberOfLines={3}
              value={text}
              onChangeText={setText}
              style={{ minHeight: 80, textAlignVertical: "top" }}
            />

            {/* 投稿ボタン */}
            <TouchableOpacity
              className={`rounded-2xl py-5 items-center ${imageUri ? "bg-white" : "bg-gray-900"}`}
              onPress={handleSubmit}
              disabled={isPending || !imageUri}
            >
              {isPending ? (
                <ActivityIndicator color={imageUri ? "#000" : "#555"} />
              ) : (
                <Text className={`font-bold text-lg ${imageUri ? "text-black" : "text-gray-300"}`}>
                  投稿する 🔥
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

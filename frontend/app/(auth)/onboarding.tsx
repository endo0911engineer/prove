import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOnboarding } from "../../hooks/useAuth";

const schema = z.object({
  username: z
    .string()
    .min(2, "2文字以上で入力してください")
    .max(30, "30文字以内で入力してください")
    .regex(/^[a-zA-Z0-9_]+$/, "英数字とアンダースコアのみ使用できます"),
  goal: z
    .string()
    .min(1, "目標を入力してください")
    .max(200, "200文字以内で入力してください"),
});
type FormData = z.infer<typeof schema>;

export default function OnboardingScreen() {
  const { complete, loading, error } = useOnboarding();

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tokyo";
    complete({ username: data.username, goal: data.goal, timezone });
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: 32, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-8">
            <Text className="text-3xl font-black text-white tracking-tight">プロフィール設定</Text>
            <Text className="text-gray-400 text-sm mt-2">ユーザー名と目標を設定しましょう</Text>
          </View>

          {error && (
            <View className="bg-red-950 border border-red-800 rounded-2xl px-4 py-3 mb-6">
              <Text className="text-red-400 text-sm">{error}</Text>
            </View>
          )}

          <View className="mb-5">
            <Text className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">ユーザー名</Text>
            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 text-base text-white"
                  placeholder="例: shintaro_dev"
                  placeholderTextColor="#555"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={onChange}
                  value={value}
                  maxLength={30}
                />
              )}
            />
            <Text className="text-gray-500 text-xs mt-1">英数字・アンダースコアのみ</Text>
            {errors.username && (
              <Text className="text-red-400 text-xs mt-1">{errors.username.message}</Text>
            )}
          </View>

          <View className="mb-10">
            <Text className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">あなたの目標</Text>
            <Controller
              control={control}
              name="goal"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 text-base text-white"
                  placeholder="例: 毎日英語を1時間勉強してTOEIC900点を取る"
                  placeholderTextColor="#555"
                  onChangeText={onChange}
                  value={value}
                  maxLength={200}
                  multiline
                  style={{ minHeight: 90, textAlignVertical: "top" }}
                />
              )}
            />
            {errors.goal && (
              <Text className="text-red-400 text-xs mt-1">{errors.goal.message}</Text>
            )}
          </View>

          <TouchableOpacity
            className="bg-white rounded-2xl py-5 items-center"
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#000" />
              : <Text className="text-black font-bold text-base">はじめる 🔥</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

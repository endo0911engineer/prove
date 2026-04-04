import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useOnboarding } from "../../hooks/useAuth";

// ── Step 1 ──────────────────────────────────────────
const step1Schema = z.object({
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
type Step1Data = z.infer<typeof step1Schema>;

// ── Hour picker ─────────────────────────────────────
function HourPicker({ value, onChange, min, max }: {
  value: number; onChange: (v: number) => void; min: number; max: number;
}) {
  return (
    <View className="flex-row items-center gap-5">
      <TouchableOpacity
        onPress={() => onChange(Math.max(min, value - 1))}
        className="w-11 h-11 bg-gray-800 rounded-full items-center justify-center"
      >
        <Ionicons name="remove" size={22} color="#fff" />
      </TouchableOpacity>
      <Text className="text-white font-black text-4xl w-16 text-center">
        {String(value).padStart(2, "0")}
      </Text>
      <TouchableOpacity
        onPress={() => onChange(Math.min(max, value + 1))}
        className="w-11 h-11 bg-gray-800 rounded-full items-center justify-center"
      >
        <Ionicons name="add" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ── Main ─────────────────────────────────────────────
export default function OnboardingScreen() {
  const { complete, loading, error } = useOnboarding();
  const [step, setStep] = useState<1 | 2>(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [windowStart, setWindowStart] = useState(7);
  const [windowEnd, setWindowEnd] = useState(22);

  const { control, handleSubmit, formState: { errors } } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
  });

  const onStep1Submit = (data: Step1Data) => {
    setStep1Data(data);
    setStep(2);
  };

  const onFinish = () => {
    if (!step1Data) return;
    complete({
      username: step1Data.username,
      goal: step1Data.goal,
      postingWindowStart: windowStart,
      postingWindowEnd: windowEnd,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {/* プログレスバー */}
        <View className="flex-row px-6 pt-4 pb-2 gap-2">
          <View className={`flex-1 h-1 rounded-full ${step >= 1 ? "bg-white" : "bg-gray-800"}`} />
          <View className={`flex-1 h-1 rounded-full ${step >= 2 ? "bg-white" : "bg-gray-800"}`} />
        </View>

        {step === 1 ? (
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

            {/* ユーザー名 */}
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

            {/* 目標 */}
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
              onPress={handleSubmit(onStep1Submit)}
            >
              <Text className="text-black font-bold text-base">次へ →</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: 32, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity onPress={() => setStep(1)} className="mb-6">
              <Text className="text-gray-400 text-sm">← 戻る</Text>
            </TouchableOpacity>

            <View className="mb-8">
              <Text className="text-3xl font-black text-white tracking-tight">投稿時間を設定</Text>
              <Text className="text-gray-400 text-sm mt-2 leading-5">
                毎日この時間帯に投稿することで努力を記録します。{"\n"}
                時間が来たら通知でお知らせします。
              </Text>
            </View>

            {/* 開始時間 */}
            <View className="bg-gray-900 border border-gray-800 rounded-2xl px-6 py-6 mb-4">
              <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5">開始時間</Text>
              <View className="flex-row items-center justify-between">
                <HourPicker value={windowStart} onChange={setWindowStart} min={0} max={windowEnd - 1} />
                <Text className="text-gray-300 text-2xl font-bold">時</Text>
              </View>
            </View>

            {/* 終了時間 */}
            <View className="bg-gray-900 border border-gray-800 rounded-2xl px-6 py-6 mb-6">
              <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5">終了時間</Text>
              <View className="flex-row items-center justify-between">
                <HourPicker value={windowEnd} onChange={setWindowEnd} min={windowStart + 1} max={23} />
                <Text className="text-gray-300 text-2xl font-bold">時</Text>
              </View>
            </View>

            {/* プレビュー */}
            <View className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 flex-row items-center gap-3 mb-10">
              <Ionicons name="time-outline" size={18} color="#666" />
              <Text className="text-gray-400 text-sm">
                毎日{" "}
                <Text className="text-white font-bold">{String(windowStart).padStart(2, "0")}:00</Text>
                {" "}〜{" "}
                <Text className="text-white font-bold">{String(windowEnd).padStart(2, "0")}:00</Text>
                {" "}に投稿
              </Text>
            </View>

            <TouchableOpacity
              className="bg-white rounded-2xl py-5 items-center"
              onPress={onFinish}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#000" />
                : <Text className="text-black font-bold text-base">はじめる 🔥</Text>
              }
            </TouchableOpacity>

            <Text className="text-gray-600 text-xs text-center mt-4">
              あとから設定画面で変更できます
            </Text>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

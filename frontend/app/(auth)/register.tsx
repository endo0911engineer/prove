import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRegister, useGoogleAuth } from "../../hooks/useAuth";
import { GOOGLE_CLIENT_IDS } from "../../constants/google";

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const { t } = useTranslation();

  const schema = z.object({
    email: z.string().email(t("auth.validEmail")),
    password: z.string().min(8, t("auth.passwordMinLength")),
    confirmPassword: z.string(),
  }).refine((d) => d.password === d.confirmPassword, {
    message: t("auth.passwordMismatch"),
    path: ["confirmPassword"],
  });
  type FormData = z.infer<typeof schema>;

  const { register, loading, error } = useRegister();
  const { loginWithGoogle, loading: googleLoading, error: googleError } = useGoogleAuth();
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const [request, response, promptAsync] = Google.useAuthRequest(GOOGLE_CLIENT_IDS);

  useEffect(() => {
    if (response?.type === "success" && response.authentication?.idToken) {
      loginWithGoogle(response.authentication.idToken);
    }
  }, [response]);

  const anyError = error || googleError;
  const anyLoading = loading || googleLoading;

  const fields = [
    { name: "email" as const, label: t("auth.email"), placeholder: t("auth.emailPlaceholder"), secure: false, keyboard: "email-address" as const },
    { name: "password" as const, label: t("auth.password"), placeholder: t("auth.passwordHint"), secure: true },
    { name: "confirmPassword" as const, label: t("auth.passwordConfirm"), placeholder: t("auth.passwordConfirmPlaceholder"), secure: true },
  ];

  return (
    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View className="flex-1 justify-center px-7">
          <View className="mb-8">
            <Text className="text-3xl font-black text-white tracking-tight">{t("auth.createAccount")}</Text>
            <Text className="text-gray-300 text-sm mt-2">{t("auth.createAccountTagline")}</Text>
          </View>

          {anyError && (
            <View className="bg-red-950 border border-red-800 rounded-2xl px-4 py-3 mb-5">
              <Text className="text-red-400 text-sm">{anyError}</Text>
            </View>
          )}

          {/* Googleで登録 */}
          <TouchableOpacity
            className="bg-white rounded-2xl py-4 items-center flex-row justify-center gap-3 mb-4"
            onPress={() => promptAsync()}
            disabled={!request || anyLoading}
          >
            {googleLoading
              ? <ActivityIndicator color="#000" />
              : <>
                  <Text className="text-xl">G</Text>
                  <Text className="text-black font-bold text-base">{t("auth.googleRegister")}</Text>
                </>
            }
          </TouchableOpacity>

          <View className="flex-row items-center gap-3 mb-4">
            <View className="flex-1 h-px bg-gray-800" />
            <Text className="text-gray-500 text-xs">{t("common.or")}</Text>
            <View className="flex-1 h-px bg-gray-800" />
          </View>

          {/* メール/パスワード */}
          <View className="gap-4 mb-6">
            {fields.map((f) => (
              <View key={f.name}>
                <Text className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">{f.label}</Text>
                <Controller
                  control={control}
                  name={f.name}
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 text-base text-white"
                      placeholder={f.placeholder}
                      placeholderTextColor="#555"
                      secureTextEntry={f.secure}
                      autoCapitalize="none"
                      keyboardType={f.keyboard}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
                {errors[f.name] && (
                  <Text className="text-red-400 text-xs mt-1">{errors[f.name]?.message}</Text>
                )}
              </View>
            ))}
          </View>

          <TouchableOpacity
            className="bg-gray-900 border border-gray-700 rounded-2xl py-4 items-center mb-5"
            onPress={handleSubmit((d) => register({ email: d.email, password: d.password }))}
            disabled={anyLoading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text className="text-white font-bold text-base">{t("auth.register")}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity className="items-center" onPress={() => router.back()}>
            <Text className="text-gray-300 text-sm">
              {t("auth.hasAccount")} <Text className="text-white font-bold">{t("auth.login")}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

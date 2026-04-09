import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
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
import { useLogin, useGoogleAuth } from "../../hooks/useAuth";
import { GOOGLE_CLIENT_IDS } from "../../constants/google";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { t } = useTranslation();

  const schema = z.object({
    email: z.string().email(t("auth.validEmail")),
    password: z.string().min(1, t("auth.passwordRequired")),
  });
  type FormData = z.infer<typeof schema>;

  const { login, loading, error } = useLogin();
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

  return (
    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View className="flex-1 justify-center px-7">
          {/* ブランド */}
          <View className="items-center mb-12">
            <Text
              className="font-black text-white"
              style={{ fontSize: 72, letterSpacing: 18, marginLeft: 18 }}
            >
              PROVE
            </Text>
            <View className="flex-row items-center gap-3 mt-3">
              <View className="h-px bg-gray-700 w-8" />
              <Text className="text-gray-500 text-xs tracking-widest uppercase">{t("auth.appTagline")}</Text>
              <View className="h-px bg-gray-700 w-8" />
            </View>
          </View>

          {anyError && (
            <View className="bg-red-950 border border-red-800 rounded-2xl px-4 py-3 mb-5">
              <Text className="text-red-400 text-sm">{anyError}</Text>
            </View>
          )}

          {/* Googleログイン */}
          <TouchableOpacity
            className="bg-white rounded-2xl py-4 items-center flex-row justify-center gap-3 mb-4"
            onPress={() => promptAsync()}
            disabled={!request || anyLoading}
          >
            {googleLoading
              ? <ActivityIndicator color="#000" />
              : <>
                  <Text className="text-xl">G</Text>
                  <Text className="text-black font-bold text-base">{t("auth.googleLogin")}</Text>
                </>
            }
          </TouchableOpacity>

          {/* 区切り */}
          <View className="flex-row items-center gap-3 mb-4">
            <View className="flex-1 h-px bg-gray-800" />
            <Text className="text-gray-500 text-xs">{t("common.or")}</Text>
            <View className="flex-1 h-px bg-gray-800" />
          </View>

          {/* メール/パスワード */}
          <View className="gap-4 mb-5">
            <View>
              <Text className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                {t("auth.email")}
              </Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 text-base text-white"
                    placeholder={t("auth.emailPlaceholder")}
                    placeholderTextColor="#555"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.email && <Text className="text-red-400 text-xs mt-1">{errors.email.message}</Text>}
            </View>

            <View>
              <Text className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                {t("auth.password")}
              </Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 text-base text-white"
                    placeholder={t("auth.password")}
                    placeholderTextColor="#555"
                    secureTextEntry
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.password && <Text className="text-red-400 text-xs mt-1">{errors.password.message}</Text>}
            </View>
          </View>

          <TouchableOpacity
            className="bg-gray-900 border border-gray-700 rounded-2xl py-4 items-center mb-5"
            onPress={handleSubmit(login)}
            disabled={anyLoading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text className="text-white font-bold text-base">{t("auth.login")}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity className="items-center" onPress={() => router.push("/(auth)/register")}>
            <Text className="text-gray-300 text-sm">
              {t("auth.noAccount")} <Text className="text-white font-bold">{t("auth.signUp")}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

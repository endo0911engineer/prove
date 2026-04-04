import { useEffect } from "react";
import { router } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import * as SecureStore from "expo-secure-store";
import { authApi } from "../api/auth";

export default function Index() {
  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) {
        router.replace("/(auth)/login");
        return;
      }
      try {
        const me = await authApi.me();
        if (!me) throw new Error("no user");
        // onboarding未完了なら onboarding 画面へ
        const isComplete = (me as any).isOnboardingComplete ?? true;
        if (!isComplete) {
          router.replace("/(auth)/onboarding");
        } else {
          router.replace("/(tabs)");
        }
      } catch {
        router.replace("/(auth)/login");
      }
    })();
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-black">
      <ActivityIndicator size="large" color="#fff" />
    </View>
  );
}

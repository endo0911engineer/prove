import "../global.css";
import "../i18n";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import * as SecureStore from "expo-secure-store";
import { authApi } from "../api/auth";
import { schedulePostingNotifications } from "../services/notifications";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1 },
  },
});

function NotificationScheduler() {
  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) return;
      try {
        const me = await authApi.me();
        if (me && (me as any).isOnboardingComplete) {
          await schedulePostingNotifications(
            (me as any).postingWindowStart ?? 0,
            (me as any).postingWindowEnd ?? 23,
            (me as any).notificationEnabled ?? true
          );
        }
      } catch {
        // 未ログイン時は無視
      }
    })();
  }, []);
  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <NotificationScheduler />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="user/[id]" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="settings-notifications" />
        <Stack.Screen name="settings-post-time" />
        <Stack.Screen name="settings-privacy" />
        <Stack.Screen name="follow-list" />
        <Stack.Screen name="post/[id]" />
        <Stack.Screen name="achieve-goal" />
        <Stack.Screen name="goal/[id]" />
      </Stack>
    </QueryClientProvider>
  );
}

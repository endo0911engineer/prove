import { useState } from "react";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/auth";
import { useAuthStore } from "../stores/authStore";
import { LoginRequest } from "../types";
import { schedulePostingNotifications } from "../services/notifications";

function navigateAfterAuth(needsOnboarding: boolean) {
  if (needsOnboarding) {
    router.replace("/(auth)/onboarding");
  } else {
    router.replace("/(tabs)");
  }
}

export function useLogin() {
  const queryClient = useQueryClient();
  const { saveTokens, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (data: LoginRequest) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authApi.login(data);
      await saveTokens(result.accessToken, result.refreshToken);
      // 前のユーザーのキャッシュを全クリア
      queryClient.clear();
      if (!result.needsOnboarding) {
        const me = await authApi.me();
        setUser(me);
      }
      navigateAfterAuth(result.needsOnboarding);
    } catch {
      setError("メールアドレスまたはパスワードが正しくありません");
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
}

export function useRegister() {
  const queryClient = useQueryClient();
  const { saveTokens, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = async (data: { email: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authApi.register(data);
      await saveTokens(result.accessToken, result.refreshToken);
      queryClient.clear();
      if (!result.needsOnboarding) {
        const me = await authApi.me();
        setUser(me);
      }
      navigateAfterAuth(result.needsOnboarding);
    } catch {
      setError("登録に失敗しました。メールアドレスが既に使われている可能性があります");
    } finally {
      setLoading(false);
    }
  };

  return { register, loading, error };
}

export function useGoogleAuth() {
  const queryClient = useQueryClient();
  const { saveTokens, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginWithGoogle = async (idToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authApi.googleAuth(idToken);
      await saveTokens(result.accessToken, result.refreshToken);
      queryClient.clear();
      if (!result.needsOnboarding) {
        const me = await authApi.me();
        setUser(me);
      }
      navigateAfterAuth(result.needsOnboarding);
    } catch {
      setError("Googleログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return { loginWithGoogle, loading, error };
}

export function useOnboarding() {
  const { setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const complete = async (data: {
    username: string;
    goal: string;
    postingWindowStart: number;
    postingWindowEnd: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const user = await authApi.onboarding(data);
      setUser(user);
      // 投稿時間通知をスケジュール
      await schedulePostingNotifications(
        data.postingWindowStart,
        data.postingWindowEnd,
        true
      );
      router.replace("/(tabs)");
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (detail === "Username already taken") {
        setError("このユーザー名はすでに使われています");
      } else {
        setError("設定に失敗しました。もう一度試してください");
      }
    } finally {
      setLoading(false);
    }
  };

  return { complete, loading, error };
}

export function useLogout() {
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();
  return async () => {
    await logout();
    queryClient.clear();
    router.replace("/(auth)/login");
  };
}

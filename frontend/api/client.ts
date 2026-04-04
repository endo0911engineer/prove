import applyCaseMiddleware from "axios-case-converter";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

export function getApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) return `http://${hostUri.split(":")[0]}:8001`;
  return "http://localhost:8001";
}

const rawAxios = axios.create({ baseURL: getApiUrl() });

export const apiClient = applyCaseMiddleware(
  axios.create({ baseURL: getApiUrl(), headers: { "Content-Type": "application/json" } })
);

// アクセストークンを付与
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 時にリフレッシュして自動リトライ
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;
    try {
      const refreshToken = await SecureStore.getItemAsync("refresh_token");
      if (!refreshToken) throw new Error("no refresh token");
      const res = await rawAxios.post("/api/v1/auth/refresh", {
        refresh_token: refreshToken,
      });
      const { access_token, refresh_token: newRefresh } = res.data;
      await SecureStore.setItemAsync("access_token", access_token);
      await SecureStore.setItemAsync("refresh_token", newRefresh);
      original.headers.Authorization = `Bearer ${access_token}`;
      return apiClient(original);
    } catch {
      await SecureStore.deleteItemAsync("access_token");
      await SecureStore.deleteItemAsync("refresh_token");
      // ログイン画面へのリダイレクトは useCurrentUser の error ハンドリングに任せる
      return Promise.reject(error);
    }
  }
);

import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { User } from "../types";
import { authApi } from "../api/auth";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  saveTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  saveTokens: async (accessToken, refreshToken) => {
    await SecureStore.setItemAsync("access_token", accessToken);
    await SecureStore.setItemAsync("refresh_token", refreshToken);
    set({ isAuthenticated: true });
  },

  logout: async () => {
    // サーバー側でリフレッシュトークンを失効させてからローカルを削除
    const refreshToken = await SecureStore.getItemAsync("refresh_token");
    if (refreshToken) {
      await authApi.logout(refreshToken);
    }
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    set({ user: null, isAuthenticated: false });
  },
}));

import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { User } from "../types";

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
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    set({ user: null, isAuthenticated: false });
  },
}));

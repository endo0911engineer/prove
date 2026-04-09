import { apiClient } from "./client";
import { AuthTokens, LoginRequest, User } from "../types";

export interface TokenWithOnboarding extends AuthTokens {
  needsOnboarding: boolean;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<TokenWithOnboarding> => {
    const params = new URLSearchParams();
    params.append("username", data.email);
    params.append("password", data.password);
    const res = await apiClient.post<TokenWithOnboarding>(
      "/api/v1/auth/token",
      params.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    return res.data;
  },

  register: async (data: { email: string; password: string }): Promise<TokenWithOnboarding> => {
    const res = await apiClient.post<TokenWithOnboarding>("/api/v1/auth/register", data);
    return res.data;
  },

  googleAuth: async (idToken: string): Promise<TokenWithOnboarding> => {
    const res = await apiClient.post<TokenWithOnboarding>("/api/v1/auth/google", { id_token: idToken });
    return res.data;
  },

  onboarding: async (data: {
    username: string;
    goal: string;
    postingWindowStart: number;
    postingWindowEnd: number;
  }): Promise<User> => {
    const res = await apiClient.post<User>("/api/v1/auth/onboarding", data);
    return res.data;
  },

  me: async (): Promise<User> => {
    const res = await apiClient.get<User>("/api/v1/users/me");
    return res.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    // エラーでもローカルのログアウト処理を止めないため例外を握りつぶす
    try {
      await apiClient.post("/api/v1/auth/logout", { refresh_token: refreshToken });
    } catch {}
  },
};

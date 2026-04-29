import { apiClient } from "./client";
import { User } from "../types";

export const usersApi = {
  getUser: async (userId: string): Promise<User> => {
    const res = await apiClient.get<User>(`/api/v1/users/${userId}`);
    return res.data;
  },

  updateProfile: async (data: {
    bio?: string;
    goal?: string;
    tags?: string[];
    notificationEnabled?: boolean;
    timezone?: string;
    reminderHour?: number;
    isPrivate?: boolean;
  }): Promise<User> => {
    const res = await apiClient.patch<User>("/api/v1/users/me", data);
    return res.data;
  },

  uploadAvatar: async (imageUri: string): Promise<User> => {
    const formData = new FormData();
    formData.append("image", { uri: imageUri, type: "image/jpeg", name: "avatar.jpg" } as any);
    const res = await apiClient.post<User>("/api/v1/users/me/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  follow: async (userId: string): Promise<void> => {
    await apiClient.post(`/api/v1/users/${userId}/follow`);
  },

  unfollow: async (userId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/users/${userId}/follow`);
  },

  getFollowers: async (userId: string): Promise<User[]> => {
    const res = await apiClient.get<User[]>(`/api/v1/users/${userId}/followers`);
    return res.data;
  },

  getFollowing: async (userId: string): Promise<User[]> => {
    const res = await apiClient.get<User[]>(`/api/v1/users/${userId}/following`);
    return res.data;
  },

  isFollowing: async (userId: string): Promise<boolean> => {
    const res = await apiClient.get<{ isFollowing: boolean }>(
      `/api/v1/users/${userId}/is_following`
    );
    return res.data.isFollowing;
  },

  searchUsers: async (params: {
    q?: string;
    tags?: string[];
    sort?: "streak" | "new";
  }): Promise<User[]> => {
    const res = await apiClient.get<User[]>("/api/v1/search/users", {
      params,
      paramsSerializer: (p) => {
        const sp = new URLSearchParams();
        if (p.q) sp.append("q", p.q);
        if (p.sort) sp.append("sort", p.sort);
        (p.tags ?? []).forEach((t: string) => sp.append("tags", t));
        return sp.toString();
      },
    });
    return res.data;
  },
};

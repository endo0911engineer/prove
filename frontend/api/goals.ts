import { apiClient } from "./client";
import { Goal, Post } from "../types";

export const goalsApi = {
  getMyGoals: async (): Promise<Goal[]> => {
    const res = await apiClient.get<Goal[]>("/api/v1/users/me/goals");
    return res.data;
  },

  getUserGoals: async (userId: string): Promise<Goal[]> => {
    const res = await apiClient.get<Goal[]>(`/api/v1/users/${userId}/goals`);
    return res.data;
  },

  getGoalPosts: async (goalId: string, skip = 0, limit = 20): Promise<Post[]> => {
    const res = await apiClient.get<Post[]>(`/api/v1/goals/${goalId}/posts`, {
      params: { skip, limit },
    });
    return res.data;
  },
};

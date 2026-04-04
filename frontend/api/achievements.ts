import { apiClient } from "./client";

export interface Achievement {
  id: string;
  goalText: string;
  comment: string | null;
  proofPostId: string | null;
  isPublic: boolean;
  achievedAt: string;
}

export const achievementsApi = {
  achieve: async (data: {
    comment?: string;
    proofPostId?: string;
    isPublic?: boolean;
  }): Promise<Achievement> => {
    const res = await apiClient.post<Achievement>("/api/v1/achievements", data);
    return res.data;
  },

  myAchievements: async (): Promise<Achievement[]> => {
    const res = await apiClient.get<Achievement[]>("/api/v1/achievements/me");
    return res.data;
  },

  userAchievements: async (userId: string): Promise<Achievement[]> => {
    const res = await apiClient.get<Achievement[]>(`/api/v1/achievements/user/${userId}`);
    return res.data;
  },
};

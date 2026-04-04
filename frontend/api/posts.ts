import { apiClient } from "./client";
import { Comment, Post } from "../types";

export const postsApi = {
  getFeed: async (): Promise<Post[]> => {
    const res = await apiClient.get<Post[]>("/api/v1/feed");
    return res.data;
  },

  getTodayStatus: async (): Promise<{
    status: string;
    streak: number;
    maxStreak: number;
    postingWindowStart: number;
    postingWindowEnd: number;
  }> => {
    const res = await apiClient.get("/api/v1/posts/today");
    return res.data;
  },

  createPost: async (data: FormData): Promise<Post> => {
    const res = await apiClient.post<Post>("/api/v1/posts", data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  getUserPosts: async (userId: string): Promise<Post[]> => {
    const res = await apiClient.get<Post[]>(`/api/v1/users/${userId}/posts`);
    return res.data;
  },

  toggleReaction: async (postId: string, type: string): Promise<void> => {
    await apiClient.post(`/api/v1/posts/${postId}/reactions`, { type });
  },

  getComments: async (postId: string): Promise<Comment[]> => {
    const res = await apiClient.get<Comment[]>(`/api/v1/posts/${postId}/comments`);
    return res.data;
  },

  addComment: async (postId: string, text: string): Promise<Comment> => {
    const res = await apiClient.post<Comment>(`/api/v1/posts/${postId}/comments`, { text });
    return res.data;
  },
};

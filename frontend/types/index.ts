export type PostStatus = "NOT_POSTED" | "POSTED";

export interface User {
  id: string;
  username: string;
  goal: string;
  bio: string | null;
  avatarUrl: string | null;
  tags: string[];
  notificationEnabled: boolean;
  timezone: string;
  reminderHour: number;
  isPrivate: boolean;
  currentStreak: number;
  maxStreak: number;
  followerCount: number;
  followingCount: number;
  createdAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  isActive: boolean;
  achievedAt: string | null;
  createdAt: string;
  postCount: number;
}

export interface Post {
  id: string;
  userId: string;
  goalId: string | null;
  user: User;
  imageUrl: string;
  text?: string;
  status: PostStatus;
  createdAt: string;
  reactions: Reaction[];
  comments: Comment[];
}

export type ReactionType = "KEEP_GOING" | "NICE_EFFORT" | "INSPIRED";

export interface Reaction {
  id: string;
  userId: string;
  postId: string;
  type: ReactionType;
  createdAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  postId: string;
  text: string;
  createdAt: string;
  user: User;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  goal: string;
}

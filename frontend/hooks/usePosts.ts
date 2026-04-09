import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { postsApi } from "../api/posts";
import { useAuthStore } from "../stores/authStore";
import { Comment, Post, ReactionType } from "../types";

const PAGE_SIZE = 20;

export function useTodayStatus() {
  return useQuery({
    queryKey: ["today-status"],
    queryFn: postsApi.getTodayStatus,
  });
}

export function useFeed() {
  return useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam = 0 }) => postsApi.getFeed(pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.flat().length;
    },
  });
}

export function useUserPosts(userId: string) {
  return useInfiniteQuery({
    queryKey: ["user-posts", userId],
    queryFn: ({ pageParam = 0 }) => postsApi.getUserPosts(userId, pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.flat().length;
    },
    enabled: !!userId,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postsApi.createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today-status"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
      queryClient.invalidateQueries({ queryKey: ["my-goals"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useToggleReaction() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: ({ postId, type }: { postId: string; type: string }) =>
      postsApi.toggleReaction(postId, type),

    onMutate: async ({ postId, type }) => {
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      await queryClient.cancelQueries({ queryKey: ["post", postId] });

      const previousFeed = queryClient.getQueryData(["feed"]);
      const previousPost = queryClient.getQueryData<Post>(["post", postId]);

      const applyToggle = (post: Post): Post => {
        if (!user) return post;
        const existing = post.reactions.find((r) => r.userId === user.id);
        const others = post.reactions.filter((r) => r.userId !== user.id);

        if (existing?.type === type) {
          return { ...post, reactions: others };
        }
        return {
          ...post,
          reactions: [
            ...others,
            {
              id: "__optimistic__",
              userId: user.id,
              postId,
              type: type as ReactionType,
              createdAt: new Date().toISOString(),
            },
          ],
        };
      };

      // Update infinite query pages
      queryClient.setQueryData<any>(["feed"], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: Post[]) =>
            page.map((p: Post) => (p.id === postId ? applyToggle(p) : p))
          ),
        };
      });

      if (previousPost) {
        queryClient.setQueryData<Post>(["post", postId], applyToggle(previousPost));
      }

      return { previousFeed, previousPost };
    },

    onError: (_err, { postId }, context) => {
      if (context?.previousFeed) queryClient.setQueryData(["feed"], context.previousFeed);
      if (context?.previousPost) queryClient.setQueryData(["post", postId], context.previousPost);
    },

    onSettled: (_data, _err, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
    },
  });
}

// 後方互換のためのエイリアス
export const useAddReaction = useToggleReaction;

export function useComments(postId: string) {
  return useQuery({
    queryKey: ["comments", postId],
    queryFn: () => postsApi.getComments(postId),
    enabled: !!postId,
  });
}

export function useAddComment(postId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: (text: string) => postsApi.addComment(postId, text),

    onMutate: async (text) => {
      await queryClient.cancelQueries({ queryKey: ["comments", postId] });
      const previous = queryClient.getQueryData<Comment[]>(["comments", postId]);

      if (user) {
        const optimistic: Comment = {
          id: "__optimistic__",
          userId: user.id,
          postId,
          text,
          createdAt: new Date().toISOString(),
          user,
        };
        queryClient.setQueryData<Comment[]>(
          ["comments", postId],
          [...(previous ?? []), optimistic]
        );
      }
      return { previous };
    },

    onError: (_err, _text, context) => {
      if (context?.previous) queryClient.setQueryData(["comments", postId], context.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    },
  });
}

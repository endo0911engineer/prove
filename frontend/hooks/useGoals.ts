import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { goalsApi } from "../api/goals";

const PAGE_SIZE = 20;

export function useMyGoals() {
  return useQuery({
    queryKey: ["my-goals"],
    queryFn: goalsApi.getMyGoals,
  });
}

export function useUserGoals(userId: string) {
  return useQuery({
    queryKey: ["user-goals", userId],
    queryFn: () => goalsApi.getUserGoals(userId),
    enabled: !!userId,
  });
}

export function useGoalPosts(goalId: string) {
  return useInfiniteQuery({
    queryKey: ["goal-posts", goalId],
    queryFn: ({ pageParam = 0 }) => goalsApi.getGoalPosts(goalId, pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.flat().length;
    },
    enabled: !!goalId,
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../api/users";

export function useIsFollowing(userId: string) {
  return useQuery({
    queryKey: ["is-following", userId],
    queryFn: () => usersApi.isFollowing(userId),
    enabled: !!userId,
  });
}

export function useFollow(userId: string) {
  const queryClient = useQueryClient();

  const follow = useMutation({
    mutationFn: () => usersApi.follow(userId),
    onSuccess: () => {
      queryClient.setQueryData(["is-following", userId], true);
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const unfollow = useMutation({
    mutationFn: () => usersApi.unfollow(userId),
    onSuccess: () => {
      queryClient.setQueryData(["is-following", userId], false);
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  return { follow, unfollow };
}

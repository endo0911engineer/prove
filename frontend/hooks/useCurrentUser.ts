import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/auth";
import { useAuthStore } from "../stores/authStore";

export function useCurrentUser() {
  const { setUser } = useAuthStore();

  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const me = await authApi.me();
      setUser(me);
      return me;
    },
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function useInvalidateCurrentUser() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["me"] });
}

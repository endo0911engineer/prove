import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "../api/users";
import { useIsFollowing, useFollow } from "../hooks/useFollow";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { Avatar } from "../components/Avatar";
import { User } from "../types";

function FollowBtn({ userId }: { userId: string }) {
  const { data: me } = useCurrentUser();
  const { data: isFollowing } = useIsFollowing(userId);
  const { follow, unfollow } = useFollow(userId);
  if (me?.id === userId || isFollowing === undefined) return null;
  return (
    <TouchableOpacity
      onPress={() => isFollowing ? unfollow.mutate() : follow.mutate()}
      className={`px-4 py-1.5 rounded-full border ${
        isFollowing ? "border-gray-700 bg-gray-900" : "border-white bg-white"
      }`}
    >
      <Text className={`text-xs font-bold ${isFollowing ? "text-gray-400" : "text-black"}`}>
        {isFollowing ? "フォロー中" : "フォロー"}
      </Text>
    </TouchableOpacity>
  );
}

function UserRow({ user }: { user: User }) {
  return (
    <TouchableOpacity
      className="flex-row items-center px-4 py-3 border-b border-gray-900 active:bg-gray-900"
      onPress={() => router.push(`/user/${user.id}`)}
    >
      <View className="mr-3">
        <Avatar username={user.username} avatarUrl={user.avatarUrl} size={48} />
      </View>
      <View className="flex-1 mr-3">
        <Text className="font-bold text-white text-sm">@{user.username}</Text>
        {user.bio ? (
          <Text className="text-gray-300 text-xs mt-0.5" numberOfLines={1}>{user.bio}</Text>
        ) : null}
        <View className="flex-row items-center gap-2 mt-0.5">
          <Text className="text-gray-400 text-xs">{user.goal}</Text>
          <Text className="text-xs font-bold text-orange-500">🔥 {user.currentStreak}日</Text>
        </View>
      </View>
      <FollowBtn userId={user.id} />
    </TouchableOpacity>
  );
}

export default function FollowListScreen() {
  const { userId, mode } = useLocalSearchParams<{ userId: string; mode: "followers" | "following" }>();
  const isFollowers = mode === "followers";

  const { data: users, isLoading } = useQuery({
    queryKey: ["follow-list", userId, mode],
    queryFn: () => isFollowers ? usersApi.getFollowers(userId) : usersApi.getFollowing(userId),
    enabled: !!userId,
  });

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-row items-center px-4 py-3 border-b border-gray-900 gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 items-center justify-center rounded-full bg-gray-900"
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text className="font-black text-white text-base">
          {isFollowers ? "フォロワー" : "フォロー中"}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#fff" />
        </View>
      ) : (
        <FlatList
          data={users ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }: { item: User }) => <UserRow user={item} />}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Text className="text-4xl mb-3">{isFollowers ? "👥" : "🔍"}</Text>
              <Text className="text-gray-400 text-sm">
                {isFollowers ? "フォロワーはまだいません" : "フォロー中のユーザーはいません"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

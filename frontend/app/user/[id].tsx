import {
  View, Text, FlatList, Image, TouchableOpacity,
  ActivityIndicator, Dimensions,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "../../api/users";
import { useUserPosts } from "../../hooks/usePosts";
import { useIsFollowing, useFollow } from "../../hooks/useFollow";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { getApiUrl } from "../../api/client";
import { achievementsApi, Achievement } from "../../api/achievements";
import { Avatar } from "../../components/Avatar";
import { Post } from "../../types";

const GRID_SIZE = Dimensions.get("window").width / 3;
const buildImageUrl = (url: string) =>
  url.startsWith("http") ? url : `${getApiUrl()}${url}`;

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: me } = useCurrentUser();
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["user", id],
    queryFn: () => usersApi.getUser(id),
    enabled: !!id,
  });
  const { data: posts, isLoading: postsLoading } = useUserPosts(id ?? "");
  const { data: isFollowing } = useIsFollowing(id ?? "");
  const { follow, unfollow } = useFollow(id ?? "");
  const { data: achievements } = useQuery({
    queryKey: ["achievements", id],
    queryFn: () => achievementsApi.userAchievements(id),
    enabled: !!id,
  });
  const isMe = me?.id === id;

  if (userLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  const Header = () => (
    <View>
      {/* ナビゲーションバー */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-900">
        <TouchableOpacity onPress={() => router.back()} className="p-1 mr-3">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="font-black text-white text-base flex-1">@{user?.username}</Text>
        {!isMe && (
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
        )}
      </View>

      {/* プロフィール情報 */}
      <View className="px-4 pb-4 pt-4">
        <View className="flex-row items-center mb-4">
          <View className="mr-6">
            <Avatar username={user?.username ?? "?"} avatarUrl={user?.avatarUrl} size={80} />
          </View>

          {/* 統計 */}
          <View className="flex-1 flex-row justify-around">
            <View className="items-center">
              <Text className="text-lg font-black text-white">{posts?.length ?? 0}</Text>
              <Text className="text-xs text-gray-300">投稿</Text>
            </View>
            <TouchableOpacity
              className="items-center"
              onPress={() => router.push({ pathname: "/follow-list", params: { userId: id, mode: "followers" } })}
            >
              <Text className="text-lg font-black text-white">{user?.followerCount ?? 0}</Text>
              <Text className="text-xs text-gray-300">フォロワー</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="items-center"
              onPress={() => router.push({ pathname: "/follow-list", params: { userId: id, mode: "following" } })}
            >
              <Text className="text-lg font-black text-white">{user?.followingCount ?? 0}</Text>
              <Text className="text-xs text-gray-300">フォロー</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 名前・bio・goal */}
        <Text className="font-bold text-white text-sm">@{user?.username}</Text>
        {user?.bio ? (
          <Text className="text-gray-400 text-sm mt-0.5 leading-5">{user.bio}</Text>
        ) : null}
        <View className="flex-row items-center gap-2 mt-2 flex-wrap">
          <View className="bg-gray-900 border border-gray-700 rounded-full px-3 py-1">
            <Text className="text-xs font-semibold text-gray-300">{user?.goal}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Text className="text-sm">🔥</Text>
            <Text className="text-sm font-black text-orange-500">{user?.currentStreak}日連続</Text>
          </View>
        </View>
        {user?.tags && user.tags.length > 0 && (
          <View className="flex-row flex-wrap gap-1.5 mt-2">
            {user.tags.map((tag) => (
              <View key={tag} className="bg-gray-800 rounded-full px-2.5 py-1">
                <Text className="text-gray-300 text-xs">#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ストリーク統計バー */}
      <View className="flex-row border-t border-b border-gray-900 py-3 mx-4 mb-1 gap-4 justify-center">
        <View className="items-center flex-1">
          <Text className="text-2xl font-black text-white">{user?.currentStreak ?? 0}</Text>
          <Text className="text-xs text-gray-400 mt-0.5">🔥 現在</Text>
        </View>
        <View className="w-px bg-gray-900" />
        <View className="items-center flex-1">
          <Text className="text-2xl font-black text-white">{user?.maxStreak ?? 0}</Text>
          <Text className="text-xs text-gray-400 mt-0.5">🏆 最高</Text>
        </View>
      </View>

      {/* 達成履歴 */}
      {achievements && achievements.length > 0 && (
        <View className="px-4 py-4 border-b border-gray-900">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">達成履歴</Text>
          {achievements.map((a: Achievement) => (
            <View key={a.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 mb-2">
              <View className="flex-row items-start gap-2">
                <Text className="text-lg">✅</Text>
                <View className="flex-1">
                  <Text className="text-white text-sm font-semibold leading-5">{a.goalText}</Text>
                  {a.comment ? (
                    <Text className="text-gray-400 text-xs mt-1 leading-4">{a.comment}</Text>
                  ) : null}
                  <Text className="text-gray-400 text-xs mt-1">
                    {new Date(a.achievedAt).toLocaleDateString("ja-JP")}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      <View className="border-b border-gray-900" />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-black">
      <FlatList
        data={posts ?? []}
        keyExtractor={(item) => item.id}
        numColumns={3}
        ListHeaderComponent={<Header />}
        renderItem={({ item }: { item: Post }) => (
          <TouchableOpacity onPress={() => router.push(`/post/${item.id}`)}>
            <Image
              source={{ uri: buildImageUrl(item.imageUrl) }}
              style={{ width: GRID_SIZE, height: GRID_SIZE }}
              className="border-0.5 border-black"
            />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !postsLoading ? (
            <View className="items-center py-16">
              <Text className="text-5xl mb-3">📷</Text>
              <Text className="text-gray-400 text-sm">まだ投稿がありません</Text>
            </View>
          ) : <ActivityIndicator className="py-8" color="#fff" />
        }
      />
    </SafeAreaView>
  );
}

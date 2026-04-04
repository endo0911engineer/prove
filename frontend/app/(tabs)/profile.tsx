import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useUserPosts } from "../../hooks/usePosts";
import { getApiUrl } from "../../api/client";
import { achievementsApi, Achievement } from "../../api/achievements";
import { Avatar } from "../../components/Avatar";
import { Post } from "../../types";

const SIZE = Dimensions.get("window").width / 3;
const buildImageUrl = (url: string) => url.startsWith("http") ? url : `${getApiUrl()}${url}`;

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default function ProfileScreen() {
  const { data: user, isLoading } = useCurrentUser();
  const { data: posts, isLoading: postsLoading } = useUserPosts(user?.id ?? "");
  const { data: achievements } = useQuery({
    queryKey: ["my-achievements"],
    queryFn: achievementsApi.myAchievements,
    enabled: !!user,
  });

  if (isLoading) {
    return <View className="flex-1 items-center justify-center bg-black">
      <ActivityIndicator size="large" color="#fff" />
    </View>;
  }

  const Header = () => (
    <View>
      {/* ナビゲーションバー */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-lg font-black text-white">{user?.username}</Text>
        <TouchableOpacity onPress={() => router.push("/settings")} className="p-1">
          <Ionicons name="menu-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* プロフィール情報 */}
      <View className="px-4 pb-4">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.push("/edit-profile")} className="mr-6">
            <Avatar username={user?.username ?? "?"} avatarUrl={user?.avatarUrl} size={80} />
          </TouchableOpacity>

          <View className="flex-1 flex-row justify-around">
            <View className="items-center">
              <Text className="text-lg font-black text-white">{posts?.length ?? 0}</Text>
              <Text className="text-xs text-gray-300">投稿</Text>
            </View>
            <TouchableOpacity
              className="items-center"
              onPress={() => router.push({ pathname: "/follow-list", params: { userId: user?.id, mode: "followers" } })}
            >
              <Text className="text-lg font-black text-white">{user?.followerCount ?? 0}</Text>
              <Text className="text-xs text-gray-300">フォロワー</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="items-center"
              onPress={() => router.push({ pathname: "/follow-list", params: { userId: user?.id, mode: "following" } })}
            >
              <Text className="text-lg font-black text-white">{user?.followingCount ?? 0}</Text>
              <Text className="text-xs text-gray-300">フォロー</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text className="font-bold text-white text-sm">@{user?.username}</Text>
        {user?.bio ? (
          <Text className="text-gray-300 text-sm mt-0.5 leading-5">{user.bio}</Text>
        ) : null}
        <View className="flex-row items-center gap-2 mt-2 flex-wrap">
          <View className="bg-gray-900 border border-gray-700 rounded-full px-3 py-1">
            <Text className="text-xs font-semibold text-gray-300" numberOfLines={1}>{user?.goal}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Text className="text-sm">🔥</Text>
            <Text className="text-sm font-black text-orange-500">{user?.currentStreak}日連続</Text>
          </View>
        </View>

        {/* タグ */}
        {user?.tags && user.tags.length > 0 && (
          <View className="flex-row flex-wrap gap-1.5 mt-2">
            {user.tags.map((tag) => (
              <View key={tag} className="bg-gray-800 rounded-full px-2.5 py-1">
                <Text className="text-gray-300 text-xs">#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ボタン行 */}
        <View className="flex-row gap-2 mt-3">
          <TouchableOpacity
            onPress={() => router.push("/edit-profile")}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl py-2 items-center"
          >
            <Text className="text-sm font-semibold text-gray-300">プロフィールを編集</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/achieve-goal")}
            className="bg-gray-900 border border-gray-700 rounded-xl py-2 px-4 items-center flex-row gap-1.5"
          >
            <Text className="text-sm">🏆</Text>
            <Text className="text-sm font-semibold text-gray-300">達成</Text>
          </TouchableOpacity>
        </View>
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
                  <Text className="text-gray-400 text-xs mt-1">{formatDate(a.achievedAt)}</Text>
                </View>
                {!a.isPublic && (
                  <Ionicons name="lock-closed-outline" size={14} color="#666" />
                )}
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
              style={{ width: SIZE, height: SIZE }}
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

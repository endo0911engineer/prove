import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "../../api/users";
import { useIsFollowing, useFollow } from "../../hooks/useFollow";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { Avatar } from "../../components/Avatar";
import { User } from "../../types";

const PRESET_TAGS = [
  "朝活", "夜活", "読書", "プログラミング", "英語", "筋トレ",
  "副業", "起業", "ダイエット", "瞑想", "ランニング", "料理", "投資", "デザイン", "音楽",
];

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
      <Text className={`text-xs font-bold ${isFollowing ? "text-gray-300" : "text-black"}`}>
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
        <View className="flex-row items-center gap-3 mt-1 flex-wrap">
          <Text className="text-gray-400 text-xs" numberOfLines={1}>{user.goal}</Text>
          <Text className="text-xs font-bold text-orange-500">🔥 {user.currentStreak}日</Text>
        </View>
        {user.tags.length > 0 && (
          <View className="flex-row flex-wrap gap-1 mt-1">
            {user.tags.slice(0, 3).map((tag) => (
              <View key={tag} className="bg-gray-800 rounded-full px-2 py-0.5">
                <Text className="text-gray-300 text-xs">#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <FollowBtn userId={user.id} />
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const [q, setQ] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sort, setSort] = useState<"streak" | "new">("streak");
  const { data: me } = useCurrentUser();

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const { data: users, isLoading } = useQuery({
    queryKey: ["search-users", q, selectedTags, sort],
    queryFn: () => usersApi.searchUsers({
      q: q || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      sort,
    }),
    enabled: !!me,
    staleTime: 30 * 1000,
  });

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* 検索バー */}
      <View className="px-4 pt-4 pb-3 border-b border-gray-900">
        <View className="flex-row items-center bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 gap-2">
          <Ionicons name="search-outline" size={16} color="#888" />
          <TextInput
            className="flex-1 text-sm text-white"
            placeholder="ユーザー名で検索..."
            placeholderTextColor="#555"
            value={q}
            onChangeText={setQ}
            autoCapitalize="none"
          />
          {q.length > 0 && (
            <TouchableOpacity onPress={() => setQ("")}>
              <Ionicons name="close-circle" size={16} color="#555" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 並び替え */}
      <View className="flex-row px-4 py-2.5 gap-2 border-b border-gray-900">
        {(["streak", "new"] as const).map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setSort(s)}
            className={`px-4 py-1.5 rounded-full ${sort === s ? "bg-white" : "bg-gray-900 border border-gray-800"}`}
          >
            <Text className={`text-xs font-bold ${sort === s ? "text-black" : "text-gray-300"}`}>
              {s === "streak" ? "🔥 ストリーク順" : "🕐 新着順"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* タグフィルター */}
      <View className="border-b border-gray-900 py-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {PRESET_TAGS.map((tag) => {
            const active = selectedTags.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                onPress={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-full border ${
                  active ? "bg-white border-white" : "bg-gray-900 border-gray-800"
                }`}
              >
                <Text className={`text-xs font-bold ${active ? "text-black" : "text-gray-300"}`}>
                  #{tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {selectedTags.length > 0 && (
          <TouchableOpacity onPress={() => setSelectedTags([])} className="px-4 pt-1">
            <Text className="text-xs text-gray-400">タグをリセット ×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 結果 */}
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
              <Text className="text-4xl mb-3">🔍</Text>
              <Text className="text-gray-400 text-sm">ユーザーが見つかりませんでした</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

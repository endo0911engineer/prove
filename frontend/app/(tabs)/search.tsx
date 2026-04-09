import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "../../api/users";
import { useIsFollowing, useFollow } from "../../hooks/useFollow";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { Avatar } from "../../components/Avatar";
import { User } from "../../types";

// タグのAPIキー（日本語、DBに保存される値）→ 翻訳キーのマッピング
const TAG_KEYS: { apiValue: string; i18nKey: string }[] = [
  { apiValue: "朝活",       i18nKey: "search.tags.morningActivity" },
  { apiValue: "夜活",       i18nKey: "search.tags.eveningActivity" },
  { apiValue: "読書",       i18nKey: "search.tags.reading" },
  { apiValue: "プログラミング", i18nKey: "search.tags.programming" },
  { apiValue: "英語",       i18nKey: "search.tags.english" },
  { apiValue: "筋トレ",     i18nKey: "search.tags.workout" },
  { apiValue: "副業",       i18nKey: "search.tags.sideJob" },
  { apiValue: "起業",       i18nKey: "search.tags.entrepreneurship" },
  { apiValue: "ダイエット",  i18nKey: "search.tags.diet" },
  { apiValue: "瞑想",       i18nKey: "search.tags.meditation" },
  { apiValue: "ランニング",  i18nKey: "search.tags.running" },
  { apiValue: "料理",       i18nKey: "search.tags.cooking" },
  { apiValue: "投資",       i18nKey: "search.tags.investment" },
  { apiValue: "デザイン",   i18nKey: "search.tags.design" },
  { apiValue: "音楽",       i18nKey: "search.tags.music" },
];

function FollowBtn({ userId }: { userId: string }) {
  const { data: me } = useCurrentUser();
  const { data: isFollowing } = useIsFollowing(userId);
  const { follow, unfollow } = useFollow(userId);
  const { t } = useTranslation();
  if (me?.id === userId || isFollowing === undefined) return null;
  return (
    <TouchableOpacity
      onPress={() => isFollowing ? unfollow.mutate() : follow.mutate()}
      className={`px-4 py-1.5 rounded-full border ${
        isFollowing ? "border-gray-700 bg-gray-900" : "border-white bg-white"
      }`}
    >
      <Text className={`text-xs font-bold ${isFollowing ? "text-gray-300" : "text-black"}`}>
        {isFollowing ? t("common.following") : t("common.follow")}
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
          <Text className="text-xs font-bold text-orange-500">🔥 {user.currentStreak}</Text>
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
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [selectedApiTags, setSelectedApiTags] = useState<string[]>([]);
  const [sort, setSort] = useState<"streak" | "new">("streak");
  const { data: me } = useCurrentUser();

  const toggleTag = (apiValue: string) => {
    setSelectedApiTags((prev) =>
      prev.includes(apiValue) ? prev.filter((t) => t !== apiValue) : [...prev, apiValue]
    );
  };

  const { data: users, isLoading } = useQuery({
    queryKey: ["search-users", q, selectedApiTags, sort],
    queryFn: () => usersApi.searchUsers({
      q: q || undefined,
      tags: selectedApiTags.length > 0 ? selectedApiTags : undefined,
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
            placeholder={t("search.placeholder")}
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
              {s === "streak" ? t("search.sortByStreak") : t("search.sortByNew")}
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
          {TAG_KEYS.map(({ apiValue, i18nKey }) => {
            const active = selectedApiTags.includes(apiValue);
            return (
              <TouchableOpacity
                key={apiValue}
                onPress={() => toggleTag(apiValue)}
                className={`px-3 py-1.5 rounded-full border ${
                  active ? "bg-white border-white" : "bg-gray-900 border-gray-800"
                }`}
              >
                <Text className={`text-xs font-bold ${active ? "text-black" : "text-gray-300"}`}>
                  #{t(i18nKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {selectedApiTags.length > 0 && (
          <TouchableOpacity onPress={() => setSelectedApiTags([])} className="px-4 pt-1">
            <Text className="text-xs text-gray-400">{t("search.resetTags")}</Text>
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
              <Text className="text-gray-400 text-sm">{t("search.noResults")}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

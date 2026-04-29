import { View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useFeed, useTodayStatus } from "../../hooks/usePosts";
import { PostCard } from "../../components/post/PostCard";
import { Post } from "../../types";

export default function FeedScreen() {
  const { t } = useTranslation();
  const { data: todayStatus } = useTodayStatus();
  const posted = todayStatus?.status === "POSTED";

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
    isRefetching,
  } = useFeed();

  const posts = data?.pages.flat() ?? [];

  if (!posted) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="px-5 pt-4 pb-3 border-b border-gray-900">
          <Text className="text-2xl font-black text-white">{t("feed.title")}</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl mb-5">🔒</Text>
          <Text className="text-white font-black text-xl text-center mb-3">
            {t("feed.locked")}
          </Text>
          <Text className="text-gray-300 text-sm text-center leading-6 mb-8">
            {t("feed.lockedMessage")}
          </Text>
          <TouchableOpacity
            className="bg-white rounded-2xl py-4 px-8 flex-row items-center gap-2"
            onPress={() => router.push("/(tabs)/post")}
          >
            <Text className="text-2xl">📸</Text>
            <Text className="text-black font-bold text-base">{t("common.recordTodayEffort")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return <View className="flex-1 items-center justify-center bg-black">
      <ActivityIndicator size="large" color="#fff" />
    </View>;
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-5 pt-4 pb-3 border-b border-gray-900">
        <Text className="text-2xl font-black text-white">{t("feed.title")}</Text>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: Post }) => <PostCard post={item} />}
        contentContainerStyle={!posts.length ? { flex: 1 } : { paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#fff" />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isFetchingNextPage ? <ActivityIndicator className="py-4" color="#fff" /> : null
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-24 px-8">
            <Text className="text-5xl mb-4">👀</Text>
            <Text className="text-gray-400 text-center text-sm leading-6">
              {t("feed.emptyMessage")}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

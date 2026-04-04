import { View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useFeed, useTodayStatus } from "../../hooks/usePosts";
import { PostCard } from "../../components/post/PostCard";
import { Post } from "../../types";

export default function FeedScreen() {
  const { data: todayStatus } = useTodayStatus();
  const posted = todayStatus?.status === "POSTED" || todayStatus?.status === "LATE";

  const { data: posts, isLoading, refetch, isRefetching } = useFeed();

  if (!posted) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="px-5 pt-4 pb-3 border-b border-gray-900">
          <Text className="text-2xl font-black text-white">フィード</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl mb-5">🔒</Text>
          <Text className="text-white font-black text-xl text-center mb-3">
            今日の投稿が必要です
          </Text>
          <Text className="text-gray-300 text-sm text-center leading-6 mb-8">
            仲間の投稿を見るには、{"\n"}まず自分の努力を記録しましょう。
          </Text>
          <TouchableOpacity
            className="bg-white rounded-2xl py-4 px-8 flex-row items-center gap-2"
            onPress={() => router.push("/(tabs)/post")}
          >
            <Text className="text-2xl">📸</Text>
            <Text className="text-black font-bold text-base">今日の努力を記録する</Text>
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
        <Text className="text-2xl font-black text-white">フィード</Text>
      </View>

      <FlatList
        data={posts ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: Post }) => <PostCard post={item} />}
        contentContainerStyle={!posts?.length ? { flex: 1 } : { paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#fff" />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-24 px-8">
            <Text className="text-5xl mb-4">👀</Text>
            <Text className="text-gray-400 text-center text-sm leading-6">
              同じ目標を持つ仲間の投稿がここに表示されます。{"\n"}
              まずは誰かをフォローしてみよう！
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

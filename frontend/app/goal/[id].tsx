import {
  View, Text, FlatList, Image, TouchableOpacity,
  ActivityIndicator, Dimensions,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useGoalPosts } from "../../hooks/useGoals";
import { getApiUrl } from "../../api/client";
import { Post } from "../../types";

const GRID_SIZE = Dimensions.get("window").width / 3;
const buildImageUrl = (url: string) =>
  url.startsWith("http") ? url : `${getApiUrl()}${url}`;

export default function GoalPostsScreen() {
  const { t } = useTranslation();
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useGoalPosts(id ?? "");

  const posts = data?.pages.flat() ?? [];

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-row items-center px-4 py-3 border-b border-gray-900 gap-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="font-black text-white text-base flex-1" numberOfLines={1}>
          {title ?? t("goal.title")}
        </Text>
        <Text className="text-gray-400 text-sm">{t("goal.postCount", { count: posts.length })}</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          numColumns={3}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator className="py-4" color="#fff" /> : null
          }
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
            <View className="items-center py-16">
              <Text className="text-5xl mb-3">📷</Text>
              <Text className="text-gray-400 text-sm">{t("goal.noPostsYet")}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

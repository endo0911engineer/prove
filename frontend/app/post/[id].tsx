import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { apiClient } from "../../api/client";
import { getApiUrl } from "../../api/client";
import { useTranslation } from "react-i18next";
import { useToggleReaction, useComments, useAddComment } from "../../hooks/usePosts";
import { useAuthStore } from "../../stores/authStore";
import { Avatar } from "../../components/Avatar";
import { Post, ReactionType } from "../../types";

const REACTION_TYPES: { type: ReactionType; emoji: string; labelKey: string }[] = [
  { type: "KEEP_GOING", emoji: "🔥", labelKey: "postDetail.reactionKeepGoing" },
  { type: "NICE_EFFORT", emoji: "💪", labelKey: "postDetail.reactionNiceEffort" },
  { type: "INSPIRED", emoji: "⚡", labelKey: "postDetail.reactionInspired" },
];

const buildImageUrl = (url: string) =>
  url.startsWith("http") ? url : `${getApiUrl()}${url}`;

export default function PostDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mutate: toggleReaction, isPending: reactionPending } = useToggleReaction();
  const { mutate: addComment, isPending: commentPending } = useAddComment(id ?? "");
  const { user } = useAuthStore();
  const [commentText, setCommentText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const { data: post, isLoading } = useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      const res = await apiClient.get<Post>(`/api/v1/posts/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const { data: comments = [] } = useComments(id ?? "");

  const myReaction = post?.reactions.find((r) => r.userId === user?.id);

  const handleSendComment = () => {
    const text = commentText.trim();
    if (!text || commentPending) return;
    setCommentText("");
    addComment(text);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!post) return null;

  return (
    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* ナビ */}
        <View className="flex-row items-center px-4 py-3 border-b border-gray-900">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 items-center justify-center rounded-full bg-gray-900 mr-3"
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text className="font-black text-white text-base">{t("postDetail.title")}</Text>
        </View>

        <ScrollView>
          {/* ユーザーヘッダー */}
          <TouchableOpacity
            className="flex-row items-center px-4 py-3 gap-3"
            onPress={() => router.push(`/user/${post.userId}`)}
          >
            <Avatar username={post.user.username} avatarUrl={post.user.avatarUrl} size={40} />
            <View className="flex-1">
              <Text className="font-bold text-white text-sm">@{post.user.username}</Text>
              <Text className="text-gray-400 text-xs">{post.user.goal}</Text>
            </View>
            <View className="flex-row items-center gap-1 bg-gray-900 border border-gray-800 rounded-full px-2.5 py-1">
              <Text style={{ fontSize: 12 }}>🔥</Text>
              <Text className="text-orange-500 font-black text-xs">{post.user.currentStreak}</Text>
            </View>
          </TouchableOpacity>

          {/* 画像 */}
          <Image
            source={{ uri: buildImageUrl(post.imageUrl) }}
            style={{ width: "100%", aspectRatio: 1 }}
            resizeMode="cover"
          />

          {/* リアクション */}
          <View className="px-4 pt-4 pb-2 flex-row gap-2 flex-wrap">
            {REACTION_TYPES.map((r) => {
              const count = post.reactions.filter((rx) => rx.type === r.type).length;
              const isMyReaction = myReaction?.type === r.type;
              return (
                <TouchableOpacity
                  key={r.type}
                  onPress={() => toggleReaction({ postId: post.id, type: r.type })}
                  disabled={reactionPending}
                  className={`flex-row items-center gap-1.5 rounded-full px-4 py-2 border ${
                    isMyReaction
                      ? "bg-white border-white"
                      : count > 0
                      ? "bg-gray-800 border-gray-700"
                      : "bg-gray-900 border-gray-800"
                  }`}
                >
                  <Text style={{ fontSize: 16 }}>{r.emoji}</Text>
                  <Text
                    className={`text-sm font-medium ${isMyReaction ? "text-black" : "text-gray-300"}`}
                  >
                    {t(r.labelKey)}
                  </Text>
                  {count > 0 && (
                    <Text
                      className={`text-sm font-bold ${isMyReaction ? "text-black" : "text-gray-300"}`}
                    >
                      {count}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* キャプション */}
          {post.text ? (
            <View className="px-4 pt-1 pb-3">
              <Text className="text-white text-sm leading-6">
                <Text className="font-bold">@{post.user.username} </Text>
                {post.text}
              </Text>
            </View>
          ) : null}

          <Text className="text-xs text-gray-400 px-4 pb-4">{(() => {
            const diff = Math.floor((Date.now() - new Date(post.createdAt).getTime()) / 1000);
            if (diff < 60) return t("common.justNow");
            if (diff < 3600) return t("common.minutesAgo", { count: Math.floor(diff / 60) });
            if (diff < 86400) return t("common.hoursAgo", { count: Math.floor(diff / 3600) });
            return t("common.daysAgo", { count: Math.floor(diff / 86400) });
          })()}</Text>

          {/* コメント一覧 */}
          <View className="border-t border-gray-900 pt-4 pb-2">
            {comments.length === 0 ? (
              <Text className="text-gray-600 text-sm text-center py-4">
                {t("postDetail.firstComment")}
              </Text>
            ) : (
              comments.map((c) => (
                <View key={c.id} className="flex-row gap-3 px-4 mb-4">
                  <TouchableOpacity onPress={() => router.push(`/user/${c.userId}`)}>
                    <Avatar username={c.user.username} avatarUrl={c.user.avatarUrl} size={32} />
                  </TouchableOpacity>
                  <View className="flex-1">
                    <View className="flex-row items-baseline gap-2">
                      <Text className="font-bold text-white text-sm">@{c.user.username}</Text>
                      <Text className="text-gray-600 text-xs">{(() => {
                        const diff = Math.floor((Date.now() - new Date(c.createdAt).getTime()) / 1000);
                        if (diff < 60) return t("common.justNow");
                        if (diff < 3600) return t("common.minutesAgo", { count: Math.floor(diff / 60) });
                        if (diff < 86400) return t("common.hoursAgo", { count: Math.floor(diff / 3600) });
                        return t("common.daysAgo", { count: Math.floor(diff / 86400) });
                      })()}</Text>
                    </View>
                    <Text className="text-gray-200 text-sm mt-0.5 leading-5">{c.text}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* スクロール余白 */}
          <View style={{ height: 80 }} />
        </ScrollView>

        {/* コメント入力バー */}
        <View className="flex-row items-center px-4 py-3 border-t border-gray-900 bg-black gap-3">
          <Avatar username={user?.username ?? "?"} avatarUrl={user?.avatarUrl} size={32} />
          <TextInput
            ref={inputRef}
            className="flex-1 bg-gray-900 rounded-2xl px-4 py-2.5 text-sm text-white"
            placeholder={t("postDetail.commentPlaceholder")}
            placeholderTextColor="#555"
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={300}
            returnKeyType="send"
            onSubmitEditing={handleSendComment}
          />
          <TouchableOpacity
            onPress={handleSendComment}
            disabled={!commentText.trim() || commentPending}
            className="w-9 h-9 items-center justify-center"
          >
            {commentPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={commentText.trim() ? "#fff" : "#444"}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

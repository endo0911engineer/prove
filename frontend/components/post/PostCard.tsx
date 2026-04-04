import { View, Text, Image, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Post, ReactionType } from "../../types";
import { getApiUrl } from "../../api/client";
import { useToggleReaction } from "../../hooks/usePosts";
import { useAuthStore } from "../../stores/authStore";
import { Avatar } from "../Avatar";

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "KEEP_GOING", emoji: "🔥", label: "継続すごい" },
  { type: "NICE_EFFORT", emoji: "💪", label: "ナイス努力" },
  { type: "INSPIRED", emoji: "⚡", label: "刺激もらった" },
];

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "たった今";
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  return `${Math.floor(diff / 86400)}日前`;
}

const buildImageUrl = (url: string) =>
  url.startsWith("http") ? url : `${getApiUrl()}${url}`;

export function PostCard({ post }: { post: Post }) {
  const { mutate: toggleReaction, isPending } = useToggleReaction();
  const { user } = useAuthStore();
  const myReaction = post.reactions.find((r) => r.userId === user?.id);

  return (
    <View className="bg-black mb-1 border-b border-gray-900">
      {/* ヘッダー */}
      <TouchableOpacity
        className="flex-row items-center px-3 py-2.5 gap-2.5"
        onPress={() => router.push(`/user/${post.userId}`)}
      >
        <Avatar username={post.user.username} avatarUrl={post.user.avatarUrl} size={36} />
        <View className="flex-1">
          <Text className="font-bold text-white text-sm leading-tight">{post.user.username}</Text>
          <Text className="text-gray-400 text-xs">{post.user.goal}</Text>
        </View>
        <View className="flex-row items-center gap-1 bg-gray-900 border border-gray-800 rounded-full px-2.5 py-1">
          <Text style={{ fontSize: 12 }}>🔥</Text>
          <Text className="text-orange-500 font-black text-xs">{post.user.currentStreak}</Text>
        </View>
      </TouchableOpacity>

      {/* フル幅画像（タップで詳細へ） */}
      <TouchableOpacity onPress={() => router.push(`/post/${post.id}`)}>
        <Image
          source={{ uri: buildImageUrl(post.imageUrl) }}
          style={{ width: "100%", aspectRatio: 1 }}
          resizeMode="cover"
        />
      </TouchableOpacity>

      {/* リアクション */}
      <View className="px-3 pt-3 pb-1 flex-row gap-2 flex-wrap">
        {REACTIONS.map((r) => {
          const count = post.reactions.filter((rx) => rx.type === r.type).length;
          const isMyReaction = myReaction?.type === r.type;
          return (
            <TouchableOpacity
              key={r.type}
              onPress={() => toggleReaction({ postId: post.id, type: r.type })}
              disabled={isPending}
              className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 border ${
                isMyReaction
                  ? "bg-white border-white"
                  : count > 0
                  ? "bg-gray-800 border-gray-700"
                  : "bg-gray-900 border-gray-800"
              }`}
            >
              <Text style={{ fontSize: 13 }}>{r.emoji}</Text>
              <Text
                className={`text-xs font-medium ${isMyReaction ? "text-black" : "text-gray-400"}`}
              >
                {r.label}
              </Text>
              {count > 0 && (
                <Text
                  className={`text-xs font-bold ${isMyReaction ? "text-black" : "text-gray-300"}`}
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
        <View className="px-3 pt-1 pb-1">
          <Text className="text-sm text-white leading-5">
            <Text className="font-bold">{post.user.username} </Text>
            {post.text}
          </Text>
        </View>
      ) : null}

      {/* コメント数 + 詳細へのリンク */}
      <TouchableOpacity
        className="px-3 pb-1"
        onPress={() => router.push(`/post/${post.id}`)}
      >
        {post.comments.length > 0 ? (
          <Text className="text-gray-400 text-xs">
            コメント {post.comments.length}件を見る
          </Text>
        ) : (
          <Text className="text-gray-600 text-xs">コメントする</Text>
        )}
      </TouchableOpacity>

      <Text className="text-xs text-gray-400 px-3 pb-3">{timeAgo(post.createdAt)}</Text>
    </View>
  );
}

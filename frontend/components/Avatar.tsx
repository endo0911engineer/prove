import { View, Text, Image } from "react-native";
import { getApiUrl } from "../api/client";

interface AvatarProps {
  username: string;
  avatarUrl?: string | null;
  size?: number;
}

function buildUrl(url: string) {
  return url.startsWith("http") ? url : `${getApiUrl()}${url}`;
}

export function Avatar({ username, avatarUrl, size = 40 }: AvatarProps) {
  const fontSize = size * 0.4;
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="bg-gray-800 items-center justify-center overflow-hidden"
    >
      {avatarUrl ? (
        <Image
          source={{ uri: buildUrl(avatarUrl) }}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      ) : (
        <Text style={{ fontSize, lineHeight: size }} className="font-black text-white">
          {username[0]?.toUpperCase() ?? "?"}
        </Text>
      )}
    </View>
  );
}

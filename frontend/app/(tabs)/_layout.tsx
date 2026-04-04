import { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCurrentUser } from "../../hooks/useCurrentUser";

export default function TabsLayout() {
  const { error } = useCurrentUser();
  useEffect(() => {
    if (error) router.replace("/(auth)/login");
  }, [error]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "#444",
        tabBarStyle: { borderTopWidth: 0.5, borderTopColor: "#222", backgroundColor: "#000" },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="index" options={{
        title: "ホーム",
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
        ),
      }} />
      <Tabs.Screen name="feed" options={{
        title: "フィード",
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? "newspaper" : "newspaper-outline"} size={22} color={color} />
        ),
      }} />
      <Tabs.Screen name="post" options={{
        title: "",
        tabBarIcon: ({ focused }) => (
          <Ionicons name="add-circle" size={42} color={focused ? "#111" : "#ccc"} />
        ),
      }} />
      <Tabs.Screen name="search" options={{
        title: "検索",
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? "search" : "search-outline"} size={22} color={color} />
        ),
      }} />
      <Tabs.Screen name="profile" options={{
        title: "マイページ",
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
        ),
      }} />
    </Tabs>
  );
}

import { FontAwesome } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useTheme } from "react-native-paper";

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
        },
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTitleStyle: { color: theme.colors.onSurface },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Catálogo",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="search" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="decks"
        options={{
          title: "Mis Mazos",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="id-card" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="simulator"
        options={{
          title: "Simulador",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="gamepad" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Historial",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="history" size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

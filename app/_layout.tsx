import { appPaperTheme } from "@/constants/paperTheme";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "SpaceMono-Regular": require("@/assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <PaperProvider theme={appPaperTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: appPaperTheme.colors.surface },
          headerTitleStyle: { color: appPaperTheme.colors.onSurface },
          headerTintColor: appPaperTheme.colors.primary,
          contentStyle: { backgroundColor: appPaperTheme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="details/[id]"
          options={{
            presentation: "modal",
            title: "Detalle de Carta",
          }}
        />
      </Stack>
    </PaperProvider>
  );
}

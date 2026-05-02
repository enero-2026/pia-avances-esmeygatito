import { StatusBar } from "expo-status-bar";
import { Platform, StyleSheet } from "react-native";
import { Surface, Text } from "react-native-paper";

import EmptyState from "@/components/ui/EmptyState";

export default function ModalScreen() {
  return (
    <Surface style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Modal
      </Text>
      <EmptyState
        title="Vista modal activa"
        description="Esta pantalla ya usa React Native Paper y mantiene el tema de tu aplicacion."
      />

      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff4dc",
  },
  title: {
    color: "#2f2208",
    fontWeight: "800",
    marginBottom: 12,
  },
});

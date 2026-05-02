import React from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";

interface LoaderProps {
  text?: string;
}

export default function Loader({ text = "Cargando..." }: LoaderProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text variant="bodyMedium" style={styles.text}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 10,
  },
  text: {
    color: "#5a4722",
  },
});

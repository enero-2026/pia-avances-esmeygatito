import React from "react";
import { StyleSheet, View } from "react-native";
import { Card, Icon, Text } from "react-native-paper";

interface EmptyStateProps {
  title: string;
  description?: string;
}

export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Card mode="elevated" style={styles.card}>
        <Card.Content>
          <View style={styles.iconWrap}>
            <Icon source="image-off-outline" size={24} color="#8a6a34" />
          </View>
          <Text variant="titleMedium" style={styles.title}>
            {title}
          </Text>
          {description ? (
            <Text variant="bodyMedium" style={styles.description}>
              {description}
            </Text>
          ) : null}
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
  },
  card: {
    backgroundColor: "#fff8e8",
    borderRadius: 14,
    shadowColor: "#2d1a00",
    shadowOpacity: 0.08,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  iconWrap: {
    alignItems: "center",
    marginBottom: 6,
  },
  title: {
    color: "#3b2a0a",
    textAlign: "center",
  },
  description: {
    marginTop: 6,
    color: "#7a5d2e",
    textAlign: "center",
  },
});

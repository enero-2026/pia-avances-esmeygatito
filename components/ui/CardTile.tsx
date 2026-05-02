import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Card, Text, useTheme } from "react-native-paper";

const CARD_MIN_HEIGHT = Platform.OS === "web" ? 292 : 238;

interface CardTileProps {
  name: string;
  imageUrl: string | null;
  onPress: () => void;
}

export default function CardTile({ name, imageUrl, onPress }: CardTileProps) {
  const theme = useTheme();
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [imageUrl]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <Card
        mode="elevated"
        style={[
          styles.paperCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: "#d8b75c",
          },
        ]}
      >
        <View style={styles.cardTopAccent} />

        <View style={styles.imageWrapper}>
          {imageUrl && !hasImageError ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              contentFit="contain"
              transition={120}
              onError={() => setHasImageError(true)}
            />
          ) : (
            <View style={styles.placeholder}>
              <Text variant="titleSmall" style={styles.placeholderText}>
                No imagen disponible
              </Text>
            </View>
          )}
        </View>
        <View
          style={[
            styles.nameBadge,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <Text numberOfLines={1} variant="titleSmall" style={styles.name}>
            {name}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: CARD_MIN_HEIGHT,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  paperCard: {
    minHeight: CARD_MIN_HEIGHT,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowColor: "#2a75bb",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardTopAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 7,
    backgroundColor: "#ef5350",
    zIndex: 2,
  },
  imageWrapper: {
    width: "100%",
    minHeight: CARD_MIN_HEIGHT,
    backgroundColor: "#fff5d5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Platform.OS === "web" ? 8 : 5,
    paddingVertical: Platform.OS === "web" ? 9 : 6,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#fff5d5",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#8a6a34",
  },
  nameBadge: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: Platform.OS === "web" ? 8 : 5,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: Platform.OS === "web" ? 8 : 6,
    paddingVertical: Platform.OS === "web" ? 5 : 4,
  },
  name: {
    color: "#2b1f08",
    textAlign: "center",
    letterSpacing: 0.2,
  },
});

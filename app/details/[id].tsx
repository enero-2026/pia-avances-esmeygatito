import Loader from "@/components/ui/Loader";
import { TCGService } from "@/services/tcgdexService";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Surface, Text } from "react-native-paper";

type DetailParams = {
  id?: string;
  name?: string;
  imageUrl?: string;
};

export default function CardDetailScreen() {
  const params = useLocalSearchParams<DetailParams>();

  const cardId = typeof params.id === "string" ? params.id : "";
  const imageFromRoute =
    typeof params.imageUrl === "string" && params.imageUrl.length > 0
      ? params.imageUrl
      : null;

  const [imageUrl, setImageUrl] = useState<string | null>(imageFromRoute);
  const [loading, setLoading] = useState(!imageFromRoute && !!cardId);

  useEffect(() => {
    let mounted = true;

    async function loadDetails() {
      if (!cardId) {
        return;
      }

      setLoading(true);
      const detail = await TCGService.getCardDetails(cardId);

      if (mounted && detail?.imageUrl) {
        setImageUrl(detail.imageUrl);
      }

      if (mounted) {
        setLoading(false);
      }
    }

    loadDetails();

    return () => {
      mounted = false;
    };
  }, [cardId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Loader text="Cargando detalle..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {imageUrl ? (
        <Surface mode="elevated" style={styles.imageFrame}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit="contain"
            transition={140}
          />
        </Surface>
      ) : (
        <Surface mode="flat" style={styles.placeholder}>
          <Text variant="titleSmall" style={styles.placeholderText}>
            Sin imagen disponible
          </Text>
        </Surface>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff4dc",
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff4dc",
  },
  imageFrame: {
    borderRadius: 18,
    backgroundColor: "#fff8e8",
    borderWidth: 1,
    borderColor: "#f0c35a",
    overflow: "hidden",
  },
  image: {
    minHeight: 360,
    width: "100%",
    backgroundColor: "#fdeec9",
  },
  placeholder: {
    minHeight: 360,
    width: "100%",
    borderRadius: 18,
    backgroundColor: "#fdeec9",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#8a6a34",
  },
});

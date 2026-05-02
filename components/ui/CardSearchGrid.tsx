import { PokemonCard } from "@/services/tcgdexService";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Card, IconButton, Text } from "react-native-paper";

const DEFAULT_MAX_PER_CARD = 4;

interface CardSearchGridProps {
  cards: PokemonCard[];
  initialQuantities?: Record<string, number>;
  maxPerCard?: number;
  onQuantityChange: (card: PokemonCard, quantity: number) => void;
}

function clampQuantity(value: number, maxPerCard: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(maxPerCard, Math.floor(value)));
}

export default function CardSearchGrid({
  cards,
  initialQuantities = {},
  maxPerCard = DEFAULT_MAX_PER_CARD,
  onQuantityChange,
}: CardSearchGridProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const normalizedInitialQuantities = useMemo(() => {
    const normalized: Record<string, number> = {};

    Object.entries(initialQuantities).forEach(([cardId, quantity]) => {
      normalized[cardId] = clampQuantity(quantity, maxPerCard);
    });

    return normalized;
  }, [initialQuantities, maxPerCard]);

  useEffect(() => {
    setQuantities((prev) => {
      const next: Record<string, number> = {};

      cards.forEach((card) => {
        const fromInitial = normalizedInitialQuantities[card.id];
        const fromPrev = prev[card.id];

        if (typeof fromInitial === "number") {
          next[card.id] = fromInitial;
          return;
        }

        if (typeof fromPrev === "number") {
          next[card.id] = clampQuantity(fromPrev, maxPerCard);
          return;
        }

        next[card.id] = 0;
      });

      return next;
    });
  }, [cards, normalizedInitialQuantities, maxPerCard]);

  function setCardQuantity(card: PokemonCard, nextValue: number) {
    const safeQuantity = clampQuantity(nextValue, maxPerCard);

    setQuantities((prev) => ({
      ...prev,
      [card.id]: safeQuantity,
    }));

    onQuantityChange(card, safeQuantity);
  }

  return (
    <FlatList
      data={cards}
      keyExtractor={(item) => item.id}
      numColumns={2}
      showsVerticalScrollIndicator
      keyboardShouldPersistTaps="always"
      contentContainerStyle={styles.listContent}
      columnWrapperStyle={styles.columnsRow}
      renderItem={({ item }) => {
        const quantity = quantities[item.id] ?? 0;
        const isMinusDisabled = quantity <= 0;
        const isPlusDisabled = quantity >= maxPerCard;

        return (
          <View style={styles.itemWrap}>
            <Card mode="elevated" style={styles.card}>
              <View style={styles.imageWrap}>
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.image}
                    contentFit="cover"
                    transition={120}
                  />
                ) : (
                  <View style={styles.imageFallback}>
                    <Text variant="labelSmall">No image</Text>
                  </View>
                )}
              </View>

              <Card.Content style={styles.cardContent}>
                <Text variant="labelLarge" numberOfLines={1}>
                  {item.name}
                </Text>

                <View style={styles.stepperRow}>
                  <IconButton
                    icon="minus"
                    mode="contained-tonal"
                    size={20}
                    disabled={isMinusDisabled}
                    onPress={() => setCardQuantity(item, quantity - 1)}
                    style={styles.stepperButton}
                  />

                  <View style={styles.quantityWrap}>
                    <Text variant="titleMedium">{quantity}</Text>
                  </View>

                  <IconButton
                    icon="plus"
                    mode="contained-tonal"
                    size={20}
                    disabled={isPlusDisabled}
                    onPress={() => setCardQuantity(item, quantity + 1)}
                    style={styles.stepperButton}
                  />
                </View>
              </Card.Content>
            </Card>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 2,
    paddingBottom: 10,
  },
  columnsRow: {
    justifyContent: "space-between",
    gap: 10,
  },
  itemWrap: {
    flex: 1,
    marginBottom: 10,
  },
  card: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#fffdf7",
    borderWidth: 1,
    borderColor: "#ecdca9",
  },
  imageWrap: {
    width: "100%",
    aspectRatio: 0.72,
    backgroundColor: "#f4ecd8",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 8,
    minHeight: 92,
  },
  stepperRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepperButton: {
    margin: 0,
    width: 44,
    height: 44,
  },
  quantityWrap: {
    minWidth: 34,
    alignItems: "center",
    justifyContent: "center",
  },
});

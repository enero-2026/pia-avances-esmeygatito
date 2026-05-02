import CardSearchGrid from "@/components/ui/CardSearchGrid";
import EmptyState from "@/components/ui/EmptyState";
import {
    buildDeckId,
    getSavedDecks,
    removeDeck,
    SavedDeck,
    upsertDeck,
} from "@/services/deckStorage";
import {
    DeckEntryInput,
    DeckFormat,
    DeckValidationResult,
    PokemonCard,
    TCGService,
} from "@/services/tcgdexService";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";
import {
    ActivityIndicator,
    Button,
    Chip,
    IconButton,
    Modal,
    Portal,
    Searchbar,
    SegmentedButtons,
    Snackbar,
    Surface,
    Text,
    TextInput,
    TouchableRipple,
} from "react-native-paper";

type DeckBuilderCard = {
  cardId: string;
  name: string;
  imageUrl: string | null;
  quantity: number;
};

const DEFAULT_FORMAT: DeckFormat = "casual";
const SEARCH_PAGE_SIZE = 50;
const DECK_SEARCH_SET_IDS = ["sv*", "me*", "b1*", "b2*"];
const ICON_PRESETS = ["⚡", "🔥", "💧", "🌿", "🧠", "🛡️", "👻", "⭐"];

const FORMAT_HELPERS: Record<DeckFormat, string> = {
  casual: "Casual: flexible para jugar sin reglas estrictas de torneo.",
  unlimited: "Unlimited: permite cartas de casi cualquier era.",
  expanded: "Expanded: formato oficial amplio (mas sets permitidos).",
  standard: "Standard: formato oficial actual con sets recientes.",
};

const FORMAT_OPTIONS: Array<{ value: DeckFormat; label: string }> = [
  { value: "casual", label: "Casual" },
  { value: "unlimited", label: "Unlimited" },
  { value: "expanded", label: "Expanded" },
  { value: "standard", label: "Standard" },
];

function normalizeDeckIcon(value: string): string {
  return value.trim().slice(0, 4);
}

function toBuilderCardsWithMeta(
  entries: DeckEntryInput[],
  cardMeta: Record<string, { name: string; imageUrl: string | null }>,
): DeckBuilderCard[] {
  return entries.map((entry) => {
    const meta = cardMeta[entry.cardId];

    return {
      cardId: entry.cardId,
      name: meta?.name ?? entry.cardId,
      imageUrl: meta?.imageUrl ?? null,
      quantity: entry.quantity,
    };
  });
}

function toDeckEntries(cards: DeckBuilderCard[]): DeckEntryInput[] {
  return cards
    .filter((card) => card.cardId.trim().length > 0 && card.quantity > 0)
    .map((card) => ({
      cardId: card.cardId,
      quantity: card.quantity,
    }));
}

function toCardMeta(cards: DeckBuilderCard[]): Record<
  string,
  {
    name: string;
    imageUrl: string | null;
  }
> {
  const meta: Record<string, { name: string; imageUrl: string | null }> = {};

  cards.forEach((card) => {
    const cardId = card.cardId.trim();
    const name = card.name.trim();

    if (!cardId || !name || card.quantity <= 0) {
      return;
    }

    meta[cardId] = {
      name,
      imageUrl: card.imageUrl,
    };
  });

  return meta;
}

function totalCards(entries: Array<{ quantity: number }>): number {
  return entries.reduce((sum, item) => sum + item.quantity, 0);
}

export default function DecksScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width <= 390;
  const isDesktopWide = width >= 1024;

  const [decks, setDecks] = useState<SavedDeck[]>([]);
  const [isLoadingDecks, setIsLoadingDecks] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [deckName, setDeckName] = useState("");
  const [deckIcon, setDeckIcon] = useState("");
  const [deckFormat, setDeckFormat] = useState<DeckFormat>(DEFAULT_FORMAT);
  const [builderCards, setBuilderCards] = useState<DeckBuilderCard[]>([]);

  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerResults, setPickerResults] = useState<PokemonCard[]>([]);
  const [isSearchingCards, setIsSearchingCards] = useState(false);

  const [validation, setValidation] = useState<DeckValidationResult | null>(
    null,
  );

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const normalizedEntries = useMemo(
    () => toDeckEntries(builderCards),
    [builderCards],
  );
  const cardsCount = useMemo(
    () => totalCards(normalizedEntries),
    [normalizedEntries],
  );

  useEffect(() => {
    setValidation(null);
  }, [builderCards, deckFormat]);

  function showSnackbar(message: string) {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  }

  async function refreshDecks() {
    setIsLoadingDecks(true);
    try {
      const allDecks = await getSavedDecks();
      setDecks(allDecks);
    } finally {
      setIsLoadingDecks(false);
    }
  }

  useEffect(() => {
    void refreshDecks();
  }, []);

  function clearForm() {
    setEditingDeckId(null);
    setDeckName("");
    setDeckIcon("");
    setDeckFormat(DEFAULT_FORMAT);
    setBuilderCards([]);
    setValidation(null);
  }

  function openCardPicker() {
    setPickerQuery("");
    setPickerResults([]);
    setIsPickerVisible(true);
  }

  function closeCardPicker() {
    setIsPickerVisible(false);
    setPickerQuery("");
    setPickerResults([]);
  }

  useEffect(() => {
    if (!isPickerVisible) {
      return;
    }

    const query = pickerQuery.trim();
    if (query.length < 2) {
      setPickerResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      void (async () => {
        setIsSearchingCards(true);
        try {
          const response = await TCGService.getCards(
            1,
            SEARCH_PAGE_SIZE,
            DECK_SEARCH_SET_IDS,
            [],
            "all",
            query,
          );
          setPickerResults(response.data);
        } finally {
          setIsSearchingCards(false);
        }
      })();
    }, 260);

    return () => clearTimeout(timeout);
  }, [isPickerVisible, pickerQuery]);

  function setCardQuantityFromPicker(card: PokemonCard, quantity: number) {
    const safeQuantity = Math.max(0, Math.min(4, Math.floor(quantity)));

    setBuilderCards((prev) => {
      const existing = prev.find((item) => item.cardId === card.id);

      if (safeQuantity <= 0) {
        return prev.filter((item) => item.cardId !== card.id);
      }

      if (existing) {
        return prev.map((item) =>
          item.cardId === card.id
            ? {
                ...item,
                name: card.name,
                imageUrl: card.imageUrl,
                quantity: safeQuantity,
              }
            : item,
        );
      }

      return [
        ...prev,
        {
          cardId: card.id,
          name: card.name,
          imageUrl: card.imageUrl,
          quantity: safeQuantity,
        },
      ];
    });
  }

  function changeCardQuantity(cardId: string, delta: number) {
    setBuilderCards((prev) =>
      prev
        .map((card) =>
          card.cardId === cardId
            ? { ...card, quantity: Math.max(0, card.quantity + delta) }
            : card,
        )
        .filter((card) => card.quantity > 0),
    );
  }

  function removeCardFromDeck(cardId: string) {
    setBuilderCards((prev) => prev.filter((card) => card.cardId !== cardId));
  }

  const pickerInitialQuantities = useMemo(() => {
    const quantities: Record<string, number> = {};

    builderCards.forEach((card) => {
      quantities[card.cardId] = Math.max(0, Math.min(4, card.quantity));
    });

    return quantities;
  }, [builderCards]);

  async function runValidation() {
    if (builderCards.length === 0) {
      showSnackbar("Agrega cartas al mazo antes de validar");
      return;
    }

    setIsValidating(true);
    try {
      const result = await TCGService.validateDeck(
        normalizedEntries,
        deckFormat,
      );
      setValidation(result);
      showSnackbar(result.isValid ? "Mazo valido" : "Mazo con observaciones");
    } finally {
      setIsValidating(false);
    }
  }

  async function saveDeck() {
    const trimmedName = deckName.trim();
    if (!trimmedName) {
      showSnackbar("Escribe un nombre para el mazo");
      return;
    }

    if (normalizedEntries.length === 0) {
      showSnackbar("Agrega cartas para guardar el mazo");
      return;
    }

    setIsSaving(true);
    try {
      const validationResult = await TCGService.validateDeck(
        normalizedEntries,
        deckFormat,
      );
      setValidation(validationResult);

      if (!validationResult.isValid) {
        showSnackbar("No se puede guardar: corrige los errores del mazo");
        return;
      }

      const deckToSave: SavedDeck = {
        id: editingDeckId ?? buildDeckId(),
        name: trimmedName,
        icon: normalizeDeckIcon(deckIcon),
        format: deckFormat,
        entries: normalizedEntries,
        cardMeta: toCardMeta(builderCards),
        updatedAt: new Date().toISOString(),
      };

      const updated = await upsertDeck(deckToSave);
      setDecks(updated);
      showSnackbar("Mazo guardado");
    } finally {
      setIsSaving(false);
    }
  }

  function editDeck(deck: SavedDeck) {
    setEditingDeckId(deck.id);
    setDeckName(deck.name);
    setDeckIcon(deck.icon ?? "");
    setDeckFormat(deck.format);
    setBuilderCards(toBuilderCardsWithMeta(deck.entries, deck.cardMeta ?? {}));
    setValidation(null);
  }

  async function deleteDeck(deckId: string) {
    const updated = await removeDeck(deckId);
    setDecks(updated);

    if (editingDeckId === deckId) {
      clearForm();
    }

    showSnackbar("Mazo eliminado");
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.containerContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        <View
          style={[
            styles.contentWrap,
            isDesktopWide && styles.contentWrapDesktop,
          ]}
        >
          <Text variant="headlineSmall" style={styles.title}>
            Mis Mazos
          </Text>

          <Surface
            mode="elevated"
            style={[styles.formCard, isCompact && styles.formCardCompact]}
          >
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {editingDeckId ? "Editar mazo" : "Crear mazo"}
            </Text>

            <TextInput
              mode="outlined"
              label="Nombre del mazo"
              value={deckName}
              onChangeText={setDeckName}
              style={styles.field}
            />

            <View style={styles.iconRow}>
              <TextInput
                mode="outlined"
                label="Icono (emoji opcional)"
                value={deckIcon}
                onChangeText={(value) => setDeckIcon(normalizeDeckIcon(value))}
                style={styles.iconInput}
                placeholder="⚡"
              />
              <Surface mode="flat" style={styles.iconPreview}>
                <Text variant="headlineSmall">{deckIcon || "🗂️"}</Text>
              </Surface>
            </View>

            <View style={styles.iconChipsContent}>
              {ICON_PRESETS.map((icon) => (
                <Chip
                  key={icon}
                  compact
                  selected={deckIcon === icon}
                  onPress={() => setDeckIcon(icon)}
                  style={styles.iconChip}
                >
                  {icon}
                </Chip>
              ))}
            </View>

            {isCompact ? (
              <View style={styles.formatGrid}>
                {FORMAT_OPTIONS.map((option) => (
                  <TouchableRipple
                    key={option.value}
                    onPress={() => setDeckFormat(option.value)}
                    style={[
                      styles.formatOption,
                      deckFormat === option.value &&
                        styles.formatOptionSelected,
                    ]}
                    borderless
                  >
                    <Text
                      variant="labelLarge"
                      style={[
                        styles.formatOptionText,
                        deckFormat === option.value &&
                          styles.formatOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableRipple>
                ))}
              </View>
            ) : (
              <SegmentedButtons
                value={deckFormat}
                onValueChange={(value) => setDeckFormat(value as DeckFormat)}
                buttons={FORMAT_OPTIONS}
                style={styles.segmented}
              />
            )}

            <Text variant="bodySmall" style={styles.formatHelperText}>
              {FORMAT_HELPERS[deckFormat]}
            </Text>

            <View style={styles.entriesHeaderRow}>
              <Text variant="labelLarge" style={styles.sectionLabel}>
                Cartas del mazo ({cardsCount}/60)
              </Text>
              <Button
                mode="contained-tonal"
                onPress={openCardPicker}
                compact
                style={styles.addCardButton}
              >
                Buscar y agregar
              </Button>
            </View>

            {builderCards.length === 0 ? (
              <Surface mode="flat" style={styles.emptyDeckCallout}>
                <Text variant="bodyMedium" style={styles.emptyDeckText}>
                  Aun no agregas cartas. Usa "Buscar y agregar" para armar tu
                  mazo por nombre e imagen.
                </Text>
              </Surface>
            ) : (
              <ScrollView
                style={[
                  styles.entriesScroll,
                  isCompact && styles.entriesScrollCompact,
                ]}
                contentContainerStyle={styles.entriesContent}
                showsVerticalScrollIndicator
              >
                {builderCards.map((card) => (
                  <Surface
                    key={card.cardId}
                    mode="flat"
                    style={[
                      styles.builderCardRow,
                      isCompact && styles.builderCardRowCompact,
                    ]}
                  >
                    <View style={styles.builderThumbWrap}>
                      {card.imageUrl ? (
                        <Image
                          source={{ uri: card.imageUrl }}
                          style={styles.builderThumb}
                          contentFit="cover"
                          transition={120}
                        />
                      ) : (
                        <View style={styles.builderThumbFallback}>
                          <Text variant="labelSmall">TCG</Text>
                        </View>
                      )}
                    </View>

                    <View
                      style={[
                        styles.builderContentWrap,
                        isCompact && styles.builderContentWrapCompact,
                      ]}
                    >
                      <View style={styles.builderMetaWrap}>
                        <Text
                          variant="titleSmall"
                          numberOfLines={1}
                          style={styles.builderName}
                        >
                          {card.name}
                        </Text>
                        <Text
                          variant="labelSmall"
                          numberOfLines={1}
                          style={styles.builderId}
                        >
                          {card.cardId}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.builderQtyControls,
                          isCompact && styles.builderQtyControlsCompact,
                        ]}
                      >
                        <IconButton
                          icon="minus"
                          size={18}
                          onPress={() => changeCardQuantity(card.cardId, -1)}
                        />
                        <Chip compact style={styles.qtyChip}>
                          {card.quantity}
                        </Chip>
                        <IconButton
                          icon="plus"
                          size={18}
                          onPress={() => changeCardQuantity(card.cardId, 1)}
                        />
                        <IconButton
                          icon="delete-outline"
                          size={18}
                          onPress={() => removeCardFromDeck(card.cardId)}
                        />
                      </View>
                    </View>
                  </Surface>
                ))}
              </ScrollView>
            )}

            <View style={styles.actionsRow}>
              <Button
                mode="text"
                onPress={clearForm}
                style={styles.actionButton}
              >
                Limpiar
              </Button>
              <Button
                mode="outlined"
                onPress={() => void runValidation()}
                loading={isValidating}
                style={styles.actionButton}
              >
                Validar
              </Button>
              <Button
                mode="contained"
                onPress={() => void saveDeck()}
                loading={isSaving}
                disabled={isSaving || isValidating}
                style={styles.actionButton}
              >
                Guardar
              </Button>
            </View>

            {validation ? (
              <Surface mode="flat" style={styles.validationCard}>
                <Text variant="titleSmall" style={styles.validationTitle}>
                  {validation.isValid
                    ? "Estado: Valido"
                    : "Estado: Con errores"}
                </Text>
                <Text variant="bodySmall" style={styles.validationSummary}>
                  Total cartas: {validation.summary.totalCards} | Pokemon
                  basicos: {validation.summary.pokemon.basic}
                </Text>
                {validation.issues.slice(0, 4).map((issue, index) => (
                  <Text
                    key={`${issue.code}_${index}`}
                    variant="bodySmall"
                    style={styles.issueText}
                  >
                    - [{issue.code}] {issue.message}
                  </Text>
                ))}
                {validation.issues.length > 4 ? (
                  <Text variant="bodySmall" style={styles.moreIssuesText}>
                    +{validation.issues.length - 4} observaciones mas
                  </Text>
                ) : null}
              </Surface>
            ) : null}
          </Surface>

          <View style={styles.listHeaderRow}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Mazos guardados
            </Text>
            <Chip compact>{decks.length}</Chip>
          </View>

          {isLoadingDecks ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator color="#ef5350" />
            </View>
          ) : decks.length === 0 ? (
            <EmptyState
              title="Aun no tienes mazos"
              description="Crea tu primer mazo y guardalo en esta pantalla."
            />
          ) : (
            <View style={styles.deckListContent}>
              {decks.map((deck) => (
                <Surface key={deck.id} mode="flat" style={styles.deckCard}>
                  <Text variant="titleSmall" style={styles.deckName}>
                    {(deck.icon || "🗂️") + " " + deck.name}
                  </Text>
                  <Text variant="bodySmall" style={styles.deckMeta}>
                    {deck.format.toUpperCase()} | {totalCards(deck.entries)}{" "}
                    cartas
                  </Text>
                  <View style={styles.deckActionsRow}>
                    <Button compact mode="text" onPress={() => editDeck(deck)}>
                      Editar
                    </Button>
                    <Button
                      compact
                      mode="text"
                      onPress={() => void deleteDeck(deck.id)}
                    >
                      Eliminar
                    </Button>
                  </View>
                </Surface>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2400}
      >
        {snackbarMessage}
      </Snackbar>

      <Portal>
        <Modal
          visible={isPickerVisible}
          onDismiss={closeCardPicker}
          contentContainerStyle={[
            styles.pickerModalContainer,
            isCompact && styles.pickerModalContainerCompact,
          ]}
          theme={{ colors: { backdrop: "rgba(18, 12, 3, 0.56)" } }}
        >
          <Surface
            mode="elevated"
            style={[
              styles.pickerSurface,
              isCompact && styles.pickerSurfaceCompact,
            ]}
          >
            <View style={styles.pickerHeaderRow}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Buscar cartas
              </Text>
              <IconButton icon="close" onPress={closeCardPicker} />
            </View>

            <Searchbar
              placeholder="Busca por nombre (ej. Pikachu)"
              value={pickerQuery}
              onChangeText={setPickerQuery}
              style={styles.pickerSearchbar}
            />

            {isSearchingCards ? (
              <View style={styles.searchingWrap}>
                <ActivityIndicator color="#ef5350" />
              </View>
            ) : pickerQuery.trim().length < 2 ? (
              <Text variant="bodySmall" style={styles.searchHintText}>
                Escribe al menos 2 letras para buscar cartas.
              </Text>
            ) : pickerResults.length === 0 ? (
              <Text variant="bodySmall" style={styles.searchHintText}>
                No se encontraron cartas para tu busqueda.
              </Text>
            ) : (
              <View
                style={[
                  styles.searchResultsWrap,
                  isCompact && styles.searchResultsWrapCompact,
                ]}
              >
                <CardSearchGrid
                  cards={pickerResults}
                  initialQuantities={pickerInitialQuantities}
                  onQuantityChange={setCardQuantityFromPicker}
                />
              </View>
            )}
          </Surface>
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff7e6",
  },
  containerContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 120,
    alignItems: "center",
  },
  contentWrap: {
    width: "100%",
    maxWidth: 620,
  },
  contentWrapDesktop: {
    maxWidth: 1240,
  },
  title: {
    color: "#2b1f08",
    fontWeight: "800",
    marginBottom: 10,
  },
  formCard: {
    backgroundColor: "#fffdf7",
    borderColor: "#ecdca9",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  formCardCompact: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  sectionTitle: {
    color: "#2b1f08",
    fontWeight: "700",
    marginBottom: 8,
  },
  field: {
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  iconInput: {
    flex: 1,
    backgroundColor: "#fff",
  },
  iconPreview: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ecdca9",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fffdf7",
  },
  iconChipsContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  iconChip: {
    marginRight: 0,
  },
  segmented: {
    marginBottom: 10,
    width: "100%",
    maxWidth: 460,
  },
  formatGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  formatOption: {
    width: "48%",
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d8b75c",
    backgroundColor: "#fffdf7",
    alignItems: "center",
    justifyContent: "center",
  },
  formatOptionSelected: {
    backgroundColor: "#cfe3f7",
    borderColor: "#9bbedd",
  },
  formatOptionText: {
    color: "#4b3b1d",
    fontWeight: "700",
  },
  formatOptionTextSelected: {
    color: "#22466d",
  },
  formatHelperText: {
    color: "#5a4722",
    marginTop: -2,
    marginBottom: 8,
  },
  entriesHeaderRow: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 8,
  },
  addCardButton: {
    alignSelf: "flex-start",
  },
  sectionLabel: {
    color: "#5a4722",
    fontWeight: "700",
  },
  entriesScroll: {
    maxHeight: 220,
  },
  entriesScrollCompact: {
    maxHeight: 260,
  },
  emptyDeckCallout: {
    backgroundColor: "#fff3cf",
    borderWidth: 1,
    borderColor: "#ecdca9",
    borderRadius: 12,
    padding: 10,
  },
  emptyDeckText: {
    color: "#5a4722",
  },
  entriesContent: {
    gap: 8,
    paddingBottom: 4,
  },
  builderCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    borderRadius: 10,
    backgroundColor: "#fff7e6",
    borderWidth: 1,
    borderColor: "#ecdca9",
  },
  builderCardRowCompact: {
    alignItems: "flex-start",
  },
  builderThumbWrap: {
    width: 52,
    height: 70,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f4ecd8",
  },
  builderThumb: {
    width: "100%",
    height: "100%",
  },
  builderThumbFallback: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  builderContentWrap: {
    flex: 1,
    minWidth: 0,
  },
  builderContentWrapCompact: {
    minHeight: 74,
  },
  builderMetaWrap: {
    minWidth: 0,
  },
  builderName: {
    color: "#2b1f08",
  },
  builderId: {
    color: "#5a4722",
  },
  builderQtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    justifyContent: "flex-end",
  },
  builderQtyControlsCompact: {
    marginTop: 2,
  },
  qtyChip: {
    backgroundColor: "#fffdf7",
  },
  actionsRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  validationCard: {
    marginTop: 10,
    backgroundColor: "#fef3cf",
    borderColor: "#d8b75c",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  validationTitle: {
    color: "#3b2a0a",
    fontWeight: "700",
    marginBottom: 4,
  },
  validationSummary: {
    color: "#5a4722",
    marginBottom: 6,
  },
  issueText: {
    color: "#7a3f11",
  },
  moreIssuesText: {
    color: "#5a4722",
    marginTop: 4,
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  loaderWrap: {
    paddingVertical: 16,
    alignItems: "center",
  },
  deckListContent: {
    gap: 8,
    paddingBottom: 14,
  },
  deckCard: {
    backgroundColor: "#fffdf7",
    borderWidth: 1,
    borderColor: "#ecdca9",
    borderRadius: 12,
    padding: 10,
  },
  deckName: {
    color: "#2b1f08",
    fontWeight: "700",
  },
  deckMeta: {
    color: "#5a4722",
    marginTop: 2,
  },
  deckActionsRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,
  },
  pickerModalContainer: {
    marginHorizontal: 12,
    borderRadius: 16,
    maxHeight: "84%",
  },
  pickerModalContainerCompact: {
    marginHorizontal: 8,
    maxHeight: "92%",
  },
  pickerSurface: {
    borderRadius: 16,
    backgroundColor: "#fffdf7",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#ecdca9",
    minHeight: 320,
    maxHeight: "100%",
  },
  pickerSurfaceCompact: {
    minHeight: 360,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  pickerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerSearchbar: {
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  searchingWrap: {
    paddingVertical: 18,
    alignItems: "center",
  },
  searchHintText: {
    color: "#5a4722",
    marginTop: 6,
  },
  searchResultsWrap: {
    maxHeight: 430,
  },
  searchResultsWrapCompact: {
    maxHeight: 520,
  },
});

import CardTile from "@/components/ui/CardTile";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";
import {
    FriendlyFilterOption,
    PokemonCard,
    TCGService,
} from "@/services/tcgdexService";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Easing,
    FlatList,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
    useWindowDimensions,
} from "react-native";
import {
    ActivityIndicator,
    Badge,
    Button,
    Checkbox,
    Chip,
    Divider,
    IconButton,
    List,
    Menu,
    Modal,
    Portal,
    Searchbar,
    SegmentedButtons,
    Snackbar,
    Surface,
    Text,
} from "react-native-paper";

const PAGE_SIZE = 50;
const DEFAULT_SET_IDS = ["sv*", "me*", "b1*", "b2*"];
const SET_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "sv*", label: "Scarlet & Violet (bloque completo)" },
  { value: "me*", label: "Mega Evolution (serie ME)" },
  { value: "b1*", label: "Mega Evolution (bloque B1*)" },
  { value: "b2*", label: "Mega Evolution (bloque B2*)" },
];
const IS_WEB = Platform.OS === "web";
const GRID_GAP = IS_WEB ? 10 : 8;
const FILTERS_ANALYSIS_LIMIT = 0;
const HEADER_SCROLL_THRESHOLD = 24;
const CONTROL_HEIGHT = IS_WEB ? 42 : 38;
const ANIM_DURATION_FAST = 160;
const ANIM_DURATION_MEDIUM = 200;

type SortKey = "name_asc" | "name_desc";

function isUiTagValue(tagValue: string): boolean {
  return (
    !tagValue.startsWith("SET_") &&
    !tagValue.startsWith("TYPE_") &&
    !tagValue.startsWith("RARITY_")
  );
}

function toTypeTagValue(value: string): string {
  return `TYPE_${value.toUpperCase().trim()}`;
}

function toRarityTagValue(value: string): string {
  return `RARITY_${value.toUpperCase().trim().replace(/\s+/g, "_")}`;
}

function resolveColumns(width: number) {
  if (Platform.OS === "web") {
    if (width >= 1200) {
      return 4;
    }
    if (width >= 840) {
      return 3;
    }
  }

  return 2;
}

export default function CatalogScreen() {
  const { width } = useWindowDimensions();

  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedSetIds, setSelectedSetIds] =
    useState<string[]>(DEFAULT_SET_IDS);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagMode, setTagMode] = useState<"all" | "any">("all");
  const [sortBy, setSortBy] = useState<SortKey>("name_asc");

  const [tagOptions, setTagOptions] = useState<FriendlyFilterOption[]>([]);
  const [typeOptions, setTypeOptions] = useState<FriendlyFilterOption[]>([]);
  const [rarityOptions, setRarityOptions] = useState<FriendlyFilterOption[]>(
    [],
  );
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [isFiltersModalVisible, setIsFiltersModalVisible] = useState(false);
  const [isFiltersSheetMounted, setIsFiltersSheetMounted] = useState(false);
  const [isSortMenuVisible, setIsSortMenuVisible] = useState(false);
  const [expandedFilterSection, setExpandedFilterSection] = useState<
    "types" | "rarities" | "tags" | null
  >("types");

  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [detailCardName, setDetailCardName] = useState("");
  const [detailImageUrl, setDetailImageUrl] = useState<string | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [draftSetIds, setDraftSetIds] = useState<string[]>(DEFAULT_SET_IDS);
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [draftTagMode, setDraftTagMode] = useState<"all" | "any">("all");

  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarCanUndo, setSnackbarCanUndo] = useState(false);

  const isFetchingMoreRef = useRef(false);
  const endReachedLockRef = useRef(false);
  const isTitleHiddenRef = useRef(false);
  const queryRequestIdRef = useRef(0);
  const filtersRequestIdRef = useRef(0);
  const sheetAnimRef = useRef(new Animated.Value(0));
  const titleAnimRef = useRef(new Animated.Value(1));
  const quickBarAnimRef = useRef(new Animated.Value(1));
  const listAnimRef = useRef(new Animated.Value(1));
  const lastFiltersSnapshotRef = useRef<{
    selectedSetIds: string[];
    selectedTags: string[];
    tagMode: "all" | "any";
    sortBy: SortKey;
    draftSetIds: string[];
    draftTags: string[];
    draftTagMode: "all" | "any";
  } | null>(null);

  const numColumns = resolveColumns(width);
  const shouldUseCompactQuickActions =
    isHeaderCompact || (!IS_WEB && width <= 390);
  const visibleTagOptions = useMemo(
    () => tagOptions.filter((tag) => isUiTagValue(tag.value)),
    [tagOptions],
  );
  const visibleTypeOptions = useMemo(() => typeOptions, [typeOptions]);
  const visibleRarityOptions = useMemo(() => rarityOptions, [rarityOptions]);

  const sortedCards = useMemo(() => {
    const sorted = [...cards].sort((a, b) =>
      a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
    );

    return sortBy === "name_desc" ? sorted.reverse() : sorted;
  }, [cards, sortBy]);

  const activeFiltersCount = useMemo(() => {
    const nonDefaultSets = selectedSetIds.filter(
      (setId) => !DEFAULT_SET_IDS.includes(setId),
    ).length;

    return nonDefaultSets + selectedTags.length;
  }, [selectedSetIds, selectedTags]);

  const summaryLabel = useMemo(() => {
    const expansionsCount = selectedSetIds.length;
    const tagsCount = selectedTags.length;
    const modeLabel = tagMode === "all" ? "todas" : "alguna";

    if (expansionsCount <= DEFAULT_SET_IDS.length && tagsCount === 0) {
      return !IS_WEB ? "Sin filtros" : "Sin filtros activos";
    }

    if (tagsCount === 0) {
      return !IS_WEB
        ? `${expansionsCount} exp. activas`
        : `${expansionsCount} expansiones activas`;
    }

    if (tagsCount === 1) {
      return !IS_WEB
        ? `1 tag · ${modeLabel}`
        : `1 tag activa · ${tagMode === "all" ? "estricto" : "flexible"}`;
    }

    return !IS_WEB
      ? `${tagsCount} tags · ${modeLabel}`
      : `${tagsCount} tags activas · ${tagMode === "all" ? "estricto" : "flexible"}`;
  }, [selectedSetIds.length, selectedTags.length, tagMode]);

  function showSnackbar(message: string, canUndo = false) {
    setSnackbarMessage(message);
    setSnackbarCanUndo(canUndo);
    setSnackbarVisible(true);
  }

  function restoreLastFiltersSnapshot() {
    const snapshot = lastFiltersSnapshotRef.current;
    if (!snapshot) {
      return;
    }

    setSelectedSetIds(snapshot.selectedSetIds);
    setSelectedTags(snapshot.selectedTags);
    setTagMode(snapshot.tagMode);
    setSortBy(snapshot.sortBy);

    setDraftSetIds(snapshot.draftSetIds);
    setDraftTags(snapshot.draftTags);
    setDraftTagMode(snapshot.draftTagMode);

    setSnackbarVisible(false);
    setSnackbarCanUndo(false);
    showSnackbar("Se deshizo el restablecimiento");
  }

  async function openCardDetailModal(card: PokemonCard) {
    setDetailCardName(card.name);
    setDetailImageUrl(card.imageUrl);
    setIsDetailModalVisible(true);

    if (!card.id) {
      return;
    }

    setIsLoadingDetail(true);

    try {
      const detail = await TCGService.getCardDetails(card.id);
      if (detail?.imageUrl) {
        setDetailImageUrl(detail.imageUrl);
      }
    } catch {
      showSnackbar("No se pudo cargar el detalle de la carta");
    } finally {
      setIsLoadingDetail(false);
    }
  }

  function closeCardDetailModal() {
    setIsDetailModalVisible(false);
    setIsLoadingDetail(false);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchQuery(searchTerm);
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    void loadInitialCards(searchQuery, selectedSetIds, selectedTags, tagMode);
  }, [searchQuery, selectedSetIds, selectedTags, tagMode]);

  useEffect(() => {
    void syncFilterOptionsForSelectedSets(selectedSetIds);
  }, [selectedSetIds]);

  function buildAllowedFilterValues(
    types: FriendlyFilterOption[],
    rarities: FriendlyFilterOption[],
    tags: FriendlyFilterOption[],
  ): Set<string> {
    const typeValues = types.map((option) => toTypeTagValue(option.value));
    const rarityValues = rarities.map((option) =>
      toRarityTagValue(option.value),
    );
    const tagValues = tags
      .map((option) => option.value)
      .filter((value) => isUiTagValue(value));

    return new Set([...typeValues, ...rarityValues, ...tagValues]);
  }

  async function loadFilterOptions(setIds: string[]): Promise<{
    types: FriendlyFilterOption[];
    rarities: FriendlyFilterOption[];
    tags: FriendlyFilterOption[];
  }> {
    const requestId = ++filtersRequestIdRef.current;
    setIsLoadingFilters(true);

    try {
      const filters = await TCGService.getCardFilters(
        setIds,
        FILTERS_ANALYSIS_LIMIT,
      );

      if (requestId !== filtersRequestIdRef.current) {
        return {
          types: [],
          rarities: [],
          tags: [],
        };
      }

      setTypeOptions(filters.types);
      setRarityOptions(filters.rarities);
      setTagOptions(filters.tags);
      return {
        types: filters.types,
        rarities: filters.rarities,
        tags: filters.tags,
      };
    } finally {
      if (requestId === filtersRequestIdRef.current) {
        setIsLoadingFilters(false);
      }
    }
  }

  async function syncFilterOptionsForSelectedSets(setIds: string[]) {
    const options = await loadFilterOptions(setIds);
    const validTags = buildAllowedFilterValues(
      options.types,
      options.rarities,
      options.tags,
    );
    setSelectedTags((prev) => prev.filter((tag) => validTags.has(tag)));
  }

  async function loadInitialCards(
    currentQuery = "",
    setIds: string[] = selectedSetIds,
    tags: string[] = selectedTags,
    mode: "all" | "any" = tagMode,
  ) {
    const requestId = ++queryRequestIdRef.current;
    isTitleHiddenRef.current = false;
    setIsHeaderCompact(false);
    listAnimRef.current.setValue(0);
    Animated.timing(titleAnimRef.current, {
      toValue: 1,
      duration: ANIM_DURATION_FAST,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    Animated.timing(quickBarAnimRef.current, {
      toValue: 1,
      duration: ANIM_DURATION_FAST,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    setIsLoadingInitial(true);
    isFetchingMoreRef.current = false;
    endReachedLockRef.current = false;

    try {
      const firstPageResponse = await TCGService.getCards(
        1,
        PAGE_SIZE,
        setIds,
        tags,
        mode,
        currentQuery,
      );

      if (requestId !== queryRequestIdRef.current) {
        return;
      }

      setCards(firstPageResponse.data);
      setPage(firstPageResponse.page);
      setTotalResults(firstPageResponse.total);
      setHasMore(firstPageResponse.page < firstPageResponse.totalPages);
      Animated.timing(listAnimRef.current, {
        toValue: 1,
        duration: ANIM_DURATION_MEDIUM,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } finally {
      if (requestId === queryRequestIdRef.current) {
        setIsLoadingInitial(false);
      }
    }
  }

  async function loadMoreCards() {
    if (isLoadingInitial || isFetchingMoreRef.current || !hasMore) {
      return;
    }

    const queryRequestIdAtStart = queryRequestIdRef.current;
    const currentSetIds = [...selectedSetIds];
    const currentTags = [...selectedTags];
    const currentTagMode = tagMode;
    const currentSearch = searchQuery;

    isFetchingMoreRef.current = true;
    const nextPage = page + 1;
    setIsLoadingMore(true);

    try {
      const nextPageResponse = await TCGService.getCards(
        nextPage,
        PAGE_SIZE,
        currentSetIds,
        currentTags,
        currentTagMode,
        currentSearch,
      );

      // Ignore stale pagination responses if filters/search changed mid-request.
      if (queryRequestIdAtStart !== queryRequestIdRef.current) {
        return;
      }

      setCards((prev) => {
        const known = new Set(prev.map((card) => card.id));
        const unique = nextPageResponse.data.filter(
          (card) => !known.has(card.id),
        );
        return [...prev, ...unique];
      });

      setPage(nextPageResponse.page);
      setTotalResults(nextPageResponse.total);
      setHasMore(nextPageResponse.page < nextPageResponse.totalPages);
    } finally {
      isFetchingMoreRef.current = false;
      setIsLoadingMore(false);
      setTimeout(() => {
        endReachedLockRef.current = false;
      }, 120);
    }
  }

  function handleEndReached() {
    if (endReachedLockRef.current) {
      return;
    }

    endReachedLockRef.current = true;
    void loadMoreCards();
  }

  function handleCatalogScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const offsetY = event.nativeEvent.contentOffset.y;
    const shouldHide = offsetY > HEADER_SCROLL_THRESHOLD;

    if (shouldHide === isTitleHiddenRef.current) {
      return;
    }

    isTitleHiddenRef.current = shouldHide;
    setIsHeaderCompact(shouldHide);
    Animated.timing(titleAnimRef.current, {
      toValue: shouldHide ? 0 : 1,
      duration: ANIM_DURATION_FAST,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    Animated.timing(quickBarAnimRef.current, {
      toValue: shouldHide ? 0 : 1,
      duration: ANIM_DURATION_FAST,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }

  function toggleDraftTag(value: string) {
    setDraftTags((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  }

  async function toggleDraftSet(value: string) {
    let nextSetIds: string[] = [];

    setDraftSetIds((prev) => {
      const exists = prev.includes(value);

      if (exists) {
        nextSetIds =
          prev.length === 1 ? prev : prev.filter((item) => item !== value);
      } else {
        nextSetIds = [...prev, value];
      }

      return nextSetIds;
    });

    const options = await loadFilterOptions(nextSetIds);
    const validTags = buildAllowedFilterValues(
      options.types,
      options.rarities,
      options.tags,
    );
    setDraftTags((prev) => prev.filter((tag) => validTags.has(tag)));
  }

  function openFiltersModal() {
    setDraftSetIds(selectedSetIds);
    setDraftTags(selectedTags);
    setDraftTagMode(tagMode);
    setIsFiltersSheetMounted(true);
    setIsFiltersModalVisible(true);

    Animated.timing(sheetAnimRef.current, {
      toValue: 1,
      duration: ANIM_DURATION_MEDIUM,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  function closeFiltersModal() {
    Animated.timing(sheetAnimRef.current, {
      toValue: 0,
      duration: ANIM_DURATION_FAST,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsFiltersModalVisible(false);
      setIsFiltersSheetMounted(false);
    });
  }

  function applyFiltersFromDraft() {
    setSelectedSetIds(draftSetIds);
    setSelectedTags(draftTags);
    setTagMode(draftTagMode);
    const tagsCount = draftTags.length;
    const expansionsCount = draftSetIds.length;
    if (tagsCount > 0 || expansionsCount > DEFAULT_SET_IDS.length) {
      showSnackbar(
        `Filtros aplicados: ${expansionsCount} expansiones, ${tagsCount} tags`,
      );
    } else {
      showSnackbar("Catalogo restablecido");
    }
    closeFiltersModal();
  }

  async function clearDraftFilters() {
    setDraftSetIds(DEFAULT_SET_IDS);
    setDraftTags([]);
    setDraftTagMode("all");
    const options = await loadFilterOptions(DEFAULT_SET_IDS);
    const validTags = buildAllowedFilterValues(
      options.types,
      options.rarities,
      options.tags,
    );
    setDraftTags((prev) => prev.filter((tag) => validTags.has(tag)));
  }

  function clearFilters() {
    lastFiltersSnapshotRef.current = {
      selectedSetIds: [...selectedSetIds],
      selectedTags: [...selectedTags],
      tagMode,
      sortBy,
      draftSetIds: [...draftSetIds],
      draftTags: [...draftTags],
      draftTagMode,
    };

    setSelectedSetIds(DEFAULT_SET_IDS);
    setSelectedTags([]);
    setTagMode("all");
    setSortBy("name_asc");

    setDraftSetIds(DEFAULT_SET_IDS);
    setDraftTags([]);
    setDraftTagMode("all");
    showSnackbar("Filtros restablecidos", true);
  }

  const showNoCards =
    !isLoadingInitial && cards.length === 0 && !searchQuery.trim();
  const showNoResults =
    !isLoadingInitial && cards.length === 0 && !!searchQuery.trim();

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.bgOrbBlue} />
      <View pointerEvents="none" style={styles.bgOrbYellow} />

      <Animated.View
        style={[
          styles.titleWrap,
          {
            opacity: titleAnimRef.current,
            maxHeight: titleAnimRef.current.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 56],
            }),
            marginBottom: titleAnimRef.current.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 6],
            }),
            transform: [
              {
                translateY: titleAnimRef.current.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-8, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text variant="headlineSmall" style={styles.titleCompact}>
          Catalogo de Cartas
        </Text>
      </Animated.View>

      <Searchbar
        placeholder="Buscar por nombre..."
        value={searchTerm}
        onChangeText={setSearchTerm}
        style={styles.searchbarCompact}
        inputStyle={styles.searchbarInput}
        iconColor="#6b5428"
        traileringIcon={searchTerm.trim().length > 0 ? "close" : undefined}
        onTraileringIconPress={() => setSearchTerm("")}
        elevation={0}
      />

      <Animated.View
        style={[
          styles.quickActionsWrap,
          {
            opacity: quickBarAnimRef.current.interpolate({
              inputRange: [0, 1],
              outputRange: [0.93, 1],
            }),
            transform: [
              {
                translateY: quickBarAnimRef.current.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-2, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Surface
          mode="flat"
          style={[
            styles.quickActionsBar,
            {
              paddingVertical: quickBarAnimRef.current.interpolate({
                inputRange: [0, 1],
                outputRange: [3, 6],
              }),
              marginBottom: quickBarAnimRef.current.interpolate({
                inputRange: [0, 1],
                outputRange: [4, 6],
              }),
            },
          ]}
        >
          <Button
            icon="tune-variant"
            mode="contained-tonal"
            compact
            contentStyle={
              shouldUseCompactQuickActions
                ? styles.filtersButtonCompactContent
                : undefined
            }
            style={
              shouldUseCompactQuickActions
                ? styles.filtersButtonCompact
                : undefined
            }
            onPress={openFiltersModal}
          >
            {shouldUseCompactQuickActions ? "" : "Filtros"}
          </Button>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickSummaryScroll}
            contentContainerStyle={styles.quickSummaryRow}
          >
            <Chip compact icon="filter-variant" style={styles.summaryChip}>
              {summaryLabel}
            </Chip>

            {activeFiltersCount > 0 ? (
              <Badge style={styles.summaryBadge}>{activeFiltersCount}</Badge>
            ) : null}
          </ScrollView>

          <Menu
            visible={isSortMenuVisible}
            onDismiss={() => setIsSortMenuVisible(false)}
            anchor={
              <IconButton
                icon={
                  sortBy === "name_desc"
                    ? "sort-alphabetical-descending"
                    : "sort-alphabetical-ascending"
                }
                mode="outlined"
                size={18}
                style={styles.sortIconButton}
                onPress={() => setIsSortMenuVisible(true)}
                accessibilityLabel="Ordenar cartas"
              />
            }
          >
            <Menu.Item
              title="Nombre A-Z"
              onPress={() => {
                setSortBy("name_asc");
                setIsSortMenuVisible(false);
              }}
            />
            <Menu.Item
              title="Nombre Z-A"
              onPress={() => {
                setSortBy("name_desc");
                setIsSortMenuVisible(false);
              }}
            />
          </Menu>
        </Surface>
      </Animated.View>

      {!isLoadingInitial ? (
        <Text variant="labelMedium" style={styles.resultSummary}>
          {searchQuery.trim().length > 0
            ? `Resultados: ${totalResults}`
            : `Cartas disponibles: ${totalResults}`}
        </Text>
      ) : null}

      {isLoadingInitial ? <Loader text="Cargando cartas..." /> : null}

      {showNoCards ? (
        <EmptyState
          title="No se encontraron cartas"
          description="Intenta recargar el backend y volver a abrir la pantalla."
        />
      ) : null}

      {showNoResults ? (
        <EmptyState
          title="Sin resultados"
          description="Prueba con otro nombre de carta."
        />
      ) : null}

      {!isLoadingInitial && cards.length > 0 ? (
        <Animated.View style={{ flex: 1, opacity: listAnimRef.current }}>
          <FlatList
            key={numColumns}
            data={sortedCards}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            columnWrapperStyle={styles.column}
            contentContainerStyle={styles.listContent}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.45}
            onScroll={handleCatalogScroll}
            scrollEventThrottle={16}
            onScrollBeginDrag={() => {
              endReachedLockRef.current = false;
            }}
            onMomentumScrollBegin={() => {
              endReachedLockRef.current = false;
            }}
            renderItem={({ item }) => (
              <View style={styles.itemWrapper}>
                <CardTile
                  name={item.name}
                  imageUrl={item.imageUrl}
                  onPress={() => {
                    void openCardDetailModal(item);
                  }}
                />
              </View>
            )}
            ListFooterComponent={
              cards.length > 0 ? (
                <View style={styles.footer}>
                  {!hasMore && !isLoadingMore ? (
                    <Text variant="bodyMedium" style={styles.endText}>
                      {searchQuery.trim().length > 0
                        ? "No hay mas resultados para esta busqueda."
                        : "No hay mas cartas por cargar."}
                    </Text>
                  ) : null}
                </View>
              ) : null
            }
          />
        </Animated.View>
      ) : null}

      {isLoadingMore ? (
        <Surface mode="elevated" style={styles.loadingMoreFixedBar}>
          <ActivityIndicator size="small" color="#e3350d" />
          <Text variant="labelLarge" style={styles.loadingMoreFixedText}>
            Cargando mas resultados...
          </Text>
        </Surface>
      ) : null}

      <Portal>
        {isFiltersSheetMounted ? (
          <View style={styles.sheetOverlayContainer} pointerEvents="box-none">
            <Pressable
              onPress={closeFiltersModal}
              style={styles.sheetBackdrop}
            />

            <Animated.View
              style={[
                styles.sheetAnimatedLayer,
                {
                  opacity: sheetAnimRef.current,
                  transform: [
                    {
                      translateY: sheetAnimRef.current.interpolate({
                        inputRange: [0, 1],
                        outputRange: [220, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Surface mode="elevated" style={styles.filtersModalCard}>
                <View style={styles.sheetHandle} />
                <View style={styles.filtersModalHeader}>
                  <Text variant="titleMedium" style={styles.controlsTitle}>
                    Filtros y orden
                  </Text>
                  <IconButton
                    icon="close"
                    size={20}
                    onPress={closeFiltersModal}
                  />
                </View>

                <ScrollView
                  showsVerticalScrollIndicator
                  style={styles.filtersModalScrollArea}
                  contentContainerStyle={styles.filtersModalScrollContent}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  <Text variant="labelMedium" style={styles.sectionLabel}>
                    Expansiones
                  </Text>
                  <View style={styles.chipsWrap}>
                    {SET_OPTIONS.map((option) => (
                      <Chip
                        key={option.value}
                        compact
                        selected={draftSetIds.includes(option.value)}
                        onPress={() => {
                          void toggleDraftSet(option.value);
                        }}
                        style={styles.chipItem}
                      >
                        {option.label}
                      </Chip>
                    ))}
                  </View>

                  <Divider style={styles.sectionDivider} />

                  <View style={styles.rowBetween}>
                    <Text variant="labelMedium" style={styles.sectionLabel}>
                      Filtros por categoria
                    </Text>
                    {isLoadingFilters ? (
                      <ActivityIndicator size="small" color="#e3350d" />
                    ) : null}
                  </View>

                  <SegmentedButtons
                    value={draftTagMode}
                    onValueChange={(value) =>
                      setDraftTagMode(value === "any" ? "any" : "all")
                    }
                    buttons={[
                      { value: "all", label: "Todas" },
                      { value: "any", label: "Alguna" },
                    ]}
                    style={styles.segmented}
                  />

                  <Text variant="bodySmall" style={styles.modeHelpText}>
                    Todas = exige todas las tags seleccionadas. Alguna = basta
                    con que cumpla al menos una.
                  </Text>

                  <View style={styles.tagsWrap}>
                    <List.Accordion
                      title={`Tipos (${visibleTypeOptions.length})`}
                      expanded={expandedFilterSection === "types"}
                      onPress={() =>
                        setExpandedFilterSection((prev) =>
                          prev === "types" ? null : "types",
                        )
                      }
                      style={styles.filterAccordion}
                      titleStyle={styles.filterAccordionTitle}
                    >
                      <View style={styles.accordionContentWrap}>
                        {visibleTypeOptions.length > 0 ? (
                          visibleTypeOptions.map((type) => {
                            const tagValue = toTypeTagValue(type.value);
                            const isSelected = draftTags.includes(tagValue);
                            return (
                              <Chip
                                key={type.value}
                                compact
                                selected={isSelected}
                                onPress={() => toggleDraftTag(tagValue)}
                                style={styles.tagChip}
                                icon={() => (
                                  <Checkbox
                                    status={
                                      isSelected ? "checked" : "unchecked"
                                    }
                                  />
                                )}
                              >
                                {type.label}
                              </Chip>
                            );
                          })
                        ) : (
                          <Text variant="bodySmall" style={styles.noTagsText}>
                            Sin tipos disponibles.
                          </Text>
                        )}
                      </View>
                    </List.Accordion>

                    <List.Accordion
                      title={`Rarezas (${visibleRarityOptions.length})`}
                      expanded={expandedFilterSection === "rarities"}
                      onPress={() =>
                        setExpandedFilterSection((prev) =>
                          prev === "rarities" ? null : "rarities",
                        )
                      }
                      style={styles.filterAccordion}
                      titleStyle={styles.filterAccordionTitle}
                    >
                      <View style={styles.accordionContentWrap}>
                        {visibleRarityOptions.length > 0 ? (
                          visibleRarityOptions.map((rarity) => {
                            const tagValue = toRarityTagValue(rarity.value);
                            const isSelected = draftTags.includes(tagValue);
                            return (
                              <Chip
                                key={rarity.value}
                                compact
                                selected={isSelected}
                                onPress={() => toggleDraftTag(tagValue)}
                                style={styles.tagChip}
                                icon={() => (
                                  <Checkbox
                                    status={
                                      isSelected ? "checked" : "unchecked"
                                    }
                                  />
                                )}
                              >
                                {rarity.label}
                              </Chip>
                            );
                          })
                        ) : (
                          <Text variant="bodySmall" style={styles.noTagsText}>
                            Sin rarezas disponibles.
                          </Text>
                        )}
                      </View>
                    </List.Accordion>

                    <List.Accordion
                      title={`Tags (${visibleTagOptions.length})`}
                      expanded={expandedFilterSection === "tags"}
                      onPress={() =>
                        setExpandedFilterSection((prev) =>
                          prev === "tags" ? null : "tags",
                        )
                      }
                      style={styles.filterAccordion}
                      titleStyle={styles.filterAccordionTitle}
                    >
                      <View style={styles.accordionContentWrap}>
                        {visibleTagOptions.length > 0 ? (
                          visibleTagOptions.map((tag) => {
                            const isSelected = draftTags.includes(tag.value);
                            return (
                              <Chip
                                key={tag.value}
                                compact
                                selected={isSelected}
                                onPress={() => toggleDraftTag(tag.value)}
                                style={styles.tagChip}
                                icon={() => (
                                  <Checkbox
                                    status={
                                      isSelected ? "checked" : "unchecked"
                                    }
                                  />
                                )}
                              >
                                {tag.label}
                              </Chip>
                            );
                          })
                        ) : (
                          <Text variant="bodySmall" style={styles.noTagsText}>
                            Sin tags disponibles para estas expansiones.
                          </Text>
                        )}
                      </View>
                    </List.Accordion>
                  </View>
                </ScrollView>

                <View style={styles.filtersModalActions}>
                  <Button mode="text" onPress={clearDraftFilters}>
                    Limpiar
                  </Button>
                  <Button mode="text" onPress={clearFilters}>
                    Restablecer todo
                  </Button>
                  <Button mode="contained" onPress={applyFiltersFromDraft}>
                    Aplicar
                  </Button>
                </View>
              </Surface>
            </Animated.View>
          </View>
        ) : null}
      </Portal>

      <Portal>
        <Modal
          visible={isDetailModalVisible}
          onDismiss={closeCardDetailModal}
          contentContainerStyle={styles.detailModalContainer}
          theme={{ colors: { backdrop: "rgba(22, 12, 2, 0.62)" } }}
          dismissable
        >
          <Surface mode="elevated" style={styles.detailCardSurface}>
            <View style={styles.detailHeaderRow}>
              <Text
                variant="titleMedium"
                numberOfLines={1}
                style={styles.controlsTitle}
              >
                {detailCardName || "Detalle de carta"}
              </Text>
              <IconButton
                icon="close"
                size={20}
                onPress={closeCardDetailModal}
              />
            </View>

            {isLoadingDetail ? (
              <View style={styles.detailLoaderWrap}>
                <Loader text="Cargando detalle..." />
              </View>
            ) : detailImageUrl ? (
              <Image
                source={{ uri: detailImageUrl }}
                style={styles.detailImage}
                contentFit="contain"
                transition={140}
              />
            ) : (
              <View style={styles.detailFallbackWrap}>
                <Text variant="titleSmall" style={styles.noTagsText}>
                  No hay imagen disponible para esta carta.
                </Text>
              </View>
            )}
          </Surface>
        </Modal>
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => {
          setSnackbarVisible(false);
          setSnackbarCanUndo(false);
        }}
        duration={2400}
        style={styles.snackbar}
        action={
          snackbarCanUndo
            ? {
                label: "Deshacer",
                onPress: restoreLastFiltersSnapshot,
              }
            : undefined
        }
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: IS_WEB ? 10 : 6,
    paddingHorizontal: IS_WEB ? 12 : 10,
    backgroundColor: "#fff7e6",
  },
  bgOrbBlue: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    right: -90,
    top: -50,
    backgroundColor: "rgba(42, 117, 187, 0.14)",
  },
  bgOrbYellow: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 999,
    left: -110,
    bottom: 80,
    backgroundColor: "rgba(255, 203, 5, 0.14)",
  },
  titleWrap: {
    overflow: "hidden",
  },
  titleCompact: {
    color: "#2b1f08",
    letterSpacing: 0.4,
    fontWeight: "800",
    textShadowColor: "rgba(255, 255, 255, 0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  searchbarCompact: {
    borderWidth: 0,
    backgroundColor: "#fff8e8",
    borderRadius: 12,
    minHeight: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    marginBottom: 6,
    shadowColor: "#2d1a00",
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  searchbarInput: {
    fontSize: IS_WEB ? 18 : 16,
    color: "#3b2a0a",
    paddingVertical: 0,
  },
  quickActionsBar: {
    borderWidth: 1,
    borderColor: "#ecdca9",
    backgroundColor: "#fffdf7",
    borderRadius: 12,
    paddingHorizontal: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#2d1a00",
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  quickActionsWrap: {
    marginBottom: 0,
  },
  quickSummaryScroll: {
    flex: 1,
  },
  quickSummaryRow: {
    gap: 8,
    paddingRight: 4,
    alignItems: "center",
  },
  summaryChip: {
    backgroundColor: "#fdf2d9",
    maxWidth: IS_WEB ? 360 : 230,
  },
  summaryBadge: {
    backgroundColor: "#e3350d",
    color: "#fff",
    alignSelf: "center",
  },
  filtersButtonCompact: {
    minWidth: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    justifyContent: "center",
  },
  filtersButtonCompactContent: {
    width: CONTROL_HEIGHT - 6,
    height: CONTROL_HEIGHT - 6,
  },
  sortIconButton: {
    margin: 0,
    width: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    borderRadius: 10,
  },
  controlsTitle: {
    color: "#3b2a0a",
    fontWeight: "700",
  },
  sectionLabel: {
    color: "#5a4722",
    marginBottom: 5,
    fontWeight: "700",
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipItem: {
    backgroundColor: "#fff4dc",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  segmented: {
    marginBottom: 4,
  },
  modeHelpText: {
    color: "#7a5d2e",
    marginBottom: 8,
  },
  tagsRow: {
    gap: 8,
    paddingRight: 4,
  },
  tagsWrap: {
    gap: 8,
    paddingRight: 2,
    paddingBottom: 4,
  },
  filterAccordion: {
    backgroundColor: "#fff4dc",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f0c35a",
  },
  filterAccordionTitle: {
    color: "#3b2a0a",
    fontWeight: "700",
  },
  accordionContentWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  tagChip: {
    backgroundColor: "#fff4dc",
  },
  noTagsText: {
    color: "#7a5d2e",
  },
  sectionDivider: {
    marginVertical: 6,
    backgroundColor: "#f0c35a",
  },
  sheetOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(38, 22, 2, 0.28)",
  },
  sheetAnimatedLayer: {
    paddingHorizontal: IS_WEB ? 16 : 8,
    paddingBottom: IS_WEB ? 12 : 6,
  },
  filtersModalCard: {
    backgroundColor: "#fff8e8",
    borderRadius: 18,
    borderWidth: 0,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    maxHeight: IS_WEB ? 480 : "82%",
  },
  filtersModalScrollArea: {
    flexGrow: 0,
  },
  filtersModalScrollContent: {
    paddingBottom: 8,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#e8c26b",
    marginBottom: 8,
  },
  filtersModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filtersModalActions: {
    borderTopWidth: 1,
    borderTopColor: "#f0c35a",
    paddingTop: 8,
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,
    flexWrap: "wrap",
    backgroundColor: "#fff8e8",
  },
  resultSummary: {
    marginBottom: IS_WEB ? 6 : 4,
    color: "#7a5d2e",
    fontWeight: "700",
    fontSize: IS_WEB ? 12 : 11,
  },
  listContent: {
    paddingBottom: IS_WEB ? 64 : 58,
  },
  column: {
    gap: GRID_GAP,
  },
  itemWrapper: {
    flex: 1,
    marginBottom: GRID_GAP,
  },
  footer: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  endText: {
    textAlign: "center",
    color: "#7a5d2e",
  },
  loadingMoreFixedBar: {
    position: "absolute",
    left: IS_WEB ? 12 : 10,
    right: IS_WEB ? 12 : 10,
    bottom: IS_WEB ? 10 : 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0c35a",
    backgroundColor: "#fff8e8",
    paddingHorizontal: IS_WEB ? 12 : 10,
    paddingVertical: IS_WEB ? 8 : 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#2d1a00",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  loadingMoreFixedText: {
    color: "#5a4722",
    fontWeight: "700",
  },
  snackbar: {
    backgroundColor: "#3b2a0a",
    marginBottom: IS_WEB ? 12 : 8,
  },
  detailModalContainer: {
    marginHorizontal: IS_WEB ? "18%" : 16,
    borderRadius: 18,
  },
  detailCardSurface: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: "#fff8e8",
    borderWidth: 1,
    borderColor: "#f0c35a",
    minHeight: 360,
  },
  detailHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  detailLoaderWrap: {
    minHeight: 320,
    justifyContent: "center",
    alignItems: "center",
  },
  detailFallbackWrap: {
    minHeight: 320,
    justifyContent: "center",
    alignItems: "center",
  },
  detailImage: {
    width: "100%",
    minHeight: 320,
    backgroundColor: "#fdeec9",
    borderRadius: 12,
  },
});

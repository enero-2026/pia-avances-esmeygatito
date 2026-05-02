import { getSavedDecks, SavedDeck, upsertDeck } from "@/services/deckStorage";
import {
    BoardCard,
    BoardPublicView,
    BoardState,
    CardProfile,
    GameBoardService,
    PlayerId,
} from "@/services/gameBoardService";
import { MatchBoardSnapshot, TCGService } from "@/services/tcgdexService";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    NativeScrollEvent,
    NativeSyntheticEvent,
    PanResponder,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import {
    Button,
    Card,
    Chip,
    Divider,
    Menu,
    SegmentedButtons,
    Snackbar,
    Surface,
    Text,
} from "react-native-paper";

type DeckSelector = "player1" | "player2";
type HandDropTarget =
  | "active_spot"
  | "bench"
  | "discard_pile"
  | "attach_active";
type DragSourceZone = "hand" | "bench" | "active_spot";

type CardMetaMap = Record<string, { name: string; imageUrl: string | null }>;

function toCardMetaMap(deckA?: SavedDeck, deckB?: SavedDeck): CardMetaMap {
  const map: CardMetaMap = {};
  const source = [deckA?.cardMeta ?? {}, deckB?.cardMeta ?? {}];

  source.forEach((meta) => {
    Object.entries(meta).forEach(([cardId, data]) => {
      if (!map[cardId] && data.name.trim()) {
        map[cardId] = {
          name: data.name.trim(),
          imageUrl: data.imageUrl,
        };
      }
    });
  });

  return map;
}

function formatActionLabel(actionType: string): string {
  switch (actionType) {
    case "move":
      return "Movimiento";
    case "draw":
      return "Robo";
    case "attach":
      return "Adjuntar";
    case "ko":
      return "KO";
    case "prize":
      return "Premio";
    case "setup":
      return "Setup";
    case "turn":
      return "Turno";
    default:
      return actionType;
  }
}

function formatSpecialCondition(
  condition: BoardCard["specialCondition"],
): string {
  switch (condition) {
    case "burned":
      return "Quemado";
    case "poisoned":
      return "Envenenado";
    case "asleep":
      return "Dormido";
    case "paralyzed":
      return "Paralizado";
    case "confused":
      return "Confundido";
    default:
      return "Sin estado";
  }
}

function getSelfBoard(board: BoardState, viewer: PlayerId) {
  return viewer === "player1" ? board.player1 : board.player2;
}

function getOpponentBoard(board: BoardState, viewer: PlayerId) {
  return viewer === "player1" ? board.player2 : board.player1;
}

function getLastCards(cards: BoardCard[], total = 6): BoardCard[] {
  if (cards.length <= total) {
    return cards;
  }

  return cards.slice(cards.length - total);
}

function summarizeBoardSnapshot(board: BoardState): MatchBoardSnapshot {
  const zoneCounts: Record<string, { count: number }> = {
    "player1.deck": { count: board.player1.deck.cards.length },
    "player1.hand": { count: board.player1.hand.cards.length },
    "player1.active": { count: board.player1.active_spot.cards.length },
    "player1.bench": { count: board.player1.bench.cards.length },
    "player1.prizes": { count: board.player1.prize_cards.cards.length },
    "player1.discard": { count: board.player1.discard_pile.cards.length },
    "player2.deck": { count: board.player2.deck.cards.length },
    "player2.hand": { count: board.player2.hand.cards.length },
    "player2.active": { count: board.player2.active_spot.cards.length },
    "player2.bench": { count: board.player2.bench.cards.length },
    "player2.prizes": { count: board.player2.prize_cards.cards.length },
    "player2.discard": { count: board.player2.discard_pile.cards.length },
    stadium: { count: board.stadium.cards.length },
  };

  return {
    turn: {
      currentPlayer: board.turn.currentPlayer,
      number: board.turn.number,
      phase: board.turn.phase,
    },
    zones: zoneCounts,
    activeByPlayer: {
      player1: board.player1.active_spot.cards[0]?.cardId ?? null,
      player2: board.player2.active_spot.cards[0]?.cardId ?? null,
    },
    benchByPlayer: {
      player1: board.player1.bench.cards.map((card) => card.cardId),
      player2: board.player2.bench.cards.map((card) => card.cardId),
    },
    discardByPlayer: {
      player1: board.player1.discard_pile.cards.map((card) => card.cardId),
      player2: board.player2.discard_pile.cards.map((card) => card.cardId),
    },
    prizesByPlayer: {
      player1: board.player1.prize_cards.cards.length,
      player2: board.player2.prize_cards.cards.length,
    },
  };
}

function collectCardIdsFromPayload(value: unknown, into: Set<string>): void {
  if (!value) {
    return;
  }

  if (typeof value === "string") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectCardIdsFromPayload(item, into));
    return;
  }

  if (typeof value !== "object") {
    return;
  }

  Object.entries(value as Record<string, unknown>).forEach(([key, raw]) => {
    if (key === "cardId" && typeof raw === "string" && raw.trim()) {
      into.add(raw.trim());
      return;
    }

    collectCardIdsFromPayload(raw, into);
  });
}

function inferWinnerFromBoard(board: BoardState): string | null {
  if (board.player1.prize_cards.cards.length === 0) {
    return "player1";
  }

  if (board.player2.prize_cards.cards.length === 0) {
    return "player2";
  }

  return null;
}

function mergeDeckMeta(
  deck: SavedDeck,
  hydratedMeta: CardMetaMap,
): SavedDeck | null {
  const nextMeta = { ...deck.cardMeta };
  let changed = false;

  deck.entries.forEach((entry) => {
    const enriched = hydratedMeta[entry.cardId];
    if (!enriched?.name) {
      return;
    }

    const current = nextMeta[entry.cardId];
    const sameName = current?.name === enriched.name;
    const sameImage = current?.imageUrl === enriched.imageUrl;

    if (sameName && sameImage) {
      return;
    }

    nextMeta[entry.cardId] = {
      name: enriched.name,
      imageUrl: enriched.imageUrl,
    };
    changed = true;
  });

  if (!changed) {
    return null;
  }

  return {
    ...deck,
    cardMeta: nextMeta,
    updatedAt: new Date().toISOString(),
  };
}

function toCardProfileFromDetail(detail: {
  category: string | null;
  stage: string | null;
  trainerType: string | null;
  energyType: string | null;
  rarity: string | null;
  hp: number | string | null;
  retreatCost: number | string | null;
}): CardProfile {
  const categoryRaw = (detail.category ?? "").toLowerCase();
  const stageRaw = (detail.stage ?? "").toLowerCase();
  const trainerTypeRaw = (detail.trainerType ?? "").toLowerCase();
  const energyTypeRaw = (detail.energyType ?? "").toLowerCase();
  const rarityRaw = detail.rarity ?? "";

  const stage: CardProfile["stage"] =
    stageRaw === "basic"
      ? "basic"
      : stageRaw === "stage1"
        ? "stage1"
        : stageRaw === "stage2"
          ? "stage2"
          : stageRaw === "vmax"
            ? "vmax"
            : stageRaw === "vstar"
              ? "vstar"
              : "other";

  const hp =
    typeof detail.hp === "number"
      ? detail.hp
      : typeof detail.hp === "string"
        ? Number.parseInt(detail.hp, 10)
        : 0;

  const retreatCost =
    typeof detail.retreatCost === "number"
      ? detail.retreatCost
      : typeof detail.retreatCost === "string"
        ? Number.parseInt(detail.retreatCost, 10)
        : 0;

  return {
    category:
      categoryRaw === "pokemon"
        ? "pokemon"
        : categoryRaw === "trainer"
          ? "trainer"
          : categoryRaw === "energy"
            ? "energy"
            : "unknown",
    stage,
    trainerType:
      trainerTypeRaw === "item"
        ? "item"
        : trainerTypeRaw === "supporter"
          ? "supporter"
          : trainerTypeRaw === "stadium"
            ? "stadium"
            : trainerTypeRaw === "tool"
              ? "tool"
              : "other",
    energyType:
      energyTypeRaw === "normal"
        ? "normal"
        : energyTypeRaw === "special"
          ? "special"
          : "other",
    maxHp: Number.isFinite(hp) ? hp : 0,
    retreatCost: Number.isFinite(retreatCost) ? retreatCost : 0,
    hasRuleBox: /\b(ex|EX|GX|VSTAR|VMAX|V)\b/.test(rarityRaw),
    isTagTeam: /TAG\s*TEAM/i.test(rarityRaw),
  };
}

export default function SimulatorScreen() {
  const [decks, setDecks] = useState<SavedDeck[]>([]);
  const [isLoadingDecks, setIsLoadingDecks] = useState(true);
  const [deckP1Id, setDeckP1Id] = useState<string | null>(null);
  const [deckP2Id, setDeckP2Id] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<DeckSelector | null>(null);

  const [board, setBoard] = useState<BoardState | null>(null);
  const [viewer, setViewer] = useState<PlayerId>("player1");

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [isSavingMatch, setIsSavingMatch] = useState(false);
  const [matchStartedAt, setMatchStartedAt] = useState<string | null>(null);
  const [hydratedCardMeta, setHydratedCardMeta] = useState<CardMetaMap>({});
  const hydrationAttemptedRef = useRef(new Set<string>());
  const [handScrollX, setHandScrollX] = useState(0);
  const [handViewportWidth, setHandViewportWidth] = useState(0);
  const [handContentWidth, setHandContentWidth] = useState(0);
  const [draggedCardState, setDraggedCardState] = useState<{
    card: BoardCard;
    sourceZone: DragSourceZone;
  } | null>(null);
  const [dragArmed, setDragArmed] = useState<{
    cardInstanceId: string;
    sourceZone: DragSourceZone;
  } | null>(null);
  const dragArmedRef = useRef<{
    cardInstanceId: string;
    sourceZone: DragSourceZone;
  } | null>(null);
  const [dragPointer, setDragPointer] = useState({ x: 0, y: 0 });
  const [hoverDropTarget, setHoverDropTarget] = useState<HandDropTarget | null>(
    null,
  );
  const dropTargetRefs = useRef<Record<HandDropTarget, View | null>>({
    active_spot: null,
    bench: null,
    discard_pile: null,
    attach_active: null,
  });

  const selectedDeckP1 = useMemo(
    () => decks.find((deck) => deck.id === deckP1Id),
    [decks, deckP1Id],
  );
  const selectedDeckP2 = useMemo(
    () => decks.find((deck) => deck.id === deckP2Id),
    [decks, deckP2Id],
  );

  const cardMetaMap = useMemo(
    () => ({
      ...toCardMetaMap(selectedDeckP1, selectedDeckP2),
      ...hydratedCardMeta,
    }),
    [selectedDeckP1, selectedDeckP2, hydratedCardMeta],
  );

  const cardIdsToHydrate = useMemo(() => {
    const ids = new Set<string>();
    [selectedDeckP1, selectedDeckP2].forEach((deck) => {
      deck?.entries.forEach((entry) => {
        if (entry.cardId.trim()) {
          ids.add(entry.cardId.trim());
        }
      });
    });

    return [...ids];
  }, [selectedDeckP1, selectedDeckP2]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const missing = cardIdsToHydrate.filter((cardId) => {
        const meta = cardMetaMap[cardId];
        return (
          (!meta || !meta.name || !meta.imageUrl) &&
          !hydrationAttemptedRef.current.has(cardId)
        );
      });

      if (missing.length === 0) {
        return;
      }

      const fetched = await Promise.all(
        missing.map(async (cardId) => {
          hydrationAttemptedRef.current.add(cardId);
          const detail = await TCGService.getCardDetails(cardId);

          return {
            cardId,
            name: detail?.name?.trim() || cardMetaMap[cardId]?.name || cardId,
            imageUrl: detail?.imageUrl ?? cardMetaMap[cardId]?.imageUrl ?? null,
          };
        }),
      );

      if (cancelled) {
        return;
      }

      setHydratedCardMeta((prev) => {
        const next = { ...prev };

        fetched.forEach((item) => {
          next[item.cardId] = {
            name: item.name,
            imageUrl: item.imageUrl,
          };
        });

        return next;
      });

      const decksToPatch = [selectedDeckP1, selectedDeckP2].filter(
        (deck): deck is SavedDeck => deck !== undefined,
      );

      let persistedDecks = decks;
      for (const deck of decksToPatch) {
        const mergedDeck = mergeDeckMeta(
          deck,
          Object.fromEntries(
            fetched.map((item) => [
              item.cardId,
              { name: item.name, imageUrl: item.imageUrl },
            ]),
          ),
        );

        if (!mergedDeck) {
          continue;
        }

        persistedDecks = await upsertDeck(mergedDeck);
      }

      if (!cancelled && persistedDecks !== decks) {
        setDecks(persistedDecks);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cardIdsToHydrate, cardMetaMap, decks, selectedDeckP1, selectedDeckP2]);

  const cardNameMap = useMemo(
    () =>
      Object.entries(cardMetaMap).reduce<Record<string, string>>(
        (acc, [cardId, meta]) => {
          acc[cardId] = meta.name;
          return acc;
        },
        {},
      ),
    [cardMetaMap],
  );

  const boardView: BoardPublicView | null = useMemo(() => {
    if (!board) {
      return null;
    }

    return GameBoardService.getPublicView(board, viewer);
  }, [board, viewer]);

  const isViewerTurn = board ? board.turn.currentPlayer === viewer : false;

  function showSnackbar(message: string) {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  }

  function resolveCardLabel(card: BoardCard): string {
    return cardNameMap[card.cardId] ?? card.name ?? card.cardId;
  }

  function resolveCardImage(card: BoardCard): string | null {
    return cardMetaMap[card.cardId]?.imageUrl ?? null;
  }

  function renderCardBody(card: BoardCard, withAttachments = false) {
    const imageUrl = resolveCardImage(card);
    const isPokemon = card.profile.category === "pokemon";
    const maxHp = Math.max(0, card.profile.maxHp ?? 0);
    const damage = Math.max(0, card.damageCounters * 10);
    const remainingHp = maxHp > 0 ? Math.max(0, maxHp - damage) : null;
    const attachedEnergy = card.attachments.filter(
      (item) =>
        item.profile.category === "energy" ||
        item.profile.energyType !== "other",
    ).length;
    const hasCondition = card.specialCondition !== "none";

    return (
      <Card.Content style={styles.cardContent}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.cardImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.cardImageFallback}>
            <Text variant="labelSmall">Sin imagen</Text>
          </View>
        )}

        <Text numberOfLines={1}>{resolveCardLabel(card)}</Text>

        {isPokemon && remainingHp !== null ? (
          <Text variant="labelSmall">
            HP: {remainingHp}/{maxHp} · Daño: {damage}
          </Text>
        ) : null}

        {hasCondition ? (
          <Text variant="labelSmall">
            Estado: {formatSpecialCondition(card.specialCondition)}
          </Text>
        ) : null}

        {withAttachments ? (
          <Text variant="labelSmall">
            Energía: {attachedEnergy} · Adjuntos: {card.attachments.length}
          </Text>
        ) : null}
      </Card.Content>
    );
  }

  useEffect(() => {
    void (async () => {
      setIsLoadingDecks(true);
      try {
        const saved = await getSavedDecks();
        setDecks(saved);

        if (saved.length >= 1) {
          setDeckP1Id(saved[0].id);
        }

        if (saved.length >= 2) {
          setDeckP2Id(saved[1].id);
        } else if (saved.length === 1) {
          setDeckP2Id(saved[0].id);
        }
      } finally {
        setIsLoadingDecks(false);
      }
    })();
  }, []);

  function applyBoardResult(
    result: { ok: boolean; board: BoardState; issue?: { message: string } },
    successMessage?: string,
  ) {
    if (!result.ok) {
      showSnackbar(result.issue?.message ?? "Accion invalida");
      return;
    }

    setBoard(result.board);
    if (successMessage) {
      showSnackbar(successMessage);
    }
  }

  async function startMatch() {
    if (!selectedDeckP1 || !selectedDeckP2) {
      showSnackbar("Selecciona mazos para ambos jugadores");
      return;
    }

    const uniqueCardIds = [selectedDeckP1, selectedDeckP2]
      .flatMap((deck) => deck.entries)
      .map((entry) => entry.cardId.trim())
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index);

    const detailRows = await Promise.all(
      uniqueCardIds.map(async (cardId) => ({
        cardId,
        detail: await TCGService.getCardDetails(cardId),
      })),
    );

    const cardProfiles: Record<string, CardProfile> = {};
    detailRows.forEach((row) => {
      if (!row.detail) {
        return;
      }

      cardProfiles[row.cardId] = toCardProfileFromDetail(row.detail);
    });

    const created = GameBoardService.createBoard({
      player1Deck: selectedDeckP1.entries,
      player2Deck: selectedDeckP2.entries,
      startingPlayer: "player1",
      cardProfiles,
    });

    if (!created.ok) {
      showSnackbar(created.issue?.message ?? "No se pudo crear el tablero");
      return;
    }

    const setup = GameBoardService.runInitialSetup(created.board);
    applyBoardResult(setup, "Partida iniciada");
    setMatchStartedAt(new Date().toISOString());
  }

  async function saveCurrentMatch() {
    if (!board || !selectedDeckP1 || !selectedDeckP2) {
      showSnackbar("Inicia una partida antes de guardar historial");
      return;
    }

    setIsSavingMatch(true);
    try {
      const endedAt = new Date();
      const startedAt = matchStartedAt ? new Date(matchStartedAt) : null;
      const durationSeconds =
        startedAt && Number.isFinite(startedAt.getTime())
          ? Math.max(
              0,
              Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000),
            )
          : null;

      const payloadCardIds = new Set<string>();
      board.actionLog.forEach((action) => {
        collectCardIdsFromPayload(action.payload, payloadCardIds);
      });

      if (payloadCardIds.size === 0) {
        [...selectedDeckP1.entries, ...selectedDeckP2.entries].forEach(
          (entry) => {
            if (entry.cardId.trim()) {
              payloadCardIds.add(entry.cardId.trim());
            }
          },
        );
      }

      const winner = inferWinnerFromBoard(board);
      const created = await TCGService.createMatch({
        players: [
          selectedDeckP1.name || "player1",
          selectedDeckP2.name || "player2",
        ],
        winner,
        resultReason: winner ? "prize_win" : "manual_save",
        notes: `Guardado desde simulador (${board.actionLog.length} acciones).`,
        cardsUsed: [...payloadCardIds],
        endedAt: endedAt.toISOString(),
        durationSeconds,
        turnCount: board.turn.number,
        actionLog: board.actionLog,
        boardSnapshot: summarizeBoardSnapshot(board),
      });

      if (!created) {
        showSnackbar("No se pudo guardar la partida en historial");
        return;
      }

      showSnackbar("Partida guardada en historial");
    } finally {
      setIsSavingMatch(false);
    }
  }

  function drawOneCard() {
    if (!board) {
      return;
    }

    const actor = board.turn.currentPlayer;
    const result = GameBoardService.drawCards(board, {
      actor,
      player: actor,
      count: 1,
    });

    applyBoardResult(result, "Carta robada");
  }

  function endTurn() {
    if (!board) {
      return;
    }

    const actor = board.turn.currentPlayer;
    const result = GameBoardService.endTurn(board, actor);
    applyBoardResult(result, "Turno finalizado");
  }

  function takeOnePrize() {
    if (!board) {
      return;
    }

    const actor = board.turn.currentPlayer;
    const result = GameBoardService.takePrizeCards(board, {
      actor,
      player: actor,
      count: 1,
    });

    applyBoardResult(result, "Premio tomado");
  }

  function moveCardFromHand(
    card: BoardCard,
    destination: "active_spot" | "bench" | "discard_pile",
  ) {
    if (!board) {
      return;
    }

    const result = GameBoardService.moveCard(board, {
      actor: viewer,
      from: { owner: viewer, zone: "hand" },
      to: { owner: viewer, zone: destination },
      cardInstanceId: card.instanceId,
      reason:
        destination === "discard_pile" ? "discard_from_hand" : "play_from_hand",
    });

    applyBoardResult(result);
  }

  function attachFromHandToActive(card: BoardCard) {
    if (!board) {
      return;
    }

    const selfBoard = getSelfBoard(board, viewer);
    const active = selfBoard.active_spot.cards[0];

    if (!active) {
      showSnackbar("No tienes Pokemon activo para adjuntar");
      return;
    }

    const result = GameBoardService.attachFromHand(board, {
      actor: viewer,
      player: viewer,
      fromZone: "hand",
      sourceInstanceId: card.instanceId,
      hostZone: "active_spot",
      hostInstanceId: active.instanceId,
    });

    applyBoardResult(result);
  }

  function knockOutOpponentActive() {
    if (!board) {
      return;
    }

    const opponent = viewer === "player1" ? "player2" : "player1";
    const opponentBoard = getOpponentBoard(board, viewer);
    const active = opponentBoard.active_spot.cards[0];

    if (!active) {
      showSnackbar("El oponente no tiene Pokemon activo");
      return;
    }

    const result = GameBoardService.knockOutPokemon(board, {
      actor: viewer,
      targetPlayer: opponent,
      sourceZone: "active_spot",
      sourceInstanceId: active.instanceId,
    });

    applyBoardResult(result);
  }

  function chooseNewActiveFromBench() {
    if (!board) {
      return;
    }

    const selfBoard = getSelfBoard(board, viewer);
    if (selfBoard.active_spot.cards.length > 0) {
      showSnackbar("Ya tienes un Pokémon en Active Spot");
      return;
    }

    const benchCandidate = selfBoard.bench.cards[0];
    if (!benchCandidate) {
      showSnackbar("No hay Pokémon en Bench para seleccionar");
      return;
    }

    const result = GameBoardService.selectNewActiveFromBench(board, {
      actor: viewer,
      player: viewer,
      benchInstanceId: benchCandidate.instanceId,
    });

    applyBoardResult(result, "Nuevo Active seleccionado");
  }

  function retreatWithBench(benchCard: BoardCard) {
    if (!board) {
      return;
    }

    const result = GameBoardService.retreatActive(board, {
      actor: viewer,
      player: viewer,
      benchInstanceId: benchCard.instanceId,
    });

    applyBoardResult(result);
  }

  function benchToActive(benchCard: BoardCard) {
    if (!board) {
      return;
    }

    const selfBoard = getSelfBoard(board, viewer);
    if (
      selfBoard.active_spot.cards.length === 0 ||
      board.turn.mustChooseNewActive
    ) {
      const result = GameBoardService.selectNewActiveFromBench(board, {
        actor: viewer,
        player: viewer,
        benchInstanceId: benchCard.instanceId,
      });

      applyBoardResult(result, "Nuevo Active seleccionado");
      return;
    }

    retreatWithBench(benchCard);
  }

  function discardFromBench(card: BoardCard) {
    if (!board) {
      return;
    }

    const result = GameBoardService.moveCard(board, {
      actor: viewer,
      from: { owner: viewer, zone: "bench" },
      to: { owner: viewer, zone: "discard_pile" },
      cardInstanceId: card.instanceId,
      reason: "discard_from_bench",
    });

    applyBoardResult(result);
  }

  function knockOutSelfActive() {
    if (!board) {
      return;
    }

    const selfBoard = getSelfBoard(board, viewer);
    const active = selfBoard.active_spot.cards[0];

    if (!active) {
      showSnackbar("No tienes Pokemon activo");
      return;
    }

    const result = GameBoardService.knockOutPokemon(board, {
      actor: viewer,
      targetPlayer: viewer,
      sourceZone: "active_spot",
      sourceInstanceId: active.instanceId,
    });

    applyBoardResult(result);
  }

  function handleHandScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setHandScrollX(event.nativeEvent.contentOffset.x);
  }

  function clearDragState() {
    setDraggedCardState(null);
    setDragArmed(null);
    dragArmedRef.current = null;
    setHoverDropTarget(null);
  }

  function disarmDragIfNotDragging() {
    if (draggedCardState) {
      return;
    }

    setDragArmed(null);
    dragArmedRef.current = null;
  }

  function armDrag(
    card: BoardCard,
    sourceZone: DragSourceZone,
    pageX: number,
    pageY: number,
  ) {
    if (!isViewerTurn) {
      return;
    }

    const armed = {
      cardInstanceId: card.instanceId,
      sourceZone,
    };

    dragArmedRef.current = armed;
    setDragArmed(armed);
    setDragPointer({ x: pageX, y: pageY });
  }

  function isDragArmedFor(
    card: BoardCard,
    sourceZone: DragSourceZone,
  ): boolean {
    const armed = dragArmedRef.current;

    if (!armed) {
      return false;
    }

    return (
      armed.cardInstanceId === card.instanceId &&
      armed.sourceZone === sourceZone
    );
  }

  async function measureDropTarget(target: HandDropTarget) {
    const targetRef = dropTargetRefs.current[target];

    if (!targetRef || typeof targetRef.measureInWindow !== "function") {
      return null;
    }

    return new Promise<{
      x: number;
      y: number;
      width: number;
      height: number;
    } | null>((resolve) => {
      targetRef.measureInWindow((x, y, width, height) => {
        resolve({ x, y, width, height });
      });
    });
  }

  async function detectDropTarget(
    pageX: number,
    pageY: number,
  ): Promise<HandDropTarget | null> {
    const orderedTargets: HandDropTarget[] = [
      "active_spot",
      "bench",
      "discard_pile",
      "attach_active",
    ];

    for (const target of orderedTargets) {
      const frame = await measureDropTarget(target);

      if (!frame) {
        continue;
      }

      const insideX = pageX >= frame.x && pageX <= frame.x + frame.width;
      const insideY = pageY >= frame.y && pageY <= frame.y + frame.height;

      if (insideX && insideY) {
        return target;
      }
    }

    return null;
  }

  async function updateDropTargetHover(pageX: number, pageY: number) {
    const target = await detectDropTarget(pageX, pageY);
    setHoverDropTarget(target);
  }

  async function completeDrag(
    card: BoardCard,
    sourceZone: DragSourceZone,
    pageX: number,
    pageY: number,
  ) {
    const target = await detectDropTarget(pageX, pageY);
    clearDragState();

    if (!target) {
      showSnackbar("Suelta la carta sobre un objetivo valido");
      return;
    }

    if (sourceZone === "hand") {
      if (target === "attach_active") {
        attachFromHandToActive(card);
        return;
      }

      moveCardFromHand(card, target);
      return;
    }

    if (sourceZone === "bench") {
      if (target === "active_spot") {
        benchToActive(card);
        return;
      }

      if (target === "discard_pile") {
        discardFromBench(card);
        return;
      }

      showSnackbar("Bench solo puede soltarse en Active o Descartar");
      return;
    }

    if (!board) {
      return;
    }

    if (target === "bench") {
      const benchCandidate = getSelfBoard(board, viewer).bench.cards[0];
      if (!benchCandidate) {
        showSnackbar("Necesitas un Pokémon en Bench para hacer Retreat");
        return;
      }

      retreatWithBench(benchCandidate);
      return;
    }

    if (target === "discard_pile") {
      knockOutSelfActive();
      return;
    }

    showSnackbar("Active solo puede soltarse en Bench (Retreat) o Descartar");
  }

  function createDragResponder(card: BoardCard, sourceZone: DragSourceZone) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_event, gestureState) =>
        isViewerTurn &&
        isDragArmedFor(card, sourceZone) &&
        (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2),
      onPanResponderGrant: (event) => {
        setDraggedCardState({ card, sourceZone });
        setDragPointer({
          x: event.nativeEvent.pageX,
          y: event.nativeEvent.pageY,
        });
      },
      onPanResponderMove: (event) => {
        const { pageX, pageY } = event.nativeEvent;
        setDragPointer({ x: pageX, y: pageY });
        void updateDropTargetHover(pageX, pageY);
      },
      onPanResponderRelease: (event) => {
        void completeDrag(
          card,
          sourceZone,
          event.nativeEvent.pageX,
          event.nativeEvent.pageY,
        );
      },
      onPanResponderTerminate: clearDragState,
      onPanResponderTerminationRequest: () => false,
    });
  }

  const handCanScroll = handContentWidth > handViewportWidth + 1;
  const handMaxScroll = Math.max(0, handContentWidth - handViewportWidth);
  const handThumbWidth = handCanScroll
    ? Math.max(36, (handViewportWidth * handViewportWidth) / handContentWidth)
    : handViewportWidth;
  const handThumbOffset =
    handCanScroll && handMaxScroll > 0
      ? (handScrollX / handMaxScroll) *
        Math.max(0, handViewportWidth - handThumbWidth)
      : 0;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        nestedScrollEnabled
        directionalLockEnabled
        showsVerticalScrollIndicator
      >
        <Text variant="headlineSmall" style={styles.title}>
          Simulador TCG
        </Text>

        <Surface mode="elevated" style={styles.setupCard}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Setup de partida
          </Text>

          <View style={styles.selectorRow}>
            <Menu
              visible={openMenu === "player1"}
              onDismiss={() => setOpenMenu(null)}
              anchor={
                <Button mode="outlined" onPress={() => setOpenMenu("player1")}>
                  {selectedDeckP1
                    ? `P1: ${selectedDeckP1.icon || "🗂️"} ${selectedDeckP1.name}`
                    : "Seleccionar mazo P1"}
                </Button>
              }
            >
              {decks.map((deck) => (
                <Menu.Item
                  key={`p1_${deck.id}`}
                  onPress={() => {
                    setDeckP1Id(deck.id);
                    setOpenMenu(null);
                  }}
                  title={`${deck.icon || "🗂️"} ${deck.name}`}
                />
              ))}
            </Menu>

            <Menu
              visible={openMenu === "player2"}
              onDismiss={() => setOpenMenu(null)}
              anchor={
                <Button mode="outlined" onPress={() => setOpenMenu("player2")}>
                  {selectedDeckP2
                    ? `P2: ${selectedDeckP2.icon || "🗂️"} ${selectedDeckP2.name}`
                    : "Seleccionar mazo P2"}
                </Button>
              }
            >
              {decks.map((deck) => (
                <Menu.Item
                  key={`p2_${deck.id}`}
                  onPress={() => {
                    setDeckP2Id(deck.id);
                    setOpenMenu(null);
                  }}
                  title={`${deck.icon || "🗂️"} ${deck.name}`}
                />
              ))}
            </Menu>
          </View>

          <Button
            mode="contained"
            onPress={startMatch}
            disabled={isLoadingDecks || decks.length === 0}
          >
            Iniciar partida
          </Button>

          {isLoadingDecks ? (
            <Text variant="bodySmall" style={styles.helperText}>
              Cargando mazos...
            </Text>
          ) : decks.length === 0 ? (
            <Text variant="bodySmall" style={styles.helperText}>
              No hay mazos guardados. Crea mazos en "Mis Mazos".
            </Text>
          ) : null}
        </Surface>

        {board && boardView ? (
          <>
            <Surface mode="flat" style={styles.turnCard}>
              <View style={styles.turnRow}>
                <Chip compact>Turno {board.turn.number}</Chip>
                <Chip compact>
                  Activo:{" "}
                  {board.turn.currentPlayer === "player1"
                    ? "Jugador 1"
                    : "Jugador 2"}
                </Chip>
                <Chip compact>Fase: {board.turn.phase}</Chip>
              </View>

              <SegmentedButtons
                value={viewer}
                onValueChange={(value) => setViewer(value as PlayerId)}
                buttons={[
                  { value: "player1", label: "Ver P1" },
                  { value: "player2", label: "Ver P2" },
                ]}
              />
            </Surface>

            <Surface mode="flat" style={styles.zoneCard}>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Oponente
              </Text>
              <View style={styles.countsRow}>
                <Chip compact>Deck: {boardView.opponent.deckCount}</Chip>
                <Chip compact>Hand: {boardView.opponent.handCount}</Chip>
                <Chip compact>Prize: {boardView.opponent.prizeCount}</Chip>
                <Chip compact>Discard: {boardView.opponent.discardCount}</Chip>
              </View>

              <Text variant="labelLarge" style={styles.zoneLabel}>
                Active Spot
              </Text>
              <View style={styles.cardRow}>
                {boardView.opponent.active.length === 0 ? (
                  <Text variant="bodySmall">Sin Pokemon activo</Text>
                ) : (
                  boardView.opponent.active.map((card) => (
                    <Card
                      key={card.instanceId}
                      mode="outlined"
                      style={styles.cardItem}
                    >
                      {renderCardBody(card, true)}
                    </Card>
                  ))
                )}
              </View>

              <Text variant="labelLarge" style={styles.zoneLabel}>
                Bench ({boardView.opponent.bench.length}/5)
              </Text>
              <ScrollView
                horizontal
                nestedScrollEnabled
                directionalLockEnabled
                showsHorizontalScrollIndicator
                contentContainerStyle={styles.horizontalZoneContent}
              >
                <View style={styles.cardRow}>
                  {boardView.opponent.bench.length === 0 ? (
                    <Text variant="bodySmall">Banca vacia</Text>
                  ) : (
                    boardView.opponent.bench.map((card) => (
                      <Card
                        key={card.instanceId}
                        mode="outlined"
                        style={styles.cardItem}
                      >
                        {renderCardBody(card, true)}
                      </Card>
                    ))
                  )}
                </View>
              </ScrollView>

              <Text variant="labelLarge" style={styles.zoneLabel}>
                Discard (
                {getOpponentBoard(board, viewer).discard_pile.cards.length})
              </Text>
              <ScrollView
                horizontal
                nestedScrollEnabled
                directionalLockEnabled
                showsHorizontalScrollIndicator
                contentContainerStyle={styles.horizontalZoneContent}
              >
                <View style={styles.cardRow}>
                  {getOpponentBoard(board, viewer).discard_pile.cards.length ===
                  0 ? (
                    <Text variant="bodySmall">Descarte vacio</Text>
                  ) : (
                    getLastCards(
                      getOpponentBoard(board, viewer).discard_pile.cards,
                    ).map((card) => (
                      <Card
                        key={card.instanceId}
                        mode="outlined"
                        style={styles.cardItem}
                      >
                        {renderCardBody(card)}
                      </Card>
                    ))
                  )}
                </View>
              </ScrollView>
            </Surface>

            <Surface mode="flat" style={styles.zoneCard}>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Stadium
              </Text>
              {boardView.stadium.length === 0 ? (
                <Text variant="bodySmall">Sin estadio activo</Text>
              ) : (
                boardView.stadium.map((card) => (
                  <Card
                    key={card.instanceId}
                    mode="outlined"
                    style={styles.cardItemWide}
                  >
                    {renderCardBody(card)}
                  </Card>
                ))
              )}
            </Surface>

            <Surface mode="flat" style={styles.zoneCard}>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Tu lado
              </Text>

              <View style={styles.countsRow}>
                <Chip compact>Deck: {boardView.self.deckCount}</Chip>
                <Chip compact>Hand: {boardView.self.handCount}</Chip>
                <Chip compact>Prize: {boardView.self.prizeCount}</Chip>
                <Chip compact>Discard: {boardView.self.discardCount}</Chip>
                <Chip compact>Lost: {boardView.self.lostZoneCount}</Chip>
              </View>

              <Text variant="labelLarge" style={styles.zoneLabel}>
                Active Spot
              </Text>
              <View style={styles.cardRow}>
                {boardView.self.active.length === 0 ? (
                  <Text variant="bodySmall">Sin Pokemon activo</Text>
                ) : (
                  boardView.self.active.map((card) => {
                    const dragResponder = createDragResponder(
                      card,
                      "active_spot",
                    );

                    return (
                      <Card
                        key={card.instanceId}
                        mode="outlined"
                        style={styles.cardItem}
                      >
                        <View style={styles.zoneCardHeaderRow}>
                          <View
                            style={styles.dragTouchArea}
                            {...dragResponder.panHandlers}
                          >
                            <Pressable
                              onLongPress={(event) =>
                                armDrag(
                                  card,
                                  "active_spot",
                                  event.nativeEvent.pageX,
                                  event.nativeEvent.pageY,
                                )
                              }
                              delayLongPress={180}
                              onPressOut={disarmDragIfNotDragging}
                            >
                              <Text
                                variant="labelSmall"
                                style={[
                                  styles.dragHandle,
                                  isDragArmedFor(card, "active_spot")
                                    ? styles.dragHandleArmed
                                    : null,
                                ]}
                              >
                                Mantener y mover
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                        {renderCardBody(card, true)}
                      </Card>
                    );
                  })
                )}
              </View>

              <Text variant="labelLarge" style={styles.zoneLabel}>
                Bench ({boardView.self.bench.length}/5)
              </Text>
              <ScrollView
                horizontal
                nestedScrollEnabled
                directionalLockEnabled
                showsHorizontalScrollIndicator
                contentContainerStyle={styles.horizontalZoneContent}
              >
                <View style={styles.cardRow}>
                  {boardView.self.bench.length === 0 ? (
                    <Text variant="bodySmall">Banca vacia</Text>
                  ) : (
                    boardView.self.bench.map((card) => {
                      const dragResponder = createDragResponder(card, "bench");

                      return (
                        <Card
                          key={card.instanceId}
                          mode="outlined"
                          style={styles.cardItem}
                        >
                          <View style={styles.zoneCardHeaderRow}>
                            <View
                              style={styles.dragTouchArea}
                              {...dragResponder.panHandlers}
                            >
                              <Pressable
                                onLongPress={(event) =>
                                  armDrag(
                                    card,
                                    "bench",
                                    event.nativeEvent.pageX,
                                    event.nativeEvent.pageY,
                                  )
                                }
                                delayLongPress={180}
                                onPressOut={disarmDragIfNotDragging}
                              >
                                <Text
                                  variant="labelSmall"
                                  style={[
                                    styles.dragHandle,
                                    isDragArmedFor(card, "bench")
                                      ? styles.dragHandleArmed
                                      : null,
                                  ]}
                                >
                                  Mantener y mover
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                          {renderCardBody(card, true)}
                        </Card>
                      );
                    })
                  )}
                </View>
              </ScrollView>

              <Text variant="labelLarge" style={styles.zoneLabel}>
                Discard ({getSelfBoard(board, viewer).discard_pile.cards.length}
                )
              </Text>
              <ScrollView
                horizontal
                nestedScrollEnabled
                directionalLockEnabled
                showsHorizontalScrollIndicator
                contentContainerStyle={styles.horizontalZoneContent}
              >
                <View style={styles.cardRow}>
                  {getSelfBoard(board, viewer).discard_pile.cards.length ===
                  0 ? (
                    <Text variant="bodySmall">Descarte vacio</Text>
                  ) : (
                    getLastCards(
                      getSelfBoard(board, viewer).discard_pile.cards,
                    ).map((card) => (
                      <Card
                        key={card.instanceId}
                        mode="outlined"
                        style={styles.cardItem}
                      >
                        {renderCardBody(card)}
                      </Card>
                    ))
                  )}
                </View>
              </ScrollView>

              <Text variant="labelLarge" style={styles.zoneLabel}>
                Mano ({getSelfBoard(board, viewer).hand.cards.length})
              </Text>
              <View style={styles.dropTargetsRow}>
                <View
                  ref={(node) => {
                    dropTargetRefs.current.active_spot = node;
                  }}
                  style={[
                    styles.dropTarget,
                    hoverDropTarget === "active_spot"
                      ? styles.dropTargetActive
                      : null,
                  ]}
                >
                  <Text variant="labelSmall" style={styles.dropTargetLabel}>
                    Soltar: Active
                  </Text>
                </View>
                <View
                  ref={(node) => {
                    dropTargetRefs.current.bench = node;
                  }}
                  style={[
                    styles.dropTarget,
                    hoverDropTarget === "bench"
                      ? styles.dropTargetActive
                      : null,
                  ]}
                >
                  <Text variant="labelSmall" style={styles.dropTargetLabel}>
                    Soltar: Bench
                  </Text>
                </View>
                <View
                  ref={(node) => {
                    dropTargetRefs.current.discard_pile = node;
                  }}
                  style={[
                    styles.dropTarget,
                    hoverDropTarget === "discard_pile"
                      ? styles.dropTargetActive
                      : null,
                  ]}
                >
                  <Text variant="labelSmall" style={styles.dropTargetLabel}>
                    Soltar: Descartar
                  </Text>
                </View>
                <View
                  ref={(node) => {
                    dropTargetRefs.current.attach_active = node;
                  }}
                  style={[
                    styles.dropTarget,
                    hoverDropTarget === "attach_active"
                      ? styles.dropTargetActive
                      : null,
                  ]}
                >
                  <Text variant="labelSmall" style={styles.dropTargetLabel}>
                    Soltar: Adj. Active
                  </Text>
                </View>
              </View>
              <Text variant="labelSmall" style={styles.dragHintText}>
                Mantener presionado y luego arrastrar hacia un objetivo.
              </Text>
              <ScrollView
                horizontal
                nestedScrollEnabled
                directionalLockEnabled
                showsHorizontalScrollIndicator
                contentContainerStyle={styles.horizontalZoneContent}
                onLayout={(event) =>
                  setHandViewportWidth(event.nativeEvent.layout.width)
                }
                onContentSizeChange={(width) => setHandContentWidth(width)}
                onScroll={handleHandScroll}
                scrollEventThrottle={16}
              >
                <View style={styles.handRow}>
                  {getSelfBoard(board, viewer).hand.cards.length === 0 ? (
                    <Text variant="bodySmall">Mano vacia</Text>
                  ) : (
                    getSelfBoard(board, viewer).hand.cards.map((card) => {
                      const dragResponder = createDragResponder(card, "hand");
                      const isPokemon = card.profile.category === "pokemon";
                      const maxHp = Math.max(0, card.profile.maxHp ?? 0);
                      const damage = Math.max(0, card.damageCounters * 10);

                      return (
                        <Card
                          key={card.instanceId}
                          mode="outlined"
                          style={styles.handCard}
                        >
                          <Card.Content style={styles.cardContent}>
                            <View style={styles.handCardTopRow}>
                              <View
                                style={styles.dragTouchArea}
                                {...dragResponder.panHandlers}
                              >
                                <Pressable
                                  onLongPress={(event) =>
                                    armDrag(
                                      card,
                                      "hand",
                                      event.nativeEvent.pageX,
                                      event.nativeEvent.pageY,
                                    )
                                  }
                                  delayLongPress={180}
                                  onPressOut={disarmDragIfNotDragging}
                                >
                                  <Text
                                    variant="labelSmall"
                                    style={[
                                      styles.dragHandle,
                                      isDragArmedFor(card, "hand")
                                        ? styles.dragHandleArmed
                                        : null,
                                    ]}
                                  >
                                    Mantener y mover
                                  </Text>
                                </Pressable>
                              </View>
                            </View>
                            {resolveCardImage(card) ? (
                              <Image
                                source={{
                                  uri: resolveCardImage(card) ?? undefined,
                                }}
                                style={styles.cardImage}
                                contentFit="cover"
                              />
                            ) : (
                              <View style={styles.cardImageFallback}>
                                <Text variant="labelSmall">Sin imagen</Text>
                              </View>
                            )}
                            <Text numberOfLines={1}>
                              {resolveCardLabel(card)}
                            </Text>
                            {isPokemon && maxHp > 0 ? (
                              <Text variant="labelSmall">
                                HP: {Math.max(0, maxHp - damage)}/{maxHp}
                              </Text>
                            ) : null}
                          </Card.Content>
                          <Card.Actions style={styles.handActions}>
                            <Button
                              compact
                              mode="text"
                              onPress={() =>
                                moveCardFromHand(card, "active_spot")
                              }
                              disabled={!isViewerTurn}
                            >
                              Active
                            </Button>
                            <Button
                              compact
                              mode="text"
                              onPress={() => moveCardFromHand(card, "bench")}
                              disabled={!isViewerTurn}
                            >
                              Bench
                            </Button>
                            <Button
                              compact
                              mode="text"
                              onPress={() =>
                                moveCardFromHand(card, "discard_pile")
                              }
                              disabled={!isViewerTurn}
                            >
                              Descartar
                            </Button>
                            <Button
                              compact
                              mode="text"
                              onPress={() => attachFromHandToActive(card)}
                              disabled={!isViewerTurn}
                            >
                              Adj. Activo
                            </Button>
                          </Card.Actions>
                        </Card>
                      );
                    })
                  )}
                </View>
              </ScrollView>
              {handCanScroll ? (
                <View style={styles.handScrollTrack}>
                  <View
                    style={[
                      styles.handScrollThumb,
                      {
                        width: handThumbWidth,
                        transform: [{ translateX: handThumbOffset }],
                      },
                    ]}
                  />
                </View>
              ) : null}
              {handCanScroll ? (
                <Text variant="labelSmall" style={styles.scrollHintText}>
                  Desliza la mano a izquierda y derecha
                </Text>
              ) : null}

              <Divider style={styles.divider} />

              <View style={styles.actionsRow}>
                <Button
                  mode="contained-tonal"
                  onPress={drawOneCard}
                  disabled={!isViewerTurn}
                >
                  Robar
                </Button>
                <Button
                  mode="contained-tonal"
                  onPress={takeOnePrize}
                  disabled={!isViewerTurn}
                >
                  Premio
                </Button>
                <Button
                  mode="contained-tonal"
                  onPress={knockOutOpponentActive}
                  disabled={!isViewerTurn}
                >
                  KO rival
                </Button>
                <Button
                  mode="contained"
                  onPress={endTurn}
                  disabled={!isViewerTurn}
                >
                  Pasar turno
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => void saveCurrentMatch()}
                  disabled={isSavingMatch}
                >
                  {isSavingMatch ? "Guardando..." : "Guardar partida"}
                </Button>
              </View>

              {board.turn.mustChooseNewActive ? (
                <Button
                  mode="contained"
                  onPress={chooseNewActiveFromBench}
                  style={styles.forcedButton}
                >
                  Elegir Active desde Bench
                </Button>
              ) : null}

              {!isViewerTurn ? (
                <Text variant="bodySmall" style={styles.helperText}>
                  Cambia a la vista del jugador activo para ejecutar acciones.
                </Text>
              ) : null}
            </Surface>

            <Surface mode="flat" style={styles.zoneCard}>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Action log
              </Text>
              {board.actionLog.length === 0 ? (
                <Text variant="bodySmall">Sin acciones registradas</Text>
              ) : (
                board.actionLog
                  .slice(-8)
                  .reverse()
                  .map((action) => (
                    <View key={action.id} style={styles.logItem}>
                      <Text variant="labelMedium">
                        {formatActionLabel(action.type)} - {action.actor}
                      </Text>
                      <Text variant="bodySmall" numberOfLines={1}>
                        {new Date(action.timestamp).toLocaleTimeString()}
                      </Text>
                    </View>
                  ))
              )}
            </Surface>
          </>
        ) : null}
      </ScrollView>

      {draggedCardState ? (
        <View pointerEvents="none" style={styles.dragPreviewLayer}>
          <Card
            mode="elevated"
            style={[
              styles.dragPreviewCard,
              {
                left: dragPointer.x - 95,
                top: dragPointer.y - 160,
              },
            ]}
          >
            {renderCardBody(draggedCardState.card)}
          </Card>
        </View>
      ) : null}

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2400}
      >
        {snackbarMessage}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f2e7",
  },
  contentContainer: {
    padding: 12,
    paddingBottom: 120,
    gap: 10,
  },
  title: {
    color: "#2b1f08",
    fontWeight: "800",
  },
  setupCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ecdca9",
    backgroundColor: "#fffdf7",
    gap: 10,
  },
  sectionTitle: {
    color: "#2b1f08",
    fontWeight: "700",
  },
  selectorRow: {
    gap: 8,
  },
  helperText: {
    color: "#5a4722",
  },
  turnCard: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ecdca9",
    backgroundColor: "#fffdf7",
    gap: 8,
  },
  turnRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  zoneCard: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ecdca9",
    backgroundColor: "#fffdf7",
    gap: 8,
  },
  countsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  zoneLabel: {
    color: "#5a4722",
    marginTop: 2,
  },
  cardRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  cardItem: {
    minWidth: 140,
    maxWidth: 180,
  },
  cardContent: {
    gap: 6,
  },
  cardImage: {
    width: "100%",
    height: 130,
    borderRadius: 8,
    backgroundColor: "#f0e5cf",
  },
  cardImageFallback: {
    width: "100%",
    height: 130,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ecdca9",
    backgroundColor: "#fff8ea",
    alignItems: "center",
    justifyContent: "center",
  },
  cardItemWide: {
    width: "100%",
  },
  handRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "stretch",
  },
  horizontalZoneContent: {
    paddingRight: 8,
  },
  handScrollTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#ead8b0",
    overflow: "hidden",
    marginTop: 2,
    marginBottom: 4,
  },
  handScrollThumb: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#8c6f2f",
  },
  scrollHintText: {
    color: "#7a632f",
    marginTop: -2,
  },
  dropTargetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 2,
  },
  dropTarget: {
    flexGrow: 1,
    flexBasis: "48%",
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ecdca9",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff8ea",
  },
  dropTargetLabel: {
    color: "#4d3a18",
    fontWeight: "700",
  },
  dropTargetActive: {
    borderColor: "#8c6f2f",
    backgroundColor: "#f9efcf",
  },
  dragHintText: {
    color: "#7a632f",
    marginTop: -2,
  },
  handCard: {
    width: 230,
  },
  handCardTopRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingBottom: 4,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  zoneCardHeaderRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  dragTouchArea: {
    minHeight: 40,
    minWidth: 128,
    alignItems: "center",
    justifyContent: "center",
  },
  dragHandle: {
    borderWidth: 1,
    borderColor: "#d7be7f",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fff3d1",
    color: "#5a4722",
    overflow: "hidden",
  },
  dragHandleArmed: {
    borderColor: "#8c6f2f",
    backgroundColor: "#f4dfaa",
    color: "#3f2f10",
  },
  handActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  divider: {
    marginVertical: 4,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  forcedButton: {
    alignSelf: "flex-start",
  },
  logItem: {
    borderWidth: 1,
    borderColor: "#ecdca9",
    borderRadius: 10,
    padding: 8,
    backgroundColor: "#fff7e6",
  },
  dragPreviewLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  dragPreviewCard: {
    position: "absolute",
    width: 170,
    opacity: 0.82,
  },
});

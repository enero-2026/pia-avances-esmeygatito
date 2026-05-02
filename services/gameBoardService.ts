import { DeckEntryInput } from "@/services/tcgdexService";

export type PlayerId = "player1" | "player2";
export type ZoneOwner = PlayerId | "shared";

export type PlayerZoneName =
  | "deck"
  | "hand"
  | "active_spot"
  | "bench"
  | "prize_cards"
  | "discard_pile"
  | "lost_zone";

export type SharedZoneName = "stadium";
export type ZoneName = PlayerZoneName | SharedZoneName;
export type Visibility = "public" | "owner_only";

export type BoardPhase = "draw" | "main" | "attack" | "between_turns";
export type SpecialCondition =
  | "none"
  | "burned"
  | "poisoned"
  | "asleep"
  | "paralyzed"
  | "confused";

export interface CardProfile {
  category?: "pokemon" | "trainer" | "energy" | "unknown";
  stage?: "basic" | "stage1" | "stage2" | "vmax" | "vstar" | "other";
  trainerType?: "item" | "supporter" | "stadium" | "tool" | "other";
  energyType?: "normal" | "special" | "other";
  maxHp?: number;
  retreatCost?: number;
  hasRuleBox?: boolean;
  isTagTeam?: boolean;
}

export interface BoardCard {
  instanceId: string;
  cardId: string;
  name: string;
  owner: PlayerId;
  attachments: BoardCard[];
  profile: CardProfile;
  damageCounters: number;
  specialCondition: SpecialCondition;
  rotation: 0 | 90 | -90 | 180;
  poisonCountersPerTurn: number;
  turnPlayedOrEvolved: number;
}

export interface BoardZone {
  name: ZoneName;
  owner: ZoneOwner;
  visibility: Visibility;
  maxCapacity: number | null;
  isTerminal: boolean;
  cards: BoardCard[];
}

export interface PlayerBoard {
  deck: BoardZone;
  hand: BoardZone;
  active_spot: BoardZone;
  bench: BoardZone;
  prize_cards: BoardZone;
  discard_pile: BoardZone;
  lost_zone: BoardZone;
}

export interface TurnState {
  number: number;
  currentPlayer: PlayerId;
  firstPlayer: PlayerId;
  phase: BoardPhase;
  isFirstTurnOfGame: boolean;
  energyAttachedThisTurn: boolean;
  retreatUsed: boolean;
  supporterPlayedThisTurn: boolean;
  stadiumPlayedThisTurn: boolean;
  attackedThisTurn: boolean;
  extraEnergyAttaches: number;
  mustChooseNewActive: boolean;
  mustChoosePrizeCard: boolean;
}

export interface BoardState {
  player1: PlayerBoard;
  player2: PlayerBoard;
  stadium: BoardZone;
  turn: TurnState;
  actionLog: BoardAction[];
}

export type BoardActionType =
  | "move"
  | "draw"
  | "attach"
  | "ko"
  | "prize"
  | "setup"
  | "turn"
  | "condition"
  | "retreat"
  | "resolve_active";

export interface BoardAction {
  id: string;
  timestamp: string;
  type: BoardActionType;
  actor: PlayerId;
  payload: Record<string, unknown>;
}

export type BoardIssueCode =
  | "ZONE_CAPACITY_REACHED"
  | "LOST_ZONE_NO_EXIT"
  | "CARD_NOT_FOUND"
  | "INVALID_OWNER"
  | "INVALID_MOVE"
  | "INVALID_SETUP"
  | "NO_BENCH_REPLACEMENT"
  | "NOT_ACTIVE_PLAYER"
  | "TURN_PHASE_BLOCKED"
  | "ENERGY_ATTACH_LIMIT_REACHED"
  | "RETREAT_ALREADY_USED"
  | "RETREAT_BLOCKED_BY_CONDITION"
  | "RETREAT_NOT_ENOUGH_ENERGY"
  | "SUPPORTER_LIMIT_REACHED"
  | "SUPPORTER_BLOCKED_FIRST_TURN"
  | "STADIUM_LIMIT_REACHED"
  | "MUST_CHOOSE_NEW_ACTIVE"
  | "DECK_EMPTY";

export interface BoardIssue {
  code: BoardIssueCode;
  message: string;
}

export interface BoardResult {
  ok: boolean;
  board: BoardState;
  issue?: BoardIssue;
}

export interface ZoneRef {
  owner: ZoneOwner;
  zone: ZoneName;
}

export interface MoveCardInput {
  actor: PlayerId;
  from: ZoneRef;
  to: ZoneRef;
  cardInstanceId?: string;
  reason?: string;
}

export interface DrawCardInput {
  actor: PlayerId;
  player: PlayerId;
  count?: number;
}

export interface AttachCardInput {
  actor: PlayerId;
  player: PlayerId;
  fromZone: "hand";
  sourceInstanceId: string;
  hostZone: "active_spot" | "bench";
  hostInstanceId: string;
}

export interface KnockOutInput {
  actor: PlayerId;
  targetPlayer: PlayerId;
  sourceZone: "active_spot" | "bench";
  sourceInstanceId: string;
}

export interface TakePrizeInput {
  actor: PlayerId;
  player: PlayerId;
  count?: number;
  allowOutOfTurn?: boolean;
}

export interface SetupInput {
  player1Deck: DeckEntryInput[];
  player2Deck: DeckEntryInput[];
  startingPlayer?: PlayerId;
  shuffle?: boolean;
  cardProfiles?: Record<string, CardProfile>;
}

export interface SelectNewActiveInput {
  actor: PlayerId;
  player: PlayerId;
  benchInstanceId: string;
}

export interface RetreatInput {
  actor: PlayerId;
  player: PlayerId;
  benchInstanceId: string;
  discardEnergyInstanceIds?: string[];
}

export interface SetSpecialConditionInput {
  actor: PlayerId;
  player: PlayerId;
  condition: Exclude<SpecialCondition, "none">;
}

export interface PlayerBoardPublicView {
  deckCount: number;
  handCount: number;
  prizeCount: number;
  lostZoneCount: number;
  discardCount: number;
  active: BoardCard[];
  bench: BoardCard[];
}

export interface BoardPublicView {
  self: PlayerBoardPublicView;
  opponent: PlayerBoardPublicView;
  stadium: BoardCard[];
}

const PLAYER_ZONES: Array<{
  name: PlayerZoneName;
  maxCapacity: number | null;
  visibility: Visibility;
  isTerminal: boolean;
}> = [
  { name: "deck", maxCapacity: 60, visibility: "owner_only", isTerminal: false },
  { name: "hand", maxCapacity: null, visibility: "owner_only", isTerminal: false },
  { name: "active_spot", maxCapacity: 1, visibility: "public", isTerminal: false },
  { name: "bench", maxCapacity: 5, visibility: "public", isTerminal: false },
  { name: "prize_cards", maxCapacity: 6, visibility: "owner_only", isTerminal: false },
  { name: "discard_pile", maxCapacity: null, visibility: "public", isTerminal: false },
  { name: "lost_zone", maxCapacity: null, visibility: "public", isTerminal: true },
];

const STADIUM_ZONE = {
  name: "stadium" as const,
  maxCapacity: 1,
  visibility: "public" as const,
  isTerminal: false,
};

function fail(board: BoardState, code: BoardIssueCode, message: string): BoardResult {
  return {
    ok: false,
    board,
    issue: { code, message },
  };
}

function cloneCard(card: BoardCard): BoardCard {
  return {
    ...card,
    profile: { ...card.profile },
    attachments: card.attachments.map((item) => cloneCard(item)),
  };
}

function cloneZone(zone: BoardZone): BoardZone {
  return {
    ...zone,
    cards: zone.cards.map((card) => cloneCard(card)),
  };
}

function cloneBoard(board: BoardState): BoardState {
  return {
    player1: {
      deck: cloneZone(board.player1.deck),
      hand: cloneZone(board.player1.hand),
      active_spot: cloneZone(board.player1.active_spot),
      bench: cloneZone(board.player1.bench),
      prize_cards: cloneZone(board.player1.prize_cards),
      discard_pile: cloneZone(board.player1.discard_pile),
      lost_zone: cloneZone(board.player1.lost_zone),
    },
    player2: {
      deck: cloneZone(board.player2.deck),
      hand: cloneZone(board.player2.hand),
      active_spot: cloneZone(board.player2.active_spot),
      bench: cloneZone(board.player2.bench),
      prize_cards: cloneZone(board.player2.prize_cards),
      discard_pile: cloneZone(board.player2.discard_pile),
      lost_zone: cloneZone(board.player2.lost_zone),
    },
    stadium: cloneZone(board.stadium),
    turn: { ...board.turn },
    actionLog: [...board.actionLog],
  };
}

function buildAction(
  type: BoardActionType,
  actor: PlayerId,
  payload: Record<string, unknown>,
): BoardAction {
  return {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    type,
    actor,
    payload,
  };
}

function normalizeDeckEntries(entries: DeckEntryInput[]): DeckEntryInput[] {
  const grouped = new Map<string, number>();

  for (const entry of entries) {
    const cardId = entry.cardId.trim();
    const quantity = Number.isFinite(entry.quantity) ? Math.floor(entry.quantity) : 0;

    if (!cardId || quantity <= 0) {
      continue;
    }

    grouped.set(cardId, (grouped.get(cardId) ?? 0) + quantity);
  }

  return Array.from(grouped.entries()).map(([cardId, quantity]) => ({
    cardId,
    quantity,
  }));
}

function normalizeProfile(raw?: CardProfile): CardProfile {
  return {
    category: raw?.category ?? "unknown",
    stage: raw?.stage ?? "other",
    trainerType: raw?.trainerType ?? "other",
    energyType: raw?.energyType ?? "other",
    maxHp: Number.isFinite(raw?.maxHp) ? Math.max(0, Math.floor(raw?.maxHp as number)) : 0,
    retreatCost: Number.isFinite(raw?.retreatCost)
      ? Math.max(0, Math.floor(raw?.retreatCost as number))
      : 0,
    hasRuleBox: raw?.hasRuleBox === true,
    isTagTeam: raw?.isTagTeam === true,
  };
}

function buildDeckCards(
  player: PlayerId,
  entries: DeckEntryInput[],
  cardProfiles: Record<string, CardProfile>,
  turnNumber: number,
): BoardCard[] {
  const cards: BoardCard[] = [];

  entries.forEach((entry) => {
    for (let index = 0; index < entry.quantity; index += 1) {
      const profile = normalizeProfile(cardProfiles[entry.cardId]);

      cards.push({
        instanceId: `${player}_${entry.cardId}_${index}_${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        cardId: entry.cardId,
        name: entry.cardId,
        owner: player,
        attachments: [],
        profile,
        damageCounters: 0,
        specialCondition: "none",
        rotation: 0,
        poisonCountersPerTurn: 1,
        turnPlayedOrEvolved: turnNumber,
      });
    }
  });

  return cards;
}

function shuffleCards<T>(cards: T[]): T[] {
  const clone = [...cards];

  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }

  return clone;
}

function createPlayerBoard(player: PlayerId): PlayerBoard {
  const zoneRecord = PLAYER_ZONES.reduce((acc, cfg) => {
    acc[cfg.name] = {
      name: cfg.name,
      owner: player,
      visibility: cfg.visibility,
      maxCapacity: cfg.maxCapacity,
      isTerminal: cfg.isTerminal,
      cards: [],
    };
    return acc;
  }, {} as Record<PlayerZoneName, BoardZone>);

  return {
    deck: zoneRecord.deck,
    hand: zoneRecord.hand,
    active_spot: zoneRecord.active_spot,
    bench: zoneRecord.bench,
    prize_cards: zoneRecord.prize_cards,
    discard_pile: zoneRecord.discard_pile,
    lost_zone: zoneRecord.lost_zone,
  };
}

function resolveZone(board: BoardState, ref: ZoneRef): BoardZone | null {
  if (ref.owner === "shared") {
    return ref.zone === "stadium" ? board.stadium : null;
  }

  const playerZones = ref.owner === "player1" ? board.player1 : board.player2;

  if (ref.zone === "stadium") {
    return null;
  }

  return playerZones[ref.zone];
}

function removeTopCard(zone: BoardZone): BoardCard | null {
  if (zone.cards.length === 0) {
    return null;
  }

  return zone.cards.pop() ?? null;
}

function removeSpecificCard(zone: BoardZone, instanceId: string): BoardCard | null {
  const index = zone.cards.findIndex((card) => card.instanceId === instanceId);

  if (index < 0) {
    return null;
  }

  const [removed] = zone.cards.splice(index, 1);
  return removed ?? null;
}

function pushCardWithCapacity(zone: BoardZone, card: BoardCard): BoardIssue | null {
  if (zone.maxCapacity !== null && zone.cards.length >= zone.maxCapacity) {
    return {
      code: "ZONE_CAPACITY_REACHED",
      message: `La zona ${zone.name} alcanzó su límite (${zone.maxCapacity}).`,
    };
  }

  zone.cards.push(card);
  return null;
}

function mapPlayerView(board: BoardState, player: PlayerId): PlayerBoardPublicView {
  const own = player === "player1" ? board.player1 : board.player2;

  return {
    deckCount: own.deck.cards.length,
    handCount: own.hand.cards.length,
    prizeCount: own.prize_cards.cards.length,
    lostZoneCount: own.lost_zone.cards.length,
    discardCount: own.discard_pile.cards.length,
    active: own.active_spot.cards.map((card) => cloneCard(card)),
    bench: own.bench.cards.map((card) => cloneCard(card)),
  };
}

function getPlayerBoard(board: BoardState, player: PlayerId): PlayerBoard {
  return player === "player1" ? board.player1 : board.player2;
}

function getOpponent(player: PlayerId): PlayerId {
  return player === "player1" ? "player2" : "player1";
}

function countEnergyAttachments(card: BoardCard): number {
  return card.attachments.filter(
    (item) => item.profile.category === "energy" || item.profile.energyType !== "other",
  ).length;
}

function toRotation(condition: SpecialCondition): 0 | 90 | -90 | 180 {
  if (condition === "asleep") {
    return -90;
  }

  if (condition === "paralyzed") {
    return 90;
  }

  if (condition === "confused") {
    return 180;
  }

  return 0;
}

function clearSpecialCondition(card: BoardCard): void {
  card.specialCondition = "none";
  card.rotation = 0;
}

function setSpecialCondition(card: BoardCard, condition: SpecialCondition): void {
  card.specialCondition = condition;
  card.rotation = toRotation(condition);
}

function isCardKnockedOut(card: BoardCard): boolean {
  const maxHp = card.profile.maxHp ?? 0;

  if (maxHp <= 0) {
    return false;
  }

  return card.damageCounters * 10 >= maxHp;
}

function coinFlipHeads(): boolean {
  return Math.random() >= 0.5;
}

function resetTurnFlags(turn: TurnState): TurnState {
  return {
    ...turn,
    energyAttachedThisTurn: false,
    retreatUsed: false,
    supporterPlayedThisTurn: false,
    stadiumPlayedThisTurn: false,
    attackedThisTurn: false,
    extraEnergyAttaches: 0,
    mustChooseNewActive: false,
    mustChoosePrizeCard: false,
  };
}

function assertActionAllowed(board: BoardState, actor: PlayerId): BoardResult | null {
  if (board.turn.currentPlayer !== actor) {
    return fail(board, "NOT_ACTIVE_PLAYER", "No es tu turno para ejecutar esta acción.");
  }

  if (board.turn.mustChooseNewActive) {
    return fail(
      board,
      "MUST_CHOOSE_NEW_ACTIVE",
      "Debes elegir un nuevo Pokémon Activo antes de continuar.",
    );
  }

  return null;
}

function resolveKo(
  board: BoardState,
  knockedOutOwner: PlayerId,
  knockedOutZone: "active_spot" | "bench",
  knockedOutCard: BoardCard,
  actor: PlayerId,
): BoardResult {
  const ownerBoard = getPlayerBoard(board, knockedOutOwner);
  const ownerDiscard = ownerBoard.discard_pile;
  const attacker = getOpponent(knockedOutOwner);

  ownerDiscard.cards.push(knockedOutCard);

  const prizeCount = knockedOutCard.profile.isTagTeam
    ? 3
    : knockedOutCard.profile.hasRuleBox
      ? 2
      : 1;

  let prizeResult: BoardResult = { ok: true, board };
  if (prizeCount > 0) {
    prizeResult = GameBoardService.takePrizeCards(board, {
      actor,
      player: attacker,
      count: prizeCount,
      allowOutOfTurn: true,
    });

    if (!prizeResult.ok) {
      return prizeResult;
    }
  }

  const next = cloneBoard(prizeResult.board);
  next.actionLog.push(
    buildAction("ko", actor, {
      targetPlayer: knockedOutOwner,
      sourceZone: knockedOutZone,
      cardId: knockedOutCard.cardId,
      instanceId: knockedOutCard.instanceId,
      prizeCount,
    }),
  );

  if (knockedOutZone === "active_spot") {
    const refreshedOwnerBoard = getPlayerBoard(next, knockedOutOwner);

    if (refreshedOwnerBoard.bench.cards.length === 0) {
      return fail(
        next,
        "NO_BENCH_REPLACEMENT",
        "El jugador no tiene Bench para reemplazar el Active Spot tras KO.",
      );
    }

    next.turn.mustChooseNewActive = true;
  }

  return { ok: true, board: next };
}

export const GameBoardService = {
  createBoard(input: SetupInput): BoardResult {
    const player1Entries = normalizeDeckEntries(input.player1Deck);
    const player2Entries = normalizeDeckEntries(input.player2Deck);

    const player1Total = player1Entries.reduce((sum, entry) => sum + entry.quantity, 0);
    const player2Total = player2Entries.reduce((sum, entry) => sum + entry.quantity, 0);

    const baseBoard: BoardState = {
      player1: createPlayerBoard("player1"),
      player2: createPlayerBoard("player2"),
      stadium: {
        name: STADIUM_ZONE.name,
        owner: "shared",
        visibility: STADIUM_ZONE.visibility,
        maxCapacity: STADIUM_ZONE.maxCapacity,
        isTerminal: STADIUM_ZONE.isTerminal,
        cards: [],
      },
      turn: {
        number: 1,
        currentPlayer: input.startingPlayer ?? "player1",
        firstPlayer: input.startingPlayer ?? "player1",
        phase: "main",
        isFirstTurnOfGame: true,
        energyAttachedThisTurn: false,
        retreatUsed: false,
        supporterPlayedThisTurn: false,
        stadiumPlayedThisTurn: false,
        attackedThisTurn: false,
        extraEnergyAttaches: 0,
        mustChooseNewActive: false,
        mustChoosePrizeCard: false,
      },
      actionLog: [],
    };

    if (player1Total !== 60 || player2Total !== 60) {
      return fail(
        baseBoard,
        "INVALID_SETUP",
        "Ambos mazos deben iniciar con exactamente 60 cartas.",
      );
    }

    const profiles = input.cardProfiles ?? {};
    const player1DeckCards = buildDeckCards("player1", player1Entries, profiles, 0);
    const player2DeckCards = buildDeckCards("player2", player2Entries, profiles, 0);

    baseBoard.player1.deck.cards =
      input.shuffle === false ? player1DeckCards : shuffleCards(player1DeckCards);
    baseBoard.player2.deck.cards =
      input.shuffle === false ? player2DeckCards : shuffleCards(player2DeckCards);

    baseBoard.actionLog.push(
      buildAction("setup", baseBoard.turn.currentPlayer, {
        message: "Board creado con mazos validados de 60 cartas por jugador.",
      }),
    );

    return { ok: true, board: baseBoard };
  },

  runInitialSetup(board: BoardState): BoardResult {
    let current = cloneBoard(board);

    const drawFromDeckToHand = (player: PlayerId, count: number): BoardResult => {
      const next = cloneBoard(current);
      const playerBoard = getPlayerBoard(next, player);

      for (let index = 0; index < count; index += 1) {
        const card = playerBoard.deck.cards.pop();
        if (!card) {
          return fail(next, "DECK_EMPTY", `No hay suficientes cartas para setup de ${player}.`);
        }
        playerBoard.hand.cards.push(card);
      }

      current = next;
      return { ok: true, board: next };
    };

    const takeDeckToPrize = (player: PlayerId, count: number): BoardResult => {
      const next = cloneBoard(current);
      const playerBoard = getPlayerBoard(next, player);

      for (let index = 0; index < count; index += 1) {
        const card = playerBoard.deck.cards.pop();
        if (!card) {
          return fail(next, "DECK_EMPTY", `No hay suficientes cartas de premio para ${player}.`);
        }
        playerBoard.prize_cards.cards.push(card);
      }

      current = next;
      return { ok: true, board: next };
    };

    const drawP1 = drawFromDeckToHand("player1", 7);
    if (!drawP1.ok) {
      return drawP1;
    }

    const drawP2 = drawFromDeckToHand("player2", 7);
    if (!drawP2.ok) {
      return drawP2;
    }

    const prizeP1 = takeDeckToPrize("player1", 6);
    if (!prizeP1.ok) {
      return prizeP1;
    }

    const prizeP2 = takeDeckToPrize("player2", 6);
    if (!prizeP2.ok) {
      return prizeP2;
    }

    current.turn.phase = "main";

    current.actionLog.push(
      buildAction("setup", current.turn.currentPlayer, {
        message: "Setup inicial aplicado: robo 7 + 6 prize por jugador.",
        todo: "Mulligan y sudden death quedan para Semana 7+.",
      }),
    );

    return { ok: true, board: current };
  },

  moveCard(board: BoardState, input: MoveCardInput): BoardResult {
    const next = cloneBoard(board);
    const reason = input.reason ?? "manual_move";
    const isSystemMove = reason === "draw" || reason === "setup_prize" || reason === "prize_take";

    if (!isSystemMove) {
      const precheck = assertActionAllowed(next, input.actor);

      if (precheck) {
        return precheck;
      }
    }

    const fromZone = resolveZone(next, input.from);
    const toZone = resolveZone(next, input.to);

    if (!fromZone || !toZone) {
      return fail(next, "INVALID_MOVE", "Zona origen o destino inválida.");
    }

    if (fromZone.name === "lost_zone") {
      return fail(next, "LOST_ZONE_NO_EXIT", "Lost Zone no permite salidas.");
    }

    if (input.from.owner !== "shared" && input.actor !== input.from.owner) {
      return fail(next, "INVALID_OWNER", "No puedes mover cartas desde zonas del oponente.");
    }

    if (input.to.owner !== "shared" && input.actor !== input.to.owner) {
      return fail(
        next,
        "INVALID_OWNER",
        "No puedes mover cartas directamente a zonas privadas del oponente.",
      );
    }

    if (fromZone.name === "deck" && reason !== "draw" && reason !== "setup_prize") {
      return fail(next, "INVALID_MOVE", "No se puede mover desde Deck sin efecto autorizado.");
    }

    if (fromZone.name === "prize_cards" && reason !== "prize_take") {
      return fail(next, "INVALID_MOVE", "Prize Cards solo se toman al cobrar premio.");
    }

    const card = input.cardInstanceId
      ? removeSpecificCard(fromZone, input.cardInstanceId)
      : removeTopCard(fromZone);

    if (!card) {
      return fail(next, "CARD_NOT_FOUND", "No se encontró la carta en la zona origen.");
    }

    if (toZone.name === "stadium") {
      if (next.turn.stadiumPlayedThisTurn) {
        fromZone.cards.push(card);
        return fail(next, "STADIUM_LIMIT_REACHED", "Solo puedes jugar 1 Stadium por turno.");
      }

      if (toZone.cards.length > 0 && toZone.cards[0].name === card.name) {
        fromZone.cards.push(card);
        return fail(next, "INVALID_MOVE", "No puedes jugar un Stadium con el mismo nombre del activo.");
      }

      const previousStadium = toZone.cards.pop() ?? null;
      if (previousStadium) {
        const ownerDiscard =
          previousStadium.owner === "player1"
            ? next.player1.discard_pile
            : next.player2.discard_pile;
        ownerDiscard.cards.push(previousStadium);
      }

      next.turn.stadiumPlayedThisTurn = true;
    }

    if (fromZone.name === "hand" && toZone.name === "bench") {
      if (card.profile.category !== "pokemon" || card.profile.stage !== "basic") {
        fromZone.cards.push(card);
        return fail(next, "INVALID_MOVE", "Solo Pokémon Básico puede jugarse a la banca directamente.");
      }

      card.turnPlayedOrEvolved = next.turn.number;
    }

    if (fromZone.name === "hand" && toZone.name === "active_spot") {
      if (card.profile.category !== "pokemon" || card.profile.stage !== "basic") {
        fromZone.cards.push(card);
        return fail(next, "INVALID_MOVE", "Solo Pokémon Básico puede ir al Active Spot desde mano.");
      }

      if (toZone.cards.length > 0) {
        fromZone.cards.push(card);
        return fail(next, "INVALID_MOVE", "Ya existe un Pokémon en Active Spot.");
      }

      card.turnPlayedOrEvolved = next.turn.number;
    }

    const capacityIssue = pushCardWithCapacity(toZone, card);
    if (capacityIssue) {
      fromZone.cards.push(card);
      return {
        ok: false,
        board: next,
        issue: capacityIssue,
      };
    }

    if (fromZone.name === "hand" && toZone.name === "discard_pile") {
      if (card.profile.trainerType === "supporter") {
        if (next.turn.isFirstTurnOfGame && input.actor === next.turn.firstPlayer) {
          toZone.cards.pop();
          fromZone.cards.push(card);
          return fail(
            next,
            "SUPPORTER_BLOCKED_FIRST_TURN",
            "El primer jugador no puede jugar Supporter en su primer turno.",
          );
        }

        if (next.turn.supporterPlayedThisTurn) {
          toZone.cards.pop();
          fromZone.cards.push(card);
          return fail(next, "SUPPORTER_LIMIT_REACHED", "Solo puedes jugar 1 Supporter por turno.");
        }

        next.turn.supporterPlayedThisTurn = true;
      }
    }

    next.actionLog.push(
      buildAction("move", input.actor, {
        from: `${input.from.owner}:${input.from.zone}`,
        to: `${input.to.owner}:${input.to.zone}`,
        cardId: card.cardId,
        instanceId: card.instanceId,
        reason,
      }),
    );

    return { ok: true, board: next };
  },

  drawCards(board: BoardState, input: DrawCardInput): BoardResult {
    const total = Math.max(1, Math.floor(input.count ?? 1));
    let current = cloneBoard(board);

    if (current.turn.currentPlayer !== input.actor) {
      return fail(current, "NOT_ACTIVE_PLAYER", "Solo el jugador activo puede robar cartas.");
    }

    for (let index = 0; index < total; index += 1) {
      if (getPlayerBoard(current, input.player).deck.cards.length === 0) {
        return fail(current, "DECK_EMPTY", "No hay cartas para robar en el Deck.");
      }

      const result = this.moveCard(current, {
        actor: input.actor,
        from: { owner: input.player, zone: "deck" },
        to: { owner: input.player, zone: "hand" },
        reason: "draw",
      });

      if (!result.ok) {
        return result;
      }

      current = result.board;
    }

    current.actionLog.push(
      buildAction("draw", input.actor, {
        player: input.player,
        count: total,
      }),
    );

    return { ok: true, board: current };
  },

  attachFromHand(board: BoardState, input: AttachCardInput): BoardResult {
    const next = cloneBoard(board);
    const precheck = assertActionAllowed(next, input.actor);

    if (precheck) {
      return precheck;
    }

    const sourceZone = input.player === "player1" ? next.player1.hand : next.player2.hand;
    const hostZone =
      input.player === "player1"
        ? next.player1[input.hostZone]
        : next.player2[input.hostZone];

    if (input.actor !== input.player) {
      return fail(next, "INVALID_OWNER", "Solo puedes adjuntar cartas a tus propios Pokémon.");
    }

    const sourceCard = removeSpecificCard(sourceZone, input.sourceInstanceId);
    if (!sourceCard) {
      return fail(next, "CARD_NOT_FOUND", "No se encontró la carta a adjuntar en la mano.");
    }

    const hostCard = hostZone.cards.find((card) => card.instanceId === input.hostInstanceId);
    if (!hostCard) {
      sourceZone.cards.push(sourceCard);
      return fail(next, "CARD_NOT_FOUND", "No se encontró el Pokémon objetivo para adjuntar.");
    }

    const maxEnergyAttaches = 1 + Math.max(0, next.turn.extraEnergyAttaches);
    if (sourceCard.profile.category === "energy") {
      const alreadyAttached = next.turn.energyAttachedThisTurn ? 1 : 0;
      if (alreadyAttached >= maxEnergyAttaches) {
        sourceZone.cards.push(sourceCard);
        return fail(
          next,
          "ENERGY_ATTACH_LIMIT_REACHED",
          "Ya alcanzaste el límite de Energía adjuntada este turno.",
        );
      }
      next.turn.energyAttachedThisTurn = true;
    }

    hostCard.attachments.push(sourceCard);

    next.actionLog.push(
      buildAction("attach", input.actor, {
        player: input.player,
        hostZone: input.hostZone,
        hostInstanceId: input.hostInstanceId,
        sourceCardId: sourceCard.cardId,
        sourceInstanceId: sourceCard.instanceId,
      }),
    );

    return { ok: true, board: next };
  },

  retreatActive(board: BoardState, input: RetreatInput): BoardResult {
    const next = cloneBoard(board);
    const precheck = assertActionAllowed(next, input.actor);

    if (precheck) {
      return precheck;
    }

    if (input.actor !== input.player) {
      return fail(next, "INVALID_OWNER", "Solo puedes retirar tu Pokémon activo.");
    }

    if (next.turn.retreatUsed) {
      return fail(next, "RETREAT_ALREADY_USED", "Ya utilizaste Retreat en este turno.");
    }

    const ownerBoard = getPlayerBoard(next, input.player);
    const active = ownerBoard.active_spot.cards[0];

    if (!active) {
      return fail(next, "CARD_NOT_FOUND", "No hay Pokémon activo para retirarse.");
    }

    if (active.specialCondition === "asleep" || active.specialCondition === "paralyzed") {
      return fail(
        next,
        "RETREAT_BLOCKED_BY_CONDITION",
        "El Pokémon activo no puede retirarse por su condición especial.",
      );
    }

    if (ownerBoard.bench.cards.length === 0) {
      return fail(next, "INVALID_MOVE", "Necesitas al menos 1 Pokémon en banca para retreat.");
    }

    const retreatCost = Math.max(0, active.profile.retreatCost ?? 0);
    const energyAttachments = active.attachments.filter(
      (card) => card.profile.category === "energy" || card.profile.energyType !== "other",
    );

    if (energyAttachments.length < retreatCost) {
      return fail(
        next,
        "RETREAT_NOT_ENOUGH_ENERGY",
        "No hay suficientes energías adjuntas para pagar el retreat.",
      );
    }

    if (retreatCost > 0) {
      const selectedIds = input.discardEnergyInstanceIds ?? [];
      const selected =
        selectedIds.length > 0
          ? energyAttachments.filter((energy) => selectedIds.includes(energy.instanceId))
          : energyAttachments.slice(0, retreatCost);

      if (selected.length < retreatCost) {
        return fail(
          next,
          "RETREAT_NOT_ENOUGH_ENERGY",
          "Debes seleccionar suficientes energías para pagar el retreat.",
        );
      }

      selected.slice(0, retreatCost).forEach((energy) => {
        const index = active.attachments.findIndex((item) => item.instanceId === energy.instanceId);
        if (index >= 0) {
          const [discarded] = active.attachments.splice(index, 1);
          if (discarded) {
            ownerBoard.discard_pile.cards.push(discarded);
          }
        }
      });
    }

    const activeCard = ownerBoard.active_spot.cards.shift();
    if (!activeCard) {
      return fail(next, "CARD_NOT_FOUND", "No se pudo mover el Pokémon activo.");
    }

    clearSpecialCondition(activeCard);
    const benchIssue = pushCardWithCapacity(ownerBoard.bench, activeCard);
    if (benchIssue) {
      ownerBoard.active_spot.cards.unshift(activeCard);
      return { ok: false, board: next, issue: benchIssue };
    }

    const benchIndex = ownerBoard.bench.cards.findIndex(
      (card) => card.instanceId === input.benchInstanceId,
    );

    if (benchIndex < 0) {
      const popped = ownerBoard.bench.cards.pop();
      if (popped) {
        ownerBoard.active_spot.cards.unshift(popped);
      }
      return fail(next, "CARD_NOT_FOUND", "No se encontró el Pokémon de banca seleccionado.");
    }

    const [newActive] = ownerBoard.bench.cards.splice(benchIndex, 1);
    if (!newActive) {
      return fail(next, "CARD_NOT_FOUND", "No se pudo elegir nuevo Pokémon activo.");
    }

    ownerBoard.active_spot.cards.unshift(newActive);
    next.turn.retreatUsed = true;

    next.actionLog.push(
      buildAction("retreat", input.actor, {
        player: input.player,
        previousActive: activeCard.instanceId,
        newActive: newActive.instanceId,
      }),
    );

    return { ok: true, board: next };
  },

  setActiveSpecialCondition(board: BoardState, input: SetSpecialConditionInput): BoardResult {
    const next = cloneBoard(board);
    const ownerBoard = getPlayerBoard(next, input.player);
    const active = ownerBoard.active_spot.cards[0];

    if (!active) {
      return fail(next, "CARD_NOT_FOUND", "No hay Pokémon activo para aplicar condición.");
    }

    setSpecialCondition(active, input.condition);

    next.actionLog.push(
      buildAction("condition", input.actor, {
        player: input.player,
        condition: input.condition,
        activeInstanceId: active.instanceId,
      }),
    );

    return { ok: true, board: next };
  },

  selectNewActiveFromBench(board: BoardState, input: SelectNewActiveInput): BoardResult {
    const next = cloneBoard(board);

    if (!next.turn.mustChooseNewActive) {
      return fail(next, "INVALID_MOVE", "No hay selección obligatoria de Active pendiente.");
    }

    if (input.player !== input.actor) {
      return fail(next, "INVALID_OWNER", "Solo el jugador afectado puede elegir su nuevo Active.");
    }

    const ownerBoard = getPlayerBoard(next, input.player);

    if (ownerBoard.active_spot.cards.length > 0) {
      return fail(next, "INVALID_MOVE", "Ya existe un Pokémon en Active Spot.");
    }

    const benchIndex = ownerBoard.bench.cards.findIndex(
      (card) => card.instanceId === input.benchInstanceId,
    );

    if (benchIndex < 0) {
      return fail(next, "CARD_NOT_FOUND", "No se encontró el Pokémon elegido en banca.");
    }

    const [picked] = ownerBoard.bench.cards.splice(benchIndex, 1);
    if (!picked) {
      return fail(next, "CARD_NOT_FOUND", "No se pudo mover el Pokémon seleccionado.");
    }

    ownerBoard.active_spot.cards.push(picked);
    next.turn.mustChooseNewActive = false;

    next.actionLog.push(
      buildAction("resolve_active", input.actor, {
        player: input.player,
        selectedInstanceId: picked.instanceId,
      }),
    );

    return { ok: true, board: next };
  },

  knockOutPokemon(board: BoardState, input: KnockOutInput): BoardResult {
    const next = cloneBoard(board);
    const precheck = assertActionAllowed(next, input.actor);

    if (precheck) {
      return precheck;
    }

    const ownerBoard = getPlayerBoard(next, input.targetPlayer);
    const sourceZone = ownerBoard[input.sourceZone];

    const knockedOut = removeSpecificCard(sourceZone, input.sourceInstanceId);
    if (!knockedOut) {
      return fail(next, "CARD_NOT_FOUND", "No se encontró el Pokémon a enviar a descarte.");
    }

    return resolveKo(next, input.targetPlayer, input.sourceZone, knockedOut, input.actor);
  },

  takePrizeCards(board: BoardState, input: TakePrizeInput): BoardResult {
    const total = Math.max(1, Math.floor(input.count ?? 1));
    let current = cloneBoard(board);

    if (!input.allowOutOfTurn && current.turn.currentPlayer !== input.actor) {
      return fail(current, "NOT_ACTIVE_PLAYER", "Solo el jugador activo puede tomar premios.");
    }

    for (let index = 0; index < total; index += 1) {
      const result = this.moveCard(current, {
        actor: input.actor,
        from: { owner: input.player, zone: "prize_cards" },
        to: { owner: input.player, zone: "hand" },
        reason: "prize_take",
      });

      if (!result.ok) {
        return result;
      }

      current = result.board;
    }

    current.actionLog.push(
      buildAction("prize", input.actor, {
        player: input.player,
        count: total,
        remainingPrizeCards:
          input.player === "player1"
            ? current.player1.prize_cards.cards.length
            : current.player2.prize_cards.cards.length,
      }),
    );

    return { ok: true, board: current };
  },

  endTurn(board: BoardState, actor: PlayerId): BoardResult {
    const next = cloneBoard(board);
    const precheck = assertActionAllowed(next, actor);

    if (precheck) {
      return precheck;
    }

    if (next.turn.currentPlayer !== actor) {
      return fail(next, "INVALID_OWNER", "Solo el jugador activo puede terminar el turno.");
    }

    next.turn.phase = "between_turns";

    const endingPlayerBoard = getPlayerBoard(next, actor);
    const endingActive = endingPlayerBoard.active_spot.cards[0];

    if (endingActive?.specialCondition === "poisoned") {
      endingActive.damageCounters += Math.max(1, endingActive.poisonCountersPerTurn);
    }

    if (endingActive?.specialCondition === "burned") {
      endingActive.damageCounters += 2;
      if (coinFlipHeads()) {
        clearSpecialCondition(endingActive);
      }
    }

    if (endingActive && isCardKnockedOut(endingActive)) {
      endingPlayerBoard.active_spot.cards.shift();
      const koResult = resolveKo(next, actor, "active_spot", endingActive, getOpponent(actor));
      if (!koResult.ok) {
        return koResult;
      }

      const koBoard = cloneBoard(koResult.board);
      koBoard.turn.currentPlayer = getOpponent(actor);
      koBoard.turn.number += 1;
      koBoard.turn.phase = "main";
      koBoard.turn.isFirstTurnOfGame = false;
      koBoard.turn = resetTurnFlags(koBoard.turn);
      return { ok: true, board: koBoard };
    }

    const nextPlayer = getOpponent(actor);
    next.turn.currentPlayer = nextPlayer;
    next.turn.number += 1;
    next.turn.isFirstTurnOfGame = false;
    next.turn.phase = "draw";
    next.turn = resetTurnFlags(next.turn);

    const nextBoardRef = getPlayerBoard(next, nextPlayer);
    const nextActive = nextBoardRef.active_spot.cards[0];

    if (nextActive?.specialCondition === "asleep" && coinFlipHeads()) {
      clearSpecialCondition(nextActive);
    }

    if (nextActive?.specialCondition === "paralyzed") {
      clearSpecialCondition(nextActive);
    }

    if (nextBoardRef.deck.cards.length === 0) {
      return fail(next, "DECK_EMPTY", "El jugador activo no puede robar: su Deck está vacío.");
    }

    const drawResult = this.drawCards(next, {
      actor: nextPlayer,
      player: nextPlayer,
      count: 1,
    });

    if (!drawResult.ok) {
      return drawResult;
    }

    const afterDraw = cloneBoard(drawResult.board);
    afterDraw.turn.phase = "main";

    afterDraw.actionLog.push(
      buildAction("turn", actor, {
        nextPlayer,
        turnNumber: afterDraw.turn.number,
      }),
    );

    return { ok: true, board: afterDraw };
  },

  getPublicView(board: BoardState, viewer: PlayerId): BoardPublicView {
    const opponent = viewer === "player1" ? "player2" : "player1";

    const ownView = mapPlayerView(board, viewer);
    const opponentView = mapPlayerView(board, opponent);

    return {
      self: ownView,
      opponent: {
        ...opponentView,
        active: opponentView.active,
        bench: opponentView.bench,
      },
      stadium: board.stadium.cards.map((card) => cloneCard(card)),
    };
  },

  takeCardsFromDeckToPrizes(
    board: BoardState,
    player: PlayerId,
    count: number,
  ): BoardResult {
    const total = Math.max(1, Math.floor(count));
    let current = cloneBoard(board);

    for (let index = 0; index < total; index += 1) {
      const result = this.moveCard(current, {
        actor: player,
        from: { owner: player, zone: "deck" },
        to: { owner: player, zone: "prize_cards" },
        reason: "setup_prize",
      });

      if (!result.ok) {
        return result;
      }

      current = result.board;
    }

    return { ok: true, board: current };
  },

  markAttackPerformed(board: BoardState, actor: PlayerId): BoardResult {
    const next = cloneBoard(board);
    const precheck = assertActionAllowed(next, actor);

    if (precheck) {
      return precheck;
    }

    if (next.turn.isFirstTurnOfGame && actor === next.turn.firstPlayer) {
      return fail(
        next,
        "TURN_PHASE_BLOCKED",
        "El primer jugador no puede atacar en su primer turno.",
      );
    }

    const active = getPlayerBoard(next, actor).active_spot.cards[0];
    if (!active) {
      return fail(next, "CARD_NOT_FOUND", "No hay Pokémon activo para atacar.");
    }

    if (active.specialCondition === "asleep" || active.specialCondition === "paralyzed") {
      return fail(
        next,
        "TURN_PHASE_BLOCKED",
        "El Pokémon activo no puede atacar por su condición especial.",
      );
    }

    if (active.specialCondition === "confused" && !coinFlipHeads()) {
      active.damageCounters += 3;
      next.actionLog.push(
        buildAction("condition", actor, {
          result: "confused_self_damage",
          damageCountersAdded: 3,
          activeInstanceId: active.instanceId,
        }),
      );
      return { ok: true, board: next };
    }

    next.turn.attackedThisTurn = true;
    next.turn.phase = "attack";

    next.actionLog.push(
      buildAction("turn", actor, {
        action: "attack_declared",
      }),
    );

    return { ok: true, board: next };
  },
};

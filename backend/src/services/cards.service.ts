import { toFullCardFields, toMinimalCardFields } from "../models/card.model";
import {
  CardFiltersResponse,
  FullCard,
  MinimalCard,
  PaginatedCardsResponse,
} from "../types";
import { buildCardTags } from "./cardTags.service";
import tcgdexClient from "./tcgdexClient";

const CACHE_TTL_MS = 5 * 60 * 1000;

const TYPE_LABELS: Record<string, string> = {
  GRASS: "Planta",
  FIRE: "Fuego",
  WATER: "Agua",
  LIGHTNING: "Rayo",
  PSYCHIC: "Psiquico",
  FIGHTING: "Lucha",
  DARKNESS: "Oscuridad",
  METAL: "Metal",
  FAIRY: "Hada",
  DRAGON: "Dragon",
  COLORLESS: "Incoloro",
};

let cardsCache: { timestamp: number; data: MinimalCard[] } = {
  timestamp: 0,
  data: [],
};

const fullCardCache = new Map<string, FullCard | null>();

const CARD_FETCH_RETRY_ATTEMPTS = 2;
const CARD_FETCH_RETRY_DELAY_MS = 150;

export class CardUpstreamUnavailableError extends Error {
  readonly cardId: string;

  constructor(cardId: string, cause?: unknown) {
    super(`Unable to fetch card from upstream: ${cardId}`);
    this.name = "CardUpstreamUnavailableError";
    this.cardId = cardId;
    if (cause) {
      this.cause = cause;
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getErrorMessage(error: unknown): string {
  if (!error) {
    return "";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "";
  }
}

function isTransientUpstreamError(error: unknown): boolean {
  const name =
    error instanceof Error
      ? error.name.toLowerCase()
      : typeof error === "object" && error !== null && "name" in error
        ? String((error as { name?: unknown }).name ?? "").toLowerCase()
        : "";

  const message = getErrorMessage(error).toLowerCase();
  const signal = `${name} ${message}`;

  return [
    "timeout",
    "timed out",
    "connecttimeout",
    "socket",
    "network",
    "fetch failed",
    "econn",
    "reset",
    "etimedout",
    "429",
    "502",
    "503",
    "504",
  ].some((token) => signal.includes(token));
}

async function fetchCardWithRetry(id: string): Promise<FullCard | null> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= CARD_FETCH_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const card = await tcgdexClient.fetchCard(id);
      return card
        ? toFullCardFields(card as unknown as Record<string, unknown>)
        : null;
    } catch (error) {
      lastError = error;
      if (!isTransientUpstreamError(error)) {
        break;
      }

      if (attempt < CARD_FETCH_RETRY_ATTEMPTS) {
        await delay(CARD_FETCH_RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw new CardUpstreamUnavailableError(id, lastError);
}

export async function cacheCards() {
  const isFresh = Date.now() - cardsCache.timestamp < CACHE_TTL_MS;

  if (isFresh && cardsCache.data.length > 0) {
    return cardsCache.data;
  }

  const cards = (await tcgdexClient.fetchCards()) ?? [];
  const normalizedCards = cards.map((card) =>
    toMinimalCardFields(card as unknown as Record<string, unknown>),
  );

  cardsCache = {
    timestamp: Date.now(),
    data: normalizedCards,
  };

  return normalizedCards;
}

function toSetId(cardId: string | null): string | null {
  if (!cardId) {
    return null;
  }

  const [setId] = cardId.split("-");
  return setId ? setId.toLowerCase() : null;
}

function normalizeSetIds(setIds: string[]): string[] {
  return [
    ...new Set(
      setIds.map((setId) => setId.toLowerCase().trim()).filter(Boolean),
    ),
  ];
}

function filterBySetIds(cards: MinimalCard[], setIds: string[]): MinimalCard[] {
  const normalizedSetIds = normalizeSetIds(setIds);

  if (normalizedSetIds.length === 0) {
    return cards;
  }

  const exactSetIds = normalizedSetIds.filter((setId) => !setId.endsWith("*"));
  const setPrefixes = normalizedSetIds
    .filter((setId) => setId.endsWith("*"))
    .map((setId) => setId.slice(0, -1))
    .filter(Boolean);

  return cards.filter((card) => {
    const cardSetId = toSetId(card.id);
    if (!cardSetId) {
      return false;
    }

    if (exactSetIds.includes(cardSetId)) {
      return true;
    }

    return setPrefixes.some((prefix) => cardSetId.startsWith(prefix));
  });
}

function normalizeTags(tags: string[]): string[] {
  return [
    ...new Set(tags.map((tag) => tag.toUpperCase().trim()).filter(Boolean)),
  ];
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function filterCardsBySearch(
  cards: MinimalCard[],
  searchQuery: string,
): MinimalCard[] {
  const normalizedQuery = normalizeSearchText(searchQuery);

  if (!normalizedQuery) {
    return cards;
  }

  return cards.filter((card) =>
    normalizeSearchText(card.name ?? "").includes(normalizedQuery),
  );
}

function formatTagLabel(tag: string): string {
  if (tag.startsWith("TYPE_")) {
    const raw = tag.replace("TYPE_", "");
    return `Tipo: ${TYPE_LABELS[raw] ?? raw}`;
  }

  if (tag.startsWith("RARITY_")) {
    const raw = tag.replace("RARITY_", "").replace(/_/g, " ");
    return `Rareza: ${raw}`;
  }

  if (tag === "HP_LOW") {
    return "HP bajo";
  }

  if (tag === "HP_MID") {
    return "HP medio";
  }

  if (tag === "HP_HIGH") {
    return "HP alto";
  }

  if (tag === "HAS_ATTACKS") {
    return "Con ataques";
  }

  if (tag === "HAS_WEAKNESSES") {
    return "Con debilidades";
  }

  if (tag === "HAS_RESISTANCES") {
    return "Con resistencias";
  }

  if (tag === "HAS_RETREAT_COST") {
    return "Con costo de retirada";
  }

  if (tag.startsWith("SET_")) {
    const raw = tag.replace("SET_", "").replace(/_/g, " ");
    return `Set: ${raw}`;
  }

  return tag.replace(/_/g, " ");
}

async function getCachedFullCardById(id: string): Promise<FullCard | null> {
  if (fullCardCache.has(id)) {
    return fullCardCache.get(id) ?? null;
  }

  const normalized = await fetchCardWithRetry(id);
  fullCardCache.set(id, normalized);
  return normalized;
}

async function filterCardsByTags(
  cards: MinimalCard[],
  tags: string[],
  tagMode: "all" | "any",
): Promise<MinimalCard[]> {
  const normalizedTags = normalizeTags(tags);

  if (normalizedTags.length === 0) {
    return cards;
  }

  const checks = await Promise.all(
    cards.map(async (card) => {
      try {
        if (!card.id) {
          return { card, included: false };
        }

        const fullCard = await getCachedFullCardById(card.id);
        if (!fullCard) {
          return { card, included: false };
        }

        const cardTags = buildCardTags(fullCard);
        const included =
          tagMode === "any"
            ? normalizedTags.some((tag) => cardTags.includes(tag))
            : normalizedTags.every((tag) => cardTags.includes(tag));

        return { card, included };
      } catch {
        return { card, included: false };
      }
    }),
  );

  return checks.filter((item) => item.included).map((item) => item.card);
}

export async function fetchCards(
  page = 1,
  pageSize = 20,
  setIds: string[] = [],
  tags: string[] = [],
  tagMode: "all" | "any" = "all",
  searchQuery = "",
): Promise<PaginatedCardsResponse> {
  const safePage = Math.max(1, Number.parseInt(String(page), 10) || 1);
  const safePageSize = Math.min(
    100,
    Math.max(1, Number.parseInt(String(pageSize), 10) || 20),
  );
  const allCards = await cacheCards();
  const cardsBySet = filterBySetIds(allCards, setIds);
  const filteredCards = await filterCardsByTags(cardsBySet, tags, tagMode);
  const searchedCards = filterCardsBySearch(filteredCards, searchQuery);

  const offset = (safePage - 1) * safePageSize;
  const pageData = searchedCards.slice(offset, offset + safePageSize);

  return {
    page: safePage,
    pageSize: safePageSize,
    total: searchedCards.length,
    totalPages: Math.ceil(searchedCards.length / safePageSize),
    data: pageData,
  };
}

export async function getCardById(id: string): Promise<FullCard | null> {
  return getCachedFullCardById(id);
}

export async function getFriendlyCardFilters(
  setIds: string[] = [],
  analysisLimit = 1000,
): Promise<CardFiltersResponse> {
  const allCards = await cacheCards();
  const cardsBySet = filterBySetIds(allCards, setIds);

  const parsedLimit = Number.parseInt(String(analysisLimit), 10);
  const useFullUniverse = Number.isFinite(parsedLimit) && parsedLimit <= 0;

  const safeLimit = Math.max(
    50,
    Math.min(3000, Number.isFinite(parsedLimit) ? parsedLimit : 1000),
  );

  const cardsToAnalyze = useFullUniverse
    ? cardsBySet
    : cardsBySet.slice(0, safeLimit);

  const typeCount = new Map<string, number>();
  const rarityCount = new Map<string, number>();
  const tagCount = new Map<string, number>();

  const fullCards = await Promise.all(
    cardsToAnalyze.map(async (card) => {
      if (!card.id) {
        return null;
      }

      try {
        return await getCachedFullCardById(card.id);
      } catch {
        return null;
      }
    }),
  );

  fullCards.forEach((card) => {
    if (!card) {
      return;
    }

    card.types.forEach((type) => {
      const key = type.toUpperCase();
      typeCount.set(key, (typeCount.get(key) ?? 0) + 1);
    });

    if (card.rarity) {
      const key = card.rarity.toUpperCase().replace(/\s+/g, "_");
      rarityCount.set(key, (rarityCount.get(key) ?? 0) + 1);
    }

    buildCardTags(card).forEach((tag) => {
      tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
    });
  });

  const toSortedOptions = (
    source: Map<string, number>,
    labelFactory: (value: string) => string,
  ) =>
    [...source.entries()]
      .map(([value, count]) => ({ value, count, label: labelFactory(value) }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return {
    types: toSortedOptions(typeCount, (value) => TYPE_LABELS[value] ?? value),
    rarities: toSortedOptions(rarityCount, (value) => value.replace(/_/g, " ")),
    tags: toSortedOptions(tagCount, (value) => formatTagLabel(value)),
    meta: {
      analyzedCards: cardsToAnalyze.length,
      totalCandidates: cardsBySet.length,
      truncated: cardsToAnalyze.length < cardsBySet.length,
    },
  };
}

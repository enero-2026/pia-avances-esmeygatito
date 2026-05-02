import Constants from "expo-constants";
import { Platform } from "react-native";

const ENV_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();

function resolveExpoDevHost(): string | null {
  const runtime = Constants as unknown as {
    expoConfig?: { hostUri?: unknown };
    manifest?: { debuggerHost?: unknown; hostUri?: unknown };
    manifest2?: { extra?: { expoClient?: { hostUri?: unknown } } };
  };

  const hostUri = [
    runtime.expoConfig?.hostUri,
    runtime.manifest?.hostUri,
    runtime.manifest?.debuggerHost,
    runtime.manifest2?.extra?.expoClient?.hostUri,
  ].find((value): value is string => {
    return typeof value === "string" && value.trim().length > 0;
  });

  if (!hostUri) {
    return null;
  }

  const withoutProtocol = hostUri.trim().replace(/^[a-z]+:\/\//i, "");
  const host = withoutProtocol.split(/[/:]/)[0]?.trim();

  return host || null;
}

function resolveBackendBaseUrl(): string {
  if (ENV_BACKEND_URL) {
    return ENV_BACKEND_URL.replace(/\/+$/, "");
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    const host = window.location.hostname || "localhost";
    return `http://${host}:4000`;
  }

  const expoDevHost = resolveExpoDevHost();
  if (
    expoDevHost &&
    expoDevHost !== "localhost" &&
    expoDevHost !== "127.0.0.1"
  ) {
    return `http://${expoDevHost}:4000`;
  }

  return "http://localhost:4000";
}

const BASE_URL = resolveBackendBaseUrl();

export interface PokemonCard {
  id: string;
  name: string;
  imageUrl: string | null;
}

export interface CardDetail {
  name: string | null;
  category: string | null;
  stage: string | null;
  trainerType: string | null;
  energyType: string | null;
  rarity: string | null;
  hp: number | string | null;
  retreatCost: number | string | null;
  imageUrl: string | null;
}

export interface CardsPageResponse {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  data: PokemonCard[];
}

export interface FriendlyFilterOption {
  value: string;
  label: string;
  count: number;
}

export interface CardFiltersResponse {
  types: FriendlyFilterOption[];
  rarities: FriendlyFilterOption[];
  tags: FriendlyFilterOption[];
  meta: {
    analyzedCards: number;
    totalCandidates: number;
    truncated: boolean;
  };
}

export type DeckFormat = "standard" | "expanded" | "unlimited" | "casual";

export interface DeckEntryInput {
  cardId: string;
  quantity: number;
}

export interface DeckValidationIssue {
  code:
    | "INVALID_TOTAL_SIZE"
    | "TOO_MANY_COPIES"
    | "MISSING_BASIC_POKEMON"
    | "TOO_MANY_ACE_SPEC"
    | "TOO_MANY_RADIANT"
    | "TOO_MANY_PRISM_STAR"
    | "ILLEGAL_CARD_STANDARD"
    | "ILLEGAL_CARD_EXPANDED"
    | "CARD_NOT_FOUND"
    | "UPSTREAM_UNAVAILABLE"
    | "INVALID_ENTRY";
  message: string;
  cardName?: string;
  cardId?: string;
}

export interface DeckValidationResult {
  format: DeckFormat;
  isValid: boolean;
  issues: DeckValidationIssue[];
  summary: {
    totalCards: number;
    pokemon: {
      total: number;
      basic: number;
      stage1: number;
      stage2: number;
      vmax: number;
      vstar: number;
      other: number;
    };
    trainer: {
      total: number;
      item: number;
      supporter: number;
      stadium: number;
      tool: number;
      other: number;
    };
    energy: {
      total: number;
      basic: number;
      special: number;
      other: number;
    };
    specials: {
      aceSpecCount: number;
      radiantCount: number;
      prismStarCount: number;
    };
  };
  categorizedCards: Array<{
    cardId: string;
    name: string;
    quantity: number;
    superCategory: "pokemon" | "trainer" | "energy" | "unknown";
    subCategory: string;
    flags: {
      isBasicPokemon: boolean;
      isBasicEnergy: boolean;
      isAceSpec: boolean;
      isRadiant: boolean;
      isPrismStar: boolean;
    };
  }>;
}

export interface MatchActionEvent {
  id: string;
  timestamp: string;
  type: string;
  actor: string;
  payload: Record<string, unknown>;
}

export interface MatchBoardSnapshot {
  turn?: {
    currentPlayer?: string;
    number?: number;
    phase?: string;
  };
  zones?: Record<string, { count: number }>;
  activeByPlayer?: Record<string, string | null>;
  benchByPlayer?: Record<string, string[]>;
  discardByPlayer?: Record<string, string[]>;
  prizesByPlayer?: Record<string, number>;
  [key: string]: unknown;
}

export interface MatchCardUsed {
  id: string;
  name: string;
  imageUrl: string | null;
}

export interface MatchRecord {
  id: string;
  createdAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  turnCount: number | null;
  players: string[];
  winner: string | null;
  resultReason: string | null;
  notes: string | null;
  actionLog: MatchActionEvent[];
  boardSnapshot: MatchBoardSnapshot | null;
  cardsUsed: MatchCardUsed[];
}

export interface MatchRecordSummary {
  id: string;
  createdAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  turnCount: number | null;
  players: string[];
  winner: string | null;
  resultReason: string | null;
  notes: string | null;
  cardsUsedCount: number;
  actionCount: number;
}

export interface MatchStats {
  totalMatches: number;
  withWinner: number;
  withoutWinner: number;
  avgDurationSeconds: number;
  avgTurnCount: number;
  winsByPlayer: Array<{ player: string; wins: number }>;
  topCardsUsed: Array<{ cardId: string; name: string; uses: number }>;
}

export interface CreateMatchPayload {
  players?: string[];
  winner?: string | null;
  resultReason?: string | null;
  notes?: string | null;
  cardsUsed?: string[];
  endedAt?: string | null;
  durationSeconds?: number | null;
  turnCount?: number | null;
  actionLog?: MatchActionEvent[];
  boardSnapshot?: MatchBoardSnapshot | null;
}

function toCard(item: unknown): PokemonCard | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const row = item as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id : "";
  const name = typeof row.name === "string" ? row.name : "Sin nombre";
  const imageUrl = typeof row.imageUrl === "string" ? row.imageUrl : null;

  if (!id) {
    return null;
  }

  return { id, name, imageUrl };
}

export const TCGService = {
  async getCards(
    page = 1,
    pageSize = 50,
    setIds: string[] = [],
    tags: string[] = [],
    tagMode: "all" | "any" = "all",
    searchQuery = "",
  ): Promise<CardsPageResponse> {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      if (setIds.length > 0) {
        params.set("setIds", setIds.join(","));
      }

      if (tags.length > 0) {
        params.set("tags", tags.join(","));
        params.set("tagMode", tagMode);
      }

      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const response = await fetch(`${BASE_URL}/cards?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data: unknown = await response.json();
      if (!data || typeof data !== "object") {
        return {
          page,
          pageSize,
          total: 0,
          totalPages: 0,
          data: [],
        };
      }

      const payload = data as Record<string, unknown>;
      const rows = Array.isArray(payload.data) ? payload.data : [];

      const parsedCards = rows
        .map((item) => toCard(item))
        .filter((item): item is PokemonCard => item !== null);

      const parsedPage =
        typeof payload.page === "number" && Number.isFinite(payload.page)
          ? payload.page
          : page;
      const parsedPageSize =
        typeof payload.pageSize === "number" &&
        Number.isFinite(payload.pageSize)
          ? payload.pageSize
          : pageSize;
      const parsedTotal =
        typeof payload.total === "number" && Number.isFinite(payload.total)
          ? payload.total
          : parsedCards.length;
      const parsedTotalPages =
        typeof payload.totalPages === "number" &&
        Number.isFinite(payload.totalPages)
          ? payload.totalPages
          : Math.ceil(parsedTotal / Math.max(1, parsedPageSize));

      return {
        page: parsedPage,
        pageSize: parsedPageSize,
        total: parsedTotal,
        totalPages: parsedTotalPages,
        data: parsedCards,
      };
    } catch (error) {
      if (error instanceof TypeError) {
        console.error(
          `Error al obtener cartas: no se pudo conectar con el backend en ${BASE_URL}.`,
          error,
        );
      } else {
        console.error("Error al obtener cartas:", error);
      }
      return {
        page,
        pageSize,
        total: 0,
        totalPages: 0,
        data: [],
      };
    }
  },

  async getCardDetails(id: string): Promise<CardDetail | null> {
    const normalizedId = id.trim();

    if (!normalizedId) {
      console.warn("Error al obtener detalle: cardId vacio");
      return null;
    }

    try {
      const response = await fetch(
        `${BASE_URL}/cards/${encodeURIComponent(normalizedId)}`,
      );

      if (response.status === 404) {
        console.warn(`Detalle no encontrado para cardId=${normalizedId}`);
        return null;
      }

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data: unknown = await response.json();
      if (!data || typeof data !== "object") {
        return null;
      }

      const row = data as Record<string, unknown>;

      return {
        name: typeof row.name === "string" ? row.name : null,
        category: typeof row.category === "string" ? row.category : null,
        stage: typeof row.stage === "string" ? row.stage : null,
        trainerType:
          typeof row.trainerType === "string" ? row.trainerType : null,
        energyType: typeof row.energyType === "string" ? row.energyType : null,
        rarity: typeof row.rarity === "string" ? row.rarity : null,
        hp:
          typeof row.hp === "number" || typeof row.hp === "string"
            ? row.hp
            : null,
        retreatCost:
          typeof row.retreatCost === "number" ||
          typeof row.retreatCost === "string"
            ? row.retreatCost
            : null,
        imageUrl: typeof row.imageUrl === "string" ? row.imageUrl : null,
      };
    } catch (error) {
      if (error instanceof TypeError) {
        console.error(
          `Error al obtener detalle: no se pudo conectar con el backend en ${BASE_URL}.`,
          error,
        );
      } else {
        console.error("Error al obtener detalle:", error);
      }
      return null;
    }
  },

  async getCardFilters(
    setIds: string[] = [],
    analysisLimit = 300,
  ): Promise<CardFiltersResponse> {
    try {
      const params = new URLSearchParams();

      if (setIds.length > 0) {
        params.set("setIds", setIds.join(","));
      }

      params.set("analysisLimit", String(analysisLimit));

      const response = await fetch(
        `${BASE_URL}/cards/filters?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data: unknown = await response.json();
      if (!data || typeof data !== "object") {
        return {
          types: [],
          rarities: [],
          tags: [],
          meta: {
            analyzedCards: 0,
            totalCandidates: 0,
            truncated: false,
          },
        };
      }

      const payload = data as Record<string, unknown>;
      const toOptions = (value: unknown): FriendlyFilterOption[] => {
        if (!Array.isArray(value)) {
          return [];
        }

        return value
          .map((row) => {
            if (!row || typeof row !== "object") {
              return null;
            }

            const raw = row as Record<string, unknown>;
            const optionValue =
              typeof raw.value === "string" ? raw.value : null;
            const optionLabel =
              typeof raw.label === "string" ? raw.label : optionValue;
            const optionCount =
              typeof raw.count === "number" && Number.isFinite(raw.count)
                ? raw.count
                : 0;

            if (!optionValue || !optionLabel) {
              return null;
            }

            return {
              value: optionValue,
              label: optionLabel,
              count: optionCount,
            };
          })
          .filter((item): item is FriendlyFilterOption => item !== null);
      };

      const rawMeta =
        payload.meta && typeof payload.meta === "object"
          ? (payload.meta as Record<string, unknown>)
          : {};

      return {
        types: toOptions(payload.types),
        rarities: toOptions(payload.rarities),
        tags: toOptions(payload.tags),
        meta: {
          analyzedCards:
            typeof rawMeta.analyzedCards === "number"
              ? rawMeta.analyzedCards
              : 0,
          totalCandidates:
            typeof rawMeta.totalCandidates === "number"
              ? rawMeta.totalCandidates
              : 0,
          truncated:
            typeof rawMeta.truncated === "boolean" ? rawMeta.truncated : false,
        },
      };
    } catch (error) {
      if (error instanceof TypeError) {
        console.error(
          `Error al obtener filtros: no se pudo conectar con el backend en ${BASE_URL}.`,
          error,
        );
      } else {
        console.error("Error al obtener filtros:", error);
      }
      return {
        types: [],
        rarities: [],
        tags: [],
        meta: {
          analyzedCards: 0,
          totalCandidates: 0,
          truncated: false,
        },
      };
    }
  },

  async validateDeck(
    entries: DeckEntryInput[],
    format: DeckFormat = "casual",
  ): Promise<DeckValidationResult> {
    try {
      const response = await fetch(`${BASE_URL}/decks/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ entries, format }),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data: unknown = await response.json();
      if (!data || typeof data !== "object") {
        return {
          format,
          isValid: false,
          issues: [
            {
              code: "INVALID_ENTRY",
              message: "Respuesta inválida del servicio de validación de mazo.",
            },
          ],
          summary: {
            totalCards: 0,
            pokemon: {
              total: 0,
              basic: 0,
              stage1: 0,
              stage2: 0,
              vmax: 0,
              vstar: 0,
              other: 0,
            },
            trainer: {
              total: 0,
              item: 0,
              supporter: 0,
              stadium: 0,
              tool: 0,
              other: 0,
            },
            energy: {
              total: 0,
              basic: 0,
              special: 0,
              other: 0,
            },
            specials: {
              aceSpecCount: 0,
              radiantCount: 0,
              prismStarCount: 0,
            },
          },
          categorizedCards: [],
        };
      }

      return data as DeckValidationResult;
    } catch (error) {
      if (error instanceof TypeError) {
        console.error(
          `Error al validar mazo: no se pudo conectar con el backend en ${BASE_URL}.`,
          error,
        );
      } else {
        console.error("Error al validar mazo:", error);
      }

      return {
        format,
        isValid: false,
        issues: [
          {
            code: "UPSTREAM_UNAVAILABLE",
            message: "No se pudo validar el mazo en este momento.",
          },
        ],
        summary: {
          totalCards: 0,
          pokemon: {
            total: 0,
            basic: 0,
            stage1: 0,
            stage2: 0,
            vmax: 0,
            vstar: 0,
            other: 0,
          },
          trainer: {
            total: 0,
            item: 0,
            supporter: 0,
            stadium: 0,
            tool: 0,
            other: 0,
          },
          energy: {
            total: 0,
            basic: 0,
            special: 0,
            other: 0,
          },
          specials: {
            aceSpecCount: 0,
            radiantCount: 0,
            prismStarCount: 0,
          },
        },
        categorizedCards: [],
      };
    }
  },

  async createMatch(payload: CreateMatchPayload): Promise<MatchRecord | null> {
    try {
      const response = await fetch(`${BASE_URL}/matches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data: unknown = await response.json();
      return data as MatchRecord;
    } catch (error) {
      console.error("Error al crear partida:", error);
      return null;
    }
  },

  async getMatches(
    limit = 20,
    offset = 0,
  ): Promise<{ total: number; data: MatchRecordSummary[] }> {
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });

      const response = await fetch(`${BASE_URL}/matches?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data: unknown = await response.json();
      if (!data || typeof data !== "object") {
        return { total: 0, data: [] };
      }

      const payload = data as Record<string, unknown>;
      const total =
        typeof payload.total === "number" && Number.isFinite(payload.total)
          ? payload.total
          : 0;
      const rows = Array.isArray(payload.data) ? payload.data : [];

      return {
        total,
        data: rows as MatchRecordSummary[],
      };
    } catch (error) {
      console.error("Error al obtener historial de partidas:", error);
      return { total: 0, data: [] };
    }
  },

  async getMatchById(id: string): Promise<MatchRecord | null> {
    const normalizedId = id.trim();

    if (!normalizedId) {
      return null;
    }

    try {
      const response = await fetch(
        `${BASE_URL}/matches/${encodeURIComponent(normalizedId)}`,
      );

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data: unknown = await response.json();
      return data as MatchRecord;
    } catch (error) {
      console.error("Error al obtener detalle de partida:", error);
      return null;
    }
  },

  async getMatchStats(): Promise<MatchStats | null> {
    try {
      const response = await fetch(`${BASE_URL}/matches/stats`);

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data: unknown = await response.json();
      return data as MatchStats;
    } catch (error) {
      console.error("Error al obtener estadisticas de partidas:", error);
      return null;
    }
  },
};

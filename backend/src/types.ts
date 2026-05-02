export interface CardSetSerie {
  id: string | null;
  name: string | null;
}

export interface CardSetInfo {
  id: string | null;
  name: string | null;
  serie: CardSetSerie | null;
}

export interface MinimalCard {
  id: string | null;
  name: string | null;
  imageUrl: string | null;
}

export interface FullCard extends MinimalCard {
  category: string | null;
  stage: string | null;
  trainerType: string | null;
  energyType: string | null;
  regulationMark: string | null;
  legal: {
    standard: boolean;
    expanded: boolean;
  } | null;
  set: CardSetInfo | null;
  rarity: string | null;
  types: string[];
  hp: number | string | null;
  attacks: unknown[];
  weaknesses: unknown[];
  resistances: unknown[];
  retreatCost: number | string | null;
}

export interface CardDetailFrontend {
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

export interface MatchPayload {
  players?: string[];
  winner?: string | null;
  notes?: string | null;
  cardsUsed?: string[];
  resultReason?: string | null;
  endedAt?: string | null;
  durationSeconds?: number | null;
  turnCount?: number | null;
  actionLog?: MatchActionEvent[];
  boardSnapshot?: MatchBoardSnapshot | null;
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
  [key: string]: unknown;
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
  cardsUsed: FullCard[];
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

export interface PaginatedCardsResponse {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  data: MinimalCard[];
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

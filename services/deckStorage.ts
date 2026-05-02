import { DeckEntryInput, DeckFormat } from "@/services/tcgdexService";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DECKS_STORAGE_KEY = "@tcg/decks";

export interface SavedDeck {
  id: string;
  name: string;
  icon: string;
  format: DeckFormat;
  entries: DeckEntryInput[];
  cardMeta: Record<string, { name: string; imageUrl: string | null }>;
  updatedAt: string;
}

function normalizeDeckIcon(raw: unknown): string {
  if (typeof raw !== "string") {
    return "";
  }

  // Mantiene iconos cortos (emoji o texto breve) para evitar layouts rotos.
  return raw.trim().slice(0, 4);
}

function toPositiveQuantity(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function parseCardMeta(
  raw: unknown,
): Record<string, { name: string; imageUrl: string | null }> {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const source = raw as Record<string, unknown>;
  const meta: Record<string, { name: string; imageUrl: string | null }> = {};

  Object.entries(source).forEach(([cardId, value]) => {
    if (!cardId.trim() || !value || typeof value !== "object") {
      return;
    }

    const row = value as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const imageUrl = typeof row.imageUrl === "string" ? row.imageUrl : null;

    if (!name) {
      return;
    }

    meta[cardId] = { name, imageUrl };
  });

  return meta;
}

export function normalizeDeckEntries(
  entries: DeckEntryInput[],
): DeckEntryInput[] {
  const merged = new Map<string, number>();

  entries.forEach((entry) => {
    const cardId = entry.cardId.trim();
    if (!cardId) {
      return;
    }

    const quantity = toPositiveQuantity(entry.quantity);
    if (quantity <= 0) {
      return;
    }

    merged.set(cardId, (merged.get(cardId) ?? 0) + quantity);
  });

  return [...merged.entries()].map(([cardId, quantity]) => ({
    cardId,
    quantity,
  }));
}

function parseDeck(raw: unknown): SavedDeck | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id : "";
  const name = typeof row.name === "string" ? row.name : "";
  const icon = normalizeDeckIcon(row.icon);
  const format =
    typeof row.format === "string" ? (row.format as DeckFormat) : "casual";
  const updatedAt =
    typeof row.updatedAt === "string"
      ? row.updatedAt
      : new Date().toISOString();
  const cardMeta = parseCardMeta(row.cardMeta);

  if (!id || !name) {
    return null;
  }

  const rawEntries = Array.isArray(row.entries) ? row.entries : [];
  const entries = normalizeDeckEntries(
    rawEntries
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const entry = item as Record<string, unknown>;
        const cardId = typeof entry.cardId === "string" ? entry.cardId : "";
        const quantity =
          typeof entry.quantity === "number" ? entry.quantity : 0;

        return { cardId, quantity };
      })
      .filter((item): item is DeckEntryInput => item !== null),
  );

  return {
    id,
    name,
    icon,
    format,
    entries,
    cardMeta,
    updatedAt,
  };
}

export async function getSavedDecks(): Promise<SavedDeck[]> {
  const raw = await AsyncStorage.getItem(DECKS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .map((item) => parseDeck(item))
      .filter((item): item is SavedDeck => item !== null)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

async function saveDecks(decks: SavedDeck[]): Promise<void> {
  await AsyncStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(decks));
}

export async function upsertDeck(deck: SavedDeck): Promise<SavedDeck[]> {
  const decks = await getSavedDecks();
  const index = decks.findIndex((item) => item.id === deck.id);

  if (index >= 0) {
    decks[index] = deck;
  } else {
    decks.push(deck);
  }

  const ordered = decks.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  await saveDecks(ordered);
  return ordered;
}

export async function removeDeck(deckId: string): Promise<SavedDeck[]> {
  const decks = await getSavedDecks();
  const filtered = decks.filter((deck) => deck.id !== deckId);
  await saveDecks(filtered);
  return filtered;
}

export function buildDeckId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `deck_${Date.now()}_${random}`;
}

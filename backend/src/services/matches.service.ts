import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  MatchActionEvent,
  MatchBoardSnapshot,
  MatchPayload,
  MatchRecord,
  MatchRecordSummary,
  MatchStats,
} from '../types';
import { getCardById } from './cards.service';

const MATCHES_FILE_PATH = path.join(__dirname, '..', '..', 'data', 'matches.json');

async function ensureMatchesFile() {
  try {
    await fs.access(MATCHES_FILE_PATH);
  } catch {
    await fs.mkdir(path.dirname(MATCHES_FILE_PATH), { recursive: true });
    await fs.writeFile(MATCHES_FILE_PATH, '[]', 'utf8');
  }
}

async function readMatches(): Promise<MatchRecord[]> {
  await ensureMatchesFile();
  const raw = await fs.readFile(MATCHES_FILE_PATH, 'utf8');
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((row) => normalizeMatchRecord(row))
    .filter((row): row is MatchRecord => row !== null);
}

async function saveMatches(matches: MatchRecord[]) {
  await fs.writeFile(MATCHES_FILE_PATH, JSON.stringify(matches, null, 2), 'utf8');
}

async function resolveCardsForMatch(cardIds: string[] = []) {
  const uniqueIds = [...new Set(cardIds.filter(Boolean))];
  const cards = await Promise.all(uniqueIds.map((id) => getCardById(id)));
  return cards.filter((card): card is NonNullable<typeof card> => card !== null);
}

function normalizeActionLog(value: unknown): MatchActionEvent[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((row, index) => {
      if (!row || typeof row !== 'object') {
        return null;
      }

      const item = row as Record<string, unknown>;
      const id =
        typeof item.id === 'string' && item.id.trim()
          ? item.id
          : `legacy_action_${index}`;
      const timestamp =
        typeof item.timestamp === 'string' && item.timestamp.trim()
          ? item.timestamp
          : new Date().toISOString();
      const type =
        typeof item.type === 'string' && item.type.trim() ? item.type : 'unknown';
      const actor =
        typeof item.actor === 'string' && item.actor.trim() ? item.actor : 'system';
      const payload =
        item.payload && typeof item.payload === 'object'
          ? (item.payload as Record<string, unknown>)
          : {};

      return { id, timestamp, type, actor, payload };
    })
    .filter((row): row is MatchActionEvent => row !== null);
}

function normalizeMatchRecord(value: unknown): MatchRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const row = value as Record<string, unknown>;
  const id = typeof row.id === 'string' ? row.id : '';
  const createdAt =
    typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString();

  if (!id) {
    return null;
  }

  return {
    id,
    createdAt,
    endedAt: typeof row.endedAt === 'string' ? row.endedAt : null,
    durationSeconds:
      typeof row.durationSeconds === 'number' && Number.isFinite(row.durationSeconds)
        ? row.durationSeconds
        : null,
    turnCount:
      typeof row.turnCount === 'number' && Number.isFinite(row.turnCount)
        ? row.turnCount
        : null,
    players: Array.isArray(row.players)
      ? row.players.filter((item): item is string => typeof item === 'string')
      : [],
    winner: typeof row.winner === 'string' ? row.winner : null,
    resultReason: typeof row.resultReason === 'string' ? row.resultReason : null,
    notes: typeof row.notes === 'string' ? row.notes : null,
    actionLog: normalizeActionLog(row.actionLog),
    boardSnapshot:
      row.boardSnapshot && typeof row.boardSnapshot === 'object'
        ? (row.boardSnapshot as MatchBoardSnapshot)
        : null,
    cardsUsed: Array.isArray(row.cardsUsed)
      ? (row.cardsUsed as MatchRecord['cardsUsed'])
      : [],
  };
}

export async function createMatch(payload: MatchPayload = {}): Promise<MatchRecord> {
  const cardsUsed = await resolveCardsForMatch(payload.cardsUsed ?? []);

  const match: MatchRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    endedAt: payload.endedAt ?? null,
    durationSeconds:
      typeof payload.durationSeconds === 'number' && Number.isFinite(payload.durationSeconds)
        ? payload.durationSeconds
        : null,
    turnCount:
      typeof payload.turnCount === 'number' && Number.isFinite(payload.turnCount)
        ? payload.turnCount
        : null,
    players: payload.players ?? [],
    winner: payload.winner ?? null,
    resultReason: payload.resultReason ?? null,
    notes: payload.notes ?? null,
    actionLog: normalizeActionLog(payload.actionLog),
    boardSnapshot:
      payload.boardSnapshot && typeof payload.boardSnapshot === 'object'
        ? payload.boardSnapshot
        : null,
    cardsUsed,
  };

  const matches = await readMatches();
  matches.unshift(match);
  await saveMatches(matches);

  return match;
}

export async function listMatches(
  limit = 20,
  offset = 0,
): Promise<{ total: number; data: MatchRecordSummary[] }> {
  const matches = await readMatches();
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const safeOffset = Math.max(0, Math.floor(offset));

  const paged = matches.slice(safeOffset, safeOffset + safeLimit);
  const summaries = paged.map((match) => ({
    id: match.id,
    createdAt: match.createdAt,
    endedAt: match.endedAt,
    durationSeconds: match.durationSeconds,
    turnCount: match.turnCount,
    players: match.players,
    winner: match.winner,
    resultReason: match.resultReason,
    notes: match.notes,
    cardsUsedCount: match.cardsUsed.length,
    actionCount: match.actionLog.length,
  }));

  return {
    total: matches.length,
    data: summaries,
  };
}

export async function getMatchById(id: string): Promise<MatchRecord | null> {
  const matches = await readMatches();
  return matches.find((match) => match.id === id) ?? null;
}

export async function getMatchStats(): Promise<MatchStats> {
  const matches = await readMatches();

  const completedDurations = matches
    .map((match) => match.durationSeconds)
    .filter((value): value is number => typeof value === 'number' && value >= 0);
  const completedTurnCounts = matches
    .map((match) => match.turnCount)
    .filter((value): value is number => typeof value === 'number' && value >= 0);

  const wins = new Map<string, number>();
  matches.forEach((match) => {
    if (!match.winner) {
      return;
    }

    wins.set(match.winner, (wins.get(match.winner) ?? 0) + 1);
  });

  const uses = new Map<string, { cardId: string; name: string; uses: number }>();
  matches.forEach((match) => {
    const seenInMatch = new Set<string>();
    match.cardsUsed.forEach((card) => {
      if (!card.id || seenInMatch.has(card.id)) {
        return;
      }

      seenInMatch.add(card.id);
      const current = uses.get(card.id) ?? {
        cardId: card.id,
        name: card.name ?? card.id,
        uses: 0,
      };

      current.uses += 1;
      uses.set(card.id, current);
    });
  });

  return {
    totalMatches: matches.length,
    withWinner: matches.filter((match) => Boolean(match.winner)).length,
    withoutWinner: matches.filter((match) => !match.winner).length,
    avgDurationSeconds:
      completedDurations.length > 0
        ? completedDurations.reduce((sum, value) => sum + value, 0) /
          completedDurations.length
        : 0,
    avgTurnCount:
      completedTurnCounts.length > 0
        ? completedTurnCounts.reduce((sum, value) => sum + value, 0) /
          completedTurnCounts.length
        : 0,
    winsByPlayer: Array.from(wins.entries())
      .map(([player, value]) => ({ player, wins: value }))
      .sort((a, b) => b.wins - a.wins),
    topCardsUsed: Array.from(uses.values())
      .sort((a, b) => b.uses - a.uses)
      .slice(0, 10),
  };
}

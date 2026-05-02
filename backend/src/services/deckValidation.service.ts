import { CardUpstreamUnavailableError, getCardById } from './cards.service';

export type DeckFormat = 'standard' | 'expanded' | 'unlimited' | 'casual';

export interface DeckEntryInput {
  cardId: string;
  quantity: number;
}

type CardSuperCategory = 'pokemon' | 'trainer' | 'energy' | 'unknown';
type CardSubCategory =
  | 'basic-pokemon'
  | 'stage-1-pokemon'
  | 'stage-2-pokemon'
  | 'vmax-pokemon'
  | 'vstar-pokemon'
  | 'other-pokemon'
  | 'item-trainer'
  | 'supporter-trainer'
  | 'stadium-trainer'
  | 'tool-trainer'
  | 'other-trainer'
  | 'basic-energy'
  | 'special-energy'
  | 'other-energy'
  | 'unknown';

interface DeckResolvedCard {
  cardId: string;
  name: string;
  canonicalName: string;
  quantity: number;
  superCategory: CardSuperCategory;
  subCategory: CardSubCategory;
  isBasicPokemon: boolean;
  isBasicEnergy: boolean;
  isRadiant: boolean;
  isAceSpec: boolean;
  isPrismStar: boolean;
  legalStandard: boolean;
  legalExpanded: boolean;
}

export interface DeckValidationIssue {
  code:
    | 'INVALID_TOTAL_SIZE'
    | 'TOO_MANY_COPIES'
    | 'MISSING_BASIC_POKEMON'
    | 'TOO_MANY_ACE_SPEC'
    | 'TOO_MANY_RADIANT'
    | 'TOO_MANY_PRISM_STAR'
    | 'ILLEGAL_CARD_STANDARD'
    | 'ILLEGAL_CARD_EXPANDED'
    | 'CARD_NOT_FOUND'
    | 'UPSTREAM_UNAVAILABLE'
    | 'INVALID_ENTRY';
  message: string;
  cardName?: string;
  cardId?: string;
}

export interface DeckCategorySummary {
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
}

export interface DeckCategorizedCard {
  cardId: string;
  name: string;
  quantity: number;
  superCategory: CardSuperCategory;
  subCategory: CardSubCategory;
  flags: {
    isBasicPokemon: boolean;
    isBasicEnergy: boolean;
    isAceSpec: boolean;
    isRadiant: boolean;
    isPrismStar: boolean;
  };
}

export interface DeckValidationResult {
  format: DeckFormat;
  isValid: boolean;
  issues: DeckValidationIssue[];
  summary: DeckCategorySummary;
  categorizedCards: DeckCategorizedCard[];
}

const BASIC_ENERGY_NAMES = new Set([
  'Grass Energy',
  'Fire Energy',
  'Water Energy',
  'Lightning Energy',
  'Psychic Energy',
  'Fighting Energy',
  'Darkness Energy',
  'Metal Energy',
  'Fairy Energy',
]);

function toCanonicalCardName(name: string): string {
  return name
    .replace(/\s+δ$/u, '')
    .replace(/\s+LV\.?\s*[0-9X.]+$/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyCard(card: {
  category: string | null;
  stage: string | null;
  trainerType: string | null;
  energyType: string | null;
}): { superCategory: CardSuperCategory; subCategory: CardSubCategory } {
  const category = (card.category ?? '').toLowerCase();

  if (category === 'pokemon') {
    const stage = (card.stage ?? '').toLowerCase();

    if (stage === 'basic') {
      return { superCategory: 'pokemon', subCategory: 'basic-pokemon' };
    }

    if (stage === 'stage1') {
      return { superCategory: 'pokemon', subCategory: 'stage-1-pokemon' };
    }

    if (stage === 'stage2') {
      return { superCategory: 'pokemon', subCategory: 'stage-2-pokemon' };
    }

    if (stage === 'vmax') {
      return { superCategory: 'pokemon', subCategory: 'vmax-pokemon' };
    }

    if (stage === 'vstar') {
      return { superCategory: 'pokemon', subCategory: 'vstar-pokemon' };
    }

    return { superCategory: 'pokemon', subCategory: 'other-pokemon' };
  }

  if (category === 'trainer') {
    const trainerType = (card.trainerType ?? '').toLowerCase();

    if (trainerType === 'item') {
      return { superCategory: 'trainer', subCategory: 'item-trainer' };
    }

    if (trainerType === 'supporter') {
      return { superCategory: 'trainer', subCategory: 'supporter-trainer' };
    }

    if (trainerType === 'stadium') {
      return { superCategory: 'trainer', subCategory: 'stadium-trainer' };
    }

    if (trainerType === 'tool') {
      return { superCategory: 'trainer', subCategory: 'tool-trainer' };
    }

    return { superCategory: 'trainer', subCategory: 'other-trainer' };
  }

  if (category === 'energy') {
    const energyType = (card.energyType ?? '').toLowerCase();

    if (energyType === 'normal') {
      return { superCategory: 'energy', subCategory: 'basic-energy' };
    }

    if (energyType === 'special') {
      return { superCategory: 'energy', subCategory: 'special-energy' };
    }

    return { superCategory: 'energy', subCategory: 'other-energy' };
  }

  return { superCategory: 'unknown', subCategory: 'unknown' };
}

function normalizeEntries(entries: DeckEntryInput[]): {
  validEntries: DeckEntryInput[];
  issues: DeckValidationIssue[];
} {
  const issues: DeckValidationIssue[] = [];
  const grouped = new Map<string, number>();

  for (const row of entries) {
    const cardId = typeof row.cardId === 'string' ? row.cardId.trim() : '';
    const quantity = Number.isFinite(row.quantity) ? Math.floor(row.quantity) : 0;

    if (!cardId || quantity <= 0) {
      issues.push({
        code: 'INVALID_ENTRY',
        message: 'Cada entrada del mazo debe tener cardId válido y quantity > 0.',
        cardId,
      });
      continue;
    }

    grouped.set(cardId, (grouped.get(cardId) ?? 0) + quantity);
  }

  const validEntries = Array.from(grouped.entries()).map(([cardId, quantity]) => ({
    cardId,
    quantity,
  }));

  return { validEntries, issues };
}

async function resolveDeckCards(entries: DeckEntryInput[]): Promise<{
  cards: DeckResolvedCard[];
  issues: DeckValidationIssue[];
}> {
  const cards: DeckResolvedCard[] = [];
  const issues: DeckValidationIssue[] = [];

  const resolved = await Promise.all(
    entries.map(async (entry) => {
      try {
        const card = await getCardById(entry.cardId);
        return { entry, card, error: null as Error | null };
      } catch (error) {
        return { entry, card: null, error: error as Error };
      }
    }),
  );

  for (const row of resolved) {
    if (row.error) {
      if (row.error instanceof CardUpstreamUnavailableError) {
        issues.push({
          code: 'UPSTREAM_UNAVAILABLE',
          message: `No se pudo validar la carta ${row.entry.cardId} por indisponibilidad del proveedor.`,
          cardId: row.entry.cardId,
        });
      } else {
        issues.push({
          code: 'CARD_NOT_FOUND',
          message: `No se encontró la carta ${row.entry.cardId}.`,
          cardId: row.entry.cardId,
        });
      }
      continue;
    }

    const card = row.card;
    if (!card || !card.id || !card.name) {
      issues.push({
        code: 'CARD_NOT_FOUND',
        message: `No se encontró la carta ${row.entry.cardId}.`,
        cardId: row.entry.cardId,
      });
      continue;
    }

    const { superCategory, subCategory } = classifyCard(card);
    const cardName = card.name;
    const canonicalName = toCanonicalCardName(cardName);
    const isBasicPokemon = superCategory === 'pokemon' && subCategory === 'basic-pokemon';
    const isBasicEnergy =
      superCategory === 'energy' &&
      (subCategory === 'basic-energy' || BASIC_ENERGY_NAMES.has(cardName));
    const isRadiant = /^Radiant\s/u.test(cardName);
    const isPrismStar = /[◇♦]/u.test(cardName);
    const isAceSpec = /ACE\s*SPEC/u.test(card.rarity ?? '');

    cards.push({
      cardId: card.id,
      name: cardName,
      canonicalName,
      quantity: row.entry.quantity,
      superCategory,
      subCategory,
      isBasicPokemon,
      isBasicEnergy,
      isRadiant,
      isAceSpec,
      isPrismStar,
      legalStandard: card.legal?.standard === true,
      legalExpanded: card.legal?.expanded === true,
    });
  }

  return { cards, issues };
}

function buildSummary(cards: DeckResolvedCard[]): DeckCategorySummary {
  const summary: DeckCategorySummary = {
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
  };

  for (const card of cards) {
    summary.totalCards += card.quantity;

    if (card.superCategory === 'pokemon') {
      summary.pokemon.total += card.quantity;

      if (card.subCategory === 'basic-pokemon') {
        summary.pokemon.basic += card.quantity;
      } else if (card.subCategory === 'stage-1-pokemon') {
        summary.pokemon.stage1 += card.quantity;
      } else if (card.subCategory === 'stage-2-pokemon') {
        summary.pokemon.stage2 += card.quantity;
      } else if (card.subCategory === 'vmax-pokemon') {
        summary.pokemon.vmax += card.quantity;
      } else if (card.subCategory === 'vstar-pokemon') {
        summary.pokemon.vstar += card.quantity;
      } else {
        summary.pokemon.other += card.quantity;
      }
    }

    if (card.superCategory === 'trainer') {
      summary.trainer.total += card.quantity;

      if (card.subCategory === 'item-trainer') {
        summary.trainer.item += card.quantity;
      } else if (card.subCategory === 'supporter-trainer') {
        summary.trainer.supporter += card.quantity;
      } else if (card.subCategory === 'stadium-trainer') {
        summary.trainer.stadium += card.quantity;
      } else if (card.subCategory === 'tool-trainer') {
        summary.trainer.tool += card.quantity;
      } else {
        summary.trainer.other += card.quantity;
      }
    }

    if (card.superCategory === 'energy') {
      summary.energy.total += card.quantity;

      if (card.subCategory === 'basic-energy') {
        summary.energy.basic += card.quantity;
      } else if (card.subCategory === 'special-energy') {
        summary.energy.special += card.quantity;
      } else {
        summary.energy.other += card.quantity;
      }
    }

    if (card.isAceSpec) {
      summary.specials.aceSpecCount += card.quantity;
    }

    if (card.isRadiant) {
      summary.specials.radiantCount += card.quantity;
    }

    if (card.isPrismStar) {
      summary.specials.prismStarCount += card.quantity;
    }
  }

  return summary;
}

function buildCategorizedCards(cards: DeckResolvedCard[]): DeckCategorizedCard[] {
  return cards.map((card) => ({
    cardId: card.cardId,
    name: card.name,
    quantity: card.quantity,
    superCategory: card.superCategory,
    subCategory: card.subCategory,
    flags: {
      isBasicPokemon: card.isBasicPokemon,
      isBasicEnergy: card.isBasicEnergy,
      isAceSpec: card.isAceSpec,
      isRadiant: card.isRadiant,
      isPrismStar: card.isPrismStar,
    },
  }));
}

function validateDeckRules(cards: DeckResolvedCard[], format: DeckFormat): DeckValidationIssue[] {
  const issues: DeckValidationIssue[] = [];

  const totalCards = cards.reduce((acc, card) => acc + card.quantity, 0);
  if (totalCards !== 60) {
    issues.push({
      code: 'INVALID_TOTAL_SIZE',
      message: `El mazo debe tener exactamente 60 cartas. Actual: ${totalCards}.`,
    });
  }

  const basicPokemonCount = cards.reduce(
    (acc, card) => acc + (card.isBasicPokemon ? card.quantity : 0),
    0,
  );

  if (basicPokemonCount < 1) {
    issues.push({
      code: 'MISSING_BASIC_POKEMON',
      message: 'El mazo debe tener al menos 1 Pokémon Básico.',
    });
  }

  const byName = new Map<string, { name: string; quantity: number; hasBasicEnergy: boolean; hasPrismStar: boolean }>();

  for (const card of cards) {
    const group = byName.get(card.canonicalName) ?? {
      name: card.canonicalName,
      quantity: 0,
      hasBasicEnergy: false,
      hasPrismStar: false,
    };

    group.quantity += card.quantity;
    group.hasBasicEnergy = group.hasBasicEnergy || card.isBasicEnergy;
    group.hasPrismStar = group.hasPrismStar || card.isPrismStar;
    byName.set(card.canonicalName, group);
  }

  for (const group of byName.values()) {
    if (!group.hasBasicEnergy && group.quantity > 4) {
      issues.push({
        code: 'TOO_MANY_COPIES',
        message: `Máximo 4 copias permitidas de ${group.name}. Actual: ${group.quantity}.`,
        cardName: group.name,
      });
    }

    if (group.hasPrismStar && group.quantity > 1) {
      issues.push({
        code: 'TOO_MANY_PRISM_STAR',
        message: `Solo se permite 1 copia Prism Star por nombre: ${group.name}.`,
        cardName: group.name,
      });
    }
  }

  const aceSpecCount = cards.reduce((acc, card) => acc + (card.isAceSpec ? card.quantity : 0), 0);
  if (aceSpecCount > 1) {
    issues.push({
      code: 'TOO_MANY_ACE_SPEC',
      message: `Solo se permite 1 carta ACE SPEC en el mazo. Actual: ${aceSpecCount}.`,
    });
  }

  const radiantCount = cards.reduce((acc, card) => acc + (card.isRadiant ? card.quantity : 0), 0);
  if (radiantCount > 1) {
    issues.push({
      code: 'TOO_MANY_RADIANT',
      message: `Solo se permite 1 Pokémon Radiant en el mazo. Actual: ${radiantCount}.`,
    });
  }

  if (format === 'standard') {
    for (const card of cards) {
      if (!card.legalStandard) {
        issues.push({
          code: 'ILLEGAL_CARD_STANDARD',
          message: `Carta no legal en formato Standard: ${card.name}.`,
          cardId: card.cardId,
          cardName: card.name,
        });
      }
    }
  }

  if (format === 'expanded') {
    for (const card of cards) {
      if (!card.legalExpanded) {
        issues.push({
          code: 'ILLEGAL_CARD_EXPANDED',
          message: `Carta no legal en formato Expanded: ${card.name}.`,
          cardId: card.cardId,
          cardName: card.name,
        });
      }
    }
  }

  return issues;
}

export async function validateDeck(
  entries: DeckEntryInput[],
  format: DeckFormat = 'casual',
): Promise<DeckValidationResult> {
  const normalized = normalizeEntries(entries);
  const resolved = await resolveDeckCards(normalized.validEntries);
  const ruleIssues = validateDeckRules(resolved.cards, format);
  const issues = [...normalized.issues, ...resolved.issues, ...ruleIssues];
  const summary = buildSummary(resolved.cards);
  const categorizedCards = buildCategorizedCards(resolved.cards);

  return {
    format,
    isValid: issues.length === 0,
    issues,
    summary,
    categorizedCards,
  };
}

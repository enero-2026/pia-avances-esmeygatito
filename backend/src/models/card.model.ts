import { CARD_FIELDS_FULL, CARD_FIELDS_MINIMAL } from '../config/cardFields';
import { FullCard, MinimalCard } from '../types';

const IMAGE_QUALITY = 'high';
const IMAGE_EXTENSION = 'webp';

type UnknownRecord = Record<string, unknown>;

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function toLegalFlags(value: unknown): { standard: boolean; expanded: boolean } | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const flags = value as Record<string, unknown>;
  return {
    standard: flags.standard === true,
    expanded: flags.expanded === true,
  };
}

function toNullableNumberOrString(value: unknown): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  return null;
}

function toUnknownArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === 'object') {
    return [value];
  }

  return [];
}

export function buildImageUrlFromCard(card: UnknownRecord = {}): string | null {
  const imageUrl = toNullableString(card.imageUrl);
  if (imageUrl) {
    return imageUrl;
  }

  const image = toNullableString(card.image);
  if (!image) {
    return null;
  }

  if (image.endsWith('.png') || image.endsWith('.webp') || image.endsWith('.jpg')) {
    return image;
  }

  return `${image}/${IMAGE_QUALITY}.${IMAGE_EXTENSION}`;
}

export function toMinimalCard(card: UnknownRecord = {}): MinimalCard {
  return {
    id: toNullableString(card.id),
    name: toNullableString(card.name),
    imageUrl: buildImageUrlFromCard(card),
  };
}

export function toFullCard(card: UnknownRecord = {}): FullCard {
  const set = (card.set as UnknownRecord | undefined) ?? undefined;
  const serie = (set?.serie as UnknownRecord | undefined) ?? undefined;

  return {
    id: toNullableString(card.id),
    name: toNullableString(card.name),
    category: toNullableString(card.category),
    stage: toNullableString(card.stage),
    trainerType: toNullableString(card.trainerType),
    energyType: toNullableString(card.energyType),
    regulationMark: toNullableString(card.regulationMark),
    legal: toLegalFlags(card.legal),
    set: set
      ? {
          id: toNullableString(set.id),
          name: toNullableString(set.name),
          serie: serie
            ? {
                id: toNullableString(serie.id),
                name: toNullableString(serie.name),
              }
            : null,
        }
      : null,
    rarity: toNullableString(card.rarity),
    types: toUnknownArray(card.types).filter((item): item is string => typeof item === 'string'),
    hp: toNullableNumberOrString(card.hp),
    attacks: toUnknownArray(card.attacks),
    weaknesses: toUnknownArray(card.weaknesses),
    resistances: toUnknownArray(card.resistances),
    retreatCost: toNullableNumberOrString(card.retreat ?? card.retreatCost),
    imageUrl: buildImageUrlFromCard(card),
  };
}

export function pickFields<T, K extends keyof T>(
  entity: T,
  fields: readonly K[],
): Pick<T, K> {
  return fields.reduce((accumulator, field) => {
    accumulator[field] = entity[field];
    return accumulator;
  }, {} as Pick<T, K>);
}

export function toMinimalCardFields(card: UnknownRecord = {}): MinimalCard {
  return pickFields(toMinimalCard(card), CARD_FIELDS_MINIMAL);
}

export function toFullCardFields(card: UnknownRecord = {}): FullCard {
  return pickFields(toFullCard(card), CARD_FIELDS_FULL);
}

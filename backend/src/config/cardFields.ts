import type { CardDetailFrontend, FullCard, MinimalCard } from '../types';

export const CARD_FIELDS_MINIMAL = ['id', 'name', 'imageUrl'] as const satisfies readonly (keyof MinimalCard)[];

export const CARD_FIELDS_FULL = [
  'id',
  'name',
  'category',
  'stage',
  'trainerType',
  'energyType',
  'regulationMark',
  'legal',
  'set',
  'rarity',
  'types',
  'hp',
  'attacks',
  'weaknesses',
  'resistances',
  'retreatCost',
  'imageUrl',
] as const satisfies readonly (keyof FullCard)[];

export const CARD_DETAIL_VIEW = [
  'name',
  'category',
  'stage',
  'trainerType',
  'energyType',
  'rarity',
  'hp',
  'retreatCost',
  'imageUrl',
] as const satisfies readonly (keyof CardDetailFrontend)[];
export const CARD_HISTORY_FIELDS = CARD_FIELDS_FULL;

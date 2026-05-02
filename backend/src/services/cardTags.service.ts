import { FullCard } from '../types';

function hpBucket(hp: number | string | null): string | null {
  const value = typeof hp === 'string' ? Number.parseInt(hp, 10) : hp;

  if (!Number.isFinite(value)) {
    return null;
  }

  if ((value as number) < 70) {
    return 'HP_LOW';
  }

  if ((value as number) < 130) {
    return 'HP_MID';
  }

  return 'HP_HIGH';
}

export function buildCardTags(card: FullCard): string[] {
  const tags = new Set<string>();

  card.types.forEach((type) => {
    if (type) {
      tags.add(`TYPE_${type.toUpperCase().replace(/\s+/g, '_')}`);
    }
  });

  if (card.rarity) {
    tags.add(`RARITY_${card.rarity.toUpperCase().replace(/\s+/g, '_')}`);
  }

  const hpTag = hpBucket(card.hp);
  if (hpTag) {
    tags.add(hpTag);
  }

  if (card.attacks.length > 0) {
    tags.add('HAS_ATTACKS');
  }

  if (card.weaknesses.length > 0) {
    tags.add('HAS_WEAKNESSES');
  }

  if (card.resistances.length > 0) {
    tags.add('HAS_RESISTANCES');
  }

  if (card.retreatCost !== null) {
    tags.add('HAS_RETREAT_COST');
  }

  if (card.set?.name) {
    tags.add(`SET_${card.set.name.toUpperCase().replace(/\s+/g, '_')}`);
  }

  return [...tags];
}

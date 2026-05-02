import { CARD_DETAIL_VIEW, CARD_HISTORY_FIELDS } from '../config/cardFields';
import { pickFields } from '../models/card.model';
import { FullCard } from '../types';
import { getCardById } from './cards.service';

export function formatCardDetail(card: FullCard) {
  return {
    frontend: pickFields(card, CARD_DETAIL_VIEW),
    history: pickFields(card, CARD_HISTORY_FIELDS),
  };
}

export async function getCardDetail(id: string) {
  const fullCard = await getCardById(id);

  if (!fullCard) {
    return null;
  }

  return formatCardDetail(fullCard);
}

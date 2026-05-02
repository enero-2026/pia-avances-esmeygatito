import { Router } from 'express';
import {
    DeckEntryInput,
    DeckFormat,
    validateDeck,
} from '../services/deckValidation.service';

const router = Router();

function parseFormat(value: unknown): DeckFormat {
  const format = typeof value === 'string' ? value.trim().toLowerCase() : '';

  if (format === 'standard' || format === 'expanded' || format === 'unlimited' || format === 'casual') {
    return format;
  }

  return 'casual';
}

function parseEntries(value: unknown): DeckEntryInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((row) => {
    const item = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
    const cardId = typeof item.cardId === 'string' ? item.cardId : '';
    const quantity = typeof item.quantity === 'number' ? item.quantity : Number(item.quantity ?? 0);
    return { cardId, quantity };
  });
}

router.post('/validate', async (request, response, next) => {
  try {
    const body = request.body && typeof request.body === 'object' ? (request.body as Record<string, unknown>) : {};
    const entries = parseEntries(body.entries);
    const format = parseFormat(body.format);

    const result = await validateDeck(entries, format);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;

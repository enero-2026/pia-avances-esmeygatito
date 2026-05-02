import { Router } from 'express';
import {
  createMatch,
  getMatchById,
  getMatchStats,
  listMatches,
} from '../services/matches.service';

const router = Router();

router.get('/', async (request, response, next) => {
  try {
    const limit = Number(request.query.limit ?? 20);
    const offset = Number(request.query.offset ?? 0);

    const data = await listMatches(limit, offset);
    response.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/stats', async (_request, response, next) => {
  try {
    const stats = await getMatchStats();
    response.json(stats);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (request, response, next) => {
  try {
    const match = await getMatchById(request.params.id);

    if (!match) {
      response.status(404).json({
        error: 'MATCH_NOT_FOUND',
        message: `No match found with id ${request.params.id}`,
      });
      return;
    }

    response.json(match);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (request, response, next) => {
  try {
    const match = await createMatch(request.body);
    response.status(201).json(match);
  } catch (error) {
    next(error);
  }
});

export default router;

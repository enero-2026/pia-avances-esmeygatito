import cors from 'cors';
import express from 'express';
import cardsRoutes from './routes/cards.routes';
import decksRoutes from './routes/decks.routes';
import matchesRoutes from './routes/matches.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use('/cards', cardsRoutes);
app.use('/decks', decksRoutes);
app.use('/matches', matchesRoutes);

app.use((error: Error, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error);
  response.status(500).json({
    message: 'Internal server error',
    error: error.message,
  });
});

export default app;

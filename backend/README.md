# Backend TCG Sim App

Backend REST para el simulador manual de TCG.

## Endpoints

- `GET /health`
- `GET /cards?page=1&pageSize=20` → retorna lista mínima de cartas: `{ id, name, imageUrl }` /*cómo  que minima*/
- `GET /cards/:id` → retorna vista frontend de detalle: `{ imageUrl }`
- `POST /decks/validate` → valida reglas de construcción de mazo y retorna categorización
- `POST /matches` → guarda una partida con cartas completas en `backend/data/matches.json` /*vamos a guardar una partida la vez*/
- `GET /matches?limit=20&offset=0` → historial paginado de partidas (resumen)
- `GET /matches/:id` → detalle completo de una partida (replay/action log/snapshot)
- `GET /matches/stats` → estadísticas agregadas (ganadores, duración promedio, turnos, top cartas)

## Validación de mazos (`POST /decks/validate`)

Body:

```json
{
  "format": "casual",
  "entries": [
    { "cardId": "sv05-157", "quantity": 1 },
    { "cardId": "tk-xy-su-1", "quantity": 10 }
  ]
}
```

`format` soportado: `casual`, `unlimited`, `expanded`, `standard`.

Reglas aplicadas:

- 60 cartas exactas.
- Regla de 4 copias por nombre (excepto Energía Básica).
- Al menos 1 Pokémon Básico.
- Máximo 1 ACE SPEC en todo el mazo.
- Máximo 1 Pokémon Radiant en todo el mazo.
- Prism Star: máximo 1 copia por nombre.
- Legalidad por formato (Expanded/Standard) usando metadata `legal` de TCGdex.

Respuesta:

- `isValid`: `true/false`
- `issues[]`: lista de errores de validación
- `summary`: conteo por categorías (Pokémon, Trainer, Energy, especiales)
- `categorizedCards[]`: cartas del mazo con categoría/subcategoría y flags

## Estructura de campos

### CARD_FIELDS_MINIMAL
//*uso esto??*//
Se usa para catálogo/frontend:   

- `id`: ID global de carta en TCGdex
- `name`: nombre de la carta
- `imageUrl`: URL final de imagen (`high.webp`)

### CARD_FIELDS_FULL

Se usa para historial de partidas:

- `id`: ID global único de la carta
- `name`: nombre de la carta
- `set`: objeto con información del set (`id`, `name`, `serie`)
- `rarity`: rareza textual de la carta
- `types`: tipos de la carta (array)
- `hp`: puntos de vida
- `attacks`: ataques con sus datos (array)
- `weaknesses`: debilidades (array)
- `resistances`: resistencias (array)
- `retreatCost`: costo de retirada (`retreat` en SDK normalizado)
- `imageUrl`: URL de imagen para renderizado o auditoría

## Scripts

Desde la raíz del proyecto:

- `npm run backend:start`

## Ejemplo `POST /matches`

```json
{
  "players": ["Alice", "Bob"],
  "winner": "Alice",
  "resultReason": "prize_win",
  "endedAt": "2026-04-18T19:30:00.000Z",
  "durationSeconds": 1320,
  "turnCount": 11,
  "notes": "Partida de prueba",
  "cardsUsed": ["swsh3-136", "swsh7-110"],
  "actionLog": [
    {
      "id": "a1",
      "timestamp": "2026-04-18T19:10:00.000Z",
      "type": "attack",
      "actor": "Alice",
      "payload": {
        "cardId": "swsh3-136",
        "damage": 120
      }
    }
  ],
  "boardSnapshot": {
    "activeByPlayer": { "Alice": "swsh3-136", "Bob": "swsh7-110" },
    "benchByPlayer": { "Alice": [], "Bob": [] },
    "discardByPlayer": { "Alice": [], "Bob": [] },
    "prizesByPlayer": { "Alice": 0, "Bob": 3 }
  }
}
```

El backend resuelve `cardsUsed` contra TCGdex y persiste las cartas completas en historial.  /**a que se refiere esto**/

## Week 7: Historial, Replay y Estadísticas

`POST /matches` ahora acepta metadata adicional (`resultReason`, `endedAt`, `durationSeconds`, `turnCount`, `actionLog`, `boardSnapshot`) para soportar replay y analítica.

`GET /matches` devuelve resúmenes para lista (sin repetir toda la carga del replay), mientras que `GET /matches/:id` devuelve el registro completo.

`GET /matches/stats` devuelve:

- `totalMatches`, `withWinner`, `withoutWinner`
- `avgDurationSeconds`, `avgTurnCount`
- `winsByPlayer[]`
- `topCardsUsed[]`

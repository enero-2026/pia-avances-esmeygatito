# Handoff Tecnico - Cambios Implementados (Semanas 4 a 7)

Este documento resume todo lo implementado de tu lado para que tu companera pueda integrar UI/flujo sin reescribir logica de reglas.

## 1) Resumen ejecutivo

Estado actual de tu lado:

- Semana 4: completo (validacion de mazos + categorizacion + contrato backend/frontend).
- Semana 5: completo en capa dominio (tablero y zonas, sin depender de UI).
- Semana 6: completo en base de interacciones de turno (restricciones, KO, premios, retiro, estados especiales).
- Semana 7: completo en backend base (historial, detalle, replay payload y estadisticas).

## 2) Cambios por semana

## Semana 4 - Reglas de construccion de mazo

Implementado:

- Motor de validacion desacoplado en backend.
- Endpoint para validar mazos.
- Categorizacion de cartas para uso en UI.
- Contratos tipados en frontend para consumir validacion.

Reglas cubiertas:

- Mazo de 60 exactas.
- Max 4 copias por nombre (excepto Basic Energy).
- Minimo 1 Pokemon Basico.
- Max 1 ACE SPEC.
- Max 1 Radiant Pokemon.
- Prism Star: max 1 por nombre.
- Legalidad por formato para `standard` y `expanded`.

Archivos clave:

- `backend/src/services/deckValidation.service.ts`
- `backend/src/routes/decks.routes.ts`
- `backend/src/app.ts`
- `services/tcgdexService.ts` (metodo `validateDeck` y tipos)

## Semana 5 - Dominio de tablero (board engine)

Implementado:

- Modelo de tablero por zonas de ambos jugadores + zona compartida.
- Setup inicial (draw inicial + prize cards).
- Reglas de movimiento entre zonas con validaciones de capacidad/ownership.
- Reemplazo de stadium con envio del anterior a descarte.
- Action log base.

Archivos clave:

- `services/gameBoardService.ts`
- `docs/Week5_Board_Domain_Guide.md`

Funciones de dominio listas para UI:

- `createBoard`
- `runInitialSetup`
- `moveCard`
- `drawCards`
- `attachFromHand`
- `knockOutPokemon`
- `takePrizeCards`
- `endTurn`
- `getPublicView`

## Semana 6 - Interacciones de turno

Implementado:

- Estado completo de turno con flags de restricciones.
- Reglas por turno para energia, supporter, stadium, retreat.
- KO con premios automaticos segun regla de carta.
- Flujo obligatorio de nuevo Active cuando cae el activo.
- Between-turn effects para poison/burn y transicion de turno.
- Enriquecimiento de `card detail` para construir perfiles de reglas.

Archivos clave:

- `services/gameBoardService.ts`
- `app/(tabs)/simulator.tsx`
- `services/tcgdexService.ts`
- `backend/src/types.ts`
- `backend/src/config/cardFields.ts`
- `docs/Week6_Turn_Interactions_Implemented.md`

Nuevas capacidades de UI conectadas:

- Hidratacion de metadatos faltantes (name/image) para mazos antiguos.
- Persistencia de metadatos hidratados a AsyncStorage.
- Render de carta por nombre/imagen (fallback a cardId si no hay metadata).

## Semana 7 - Historial, replay y estadisticas (backend)

Implementado:

- Contratos de partida extendidos (duracion, turnos, razon de resultado, actionLog, boardSnapshot).
- Normalizacion de registros legacy al leer `matches.json`.
- Listado paginado de partidas (summary).
- Detalle por id con payload completo para replay.
- Estadisticas agregadas por partidas y cartas.

Archivos clave:

- `backend/src/types.ts`
- `backend/src/services/matches.service.ts`
- `backend/src/routes/matches.routes.ts`
- `backend/src/app.ts`
- `services/tcgdexService.ts` (cliente para endpoints de matches)

## 3) Endpoints actuales disponibles

## Salud y cartas

- `GET /health`
- `GET /cards`
- `GET /cards/:id`
- `GET /cards/filters`

## Mazos

- `POST /decks/validate`

Body esperado:

```json
{
  "format": "casual",
  "entries": [
    { "cardId": "sv05-157", "quantity": 1 },
    { "cardId": "tk-xy-su-1", "quantity": 10 }
  ]
}
```

## Partidas (Semana 7)

- `POST /matches`
- `GET /matches?limit=20&offset=0`
- `GET /matches/:id`
- `GET /matches/stats`

Body extendido recomendado para `POST /matches`:

```json
{
  "players": ["player1", "player2"],
  "winner": "player1",
  "resultReason": "prize_win",
  "notes": "Partida de prueba",
  "cardsUsed": ["swsh3-136", "swsh7-110"],
  "endedAt": "2026-04-18T19:30:00.000Z",
  "durationSeconds": 1320,
  "turnCount": 11,
  "actionLog": [
    {
      "id": "a1",
      "timestamp": "2026-04-18T19:10:00.000Z",
      "type": "attack",
      "actor": "player1",
      "payload": { "damage": 120 }
    }
  ],
  "boardSnapshot": {
    "turn": { "currentPlayer": "player1", "number": 11, "phase": "main" },
    "zones": { "player1.active": { "count": 1 }, "player2.active": { "count": 1 } }
  }
}
```

Respuesta de `GET /matches/stats`:

- `totalMatches`
- `withWinner`
- `withoutWinner`
- `avgDurationSeconds`
- `avgTurnCount`
- `winsByPlayer[]`
- `topCardsUsed[]`

## 4) API frontend reutilizable para tu companera

En `services/tcgdexService.ts` ya estan listos estos metodos:

- `getCards(...)`
- `getCardDetails(id)`
- `getCardFilters(...)`
- `validateDeck(entries, format)`
- `createMatch(payload)`
- `getMatches(limit, offset)`
- `getMatchById(id)`
- `getMatchStats()`

Tipos utiles exportados para UI:

- Validacion mazos: `DeckEntryInput`, `DeckFormat`, `DeckValidationResult`, `DeckValidationIssue`.
- Historial/replay: `MatchRecord`, `MatchRecordSummary`, `MatchStats`, `MatchActionEvent`, `MatchBoardSnapshot`, `CreateMatchPayload`.

## 5) Persistencia local de mazos (ya integrada)

En `services/deckStorage.ts`:

- Key AsyncStorage: `@tcg/decks`
- Shape `SavedDeck` incluye:
  - `entries` (solo `cardId` + `quantity`)
  - `cardMeta` (`name` + `imageUrl`) para render rapido en UI
- Helpers:
  - `getSavedDecks`
  - `upsertDeck`
  - `removeDeck`
  - `buildDeckId`

Nota importante:

- Se agrego logica para hidratar metadata faltante en mazos viejos usando `getCardDetails` y luego persistirla.

## 6) Como integrarlo rapido (lado companera)

## Para pantalla de historial (Semana 7 UI)

- Lista: consumir `TCGService.getMatches(limit, offset)`.
- Detalle/replay: consumir `TCGService.getMatchById(id)`.
- Dashboard stats: consumir `TCGService.getMatchStats()`.

## Para simulador visual

- Usar `GameBoardService` como unica fuente de reglas.
- No duplicar validaciones de turno en componentes.
- Guardar partida al finalizar con `createMatch` incluyendo `actionLog` y `boardSnapshot`.

## Para deck builder

- Validar siempre con `validateDeck` antes de guardar/publicar.
- Mostrar `issues[]` tal cual backend para evitar divergencias.

## 7) Pending conocidos (no bloqueantes para integrar)

Pendientes intencionales para futuras semanas:

- Motor completo de evolucion (`evolvesFrom` real).
- Resolucion completa de ataques con weakness/resistance por tipo.
- Motor de habilidades y efectos persistentes de cartas.
- UX de drag and drop avanzado (tu companera).
- Seleccion manual de energias para retreat en UI (actualmente validado en dominio, UX mejorable).

## 8) Riesgos y notas operativas

- Si TCGdex/upstream falla temporalmente, puede aparecer `UPSTREAM_UNAVAILABLE`.
- El backend de matches ya normaliza datos legacy al leer, para no romper historial existente.
- En Windows PowerShell, `npm`/`npx` pueden chocar con execution policy; usar `npm.cmd`/`npx.cmd` cuando aplique.

## 9) Checks rapidos para validar integracion

Desde raiz del repo:

```bash
npm run backend:typecheck
```

Smoke tests manuales recomendados:

- Crear mazo y validar reglas (errores + summary).
- Simular partida corta y guardar con `POST /matches`.
- Abrir historial con `GET /matches`.
- Abrir detalle con `GET /matches/:id`.
- Ver metricas con `GET /matches/stats`.

## 10) Documentos complementarios ya existentes

- `docs/Deck_CRUD_Integration_Guide.md`
- `docs/Week5_Board_Domain_Guide.md`
- `docs/Week6_Turn_Interactions_Implemented.md`
- `docs/game_rules/Deck_Construction_Rules.md`
- `docs/game_rules/Turn_Interactions.md`

Si tu companera necesita contexto funcional de negocio, empezar por este handoff y luego bajar a los documentos por semana.
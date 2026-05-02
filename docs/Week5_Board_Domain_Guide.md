# Semana 5 — Dominio de Tablero (Tu lado)

Este documento describe lo implementado para tu parte de Semana 5 usando las reglas de zonas.

## Archivo principal

- `services/gameBoardService.ts`

## Objetivo cumplido

Se implementó una capa de dominio desacoplada de UI para que tu compañera conecte drag & drop y pantalla de tablero en Semana 6.

## Qué incluye

1. Modelo de tablero simétrico
   - Zonas por jugador: `deck`, `hand`, `active_spot`, `bench`, `prize_cards`, `discard_pile`, `lost_zone`
   - Zona compartida: `stadium`
   - Reglas de capacidad incluidas (Active=1, Bench=5, Prize=6, Stadium=1)

2. Reglas base de transición entre zonas
   - Validación de capacidad de destino
   - Bloqueo de salida desde `lost_zone`
   - Validación de ownership en movimientos
   - Reemplazo de `stadium` (el estadio anterior se envía a discard de su dueño)

3. Setup inicial del juego
   - `createBoard` valida mazos de 60 por jugador
   - `runInitialSetup` aplica robo inicial (7) + prize cards (6)
   - Nota: Mulligan y Sudden Death quedan pendientes para Semana 6+

4. Action log básico
   - Tipos: `move`, `draw`, `attach`, `ko`, `prize`, `setup`, `turn`
   - Cada acción guarda actor, timestamp y payload

5. Operaciones de dominio listas para UI
   - `createBoard`
   - `runInitialSetup`
   - `moveCard`
   - `drawCards`
   - `attachFromHand`
   - `knockOutPokemon`
   - `takePrizeCards`
   - `endTurn`
   - `getPublicView`

## Flujo recomendado de uso (UI)

1. Crear board con dos mazos válidos:

```ts
const created = GameBoardService.createBoard({
  player1Deck: deckA.entries,
  player2Deck: deckB.entries,
  startingPlayer: "player1",
});
```

2. Aplicar setup inicial:

```ts
const setup = GameBoardService.runInitialSetup(created.board);
```

3. Usar mutaciones de dominio ante acciones UI:

- mover carta: `moveCard`
- robar: `drawCards`
- adjuntar: `attachFromHand`
- KO: `knockOutPokemon`
- tomar premios: `takePrizeCards`
- pasar turno: `endTurn`

4. Renderizar vista por jugador:

```ts
const boardView = GameBoardService.getPublicView(board, "player1");
```

## Límites deliberados de esta iteración

- No se implementa mulligan.
- No se implementa sudden death.
- No se implementa todavía validación completa de condiciones especiales.
- No se implementa todavía motor de daño/ataque.

Estos puntos quedan preparados para extenderse en Semana 6–7 sin romper el contrato actual.

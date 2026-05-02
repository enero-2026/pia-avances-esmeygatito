# Semana 6 — Implementación (lado reglas/interacciones)

Basado en `docs/game_rules/Turn_Interactions.md`.

## Archivos actualizados

- `services/gameBoardService.ts`
- `backend/src/types.ts`
- `backend/src/config/cardFields.ts`
- `services/tcgdexService.ts`
- `app/(tabs)/simulator.tsx`

## Qué se implementó

## 1) Estado de turno completo

Se amplió `BoardState.turn` con:

- `phase`
- `firstPlayer`
- `isFirstTurnOfGame`
- `energyAttachedThisTurn`
- `retreatUsed`
- `supporterPlayedThisTurn`
- `stadiumPlayedThisTurn`
- `attackedThisTurn`
- `extraEnergyAttaches`
- `mustChooseNewActive`
- `mustChoosePrizeCard`

## 2) Estado de carta en juego

`BoardCard` ahora contiene:

- `profile` (categoria/stage/trainerType/energyType/hp/retreatCost/rule box)
- `damageCounters`
- `specialCondition`
- `rotation`
- `poisonCountersPerTurn`
- `turnPlayedOrEvolved`

## 3) Reglas de acciones por turno

Implementadas validaciones para:

- Adjuntar energía (`attachFromHand`) con límite por turno.
- Supporter: máximo 1 por turno + bloqueo en turno 1 del primer jugador.
- Stadium: máximo 1 por turno + reemplazo de stadium anterior.
- Retreat (`retreatActive`): 1 por turno, bloqueo por Asleep/Paralyzed, pago de energías.

## 4) KO + premios + reemplazo obligatorio

- KO mueve carta y adjuntos al descarte.
- Premio automático al oponente según `hasRuleBox` / `isTagTeam`.
- Si cae Activo y hay banca: activa `mustChooseNewActive`.
- Se agregó `selectNewActiveFromBench` para resolver esa decisión.

## 5) Between turns + transición de turno

En `endTurn`:

- Aplica daño por Poison/Burn al activo del jugador que termina.
- Burn tira moneda para curar o persistir.
- Resuelve KO por condiciones si aplica.
- Cambia jugador activo, resetea flags por turno, cura reglas de Asleep/Paralyzed del jugador entrante, roba 1 carta al inicio del nuevo turno.

## 6) Metadatos de carta para reglas

Se amplió `getCardDetails` para incluir:

- `category`, `stage`, `trainerType`, `energyType`, `rarity`, `hp`, `retreatCost`

Esto permite crear perfiles y validar acciones por zona.

## 7) Simulador (UI mínima para flujo obligatorio)

- Al iniciar partida, se construyen `cardProfiles` desde `getCardDetails` y se pasan a `createBoard`.
- Se agregó botón para resolver selección obligatoria de nuevo Active cuando `mustChooseNewActive=true`.

## Pendientes intencionales (Semana 7+)

- Evolución completa (`evolvesFrom`, stack evolutivo real).
- Cálculo de ataque completo con Weakness/Resistance por tipo.
- Drag&Drop visual (tu compañera).
- Selector manual de energías para retreat en UI.
- Resolución completa de abilities y efectos de cartas.

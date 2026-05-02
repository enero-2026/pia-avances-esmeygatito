# Semana 6 - Interaccion 

## Resumen

En esta semana se implemento la parte de frontend del simulador, alineada con el trabajo de reglas que ya estaba definido en el documento de semana 6.



## Alineacion con el alcance

Puntos solicitados para Esme:

1. Drag and Drop de cartas.
2. Contadores (vida, energia, etc.).
3. Sistema de turnos (boton pasar turno).

Estado:

- Drag and Drop: implementado en UI.
- Contadores: implementados en UI.
- Turnos: implementado en UI.

## Archivo actualizado

- app/(tabs)/simulator.tsx

## Cambios implementados

### 1) Drag and Drop en UI

Se agrego arrastre visual para cartas del lado del jugador:

- Mano
- Bench
- Active Spot

Comportamiento:

- Se puede arrastrar usando un handle visual Mover.
- Existen objetivos de soltado visibles: Active, Bench, Descartar y Adj. Active.
- Se muestra vista previa flotante durante el arrastre.
- Se muestra resaltado del objetivo cuando el puntero esta encima.

Importante:

- No se implementaron reglas nuevas en frontend.
- El resultado final siempre se resuelve con funciones existentes de GameBoardService.

### 2) Contadores visibles en cartas

Se agregaron indicadores para mejorar lectura de estado:

- HP restante y dano en Pokemon.
- Energia adjunta y total de adjuntos.
- Condicion especial (Quemado, Envenenado, Dormido, Paralizado, Confundido).

Estos datos se leen del estado actual de BoardCard y solo se representan en UI.

### 3) Sistema de turnos en interfaz

Mejoras en la seccion de turno:

- Boton principal etiquetado como Pasar turno.
- Chip de fase actual del turno (draw, main, attack, between_turns).

La logica de avance de turno sigue delegada al dominio existente.

### 4) Usabilidad mobile/desktop para zonas con cartas

Se mejoro el desplazamiento horizontal en filas de cartas:

- Mano, Bench y Discard con scroll horizontal robusto.
- Indicador visual adicional de scroll en la mano para dejar claro que hay mas cartas.

## Integracion con trabajo previo (sin retrabajo)

Se reutilizaron funciones existentes del dominio, sin cambiar contratos:

- moveCard
- attachFromHand
- retreatActive
- selectNewActiveFromBench
- knockOutPokemon
- endTurn
- getPublicView

No hubo cambios en:

- services/gameBoardService.ts
- backend/src

## Nota para demo

Flujo recomendado para mostrar semana 6:

1. Iniciar partida.
2. Arrastrar carta de mano a Active o Bench.
3. Arrastrar desde Bench/Active segun el objetivo permitido.
4. Ver contadores de HP, dano, energia y estado.
5. Presionar Pasar turno y observar cambio de fase y jugador.


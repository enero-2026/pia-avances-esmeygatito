# Semana 5 - Tablero Base (UI)

## Resumen

En esta semana se implemento la capa de interfaz para el simulador, usando el dominio existente de `GameBoardService` sin cambiar reglas de negocio.

Se cubren los 3 puntos del alcance:

1. UI del tablero de juego.
2. Sistema de zonas (mano, campo, descarte).
3. Navegacion entre catalogo y simulador.

## Alcance implementado

### 1) Navegacion

Se agrego una nueva tab de simulador en la navegacion principal:

- `app/(tabs)/_layout.tsx`
  - Nueva pantalla de tabs: `simulator`
  - Icono: `gamepad`

### 2) Pantalla del simulador

Se creo la pantalla principal del tablero:

- `app/(tabs)/simulator.tsx`

Incluye:

- Setup de partida con seleccion de mazo para player1 y player2 desde `getSavedDecks`.
- Creacion de partida con:
  - `GameBoardService.createBoard(...)`
  - `GameBoardService.runInitialSetup(...)`
- Vista del tablero en mobile-first:
  - Zona oponente (arriba)
  - Zona compartida stadium (centro)
  - Zona del jugador (abajo)
- Cambio de perspectiva de vista (`Ver P1` / `Ver P2`) con `SegmentedButtons`.

### 3) Sistema de zonas en UI (mano, campo, descarte)

Zonas representadas visualmente:

- Campo:
  - `Active Spot`
  - `Bench`
- Mano:
  - Lista de cartas en mano del jugador visible
  - Acciones por carta
- Descarte:
  - Vista de descarte del jugador y del oponente
  - Se muestran ultimas cartas para inspeccion rapida

### 4) Acciones conectadas al dominio

Todas las acciones de UI usan funciones de `GameBoardService`:

- `drawCards`
- `moveCard`
- `attachFromHand`
- `takePrizeCards`
- `knockOutPokemon`
- `endTurn`
- `getPublicView`

Importante: no se agregaron reglas nuevas en frontend.
El frontend solo consume resultados del dominio y muestra errores por `Snackbar` con `issue.message`.

### 5) Trazabilidad

Se agrego panel de `Action log` en la UI para seguimiento rapido de jugadas.

## Flujo de uso (demo)

1. Ir a tab `Simulador`.
2. Seleccionar mazo P1 y mazo P2.
3. Pulsar `Iniciar partida`.
4. Ejecutar acciones:
   - `Robar`
   - Jugar carta de mano a `Active` o `Bench`
   - `Descartar` desde mano
   - `Adj. Activo`
   - `Premio`
   - `KO rival`
   - `Fin turno`
5. Revisar cambios en zonas y en `Action log`.

## Dependencias de backend usadas

No hubo cambios en backend.
Se uso el contrato existente de:

- `services/gameBoardService.ts`


Zonas del Tablero — Pokémon TCG (Reglas Oficiales para Implementación)

ESTRUCTURA GENERAL DEL TABLERO
Cada jugador tiene su PROPIA mitad del tablero con las siguientes zonas.
El tablero es SIMÉTRICO: Player 1 (abajo) y Player 2 (arriba, invertido).

Total de zonas por jugador: 7 zonas
Total de zonas compartidas: 1 (Stadium)
Total de zonas en el tablero completo: 15

DIAGRAMA DE LAYOUT (Vista desde Player 1)
╔══════════════════════════════════════════════════════════════╗
║                                              [LOST ZONE P2]  ║
║                                                              ║
║                 [BENCH P2: máx 5 Pokémon]                    ║
║    [DISCARD P2]                          [PRIZE CARDS P2 x6] ║
║    [DECK P2]        [ACTIVE SPOT P2]                         ║
║ ───[STADIUM]───────────────────────────────────────────────  ║
║                     [ACTIVE SPOT P1]          [DECK P1]      ║
║ [PRIZE CARDS P1 x6]                           [DISCARD P1]   ║
║                 [BENCH P1: máx 5 Pokémon]                    ║
║                                                              ║
║  [LOST ZONE P1]                                              ║
╚══════════════════════════════════════════════════════════════╝

DEFINICIÓN COMPLETA DE CADA ZONA

ZONA 1 — DECK (Mazo)
NOMBRE OFICIAL : Deck
VISIBILIDAD    : PRIVADA — ningún jugador puede ver el orden de las cartas
DUEÑO          : Cada jugador tiene el suyo
POSICIÓN       : Esquina derecha de su mitad del tablero

REGLAS:
  - Comienza con exactamente 60 cartas, barajadas.
  - Las cartas están boca abajo (face-down).
  - El orden es desconocido (información privada).
  - Al inicio de cada turno, el jugador activo roba 1 carta al top del mazo.
  - Si un jugador NO puede robar una carta al inicio de su turno → PIERDE la partida.
  - Se puede "buscar" en el mazo con efectos de cartas (ej: Quick Ball, Ultra Ball).
    → Después de buscar, se BARAJA el mazo.
  - Nunca se puede mirar el mazo sin un efecto que lo permita explícitamente.
  - El mazo puede quedar vacío (no es ilegal), pero perder si no puedes robar al inicio del turno.

TRANSICIONES POSIBLES (cartas pueden salir hacia):
  → Hand (robo normal o efectos)
  → In Play / Bench (efectos que ponen Pokémon directamente)
  → Discard Pile (efectos de descarte desde el mazo)
  → Prize Cards (solo al setup inicial)
  → Lost Zone (efectos específicos)

ZONA 2 — HAND (Mano)
NOMBRE OFICIAL : Hand
VISIBILIDAD    : PRIVADA para el oponente / VISIBLE solo para el dueño
DUEÑO          : Cada jugador tiene la suya
POSICIÓN       : Sostenida en la mano del jugador (UI: zona inferior del jugador activo)

REGLAS:
  - No hay límite de cartas en la mano (excepto efectos específicos de cartas).
  - Al setup inicial: cada jugador roba 7 cartas.
  - Si no hay Pokémon Básico en la mano inicial → MULLIGAN:
      1. Mostrar la mano al oponente.
      2. Barajar de regreso al mazo.
      3. El oponente puede robar 1 carta extra por cada mulligan del jugador.
      4. Volver a robar 7 cartas. Repetir hasta tener al menos 1 Básico.
  - Cartas en mano se juegan durante el turno del jugador.
  - La mano puede estar vacía (es válido, incluso sin cartas = mano vacía, no null).
  - Efectos de "discard your hand" funcionan aunque la mano esté vacía.

TRANSICIONES POSIBLES (cartas pueden salir hacia):
  → In Play / Active Spot / Bench (jugar Pokémon)
  → Discard Pile (jugar Trainers Item/Supporter, o descartes forzados)
  → Attached to Pokémon (adjuntar Energía o Tool)
  → Deck (efectos de barajar la mano)
  → Lost Zone (efectos específicos)

ZONA 3 — ACTIVE SPOT (Zona de Batalla)
NOMBRE OFICIAL : Active Spot (también llamado "Battle Position")
VISIBILIDAD    : PÚBLICA — todas las cartas face-up
DUEÑO          : Cada jugador tiene el suyo
POSICIÓN       : Centro de su mitad, orientado hacia el oponente

REGLAS:
  - Solo puede haber exactamente 1 Pokémon Activo por jugador en todo momento.
  - Es el único Pokémon que puede ATACAR.
  - Es el único Pokémon que puede RETIRARSE (Retreat).
  - Recibe daño directamente de los ataques del oponente.
  - Si el Pokémon Activo es Knocked Out (KO):
      → Va al Discard Pile junto con todas sus cartas adjuntas (Energías, Tools).
      → El oponente roba Prize Cards (1 normal, 2 si era EX/GX/V/VMAX/VSTAR, 3 si era TAG TEAM/MEGA).
      → El dueño debe poner un Pokémon del Bench como nuevo Activo.
      → Si el Bench está vacío y no puede poner uno → PIERDE la partida.
  - Puede tener Condiciones Especiales (Special Conditions):
      → Burned (Quemado): voltear moneda al final del turno, si cara = 20 daño.
      → Poisoned (Envenenado): 10 daño entre turnos (o más si el efecto lo indica).
      → Asleep (Dormido): no puede atacar ni retirarse; voltear moneda al inicio del turno.
      → Paralyzed (Paralizado): no puede atacar ni retirarse; se cura al siguiente turno del dueño.
      → Confused (Confundido): al atacar, voltear moneda; si cruz = 30 daño a sí mismo.
  - Solo puede tener UNA Condición Especial a la vez (la nueva reemplaza la anterior).
  - Evolucionar al Pokémon Activo CURA todas sus Condiciones Especiales.
  - Retreating también cura todas las Condiciones Especiales.

CARTAS ADJUNTABLES AL POKÉMON EN ACTIVE SPOT:
  - Energy cards (Basic o Special)
  - Pokémon Tool (máx 1 Tool por Pokémon)
  - Contadores de daño (Damage Counters, usualmente fichas de 10 y 50)

TRANSICIONES POSIBLES:
  → Bench (al retirarse / Retreat, pagando el costo de retirada en Energías)
  → Discard Pile (si es KO)
  → Evoluciona "in place" (el nuevo Pokémon queda en Active Spot)

ZONA 4 — BENCH (Banca)
NOMBRE OFICIAL : Bench
VISIBILIDAD    : PÚBLICA — todas las cartas face-up
DUEÑO          : Cada jugador tiene la suya
POSICIÓN       : Fila de hasta 5 slots, detrás del Active Spot del jugador

REGLAS:
  - Capacidad MÁXIMA: 5 Pokémon en la Bench en cualquier momento.
  - NO hay mínimo (puede estar vacía si solo hay el Activo).
  - Los Pokémon en Bench NO pueden atacar.
  - Los Pokémon en Bench NO reciben daño de ataques normales
    (excepto efectos de cartas que dañan el Bench, ej: "spread damage").
  - Los Pokémon en Bench SÍ pueden:
      → Recibir Energías adjuntadas.
      → Ser objetivo de efectos de cartas.
      → Usar Abilities que no requieran estar Activo (verificar texto de cada carta).
      → Evolucionar.
  - Durante el turno del jugador, puede mover un Pokémon del Bench al Active Spot
    (solo al Retreat, o si el Activo fue KO).
  - Si la Bench está llena (5/5) y un efecto ordena poner un Pokémon → se descarta.
  - Los Pokémon en Bench NO tienen Condiciones Especiales
    (se curan si retreat o si el efecto los envía al Bench).
  - Si un Pokémon en Bench es KO (por daño de spread/Bench):
      → Va al Discard Pile.
      → El oponente roba Prize Cards normalmente.
      → NO se obliga a reemplazarlo.
  - Si el Bench está vacío y el Activo cae KO → el jugador dueño PIERDE.

TRANSICIONES POSIBLES:
  → Active Spot (al hacer Retreat o reemplazar Pokémon KO)
  → Discard Pile (si es KO por daño de Bench)
  → Permanece en Bench durante la evolución (Stage 1/2 se colocan encima)

ZONA 5 — PRIZE CARDS (Cartas Premio)
NOMBRE OFICIAL : Prize Cards
VISIBILIDAD    : PRIVADA — face-down (excepto efectos que las revelen)
DUEÑO          : Cada jugador tiene las suyas
POSICIÓN       : Esquina izquierda de su mitad del tablero, apiladas en un stack

REGLAS:
  - Al setup: cada jugador coloca las primeras 6 cartas del top de su mazo como Prizes,
    boca abajo, sin mirarlas.
  - Cuando el jugador KO al Pokémon Activo del oponente, roba Prize Cards:
      → Pokémon normal (no-Rule Box): robar 1 Prize Card
      → Pokémon con Rule Box (EX, GX, V, VMAX, VSTAR, ex): robar 2 Prize Cards
      → Pokémon Tag Team (TAG TEAM, MEGA): robar 3 Prize Cards
  - Las Prize Cards robadas van a la MANO del jugador (se vuelven jugables).
  - Si un jugador roba su ÚLTIMA Prize Card → GANA la partida inmediatamente.
  - Las Prize Cards son información privada (no se puede ver cuáles son) a menos que:
      → Una carta diga específicamente que puedes mirarlas.
      → Seas el dueño y uses un efecto que lo permita.
  - No se puede elegir qué Prize Card tomar (se toma del stack, a menos que un efecto lo permita).
  - Algunos efectos permiten escoger qué Prize Card tomar (ej: cartas como "Pal Pad" indirectamente).

TRANSICIONES POSIBLES:
  → Hand (al ser tomadas como premio tras un KO)

ZONA 6 — DISCARD PILE (Pila de Descarte)
NOMBRE OFICIAL : Discard Pile
VISIBILIDAD    : PÚBLICA — cualquier jugador puede ver todas las cartas en cualquier momento
DUEÑO          : Cada jugador tiene la suya
POSICIÓN       : Esquina derecha de su mitad (al lado del Deck)

REGLAS:
  - Las cartas se colocan boca arriba, en una pila.
  - Ambos jugadores pueden mirar el Discard Pile en cualquier momento.
  - El ORDEN en el Discard Pile es información pública.
  - Las cartas en el Discard Pile generalmente NO se pueden jugar
    (excepto mediante efectos de cartas que lo permitan explícitamente).
  - Ejemplos de cartas que interactúan con el Discard: Pal Pad, Energy Retrieval,
    Professor's Research (obliga a descartar la mano).
  - Energías en el Discard pueden ser recuperadas con efectos específicos.
  - Pokémon KO van al Discard junto con TODAS sus cartas adjuntas
    (Energías, Tools, Evolution cards bajo el Pokémon → todas al Discard).
  - Cartas Trainer (Item, Supporter) van al Discard después de ser usadas.
  - Stadium cards van al Discard cuando son reemplazadas por otro Stadium.

TRANSICIONES POSIBLES:
  → Deck (efectos de barajar el Discard de regreso, ej: "shuffle discard into deck")
  → Hand (efectos de recuperación)
  → In Play (efectos de recuperación directa)
  → Lost Zone (efectos específicos, UNIDIRECCIONAL)

ZONA 7 — LOST ZONE
NOMBRE OFICIAL : Lost Zone
VISIBILIDAD    : PÚBLICA — cualquier jugador puede ver las cartas
DUEÑO          : Cada jugador tiene la suya
POSICIÓN       : Encima de las Prize Cards (según el Tournament Handbook oficial)

REGLAS:
  - Es una zona de "eliminación permanente" del juego.
  - Las cartas en el Lost Zone NO pueden ser recuperadas por NINGÚN efecto durante la partida.
  - Es UNIDIRECCIONAL: nada sale del Lost Zone.
  - Solo ciertos efectos de cartas envían cartas al Lost Zone (ej: cartas de la serie Lost Origin).
  - El número de cartas en el Lost Zone de un jugador es información pública.
  - Algunas cartas tienen efectos que dependen de cuántas cartas hay en el Lost Zone
    (ej: Comfey, Colress's Experiment).
  - No confundir con el Discard Pile: Lost Zone es permanente, Discard puede recuperarse.

TRANSICIONES POSIBLES:
  → NINGUNA (zona terminal, sin salida)

NOTA PARA IMPLEMENTACIÓN:
  - Modelar como una lista que solo permite operaciones ADD, nunca REMOVE.
  - El count de la lista es una variable de estado relevante para efectos de cartas.

ZONA 8 — STADIUM (Compartida)
NOMBRE OFICIAL : Stadium Card Zone
VISIBILIDAD    : PÚBLICA
DUEÑO          : COMPARTIDA — ambos jugadores la usan
POSICIÓN       : Al lado del Active Spot (generalmente entre las dos mitades del tablero)

REGLAS:
  - Solo puede haber 1 Stadium activo en el campo a la vez.
  - Cualquier jugador puede jugar un Stadium desde su mano durante su turno.
  - Al jugar un nuevo Stadium:
      → El anterior va al Discard Pile de quien lo jugó originalmente.
  - Un jugador NO puede jugar un Stadium que tenga el MISMO NOMBRE que el Stadium actual.
  - El Stadium afecta a AMBOS jugadores (salvo que el texto de la carta indique lo contrario).
  - El Stadium permanece en juego hasta que:
      → Es reemplazado por otro Stadium.
      → Un efecto de carta lo descarte.
  - Los efectos del Stadium se aplican continuamente mientras está en juego.

TRANSICIONES POSIBLES:
  → Discard Pile (al ser reemplazado o descartado por efecto)

RESUMEN DE TODAS LAS ZONAS — TABLA DE REFERENCIA
┌─────────────────┬──────────────┬──────────────┬─────────┬──────────────────────────────┐
│ ZONA            │ VISIBILIDAD  │ DUEÑO        │ LÍMITE  │ DESCRIPCIÓN CORTA            │
├─────────────────┼──────────────┼──────────────┼─────────┼──────────────────────────────┤
│ Deck            │ Privada      │ Individual   │ 60 max  │ Mazo boca abajo              │
│ Hand            │ Privada      │ Individual   │ Sin lím │ Cartas en mano del jugador   │
│ Active Spot     │ Pública      │ Individual   │ 1 slot  │ Pokémon en batalla           │
│ Bench           │ Pública      │ Individual   │ 5 slots │ Pokémon de reserva           │
│ Prize Cards     │ Privada      │ Individual   │ 6 max   │ Premios boca abajo           │
│ Discard Pile    │ Pública      │ Individual   │ Sin lím │ Cartas usadas/descartadas    │
│ Lost Zone       │ Pública      │ Individual   │ Sin lím │ Zona terminal, sin retorno   │
│ Stadium         │ Pública      │ Compartida   │ 1 slot  │ Efecto de campo activo       │
└─────────────────┴──────────────┴──────────────┴─────────┴──────────────────────────────┘

REGLAS DE VISIBILIDAD / INFORMACIÓN (importante para UI)
INFORMACIÓN PÚBLICA (cualquier jugador puede ver):
  - Cartas en Discard Pile (propio y del oponente)
  - Cartas en Lost Zone (propio y del oponente)
  - Pokémon en Active Spot (propio y del oponente)
  - Pokémon en Bench (propio y del oponente)
  - Cartas adjuntas a Pokémon en juego (Energías, Tools, contadores de daño)
  - Stadium activo
  - Cantidad de cartas en Hand del oponente (solo el COUNT, no el contenido)
  - Cantidad de cartas en Deck del oponente (solo el COUNT)
  - Cantidad de Prize Cards restantes del oponente (solo el COUNT)
  - Cantidad de cartas en Lost Zone del oponente

INFORMACIÓN PRIVADA (solo el dueño puede ver):
  - Contenido de la propia Hand
  - Contenido y orden del propio Deck
  - Contenido de las propias Prize Cards
  - Contenido de la Hand del oponente (no visible)
  - Orden del Deck del oponente (no visible)
  - Prize Cards del oponente (no visibles, solo el conteo)

SETUP INICIAL — SECUENCIA DE LLENADO DE ZONAS
PASO 1: Ambos jugadores barajan sus mazos (60 cartas → Deck).
PASO 2: Tirar moneda → el ganador decide quién va primero.
PASO 3: Ambos roban 7 cartas (Deck → Hand).
PASO 4: Verificar Pokémon Básico en mano:
          - Si NO hay Básico → MULLIGAN (ver reglas de Mano).
PASO 5: Colocar Pokémon Activo boca abajo en Active Spot.
PASO 6: Colocar hasta 5 Pokémon Básicos boca abajo en el Bench.
PASO 7: Cada jugador coloca 6 cartas del top de su Deck → Prize Cards (boca abajo).
PASO 8: Revelar todos los Pokémon en juego (Active + Bench) → todos face-up.
PASO 9: ¡Comienza el juego!

CONDICIONES DE FIN DE PARTIDA
Un jugador GANA si se cumple CUALQUIERA de estas condiciones:

  WIN_1: El jugador toma su última Prize Card.
  WIN_2: El oponente no tiene Pokémon en juego (Active ni Bench) al inicio del turno del oponente.
  WIN_3: El oponente no puede robar una carta al inicio de su turno (Deck vacío).

CASO ESPECIAL — MUERTE SÚBITA (Sudden Death):
  - Si ambos jugadores ganan simultáneamente → Sudden Death.
  - Nueva partida, pero cada jugador coloca solo 1 Prize Card.
  - Quien la tome primero, gana.

REGLAS DE TRANSICIÓN ENTRE ZONAS (Motor de Movimiento)
PRINCIPIO CLAVE: "Cuando una carta cambia de zona, se considera una nueva instancia."
  → Esto permite que efectos "una vez por turno" se reactiven si la carta regresó
    de otra zona (ej: Darkrai-GX puede reactivar su efecto si salió y regresó).

REGLA DE ADJUNTOS:
  - Cuando un Pokémon deja el juego (KO, retreat, efecto), TODAS las cartas
    adjuntas a ese Pokémon van CON ÉL a su destino (normalmente Discard Pile).
  - Excepción: si el efecto específicamente dice qué pasa con los adjuntos.

REGLA DE EVOLUCIÓN (no es cambio de zona):
  - Evolucionar un Pokémon NO cuenta como cambio de zona.
  - El Pokémon evolucionado queda en la misma zona, con la nueva carta encima.
  - Los adjuntos (Energías, Tools) permanecen en el Pokémon evolucionado.
  - Las Condiciones Especiales se curan al evolucionar.
  - Daño acumulado se mantiene (no se cura al evolucionar, salvo efectos).

REGLA DE RETREAT:
  - El Pokémon Activo puede retirarse al Bench pagando su Retreat Cost en Energías.
  - Las Energías pagadas van al Discard Pile (no se pierden junto al Pokémon).
  - El jugador elige qué Pokémon del Bench pasa al Active Spot.
  - Solo se puede hacer Retreat UNA VEZ por turno.
  - Las Condiciones Especiales del Pokémon que hace Retreat se curan.

PSEUDOCÓDIGO — MODELO DE DATOS RECOMENDADO
typescript// Modelo de una zona
interface Zone {
  id: string
  name: ZoneName
  owner: "player1" | "player2" | "shared"
  visibility: "public" | "private" | "owner_only"
  maxCapacity: number | null          // null = sin límite
  cards: Card[]
  isTerminal: boolean                 // true solo para Lost Zone (no permite remove)
  isFaceDown: boolean                 // true para Deck, Hand, Prize Cards
}

// Zonas del tablero
type ZoneName =
  | "deck"
  | "hand"
  | "active_spot"
  | "bench"
  | "prize_cards"
  | "discard_pile"
  | "lost_zone"
  | "stadium"

// Tablero completo
interface Board {
  player1: {
    deck:        Zone   // maxCapacity: 60, private, face-down
    hand:        Zone   // maxCapacity: null, private
    activeSpot:  Zone   // maxCapacity: 1, public
    bench:       Zone   // maxCapacity: 5, public
    prizeCards:  Zone   // maxCapacity: 6, private, face-down
    discardPile: Zone   // maxCapacity: null, public
    lostZone:    Zone   // maxCapacity: null, public, isTerminal: true
  }
  player2: {
    // idéntica estructura
  }
  stadium: Zone         // maxCapacity: 1, public, shared
}

// Validaciones al mover cartas entre zonas
function moveCard(card: Card, from: Zone, to: Zone): Result {
  if (to.isTerminal && to.name !== "lost_zone")
    return Error("Zona no permite entradas")
  if (from.isTerminal)
    return Error("Lost Zone no permite salidas")
  if (to.maxCapacity && to.cards.length >= to.maxCapacity)
    return Error(`Zona ${to.name} está llena (max: ${to.maxCapacity})`)
  // mover carta...
}
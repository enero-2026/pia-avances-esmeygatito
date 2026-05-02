⚡ Semana 6: Interacción — Pokémon TCG
Reglas técnicas para implementación en código

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👩‍💻 PARTE DE ESME
Drag & Drop · Contadores · Sistema de Turnos
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. DRAG & DROP — MATRIZ DE MOVIMIENTOS VÁLIDOS
REGLA BASE: Una carta solo puede ser arrastrada si:
  1. Es el turno del jugador dueño de la carta.
  2. La acción que representa ese movimiento está disponible en ese momento del turno.
  3. La zona destino acepta ese tipo de carta.

Si alguna condición falla → el drop debe ser rechazado visualmente (snap back).
Tabla completa de Drag & Drop permitidos
┌────────────────────┬──────────────────────┬───────────────────────────────────────┐
│ CARTA (origen)     │ ZONA DESTINO válida  │ CONDICIÓN adicional                   │
├────────────────────┼──────────────────────┼───────────────────────────────────────┤
│ Pokémon Básico     │ Bench propia         │ Bench < 5 slots ocupados              │
│ (desde Hand)       │                      │ Es el turno propio                    │
├────────────────────┼──────────────────────┼───────────────────────────────────────┤
│ Pokémon Stage 1    │ Bench propia /       │ Existe el Básico correspondiente      │
│ (desde Hand)       │ Active Spot          │ El Básico lleva ≥1 turno en juego     │
│                    │                      │ No se puede evolucionar en turno 1    │
├────────────────────┼──────────────────────┼───────────────────────────────────────┤
│ Pokémon Stage 2    │ Bench propia /       │ Existe el Stage 1 correspondiente     │
│ (desde Hand)       │ Active Spot          │ El Stage 1 lleva ≥1 turno en juego    │
├────────────────────┼──────────────────────┼───────────────────────────────────────┤
│ Energía            │ Cualquier Pokémon    │ Max 1 energía adjuntada por turno     │
│ (desde Hand)       │ en Active o Bench    │ (salvo efecto de carta que permita +) │
├────────────────────┼──────────────────────┼───────────────────────────────────────┤
│ Trainer — Item     │ Discard Pile         │ Ilimitados por turno                  │
│ (desde Hand)       │ (tras resolverse)    │ El efecto se ejecuta al soltar        │
├────────────────────┼──────────────────────┼───────────────────────────────────────┤
│ Trainer — Supporter│ Discard Pile         │ MÁXIMO 1 Supporter por turno          │
│ (desde Hand)       │ (tras resolverse)    │ No jugable en turno 1 del 1er jugador │
├────────────────────┼──────────────────────┼───────────────────────────────────────┤
│ Trainer — Stadium  │ Stadium Zone         │ MÁXIMO 1 Stadium por turno            │
│ (desde Hand)       │                      │ No puede ser igual nombre al activo   │
├────────────────────┼──────────────────────┼───────────────────────────────────────┤
│ Pokémon Tool       │ Pokémon en juego     │ El Pokémon destino no tiene Tool ya   │
│ (desde Hand)       │ (Active o Bench)     │ Solo 1 Tool por Pokémon               │
├────────────────────┼──────────────────────┼───────────────────────────────────────┤
│ Pokémon en Bench   │ Active Spot          │ Solo al hacer Retreat del Activo      │
│ (desde Bench)      │                      │ O si el Activo fue KO                 │
├────────────────────┼──────────────────────┼───────────────────────────────────────┤
│ Pokémon Activo     │ Bench propia         │ Retreat: pagar costo en Energías      │
│ (desde Active)     │                      │ Max 1 Retreat por turno               │
│                    │                      │ No si está Paralyzed o Asleep         │
└────────────────────┴──────────────────────┴───────────────────────────────────────┘

MOVIMIENTOS SIEMPRE PROHIBIDOS (rechazar drop inmediatamente):
  ✗ Cualquier zona del oponente (excepto efectos de cartas — fuera del scope base)
  ✗ Lost Zone → cualquier zona (es terminal)
  ✗ Prize Cards → cualquier zona (excepto al tomar premio tras KO — automático)
  ✗ Deck → cualquier zona (solo mediante efectos de cartas)
  ✗ Carta de evolución → Pokémon incorrecto (nombre no coincide)
  ✗ Energía → Pokémon del oponente (excepto efectos específicos)
  ✗ Segunda Energía en el mismo turno (si ya se adjuntó una)
Feedback visual del Drag & Drop
ESTADO DEL DRAG:

  dragging = true
    → Mostrar la carta con opacidad 0.7, elevada (z-index alto)
    → Highlight en verde las zonas destino VÁLIDAS
    → Highlight en rojo/gris las zonas destino INVÁLIDAS

  hover sobre zona VÁLIDA:
    → Borde pulsante verde en la zona
    → Cursor: "grab" o ícono de soltar

  hover sobre zona INVÁLIDA:
    → Sin highlight, cursor: "not-allowed"

  drop en zona VÁLIDA:
    → Ejecutar acción, mover carta, actualizar estado
    → Animación de entrada a la zona

  drop en zona INVÁLIDA o fuera de zonas:
    → Snap back: la carta regresa a su posición original
    → Animación de rebote suave
    → Opcional: mostrar tooltip con razón del rechazo

2. CONTADORES — TIPOS Y REGLAS
2A. Damage Counters (Contadores de Daño)
UNIDAD BASE : 1 damage counter = 10 HP de daño
REPRESENTACIÓN: fichas sobre el Pokémon (físico) / número en UI (digital)

REGLAS:
  - Los damage counters se colocan sobre el Pokémon afectado.
  - Los counters PERMANECEN aunque el Pokémon evolucione.
  - Los counters SE ELIMINAN si el Pokémon es curado (por efecto de carta).
  - Los counters SE ELIMINAN completamente si el Pokémon es curado totalmente.
  - Cuando HP_actual ≤ 0 → el Pokémon es Knocked Out (KO).

  HP ACTUAL = HP_máximo - (damage_counters × 10)

  Si HP_actual ≤ 0 → trigger KO:
    1. Pokémon + adjuntos → Discard Pile del dueño
    2. Oponente toma Prize Cards (1 o 2 según tipo de Pokémon)
    3. Si era el Activo → dueño elige nuevo Pokémon del Bench como Activo

DAÑO ESPECIAL — al calcular ataque:
  daño_final = daño_base
  if oponente_tiene_Weakness al tipo atacante:
    daño_final = daño_final × 2       // Weakness siempre es ×2 en Scarlet & Violet
  if oponente_tiene_Resistance al tipo atacante:
    daño_final = daño_final - 30      // Resistance siempre es -30
  daño_final = max(0, daño_final)     // nunca negativo

  NOTA: Weakness y Resistance solo aplican al Pokémon ACTIVO, nunca al Bench.
2B. Special Condition Counters (Condiciones Especiales)
Solo el Pokémon ACTIVO puede tener Condiciones Especiales.
Solo puede tener UNA a la vez (la nueva reemplaza a la anterior).

┌─────────────────┬───────────────────┬────────────────────────────────────────────┐
│ CONDICIÓN       │ REPRESENTACIÓN    │ EFECTO EN CÓDIGO                           │
│                 │ VISUAL (física)   │                                            │
├─────────────────┼───────────────────┼────────────────────────────────────────────┤
│ BURNED          │ Marcador especial │ Entre turnos:                              │
│ (Quemado)       │ (ficha de fuego)  │   → Poner 2 damage counters (+20 daño)     │
│                 │                   │   → Lanzar moneda:                         │
│                 │                   │     Heads = Burned se cura                 │
│                 │                   │     Tails = Burned continúa               │
├─────────────────┼───────────────────┼────────────────────────────────────────────┤
│ POISONED        │ Marcador especial │ Entre turnos:                              │
│ (Envenenado)    │ (ficha morada)    │   → Poner 1 damage counter (+10 daño)      │
│                 │                   │   → (o más si el efecto lo especifica)     │
│                 │                   │   → No se cura sola (solo por efecto/      │
│                 │                   │     evolución/retreat)                     │
├─────────────────┼───────────────────┼────────────────────────────────────────────┤
│ ASLEEP          │ Pokémon rotado    │ No puede ATACAR ni RETIRARSE               │
│ (Dormido)       │ 90° antihorario   │ Al INICIO del turno del dueño:             │
│                 │                   │   → Lanzar moneda:                         │
│                 │                   │     Heads = se cura (girar carta normal)   │
│                 │                   │     Tails = sigue dormido                  │
├─────────────────┼───────────────────┼────────────────────────────────────────────┤
│ PARALYZED       │ Pokémon rotado    │ No puede ATACAR ni RETIRARSE               │
│ (Paralizado)    │ 90° horario       │ Se cura automáticamente al INICIO del      │
│                 │                   │ siguiente turno del dueño (sin moneda)     │
├─────────────────┼───────────────────┼────────────────────────────────────────────┤
│ CONFUSED        │ Pokémon rotado    │ Al intentar ATACAR:                        │
│ (Confundido)    │ 180°              │   → Lanzar moneda:                         │
│                 │                   │     Heads = ataque se ejecuta normal       │
│                 │                   │     Tails = 3 damage counters a sí mismo   │
│                 │                   │             (30 daño) y NO ataca           │
└─────────────────┴───────────────────┴────────────────────────────────────────────┘

CURACIÓN de Condiciones Especiales:
  - Evolucionar el Pokémon  → cura TODAS las condiciones
  - Retreat (retirarse)     → cura TODAS las condiciones
  - Efecto de carta         → cura según lo que diga la carta
  - Nueva condición especial → reemplaza (no apila) la condición anterior

NOTA PARA UI:
  Representar la rotación del Pokémon en el Active Spot:
    normal    →   0°  (no condition)
    Asleep    →  -90° (anti-clockwise)
    Paralyzed → +90°  (clockwise)
    Confused  → 180°
    Burned/Poisoned → sin rotación, solo marcador visual encima
2C. Prize Card Counter
CONTADOR: prizesRemaining por jugador (inicia en 6)

Al KO de Pokémon enemigo:
  if pokemonKO.type == "normal":        prizesRemaining -= 1
  if pokemonKO.type == "rule_box":      prizesRemaining -= 2  // EX, GX, V, VMAX, VSTAR, ex
  if pokemonKO.type == "tag_team":      prizesRemaining -= 3

  Las Prize Cards tomadas van a la mano del jugador (se hacen jugables).

if prizesRemaining <= 0: → WIN para el jugador que tomó la última Prize Card
2D. Retreat Cost Counter
CONTADOR POR TURNO: retreatUsed (boolean, reset a false al inicio de cada turno)

Al hacer Retreat:
  1. Verificar retreatUsed == false
  2. Verificar Pokémon Activo no está Asleep ni Paralyzed
  3. Verificar que tiene ≥ retreatCost energías adjuntas
  4. Descartar exactamente retreatCost energías (el jugador elige cuáles)
     → Las energías descartadas van al Discard Pile
  5. Mover Pokémon Activo → Bench
  6. Elegir Pokémon del Bench → Active Spot
  7. retreatUsed = true  (no puede retreat de nuevo este turno)

RETREAT COST = 0 → puede retirarse gratis (sin descartar energías)
               = número impreso en la carta (abajo a la derecha)
2E. Energy Attachment Counter
CONTADOR POR TURNO: energyAttachedThisTurn (boolean, reset a false al inicio de cada turno)

Al adjuntar Energía:
  1. Verificar energyAttachedThisTurn == false
  2. Adjuntar carta de Energía a cualquier Pokémon en juego (Active o Bench)
  3. energyAttachedThisTurn = true

EXCEPCIÓN: efectos de cartas pueden permitir adjuntar energía adicional
  → Implementar como flag: extraEnergyAttaches (int, default 0)
  → Total permitido = 1 + extraEnergyAttaches

3. SISTEMA DE TURNOS
3A. Estructura completa de un turno
FASE 0 — BETWEEN TURNS (entre turnos, automático)
  Ejecutar para el jugador cuyo turno ACABA DE TERMINAR:
  → Aplicar daño de Poison (+10 per Poisoned marker)
  → Aplicar daño de Burn (+20) y lanzar moneda (curar o no)
  → Verificar KO por condiciones (si HP ≤ 0 → trigger KO)
  → Pasar el turno al siguiente jugador

FASE 1 — DRAW (automático al inicio del turno)
  → El jugador activo roba 1 carta del top de su Deck → Hand
  → Si el Deck está vacío y no puede robar → PIERDE (win condition #3)
  → EXCEPCIÓN: El primer jugador en el primer turno del juego NO roba carta

FASE 2 — MAIN PHASE (acciones del jugador, en cualquier orden)
  Acciones disponibles (ver sección de Diego para detalle):
  A. Jugar Pokémon Básico al Bench
  B. Evolucionar Pokémon
  C. Adjuntar 1 Energía (una vez por turno)
  D. Jugar Trainer — Item (ilimitados)
  E. Jugar Trainer — Supporter (1 por turno)
  F. Jugar Trainer — Stadium (1 por turno)
  G. Usar Abilities (ilimitadas, según texto)
  H. Retreat (1 por turno)

  El jugador puede pasar el turno SIN atacar (opcional).

FASE 3 — ATTACK (opcional, termina el turno)
  → El jugador elige un ataque del Pokémon Activo
  → Se verifica que tiene las Energías necesarias
  → Se calcula el daño (con Weakness / Resistance)
  → Se aplican damage counters al Pokémon Activo del oponente
  → Se aplican efectos secundarios del ataque (Special Conditions, etc.)
  → Verificar si el Pokémon del oponente fue KO
  → El turno TERMINA (no se pueden hacer más acciones)

  EXCEPCIÓN TURNO 1: El primer jugador en el primer turno NO puede atacar.

TRANSICIÓN DE TURNO:
  → Ejecutar FASE 0 (between turns)
  → Cambiar activePlayer
  → Reset de contadores del turno:
      energyAttachedThisTurn = false
      retreatUsed = false
      supporterPlayedThisTurn = false
      stadiumPlayedThisTurn = false
      attackedThisTurn = false
      hasAttackedThisTurn = false
  → Resolver condición ASLEEP (lanzar moneda)
  → Resolver condición PARALYZED (curar automáticamente)
  → Ejecutar FASE 1 (draw)
3B. Botón "Pasar Turno" — lógica y estados
El botón "End Turn" / "Pasar Turno" debe:

ESTADO: HABILITADO cuando:
  → Es el turno del jugador local
  → El jugador NO está obligado a elegir algo (ej: reemplazar Pokémon KO)

ESTADO: DESHABILITADO cuando:
  → No es el turno del jugador local
  → El jugador debe tomar una decisión obligatoria:
      - Elegir un Pokémon del Bench para reemplazar al Activo KO
      - Elegir Prize Cards (si el efecto lo requiere)

ESTADO: BLOQUEADO VISUALMENTE cuando:
  → El jugador ya atacó (el turno termina automáticamente tras atacar)
  → Mostrar texto: "Turno terminado — esperando al oponente..."

AL HACER CLICK en "Pasar Turno":
  1. Marcar attackedThisTurn = false (pasó sin atacar)
  2. Ejecutar Fase 0 (between turns effects)
  3. Cambiar activePlayer al oponente
  4. Reset de todos los contadores de turno
  5. Ejecutar Fase 1 (draw del oponente)
  6. Actualizar UI (highlighted zones, available actions)

LABEL DEL BOTÓN según contexto:
  - "Pasar Turno"   → acción normal
  - "Terminar Ataque" → tras atacar, confirmar fin de turno
  - "Esperando..."  → turno del oponente
3C. Primer turno — restricciones especiales
isFirstTurnOfGame = true  (solo durante el primer turno del primer jugador)

RESTRICCIONES activas si isFirstTurnOfGame == true:
  ✗ No puede ATACAR
  ✗ No puede jugar cartas SUPPORTER
  ✗ No puede ROBAR carta al inicio (skip Draw Phase)
  ✓ Puede jugar Básicos al Bench
  ✓ Puede adjuntar Energía
  ✓ Puede jugar Items, Stadiums, Tools
  ✓ Puede usar Abilities

Cuando el primer jugador termina su turno:
  isFirstTurnOfGame = false
  El segundo jugador SÍ puede atacar y usar Supporters en su primer turno

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧑‍💻 PARTE DE DIEGO
Acciones por Zona · Estados de Cartas · Interacciones
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4. ESTADOS DE LAS CARTAS
4A. Estados generales (aplica a todas las cartas)
typescripttype CardState = {
  // Identidad
  id: string                        // UUID único por instancia de carta en juego
  cardDefinitionId: string          // ID de la carta base (nombre, tipo, stats)
  owner: "player1" | "player2"
  zone: ZoneName                    // zona actual de la carta

  // Visibilidad
  isFaceUp: boolean                 // false en Deck, Hand del oponente, Prize Cards
  isRevealed: boolean               // true si fue revelada por efecto aunque esté en mano

  // Rotación (para Special Conditions)
  rotation: 0 | 90 | -90 | 180     // 0=normal, -90=Asleep, 90=Paralyzed, 180=Confused

  // Solo si es Pokémon en juego (Active o Bench)
  pokemon?: PokemonInPlayState
}

type PokemonInPlayState = {
  // HP
  maxHP: number
  damageCounters: number            // HP_actual = maxHP - (damageCounters × 10)
  isKnockedOut: boolean             // true si damageCounters × 10 >= maxHP

  // Evolución
  stage: "basic" | "stage1" | "stage2" | "vmax" | "vstar"
  turnPlayedOrEvolved: number       // número de turno en que fue puesto/evolucionado
                                    // (para validar que lleva ≥1 turno antes de evolucionar)
  evolutionStack: CardState[]       // cartas debajo (Basic bajo Stage 1, etc.)

  // Adjuntos
  attachedEnergies: EnergyCard[]    // lista de energías adjuntas
  attachedTool: ToolCard | null     // máx 1 Tool
  attachedOther: Card[]             // otros adjuntos especiales

  // Condición especial (solo si está en Active Spot)
  specialCondition: "none" | "burned" | "poisoned" | "asleep" | "paralyzed" | "confused"
  burnMarker: boolean               // true si tiene el marcador de Burn
  poisonCountersPerTurn: number     // cuántos damage counters agrega el veneno por turno (default 1)

  // Habilidades usadas
  abilitiesUsedThisTurn: string[]   // IDs de habilidades "una vez por turno" ya usadas
  
  // Flags de reglas
  canEvolveThisTurn: boolean        // false si fue jugado este turno o ya evolucionó
  canRetreatThisTurn: boolean       // reflejado del retreatUsed del turno
  hasRuleBox: boolean               // true si es EX, GX, V, VMAX, VSTAR, ex (da 2 prizes)
  isTagTeam: boolean                // true si es TAG TEAM (da 3 prizes)
  isRadiant: boolean                // true si es Radiant Pokémon
}
```

### 4B. Estados específicos por zona
```
DECK:
  isFaceUp = false
  isInteractable = false (salvo efectos de búsqueda)
  displayCount = true (mostrar número de cartas restantes)

HAND (propia):
  isFaceUp = true  (visible para el dueño)
  isInteractable = true si es el turno propio
  isInteractable = false si es el turno del oponente

HAND (del oponente):
  isFaceUp = false  (solo se ve el dorso)
  displayCount = true (mostrar número de cartas)
  isInteractable = false siempre

ACTIVE SPOT:
  isFaceUp = true
  puede tener: damageCounters, specialCondition, attachedEnergies, attachedTool
  isInteractable = true para el dueño (puede atacar, retreat, usar ability)

BENCH:
  isFaceUp = true
  puede tener: damageCounters, attachedEnergies, attachedTool
  NO puede tener: specialCondition
  isInteractable = true para el dueño (puede adjuntar, evolucionar, seleccionar para retreat)

DISCARD PILE:
  isFaceUp = true (la del top es visible, todas accesibles para ver)
  isInteractable = false (salvo efectos de cartas)
  displayCount = true

PRIZE CARDS:
  isFaceUp = false (boca abajo)
  isInteractable = false (salvo al tomar premio — automático)
  displayCount = true

LOST ZONE:
  isFaceUp = true
  isInteractable = false (nunca)
  displayCount = true

STADIUM:
  isFaceUp = true
  isInteractable = false (permanece hasta ser reemplazado)
```

---

## 5. ACCIONES DISPONIBLES POR ZONA
```
Para cada acción, definir:
  - quién puede ejecutarla (activePlayer / any)
  - cuándo está disponible (fase del turno, flags de turno)
  - qué valida antes de ejecutarse
  - qué efectos produce
```

### 5A. Acciones sobre HAND (mano propia)
```
ACTION: PLAY_BASIC_POKEMON
  disponible si:  es mi turno
                  carta.type == "basic_pokemon"
                  bench.slots < 5
  produce:        mover carta Hand → Bench
                  turnPlayedOrEvolved = currentTurn
                  canEvolveThisTurn = false

ACTION: PLAY_EVOLUTION
  disponible si:  es mi turno
                  carta.type == "stage1" | "stage2"
                  existe Pokémon base correcto en Bench o Active Spot
                  pokemonBase.canEvolveThisTurn == true
                  NOT isFirstTurnOfGame
  produce:        colocar carta sobre el Pokémon base
                  pokemonBase.stage sube un nivel
                  pokemonBase.turnPlayedOrEvolved = currentTurn
                  pokemonBase.canEvolveThisTurn = false
                  pokemonBase.specialCondition = "none"  // curar condiciones
                  // damage counters se MANTIENEN

ACTION: ATTACH_ENERGY
  disponible si:  es mi turno
                  carta.type == "energy"
                  energyAttachedThisTurn == false
                  (o extraEnergyAttaches > 0 si hay efecto activo)
  produce:        mover carta Hand → attachedEnergies del Pokémon destino
                  energyAttachedThisTurn = true

ACTION: PLAY_ITEM
  disponible si:  es mi turno
                  carta.type == "trainer_item"
  produce:        ejecutar efecto de la carta
                  mover carta Hand → Discard Pile
                  (sin límite de veces por turno)

ACTION: PLAY_SUPPORTER
  disponible si:  es mi turno
                  carta.type == "trainer_supporter"
                  supporterPlayedThisTurn == false
                  NOT (isFirstTurnOfGame AND activePlayer == firstPlayer)
  produce:        ejecutar efecto de la carta
                  mover carta Hand → Discard Pile
                  supporterPlayedThisTurn = true

ACTION: PLAY_STADIUM
  disponible si:  es mi turno
                  carta.type == "trainer_stadium"
                  stadiumPlayedThisTurn == false
                  stadium.currentCard?.name != carta.name
  produce:        si hay Stadium activo → moverlo al Discard del dueño original
                  colocar nueva carta en Stadium Zone
                  stadiumPlayedThisTurn = true

ACTION: PLAY_TOOL
  disponible si:  es mi turno
                  carta.type == "pokemon_tool"
                  pokemonDestino.attachedTool == null
  produce:        adjuntar carta al Pokémon destino
                  pokemonDestino.attachedTool = carta
```

### 5B. Acciones sobre ACTIVE SPOT
```
ACTION: ATTACK
  disponible si:  es mi turno
                  attackedThisTurn == false
                  activeSpot.pokemon.specialCondition != "paralyzed"
                  activeSpot.pokemon.specialCondition != "asleep"
                  NOT isFirstTurnOfGame (si es el primer jugador en turno 1)
                  activeSpot.pokemon.attachedEnergies satisfacen costo del ataque
  si specialCondition == "confused":
    → lanzar moneda
    → Heads: ejecutar ataque normalmente
    → Tails: 3 damage counters a sí mismo (30 daño), NO ataca
  produce (si ataca):
    1. calcular daño_final con Weakness/Resistance
    2. agregar damage counters al oponente Activo
    3. ejecutar efectos secundarios del ataque
    4. verificar KO del oponente
    5. attackedThisTurn = true
    6. turno termina (ir a FASE 0)

ACTION: RETREAT
  disponible si:  es mi turno
                  retreatUsed == false
                  bench.slots > 0 (hay Pokémon en el Bench)
                  activeSpot.pokemon.specialCondition != "paralyzed"
                  activeSpot.pokemon.specialCondition != "asleep"
                  activeSpot.pokemon.attachedEnergies.length >= retreatCost
  produce:
    1. jugador selecciona `retreatCost` energías para descartar
    2. energías seleccionadas → Discard Pile
    3. Pokémon Activo → Bench (con todos sus adjuntos restantes)
    4. specialCondition = "none"  // curar condición especial
    5. jugador elige Pokémon del Bench → Active Spot
    6. retreatUsed = true

ACTION: USE_ABILITY (desde Active Spot)
  disponible si:  es mi turno (o el texto de la Ability lo permite en cualquier turno)
                  la Ability no fue ya usada este turno (si dice "once per turn")
                  specialCondition no bloquea la Ability
                  NOTA: Abilities SÍ funcionan si el Pokémon está Asleep o Paralyzed
  produce:        ejecutar el efecto de la Ability
                  si es "once per turn": marcar en abilitiesUsedThisTurn
```

### 5C. Acciones sobre BENCH
```
ACTION: USE_ABILITY (desde Bench)
  disponible si:  es mi turno (o el texto dice "any time")
                  la Ability no fue usada este turno
  produce:        ejecutar efecto de la Ability

ACTION: SELECT_AS_NEW_ACTIVE (obligatorio tras KO)
  disponible si:  el Pokémon Activo fue KO
                  es el turno del dueño del Bench
                  la selección es obligatoria (no optional)
  produce:        Pokémon del Bench → Active Spot
                  si bench queda vacío: verificar win condition #2

ACTION: EVOLVE_BENCH_POKEMON
  disponible si:  mismo que PLAY_EVOLUTION pero el destino es Bench
```

### 5D. Acciones sobre DISCARD PILE
```
ACTION: VIEW_DISCARD
  disponible si:  siempre (cualquier jugador, cualquier momento)
  produce:        abrir modal/panel mostrando todas las cartas del Discard
                  en orden (información pública)

  (Acciones de recuperar cartas desde Discard solo mediante efectos de Trainer/Ability)
```

---

## 6. INTERACCIONES BÁSICAS DOCUMENTADAS

### 6A. Flujo de KO (Knocked Out)
```
TRIGGER: damageCounters × 10 >= pokemon.maxHP

SECUENCIA:
  1. Marcar pokemon.isKnockedOut = true
  2. Determinar tipo de KO:
       → prize_count = 1  (normal)
       → prize_count = 2  (hasRuleBox == true)
       → prize_count = 3  (isTagTeam == true)
  3. Mover Pokémon KO (+ toda su pila de evolución + adjuntos) → Discard Pile del dueño
  4. El OPONENTE toma `prize_count` cartas del top de sus Prize Cards → su Hand
     prize_count = min(prize_count, prizesRemaining)
  5. Actualizar prizesRemaining del oponente
  6. Verificar win condition: if prizesRemaining <= 0 → GAME OVER (oponente gana)
  7. Si el KO fue el Pokémon Activo:
       → Verificar win condition: if bench.isEmpty() → GAME OVER (dueño pierde)
       → Si Bench tiene Pokémon → activar selector obligatorio (bloquear "End Turn")
  8. Si el KO fue un Pokémon de Bench (por spread damage):
       → Mover al Discard, tomar prizes, NO hay selector obligatorio
```

### 6B. Flujo de Evolución
```
TRIGGER: jugador arrastra carta de Evolución sobre Pokémon base válido

VALIDACIONES:
  1. carta.evolvesFrom == pokemonBase.nombre   // nombre del Básico correcto
  2. pokemonBase.canEvolveThisTurn == true
  3. NOT isFirstTurnOfGame

SECUENCIA:
  1. Colocar carta de Stage 1/2 sobre el Pokémon base
  2. Actualizar el stack: [Basic, Stage1] o [Basic, Stage1, Stage2]
  3. pokemonBase.stage = nuevo stage
  4. pokemonBase.specialCondition = "none"   // curar condiciones
  5. pokemonBase.damageCounters PERMANECEN   // daño no se cura
  6. pokemonBase.attachedEnergies PERMANECEN
  7. pokemonBase.attachedTool PERMANECE
  8. pokemonBase.canEvolveThisTurn = false
  9. pokemonBase.turnPlayedOrEvolved = currentTurn
```

### 6C. Flujo de Between Turns (Chequeo entre turnos)
```
EJECUTAR al final de cada turno, ANTES de cambiar el jugador activo:

Para el Pokémon Activo del jugador que ACABA de terminar su turno:

  if specialCondition == "poisoned":
    damageCounters += poisonCountersPerTurn   // default 1 (=10 daño)
    verificar KO

  if specialCondition == "burned":
    damageCounters += 2   // 20 daño
    verificar KO
    lanzar moneda:
      Heads → specialCondition = "none"
      Tails → burn continúa

Para el Pokémon Activo del jugador cuyo turno VA A COMENZAR:

  if specialCondition == "asleep":
    lanzar moneda:
      Heads → specialCondition = "none"  // despertó
              rotation = 0
      Tails → sigue dormido (no puede atacar ni retirarse)

  if specialCondition == "paralyzed":
    specialCondition = "none"   // se cura automáticamente
    rotation = 0
```

### 6D. Flujo de Retreat
```
TRIGGER: jugador arrastra Pokémon Activo → Bench
         O: jugador hace click en botón "Retreat"

VALIDACIONES:
  1. retreatUsed == false
  2. specialCondition != "paralyzed" AND != "asleep"
  3. bench.slots > 0
  4. attachedEnergies.length >= retreatCost

SECUENCIA:
  1. Mostrar selector de Energías a descartar (si retreatCost > 0)
  2. Energías seleccionadas → Discard Pile
  3. Pokémon Activo (con adjuntos restantes) → Bench
  4. specialCondition = "none"  // curar condición
  5. rotation = 0
  6. Mostrar selector de Pokémon del Bench para el Active Spot
  7. Pokémon seleccionado → Active Spot
  8. retreatUsed = true

7. MODELO DE ESTADO DEL TURNO (resumen para implementación)
typescripttype TurnState = {
  // Control del turno
  currentTurn: number               // turno #1, #2, #3...
  activePlayer: "player1" | "player2"
  phase: "draw" | "main" | "attack" | "between_turns"
  isFirstTurnOfGame: boolean        // solo true en el primer turno del primer jugador

  // Flags "una vez por turno" — se resetean al inicio de cada turno
  energyAttachedThisTurn: boolean
  retreatUsed: boolean
  supporterPlayedThisTurn: boolean
  stadiumPlayedThisTurn: boolean
  attackedThisTurn: boolean

  // Flags de decisión pendiente (bloquean "End Turn")
  mustChooseNewActive: boolean      // true si el Activo fue KO y hay Bench disponible
  mustChoosePrizeCard: boolean      // true si hay efecto que requiere elegir Prize

  // Extra permitidos (por efectos de cartas)
  extraEnergyAttaches: number       // default 0
}

// Reset al inicio de cada turno nuevo:
function resetTurnFlags(state: TurnState): TurnState {
  return {
    ...state,
    energyAttachedThisTurn: false,
    retreatUsed: false,
    supporterPlayedThisTurn: false,
    stadiumPlayedThisTurn: false,
    attackedThisTurn: false,
    extraEnergyAttaches: 0,
    isFirstTurnOfGame: false,
  }
}
```

---

## 8. TABLA DE ACCIONES — QUIÉN / CUÁNDO / LÍMITE
```
┌──────────────────────────┬──────────────┬──────────────────────────┬───────────────┐
│ ACCIÓN                   │ QUIÉN        │ CUÁNDO                   │ LÍMITE/TURNO  │
├──────────────────────────┼──────────────┼──────────────────────────┼───────────────┤
│ Robar carta (Draw)       │ Activo       │ Inicio de turno (auto)   │ 1 (auto)      │
│ Jugar Básico al Bench    │ Activo       │ Main Phase               │ Ilimitado*    │
│ Evolucionar Pokémon      │ Activo       │ Main Phase               │ Ilimitado*    │
│ Adjuntar Energía         │ Activo       │ Main Phase               │ 1             │
│ Jugar Item               │ Activo       │ Main Phase               │ Ilimitado     │
│ Jugar Supporter          │ Activo       │ Main Phase               │ 1             │
│ Jugar Stadium            │ Activo       │ Main Phase               │ 1             │
│ Adjuntar Tool            │ Activo       │ Main Phase               │ 1 por Pokémon │
│ Usar Ability             │ Activo**     │ Main Phase               │ Varía***      │
│ Retreat                  │ Activo       │ Main Phase               │ 1             │
│ Atacar                   │ Activo       │ Attack Phase (fin turno) │ 1 (termina)   │
│ Ver Discard Pile         │ Cualquiera   │ Siempre                  │ Ilimitado     │
│ Ver Lost Zone            │ Cualquiera   │ Siempre                  │ Ilimitado     │
└──────────────────────────┴──────────────┴──────────────────────────┴───────────────┘

* "Ilimitado" = sin límite numérico, pero sujeto a condiciones (Bench lleno, etc.)
** Algunas Abilities pueden usarse en el turno del oponente (texto de la carta lo indica)
*** La mayoría "una vez por turno"; algunas son pasivas (siempre activas); revisar texto

TURNO 1 — PRIMER JUGADOR:
  ✗ No puede atacar
  ✗ No puede usar Supporters
  ✗ No roba carta al inicio
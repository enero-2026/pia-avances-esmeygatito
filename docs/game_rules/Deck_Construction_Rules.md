REGLAS FUNDAMENTALES (obligatorias, siempre)
REGLA 1 — TAMAÑO DEL MAZO
  - El mazo debe contener EXACTAMENTE 60 cartas.
  - No se permite 59 ni 61. El número es estricto.

REGLA 2 — LÍMITE DE COPIAS POR NOMBRE ("Regla de Cuatro")
  - Máximo 4 cartas con el mismo nombre exacto en un mazo.
  - EXCEPCIÓN: Las Energías Básicas (Basic Energy) no tienen límite de copias.

REGLA 3 — MÍNIMO DE POKÉMON BÁSICO
  - El mazo debe contener AL MENOS 1 carta de Pokémon con la designación "BASIC".
  - Sin un Pokémon Básico, el mazo es inválido.

LÓGICA DE NOMBRES (crítica para validación)
REGLA DE NOMBRES — cómo determinar si dos cartas "tienen el mismo nombre":

  ✅ Los siguientes sufijos/modificadores SÍ forman parte del nombre (son cartas DISTINTAS):
    - ex        → "Charizard" ≠ "Charizard ex"
    - EX        → "Magnezone-EX" ≠ "Magnezone ex"  (EX ≠ ex, son distintos)
    - V         → "Pikachu" ≠ "Pikachu V"
    - VMAX      → "Pikachu V" ≠ "Pikachu VMAX"
    - VSTAR     → "Arceus V" ≠ "Arceus VSTAR"
    - GX        → "Mewtwo" ≠ "Mewtwo-GX"
    - BREAK     → "Noivern" ≠ "Noivern BREAK"
    - Prism Star (♦) → "Darkrai" ≠ "Darkrai ♦"
    - Números (Arceus 4, Alakazam 4, etc.)
    - Prefijos de dueño/forma → "Meowth" ≠ "Alolan Meowth" ≠ "Rocket's Meowth"

  ❌ Los siguientes modificadores NO forman parte del nombre (son la MISMA carta):
    - Level/LV  → "Gengar LV.43" == "Gengar LV.X" == "Gengar"
    - δ (Delta Species) → "Aerodactyl δ" == "Aerodactyl"
    - Número de set / número de colección (no es parte del nombre)
    - Idioma de la carta (la validación se hace por nombre en inglés oficial)

TIPOS DE CARTAS VÁLIDAS EN UN MAZO
1. POKÉMON
   - Basic Pokémon       → Puede jugarse directamente desde la mano
   - Stage 1 Pokémon     → Evoluciona desde un Basic
   - Stage 2 Pokémon     → Evoluciona desde un Stage 1
   - VMAX                → Evoluciona desde su Pokémon V correspondiente
   - VSTAR               → Evoluciona desde su Pokémon V correspondiente
   - Pokémon-GX          → Regla de premio especial (rival toma 2 premios al derrotarlo)
   - Pokémon-EX / ex     → Regla de premio especial
   - Radiant Pokémon     → Límite ESPECIAL: máximo 1 carta Radiant en todo el mazo
                           (cuenta como su propio tipo de restricción, independiente de la Regla de Cuatro)

2. CARTAS DE ENTRENADOR (Trainer Cards)
   - Item               → Sin restricción de cantidad por turno
   - Supporter          → Solo se puede jugar 1 por turno
   - Stadium            → Solo puede haber 1 Stadium activo en juego

3. ENERGÍAS
   - Basic Energy       → SIN límite de copias (Grass, Fire, Water, Lightning,
                          Psychic, Fighting, Darkness, Metal, Fairy, Colorless)
   - Special Energy     → Sujetas a la Regla de Cuatro (máximo 4 copias)

RESTRICCIONES ESPECIALES DE CARTAS
ACE SPEC (introducidas en Temporal Forces, 2024+)
  - Solo se permite 1 carta ACE SPEC en todo el mazo.
  - No importa el tipo (puede ser Item, Tool o Energy).
  - No es "1 de cada tipo ACE SPEC", sino 1 en total.
  - Ejemplos: Neo Upper Energy, Hero's Cape, Prime Catcher.

RADIANT POKÉMON
  - Solo se permite 1 Pokémon Radiant en todo el mazo.
  - Restricción de mazo, no de nombre (aunque tuvieran distintos nombres).

PRISM STAR (♦)
  - Solo se permite 1 copia de cada carta Prism Star.
  - Aunque la Regla de Cuatro permitiría más por nombre, la propia carta 
    dice "You can't have more than 1 ♦ card with the same name in your deck."

FORMATOS DE JUEGO (determina qué cartas son legales)
STANDARD
  - Solo cartas de los sets actualmente rotados (lista oficial de Pokémon Organized Play).
  - La rotación ocurre anualmente (aprox. agosto/septiembre).
  - Cartas con símbolo de regulación E, F, G, H... (la letra válida cambia cada temporada).
  - Actualmente (2025): regulación G en adelante es válida.

EXPANDED
  - Incluye sets desde Black & White en adelante + todos los Standard actuales.
  - Hay una lista de cartas baneadas (ver: pokemon.com ban list).
  - Más cartas disponibles pero meta diferente.

UNLIMITED / CASUAL
  - Cualquier carta oficial es válida.
  - Sin restricción de sets o rotación.
  - Sin lista de bans (salvo acuerdos de grupo).

PSEUDOCÓDIGO / LÓGICA DE VALIDACIÓN
function validarMazo(mazo, formato):

  // Regla 1: tamaño
  if mazo.total != 60:
    return ERROR("El mazo debe tener exactamente 60 cartas")

  // Regla 3: al menos 1 Pokémon Básico
  if mazo.getPokemonBasicos().count < 1:
    return ERROR("El mazo debe tener al menos 1 Pokémon Básico")

  // Regla 2: Regla de Cuatro
  for each nombreCarta in mazo.agruparPorNombre():
    if carta.esEnergiaBasica():
      continue  // sin límite
    if mazo.cantidadPorNombre(nombreCarta) > 4:
      return ERROR("Más de 4 copias de: " + nombreCarta)

  // Restricción ACE SPEC
  if mazo.getAceSpec().count > 1:
    return ERROR("Solo se permite 1 carta ACE SPEC en el mazo")

  // Restricción Radiant
  if mazo.getRadiantPokemon().count > 1:
    return ERROR("Solo se permite 1 Pokémon Radiant en el mazo")

  // Restricción Prism Star
  for each nombrePrismStar in mazo.getPrismStar().agruparPorNombre():
    if mazo.cantidadPorNombre(nombrePrismStar) > 1:
      return ERROR("Solo se permite 1 copia de Prism Star: " + nombre)

  // Validación de formato (legalidad de sets)
  if formato == "STANDARD":
    for each carta in mazo:
      if carta.simboloRegulacion NOT IN formatosLegalesActuales:
        return ERROR("Carta no legal en Standard: " + carta.nombre)

  return OK("Mazo válido")

DATOS EXTRA ÚTILES PARA IMPLEMENTACIÓN
- Nombre canónico de una carta = nombre impreso en la parte superior de la carta,
  incluyendo sufijos (ex, V, GX, etc.), excluyendo LV/δ.
- El número de set NO forma parte del nombre para efectos de límite de copias.
- Mismo nombre + diferente set = misma "ranura" en la Regla de Cuatro.
- Una carta promocional o de arte alternativo cuenta igual que su versión normal
  si tiene el mismo nombre exacto.
- Los mazos de tema (Theme/Battle Decks) son preconstructed y están exentos de validación.

## Documentación técnica: `CARD_FIELDS_FULL`

Estos son los atributos definidos para guardar información completa de cartas en historial de partidas:

- `id`: identificador global único de la carta en TCGdex.
- `name`: nombre de la carta.
- `set`: objeto del set al que pertenece la carta.
  - `set.id`: ID del set.
  - `set.name`: nombre del set.
  - `set.serie`: serie asociada (si está disponible).
- `rarity`: rareza de la carta.
- `types`: lista de tipos de la carta.
- `hp`: puntos de vida de la carta.
- `attacks`: lista de ataques con costo, nombre, efecto y daño (cuando exista).
- `weaknesses`: debilidades de la carta.
- `resistances`: resistencias de la carta.
- `retreatCost`: costo de retirada normalizado desde el SDK.
- `imageUrl`: URL final de imagen de alta calidad para renderizado y trazabilidad histórica.

Este esquema permite separar lo mínimo que consume frontend (`id`, `name`, `imageUrl`) de lo completo que debe persistirse en historial.
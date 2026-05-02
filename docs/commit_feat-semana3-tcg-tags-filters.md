# Commit: feat: sistema de etiquetas TCG, endpoint de filtros y filtrado por tags (Semana 3)

> **Nota:** Debido a que el carácter `:` (dos puntos) no es un carácter válido para nombres de archivo en Windows, el archivo físico se nombró `commit_feat-semana3-tcg-tags-filters.md`, pero su intención representa el commit descrito arriba.

## 📝 Resumen del Commit
Se completaron todos los entregables de **Semana 3 - Lado TCG** del cronograma. Las tres áreas principales del sprint fueron:

1. **Sistema de etiquetas (`buildCardTags`)** — genera etiquetas de dominio TCG normalizadas a partir de los datos de una `FullCard`.
2. **Vista detallada simplificada** — la pantalla de detalle muestra únicamente la imagen de la carta (decisión de diseño del equipo). Los datos completos se almacenan en historial de partidas.
3. **Endpoint de filtros amigables + filtrado por tags** — nuevo `GET /cards/filters` que expone opciones de filtro con etiquetas en español, y soporte de parámetros `tags` / `tagMode` en `GET /cards`.

Además se corrigieron dos bugs: el parseo incorrecto de debilidades/resistencias del SDK y la desconexión entre el sistema de tags y cualquier ruta activa.

---

## 🏗 Archivos Nuevos

### 1. `backend/src/services/cardTags.service.ts`
Motor que toma una `FullCard` y produce un arreglo de etiquetas (`string[]`) normalizadas en formato snake_case en mayúsculas. Esta función es la fuente de verdad del sistema de etiquetado.

**Etiquetas generadas por categoría:**

| Categoría | Valores posibles |
|---|---|
| Tipo de Pokémon | `TYPE_GRASS`, `TYPE_FIRE`, `TYPE_WATER`, `TYPE_LIGHTNING`, `TYPE_PSYCHIC`, `TYPE_FIGHTING`, `TYPE_DARKNESS`, `TYPE_METAL`, `TYPE_FAIRY`, `TYPE_DRAGON`, `TYPE_COLORLESS` |
| Rareza | `RARITY_<valor>` (ej. `RARITY_COMMON`, `RARITY_ULTRA_RARE`) |
| HP | `HP_LOW` (< 70), `HP_MID` (70–129), `HP_HIGH` (≥ 130) |
| Mecánicas | `HAS_ATTACKS`, `HAS_WEAKNESSES`, `HAS_RESISTANCES`, `HAS_RETREAT_COST` |
| Set | `SET_<setId>` (ej. `SET_ME01`, `SET_SV01`) |

---

## 🔧 Archivos Modificados

### 2. `backend/src/types.ts`
Se agregaron dos interfaces nuevas para soportar la respuesta del endpoint de filtros amigables:

```typescript
interface FriendlyFilterOption {
  value: string;   // valor técnico (ej. "GRASS")
  label: string;   // etiqueta legible en español (ej. "Planta")
  count: number;   // frecuencia en el conjunto analizado
}

interface CardFiltersResponse { //duda duda 
  types:    FriendlyFilterOption[];
  rarities: FriendlyFilterOption[];
  tags:     FriendlyFilterOption[];
  meta: {
    analyzedCards:    number;   // cartas que se procesaron
    totalCandidates:  number;   // total disponible sin límite
    truncated:        boolean;  // si se cortó el análisis por analysisLimit
  };
}
```

### 3. `backend/src/config/cardFields.ts`
`CARD_DETAIL_VIEW` fue reducido a un único campo: `['imageUrl']`. La intención es separar completamente lo que ve el usuario (imagen) de lo que guarda el historial (FullCard completo).

```typescript
export const CARD_DETAIL_VIEW = ['imageUrl'] as const;
```

### 4. `backend/src/models/card.model.ts`
**Bug fix:** `toUnknownArray` fallaba cuando el SDK devolvía `weaknesses` o `resistances` como un objeto único en lugar de un array (sucede cuando la carta solo tiene un elemento). 

```typescript
// Antes:
function toUnknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

// Después:
function toUnknownArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return [value]; // ← FIX: objeto → array de 1
  return [];
}
```

### 5. `backend/src/services/cards.service.ts`
Archivo más extendido de esta iteración. Se agregaron las siguientes capacidades:

**a) Caché de cartas completas**
```typescript
const fullCardCache = new Map<string, FullCard | null>();

async function getCachedFullCardById(id: string): Promise<FullCard | null> {
  if (fullCardCache.has(id)) return fullCardCache.get(id)!;
  try {
    const card = await getCardById(id);
    fullCardCache.set(id, card);
    return card;
  } catch {
    fullCardCache.set(id, null); // degrada silenciosamente ante timeout
    return null;
  }
}
```
Protege contra timeouts del SDK cuando se procesan sets grandes (ej. `sv*` con 3821 cartas).

**b) Filtrado por Sets (refactor)**
```typescript
function filterBySetIds(cards: MinimalCard[], setIds: string[]): MinimalCard[]
```
Soporta IDs exactos (`me01`) y wildcard con prefijo (`sv*`).

**c) Filtrado por Tags**
```typescript
async function filterCardsByTags(
  cards: MinimalCard[],
  tags: string[],
  tagMode: 'all' | 'any'
): Promise<MinimalCard[]>
```
- Mode `any`: la carta pasa si tiene **al menos uno** de los tags pedidos.
- Mode `all`: la carta pasa solo si tiene **todos** los tags pedidos.
- Resuelve cada carta a `FullCard` en paralelo (`Promise.all`) y aplica `buildCardTags`.

**d) Endpoint de filtros amigables**
```typescript
async function getFriendlyCardFilters(
  setIds: string[],
  analysisLimit: number
): Promise<CardFiltersResponse>
```
Analiza hasta `analysisLimit` cartas (por defecto 200) del conjunto indicado, agrega tipos, rarezas y tags, y etiqueta cada opción con `formatTagLabel`.

**e) Mapa de traducciones `TYPE_LABELS`**
```typescript
const TYPE_LABELS: Record<string, string> = {
  GRASS:     'Planta',
  FIRE:      'Fuego',
  WATER:     'Agua',
  LIGHTNING: 'Eléctrico',
  PSYCHIC:   'Psíquico',
  FIGHTING:  'Lucha',
  DARKNESS:  'Oscuridad',
  METAL:     'Metal',
  FAIRY:     'Hada',
  DRAGON:    'Dragón',
  COLORLESS: 'Incoloro',
};
```

**f) `fetchCards` extendido**
```typescript
async function fetchCards(
  page: number,
  pageSize: number,
  setIds: string[],
  tags: string[],          // ← nuevo
  tagMode: 'all' | 'any'  // ← nuevo
): Promise<PaginatedCardsResponse>
```

### 6. `backend/src/services/cardDetail.service.ts`
Simplificado para retornar solo `imageUrl` al frontend, dejando el historial separado:

```typescript
export function formatCardDetail(card: FullCard) {
  return {
    frontend: pickFields(card, CARD_DETAIL_VIEW),      // { imageUrl }
    history:  pickFields(card, CARD_HISTORY_FIELDS),   // todos los campos
  };
}
```

### 7. `backend/src/routes/cards.routes.ts`
**Nuevo endpoint `GET /filters`:**
```
GET /cards/filters?setIds=sv*,me01&analysisLimit=300
```
Retorna `CardFiltersResponse` con tipos, rarezas y tags enriquecidos con etiquetas en español y conteo de frecuencia.

> ⚠️ La ruta `/filters` debe declararse **antes** de `/:id` en el router para que Express no trate `"filters"` como un parámetro de ID.

**`GET /cards` extendido:**
```
GET /cards?page=1&pageSize=50&setIds=me01&tags=HAS_ATTACKS,TYPE_FIRE&tagMode=all
```

Tabla completa de parámetros soportados:

| Parámetro | Tipo | Descripción |
|---|---|---|
| `page` | number | Página actual (default: 1) |
| `pageSize` | number | Cartas por página (default: 50) |
| `setIds` | string (CSV) | Filtro por set exacto o con wildcard (`sv*`) |
| `tags` | string (CSV) | Filtro por etiquetas TCG |
| `tagMode` | `all` \| `any` | Lógica de combinación de tags (default: `any`) |

### 8. `services/tcgdexService.ts` (Frontend)
El cliente HTTP del frontend fue actualizado para soportar los nuevos parámetros:

```typescript
interface CardDetail {
  imageUrl: string | null; // solo imagen, sin metadatos
}

async getCards(
  page: number,
  pageSize: number,
  setIds?: string[],
  tags?: string[],
  tagMode?: 'all' | 'any'
): Promise<PokemonCard[]>
```

### 9. `app/details/[id].tsx` (Frontend)
La pantalla de detalle fue simplificada para mostrar **únicamente la imagen** de la carta. Se eliminaron los bloques de metadatos, chips de tags y secciones de ataques/debilidades.

---

## 🚀 Endpoints REST — Estado Final Semana 3

| Método | Endpoint | Parámetros nuevos | Descripción |
|---|---|---|---|
| `GET` | `/health` | — | Health check |
| `GET` | `/cards` | `tags`, `tagMode` | Catálogo paginado con filtrado por sets y etiquetas |
| `GET` | `/cards/filters` | `setIds`, `analysisLimit` | **NUEVO** — Filtros amigables con etiquetas en español |
| `GET` | `/cards/:id` | — | Devuelve `{ imageUrl }` al frontend |
| `POST` | `/matches` | — | Registra partida en historial |

---

## 🐛 Bugs Corregidos

### Bug 1 — Debilidades/resistencias con conteo 0
- **Síntoma:** `HAS_WEAKNESSES` y `HAS_RESISTANCES` nunca se generaban aunque la carta tuviera datos.
- **Causa:** `toUnknownArray` solo procesaba arrays; TCGdex devuelve un objeto `{}` cuando hay un único elemento en lugar de `[{}]`.
- **Fix:** Envolver el objeto como `[value]` antes de retornar.

### Bug 2 — Tags generados pero nunca consumidos
- **Síntoma:** `buildCardTags` existía desde la implementación inicial pero no era llamado desde ninguna ruta activa ni endpoint de filtros.
- **Fix:** Conectado a `fetchCards` (filtrado) y a `getFriendlyCardFilters` (nuevo endpoint).

### Bug 3 — Timeout en filtrado de sets grandes
- **Síntoma:** `GET /cards?tags=...&setIds=sv*` fallaba con `ConnectTimeoutError` al intentar resolver 3821 cartas en paralelo.
- **Fix:** `getCachedFullCardById` envuelto en `try/catch`; si falla, retorna `null` y la carta es omitida silenciosamente del resultado.

---

## ✅ Estado de la Semana 3 — Lado TCG

| Entregable | Estado |
|---|---|
| Sistema de etiquetas (`buildCardTags`) | ✅ Implementado y conectado |
| Información adicional en historial de partidas | ✅ `FullCard` completo al guardar partida |
| Vista detallada simplificada (imagen) | ✅ Solo `imageUrl` al frontend |
| Endpoint de filtros amigables | ✅ `GET /cards/filters` |
| Filtrado por tags en listado | ✅ `tags` + `tagMode` en `GET /cards` |
| Frontend preparado para filtros | ✅ Firma extendida en `tcgdexService.ts` |
| TypeScript typecheck | ✅ 0 errores |

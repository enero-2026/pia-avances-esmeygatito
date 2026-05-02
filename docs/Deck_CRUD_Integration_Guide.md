# Guía de Integración: CRUD de Mazos + Validación

Esta guía está pensada para implementar tu parte de Semana 4:

- CRUD de mazos (crear, editar, eliminar)
- Persistencia local (AsyncStorage)
- Lista de mazos guardados

La lógica de reglas/categorización ya está lista en backend y cliente frontend.

---

## 1) Qué ya está listo

### Endpoint backend

- `POST /decks/validate`
- Recibe:

```json
{
  "format": "casual",
  "entries": [
    { "cardId": "sv05-157", "quantity": 1 },
    { "cardId": "tk-xy-su-1", "quantity": 10 }
  ]
}
```

- Devuelve:
  - `isValid`
  - `issues[]`
  - `summary`
  - `categorizedCards[]`

### Servicio frontend ya disponible

En `services/tcgdexService.ts`:

- `TCGService.validateDeck(entries, format)`
- Tipos exportados:
  - `DeckEntryInput`
  - `DeckFormat`
  - `DeckValidationResult`
  - `DeckValidationIssue`

---

## 2) Reglas que valida el sistema

1. Mazo de **exactamente 60 cartas**.
2. Máximo **4 copias por nombre**.
3. Excepción: **Basic Energy sin límite**.
4. Mínimo **1 Pokémon Básico**.
5. Máximo **1 ACE SPEC** total.
6. Máximo **1 Radiant** total.
7. **Prism Star**: máximo 1 copia por nombre.
8. Legalidad por formato (`standard` / `expanded`) usando metadata de TCGdex.

---

## 3) Modelo recomendado para AsyncStorage

Guardar cada mazo con este shape mínimo:

```ts
export interface SavedDeck {
  id: string;
  name: string;
  format: DeckFormat; // "casual" | "unlimited" | "expanded" | "standard"
  entries: DeckEntryInput[]; // [{ cardId, quantity }]
  updatedAt: string;
}
```

Key sugerida en AsyncStorage:

- `@tcg/decks`

---

## 4) Flujo recomendado por operación CRUD

## Crear mazo

1. Construir `entries` (agrupar por `cardId` + `quantity`).
2. Ejecutar validación:

```ts
const validation = await TCGService.validateDeck(entries, format);
```

3. Si `validation.isValid === false`:
   - Mostrar `validation.issues` al usuario.
   - Permitir guardar como borrador (opcional) o bloquear guardado final.
4. Persistir en AsyncStorage.

## Editar mazo

1. Cargar mazo por `id`.
2. Aplicar cambios en `entries`.
3. Re-validar con `TCGService.validateDeck`.
4. Guardar cambios.

## Eliminar mazo

1. Filtrar por `id`.
2. Guardar arreglo actualizado en AsyncStorage.

## Listar mazos guardados

1. Cargar array de mazos desde AsyncStorage.
2. Para cada mazo, puedes mostrar rápidamente:
   - nombre
   - formato
   - total de cartas (`sum(entries.quantity)`)
3. Si quieres estado de salud en lista:
   - validar al abrir pantalla
   - mostrar badge: `Válido` / `Con errores`

---

## 5) Ejemplo de helper para validación antes de guardar

```ts
import {
  DeckEntryInput,
  DeckFormat,
  DeckValidationResult,
  TCGService,
} from "@/services/tcgdexService";

export async function validateBeforeSave(
  entries: DeckEntryInput[],
  format: DeckFormat,
): Promise<DeckValidationResult> {
  return TCGService.validateDeck(entries, format);
}
```

---

## 6) Códigos de error que debes mapear en UI

- `INVALID_TOTAL_SIZE`
- `TOO_MANY_COPIES`
- `MISSING_BASIC_POKEMON`
- `TOO_MANY_ACE_SPEC`
- `TOO_MANY_RADIANT`
- `TOO_MANY_PRISM_STAR`
- `ILLEGAL_CARD_STANDARD`
- `ILLEGAL_CARD_EXPANDED`
- `CARD_NOT_FOUND`
- `UPSTREAM_UNAVAILABLE`
- `INVALID_ENTRY`

Sugerencia UX mínima:

- Mostrar primero errores de estructura (`INVALID_ENTRY`, `CARD_NOT_FOUND`)
- Luego reglas de deck (`INVALID_TOTAL_SIZE`, `TOO_MANY_COPIES`, etc.)
- Finalmente formato (`ILLEGAL_CARD_STANDARD`, `ILLEGAL_CARD_EXPANDED`)

---

## 7) Recomendaciones de implementación rápida

1. Trabajar siempre con `entries` normalizados (`quantity > 0`, sin duplicados por `cardId`).
2. No persistir cartas completas en mazos; solo `cardId + quantity`.
3. Revalidar en cada guardado/edición.
4. Si backend no responde (`UPSTREAM_UNAVAILABLE`), permitir reintentar.
5. Mantener el formato por mazo para validar legalidad correctamente.

---

## 8) Checklist de terminado (tu parte)

- [ ] Crear mazo y guardarlo en AsyncStorage
- [ ] Editar mazo y revalidar antes de guardar
- [ ] Eliminar mazo
- [ ] Ver lista de mazos guardados
- [ ] Mostrar errores de validación claramente
- [ ] Mostrar resumen (`summary`) en pantalla de detalle de mazo

---

## 9) Nota de integración con tu compañero

Tu compañero ya dejó la lógica de reglas/categorización desacoplada del UI.
Tu parte ideal es:

- Consumir `TCGService.validateDeck`
- Persistir con AsyncStorage
- Renderizar lista y formularios CRUD

Sin duplicar reglas en frontend.

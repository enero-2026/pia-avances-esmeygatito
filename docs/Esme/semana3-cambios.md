# Semana 3 - Cambios Implementados (Esme)

## Objetivo

Cerrar entregables de Semana 3 del catalogo en frontend:

1. Filtros visibles y funcionales en UI.
2. Ordenamiento visible para usuario final.
3. Vista de detalle operativa.
4. Experiencia mobile-first del catalogo.

---

## Resumen ejecutivo

Se completo un flujo de catalogo con filtros/orden conectados a backend, paginacion estable y una interfaz optimizada para movil (encabezado compacto y controles que se adaptan al scroll).

---

## 1) Filtros en pantalla de catalogo

### Implementado

1. Bottom sheet de filtros con:

- Expansiones (chips): `sv*` y `me01`.
- Tags dinamicas desde `GET /cards/filters`.
- Modo de combinacion: `Todas (all)` o `Alguna (any)`.

2. Acciones disponibles:

- `Limpiar` (estado del sheet).
- `Restablecer todo` (filtros + orden).
- `Aplicar`.

3. Alineacion funcional:

- Backend calcula tags completas.
- Frontend oculta tags `SET_*` en chips para evitar duplicidad con filtro de expansiones.

4. Conteos de tags:

- Se ocultaron en UI para evitar percepcion de inconsistencia visual durante estados de carga/paginacion.

### Archivos

- `app/(tabs)/index.tsx`
- `services/tcgdexService.ts`
- `backend/src/services/cards.service.ts`

---

## 2) Ordenamiento en UI

### Implementado

1. Orden visible mediante menu en icono:

- `Nombre A-Z`
- `Nombre Z-A`

2. El orden se mantiene sobre los datos acumulados con paginacion.

### Archivo

- `app/(tabs)/index.tsx`

---

## 3) Integracion con backend de filtros amigables

### Implementado

1. Consumo de `GET /cards/filters` con tipos dedicados:

- `FriendlyFilterOption`
- `CardFiltersResponse`


### Archivos

- `services/tcgdexService.ts`
- `backend/src/services/cards.service.ts`

---

## 4) Paginacion y estabilidad

### Implementado

1. Infinite scroll con bloqueo de `onEndReached`.
2. Guardas para evitar cargas concurrentes.
3. Proteccion contra respuestas stale al cambiar filtros/busqueda (no mezcla resultados viejos con estado nuevo).

### Archivo

- `app/(tabs)/index.tsx`

---

## 5) UX mobile-first del encabezado

### Implementado

1. Encabezado superior compactado:

- Se elimino banner grande de expansiones.
- Searchbar compacta de Paper.
- Control de orden por icono (menos ancho/alto).

2. Comportamiento adaptativo en scroll:

- Titulo colapsa con animacion (fade + slide + altura).
- Barra de acciones se compacta al bajar.
- Boton de filtros cambia a solo icono en estado compacto y recupera texto al subir.

3. Ajustes para pantallas angostas:

- En movil angosto la barra de acciones entra en modo compacto automaticamente.
- El resumen de filtros usa etiquetas mas cortas para evitar recortes visuales.

### Archivo

- `app/(tabs)/index.tsx`

---

## 8) Criterios de cierre de Semana 3

Cumplidos:

1. Filtros visibles y funcionales en UI.
2. Ordenamiento visible y usable.
3. Integracion con filtros amigables backend.
4. Paginacion estable sin mezcla de estado stale.
5. Vista detallada funcional.
6. UX de catalogo adaptada a movil.


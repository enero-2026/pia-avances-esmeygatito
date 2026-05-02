# Semana 2 - Cambios Implementados (Esme)

## Objetivo de esta entrega
Documentar de forma clara los cambios realizados para cerrar observaciones de Semana 2 en frontend, manteniendo el estilo tematico actual y evolucionando la experiencia hacia una app movil mas consistente.

## Estado general
Semana 2 queda cerrada a nivel funcional y tecnico.

Se atendieron 4 bloques de trabajo:

1. Correccion de busqueda y carga incremental.
2. Mejora de visualizacion de cartas (prioridad a imagen).
3. Presentacion de detalle en modal.
4. Migracion de interfaz a React Native Paper con tema de marca.

---

## 1) Busqueda y paginacion: problema original y solucion

### Problema reportado
Con busqueda activa (ejemplo: "Mega"), el usuario podia seguir pulsando cargar mas y parecia que no pasaba nada, porque el filtrado era local sobre cartas ya cargadas.

### Solucion implementada
- La busqueda se envia al backend como parametro `search`.
- El backend filtra por nombre antes de paginar.
- El frontend consume respuesta paginada completa (`page`, `pageSize`, `total`, `totalPages`, `data`).
- Se reemplazo boton manual por infinite scroll con `onEndReached`.
- Se agrego barra fija de "Cargando mas resultados..." para feedback claro.

### Archivos impactados
- `backend/src/services/cards.service.ts`
- `backend/src/routes/cards.routes.ts`
- `services/tcgdexService.ts`
- `app/(tabs)/index.tsx`

### Resultado funcional
- La busqueda ya no depende de las primeras 50 cartas cargadas.
- El usuario entiende cuando la app esta cargando mas resultados.
- Se evita confusion de "boton no funciona".

---

## 5) Migracion a React Native Paper (entorno app movil)

### Objetivo
Unificar toda la interfaz con componentes Paper sin perder el estilo tematico calido del proyecto.

### Acciones realizadas
- Instalacion de `react-native-paper`.
- Provider global en root layout.
- Tema MD3 personalizado con paleta actual.
- Definicion de tipografia de marca global (SpaceMono-Regular).
- Carga de fuente de marca con `expo-font`.
- Migracion de componentes y pantallas clave a Paper.

### Archivos impactados
- `constants/paperTheme.ts`
- `app/_layout.tsx`
- `app/(tabs)/_layout.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/decks.tsx`
- `app/details/[id].tsx`
- `app/modal.tsx`
- `app/+not-found.tsx`
- `components/ui/SearchInput.tsx`
- `components/ui/CardTile.tsx`
- `components/ui/Loader.tsx`
- `components/ui/EmptyState.tsx`

---

## 6) Ajustes de densidad y tipografia (iteracion final)

### Densidad movil
- Se redujeron paddings y gaps en catalogo para hacerlo mas "compact app" en telefono.
- Se redujo altura minima de card en movil respecto a web.

### Tipografia de marca
- Se aplico `SpaceMono-Regular` a variantes MD3 del tema Paper (display/headline/title/label/body).
- Se asegura consistencia tipografica global en la app.

### Archivos impactados
- `app/(tabs)/index.tsx`
- `components/ui/CardTile.tsx`
- `constants/paperTheme.ts`
- `app/_layout.tsx`

---


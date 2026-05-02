# Commit: feat: setup backend con typescript, express y tcgdex

> **Nota:** Debido a que el carácter `:` (dos puntos) no es un carácter válido para nombres de archivo en Windows, el archivo físico se nombró `commit_feat-backend-ts-setup.md`, pero su intención representa el commit descrito arriba.

## 📝 Resumen del Commit
Se introdujo una arquitectura robusta de backend (REST API) completamente estática y tipada gracias a la migración a **TypeScript**. Esta API sirve como middleware/proxy que encapsula el uso del SDK `@tcgdex/sdk`, dividiendo adecuadamente la exposición de datos mínimos a las vistas de Frontend y guardando en detalle toda la data para el Historial de Partidas.

---

## 🏗 Arquitectura y Estructura de Archivos Nuevos

Se creó el directorio `backend/` con una modularidad estándar de aplicaciones Express:

### 1. Tipos y Configuración
- `backend/src/types.ts`: Centraliza de interfaces estáticas (ej. `FullCard`, `MinimalCard`, `MatchRecord`, `MatchPayload`, `PaginatedCardsResponse`).
- `backend/src/config/cardFields.ts`: Define de forma estricta los arreglos `CARD_FIELDS_MINIMAL` y `CARD_FIELDS_FULL`. Se usa `as const` para garantizar seguridad de tipos junto con validaciones `satisfies`.
- `backend/tsconfig.json`: Configuración estricta (TypeScript) enfocada al backend (módulo Node/CommonJS, target ES2022).

### 2. Capa de Modelos (Transformaciones)
- `backend/src/models/card.model.ts`:
  - Contiene las reglas de negocio para "mapear" las respuestas sueltas del SDK (tipo _Unknown_) a los tipos concretos de la API.
  - Funciones: `buildImageUrlFromCard` (garantiza la URl final a `.webp`), `toMinimalCard`, `toFullCard`, y el utility `pickFields` (filtra exactamente los campos deseados).

### 3. Capa de Servicios (Lógica y Lógica Externa)
- `backend/src/services/tcgdexClient.ts`: Instancia global y limpia del SDK `TCGdex('en')`.
- `backend/src/services/cards.service.ts`:
  - `cacheCards()`: Controla un caché rudimentario en memoria (TTL de 5 min) para evitar pegarle al API externa en cada recarga de Home.
  - `fetchCards(page, pageSize)`: Obtiene lista cacheada y pagina los resultados en modo vista "Mínima".
  - `getCardById(id)`: Llama a TCGDex para traer una carta de manera íntegra (`FullCard`).
- `backend/src/services/cardDetail.service.ts`:
  - Enmascara `getCardById` retornando dos contenedores separados: `frontend` (los campos exactos para pintar) e `history` (la información cruda para almacenar).
- `backend/src/services/matches.service.ts`:
  - Motor sencillo basado en sistema de archivos (`matches.json`) para registrar historial.  /**matches.json guarda la partida?**//
  - Al procesar el guardado, lee los `cardIds` que ingresan e hidrata toda la info pesada de esas cartas usando el SDK nuevamente antes de guardar. 

### 4. Capa de Controladores y Rutas (Routing)
- `backend/src/routes/cards.routes.ts`: Endpoints GET para catálogo y detalle de cartas.
- `backend/src/routes/matches.routes.ts`: Endpoint POST destinado a la creación/registro de partidas del simulador.

### 5. Configuración de API
- `backend/src/app.ts`: Declaración base de la Single Page Application (Express), carga middlewares como JSON parsing y `cors`. Contiene manejador de errores global y health-check (`/health`).
- `backend/src/server.ts`: Entry point que levanta el puerto real (por defecto 4000) e invoca a `app.ts`.

---

## 🚀 Endpoints REST Habilitados

| Método | Endpoint | Respuesta | Descripción |
|---|---|---|---|
| `GET` | `/health` | `{ status: "ok" }` | Devuelve confirmación de la integridad del server. |
| `GET` | `/cards?page=X&pageSize=Y` | `PaginatedCardsResponse` | Trae el listado global paginado optimizado (solo id, name, imageUrl) usando base cacheada local. |
| `GET` | `/cards/:id` | `Minimal` (solo la imagen por ahora) | Entrega solo los campos correspondientes a `CARD_DETAIL_VIEW` hacia el frontend. |
| `POST` | `/matches` | `MatchRecord` | Permite enviar datos como `{ players, winner, cardsUsed: ['id-1'] }`. El backend se encarga de rellenar qué significaba cada 'id'. |

---

## 🛠 Cambios en el Proyecto Global (`package.json`)
- **Dependencias agregadas:** `express`, `cors`, `@tcgdex/sdk`.
- **Herramientas de Desarrollo:** `tsx`, `@types/node`, `@types/express`, `@types/cors`.
- **Scripts:** 
  - `npm run backend:start`: Corre directamente los `.ts` con `tsx` para facilitar entorno de desarrollo sin necesidad de build.
  - `npm run backend:typecheck`: Valida sin emitir código.

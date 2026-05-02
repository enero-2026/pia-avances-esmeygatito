# Semana 7 - Historial y Stats

## Resumen

En esta semana se implemento el cierre de frontend para Historial y Estadisticas, alineado con el backend de partidas que ya estaba disponible.

Se completo el flujo end-to-end:

- Simular partida
- Guardar partida en backend
- Ver partidas en historial
- Ver detalle/replay base
- Ver estadisticas agregadas
- Filtrar, ordenar y exportar resultados

## Alineacion con el alcance

Puntos solicitados para Esme:

1. Sistema de historial de movimientos.
2. Guardar partidas en DB local.
3. Lista de partidas jugadas.
4. Estadisticas basicas.

Estado:

- Historial de movimientos: implementado (actionLog en detalle de partida).
- Guardado en DB local: implementado (POST /matches desde simulador).
- Lista de partidas jugadas: implementado (GET /matches paginado).
- Estadisticas basicas: implementado (GET /matches/stats).

## Archivos actualizados

- app/(tabs)/simulator.tsx
- app/(tabs)/history.tsx
- app/(tabs)/\_layout.tsx
- services/tcgdexService.ts
- backend/tsconfig.json

## Cambios implementados

### 1) Persistencia de partida desde el simulador

Se agrego guardado directo desde UI del simulador:

- Boton Guardar partida.
- Construccion de payload de semana 7 para createMatch.
- Envio de actionLog completo.
- Envio de boardSnapshot resumido (turno + zonas + estado por jugador).
- Calculo de duracion en segundos con matchStartedAt.
- Envio de turnCount y cardsUsed.
- Inferencia de winner por premios (cuando aplica).

Resultado:

- La partida se registra en backend/data/matches.json y queda disponible para historial y stats.

### 2) Nueva pantalla Historial (tab)

Se creo una nueva tab de Historial con:

- Lista paginada de partidas.
- Lectura de total de partidas.
- Tarjetas con datos utiles (fecha, ganador, duracion, turnos, acc    iones).
- Boton Cargar mas.
- Boton Actualizar.

### 3) Detalle de partida / replay base

Desde la lista se puede abrir el detalle por id:

- Metadata de partida (id, fechas, ganador, razon, duracion, turnos).
- Action log en orden reciente.
- Snapshot final serializado para inspeccion.

### 4) Dashboard de estadisticas

En la misma pantalla de historial se muestran:

- totalMatches
- withWinner
- withoutWinner
- avgDurationSeconds
- avgTurnCount
- top jugadores (winsByPlayer)
- top cartas (topCardsUsed)

### 5) Filtros y orden para demo

Se agregaron controles para no depender de lectura manual:

- Filtro por ganador: todas, con ganador, sin ganador.
- Filtro por fecha: todo, hoy, ultimos 7 dias.
- Busqueda por jugador/ganador.
- Orden: fecha desc/asc, duracion, turnos.

### 6) Exportacion de datos

Se agregaron acciones para compartir resultados filtrados:

- Exportar JSON.
- Exportar CSV.

Esto ayuda para evidencia de avance, revision y entrega.

## Integracion con backend (sin retrabajo)

Se reutilizaron endpoints ya existentes:

- POST /matches
- GET /matches
- GET /matches/:id
- GET /matches/stats

No se duplico logica de reglas del juego en componentes.
La UI consume datos y delega reglas a GameBoardService + backend.

## Validacion tecnica

- Frontend week 7 sin errores de tipos en archivos nuevos/actualizados.
- backend:typecheck ejecutado correctamente.

Adicional:

- Se documento checklist de QA para corrida manual completa en:
  - docs/Week7_QA_Checklist.md

## Flujo recomendado para demo Semana 7

1. Abrir Simulador.
2. Iniciar partida con dos mazos.
3. Ejecutar algunas acciones.
4. Presionar Guardar partida.
5. Ir a Historial.
6. Abrir la partida en detalle.
7. Revisar dashboard stats.
8. Probar filtros, orden y exportacion.

## Dudas abiertas

Por ahora no tengo dudas bloqueantes para semana 7.

Si Diego define un catalogo fijo de resultReason para reportes finales, solo habria que normalizar etiquetas en UI (ajuste menor, no bloqueante).

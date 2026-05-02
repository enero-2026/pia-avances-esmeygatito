# Week 7 QA Checklist (Historial + Stats)

## Objetivo

Validar extremo a extremo que el flujo de Semana 7 funciona sin retrabajo:

- Guardar partida desde simulador
- Ver partida en historial
- Ver detalle/replay base
- Ver estadísticas agregadas
- Ver filtros, orden y exportación

## Precondiciones

1. Backend levantado.
2. App frontend levantada.
3. Existen mazos válidos para ambos jugadores.

## Casos críticos

1. Guardado de partida

- Iniciar partida en simulador.
- Realizar varias acciones (robo, mover, pasar turno).
- Presionar "Guardar partida".
- Resultado esperado: snackbar de éxito y sin error en consola.

2. Lista de historial

- Ir a tab Historial.
- Resultado esperado: aparece la partida reciente en la parte superior cuando orden es "Fecha ↓".

3. Detalle de partida

- Abrir una partida desde la lista.
- Resultado esperado:
  - Se ve metadata (id, fechas, ganador, razón, duración, turnos).
  - Se ve action log (si hay acciones).
  - Se ve snapshot final serializado.

4. Dashboard de stats

- En Historial, revisar totalMatches, withWinner, withoutWinner, avgDurationSeconds, avgTurnCount.
- Resultado esperado: números coherentes con la cantidad de partidas guardadas.

5. Filtros por ganador

- Cambiar a "Con ganador" y luego "Sin ganador".
- Resultado esperado: la lista responde al filtro sin romper paginación.

6. Filtro por fecha

- Probar "Hoy" y "7 días".
- Resultado esperado: solo muestra partidas dentro del rango.

7. Búsqueda por jugador

- Buscar por nombre de jugador o ganador.
- Resultado esperado: solo aparecen partidas coincidentes.

8. Ordenamiento

- Probar Fecha ↓, Fecha ↑, Duración, Turnos.
- Resultado esperado: reordenamiento correcto.

9. Exportación JSON

- Aplicar filtros.
- Presionar "Exportar JSON".
- Resultado esperado: abre menú compartir con texto JSON de partidas filtradas.

10. Exportación CSV

- Aplicar filtros.
- Presionar "Exportar CSV".
- Resultado esperado: abre menú compartir con CSV de partidas filtradas.

## Casos borde

1. Sin partidas guardadas

- Resultado esperado: mensaje de estado vacío claro.

2. Partida sin ganador

- Resultado esperado: se muestra "Sin definir" y no falla en detalle/stats.

3. Snapshot nulo o incompleto (legacy)

- Resultado esperado: renderiza fallback con objeto vacío.

4. Error de red backend

- Resultado esperado: la app no crashea y permite reintentar actualización.

## Criterio de cierre Semana 7

Se considera cerrada cuando:

1. Todos los casos críticos pasan en Android/Web.
2. No hay errores TypeScript en archivos de Week 7.
3. El flujo end-to-end está validado al menos una vez en demo:

- Simular
- Guardar
- Listar
- Abrir detalle
- Ver stats
- Filtrar/ordenar
- Exportar

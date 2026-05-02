# Correcciones Semana 3

## Objetivo

Documentar los cambios aplicados para atender la retroalimentacion de Semana 3 sobre catalogo, detalle de carta y filtros en la app React Native con Expo y react-native-paper.

## 1) Correccion de filtrado de expansiones (Sets)

### Problema detectado

La seleccion inicial de expansiones estaba limitada a una lista corta y no cubria todos los sets esperados del bloque Scarlet & Violet ni del bloque Mega Evolution.

### Cambio implementado

Se actualizo la configuracion por defecto para incluir patrones completos:

- sv\* (bloque Scarlet & Violet completo)
- me\* (serie Mega Evolution)
- b1\* (sets relacionados al bloque ME con prefijo B1)
- b2\* (sets relacionados al bloque ME con prefijo B2)

Tambien se actualizaron las etiquetas visibles de estas opciones en la UI de filtros.

### Archivo impactado

- app/(tabs)/index.tsx

## 2) Correccion de error 404 en detalle de carta

### Problema detectado

Al pedir detalle de una carta, en algunos casos el id llegaba mal formado o vacio y la peticion devolvia error 404.

### Cambio implementado

En el servicio de detalle se aplicaron mejoras de robustez:

- Normalizacion y validacion de id antes de solicitar el detalle.
- Uso de encodeURIComponent para construir la URL de forma segura.
- Manejo explicito de respuesta 404 devolviendo null sin romper el flujo de la app.

### Archivo impactado

- services/tcgdexService.ts

## 3) Refactor de detalle a Modal

### Objetivo UX

Reemplazar la navegacion a una pantalla separada por un modal centrado para mantener contexto visual del catalogo.

### Cambio implementado

Se refactorizo el flujo de seleccion de carta para abrir un modal de react-native-paper:

- Al tocar una carta se abre un Modal en la misma pantalla de catalogo.
- Se muestra fondo oscuro semitransparente para conservar visibilidad de la galeria detras.
- Se carga la imagen de detalle con estado de loading.
- Se agrega cierre por boton y dismiss del modal.

### Archivo impactado

- app/(tabs)/index.tsx

## 4) Mejora de UI de filtros (agrupacion por categoria)

### Problema detectado

Los filtros se presentaban de forma plana, dificultando lectura y navegacion cuando habia muchas opciones.

### Cambio implementado

Se reorganizo el render de filtros usando componentes de react-native-paper:

- List.Accordion para grupos:
  - Tipos
  - Rarezas
  - Tags
- Integracion de seleccion visual con Checkbox en cada opcion.
- Normalizacion de valores para mapear correctamente:
  - TYPE\_\*
  - RARITY\_\*
  - tags generales
- Se mantiene comportamiento dinamico segun expansiones activas.

### Archivo impactado

- app/(tabs)/index.tsx


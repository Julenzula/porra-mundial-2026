# Porra Mundial 2026 - Brief funcional

## Objetivo

Aplicacion web en Next.js para seguir una porra privada del Mundial 2026. La primera version es un mock visual con datos hardcoded, pensada para validar el look & feel creado en Figma Make antes de conectar persistencia, API de resultados o autenticacion.

La experiencia esta optimizada para movil, con una composicion tipo app: hero superior, navegacion por pestanas sticky y pantallas compactas de ranking, actividad, evolucion, participantes y compartir por WhatsApp.

## Estado actual

- Stack: Next.js, TypeScript y Tailwind.
- Datos: hardcoded en `app/data.ts`.
- Backend: no conectado.
- Supabase: no conectado.
- API de resultados: no conectada.
- Login: no implementado.
- Deploy objetivo: Vercel.

## Look & feel

La direccion visual replica la referencia de Figma Make y la identidad grafica del Mundial 2026:

- Fondo blanco y layout movil centrado.
- Hero con patron de rectangulos/anillos concentricos de colores FIFA 2026.
- Tipografia condensada para titulares, nombres y puntuaciones.
- Colores principales:
  - Verde lider: `#006847`
  - Rojo FIFA: `#E8002D`
  - Azul: `#003DA5`
  - Morado: `#7B2D8B`
  - Cyan: `#00A2C7`
  - Lima: `#B8D800`
  - Granate: `#5C0000`
  - WhatsApp: `#25D366`
- Tarjetas compactas, bordes suaves y jerarquia visual muy clara para puntos, posicion y cambios diarios.

## Pantallas principales

### Ranking

Muestra la clasificacion general de participantes ordenada por puntos totales.

Incluye:

- Tarjeta destacada para el lider.
- Puntos totales.
- Puntos ganados/perdidos hoy.
- Equipos elegidos representados por banderas.
- Filas compactas para el resto de participantes.
- Fecha/hora mock de actualizacion.

### Actividad

Muestra eventos recientes por participante.

Incluye:

- Selector horizontal de participantes.
- Resumen del participante seleccionado.
- Puntos del dia.
- Eventos por jornada: victorias, empates, derrotas, goles, goleadores y bonus.
- Diferenciacion visual entre eventos positivos, negativos y neutros.

### Evolucion

Muestra la evolucion de puntos durante las ultimas jornadas.

Incluye:

- Grafico SVG con lineas por participante.
- Leyenda de colores.
- Tabla/resumen de clasificacion actual.
- Datos mock de siete jornadas.

### Participantes

Muestra el detalle de cada participante y sus elecciones.

Incluye:

- Lista ordenada por ranking.
- Fila desplegable por participante.
- Equipos elegidos con puntos.
- Goleadores elegidos con goles y puntos.
- Total acumulado.

### Compartir WhatsApp

Genera una vista previa del mensaje para compartir el estado de la porra.

Incluye:

- Ranking con formato de WhatsApp.
- Mayor subida.
- Top goleador.
- Top equipo.
- Boton para copiar mensaje.
- Boton para abrir WhatsApp con el texto prellenado.

## Reglas de puntuacion mock

Las reglas actuales estan representadas solo como datos de ejemplo. No hay motor real de calculo todavia.

Modelo usado en el mock:

- Victoria de equipo elegido: puntos positivos.
- Empate de equipo elegido: puntos positivos menores.
- Derrota o eliminacion de equipo elegido: puntos negativos.
- Goles de equipo elegido: puntos positivos adicionales.
- Goleador elegido marca: puntos positivos.
- Bonus de clasificacion o hito especial: puntos positivos.
- Total diario: suma de eventos del dia.
- Total general: suma acumulada por participante.

Valores visibles en el mock:

- Victoria: `+3`
- Empate: `+1`
- Derrota: entre `-1` y `-4`
- Goles de equipo: `+2` o `+3`
- Goleador: `+2`, `+3`, `+4` o `+6`
- Bonus: `+3`

Estas reglas deben formalizarse antes de conectar datos reales.

## Modelo de datos actual

El mock vive en `app/data.ts` y contiene:

- `PARTICIPANTS`: participantes, avatar, color, puntos totales, puntos de hoy, equipos y goleadores.
- `EVOLUTION_DATA`: evolucion diaria de puntos por participante.
- `ACTIVITY_DATA`: eventos recientes por participante.
- `TOP_SCORER`: maximo goleador mock.
- `TOP_TEAM`: equipo con mas puntos mock.
- `BIGGEST_RISER`: mayor subida del dia mock.

## Recalculo manual de puntuacion

La app incluye un primer motor interno para recalcular la porra desde datos manuales guardados en Supabase. No conecta ninguna API externa de futbol y no requiere login.

Endpoint:

- `POST /api/recalculate`

Proteccion:

- En produccion debe configurarse `RECALCULATE_SECRET`.
- La llamada debe enviar el secreto en el header `x-recalculate-secret`, en `Authorization: Bearer <secret>` o como query param `?secret=<secret>`.
- Si `RECALCULATE_SECRET` no existe, solo se permite ejecutar en `development`.

Tablas de entrada:

- `matches`: partidos con `status = 'finished'` y resultado final.
- `match_goals`: goles de esos partidos.
- `participant_teams`: equipos elegidos por participante.
- `participant_scorers`: goleadores elegidos por participante.
- `participants`, `teams`, `scorers`: nombres, ids y metadatos para calcular y describir eventos.

Tablas regeneradas o actualizadas:

- `daily_activity`: eventos entendibles por participante y fecha.
- `current_ranking`: total recalculado, puntos de la ultima fecha con actividad, posicion nueva y posicion anterior.
- `ranking_snapshots`: historico por fecha afectada.

Reglas actuales:

- Victoria de equipo elegido: `+3`.
- Empate de equipo elegido: `+1`.
- Derrota: `+0`.
- Cada gol marcado por equipo elegido: `+1`.
- Goleador G1: `+1` por gol.
- Goleador G2: `+2` por gol.
- Goleador G3: `+3` por gol.
- Cuentan goles de penalti durante partido y goles en prorroga.
- No cuentan goles de tanda de penaltis ni goles en propia puerta para goleadores.

## Proximos bloques de desarrollo

### 1. Definir reglas finales de puntuacion

- Confirmar puntuacion por victoria, empate, derrota, goles, clasificacion, eliminacion y campeon.
- Confirmar puntuacion para goleadores.
- Definir desempates.
- Definir si hay penalizaciones.

### 2. Modelar base de datos

Preparar esquema para Supabase:

- Participantes.
- Equipos elegidos.
- Goleadores elegidos.
- Partidos.
- Resultados.
- Eventos de puntuacion.
- Totales diarios.
- Ranking agregado.

### 3. Crear motor de calculo

- Convertir resultados reales en eventos de puntuacion.
- Recalcular totales por participante.
- Guardar historico de jornadas.
- Separar calculo de presentacion.

### 4. Conectar Supabase

- Sustituir datos hardcoded por queries.
- Mantener fallback/mock para desarrollo.
- Preparar variables de entorno para Vercel.

### 5. Conectar API de resultados

- Elegir proveedor de datos de partidos.
- Normalizar equipos, banderas, fechas y estados.
- Definir tarea de sincronizacion.

### 6. Administracion minima

- Pantalla o scripts para introducir elecciones.
- Pantalla o scripts para corregir resultados/eventos.
- Import/export de datos.

### 7. Autenticacion opcional

No se incluye en la primera version. Cuando haga falta:

- Login simple para admin.
- Acceso publico de solo lectura para participantes.
- Proteccion de acciones de escritura.

### 8. Mejoras de producto

- Enlaces compartibles por jornada.
- Filtros por participante.
- Historial completo de actividad.
- Estado de partidos en vivo.
- Notificaciones o mensaje diario automatico para WhatsApp.

## Criterios de la version mock

La version mock se considera correcta si:

- Respeta el diseno base de Figma Make.
- No depende de Supabase.
- No depende de una API externa.
- No requiere login.
- Funciona en local y en Vercel.
- Permite validar la navegacion y la jerarquia visual de las cinco pantallas principales.

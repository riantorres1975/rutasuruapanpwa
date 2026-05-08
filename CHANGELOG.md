# Bitácora de cambios — UruGo PWA

Registro técnico de las modificaciones realizadas al proyecto.
Ordenado del más reciente al más antiguo.

---

## INSTRUCCIÓN PARA EL ASISTENTE

> Cada vez que se realice un cambio en este proyecto — nuevo archivo, función
> modificada, decisión de arquitectura, bug corregido — documéntalo en este
> archivo **antes de terminar la sesión**, sin que el usuario tenga que pedirlo.
>
> Formato por entrada:
> - Fecha (si se conoce)
> - Archivos afectados
> - Qué se hizo y por qué
> - Estado actual (pendientes, decisiones abiertas)
>
> El objetivo es que al cargar este archivo en una nueva conversación,
> el asistente tenga contexto completo del proyecto sin preguntas adicionales.

---

## [2026-05-08] Fix: rediseño de flechas direccionales como iconos SDF chevron

**Archivos modificados:**
- `components/Map.tsx`

### Qué se hizo
- Las flechas direccionales en rutas (transbordos y rutas seleccionadas) usaban caracteres Unicode (`›`, `▶`) o, en una iteración intermedia, polígonos GeoJSON de tamaño geográfico fijo (~27 m). Ambos enfoques fallaban: el primero no rotaba limpiamente con la línea y el segundo era invisible al alejar el zoom.
- Nuevo enfoque: una imagen chevron (V) trazada en `<canvas>`, registrada en el mapa vía `map.addImage(..., { sdf: true })`. Esto permite tintarla dinámicamente con el color de cada ruta usando `icon-color`.
- El symbol layer usa `symbol-placement: "line"` con `icon-size` y `symbol-spacing` interpolados por zoom (`0.35x → 0.85x` y `55px → 130px` entre arrows). Resultado: las flechas son visibles tanto a zoom de ciudad (11) como acercado (17).
- Halo oscuro (`icon-halo-color: rgba(0,0,0,0.55)`) para mantener contraste sobre fondos claros y oscuros.
- El chevron se dibuja apuntando hacia la **derecha** (+x) en la imagen fuente, porque con `symbol-placement: "line"` Mapbox rota el icono de modo que su lado derecho mire el sentido de la línea. Apuntarlo hacia arriba causaba que las flechas quedaran 90° rotadas respecto al sentido de marcha (corregido en commit posterior).
- La imagen se re-registra en el handler de `style.load` (cambio de tema light/dark) porque Mapbox descarta los iconos asociados al estilo anterior.

---

## [2026-05-08] Fix: mapa se re-centraba al refrescar GPS y CSP roto en dev

**Archivos modificados:**
- `components/Map.tsx`
- `next.config.mjs`

### Qué se hizo

#### `components/Map.tsx`
- El effect que auto-encuadra los pines A/B se disparaba en cada actualización pasiva del GPS, devolviendo la cámara a la ubicación del usuario mientras intentaba explorar el mapa para elegir su destino.
- Se añadieron `prevOriginRef` y `prevDestinationRef` para rastrear las coordenadas anteriores. La animación de cámara ahora solo ocurre si las coordenadas del pin **cambiaron efectivamente** — es decir, cuando el usuario coloca un pin manualmente. Los refrescos del GPS que devuelven prácticamente el mismo punto ya no interrumpen la exploración del mapa.

#### `next.config.mjs`
- Al eliminar `unsafe-eval` del CSP en un fix anterior, el React Fast Refresh quedó bloqueado en desarrollo (error `EvalError` en consola).
- El CSP ahora incluye `unsafe-eval` solo cuando `NODE_ENV === "development"`. En producción/Vercel sigue siendo estricto sin `unsafe-eval`.

---

## [2026-05-08] Refactor: base de conocimiento del chat extraída a módulo independiente

**Archivos modificados:**
- `lib/chat-knowledge.ts` *(nuevo)*
- `app/api/chat/route.ts`

### Qué se hizo
- Las ~135 líneas de datos inline en el handler del chat (`DESTINATIONS`, `SCHEDULES`, `ALIASES`, `ROUTE_DETAILS` y los tipos `Stop`/`RouteDetail`) se movieron a `lib/chat-knowledge.ts`.
- El módulo exporta cada constante con prefijo `CHAT_` (`CHAT_DESTINATIONS`, etc.) para evitar colisiones de nombres en el árbol de imports.
- `app/api/chat/route.ts` ahora importa desde `@/lib/chat-knowledge` y ya no contiene datos hardcodeados.
- Sin cambios de comportamiento. `tsc --noEmit` pasa sin errores.

---

## [2026-05-08] Fix: a11y, UX, PWA, theme y tooling (ronda 2)

**Archivos modificados:**
- `components/AdaptiveTheme.tsx`
- `components/BottomSheet.tsx`
- `components/NearbyToast.tsx`
- `components/Map.tsx`
- `components/PWARegistrar.tsx`
- `app/api/chat/route.ts`
- `app/layout.tsx`
- `app/sitemap.ts`
- `tsconfig.json`
- `eslint.config.mjs`
- `public/sw.template.js`

### Qué se hizo

#### `components/AdaptiveTheme.tsx` + `app/layout.tsx`
- El tema ahora respeta `prefers-color-scheme` del sistema operativo como señal primaria. Si el OS tiene preferencia explícita (dark/light), se usa esa. Si no, se aplica el fallback basado en hora del día.
- Se añade listener de `MediaQueryList.change` para reaccionar a cambios del OS en tiempo real (ej. modo oscuro automático del teléfono).
- El inline script de `layout.tsx` se actualizó para que la detección inicial (antes de React) use la misma lógica, evitando flash de tema incorrecto.

#### `components/BottomSheet.tsx`
- `aria-modal` ahora solo se aplica cuando `open === true`. Antes estaba siempre en `"true"`, lo que hacía que lectores de pantalla anunciaran un diálogo invisible cuando el sheet estaba cerrado.

#### `components/NearbyToast.tsx` + `components/Map.tsx`
- Corrección de typo: "ubicacion" → "ubicación" (con tilde). Afectaba texto visible y `aria-label`.

#### `components/PWARegistrar.tsx` + `public/sw.template.js`
- Se elimina `skipWaiting()` automático del evento `install` del SW. Antes, cada nueva versión del SW tomaba control inmediatamente sin avisar al usuario, pudiendo interrumpir el flujo activo.
- `PWARegistrar` ahora muestra un toast "Nueva versión disponible" con botones **Actualizar** (envía `SKIP_WAITING` y recarga) y **Cerrar** (pospone). El diseño usa los mismos tokens que `PWAInstallBanner`.

#### `app/api/chat/route.ts`
- `history.slice(-4)` → `slice(-8)`. El límite de 4 era inconsistente con la validación de hasta 20 entradas documentada. 8 da mejor contexto al modelo sin exceder el budget de tokens.

#### `app/sitemap.ts`
- `ROUTES_LAST_MODIFIED` ahora usa `now` en lugar de `new Date("2026-04-01")` hardcodeado. Las fechas estáticas en el sitemap no reflejan cambios reales y confunden a los crawlers.

#### `tsconfig.json`
- `target` actualizado de `ES2017` a `ES2022`. Next.js 16 ya transpila para el target del navegador; el target del tsconfig solo afecta la emisión de TypeScript y los features disponibles en type-checking. ES2022 habilita `at()`, `Object.hasOwn`, `Error.cause`, etc.

#### `eslint.config.mjs`
- `react-hooks/set-state-in-effect` cambiado de `"off"` a `"warn"`. La regla detecta llamadas a setState dentro de efectos sin condiciones adecuadas; activarla como warning (no error) permite identificar patrones problemáticos sin romper el build.

### Estado actual
- Pendiente (intencionalmente pospuesto): unificación de `DESTINATIONS`/`ALIASES`/`SCHEDULES` duplicados entre `app/api/chat/route.ts` y `lib/route-names.ts`. Los datos del chat están ajustados para el prompt de IA y unificarlos sin verificar cada valor podría degradar las respuestas del chatbot.

---

## [2026-05-08] Fix: 10 mejoras de bugs, PWA, rendimiento y SEO (ronda 1)

**Archivos modificados:**
- `app/mapa/page.tsx`
- `public/sw.template.js`
- `next.config.mjs`
- `app/api/chat/route.ts`
- `app/layout.tsx`
- `app/robots.ts`
- `app/api/rutas-polyline/route.ts`
- `public/manifest.json`

### Qué se hizo
- **GPS**: acepta refinamientos GPS válidos y limpia el aviso de drift; `geoAccuracyWarn` se resetea cuando la lectura mejora.
- **Fetch retry**: `fetchAttempt` ahora es dependencia del efecto de carga — el botón "Reintentar" dispara un nuevo fetch correctamente.
- **SW**: valida `response.ok` en `cacheFirst` y `staleWhileRevalidate` antes de cachear — evita guardar permanentemente respuestas 404/500.
- **BUILD_ID dev**: `"dev"` fijo en desarrollo para no invalidar la caché del SW en cada hot reload.
- **Chat API**: `setInterval` de limpieza solo se registra en desarrollo (no en serverless/Lambda).
- **PWAInstallBanner**: montado en `layout.tsx` — el install prompt ahora aparece correctamente.
- **OG image**: usa `SITE_URL` env var en lugar de URL hardcodeada, funciona en preview/staging.
- **robots.ts**: elimina `/mapa?*` (sintaxis no estándar); `/mapa` queda indexable.
- **rutas-polyline**: `force-dynamic` → `revalidate=3600` — Vercel CDN cachea la respuesta.
- **manifest.json**: campo `screenshots` agregado (requerido por Chrome para install prompt enriquecido).

---

## [2026-05-08] Security: hardening de endpoints y CSP

**Archivos modificados:**
- `next.config.mjs`
- `app/api/chat/route.ts`
- `app/api/debug/save-route/route.ts`
- `app/api/rutas-polyline/route.ts`

### Qué se hizo

Auditoría de seguridad completa del código base. Se corrigieron 5 vulnerabilidades identificadas.

#### `next.config.mjs`
- Eliminado `'unsafe-eval'` de `script-src` en el CSP. Esta directiva permitía `eval()` y `new Function()`, anulando la protección CSP ante cualquier XSS. Mapbox GL JS y Next.js no lo requieren en producción.

#### `app/api/chat/route.ts`
- Añadida validación de longitud máxima en el campo `message` (límite: 1000 caracteres). Sin este límite, un atacante podía enviar payloads arbitrariamente grandes que se embebían directamente en el request a DeepSeek.
- Eliminado `x-client-ip` de la lista de candidatos en `getClientIp()`. Este header no estándar podía ser enviado libremente por cualquier cliente para suplantar su IP y evadir el rate limiter.

#### `app/api/debug/save-route/route.ts`
- Añadido guard que retorna 404 cuando `NODE_ENV === "production"`. El endpoint de escritura de archivos era accesible en producción en una ruta públicamente adivinable. Ahora es completamente invisible fuera del entorno de desarrollo.

#### `app/api/rutas-polyline/route.ts`
- Cambiado `Cache-Control` de `no-cache, must-revalidate` a `public, max-age=3600, stale-while-revalidate=86400`. El header anterior forzaba una lectura de disco y respuesta completa en cada request. Con el nuevo header, Vercel CDN cachea la respuesta en edge, reduciendo carga del servidor.

### Estado actual
- El rate limiter de `/api/chat` sigue siendo in-memory (efectivo en local/servidor long-lived, limitado en Vercel serverless). Para producción en Vercel se recomienda migrar a Upstash Redis como mejora futura.

---

## [2026-05-04] Feature: integrar landmarks en UI — indicaciones y búsqueda

**Rama:** `experimental`
**Archivos modificados:**
- `lib/routeMatcher.ts`
- `app/mapa/page.tsx`
- `components/RouteList.tsx`

### Qué se hizo

Se integraron los landmarks (puntos de referencia) de `rutas_produccion_final.json`
en la interfaz de usuario, tanto en las indicaciones de ruta como en el buscador
de rutas. Las rutas sin landmarks no se ven afectadas (graceful degradation).

### Cambios por archivo

#### `lib/routeMatcher.ts`

- `PolylineRoute` ahora incluye campo opcional `landmarks?: ProductionRouteLandmark[]`.
- Los landmarks fluyen desde el JSON hasta el motor de matching sin alterar el scoring.

#### `app/mapa/page.tsx`

- **`routesForMatching`**: incluye `landmarks` de cada `ProductionRoute`.
- **`findNearestLandmark(point, landmarks, maxDistM)`**: helper que busca el
  landmark más cercano a un punto dentro de un radio dado (usa `haversineMeters`).
- **`routeTextSummary`**: las indicaciones muestran landmarks cuando existen:
  - Antes: `"Sube a Ruta 1 cerca de tu ubicación (~120 m a pie)."`
  - Ahora: `"Sube a Ruta 1 cerca de Central de Autobuses (~120 m a pie)."`
  - Fallback: si no hay landmark a ≤150 m, usa texto original ("tu ubicación" / "tu destino").
- **`landmarksByRouteName`**: nuevo memo que agrupa landmarks por nombre de ruta
  (deduplicado por `name` para no repetir ida/vuelta).
- Ambos `<RouteList>` (desktop sidebar + mobile BottomSheet) reciben prop
  `landmarksByRouteName`.

#### `components/RouteList.tsx`

- **Props**: nueva prop `landmarksByRouteName?: Map<string, ProductionRouteLandmark[]>`.
- **`searchableRoutes`**: incluye campo `_landmarks` (nombres de landmarks unidos
  por espacio) para búsqueda fuzzy.
- **`landmarkRouteMap`**: índice invertido `landmarkName → Set<routeName>` para
  lookup O(1).
- **`matchedLandmark`**: detecta qué landmark coincide con el query del usuario.
- **`landmarkMatchingRouteNames`**: set de nombres de rutas que pasan por el
  landmark detectado.
- **`filteredRoutes`**: cuando el query matchea un landmark, las rutas que pasan
  por ahí se pinnean al inicio de la lista.
- **Badge "POR AQUÍ"**: badge teal en las rutas que matchean el landmark buscado.
- **Subtítulo**: muestra `"Pasa por: Central de Autobuses"` en color teal cuando
  la ruta matchea un landmark.
- **Estilo**: borde teal (`border-teal-400/60 bg-teal-500/8`) en cards de rutas
  que matchean landmarks.
- **Placeholder**: actualizado a `"Colonia, destino, punto de referencia o número de ruta…"`.

### Comportamiento

| Escenario | Resultado |
|---|---|
| Ruta sin landmarks | Texto actual intacto, sin cambios visuales |
| Ruta con landmarks, origen cerca de uno | "Sube cerca de **Central de Autobuses** (~45 m a pie)" |
| Busca "IMSS" en el buscador | Muestra rutas con "IMSS" como landmark, ordenadas arriba con badge POR AQUÍ |
| Busca "Central" (chip existente) | Sigue funcionando + ahora también matchea landmarks |

### Verificación

- `npm run lint` — sin errores ni warnings
- `npx --no-install tsc --noEmit` — sin errores
- `npm run build` — compilación correcta

### Estado: completo

---

## [2026-05-04] Perf: perfilar y acelerar transbordos al mover pines

**Rama:** `experimental`
**Archivos modificados:**
- `lib/transfers.ts`
- `CHANGELOG.md`

### Problema

El matcher directo ya estaba respondiendo rápido, pero el cálculo de transbordos
seguía haciendo trabajo repetido cuando el usuario movía pines varias veces. En
benchmarks locales, la búsqueda directa rondaba ~0.9 ms promedio, mientras que
transbordos rondaba ~5.2 ms promedio y podía subir a ~20 ms en p99.

### Cambios

- Se agregó cache por ruta con `WeakMap` para métricas acumuladas de distancia.
- El largo de cada segmento candidato ahora se obtiene por diferencia de
  distancias acumuladas, sin volver a sumar puntos ni crear slices antes de
  validar.
- Los slices de segmentos se crean solo cuando el candidato ya pasó los filtros
  de longitud y desvío.
- Se adelantó el descarte de viajes demasiado cortos antes de escanear rutas.

### Verificación

- Benchmark local de transbordos:
  - antes: ~5.2 ms promedio, p90 ~11.1 ms, p99 ~20.6 ms
  - después: ~2.6-2.9 ms promedio, p90 ~5.3 ms, p99 ~8 ms en caliente
- `node_modules\.bin\sucrase-node.cmd lib\__tests__\transfers.test.ts`
  - 4/4 tests pasando
- `node_modules\.bin\sucrase-node.cmd lib\__tests__\routeMatcher.test.ts`
  - 40/40 tests pasando
- `npm run lint`
  - sin errores ni warnings
- `npx --no-install tsc --noEmit`
  - sin errores
- `npm run build`
  - compilación correcta

### Estado: completo

---

## [2026-05-04] Perf: reducir trabajo de Mapbox y búsqueda de rutas

**Rama:** `experimental`
**Archivos modificados:**
- `components/Map.tsx`
- `app/mapa/page.tsx`
- `lib/map.ts`

### Problema

Después de recuperar más puntos en el JSON, la app se sentía más trabada que el
motor anterior. La causa no era solo el tamaño del JSON, sino trabajo repetido
en cliente:

- `components/Map.tsx` construía el GeoJSON con `toFeatureCollection(routes)`
  dentro del inicializador de `useRef`, que se evalúa en cada render.
- El efecto principal del source de Mapbox dependía de `originPoint` y
  `destinationPoint`, provocando `source.setData(routeFeatures)` cuando solo
  cambiaban pines.
- En móvil, la animación de dibujo hacía `source.setData(...)` cada frame.
- `app/mapa/page.tsx` reconstruía `routesForMatching` en cada búsqueda.
- `getBoundsFromRoutes` usaba `flatMap`, creando un arreglo temporal con todos
  los puntos.

### Cambios

- `routeFeaturesRef` ahora se inicializa de forma perezosa, sin reconstruir
  GeoJSON en cada render.
- El efecto de actualización del source ya no depende de origen/destino; los
  pines se manejan en su propio efecto.
- La animación de dibujo de ruta se desactiva en pantallas táctiles y cuando el
  usuario prefiere reducir movimiento.
- `routesForMatching` y `polylineRoutesById` se memoizan.
- Búsquedas por ruta seleccionada usan `Map` en lugar de `.find(...)` repetido.
- `getBoundsFromRoutes` calcula límites en un solo loop, sin `flatMap`.
- Se eliminó el warning de lint por dependencia innecesaria `transfers.length`.

### Verificación

- `npm run lint`
  - sin errores ni warnings
- `npm run build`
  - compilación correcta
- `npx --no-install tsc --noEmit`
  - sin errores
- `node_modules\.bin\sucrase-node.cmd lib\__tests__\routeMatcher.test.ts`
  - 40/40 tests pasando
- `node_modules\.bin\sucrase-node.cmd lib\__tests__\transfers.test.ts`
  - 4/4 tests pasando

### Estado: completo

---

## [2026-05-04] Fix: selección de ruta pintaba rutas ajenas

**Rama:** `experimental`
**Archivos modificados:**
- `components/Map.tsx`
- `app/mapa/page.tsx`

### Problema

Al elegir una ruta desde la lista o al ver una sugerencia en el mapa, seguían
apareciendo otras rutas resaltadas. La causa era que las capas de Mapbox todavía
usaban `suggestedRouteIds` aunque existiera una ruta o segmento activo.

### Cambios

- En `components/Map.tsx`, cuando hay `selectedRouteId`, la ruta seleccionada
  manda sobre las sugerencias y las demás líneas quedan con opacidad/ancho `0`.
- Cuando hay un segmento activo sin `selectedRouteId` (caso "Ver ruta" desde el
  resultado), las capas base se apagan para dejar visible solo el segmento.
- `isSegmentSelection` ahora detecta cualquier segmento activo, no solo los que
  tienen `selectedRouteId`.
- En `app/mapa/page.tsx`, seleccionar una ruta limpia `selectedTransfer`,
  `sharedRouteSegment`, `sharedSegmentColor` y `showTeleferico` para evitar
  estados visuales mezclados.

### Verificación

- `node_modules\.bin\sucrase-node.cmd lib\__tests__\routeMatcher.test.ts`
  - 40/40 tests pasando
- `node_modules\.bin\sucrase-node.cmd lib\__tests__\transfers.test.ts`
  - 4/4 tests pasando
- `npx --no-install tsc --noEmit`
  - sin errores
- `npm run build`
  - compilación correcta
- `npm run lint`
  - 0 errores, 1 warning existente en `app/mapa/page.tsx`

### Estado: completo

---

## [2026-05-04] Fix: matcher seguía sin rutas por umbral/caché/transbordos

**Rama:** `experimental`
**Archivos modificados:**
- `data/rutas_produccion_final.json`
- `lib/transfers.ts`
- `lib/__tests__/transfers.test.ts`
- `app/api/rutas-polyline/route.ts`
- `public/sw.template.js`
- `public/sw.js`

### Problema

Aunque el JSON ya tenía más puntos, la app seguía mostrando "Sin ruta" en
casos donde sí había rutas cercanas. Se encontraron tres causas adicionales:

1. El motor viejo usaba `PROXIMITY_METERS = 550`, pero el dataset nuevo tenía
   `corridor_width_m = 150` en todas las rutas. Eso descartaba pines a más de
   150 m de la línea, aunque el flujo anterior sí aceptaba caminar más.
2. El motor de transbordos tenía `MAX_DETOUR_RATIO = 2.0`. En Uruapan algunos
   transbordos reales rodean el aeropuerto o pasan por avenidas largas y quedan
   entre `2.3x` y `3.0x` la distancia recta.
3. El service worker servía `/api/rutas-polyline` con `staleWhileRevalidate`,
   entregando primero el JSON viejo cacheado.

### Cambios

- `corridor_width_m` actualizado a `550` en las 80 rutas para igualar el radio
  práctico del motor anterior.
- `MAX_DETOUR_RATIO` subido de `2.0` a `3.5`.
- `lib/transfers.ts` usa imports relativos para permitir tests aislados.
- Nuevo test `lib/__tests__/transfers.test.ts` valida que un transbordo urbano
  con desvío legítimo menor a `3.5x` sea aceptado.
- `/api/rutas-polyline` ahora responde con `Cache-Control: no-cache, must-revalidate`.
- El service worker ahora usa `networkFirstData` para `/api/rutas-polyline`,
  con caché solo como fallback offline.

### Verificación

- API local:
  - status `200`
  - `80` rutas
  - `4,888` puntos
  - `corridor_width_m = 550`
  - `Cache-Control: no-cache, must-revalidate`
- `node_modules\.bin\sucrase-node.cmd lib\__tests__\routeMatcher.test.ts`
  - 40/40 tests pasando
- `node_modules\.bin\sucrase-node.cmd lib\__tests__\transfers.test.ts`
  - 4/4 tests pasando
- `npx --no-install tsc --noEmit`
  - sin errores
- `npm run build`
  - compilación correcta
- `npm run lint`
  - 0 errores, 1 warning existente en `app/mapa/page.tsx`

### Estado: completo

---

## [2026-05-04] Data: regenerar rutas_produccion_final con más puntos

**Rama:** `experimental`
**Archivos modificados:**
- `data/rutas_produccion_final.json`

### Problema

El JSON optimizado anterior redujo demasiado la geometría: de 5,953 puntos del
archivo original pasó a 1,725 puntos (~29%). Además faltaba la dirección `id: 4`
(`Ruta 1 (Vuelta)`). En campo seguían apareciendo casos sin ruta directa aunque
las líneas sí pasaban por la zona.

### Cambios

- Fuente usada: `C:\Users\Full Party\Downloads\rutas.json`.
- Se mantuvo el formato nuevo:
  - `id`
  - `name`
  - `original_name`
  - `color`
  - `corridor_width_m`
  - `verified`
  - `path`
  - `landmarks`
- Se convirtió `nombre` → `original_name`.
- Se derivó `name` quitando el sufijo `(Ida)` / `(Vuelta)` cuando no existía
  metadata previa.
- Se conservó metadata existente por `id` cuando estaba disponible.
- Simplificación Douglas-Peucker con tolerancia baja de `3 m`.

### Resultado

- Rutas/direcciones: `80`
- Nombres únicos de ruta: `40`
- Puntos: `5,953` → `4,888` (`82.1%` conservado)
- `id: 4` recuperado con `52` puntos

### Verificación

- Validación de contrato JSON: sin campos faltantes ni paths inválidos
- `node_modules\.bin\sucrase-node.cmd lib\__tests__\routeMatcher.test.ts`
  - 40/40 tests pasando
- `npx --no-install tsc --noEmit`
  - sin errores
- `npm run build`
  - compilación correcta
- `npm run lint`
  - 0 errores, 1 warning existente en `app/mapa/page.tsx`

### Estado: completo

---

## [2026-05-04] Fix: rutas directas rechazadas tras optimizar JSON

**Rama:** `experimental`
**Archivos modificados:**
- `lib/routeMatcher.ts`
- `lib/__tests__/routeMatcher.test.ts`

### Problema

Después de unificar el motor en `rutas_produccion_final.json` y optimizar los
paths, algunas rutas directas dejaban de aparecer aunque visualmente sí pasaran
por origen y destino.

La causa estaba en el motor nuevo: `isRouteValid` comparaba solo
`destSeg.segmentIndex > originSeg.segmentIndex`. Con el JSON optimizado hay
segmentos más largos, así que origen y destino pueden proyectarse sobre el
mismo segmento. En ese caso ambos tenían el mismo `segmentIndex` y el motor
rechazaba la ruta como si fuera dirección incorrecta.

### Cambios

#### `lib/routeMatcher.ts`

- `ClosestOnPath` ahora incluye:
  - `segmentT`: posición proyectada dentro del segmento (`0..1`)
  - `projectedPoint`: punto exacto proyectado sobre la polyline
  - `progressM`: avance acumulado en metros desde el inicio de la ruta
- `getClosestPointOnPath` calcula la proyección y el avance acumulado.
- `isRouteValid` valida dirección con `destSeg.progressM > originSeg.progressM`
  en lugar de comparar solo índices.
- El segmento sugerido ahora se construye desde los puntos proyectados reales,
  no desde el segmento completo crudo. Esto mejora score y pintura en mapa.

### Verificación

- `node_modules\.bin\sucrase-node.cmd lib\__tests__\routeMatcher.test.ts`
  - 40/40 tests pasando
- `npx --no-install tsc --noEmit`
  - sin errores

### Estado: completo

---

## [2026-05-04] Limpieza: residuos del motor de rutas viejo

**Rama:** `experimental`
**Archivos modificados/eliminados:**
- `package.json` — eliminados scripts rotos `convert:rutas`, `group:rutas`, `pipeline:rutas`
- `.github/workflows/build.yml` — CI ajustado para validar `data/rutas_produccion_final.json`
- `README.md` — documentación actualizada de `/api/rutas-polyline` y fuente maestra actual
- `lib/routeIntersections.ts` — eliminado archivo sin imports reales

### Qué se verificó

- No quedan referencias activas al motor viejo en `app/`, `components/` o `lib/`.
- La documentación pública ya no menciona `/api/rutas`, `data/rutas.json`, `data/rutas-grouped.json` ni los scripts eliminados.
- El workflow ya no intenta subir artefactos eliminados.
- `data/gtfs/` se conserva porque no pertenece claramente al motor viejo y puede servir como dataset auxiliar/futuro.

### Estado: completo

---

## [2026-05-04] UX: Modo manual de pines — flujo simplificado

**Rama:** `experimental`
**Archivos modificados:** `app/mapa/page.tsx`

### Problema

Al probar rutas manualmente era confuso:
1. Con GPS activo el primer tap en el mapa ponía el destino (B) porque `activePoint` ya era `"destination"`.
2. Al cambiar origen (A), se borraba el destino y el usuario tenía que re-poner B desde cero.
3. No había botón explícito de "Cambiar origen" en la tarjeta de resultados.

### Cambios

#### `handleMapPick` — ya no borra destino al cambiar origen
- `active === "origin"` + destino ya existe → actualiza solo `manualOrigin`, `activePoint = null`.
- `active === "origin"` + sin destino → comportamiento anterior (avanza a destino).
- Sin modo activo + ambos pines ya fijados → mueve el **destino** (acción más común).

#### Tarjeta de resultados — dos botones separados
Reemplaza el botón genérico "Ajustar" por dos botones explícitos:
- **Origen** (ícono pin) → activa modo origin sin cerrar resultado.
- **Destino** (ícono target) → activa modo destino.
En mobile ambos cierran el result sheet para dejar el mapa visible.

#### Chip de contexto (barra verde animada)
Muestra mensajes diferenciados al re-editar desde paso 3:
- `activePoint === "origin"` con destino existente → "Toca el mapa para mover tu **origen**. El destino se mantiene."
- `activePoint === "destination"` en paso 3 → "Toca el mapa para mover tu **destino**."

#### `hintMessage` — nuevo caso de re-edición de origen
Agrega: "Toca el mapa para mover tu origen. El destino se mantiene."

#### Botón reset (×)
Al resetear con GPS disponible, `activePoint` vuelve a `"destination"` (GPS ya cubre origen).
Sin GPS, vuelve a `"origin"`.

### Estado: completo

---

## [2026-05-04] Refactor: eliminar motor de rutas viejo — solo queda el nuevo

**Rama:** `experimental`
**Archivos modificados/eliminados:**
- `app/mapa/page.tsx` — refactor principal
- `lib/transfers.ts` — eliminada `computeTransferOptions` (legado)
- `lib/types.ts` — eliminado tipo `GroupedRouteData`
- `components/Map.tsx` — eliminado prop `groupedRoutes`
- `app/api/rutas/route.ts` — **eliminado** (endpoint viejo)
- `data/rutas-grouped.json` — **eliminado** (datos viejos)
- `data/rutas.json` — **eliminado** (no usado)
- `scripts/group-rutas.js`, `scripts/convert-rutas.js` — **eliminados**

### Qué cambió

#### Motor unificado en `rutas_produccion_final.json`

El feature flag `useNewRouting` (localStorage) y toda la rama `if/else` fueron eliminados.
La app siempre usa `/api/rutas-polyline` como única fuente de datos.

#### `app/mapa/page.tsx`

**Eliminados:**
- `getCoordinatesByDirection`, `getEffectiveDirection` (helpers de rutas agrupadas)
- `getClosestIndex` (helper del matcher viejo)
- `computeRouteOption`, `computeRouteSuggestions` (motor viejo)
- `buildTransferFromIndexes` (reconstrucción de transbordos desde URL con IDs viejos)
- Estado: `groupedRoutes`, `useNewRouting`
- Fetch de `/api/rutas`
- Memos: `fullRoutes`, `fullRoutesById`, `backgroundRoutes`
- Constantes: `PROXIMITY_METERS`, `DESTINATION_DISTANCE_WEIGHT`, `SEGMENT_LENGTH_FACTOR`

**Reemplazados:**
- `fullRoutes` → `listRoutes`: derivado de `polylineRoutes`, deduplicado por nombre, con `tieneIda`/`tieneVuelta` calculado.
- `backgroundRoutes` → `simplifiedMapRoutes`: aplica `simplifyBackgroundCoordinates` a `polylineRoutes`.
- `mapRoutes`: usa `simplifiedMapRoutes` + override de coordenadas del segmento seleccionado.
- `selectedRoute`: lookup en `polylineRoutes` por ID.
- `arrowSegments` Case 3: filtra `polylineRoutes` por nombre para mostrar ambas direcciones.
- `selectedRoutePinSegment` eliminado — el segmento viene siempre de `suggestions`.

#### Impacto en UI

- Lista de rutas (sidebar + bottom sheet): sin cambios visuales.
- Mapa: rutas simplificadas para el fondo, igual que antes.
- URLs compartidas con transbordos (`?tra=...&trb=...`): ya no se restauran automáticamente (IDs cambiaron). URLs de ruta por nombre (`?r=...`) siguen funcionando.

### Estado: completo

---

## [2026-05-04] Fix: OnboardingOverlay — eliminar "Paso X de 3"

**Rama:** `experimental`
**Archivos modificados:** `components/OnboardingOverlay.tsx`

### Qué cambió

El overlay de bienvenida mostraba "PASO 1 DE 3", "PASO 2 DE 3", "PASO 3 DE 3"
en lugar de etiquetas contextuales que reflejen el flujo GPS-first.

- Añadido campo `label` al tipo `Step`.
- Reescritos los tres pasos con nuevo contenido:
  - Paso 1: label `"ORIGEN"`, título "Tu ubicación, automática", ícono GPS crosshair.
  - Paso 2: label `"DESTINO"`, título "Selecciona tu destino".
  - Paso 3: label `"RESULTADO"`, título "Resultado inmediato".
- JSX actualizado: `{current.label}` reemplaza `Paso {step + 1} de {steps.length}`.

### Estado: completo

---

## [2026-05-04] UX: Origen automático por GPS — asistente inteligente

**Rama:** `experimental`
**Archivos modificados:** `app/mapa/page.tsx`

### Qué cambió

#### Auto-advance al paso de destino

Nuevo `useEffect` (línea ~564): cuando llega `userLocation` del GPS y el usuario
no ha marcado `manualOrigin` ni `destinationPoint`, el sistema avanza
automáticamente a `activePoint = "destination"`. Ya no se requiere que el usuario
toque el mapa para marcar el origen — el GPS lo hace solo.

```ts
useEffect(() => {
  if (userLocation && !manualOrigin && !destinationPoint) {
    setActivePoint("destination");
    setShowHint(true);
  }
}, [userLocation, manualOrigin, destinationPoint]);
```

#### Textos del `hintMessage` actualizados (flowStep 1)

| Antes | Después |
|---|---|
| "Toca el mapa para marcar tu origen." | "No pudimos obtener tu ubicación. Toca el mapa para marcar tu origen." (solo en error) |
| "Toca el mapa para ajustar tu origen." | "Usando tu ubicación actual. Toca el mapa para ajustar." (geoStatus ok) |
| (con destino) "Toca el mapa para ajustar tu origen." | "Destino: X. Usando tu ubicación actual como origen." |

#### Context action panel (chip verde animado) actualizado

| Estado | Texto anterior | Texto nuevo |
|---|---|---|
| geoStatus error | "Toca el mapa para marcar tu origen" | "No pudimos obtener tu ubicación. Toca el mapa para marcar tu origen" |
| geoStatus ok | "Toca el mapa para ajustar tu origen" | "Usando tu **ubicación actual**. Toca el mapa para ajustar." |
| flowStep 2 | "Ahora toca para marcar tu destino" | "Ahora toca para marcar tu **destino**" (sin cambio de lógica) |

### Lógica de origen (sin cambio)

```ts
const origin = manualOrigin ?? userLocation;  // ya existía, intacta
```

El pin manual sigue siendo override completo. Si el usuario toca el mapa en paso
1, `handleMapPick` guarda `manualOrigin` y el GPS ya no interfiere.

### Estado: completo

---

## [En progreso] Sistema de matching por polylines

**Rama:** `experimental`
**Objetivo:** Reemplazar la lógica de matching de rutas por un sistema basado en
proximidad geográfica real a segmentos, sin depender de paradas fijas.

---

### Qué cambió

#### Archivo nuevo: `lib/routeMatcher.ts`

Módulo independiente que implementa el nuevo motor de matching.
No modifica ninguna función existente.

**Funciones exportadas:**

| Función | Entrada | Salida | Descripción |
|---|---|---|---|
| `getDistancePointToSegmentM(p, a, b)` | 3 coordenadas `[lng, lat]` | metros (number) | Distancia perpendicular de un punto a un segmento. Usa proyección equirrectangular centrada en la latitud media. |
| `getClosestPointOnPath(point, path)` | punto + array de coordenadas | `{ distM, segmentIndex }` | Recorre todos los segmentos y devuelve el más cercano. |
| `isRouteValid(origin, dest, route)` | 2 coords + PolylineRoute | `false` o `{ originSeg, destSeg }` | Valida: origen en corredor, destino en corredor, destino después del origen en la ruta. |
| `findBestRoutes(origin, dest, routes)` | 2 coords + array de rutas | `PolylineRouteMatch[]` (máx 3) | Filtra rutas válidas, deduplica por `id` conservando mejor score, ordena por score ascendente. |

**Tipos exportados:** `PolylineRoute`, `ClosestOnPath`, `PolylineRouteMatch`

**Score:** `originDistM + destDistM` (metros totales de caminata a la ruta — menor es mejor)

**Diferencia clave con el sistema anterior:**
El sistema anterior (`getClosestIndex` en `page.tsx`) mide la distancia
Haversine al **vértice** más cercano del path. El nuevo mide la distancia
perpendicular al **segmento** más cercano, lo que es más preciso cuando
el usuario está entre dos puntos del trazado.

---

#### Archivo nuevo: `lib/__tests__/routeMatcher.test.ts`

18 casos de prueba sobre un path sintético en forma de L.
Ejecutar con:

```bash
npx tsx lib/__tests__/routeMatcher.test.ts
```

Cubre: distancia a segmento, identificación de segmento, viaje válido,
viaje en dirección incorrecta, origen fuera del corredor, destino fuera
del corredor, deduplicación por routeId, cero rutas válidas.

---

#### Modificado: `app/mapa/page.tsx`

Tres cambios quirúrgicos — el sistema original no se tocó:

1. **Import** (línea 23):
   ```ts
   import { findBestRoutes, type PolylineRoute } from "@/lib/routeMatcher";
   ```

2. **Estado** (junto a otros estados del componente):
   ```ts
   const [useNewRouting, setUseNewRouting] = useState(false);
   // Inicializado desde localStorage en un useEffect de una sola ejecución
   ```

3. **Condicional en el callback de cálculo de sugerencias**:
   ```ts
   const nextSuggestions = useNewRouting
     ? findBestRoutes(origin, dest, polylineRoutes).map(toRouteOption)
     : computeRouteSuggestions(fullRoutes, groupedRoutes, origin, dest);
   ```

La función `computeRouteSuggestions` original sigue intacta y es el
camino por defecto.

---

### Cómo activar el nuevo sistema (en el navegador)

```js
// Activar
localStorage.setItem("useNewRouting", "true")
location.reload()

// Desactivar (vuelve al sistema original)
localStorage.removeItem("useNewRouting")
location.reload()
```

---

### Estado actual

- [x] Módulo `routeMatcher.ts` implementado
- [x] 36/36 tests pasando
- [x] TypeScript compila sin errores (`tsc --noEmit`)
- [x] Integración en `page.tsx` con feature flag
- [x] Score mejorado con factor de longitud de ruta
- [x] `getRankedRoutes` implementado
- [x] `lib/routeIntersections.ts` creado (base para transbordos)
- [x] UI con badges MEJOR / ALTERNATIVA
- [ ] Prueba manual en el navegador comparando resultados
- [ ] Activar por defecto cuando se valide en producción

---

### Mejoras aplicadas — 2026-05-04

#### `lib/routeMatcher.ts`

**`getRouteLength(path)`** — nueva función exportada.
Suma distancias haversine entre puntos consecutivos del path, devuelve metros.
Usada internamente por `findBestRoutes` para calcular la longitud real del segmento activo.

**Score actualizado:**
```
score = originDistM + destDistM + routeLengthM * 0.01
```
El factor `0.01` penaliza rutas muy largas cuando el usuario está igualmente
cerca de varias. Reproduce la misma lógica que ya tenía el motor viejo
(`SEGMENT_LENGTH_FACTOR = 0.01` en `page.tsx`).

**`routeLengthM`** — nuevo campo en `PolylineRouteMatch`.
Expone la longitud calculada del segmento para uso en UI o debugging.

**`RankedRoutes`** — nuevo tipo exportado:
```ts
{ best: PolylineRouteMatch; alternatives: PolylineRouteMatch[] }
```

**`getRankedRoutes(matches)`** — nuevo wrapper exportado.
Recibe el output de `findBestRoutes` y devuelve `{ best, alternatives }` o `null`.
No modifica `findBestRoutes` — compatible hacia atrás.

---

#### `lib/routeIntersections.ts` — archivo nuevo

Función `getRouteIntersections(routeA, routeB, thresholdM = 100)`.
Detecta puntos donde dos rutas están a menos de `thresholdM` metros entre sí.
Devuelve `RouteIntersectionPoint[]` ordenado por distancia ascendente.
**No integrado en UI todavía** — base para la UI de transbordos futura.

---

#### `app/mapa/page.tsx`

- Import actualizado: agrega `getRankedRoutes`.
- Nuevo estado `alternativeSuggestedRouteIds: number[]`.
- Bloque `useNewRouting` refactorizado:
  usa `getRankedRoutes` para separar `best` de `alternatives`,
  pasa best primero en `setSuggestions`, popula `alternativeSuggestedRouteIds`.
- Ambas instancias de `<RouteList>` reciben `alternativeSuggestedRouteIds`.

---

#### `components/RouteList.tsx`

- Nueva prop opcional: `alternativeSuggestedRouteIds?: number[]`.
- Nuevo `useMemo`: `alternativeSuggestedSet` (Set para lookup O(1)).
- Nueva variable por item: `isAlternativeSuggestion`.
- Nuevo badge amarillo `ALTERNATIVA` para rutas alternativas.
  Solo aparece cuando `useNewRouting` está activo y existen alternativas.

---

#### `lib/__tests__/routeMatcher.test.ts`

18 tests existentes sin cambios + 18 tests nuevos:
- `getRouteLength`: longitud de segmento, punto único, ruta completa.
- Score correcto con `routeLengthM * 0.01`.
- `getRankedRoutes`: input vacío → null, un match → best sin alternativas,
  dos matches → best y una alternativa, orden best.score ≤ alternative.score.
- Lógica de labels UI: best no en alternatives, first = best.
- Corredor dinámico: corredor estrecho (10 m) rechaza punto a 111 m,
  corredor amplio (300 m) acepta el mismo punto.

---

### Fuente de datos — 2026-05-04

#### Separación de fuentes de datos por sistema

El nuevo motor usa **`rutas_produccion_final.json`** como fuente maestra,
servida por el nuevo endpoint `/api/rutas-polyline`.
El sistema original sigue usando `rutas-grouped.json` via `/api/rutas`.
Ambos coexisten sin interferencia.

**Por qué:** `rutas_produccion_final.json` contiene `corridor_width_m` por
ruta y el campo `landmarks` para futura precisión por feedback de usuarios.
`rutas-grouped.json` es un derivado sin esos campos.

---

#### `app/api/rutas-polyline/route.ts` — archivo nuevo

Endpoint GET que sirve `rutas_produccion_final.json` tipado como `ProductionRoute[]`.
Misma política de caché que `/api/rutas` (`max-age=3600`, `s-maxage=86400`).

---

#### `lib/types.ts`

Dos tipos nuevos exportados:

```ts
type ProductionRouteLandmark = { name: string; point: Coordinates }

type ProductionRoute = {
  id: number;
  name: string;
  original_name: string;  // contiene "(Ida)" / "(Vuelta)" para detectar dirección
  color: string;
  corridor_width_m: number;
  verified: boolean;
  path: Coordinates[];
  landmarks: ProductionRouteLandmark[];
}
```

---

#### `app/mapa/page.tsx`

- Import agregado: `ProductionRoute`.
- Nuevo estado: `polylineRoutes: ProductionRoute[]`.
- Nuevo `useEffect`: hace fetch de `/api/rutas-polyline` una sola vez
  cuando `useNewRouting` se activa. No recarga si `polylineRoutes` ya tiene datos.
- Bloque `useNewRouting` actualizado: usa `polylineRoutes` (fuente maestra)
  en lugar de convertir `fullRoutes`. La dirección se infiere de `original_name`.
- Dependencia `polylineRoutes` agregada al array del `useEffect` de sugerencias.

---

### UX: Origen automático — 2026-05-04

**Objetivo:** El usuario ya no necesita tocar el mapa para establecer su origen.
La ubicación del dispositivo se usa automáticamente; el pin en el mapa queda
como override opcional.

---

#### `app/mapa/page.tsx`

**Estados nuevos:**
```ts
userLocation: Coordinates | null   // GPS del dispositivo
manualOrigin: Coordinates | null   // tap manual en el mapa (override)
geoStatus: "idle" | "locating" | "ok" | "error"
```

**Flujo de origen:**
```ts
const origin = manualOrigin ?? userLocation;
// Sincronizado vía useEffect → setOriginPoint(origin)
```
Cuando `userLocation` llega, `originPoint` se actualiza y `flowStep`
avanza a 2 automáticamente sin interacción del usuario.

**`useEffect` de geolocalización:**
- Se ejecuta una sola vez al montar.
- `enableHighAccuracy: true`, timeout 8 s, `maximumAge` 60 s.
- En error: `geoStatus = "error"` → fallback a modo manual.

**`handleMapPick` actualizado:**
- Taps de origen ahora setean `manualOrigin` (no `originPoint` directamente).
- `originPoint` siempre viene del `useEffect` de sincronización.

---

**Textos reemplazados:**

| Antes | Después |
|---|---|
| `"Paso 1 de 3: toca el mapa para marcar tu origen."` | `"Toca el mapa para ajustar tu origen."` / `"Obteniendo tu ubicación..."` |
| `"Paso 2 de 3: ahora marca tu destino."` | `"Ahora toca el mapa para marcar tu destino."` |
| `"Paso 3 de 3: revisa la mejor opcion y toca Ver ruta."` | `"Ruta encontrada. Revisa las opciones y toca Ver ruta."` |
| `"Primero toca el mapa para marcar tu origen."` | `"Toca el mapa para marcar tu origen."` (solo en fallback GPS error) |
| `"Ahora marca en el mapa la zona de X."` | `"Ahora toca la zona de X como destino."` |
| `"A marcado"` (botón) | `"Origen ajustado"` / `"Mi ubicación"` |
| `"B marcado"` (botón) | `"Destino marcado"` |
| `"Marca tu origen y luego toca esa zona"` | `"Usando tu ubicación actual. Toca la zona de destino."` |
| `aria-label="Toca para marcar punto de origen"` | `"Usando tu ubicación actual, toca para ajustar"` / `"Origen ajustado manualmente, toca para cambiar"` |
| `aria-label="Punto B marcado, toca para cambiar"` | `"Destino marcado, toca para cambiar"` |

**Context action (paso 1, inline):**
- GPS locating → `"Obteniendo tu ubicación..."`
- GPS error → `"Toca el mapa para marcar tu origen"`
- GPS ok → `"Toca el mapa para ajustar tu origen"`

---

**Corrección: GPS drift — 2026-05-04**

`getCurrentPosition` reemplazado por `watchPosition`.
Si una lectura posterior difiere >50 m de la primera lectura aceptada:
- `geoAccuracyWarn = true`
- El origen **no** se mueve silenciosamente
- Botón A muestra `"GPS impreciso"` con punto naranja
- Hint: `"Tu GPS varía mucho. Toca el mapa para fijar tu origen manualmente."`
- Al tocar el mapa → `manualOrigin` se setea → advertencia desaparece

Si el drift es ≤50 m (refinamiento normal del GPS), se ignora silenciosamente.

**Corrección: GPS segunda visita — 2026-05-04**

`maximumAge` cambiado de `30_000` → `0`.
Con 30 s, el navegador podía servir el fix en caché sin re-disparar el callback
en revisitas dentro de la misma sesión, dejando `userLocation` sin actualizar.
Con `maximumAge: 0` siempre pide un fix fresco al hardware.

**Corrección: "Ver en mapa" no pintaba el segmento — 2026-05-04**

Causa: los IDs de `rutas_produccion_final.json` (1, 2, 3, 5...) no
corresponden a los IDs generados por `fullRoutes` (`index + 1` desde
`rutas-grouped.json`). `setSelectedRouteId(bestSuggestion.routeId)` no
encontraba la ruta en `fullRoutesById` → `selectedRoute = null` →
`selectedMapSegment = null` → sin pintura.

Solución: cuando `useNewRouting` está activo, el botón "Ver en mapa" ya no
usa `selectedRouteId`. En cambio:
- Setea `sharedRouteSegment` con el segmento exacto calculado por `findBestRoutes`
- Setea `sharedSegmentColor` con el color de la ruta (`routeColor` de `PolylineRouteMatch`)
- `arrowSegments` tiene un nuevo case 2a que detecta este modo y dibuja con `showLine: true`

Cambios de tipos:
- `RouteOption` tiene nuevo campo opcional `routeColor?: string`
- `toOption()` mapea `m.routeColor` al campo
- `sharedSegmentColor: string | null` nuevo estado

**Pendiente de testing manual:**
- Verificar que con GPS disponible, el flowStep salta a 2 automáticamente.
- Verificar fallback cuando el usuario niega permiso.
- Verificar que tap en mapa → `"Origen ajustado"` aparece en el botón A.
- Verificar advertencia de drift en zona con señal débil.
- Verificar que "Ver en mapa" pinta el segmento correcto con el color de la ruta.

---

### Pendientes / decisiones abiertas

**1. Llenar `corridor_width_m` por ruta**
Todas las rutas en `rutas_produccion_final.json` tienen `150` actualmente.
Cuando se validen corredores reales (p.ej. avenidas anchas → 200 m, calles
angostas → 80 m), el motor los usará automáticamente sin más cambios de código.

**2. Llenar `landmarks` por ruta**
El campo existe pero está vacío. Agregar puntos de referencia (colonias,
cruces, paradas conocidas) permitirá mejorar la precisión del matching
y dar retroalimentación textual al usuario.

**3. ~~Transfers con el nuevo sistema~~** — RESUELTO (ver entrada 2026-05-04 abajo)

**4. `getRouteIntersections` en UI**
Base lista en `lib/routeIntersections.ts`. El siguiente paso sería mostrar
puntos de transbordo sugeridos en el mapa.

---

## [2026-05-04] Fix: transbordos sin sentido eliminados

**Rama:** `experimental`
**Archivos modificados:** `lib/transfers.ts`

### Problema

El motor sugería transbordos absurdos como "Ruta 26 → Ruta 25" con solo 4 m
de caminata y una ruta combinada que daba una vuelta innecesaria por la ciudad.
Tres causas raíz:

1. **Sin mínimo en segmento B** — `MIN_SEG_A_METERS = 200` existía pero no
   había un filtro equivalente para la segunda ruta. Segmento B podía ser trivial.
2. **Sin ratio de desvío máximo** — `lenA + lenB` podía ser el doble o más de
   la distancia directa A→B, produciendo rutas de "transbordo" más largas que
   la alternativa directa.
3. **Sin umbral mínimo de viaje** — para distancias A→B < 400 m, sugerir un
   transbordo nunca tiene sentido (caminar es siempre mejor).

### Constantes nuevas

```ts
const MIN_SEG_B_METERS = 200;   // segmento B debe ser ≥ 200 m (simétrico a MIN_SEG_A)
const MAX_DETOUR_RATIO  = 2.0;  // lenA + lenB ≤ 2× distancia directa A→B
const MIN_TRIP_METERS   = 400;  // viajes < 400 m en línea recta → no sugerir transbordo
```

### Guardas agregadas (ambas funciones)

```ts
// Al inicio de la función:
if (originToDestDist < MIN_TRIP_METERS) return [];

// En el loop, después de calcular lenA y lenB:
if (lenB < MIN_SEG_B_METERS) continue;
if (lenA + lenB > originToDestDist * MAX_DETOUR_RATIO) continue;
```

Aplicado en `computeTransferOptions` y `computeTransferOptionsFromPolylines`.

### Resultado esperado

- Viajes cortos (<400 m): sin transbordos sugeridos
- Transbordos con segmento B trivial: descartados
- Rutas que dan vuelta innecesaria: descartadas por exceder 2× la distancia directa

### Estado
- [x] TypeScript compila sin errores
- [ ] Verificar en campo con el caso "Ruta 26 → Ruta 25" que ya no aparece
- [ ] Ajustar `MAX_DETOUR_RATIO` si casos legítimos quedan descartados

---

## [2026-05-04] Fix: botones A/B — layout y truncado

**Rama:** `experimental`
**Archivos modificados:** `app/mapa/page.tsx`

### Problema

Los botones de origen y destino en la pill bar usaban `justify-center` pero
sin `min-w-0` en el botón ni en el `<span>` interior. Esto causaba que:

1. `truncate` no tenía efecto porque el flex item no tenía ancho acotado.
2. El icono de check (✓) quedaba pegado al texto en vez de al borde derecho,
   rompiendo la simetría entre los dos botones.
3. Con texto largo ("Destino marcado") el contenido se apretaba visualmente.

### Cambios

- `justify-center` eliminado de ambos botones — el contenido ahora fluye
  alineado a la izquierda (icono · texto · check).
- `min-w-0` agregado al `<button>` para que `flex-1` permita truncado real.
- `<span>` del texto cambiado a `flex-1 min-w-0 truncate` para ocupar el
  espacio disponible y truncar cuando el botón es angosto.
- `ml-auto` en el SVG de check (✓) y en el dot de GPS impreciso — los ancla
  al borde derecho del botón en ambos estados.

### Resultado visual

```
[ 📍 Mi ubicación          ✓ ] → [ ⊙ Destino marcado        ✓ ]
```

Icono a la izquierda · texto que se estira · checkmark anclado a la derecha.

---

## [2026-05-04] UX: Flujo tipo asistente inteligente

**Rama:** `experimental`
**Archivos modificados:** `app/mapa/page.tsx`

### Objetivo
Convertir la app a un flujo sin pasos explícitos: origen automático por GPS,
destino como acción principal, resultado inmediato sin botón intermedio.

### Cambios

#### 1. Eliminación de "Paso X de 3" (aria-labels)

Los textos `"Paso X de 3 para encontrar tu ruta"` y `"Paso X de 3"` estaban
en dos `aria-label` (desktop sidebar y mobile header). Reemplazados por
`"Progreso del viaje"`. Los indicadores visuales (barra de progreso, dots)
se mantienen sin cambio.

#### 2. Auto-apertura del result sheet (mobile) — CORE UX

Nuevo `useEffect`:
```ts
useEffect(() => {
  if (flowStep === 3 && !isCalculatingSuggestions) {
    setIsResultSheetOpen(true);
  }
}, [flowStep, isCalculatingSuggestions]);
```
Cuando el usuario marca el destino y el cálculo termina, el bottom sheet de
resultados se abre automáticamente en mobile — sin necesidad de tocar el FAB.
Si el usuario lo cierra manualmente, no vuelve a abrirse hasta la próxima
búsqueda (el efecto solo re-dispara si `isCalculatingSuggestions` cambia).

#### 3. `hintMessage` actualizado (flowStep 2 y 3)

| Antes | Después |
|---|---|
| `"Ahora toca el mapa para marcar tu destino."` | `"Selecciona tu destino en el mapa."` |
| `"Ahora toca la zona de X como destino."` | `"Toca la zona de X como destino."` |
| `"Ruta encontrada. Revisa las opciones y toca Ver ruta."` | `"[Ruta X] es la mejor opción."` |
| `"Buscando la mejor ruta para tu viaje..."` | `"Buscando la mejor ruta..."` |
| `"No encontramos ruta directa. Ajusta origen o destino e intenta de nuevo."` | `"No encontramos ruta directa. Ajusta origen o destino."` |
| (no existía) | `"No hay ruta directa. Hay opciones con transbordo."` |

#### 4. Context action panel (paso 2)

```
Antes:  "Ahora toca para marcar tu destino"
Después: "Selecciona tu destino en el mapa"
```

#### 5. `routeTextSummary` — texto de indicaciones

```
Antes:
  "Toma Ruta X."
  "Tiempo estimado: N minutos."
  "Camina ~A m al punto de abordaje y ~B m al destino final."

Después:
  "Sube a Ruta X cerca de tu ubicación (~A m a pie)."
  "Baja cerca de tu destino (~B m a pie)."
  "Tiempo estimado en ruta: N min."
```

### Estado
- [x] TypeScript compila sin errores
- [x] Result sheet auto-abre en mobile al llegar resultados
- [x] Textos "Paso X de 3" eliminados de aria-labels
- [x] Indicaciones en modo "sube / baja" en vez de "toma"
- [ ] Verificar en mobile que el sheet se abre automáticamente al marcar destino
- [ ] Verificar que el hint muestra el nombre de la ruta en paso 3

---

## Historial de commits relevantes (rama experimental)

| Hash | Descripción |
|---|---|
| `946b799` | chore: add skills, api endpoint, route data, and updated components |
| `c8a8580` | fix: restore GPS origin after reset + smart auto-advance UX |
| `ae91aaa` | fix: intersection-based transfer engine + README update |
| `d4285ca` | fix: improve transfer suggestions coherence |
| `67c5de2` | docs: update README with Next.js 16, React 19, and current stack versions |
| `fa39f02` | fix: switch OG route from edge to nodejs runtime to bypass 1MB limit |
| `dc9d3ab` | fix: add missing ImageResponse import to OG route |

**Cambios sin commit (rama experimental — pendientes de staging):**
- Motor de transbordos migrado a `ProductionRoute` (`computeTransferOptionsFromPolylines`)
- Guardas anti-transbordo absurdo: `MIN_SEG_B`, `MAX_DETOUR_RATIO`, `MIN_TRIP_METERS`
- Fix botones A/B: `min-w-0`, `flex-1`, `ml-auto` en checkmark
- UX flujo asistente: auto-open result sheet, hints actualizados, aria-labels sin "Paso X de 3"

---

## Arquitectura actual (referencia rápida)

```
app/
  mapa/page.tsx          — Componente principal. Contiene computeRouteOption,
                           computeRouteSuggestions, lógica de UI y estado.
  api/
    rutas/route.ts          — Sirve rutas-grouped.json (sistema original).
    rutas-polyline/route.ts — Sirve rutas_produccion_final.json (motor nuevo).
    chat/route.ts           — Asistente IA con contexto de rutas.

lib/
  routeMatcher.ts        — Motor de matching por polylines (findBestRoutes, getRankedRoutes).
  routeIntersections.ts  — NUEVO. Base para detección de puntos de transbordo.
  transfers.ts           — Motor de transbordos. Funciones: computeTransferOptions (legacy),
                           computeTransferOptionsFromPolylines (nuevo motor).
                           Guardas activas: MIN_SEG_A/B=200m, MAX_DETOUR=2×, MIN_TRIP=400m.
  geo.ts                 — haversineMeters.
  types.ts               — Coordinates, RouteData, GroupedRouteData, ResolvedRouteData,
                           ProductionRoute, ProductionRouteLandmark.
  route-names.ts         — Aliases y destinos de rutas para búsqueda fuzzy.
  map-debug.ts           — Debug mode via localStorage.

data/
  rutas_produccion_final.json  — Fuente maestra del motor nuevo. Tiene path, corridor_width_m,
                                  landmarks (vacíos por ahora), original_name con dirección.
  rutas-grouped.json           — Derivado. Usado por el sistema original (ida/vuelta agrupados).

components/
  Map.tsx                — Mapa Mapbox GL, recibe segmentos y los renderiza.
  RouteList.tsx          — Búsqueda fuzzy con Fuse.js.
  BottomSheet.tsx        — Panel de resultados en mobile.
```

**Stack:** Next.js 16 · React 19 · TypeScript 5.5 · Mapbox GL 3 · Tailwind 3 · Fuse.js 7

**Formato de coordenadas en todo el proyecto:** `[longitude, latitude]` (GeoJSON, NO lat/lng)

**Feature flags disponibles en localStorage:**
- `debug` = `"true"` → modo debug del mapa
- `useNewRouting` = `"true"` → nuevo motor de matching + motor de transbordos por polylines

---

## [2026-05-04] Motor de transbordos migrado a nueva estructura de datos

**Rama:** `experimental`
**Archivos modificados:** `lib/transfers.ts`, `app/mapa/page.tsx`

### Problema

Cuando `useNewRouting = true`, el motor de rutas directas ya usaba
`rutas_produccion_final.json` vía `findBestRoutes`. Sin embargo, cuando no
se encontraba ruta directa y se activaba el motor de transbordos, este
seguía usando la estructura antigua (`ResolvedRouteData` / `rutas-grouped.json`),
creando una inconsistencia entre fuentes de datos.

### Cambios

#### `lib/transfers.ts`

**Nueva función exportada: `computeTransferOptionsFromPolylines`**

```ts
export function computeTransferOptionsFromPolylines(
  routes: PolylineRoute[],
  origin: Coordinates,
  destination: Coordinates
): TransferOption[]
```

Mismo algoritmo que `computeTransferOptions` (pre-filtro, progreso geográfico,
pre-rechazo lat/lng, penalidad no lineal, top-5) pero adaptado a la nueva
estructura:

| Campo | Antes (`ResolvedRouteData`) | Ahora (`PolylineRoute`) |
|---|---|---|
| Coordenadas | `route.coordenadas` | `route.path` |
| Nombre | `route.nombre` | `route.name` |
| Threshold de proximidad | `PROXIMITY_METERS = 550` (fijo) | `route.corridor_width_m` (por ruta) |
| Clave de deduplicación | `routeAId-routeBId` | `routeAName\|routeBName` |

La deduplicación cambia a nombre porque en `rutas_produccion_final.json` ida y
vuelta del mismo recorrido comparten el mismo `name` pero tienen IDs distintos.
Deduplicar por ID hubiera permitido mostrar `"Ruta 1 → Ruta 2"` dos veces
(una por dirección).

**Import agregado:** `PolylineRoute` desde `@/lib/routeMatcher`.

`computeTransferOptions` original: **sin cambios** — sigue siendo el path por defecto.

---

#### `app/mapa/page.tsx`

**Import actualizado:**
```ts
import { computeTransferOptions, computeTransferOptionsFromPolylines } from "@/lib/transfers";
```

**Bloque de transbordos bifurcado:**

```ts
if (nextSuggestions.length === 0) {
  if (useNewRouting && polylineRoutes.length > 0) {
    // rutas_produccion_final.json ya incluye ambas direcciones como entradas separadas
    nextTransfers = computeTransferOptionsFromPolylines(
      polylineRoutes.map((r) => ({
        id: r.id, name: r.name, color: r.color,
        corridor_width_m: r.corridor_width_m, path: r.path,
        direccion: r.original_name.includes("Vuelta") ? "vuelta" : "ida",
      })),
      originPoint, destinationPoint
    );
  } else {
    // Path original: expande ambas direcciones desde groupedRoutes
    const bothDirs: ResolvedRouteData[] = [...];
    nextTransfers = computeTransferOptions(bothDirs, originPoint, destinationPoint);
  }
}
```

No hay expansión manual de direcciones opuestas en el nuevo path porque
`rutas_produccion_final.json` ya incluye entradas distintas para ida y vuelta.

### Estado

- [x] TypeScript compila sin errores (`tsc --noEmit`)
- [x] `computeTransferOptionsFromPolylines` implementada y exportada
- [x] Bifurcación en `page.tsx` según `useNewRouting`
- [ ] Prueba manual comparando resultados de transbordos entre sistemas

### Pendiente actualizado

- **`corridor_width_m`**: Todas las rutas tienen `150` actualmente. Ajustar
  por ruta para afinar el pre-filtro de transbordos además del matching directo.

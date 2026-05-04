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

## Historial de commits relevantes (rama experimental)

| Hash | Descripción |
|---|---|
| `ae91aaa` | fix: intersection-based transfer engine + README update |
| `d4285ca` | fix: improve transfer suggestions coherence |
| `67c5de2` | docs: update README with Next.js 16, React 19, and current stack versions |
| `fa39f02` | fix: switch OG route from edge to nodejs runtime to bypass 1MB limit |
| `dc9d3ab` | fix: add missing ImageResponse import to OG route |

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
  transfers.ts           — Lógica de transbordos (computeTransferOptions).
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

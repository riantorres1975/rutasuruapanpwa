# 🚌 Rutas Uruapan

![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Mapbox](https://img.shields.io/badge/Mapbox_GL_JS-000000?style=for-the-badge&logo=mapbox&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)

**Aplicación web progresiva (PWA) mobile-first para visualizar y navegar las 40 rutas de transporte público de Uruapan, Michoacán — sin depender de APIs externas de enrutamiento.**

> 📸 **Screenshot**
>
> _Coloca aquí una captura de pantalla de la app en funcionamiento._
> _Recomendado: imagen de 1280×720 px o captura móvil. Puedes nombrarla `docs/screenshot.png` y referenciarla así:_
>
> ```md
> ![Rutas Uruapan en acción](docs/screenshot.png)
> ```

---

## El problema que resuelve

Los sistemas de transporte público en ciudades intermedias de México carecen de información digital accesible. Los pasajeros dependen del conocimiento informal para saber qué ruta tomar. **Rutas Uruapan** digitaliza las 40 rutas reales con coordenadas GPS y ofrece un motor de sugerencias A→B 100% local, sin consumir APIs de pago.

---

## ✨ Features principales

| Feature | Detalle técnico |
|---|---|
| 🗺️ Mapa interactivo | 40 rutas reales + Teleférico con coordenadas GPS en Mapbox GL JS |
| 🚡 Teleférico Integrado | Capa GeoJSON del nuevo sistema, tarjeta de información y sugerencias A→B |
| 📍 Geolocalización Inteligente | Filtra rutas a <400m del usuario, indicador de precisión y ranking de cercanía |
| 🚀 Onboarding | Overlay de bienvenida explicativo usando `localStorage` |
| 📲 Compartir Ruta | Integración con `navigator.share()` nativo y fallback al portapapeles |
| 🏷️ Nombres descriptivos | Cada ruta se identifica por su destino (ej. "Jucutacato · Ruta 24") en lista, mapa y link compartido; búsqueda por número o destino |
| 🔄 Ida / Vuelta | Cambio dinámico de dirección con re-render reactivo; botón de sugerencia rápida al no encontrar ruta directa |
| 🎯 Motor de sugerencias A→B | Algoritmo Haversine para matching local sin APIs externas |
| 🔀 Rutas con trasbordo | Sugerencias A→B con 1 cambio de camión; rutas secundarias atenuadas visualmente para foco en el trasbordo |
| 📐 Simplificación de trayectorias | Algoritmo Ramer-Douglas-Peucker (RDP) para reducir puntos en rutas de fondo |
| 🎬 Animación de trazado | Dibujo progresivo de rutas con `requestAnimationFrame` |
| 📍 Segmento relevante | Al seleccionar una sugerencia, se renderiza solo el segmento A→B |
| 🎯 Auto-encuadre de pines | La cámara ajusta el viewport automáticamente al marcar A o B |
| 🖱️ Cursor crosshair | El canvas del mapa muestra cursor de mira mientras se espera marcar A o B |
| ⚡ Lazy load de datos | El JSON de 314 KB se carga vía `fetch("/api/rutas")` fuera del bundle JS |
| 📴 PWA completa | Service Worker con caché offline, manifest, instalable en Android/iOS |
| 🎨 UX fluida | Sin recrear layers de Mapbox: solo se actualiza el GeoJSON source |
| ✨ HeroMap animado | Card de sugerencias rotatoria con fade suave y dots indicator; bearing rotatorio del mapa |

---

## 🧠 Algoritmos técnicos implementados

### Haversine — Distancia esférica sobre la Tierra

Calcula la distancia en metros entre dos coordenadas GPS considerando la curvatura terrestre. Se usa para encontrar el punto de la ruta más cercano al origen (A) y al destino (B) del usuario.

```
d = 2R · arctan2(√a, √(1−a))
a = sin²(Δlat/2) + cos(lat1)·cos(lat2)·sin²(Δlng/2)
```

### Ramer-Douglas-Peucker (RDP) — Simplificación de polilíneas

Reduce la cantidad de puntos de las rutas de fondo (aquellas no seleccionadas) sin perder la forma visual. Funciona recursivamente eliminando puntos cuya distancia perpendicular a la línea entre extremos sea menor que una tolerancia configurable (`BACKGROUND_SIMPLIFY_TOLERANCE = 0.00008`).

### Motor de sugerencias A→B

1. Para cada ruta y dirección, busca el índice más cercano a A y a B usando Haversine.
2. Descarta rutas donde A o B estén a más de 550 m de la ruta.
3. Descarta rutas donde el índice de A sea posterior al de B (dirección incorrecta).
4. Calcula un **score** = `distanciaA + distanciaB + longitudSegmento × 0.04`.
5. Devuelve las 3 mejores opciones ordenadas por score.

### requestAnimationFrame — Animación de trazado

Al seleccionar una ruta, los puntos se añaden uno a uno al GeoJSON source en cada frame de animación, creando el efecto de "dibujo progresivo" sin bloquear el hilo principal.

---

## 🛠 Stack tecnológico

| Tecnología | Versión | Rol |
|---|---|---|
| [Next.js](https://nextjs.org/) | 14 (App Router) | Framework React con SSR/RSC y API Routes |
| [TypeScript](https://www.typescriptlang.org/) | 5.x | Tipado estático en todo el codebase |
| [Tailwind CSS](https://tailwindcss.com/) | 3.x | Utilidades CSS, tema oscuro, responsivo |
| [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) | 3.x | Renderizado de mapas vectoriales y capas GeoJSON |
| Service Worker | nativo | Caché offline, instalación PWA |

---

## 🚀 Instalación y configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/riantorres1975/rutasuruapanpwa.git
cd rutasuruapanpwa
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoiTVVZX1RPS0VOX0FRVUkiLCJhIjoiZXhhbXBsZSJ9.XXXXXXXXXXXXXXXX
```

> **¿Cómo obtener el token de Mapbox?**
> 1. Crea una cuenta gratuita en [mapbox.com](https://account.mapbox.com/)
> 2. Ve a **Account → Tokens**
> 3. Copia el **Default public token** (empieza con `pk.`)
> 4. Pégalo en `.env.local` como `NEXT_PUBLIC_MAPBOX_TOKEN`
>
> El plan gratuito incluye 50,000 cargas de mapa al mes, más que suficiente para desarrollo y portafolio.

### 4. Iniciar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### 5. Scripts útiles

```bash
npm run build              # Build de producción
npm run lint               # Validación ESLint
npm run convert:rutas      # Convierte insumos raw → data/rutas.json
node scripts/group-rutas.js  # Genera data/rutas-grouped.json
```

---

## 📁 Estructura del proyecto

```
rutasuruapanpwa/
├── app/
│   ├── api/rutas/route.ts    # Endpoint GET /api/rutas (lazy load)
│   ├── layout.tsx            # Root layout, metadatos, fuentes
│   └── page.tsx              # Página principal — lógica central
├── components/
│   ├── BottomSheet.tsx       # Sheet deslizable con lista de rutas
│   ├── Map.tsx               # MapView con Mapbox GL JS
│   └── RouteList.tsx         # Lista filtrable de rutas
├── data/
│   ├── rutas.json            # Rutas normalizadas (formato plano)
│   └── rutas-grouped.json    # Rutas agrupadas ida/vuelta (314 KB)
├── lib/
│   ├── map.ts                # Utilidades de Mapbox (layers, sources)
│   └── types.ts              # Tipos TypeScript compartidos
├── public/
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service Worker
│   └── icons/                # Íconos PWA (192, 512, svg)
└── scripts/
    ├── convert-rutas.js      # Transformador de datos raw
    └── group-rutas.js        # Agrupador ida/vuelta
```

---

## 🏗 Decisiones técnicas

### ¿Por qué Next.js 14 con App Router?

El App Router permite colocar el endpoint `/api/rutas` en el mismo proyecto sin backend separado. Además, los **React Server Components** reducen el JS del cliente y `revalidate = 86400` en el API route garantiza que Vercel sirva el JSON desde su CDN edge — cero latencia para los usuarios.

### ¿Por qué Mapbox GL JS y no Leaflet o Google Maps?

Mapbox GL JS renderiza en WebGL, permitiendo 40 rutas simultáneas con animaciones fluidas a 60 fps en móviles de gama media. El modelo de capas GeoJSON separadas (una por ruta) permite actualizar solo el source de la ruta seleccionada sin re-renderizar el mapa completo.

### ¿Por qué el motor de sugerencias es local?

Las APIs de enrutamiento (Google Directions, HERE, etc.) tienen costos por request que escalan mal en una app de uso real. Dado que las rutas son fijas y conocidas, el algoritmo Haversine sobre las coordenadas locales es determinístico, instantáneo y gratuito — la búsqueda completa sobre 40 rutas tarda < 5 ms en un smartphone de gama baja.

### ¿Por qué RDP para simplificación de rutas de fondo?

Mostrar todas las rutas con su resolución completa (miles de puntos) degrada el FPS al arrastrar el mapa. RDP reduce los puntos manteniendo la forma visual percibida. Las rutas de fondo usan tolerancia `0.00008` (~8 m), la ruta seleccionada usa la resolución completa para la animación.

### ¿Por qué lazy load del JSON?

`rutas-grouped.json` pesa 314 KB. Importarlo directamente (`import ... from "@/data/..."`) lo incluye en el bundle JS inicial, bloqueando el **First Contentful Paint**. Cargarlo con `fetch("/api/rutas")` en un `useEffect` permite que el mapa vacío se muestre primero y los datos lleguen en background, mejorando el LCP y el puntaje de Lighthouse.

---

## 🗺 Roadmap

- [x] **Geolocalización y Rutas Cercanas** — usar la posición GPS del usuario como punto A e indicar rutas próximas
- [x] **Integración del Teleférico** — rutas, estaciones, tiempos y visualización rica
- [x] **Compartir ruta** — integración nativa y portapapeles
- [x] **Onboarding** — guía paso a paso para usuarios nuevos
- [x] **Rutas con trasbordo** — sugerencias A→B con máximo 1 cambio de camión y visualización diferenciada
- [x] **Auto-encuadre inteligente** — la cámara se ajusta al marcar A, B o al mostrar una ruta sugerida
- [x] **Búsqueda de paradas por nombre** — campo de texto con autocomplete fuzzy por colonia, destino o número
- [ ] **Horarios estimados** — basados en patrones históricos de la ciudad
- [x] **Modo nocturno adaptativo** — cambio automático según hora del día
- [ ] **Panel de accesibilidad** — contraste alto, texto grande, screen reader

---

## 👤 Autor

**Wh0am1**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/tu-usuario)
[![Portafolio](https://img.shields.io/badge/Portafolio-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://tu-portafolio.dev)

---

---

# 🚌 Rutas Uruapan — English

![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Mapbox](https://img.shields.io/badge/Mapbox_GL_JS-000000?style=for-the-badge&logo=mapbox&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)

**A mobile-first Progressive Web App (PWA) for visualizing and navigating the 40 public transit routes of Uruapan, Michoacán, Mexico — with no dependency on external routing APIs.**

> 📸 **Screenshot**
>
> _Place a screenshot of the running app here._
> _Recommended: 1280×720 px or a mobile capture. Name it `docs/screenshot.png` and reference it like this:_
>
> ```md
> ![Rutas Uruapan in action](docs/screenshot.png)
> ```

---

## The Problem It Solves

Public transit in mid-size Mexican cities lacks accessible digital information. Passengers rely on word-of-mouth to know which bus to take. **Rutas Uruapan** digitizes all 40 real routes with GPS coordinates and provides an A→B suggestion engine that runs 100% locally — no paid routing API required.

---

## ✨ Key Features

| Feature | Technical Detail |
|---|---|
| 🗺️ Interactive map | 40 real GPS routes + new Cable Car rendered with Mapbox GL JS |
| 🚡 Teleférico Integration | GeoJSON layer for the Cable Car, rich info card, and A→B suggestions |
| 📍 Smart Geolocation | Filters routes <400m from user, accuracy indicator, and proximity ranking |
| 🚀 Onboarding Flow | Step-by-step explanatory overlay using `localStorage` |
| 📲 Share Routing | Native integration via `navigator.share()` with clipboard fallback |
| 🏷️ Descriptive names | Each route is identified by its destination (e.g. "Jucutacato · Ruta 24") in list, map, and shared link; search works by number or destination |
| 🔄 Outbound / Return | Dynamic direction toggle with reactive re-render; quick-flip button when no direct route found |
| 🎯 A→B Suggestion Engine | Haversine-based local matching, no external APIs |
| 🔀 Transfer routes | A→B suggestions with 1 bus change; secondary routes visually dimmed to focus on transfer |
| 📐 Path simplification | Ramer-Douglas-Peucker (RDP) algorithm for background route decimation |
| 🎬 Route animation | Progressive drawing with `requestAnimationFrame` |
| 📍 Relevant segment | When a suggestion is selected, only the A→B segment is rendered |
| 🎯 Pin auto-framing | Camera adjusts viewport automatically when A or B is placed |
| 🖱️ Crosshair cursor | Map canvas shows crosshair cursor while waiting for A or B placement |
| ⚡ Lazy data load | 314 KB JSON fetched via `fetch("/api/rutas")` outside the JS bundle |
| 📴 Full PWA | Service Worker with offline cache, manifest, installable on Android/iOS |
| 🎨 Smooth UX | No Mapbox layer recreation: only the GeoJSON source is updated |
| ✨ Animated HeroMap | Rotating suggestion card with smooth fade and dots indicator; slow bearing rotation |

---

## 🧠 Technical Algorithms

### Haversine — Spherical Distance on Earth

Calculates the distance in meters between two GPS coordinates, accounting for Earth's curvature. Used to find the route point closest to the user's origin (A) and destination (B).

```
d = 2R · arctan2(√a, √(1−a))
a = sin²(Δlat/2) + cos(lat1)·cos(lat2)·sin²(Δlng/2)
```

### Ramer-Douglas-Peucker (RDP) — Polyline Simplification

Reduces the number of points in background routes (non-selected) without losing visual shape. Works recursively by removing points whose perpendicular distance to the line between endpoints is below a configurable tolerance (`BACKGROUND_SIMPLIFY_TOLERANCE = 0.00008`).

### A→B Suggestion Engine

1. For each route and direction, finds the closest index to A and B using Haversine.
2. Discards routes where A or B are more than 550 m from the route.
3. Discards routes where the A index comes after the B index (wrong direction).
4. Calculates a **score** = `distanceA + distanceB + segmentLength × 0.04`.
5. Returns the top 3 options sorted by score.

### requestAnimationFrame — Route Draw Animation

When a route is selected, points are added one by one to the GeoJSON source on each animation frame, creating a "progressive drawing" effect without blocking the main thread.

---

## 🛠 Tech Stack

| Technology | Version | Role |
|---|---|---|
| [Next.js](https://nextjs.org/) | 14 (App Router) | React framework with SSR/RSC and API Routes |
| [TypeScript](https://www.typescriptlang.org/) | 5.x | Static typing across the entire codebase |
| [Tailwind CSS](https://tailwindcss.com/) | 3.x | CSS utilities, dark mode, responsive layout |
| [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) | 3.x | Vector map rendering and GeoJSON layers |
| Service Worker | native | Offline cache, PWA installation |

---

## 🚀 Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/riantorres1975/rutasuruapanpwa.git
cd rutasuruapanpwa
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoiWU9VUl9UT0tFTl9IRVJFIiwiYSI6ImV4YW1wbGUifQ.XXXXXXXXXXXXXXXX
```

> **How to get your Mapbox token:**
> 1. Create a free account at [mapbox.com](https://account.mapbox.com/)
> 2. Go to **Account → Tokens**
> 3. Copy the **Default public token** (starts with `pk.`)
> 4. Paste it in `.env.local` as `NEXT_PUBLIC_MAPBOX_TOKEN`
>
> The free plan includes 50,000 map loads per month — more than enough for development and portfolio use.

### 4. Start in development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Useful scripts

```bash
npm run build              # Production build
npm run lint               # ESLint validation
npm run convert:rutas      # Convert raw inputs → data/rutas.json
node scripts/group-rutas.js  # Generate data/rutas-grouped.json
```

---

## 📁 Project Structure

```
rutasuruapanpwa/
├── app/
│   ├── api/rutas/route.ts    # GET /api/rutas endpoint (lazy load)
│   ├── layout.tsx            # Root layout, metadata, fonts
│   └── page.tsx              # Main page — core logic
├── components/
│   ├── BottomSheet.tsx       # Slide-up sheet with route list
│   ├── Map.tsx               # MapView with Mapbox GL JS
│   └── RouteList.tsx         # Filterable route list
├── data/
│   ├── rutas.json            # Normalized routes (flat format)
│   └── rutas-grouped.json    # Routes grouped by direction (314 KB)
├── lib/
│   ├── map.ts                # Mapbox utilities (layers, sources)
│   └── types.ts              # Shared TypeScript types
├── public/
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service Worker
│   └── icons/                # PWA icons (192, 512, svg)
└── scripts/
    ├── convert-rutas.js      # Raw data transformer
    └── group-rutas.js        # Outbound/return grouper
```

---

## 🏗 Technical Decisions

### Why Next.js 14 with App Router?

The App Router lets us place the `/api/rutas` endpoint within the same project — no separate backend. Additionally, **React Server Components** reduce client-side JS, and `revalidate = 86400` on the API route ensures Vercel serves the JSON from its edge CDN, delivering zero-latency responses to users.

### Why Mapbox GL JS instead of Leaflet or Google Maps?

Mapbox GL JS renders via WebGL, enabling 40 simultaneous routes with smooth 60 fps animations on mid-range smartphones. The GeoJSON layer-per-route model allows updating only the selected route's source without re-rendering the entire map.

### Why a local suggestion engine?

Routing APIs (Google Directions, HERE, etc.) have per-request costs that scale poorly for a real-use app. Since the routes are fixed and known, the Haversine algorithm over local coordinates is deterministic, instantaneous, and free — a full search across 40 routes takes less than 5 ms on a low-end smartphone.

### Why RDP for background route simplification?

Rendering all routes at full resolution (thousands of points) degrades FPS when panning the map. RDP reduces points while preserving visual shape. Background routes use a tolerance of `0.00008` (~8 m); the selected route uses full resolution for its draw animation.

### Why lazy-load the JSON?

`rutas-grouped.json` is 314 KB. Importing it directly (`import ... from "@/data/..."`) includes it in the initial JS bundle, blocking the **First Contentful Paint**. Loading it with `fetch("/api/rutas")` inside a `useEffect` lets the empty map render first while data arrives in the background, improving LCP and the Lighthouse score.

---

## 🗺 Roadmap

- [x] **Geolocation & Nearby Routes** — automatically use the user's GPS position and list nearby buses
- [x] **Cable Car Integration** — map overlay, station info, times, and rich presentation
- [x] **Share route** — native share sheet integration and clipboard support
- [x] **Onboarding** — guide for first-time users
- [x] **Transfer routes** — A→B suggestions with up to 1 bus change, with dimmed secondary-route styling
- [x] **Smart camera framing** — viewport auto-adjusts when A or B are placed, or when a suggested route is selected
- [x] **Stop search by name** — text field with fuzzy autocomplete by neighborhood, destination or route number
- [ ] **Estimated schedules** — based on historical city traffic patterns
- [x] **Adaptive dark mode** — automatic switch based on time of day
- [ ] **Accessibility panel** — high contrast, large text, screen reader support

---

## 👤 Author

**Wh0am1**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/your-username)
[![Portfolio](https://img.shields.io/badge/Portfolio-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://your-portfolio.dev)

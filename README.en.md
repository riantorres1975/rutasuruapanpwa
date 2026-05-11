# UruGo - Rutas Uruapan

<p align="right">
  <a href="./README.md"><img src="https://img.shields.io/badge/Espa%C3%B1ol-README-blue?style=for-the-badge" alt="Leer en español"></a>
</p>

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Mapbox](https://img.shields.io/badge/Mapbox_GL_JS-000000?style=for-the-badge&logo=mapbox&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)
![DeepSeek](https://img.shields.io/badge/DeepSeek_AI-4A90D9?style=for-the-badge&logo=openai&logoColor=white)

**A mobile-first Progressive Web App (PWA) for visualizing and navigating the 40 public transit routes of Uruapan, Michoacán, Mexico, with no dependency on external routing APIs.**

## Demos

### Landing Page

![UruGo landing page demo](./public/readme/demoLandipageUruGO.gif)

### Interactive Map

![UruGo interactive map demo](./public/readme/demoMapaUruGO.gif)

---

## The Problem It Solves

Public transit in mid-size Mexican cities lacks accessible digital information. Passengers rely on word-of-mouth to know which bus to take. **Rutas Uruapan** digitizes all 40 real routes with GPS coordinates and provides an A to B suggestion engine that runs 100% locally, no paid routing API required.

---

## Key Features

| Feature | Technical Detail |
|---|---|
| Interactive map | 40 real GPS routes + new Cable Car rendered with Mapbox GL JS |
| Teleférico Integration | GeoJSON layer for the Cable Car, rich info card, and A to B suggestions |
| Smart Geolocation | Filters routes <400m from user, accuracy indicator, and proximity ranking |
| Onboarding Flow | Step-by-step explanatory overlay using `localStorage` |
| Share Routing | Native integration via `navigator.share()` with clipboard fallback |
| Descriptive names | Each route is identified by its destination, e.g. "Jucutacato - Ruta 24", in list, map, and shared link; search works by number or destination |
| Landmarks & reference search | Directions show nearby landmarks, e.g. "Board near Central de Autobuses"; search suggests routes passing through a known landmark |
| Landing context | Landing CTAs and chips send `?destino=...`; the map shows contextual guidance for placing origin and destination |
| Outbound / Return | Dynamic direction toggle with reactive re-render; quick-flip button when no direct route found |
| A to B Suggestion Engine | Haversine-based local matching, no external APIs |
| Transfer routes | A to B suggestions with 1 bus change; real intersection detection between routes, same corner <=35 m; dashed walk line between alight and board points; secondary routes visually dimmed |
| Path simplification | Ramer-Douglas-Peucker (RDP) algorithm for background route decimation |
| Route animation | Progressive drawing with `requestAnimationFrame` |
| Relevant segment | When a suggestion is selected, only the A to B segment is rendered |
| Pin auto-framing | Camera adjusts viewport automatically when A or B is placed |
| Crosshair cursor | Map canvas shows crosshair cursor while waiting for A or B placement |
| Lazy data load | Master route JSON fetched via `fetch("/api/rutas-polyline")` outside the JS bundle |
| Full PWA | Service Worker with offline cache, manifest, installable on Android/iOS |
| Smooth UX | No Mapbox layer recreation: only the GeoJSON source is updated |
| Animated HeroMap | Rotating suggestion card with smooth fade and dots indicator; slow bearing rotation |
| Route editor (debug) | Visual tool to fix GPS trajectories: select segment, draw replacement, save to JSON |
| AI Assistant (UruGo Chat) | DeepSeek-powered chatbot answering natural-language questions about routes, schedules, and destinations in Uruapan |
| Anti-spam rate limiting | Max 10 messages per IP per 60 s on the chat endpoint; returns HTTP 429 with a readable message |
| Integrated error reporting | Flag button in the chat that opens a pre-filled email or GitHub Issue to report incorrect information |
| Baseline accessibility | Global `:focus-visible` states for keyboard navigation and accessible labels on core controls |
| Adaptive theme | Respects OS `prefers-color-scheme` as primary signal; time-of-day fallback for browsers without support |
| PWA update toast | "New version available" toast on SW update; user decides when to reload |

---

## Landing to Map Flow

The landing page opens the PWA at `/mapa`. Search CTAs and popular chips can pass a destination query param:

```txt
/mapa?destino=Parque%20Nacional
```

The map does not guess coordinates or automatic routes from free text. Instead, it displays the requested destination and guides the user to place their origin and then the destination area on the map. This keeps the A to B engine grounded in real coordinates.

---

## Visual Route Editor (debug mode)

A development tool for correcting GPS coordinates directly on the map, no manual JSON editing required.

### Activation

```js
// In the browser console (development only)
localStorage.setItem('debug', 'true')
// Reload the page
```

### Editing flow

1. **Select a route** in the sidebar. Numbered GPS points appear over the map.
2. **Click the start point** of the segment to fix. It is highlighted in red.
3. **Click the end point**. The full segment is marked in red.
4. Press **"Editar segmento"** then click on the map to draw the new path (green).
5. Press **"Finalizar"** then **"Aplicar"** to replace the segment.
6. Press **"Guardar"** to write the changes to `data/rutas_produccion_final.json`.

> The Save button is only available in `NODE_ENV=development`. Changes persist to disk and are reflected on the next page reload.

---

## Technical Algorithms

### Haversine - Spherical Distance on Earth

Calculates the distance in meters between two GPS coordinates, accounting for Earth's curvature. Used to find the route point closest to the user's origin (A) and destination (B).

```txt
d = 2R * arctan2(sqrt(a), sqrt(1-a))
a = sin^2(deltaLat/2) + cos(lat1) * cos(lat2) * sin^2(deltaLng/2)
```

### Ramer-Douglas-Peucker (RDP) - Polyline Simplification

Reduces the number of points in background routes (non-selected) without losing visual shape. Works recursively by removing points whose perpendicular distance to the line between endpoints is below a configurable tolerance (`BACKGROUND_SIMPLIFY_TOLERANCE = 0.00008`).

### A to B Suggestion Engine

1. For each route and direction, finds the closest index to A and B using Haversine.
2. Discards routes where A or B are more than 550 m from the route.
3. Discards routes where the A index comes after the B index (wrong direction).
4. Calculates a **score** = `distanceA + distanceB * 1.8 + segmentLength * 0.01`.
5. Returns the top 3 options sorted by score.

### Transfer Engine

When no direct route covers A to B, the transfer engine (`lib/transfers.ts`) activates:

1. **Pre-filter**: identifies routes covering the origin (<=550 m) and routes covering the destination (<=550 m).
2. **Geographic progress**: for each coordinate of route A, discards points whose distance to the destination exceeds 1.15x the origin-to-destination distance to prevent route A from heading in the wrong direction.
3. **Intersection detection**: for each valid route A point, scans route B coordinates (up to the destination index) using lat/lng pre-rejection before calling Haversine; only points within the 200 m window reach the expensive calculation.
4. **Same-corner threshold**: if the distance between the route A point and the nearest route B point is <=35 m, it qualifies as a real intersection (shared corner); walk penalty is near zero.
5. **Non-linear penalty**: distances >35 m are penalized 3x to strongly prefer corner transfers.
6. **Score** = `lengthSegA + penalty(walk) + lengthSegB`; returns top 5 deduplicated by route pair.

### requestAnimationFrame - Route Draw Animation

When a route is selected, points are added one by one to the GeoJSON source on each animation frame, creating a "progressive drawing" effect without blocking the main thread.

---

## Tech Stack

| Technology | Version | Role |
|---|---|---|
| [Next.js](https://nextjs.org/) | 16.2.4 (App Router + webpack) | React framework with SSR/RSC and API Routes |
| [React](https://react.dev/) | 19.2.5 | UI library with Server Components |
| [TypeScript](https://www.typescriptlang.org/) | 5.5.3 | Static typing across the entire codebase |
| [Tailwind CSS](https://tailwindcss.com/) | 3.4.6 | CSS utilities, dark mode, responsive layout |
| [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) | 3.12.0 | Vector map rendering and GeoJSON layers |
| Service Worker | native | Offline cache, PWA installation |
| [DeepSeek API](https://platform.deepseek.com/) | deepseek-chat | Language model powering the AI assistant |

---

## Installation & Setup

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
DEEPSEEK_API_KEY=sk-...
```

> **How to get your Mapbox token:**
> 1. Create a free account at [mapbox.com](https://account.mapbox.com/)
> 2. Go to **Account -> Tokens**
> 3. Copy the **Default public token** (starts with `pk.`)
> 4. Paste it in `.env.local` as `NEXT_PUBLIC_MAPBOX_TOKEN`
>
> The free plan includes 50,000 map loads per month, more than enough for development and portfolio use.

> **How to get your DeepSeek API key:**
> 1. Create an account at [platform.deepseek.com](https://platform.deepseek.com/)
> 2. Go to **API Keys** and generate a new key
> 3. Paste it in `.env.local` as `DEEPSEEK_API_KEY`
>
> The `deepseek-chat` model costs ~$0.014 USD per million input tokens. With rate limiting enabled, monthly costs for a real-use PWA are negligible.

### 4. Start in development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Useful scripts

```bash
npm run build                    # Production build (webpack)
npm run dev                      # Dev server with webpack
npm run lint                     # ESLint 9 validation
npx tsc --noEmit                 # Strict TypeScript validation
npm audit --audit-level=moderate # Dependency audit
```

---

## Security

| Measure | Detail |
|---|---|
| **CSP** | `script-src` without `unsafe-eval` in production; allowed in development for React Fast Refresh |
| **Rate limiting** | Max 10 messages per IP per 60 s on `/api/chat` (in-memory) |
| **Input validation** | `message` capped at 1000 chars; history limited to 20 entries of 2000 chars each |
| **IP detection** | Only trusted headers: `x-forwarded-for`, `x-real-ip`, `cf-connecting-ip` |
| **Debug endpoint** | `/api/debug/save-route` automatically returns 404 in `NODE_ENV=production` |
| **CDN cache** | `/api/rutas-polyline` uses `Cache-Control: public, max-age=3600` to serve from edge |
| **Secrets** | API keys live only in environment variables (local `.env` + Vercel env vars). Never in source code |

> **Note:** The rate limiter uses process memory. On Vercel serverless, each instance maintains its own counter. For robust abuse protection at scale, migrate to [Upstash Redis](https://upstash.com/) as a shared store.

---

## Project Structure

```txt
rutasuruapanpwa/
├── app/
│   ├── api/rutas-polyline/route.ts     # GET /api/rutas-polyline endpoint
│   ├── api/chat/route.ts               # POST /api/chat endpoint with rate limiting
│   ├── api/debug/save-route/route.ts  # POST endpoint for saving edits (dev only)
│   ├── robots.ts                       # robots.txt generated by App Router
│   ├── sitemap.ts                      # sitemap.xml generated by App Router
│   ├── layout.tsx                      # Root layout, metadata, fonts
│   ├── mapa/page.tsx                   # Interactive map and PWA flow
│   └── page.tsx                        # Landing page
├── components/
│   ├── BottomSheet.tsx       # Slide-up sheet with route list
│   ├── ChatBot.tsx           # Floating AI assistant
│   ├── Map.tsx               # MapView with Mapbox GL JS
│   ├── ReportBugForm.tsx     # Error report form
│   └── RouteList.tsx         # Filterable route list
├── data/
│   ├── rutas_produccion_final.json # Master route engine data
│   └── gtfs/                  # Auxiliary / experimental GTFS data
├── lib/
│   ├── geo.ts                # Haversine and geometric utilities
│   ├── map.ts                # Mapbox utilities (layers, sources)
│   ├── map-debug.ts          # Route editor utilities (replaceSegment)
│   ├── transfers.ts          # Transfer engine with intersection detection
│   └── types.ts              # Shared TypeScript types
├── public/
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service Worker
│   └── icons/                # PWA icons (192, 512, svg)
└── scripts/
    └── test-chatbot.mjs      # AI assistant test suite
```

---

## Technical Decisions

### SEO and PWA

The project uses Next.js App Router metadata, `app/sitemap.ts`, and `app/robots.ts` to avoid duplicate static SEO files. The manifest lives in `public/manifest.json`; the Service Worker lives in `public/sw.js` and is generated from `public/sw.template.js` during build to stamp a version identifier.

The Service Worker precaches the main shell and caches `/api/rutas-polyline` with stale-while-revalidate so the map can keep working after one successful online load.

### Why Next.js 16 with App Router?

The App Router lets us place the `/api/rutas-polyline` endpoint within the same project, no separate backend. Additionally, **React Server Components** reduce client-side JS, and `revalidate = 86400` on the API route ensures Vercel serves the JSON from its edge CDN, delivering zero-latency responses to users. The webpack-based build (`next dev --webpack`) provides full plugin compatibility and bundle optimization.

### Why Mapbox GL JS instead of Leaflet or Google Maps?

Mapbox GL JS renders via WebGL, enabling 40 simultaneous routes with smooth 60 fps animations on mid-range smartphones. The GeoJSON layer-per-route model allows updating only the selected route's source without re-rendering the entire map.

### Why a local suggestion engine?

Routing APIs (Google Directions, HERE, etc.) have per-request costs that scale poorly for a real-use app. Since the routes are fixed and known, the Haversine algorithm over local coordinates is deterministic, instantaneous, and free. A full search across 40 routes takes less than 5 ms on a low-end smartphone.

### Why RDP for background route simplification?

Rendering all routes at full resolution (thousands of points) degrades FPS when panning the map. RDP reduces points while preserving visual shape. Background routes use a tolerance of `0.00008` (~8 m); the selected route uses full resolution for its draw animation.

### Why lazy-load the JSON?

`rutas_produccion_final.json` is the master source for the A to B engine. Loading it with `fetch("/api/rutas-polyline")` inside a `useEffect` keeps route data out of the initial JS bundle, lets the map render first, and loads data in the background.

---

## Roadmap

- [x] **Geolocation & Nearby Routes**: automatically use the user's GPS position and list nearby buses
- [x] **Cable Car Integration**: map overlay, station info, times, and rich presentation
- [x] **Share route**: native share sheet integration and clipboard support
- [x] **Onboarding**: guide for first-time users
- [x] **Transfer routes**: A to B suggestions with up to 1 bus change, with dimmed secondary-route styling
- [x] **Smart camera framing**: viewport auto-adjusts when A or B are placed, or when a suggested route is selected
- [x] **AI Assistant**: DeepSeek-powered chatbot for natural-language route queries
- [x] **Rate limiting**: anti-spam protection on the chat endpoint
- [x] **In-chat error reporting**: flag button pre-filling email or GitHub Issue
- [ ] **Stop search by name**: text field with fuzzy autocomplete
- [ ] **Adaptive dark mode**: automatic switch based on time of day
- [ ] **Accessibility panel**: high contrast, large text, screen reader support

---

## Author

**Wh0am1**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/your-username)
[![Portfolio](https://img.shields.io/badge/Portfolio-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://your-portfolio.dev)

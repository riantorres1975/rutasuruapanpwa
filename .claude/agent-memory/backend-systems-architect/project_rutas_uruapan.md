---
name: Rutas Uruapan — Project Architecture
description: Core architecture, data flow, and backend surface of the rutas-uruapan PWA
type: project
---

This is a static-data PWA (no Supabase, no database, no auth). The entire backend surface is:

1. `app/api/rutas/route.ts` — single GET endpoint serving `data/rutas-grouped.json` (314 KB). Uses `revalidate = 86400` for Vercel ISR and `Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600`.
2. `public/sw.js` — Service Worker with stale-while-revalidate for `/api/rutas` and cache-first for static assets.
3. `scripts/convert-rutas.js` + `scripts/group-rutas.js` — local build-time data pipeline. Input: `Rutas/` GeoJSON files. Output: `data/rutas.json` → `data/rutas-grouped.json`.

All algorithms (Haversine, RDP simplification, A→B suggestion engine) run entirely client-side in `app/page.tsx`.

**Why:** No external routing API is used — cost and offline-first design.

**How to apply:** Do not suggest database, RLS, or server-side auth improvements — they are not applicable. Focus on edge caching, SW reliability, and data pipeline integrity.

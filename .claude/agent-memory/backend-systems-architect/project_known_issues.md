---
name: Known Issues and Technical Debt
description: Tracked issues, deferred items, and non-obvious decisions from audit session 2026-04-23
type: project
---

## Fixed in audit session 2026-04-23

- Added `fetchError` state + retry button for silent `/api/rutas` failure
- Service Worker no longer pre-caches `/api/rutas` during install (was blocking SW on cold server)
- Security headers added to `next.config.mjs` (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, X-XSS-Protection)
- `APP_URL` in `useShareRoute.ts` now reads from `NEXT_PUBLIC_APP_URL` env var with fallback
- Removed invalid `(navigator as any)` cast — replaced with typed `nav` alias
- Added `group:rutas` and `pipeline:rutas` npm scripts
- Fixed PWARegistrar load event race (checks `document.readyState === "complete"`)
- manifest.json icon `purpose` split into separate `any` and `maskable` entries
- `stale-while-revalidate` in Cache-Control aligned with `s-maxage` (was double-stale)

## Deferred / Requires User Action

- `.env` should be renamed to `.env.local` (Next.js convention for local secrets). The `.gitignore` covers `.env*` but the non-standard name is a risk for accidental inclusion in deployment tooling.
- Mapbox token in `.env` has no URL restriction in Mapbox dashboard — token can be used by anyone who reads the client bundle. Add allowed URLs in Mapbox account settings.
- `data/rutas-grouped.json` (314 KB generated artifact) is committed to git. Should be excluded via `.gitignore` and regenerated on deploy via `npm run pipeline:rutas`.
- `Rutas/` directory (80+ source GeoJSON files) is untracked. Either commit or explicitly gitignore.
- `perpendicularDistanceSquared` + `simplifyCoordinates` are duplicated between `app/page.tsx` and `scripts/convert-rutas.js` — cannot easily share due to ESM/CJS boundary.
- `haversineMeters` lives in `app/page.tsx` instead of `lib/map.ts` — minor architectural inconsistency.

## Roadmap items (from README, not yet implemented)

- Stop search by name (fuzzy autocomplete)
- Transfer routes (A→B with 1 bus change)
- Estimated schedules
- Adaptive dark mode
- Accessibility panel

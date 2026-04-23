"use client";

import { useDeferredValue, useMemo, useState } from "react";
import TelefericoSection from "@/components/TelefericoSection";
import type { ResolvedRouteData, RouteDirection } from "@/lib/types";

type RouteListProps = {
  routes: ResolvedRouteData[];
  direction: RouteDirection;
  onDirectionChange: (direction: RouteDirection) => void;
  suggestedRouteIds: number[];
  bestSuggestedRouteId: number | null;
  nearbyRouteIds: number[];
  selectedRouteId: number | null;
  onSelectRoute: (routeId: number) => void;
  onClearSelection?: () => void;
  onShowTeleferico?: () => void;
};

export default function RouteList({
  routes,
  direction,
  onDirectionChange,
  suggestedRouteIds,
  bestSuggestedRouteId,
  nearbyRouteIds,
  selectedRouteId,
  onSelectRoute,
  onClearSelection,
  onShowTeleferico
}: RouteListProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const normalizedQuery = useMemo(() => deferredQuery.trim().toLowerCase(), [deferredQuery]);

  const hasNearby = nearbyRouteIds.length > 0;
  const telefericoRouteId = useMemo(() => {
    const telefericoRoute = routes.find((route) => route.nombre === "Teleférico Uruapan");
    if (telefericoRoute) {
      return telefericoRoute.id;
    }

    const lastRoute = routes[routes.length - 1];
    return lastRoute ? lastRoute.id : null;
  }, [routes]);

  const handleShowTelefericoOnMap = () => {
    if (telefericoRouteId === null) {
      onShowTeleferico?.();
      return;
    }

    if (selectedRouteId !== telefericoRouteId) {
      onSelectRoute(telefericoRouteId);
      return;
    }

    onShowTeleferico?.();
  };

  // Build a lookup: routeId → position in nearbyRouteIds (0 = nearest)
  const nearbyRankMap = useMemo(
    () => new Map(nearbyRouteIds.map((id, i) => [id, i])),
    [nearbyRouteIds]
  );

  const filteredRoutes = useMemo(() => {
    const base = normalizedQuery
      ? routes.filter((r) => r.nombre.toLowerCase().includes(normalizedQuery))
      : routes;

    if (!hasNearby) return base;

    // Pin nearby routes to top (already sorted nearest→farthest by Map.tsx)
    const nearby: ResolvedRouteData[] = [];
    const rest: ResolvedRouteData[] = [];

    for (const route of base) {
      if (nearbyRankMap.has(route.id)) {
        nearby.push(route);
      } else {
        rest.push(route);
      }
    }

    // Keep the distance-sorted order from nearbyRouteIds
    nearby.sort((a, b) => (nearbyRankMap.get(a.id) ?? 0) - (nearbyRankMap.get(b.id) ?? 0));

    return [...nearby, ...rest];
  }, [normalizedQuery, routes, hasNearby, nearbyRankMap]);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">Rutas disponibles</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Explora rutas y toca una opcion para verla en el mapa.
        </p>
        <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => onDirectionChange("ida")}
            className={`h-8 rounded-full px-3 text-xs transition ${
              direction === "ida"
                ? "bg-[#00D4AA] font-bold text-gray-900"
                : "text-white/50 hover:bg-white/10"
            }`}
          >
            Ida
          </button>
          <button
            type="button"
            onClick={() => onDirectionChange("vuelta")}
            className={`h-8 rounded-full px-3 text-xs transition ${
              direction === "vuelta"
                ? "bg-[#00D4AA] font-bold text-gray-900"
                : "text-white/50 hover:bg-white/10"
            }`}
          >
            Vuelta
          </button>
        </div>
        <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>{filteredRoutes.length} rutas</span>
          {selectedRouteId !== null && onClearSelection && (
            <button
              type="button"
              onClick={onClearSelection}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300 transition hover:bg-white/10"
            >
              Limpiar seleccion
            </button>
          )}
        </div>
      </div>

      <label className="block">
        <span className="sr-only">Buscar ruta</span>
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="m20 20-3.8-3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busca por nombre de ruta"
            className="h-12 w-full rounded-2xl border border-white/8 bg-white/5 pl-10 pr-11 text-sm text-slate-100 outline-none transition placeholder:text-white/25 focus:border-[#00D4AA]/40 focus:ring-1 focus:ring-[#00D4AA]/10"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-2.5 grid h-7 w-7 place-items-center rounded-full bg-white/5 text-slate-400 transition hover:bg-white/10"
              aria-label="Limpiar busqueda"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </label>

      {/* ── Teleférico featured card (hidden while searching) ────────────── */}
      {!normalizedQuery && (
        <TelefericoSection
          onShowOnMap={handleShowTelefericoOnMap}
          isSuggested={telefericoRouteId !== null && suggestedRouteIds.includes(telefericoRouteId)}
        />
      )}

      {filteredRoutes.length > 0 ? (
        <ul className="space-y-2 pb-8">
          {/* Section header when nearby routes are active */}
          {hasNearby && !normalizedQuery && (
            <li aria-hidden="true">
              <div className="flex items-center gap-2 pb-1 pt-0.5">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                    <circle cx="12" cy="12" r="4" fill="currentColor" />
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Cercanas a ti — más óptima primero
                </span>
                <span className="flex-1 border-t border-cyan-300/30 dark:border-cyan-700/30" />
              </div>
            </li>
          )}

          {filteredRoutes.map((route, listIndex) => {
            const isSelected = selectedRouteId === route.id;
            const isSuggested = suggestedRouteIds.includes(route.id);
            const isBestSuggestion = bestSuggestedRouteId === route.id;
            const nearbyRank = nearbyRankMap.get(route.id);
            const isNearby = nearbyRank !== undefined;

            // Divider between nearby block and rest (only first non-nearby item)
            const prevRoute = filteredRoutes[listIndex - 1];
            const prevIsNearby = prevRoute !== undefined && nearbyRankMap.has(prevRoute.id);
            const showDivider = hasNearby && !normalizedQuery && !isNearby && prevIsNearby;

            return (
              <li key={route.id}>
                {showDivider && (
                  <div className="flex items-center gap-2 pb-2 pt-1" aria-hidden="true">
                    <span className="flex-1 border-t border-slate-200/70 dark:border-slate-700/70" />
                    <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Otras rutas
                    </span>
                    <span className="flex-1 border-t border-slate-200/70 dark:border-slate-700/70" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onSelectRoute(route.id)}
                  className={`flex min-h-16 w-full items-stretch justify-between rounded-2xl border px-2 py-3 text-left transition active:scale-[0.995] ${
                    isSelected
                      ? "border-[#00D4AA]/70 bg-[#00D4AA]/10 shadow-[0_4px_24px_rgba(0,212,170,0.08)]"
                      : isNearby
                        ? "border-[#00D4AA]/50 bg-[#00D4AA]/8"
                        : isBestSuggestion
                          ? "border-emerald-400/70 bg-emerald-500/10"
                          : isSuggested
                            ? "border-[#00D4AA]/30 bg-[#00D4AA]/5"
                            : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/7"
                  }`}
                >
                  <span className="w-1 self-stretch rounded-full" style={{ backgroundColor: route.color }} />
                  <span className="ml-3 flex flex-1 items-center gap-3">
                    {/* Rank number for nearby routes */}
                    {isNearby ? (
                      <span className="flex h-7 w-7 shrink-0 flex-col items-center justify-center rounded-full bg-[#00D4AA]/15 text-[10px] font-bold leading-none text-[#00D4AA]">
                        #{(nearbyRank ?? 0) + 1}
                      </span>
                    ) : null}
                    <span className="min-w-0">
                      <span className="block font-display text-sm font-bold text-slate-100">{route.nombre}</span>
                      <span className="block text-xs text-white/35">
                        {route.tieneIda && route.tieneVuelta
                          ? "Ida y vuelta disponibles"
                          : route.tieneIda
                            ? "Solo ida disponible"
                            : "Solo vuelta disponible"}
                      </span>
                    </span>
                  </span>

                  <span className="ml-2 flex items-center gap-1.5">
                    {isNearby && !isSelected && (
                      <span className="rounded-full bg-[#00D4AA]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#00D4AA]">
                        CERCANA
                      </span>
                    )}
                    {isBestSuggestion && (
                      <span className="rounded-full bg-[#00D4AA]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#00D4AA]">
                        MEJOR
                      </span>
                    )}
                    {isSelected && <span className="rounded-full bg-[#00D4AA]/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#00D4AA]">ACTIVA</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-2xl border border-slate-200/80 bg-white/75 px-4 py-6 text-center text-sm text-slate-600 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-300">
          No encontramos rutas con ese nombre. Intenta con otra palabra o revisa la lista completa.
        </div>
      )}
    </div>
  );
}


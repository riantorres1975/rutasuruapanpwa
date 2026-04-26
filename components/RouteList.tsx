"use client";

import Fuse from "fuse.js";
import { useDeferredValue, useMemo, useState } from "react";
import TelefericoSection from "@/components/TelefericoSection";
import { getRouteDestination, getRouteSearchTerms } from "@/lib/route-names";
import type { ResolvedRouteData, RouteDirection } from "@/lib/types";

type RouteListProps = {
  routes: ResolvedRouteData[];
  isLoading?: boolean;
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
  isLoading = false,
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

  const normalizedQuery = deferredQuery.trim();

  const searchableRoutes = useMemo(
    () =>
      routes.map((route) => ({
        ...route,
        _destino: getRouteDestination(route.ruta) ?? "",
        _terminos: getRouteSearchTerms(route.ruta).join(" ")
      })),
    [routes]
  );

  const fuse = useMemo(
    () =>
      new Fuse(searchableRoutes, {
        keys: [
          { name: "nombre", weight: 0.4 },
          { name: "_destino", weight: 0.4 },
          { name: "_terminos", weight: 0.2 }
        ],
        threshold: 0.35,
        minMatchCharLength: 1,
        includeScore: false
      }),
    [searchableRoutes]
  );

  const hasNearby = nearbyRouteIds.length > 0;
  const telefericoRouteId = useMemo(() => {
    const telefericoRoute = routes.find((route) => route.nombre === "Teleférico Uruapan");
    return telefericoRoute ? telefericoRoute.id : null;
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
      ? fuse.search(normalizedQuery).map((result) => result.item)
      : searchableRoutes;

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
  }, [normalizedQuery, searchableRoutes, hasNearby, nearbyRankMap, fuse]);

  return (
    <div className="space-y-5">
      {/* Header section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="ov-text font-display text-[18px] font-bold">Rutas disponibles</h2>
            <p className="ov-text-muted mt-0.5 text-[13px]">
              Toca una ruta para verla en el mapa.
            </p>
          </div>
          {selectedRouteId !== null && onClearSelection && (
            <button
              type="button"
              onClick={onClearSelection}
              className="ov-pill ov-border ov-text-muted shrink-0 rounded-xl border px-3 py-2 text-[12px] font-semibold transition hover:opacity-80 active:scale-[0.97]"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Direction toggle + route count on same row */}
        <div className="flex items-center gap-3">
          <div className="ov-pill ov-border inline-flex rounded-xl border p-1">
            <button
              type="button"
              onClick={() => onDirectionChange("ida")}
              className={`h-9 rounded-lg px-4 text-[13px] font-semibold transition active:scale-[0.97] ${
                direction === "ida"
                  ? "bg-terracota-400 text-white shadow-sm"
                  : "ov-text-muted hover:opacity-80"
              }`}
            >
              Ida
            </button>
            <button
              type="button"
              onClick={() => onDirectionChange("vuelta")}
              className={`h-9 rounded-lg px-4 text-[13px] font-semibold transition active:scale-[0.97] ${
                direction === "vuelta"
                  ? "bg-terracota-400 text-white shadow-sm"
                  : "ov-text-muted hover:opacity-80"
              }`}
            >
              Vuelta
            </button>
          </div>
          <span className="ov-text-muted text-[12px] font-medium">
            {filteredRoutes.length} ruta{filteredRoutes.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block">
          <span className="sr-only">Buscar ruta por colonia o número</span>
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="ov-text-muted pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
              <path d="m20 20-3.8-3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Colonia, destino o número de ruta…"
              style={{ background: "var(--ov-pill-bg)", color: "var(--ov-text)", borderColor: "var(--ov-border)" }}
              className="h-12 w-full rounded-2xl border pl-10 pr-11 text-sm outline-none transition focus:border-terracota-400/40 focus:ring-1 focus:ring-terracota-400/10 [&::placeholder]:opacity-40"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="ov-pill ov-text-muted absolute right-2 top-2.5 grid h-7 w-7 place-items-center rounded-full transition hover:opacity-80"
                aria-label="Limpiar busqueda"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </label>

        {/* Quick-search chips — hidden while user has typed something */}
        {!query && (
          <div className="flex flex-wrap gap-1.5" role="list" aria-label="Búsquedas rápidas">
            {["Jucutacato", "Constituyentes", "Pemex", "Taximacuaro", "Central", "Balcones"].map((chip) => (
              <button
                key={chip}
                type="button"
                role="listitem"
                onClick={() => setQuery(chip)}
                className="ov-pill ov-border ov-text-muted rounded-full border px-2.5 py-1 text-[11px] font-medium transition hover:border-terracota-400/40 hover:text-terracota-400 active:scale-[0.97]"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Teleférico featured card (hidden while searching) ────────────── */}
      {!normalizedQuery && (
        <TelefericoSection
          onShowOnMap={handleShowTelefericoOnMap}
          isSuggested={telefericoRouteId !== null && suggestedRouteIds.includes(telefericoRouteId)}
        />
      )}

      {/* Skeleton rows durante la carga inicial — reemplazan el spinner generico */}
      {isLoading ? (
        <ul className="space-y-2 pb-10" aria-busy="true" aria-label="Cargando rutas">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <div className="flex min-h-16 w-full items-stretch gap-3 rounded-2xl border border-cream-100/8 bg-cream-100/4 px-2 py-3">
                {/* Color strip skeleton */}
                <div className="w-1 self-stretch rounded-full bg-cream-100/10 animate-pulse" />
                <div className="ml-1 flex flex-1 flex-col justify-center gap-2 py-0.5">
                  {/* Route name skeleton — varying widths for realistic feel */}
                  <div
                    className="h-3.5 animate-pulse rounded-full bg-cream-100/10"
                    style={{ width: `${52 + (i % 3) * 14}%`, animationDelay: `${i * 80}ms` }}
                  />
                  {/* Subtitle skeleton */}
                  <div
                    className="h-2.5 animate-pulse rounded-full bg-cream-100/6"
                    style={{ width: `${36 + (i % 2) * 12}%`, animationDelay: `${i * 80 + 40}ms` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : filteredRoutes.length > 0 ? (
        <ul className="space-y-2 pb-10">
          {/* Section header when nearby routes are active */}
          {hasNearby && !normalizedQuery && (
            <li aria-hidden="true">
              <div className="flex items-center gap-2 pb-1 pt-0.5">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-terracota-400">
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                    <circle cx="12" cy="12" r="4" fill="currentColor" />
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Cercanas a ti
                </span>
                <span className="flex-1 border-t border-terracota-400/20" />
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
                    <span className="text-[10px] font-medium uppercase tracking-widest text-cream-100/60 dark:text-cream-100/50">
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
                      ? "border-terracota-400/70 bg-terracota-400/10 shadow-[0_4px_24px_rgba(232,93,47,0.08)]"
                      : isNearby
                        ? "border-terracota-400/50 bg-terracota-400/8"
                        : isBestSuggestion
                          ? "border-emerald-400/70 bg-emerald-500/10"
                          : isSuggested
                            ? "border-terracota-400/30 bg-terracota-400/5"
                            : "border-cream-100/10 bg-cream-100/5 hover:border-cream-100/20 hover:bg-cream-100/7"
                  }`}
                >
                  <span className="w-1 self-stretch rounded-full" style={{ backgroundColor: route.color }} />
                  <span className="ml-3 flex flex-1 items-center gap-3">
                    {/* Rank number for nearby routes */}
                    {isNearby ? (
                      <span className="flex h-7 w-7 shrink-0 flex-col items-center justify-center rounded-full bg-terracota-400/15 text-[10px] font-bold leading-none text-terracota-400">
                        #{(nearbyRank ?? 0) + 1}
                      </span>
                    ) : null}
                    <span className="min-w-0">
                      {(() => {
                        const destino = getRouteDestination(route.ruta);
                        const availability = route.tieneIda && route.tieneVuelta
                          ? "Ida y vuelta disponibles"
                          : route.tieneIda
                            ? "Solo ida disponible"
                            : "Solo vuelta disponible";
                        return destino ? (
                          <>
                            <span className="ov-text block truncate font-display text-sm font-bold">{destino}</span>
                            <span className="ov-text-muted block text-[11px]">
                              <span className="font-semibold">{route.ruta}</span>
                              <span className="mx-1.5 opacity-40">·</span>
                              {availability}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="ov-text block font-display text-sm font-bold">{route.nombre}</span>
                            <span className="ov-text-muted block text-xs">{availability}</span>
                          </>
                        );
                      })()}
                    </span>
                  </span>

                  <span className="ml-2 flex items-center gap-1.5">
                    {isNearby && !isSelected && (
                      <span className="rounded-full bg-terracota-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-terracota-400">
                        CERCANA
                      </span>
                    )}
                    {isBestSuggestion && (
                      <span className="rounded-full bg-terracota-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-terracota-400">
                        MEJOR
                      </span>
                    )}
                    {isSelected && <span className="rounded-full bg-terracota-400/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-terracota-400">ACTIVA</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="ov-panel ov-border flex flex-col items-center gap-3 rounded-2xl border px-4 py-8 text-center">
          <div className="ov-pill flex h-12 w-12 items-center justify-center rounded-2xl">
            <svg viewBox="0 0 24 24" fill="none" className="ov-text-muted h-6 w-6" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
              <path d="m20 20-3.8-3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M8.5 11h5M11 8.5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
            </svg>
          </div>
          <div>
            <p className="ov-text text-[14px] font-semibold">Sin resultados</p>
            <p className="ov-text-muted mt-1 text-[12px]">
              No hay rutas con ese nombre. Prueba con otra palabra.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}


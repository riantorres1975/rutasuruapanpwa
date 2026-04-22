"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { RouteData } from "@/lib/types";

type RouteListProps = {
  routes: RouteData[];
  selectedRouteId: number | null;
  onSelectRoute: (routeId: number) => void;
  onClearSelection?: () => void;
};

export default function RouteList({
  routes,
  selectedRouteId,
  onSelectRoute,
  onClearSelection
}: RouteListProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const normalizedQuery = useMemo(() => deferredQuery.trim().toLowerCase(), [deferredQuery]);

  const filteredRoutes = useMemo(() => {
    if (!normalizedQuery) {
      return routes;
    }

    return routes.filter((route) => route.nombre.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery, routes]);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">Rutas disponibles</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Elige una ruta para resaltarla y centrar el mapa.
        </p>
        <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>{filteredRoutes.length} rutas</span>
          {selectedRouteId !== null && onClearSelection && (
            <button
              type="button"
              onClick={onClearSelection}
              className="rounded-full border border-slate-300/80 bg-slate-900/5 px-3 py-1.5 text-slate-700 transition hover:bg-slate-900/10 dark:border-slate-600/80 dark:bg-slate-100/10 dark:text-slate-200 dark:hover:bg-slate-100/20"
            >
              Limpiar seleccion
            </button>
          )}
        </div>
      </div>

      <label className="block">
        <span className="sr-only">Buscar ruta</span>
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar ruta"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-cyan-400 dark:focus:ring-cyan-500/25"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-2.5 grid h-7 w-7 place-items-center rounded-full bg-slate-900/10 text-slate-600 transition hover:bg-slate-900/15 dark:bg-slate-100/10 dark:text-slate-300 dark:hover:bg-slate-100/20"
              aria-label="Limpiar busqueda"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </label>

      {filteredRoutes.length > 0 ? (
        <ul className="space-y-2 pb-8">
          {filteredRoutes.map((route) => {
            const isSelected = selectedRouteId === route.id;

            return (
              <li key={route.id}>
                <button
                  type="button"
                  onClick={() => onSelectRoute(route.id)}
                  className={`flex min-h-14 w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition ${
                    isSelected
                      ? "border-cyan-400/70 bg-cyan-500/10"
                      : "border-slate-200/80 bg-white/70 hover:border-slate-300 hover:bg-white dark:border-slate-700/80 dark:bg-slate-900/65 dark:hover:border-slate-600 dark:hover:bg-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="h-8 w-1.5 rounded-full" style={{ backgroundColor: route.color }} />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{route.nombre}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {route.coordenadas.length} puntos
                      </span>
                    </span>
                  </span>

                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                      isSelected
                        ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-200"
                        : "bg-slate-900/10 text-slate-600 dark:bg-slate-100/10 dark:text-slate-300"
                    }`}
                  >
                    {isSelected ? "Activa" : "Ver"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-2xl border border-slate-200/80 bg-white/75 px-4 py-6 text-center text-sm text-slate-600 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-300">
          No encontramos rutas para {query.trim()}.
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useMemo, useState } from "react";
import BottomSheet from "@/components/BottomSheet";
import Map from "@/components/Map";
import RouteList from "@/components/RouteList";
import rutas from "@/data/rutas.json";
import type { RouteData } from "@/lib/types";

const allRoutes = rutas as RouteData[];

export default function HomePage() {
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleSelectRoute = useCallback((routeId: number) => {
    setSelectedRouteId((current) => (current === routeId ? null : routeId));
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedRouteId(null);
  }, []);

  const selectedRoute = useMemo(
    () => allRoutes.find((route) => route.id === selectedRouteId) ?? null,
    [selectedRouteId]
  );

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <Map
        routes={allRoutes}
        selectedRouteId={selectedRouteId}
        onSelectRoute={handleSelectRoute}
      />

      <section className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-4">
        <div className="pointer-events-auto inline-flex max-w-[88%] items-center gap-3 rounded-2xl border border-white/20 bg-[var(--surface)] px-3.5 py-2.5 shadow-soft backdrop-blur-xl">
          <p className="font-display text-base font-semibold leading-none">Rutas Uruapan</p>
          <span className="rounded-full bg-slate-900/10 px-2 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-100/10 dark:text-slate-200">
            {allRoutes.length} rutas
          </span>
        </div>

        {selectedRoute && (
          <div className="mt-3 inline-flex max-w-[90%] items-center gap-2 rounded-full border border-cyan-500/30 bg-slate-900/70 px-3 py-2 text-xs text-cyan-100 shadow-soft backdrop-blur-md">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedRoute.color }} />
            <span className="truncate font-medium">{selectedRoute.nombre}</span>
            <button
              type="button"
              onClick={handleClearSelection}
              className="pointer-events-auto rounded-full bg-white/15 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-100 transition hover:bg-white/25"
            >
              Limpiar
            </button>
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={() => setIsSheetOpen(true)}
        className="absolute bottom-5 right-4 z-30 inline-flex h-12 items-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 active:translate-y-0 dark:bg-slate-100 dark:text-slate-900"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
          <path
            d="M4 7H20M4 12H20M4 17H14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        Rutas
      </button>

      <BottomSheet open={isSheetOpen} onOpenChange={setIsSheetOpen} title="Selecciona una ruta">
        <RouteList
          routes={allRoutes}
          selectedRouteId={selectedRouteId}
          onClearSelection={() => {
            handleClearSelection();
            setIsSheetOpen(false);
          }}
          onSelectRoute={(routeId) => {
            handleSelectRoute(routeId);
            setIsSheetOpen(false);
          }}
        />
      </BottomSheet>
    </main>
  );
}

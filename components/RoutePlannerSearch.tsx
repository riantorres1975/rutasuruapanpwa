"use client";

import PlaceSearch from "@/components/PlaceSearch";
import type { ActivePoint } from "@/hooks/useRoutePlanner";
import type { PlaceResult } from "@/lib/geocode";
import type { RecentTrip } from "@/lib/recent-trips";

const DESTINATIONS = ["Centro", "Hospital Regional", "Plaza Ágora", "Central"] as const;

type RoutePlannerSearchProps = {
  activePoint: ActivePoint;
  destinationSelected: boolean;
  isMobile: boolean;
  lastTrip: RecentTrip | null;
  onDestinationSelect: (destination: string) => void;
  onPlaceSelect: (result: PlaceResult) => void;
  onRepeatTrip: (trip: RecentTrip) => void;
};

export default function RoutePlannerSearch({
  activePoint,
  destinationSelected,
  isMobile,
  lastTrip,
  onDestinationSelect,
  onPlaceSelect,
  onRepeatTrip,
}: RoutePlannerSearchProps) {
  return (
    <div className="w-full">
      <PlaceSearch
        label={activePoint === "origin" ? "Buscar origen" : "Buscar destino"}
        placeholder={activePoint === "origin"
          ? "¿Desde dónde sales? Colonia, calle, plaza…"
          : "¿A dónde vas? Colonia, hospital, plaza…"}
        onSelect={onPlaceSelect}
      />

      {activePoint !== "origin" && !destinationSelected && (
        <div
          className={`mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            isMobile ? "[@media(max-height:740px)]:hidden" : ""
          }`}
          aria-label="Destinos frecuentes"
        >
          {lastTrip && (
            <button
              type="button"
              onClick={() => onRepeatTrip(lastTrip)}
              style={{ background: "var(--ov-bg)" }}
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-lima/45 px-3 py-1.5 text-[12px] font-bold text-lima shadow-soft backdrop-blur-xl transition hover:border-lima/70 active:scale-[0.97]"
              aria-label={`Repetir tu último viaje a ${lastTrip.destinationLabel ?? "tu destino anterior"}`}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 shrink-0" aria-hidden="true">
                <path d="M3 12a9 9 0 1 1 2.6 6.4M3 12V7m0 5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Repetir: {lastTrip.destinationLabel ?? "último viaje"}
            </button>
          )}

          {DESTINATIONS.map((destination) => (
            <button
              key={destination}
              type="button"
              onClick={() => onDestinationSelect(destination)}
              style={{ background: "var(--ov-bg)", borderColor: "var(--ov-border)" }}
              className="ov-text inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-semibold shadow-soft backdrop-blur-xl transition hover:border-lima/50 hover:text-lima active:scale-[0.97]"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 shrink-0 text-lima" aria-hidden="true">
                <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2" fill="currentColor" />
              </svg>
              {destination}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

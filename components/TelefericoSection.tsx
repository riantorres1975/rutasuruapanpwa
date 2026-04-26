"use client";

import { useState } from "react";
import { TELEFERICO_URUAPAN } from "@/lib/mobility-config";

// ─── Station data for Teleférico route ────────────────────────────────────────

export const TELEFERICO_STATIONS = [
  {
    id: "E1",
    name: "IMSS",
    fullName: "Estación IMSS",
    icon: "🏥",
    desc: "Junto al Hospital General IMSS",
    coords: [-102.02093, 19.396299] as [number, number],
  },
  {
    id: "E2",
    name: "Libramiento",
    fullName: "Estación Libramiento Oriente",
    icon: "🛣️",
    desc: "Libramiento Oriente — acceso noreste",
    coords: [-102.025606, 19.4146744] as [number, number],
  },
  {
    id: "E3",
    name: "Ágora",
    fullName: "Estación Ágora",
    icon: "🎭",
    desc: "Centro Cultural Ágora de Uruapan",
    coords: [-102.0375379, 19.4216787] as [number, number],
  },
  {
    id: "E4",
    name: "Presidencia",
    fullName: "Estación Presidencia",
    icon: "🏛️",
    desc: "Presidencia Municipal de Uruapan",
    coords: [-102.0477917, 19.4211717] as [number, number],
  },
  {
    id: "E5",
    name: "Centro",
    fullName: "Estación Centro",
    icon: "🏙️",
    desc: "Centro Histórico — Parque Nacional",
    coords: [-102.0585911, 19.419822] as [number, number],
  },
  {
    id: "E6",
    name: "Mercado Poniente",
    fullName: "Estación Mercado Poniente",
    icon: "🛒",
    desc: "Mercado de la zona poniente",
    coords: [-102.0769769, 19.4306165] as [number, number],
  },
];

// Full route as a single LineString (all stations connected in order)
export const TELEFERICO_LINE_COORDS: [number, number][] = TELEFERICO_STATIONS.map(
  (s) => s.coords
);

const FARES = [
  { label: "Viaje", price: TELEFERICO_URUAPAN.fare, icon: "👤" },
  { label: "Pago", price: "Tarjeta", icon: "🎫" },
];

// ─── Compact card shown inside RouteList ──────────────────────────────────────

type TelefericoCardProps = {
  onOpen: () => void;
  isSuggested?: boolean;
};

export function TelefericoCard({ onOpen, isSuggested }: TelefericoCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative w-full overflow-hidden rounded-2xl text-left transition active:scale-[0.985]"
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-avocado-600 via-avocado-400 to-avocado-400 opacity-90" />
      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      {/* Shimmer on hover */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-cream-100/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

      <div className="relative flex items-center justify-between gap-3 px-4 py-3.5">
        {/* Left: icon + info */}
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream-100/20 text-2xl shadow-inner backdrop-blur-sm">
            🚡
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold leading-none text-cream-50">Teleférico Uruapan</p>
              {isSuggested ? (
                <span className="relative inline-flex">
                  <span className="absolute inset-0 animate-ping rounded-full bg-lima opacity-60" />
                  <span className="relative rounded-full bg-lima px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-bg shadow-sm">
                    Sugerida
                  </span>
                </span>
              ) : (
                <span className="relative inline-flex">
                  <span className="absolute inset-0 animate-ping rounded-full bg-yellow-400 opacity-60" />
                  <span className="relative rounded-full bg-yellow-400 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-yellow-900">
                    Nuevo
                  </span>
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] font-medium text-cream-100/85">
              {TELEFERICO_URUAPAN.stations.length} estaciones · {TELEFERICO_URUAPAN.fare} · {TELEFERICO_URUAPAN.frequency.toLowerCase()}
            </p>
          </div>
        </div>

        {/* Right: chevron */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-4 w-4 shrink-0 text-cream-100/70 transition group-hover:translate-x-0.5"
          aria-hidden="true"
        >
          <path
            d="M9 18l6-6-6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </button>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

type TelefericoDetailProps = {
  onClose: () => void;
  onShowOnMap: () => void;
};

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-cream-100/8 bg-cream-100/5 px-3.5 py-3">
      <span className="text-xl" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-cream-100/45">
          {label}
        </p>
        <p className="truncate text-[13px] font-semibold text-cream-50">{value}</p>
      </div>
    </div>
  );
}

export function TelefericoDetail({ onClose, onShowOnMap }: TelefericoDetailProps) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-avocado-600 via-avocado-400 to-avocado-400" />
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cream-100/10" />
        <div className="absolute -bottom-6 -left-4 h-24 w-24 rounded-full bg-cream-100/10" />
        <div className="relative px-5 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🚡</span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-cream-50">Teleférico Uruapan</h2>
                  <span className="relative inline-flex">
                    <span className="absolute inset-0 animate-ping rounded-full bg-yellow-400 opacity-60" />
                    <span className="relative rounded-full bg-yellow-400 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-yellow-900">
                      Nuevo
                    </span>
                  </span>
                </div>
                <p className="text-sm text-cream-100/85">Sistema de transporte aéreo urbano</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-cream-100/20 p-2 text-cream-50 transition hover:bg-cream-100/30 active:scale-95"
              aria-label="Volver a rutas"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Quick stats */}
          <div className="mt-4 flex gap-2">
            {[
              { label: "Estaciones", value: "6" },
              { label: "Frecuencia", value: "5 min" },
              { label: "Horario", value: TELEFERICO_URUAPAN.hours },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex-1 rounded-xl bg-cream-100/15 px-2 py-2 text-center backdrop-blur-sm"
              >
                <p className="text-base font-bold text-cream-50">{stat.value}</p>
                <p className="text-[10px] font-medium text-cream-100/85">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Ver en mapa button */}
          <button
            type="button"
            onClick={onShowOnMap}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-cream-100/20 py-2 text-[12px] font-semibold text-cream-50 backdrop-blur-sm transition hover:bg-cream-100/30 active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
              <path
                d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13V7m0 13 6-3M9 7l6-3m0 17 5.447-2.724A1 1 0 0 0 21 16.382V5.618a1 1 0 0 0-1.447-.894L15 7m0 13V7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Ver ruta en el mapa
          </button>
        </div>
      </div>

      {/* Stations timeline */}
      <div>
        <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-cream-100/45 dark:text-cream-100/60">
          Estaciones ({TELEFERICO_STATIONS.length})
        </h3>
        <div className="relative space-y-0">
          {TELEFERICO_STATIONS.map((station, index) => (
            <div key={station.id} className="flex gap-3">
              {/* Timeline */}
              <div className="flex flex-col items-center">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-avocado-400 bg-avocado-400/15 text-[11px] font-bold text-avocado-600 dark:text-avocado-100">
                  {station.id}
                </div>
                {index < TELEFERICO_STATIONS.length - 1 && (
                  <div
                    className="my-0.5 w-0.5 flex-1 border-l-2 border-dashed border-avocado-400/50"
                    style={{ minHeight: "1.5rem" }}
                  />
                )}
              </div>
              {/* Content */}
              <div className="flex-1 pb-3">
                <div className="rounded-xl border border-cream-100/8 bg-cream-100/5 px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">{station.icon}</span>
                    <p className="text-[13px] font-semibold text-cream-50">
                      {station.fullName}
                    </p>
                  </div>
                  <p className="mt-0.5 text-[11px] text-cream-100/45">
                    {station.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fares */}
      <div>
        <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-cream-100/45">
          Tarifas
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {FARES.map((fare) => (
            <div
              key={fare.label}
              className="rounded-xl border border-avocado-400/20 bg-avocado-400/10 px-4 py-3"
            >
              <p className="text-xl" aria-hidden="true">
                {fare.icon}
              </p>
              <p className="mt-1 text-2xl font-extrabold text-avocado-100">
                {fare.price}
              </p>
              <p className="text-[11px] font-medium text-cream-100/60">
                {fare.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Operational info */}
      <div>
        <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-cream-100/45 dark:text-cream-100/60">
          Operación
        </h3>
        <div className="space-y-2">
          <InfoRow icon="🕐" label="Horario" value={`${TELEFERICO_URUAPAN.hours}, todos los días`} />
          <InfoRow icon="⏱️" label="Frecuencia" value={TELEFERICO_URUAPAN.frequency} />
          <InfoRow icon="📍" label="Duración" value={TELEFERICO_URUAPAN.tripDuration} />
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl border border-amber-400/20 bg-amber-500/8 px-4 py-3">
        <p className="text-[11px] leading-relaxed text-amber-300/90">
          La informacion de horarios y tarifas puede variar. Se recomienda confirmar en taquilla antes de abordar.
        </p>
      </div>

      <div className="h-2" />
    </div>
  );
}

// ─── Controller ───────────────────────────────────────────────────────────────

type TelefericoSectionProps = {
  onShowOnMap?: () => void;
  isSuggested?: boolean;
};

export default function TelefericoSection({ onShowOnMap, isSuggested }: TelefericoSectionProps) {
  const [open, setOpen] = useState(false);

  const handleShowOnMap = () => {
    setOpen(false);
    onShowOnMap?.();
  };

  return open ? (
    <TelefericoDetail onClose={() => setOpen(false)} onShowOnMap={handleShowOnMap} />
  ) : (
    <TelefericoCard onOpen={() => setOpen(true)} isSuggested={isSuggested} />
  );
}

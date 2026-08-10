"use client";

import type { ReactNode } from "react";
import { getJourneyFareSummary } from "@/lib/journey-guidance";
import type { RouteOption } from "@/lib/route-calculation";
import { formatRouteLabel } from "@/lib/route-names";
import type { TransferOption } from "@/lib/transfers";

type DirectRouteResultProps = {
  alternatives: RouteOption[];
  feedbackGiven: boolean;
  isMobile: boolean;
  isTripActive: boolean;
  route: RouteOption;
  routeEta: number | null;
  onEditDestination: () => void;
  onEditOrigin: () => void;
  onFeedback: (useful: "si" | "no") => void;
  onPromote: (routeId: number) => void;
  onShare: () => void;
  onShowAlternatives: () => void;
  onToggleTrip: () => void;
  onViewMap: () => void;
};

export function DirectRouteResult({
  alternatives,
  feedbackGiven,
  isMobile,
  isTripActive,
  route,
  routeEta,
  onEditDestination,
  onEditOrigin,
  onFeedback,
  onPromote,
  onShare,
  onShowAlternatives,
  onToggleTrip,
  onViewMap,
}: DirectRouteResultProps) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] font-bold tracking-[2px] text-lima">RUTA RECOMENDADA</p>
      <p className="ov-text mt-0.5 truncate font-display text-[17px] font-bold leading-tight">
        {formatRouteLabel(route.ruta)}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-lg border border-lima/25 bg-lima/10 px-2.5 py-1 text-[12px] font-semibold text-lima">
          <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {routeEta} min aprox
        </span>
        {routeEta !== null && (
          <span className="ov-pill ov-border ov-text-muted inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[12px] font-medium">
            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
              <path d="M13 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM9.5 22l1.5-5-2-2 1-6 3.5-1.5L16 10l3 1M9 9l-3 1.5L5 14m5.5 3L8 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            ~{route.estimatedMinutes} min puerta a puerta
          </span>
        )}
        <span className="ov-pill ov-border ov-text-muted inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[12px] font-medium">
          {getJourneyFareSummary([route.ruta]).badge}
        </span>
        {alternatives.length > 0 && (
          <button
            type="button"
            onClick={onShowAlternatives}
            className={`ov-pill ov-border ov-text-muted inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[12px] font-medium transition active:scale-[0.97] hover:border-lima/40 hover:text-lima ${isMobile ? "cursor-pointer" : "cursor-default"}`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
              <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13V7m0 13 6-3M9 7l6-3m6 17V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            +{alternatives.length} alternativa{alternatives.length > 1 ? "s" : ""}
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onEditOrigin}
          className="ov-pill ov-border ov-text-muted inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-xl border text-[12px] font-semibold transition active:scale-[0.97]"
          aria-label="Cambiar punto de origen"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
            <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="10" r="2" fill="currentColor" />
          </svg>
          Origen
        </button>
        <button
          type="button"
          onClick={onEditDestination}
          className="ov-pill ov-border ov-text-muted inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-xl border text-[12px] font-semibold transition active:scale-[0.97]"
          aria-label="Cambiar destino"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.5" />
          </svg>
          Destino
        </button>
        <button
          type="button"
          onClick={onShare}
          className="ov-pill ov-border ov-text-muted inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition active:scale-[0.97]"
          aria-label={`Compartir ruta ${formatRouteLabel(route.ruta)}`}
        >
          <ShareIcon />
        </button>
        <button
          type="button"
          onClick={onViewMap}
          className="inline-flex h-10 flex-[2] items-center justify-center gap-1.5 rounded-xl bg-verde text-[12px] font-bold text-ink-900 shadow-[0_2px_12px_rgba(232,93,47,0.35)] transition active:scale-[0.97]"
          aria-label={`Ver ${formatRouteLabel(route.ruta)} en el mapa`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13V7m0 13 6-3M9 7l6-3m6 17V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Ver en mapa
        </button>
      </div>

      <TripToggleButton
        active={isTripActive}
        label={`Iniciar viaje en ${formatRouteLabel(route.ruta)}`}
        onClick={onToggleTrip}
      />

      {alternatives.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="ov-text-muted text-[10px] font-bold uppercase tracking-widest">Alternativas</p>
          {alternatives.slice(0, 3).map((alternative) => {
            const alternativeWalk = Math.round(alternative.distanciaA + alternative.distanciaB);
            const routeWalk = Math.round(route.distanciaA + route.distanciaB);
            const lessWalk = alternativeWalk < routeWalk;
            const faster = alternative.estimatedMinutes < route.estimatedMinutes;

            return (
              <button
                key={alternative.routeId}
                type="button"
                onClick={() => onPromote(alternative.routeId)}
                className="ov-pill ov-border flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition active:scale-[0.99] hover:border-lima/40"
                aria-label={`Usar ${formatRouteLabel(alternative.ruta)} como ruta recomendada`}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: alternative.routeColor ?? "#6aab48" }} aria-hidden="true" />
                <span className="ov-text min-w-0 flex-1 truncate text-[12px] font-semibold">
                  {formatRouteLabel(alternative.ruta)}
                </span>
                {lessWalk && <ComparisonBadge variant="walk">Menos caminata</ComparisonBadge>}
                {!lessWalk && faster && <ComparisonBadge variant="fast">Más rápida</ComparisonBadge>}
                <span className="ov-text-muted shrink-0 text-[11px]">
                  {alternative.estimatedMinutes} min · {alternativeWalk} m a pie
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="ov-border mt-3 flex min-h-8 items-center justify-between gap-2 border-t pt-2">
        {feedbackGiven ? (
          <p className="ov-text-muted text-[11px]">¡Gracias! Tu opinión ayuda a mejorar las rutas.</p>
        ) : (
          <>
            <p className="ov-text-muted text-[11px]">¿Te sirvió esta ruta?</p>
            <div className="flex gap-1.5">
              <FeedbackButton label="Sí" onClick={() => onFeedback("si")} />
              <FeedbackButton label="No" negative onClick={() => onFeedback("no")} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

type SelectedTransferResultProps = {
  isTripActive: boolean;
  transfer: TransferOption;
  onClear: () => void;
  onShare: () => void;
  onToggleTrip: () => void;
};

export function SelectedTransferResult({
  isTripActive,
  transfer,
  onClear,
  onShare,
  onToggleTrip,
}: SelectedTransferResultProps) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] font-bold tracking-[2px] text-avocado-400">TRANSBORDO SELECCIONADO</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="ov-text flex-1 truncate text-[13px] font-semibold">{transfer.routeAName}</span>
        <TransferIcon />
        <span className="ov-text flex-1 truncate text-[13px] font-semibold">{transfer.routeBName}</span>
      </div>
      <p className="ov-text-muted mt-1 text-[11px]">
        Camina ~{Math.round(transfer.walkMeters)} m en el punto de transbordo
        <span className="mx-1.5 opacity-40">·</span>
        {getJourneyFareSummary([transfer.routeAName, transfer.routeBName]).badge}
      </p>
      <TripToggleButton active={isTripActive} className="mt-3" label="Iniciar viaje con transbordo" onClick={onToggleTrip} />
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <button
          type="button"
          onClick={onClear}
          className="ov-pill ov-border ov-text-muted h-9 shrink-0 rounded-lg border px-3 text-[11px] font-semibold transition active:scale-[0.97]"
          aria-label="Limpiar ruta seleccionada"
        >
          Limpiar
        </button>
        <button
          type="button"
          onClick={onShare}
          className="ov-pill ov-border ov-text-muted inline-flex h-10 w-10 items-center justify-center rounded-xl border transition active:scale-[0.97]"
          aria-label="Compartir transbordo"
        >
          <ShareIcon />
        </button>
      </div>
    </div>
  );
}

export function TransferOptionsResult({
  transfers,
  onMoveDestination,
  onSelect,
}: {
  transfers: TransferOption[];
  onMoveDestination: () => void;
  onSelect: (transfer: TransferOption) => void;
}) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] font-bold tracking-[2px] text-avocado-400">CON TRANSBORDO</p>
      <p className="ov-text-muted mt-0.5 text-[12px]">No hay ruta directa. Opciones con cambio de ruta:</p>
      <ul className="mt-2 max-h-[200px] space-y-1.5 overflow-y-auto">
        {transfers.map((transfer) => (
          <li key={`${transfer.routeAId}-${transfer.routeBId}`}>
            <button
              type="button"
              onClick={() => onSelect(transfer)}
              aria-label={`Seleccionar transbordo de ${transfer.routeAName} a ${transfer.routeBName}`}
              className="flex w-full items-center gap-2 rounded-xl border border-avocado-400/20 bg-avocado-400/8 px-3 py-2 text-left transition active:scale-[0.99] hover:bg-avocado-400/12"
            >
              <TransferIcon />
              <span className="min-w-0 flex-1">
                <span className="ov-text block truncate text-[12px] font-semibold">{transfer.routeAName}</span>
                <span className="ov-text-muted block truncate text-[11px]">→ transbordo → {transfer.routeBName}</span>
              </span>
              <span className="shrink-0 rounded-full bg-avocado-400/15 px-2 py-0.5 text-[10px] font-semibold text-avocado-600">
                ~{Math.round(transfer.walkMeters)}m
              </span>
            </button>
          </li>
        ))}
      </ul>
      <MoveDestinationButton onClick={onMoveDestination} />
    </div>
  );
}

export function EmptyRouteResult({ onMoveDestination }: { onMoveDestination: () => void }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-avocado-400/15">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-avocado-400" aria-hidden="true">
            <path d="M12 8v4m0 4h.01M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <div className="flex-1">
          <p className="ov-text text-[13px] font-semibold">Sin ruta directa</p>
          <p className="ov-text-muted mt-0.5 text-[12px] leading-snug">Ajusta alguno de los puntos e intenta de nuevo.</p>
        </div>
      </div>
      <MoveDestinationButton onClick={onMoveDestination} />
    </div>
  );
}

function ComparisonBadge({ children, variant }: { children: ReactNode; variant: "walk" | "fast" }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
      variant === "walk" ? "bg-emerald-500/10 text-emerald-400" : "bg-sky-500/10 text-sky-400"
    }`}>
      {children}
    </span>
  );
}

function FeedbackButton({ label, negative = false, onClick }: { label: string; negative?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ov-pill ov-border ov-text-muted inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[11px] font-semibold transition active:scale-[0.96] ${negative ? "hover:border-red-400/50 hover:text-red-400" : "hover:border-emerald-400/50 hover:text-emerald-400"}`}
    >
      <svg viewBox="0 0 24 24" fill="none" className={`h-3 w-3 ${negative ? "rotate-180" : ""}`} aria-hidden="true">
        <path d="M7 11v9m0-9 3.4-6.8A2 2 0 0 1 14 5v4h4.4a2 2 0 0 1 2 2.4l-1.2 6A2 2 0 0 1 17.2 19H7m0-8H4v9h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  );
}

function MoveDestinationButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ov-pill ov-border ov-text-muted mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl border text-[12px] font-semibold transition active:scale-[0.97]"
      aria-label="Mover destino para buscar otra ruta"
    >
      Mover destino
    </button>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M8.59 13.51l6.83 3.98m-.01-10.98-6.82 3.98M21 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm0 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM3 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TransferIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-avocado-400" aria-hidden="true">
      <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3M12 8v8M9 11l3-3 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TripToggleButton({
  active,
  className = "mt-2",
  label,
  onClick,
}: {
  active: boolean;
  className?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${className} inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[12px] font-bold transition active:scale-[0.98] ${active ? "ov-pill ov-border ov-text border" : "bg-lima text-ink-900 shadow-[0_4px_16px_rgba(181,239,48,0.22)]"}`}
      aria-label={active ? "Finalizar viaje" : label}
    >
      {active ? (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
          <path d="M7 7l10 10M17 7 7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
          <path d="m9 7 8 5-8 5V7Z" fill="currentColor" />
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      )}
      {active ? "Finalizar viaje" : "Iniciar viaje"}
    </button>
  );
}

import type { TripJourney, TripProgress } from "@/lib/trip-mode";

type TripLocationStatus = "locating" | "ready" | "unavailable";

type TripModePanelProps = {
  journey: TripJourney;
  progress: TripProgress | null;
  locationStatus: TripLocationStatus;
  onStop: () => void;
};

function getTripCopy(
  journey: TripJourney,
  progress: TripProgress | null,
  locationStatus: TripLocationStatus,
) {
  if (locationStatus === "unavailable") {
    return {
      eyebrow: "GPS NO DISPONIBLE",
      title: "Conservamos tu último avance",
      detail: "El seguimiento continuará cuando vuelva la señal.",
    };
  }

  if (!progress) {
    return {
      eyebrow: "CONECTANDO GPS",
      title: "Buscando tu ubicación",
      detail: "El recorrido ya está listo.",
    };
  }

  switch (progress.phase) {
    case "boarding":
      if (journey.boardingStopLabel) {
        return {
          eyebrow: "VE A LA ESTACIÓN",
          title: journey.boardingStopLabel,
          detail: progress.remainingMinutes
            ? `A ~${progress.remainingMinutes} min caminando`
            : "Acércate al acceso del Teleférico",
        };
      }
      return {
        eyebrow: "VE AL PUNTO DE SUBIDA",
        title: progress.currentRouteName ?? "Primera ruta",
        detail: progress.remainingMinutes
          ? `A ~${progress.remainingMinutes} min caminando`
          : "Acércate al inicio del recorrido",
      };
    case "riding-direct":
      return {
        eyebrow: "EN CAMINO",
        title: progress.currentRouteName ?? "Ruta activa",
        detail: journey.destinationStopLabel
          ? `Baja en la estación ${journey.destinationStopLabel} · ~${progress.remainingMinutes ?? 0} min`
          : `Bajada en ~${progress.remainingMinutes ?? 0} min`,
      };
    case "riding-first":
      return {
        eyebrow: "PRIMER TRAMO",
        title: progress.currentRouteName ?? (journey.kind === "transfer" ? journey.routeAName : "Ruta activa"),
        detail: journey.kind === "transfer" && journey.transferArrivalStopLabel
          ? `Baja en la estación ${journey.transferArrivalStopLabel} · ~${progress.remainingMinutes ?? 0} min`
          : `Transbordo en ~${progress.remainingMinutes ?? 0} min`,
      };
    case "walking-transfer":
      if (journey.kind === "transfer" && journey.transferBoardingStopLabel) {
        return {
          eyebrow: "VE A LA ESTACIÓN",
          title: journey.transferBoardingStopLabel,
          detail: `Para tomar ${progress.nextRouteName ?? "el Teleférico"} · ~${Math.round(progress.distanceToMilestoneM ?? 0)} m`,
        };
      }
      return {
        eyebrow: "TRANSBORDO",
        title: `Cambia a ${progress.nextRouteName ?? "la segunda ruta"}`,
        detail: `Punto de subida a ~${Math.round(progress.distanceToMilestoneM ?? 0)} m`,
      };
    case "riding-second":
      return {
        eyebrow: "SEGUNDO TRAMO",
        title: progress.currentRouteName ?? "Segunda ruta",
        detail: journey.destinationStopLabel
          ? `Baja en la estación ${journey.destinationStopLabel} · ~${progress.remainingMinutes ?? 0} min`
          : `Bajada en ~${progress.remainingMinutes ?? 0} min`,
      };
    case "walking-destination":
      return {
        eyebrow: "ÚLTIMO TRAMO",
        title: "Camina a tu destino",
        detail: `Faltan ~${Math.round(progress.distanceToMilestoneM ?? 0)} m · ${progress.remainingMinutes ?? 0} min`,
      };
    case "off-route":
      return {
        eyebrow: "FUERA DEL RECORRIDO",
        title: "Vuelve hacia el trazo marcado",
        detail: "Tu viaje sigue activo.",
      };
    case "arrived":
      return {
        eyebrow: "DESTINO",
        title: "Llegaste",
        detail: "Viaje completado.",
      };
  }
}

export default function TripModePanel({
  journey,
  progress,
  locationStatus,
  onStop,
}: TripModePanelProps) {
  const copy = getTripCopy(journey, progress, locationStatus);
  const percent = Math.round((progress?.progressRatio ?? 0) * 100);

  return (
    <section
      aria-label="Modo viaje"
      className="pointer-events-auto absolute inset-x-3 z-40 lg:inset-x-auto lg:bottom-5 lg:left-1/2 lg:w-[430px] lg:-translate-x-1/2"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="ov-panel ov-border overflow-hidden rounded-2xl border shadow-[0_12px_40px_rgba(0,0,0,0.38)] backdrop-blur-xl">
        <div className="flex items-center gap-3 px-3.5 py-3">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lima/15 text-lima">
            {locationStatus === "locating" ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                <path d="M5 17h14M5 17a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2M5 17v2m14-2v2M3 10h18M7.5 13.5h.01M16.5 13.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {locationStatus === "ready" ? (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-900 bg-emerald-400" aria-hidden="true" />
            ) : null}
          </span>

          <div className="min-w-0 flex-1" role="status" aria-live="polite">
            <p className="text-[9px] font-bold tracking-[1.5px] text-lima">{copy.eyebrow}</p>
            <p className="ov-text text-[14px] font-bold leading-5">{copy.title}</p>
            <p className="ov-text-muted text-[11px] leading-4">{copy.detail}</p>
          </div>

          <button
            type="button"
            onClick={onStop}
            className="ov-pill ov-border ov-text-muted inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[11px] font-semibold transition hover:border-red-400/50 hover:text-red-400 active:scale-[0.97]"
            aria-label={progress?.phase === "arrived" ? "Cerrar viaje completado" : "Finalizar viaje"}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M7 7l10 10M17 7 7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {progress?.phase === "arrived" ? "Cerrar" : "Finalizar"}
          </button>
        </div>

        <div className="h-1 bg-black/20" aria-hidden="true">
          <div
            className="h-full bg-lima transition-[width] duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </section>
  );
}

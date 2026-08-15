"use client";

import { useEffect, useRef } from "react";
import { LocateFixed, X } from "lucide-react";

type NearbyToastProps = {
  count: number | null; // null = hidden, 0 = no routes, >0 = count
  onView: () => void;
  onDismiss: () => void;
};

const AUTO_DISMISS_MS = 10000;

export default function NearbyToast({ count, onView, onDismiss }: NearbyToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDismissRef = useRef(onDismiss);
  const visible = count !== null;

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  // Auto-dismiss after 10 s whenever the toast becomes visible
  useEffect(() => {
    if (!visible) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onDismissRef.current(), AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, count]);

  if (count === null) return null;

  const displayedCount = count;
  const hasRoutes = displayedCount > 0;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none flex animate-fade-up justify-center"
    >
      <div
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        className={`ov-panel ov-text pointer-events-auto inline-flex items-center gap-2 rounded-md border px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl ${
          hasRoutes
            ? "border-lima/35"
            : "border-amber-400/30"
        }`}
      >
        {hasRoutes ? (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-lima/15 text-lima">
            <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        ) : (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-400/15 text-amber-300">
            <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        )}

        <span className="text-[13px] font-semibold leading-none">
          {hasRoutes ? (
            <>
              <span className="font-bold text-lima">{displayedCount}</span> ruta{displayedCount === 1 ? "" : "s"} cercana{displayedCount === 1 ? "" : "s"} a ti
            </>
          ) : displayedCount === 0 ? (
            "No hay rutas cercanas a tu ubicación"
          ) : null}
        </span>

        {hasRoutes && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onView();
              onDismiss();
            }}
            className="rounded-md bg-lima px-3 py-1.5 text-[12px] font-bold text-ink-900 transition hover:brightness-105 active:scale-[0.97]"
          >
            Ver
          </button>
        )}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDismiss();
          }}
          aria-label="Cerrar aviso"
          className="ov-text-muted ml-0.5 grid h-7 w-7 place-items-center rounded-md transition hover:bg-foreground/10 hover:text-foreground active:scale-[0.95]"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";

type NearbyToastProps = {
  count: number | null; // null = hidden, 0 = no routes, >0 = count
  onView: () => void;
  onDismiss: () => void;
};

const AUTO_DISMISS_MS = 6000;

export default function NearbyToast({ count, onView, onDismiss }: NearbyToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visible = count !== null;

  // Auto-dismiss after 6 s whenever the toast becomes visible
  useEffect(() => {
    if (!visible) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onDismiss, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, count, onDismiss]);

  const hasRoutes = count !== null && count > 0;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`pointer-events-none flex justify-center transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
      }`}
    >
      <div
        className={`pointer-events-auto inline-flex items-center gap-2.5 rounded-full border px-4 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-300 ${
          hasRoutes
            ? "border-cyan-400/30 bg-slate-900/85 text-slate-50"
            : "border-red-400/25 bg-slate-900/85 text-cream-100/75"
        }`}
      >
        {/* Icon */}
        {hasRoutes ? (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20">
            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 text-cyan-400" aria-hidden="true">
              <circle cx="12" cy="12" r="4" fill="currentColor" />
              <path
                d="M12 2v3M12 19v3M2 12h3M19 12h3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
        ) : (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/15">
            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 text-red-400" aria-hidden="true">
              <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </span>
        )}

        {/* Message */}
        <span className="text-[13px] font-medium leading-none">
          {hasRoutes ? (
            <>
              <span className="font-bold text-cyan-400">{count}</span> ruta{count === 1 ? "" : "s"} cercana{count === 1 ? "" : "s"} a ti
            </>
          ) : (
            "No hay rutas cercanas a tu ubicacion"
          )}
        </span>

        {/* "Ver" button (only when there are routes) */}
        {hasRoutes && (
          <button
            type="button"
            onClick={() => {
              onView();
              onDismiss();
            }}
            className="rounded-full bg-cyan-500 px-3 py-1 text-[12px] font-semibold text-cream-50 transition active:scale-[0.97] hover:bg-cyan-400"
          >
            Ver
          </button>
        )}

        {/* Dismiss ✕ */}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar aviso"
          className="ml-0.5 rounded-full p-1 text-cream-100/60 transition hover:text-cream-100/85 active:scale-[0.95]"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

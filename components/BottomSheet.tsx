"use client";

import { type PointerEvent, type ReactNode, useEffect, useRef, useState } from "react";

type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
};

export default function BottomSheet({ open, onOpenChange, title, children }: BottomSheetProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pointerStartY = useRef<number | null>(null);

  // Solo bloquear el scroll en mobile (el sidebar desktop tiene su propio scroll)
  useEffect(() => {
    if (!open) {
      return;
    }

    // En desktop (md+) el sidebar no necesita bloquear el body
    if (window.matchMedia("(min-width: 768px)").matches) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Drag handlers solo aplican en mobile
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    if ((event.target as HTMLElement).closest("button")) {
      return;
    }

    pointerStartY.current = event.clientY;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStartY.current === null) {
      return;
    }

    const diff = event.clientY - pointerStartY.current;

    if (diff > 0) {
      setDragOffset(Math.min(diff, 260));
    }
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (dragOffset > 120) {
      onOpenChange(false);
    }

    setIsDragging(false);
    setDragOffset(0);
    pointerStartY.current = null;
  };

  return (
    <>
      {/* Overlay: solo visible en mobile — en desktop el sidebar no necesita backdrop */}
      <div
        onClick={() => onOpenChange(false)}
        className={`fixed inset-0 z-30 bg-slate-950/52 backdrop-blur-[10px] transition-opacity duration-300 md:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* ── MOBILE: Bottom Sheet ──────────────────────────────────────────────── */}
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={open ? { transform: `translateY(${dragOffset}px)` } : undefined}
        className={`fixed inset-x-0 bottom-0 z-40 h-[80dvh] rounded-t-[30px] border border-white/15 bg-[var(--surface-strong)] shadow-soft backdrop-blur-2xl transition-[transform,opacity] will-change-transform md:hidden ${
          open ? "translate-y-0 opacity-100" : "translate-y-[102%] opacity-95"
        } ${isDragging ? "duration-100" : "duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"}`}
      >
        {/* Header con drag handle */}
        <header
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          className="relative border-b border-white/8 px-5 pb-4 pt-3.5"
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
          <p className="pr-12 font-display text-lg font-bold text-slate-100">{title}</p>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-2.5 rounded-full bg-white/5 p-2.5 text-slate-200 transition hover:bg-white/10 active:scale-[0.97]"
            aria-label="Cerrar panel"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div
          className="h-[calc(80dvh-78px)] overflow-y-auto overscroll-contain px-5 pt-5"
          style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {children}
        </div>
      </section>

      {/* ── DESKTOP: Sidebar panel (md+) ─────────────────────────────────────── */}
      {/*
        En desktop el "sheet" se convierte en un panel que aparece superpuesto
        sobre el sidebar izquierdo existente, usando un backdrop lateral suave.
        El sidebar principal siempre esta visible; este panel es la lista de rutas
        que se abre desde el boton de rutas en mobile, pero en desktop se gestiona
        desde el sidebar directamente (ver page.tsx). Este bloque queda como
        fallback para contextos donde BottomSheet se use independientemente.
      */}
      <div
        aria-hidden={!open}
        className={`pointer-events-none fixed inset-0 z-30 hidden transition-opacity duration-300 md:block ${
          open ? "pointer-events-auto opacity-100" : "opacity-0"
        }`}
        onClick={() => onOpenChange(false)}
      />
    </>
  );
}

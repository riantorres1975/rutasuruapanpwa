"use client";

import { type PointerEvent, type ReactNode, useEffect, useRef, useState } from "react";

type SnapPoint = "mini" | "full";

type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  /** Altura del estado mini en px. Default 88. Solo aplica si snapPoints está activo. */
  miniHeight?: number;
  /** Si se pasa, el sheet tiene dos snaps: mini y full. */
  snapPoints?: true;
  /** Snap actual controlado desde fuera. */
  snap?: SnapPoint;
  onSnapChange?: (snap: SnapPoint) => void;
};

export default function BottomSheet({
  open,
  onOpenChange,
  title,
  children,
  miniHeight = 88,
  snapPoints,
  snap: snapProp,
  onSnapChange,
}: BottomSheetProps) {
  const [internalSnap, setInternalSnap] = useState<SnapPoint>("mini");
  const snap = snapProp ?? internalSnap;
  const setSnap = (s: SnapPoint) => {
    setInternalSnap(s);
    onSnapChange?.(s);
  };

  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pointerStartY = useRef<number | null>(null);
  const snapAtDragStart = useRef<SnapPoint>("mini");

  // Cuando se abre en modo snap, empezar en mini
  useEffect(() => {
    if (open && snapPoints) setSnap("mini");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Bloquear scroll del body solo en full
  useEffect(() => {
    if (!open || (snapPoints && snap === "mini")) return;
    if (window.matchMedia("(min-width: 768px)").matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open, snap, snapPoints]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button")) return;
    pointerStartY.current = event.clientY;
    snapAtDragStart.current = snap;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStartY.current === null) return;
    const diff = event.clientY - pointerStartY.current;
    if (diff > 0) setDragOffset(Math.min(diff, 320));
    if (diff < 0 && snapPoints && snapAtDragStart.current === "mini") {
      setDragOffset(Math.max(diff, -180));
    }
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (snapPoints) {
      if (snapAtDragStart.current === "mini") {
        if (dragOffset < -60) setSnap("full");
        else if (dragOffset > 60) onOpenChange(false);
      } else {
        if (dragOffset > 100) setSnap("mini");
      }
    } else {
      if (dragOffset > 120) onOpenChange(false);
    }

    setIsDragging(false);
    setDragOffset(0);
    pointerStartY.current = null;
  };

  // Altura y transform según snap
  const isMini = snapPoints && snap === "mini";
  const sheetHeight = isMini ? `${miniHeight}px` : "80dvh";

  // translateY: cuando está mini, deslizar hasta que solo sobresalga miniHeight
  // La hoja mide 80dvh en full, así que en mini debe estar desplazada (80dvh - miniHeight) hacia abajo.
  const miniTranslate = isMini ? `calc(80dvh - ${miniHeight}px)` : "0px";
  const baseTransform = open ? `translateY(calc(${miniTranslate} + ${dragOffset}px))` : "translateY(102%)";

  return (
    <>
      {/* Backdrop — solo en full, no en mini */}
      <div
        onClick={() => (snapPoints && snap === "full" ? setSnap("mini") : onOpenChange(false))}
        className={`fixed inset-0 z-30 bg-slate-950/52 backdrop-blur-[10px] transition-opacity duration-300 md:hidden ${
          open && (!snapPoints || snap === "full")
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* ── MOBILE: Bottom Sheet ── */}
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ transform: baseTransform, height: "80dvh" }}
        className={`fixed inset-x-0 bottom-0 z-40 rounded-t-[28px] border border-white/15 bg-[var(--surface-strong)] shadow-soft backdrop-blur-2xl will-change-transform md:hidden ${
          isDragging ? "transition-none" : "transition-[transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        }`}
      >
        {/* Header con drag handle */}
        <header
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          className="relative cursor-grab touch-none select-none border-b border-white/8 px-5 pb-4 pt-3.5 active:cursor-grabbing"
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />

          {snapPoints ? (
            /* En modo snap: la cabecera es solo el handle + contenido mini */
            <div
              className="flex items-center gap-3"
              onClick={() => !isDragging && setSnap(snap === "mini" ? "full" : "mini")}
            >
              <p className="flex-1 font-display text-[15px] font-bold text-slate-100">{title}</p>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ${snap === "full" ? "rotate-180" : ""}`}
                aria-hidden="true"
              >
                <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          ) : (
            <>
              <p className="pr-12 font-display text-lg font-bold text-slate-100">{title}</p>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="absolute right-4 top-2.5 rounded-full bg-white/5 p-2.5 text-slate-200 transition hover:bg-white/10 active:scale-[0.97]"
                aria-label="Cerrar panel"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </>
          )}
        </header>

        <div
          className={`overflow-y-auto overscroll-contain px-5 pt-5 transition-opacity duration-200 ${
            snapPoints && snap === "mini" ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
          style={{
            height: "calc(80dvh - 78px)",
            paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {children}
        </div>
      </section>

      {/* ── DESKTOP: backdrop fallback ── */}
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

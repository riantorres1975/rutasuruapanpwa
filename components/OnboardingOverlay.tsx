"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "rutas-uru-onboarded";

// ─── Step data ────────────────────────────────────────────────────────────────

type Step = {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: string; // Tailwind arbitrary color for the icon glow ring
};

const steps: Step[] = [
  {
    accentColor: "rgba(232,93,47,0.18)",  // terracota
    title: "Marca tu origen",
    description: "Toca cualquier punto del mapa para marcar desde dónde sales (punto A).",
    icon: (
      // Map-pin icon
      <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10" aria-hidden="true">
        <path
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z"
          fill="currentColor"
          fillOpacity={0.15}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="9" r="2.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    accentColor: "rgba(123,160,91,0.20)", // avocado-400
    title: "Marca tu destino",
    description: "Toca el mapa de nuevo para fijar a dónde quieres llegar (punto B).",
    icon: (
      // Flag icon
      <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10" aria-hidden="true">
        <path
          d="M5 21V4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M5 4h10l-2.5 4L15 12H5"
          fill="currentColor"
          fillOpacity={0.15}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    accentColor: "rgba(244,235,217,0.16)", // cream
    title: "Te sugerimos la mejor ruta",
    description: "Nuestro motor compara las 40 rutas reales y te muestra la opción más rápida automáticamente.",
    icon: (
      // Bus icon
      <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10" aria-hidden="true">
        <rect
          x="3" y="4" width="18" height="14" rx="2"
          fill="currentColor"
          fillOpacity={0.12}
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path d="M3 9h18" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 18v2M16 18v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="7.5" cy="14" r="1" fill="currentColor" />
        <circle cx="16.5" cy="14" r="1" fill="currentColor" />
        <path d="M8 4v5M16 4v5" stroke="currentColor" strokeWidth="1.2" strokeOpacity={0.5} />
      </svg>
    ),
  },
];

// ─── Dot indicator ────────────────────────────────────────────────────────────

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`block rounded-full transition-all duration-300 ${
            i === current
              ? "h-2 w-6 bg-terracota-400"
              : "h-2 w-2 bg-cream-100/20"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);

  // Swipe state
  const touchStartX = useRef<number | null>(null);
  const dragX = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  // Check localStorage on mount (client-only)
  useEffect(() => {
    setMounted(true);
    try {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) setVisible(true);
    } catch {
      // localStorage unavailable (private mode, etc.) — skip onboarding
    }
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  const goNext = useCallback(() => {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }, [step, dismiss]);

  // ── Pointer / touch swipe ──────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    touchStartX.current = e.clientX;
    dragX.current = 0;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.clientX - touchStartX.current;
    dragX.current = dx;
    setDragOffset(dx);
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      const dx = dragX.current;
      touchStartX.current = null;
      dragX.current = 0;
      setDragging(false);
      setDragOffset(0);

      if (dx < -60 && step < steps.length - 1) {
        // swipe left → next
        setStep((s) => s + 1);
      } else if (dx > 60 && step > 0) {
        // swipe right → prev
        setStep((s) => s - 1);
      }
    },
    [step]
  );

  // Keyboard support
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
      if (e.key === "ArrowRight") setStep((s) => Math.min(s + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, dismiss]);

  // Don't render anything on server
  if (!mounted) return null;

  const isLast = step === steps.length - 1;
  const current = steps[step];

  return (
    <>
      {/* ── Backdrop ───────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={dismiss}
        className={`fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[8px] transition-opacity duration-500 ${
          visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* ── Card ───────────────────────────────────────────────────────────── */}
      {/*
        Posicionamiento:
        - Mobile (< md): inset-x-4 bottom-10 — centrado en toda la pantalla, sobre el mapa.
        - Desktop (md+): centrado sobre el área del mapa (excluye el sidebar ~380-420px).
          Usamos left-[380px] en md y left-[420px] en lg para que el centro calculado
          sea solo sobre el mapa. bottom-10 se mantiene para que aparezca en zona inferior visible.
      */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Bienvenida a VoyUruapan"
        aria-live="polite"
        className={`fixed z-50 mx-auto max-w-sm rounded-3xl border border-cream-100/15 bg-[var(--surface-strong)] shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-all duration-500 will-change-transform
          inset-x-4 bottom-10
          md:inset-x-auto md:bottom-10 md:left-[calc(380px+5%)] md:right-[5%]
          lg:left-[calc(420px+5%)] lg:right-[5%]
          ${
          visible
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-10 opacity-0 pointer-events-none"
        }`}
        // prevent backdrop click from propagating
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Skip button (top-right) ─────────────────────────────────────── */}
        {!isLast && (
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-4 top-4 z-10 rounded-full border border-cream-100/10 bg-cream-100/5 px-2.5 py-1 text-[12px] font-medium text-cream-100/60 transition hover:bg-cream-100/10 hover:text-cream-100/85 active:scale-[0.97]"
            aria-label="Saltar introducción"
          >
            Saltar
          </button>
        )}

        {/* ── Swipeable slide area ────────────────────────────────────────── */}
        <div
          className="select-none overflow-hidden rounded-3xl"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ cursor: dragging ? "grabbing" : "grab" }}
        >
          <div
            className={`transition-transform ${dragging ? "duration-0" : "duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"}`}
            style={{ transform: `translateX(${Math.max(-80, Math.min(80, dragOffset * 0.15))}px)` }}
          >
            {/* ── Icon area ────────────────────────────────────────────────── */}
            <div className="flex flex-col items-center gap-6 px-7 pb-2 pt-8">
              {/* Animated icon wrapper */}
              <div
                className="relative flex h-24 w-24 items-center justify-center rounded-full transition-all duration-500"
                style={{ background: current.accentColor, boxShadow: `0 0 40px ${current.accentColor}` }}
                key={step} // re-mount to retrigger animation on step change
              >
                {/* Pulse ring */}
                <span
                  className="absolute inset-0 animate-ping rounded-full opacity-30"
                  style={{ background: current.accentColor }}
                  aria-hidden="true"
                />
                <span className="relative transition-colors duration-500"
                  style={{ color: step === 0 ? "#E85D2F" : step === 1 ? "#7BA05B" : "#FBF5E8" }}
                >
                  {current.icon}
                </span>
              </div>

              {/* Step number */}
              <p className="text-[11px] font-semibold uppercase tracking-widest text-cream-100/50 dark:text-cream-100/60">
                Paso {step + 1} de {steps.length}
              </p>

              {/* Title */}
              <h2 className="text-center font-serif-display text-2xl font-black leading-snug tracking-tight text-cream-50">
                {current.title}
              </h2>

              {/* Description */}
              <p className="text-center text-[14px] leading-relaxed text-cream-100/60">
                {current.description}
              </p>
            </div>
          </div>
        </div>

        {/* ── Footer: dots + button ───────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 border-t border-cream-100/8 px-7 py-5">
          <StepDots total={steps.length} current={step} />

          <button
            type="button"
            onClick={goNext}
            className={`inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-[14px] font-semibold transition active:scale-[0.97] ${
              isLast
                ? "bg-terracota-400 text-cream-50 shadow-[0_4px_20px_rgba(232,93,47,0.40)] hover:bg-terracota-500"
                : "border border-cream-100/15 bg-cream-100/8 text-cream-50 hover:bg-cream-100/15"
            }`}
          >
            {isLast ? (
              <>
                Empezar
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            ) : (
              <>
                Siguiente
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

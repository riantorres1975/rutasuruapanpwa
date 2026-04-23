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

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

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
      <div
        onClick={() => onOpenChange(false)}
        className={`fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-[6px] transition-opacity duration-300 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={open ? { transform: `translateY(${dragOffset}px)` } : undefined}
        className={`fixed inset-x-0 bottom-0 z-40 h-[80dvh] rounded-t-[30px] border border-white/20 bg-[var(--surface-strong)] shadow-soft backdrop-blur-2xl transition-[transform,opacity] will-change-transform ${
          open ? "translate-y-0 opacity-100" : "translate-y-[102%] opacity-95"
        } ${isDragging ? "duration-100" : "duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"}`}
      >
        <header
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          className="relative border-b border-slate-200/65 px-5 pb-3.5 pt-3 dark:border-slate-700/65"
        >
          <div className="mx-auto mb-2.5 h-1.5 w-14 rounded-full bg-slate-300/90 dark:bg-slate-600/90" />
          <p className="pr-12 text-base font-semibold text-slate-900 dark:text-slate-100">{title}</p>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-2.5 rounded-full bg-slate-900/5 p-2.5 text-slate-700 transition hover:bg-slate-900/10 active:scale-[0.97] dark:bg-slate-100/10 dark:text-slate-200 dark:hover:bg-slate-100/20"
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

        <div className="h-[calc(80dvh-78px)] overflow-y-auto overscroll-contain px-5 pb-8 pt-5">{children}</div>
      </section>
    </>
  );
}

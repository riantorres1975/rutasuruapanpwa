"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BadgeDollarSign, BusFront, CableCar, CreditCard, X } from "lucide-react";
import {
  FARE_UPDATE_ANNOUNCEMENT,
  getAnnouncementDismissalKey,
  isAnnouncementActive,
} from "@/lib/fare-update-announcement";
import { FARES_2026 } from "@/lib/mobility-config";
import {
  ONBOARDING_COMPLETED_EVENT,
  ONBOARDING_STORAGE_KEY,
} from "@/lib/onboarding";

type FareUpdateNoticeProps = {
  deferUntilOnboarding?: boolean;
};

const DISMISSAL_KEY = getAnnouncementDismissalKey(FARE_UPDATE_ANNOUNCEMENT.id);

export default function FareUpdateNotice({
  deferUntilOnboarding = false,
}: FareUpdateNoticeProps) {
  const [visible, setVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(DISMISSAL_KEY, new Date().toISOString());
    } catch {
      // The notice can still be closed when storage is unavailable.
    }
    setVisible(false);
  }, []);

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | undefined;

    const canShow = () => {
      if (!isAnnouncementActive(FARE_UPDATE_ANNOUNCEMENT)) return false;

      try {
        if (window.localStorage.getItem(DISMISSAL_KEY)) return false;
        if (
          deferUntilOnboarding &&
          window.localStorage.getItem(ONBOARDING_STORAGE_KEY) !== "1"
        ) {
          return false;
        }
      } catch {
        return !deferUntilOnboarding;
      }

      return true;
    };

    const scheduleNotice = () => {
      if (!canShow() || showTimer) return;
      showTimer = setTimeout(() => setVisible(true), 650);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === DISMISSAL_KEY && event.newValue) {
        setVisible(false);
        return;
      }
      if (event.key === ONBOARDING_STORAGE_KEY) scheduleNotice();
    };

    scheduleNotice();
    window.addEventListener("storage", handleStorage);
    window.addEventListener(ONBOARDING_COMPLETED_EVENT, scheduleNotice);

    return () => {
      if (showTimer) clearTimeout(showTimer);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(ONBOARDING_COMPLETED_EVENT, scheduleNotice);
    };
  }, [deferUntilOnboarding]);

  useEffect(() => {
    if (!visible) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [dismiss, visible]);

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (
      event.shiftKey &&
      (document.activeElement === first || document.activeElement === dialogRef.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!visible) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-6 sm:px-6">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/60 backdrop-blur-[3px]"
        onClick={dismiss}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fare-update-title"
        aria-describedby="fare-update-description"
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className="animate-fade-up relative max-h-[calc(100dvh-2rem)] w-full max-w-[430px] overflow-y-auto rounded-lg border border-white/10 bg-ink-900 text-cream-50 shadow-[0_28px_90px_rgba(0,0,0,0.72)] outline-none"
      >
        <div className="h-1 w-full bg-verde" aria-hidden="true" />
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar aviso de tarifa"
          className="absolute right-3 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-cream-50/65 transition hover:border-verde/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verde"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="px-6 pb-6 pt-7 sm:px-8 sm:pb-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-verde text-white">
            <BadgeDollarSign className="h-6 w-6" aria-hidden="true" />
          </div>

          <p className="pr-12 text-[11px] font-black uppercase tracking-[0.16em] text-[#91cf70]">
            Tarifa actualizada
          </p>
          <h2
            id="fare-update-title"
            className="mt-2 font-serif-display text-[34px] font-black leading-none text-cream-50 sm:text-[38px]"
          >
            Nueva tarifa:{" "}
            <span
              data-testid="fare-update-amount"
              className="font-sans text-[0.9em] font-black tabular-nums tracking-normal text-white"
            >
              {FARES_2026.urbanBus.price}
            </span>
          </h2>
          <p
            id="fare-update-description"
            className="mt-4 text-[15px] font-medium leading-6 text-cream-50/70"
          >
            El camión urbano y el Teleférico ahora cuestan $12.00 por viaje.
          </p>

          <div className="mt-6 divide-y divide-white/10 border-y border-white/10">
            <div className="flex items-center gap-3 py-4">
              <BusFront className="h-5 w-5 shrink-0 text-[#91cf70]" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-cream-50">Camión urbano</p>
                <p className="mt-0.5 text-xs text-cream-50/55">Pago en efectivo</p>
              </div>
              <span className="font-sans text-sm font-black tabular-nums text-white">{FARES_2026.urbanBus.price}</span>
            </div>
            <div className="flex items-center gap-3 py-4">
              <CableCar className="h-5 w-5 shrink-0 text-agua" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-cream-50">Teleférico Uruapan</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-cream-50/55">
                  <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                  Tarjeta de movilidad
                </p>
              </div>
              <span className="font-sans text-sm font-black tabular-nums text-white">{FARES_2026.teleferico.price}</span>
            </div>
          </div>

          <p className="mt-4 text-xs font-medium text-cream-50/50">
            Tarifa vigente desde agosto de 2026.
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-lg bg-verde px-5 text-sm font-black text-white transition hover:bg-[#78b957] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verde focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

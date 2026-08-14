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
  const actionRef = useRef<HTMLButtonElement>(null);

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
    actionRef.current?.focus();

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
    if (event.shiftKey && document.activeElement === first) {
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
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={dismiss}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fare-update-title"
        aria-describedby="fare-update-description"
        onKeyDown={handleDialogKeyDown}
        className="animate-fade-up relative max-h-[calc(100dvh-2rem)] w-full max-w-[430px] overflow-y-auto rounded-lg border border-lima/30 bg-ink-950 text-crema shadow-[0_28px_90px_rgba(0,0,0,0.55)]"
      >
        <div className="h-1 w-full bg-lima" aria-hidden="true" />
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar aviso de tarifa"
          className="absolute right-3 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-crema/70 transition hover:border-lima/50 hover:text-lima focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lima"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="px-6 pb-6 pt-7 sm:px-8 sm:pb-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-lima text-ink-950">
            <BadgeDollarSign className="h-6 w-6" aria-hidden="true" />
          </div>

          <p className="pr-12 text-[11px] font-black uppercase tracking-[0.16em] text-lima">
            Tarifa actualizada
          </p>
          <h2
            id="fare-update-title"
            className="mt-2 font-serif-display text-[34px] font-black leading-none text-crema sm:text-[38px]"
          >
            Nueva tarifa: {FARES_2026.urbanBus.price}
          </h2>
          <p
            id="fare-update-description"
            className="mt-4 text-[15px] font-medium leading-6 text-crema/70"
          >
            El camión urbano y el Teleférico ahora cuestan $12.00 por viaje.
          </p>

          <div className="mt-6 divide-y divide-white/10 border-y border-white/10">
            <div className="flex items-center gap-3 py-4">
              <BusFront className="h-5 w-5 shrink-0 text-lima" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-crema">Camión urbano</p>
                <p className="mt-0.5 text-xs text-crema/55">Pago en efectivo</p>
              </div>
              <span className="text-sm font-black text-crema">{FARES_2026.urbanBus.price}</span>
            </div>
            <div className="flex items-center gap-3 py-4">
              <CableCar className="h-5 w-5 shrink-0 text-[#00d4aa]" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-crema">Teleférico Uruapan</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-crema/55">
                  <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                  Tarjeta de movilidad
                </p>
              </div>
              <span className="text-sm font-black text-crema">{FARES_2026.teleferico.price}</span>
            </div>
          </div>

          <p className="mt-4 text-xs font-medium text-crema/50">
            Tarifa vigente desde agosto de 2026.
          </p>
          <button
            ref={actionRef}
            type="button"
            onClick={dismiss}
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-lg bg-lima px-5 text-sm font-black text-ink-950 transition hover:bg-lima/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lima focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

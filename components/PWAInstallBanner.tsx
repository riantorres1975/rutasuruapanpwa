"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "voy-pwa-banner-dismissed";
const IOS_DISMISSED_KEY = "voy-pwa-ios-hint-dismissed";
const IOS_HINT_DELAY_MS = 4000;

function isIosSafari(): boolean {
  const ua = window.navigator.userAgent;
  // iPadOS 13+ se reporta como Mac, pero con pantalla táctil.
  const isIos = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (!isIos) return false;
  // Excluir navegadores embebidos y de terceros (Chrome/Firefox/Edge en iOS).
  if (/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) return false;
  return true;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      try {
        if (localStorage.getItem(DISMISSED_KEY)) return;
      } catch {}
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Safari en iOS no dispara beforeinstallprompt: mostramos instrucciones manuales.
  useEffect(() => {
    if (!isIosSafari() || isStandalone()) return;
    try {
      if (localStorage.getItem(IOS_DISMISSED_KEY)) return;
    } catch {}
    const timer = window.setTimeout(() => setShowIosHint(true), IOS_HINT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "dismissed") {
      try { localStorage.setItem(DISMISSED_KEY, "1"); } catch {}
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, "1"); } catch {}
    setDeferredPrompt(null);
  };

  const handleIosDismiss = () => {
    try { localStorage.setItem(IOS_DISMISSED_KEY, "1"); } catch {}
    setShowIosHint(false);
  };

  if (showIosHint) {
    return (
      <div
        role="banner"
        className="fixed bottom-24 left-4 right-4 z-50 flex animate-fade-up items-start gap-3 rounded-2xl border border-avocado-400/30 bg-ink-900/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl md:bottom-6 md:left-auto md:right-6 md:w-96"
      >
        <div className="flex-1">
          <p className="font-serif-display text-sm font-black text-cream-50">Instala UruGo en tu iPhone</p>
          <p className="mt-1 text-xs leading-5 text-cream-100/60">
            Toca el botón{" "}
            <svg viewBox="0 0 24 24" fill="none" className="inline h-3.5 w-3.5 align-text-bottom text-cream-50" aria-label="Compartir">
              <path d="M12 3v12M8 7l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>{" "}
            <span className="font-semibold text-cream-50">Compartir</span> y luego{" "}
            <span className="font-semibold text-cream-50">“Agregar a pantalla de inicio”</span>.
            Sin App Store, funciona offline.
          </p>
        </div>
        <button
          onClick={handleIosDismiss}
          aria-label="Cerrar"
          className="shrink-0 text-cream-100/35 transition hover:text-cream-100/70"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    );
  }

  if (!deferredPrompt) return null;

  return (
    <div
      role="banner"
      className="fixed bottom-24 left-4 right-4 z-50 flex animate-fade-up items-center gap-3 rounded-2xl border border-avocado-400/30 bg-ink-900/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl md:bottom-6 md:left-auto md:right-6 md:w-80"
    >
      <div className="flex-1">
        <p className="font-serif-display text-sm font-black text-cream-50">Instala UruGo</p>
        <p className="mt-0.5 text-xs text-cream-100/60">Sin App Store · funciona offline</p>
      </div>
      <button
        onClick={handleInstall}
        className="cta-shine shrink-0 rounded-xl bg-verde px-4 py-2 text-xs font-black text-white hover:opacity-90"
      >
        Instalar
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Cerrar"
        className="shrink-0 text-cream-100/35 transition hover:text-cream-100/70"
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
          <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}

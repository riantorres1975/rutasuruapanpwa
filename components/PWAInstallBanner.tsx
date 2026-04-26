"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "voy-pwa-banner-dismissed";

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

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

  if (!deferredPrompt) return null;

  return (
    <div
      role="banner"
      className="fixed bottom-24 left-4 right-4 z-50 flex animate-fade-up items-center gap-3 rounded-2xl border border-avocado-400/30 bg-ink-900/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl md:bottom-6 md:left-auto md:right-6 md:w-80"
    >
      <div className="flex-1">
        <p className="font-serif-display text-sm font-black text-cream-50">Instala VoyUruapan</p>
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

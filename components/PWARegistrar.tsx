"use client";

import { useEffect, useState } from "react";

const SERVICE_WORKER_URL = "/sw.js";

export default function PWARegistrar() {
  const [pendingWorker, setPendingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: "/" });

        const notifyUpdate = (worker: ServiceWorker) => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            setPendingWorker(worker);
          }
        };

        if (registration.waiting) {
          notifyUpdate(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => notifyUpdate(worker));
        });
      } catch (error) {
        console.error("Service worker registration failed", error);
      }
    };

    if (document.readyState === "complete") {
      registerServiceWorker();
    } else {
      window.addEventListener("load", registerServiceWorker);
      return () => window.removeEventListener("load", registerServiceWorker);
    }
  }, []);

  const handleUpdate = () => {
    if (!pendingWorker) return;
    pendingWorker.postMessage({ type: "SKIP_WAITING" });
    setPendingWorker(null);
    // Reload once the new SW takes control
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    }, { once: true });
  };

  if (!pendingWorker) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 left-4 right-4 z-50 flex animate-fade-up items-center gap-3 rounded-2xl border border-avocado-400/30 bg-ink-900/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl md:bottom-6 md:left-auto md:right-6 md:w-80"
    >
      <div className="flex-1">
        <p className="font-serif-display text-sm font-black text-cream-50">Nueva versión disponible</p>
        <p className="mt-0.5 text-xs text-cream-100/60">Actualiza para obtener los últimos cambios</p>
      </div>
      <button
        onClick={handleUpdate}
        className="shrink-0 rounded-xl bg-verde px-4 py-2 text-xs font-black text-white hover:opacity-90"
      >
        Actualizar
      </button>
      <button
        onClick={() => setPendingWorker(null)}
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

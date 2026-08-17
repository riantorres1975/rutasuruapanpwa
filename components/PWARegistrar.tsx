"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const SERVICE_WORKER_URL = "/sw.js";
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
const UPDATE_CHECK_THROTTLE_MS = 60 * 1000;

export default function PWARegistrar() {
  const [pendingWorker, setPendingWorker] = useState<ServiceWorker | null>(null);
  const pendingWorkerRef = useRef<ServiceWorker | null>(null);
  const isReloadingRef = useRef(false);
  const reloadWhenVisibleRef = useRef(false);
  const reloadAfterControllerChangeRef = useRef(false);

  const activateWorker = useCallback((worker: ServiceWorker) => {
    pendingWorkerRef.current = null;
    setPendingWorker(null);
    reloadAfterControllerChangeRef.current = true;
    worker.postMessage({ type: "SKIP_WAITING" });
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;
    let lastUpdateCheckAt = 0;
    let disposed = false;

    const reloadWithNewWorker = () => {
      if (isReloadingRef.current) return;
      if (document.visibilityState !== "visible") {
        reloadWhenVisibleRef.current = true;
        return;
      }
      isReloadingRef.current = true;
      window.location.reload();
    };

    const checkForUpdate = async (force = false) => {
      if (!registration || navigator.onLine === false) return;
      const now = Date.now();
      if (!force && now - lastUpdateCheckAt < UPDATE_CHECK_THROTTLE_MS) return;
      lastUpdateCheckAt = now;
      await registration.update().catch(() => undefined);
    };

    const queueUpdate = (worker: ServiceWorker) => {
      if (
        worker.state !== "installed" ||
        !navigator.serviceWorker.controller ||
        disposed
      ) {
        return;
      }

      pendingWorkerRef.current = worker;
      if (document.visibilityState === "hidden") {
        activateWorker(worker);
      } else {
        setPendingWorker(worker);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (pendingWorkerRef.current) activateWorker(pendingWorkerRef.current);
        return;
      }
      if (reloadWhenVisibleRef.current) {
        reloadWhenVisibleRef.current = false;
        reloadWithNewWorker();
        return;
      }
      void checkForUpdate();
    };

    const handleFocus = () => void checkForUpdate();
    const handleOnline = () => void checkForUpdate(true);
    const handleControllerChange = () => {
      if (!reloadAfterControllerChangeRef.current) return;
      reloadAfterControllerChangeRef.current = false;
      reloadWithNewWorker();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);

    const registerServiceWorker = async () => {
      try {
        registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
          scope: "/",
          updateViaCache: "none",
        });
        if (disposed) return;

        if (registration.waiting) {
          // Es una actualización descargada en una sesión anterior. Activarla
          // al abrir evita que la PWA siga usando el build antiguo.
          activateWorker(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const worker = registration?.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => queueUpdate(worker));
        });

        await checkForUpdate(true);
      } catch (error) {
        console.error("Service worker registration failed", error);
      }
    };

    if (document.readyState === "complete") {
      registerServiceWorker();
    } else {
      window.addEventListener("load", registerServiceWorker);
    }

    const updateTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") void checkForUpdate();
    }, UPDATE_CHECK_INTERVAL_MS);

    return () => {
      disposed = true;
      window.clearInterval(updateTimer);
      window.removeEventListener("load", registerServiceWorker);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, [activateWorker]);

  const handleUpdate = () => {
    if (!pendingWorker) return;
    activateWorker(pendingWorker);
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
        className="shrink-0 rounded-xl bg-verde px-4 py-2 text-xs font-black text-ink-900 hover:opacity-90"
      >
        Actualizar
      </button>
      <button
        onClick={() => setPendingWorker(null)}
        aria-label="Cerrar"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-cream-100/35 transition hover:bg-white/5 hover:text-cream-100/70"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

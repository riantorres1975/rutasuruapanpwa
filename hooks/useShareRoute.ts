"use client";

import { useCallback, useState } from "react";

export type ShareStatus = "idle" | "shared" | "copied" | "error";

const APP_URL = "https://rutasuruapan.vercel.app"; // change to your prod URL

export function useShareRoute() {
  const [status, setStatus] = useState<ShareStatus>("idle");

  const share = useCallback(async (routeName: string) => {
    const text = `Toma la ${routeName} en Uruapan 🚌 Consulta todas las rutas en: ${APP_URL}`;

    // Reset after 2 s
    const reset = () => setTimeout(() => setStatus("idle"), 2000);

    // Prefer native share sheet (mobile)
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "Rutas Uruapan",
          text,
          url: APP_URL,
        });
        setStatus("shared");
        reset();
        return;
      } catch {
        // User cancelled — treat as idle, not error
        return;
      }
    }

    // Fallback: copy to clipboard
    try {
      await (navigator as any).clipboard.writeText(text);
      setStatus("copied");
      reset();
    } catch {
      setStatus("error");
      reset();
    }
  }, []);

  return { share, status };
}

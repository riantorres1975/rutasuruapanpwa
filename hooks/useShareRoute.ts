"use client";

import { useCallback, useState } from "react";

export type ShareStatus = "idle" | "shared" | "copied" | "error";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://rutasuruapan.vercel.app";

export function useShareRoute() {
  const [status, setStatus] = useState<ShareStatus>("idle");

  const share = useCallback(async (routeName: string) => {
    const text = `Toma la ${routeName} en Uruapan 🚌 Consulta todas las rutas en: ${APP_URL}`;
    // Capture navigator reference to avoid TypeScript's "in" narrowing to never.
    // This hook is always client-side ("use client"), so navigator is always defined.
    const nav = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };

    // Reset after 2 s
    const reset = () => setTimeout(() => setStatus("idle"), 2000);

    // Prefer native share sheet (mobile)
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title: "Rutas Uruapan", text, url: APP_URL });
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
      await nav.clipboard.writeText(text);
      setStatus("copied");
      reset();
    } catch {
      setStatus("error");
      reset();
    }
  }, []);

  return { share, status };
}

"use client";

import { useCallback, useState } from "react";

export type ShareStatus = "idle" | "shared" | "copied" | "error";

const APP_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://rutasuruapanpwa.vercel.app";

export function useShareRoute() {
  const [status, setStatus] = useState<ShareStatus>("idle");

  const share = useCallback(async (routeName: string, routeId?: number) => {
    const routeUrl = routeId
      ? `${APP_URL}/mapa?ruta=${routeId}`
      : APP_URL;

    const text = `Toma la ${routeName} en Uruapan 🚌 Consúltala en:`;

    const nav = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };

    const reset = () => setTimeout(() => setStatus("idle"), 2000);

    if (typeof nav.share === "function") {
      try {
        await nav.share({ title: "VoyUruapan", text, url: routeUrl });
        setStatus("shared");
        reset();
        return;
      } catch {
        return;
      }
    }

    try {
      await nav.clipboard.writeText(`${text} ${routeUrl}`);
      setStatus("copied");
      reset();
    } catch {
      setStatus("error");
      reset();
    }
  }, []);

  return { share, status };
}

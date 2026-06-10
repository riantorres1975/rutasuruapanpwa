"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "urugo-favorite-routes";

function readFavorites(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string" && v.length > 0);
  } catch {
    return [];
  }
}

/**
 * Rutas favoritas del usuario, guardadas por nombre de ruta (estable entre
 * ida/vuelta) en localStorage. Hidrata en cliente para no romper SSR.
 */
export function useFavoriteRoutes() {
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setFavorites(new Set(readFavorites()));
  }, []);

  const toggleFavorite = useCallback((routeName: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(routeName)) {
        next.delete(routeName);
      } else {
        next.add(routeName);
      }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // localStorage no disponible: el estado vive solo en memoria.
      }
      return next;
    });
  }, []);

  return { favorites, toggleFavorite };
}

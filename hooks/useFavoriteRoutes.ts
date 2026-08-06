"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "urugo-favorite-routes";
const FAVORITES_EVENT = "urugo-favorites-changed";
const readFavoritesSnapshot = () => JSON.stringify(readFavorites());

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
  const serialized = useSyncExternalStore(
    (callback) => {
      window.addEventListener("storage", callback);
      window.addEventListener(FAVORITES_EVENT, callback);
      return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener(FAVORITES_EVENT, callback);
      };
    },
    readFavoritesSnapshot,
    () => "[]"
  );
  const favorites = useMemo(() => {
    try {
      const parsed: unknown = JSON.parse(serialized);
      return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []);
    } catch {
      return new Set<string>();
    }
  }, [serialized]);

  const toggleFavorite = useCallback((routeName: string) => {
    const next = new Set(readFavorites());
    if (next.has(routeName)) next.delete(routeName);
    else next.add(routeName);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      window.dispatchEvent(new Event(FAVORITES_EVENT));
    } catch {
      // localStorage no disponible.
    }
  }, []);

  return { favorites, toggleFavorite };
}

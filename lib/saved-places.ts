import type { PlaceResult } from "@/lib/geocode";

export type SavedSlot = "casa" | "trabajo";

export const SAVED_SLOT_LABELS: Record<SavedSlot, string> = {
  casa: "Casa",
  trabajo: "Trabajo",
};

const STORAGE_KEY = "urugo-saved-places";

type SavedPlaces = Partial<Record<SavedSlot, PlaceResult>>;

function isValidPlace(value: unknown): value is PlaceResult {
  if (!value || typeof value !== "object") return false;
  const place = value as Partial<PlaceResult>;
  return (
    typeof place.label === "string" &&
    place.label.length > 0 &&
    Array.isArray(place.center) &&
    place.center.length === 2 &&
    place.center.every((n) => typeof n === "number" && Number.isFinite(n)) &&
    place.source === "local"
  );
}

/** Lugares guardados con nombre fijo (Casa / Trabajo). */
export function getSavedPlaces(): SavedPlaces {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const result: SavedPlaces = {};
    for (const slot of ["casa", "trabajo"] as const) {
      const value = (parsed as Record<string, unknown>)[slot];
      if (isValidPlace(value)) result[slot] = value;
    }
    return result;
  } catch {
    return {};
  }
}

export function setSavedPlace(slot: SavedSlot, place: PlaceResult): void {
  if (typeof window === "undefined" || place.source !== "local") return;
  try {
    const next = { ...getSavedPlaces(), [slot]: place };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage no disponible: ignorar.
  }
}

import type { Coordinates } from "@/lib/types";

export type RecentTrip = {
  /** [lng, lat] */
  origin: Coordinates;
  /** [lng, lat] */
  destination: Coordinates;
  /** Etiqueta legible del destino (si se conoce) */
  destinationLabel: string | null;
  /** Ruta que se sugirió para este viaje (si hubo) */
  routeName: string | null;
  savedAt: number;
};

const STORAGE_KEY = "urugo-recent-trips";
export const RECENT_TRIPS_EVENT = "urugo-recent-trips-changed";
const MAX_TRIPS = 3;

function isValidCoords(value: unknown): value is Coordinates {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((n) => typeof n === "number" && Number.isFinite(n))
  );
}

function isValidTrip(value: unknown): value is RecentTrip {
  if (!value || typeof value !== "object") return false;
  const trip = value as Partial<RecentTrip>;
  return (
    isValidCoords(trip.origin) &&
    isValidCoords(trip.destination) &&
    (trip.destinationLabel === null || typeof trip.destinationLabel === "string") &&
    (trip.routeName === null || typeof trip.routeName === "string") &&
    typeof trip.savedAt === "number"
  );
}

/** Clave de dedupe: coordenadas redondeadas a ~11 m. */
function tripKey(trip: Pick<RecentTrip, "origin" | "destination">): string {
  const round = (n: number) => n.toFixed(4);
  return `${round(trip.origin[0])},${round(trip.origin[1])}>${round(trip.destination[0])},${round(trip.destination[1])}`;
}

/** Viajes A→B recientes (más reciente primero). */
export function getRecentTrips(): RecentTrip[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidTrip).slice(0, MAX_TRIPS);
  } catch {
    return [];
  }
}

export function addRecentTrip(trip: Omit<RecentTrip, "savedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const key = tripKey(trip);
    const rest = getRecentTrips().filter((t) => tripKey(t) !== key);
    const next: RecentTrip[] = [{ ...trip, savedAt: Date.now() }, ...rest].slice(0, MAX_TRIPS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(RECENT_TRIPS_EVENT));
  } catch {
    // localStorage no disponible: ignorar.
  }
}

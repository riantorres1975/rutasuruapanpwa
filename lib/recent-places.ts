import type { PlaceResult } from "@/lib/geocode";

const STORAGE_KEY = "urugo-recent-places";
const MAX_RECENT = 5;

function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

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

/** Destinos buscados recientemente (más reciente primero). */
export function getRecentPlaces(): PlaceResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidPlace).slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

/** Guarda un destino al frente de la lista de recientes (dedupe por label). */
export function addRecentPlace(place: PlaceResult): void {
  if (typeof window === "undefined" || place.source !== "local") return;
  try {
    const normalized = normalizeLabel(place.label);
    const rest = getRecentPlaces().filter((p) => normalizeLabel(p.label) !== normalized);
    const next = [place, ...rest].slice(0, MAX_RECENT);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage no disponible (modo privado, cuota llena): ignorar.
  }
}

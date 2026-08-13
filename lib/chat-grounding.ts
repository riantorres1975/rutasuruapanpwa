import rutasProduccion from "@/data/rutas_produccion_final.json";
import { CHAT_ALIASES } from "@/lib/chat-knowledge";
import { getFeaturedPlaceSeoItems, getRoutesNearPlace } from "@/lib/como-llegar";
import { haversineMeters } from "@/lib/geo";
import type { Coordinates } from "@/lib/types";

// ── Conocimiento geográfico del chatbot derivado del trazo GPS real ─────────
// Antes el bot usaba recorridos escritos a mano con coordenadas aproximadas
// (lib/chat-knowledge.ts), lo que producía errores como afirmar que la Ruta 2
// pasa por el Centro (su trazo real va a ~1.7 km). Todo lo geográfico se
// calcula aquí desde data/rutas_produccion_final.json, la misma fuente que
// usan el mapa y las páginas /como-llegar.

type RawRoute = {
  name: string;
  path: [number, number][];
};

const MAX_PLACE_ROUTES = 8;
const TELEFERICO_NAME = "teleférico";

type PlaceKnowledge = {
  label: string;
  routes: { name: string; distanceM: number }[];
};

type RouteLandmarkKnowledge = {
  routeName: string;
  landmarkName: string;
};

// Calculado una vez por instancia (mismo costo que un build de /como-llegar).
let placesCache: PlaceKnowledge[] | null = null;
let routeLandmarksCache: RouteLandmarkKnowledge[] | null = null;
let routeLandmarksByRouteCache: Map<string, string[]> | null = null;

function getPlacesKnowledge(): PlaceKnowledge[] {
  if (placesCache) return placesCache;
  placesCache = getFeaturedPlaceSeoItems().map((place) => ({
    label: place.label,
    routes: getRoutesNearPlace(place.center).map((r) => ({ name: r.name, distanceM: r.distanceM })),
  }));
  return placesCache;
}

function getRouteLandmarksKnowledge(): RouteLandmarkKnowledge[] {
  if (routeLandmarksCache) return routeLandmarksCache;

  const routes = rutasProduccion as unknown as Array<{ name: string; landmarks?: { name: string }[] }>;
  routeLandmarksCache = routes.flatMap((route) =>
    (route.landmarks ?? []).map((landmark) => ({
      routeName: route.name,
      landmarkName: landmark.name,
    }))
  );
  return routeLandmarksCache;
}

function getRouteLandmarksByRoute(): Map<string, string[]> {
  if (routeLandmarksByRouteCache) return routeLandmarksByRouteCache;

  const map = new Map<string, string[]>();
  for (const entry of getRouteLandmarksKnowledge()) {
    const current = map.get(entry.routeName) ?? [];
    if (!current.includes(entry.landmarkName)) {
      current.push(entry.landmarkName);
      map.set(entry.routeName, current);
    }
  }

  routeLandmarksByRouteCache = map;
  return routeLandmarksByRouteCache;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const LANDMARK_STOPWORDS = new Set([
  "a", "al", "con", "de", "del", "el", "en", "esa", "ese", "eso", "esta",
  "este", "la", "las", "le", "lo", "los", "me", "mi", "por", "para", "que",
  "quien", "se", "sin", "su", "te", "tu", "un", "una", "y", "ir", "quiero",
  "ruta", "rutas", "cerca", "porfavor", "favor",
]);

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !LANDMARK_STOPWORDS.has(token));
}

function getRouteAliases(routeName: string): string[] {
  return [routeName, ...(CHAT_ALIASES[routeName] ?? [])];
}

export function buildRelevantLandmarksSection(query: string, history: string[] = []): string {
  const text = normalizeText([query, ...history].join(" "));
  if (!text) return "";
  const queryTokens = tokenize(text);

  const routeLandmarksByRoute = getRouteLandmarksByRoute();
  const matchedRoutes = new Map<string, { score: number; landmarks: string[] }>();

  const registerRoute = (routeName: string) => {
    const current = matchedRoutes.get(routeName);
    if (current) return current;
    const entry = { score: 0, landmarks: [] as string[] };
    matchedRoutes.set(routeName, entry);
    return entry;
  };

  for (const [routeName, landmarks] of routeLandmarksByRoute) {
    const aliases = getRouteAliases(routeName).map(normalizeText).filter(Boolean);
    const routeMatched = aliases.some((alias) => text.includes(alias) || alias.includes(text));
    if (!routeMatched) continue;

    const entry = registerRoute(routeName);
    entry.score += 2;
    for (const landmark of landmarks.slice(0, 3)) {
      if (!entry.landmarks.includes(landmark)) entry.landmarks.push(landmark);
    }
  }

  for (const { routeName, landmarkName } of getRouteLandmarksKnowledge()) {
    const normalizedLandmark = normalizeText(landmarkName);
    if (!normalizedLandmark) continue;

    const landmarkTokens = tokenize(normalizedLandmark);
    const overlap = landmarkTokens.filter((token) => queryTokens.includes(token)).length;
    const isDirectMatch =
      text.includes(normalizedLandmark) ||
      normalizedLandmark.includes(text) ||
      (queryTokens.length > 0 && queryTokens.every((token) => normalizedLandmark.includes(token)));
    const isTokenMatch =
      overlap >= 2 ||
      (queryTokens.length === 1 && overlap === 1);
    if (!isDirectMatch && !isTokenMatch) continue;

    const entry = registerRoute(routeName);
    entry.score += 3;
    if (!entry.landmarks.includes(landmarkName)) {
      entry.landmarks.unshift(landmarkName);
    }
  }

  const lines = [...matchedRoutes.entries()]
    .filter(([, entry]) => entry.landmarks.length > 0)
    .sort((a, b) => b[1].score - a[1].score || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([routeName, entry]) => `• ${routeName}: ${entry.landmarks.slice(0, 4).join(", ")}`);

  if (lines.length === 0) return "";
  return ["## Landmarks detectadas en la consulta:", ...lines].join("\n");
}

/** Sección "qué rutas te dejan cerca de cada lugar" para el system prompt. */
export function buildPlacesSection(): string {
  return getPlacesKnowledge()
    .map((place) => {
      if (place.routes.length === 0) return `• ${place.label}: ninguna ruta pasa a menos de 500 m.`;
      const shown = place.routes.slice(0, MAX_PLACE_ROUTES)
        .map((r) => `${r.name} (~${r.distanceM} m)`)
        .join(", ");
      const rest = place.routes.length - MAX_PLACE_ROUTES;
      return `• ${place.label}: ${shown}${rest > 0 ? ` y ${rest} más (ver mapa)` : ""}`;
    })
    .join("\n");
}

/** Por ruta: cerca de qué lugares conocidos pasa su trazo real (≤500 m). */
export function getRoutePlaces(routeName: string): string[] {
  const places: { label: string; distanceM: number }[] = [];
  for (const place of getPlacesKnowledge()) {
    const hit = place.routes.find((r) => r.name === routeName);
    if (hit) places.push({ label: place.label, distanceM: hit.distanceM });
  }
  return places
    .sort((a, b) => a.distanceM - b.distanceM)
    .map((p) => `${p.label} (~${p.distanceM} m)`);
}

/** Nombres únicos de ruta en los datos reales (ida/vuelta comparten nombre). */
export function getRealRouteNames(): string[] {
  const routes = rutasProduccion as unknown as RawRoute[];
  return [...new Set(routes.map((r) => r.name))];
}

/**
 * Rutas cuyo trazo real pasa cerca del usuario, para el contexto de ubicación.
 * Sustituye al cálculo anterior contra paradas inventadas.
 */
export function nearbyRoutesReal(lat: number, lng: number, radiusM = 500): string {
  const user: Coordinates = [lng, lat];
  const routes = rutasProduccion as unknown as RawRoute[];

  const byName = new Map<string, number>();
  for (const route of routes) {
    if (route.name.toLowerCase().includes(TELEFERICO_NAME)) continue;
    let min = Infinity;
    for (const point of route.path) {
      const d = haversineMeters(user, point);
      if (d < min) min = d;
    }
    if (min > radiusM) continue;
    const prev = byName.get(route.name);
    if (prev === undefined || min < prev) byName.set(route.name, min);
  }

  if (byName.size === 0) {
    return `Ninguna ruta pasa a menos de ${radiusM} m del usuario según el trazo GPS.`;
  }

  return [...byName.entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(0, 6)
    .map(([name, dist]) => `• ${name}: pasa a ~${Math.round(dist)} m del usuario`)
    .join("\n");
}

import rutasProduccion from "@/data/rutas_produccion_final.json";
import { getFeaturedPlaceSeoItems, getRoutesNearPlace } from "@/lib/como-llegar";
import { haversineMeters } from "@/lib/geo";
import { getRouteDestination } from "@/lib/route-names";
import { getSchedule } from "@/lib/schedules";
import type { Coordinates } from "@/lib/types";

type RawRoute = {
  name: string;
  path: [number, number][];
  landmarks?: { name: string }[];
};

type PlaceKnowledge = {
  label: string;
  routes: { name: string; distanceM: number }[];
};

type RouteLandmarkKnowledge = {
  routeName: string;
  landmarkName: string;
};

export type ChatLandmarkMatch = {
  landmarkName: string;
  routeNames: string[];
  score: number;
};

export type ChatPlaceMatch = {
  placeName: string;
  routes: { name: string; distanceM: number }[];
};

const MAX_PLACE_ROUTES = 8;
const TELEFERICO_NAME = "teleferico";

let placesCache: PlaceKnowledge[] | null = null;
let routeLandmarksCache: RouteLandmarkKnowledge[] | null = null;
let routeLandmarksByRouteCache: Map<string, string[]> | null = null;

function getPlacesKnowledge(): PlaceKnowledge[] {
  if (placesCache) return placesCache;
  placesCache = getFeaturedPlaceSeoItems().map((place) => ({
    label: place.label,
    routes: getRoutesNearPlace(place.center).map((route) => ({
      name: route.name,
      distanceM: route.distanceM,
    })),
  }));
  return placesCache;
}

function getRouteLandmarksKnowledge(): RouteLandmarkKnowledge[] {
  if (routeLandmarksCache) return routeLandmarksCache;

  const routes = rutasProduccion as unknown as RawRoute[];
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
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const LANDMARK_STOPWORDS = new Set([
  "a", "al", "con", "de", "del", "el", "en", "esa", "ese", "eso", "esta",
  "este", "la", "las", "le", "lo", "los", "me", "mi", "por", "para", "que",
  "quien", "se", "sin", "su", "te", "tu", "un", "una", "y", "ir", "quiero",
  "ruta", "rutas", "cerca", "porfavor", "favor", "camion", "camiones", "combi",
  "combis", "como", "donde", "hacia", "llegar", "llego", "lleva", "pasa", "pasar",
]);

const FOLLOW_UP_WORDS = new Set([
  "esa", "ese", "eso", "esta", "este", "ahi", "alli", "cual", "cuanto",
  "cuando", "donde", "y", "tambien",
]);

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !LANDMARK_STOPWORDS.has(token));
}

function buildRetrievalText(query: string, history: string[]): string {
  const normalizedQuery = normalizeText(query);
  const queryTokens = tokenize(normalizedQuery);
  const isFollowUp =
    queryTokens.length === 0 ||
    (queryTokens.length <= 2 && normalizedQuery.split(" ").some((word) => FOLLOW_UP_WORDS.has(word)));

  if (!isFollowUp) return normalizedQuery;
  return normalizeText([...history.slice(-2), query].join(" "));
}

function candidateMatches(text: string, candidate: string, textTokens: string[]): boolean {
  const normalizedCandidate = normalizeText(candidate);
  if (!normalizedCandidate) return false;
  if (` ${text} `.includes(` ${normalizedCandidate} `)) return true;

  const candidateTokens = tokenize(normalizedCandidate);
  if (candidateTokens.length === 0) return false;
  const overlap = candidateTokens.filter((token) => textTokens.includes(token)).length;
  if (textTokens.length > 0 && textTokens.every((token) => candidateTokens.includes(token))) return true;
  if (candidateTokens.length === 1) return overlap === 1 && candidateTokens[0].length >= 4;
  return overlap >= 2 && overlap / candidateTokens.length >= 0.6;
}

export function findRelevantLandmarks(query: string, history: string[] = []): ChatLandmarkMatch[] {
  const text = buildRetrievalText(query, history);
  if (!text) return [];
  const textTokens = tokenize(text);
  const matches = new Map<string, ChatLandmarkMatch>();

  for (const { routeName, landmarkName } of getRouteLandmarksKnowledge()) {
    if (!candidateMatches(text, landmarkName, textTokens)) continue;
    const key = normalizeText(landmarkName);
    const landmarkTokens = tokenize(landmarkName);
    const exact = ` ${text} `.includes(` ${key} `);
    const overlap = landmarkTokens.filter((token) => textTokens.includes(token)).length;
    const score = (exact ? 10 : 0) + overlap * 2 + Math.min(landmarkTokens.length, 4);
    const current = matches.get(key);

    if (current) {
      if (!current.routeNames.includes(routeName)) current.routeNames.push(routeName);
      current.score = Math.max(current.score, score);
    } else {
      matches.set(key, { landmarkName, routeNames: [routeName], score });
    }
  }

  return [...matches.values()]
    .sort((a, b) => b.score - a.score || a.landmarkName.localeCompare(b.landmarkName, "es"))
    .slice(0, 4);
}

export function findRelevantRouteNames(query: string, history: string[] = []): string[] {
  const text = buildRetrievalText(query, history);
  if (!text) return [];
  const textTokens = tokenize(text);
  const routeCodes = new Set(
    [...text.matchAll(/\bruta\s*(\d+[a-z]?)\b/g)].map((match) => match[1].toUpperCase())
  );
  const matched = new Set<string>();

  for (const routeName of getRealRouteNames()) {
    const routeCode = normalizeText(routeName).match(/^ruta\s+(\d+[a-z]?)/)?.[1]?.toUpperCase();
    const destination = getRouteDestination(routeName);
    const destinationParts = destination?.split(/\s*[↔-]\s*/).filter(Boolean) ?? [];
    if (
      (routeCode && routeCodes.has(routeCode)) ||
      (normalizeText(routeName).includes(TELEFERICO_NAME) && text.includes(TELEFERICO_NAME)) ||
      destinationParts.some((part) => candidateMatches(text, part, textTokens))
    ) {
      matched.add(routeName);
    }
  }

  for (const match of findRelevantLandmarks(query, history)) {
    for (const routeName of match.routeNames) matched.add(routeName);
  }

  return [...matched].slice(0, 10);
}

export function buildRelevantLandmarksSection(query: string, history: string[] = []): string {
  const lines = findRelevantLandmarks(query, history).map((match) =>
    `• ${match.landmarkName}: ${match.routeNames.slice(0, 8).join(", ")}${
      match.routeNames.length > 8 ? ` y ${match.routeNames.length - 8} más` : ""
    }`
  );

  if (lines.length === 0) return "";
  return ["### Coincidencias exactas de landmarks verificadas:", ...lines].join("\n");
}

export function buildRelevantRouteFactsSection(query: string, history: string[] = []): string {
  const routeNames = findRelevantRouteNames(query, history);
  if (routeNames.length === 0) return "";

  const landmarksByRoute = getRouteLandmarksByRoute();
  const lines = routeNames.map((routeName) => {
    const destination = getRouteDestination(routeName);
    const schedule = getSchedule(routeName);
    const landmarks = landmarksByRoute.get(routeName) ?? [];
    const details: string[] = [];
    if (destination) details.push(`destino ${destination}`);
    if (schedule?.continuous) details.push(`horario ${schedule.first}-${schedule.last}, servicio continuo`);
    else if (schedule) details.push(`horario ${schedule.first}-${schedule.last}, cada ${schedule.freqMin}-${schedule.freqMax} min`);
    if (landmarks.length > 0) details.push(`landmarks: ${landmarks.slice(0, 12).join(", ")}`);
    return `• ${routeName}: ${details.join("; ")}`;
  });

  return ["### Datos verificados de las rutas relevantes:", ...lines].join("\n");
}

export function findRelevantPlaces(query: string, history: string[] = []): ChatPlaceMatch[] {
  const text = buildRetrievalText(query, history);
  if (!text) return [];
  const textTokens = tokenize(text);
  return getPlacesKnowledge()
    .filter((place) => candidateMatches(text, place.label, textTokens))
    .slice(0, 3)
    .map((place) => ({ placeName: place.label, routes: place.routes }));
}

export function buildRelevantPlacesSection(query: string, history: string[] = []): string {
  const lines = findRelevantPlaces(query, history)
    .map((place) => {
      if (place.routes.length === 0) return `• ${place.placeName}: ninguna ruta pasa a menos de 500 m.`;
      const routes = place.routes.slice(0, MAX_PLACE_ROUTES)
        .map((route) => `${route.name} (~${route.distanceM} m)`)
        .join(", ");
      return `• ${place.placeName}: ${routes}`;
    });

  if (lines.length === 0) return "";
  return ["### Lugares conocidos calculados desde el trazo GPS:", ...lines].join("\n");
}

export function buildRelevantGroundingSection(query: string, history: string[] = []): string {
  const sections = [
    buildRelevantLandmarksSection(query, history),
    buildRelevantPlacesSection(query, history),
    buildRelevantRouteFactsSection(query, history),
  ].filter(Boolean);

  if (sections.length === 0) {
    return "## Evidencia recuperada para esta consulta:\nNo hubo una coincidencia exacta en los datos verificados.";
  }

  return ["## Evidencia recuperada para esta consulta:", ...sections].join("\n\n");
}

export function buildPlacesSection(): string {
  return getPlacesKnowledge()
    .map((place) => {
      if (place.routes.length === 0) return `• ${place.label}: ninguna ruta pasa a menos de 500 m.`;
      const shown = place.routes.slice(0, MAX_PLACE_ROUTES)
        .map((route) => `${route.name} (~${route.distanceM} m)`)
        .join(", ");
      const rest = place.routes.length - MAX_PLACE_ROUTES;
      return `• ${place.label}: ${shown}${rest > 0 ? ` y ${rest} más (ver mapa)` : ""}`;
    })
    .join("\n");
}

export function getRoutePlaces(routeName: string): string[] {
  const places: { label: string; distanceM: number }[] = [];
  for (const place of getPlacesKnowledge()) {
    const hit = place.routes.find((route) => route.name === routeName);
    if (hit) places.push({ label: place.label, distanceM: hit.distanceM });
  }
  return places
    .sort((a, b) => a.distanceM - b.distanceM)
    .map((place) => `${place.label} (~${place.distanceM} m)`);
}

export function getRealRouteNames(): string[] {
  const routes = rutasProduccion as unknown as RawRoute[];
  return [...new Set(routes.map((route) => route.name))];
}

export function nearbyRoutesReal(lat: number, lng: number, radiusM = 500): string {
  const user: Coordinates = [lng, lat];
  const routes = rutasProduccion as unknown as RawRoute[];
  const byName = new Map<string, number>();

  for (const route of routes) {
    if (normalizeText(route.name).includes(TELEFERICO_NAME)) continue;
    let min = Infinity;
    for (const point of route.path) {
      const distance = haversineMeters(user, point);
      if (distance < min) min = distance;
    }
    if (min > radiusM) continue;
    const previous = byName.get(route.name);
    if (previous === undefined || min < previous) byName.set(route.name, min);
  }

  if (byName.size === 0) {
    return `Ninguna ruta pasa a menos de ${radiusM} m del usuario según el trazo GPS.`;
  }

  return [...byName.entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(0, 6)
    .map(([name, distance]) => `• ${name}: pasa a ~${Math.round(distance)} m del usuario`)
    .join("\n");
}

import type { Coordinates } from "@/lib/types";
import landmarkPlaces from "@/data/landmark-places.json";

// ── Geocodificación de lugares para Uruapan ──────────────────────────────────
// Estrategia híbrida:
//  1. Índice local con coordenadas REALES (extraídas de los datos de rutas:
//     landmarks verificados + estaciones del Teleférico). Resuelve al instante,
//     sin red, y funciona offline en la PWA.
//  2. Se consulta Mapbox Search Box, que incluye direcciones, comercios y otros
//     puntos de interés. La consulta se limita al bounding box de Uruapan.
//
// IMPORTANTE: las coordenadas del índice local provienen de
// data/rutas_produccion_final.json y lib/mobility-config.ts. No se inventan.

// Bounding box derivado de los datos reales de rutas (con un pequeño margen)
// [minLng, minLat, maxLng, maxLat]
export const URUAPAN_BBOX: [number, number, number, number] = [-102.13, 19.34, -101.97, 19.50];

// Centro real de la ciudad (promedio del bbox de datos)
export const URUAPAN_CENTER: Coordinates = [-102.04487, 19.42068];

const MAPBOX_REQUEST_TIMEOUT_MS = 6000;

export type PlaceResult = {
  /** [lng, lat] */
  center: Coordinates;
  /** Etiqueta legible del lugar */
  label: string;
  /** Origen del resultado */
  source: "local" | "mapbox";
  /** Tipo de resultado para distinguir negocios, direcciones y zonas. */
  kind?: "known" | "business" | "address" | "area";
  /** Dirección o contexto breve mostrado debajo del nombre. */
  description?: string;
};

export type KnownPlace = {
  label: string;
  center: Coordinates;
  /** Términos por los que se puede encontrar este lugar (además del label) */
  aliases: string[];
};

// Lugares con coordenadas reales conocidas (landmarks + estaciones Teleférico).
export const KNOWN_PLACES: KnownPlace[] = [
  { label: "Unidad Deportiva", center: [-102.03304, 19.42662], aliases: ["unidad deportiva", "deportiva"] },
  { label: "Central de Autobuses", center: [-102.04234, 19.42687], aliases: ["central de autobuses", "central camionera", "central", "camionera"] },
  { label: "UNID Uruapan", center: [-102.04459, 19.42587], aliases: ["unid", "unid uruapan"] },
  { label: "Universidad Don Vasco", center: [-102.04726, 19.42619], aliases: ["don vasco", "universidad don vasco", "udv"] },
  { label: "IMSS Hospital General de Zona 8", center: [-102.0555, 19.42768], aliases: ["imss", "imss zona 8", "hospital general", "seguro social"] },
  { label: "Centro", center: [-102.06303, 19.42101], aliases: ["centro"] },
  { label: "Coppel Cupatitzio", center: [-102.06297, 19.41967], aliases: ["coppel", "coppel cupatitzio"] },
  { label: "Parque Lineal Cupatitzio", center: [-102.06401, 19.41528], aliases: ["parque lineal", "parque cupatitzio", "parque lineal cupatitzio"] },
  { label: "Bodega Aurrera Palito Verde", center: [-102.07071, 19.40384], aliases: ["palito verde", "bodega aurrera", "aurrera palito verde"] },
  { label: "Fraccionamiento Viñedos", center: [-102.07299, 19.40509], aliases: ["viñedos", "vinedos", "fraccionamiento viñedos"] },
  { label: "ESFU 3", center: [-102.07498, 19.40752], aliases: ["esfu", "esfu 3"] },
  { label: "Hospital Regional", center: [-102.02093, 19.3963], aliases: ["hospital regional", "hospital", "regional"] },
  { label: "Libramiento Aeropuerto", center: [-102.02561, 19.41467], aliases: ["libramiento aeropuerto", "aeropuerto", "libramiento"] },
  { label: "Boulevard Industrial / Plaza Ágora", center: [-102.03754, 19.42168], aliases: ["plaza agora", "plaza ágora", "agora", "ágora", "boulevard industrial", "blvd industrial", "industrial"] },
  { label: "Presidencia Municipal", center: [-102.04779, 19.42117], aliases: ["presidencia", "presidencia municipal", "palacio municipal", "ayuntamiento"] },
  { label: "Centro Histórico", center: [-102.05859, 19.41982], aliases: ["centro historico", "centro histórico", "primer cuadro", "plaza principal", "jardin morelos", "jardín morelos"] },
  { label: "Mercado Poniente", center: [-102.07698, 19.43062], aliases: ["mercado poniente", "mercado", "poniente"] },
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const featuredPlaceNames = new Set(KNOWN_PLACES.map((place) => normalize(place.label)));
export const SEARCHABLE_PLACES: KnownPlace[] = [
  ...KNOWN_PLACES,
  ...(landmarkPlaces as KnownPlace[]).filter(
    (place) => !featuredPlaceNames.has(normalize(place.label)),
  ),
];

// Índice invertido: término normalizado → lugar
const LOCAL_INDEX: { key: string; place: KnownPlace }[] = SEARCHABLE_PLACES.flatMap((place) => {
  const keys = new Set<string>([normalize(place.label), ...place.aliases.map(normalize)]);
  return Array.from(keys).map((key) => ({ key, place }));
});

/** Busca coincidencias locales (instantáneas, sin red) ordenadas por relevancia. */
export function searchLocalPlaces(query: string, limit = 6): PlaceResult[] {
  const q = normalize(query);
  if (!q) return [];

  const exact: KnownPlace[] = [];
  const startsWith: KnownPlace[] = [];
  const includes: KnownPlace[] = [];
  const seen = new Set<KnownPlace>();

  for (const { key, place } of LOCAL_INDEX) {
    if (seen.has(place)) continue;
    if (key === q) {
      exact.push(place);
      seen.add(place);
    } else if (key.startsWith(q)) {
      startsWith.push(place);
      seen.add(place);
    } else if (key.includes(q) || q.includes(key)) {
      includes.push(place);
      seen.add(place);
    }
  }

  return [...exact, ...startsWith, ...includes]
    .slice(0, limit)
    .map((place) => ({
      center: place.center,
      label: place.label,
      source: "local" as const,
      kind: "known" as const,
    }));
}

function findLocalPlace(query: string): PlaceResult | null {
  return searchLocalPlaces(query, 1)[0] ?? null;
}

function isWithinBbox(center: Coordinates): boolean {
  const [lng, lat] = center;
  return lng >= URUAPAN_BBOX[0] && lng <= URUAPAN_BBOX[2] && lat >= URUAPAN_BBOX[1] && lat <= URUAPAN_BBOX[3];
}

/**
 * Búsqueda de direcciones y POI con Mapbox Search Box, acotada a Uruapan.
 * Devuelve hasta `limit` resultados reales o [] si falla / no hay token.
 */
export async function geocodeMapbox(
  query: string,
  options: { limit?: number; signal?: AbortSignal } = {}
): Promise<PlaceResult[]> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const q = query.trim();
  if (!token || q.length < 3) return [];

  const limit = Math.min(Math.max(options.limit ?? 5, 1), 10);
  const params = new URLSearchParams({
    q: q.slice(0, 120),
    access_token: token,
    country: "MX",
    language: "es",
    limit: String(limit),
    proximity: URUAPAN_CENTER.join(","),
    bbox: URUAPAN_BBOX.join(","),
    types: "poi,address,street,neighborhood,locality,place",
    auto_complete: "true",
  });

  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) {
    abortFromCaller();
  } else {
    options.signal?.addEventListener("abort", abortFromCaller, { once: true });
  }
  const timeoutId = setTimeout(() => controller.abort(), MAPBOX_REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`https://api.mapbox.com/search/searchbox/v1/forward?${params.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    const features: unknown[] = Array.isArray(data?.features) ? data.features : [];

    const results: PlaceResult[] = [];
    for (const feature of features) {
      const f = feature as {
        geometry?: { coordinates?: [number, number] };
        properties?: {
          name?: string;
          name_preferred?: string;
          place_formatted?: string;
          full_address?: string;
          feature_type?: string;
        };
      };
      const coords = f.geometry?.coordinates;
      if (!coords || coords.length < 2 || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) {
        continue;
      }
      const center: Coordinates = [coords[0], coords[1]];
      if (!isWithinBbox(center)) continue;
      const label = f.properties?.name_preferred || f.properties?.name || q;
      const description = f.properties?.full_address || f.properties?.place_formatted;
      const featureType = f.properties?.feature_type;
      const kind = featureType === "poi"
        ? "business"
        : featureType === "address" || featureType === "street"
          ? "address"
          : "area";
      results.push({ center, label, source: "mapbox", kind, description });
    }
    return results;
  } catch {
    // Abort o red caída: degradar silenciosamente al índice local.
    return [];
  } finally {
    clearTimeout(timeoutId);
    options.signal?.removeEventListener("abort", abortFromCaller);
  }
}

/**
 * Resuelve un texto a un único lugar (coordenadas reales).
 * Prioriza el índice local; si no hay match, usa Mapbox.
 */
export async function geocodePlace(
  query: string,
  options: { signal?: AbortSignal } = {}
): Promise<PlaceResult | null> {
  const local = findLocalPlace(query);
  if (local) return local;

  const remote = await geocodeMapbox(query, { limit: 1, signal: options.signal });
  return remote[0] ?? null;
}

/**
 * Sugerencias para autocompletado: combina resultados locales (instantáneos)
 * con resultados de Mapbox, sin duplicar etiquetas.
 */
export async function searchPlaces(
  query: string,
  options: { signal?: AbortSignal; limit?: number } = {}
): Promise<PlaceResult[]> {
  const limit = options.limit ?? 7;
  const local = searchLocalPlaces(query, limit);
  const remote = await geocodeMapbox(query, { limit, signal: options.signal });

  const seen = new Set(local.map((r) => normalize(r.label)));
  const merged = [...local];
  for (const r of remote) {
    const key = normalize(r.label);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(r);
  }
  return merged.slice(0, limit);
}

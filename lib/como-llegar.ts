import rutasProduccion from "@/data/rutas_produccion_final.json";
import { haversineMeters } from "@/lib/geo";
import { KNOWN_PLACES, SEARCHABLE_PLACES, type KnownPlace } from "@/lib/geocode";
import { getRouteSeoItems, slugify } from "@/lib/route-seo";
import type { Coordinates } from "@/lib/types";

// ── SEO programático "Cómo llegar a [lugar]" ─────────────────────────────────
// Para cada lugar conocido (coordenadas reales) se calcula en build qué rutas
// pasan cerca, reutilizando los datos maestros del motor A→B.

export type PlaceSeoItem = KnownPlace & {
  slug: string;
};

export type RouteNearPlace = {
  name: string;
  color: string;
  destination: string | null;
  /** Distancia caminando aproximada del lugar al punto más cercano de la ruta */
  distanceM: number;
  /** Slug de la página /ruta/[slug], si existe */
  routeSlug: string | null;
};

type RawRoute = {
  name: string;
  color: string;
  path: [number, number][];
};

/** Distancia máxima a pie para considerar que una ruta "te deja" en el lugar. */
const MAX_WALK_METERS = 500;
const TELEFERICO_NAME = "teleférico";

export function getPlaceSeoItems(): PlaceSeoItem[] {
  return SEARCHABLE_PLACES.map((place) => ({ ...place, slug: slugify(place.label) }));
}

export function getFeaturedPlaceSeoItems(): PlaceSeoItem[] {
  return KNOWN_PLACES.map((place) => ({ ...place, slug: slugify(place.label) }));
}

export function findPlaceSeoItem(slug: string): PlaceSeoItem | null {
  return getPlaceSeoItems().find((place) => place.slug === slug) ?? null;
}

function minDistanceToPath(center: Coordinates, path: [number, number][]): number {
  let min = Infinity;
  for (const point of path) {
    const d = haversineMeters(center, point);
    if (d < min) min = d;
  }
  return min;
}

/** Rutas que pasan a ≤500 m del lugar, ordenadas de más cercana a más lejana. */
export function getRoutesNearPlace(center: Coordinates): RouteNearPlace[] {
  const routes = rutasProduccion as unknown as RawRoute[];
  const seoBySlugName = new Map(getRouteSeoItems().map((item) => [item.name, item]));

  // Dedupe por nombre (ida/vuelta comparten nombre) quedándonos con la mínima distancia.
  const byName = new Map<string, RouteNearPlace>();
  for (const route of routes) {
    if (route.name.toLowerCase().includes(TELEFERICO_NAME)) continue;
    const distance = minDistanceToPath(center, route.path);
    if (distance > MAX_WALK_METERS) continue;
    const existing = byName.get(route.name);
    if (existing && existing.distanceM <= distance) continue;
    const seo = seoBySlugName.get(route.name);
    byName.set(route.name, {
      name: route.name,
      color: route.color,
      destination: seo?.destination ?? null,
      distanceM: Math.round(distance),
      routeSlug: seo?.slug ?? null,
    });
  }

  return Array.from(byName.values()).sort((a, b) => a.distanceM - b.distanceM);
}

/** Minutos caminando a paso urbano (~75 m/min), mínimo 1. */
export function walkMinutesFor(meters: number): number {
  return Math.max(1, Math.round(meters / 75));
}

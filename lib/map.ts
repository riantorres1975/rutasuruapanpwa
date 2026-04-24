import type { RouteData } from "@/lib/types";

export const SOURCE_ID = "routes-source";
export const URUAPAN_CENTER: [number, number] = [-102.0584, 19.4208];
export const DEFAULT_ZOOM = 12.3;

const LIGHT_STYLE = "mapbox://styles/mapbox/navigation-day-v1";
const DARK_STYLE = "mapbox://styles/mapbox/navigation-night-v1";

export function getMapStyle(isDark: boolean) {
  return isDark ? DARK_STYLE : LIGHT_STYLE;
}

export function toFeatureCollection(routes: RouteData[]): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  return {
    type: "FeatureCollection",
    features: routes.map((route) => ({
      type: "Feature",
      properties: {
        id: route.id,
        nombre: route.nombre,
        color: route.color
      },
      geometry: {
        type: "LineString",
        coordinates: route.coordenadas
      }
    }))
  };
}

export function getBoundsFromCoordinates(coordinates: RouteData["coordenadas"]) {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of coordinates) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat]
  ] as [[number, number], [number, number]];
}

export function getBoundsFromRoutes(routes: RouteData[]) {
  const points = routes.flatMap((route) => route.coordenadas);
  if (points.length === 0) {
    return null;
  }

  return getBoundsFromCoordinates(points);
}

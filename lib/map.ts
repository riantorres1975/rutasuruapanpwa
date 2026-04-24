import type { RouteData } from "@/lib/types";

export const SOURCE_ID = "routes-source";
export const URUAPAN_CENTER: [number, number] = [-102.0584, 19.4208];
export const DEFAULT_ZOOM = 12.3;

const LIGHT_STYLE = "mapbox://styles/mapbox/streets-v12";
const DARK_STYLE = "mapbox://styles/mapbox/dark-v11";

export const URUAPAN_LANDMARKS: { name: string; coords: [number, number]; icon: string }[] = [
  { name: "Centro", coords: [-102.0569, 19.4197], icon: "🏛️" },
  { name: "Mercado", coords: [-102.0617, 19.4183], icon: "🛒" },
  { name: "Parque Nacional", coords: [-102.0634, 19.4113], icon: "🌳" },
  { name: "Central Camionera", coords: [-102.0341, 19.4254], icon: "🚌" },
  { name: "Hospital General", coords: [-102.0235, 19.3975], icon: "🏥" },
  { name: "UPN / Aeropuerto", coords: [-102.0390, 19.3951], icon: "✈️" },
  { name: "Ágora", coords: [-102.0375, 19.4217], icon: "🎭" },
  { name: "Zapata", coords: [-102.0732, 19.4252], icon: "📍" }
];

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

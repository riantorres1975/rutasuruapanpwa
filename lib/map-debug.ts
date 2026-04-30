import type { Coordinates } from "@/lib/types";

function haversine(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isDebugMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("debug") === "true";
  } catch {
    return false;
  }
}

export interface ClosestPointResult {
  index: number;
  coord: Coordinates;
  distanceM: number;
}

export function getClosestPoint(
  clickLngLat: [number, number],
  coordinates: Coordinates[]
): ClosestPointResult | null {
  if (coordinates.length === 0) return null;
  let minDist = Infinity;
  let closestIndex = 0;
  for (let i = 0; i < coordinates.length; i++) {
    const d = haversine(clickLngLat[0], clickLngLat[1], coordinates[i][0], coordinates[i][1]);
    if (d < minDist) {
      minDist = d;
      closestIndex = i;
    }
  }
  return { index: closestIndex, coord: coordinates[closestIndex], distanceM: minDist };
}

export function buildDebugPointsGeoJSON(
  coordinates: Coordinates[],
  step: number
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
  for (let i = 0; i < coordinates.length; i += step) {
    const [lng, lat] = coordinates[i];
    features.push({
      type: "Feature",
      properties: { index: i, label: String(i) },
      geometry: { type: "Point", coordinates: [lng, lat] }
    });
  }
  const last = coordinates.length - 1;
  if (last > 0 && last % step !== 0) {
    const [lng, lat] = coordinates[last];
    features.push({
      type: "Feature",
      properties: { index: last, label: String(last) },
      geometry: { type: "Point", coordinates: [lng, lat] }
    });
  }
  return { type: "FeatureCollection", features };
}

export function exportRouteCoords(coordinates: Coordinates[], filename = "ruta-export.json"): void {
  const blob = new Blob([JSON.stringify(coordinates, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

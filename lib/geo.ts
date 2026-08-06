import type { Coordinates } from "@/lib/types";

export const MAX_AUTO_LOCATION_ACCURACY_M = 250;

// Cobertura derivada de los extremos de las rutas verificadas, con un margen
// para colonias periféricas. Evita aceptar como origen automático otra ciudad.
export const URUAPAN_SERVICE_POLYGON: Coordinates[] = [
  [-102.097, 19.48],
  [-102.045, 19.485],
  [-101.99, 19.485],
  [-101.993, 19.39],
  [-102.013, 19.355],
  [-102.065, 19.355],
  [-102.098, 19.385],
  [-102.1, 19.445],
];

export function haversineMeters(a: Coordinates, b: Coordinates): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinDLon * sinDLon;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function isWithinUruapanServiceArea(point: Coordinates): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = URUAPAN_SERVICE_POLYGON.length - 1; i < URUAPAN_SERVICE_POLYGON.length; j = i++) {
    const [xi, yi] = URUAPAN_SERVICE_POLYGON[i];
    const [xj, yj] = URUAPAN_SERVICE_POLYGON[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }

  return inside;
}

export function isAccurateEnoughForAutomaticOrigin(accuracyM: number): boolean {
  return Number.isFinite(accuracyM) && accuracyM <= MAX_AUTO_LOCATION_ACCURACY_M;
}

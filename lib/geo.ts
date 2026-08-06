import type { Coordinates } from "@/lib/types";
import { URUAPAN_CENTER } from "@/lib/map";

export const URUAPAN_SERVICE_RADIUS_M = 20_000;

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
  return haversineMeters(URUAPAN_CENTER, point) <= URUAPAN_SERVICE_RADIUS_M;
}

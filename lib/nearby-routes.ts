import { haversineMeters } from "@/lib/geo";
import type { Coordinates } from "@/lib/types";

const TELEFERICO_ROUTE_NAME = "Teleférico Uruapan";

export type NearbyRoutePath = {
  id: number;
  name: string;
  path: Coordinates[];
};

function distanceToSegmentMeters(
  point: Coordinates,
  start: Coordinates,
  end: Coordinates,
): number {
  const metersPerDegree = 111_320;
  const metersPerLongitude = metersPerDegree * Math.cos((point[1] * Math.PI) / 180);
  const startX = (start[0] - point[0]) * metersPerLongitude;
  const startY = (start[1] - point[1]) * metersPerDegree;
  const endX = (end[0] - point[0]) * metersPerLongitude;
  const endY = (end[1] - point[1]) * metersPerDegree;
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;

  if (lengthSquared === 0) return Math.hypot(startX, startY);

  const projection = Math.max(
    0,
    Math.min(1, -(startX * deltaX + startY * deltaY) / lengthSquared),
  );
  return Math.hypot(startX + projection * deltaX, startY + projection * deltaY);
}

function distanceToRouteMeters(point: Coordinates, route: NearbyRoutePath): number {
  if (route.path.length === 0) return Infinity;

  // El Teleférico solo se puede abordar en estaciones. Sus seis puntos son
  // estaciones, por lo que no se considera cercanía al cable entre ellas.
  if (route.name === TELEFERICO_ROUTE_NAME || route.path.length === 1) {
    return route.path.reduce(
      (minimum, station) => Math.min(minimum, haversineMeters(point, station)),
      Infinity,
    );
  }

  let minimum = Infinity;
  for (let index = 1; index < route.path.length; index += 1) {
    minimum = Math.min(
      minimum,
      distanceToSegmentMeters(point, route.path[index - 1], route.path[index]),
    );
  }
  return minimum;
}

export function findNearbyRouteIds(
  routes: NearbyRoutePath[],
  point: Coordinates,
  radiusMeters = 400,
): number[] {
  const canonicalIdByName = new Map<string, number>();
  const minimumByName = new Map<string, number>();

  for (const route of routes) {
    if (!canonicalIdByName.has(route.name)) canonicalIdByName.set(route.name, route.id);
    const distance = distanceToRouteMeters(point, route);
    const current = minimumByName.get(route.name) ?? Infinity;
    if (distance < current) minimumByName.set(route.name, distance);
  }

  return [...minimumByName.entries()]
    .filter(([, distance]) => distance <= radiusMeters)
    .sort((a, b) => a[1] - b[1])
    .map(([name]) => canonicalIdByName.get(name))
    .filter((id): id is number => id !== undefined);
}

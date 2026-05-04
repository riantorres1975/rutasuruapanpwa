import type { Coordinates } from "@/lib/types";

// ─── Public types ─────────────────────────────────────────────────────────────

export type PolylineRoute = {
  id: number;
  name: string;
  color: string;
  corridor_width_m: number;
  path: Coordinates[];               // [lng, lat][]
  direccion?: "ida" | "vuelta";
};

export type ClosestOnPath = {
  distM: number;
  segmentIndex: number;              // index of the segment's first point
};

export type PolylineRouteMatch = {
  routeId: number;
  routeName: string;
  routeColor: string;
  direccion: "ida" | "vuelta";
  originDistM: number;
  destDistM: number;
  originSegIndex: number;
  destSegIndex: number;
  segment: Coordinates[];
  routeLengthM: number;
  score: number;
};

export type RankedRoutes = {
  best: PolylineRouteMatch;
  alternatives: PolylineRouteMatch[];
};

// ─── Internal geometry ────────────────────────────────────────────────────────

const EARTH_R = 6_371_000;
const toRad = (d: number) => (d * Math.PI) / 180;

// Equirectangular projection to metric XY, accurate within ~0.1% for city-scale areas.
function toMetricXY(coord: Coordinates, refLat: number): [number, number] {
  return [
    toRad(coord[0]) * EARTH_R * Math.cos(toRad(refLat)),
    toRad(coord[1]) * EARTH_R,
  ];
}

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Sum of haversine distances between consecutive path points, in meters.
 */
export function getRouteLength(path: Coordinates[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const [lng1, lat1] = path[i - 1];
    const [lng2, lat2] = path[i];
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    total += 2 * EARTH_R * Math.asin(Math.sqrt(a));
  }
  return total;
}

/**
 * Distance in meters from point p to segment a→b via perpendicular projection.
 * Uses equirectangular approximation centred at the three-point midlat —
 * more accurate than vertex-only haversine for long segments.
 */
export function getDistancePointToSegmentM(
  p: Coordinates,
  a: Coordinates,
  b: Coordinates
): number {
  const refLat = (p[1] + a[1] + b[1]) / 3;
  const [px, py] = toMetricXY(p, refLat);
  const [ax, ay] = toMetricXY(a, refLat);
  const [bx, by] = toMetricXY(b, refLat);

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return Math.hypot(px - ax, py - ay);

  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Scans every segment of path and returns the perpendicular distance (meters)
 * to the closest segment and that segment's index.
 */
export function getClosestPointOnPath(
  point: Coordinates,
  path: Coordinates[]
): ClosestOnPath {
  let bestDist = Infinity;
  let bestIndex = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const d = getDistancePointToSegmentM(point, path[i], path[i + 1]);
    if (d < bestDist) {
      bestDist = d;
      bestIndex = i;
    }
  }

  return { distM: bestDist, segmentIndex: bestIndex };
}

/**
 * Returns false when the route cannot serve the trip; otherwise returns the
 * closest-segment results so the caller can compute a score without repeating work.
 *
 * Rules enforced:
 *   1. origin must be within corridor_width_m of the path.
 *   2. destination must be within corridor_width_m of the path.
 *   3. destination's segment must come AFTER origin's segment (forward direction).
 */
export function isRouteValid(
  origin: Coordinates,
  destination: Coordinates,
  route: PolylineRoute
): false | { originSeg: ClosestOnPath; destSeg: ClosestOnPath } {
  if (route.path.length < 2) return false;

  const threshold = route.corridor_width_m;

  const originSeg = getClosestPointOnPath(origin, route.path);
  if (originSeg.distM > threshold) return false;

  const destSeg = getClosestPointOnPath(destination, route.path);
  if (destSeg.distM > threshold) return false;

  if (destSeg.segmentIndex <= originSeg.segmentIndex) return false;

  return { originSeg, destSeg };
}

/**
 * Evaluates all routes, discards invalid ones, deduplicates by routeId keeping
 * the best-scoring direction, then returns up to 3 results sorted by score.
 *
 * Score = originDistM + destDistM + routeLengthM * 0.01  (lower is better)
 * The length factor rewards shorter routes when walking distances are similar.
 */
export function findBestRoutes(
  origin: Coordinates,
  destination: Coordinates,
  routes: PolylineRoute[]
): PolylineRouteMatch[] {
  const byId = new Map<number, PolylineRouteMatch>();

  for (const route of routes) {
    const result = isRouteValid(origin, destination, route);
    if (!result) continue;

    const { originSeg, destSeg } = result;
    const segment = route.path.slice(originSeg.segmentIndex, destSeg.segmentIndex + 2);
    const routeLengthM = getRouteLength(segment);
    const score = originSeg.distM + destSeg.distM + routeLengthM * 0.01;

    const existing = byId.get(route.id);
    if (existing && existing.score <= score) continue;

    byId.set(route.id, {
      routeId: route.id,
      routeName: route.name,
      routeColor: route.color,
      direccion: route.direccion ?? "ida",
      originDistM: originSeg.distM,
      destDistM: destSeg.distM,
      originSegIndex: originSeg.segmentIndex,
      destSegIndex: destSeg.segmentIndex,
      segment,
      routeLengthM,
      score,
    });
  }

  return Array.from(byId.values())
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
}

/**
 * Wraps findBestRoutes results into a ranked structure.
 * The lowest-score match becomes `best`; the rest are `alternatives`.
 * Returns null when no routes match.
 */
export function getRankedRoutes(matches: PolylineRouteMatch[]): RankedRoutes | null {
  if (matches.length === 0) return null;
  const [best, ...alternatives] = matches;
  return { best, alternatives };
}

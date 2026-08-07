import { haversineMeters } from "./geo";
import {
  getRouteMetrics,
  isPointWithinRouteBounds,
  usesStationOnlyAccess,
  type PolylineRoute,
  type RouteMetrics,
} from "./routeMatcher";
import type { Coordinates } from "./types";

// Max walking distance to board/alight a route (meters)
const PROXIMITY_METERS = 550;
// Max walking distance between route A transfer point and route B boarding point
const TRANSFER_WALK_METERS = 200;
// Minimum distance traveled on route A before transferring (avoid trivial transfers near origin)
const MIN_SEG_A_METERS = 200;
// Minimum distance on route B after the transfer (symmetrical guard to MIN_SEG_A_METERS)
const MIN_SEG_B_METERS = 200;
// Maximum ratio of (transfer-point→destination) / (origin→destination) — rejects backwards detours
const MAX_PROGRESS_RATIO = 1.15;
// Combined (lenA + lenB) must not exceed this multiple of the straight-line A→B distance.
// Prevents roundabout transfers that are longer than walking or taking a direct bus.
const MAX_DETOUR_RATIO = 3.5;
// Minimum straight-line origin→destination distance to even attempt a transfer suggestion.
// Below this threshold the user is better off walking; a bus transfer never makes sense.
const MIN_TRIP_METERS = 400;
// "Same corner" threshold: transfers within this distance get a near-zero walk penalty
const INTERSECTION_METERS = 35;

// Degree tolerances for fast lat/lng pre-rejection before calling haversineMeters.
// Coords are [lng, lat]. At Uruapan (~19.4°N): 1°lat≈111km, 1°lng≈104km.
// Using TRANSFER_WALK_METERS + 10% margin for safety.
const LAT_TOL = (TRANSFER_WALK_METERS * 1.1) / 111_000; // ≈ 0.00198°
const LNG_TOL = (TRANSFER_WALK_METERS * 1.1) / 104_000; // ≈ 0.00212°

export type TransferOption = {
  routeAId: number;
  routeBId: number;
  routeAName: string;
  routeBName: string;
  routeAStartIndex: number;
  routeATransferIndex: number;
  routeBTransferIndex: number;
  routeBEndIndex: number;
  transferPoint: Coordinates;
  segmentA: Coordinates[];
  segmentB: Coordinates[];
  walkMeters: number;
  score: number;
};

function closestOnPath(point: Coordinates, path: Coordinates[]) {
  let bestIndex = 0;
  let bestDist = Infinity;
  for (let i = 0; i < path.length; i++) {
    const d = haversineMeters(point, path[i]);
    if (d < bestDist) {
      bestDist = d;
      bestIndex = i;
    }
  }
  return { index: bestIndex, distance: bestDist };
}

function segmentLengthFromMetrics(metrics: RouteMetrics, startIndex: number, endIndex: number) {
  return Math.abs(metrics.cumulativeLengthsM[endIndex] - metrics.cumulativeLengthsM[startIndex]);
}

function buildSegment(path: Coordinates[], startIndex: number, endIndex: number) {
  return startIndex < endIndex
    ? path.slice(startIndex, endIndex + 1)
    : path.slice(endIndex, startIndex + 1).reverse();
}

/**
 * Transfer engine for rutas_produccion_final.json (PolylineRoute[]).
 *
 * Identical algorithm to computeTransferOptions but operates on PolylineRoute[]
 * (rutas_produccion_final.json), where coordinates live in `path` instead of
 * `coordenadas` and per-route proximity is driven by `corridor_width_m`.
 *
 * Deduplication uses routeAName+routeBName so that ida/vuelta variants of the
 * same named route don't produce duplicate suggestions in the UI.
 */
export function computeTransferOptionsFromPolylines(
  routes: PolylineRoute[],
  origin: Coordinates,
  destination: Coordinates
): TransferOption[] {
  const originToDestDist = haversineMeters(origin, destination);

  if (originToDestDist < MIN_TRIP_METERS) return [];

  const fromOrigin: Array<{ route: PolylineRoute; indexA: number; metrics: RouteMetrics }> = [];
  const toDestination: Array<{ route: PolylineRoute; indexB: number; metrics: RouteMetrics }> = [];

  for (const route of routes) {
    const threshold = route.corridor_width_m;
    const metrics = getRouteMetrics(route.path);
    if (isPointWithinRouteBounds(origin, metrics, threshold)) {
      const cA = closestOnPath(origin, route.path);
      if (cA.distance <= threshold) {
        fromOrigin.push({ route, indexA: cA.index, metrics });
      }
    }
    if (isPointWithinRouteBounds(destination, metrics, threshold)) {
      const cB = closestOnPath(destination, route.path);
      if (cB.distance <= threshold) {
        toDestination.push({ route, indexB: cB.index, metrics });
      }
    }
  }

  const results: TransferOption[] = [];

  for (const { route: rA, indexA, metrics: metricsA } of fromOrigin) {
    const firstTransferIndex = usesStationOnlyAccess(rA) ? 0 : indexA + 1;

    for (let xi = firstTransferIndex; xi < rA.path.length; xi++) {
      if (xi === indexA) continue;
      const xPoint = rA.path[xi];

      if (haversineMeters(xPoint, destination) > originToDestDist * MAX_PROGRESS_RATIO) continue;

      for (const { route: rB, indexB, metrics: metricsB } of toDestination) {
        if (rA.id === rB.id) continue;

        let bestJ = -1;
        let bestDist = TRANSFER_WALK_METERS + 1;
        const xLng = xPoint[0];
        const xLat = xPoint[1];
        const lastBoardingIndex = usesStationOnlyAccess(rB) ? rB.path.length : indexB;

        for (let j = 0; j < lastBoardingIndex; j++) {
          if (j === indexB) continue;
          const bCoord = rB.path[j];
          if (Math.abs(bCoord[1] - xLat) > LAT_TOL) continue;
          if (Math.abs(bCoord[0] - xLng) > LNG_TOL) continue;
          const d = haversineMeters(xPoint, bCoord);
          if (d < bestDist) {
            bestDist = d;
            bestJ = j;
          }
        }

        if (bestJ === -1) continue;

        const lenA = segmentLengthFromMetrics(metricsA, indexA, xi);
        if (lenA < MIN_SEG_A_METERS) continue;

        const lenB = segmentLengthFromMetrics(metricsB, bestJ, indexB);
        if (lenB < MIN_SEG_B_METERS) continue;

        if (lenA + lenB > originToDestDist * MAX_DETOUR_RATIO) continue;

        const segA = buildSegment(rA.path, indexA, xi);
        const segB = buildSegment(rB.path, bestJ, indexB);

        const walkPenalty =
          bestDist <= INTERSECTION_METERS
            ? bestDist * 0.5
            : INTERSECTION_METERS * 0.5 + (bestDist - INTERSECTION_METERS) * 3;

        const score = lenA + walkPenalty + lenB;

        results.push({
          routeAId: rA.id,
          routeBId: rB.id,
          routeAName: rA.name,
          routeBName: rB.name,
          routeAStartIndex: indexA,
          routeATransferIndex: xi,
          routeBTransferIndex: bestJ,
          routeBEndIndex: indexB,
          transferPoint: xPoint,
          segmentA: segA,
          segmentB: segB,
          walkMeters: bestDist,
          score
        });
      }
    }
  }

  results.sort((a, b) => a.score - b.score);

  // Deduplicate by name pair — multiple directions share the same name
  const seen = new Set<string>();
  const deduped: TransferOption[] = [];
  for (const r of results) {
    const key = `${r.routeAName}|${r.routeBName}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(r);
    }
    if (deduped.length === 5) break;
  }

  return deduped;
}

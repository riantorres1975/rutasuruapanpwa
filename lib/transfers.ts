import type { Coordinates, ResolvedRouteData } from "@/lib/types";
import { haversineMeters } from "@/lib/geo";

// Max walking distance to board/alight a route (meters)
const PROXIMITY_METERS = 550;
// Max walking distance between route A transfer point and route B boarding point
const TRANSFER_WALK_METERS = 200;
// Minimum distance traveled on route A before transferring (avoid trivial transfers near origin)
const MIN_SEG_A_METERS = 200;
// Maximum ratio of (transfer-point→destination) / (origin→destination) — rejects backwards detours
const MAX_PROGRESS_RATIO = 1.15;
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

function segmentLength(seg: Coordinates[]): number {
  let total = 0;
  for (let i = 1; i < seg.length; i++) {
    total += haversineMeters(seg[i - 1], seg[i]);
  }
  return total;
}

/**
 * Find transfer options when no direct route covers origin→destination.
 *
 * Strategy: for each point on route A (starting from where it covers origin),
 * scan route B coordinates up to its destination index looking for the closest
 * intersection — where both routes share the same corner (≤35m) or are within
 * walking distance (≤200m). Checks every coordinate on route A (no coarse
 * sampling) using fast lat/lng pre-rejection before haversine to stay performant.
 *
 * Scoring rewards intersection-quality transfers (near-zero walk) over longer
 * walks with a non-linear penalty.
 *
 * Returns top-5 results sorted by total travel score, deduplicated by route pair.
 */
export function computeTransferOptions(
  routes: ResolvedRouteData[],
  origin: Coordinates,
  destination: Coordinates
): TransferOption[] {
  // Pre-filter: routes close enough to origin or destination
  const fromOrigin: Array<{ route: ResolvedRouteData; indexA: number }> = [];
  const toDestination: Array<{ route: ResolvedRouteData; indexB: number }> = [];

  for (const route of routes) {
    const cA = closestOnPath(origin, route.coordenadas);
    if (cA.distance <= PROXIMITY_METERS) {
      fromOrigin.push({ route, indexA: cA.index });
    }
    const cB = closestOnPath(destination, route.coordenadas);
    if (cB.distance <= PROXIMITY_METERS) {
      toDestination.push({ route, indexB: cB.index });
    }
  }

  const results: TransferOption[] = [];
  const originToDestDist = haversineMeters(origin, destination);

  for (const { route: rA, indexA } of fromOrigin) {
    for (let xi = indexA; xi < rA.coordenadas.length; xi++) {
      const xPoint = rA.coordenadas[xi];

      // Reject if route A is heading away from destination (>15% detour allowed)
      if (haversineMeters(xPoint, destination) > originToDestDist * MAX_PROGRESS_RATIO) continue;

      for (const { route: rB, indexB } of toDestination) {
        if (rA.id === rB.id) continue;

        // Find the closest route B coordinate strictly before the destination index.
        // Fast lat/lng pre-rejection avoids calling haversine for distant points.
        let bestJ = -1;
        let bestDist = TRANSFER_WALK_METERS + 1;
        const xLng = xPoint[0];
        const xLat = xPoint[1];

        for (let j = 0; j < indexB; j++) {
          const bCoord = rB.coordenadas[j];
          if (Math.abs(bCoord[1] - xLat) > LAT_TOL) continue;
          if (Math.abs(bCoord[0] - xLng) > LNG_TOL) continue;
          const d = haversineMeters(xPoint, bCoord);
          if (d < bestDist) {
            bestDist = d;
            bestJ = j;
          }
        }

        if (bestJ === -1) continue;

        const segA = rA.coordenadas.slice(indexA, xi + 1);
        const segB = rB.coordenadas.slice(bestJ, indexB + 1);

        if (segA.length < 2 || segB.length < 2) continue;

        const lenA = segmentLength(segA);
        if (lenA < MIN_SEG_A_METERS) continue;

        const lenB = segmentLength(segB);

        // Non-linear walk penalty: intersection-quality transfers (≤35m) are nearly
        // free; anything beyond that is penalized 3× to strongly prefer shared corners.
        const walkPenalty =
          bestDist <= INTERSECTION_METERS
            ? bestDist * 0.5
            : INTERSECTION_METERS * 0.5 + (bestDist - INTERSECTION_METERS) * 3;

        const score = lenA + walkPenalty + lenB;

        results.push({
          routeAId: rA.id,
          routeBId: rB.id,
          routeAName: rA.nombre,
          routeBName: rB.nombre,
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

  // Sort ascending (lower score = better), deduplicate by route pair, return top 5
  results.sort((a, b) => a.score - b.score);

  const seen = new Set<string>();
  const deduped: TransferOption[] = [];
  for (const r of results) {
    const key = `${r.routeAId}-${r.routeBId}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(r);
    }
    if (deduped.length === 5) break;
  }

  return deduped;
}

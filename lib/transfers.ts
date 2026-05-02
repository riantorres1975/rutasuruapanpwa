import type { Coordinates, ResolvedRouteData } from "@/lib/types";
import { haversineMeters } from "@/lib/geo";

// Max walking distance to board/alight a route (meters)
const PROXIMITY_METERS = 550;
// Max walking distance between transfer point on route A and route B (meters)
const TRANSFER_WALK_METERS = 200;
// Minimum distance traveled on route A before transferring (avoid trivial transfers at origin)
const MIN_SEG_A_METERS = 200;
// Maximum allowed ratio of (transfer-to-destination distance / origin-to-destination distance)
// Rejects transfers where route A is going backwards or making excessive detours
const MAX_PROGRESS_RATIO = 1.15;

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
 * Strategy: for each pair (routeA, routeB), check if routeA covers origin
 * and one of its points is within TRANSFER_WALK_METERS of routeB, and routeB
 * covers destination.
 *
 * Limited to top-5 results sorted by total travel score.
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

  // Pre-compute origin→destination distance once for progress checks
  const originToDestDist = haversineMeters(origin, destination);

  for (const { route: rA, indexA } of fromOrigin) {
    // Sample candidate transfer points along rA (every ~5 coords to keep it fast)
    const step = Math.max(1, Math.floor(rA.coordenadas.length / 20));

    for (let xi = indexA; xi < rA.coordenadas.length; xi += step) {
      const xPoint = rA.coordenadas[xi];

      // Reject transfer point if route A is heading away from destination
      // (allows up to MAX_PROGRESS_RATIO detour relative to straight-line distance)
      if (haversineMeters(xPoint, destination) > originToDestDist * MAX_PROGRESS_RATIO) continue;

      for (const { route: rB, indexB } of toDestination) {
        if (rA.id === rB.id) continue;

        // Find closest point on rB to the transfer candidate
        const cX = closestOnPath(xPoint, rB.coordenadas);
        if (cX.distance > TRANSFER_WALK_METERS) continue;

        // rB must cover xPoint→destination in the forward direction
        if (cX.index >= indexB) continue;

        const segA = rA.coordenadas.slice(indexA, xi + 1);
        const segB = rB.coordenadas.slice(cX.index, indexB + 1);

        if (segA.length < 2 || segB.length < 2) continue;

        // Reject trivial transfers where route A barely moves from origin
        const lenA = segmentLength(segA);
        if (lenA < MIN_SEG_A_METERS) continue;

        const lenB = segmentLength(segB);
        const score = lenA + cX.distance * 2 + lenB;

        results.push({
          routeAId: rA.id,
          routeBId: rB.id,
          routeAName: rA.nombre,
          routeBName: rB.nombre,
          routeAStartIndex: indexA,
          routeATransferIndex: xi,
          routeBTransferIndex: cX.index,
          routeBEndIndex: indexB,
          transferPoint: xPoint,
          segmentA: segA,
          segmentB: segB,
          walkMeters: cX.distance,
          score
        });
      }
    }
  }

  // Sort by score, deduplicate by (routeAId, routeBId) pair, return top 5
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

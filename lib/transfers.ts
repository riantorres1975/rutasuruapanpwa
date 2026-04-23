import type { Coordinates, ResolvedRouteData } from "@/lib/types";

// Max walking distance to board/alight a route (meters)
const PROXIMITY_METERS = 550;
// Max walking distance between transfer point on route A and route B (meters)
const TRANSFER_WALK_METERS = 350;

export type TransferOption = {
  routeAId: number;
  routeBId: number;
  routeAName: string;
  routeBName: string;
  transferPoint: Coordinates;
  segmentA: Coordinates[];
  segmentB: Coordinates[];
  walkMeters: number;
  score: number;
};

function haversineMeters(a: Coordinates, b: Coordinates): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

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

  for (const { route: rA, indexA } of fromOrigin) {
    // Sample candidate transfer points along rA (every ~5 coords to keep it fast)
    const step = Math.max(1, Math.floor(rA.coordenadas.length / 20));

    for (let xi = indexA; xi < rA.coordenadas.length; xi += step) {
      const xPoint = rA.coordenadas[xi];

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

        const score = segmentLength(segA) + cX.distance * 2 + segmentLength(segB);

        results.push({
          routeAId: rA.id,
          routeBId: rB.id,
          routeAName: rA.nombre,
          routeBName: rB.nombre,
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

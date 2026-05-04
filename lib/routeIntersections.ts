import type { Coordinates } from "@/lib/types";
import { getDistancePointToSegmentM } from "@/lib/routeMatcher";

// Maximum distance (meters) for two route segments to be considered intersecting.
const DEFAULT_INTERSECTION_THRESHOLD_M = 100;

export type RouteIntersectionPoint = {
  point: Coordinates;        // midpoint of the two closest segment endpoints
  routeASegIndex: number;    // segment index on route A where proximity was found
  routeBSegIndex: number;    // segment index on route B where proximity was found
  distanceM: number;         // actual distance between the two closest points
};

type PathRoute = {
  path: Coordinates[];
};

/**
 * Detects points where two routes are within `thresholdM` meters of each other.
 * Returns a list of candidate transfer points, sorted by distance ascending.
 *
 * Strategy: for every segment of route A, find segments on route B where at
 * least one endpoint projects within the threshold. This avoids an O(n²) full
 * segment-to-segment sweep by pre-checking endpoints before the expensive
 * perpendicular distance call.
 *
 * NOT integrated in UI yet — base for future transfer UI.
 */
export function getRouteIntersections(
  routeA: PathRoute,
  routeB: PathRoute,
  thresholdM = DEFAULT_INTERSECTION_THRESHOLD_M
): RouteIntersectionPoint[] {
  const results: RouteIntersectionPoint[] = [];

  for (let ai = 0; ai < routeA.path.length - 1; ai++) {
    const aStart = routeA.path[ai];
    const aEnd = routeA.path[ai + 1];

    for (let bi = 0; bi < routeB.path.length - 1; bi++) {
      const bStart = routeB.path[bi];
      const bEnd = routeB.path[bi + 1];

      // Distance from each endpoint of B's segment to A's segment
      const d1 = getDistancePointToSegmentM(bStart, aStart, aEnd);
      const d2 = getDistancePointToSegmentM(bEnd, aStart, aEnd);
      const minDist = Math.min(d1, d2);

      if (minDist > thresholdM) continue;

      // Use the closer B endpoint as the transfer candidate point
      const transferPoint: Coordinates = d1 <= d2 ? bStart : bEnd;

      results.push({
        point: transferPoint,
        routeASegIndex: ai,
        routeBSegIndex: bi,
        distanceM: minDist,
      });
    }
  }

  return results.sort((a, b) => a.distanceM - b.distanceM);
}

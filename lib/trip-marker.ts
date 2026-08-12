import { isTelefericoRouteName } from "@/lib/journey-guidance";
import { getClosestPointOnPath } from "@/lib/routeMatcher";
import type { Coordinates } from "@/lib/types";
import type { TripJourney, TripProgress } from "@/lib/trip-mode";

const MAX_ROUTE_SNAP_DISTANCE_M = 180;

export type TripMarkerMode = "walking" | "bus" | "teleferico" | "arrived";

export type TripMarkerPresentation = {
  mode: TripMarkerMode;
  path: Coordinates[] | null;
  label: string;
};

export type TripMarkerTarget = {
  coordinate: Coordinates;
  bearing: number | null;
  snapped: boolean;
};

function vehicleMode(routeName: string): TripMarkerMode {
  return isTelefericoRouteName(routeName) ? "teleferico" : "bus";
}

export function getTripMarkerPresentation(
  journey: TripJourney,
  progress: TripProgress | null,
): TripMarkerPresentation {
  if (!progress) {
    return { mode: "walking", path: null, label: "Tu ubicación" };
  }

  switch (progress.phase) {
    case "riding-direct":
      if (journey.kind === "direct") {
        return {
          mode: vehicleMode(journey.routeName),
          path: journey.segment,
          label: `Tu posición en ${journey.routeName}`,
        };
      }
      break;
    case "riding-first":
      if (journey.kind === "transfer") {
        return {
          mode: vehicleMode(journey.routeAName),
          path: journey.segmentA,
          label: `Tu posición en ${journey.routeAName}`,
        };
      }
      break;
    case "riding-second":
      if (journey.kind === "transfer") {
        return {
          mode: vehicleMode(journey.routeBName),
          path: journey.segmentB,
          label: `Tu posición en ${journey.routeBName}`,
        };
      }
      break;
    case "off-route": {
      const routeName = progress.currentRouteName;
      return routeName
        ? { mode: vehicleMode(routeName), path: null, label: `Tu posición cerca de ${routeName}` }
        : { mode: "walking", path: null, label: "Tu ubicación fuera del recorrido" };
    }
    case "arrived":
      return { mode: "arrived", path: null, label: "Llegaste a tu destino" };
    case "boarding":
    case "walking-transfer":
    case "walking-destination":
      return { mode: "walking", path: null, label: "Tu ubicación caminando" };
  }

  return { mode: "walking", path: null, label: "Tu ubicación" };
}

export function calculateBearing(from: Coordinates, to: Coordinates): number {
  const toRadians = Math.PI / 180;
  const fromLat = from[1] * toRadians;
  const toLat = to[1] * toRadians;
  const deltaLng = (to[0] - from[0]) * toRadians;
  const y = Math.sin(deltaLng) * Math.cos(toLat);
  const x = Math.cos(fromLat) * Math.sin(toLat)
    - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng);

  return (Math.atan2(y, x) / toRadians + 360) % 360;
}

export function getTripMarkerTarget(
  location: Coordinates,
  path: Coordinates[] | null,
): TripMarkerTarget {
  if (!path || path.length < 2) {
    return { coordinate: location, bearing: null, snapped: false };
  }

  const closest = getClosestPointOnPath(location, path);
  if (closest.distM > MAX_ROUTE_SNAP_DISTANCE_M) {
    return { coordinate: location, bearing: null, snapped: false };
  }

  const segmentStart = path[closest.segmentIndex];
  const segmentEnd = path[Math.min(closest.segmentIndex + 1, path.length - 1)];

  return {
    coordinate: closest.projectedPoint,
    bearing: segmentStart && segmentEnd ? calculateBearing(segmentStart, segmentEnd) : null,
    snapped: true,
  };
}

export function interpolateCoordinate(
  from: Coordinates,
  to: Coordinates,
  progress: number,
): Coordinates {
  const amount = Math.min(1, Math.max(0, progress));
  return [
    from[0] + (to[0] - from[0]) * amount,
    from[1] + (to[1] - from[1]) * amount,
  ];
}

export function interpolateBearing(from: number, to: number, progress: number): number {
  const amount = Math.min(1, Math.max(0, progress));
  const delta = ((to - from + 540) % 360) - 180;
  return (from + delta * amount + 360) % 360;
}

export function getTripMarkerAnimationDuration(distanceM: number, reduceMotion: boolean): number {
  if (reduceMotion) return 0;
  return Math.round(Math.min(1_400, Math.max(550, 500 + distanceM * 8)));
}

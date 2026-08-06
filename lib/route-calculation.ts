import { findBestRoutes, getRankedRoutes, getRouteMetrics, type PolylineRoute } from "@/lib/routeMatcher";
import { computeTransferOptionsFromPolylines, type TransferOption } from "@/lib/transfers";
import type { Coordinates, RouteDirection } from "@/lib/types";

export type RouteOption = {
  routeId: number;
  ruta: string;
  direccion: RouteDirection;
  distanciaA: number;
  distanciaB: number;
  indexA: number;
  indexB: number;
  segment: Coordinates[];
  rideMinutes: number;
  expectedWaitMinutes: number;
  estimatedMinutes: number;
  score: number;
  routeColor?: string;
};

export type RouteCalculationResult = {
  suggestions: RouteOption[];
  alternativeRouteIds: number[];
  transfers: TransferOption[];
};

export type RouteCalculationWorkerRequest =
  | { type: "initialize"; routes: PolylineRoute[] }
  | {
      type: "calculate";
      requestId: number;
      key: string;
      origin: Coordinates;
      destination: Coordinates;
    };

export type RouteCalculationWorkerResponse =
  | {
      type: "result";
      requestId: number;
      key: string;
      result: RouteCalculationResult;
    }
  | { type: "error"; requestId: number; key: string };

export function prepareRouteCalculations(routes: PolylineRoute[]) {
  for (const route of routes) {
    getRouteMetrics(route.path);
  }
}

export function calculateRouteOptions(
  routes: PolylineRoute[],
  origin: Coordinates,
  destination: Coordinates,
): RouteCalculationResult {
  const matches = findBestRoutes(origin, destination, routes);
  const ranked = getRankedRoutes(matches);

  const suggestions = ranked
    ? [ranked.best, ...ranked.alternatives].map<RouteOption>((match) => ({
        routeId: match.routeId,
        ruta: match.routeName,
        direccion: match.direccion,
        distanciaA: match.originDistM,
        distanciaB: match.destDistM,
        indexA: match.originSegIndex,
        indexB: match.destSegIndex,
        segment: match.segment,
        rideMinutes: match.rideMinutes,
        expectedWaitMinutes: match.expectedWaitMinutes,
        estimatedMinutes: match.estimatedMinutes,
        score: match.score,
        routeColor: match.routeColor,
      }))
    : [];

  return {
    suggestions,
    alternativeRouteIds: ranked ? ranked.alternatives.map((match) => match.routeId) : [],
    transfers:
      suggestions.length === 0 && routes.length > 0
        ? computeTransferOptionsFromPolylines(routes, origin, destination)
        : [],
  };
}

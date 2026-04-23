"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BottomSheet from "@/components/BottomSheet";
import MapView from "@/components/Map";
import NearbyToast from "@/components/NearbyToast";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import RouteList from "@/components/RouteList";
import { TELEFERICO_LINE_COORDS } from "@/components/TelefericoSection";
import { useShareRoute } from "@/hooks/useShareRoute";
import type { Coordinates, GroupedRouteData, ResolvedRouteData, RouteDirection } from "@/lib/types";
const PROXIMITY_METERS = 550;
const SEGMENT_LENGTH_FACTOR = 0.04;
const AVG_TRIP_SPEED_KMH = 18;
const BACKGROUND_SIMPLIFY_TOLERANCE = 0.00008;
const BACKGROUND_MAX_POINTS = 180;

function getCoordinatesByDirection(route: GroupedRouteData, direction: RouteDirection) {
  return direction === "ida" ? route.ida ?? route.vuelta ?? [] : route.vuelta ?? route.ida ?? [];
}

function getEffectiveDirection(route: GroupedRouteData, direction: RouteDirection): RouteDirection {
  if (direction === "ida") {
    return route.ida ? "ida" : "vuelta";
  }

  return route.vuelta ? "vuelta" : "ida";
}

type RouteOption = {
  routeId: number;
  ruta: string;
  direccion: RouteDirection;
  distanciaA: number;
  distanciaB: number;
  indexA: number;
  indexB: number;
  segment: Coordinates[];
  score: number;
};

type ActivePoint = "origin" | "destination" | null;
type FlowStep = 1 | 2 | 3;

function getFlowStep(originPoint: Coordinates | null, destinationPoint: Coordinates | null): FlowStep {
  if (!originPoint) {
    return 1;
  }

  if (!destinationPoint) {
    return 2;
  }

  return 3;
}

function haversineMeters(a: Coordinates, b: Coordinates) {
  const toRad = (value: number) => (value * Math.PI) / 180;

  const [lng1, lat1] = a;
  const [lng2, lat2] = b;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function getClosestIndex(point: Coordinates, path: Coordinates[]) {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < path.length; index += 1) {
    const distance = haversineMeters(point, path[index]);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return { index: bestIndex, distance: bestDistance };
}

function getSegmentLengthMeters(segment: Coordinates[]) {
  let total = 0;
  for (let index = 1; index < segment.length; index += 1) {
    total += haversineMeters(segment[index - 1], segment[index]);
  }
  return total;
}

function perpendicularDistanceSquared(point: Coordinates, start: Coordinates, end: Coordinates) {
  const [x, y] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;

  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    const ddx = x - x1;
    const ddy = y - y1;
    return ddx * ddx + ddy * ddy;
  }

  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  const projectedX = x1 + clamped * dx;
  const projectedY = y1 + clamped * dy;
  const ddx = x - projectedX;
  const ddy = y - projectedY;
  return ddx * ddx + ddy * ddy;
}

function simplifyCoordinates(points: Coordinates[], tolerance: number) {
  if (points.length <= 2) {
    return points;
  }

  const squaredTolerance = tolerance * tolerance;
  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  const stack: [number, number][] = [[0, points.length - 1]];

  while (stack.length > 0) {
    const [start, end] = stack.pop() as [number, number];
    let maxDistance = 0;
    let maxIndex = -1;

    for (let index = start + 1; index < end; index += 1) {
      const distance = perpendicularDistanceSquared(points[index], points[start], points[end]);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = index;
      }
    }

    if (maxIndex !== -1 && maxDistance > squaredTolerance) {
      keep[maxIndex] = true;
      stack.push([start, maxIndex], [maxIndex, end]);
    }
  }

  return points.filter((_, index) => keep[index]);
}

function decimateCoordinates(points: Coordinates[], maxPoints: number) {
  if (points.length <= maxPoints) {
    return points;
  }

  const step = Math.ceil(points.length / maxPoints);
  const reduced: Coordinates[] = [points[0]];

  for (let index = step; index < points.length - 1; index += step) {
    reduced.push(points[index]);
  }

  const lastPoint = points[points.length - 1];
  const previous = reduced[reduced.length - 1];

  if (!previous || previous[0] !== lastPoint[0] || previous[1] !== lastPoint[1]) {
    reduced.push(lastPoint);
  }

  return reduced;
}

function simplifyBackgroundCoordinates(points: Coordinates[]) {
  if (points.length <= BACKGROUND_MAX_POINTS) {
    return points;
  }

  const simplified = simplifyCoordinates(points, BACKGROUND_SIMPLIFY_TOLERANCE);
  return decimateCoordinates(simplified, BACKGROUND_MAX_POINTS);
}

function computeRouteSuggestions(routes: ResolvedRouteData[], originPoint: Coordinates, destinationPoint: Coordinates) {
  return routes
    .map((route) => {
      const closestA = getClosestIndex(originPoint, route.coordenadas);
      const closestB = getClosestIndex(destinationPoint, route.coordenadas);

      if (closestA.distance > PROXIMITY_METERS || closestB.distance > PROXIMITY_METERS) {
        return null;
      }

      if (closestA.index >= closestB.index) {
        return null;
      }

      const segment = route.coordenadas.slice(closestA.index, closestB.index + 1);
      if (segment.length < 2) {
        return null;
      }

      const segmentMeters = getSegmentLengthMeters(segment);
      const score = closestA.distance + closestB.distance + segmentMeters * SEGMENT_LENGTH_FACTOR;

      return {
        routeId: route.id,
        ruta: route.nombre,
        direccion: route.direccion,
        distanciaA: closestA.distance,
        distanciaB: closestB.distance,
        indexA: closestA.index,
        indexB: closestB.index,
        segment,
        score
      };
    })
    .filter((item): item is RouteOption => item !== null)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
}

function getEstimatedMinutes(segment: Coordinates[]) {
  const kilometers = getSegmentLengthMeters(segment) / 1000;
  const minutes = (kilometers / AVG_TRIP_SPEED_KMH) * 60;
  return Math.max(4, Math.round(minutes));
}

export default function HomePage() {
  const [groupedRoutes, setGroupedRoutes] = useState<GroupedRouteData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<RouteDirection>("ida");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [originPoint, setOriginPoint] = useState<Coordinates | null>(null);
  const [destinationPoint, setDestinationPoint] = useState<Coordinates | null>(null);
  const [activePoint, setActivePoint] = useState<ActivePoint>("origin");
  const [suggestions, setSuggestions] = useState<RouteOption[]>([]);
  const [isCalculatingSuggestions, setIsCalculatingSuggestions] = useState(false);
  const [showHint, setShowHint] = useState(true);
  // nearbyToast: null = hidden, number = route count (0 means none found)
  const [nearbyToast, setNearbyToast] = useState<number | null>(null);
  const [nearbyRouteIds, setNearbyRouteIds] = useState<number[]>([]);
  const [showTeleferico, setShowTeleferico] = useState(false);
  const { share: shareRoute, status: shareStatus } = useShareRoute();
  const activePointRef = useRef(activePoint);
  const originPointRef = useRef(originPoint);
  const destinationPointRef = useRef(destinationPoint);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/rutas")
      .then((res) => res.json())
      .then((data: GroupedRouteData[]) => {
        if (!cancelled) {
          setGroupedRoutes(data);
          setIsLoadingData(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoadingData(false);
      });
    return () => { cancelled = true; };
  }, []);

  const flowStep = useMemo(() => getFlowStep(originPoint, destinationPoint), [destinationPoint, originPoint]);

  useEffect(() => {
    activePointRef.current = activePoint;
  }, [activePoint]);

  useEffect(() => {
    originPointRef.current = originPoint;
  }, [originPoint]);

  useEffect(() => {
    destinationPointRef.current = destinationPoint;
  }, [destinationPoint]);

  useEffect(() => {
    if (flowStep === 1 && activePoint !== "origin") {
      setActivePoint("origin");
      return;
    }

    if (flowStep === 2 && activePoint !== "destination") {
      setActivePoint("destination");
    }
  }, [activePoint, flowStep]);

  const fullRoutes = useMemo<ResolvedRouteData[]>(
    () =>
      groupedRoutes
        .map((route, index) => {
          const coordenadas = getCoordinatesByDirection(route, selectedDirection);

          return {
            id: index + 1,
            ruta: route.ruta,
            nombre: route.ruta,
            color: route.color,
            coordenadas,
            direccion: getEffectiveDirection(route, selectedDirection),
            tieneIda: Array.isArray(route.ida) && route.ida.length > 1,
            tieneVuelta: Array.isArray(route.vuelta) && route.vuelta.length > 1
          };
        })
        .filter((route) => route.coordenadas.length > 1),
    [groupedRoutes, selectedDirection]
  );

  const fullRoutesById = useMemo(() => new Map(fullRoutes.map((route) => [route.id, route])), [fullRoutes]);

  const backgroundRoutes = useMemo<ResolvedRouteData[]>(
    () =>
      fullRoutes.map((route) => ({
        ...route,
        coordenadas: simplifyBackgroundCoordinates(route.coordenadas)
      })),
    [fullRoutes]
  );

  const mapRoutes = useMemo(() => {
    if (selectedRouteId === null) {
      return backgroundRoutes;
    }

    const selectedFullRoute = fullRoutesById.get(selectedRouteId);
    if (!selectedFullRoute) {
      return backgroundRoutes;
    }

    return backgroundRoutes.map((route) => (route.id === selectedRouteId ? selectedFullRoute : route));
  }, [backgroundRoutes, fullRoutesById, selectedRouteId]);

  const handleSelectRoute = useCallback((routeId: number) => {
    setSelectedRouteId((current) => (current === routeId ? null : routeId));
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedRouteId(null);
    setShowTeleferico(false);
  }, []);

  const handleNearbyRoutesFound = useCallback((routeIds: number[]) => {
    setNearbyRouteIds(routeIds);
    setNearbyToast(routeIds.length);
  }, []);

  const handleMapPick = useCallback((point: Coordinates) => {
    setShowHint(false);

    const active = activePointRef.current;

    if (active === "origin") {
      setOriginPoint(point);
      setActivePoint("destination");
      return;
    }

    if (active === "destination") {
      setDestinationPoint(point);
      setActivePoint(null);
      return;
    }

    if (!originPointRef.current) {
      setOriginPoint(point);
      setActivePoint("destination");
      return;
    }

    if (!destinationPointRef.current) {
      setDestinationPoint(point);
      setActivePoint(null);
      return;
    }

    setOriginPoint(point);
    setDestinationPoint(null);
    setActivePoint("destination");
  }, []);

  const selectedRoute = useMemo(
    () => (selectedRouteId !== null ? fullRoutesById.get(selectedRouteId) ?? null : null),
    [fullRoutesById, selectedRouteId]
  );

  useEffect(() => {
    if (!originPoint || !destinationPoint) {
      setSuggestions([]);
      setIsCalculatingSuggestions(false);
      return;
    }

    setIsCalculatingSuggestions(true);

    const timer = window.setTimeout(() => {
      const searchRoutes = [
        ...fullRoutes,
        {
          id: 9999,
          ruta: "Teleférico Uruapan",
          nombre: "Teleférico Uruapan",
          color: "#14b8a6",
          coordenadas: TELEFERICO_LINE_COORDS,
          direccion: "ida" as RouteDirection,
          tieneIda: true,
          tieneVuelta: true
        },
        {
          id: 9999,
          ruta: "Teleférico Uruapan",
          nombre: "Teleférico Uruapan",
          color: "#14b8a6",
          coordenadas: [...TELEFERICO_LINE_COORDS].reverse(),
          direccion: "vuelta" as RouteDirection,
          tieneIda: true,
          tieneVuelta: true
        }
      ];

      const nextSuggestions = computeRouteSuggestions(searchRoutes, originPoint, destinationPoint);
      setSuggestions(nextSuggestions);
      setIsCalculatingSuggestions(false);
    }, 80);

    return () => {
      window.clearTimeout(timer);
    };
  }, [destinationPoint, fullRoutes, originPoint]);

  const suggestedRouteIds = useMemo(() => suggestions.map((item) => item.routeId), [suggestions]);
  const bestSuggestion = suggestions[0] ?? null;
  const selectedSuggestion = useMemo(
    () => suggestions.find((item) => item.routeId === selectedRouteId) ?? null,
    [selectedRouteId, suggestions]
  );
  const bestSuggestionEta = useMemo(
    () => (bestSuggestion ? getEstimatedMinutes(bestSuggestion.segment) : null),
    [bestSuggestion]
  );

  const hintMessage = useMemo(() => {
    if (flowStep === 1) {
      return "Paso 1 de 3: toca el mapa para marcar tu origen.";
    }

    if (flowStep === 2) {
      return "Paso 2 de 3: ahora marca tu destino.";
    }

    if (isCalculatingSuggestions) {
      return "Buscando la mejor ruta para tu viaje...";
    }

    if (bestSuggestion) {
      return "Paso 3 de 3: revisa la mejor opcion y toca Ver ruta.";
    }

    return "No encontramos ruta directa. Ajusta A o B y vuelve a intentar.";
  }, [bestSuggestion, flowStep, isCalculatingSuggestions]);

  useEffect(() => {
    setShowHint(true);
  }, [flowStep]);

  useEffect(() => {
    if (!showHint) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setShowHint(false);
    }, flowStep === 3 ? 2600 : 3200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [flowStep, showHint]);

  useEffect(() => {
    if (selectedRouteId !== null && !fullRoutesById.has(selectedRouteId)) {
      setSelectedRouteId(null);
    }
  }, [fullRoutesById, selectedRouteId]);

  if (isLoadingData) {
    return (
      <main className="relative flex h-dvh w-full flex-col items-center justify-center gap-5 overflow-hidden bg-[#0b1220]">
        {/* Mapa skeleton */}
        <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-[#111b2e] to-[#0b1220]" />
        {/* Skeleton rutas */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-30">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-1 animate-pulse rounded-full bg-slate-500"
              style={{
                width: `${55 + (i % 3) * 15}%`,
                animationDelay: `${i * 120}ms`
              }}
            />
          ))}
        </div>
        {/* Logo + spinner */}
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-xl">
            <p className="font-display text-[17px] font-semibold text-white">Rutas Uruapan</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400/60 border-t-transparent" />
            Cargando rutas...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <MapView
        routes={mapRoutes}
        selectedRouteId={selectedRouteId}
        suggestedRouteIds={suggestedRouteIds}
        bestSuggestedRouteId={bestSuggestion?.routeId ?? null}
        selectedRouteSegment={selectedSuggestion?.segment ?? null}
        originPoint={originPoint}
        destinationPoint={destinationPoint}
        showTeleferico={showTeleferico}
        onMapPick={handleMapPick}
        onSelectRoute={handleSelectRoute}
        onNearbyRoutesFound={handleNearbyRoutesFound}
      />

      <section className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="pointer-events-auto inline-flex items-center gap-2.5 rounded-2xl border border-white/20 bg-[var(--surface)] px-3.5 py-2 shadow-soft backdrop-blur-xl">
            <p className="font-display text-[15px] font-semibold leading-none">Rutas Uruapan</p>
            <span className="rounded-full bg-slate-900/10 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-100/10 dark:text-slate-200">
              {fullRoutes.length}
            </span>
          </div>

          <div className="pointer-events-auto rounded-full border border-white/20 bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 shadow-soft backdrop-blur-xl dark:text-slate-300">
            Paso {flowStep}/3
          </div>
        </div>

        {/* ── Nearby routes toast ──────────────────────────────────────── */}
        <div className="pointer-events-auto mt-2">
          <NearbyToast
            count={nearbyToast}
            onView={() => setIsSheetOpen(true)}
            onDismiss={() => setNearbyToast(null)}
          />
        </div>

        <div className={`pointer-events-none mt-2 max-w-[95%] transition-all duration-300 ${showHint ? "opacity-100" : "opacity-0"}`}>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-slate-900/72 px-2.5 py-1.5 text-[11px] font-medium text-cyan-100 backdrop-blur-md dark:bg-slate-950/65">
            <span>{hintMessage}</span>
          </div>
        </div>

        <div className="pointer-events-auto mt-3 w-full max-w-[95%] rounded-full border border-white/20 bg-[var(--surface)] p-1.5 shadow-soft backdrop-blur-xl transition-all duration-300">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setActivePoint("origin");
                setShowHint(true);
              }}
              className={`inline-flex h-9 items-center rounded-full px-3 text-[11px] font-semibold transition active:scale-[0.98] ${
                originPoint
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
                  : "bg-slate-900/10 text-slate-700 dark:bg-slate-100/10 dark:text-slate-200"
              }`}
            >
              A {originPoint ? "listo" : "pendiente"}
            </button>

            <span className="text-slate-400">→</span>

            <button
              type="button"
              onClick={() => {
                setActivePoint("destination");
                setShowHint(true);
              }}
              disabled={!originPoint}
              className={`inline-flex h-9 items-center rounded-full px-3 text-[11px] font-semibold transition active:scale-[0.98] disabled:opacity-50 ${
                destinationPoint
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
                  : "bg-slate-900/10 text-slate-700 dark:bg-slate-100/10 dark:text-slate-200"
              }`}
            >
              B {destinationPoint ? "listo" : "pendiente"}
            </button>

            {(originPoint || destinationPoint) && (
              <button
                type="button"
                onClick={() => {
                  setOriginPoint(null);
                  setDestinationPoint(null);
                  setActivePoint("origin");
                  setShowHint(true);
                }}
                className="ml-auto inline-flex h-9 items-center rounded-full bg-slate-900/10 px-3 text-[11px] font-semibold text-slate-700 transition active:scale-[0.98] dark:bg-slate-100/10 dark:text-slate-200"
              >
                Reiniciar
              </button>
            )}
          </div>
        </div>

        {flowStep === 1 && (
          <div className="pointer-events-auto mt-2.5 w-full max-w-[95%]">
            <button
              type="button"
              onClick={() => {
                setActivePoint("origin");
                setShowHint(true);
              }}
              className="flex h-11 w-full items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-slate-50 shadow-soft transition active:scale-[0.99] dark:bg-slate-100 dark:text-slate-900"
            >
              Seleccionar origen en el mapa
            </button>
          </div>
        )}

        {flowStep === 2 && (
          <div className="pointer-events-auto mt-2.5 w-full max-w-[95%]">
            <button
              type="button"
              onClick={() => {
                setActivePoint("destination");
                setShowHint(true);
              }}
              className="flex h-11 w-full items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-slate-50 shadow-soft transition active:scale-[0.99] dark:bg-slate-100 dark:text-slate-900"
            >
              Seleccionar destino en el mapa
            </button>
          </div>
        )}

        {flowStep === 3 && (
          <div className="pointer-events-auto mt-2.5 w-full max-w-[95%] rounded-2xl border border-white/20 bg-[var(--surface-strong)] p-3 shadow-soft backdrop-blur-xl transition-all duration-300">
            {isCalculatingSuggestions ? (
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-500/70 border-t-transparent" />
                Calculando mejor ruta...
              </div>
            ) : bestSuggestion ? (
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Ruta recomendada</p>
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{bestSuggestion.ruta}</p>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="rounded-full bg-slate-900/10 px-2 py-1 dark:bg-slate-100/10">{bestSuggestionEta} min aprox</span>
                  <span className="rounded-full bg-slate-900/10 px-2 py-1 dark:bg-slate-100/10">
                    {suggestions.length} opcion{suggestions.length === 1 ? "" : "es"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActivePoint("destination");
                      setShowHint(true);
                    }}
                    className="rounded-full bg-slate-900/10 px-3 py-2 text-[11px] font-semibold text-slate-700 transition active:scale-[0.98] dark:bg-slate-100/10 dark:text-slate-200"
                  >
                    Ajustar puntos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRouteId(bestSuggestion.routeId);
                      if (bestSuggestion.routeId === 9999) {
                        setShowTeleferico(true);
                      }
                      setShowHint(false);
                    }}
                    className="rounded-full bg-slate-900 px-3.5 py-2 text-[11px] font-semibold text-slate-50 transition active:scale-[0.98] dark:bg-slate-100 dark:text-slate-900"
                  >
                    Ver ruta
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">No encontramos una ruta directa.</p>
                <button
                  type="button"
                  onClick={() => {
                    setActivePoint("destination");
                    setShowHint(true);
                  }}
                  className="rounded-full bg-slate-900/10 px-3 py-2 text-[11px] font-semibold text-slate-700 transition active:scale-[0.98] dark:bg-slate-100/10 dark:text-slate-200"
                >
                  Mover destino
                </button>
              </div>
            )}

            {(selectedRoute || showTeleferico) && (
              <div className="mt-2.5 flex items-center gap-2 border-t border-slate-200/70 pt-2 dark:border-slate-700/70">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: selectedRoute?.color ?? "#14b8a6" }} // teal for teleférico
                />
                <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">
                  Ruta activa: {selectedRoute?.nombre ?? "Teleférico Uruapan"}
                </span>

                {/* Share button */}
                <button
                  type="button"
                  onClick={() => shareRoute(selectedRoute?.nombre ?? "Teleférico")}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-900/10 text-slate-600 transition hover:bg-slate-900/15 active:scale-95 dark:bg-slate-100/10 dark:text-slate-300 dark:hover:bg-slate-100/20"
                  aria-label={`Compartir ${selectedRoute?.nombre ?? "Teleférico"}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                    <path
                      d="M8.59 13.51l6.83 3.98m-.01-10.98-6.82 3.98M21 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm0 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM3 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="shrink-0 rounded-full bg-slate-900/10 px-2.5 py-1 text-[10px] font-semibold text-slate-700 transition active:scale-[0.98] dark:bg-slate-100/10 dark:text-slate-200"
                >
                  Limpiar
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Share confirmation toast ─────────────────────────────────────── */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className={`pointer-events-none absolute inset-x-0 bottom-24 z-50 flex justify-center transition-all duration-300 ${
          shareStatus !== "idle" ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl ${
            shareStatus === "error"
              ? "border-red-400/30 bg-slate-900/85 text-red-300"
              : "border-emerald-400/30 bg-slate-900/85 text-emerald-300"
          }`}
        >
          {shareStatus === "shared" && (
            <>
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                <path d="M8.59 13.51l6.83 3.98m-.01-10.98-6.82 3.98M21 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm0 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM3 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              ¡Compartido!
            </>
          )}
          {shareStatus === "copied" && (
            <>
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                <path d="M9 12l2 2 4-4M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              ¡Copiado al portapapeles!
            </>
          )}
          {shareStatus === "error" && "❌ No se pudo copiar"}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsSheetOpen(true)}
        className="absolute bottom-5 right-4 z-30 inline-flex h-12 items-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 active:translate-y-0 dark:bg-slate-100 dark:text-slate-900"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
          <path
            d="M4 7H20M4 12H20M4 17H14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        Rutas
      </button>

      <BottomSheet open={isSheetOpen} onOpenChange={setIsSheetOpen} title="Selecciona una ruta">
        <RouteList
          routes={fullRoutes}
          direction={selectedDirection}
          onDirectionChange={setSelectedDirection}
          suggestedRouteIds={suggestedRouteIds}
          bestSuggestedRouteId={bestSuggestion?.routeId ?? null}
          nearbyRouteIds={nearbyRouteIds}
          selectedRouteId={selectedRouteId}
          onClearSelection={() => {
            handleClearSelection();
            setIsSheetOpen(false);
          }}
          onShowTeleferico={() => {
            handleClearSelection();
            setShowTeleferico(true);
            setIsSheetOpen(false);
          }}
          onSelectRoute={(routeId) => {
            handleSelectRoute(routeId);
            setIsSheetOpen(false);
          }}
        />
      </BottomSheet>

      <OnboardingOverlay />
    </main>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ── Sidebar resize constants ──────────────────────────────────────────────────
const SIDEBAR_DEFAULT_MD = 380; // px en breakpoint md (768–1023px)
const SIDEBAR_DEFAULT_LG = 420; // px en breakpoint lg (1024px+)
const SIDEBAR_MIN = 300;        // px mínimo al arrastrar
const SIDEBAR_MAX = 520;        // px máximo al arrastrar
import BottomSheet from "@/components/BottomSheet";
import MapView from "@/components/Map";
import NearbyToast from "@/components/NearbyToast";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import RouteList from "@/components/RouteList";
import { useShareRoute } from "@/hooks/useShareRoute";
import type { Coordinates, GroupedRouteData, ResolvedRouteData, RouteDirection } from "@/lib/types";
import { computeTransferOptions } from "@/lib/transfers";
import type { TransferOption } from "@/lib/transfers";
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
type RoutesMapMode = "all-visible" | "all-highlighted";

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
  // ── Sidebar resize state ────────────────────────────────────────────────────
  // null = usa el default por breakpoint (380/420px via CSS), number = ancho fijo tras drag
  const [sidebarWidth, setSidebarWidth] = useState<number | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(0);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Determinar ancho actual real del sidebar
    const isLg = window.innerWidth >= 1024;
    const currentWidth = sidebarWidth ?? (isLg ? SIDEBAR_DEFAULT_LG : SIDEBAR_DEFAULT_MD);
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = currentWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [sidebarWidth]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = e.clientX - dragStartXRef.current;
      const newWidth = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, dragStartWidthRef.current + delta));
      setSidebarWidth(newWidth);
    };
    const onMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const [groupedRoutes, setGroupedRoutes] = useState<GroupedRouteData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [fetchAttempt, setFetchAttempt] = useState(0);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<RouteDirection>("ida");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [originPoint, setOriginPoint] = useState<Coordinates | null>(null);
  const [destinationPoint, setDestinationPoint] = useState<Coordinates | null>(null);
  const [activePoint, setActivePoint] = useState<ActivePoint>("origin");
  const [suggestions, setSuggestions] = useState<RouteOption[]>([]);
  const [transfers, setTransfers] = useState<TransferOption[]>([]);
  const [isCalculatingSuggestions, setIsCalculatingSuggestions] = useState(false);
  const [showHint, setShowHint] = useState(true);
  // nearbyToast: null = hidden, number = route count (0 means none found)
  const [nearbyToast, setNearbyToast] = useState<number | null>(null);
  const [nearbyRouteIds, setNearbyRouteIds] = useState<number[]>([]);
  const [showTeleferico, setShowTeleferico] = useState(false);
  const [routesMapMode, setRoutesMapMode] = useState<RoutesMapMode>("all-visible");
  const { share: shareRoute, status: shareStatus } = useShareRoute();
  const activePointRef = useRef(activePoint);
  const originPointRef = useRef(originPoint);
  const destinationPointRef = useRef(destinationPoint);
  const hasHydratedMapModeRef = useRef(false);

  useEffect(() => {
    try {
      const storedMode = window.localStorage.getItem("rutas-map-mode");
      if (storedMode === "all-visible" || storedMode === "all-highlighted") {
        setRoutesMapMode(storedMode);
      }
    } catch {
      // noop
    } finally {
      hasHydratedMapModeRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hasHydratedMapModeRef.current) {
      return;
    }

    try {
      window.localStorage.setItem("rutas-map-mode", routesMapMode);
    } catch {
      // noop
    }
  }, [routesMapMode]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/rutas")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: GroupedRouteData[]) => {
        if (!cancelled) {
          if (!Array.isArray(data) || data.length === 0) {
            console.error("[rutas] /api/rutas returned empty or invalid data");
            setFetchError(true);
          } else {
            setGroupedRoutes(data);
          }
          setIsLoadingData(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          console.error("[rutas] Failed to load route data:", err instanceof Error ? err.message : err);
          setFetchError(true);
          setIsLoadingData(false);
        }
      });
    return () => { cancelled = true; };
  }, [fetchAttempt]);

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
      setTransfers([]);
      setIsCalculatingSuggestions(false);
      return;
    }

    setIsCalculatingSuggestions(true);

    const timer = window.setTimeout(() => {
      const nextSuggestions = computeRouteSuggestions(fullRoutes, originPoint, destinationPoint);
      setSuggestions(nextSuggestions);
      // Only compute transfers when no direct route found
      const nextTransfers =
        nextSuggestions.length === 0
          ? computeTransferOptions(fullRoutes, originPoint, destinationPoint)
          : [];
      setTransfers(nextTransfers);
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

  if (fetchError) {
    return (
      <main className="relative flex h-dvh w-full flex-col items-center justify-center gap-4 overflow-hidden bg-[#0b1220] px-6 text-center">
        <p className="font-display text-[18px] font-semibold text-slate-100">No se pudieron cargar las rutas</p>
        <p className="text-[13px] text-slate-400">Verifica tu conexion a internet e intenta de nuevo.</p>
        <button
          type="button"
          onClick={() => { setFetchError(false); setIsLoadingData(true); setFetchAttempt((n) => n + 1); }}
          className="mt-2 inline-flex h-10 items-center rounded-xl bg-[#00D4AA] px-5 text-[13px] font-bold text-[#05131a]"
        >
          Reintentar
        </button>
      </main>
    );
  }

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

  // ── Bloque de JSX compartido: controles A/B + resultado de ruta ──────────────
  // Se renderiza tanto en el overlay mobile como en el sidebar desktop.
  // Extraido como funcion local para evitar duplicacion de JSX.
  const renderRouteControls = (context: "mobile" | "desktop") => {
    const isMobile = context === "mobile";
    return (
      <>
        {/* A→B pill bar */}
        <div className={`${isMobile ? "w-full" : "w-full"} rounded-2xl border border-white/10 bg-[#0E1526]/95 p-1.5 shadow-soft backdrop-blur-xl`}>
          <div className="flex items-center gap-1.5">
            {/* Origin button */}
            <button
              type="button"
              onClick={() => {
                setActivePoint("origin");
                setShowHint(true);
              }}
              className={`inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition active:scale-[0.97] ${
                originPoint
                  ? "border-[#00D4AA]/50 bg-[#00D4AA]/15 text-[#00D4AA]"
                  : activePoint === "origin"
                    ? "ring-pulse-active border-[#00D4AA]/60 bg-[#00D4AA]/10 text-[#00D4AA]"
                    : "border-white/10 bg-white/5 text-white/40"
              }`}
              aria-label={originPoint ? "Punto A marcado, toca para cambiar" : "Toca para marcar punto de origen"}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
                <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2" fill="currentColor" />
              </svg>
              <span className="truncate">{originPoint ? "A marcado" : "Origen"}</span>
              {originPoint && (
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0 text-[#00D4AA]" aria-hidden="true">
                  <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>

            {/* Separator */}
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            {/* Destination button */}
            <button
              type="button"
              onClick={() => {
                setActivePoint("destination");
                setShowHint(true);
              }}
              disabled={!originPoint}
              className={`inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition active:scale-[0.97] disabled:opacity-40 ${
                destinationPoint
                  ? "border-[#00D4AA]/50 bg-[#00D4AA]/15 text-[#00D4AA]"
                  : activePoint === "destination"
                    ? "ring-pulse-active border-[#00D4AA]/60 bg-[#00D4AA]/10 text-[#00D4AA]"
                    : "border-white/10 bg-white/5 text-white/40"
              }`}
              aria-label={destinationPoint ? "Punto B marcado, toca para cambiar" : "Toca para marcar punto de destino"}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.5" />
              </svg>
              <span className="truncate">{destinationPoint ? "B marcado" : "Destino"}</span>
              {destinationPoint && (
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0 text-[#00D4AA]" aria-hidden="true">
                  <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>

            {/* Reset */}
            {(originPoint || destinationPoint) && (
              <button
                type="button"
                onClick={() => {
                  setOriginPoint(null);
                  setDestinationPoint(null);
                  setActivePoint("origin");
                  setShowHint(true);
                }}
                className="inline-flex h-10 items-center rounded-xl border border-red-400/20 bg-red-500/8 px-2.5 text-[12px] font-semibold text-red-300 transition active:scale-[0.97]"
                aria-label="Reiniciar puntos A y B"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 3v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Context action — pasos 1 y 2 */}
        {(flowStep === 1 || flowStep === 2) && (
          <div className="w-full">
            <div className="flex items-center gap-1.5 rounded-2xl border border-[#00D4AA]/25 bg-[#0E1526]/92 px-3.5 py-2.5 backdrop-blur-xl">
              <span className="relative flex h-3 w-3 shrink-0" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00D4AA]/60 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[#00D4AA]" />
              </span>
              <p className="flex-1 text-[13px] font-medium text-slate-200">
                {flowStep === 1 ? "Toca el mapa para marcar tu" : "Ahora toca para marcar tu"}{" "}
                <span className="font-bold text-[#00D4AA]">{flowStep === 1 ? "origen" : "destino"}</span>
              </p>
            </div>
          </div>
        )}

        {/* Resultado de ruta — paso 3 */}
        {flowStep === 3 && (
          <div
            className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[#141D33] shadow-[0_4px_24px_rgba(0,212,170,0.10)] backdrop-blur-xl transition-all duration-300"
            style={{ borderLeftWidth: "3px", borderLeftColor: selectedRoute?.color ?? "#00D4AA" }}
          >
            {isCalculatingSuggestions ? (
              <div className="flex items-center gap-3 px-4 py-3.5">
                <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[#00D4AA]/60 border-t-transparent" />
                <span className="text-[13px] font-medium text-slate-200">Buscando mejor ruta...</span>
              </div>
            ) : bestSuggestion ? (
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold tracking-[2px] text-[#00D4AA]/80">RUTA RECOMENDADA</p>
                <p className="mt-0.5 truncate font-display text-[17px] font-bold leading-tight text-slate-100">
                  {bestSuggestion.ruta}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-lg border border-[#00D4AA]/25 bg-[#00D4AA]/10 px-2.5 py-1 text-[12px] font-semibold text-[#00D4AA]">
                    <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    {bestSuggestionEta} min aprox
                  </span>
                  {suggestions.length > 1 && (
                    <span className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[12px] font-medium text-slate-400">
                      +{suggestions.length - 1} alternativa{suggestions.length > 2 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setActivePoint("destination"); setShowHint(true); }}
                    className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[12px] font-semibold text-slate-300 transition active:scale-[0.97]"
                  >
                    Ajustar
                  </button>
                  <button
                    type="button"
                    onClick={() => shareRoute(bestSuggestion.ruta)}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition active:scale-[0.97]"
                    aria-label={`Compartir ruta ${bestSuggestion.ruta}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                      <path d="M8.59 13.51l6.83 3.98m-.01-10.98-6.82 3.98M21 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm0 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM3 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedRouteId(bestSuggestion.routeId); setShowHint(false); }}
                    className="inline-flex h-9 flex-[2] items-center justify-center gap-1.5 rounded-xl bg-[#00D4AA] text-[12px] font-bold text-[#05131a] shadow-[0_2px_12px_rgba(0,212,170,0.35)] transition active:scale-[0.97]"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                      <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13V7m0 13 6-3M9 7l6-3m6 17V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Ver en mapa
                  </button>
                </div>
              </div>
            ) : transfers.length > 0 ? (
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold tracking-[2px] text-amber-400/80">CON TRANSBORDO</p>
                <p className="mt-0.5 text-[12px] text-slate-400">No hay ruta directa. Opciones con cambio de ruta:</p>
                <ul className="mt-2 space-y-1.5">
                  {transfers.map((t) => (
                    <li key={`${t.routeAId}-${t.routeBId}`}>
                      <button
                        type="button"
                        onClick={() => setSelectedRouteId(t.routeAId)}
                        className="flex w-full items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/8 px-3 py-2 text-left transition active:scale-[0.99] hover:bg-amber-500/12"
                      >
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true">
                          <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3M12 8v8M9 11l3-3 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-semibold text-slate-100">
                            {t.routeAName}
                          </span>
                          <span className="block truncate text-[11px] text-slate-400">
                            → transbordo → {t.routeBName}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                          ~{Math.round(t.walkMeters)}m
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => { setActivePoint("destination"); setShowHint(true); }}
                  className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[12px] font-semibold text-slate-300 transition active:scale-[0.97]"
                >
                  Mover destino
                </button>
              </div>
            ) : (
              <div className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-amber-400" aria-hidden="true">
                      <path d="M12 8v4m0 4h.01M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-slate-100">Sin ruta directa</p>
                    <p className="mt-0.5 text-[12px] leading-snug text-slate-400">Ajusta alguno de los puntos e intenta de nuevo.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setActivePoint("destination"); setShowHint(true); }}
                  className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[12px] font-semibold text-slate-300 transition active:scale-[0.97]"
                >
                  Mover destino
                </button>
              </div>
            )}

            {/* Ruta activa */}
            {(selectedRoute || showTeleferico) && (
              <div className="flex items-center gap-2 border-t border-white/8 px-4 py-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: selectedRoute?.color ?? "#14b8a6" }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-slate-300">
                  {selectedRoute?.nombre ?? "Teleférico Uruapan"}
                </span>
                <button
                  type="button"
                  onClick={() => shareRoute(selectedRoute?.nombre ?? "Teleférico")}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-slate-400 transition hover:bg-white/10 active:scale-95"
                  aria-label={`Compartir ${selectedRoute?.nombre ?? "Teleférico"}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                    <path d="M8.59 13.51l6.83 3.98m-.01-10.98-6.82 3.98M21 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm0 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM3 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition active:scale-[0.97]"
                >
                  Limpiar
                </button>
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  return (
    <main className="relative flex h-dvh w-full overflow-hidden">

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP SIDEBAR (md+)
          Panel izquierdo redimensionable. Default: 380px en md, 420px en lg.
          El usuario puede arrastrar el handle derecho entre 300px y 520px.
          En mobile: oculto (los controles van en el overlay flotante y el BottomSheet).
      ══════════════════════════════════════════════════════════════════════ */}
      <aside
        className={`relative z-30 hidden h-full shrink-0 flex-col border-r border-white/8 bg-[#0b1220]/98 backdrop-blur-2xl md:flex ${
          sidebarWidth == null ? "md:w-[380px] lg:w-[420px]" : ""
        }`}
        style={sidebarWidth != null ? { width: `${sidebarWidth}px` } : undefined}
      >

        {/* ── Header del sidebar ──────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-5 py-4">
          <div className="flex items-center gap-2.5">
            {/* Dot de estado */}
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00D4AA] opacity-50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#00D4AA]" />
            </span>
            <p className="font-display text-[15px] font-bold text-slate-100">Rutas Uruapan</p>
            <span className="rounded-full border border-[#00D4AA]/25 bg-[#00D4AA]/10 px-2 py-0.5 text-[11px] font-semibold text-[#00D4AA]">
              {fullRoutes.length} rutas
            </span>
          </div>

          {/* Mode toggle */}
          <button
            type="button"
            onClick={() => setRoutesMapMode((current) => (current === "all-visible" ? "all-highlighted" : "all-visible"))}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition hover:scale-105 active:scale-95 ${
              routesMapMode === "all-highlighted"
                ? "border-[#00D4AA]/40 bg-[#00D4AA]/12 text-[#00D4AA]"
                : "border-white/12 bg-white/5 text-white/50 hover:border-white/25 hover:text-white/80"
            }`}
            aria-label={routesMapMode === "all-visible" ? "Cambiar a modo todas destacadas" : "Cambiar a modo todas visibles"}
            title={routesMapMode === "all-visible" ? "Modo: todas visibles" : "Modo: todas destacadas"}
          >
            <span aria-hidden="true">👁</span>
          </button>
        </div>

        {/* ── Flow step indicator + hint ──────────────────────────────────── */}
        <div className="shrink-0 border-b border-white/5 px-5 py-3">
          {/* Step pills */}
          <div className="mb-2.5 flex items-center gap-2" aria-label={`Paso ${flowStep} de 3 para encontrar tu ruta`}>
            {[
              { n: 1, label: "Origen" },
              { n: 2, label: "Destino" },
              { n: 3, label: "Resultado" }
            ].map(({ n, label }) => {
              const isActive = n === flowStep;
              const isDone = n < flowStep;
              return (
                <div key={n} className="flex flex-1 flex-col items-center gap-1">
                  <div className={`h-1 w-full rounded-full transition-all duration-300 ${
                    isActive ? "bg-[#00D4AA]" : isDone ? "bg-[#00D4AA]/40" : "bg-white/12"
                  }`} />
                  <span className={`text-[10px] font-semibold transition-colors duration-300 ${
                    isActive ? "text-[#00D4AA]" : isDone ? "text-[#00D4AA]/60" : "text-white/25"
                  }`}>{label}</span>
                </div>
              );
            })}
          </div>

          {/* Hint message */}
          <div className={`transition-all duration-300 ${showHint ? "opacity-100" : "opacity-0"}`}>
            <p className="text-[12px] leading-snug text-slate-400">{hintMessage}</p>
          </div>
        </div>

        {/* ── Controles A/B + resultado de ruta ──────────────────────────── */}
        <div className="shrink-0 space-y-2.5 border-b border-white/5 px-5 py-4">
          {renderRouteControls("desktop")}
        </div>

        {/* ── NearbyToast en sidebar ──────────────────────────────────────── */}
        {nearbyToast !== null && (
          <div className="shrink-0 px-5 pt-3">
            <NearbyToast
              count={nearbyToast}
              onView={() => {/* En desktop ya se ve la lista abajo */}}
              onDismiss={() => setNearbyToast(null)}
            />
          </div>
        )}

        {/* ── Lista de rutas (scrollable) ─────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <RouteList
            routes={fullRoutes}
            isLoading={isLoadingData}
            direction={selectedDirection}
            onDirectionChange={setSelectedDirection}
            suggestedRouteIds={suggestedRouteIds}
            bestSuggestedRouteId={bestSuggestion?.routeId ?? null}
            nearbyRouteIds={nearbyRouteIds}
            selectedRouteId={selectedRouteId}
            onClearSelection={handleClearSelection}
            onShowTeleferico={() => {/* no-op en desktop, el sidebar permanece abierto */}}
            onSelectRoute={handleSelectRoute}
          />
        </div>

        {/* ── Footer del sidebar: creditos ────────────────────────────────── */}
        <div className="shrink-0 border-t border-white/5 px-5 py-3">
          <p className="text-[11px] text-slate-600">
            Rutas Uruapan · Datos actualizados · Uruapan, Mich.
          </p>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════════
          DRAG HANDLE — solo visible en md+
          Barra vertical de 4px entre sidebar y mapa. El usuario arrastra para
          redimensionar el sidebar entre 300px y 520px.
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        role="separator"
        aria-label="Redimensionar panel lateral"
        aria-orientation="vertical"
        className="group relative z-40 hidden w-1 shrink-0 cursor-col-resize md:flex md:flex-col md:items-center md:justify-center"
        onMouseDown={handleDragStart}
      >
        {/* Track line */}
        <div className="absolute inset-y-0 left-0 w-1 bg-white/5 transition-colors duration-150 group-hover:bg-[#00D4AA]/30 group-active:bg-[#00D4AA]/50" />
        {/* Grip icon — centrado verticalmente */}
        <div className="relative z-10 flex flex-col items-center gap-[3px] rounded-full border border-white/10 bg-[#0b1220] px-0.5 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.4)] transition-all duration-150 group-hover:border-[#00D4AA]/30 group-hover:bg-[#0E1526] group-hover:shadow-[0_2px_12px_rgba(0,212,170,0.15)]">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="block h-[3px] w-[3px] rounded-full bg-white/25 transition-colors duration-150 group-hover:bg-[#00D4AA]/60"
            />
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MAPA — ocupa todo el espacio restante
          En mobile: ocupa 100% del ancho (el sidebar está oculto)
          En desktop: ocupa flex-1 (el resto del ancho tras el sidebar)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative flex-1">
        <MapView
          routes={mapRoutes}
          selectedRouteId={selectedRouteId}
          suggestedRouteIds={suggestedRouteIds}
          allRoutesMode={routesMapMode}
          bestSuggestedRouteId={bestSuggestion?.routeId ?? null}
          selectedRouteSegment={selectedSuggestion?.segment ?? null}
          originPoint={originPoint}
          destinationPoint={destinationPoint}
          showTeleferico={showTeleferico}
          onMapPick={handleMapPick}
          onSelectRoute={handleSelectRoute}
          onNearbyRoutesFound={handleNearbyRoutesFound}
        />

        {/* ── MOBILE: Top overlay (oculto en desktop) ── */}
        <section className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-safe-or-4 md:hidden">
          {/* Row 1: logo pill + mode toggle */}
          <div className="flex items-center gap-2">
            <div className="pointer-events-auto inline-flex items-center gap-2 rounded-2xl border border-[#00D4AA]/20 bg-[#0E1526]/95 px-3 py-2 shadow-[0_4px_24px_rgba(0,212,170,0.08)] backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-[#00D4AA]" aria-hidden="true" />
              <p className="font-display text-[14px] font-semibold leading-none text-slate-100">Rutas Uruapan</p>
              <span className="rounded-full bg-white/8 px-1.5 py-0.5 text-[11px] font-medium text-slate-400">
                {fullRoutes.length}
              </span>
              <span className="ml-0.5 inline-flex items-center gap-1" aria-label={`Paso ${flowStep} de 3`}>
                {[1, 2, 3].map((step) => {
                  const isActive = step === flowStep;
                  const isDone = step < flowStep;
                  return (
                    <span
                      key={step}
                      className={`rounded-full transition-all duration-300 ${
                        isActive ? "h-2 w-4 bg-[#00D4AA]" : isDone ? "h-2 w-2 bg-[#00D4AA]/50" : "h-2 w-2 bg-white/20"
                      }`}
                    />
                  );
                })}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setRoutesMapMode((current) => (current === "all-visible" ? "all-highlighted" : "all-visible"))}
              className={`pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-xl border text-sm transition active:scale-[0.97] ${
                routesMapMode === "all-highlighted"
                  ? "border-[#00D4AA]/50 bg-[#00D4AA]/15 text-[#00D4AA]"
                  : "border-white/15 bg-[#0E1526]/95 text-white/60"
              }`}
              aria-label={routesMapMode === "all-visible" ? "Cambiar a modo todas destacadas" : "Cambiar a modo todas visibles"}
              title={routesMapMode === "all-visible" ? "Modo: todas visibles" : "Modo: todas destacadas"}
            >
              <span aria-hidden="true">👁</span>
            </button>
          </div>

          {/* Row 2: Nearby toast */}
          <div className="pointer-events-auto mt-2">
            <NearbyToast
              count={nearbyToast}
              onView={() => setIsSheetOpen(true)}
              onDismiss={() => setNearbyToast(null)}
            />
          </div>

          {/* Row 3: Hint pill */}
          <div className={`pointer-events-none mt-2 transition-all duration-300 ${showHint ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"}`}>
            <div className="inline-flex max-w-[95%] items-center gap-2 rounded-full border border-[#00D4AA]/30 bg-[#0E1526]/92 px-3 py-1.5 text-[12px] font-medium leading-snug text-[#00D4AA] backdrop-blur-md">
              <span>{hintMessage}</span>
            </div>
          </div>

          {/* Row 4: A/B controls */}
          <div className="pointer-events-auto mt-2">
            {renderRouteControls("mobile")}
          </div>
        </section>

        {/* ── Share toast (mobile + desktop, posicion ajustada) ── */}
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
                  <path d="M8.59 13.51l6.83 3.98m-.01-10.98-6.82 3.98M21 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm0 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM3 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Compartido!
              </>
            )}
            {shareStatus === "copied" && (
              <>
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M9 12l2 2 4-4M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Copiado al portapapeles!
              </>
            )}
            {shareStatus === "error" && "No se pudo copiar"}
          </div>
        </div>

        {/* ── MOBILE ONLY: Floating "Ver rutas" button ── */}
        <button
          type="button"
          onClick={() => setIsSheetOpen(true)}
          className="absolute bottom-6 right-4 z-30 inline-flex h-12 items-center gap-2 rounded-2xl border border-white/15 bg-[#0E1526]/95 pl-3.5 pr-4 text-[14px] font-semibold text-white shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl transition hover:border-[#00D4AA]/40 hover:shadow-[0_8px_32px_rgba(0,212,170,0.15)] active:scale-[0.97] md:hidden"
          style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
          aria-label={`Ver las ${fullRoutes.length} rutas disponibles`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-[#00D4AA]" aria-hidden="true">
            <path d="M4 7H20M4 12H20M4 17H14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <span>Rutas</span>
          <span className="ml-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#00D4AA]/20 px-1.5 text-[11px] font-bold text-[#00D4AA]">
            {fullRoutes.length}
          </span>
        </button>
      </div>

      {/* ── MOBILE ONLY: BottomSheet con lista de rutas ── */}
      <BottomSheet open={isSheetOpen} onOpenChange={setIsSheetOpen} title="Selecciona una ruta">
        <RouteList
          routes={fullRoutes}
          isLoading={isLoadingData}
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

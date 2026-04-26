"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

// ── Sidebar resize constants ──────────────────────────────────────────────────
const SIDEBAR_DEFAULT_MD = 380; // px en breakpoint md (768–1023px)
const SIDEBAR_DEFAULT_LG = 420; // px en breakpoint lg (1024px+)
const SIDEBAR_MIN = 300;        // px mínimo al arrastrar
const SIDEBAR_MAX = 520;        // px máximo al arrastrar
import BottomSheet from "@/components/BottomSheet";
import NearbyToast from "@/components/NearbyToast";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import RouteList from "@/components/RouteList";
import RouteSchedule from "@/components/RouteSchedule";
import { useShareRoute } from "@/hooks/useShareRoute";
import { formatRouteLabel } from "@/lib/route-names";
import type { Coordinates, GroupedRouteData, ResolvedRouteData, RouteDirection } from "@/lib/types";
import { computeTransferOptions } from "@/lib/transfers";
import type { TransferOption } from "@/lib/transfers";
const PROXIMITY_METERS = 550;
const SEGMENT_LENGTH_FACTOR = 0.04;
const AVG_TRIP_SPEED_KMH = 18;
const BACKGROUND_SIMPLIFY_TOLERANCE = 0.00008;
const BACKGROUND_MAX_POINTS = 180;

const MapView = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-ink-900" />
});

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
  const [isResultSheetOpen, setIsResultSheetOpen] = useState(false);
  const [originPoint, setOriginPoint] = useState<Coordinates | null>(null);
  const [destinationPoint, setDestinationPoint] = useState<Coordinates | null>(null);
  const [activePoint, setActivePoint] = useState<ActivePoint>("origin");
  const [suggestions, setSuggestions] = useState<RouteOption[]>([]);
  const [transfers, setTransfers] = useState<TransferOption[]>([]);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferOption | null>(null);
  const [isCalculatingSuggestions, setIsCalculatingSuggestions] = useState(false);
  const [showHint, setShowHint] = useState(true);
  // nearbyToast: null = hidden, number = route count (0 means none found)
  const [nearbyToast, setNearbyToast] = useState<number | null>(null);
  const [nearbyRouteIds, setNearbyRouteIds] = useState<number[]>([]);
  const [showTeleferico, setShowTeleferico] = useState(false);
  const [routesMapMode, setRoutesMapMode] = useState<RoutesMapMode>("all-visible");
  const [isOnline, setIsOnline] = useState(true);
  const { share: shareRoute, status: shareStatus } = useShareRoute();
  const activePointRef = useRef(activePoint);
  const originPointRef = useRef(originPoint);
  const destinationPointRef = useRef(destinationPoint);
  const hasHydratedMapModeRef = useRef(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

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
    setSelectedTransfer(null);
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
      setSelectedTransfer(null);
      setIsCalculatingSuggestions(false);
      return;
    }

    setIsCalculatingSuggestions(true);

    const timer = window.setTimeout(() => {
      const nextSuggestions = computeRouteSuggestions(fullRoutes, originPoint, destinationPoint);
      setSuggestions(nextSuggestions);
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
  const routeTextSummary = useMemo(() => {
    if (isCalculatingSuggestions || flowStep !== 3) {
      return null;
    }

    if (bestSuggestion) {
      return {
        title: "Indicaciones en texto",
        items: [
          `Toma ${formatRouteLabel(bestSuggestion.ruta)}.`,
          `Tiempo estimado: ${bestSuggestionEta ?? getEstimatedMinutes(bestSuggestion.segment)} minutos.`,
          `Camina aproximadamente ${Math.round(bestSuggestion.distanciaA)} m al punto de abordaje y ${Math.round(bestSuggestion.distanciaB)} m al destino final.`
        ]
      };
    }

    if (selectedTransfer) {
      return {
        title: "Indicaciones con transbordo",
        items: [
          `Primero toma ${formatRouteLabel(selectedTransfer.routeAName)}.`,
          `Camina aproximadamente ${Math.round(selectedTransfer.walkMeters)} m en el punto de transbordo.`,
          `Continúa en ${formatRouteLabel(selectedTransfer.routeBName)} hasta acercarte al destino.`
        ]
      };
    }

    if (transfers.length > 0) {
      return {
        title: "Opciones de transbordo disponibles",
        items: transfers.slice(0, 2).map((transfer) => `${formatRouteLabel(transfer.routeAName)} a ${formatRouteLabel(transfer.routeBName)}, caminando ~${Math.round(transfer.walkMeters)} m para transbordar.`)
      };
    }

    return {
      title: "Sin ruta directa",
      items: ["Mueve el origen o destino a una avenida, colonia o punto conocido cercano para intentar de nuevo."]
    };
  }, [bestSuggestion, bestSuggestionEta, flowStep, isCalculatingSuggestions, selectedTransfer, transfers]);
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

  // Cerrar el result sheet al salir del paso 3
  useEffect(() => {
    if (flowStep !== 3) setIsResultSheetOpen(false);
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
    const offline = !isOnline;
    return (
      <main className="relative flex h-dvh w-full flex-col items-center justify-center gap-4 overflow-hidden bg-ink-900 px-6 text-center">
        <p className="font-display text-[18px] font-semibold text-cream-50">No se pudieron cargar las rutas</p>
        <p className="max-w-sm text-[13px] leading-6 text-cream-100/60">
          {offline
            ? "Estás sin conexión y no hay datos de rutas guardados para esta sesión. Conéctate una vez para que la PWA pueda guardar la información."
            : "La app no pudo obtener los datos de rutas. Puede ser un problema temporal del servidor o de la caché del navegador."}
        </p>
        <button
          type="button"
          onClick={() => { setFetchError(false); setIsLoadingData(true); setFetchAttempt((n) => n + 1); }}
          className="mt-2 inline-flex h-12 items-center rounded-xl bg-terracota-400 px-6 text-[13px] font-bold text-cream-50"
        >
          Reintentar
        </button>
      </main>
    );
  }

  // ── Bloque de JSX compartido: controles A/B + resultado de ruta ──────────────
  // Se renderiza tanto en el overlay mobile como en el sidebar desktop.
  // Extraido como funcion local para evitar duplicacion de JSX.
  const renderRouteControls = (context: "mobile" | "desktop", hideStep3 = false) => {
    const isMobile = context === "mobile";
    return (
      <>
        {/* A→B pill bar */}
        <div className="ov-panel w-full rounded-2xl border p-1.5 shadow-soft backdrop-blur-xl">
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
                  ? "border-terracota-400/50 bg-terracota-400/15 text-terracota-400"
                  : activePoint === "origin"
                    ? "ring-pulse-active border-terracota-400/60 bg-terracota-400/10 text-terracota-400"
                    : "ov-pill ov-border ov-text-muted"
              }`}
              aria-label={originPoint ? "Punto A marcado, toca para cambiar" : "Toca para marcar punto de origen"}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
                <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2" fill="currentColor" />
              </svg>
              <span className="truncate">{originPoint ? "A marcado" : "Origen"}</span>
              {originPoint && (
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0 text-terracota-400" aria-hidden="true">
                  <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>

            {/* Separator */}
            <svg viewBox="0 0 24 24" fill="none" className="ov-text-muted h-4 w-4 shrink-0" aria-hidden="true">
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
                  ? "border-terracota-400/50 bg-terracota-400/15 text-terracota-400"
                  : activePoint === "destination"
                    ? "ring-pulse-active border-terracota-400/60 bg-terracota-400/10 text-terracota-400"
                    : "ov-pill ov-border ov-text-muted"
              }`}
              aria-label={destinationPoint ? "Punto B marcado, toca para cambiar" : "Toca para marcar punto de destino"}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.5" />
              </svg>
              <span className="truncate">{destinationPoint ? "B marcado" : "Destino"}</span>
              {destinationPoint && (
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0 text-terracota-400" aria-hidden="true">
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
                className="inline-flex h-10 items-center rounded-xl border border-red-500/30 bg-red-500/10 px-2.5 text-[12px] font-semibold text-red-500 transition active:scale-[0.97]"
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
            <div className="ov-panel flex items-center gap-1.5 rounded-2xl border px-3.5 py-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.15)] backdrop-blur-xl">
              <span className="relative flex h-3 w-3 shrink-0" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-terracota-400/60 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-terracota-400" />
              </span>
              <p className="ov-text flex-1 text-[13px] font-medium">
                {flowStep === 1 ? "Toca el mapa para marcar tu" : "Ahora toca para marcar tu"}{" "}
                <span className="font-bold text-terracota-400">{flowStep === 1 ? "origen" : "destino"}</span>
              </p>
            </div>
          </div>
        )}

        {/* Resultado de ruta — paso 3 (en mobile va en el result sheet) */}
        {flowStep === 3 && !hideStep3 && (
          <div
            aria-live="polite"
            className="ov-panel-soft w-full overflow-hidden rounded-2xl border shadow-[0_4px_24px_rgba(232,93,47,0.10)] backdrop-blur-xl transition-all duration-300"
            style={{ borderLeftWidth: "3px", borderLeftColor: selectedRoute?.color ?? "#E85D2F" }}
          >
            {isCalculatingSuggestions ? (
              <div className="flex items-center gap-3 px-4 py-3.5">
                <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-terracota-400/60 border-t-transparent" />
                <span className="ov-text text-[13px] font-medium">Buscando mejor ruta...</span>
              </div>
            ) : bestSuggestion ? (
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold tracking-[2px] text-terracota-400">RUTA RECOMENDADA</p>
                <p className="ov-text mt-0.5 truncate font-display text-[17px] font-bold leading-tight">
                  {formatRouteLabel(bestSuggestion.ruta)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-lg border border-terracota-400/25 bg-terracota-400/10 px-2.5 py-1 text-[12px] font-semibold text-terracota-400">
                    <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    {bestSuggestionEta} min aprox
                  </span>
                  {suggestions.length > 1 && (
                    <span className="ov-pill ov-border ov-text-muted inline-flex items-center rounded-lg border px-2.5 py-1 text-[12px] font-medium">
                      +{suggestions.length - 1} alternativa{suggestions.length > 2 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setActivePoint("destination"); setShowHint(true); }}
                    className="ov-pill ov-border ov-text-muted inline-flex h-10 flex-1 items-center justify-center rounded-xl border text-[12px] font-semibold transition active:scale-[0.97]"
                  >
                    Ajustar
                  </button>
                  <button
                    type="button"
                    onClick={() => shareRoute(formatRouteLabel(bestSuggestion.ruta), bestSuggestion.routeId)}
                    className="ov-pill ov-border ov-text-muted inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition active:scale-[0.97]"
                    aria-label={`Compartir ruta ${formatRouteLabel(bestSuggestion.ruta)}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                      <path d="M8.59 13.51l6.83 3.98m-.01-10.98-6.82 3.98M21 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm0 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM3 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedRouteId(bestSuggestion.routeId); setShowHint(false); }}
                    className="inline-flex h-10 flex-[2] items-center justify-center gap-1.5 rounded-xl bg-terracota-400 text-[12px] font-bold text-cream-50 shadow-[0_2px_12px_rgba(232,93,47,0.35)] transition active:scale-[0.97]"
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
                <p className="text-[10px] font-bold tracking-[2px] text-avocado-400">CON TRANSBORDO</p>
                <p className="ov-text-muted mt-0.5 text-[12px]">No hay ruta directa. Opciones con cambio de ruta:</p>
                <ul className="mt-2 max-h-[200px] space-y-1.5 overflow-y-auto">
                  {transfers.map((t) => (
                    <li key={`${t.routeAId}-${t.routeBId}`}>
                      <button
                        type="button"
                        onClick={() => { setSelectedTransfer(t); setTransfers([]); }}
                        className="flex w-full items-center gap-2 rounded-xl border border-avocado-400/20 bg-avocado-400/8 px-3 py-2 text-left transition active:scale-[0.99] hover:bg-avocado-400/12"
                      >
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-avocado-400" aria-hidden="true">
                          <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3M12 8v8M9 11l3-3 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="min-w-0 flex-1">
                          <span className="ov-text block truncate text-[12px] font-semibold">
                            {t.routeAName}
                          </span>
                          <span className="ov-text-muted block truncate text-[11px]">
                            → transbordo → {t.routeBName}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-avocado-400/15 px-2 py-0.5 text-[10px] font-semibold text-avocado-600">
                          ~{Math.round(t.walkMeters)}m
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => { setActivePoint("destination"); setShowHint(true); }}
                  className="ov-pill ov-border ov-text-muted mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl border text-[12px] font-semibold transition active:scale-[0.97]"
                >
                  Mover destino
                </button>
              </div>
            ) : selectedTransfer ? (
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold tracking-[2px] text-avocado-400">TRANSBORDO SELECCIONADO</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="ov-text flex-1 truncate text-[13px] font-semibold">{selectedTransfer.routeAName}</span>
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-avocado-400" aria-hidden="true">
                    <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3M12 8v8M9 11l3-3 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="ov-text flex-1 truncate text-[13px] font-semibold">{selectedTransfer.routeBName}</span>
                </div>
                <p className="ov-text-muted mt-1 text-[11px]">Camina ~{Math.round(selectedTransfer.walkMeters)} m en el punto de transbordo</p>
                <button
                  type="button"
                  onClick={() => { setSelectedTransfer(null); setTransfers(transfers.length === 0 ? [] : transfers); handleClearSelection(); }}
                  className="ov-pill ov-border ov-text-muted mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl border text-[12px] font-semibold transition active:scale-[0.97]"
                >
                  Limpiar
                </button>
              </div>
            ) : (
              <div className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-avocado-400/15">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-avocado-400" aria-hidden="true">
                      <path d="M12 8v4m0 4h.01M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div className="flex-1">
                    <p className="ov-text text-[13px] font-semibold">Sin ruta directa</p>
                    <p className="ov-text-muted mt-0.5 text-[12px] leading-snug">Ajusta alguno de los puntos e intenta de nuevo.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDirection((d) => (d === "ida" ? "vuelta" : "ida"))}
                  className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-terracota-400/25 bg-terracota-400/8 text-[12px] font-semibold text-terracota-400 transition active:scale-[0.97]"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
                    <path d="M4 17h16M4 17l4-4m-4 4 4 4M20 7H4M20 7l-4-4m4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Probar en dirección {selectedDirection === "ida" ? "vuelta" : "ida"}
                </button>
                <button
                  type="button"
                  onClick={() => { setActivePoint("destination"); setShowHint(true); }}
                  className="ov-pill ov-border ov-text-muted mt-2 inline-flex h-10 w-full items-center justify-center rounded-xl border text-[12px] font-semibold transition active:scale-[0.97]"
                >
                  Mover destino
                </button>
              </div>
            )}

            {/* Ruta activa / transbordo activo */}
            {(selectedRoute || showTeleferico || selectedTransfer) && (
              <div className="ov-border flex items-center gap-2 border-t px-4 py-2.5">
                {selectedTransfer ? (
                  <>
                    <span className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-400" aria-hidden="true" />
                      <span className="ov-text-muted truncate text-[12px] font-medium">{formatRouteLabel(selectedTransfer.routeAName)}</span>
                      <span className="shrink-0 text-[10px] text-avocado-400 font-bold">→</span>
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
                      <span className="ov-text-muted truncate text-[12px] font-medium">{formatRouteLabel(selectedTransfer.routeBName)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="ov-pill ov-border ov-text-muted h-9 shrink-0 rounded-lg border px-3 text-[11px] font-semibold transition active:scale-[0.97]"
                    >
                      Limpiar
                    </button>
                  </>
                ) : (
                  <>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: selectedRoute?.color ?? "#14b8a6" }} aria-hidden="true" />
                    <span className="ov-text-muted min-w-0 flex-1 truncate text-[12px] font-medium">
                      {selectedRoute ? formatRouteLabel(selectedRoute.nombre, selectedRoute.ruta) : "Teleférico Uruapan"}
                    </span>
                    <button
                      type="button"
                      onClick={() => shareRoute(selectedRoute ? formatRouteLabel(selectedRoute.nombre, selectedRoute.ruta) : "Teleférico", selectedRoute?.id)}
                      className="ov-pill ov-text-muted grid h-9 w-9 shrink-0 place-items-center rounded-lg transition hover:opacity-80 active:scale-95"
                      aria-label={`Compartir ${selectedRoute ? formatRouteLabel(selectedRoute.nombre, selectedRoute.ruta) : "Teleférico"}`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                        <path d="M8.59 13.51l6.83 3.98m-.01-10.98-6.82 3.98M21 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm0 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM3 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="ov-pill ov-border ov-text-muted h-9 shrink-0 rounded-lg border px-3 text-[11px] font-semibold transition active:scale-[0.97]"
                    >
                      Limpiar
                    </button>
                  </>
                )}
              </div>
            )}

            {selectedRoute && (
              <RouteSchedule routeName={selectedRoute.ruta} />
            )}

            {routeTextSummary && (
              <section className="ov-border border-t px-4 py-3" aria-label={routeTextSummary.title}>
                <h2 className="ov-text-muted text-[11px] font-bold uppercase tracking-[0.18em]">{routeTextSummary.title}</h2>
                <ol className="ov-text mt-2 space-y-1.5 text-[12px] leading-5">
                  {routeTextSummary.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-terracota-400" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </section>
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
        className={`relative z-30 hidden h-full shrink-0 flex-col border-r border-cream-100/8 bg-ink-900/98 backdrop-blur-2xl md:flex ${
          sidebarWidth == null ? "md:w-[380px] lg:w-[420px]" : ""
        }`}
        style={sidebarWidth != null ? { width: `${sidebarWidth}px` } : undefined}
      >

        {/* ── Header del sidebar ──────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between border-b border-cream-100/8 px-5 py-4">
          <div className="flex items-center gap-2.5">
            {/* Dot de estado */}
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-terracota-400 opacity-50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-terracota-400" />
            </span>
            <p className="font-serif-display text-[16px] font-black tracking-tight text-cream-50">VoyUruapan</p>
            <span className="rounded-full border border-terracota-400/25 bg-terracota-400/10 px-2 py-0.5 text-[11px] font-semibold text-terracota-400">
              {fullRoutes.length} rutas
            </span>
          </div>

          {/* Mode toggle */}
          <button
            type="button"
            onClick={() => setRoutesMapMode((current) => (current === "all-visible" ? "all-highlighted" : "all-visible"))}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border text-sm transition hover:scale-105 active:scale-95 ${
              routesMapMode === "all-highlighted"
                ? "border-terracota-400/40 bg-terracota-400/12 text-terracota-400"
                : "border-cream-100/12 bg-cream-100/5 text-cream-100/50 hover:border-cream-100/25 hover:text-cream-100/80"
            }`}
            aria-label={routesMapMode === "all-visible" ? "Cambiar a modo todas destacadas" : "Cambiar a modo todas visibles"}
            title={routesMapMode === "all-visible" ? "Modo: todas visibles" : "Modo: todas destacadas"}
          >
            <span aria-hidden="true">👁</span>
          </button>
        </div>

        {/* ── Flow step indicator + hint ──────────────────────────────────── */}
        <div className="shrink-0 border-b border-cream-100/5 px-5 py-3">
          {/* Step pills */}
          <div className="mb-2.5 flex items-center gap-2" role="group" aria-label={`Paso ${flowStep} de 3 para encontrar tu ruta`}>
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
                    isActive ? "bg-terracota-400" : isDone ? "bg-terracota-400/40" : "bg-cream-100/12"
                  }`} />
                  <span className={`text-[10px] font-semibold transition-colors duration-300 ${
                    isActive ? "text-terracota-400" : isDone ? "text-terracota-400/60" : "text-cream-100/25"
                  }`}>{label}</span>
                </div>
              );
            })}
          </div>

          {/* Hint message */}
          <div className={`transition-all duration-300 ${showHint ? "opacity-100" : "opacity-0"}`}>
            <p className="text-[12px] leading-snug text-cream-100/60">{hintMessage}</p>
          </div>
        </div>

        {/* ── Controles A/B + resultado de ruta ──────────────────────────── */}
        <div className="shrink-0 space-y-2.5 border-b border-cream-100/5 px-5 py-4">
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
            onShowTeleferico={() => { setShowTeleferico(true); }}
            onSelectRoute={handleSelectRoute}
          />
        </div>

        {/* ── Footer del sidebar: creditos ────────────────────────────────── */}
        <div className="shrink-0 border-t border-cream-100/5 px-5 py-3">
          <p className="text-[11px] text-cream-100/45">
            VoyUruapan · Datos actualizados · Uruapan, Mich.
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
        <div className="absolute inset-y-0 left-0 w-1 bg-cream-100/5 transition-colors duration-150 group-hover:bg-terracota-400/30 group-active:bg-terracota-400/50" />
        {/* Grip icon — centrado verticalmente */}
        <div className="relative z-10 flex flex-col items-center gap-[3px] rounded-full border border-cream-100/10 bg-ink-900 px-0.5 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.4)] transition-all duration-150 group-hover:border-terracota-400/30 group-hover:bg-ink-900 group-hover:shadow-[0_2px_12px_rgba(232,93,47,0.15)]">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="block h-[3px] w-[3px] rounded-full bg-cream-100/25 transition-colors duration-150 group-hover:bg-terracota-400/60"
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
        {isLoadingData ? (
          <div className="relative h-full w-full overflow-hidden bg-ink-900">
            <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-ink-800 to-ink-900" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-30" aria-hidden="true">
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
            <div className="absolute inset-0 grid place-items-center">
              <div className="flex items-center gap-2 rounded-full border border-cream-100/10 bg-ink-900/90 px-4 py-2 text-sm font-semibold text-cream-100/75 shadow-soft backdrop-blur-xl">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-terracota-400/60 border-t-transparent" />
                Cargando rutas...
              </div>
            </div>
          </div>
        ) : (
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
            selectedTransfer={selectedTransfer}
            awaitingPick={flowStep === 3 ? null : activePoint}
            onMapPick={handleMapPick}
            onSelectRoute={handleSelectRoute}
            onNearbyRoutesFound={handleNearbyRoutesFound}
          />
        )}

        {/* ── MOBILE: Top overlay (oculto en desktop) ── */}
        <section className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-safe-or-4 md:hidden">
          {/* Row 1: logo pill + mode toggle */}
          <div className="flex items-center gap-2">
            <div className="ov-panel pointer-events-auto inline-flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-[0_4px_24px_rgba(0,0,0,0.18)] backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-terracota-400" aria-hidden="true" />
              <p className="ov-text font-serif-display text-[15px] font-black leading-none tracking-tight">VoyUruapan</p>
              <span className="ov-pill ov-text-muted rounded-full px-1.5 py-0.5 text-[11px] font-medium">
                {fullRoutes.length}
              </span>
              <span className="ml-0.5 inline-flex items-center gap-1" role="img" aria-label={`Paso ${flowStep} de 3`}>
                {[1, 2, 3].map((step) => {
                  const isActive = step === flowStep;
                  const isDone = step < flowStep;
                  return (
                    <span
                      key={step}
                      className={`rounded-full transition-all duration-300 ${
                        isActive ? "h-2 w-4 bg-terracota-400" : isDone ? "h-2 w-2 bg-terracota-400/50" : "h-2 w-2 bg-black/15"
                      }`}
                    />
                  );
                })}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setRoutesMapMode((current) => (current === "all-visible" ? "all-highlighted" : "all-visible"))}
              className={`ov-panel pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-xl border text-sm shadow-[0_4px_16px_rgba(0,0,0,0.18)] backdrop-blur-xl transition active:scale-[0.97] ${
                routesMapMode === "all-highlighted"
                  ? "border-terracota-400/50 !bg-terracota-400/15 text-terracota-400"
                  : ""
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
            <div className="ov-panel inline-flex max-w-[95%] items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-semibold leading-snug backdrop-blur-md shadow-[0_2px_12px_rgba(0,0,0,0.2)]">
              <span className="h-2 w-2 shrink-0 rounded-full bg-terracota-400" aria-hidden="true" />
              <span className="ov-text">{hintMessage}</span>
            </div>
          </div>

          {/* Row 4: A/B controls (en paso 3, el panel de resultado va en el result sheet) */}
          <div className="pointer-events-auto mt-2">
            {renderRouteControls("mobile", true)}
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

        {/* ── MOBILE ONLY: FAB row — Resultado (izq) + Rutas (der) ── */}
        <div
          className="absolute inset-x-4 z-30 flex items-center justify-between md:hidden"
          style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {/* Botón resultado — solo visible en paso 3 */}
          <button
            type="button"
            onClick={() => setIsResultSheetOpen(true)}
            className={`ov-panel inline-flex h-12 max-w-[55%] items-center gap-2 rounded-2xl border pl-3.5 pr-4 text-[14px] font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl transition active:scale-[0.97] ${
              isResultSheetOpen
                ? "border-terracota-400/50 shadow-[0_8px_32px_rgba(232,93,47,0.18)]"
                : "hover:border-terracota-400/40"
            } ${flowStep === 3 ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
            style={{ transition: "opacity 250ms, border-color 200ms" }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-terracota-400" aria-hidden="true">
              <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13V7m0 13 6-3M9 7l6-3m6 17V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="ov-text truncate">
              {isCalculatingSuggestions
                ? "Buscando..."
                : bestSuggestion
                  ? formatRouteLabel(bestSuggestion.ruta)
                  : selectedTransfer
                    ? `${selectedTransfer.routeAName} → ${selectedTransfer.routeBName}`
                    : transfers.length > 0
                      ? `${transfers.length} con transbordo`
                      : "Sin ruta"}
            </span>
          </button>

          {/* Botón ver todas las rutas */}
          <button
            type="button"
            onClick={() => setIsSheetOpen(true)}
            className="ov-panel inline-flex h-12 items-center gap-2 rounded-2xl border pl-3.5 pr-4 text-[14px] font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl transition hover:border-terracota-400/40 hover:shadow-[0_8px_32px_rgba(232,93,47,0.15)] active:scale-[0.97]"
            aria-label={`Rutas, ver las ${fullRoutes.length} rutas disponibles`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-terracota-400" aria-hidden="true">
              <path d="M4 7H20M4 12H20M4 17H14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <span className="ov-text">Rutas</span>
            <span className="ml-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-terracota-400/20 px-1.5 text-[11px] font-bold text-terracota-400">
              {fullRoutes.length}
            </span>
          </button>
        </div>
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
            setShowTeleferico(true);
            setIsSheetOpen(false);
          }}
          onSelectRoute={(routeId) => {
            handleSelectRoute(routeId);
            setIsSheetOpen(false);
          }}
        />
      </BottomSheet>

      {/* ── MOBILE ONLY: Result sheet (full) ── */}
      <BottomSheet
        open={isResultSheetOpen}
        onOpenChange={setIsResultSheetOpen}
        title={
          isCalculatingSuggestions
            ? "Buscando ruta..."
            : bestSuggestion
              ? formatRouteLabel(bestSuggestion.ruta)
              : selectedTransfer
                ? `${selectedTransfer.routeAName} → ${selectedTransfer.routeBName}`
                : transfers.length > 0
                  ? `${transfers.length} opciones con transbordo`
                  : "Sin ruta directa"
        }
      >
        <div aria-live="polite">
          {renderRouteControls("mobile")}
        </div>
      </BottomSheet>

      <OnboardingOverlay />
    </main>
  );
}

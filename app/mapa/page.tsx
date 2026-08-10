"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";

// ── Sidebar resize constants ──────────────────────────────────────────────────
const SIDEBAR_DEFAULT_MD = 380; // px en breakpoint md (768–1023px)
const SIDEBAR_DEFAULT_LG = 420; // px en breakpoint lg (1024px+)
const SIDEBAR_MIN = 300;        // px mínimo al arrastrar
const SIDEBAR_MAX = 520;        // px máximo al arrastrar
import { track } from "@vercel/analytics";
import BottomSheet from "@/components/BottomSheet";
import ChatBotLauncher from "@/components/ChatBotLauncher";
import NearbyToast from "@/components/NearbyToast";
import OnboardingGate from "@/components/OnboardingGate";
import { DesktopMapSidebar, MobileMapControls } from "@/components/MapResponsiveControls";
import RoutePlannerSearch from "@/components/RoutePlannerSearch";
import TripOverlays from "@/components/TripOverlays";
import { geocodePlace, type PlaceResult } from "@/lib/geocode";
import { useShareRoute } from "@/hooks/useShareRoute";
import { useFavoriteRoutes } from "@/hooks/useFavoriteRoutes";
import { useRouteData } from "@/hooks/useRouteData";
import { useRoutePlanner } from "@/hooks/useRoutePlanner";
import { useSharedMapState } from "@/hooks/useSharedMapState";
import { useTripSession } from "@/hooks/useTripSession";
import { addRecentTrip, getRecentTrips, RECENT_TRIPS_EVENT, type RecentTrip } from "@/lib/recent-trips";
import { formatRouteLabel, getRouteDestination } from "@/lib/route-names";
import type { Coordinates, ProductionRoute, ProductionRouteLandmark, ResolvedRouteData } from "@/lib/types";
import type { TransferOption } from "@/lib/transfers";
import {
  findMatchingTransfer,
  resolveTransferSelection,
  type TransferSelection,
} from "@/lib/transfer-selection";
import { buildSharedRouteSegment } from "@/lib/shared-route";
import { formatCoordinateParam, getSharedTransferIdentity } from "@/lib/shared-map-state";
import { haversineMeters } from "@/lib/geo";
import {
  getMapAutoLoadDelay,
  shouldPreloadMap,
  type MapNetworkInformation,
} from "@/lib/map-load-policy";
import {
  getJourneyFareSummary,
  getTelefericoStationName,
  isTelefericoRouteName,
} from "@/lib/journey-guidance";
import {
  getTripJourneyKey,
  type TripJourney,
} from "@/lib/trip-mode";
const AVG_TRIP_SPEED_KMH = 18;
const BACKGROUND_SIMPLIFY_TOLERANCE = 0.00008;
const BACKGROUND_MAX_POINTS = 180;
const loadMapView = () => import("@/components/Map");
const preloadMapView = () => {
  void loadMapView().catch(() => undefined);
};
const MapView = dynamic(loadMapView, {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-ink-900" />
});
const RouteList = dynamic(() => import("@/components/RouteList"), {
  loading: () => (
    <div className="py-8 text-center text-sm text-foreground/50" role="status">
      Cargando rutas...
    </div>
  ),
});
const RoutePreviewSVG = dynamic(() => import("@/components/RoutePreviewSVG"));
const RouteSchedule = dynamic(() => import("@/components/RouteSchedule"));
const TripModePanel = dynamic(() => import("@/components/TripModePanel"));

type RoutesMapMode = "all-visible" | "all-highlighted";
const MAP_MODE_KEY = "rutas-map-mode";
const MAP_MODE_EVENT = "urugo-map-mode-changed";
const DESKTOP_LAYOUT_QUERY = "(min-width: 1024px)";
const subscribeDesktopLayout = (callback: () => void) => {
  const media = window.matchMedia(DESKTOP_LAYOUT_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
const getDesktopLayoutSnapshot = () => window.matchMedia(DESKTOP_LAYOUT_QUERY).matches;
const getNetworkInformation = () =>
  (navigator as Navigator & { connection?: MapNetworkInformation }).connection;
const subscribeOnline = (callback: () => void) => {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
};
const subscribeMapMode = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener(MAP_MODE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(MAP_MODE_EVENT, callback);
  };
};
const getMapModeSnapshot = (): RoutesMapMode => {
  try {
    return window.localStorage.getItem(MAP_MODE_KEY) === "all-highlighted" ? "all-highlighted" : "all-visible";
  } catch {
    return "all-visible";
  }
};
const subscribeRecentTrips = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener(RECENT_TRIPS_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(RECENT_TRIPS_EVENT, callback);
  };
};
const getRecentTripsSnapshot = () => JSON.stringify(getRecentTrips());
const subscribeLocationSearch = (callback: () => void) => {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
};
const getLocationSearchSnapshot = () => window.location.search;
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

function getEstimatedMinutes(segment: Coordinates[]) {
  const kilometers = getSegmentLengthMeters(segment) / 1000;
  const minutes = (kilometers / AVG_TRIP_SPEED_KMH) * 60;
  return Math.max(4, Math.round(minutes));
}

// Minutos caminando a paso urbano (~4.5 km/h ≈ 75 m/min).
function walkMinutes(meters: number) {
  return Math.max(1, Math.round(meters / 75));
}

function findNearestLandmark(
  point: Coordinates,
  landmarks: ProductionRouteLandmark[] | undefined,
  maxDistM: number
): string | null {
  if (!landmarks?.length) return null;
  let best: string | null = null;
  let bestDist = maxDistM;
  for (const lm of landmarks) {
    const d = haversineMeters(point, lm.point);
    if (d < bestDist) {
      bestDist = d;
      best = lm.name;
    }
  }
  return best;
}

export default function HomePage() {
  const initialSearch = useSyncExternalStore<string>(
    subscribeLocationSearch,
    getLocationSearchSnapshot,
    () => "",
  );
  return <MapPage key={initialSearch} initialSearch={initialSearch} />;
}

function MapPage({ initialSearch }: { initialSearch: string }) {
  const {
    buildShareUrl,
    initialUrlState,
    pendingSharedStateRef,
    selectedDirection,
    setSelectedDirection,
  } = useSharedMapState(initialSearch);

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

  const [shouldLoadMap, setShouldLoadMap] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  // Hover de la lista del sidebar (desktop): resalta la ruta en el mapa sin seleccionarla
  const [hoveredRouteId, setHoveredRouteId] = useState<number | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isResultSheetOpen, setIsResultSheetOpen] = useState(
    Boolean(initialUrlState.sharedState?.origin && initialUrlState.sharedState.destination),
  );
  const {
    cancelStop: cancelStopTrip,
    completeStop: completeStopTrip,
    dismissDropOffAlert,
    dropOffAlert,
    isStopDialogOpen: isStopTripDialogOpen,
    progress: tripProgress,
    requestStop: handleStopTrip,
    reset: resetTripSession,
    session: tripSession,
    start: startTripSession,
    updateLocation: updateTripLocation,
  } = useTripSession();
  const [feedbackTripKey, setFeedbackTripKey] = useState<string | null>(null);
  const lastSavedTripKeyRef = useRef("");
  const {
    activePoint,
    activePointRef,
    destinationPoint,
    destinationPointRef,
    flowStep,
    liveLocation,
    manualOrigin,
    originPoint,
    originPointRef,
    requestedDestination,
    setActivePoint,
    setDestinationPoint,
    setManualOrigin,
    setRequestedDestination,
    setSharedRouteSegment,
    setSharedSegmentColor,
    setShowHint,
    sharedRouteSegment,
    sharedSegmentColor,
    showHint,
    status: geoStatus,
    accuracyWarning: geoAccuracyWarn,
    markOutside: markGeolocationOutside,
    clearAccuracyWarning,
    subscribeToLiveLocation,
    userLocation,
  } = useRoutePlanner({ initialUrlState, tripSessionActive: tripSession !== null });
  // nearbyToast: null = hidden, number = route count (0 means none found)
  const [nearbyToast, setNearbyToast] = useState<number | null>(null);
  const [nearbyRouteIds, setNearbyRouteIds] = useState<number[]>([]);
  const [showTeleferico, setShowTeleferico] = useState(
    initialUrlState.sharedState?.showTeleferico ?? false,
  );
  const routesMapMode = useSyncExternalStore<RoutesMapMode>(subscribeMapMode, getMapModeSnapshot, () => "all-visible");
  const isDesktopLayout = useSyncExternalStore(subscribeDesktopLayout, getDesktopLayoutSnapshot, () => false);
  const isOnline = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const {
    alternativeRouteIds: alternativeSuggestedRouteIds,
    calculationKey,
    currentCalculation,
    fetchError,
    isCalculating: isCalculatingSuggestions,
    isLoading: isLoadingData,
    isUsingCachedRoutes,
    polylineRoutes,
    promoteSuggestion,
    retry: retryRouteData,
    suggestions,
    transfers,
  } = useRouteData({ destination: destinationPoint, isOnline, origin: originPoint });
  const recentTripsSnapshot = useSyncExternalStore(subscribeRecentTrips, getRecentTripsSnapshot, () => "[]");
  const lastTrip = useMemo(() => (JSON.parse(recentTripsSnapshot) as RecentTrip[])[0] ?? null, [recentTripsSnapshot]);
  // Pantallas de poca altura (p. ej. iPhone SE / teclado abierto): la barra A→B
  // se colapsa tras un resumen para dejar más mapa visible.
  const [isShortScreen, setIsShortScreen] = useState(false);
  const [abExpanded, setAbExpanded] = useState(false);
  const { share: shareRoute, status: shareStatus } = useShareRoute();
  const { favorites: favoriteRouteNames, toggleFavorite } = useFavoriteRoutes();
  // /mapa?cerca=1: el usuario llegó pidiendo "rutas cerca de mí" — al
  // detectar rutas cercanas abrimos la lista de inmediato (en móvil).
  const wantsNearbyRef = useRef(initialUrlState.wantsNearby);

  useEffect(() => {
    const mq = window.matchMedia("(max-height: 740px)");
    const update = () => setIsShortScreen(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const toggleRoutesMapMode = useCallback(() => {
    const next = routesMapMode === "all-visible" ? "all-highlighted" : "all-visible";
    try {
      window.localStorage.setItem(MAP_MODE_KEY, next);
      window.dispatchEvent(new Event(MAP_MODE_EVENT));
    } catch {
      // El modo se mantiene en su valor actual si localStorage no está disponible.
    }
  }, [routesMapMode]);

  const activateMap = useCallback(() => {
    preloadMapView();
    setShouldLoadMap(true);
  }, []);

  useEffect(() => {
    if (isLoadingData || fetchError || shouldLoadMap) {
      return;
    }

    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const hasSharedState = window.location.search.length > 0;
    const connection = getNetworkInformation();
    const policy = { connection, hasSharedState, isMobile, isOnline };
    const delay = getMapAutoLoadDelay(policy);
    const timer = delay === null ? undefined : window.setTimeout(activateMap, delay);
    let idleCallback: number | undefined;
    let preloadTimer: number | undefined;

    if (delay !== 0 && shouldPreloadMap(policy)) {
      if (typeof window.requestIdleCallback === "function") {
        idleCallback = window.requestIdleCallback(preloadMapView, { timeout: 1500 });
      } else {
        preloadTimer = window.setTimeout(preloadMapView, 500);
      }
    }

    window.addEventListener("pointerdown", activateMap, { once: true, passive: true });
    window.addEventListener("keydown", activateMap, { once: true });

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      if (idleCallback !== undefined) window.cancelIdleCallback(idleCallback);
      if (preloadTimer !== undefined) window.clearTimeout(preloadTimer);
      window.removeEventListener("pointerdown", activateMap);
      window.removeEventListener("keydown", activateMap);
    };
  }, [activateMap, fetchError, isLoadingData, isOnline, shouldLoadMap]);

  const resultSheetOpen = flowStep === 3 && isResultSheetOpen;

  // Deduplicated list for the route sidebar — one entry per named route, aggregating ida/vuelta
  const listRoutes = useMemo<ResolvedRouteData[]>(() => {
    const seen = new Map<string, ResolvedRouteData>();
    for (const r of polylineRoutes) {
      const isVuelta = r.original_name.includes("Vuelta");
      const isTeleferico = r.name === "Teleférico Uruapan";
      const existing = seen.get(r.name);
      if (existing) {
        if (isTeleferico || isVuelta) existing.tieneVuelta = true;
        if (isTeleferico || !isVuelta) existing.tieneIda = true;
      } else {
        seen.set(r.name, {
          id: r.id,
          ruta: r.name,
          nombre: r.name,
          color: r.color,
          coordenadas: r.path,
          direccion: isVuelta ? "vuelta" : "ida",
          tieneIda: isTeleferico || !isVuelta,
          tieneVuelta: isTeleferico || isVuelta,
        });
      }
    }
    return Array.from(seen.values());
  }, [polylineRoutes]);

  const visibleRouteCount = useMemo(
    () => listRoutes.filter((route) => !isTelefericoRouteName(route.ruta)).length,
    [listRoutes]
  );

  // Simplified routes for map background rendering
  const simplifiedMapRoutes = useMemo<ResolvedRouteData[]>(
    () => polylineRoutes.map((r) => ({
      id: r.id,
      ruta: r.name,
      nombre: r.name,
      color: r.color,
      coordenadas: simplifyBackgroundCoordinates(r.path),
      direccion: r.original_name.includes("Vuelta") ? "vuelta" as const : "ida" as const,
      tieneIda: true,
      tieneVuelta: false,
    })),
    [polylineRoutes]
  );

  const polylineRoutesById = useMemo(
    () => new Map(polylineRoutes.map((route) => [route.id, route])),
    [polylineRoutes]
  );

  const landmarksByRouteName = useMemo(() => {
    const map = new Map<string, ProductionRouteLandmark[]>();
    for (const r of polylineRoutes) {
      if (r.landmarks?.length && !map.has(r.name)) {
        map.set(r.name, r.landmarks);
      }
    }
    return map;
  }, [polylineRoutes]);

  const [transferSelection, setTransferSelection] = useState<TransferSelection | null>(null);
  const selectedTransfer = useMemo(
    () => resolveTransferSelection(
      transferSelection,
      calculationKey,
      currentCalculation !== null,
      transfers,
    ),
    [calculationKey, currentCalculation, transferSelection, transfers],
  );
  const setSelectedTransfer = useCallback((transfer: TransferOption | null) => {
    setTransferSelection(transfer && calculationKey ? { calculationKey, transfer } : null);
  }, [calculationKey]);

  const handleSelectRoute = useCallback((routeId: number) => {
    setSharedRouteSegment(null);
    setSharedSegmentColor(null);
    setSelectedTransfer(null);
    setShowTeleferico(false);
    setSelectedRouteId((current) => (current === routeId ? null : routeId));
  }, [setSelectedTransfer, setSharedRouteSegment, setSharedSegmentColor]);

  const handleClearSelection = useCallback(() => {
    setSharedRouteSegment(null);
    setSharedSegmentColor(null);
    setSelectedRouteId(null);
    setSelectedTransfer(null);
    setShowTeleferico(false);
  }, [setSelectedTransfer, setSharedRouteSegment, setSharedSegmentColor]);

  const handleNearbyRoutesFound = useCallback((routeIds: number[]) => {
    setNearbyRouteIds(routeIds);
    setNearbyToast(routeIds.length);
    if (wantsNearbyRef.current) {
      wantsNearbyRef.current = false;
      // En móvil la lista vive en el BottomSheet; en desktop ya es visible.
      if (routeIds.length > 0 && window.matchMedia("(max-width: 1023px)").matches) {
        setIsSheetOpen(true);
      }
    }
  }, []);

  const handleLocationOutsideServiceArea = useCallback(() => {
    markGeolocationOutside();
    setShowHint(true);
    if (!originPointRef.current) {
      setActivePoint("origin");
    }
  }, [markGeolocationOutside, originPointRef, setActivePoint, setShowHint]);

  const handleMapPick = useCallback((point: Coordinates) => {
    setShowHint(false);
    setSharedRouteSegment(null);
    setSharedSegmentColor(null);

    const active = activePointRef.current;

    if (active === "origin") {
      setManualOrigin(point);
      // If destination already exists, keep it and show results immediately
      if (destinationPointRef.current) {
        setActivePoint(null);
      } else {
        setActivePoint("destination");
      }
      return;
    }

    if (active === "destination") {
      setDestinationPoint(point);
      setActivePoint(null);
      return;
    }

    if (!originPointRef.current) {
      setManualOrigin(point);
      setActivePoint("destination");
      return;
    }

    if (!destinationPointRef.current) {
      setDestinationPoint(point);
      setActivePoint(null);
      return;
    }

    // Both pins set, no active mode → move destination (most common action)
    setDestinationPoint(point);
    setActivePoint(null);
  }, [
    activePointRef,
    destinationPointRef,
    originPointRef,
    setActivePoint,
    setDestinationPoint,
    setManualOrigin,
    setSharedRouteSegment,
    setSharedSegmentColor,
    setShowHint,
  ]);

  // El mismo buscador permite fijar origen o destino según el punto activo.
  const handlePlaceSearch = useCallback((result: PlaceResult) => {
    setSharedRouteSegment(null);
    setSharedSegmentColor(null);
    setSelectedTransfer(null);
    setShowTeleferico(false);
    setShowHint(false);

    if (activePointRef.current === "origin") {
      setManualOrigin(result.center);
      clearAccuracyWarning();
      setActivePoint(destinationPointRef.current ? null : "destination");
      return;
    }

    setRequestedDestination(result.label);
    setDestinationPoint(result.center);
    // Si aún no hay origen, deja activo el origen para que el usuario lo fije
    // (o lo complete el GPS). Si ya hay origen, calcula la ruta de inmediato.
    setActivePoint(originPointRef.current ? null : "origin");
  }, [
    activePointRef,
    clearAccuracyWarning,
    destinationPointRef,
    originPointRef,
    setActivePoint,
    setDestinationPoint,
    setManualOrigin,
    setRequestedDestination,
    setSelectedTransfer,
    setSharedRouteSegment,
    setSharedSegmentColor,
    setShowHint,
  ]);

  // Chip de destino rápido: geocodifica (índice local) y coloca el destino.
  const handleChipSearch = useCallback((text: string) => {
    geocodePlace(text).then((result) => {
      if (result) handlePlaceSearch(result);
    }).catch(() => {/* noop */});
  }, [handlePlaceSearch]);

  const selectedRoute = useMemo(
    () => selectedRouteId !== null ? (polylineRoutesById.get(selectedRouteId) ?? null) : null,
    [polylineRoutesById, selectedRouteId]
  );

  useEffect(() => {
    const sharedState = pendingSharedStateRef.current;
    if (!sharedState || polylineRoutes.length === 0) return;
    const sharedTransferIdentity = getSharedTransferIdentity(sharedState);

    if (!sharedTransferIdentity && (sharedState.routeName || sharedState.routeId)) {
      const normalized = sharedState.routeName?.toLowerCase() ?? null;
      // Igualdad exacta primero: "Ruta 1" no debe resolver a "Ruta 1A".
      const route =
        (normalized
          ? polylineRoutes.find((r) => r.name.toLowerCase() === normalized) ??
            polylineRoutes.find((r) => r.name.toLowerCase().startsWith(`${normalized} `)) ??
            polylineRoutes.find((r) => r.name.toLowerCase().includes(normalized))
          : null) ??
        (sharedState.routeId
          ? polylineRoutes.find((r) => r.id === sharedState.routeId)
          : null);
      if (route) {
        setSelectedRouteId(route.id);
        const segment = buildSharedRouteSegment(
          route.path,
          sharedState.segmentStartIndex,
          sharedState.segmentEndIndex,
        );
        if (segment) {
          setSharedRouteSegment(segment);
        }
        pendingSharedStateRef.current = null;
        return;
      }
    }

    if (!sharedTransferIdentity && sharedState.showTeleferico) {
      const telefericoRoute = polylineRoutes.find((r) => isTelefericoRouteName(r.name));
      if (telefericoRoute) {
        setSelectedRouteId(telefericoRoute.id);
        setShowTeleferico(false);
      }
      pendingSharedStateRef.current = null;
      return;
    }

    if (!sharedTransferIdentity && (sharedState.origin || sharedState.destination)) {
      pendingSharedStateRef.current = null;
    }
  }, [pendingSharedStateRef, polylineRoutes, setSharedRouteSegment]);

  useEffect(() => {
    const sharedState = pendingSharedStateRef.current;
    if (!sharedState || !calculationKey || currentCalculation === null) return;

    const identity = getSharedTransferIdentity(sharedState);
    if (!identity) return;

    const transfer = findMatchingTransfer(identity, transfers);
    if (transfer) {
      setSelectedTransfer(transfer);
    }
    pendingSharedStateRef.current = null;
  }, [calculationKey, currentCalculation, pendingSharedStateRef, setSelectedTransfer, transfers]);

  const suggestedRouteIds = useMemo(() => suggestions.map((item) => item.routeId), [suggestions]);
  const suggestedRouteDirections = useMemo(
    () => new Map(suggestions.map((item) => [item.routeId, item.direccion])),
    [suggestions]
  );
  const bestSuggestion = suggestions[0] ?? null;
  const selectedSuggestion = useMemo(
    () => suggestions.find((item) => item.routeId === selectedRouteId) ?? null,
    [selectedRouteId, suggestions]
  );
  const selectedMapSegment = selectedSuggestion?.segment ?? sharedRouteSegment ?? null;

  // Arrow segments: show direction arrows on suggested segment, transfer segments, or both directions of selected route
  const arrowSegments = useMemo<{ coords: Coordinates[]; color: string; showLine?: boolean }[]>(() => {
    // Case 1: active transfer — arrows only, lines already drawn by transfer layers
    if (selectedTransfer) {
      return [
        { coords: selectedTransfer.segmentA, color: "#60a5fa", showLine: false },
        { coords: selectedTransfer.segmentB, color: "#34d399", showLine: false }
      ];
    }
    // Case 2a: new routing — segment painted directly, no selectedRoute needed
    if (sharedRouteSegment && sharedSegmentColor && !selectedRoute) {
      return [{ coords: sharedRouteSegment, color: sharedSegmentColor, showLine: true }];
    }
    // Case 2b: active suggestion with pins — arrows only, line already drawn by main layer
    if (selectedMapSegment && selectedRoute) {
      return [{ coords: selectedMapSegment, color: selectedRoute.color, showLine: false }];
    }
    // Case 3: route selected without pins — draw all directions of that named route
    if (selectedRoute && !originPoint && !destinationPoint) {
      const color = selectedRoute.color;
      return polylineRoutes
        .filter((r) => r.name === selectedRoute.name)
        .map((r) => ({ coords: r.path, color, showLine: true }));
    }
    return [];
  }, [selectedTransfer, selectedMapSegment, selectedRoute, originPoint, destinationPoint, polylineRoutes, sharedRouteSegment, sharedSegmentColor]);
  const mapRoutes = useMemo(() => {
    if (selectedRouteId === null) return simplifiedMapRoutes;
    const fullPath = selectedRoute?.path ?? null;
    if (!fullPath) return simplifiedMapRoutes;
    const displayCoords = selectedMapSegment ?? fullPath;
    return simplifiedMapRoutes.map((r) =>
      r.id === selectedRouteId ? { ...r, coordenadas: displayCoords } : r
    );
  }, [simplifiedMapRoutes, selectedRoute, selectedRouteId, selectedMapSegment]);
  const bestSuggestionEta = useMemo(
    () => bestSuggestion?.rideMinutes ?? null,
    [bestSuggestion]
  );

  // ── Aviso "prepárate para bajar" ─────────────────────────────────────────
  // Con una ruta sugerida activa y GPS encendido, avisamos (vibración + toast)
  // cuando el usuario se acerca a su punto de bajada. Se "arma" solo después
  // de haber estado lejos (>500 m) para no disparar al planear viajes cortos.
  const bestSuggestionRouteId = bestSuggestion?.routeId ?? null;
  const activeTripKey = bestSuggestionRouteId !== null && destinationPoint
    ? `${bestSuggestionRouteId}:${formatCoordinateParam(destinationPoint)}`
    : null;
  const plannedJourney = useMemo<TripJourney | null>(() => {
    if (!destinationPoint) return null;

    if (bestSuggestion) {
      const isTeleferico = isTelefericoRouteName(bestSuggestion.ruta);
      return {
        kind: "direct",
        routeId: bestSuggestion.routeId,
        routeName: bestSuggestion.ruta,
        segment: bestSuggestion.segment,
        destination: destinationPoint,
        boardingStopLabel: isTeleferico
          ? getTelefericoStationName(bestSuggestion.indexA) ?? undefined
          : undefined,
        destinationStopLabel: isTeleferico
          ? getTelefericoStationName(bestSuggestion.indexB) ?? undefined
          : undefined,
      };
    }
    if (selectedTransfer) {
      const routeAIsTeleferico = isTelefericoRouteName(selectedTransfer.routeAName);
      const routeBIsTeleferico = isTelefericoRouteName(selectedTransfer.routeBName);
      return {
        kind: "transfer",
        routeAId: selectedTransfer.routeAId,
        routeBId: selectedTransfer.routeBId,
        routeAName: selectedTransfer.routeAName,
        routeBName: selectedTransfer.routeBName,
        routeAStartIndex: selectedTransfer.routeAStartIndex,
        routeATransferIndex: selectedTransfer.routeATransferIndex,
        routeBTransferIndex: selectedTransfer.routeBTransferIndex,
        routeBEndIndex: selectedTransfer.routeBEndIndex,
        segmentA: selectedTransfer.segmentA,
        segmentB: selectedTransfer.segmentB,
        transferPoint: selectedTransfer.transferPoint,
        walkMeters: selectedTransfer.walkMeters,
        destination: destinationPoint,
        boardingStopLabel: routeAIsTeleferico
          ? getTelefericoStationName(selectedTransfer.routeAStartIndex) ?? undefined
          : undefined,
        transferArrivalStopLabel: routeAIsTeleferico
          ? getTelefericoStationName(selectedTransfer.routeATransferIndex) ?? undefined
          : undefined,
        transferBoardingStopLabel: routeBIsTeleferico
          ? getTelefericoStationName(selectedTransfer.routeBTransferIndex) ?? undefined
          : undefined,
        destinationStopLabel: routeBIsTeleferico
          ? getTelefericoStationName(selectedTransfer.routeBEndIndex) ?? undefined
          : undefined,
      };
    }
    return null;
  }, [bestSuggestion, destinationPoint, selectedTransfer]);
  const plannedJourneyKey = plannedJourney
    ? getTripJourneyKey(plannedJourney)
    : null;
  const isTripActive = tripSession !== null && tripSession.key === plannedJourneyKey;
  const feedbackGiven = activeTripKey !== null && feedbackTripKey === activeTripKey;
  const tripLocationStatus = geoStatus === "error" || geoStatus === "outside" || geoStatus === "inaccurate"
    ? "unavailable"
    : liveLocation
      ? "ready"
      : "locating";

  useEffect(() => {
    if (!tripSession || tripSession.key === plannedJourneyKey) return;
    const timer = window.setTimeout(resetTripSession, 0);
    return () => window.clearTimeout(timer);
  }, [plannedJourneyKey, resetTripSession, tripSession]);

  const handleStartTrip = useCallback(() => {
    if (!plannedJourney || !plannedJourneyKey) return;

    startTripSession(plannedJourney);
    setShowHint(false);
    setActivePoint(null);
    setIsResultSheetOpen(false);
    setIsSheetOpen(false);

    if (plannedJourney.kind === "direct") {
      setSharedRouteSegment(plannedJourney.segment);
      const routeColor = suggestions.find((item) => item.routeId === plannedJourney.routeId)?.routeColor;
      setSharedSegmentColor(routeColor ?? null);
      setSelectedRouteId(null);
    }

  }, [
    plannedJourney,
    plannedJourneyKey,
    setActivePoint,
    setSharedRouteSegment,
    setSharedSegmentColor,
    setShowHint,
    startTripSession,
    suggestions,
  ]);

  // ── Repetir viaje: guardar los nuevos viajes ──────────────────────────────
  useEffect(() => {
    if (!originPoint || !destinationPoint || !bestSuggestion || isCalculatingSuggestions) return;
    const key = `${originPoint.join(",")}>${destinationPoint.join(",")}`;
    if (lastSavedTripKeyRef.current === key) return;
    lastSavedTripKeyRef.current = key;
    addRecentTrip({
      origin: originPoint,
      destination: destinationPoint,
      destinationLabel: requestedDestination,
      routeName: bestSuggestion.ruta,
    });
  }, [originPoint, destinationPoint, bestSuggestion, isCalculatingSuggestions, requestedDestination]);

  const repeatTrip = useCallback((trip: RecentTrip) => {
    setShowHint(false);
    setSharedRouteSegment(null);
    setSharedSegmentColor(null);
    setManualOrigin(trip.origin);
    setDestinationPoint(trip.destination);
    setRequestedDestination(trip.destinationLabel);
    setActivePoint(null);
  }, [
    setActivePoint,
    setDestinationPoint,
    setManualOrigin,
    setRequestedDestination,
    setSharedRouteSegment,
    setSharedSegmentColor,
    setShowHint,
  ]);

  const handleRouteFeedback = useCallback((util: "si" | "no") => {
    if (activeTripKey) setFeedbackTripKey(activeTripKey);
    const current = suggestions[0];
    try {
      track("ruta_feedback", {
        util,
        ruta: current?.ruta ?? "desconocida",
        destino_tipo: requestedDestination ? "busqueda" : "punto_mapa",
      });
    } catch {
      // analytics no disponible: ignorar
    }
  }, [activeTripKey, suggestions, requestedDestination]);

  useEffect(() => {
    if (!isTripActive || !tripSession) return;

    return subscribeToLiveLocation(updateTripLocation);
  }, [isTripActive, subscribeToLiveLocation, tripSession, updateTripLocation]);

  const routeTextSummary = useMemo(() => {
    if (isCalculatingSuggestions || flowStep !== 3) {
      return null;
    }

    if (bestSuggestion) {
      const fare = getJourneyFareSummary([bestSuggestion.ruta]);

      if (isTelefericoRouteName(bestSuggestion.ruta)) {
        const originStation = getTelefericoStationName(bestSuggestion.indexA);
        const destinationStation = getTelefericoStationName(bestSuggestion.indexB);

        return {
          title: "Indicaciones",
          items: [
            `Camina hasta ${originStation ? `la estación ${originStation}` : "la estación de abordaje"} (~${Math.round(bestSuggestion.distanciaA)} m, ${walkMinutes(bestSuggestion.distanciaA)} min caminando) y valida tu tarjeta al entrar.`,
            `Viaja en el Teleférico y baja en ${destinationStation ? `la estación ${destinationStation}` : "la estación indicada"}. Desde ahí camina ~${Math.round(bestSuggestion.distanciaB)} m hasta tu destino.`,
            `Tiempo estimado en ruta: ${bestSuggestionEta ?? getEstimatedMinutes(bestSuggestion.segment)} min. ${fare.detail}`,
          ],
        };
      }

      const bestRoute = polylineRoutesById.get(bestSuggestion.routeId);
      const originLandmark = originPoint
        ? findNearestLandmark(originPoint, bestRoute?.landmarks, 150)
        : null;
      const destLandmark = destinationPoint
        ? findNearestLandmark(destinationPoint, bestRoute?.landmarks, 150)
        : null;

      return {
        title: "Indicaciones",
        items: [
          `Sube a ${formatRouteLabel(bestSuggestion.ruta)} cerca de ${originLandmark ?? "tu ubicación"} (~${Math.round(bestSuggestion.distanciaA)} m, ${walkMinutes(bestSuggestion.distanciaA)} min caminando). Los camiones paran casi en cualquier esquina: haz la parada con la mano.`,
          `Baja cerca de ${destLandmark ?? "tu destino"} (~${Math.round(bestSuggestion.distanciaB)} m, ${walkMinutes(bestSuggestion.distanciaB)} min caminando). Avisa al chofer o toca el timbre.`,
          `Tiempo estimado en ruta: ${bestSuggestionEta ?? getEstimatedMinutes(bestSuggestion.segment)} min. ${fare.detail}`
        ]
      };
    }

    if (selectedTransfer) {
      const routeAIsTeleferico = isTelefericoRouteName(selectedTransfer.routeAName);
      const routeBIsTeleferico = isTelefericoRouteName(selectedTransfer.routeBName);
      const fare = getJourneyFareSummary([
        selectedTransfer.routeAName,
        selectedTransfer.routeBName,
      ]);
      const firstInstruction = routeAIsTeleferico
        ? `Primero aborda el Teleférico en la estación ${getTelefericoStationName(selectedTransfer.routeAStartIndex) ?? "indicada"}.`
        : `Primero toma ${formatRouteLabel(selectedTransfer.routeAName)}.`;
      const transferInstruction = routeAIsTeleferico
        ? `Baja en la estación ${getTelefericoStationName(selectedTransfer.routeATransferIndex) ?? "indicada"} y camina aproximadamente ${Math.round(selectedTransfer.walkMeters)} m (${walkMinutes(selectedTransfer.walkMeters)} min) para transbordar.`
        : routeBIsTeleferico
          ? `Camina aproximadamente ${Math.round(selectedTransfer.walkMeters)} m (${walkMinutes(selectedTransfer.walkMeters)} min) hasta la estación ${getTelefericoStationName(selectedTransfer.routeBTransferIndex) ?? "indicada"}.`
          : `Camina aproximadamente ${Math.round(selectedTransfer.walkMeters)} m (${walkMinutes(selectedTransfer.walkMeters)} min) en el punto de transbordo.`;
      const secondInstruction = routeBIsTeleferico
        ? `Continúa en el Teleférico hasta la estación ${getTelefericoStationName(selectedTransfer.routeBEndIndex) ?? "indicada"}.`
        : `Continúa en ${formatRouteLabel(selectedTransfer.routeBName)} hasta acercarte al destino.`;

      return {
        title: "Indicaciones con transbordo",
        items: [
          firstInstruction,
          transferInstruction,
          secondInstruction,
          fare.detail,
        ]
      };
    }

    if (transfers.length > 0) {
      return {
        title: "Opciones de transbordo disponibles",
        items: transfers.slice(0, 2).map((transfer) => `${formatRouteLabel(transfer.routeAName)} a ${formatRouteLabel(transfer.routeBName)}, caminando ~${Math.round(transfer.walkMeters)} m (${walkMinutes(transfer.walkMeters)} min) para transbordar.`)
      };
    }

    return {
      title: "Sin ruta directa",
      items: ["Mueve el origen o destino a una avenida, colonia o punto conocido cercano para intentar de nuevo."]
    };
  }, [bestSuggestion, bestSuggestionEta, destinationPoint, flowStep, isCalculatingSuggestions, originPoint, polylineRoutesById, selectedTransfer, transfers]);
  const hintMessage = useMemo(() => {
    // Editing origin while destination already exists (step 3 re-edit)
    if (activePoint === "origin" && destinationPoint) {
      return "Toca el mapa para mover tu origen. El destino se mantiene.";
    }

    if (flowStep === 1) {
      if (geoStatus === "outside") {
        return requestedDestination
          ? `Estás fuera de Uruapan. El destino ${requestedDestination} se mantiene; busca o marca un origen dentro de la ciudad.`
          : "Estás fuera de Uruapan. Busca o marca manualmente un origen dentro de la ciudad.";
      }
      if (geoStatus === "locating") return "Obteniendo tu ubicación...";
      if (geoStatus === "inaccurate") {
        return "La ubicación no es suficientemente precisa. Busca tu origen o márcalo en el mapa.";
      }
      if (geoStatus === "error") {
        return requestedDestination
          ? `Destino: ${requestedDestination}. No pudimos obtener tu ubicación. Busca o marca tu origen.`
          : "No pudimos obtener tu ubicación. Busca o marca tu origen.";
      }
      // geoStatus === "ok" — origin is set automatically
      return requestedDestination
        ? `Destino: ${requestedDestination}. Usando tu ubicación actual como origen.`
        : "Usando tu ubicación actual. Toca el mapa para ajustar.";
    }

    if (flowStep === 2) {
      if (geoAccuracyWarn && !manualOrigin) {
        return "Tu GPS varía mucho. Toca el mapa para fijar tu origen manualmente.";
      }
      if (requestedDestination) {
        return `Toca la zona de ${requestedDestination} como destino.`;
      }
      return "Selecciona tu destino en el mapa.";
    }

    if (isCalculatingSuggestions) {
      return "Buscando la mejor ruta...";
    }

    if (bestSuggestion) {
      return `${formatRouteLabel(bestSuggestion.ruta)} es la mejor opción.`;
    }

    if (transfers.length > 0) {
      return "No hay ruta directa. Hay opciones con transbordo.";
    }

    return "No encontramos ruta directa. Ajusta origen o destino.";
  }, [activePoint, bestSuggestion, destinationPoint, flowStep, geoAccuracyWarn, geoStatus, isCalculatingSuggestions, manualOrigin, requestedDestination, transfers]);

  // Abrir el result sheet una sola vez cuando el usuario coloca el pin B y termina el cálculo.
  // La ref evita re-aperturas causadas por refrescados del GPS.
  const resultSheetOpenedForDestRef = useRef<string | null>(null);
  useEffect(() => {
    if (flowStep !== 3 || isCalculatingSuggestions) return;
    const destKey = destinationPoint ? destinationPoint.join(",") : null;
    if (destKey && destKey !== resultSheetOpenedForDestRef.current) {
      resultSheetOpenedForDestRef.current = destKey;
      setIsResultSheetOpen(true);
    }
  }, [flowStep, isCalculatingSuggestions, destinationPoint]);

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
  }, [flowStep, setShowHint, showHint]);

  if (fetchError) {
    const offline = !isOnline;
    return (
      <main className="relative flex h-dvh w-full flex-col items-center justify-center gap-4 overflow-hidden bg-ink-900 px-6 text-center">
        <p className="font-display text-[18px] font-semibold text-white">No se pudieron cargar las rutas</p>
        <p className="max-w-sm text-[13px] leading-6 text-foreground/60">
          {offline
            ? "Estás sin conexión y no hay datos de rutas guardados para esta sesión. Conéctate una vez para que la PWA pueda guardar la información."
            : "La app no pudo obtener los datos de rutas. Puede ser un problema temporal del servidor o de la caché del navegador."}
        </p>
        <button
          type="button"
          onClick={retryRouteData}
          className="mt-2 inline-flex h-12 items-center rounded-xl bg-verde px-6 text-[13px] font-bold text-ink-900"
        >
          Reintentar
        </button>
      </main>
    );
  }

  // ── Bloque de JSX compartido: controles A/B + resultado de ruta ──────────────
  // Se renderiza tanto en el overlay mobile como en el sidebar desktop.
  // Extraido como funcion local para evitar duplicacion de JSX.
  const renderRouteControls = (context: "mobile" | "desktop", hideStep3 = false, onlyStep3 = false) => {
    const isMobile = context === "mobile";
    return (
      <>
        {!onlyStep3 && (
        <>
        <RoutePlannerSearch
          activePoint={activePoint}
          destinationSelected={destinationPoint !== null}
          isMobile={isMobile}
          lastTrip={lastTrip}
          onDestinationSelect={handleChipSearch}
          onPlaceSelect={handlePlaceSearch}
          onRepeatTrip={repeatTrip}
        />

        {/* A→B (control manual, secundario). En pantallas muy bajas se colapsa
            tras un resumen tocable para liberar espacio de mapa. */}
        {isMobile && isShortScreen && !abExpanded ? (
          <button
            type="button"
            onClick={() => setAbExpanded(true)}
            className="ov-panel flex w-full items-center gap-2 rounded-2xl border px-3 py-2.5 shadow-soft backdrop-blur-xl transition active:scale-[0.99]"
            aria-expanded={false}
            aria-label="Ajustar origen y destino manualmente"
          >
            <span className="flex items-center gap-1" aria-hidden="true">
              <span className={`h-2.5 w-2.5 rounded-full ${originPoint ? "bg-lima" : "bg-foreground/25"}`} />
              <svg viewBox="0 0 24 24" fill="none" className="ov-text-muted h-3 w-3" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className={`h-2.5 w-2.5 rounded-full ${destinationPoint ? "bg-lima" : "bg-foreground/25"}`} />
            </span>
            <span className="ov-text min-w-0 flex-1 truncate text-left text-[12px] font-semibold">
              {originPoint && destinationPoint
                ? "Origen y destino listos"
                : originPoint
                  ? "Ajustar destino manualmente"
                  : "Ajustar origen y destino"}
            </span>
            <svg viewBox="0 0 24 24" fill="none" className="ov-text-muted h-4 w-4 shrink-0" aria-hidden="true">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
        <div className="ov-panel w-full rounded-2xl border p-1.5 shadow-soft backdrop-blur-xl">
          <div className="flex items-center gap-1.5">
            {/* Origin button */}
            <button
              type="button"
              onClick={() => {
                setActivePoint("origin");
                setShowHint(true);
              }}
              className={`inline-flex h-10 min-w-0 flex-1 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition active:scale-[0.97] ${
                originPoint
                  ? "border-lima/50 bg-lima/15 text-lima"
                  : activePoint === "origin"
                    ? "ring-pulse-active border-lima/60 bg-lima/10 text-lima"
                    : "ov-pill ov-border ov-text-muted"
              }`}
              aria-label={
                manualOrigin
                  ? "Origen ajustado manualmente, toca para cambiar"
                  : geoStatus === "outside"
                    ? "Ubicación fuera de Uruapan, toca el mapa para marcar el origen manualmente"
                    : geoAccuracyWarn
                      ? "GPS impreciso, toca el mapa para fijar tu origen manualmente"
                      : userLocation
                        ? "Usando tu ubicación actual, toca para ajustar"
                        : "Toca para marcar punto de origen"
              }
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
                <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2" fill="currentColor" />
              </svg>
              <span className="min-w-0 flex-1 truncate">
                {manualOrigin
                  ? "Origen ajustado"
                  : geoStatus === "outside"
                    ? "Origen manual"
                    : geoAccuracyWarn
                      ? "GPS impreciso"
                      : userLocation
                        ? "Mi ubicación"
                        : "Origen"}
              </span>
              {originPoint && !geoAccuracyWarn && (geoStatus !== "outside" || manualOrigin) && (
                <svg viewBox="0 0 24 24" fill="none" className="ml-auto h-3.5 w-3.5 shrink-0 text-lima" aria-hidden="true">
                  <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {(geoAccuracyWarn || geoStatus === "outside") && !manualOrigin && (
                <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden="true" />
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
              className={`inline-flex h-10 min-w-0 flex-1 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition active:scale-[0.97] disabled:opacity-40 ${
                destinationPoint
                  ? "border-lima/50 bg-lima/15 text-lima"
                  : activePoint === "destination"
                    ? "ring-pulse-active border-lima/60 bg-lima/10 text-lima"
                    : "ov-pill ov-border ov-text-muted"
              }`}
              aria-label={destinationPoint ? "Destino marcado, toca para cambiar" : "Toca el mapa para marcar tu destino"}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.5" />
              </svg>
              <span className="min-w-0 flex-1 truncate">{destinationPoint ? "Destino marcado" : "Destino"}</span>
              {destinationPoint && (
                <svg viewBox="0 0 24 24" fill="none" className="ml-auto h-3.5 w-3.5 shrink-0 text-lima" aria-hidden="true">
                  <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>

            {/* Reset */}
            {(originPoint || destinationPoint) && (
              <button
                type="button"
                onClick={() => {
                  setSharedRouteSegment(null);
                  setManualOrigin(null);
                  setDestinationPoint(null);
                  setActivePoint(userLocation ? "destination" : "origin");
                  setShowHint(true);
                }}
                className="ov-pill ov-border ov-text-muted inline-flex h-10 items-center rounded-xl border px-2.5 text-[12px] font-semibold transition hover:border-red-400/40 hover:text-red-400 active:scale-[0.97]"
                aria-label="Reiniciar puntos A y B"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 3v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}

            {/* Colapsar de nuevo (solo en pantallas bajas, cuando está expandido) */}
            {isMobile && isShortScreen && abExpanded && (
              <button
                type="button"
                onClick={() => setAbExpanded(false)}
                className="ov-pill ov-border ov-text-muted inline-flex h-10 w-9 shrink-0 items-center justify-center rounded-xl border transition hover:text-lima active:scale-[0.97]"
                aria-label="Colapsar origen y destino"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        </div>
        )}

        {/* Context action — pasos 1, 2, y re-edición de origen desde paso 3 */}
        {(flowStep === 1 || flowStep === 2 || (flowStep === 3 && activePoint !== null)) && (
          <div className="w-full">
            <div className="ov-panel flex items-center gap-1.5 rounded-2xl border px-3 py-2 shadow-[0_2px_12px_rgba(0,0,0,0.15)] backdrop-blur-xl">
              <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lima/60 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-lima" />
              </span>
              <p className="ov-text flex-1 text-[12px] font-medium leading-snug">
                {activePoint === "origin" && destinationPoint
                  ? <><span>Toca el mapa para mover tu </span><span className="font-bold text-lima">origen</span></>
                  : activePoint === "destination" && flowStep === 3
                    ? <><span>Toca el mapa para mover tu </span><span className="font-bold text-lima">destino</span></>
                    : flowStep === 1
                      ? (geoStatus === "locating"
                          ? "Obteniendo tu ubicación..."
                          : geoStatus === "outside"
                            ? <><span>Estás fuera de Uruapan. Busca tu </span><span className="font-bold text-lima">origen manualmente</span></>
                            : geoStatus === "inaccurate"
                              ? <><span>GPS impreciso. Busca tu </span><span className="font-bold text-lima">origen</span></>
                              : geoStatus === "error"
                                ? <><span>Busca o marca tu </span><span className="font-bold text-lima">origen</span></>
                              : <><span>Usando tu </span><span className="font-bold text-lima">ubicación actual</span></>)
                      : <><span>Busca arriba o </span><span className="font-bold text-lima">toca el mapa</span></>}
              </p>
            </div>
          </div>
        )}

        {requestedDestination && flowStep !== 3 && (
          <div className="ov-panel flex w-full items-start gap-2 rounded-2xl border px-3.5 py-3 text-left shadow-[0_2px_12px_rgba(0,0,0,0.15)] backdrop-blur-xl">
            <svg viewBox="0 0 24 24" fill="none" className="mt-0.5 h-4 w-4 shrink-0 text-lima" aria-hidden="true">
              <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="10" r="2" fill="currentColor" />
            </svg>
            <p className="ov-text-muted min-w-0 flex-1 text-[12px] leading-snug">
              Llegaste buscando <span className="font-bold text-lima">{requestedDestination}</span>.{" "}
              {userLocation
                ? "Usando tu ubicación actual como origen, calculando tu ruta..."
                : geoStatus === "outside"
                  ? "Estás fuera de Uruapan. Busca o marca manualmente un origen dentro de la ciudad."
                  : destinationPoint
                    ? "Toca el mapa donde estás para marcar tu origen."
                    : "Toca el mapa para marcar tu origen y luego la zona de destino."}
            </p>
            <button
              type="button"
              onClick={() => setRequestedDestination(null)}
              className="ov-pill ov-text-muted grid h-7 w-7 shrink-0 place-items-center rounded-lg transition hover:opacity-80 active:scale-95"
              aria-label="Quitar destino sugerido"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
        </>
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
                <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-lima/60 border-t-transparent" />
                <span className="ov-text text-[13px] font-medium">Buscando mejor ruta...</span>
              </div>
            ) : bestSuggestion ? (
              <>
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold tracking-[2px] text-lima">RUTA RECOMENDADA</p>
                <p className="ov-text mt-0.5 truncate font-display text-[17px] font-bold leading-tight">
                  {formatRouteLabel(bestSuggestion.ruta)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-lg border border-lima/25 bg-lima/10 px-2.5 py-1 text-[12px] font-semibold text-lima">
                    <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    {bestSuggestionEta} min aprox
                  </span>
                  {bestSuggestionEta !== null && (
                    <span className="ov-pill ov-border ov-text-muted inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[12px] font-medium">
                      <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
                        <path d="M13 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM9.5 22l1.5-5-2-2 1-6 3.5-1.5L16 10l3 1M9 9l-3 1.5L5 14m5.5 3L8 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      ~{bestSuggestion.estimatedMinutes} min puerta a puerta
                    </span>
                  )}
                  <span className="ov-pill ov-border ov-text-muted inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[12px] font-medium">
                    {getJourneyFareSummary([bestSuggestion.ruta]).badge}
                  </span>
                  {suggestions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => { if (isMobile) { setIsResultSheetOpen(false); setTimeout(() => setIsSheetOpen(true), 50); } }}
                      className={`ov-pill ov-border ov-text-muted inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[12px] font-medium transition active:scale-[0.97] hover:border-lima/40 hover:text-lima ${isMobile ? "cursor-pointer" : "cursor-default"}`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
                        <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13V7m0 13 6-3M9 7l6-3m6 17V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      +{suggestions.length - 1} alternativa{suggestions.length > 2 ? "s" : ""}
                    </button>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setActivePoint("origin"); setShowHint(true); if (isMobile) setIsResultSheetOpen(false); }}
                    className="ov-pill ov-border ov-text-muted inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-xl border text-[12px] font-semibold transition active:scale-[0.97]"
                    aria-label="Cambiar punto de origen"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
                      <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="10" r="2" fill="currentColor" />
                    </svg>
                    Origen
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActivePoint("destination"); setShowHint(true); if (isMobile) setIsResultSheetOpen(false); }}
                    className="ov-pill ov-border ov-text-muted inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-xl border text-[12px] font-semibold transition active:scale-[0.97]"
                    aria-label="Cambiar destino"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
                      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.5" />
                    </svg>
                    Destino
                  </button>
                  <button
                    type="button"
                    onClick={() => shareRoute(formatRouteLabel(bestSuggestion.ruta), buildShareUrl({
                      routeId: bestSuggestion.routeId,
                      routeName: bestSuggestion.ruta,
                      origin: originPoint,
                      destination: destinationPoint,
                      segmentStartIndex: bestSuggestion.indexA,
                      segmentEndIndex: bestSuggestion.indexB
                    }))}
                    className="ov-pill ov-border ov-text-muted inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition active:scale-[0.97]"
                    aria-label={`Compartir ruta ${formatRouteLabel(bestSuggestion.ruta)}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                      <path d="M8.59 13.51l6.83 3.98m-.01-10.98-6.82 3.98M21 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm0 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM3 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowHint(false);
                      setSharedRouteSegment(bestSuggestion.segment);
                      setSharedSegmentColor(bestSuggestion.routeColor ?? null);
                      setSelectedRouteId(null);
                      if (isMobile) setIsResultSheetOpen(false);
                    }}
                    className="inline-flex h-10 flex-[2] items-center justify-center gap-1.5 rounded-xl bg-verde text-[12px] font-bold text-ink-900 shadow-[0_2px_12px_rgba(232,93,47,0.35)] transition active:scale-[0.97]"
                    aria-label={`Ver ${formatRouteLabel(bestSuggestion.ruta)} en el mapa`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                      <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13V7m0 13 6-3M9 7l6-3m6 17V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Ver en mapa
                  </button>
                </div>

                <button
                  type="button"
                  onClick={isTripActive ? handleStopTrip : handleStartTrip}
                  className={`mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[12px] font-bold transition active:scale-[0.98] ${
                    isTripActive
                      ? "ov-pill ov-border ov-text border"
                      : "bg-lima text-ink-900 shadow-[0_4px_16px_rgba(181,239,48,0.22)]"
                  }`}
                  aria-label={isTripActive ? "Finalizar viaje" : `Iniciar viaje en ${formatRouteLabel(bestSuggestion.ruta)}`}
                >
                  {isTripActive ? (
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                      <path d="M7 7l10 10M17 7 7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                      <path d="m9 7 8 5-8 5V7Z" fill="currentColor" />
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                  )}
                  {isTripActive ? "Finalizar viaje" : "Iniciar viaje"}
                </button>

                {/* Comparador de alternativas: tap para promover a recomendada */}
                {suggestions.length > 1 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="ov-text-muted text-[10px] font-bold uppercase tracking-widest">Alternativas</p>
                    {suggestions.slice(1, 4).map((alt) => {
                      const altEta = alt.estimatedMinutes;
                      const altWalk = Math.round(alt.distanciaA + alt.distanciaB);
                      const bestWalk = Math.round(bestSuggestion.distanciaA + bestSuggestion.distanciaB);
                      const lessWalk = altWalk < bestWalk;
                      const faster = altEta < bestSuggestion.estimatedMinutes;
                      return (
                        <button
                          key={alt.routeId}
                          type="button"
                          onClick={() => promoteSuggestion(alt.routeId)}
                          className="ov-pill ov-border flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition active:scale-[0.99] hover:border-lima/40"
                          aria-label={`Usar ${formatRouteLabel(alt.ruta)} como ruta recomendada`}
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: alt.routeColor ?? "#6aab48" }}
                            aria-hidden="true"
                          />
                          <span className="ov-text min-w-0 flex-1 truncate text-[12px] font-semibold">
                            {formatRouteLabel(alt.ruta)}
                          </span>
                          {lessWalk && (
                            <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-400">
                              Menos caminata
                            </span>
                          )}
                          {!lessWalk && faster && (
                            <span className="shrink-0 rounded-full bg-sky-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-400">
                              Más rápida
                            </span>
                          )}
                          <span className="ov-text-muted shrink-0 text-[11px]">
                            {altEta} min · {altWalk} m a pie
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Feedback rápido: alimenta Analytics para mejorar los datos */}
                <div className="ov-border mt-3 flex min-h-8 items-center justify-between gap-2 border-t pt-2">
                  {feedbackGiven ? (
                    <p className="ov-text-muted text-[11px]">¡Gracias! Tu opinión ayuda a mejorar las rutas.</p>
                  ) : (
                    <>
                      <p className="ov-text-muted text-[11px]">¿Te sirvió esta ruta?</p>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRouteFeedback("si")}
                          className="ov-pill ov-border ov-text-muted inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[11px] font-semibold transition active:scale-[0.96] hover:border-emerald-400/50 hover:text-emerald-400"
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
                            <path d="M7 11v9m0-9 3.4-6.8A2 2 0 0 1 14 5v4h4.4a2 2 0 0 1 2 2.4l-1.2 6A2 2 0 0 1 17.2 19H7m0-8H4v9h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Sí
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRouteFeedback("no")}
                          className="ov-pill ov-border ov-text-muted inline-flex h-8 items-center gap-1 rounded-full px-3 text-[11px] font-semibold transition active:scale-[0.96] hover:border-red-400/50 hover:text-red-400 border"
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 rotate-180" aria-hidden="true">
                            <path d="M7 11v9m0-9 3.4-6.8A2 2 0 0 1 14 5v4h4.4a2 2 0 0 1 2 2.4l-1.2 6A2 2 0 0 1 17.2 19H7m0-8H4v9h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          No
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <RouteSchedule routeName={bestSuggestion.ruta} />
              </>
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
                <p className="ov-text-muted mt-1 text-[11px]">
                  Camina ~{Math.round(selectedTransfer.walkMeters)} m en el punto de transbordo
                  <span className="mx-1.5 opacity-40">·</span>
                  {getJourneyFareSummary([
                    selectedTransfer.routeAName,
                    selectedTransfer.routeBName,
                  ]).badge}
                </p>
                <button
                  type="button"
                  onClick={isTripActive ? handleStopTrip : handleStartTrip}
                  className={`mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[12px] font-bold transition active:scale-[0.98] ${
                    isTripActive
                      ? "ov-pill ov-border ov-text border"
                      : "bg-lima text-ink-900 shadow-[0_4px_16px_rgba(181,239,48,0.22)]"
                  }`}
                  aria-label={isTripActive ? "Finalizar viaje" : "Iniciar viaje con transbordo"}
                >
                  {isTripActive ? (
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                      <path d="M7 7l10 10M17 7 7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                      <path d="m9 7 8 5-8 5V7Z" fill="currentColor" />
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                  )}
                  {isTripActive ? "Finalizar viaje" : "Iniciar viaje"}
                </button>
                <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
<button
                      type="button"
                      onClick={handleClearSelection}
                      className="ov-pill ov-border ov-text-muted h-9 shrink-0 rounded-lg border px-3 text-[11px] font-semibold transition active:scale-[0.97]"
                      aria-label="Limpiar ruta seleccionada"
                    >
                      Limpiar
                    </button>
                  <button
                    type="button"
                    onClick={() => shareRoute(`${formatRouteLabel(selectedTransfer.routeAName)} → ${formatRouteLabel(selectedTransfer.routeBName)}`, buildShareUrl({
                      routeName: `${selectedTransfer.routeAName} → ${selectedTransfer.routeBName}`,
                      origin: originPoint,
                      destination: destinationPoint,
                      transfer: selectedTransfer
                    }))}
                    className="ov-pill ov-border ov-text-muted inline-flex h-10 w-10 items-center justify-center rounded-xl border transition active:scale-[0.97]"
                    aria-label="Compartir transbordo"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                      <path d="M8.59 13.51l6.83 3.98m-.01-10.98-6.82 3.98M21 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm0 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM3 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
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
                        onClick={() => setSelectedTransfer(t)}
                        aria-label={`Seleccionar transbordo de ${t.routeAName} a ${t.routeBName}`}
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
                  aria-label="Mover destino para buscar otra ruta"
                >
                  Mover destino
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
                  onClick={() => { setActivePoint("destination"); setShowHint(true); }}
                  className="ov-pill ov-border ov-text-muted mt-2 inline-flex h-10 w-full items-center justify-center rounded-xl border text-[12px] font-semibold transition active:scale-[0.97]"
                  aria-label="Mover destino para buscar otra ruta"
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
                      onClick={() => shareRoute(`${formatRouteLabel(selectedTransfer.routeAName)} → ${formatRouteLabel(selectedTransfer.routeBName)}`, buildShareUrl({
                        routeName: `${selectedTransfer.routeAName} → ${selectedTransfer.routeBName}`,
                        origin: originPoint,
                        destination: destinationPoint,
                        transfer: selectedTransfer
                      }))}
                      className="ov-pill ov-text-muted grid h-9 w-9 shrink-0 place-items-center rounded-lg transition hover:opacity-80 active:scale-95"
                      aria-label="Compartir transbordo"
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
                ) : (
                  <>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: selectedRoute?.color ?? "#14b8a6" }} aria-hidden="true" />
                    <span className="ov-text-muted min-w-0 flex-1 truncate text-[12px] font-medium">
                      {selectedRoute ? formatRouteLabel(selectedRoute.name, selectedRoute.name) : "Teleférico Uruapan"}
                    </span>
                    <button
                      type="button"
                      onClick={() => shareRoute(
                        selectedRoute ? formatRouteLabel(selectedRoute.name, selectedRoute.name) : "Teleférico",
                        buildShareUrl({
                          routeId: selectedRoute?.id ?? null,
                          routeName: selectedRoute?.name ?? "Teleférico Uruapan",
                          origin: originPoint,
                          destination: destinationPoint,
                          segmentStartIndex: selectedSuggestion?.indexA,
                          segmentEndIndex: selectedSuggestion?.indexB,
                          showTeleferico: !selectedRoute
                        })
                      )}
                      className="ov-pill ov-text-muted grid h-9 w-9 shrink-0 place-items-center rounded-lg transition hover:opacity-80 active:scale-95"
                      aria-label={`Compartir ${selectedRoute ? formatRouteLabel(selectedRoute.name, selectedRoute.name) : "Teleférico"}`}
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
              <RouteSchedule routeName={selectedRoute.name} />
            )}

            {routeTextSummary && (
              <section className="ov-border border-t px-4 py-3" aria-label={routeTextSummary.title}>
                <h2 className="ov-text-muted text-[11px] font-bold uppercase tracking-[0.18em]">{routeTextSummary.title}</h2>
                <ol className="ov-text mt-2 space-y-1.5 text-[12px] leading-5">
                  {routeTextSummary.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lima" aria-hidden="true" />
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
      <h1 className="sr-only">Mapa de rutas de transporte en Uruapan</h1>

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP SIDEBAR (md+)
          Panel izquierdo redimensionable. Default: 380px en md, 420px en lg.
          El usuario puede arrastrar el handle derecho entre 300px y 520px.
          En mobile: oculto (los controles van en el overlay flotante y el BottomSheet).
      ══════════════════════════════════════════════════════════════════════ */}
      {isDesktopLayout && (
      <DesktopMapSidebar
        width={sidebarWidth}
        routeCount={visibleRouteCount}
        flowStep={flowStep}
        routesMapMode={routesMapMode}
        onToggleMode={toggleRoutesMapMode}
        hint={(
          <div className={`transition-all duration-300 ${showHint ? "opacity-100" : "opacity-0"}`}>
            <p className="text-[12px] leading-snug text-foreground/60">{hintMessage}</p>
          </div>
        )}
        controls={renderRouteControls("desktop")}
        nearbyNotice={nearbyToast !== null ? (
          <div className="shrink-0 px-5 pt-3">
            <NearbyToast
              count={nearbyToast}
              onView={() => undefined}
              onDismiss={() => setNearbyToast(null)}
            />
          </div>
        ) : null}
        routeList={(
          <RouteList
            routes={listRoutes}
            isLoading={isLoadingData}
            suggestedRouteIds={suggestedRouteIds}
            suggestedRouteDirections={suggestedRouteDirections}
            bestSuggestedRouteId={bestSuggestion?.routeId ?? null}
            alternativeSuggestedRouteIds={alternativeSuggestedRouteIds}
            nearbyRouteIds={nearbyRouteIds}
            selectedRouteId={selectedRouteId}
            landmarksByRouteName={landmarksByRouteName}
            favoriteRouteNames={favoriteRouteNames}
            onToggleFavorite={toggleFavorite}
            onClearSelection={handleClearSelection}
            onShowTeleferico={() => setShowTeleferico(true)}
            onSelectRoute={handleSelectRoute}
            onHoverRoute={setHoveredRouteId}
          />
        )}
      />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          DRAG HANDLE — solo visible en md+
          Barra vertical de 4px entre sidebar y mapa. El usuario arrastra para
          redimensionar el sidebar entre 300px y 520px.
      ══════════════════════════════════════════════════════════════════════ */}
      {isDesktopLayout && (
      <div
        role="separator"
        aria-label="Redimensionar panel lateral"
        aria-orientation="vertical"
        aria-valuemin={300}
        aria-valuemax={520}
        aria-valuenow={sidebarWidth ?? (typeof window !== "undefined" && window.innerWidth >= 1024 ? 420 : 380)}
        tabIndex={0}
        className="group relative z-40 hidden w-1 shrink-0 cursor-col-resize lg:flex lg:flex-col lg:items-center lg:justify-center"
        onMouseDown={handleDragStart}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            setSidebarWidth((prev) => Math.max(300, (prev ?? 420) - 20));
          }
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            setSidebarWidth((prev) => Math.min(520, (prev ?? 420) + 20));
          }
        }}
      >
        {/* Track line */}
        <div className="absolute inset-y-0 left-0 w-1 bg-foreground/5 transition-colors duration-150 group-hover:bg-lima/30 group-active:bg-lima/50" />
        {/* Grip icon — centrado verticalmente */}
        <div className="relative z-10 flex flex-col items-center gap-[3px] rounded-full border border-foreground/10 bg-ink-900 px-0.5 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.4)] transition-all duration-150 group-hover:border-lima/30 group-hover:bg-ink-900 group-hover:shadow-[0_2px_12px_rgba(232,93,47,0.15)]">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="block h-[3px] w-[3px] rounded-full bg-foreground/25 transition-colors duration-150 group-hover:bg-lima/60"
            />
          ))}
        </div>
      </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MAPA — ocupa todo el espacio restante
          En mobile: ocupa 100% del ancho (el sidebar está oculto)
          En desktop: ocupa flex-1 (el resto del ancho tras el sidebar)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative flex-1">
        {isLoadingData || !shouldLoadMap ? (
          <div
            className="relative h-full w-full overflow-hidden bg-ink-900"
            role="button"
            tabIndex={0}
            aria-label={isLoadingData ? "Cargando rutas" : "Activar mapa interactivo"}
            onClick={activateMap}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                activateMap();
              }
            }}
          >
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
              <div className="flex items-center gap-2 rounded-full border border-foreground/10 bg-ink-900/90 px-4 py-2 text-sm font-semibold text-foreground/75 shadow-soft backdrop-blur-xl">
                {isLoadingData ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-lima/60 border-t-transparent" aria-hidden="true" />
                ) : null}
                {isLoadingData ? "Cargando rutas..." : "Activar mapa interactivo"}
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
            selectedRouteSegment={selectedMapSegment}
            arrowSegments={arrowSegments}
            originPoint={originPoint}
            destinationPoint={destinationPoint}
            showTeleferico={showTeleferico}
            selectedTransfer={selectedTransfer}
            tripModeActive={isTripActive}
            tripSessionKey={isTripActive ? tripSession?.cameraKey ?? null : null}
            tripLocation={isTripActive ? liveLocation : null}
            awaitingPick={flowStep === 3 ? null : activePoint}
            hoveredRouteId={hoveredRouteId}
            onMapPick={handleMapPick}
            onSelectRoute={handleSelectRoute}
            onNearbyRoutesFound={handleNearbyRoutesFound}
            onLocationOutsideServiceArea={handleLocationOutsideServiceArea}
          />
        )}

        {/* ── Fallback offline: los tiles de Mapbox necesitan red, pero los
            recorridos guardados sí se pueden dibujar como SVG ── */}
        {!isOnline && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-ink-900/95 px-6 text-center">
            <div className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-[13px] font-semibold text-amber-300">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                <path d="M2 9.5C4.8 7 8.2 5.5 12 5.5c1.2 0 2.4.15 3.5.44M8.5 13a7.7 7.7 0 0 1 3.5-.9c1.9 0 3.6.65 5 1.75M5.2 11.2A11.4 11.4 0 0 1 9 9.3M12 17.5h.01M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Sin conexión
            </div>
            {selectedRoute ? (
              <>
                <p className="max-w-sm text-[13px] leading-6 text-foreground/70">
                  El mapa de fondo necesita internet, pero aquí tienes el recorrido guardado de la{" "}
                  <span className="font-bold text-white">{formatRouteLabel(selectedRoute.name)}</span>:
                </p>
                <div className="w-full max-w-md overflow-hidden rounded-2xl border border-foreground/10 bg-black/30">
                  <RoutePreviewSVG
                    paths={polylineRoutes
                      .filter((route) => route.name === selectedRoute.name)
                      .map((route) => route.path)}
                    color={selectedRoute.color}
                    width={400}
                    height={240}
                    strokeWidth={2.5}
                    className="h-auto w-full"
                  />
                </div>
              </>
            ) : (
              <p className="max-w-sm text-[13px] leading-6 text-foreground/70">
                El mapa de fondo necesita internet. La búsqueda y la lista de rutas siguen
                funcionando: selecciona una ruta para ver su recorrido guardado.
              </p>
            )}
          </div>
        )}

        {isUsingCachedRoutes && (
          <div
            role="status"
            aria-label="Estado de datos de rutas"
            aria-live="polite"
            className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center px-4 lg:bottom-4 lg:left-auto lg:right-4 lg:justify-end"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-slate-900/90 px-3 py-2 text-[12px] font-semibold text-amber-200 shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                <path d="M6 7.5h12M6 12h12M6 16.5h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M4 3.5h16a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              {isOnline ? "Usando rutas guardadas" : "Rutas disponibles sin conexión"}
            </div>
          </div>
        )}

        {/* ── MOBILE: Top overlay (oculto en desktop) ── */}
        {!isDesktopLayout && (
        <MobileMapControls
          flowStep={flowStep}
          routeCount={visibleRouteCount}
          routesMapMode={routesMapMode}
          onToggleMode={toggleRoutesMapMode}
          nearbyNotice={!isTripActive ? (
            <div className="pointer-events-auto mt-2">
              <NearbyToast
                count={nearbyToast}
                onView={() => setIsSheetOpen(true)}
                onDismiss={() => setNearbyToast(null)}
              />
            </div>
          ) : null}
        >
          {!isTripActive ? (
            <div className="pointer-events-auto mt-2 space-y-2">
              {renderRouteControls("mobile", true)}
            </div>
          ) : null}
        </MobileMapControls>
        )}

        {isTripActive && tripSession ? (
          <TripModePanel
            journey={tripSession.journey}
            progress={tripProgress}
            locationStatus={tripLocationStatus}
            onStop={handleStopTrip}
          />
        ) : null}

        <TripOverlays
          alert={dropOffAlert}
          stopDialogOpen={isStopTripDialogOpen && isTripActive}
          onCancelStop={cancelStopTrip}
          onConfirmStop={completeStopTrip}
          onDismissAlert={dismissDropOffAlert}
        />

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
        {!isDesktopLayout && (
        <div
          className={`absolute inset-x-4 z-30 items-end gap-2 lg:hidden ${isTripActive ? "hidden" : "flex"}`}
          style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
{/* Botón resultado — solo visible en paso 3 */}
          <button
            type="button"
            onClick={() => setIsResultSheetOpen(true)}
            aria-label="Ver resultado de ruta"
            className={`ov-panel inline-flex h-12 max-w-[55%] items-center gap-2 rounded-2xl border pl-3.5 pr-4 text-[14px] font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl transition active:scale-[0.97] ${
              resultSheetOpen
                ? "border-lima/50 shadow-[0_8px_32px_rgba(232,93,47,0.18)]"
                : "hover:border-lima/40"
            } ${flowStep === 3 ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
            style={{ transition: "opacity 250ms, border-color 200ms" }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-lima" aria-hidden="true">
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

          {/* Chat + Rutas apilados verticalmente — pegados a la esquina inferior derecha */}
          <div className="flex shrink-0 flex-col items-end gap-2 self-end ml-auto">
            {/* Botón chat — se oculta cuando el sheet está abierto */}
            <div className={`pointer-events-auto transition-all duration-200 ${isSheetOpen ? "pointer-events-none opacity-0 translate-y-1" : "opacity-100 translate-y-0"}`}>
              <ChatBotLauncher />
            </div>
            {/* Botón ver todas las rutas */}
            <button
              type="button"
              onClick={() => setIsSheetOpen(true)}
              className="ov-panel pointer-events-auto inline-flex h-12 items-center gap-2 rounded-2xl border pl-3.5 pr-4 text-[14px] font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl transition hover:border-lima/40 hover:shadow-[0_8px_32px_rgba(232,93,47,0.15)] active:scale-[0.97]"
              aria-label={selectedRoute ? `Ruta activa: ${formatRouteLabel(selectedRoute.name, selectedRoute.name)}` : `Rutas ${visibleRouteCount}, ver rutas disponibles`}
            >
              {selectedRoute ? (
                <>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: selectedRoute.color }} aria-hidden="true" />
                  <span className="flex min-w-0 flex-col">
                    <span className="ov-text-muted text-[10px] font-semibold leading-none">{selectedRoute.name}</span>
                    <span className="ov-text max-w-[120px] truncate text-[13px] leading-snug">
                      {getRouteDestination(selectedRoute.name) ?? selectedRoute.name}
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-lima" aria-hidden="true">
                    <path d="M4 7H20M4 12H20M4 17H14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                  <span className="ov-text">Rutas</span>
                  <span className="ml-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-lima/20 px-1.5 text-[11px] font-bold text-lima">
                    {visibleRouteCount}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
        )}
      </div>

      {/* ── MOBILE ONLY: BottomSheet con lista de rutas ── */}
      {!isDesktopLayout && (
      <BottomSheet open={isSheetOpen} onOpenChange={setIsSheetOpen} title="Selecciona una ruta">
        <RouteList
          routes={listRoutes}
          isLoading={isLoadingData}
          suggestedRouteIds={suggestedRouteIds}
          suggestedRouteDirections={suggestedRouteDirections}
          bestSuggestedRouteId={bestSuggestion?.routeId ?? null}
          alternativeSuggestedRouteIds={alternativeSuggestedRouteIds}
          nearbyRouteIds={nearbyRouteIds}
          selectedRouteId={selectedRouteId}
          landmarksByRouteName={landmarksByRouteName}
          favoriteRouteNames={favoriteRouteNames}
          onToggleFavorite={toggleFavorite}
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
      )}

      {/* ── MOBILE ONLY: Result sheet (full) ── */}
      {!isDesktopLayout && (
      <BottomSheet
        open={resultSheetOpen}
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
        <div aria-live="polite" className="space-y-2.5">
          {renderRouteControls("mobile", false, true)}
        </div>
      </BottomSheet>
      )}

      <OnboardingGate />
    </main>
  );
}

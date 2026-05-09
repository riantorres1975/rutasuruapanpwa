"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

// ── Sidebar resize constants ──────────────────────────────────────────────────
const SIDEBAR_DEFAULT_MD = 380; // px en breakpoint md (768–1023px)
const SIDEBAR_DEFAULT_LG = 420; // px en breakpoint lg (1024px+)
const SIDEBAR_MIN = 300;        // px mínimo al arrastrar
const SIDEBAR_MAX = 520;        // px máximo al arrastrar
import BottomSheet from "@/components/BottomSheet";
import ChatBot from "@/components/ChatBot";
import NearbyToast from "@/components/NearbyToast";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import RouteList from "@/components/RouteList";
import RouteSchedule from "@/components/RouteSchedule";
import { useShareRoute } from "@/hooks/useShareRoute";
import { formatRouteLabel, getRouteDestination } from "@/lib/route-names";
import type { Coordinates, ProductionRoute, ProductionRouteLandmark, ResolvedRouteData, RouteDirection } from "@/lib/types";
import { computeTransferOptionsFromPolylines } from "@/lib/transfers";
import type { TransferOption } from "@/lib/transfers";
import { haversineMeters } from "@/lib/geo";
import { findBestRoutes, getRankedRoutes, type PolylineRoute } from "@/lib/routeMatcher";
const AVG_TRIP_SPEED_KMH = 18;
const BACKGROUND_SIMPLIFY_TOLERANCE = 0.00008;
const BACKGROUND_MAX_POINTS = 180;
const MOBILE_MAP_BOOT_DELAY_MS = 3200;

const MapView = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-ink-900" />
});

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
  routeColor?: string;
};

type ActivePoint = "origin" | "destination" | null;
type FlowStep = 1 | 2 | 3;
type RoutesMapMode = "all-visible" | "all-highlighted";
type SharedMapState = {
  direction: RouteDirection | null;
  routeId: number | null;
  routeName: string | null;
  transferRouteAId: number | null;
  transferRouteBId: number | null;
  transferRouteAStartIndex: number | null;
  transferRouteATransferIndex: number | null;
  transferRouteBTransferIndex: number | null;
  transferRouteBEndIndex: number | null;
  segmentStartIndex: number | null;
  segmentEndIndex: number | null;
  origin: Coordinates | null;
  destination: Coordinates | null;
  showTeleferico: boolean;
};

function formatCoordinateParam(point: Coordinates) {
  return `${point[0].toFixed(6)},${point[1].toFixed(6)}`;
}

function parseCoordinateParam(value: string | null): Coordinates | null {
  if (!value) {
    return null;
  }

  const [lngRaw, latRaw] = value.split(",");
  const lng = Number(lngRaw);
  const lat = Number(latRaw);

  if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90) {
    return null;
  }

  return [Number(lng.toFixed(6)), Number(lat.toFixed(6))];
}

function parseDestinationParam(value: string | null) {
  const destination = value?.trim();
  return destination ? destination.slice(0, 80) : null;
}

function parsePositiveIntParam(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseNonNegativeIntParam(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function parseSharedMapState(search: string): SharedMapState | null {
  const params = new URLSearchParams(search);
  const dir = params.get("dir");
  const routeId = parsePositiveIntParam(params.get("rid"));
  const segmentStartIndex = parseNonNegativeIntParam(params.get("ia"));
  const segmentEndIndex = parseNonNegativeIntParam(params.get("ib"));
  const transferRouteAId = parsePositiveIntParam(params.get("tra"));
  const transferRouteBId = parsePositiveIntParam(params.get("trb"));
  const transferRouteAStartIndex = parseNonNegativeIntParam(params.get("tas"));
  const transferRouteATransferIndex = parseNonNegativeIntParam(params.get("tax"));
  const transferRouteBTransferIndex = parseNonNegativeIntParam(params.get("tbx"));
  const transferRouteBEndIndex = parseNonNegativeIntParam(params.get("tbe"));
  const routeName = params.get("r")?.trim() || null;
  const origin = parseCoordinateParam(params.get("a"));
  const destination = parseCoordinateParam(params.get("b"));
  const showTeleferico = params.get("teleferico") === "1";

  if (!routeId && !routeName && !transferRouteAId && !transferRouteBId && !origin && !destination && !showTeleferico) {
    return null;
  }

  return {
    direction: dir === "ida" || dir === "vuelta" ? dir : null,
    routeId,
    routeName,
    transferRouteAId,
    transferRouteBId,
    transferRouteAStartIndex,
    transferRouteATransferIndex,
    transferRouteBTransferIndex,
    transferRouteBEndIndex,
    segmentStartIndex,
    segmentEndIndex,
    origin,
    destination,
    showTeleferico
  };
}

function getFlowStep(originPoint: Coordinates | null, destinationPoint: Coordinates | null): FlowStep {
  if (!originPoint) {
    return 1;
  }

  if (!destinationPoint) {
    return 2;
  }

  return 3;
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

function getEstimatedMinutes(segment: Coordinates[]) {
  const kilometers = getSegmentLengthMeters(segment) / 1000;
  const minutes = (kilometers / AVG_TRIP_SPEED_KMH) * 60;
  return Math.max(4, Math.round(minutes));
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

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [shouldLoadMap, setShouldLoadMap] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [fetchAttempt, setFetchAttempt] = useState(0);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<RouteDirection>("ida");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isResultSheetOpen, setIsResultSheetOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [manualOrigin, setManualOrigin] = useState<Coordinates | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "locating" | "ok" | "error">("idle");
  const [geoAccuracyWarn, setGeoAccuracyWarn] = useState(false);
  const [originPoint, setOriginPoint] = useState<Coordinates | null>(null);
  const [destinationPoint, setDestinationPoint] = useState<Coordinates | null>(null);
  const [activePoint, setActivePoint] = useState<ActivePoint>("origin");
  const [suggestions, setSuggestions] = useState<RouteOption[]>([]);
  const [alternativeSuggestedRouteIds, setAlternativeSuggestedRouteIds] = useState<number[]>([]);
  const [transfers, setTransfers] = useState<TransferOption[]>([]);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferOption | null>(null);
  const [isCalculatingSuggestions, setIsCalculatingSuggestions] = useState(false);
  const [showHint, setShowHint] = useState(true);
  // nearbyToast: null = hidden, number = route count (0 means none found)
  const [nearbyToast, setNearbyToast] = useState<number | null>(null);
  const [nearbyRouteIds, setNearbyRouteIds] = useState<number[]>([]);
  const [showTeleferico, setShowTeleferico] = useState(false);
  const [polylineRoutes, setPolylineRoutes] = useState<ProductionRoute[]>([]);
  const [sharedRouteSegment, setSharedRouteSegment] = useState<Coordinates[] | null>(null);
  const [sharedSegmentColor, setSharedSegmentColor] = useState<string | null>(null);
  const [requestedDestination, setRequestedDestination] = useState<string | null>(null);
  const [routesMapMode, setRoutesMapMode] = useState<RoutesMapMode>("all-visible");
  const [isOnline, setIsOnline] = useState(true);
  const { share: shareRoute, status: shareStatus } = useShareRoute();
  const activePointRef = useRef(activePoint);
  const originPointRef = useRef(originPoint);
  const destinationPointRef = useRef(destinationPoint);
  const hasHydratedMapModeRef = useRef(false);
  const pendingSharedStateRef = useRef<SharedMapState | null>(null);

  // Geolocation: watch position on mount.
  // First fix → set userLocation and mark "ok".
  // Subsequent fixes → if drift > GEO_DRIFT_THRESHOLD_M from first fix,
  // warn the user to use manual mode instead of silently jumping the origin.
  // Cancels automatically when unmounted or when user already set manualOrigin.
  useEffect(() => {
    const GEO_DRIFT_THRESHOLD_M = 50;

    if (!navigator.geolocation) {
      setGeoStatus("error");
      return;
    }

    setGeoStatus("locating");
    let firstFix: Coordinates | null = null;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: Coordinates = [pos.coords.longitude, pos.coords.latitude];

        if (!firstFix) {
          // First reading: accept unconditionally
          firstFix = coords;
          setUserLocation(coords);
          setGeoStatus("ok");
          return;
        }

        // Subsequent readings: check drift from the accepted first fix
        const driftM = haversineMeters(firstFix, coords);

        if (driftM > GEO_DRIFT_THRESHOLD_M) {
          // GPS is jumping — warn instead of moving the origin silently
          setGeoAccuracyWarn(true);
        } else {
          // Normal GPS refinement — accept the improved reading
          firstFix = coords;
          setUserLocation(coords);
          setGeoAccuracyWarn(false);
        }
      },
      () => {
        setGeoStatus("error");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Keep originPoint in sync: manualOrigin overrides userLocation.
  useEffect(() => {
    const effective = manualOrigin ?? userLocation;
    setOriginPoint(effective);
  }, [manualOrigin, userLocation]);

  // Auto-advance to destination step when GPS provides location and user hasn't set a destination yet.
  useEffect(() => {
    if (userLocation && !manualOrigin && !destinationPoint) {
      setActivePoint("destination");
      setShowHint(true);
    }
  }, [userLocation, manualOrigin, destinationPoint]);

  useEffect(() => {
    if (polylineRoutes.length > 0) return;
    let cancelled = false;
    fetch("/api/rutas-polyline", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: ProductionRoute[]) => {
        if (!cancelled) {
          if (Array.isArray(data) && data.length > 0) {
            setPolylineRoutes(data);
          } else {
            console.error("[rutas-polyline] returned empty or invalid data");
            setFetchError(true);
          }
          setIsLoadingData(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          console.error("[rutas-polyline] Failed to load:", err instanceof Error ? err.message : err);
          setFetchError(true);
          setIsLoadingData(false);
        }
      });
    return () => { cancelled = true; };
  // fetchAttempt triggers retry when user clicks "Reintentar"
  }, [polylineRoutes.length, fetchAttempt]);

  const buildShareUrl = useCallback((options: {
    routeId?: number | null;
    routeName?: string | null;
    origin?: Coordinates | null;
    destination?: Coordinates | null;
    segmentStartIndex?: number | null;
    segmentEndIndex?: number | null;
    transfer?: TransferOption | null;
    showTeleferico?: boolean;
  }) => {
    const url = new URL("/mapa", window.location.origin);
    url.searchParams.set("dir", selectedDirection);

    if (options.routeId) {
      url.searchParams.set("rid", String(options.routeId));
    }

    if (options.routeName) {
      url.searchParams.set("r", options.routeName);
    }

    if (options.origin) {
      url.searchParams.set("a", formatCoordinateParam(options.origin));
    }

    if (options.destination) {
      url.searchParams.set("b", formatCoordinateParam(options.destination));
    }

    if (Number.isInteger(options.segmentStartIndex) && Number.isInteger(options.segmentEndIndex)) {
      url.searchParams.set("ia", String(options.segmentStartIndex));
      url.searchParams.set("ib", String(options.segmentEndIndex));
    }

    if (options.transfer) {
      url.searchParams.set("transfer", "1");
      url.searchParams.set("tra", String(options.transfer.routeAId));
      url.searchParams.set("trb", String(options.transfer.routeBId));
      url.searchParams.set("tas", String(options.transfer.routeAStartIndex));
      url.searchParams.set("tax", String(options.transfer.routeATransferIndex));
      url.searchParams.set("tbx", String(options.transfer.routeBTransferIndex));
      url.searchParams.set("tbe", String(options.transfer.routeBEndIndex));
    }

    if (options.showTeleferico) {
      url.searchParams.set("teleferico", "1");
    }

    return url.toString();
  }, [selectedDirection]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const destinationParam = parseDestinationParam(params.get("destino"));

    if (destinationParam) {
      setRequestedDestination(destinationParam);
      setActivePoint("origin");
      setShowHint(true);
    }

    const sharedState = parseSharedMapState(window.location.search);
    if (!sharedState) {
      return;
    }

    pendingSharedStateRef.current = sharedState;

    if (sharedState.direction) {
      setSelectedDirection(sharedState.direction);
    }

    if (sharedState.origin) {
      setOriginPoint(sharedState.origin);
    }

    if (sharedState.destination) {
      setDestinationPoint(sharedState.destination);
    }

    if (sharedState.origin && sharedState.destination) {
      setActivePoint(null);
      setShowHint(false);
      setIsResultSheetOpen(true);
    } else if (sharedState.origin) {
      setActivePoint("destination");
      setShowHint(true);
    }

    if (sharedState.showTeleferico) {
      setShowTeleferico(true);
    }
  }, []);

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
    if (isLoadingData || fetchError || shouldLoadMap) {
      return;
    }

    const loadMap = () => setShouldLoadMap(true);
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const hasSharedState = window.location.search.length > 0;
    const delay = hasSharedState ? 0 : isMobile ? MOBILE_MAP_BOOT_DELAY_MS : 250;
    const timer = window.setTimeout(loadMap, delay);

    window.addEventListener("pointerdown", loadMap, { once: true, passive: true });
    window.addEventListener("keydown", loadMap, { once: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", loadMap);
      window.removeEventListener("keydown", loadMap);
    };
  }, [fetchError, isLoadingData, shouldLoadMap]);

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

  // Deduplicated list for the route sidebar — one entry per named route, aggregating ida/vuelta
  const listRoutes = useMemo<ResolvedRouteData[]>(() => {
    const seen = new Map<string, ResolvedRouteData>();
    for (const r of polylineRoutes) {
      const isVuelta = r.original_name.includes("Vuelta");
      const existing = seen.get(r.name);
      if (existing) {
        if (isVuelta) existing.tieneVuelta = true;
        else existing.tieneIda = true;
      } else {
        seen.set(r.name, {
          id: r.id,
          ruta: r.name,
          nombre: r.name,
          color: r.color,
          coordenadas: r.path,
          direccion: isVuelta ? "vuelta" : "ida",
          tieneIda: !isVuelta,
          tieneVuelta: isVuelta,
        });
      }
    }
    return Array.from(seen.values());
  }, [polylineRoutes]);

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

  const routesForMatching = useMemo<PolylineRoute[]>(
    () => polylineRoutes.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      corridor_width_m: r.corridor_width_m,
      path: r.path,
      direccion: r.original_name.includes("Vuelta") ? "vuelta" : "ida",
      landmarks: r.landmarks,
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

  const handleSelectRoute = useCallback((routeId: number) => {
    setSharedRouteSegment(null);
    setSharedSegmentColor(null);
    setSelectedTransfer(null);
    setShowTeleferico(false);
    setSelectedRouteId((current) => (current === routeId ? null : routeId));
  }, []);

  const handleClearSelection = useCallback(() => {
    setSharedRouteSegment(null);
    setSharedSegmentColor(null);
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
  }, []);

  const selectedRoute = useMemo(
    () => selectedRouteId !== null ? (polylineRoutesById.get(selectedRouteId) ?? null) : null,
    [polylineRoutesById, selectedRouteId]
  );

  useEffect(() => {
    const sharedState = pendingSharedStateRef.current;
    if (!sharedState || polylineRoutes.length === 0) return;

    if (sharedState.routeName) {
      const normalized = sharedState.routeName.toLowerCase();
      const route = polylineRoutes.find((r) => {
        const n = r.name.toLowerCase();
        return n === normalized || n.includes(normalized);
      });
      if (route) {
        setSelectedRouteId(route.id);
        if (
          sharedState.segmentStartIndex !== null &&
          sharedState.segmentEndIndex !== null &&
          sharedState.segmentStartIndex < sharedState.segmentEndIndex &&
          sharedState.segmentEndIndex < route.path.length
        ) {
          setSharedRouteSegment(route.path.slice(sharedState.segmentStartIndex, sharedState.segmentEndIndex + 1));
        }
        pendingSharedStateRef.current = null;
        return;
      }
    }

    if (sharedState.showTeleferico) {
      const telefericoRoute = polylineRoutes.find((r) => r.name === "Teleférico Uruapan");
      if (telefericoRoute) setSelectedRouteId(telefericoRoute.id);
      pendingSharedStateRef.current = null;
      return;
    }

    if (sharedState.origin || sharedState.destination) {
      pendingSharedStateRef.current = null;
    }
  }, [polylineRoutes]);

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
      let nextAlternativeIds: number[] = [];

      const matches = findBestRoutes(originPoint, destinationPoint, routesForMatching);
      const ranked = getRankedRoutes(matches);

      const toOption = (m: (typeof matches)[number]): RouteOption => ({
        routeId: m.routeId,
        ruta: m.routeName,
        direccion: m.direccion,
        distanciaA: m.originDistM,
        distanciaB: m.destDistM,
        indexA: m.originSegIndex,
        indexB: m.destSegIndex,
        segment: m.segment,
        score: m.score,
        routeColor: m.routeColor,
      });

      let nextSuggestions: RouteOption[];
      if (ranked) {
        nextAlternativeIds = ranked.alternatives.map((m) => m.routeId);
        nextSuggestions = [ranked.best, ...ranked.alternatives].map(toOption);
      } else {
        nextSuggestions = [];
      }

      setSuggestions(nextSuggestions);
      setAlternativeSuggestedRouteIds(nextAlternativeIds);

      let nextTransfers: TransferOption[] = [];
      if (nextSuggestions.length === 0 && polylineRoutes.length > 0) {
        nextTransfers = computeTransferOptionsFromPolylines(routesForMatching, originPoint, destinationPoint);
      }
      setTransfers(nextTransfers);
      setIsCalculatingSuggestions(false);
    }, 80);

    return () => {
      window.clearTimeout(timer);
    };
  }, [destinationPoint, originPoint, polylineRoutes.length, routesForMatching]);

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
    () => (bestSuggestion ? getEstimatedMinutes(bestSuggestion.segment) : null),
    [bestSuggestion]
  );
  const routeTextSummary = useMemo(() => {
    if (isCalculatingSuggestions || flowStep !== 3) {
      return null;
    }

    if (bestSuggestion) {
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
          `Sube a ${formatRouteLabel(bestSuggestion.ruta)} cerca de ${originLandmark ?? "tu ubicación"} (~${Math.round(bestSuggestion.distanciaA)} m a pie).`,
          `Baja cerca de ${destLandmark ?? "tu destino"} (~${Math.round(bestSuggestion.distanciaB)} m a pie).`,
          `Tiempo estimado en ruta: ${bestSuggestionEta ?? getEstimatedMinutes(bestSuggestion.segment)} min.`
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
  }, [bestSuggestion, bestSuggestionEta, destinationPoint, flowStep, isCalculatingSuggestions, originPoint, polylineRoutesById, selectedTransfer, transfers]);
  const hintMessage = useMemo(() => {
    // Editing origin while destination already exists (step 3 re-edit)
    if (activePoint === "origin" && destinationPoint) {
      return "Toca el mapa para mover tu origen. El destino se mantiene.";
    }

    if (flowStep === 1) {
      if (geoStatus === "locating") return "Obteniendo tu ubicación...";
      if (geoStatus === "error") {
        return requestedDestination
          ? `Destino: ${requestedDestination}. No pudimos obtener tu ubicación. Toca el mapa para marcar tu origen.`
          : "No pudimos obtener tu ubicación. Toca el mapa para marcar tu origen.";
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

  useEffect(() => {
    setShowHint(true);
  }, [flowStep]);

  // Cerrar el result sheet al salir del paso 3
  useEffect(() => {
    if (flowStep !== 3) setIsResultSheetOpen(false);
  }, [flowStep]);

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
  }, [flowStep, showHint]);

  useEffect(() => {
    if (selectedRouteId !== null && !polylineRoutes.some((r) => r.id === selectedRouteId)) {
      setSelectedRouteId(null);
    }
  }, [polylineRoutes, selectedRouteId]);

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
          onClick={() => { setFetchError(false); setIsLoadingData(true); setFetchAttempt((n) => n + 1); }}
          className="mt-2 inline-flex h-12 items-center rounded-xl bg-verde px-6 text-[13px] font-bold text-white"
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
                  : geoAccuracyWarn
                    ? "GPS impreciso"
                    : userLocation
                      ? "Mi ubicación"
                      : "Origen"}
              </span>
              {originPoint && !geoAccuracyWarn && (
                <svg viewBox="0 0 24 24" fill="none" className="ml-auto h-3.5 w-3.5 shrink-0 text-lima" aria-hidden="true">
                  <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {geoAccuracyWarn && !manualOrigin && (
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

        {/* Context action — pasos 1, 2, y re-edición de origen desde paso 3 */}
        {(flowStep === 1 || flowStep === 2 || (flowStep === 3 && activePoint !== null)) && (
          <div className="w-full">
            <div className="ov-panel flex items-center gap-1.5 rounded-2xl border px-3.5 py-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.15)] backdrop-blur-xl">
              <span className="relative flex h-3 w-3 shrink-0" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lima/60 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-lima" />
              </span>
              <p className="ov-text flex-1 text-[13px] font-medium">
                {activePoint === "origin" && destinationPoint
                  ? <><span>Toca el mapa para mover tu </span><span className="font-bold text-lima">origen</span><span>. El destino se mantiene.</span></>
                  : activePoint === "destination" && flowStep === 3
                    ? <><span>Toca el mapa para mover tu </span><span className="font-bold text-lima">destino</span></>
                    : flowStep === 1
                      ? (geoStatus === "locating"
                          ? "Obteniendo tu ubicación..."
                          : geoStatus === "error"
                            ? <><span>No pudimos obtener tu ubicación. Toca el mapa para marcar tu </span><span className="font-bold text-lima">origen</span></>
                            : <><span>Usando tu </span><span className="font-bold text-lima">ubicación actual</span><span>. Toca el mapa para ajustar.</span></>)
                      : <><span>Selecciona tu </span><span className="font-bold text-lima">destino</span><span> en el mapa</span></>}
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
              {userLocation ? "Usando tu ubicación actual. Toca la zona de destino." : "Toca el mapa para ajustar tu origen y luego marca el destino."}
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
                    className="inline-flex h-10 flex-[2] items-center justify-center gap-1.5 rounded-xl bg-verde text-[12px] font-bold text-white shadow-[0_2px_12px_rgba(232,93,47,0.35)] transition active:scale-[0.97]"
                    aria-label={`Ver ${formatRouteLabel(bestSuggestion.ruta)} en el mapa`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                      <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13V7m0 13 6-3M9 7l6-3m6 17V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Ver en mapa
                  </button>
                </div>
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

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP SIDEBAR (md+)
          Panel izquierdo redimensionable. Default: 380px en md, 420px en lg.
          El usuario puede arrastrar el handle derecho entre 300px y 520px.
          En mobile: oculto (los controles van en el overlay flotante y el BottomSheet).
      ══════════════════════════════════════════════════════════════════════ */}
      <aside
        className={`relative z-30 hidden h-full shrink-0 flex-col border-r border-foreground/8 bg-ink-900/98 backdrop-blur-2xl md:flex ${
          sidebarWidth == null ? "md:w-[380px] lg:w-[420px]" : ""
        }`}
        style={sidebarWidth != null ? { width: `${sidebarWidth}px` } : undefined}
      >

        {/* ── Header del sidebar ──────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between border-b border-foreground/8 px-5 py-4">
          <div className="flex items-center gap-2.5">
            {/* Dot de estado */}
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lima opacity-50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-lima" />
            </span>
            <p className="font-serif-display text-[16px] font-black tracking-tight text-white">UruGo</p>
            <span className="rounded-full border border-lima/25 bg-lima/10 px-2 py-0.5 text-[11px] font-semibold text-lima">
              {listRoutes.length} rutas
            </span>
          </div>

          {/* Mode toggle */}
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRoutesMapMode((current) => (current === "all-visible" ? "all-highlighted" : "all-visible"))}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border text-sm transition hover:scale-105 active:scale-95 ${
                routesMapMode === "all-highlighted"
                  ? "border-lima/40 bg-lima/12 text-lima"
                  : "border-foreground/12 bg-foreground/5 text-foreground/50 hover:border-foreground/25 hover:text-foreground/80"
              }`}
              aria-label={routesMapMode === "all-visible" ? "Cambiar a modo todas destacadas" : "Cambiar a modo todas visibles"}
              title={routesMapMode === "all-visible" ? "Modo: todas visibles" : "Modo: todas destacadas"}
            >
              <span aria-hidden="true">👁</span>
            </button>
            <ChatBot />
          </div>
        </div>

        {/* ── Flow step indicator + hint ──────────────────────────────────── */}
        <div className="shrink-0 border-b border-foreground/5 px-5 py-3">
          {/* Step pills */}
          <div className="mb-2.5 flex items-center gap-2" role="group" aria-label="Progreso del viaje">
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
                    isActive ? "bg-lima" : isDone ? "bg-lima/40" : "bg-foreground/12"
                  }`} />
                  <span className={`text-[10px] font-semibold transition-colors duration-300 ${
                    isActive ? "text-lima" : isDone ? "text-lima/60" : "text-foreground/25"
                  }`}>{label}</span>
                </div>
              );
            })}
          </div>

          {/* Hint message */}
          <div className={`transition-all duration-300 ${showHint ? "opacity-100" : "opacity-0"}`}>
            <p className="text-[12px] leading-snug text-foreground/60">{hintMessage}</p>
          </div>
        </div>

        {/* ── Controles A/B + resultado de ruta ──────────────────────────── */}
        <div className="shrink-0 space-y-2.5 border-b border-foreground/5 px-5 py-4">
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
            routes={listRoutes}
            isLoading={isLoadingData}
            suggestedRouteIds={suggestedRouteIds}
            suggestedRouteDirections={suggestedRouteDirections}
            bestSuggestedRouteId={bestSuggestion?.routeId ?? null}
            alternativeSuggestedRouteIds={alternativeSuggestedRouteIds}
            nearbyRouteIds={nearbyRouteIds}
            selectedRouteId={selectedRouteId}
            landmarksByRouteName={landmarksByRouteName}
            onClearSelection={handleClearSelection}
            onShowTeleferico={() => { setShowTeleferico(true); }}
            onSelectRoute={handleSelectRoute}
          />
        </div>

        {/* ── Footer del sidebar: creditos ────────────────────────────────── */}
        <div className="shrink-0 border-t border-foreground/5 px-5 py-3">
          <p className="text-[11px] text-foreground/45">
            UruGo · Datos actualizados · Uruapan, Mich.
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
        aria-valuemin={300}
        aria-valuemax={520}
        aria-valuenow={sidebarWidth ?? (typeof window !== "undefined" && window.innerWidth >= 1024 ? 420 : 380)}
        tabIndex={0}
        className="group relative z-40 hidden w-1 shrink-0 cursor-col-resize md:flex md:flex-col md:items-center md:justify-center"
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
            onClick={() => setShouldLoadMap(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setShouldLoadMap(true);
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
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-lima/60 border-t-transparent" aria-hidden="true" />
                {isLoadingData ? "Cargando rutas..." : "Preparando mapa interactivo..."}
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
              <span className="h-2 w-2 rounded-full bg-lima" aria-hidden="true" />
              <p className="ov-text font-serif-display text-[15px] font-black leading-none tracking-tight">UruGo</p>
              <span className="ov-pill ov-text-muted rounded-full px-1.5 py-0.5 text-[11px] font-medium">
                {listRoutes.length}
              </span>
              <span className="ml-0.5 inline-flex items-center gap-1" role="img" aria-label="Progreso del viaje">
                {[1, 2, 3].map((step) => {
                  const isActive = step === flowStep;
                  const isDone = step < flowStep;
                  return (
                    <span
                      key={step}
                      className={`rounded-full transition-all duration-300 ${
                        isActive ? "h-2 w-4 bg-lima" : isDone ? "h-2 w-2 bg-lima/50" : "h-2 w-2 bg-black/15"
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
                  ? "border-lima/50 !bg-lima/15 text-lima"
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
              <span className="h-2 w-2 shrink-0 rounded-full bg-lima" aria-hidden="true" />
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
          className="absolute inset-x-4 z-30 flex items-end gap-2 md:hidden"
          style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
{/* Botón resultado — solo visible en paso 3 */}
          <button
            type="button"
            onClick={() => setIsResultSheetOpen(true)}
            aria-label="Ver resultado de ruta"
            className={`ov-panel inline-flex h-12 max-w-[55%] items-center gap-2 rounded-2xl border pl-3.5 pr-4 text-[14px] font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl transition active:scale-[0.97] ${
              isResultSheetOpen
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
              <ChatBot />
            </div>
            {/* Botón ver todas las rutas */}
            <button
              type="button"
              onClick={() => setIsSheetOpen(true)}
              className="ov-panel pointer-events-auto inline-flex h-12 items-center gap-2 rounded-2xl border pl-3.5 pr-4 text-[14px] font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl transition hover:border-lima/40 hover:shadow-[0_8px_32px_rgba(232,93,47,0.15)] active:scale-[0.97]"
              aria-label={selectedRoute ? `Ruta activa: ${formatRouteLabel(selectedRoute.name, selectedRoute.name)}` : `Rutas ${listRoutes.length}, ver rutas disponibles`}
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
                    {listRoutes.length}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── MOBILE ONLY: BottomSheet con lista de rutas ── */}
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

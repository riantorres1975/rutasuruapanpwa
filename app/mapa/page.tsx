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
import ChatBot from "@/components/ChatBot";
import NearbyToast from "@/components/NearbyToast";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import PlaceSearch from "@/components/PlaceSearch";
import RouteList from "@/components/RouteList";
import RoutePreviewSVG from "@/components/RoutePreviewSVG";
import RouteSchedule from "@/components/RouteSchedule";
import { geocodePlace, type PlaceResult } from "@/lib/geocode";
import { useShareRoute } from "@/hooks/useShareRoute";
import { useFavoriteRoutes } from "@/hooks/useFavoriteRoutes";
import { useUruapanGeolocation } from "@/hooks/useUruapanGeolocation";
import { addRecentTrip, getRecentTrips, RECENT_TRIPS_EVENT, type RecentTrip } from "@/lib/recent-trips";
import { formatRouteLabel, getRouteDestination } from "@/lib/route-names";
import type { Coordinates, ProductionRoute, ProductionRouteLandmark, ResolvedRouteData, RouteDirection } from "@/lib/types";
import { computeTransferOptionsFromPolylines } from "@/lib/transfers";
import type { TransferOption } from "@/lib/transfers";
import { haversineMeters } from "@/lib/geo";
import { findBestRoutes, getRankedRoutes, type PolylineRoute } from "@/lib/routeMatcher";
import { FARES_2026 } from "@/lib/mobility-config";
const AVG_TRIP_SPEED_KMH = 18;
// Tarifa del camión urbano en pesos (derivada de la config de movilidad).
const BUS_FARE_MXN = Math.round(Number(FARES_2026.urbanBus.price.replace(/[^0-9.]/g, "")) || 11);
const BACKGROUND_SIMPLIFY_TOLERANCE = 0.00008;
const BACKGROUND_MAX_POINTS = 180;
const MOBILE_MAP_BOOT_DELAY_MS = 3200;
const TELEFERICO_ROUTE_NAME = "Teleférico Uruapan";
// Destinos frecuentes para acceso rápido bajo el buscador (todos resuelven localmente)
const DESTINO_CHIPS = ["Centro", "Hospital Regional", "Plaza Ágora", "Central"] as const;

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
  rideMinutes: number;
  expectedWaitMinutes: number;
  estimatedMinutes: number;
  score: number;
  routeColor?: string;
};

type ActivePoint = "origin" | "destination" | null;
type FlowStep = 1 | 2 | 3;
type RoutesMapMode = "all-visible" | "all-highlighted";
type RouteCalculation = {
  key: string;
  suggestions: RouteOption[];
  alternativeRouteIds: number[];
  transfers: TransferOption[];
};
type TransferSelection = {
  calculationKey: string;
  transfer: TransferOption;
};
type TripAlert = {
  tripKey: string;
  message: string;
};

const EMPTY_ROUTE_OPTIONS: RouteOption[] = [];
const EMPTY_ROUTE_IDS: number[] = [];
const EMPTY_TRANSFERS: TransferOption[] = [];

const MAP_MODE_KEY = "rutas-map-mode";
const MAP_MODE_EVENT = "urugo-map-mode-changed";
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

function isTelefericoRouteName(name: string) {
  return name === TELEFERICO_ROUTE_NAME;
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
  const initialUrlState = useMemo(() => {
    const params = new URLSearchParams(initialSearch);
    return {
      destinationParam: parseDestinationParam(params.get("destino")),
      sharedState: parseSharedMapState(initialSearch),
      wantsNearby: params.get("cerca") === "1",
    };
  }, [initialSearch]);

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
  // Hover de la lista del sidebar (desktop): resalta la ruta en el mapa sin seleccionarla
  const [hoveredRouteId, setHoveredRouteId] = useState<number | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<RouteDirection>(
    initialUrlState.sharedState?.direction ?? "ida",
  );
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isResultSheetOpen, setIsResultSheetOpen] = useState(
    Boolean(initialUrlState.sharedState?.origin && initialUrlState.sharedState.destination),
  );
  const [dropOffAlertState, setDropOffAlertState] = useState<TripAlert | null>(null);
  const dropOffArmedRef = useRef(false);
  const dropOffNotifiedRef = useRef(false);
  const [feedbackTripKey, setFeedbackTripKey] = useState<string | null>(null);
  const lastSavedTripKeyRef = useRef("");
  const [manualOrigin, setManualOrigin] = useState<Coordinates | null>(
    initialUrlState.sharedState?.origin ?? null,
  );
  const [destinationPoint, setDestinationPoint] = useState<Coordinates | null>(
    initialUrlState.sharedState?.destination ?? null,
  );
  const [requestedActivePoint, setActivePoint] = useState<ActivePoint>(
    initialUrlState.sharedState?.origin && initialUrlState.sharedState.destination
      ? null
      : initialUrlState.sharedState?.origin
        ? "destination"
        : "origin",
  );
  const [hintVisibility, setHintVisibility] = useState<{ step: FlowStep; visible: boolean }>({
    step: initialUrlState.sharedState?.origin && initialUrlState.sharedState.destination
      ? 3
      : initialUrlState.sharedState?.origin
        ? 2
        : 1,
    visible: !(
      initialUrlState.sharedState?.origin && initialUrlState.sharedState.destination
    ),
  });
  const {
    userLocation,
    liveLocation,
    status: geoStatus,
    accuracyWarning: geoAccuracyWarn,
    markOutside: markGeolocationOutside,
    clearAccuracyWarning,
    subscribeToLiveLocation,
  } = useUruapanGeolocation(manualOrigin !== null);
  const originPoint = manualOrigin ?? userLocation;
  const flowStep = getFlowStep(originPoint, destinationPoint);
  const activePoint: ActivePoint = flowStep === 1
    ? "origin"
    : flowStep === 2
      ? "destination"
      : requestedActivePoint;
  const showHint = hintVisibility.step === flowStep ? hintVisibility.visible : true;
  const setShowHint = useCallback((visible: boolean) => {
    setHintVisibility({ step: flowStep, visible });
  }, [flowStep]);
  // nearbyToast: null = hidden, number = route count (0 means none found)
  const [nearbyToast, setNearbyToast] = useState<number | null>(null);
  const [nearbyRouteIds, setNearbyRouteIds] = useState<number[]>([]);
  const [showTeleferico, setShowTeleferico] = useState(
    initialUrlState.sharedState?.showTeleferico ?? false,
  );
  const [polylineRoutes, setPolylineRoutes] = useState<ProductionRoute[]>([]);
  const [sharedRouteSegment, setSharedRouteSegment] = useState<Coordinates[] | null>(null);
  const [sharedSegmentColor, setSharedSegmentColor] = useState<string | null>(null);
  const [requestedDestination, setRequestedDestination] = useState<string | null>(
    initialUrlState.destinationParam,
  );
  const routesMapMode = useSyncExternalStore<RoutesMapMode>(subscribeMapMode, getMapModeSnapshot, () => "all-visible");
  const isOnline = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const recentTripsSnapshot = useSyncExternalStore(subscribeRecentTrips, getRecentTripsSnapshot, () => "[]");
  const lastTrip = useMemo(() => (JSON.parse(recentTripsSnapshot) as RecentTrip[])[0] ?? null, [recentTripsSnapshot]);
  // Pantallas de poca altura (p. ej. iPhone SE / teclado abierto): la barra A→B
  // se colapsa tras un resumen para dejar más mapa visible.
  const [isShortScreen, setIsShortScreen] = useState(false);
  const [abExpanded, setAbExpanded] = useState(false);
  const { share: shareRoute, status: shareStatus } = useShareRoute();
  const { favorites: favoriteRouteNames, toggleFavorite } = useFavoriteRoutes();
  const activePointRef = useRef(activePoint);
  const originPointRef = useRef(originPoint);
  const destinationPointRef = useRef(destinationPoint);
  const pendingSharedStateRef = useRef<SharedMapState | null>(initialUrlState.sharedState);
  // /mapa?cerca=1: el usuario llegó pidiendo "rutas cerca de mí" — al
  // detectar rutas cercanas abrimos la lista de inmediato (en móvil).
  const wantsNearbyRef = useRef(initialUrlState.wantsNearby);

  useEffect(() => {
    if (polylineRoutes.length > 0) return;
    let cancelled = false;
    // Sin no-store: el navegador respeta el Cache-Control (max-age + SWR) de la
    // API, evitando re-descargar el payload de rutas en cada visita al mapa.
    fetch("/api/rutas-polyline")
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
    const destinationParam = initialUrlState.destinationParam;
    if (!destinationParam || initialUrlState.sharedState?.destination) return;

    const controller = new AbortController();
    geocodePlace(destinationParam, { signal: controller.signal })
      .then((result) => {
        if (!result) return;
        setDestinationPoint((current) => current ?? result.center);
        setRequestedDestination(result.label);
      })
      .catch(() => {/* degradar: el usuario marca el destino a mano */});

    return () => controller.abort();
  }, [initialUrlState.destinationParam, initialUrlState.sharedState?.destination]);

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

  // Precargar el chunk del mapa (mapbox-gl) en tiempo ocioso para que, cuando
  // se active, ya esté en caché y la transición sea instantánea.
  useEffect(() => {
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (connection?.saveData || ["slow-2g", "2g"].includes(connection?.effectiveType ?? "")) {
      return;
    }

    const ric: (cb: () => void) => number =
      typeof window.requestIdleCallback === "function"
        ? (cb) => window.requestIdleCallback(cb)
        : (cb) => window.setTimeout(cb, 1500);
    const cancel: (id: number) => void =
      typeof window.cancelIdleCallback === "function"
        ? (id) => window.cancelIdleCallback(id)
        : (id) => window.clearTimeout(id);

    const id = ric(() => { void import("@/components/Map"); });
    return () => cancel(id);
  }, []);

  const resultSheetOpen = flowStep === 3 && isResultSheetOpen;

  useEffect(() => {
    activePointRef.current = activePoint;
  }, [activePoint]);

  useEffect(() => {
    originPointRef.current = originPoint;
  }, [originPoint]);

  useEffect(() => {
    destinationPointRef.current = destinationPoint;
  }, [destinationPoint]);

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

  const calculationKey = originPoint && destinationPoint
    ? `${formatCoordinateParam(originPoint)}>${formatCoordinateParam(destinationPoint)}@${polylineRoutes.length}`
    : null;
  const [routeCalculation, setRouteCalculation] = useState<RouteCalculation | null>(null);
  const currentCalculation = routeCalculation?.key === calculationKey ? routeCalculation : null;
  const suggestions = currentCalculation?.suggestions ?? EMPTY_ROUTE_OPTIONS;
  const alternativeSuggestedRouteIds = currentCalculation?.alternativeRouteIds ?? EMPTY_ROUTE_IDS;
  const transfers = currentCalculation?.transfers ?? EMPTY_TRANSFERS;
  const isCalculatingSuggestions = calculationKey !== null && currentCalculation === null;
  const [transferSelection, setTransferSelection] = useState<TransferSelection | null>(null);
  const selectedTransfer = transferSelection?.calculationKey === calculationKey
    ? transferSelection.transfer
    : null;
  const setSelectedTransfer = useCallback((transfer: TransferOption | null) => {
    setTransferSelection(transfer && calculationKey ? { calculationKey, transfer } : null);
  }, [calculationKey]);

  const handleSelectRoute = useCallback((routeId: number) => {
    setSharedRouteSegment(null);
    setSharedSegmentColor(null);
    setSelectedTransfer(null);
    setShowTeleferico(false);
    setSelectedRouteId((current) => (current === routeId ? null : routeId));
  }, [setSelectedTransfer]);

  const handleClearSelection = useCallback(() => {
    setSharedRouteSegment(null);
    setSharedSegmentColor(null);
    setSelectedRouteId(null);
    setSelectedTransfer(null);
    setShowTeleferico(false);
  }, [setSelectedTransfer]);

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
  }, [markGeolocationOutside, setShowHint]);

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
  }, [setShowHint]);

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
  }, [clearAccuracyWarning, setSelectedTransfer, setShowHint]);

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

    if (sharedState.routeName) {
      const normalized = sharedState.routeName.toLowerCase();
      // Igualdad exacta primero: "Ruta 1" no debe resolver a "Ruta 1A".
      const route =
        polylineRoutes.find((r) => r.name.toLowerCase() === normalized) ??
        polylineRoutes.find((r) => r.name.toLowerCase().startsWith(`${normalized} `)) ??
        polylineRoutes.find((r) => r.name.toLowerCase().includes(normalized));
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
      const telefericoRoute = polylineRoutes.find((r) => isTelefericoRouteName(r.name));
      if (telefericoRoute) {
        setSelectedRouteId(telefericoRoute.id);
        setShowTeleferico(false);
      }
      pendingSharedStateRef.current = null;
      return;
    }

    if (sharedState.origin || sharedState.destination) {
      pendingSharedStateRef.current = null;
    }
  }, [polylineRoutes]);

  useEffect(() => {
    if (!originPoint || !destinationPoint || !calculationKey) return;

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
        rideMinutes: m.rideMinutes,
        expectedWaitMinutes: m.expectedWaitMinutes,
        estimatedMinutes: m.estimatedMinutes,
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

      let nextTransfers: TransferOption[] = [];
      if (nextSuggestions.length === 0 && polylineRoutes.length > 0) {
        nextTransfers = computeTransferOptionsFromPolylines(routesForMatching, originPoint, destinationPoint);
      }
      setRouteCalculation({
        key: calculationKey,
        suggestions: nextSuggestions,
        alternativeRouteIds: nextAlternativeIds,
        transfers: nextTransfers,
      });
    }, 80);

    return () => {
      window.clearTimeout(timer);
    };
  }, [calculationKey, destinationPoint, originPoint, polylineRoutes.length, routesForMatching]);

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
  const dropOffAlert = dropOffAlertState?.tripKey === activeTripKey
    ? dropOffAlertState.message
    : null;
  const feedbackGiven = activeTripKey !== null && feedbackTripKey === activeTripKey;

  useEffect(() => {
    dropOffArmedRef.current = false;
    dropOffNotifiedRef.current = false;
  }, [activeTripKey]);

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
  }, [setShowHint]);

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

  // Promueve una alternativa a "ruta recomendada" reordenando las sugerencias.
  const promoteSuggestion = useCallback((routeId: number) => {
    setRouteCalculation((current) => {
      if (!current || current.key !== calculationKey) return current;
      const index = current.suggestions.findIndex((suggestion) => suggestion.routeId === routeId);
      if (index <= 0) return current;
      const next = [...current.suggestions];
      const [picked] = next.splice(index, 1);
      next.unshift(picked);
      return { ...current, suggestions: next };
    });
  }, [calculationKey]);

  useEffect(() => {
    if (!bestSuggestion || flowStep !== 3 || !activeTripKey) return;

    return subscribeToLiveLocation((location) => {
      if (dropOffNotifiedRef.current) return;
      const segment = bestSuggestion.segment;
      const dropPoint = segment[segment.length - 1];
      if (!dropPoint) return;

      const distance = haversineMeters(location, dropPoint);
      if (!dropOffArmedRef.current) {
        if (distance > 500) dropOffArmedRef.current = true;
        return;
      }

      if (distance < 400) {
        dropOffNotifiedRef.current = true;
        try {
          navigator.vibrate?.([200, 100, 200]);
        } catch {
          // vibración no soportada: ignorar
        }
        setDropOffAlertState({
          tripKey: activeTripKey,
          message: `Prepárate para bajar: estás a ~${Math.round(distance)} m de tu parada. Avisa al chofer o toca el timbre.`,
        });
      }
    });
  }, [activeTripKey, bestSuggestion, flowStep, subscribeToLiveLocation]);

  // ── Modo viaje: progreso sobre la ruta ────────────────────────────────────
  // Si el usuario va sobre el segmento sugerido (a <300 m de él) y ya se alejó
  // de su origen, mostramos cuántos minutos faltan para su bajada.
  const tripProgress = useMemo(() => {
    if (!liveLocation || !bestSuggestion || flowStep !== 3 || !originPoint) {
      return null;
    }

    // Aún no se mueve del punto de partida: no hay viaje que seguir.
    if (haversineMeters(liveLocation, originPoint) < 250) {
      return null;
    }

    const segment = bestSuggestion.segment;
    let nearestIndex = -1;
    let nearestDistance = Infinity;
    for (let index = 0; index < segment.length; index += 1) {
      const d = haversineMeters(liveLocation, segment[index]);
      if (d < nearestDistance) {
        nearestDistance = d;
        nearestIndex = index;
      }
    }

    // Lejos del recorrido: el usuario no va (o ya no va) sobre esta ruta.
    if (nearestIndex < 0 || nearestDistance > 300) {
      return null;
    }

    const remaining = getEstimatedMinutes(segment.slice(nearestIndex));
    return { remainingMin: remaining };
  }, [liveLocation, bestSuggestion, flowStep, originPoint]);

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
          `Sube a ${formatRouteLabel(bestSuggestion.ruta)} cerca de ${originLandmark ?? "tu ubicación"} (~${Math.round(bestSuggestion.distanciaA)} m, ${walkMinutes(bestSuggestion.distanciaA)} min caminando). Los camiones paran casi en cualquier esquina: haz la parada con la mano.`,
          `Baja cerca de ${destLandmark ?? "tu destino"} (~${Math.round(bestSuggestion.distanciaB)} m, ${walkMinutes(bestSuggestion.distanciaB)} min caminando). Avisa al chofer o toca el timbre.`,
          `Tiempo estimado en ruta: ${bestSuggestionEta ?? getEstimatedMinutes(bestSuggestion.segment)} min. Tarifa: $${BUS_FARE_MXN} en efectivo al abordar.`
        ]
      };
    }

    if (selectedTransfer) {
      return {
        title: "Indicaciones con transbordo",
        items: [
          `Primero toma ${formatRouteLabel(selectedTransfer.routeAName)}.`,
          `Camina aproximadamente ${Math.round(selectedTransfer.walkMeters)} m (${walkMinutes(selectedTransfer.walkMeters)} min) en el punto de transbordo.`,
          `Continúa en ${formatRouteLabel(selectedTransfer.routeBName)} hasta acercarte al destino.`,
          `Tarifa total: $${BUS_FARE_MXN * 2} (pagas $${BUS_FARE_MXN} en efectivo en cada camión).`
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
  const renderRouteControls = (context: "mobile" | "desktop", hideStep3 = false, onlyStep3 = false) => {
    const isMobile = context === "mobile";
    return (
      <>
        {!onlyStep3 && (
        <>
        {/* Buscador de destino (acción principal) — coloca el pin B sin conocer el mapa */}
        <div className="w-full">
          <PlaceSearch
            label={activePoint === "origin" ? "Buscar origen" : "Buscar destino"}
            placeholder={activePoint === "origin"
              ? "¿Desde dónde sales? Colonia, calle, plaza…"
              : "¿A dónde vas? Colonia, hospital, plaza…"}
            onSelect={handlePlaceSearch}
          />
          {/* Chips de destinos frecuentes — una sola fila con scroll horizontal.
              En pantallas muy bajas (≤740px, p. ej. iPhone SE) se ocultan en móvil
              para no comerse el mapa; el buscador sigue cubriendo los mismos destinos. */}
          {activePoint !== "origin" && !destinationPoint && (
            <div
              className={`mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
                isMobile ? "[@media(max-height:740px)]:hidden" : ""
              }`}
              aria-label="Destinos frecuentes"
            >
              {lastTrip && (
                <button
                  type="button"
                  onClick={() => repeatTrip(lastTrip)}
                  style={{ background: "var(--ov-bg)" }}
                  className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-lima/45 px-3 py-1.5 text-[12px] font-bold text-lima shadow-soft backdrop-blur-xl transition hover:border-lima/70 active:scale-[0.97]"
                  aria-label={`Repetir tu último viaje a ${lastTrip.destinationLabel ?? "tu destino anterior"}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 shrink-0" aria-hidden="true">
                    <path d="M3 12a9 9 0 1 1 2.6 6.4M3 12V7m0 5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Repetir: {lastTrip.destinationLabel ?? "último viaje"}
                </button>
              )}
              {DESTINO_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleChipSearch(chip)}
                  style={{ background: "var(--ov-bg)", borderColor: "var(--ov-border)" }}
                  className="ov-text inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-semibold shadow-soft backdrop-blur-xl transition hover:border-lima/50 hover:text-lima active:scale-[0.97]"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 shrink-0 text-lima" aria-hidden="true">
                    <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="10" r="2" fill="currentColor" />
                  </svg>
                  {chip}
                </button>
              ))}
            </div>
          )}
        </div>

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
                    ${BUS_FARE_MXN} efectivo
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
                  ${BUS_FARE_MXN * 2} total (2 camiones)
                </p>
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
      <aside
        className={`relative z-30 hidden h-full shrink-0 flex-col border-r border-foreground/8 bg-ink-900/98 backdrop-blur-2xl lg:flex ${
          sidebarWidth == null ? "lg:w-[420px]" : ""
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
              {visibleRouteCount} rutas
            </span>
          </div>

          {/* Mode toggle */}
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={toggleRoutesMapMode}
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
            favoriteRouteNames={favoriteRouteNames}
            onToggleFavorite={toggleFavorite}
            onClearSelection={handleClearSelection}
            onShowTeleferico={() => { setShowTeleferico(true); }}
            onSelectRoute={handleSelectRoute}
            onHoverRoute={setHoveredRouteId}
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

        {/* ── MOBILE: Top overlay (oculto en desktop) ── */}
        <section className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-safe-or-4 lg:hidden">
          {/* Scrim: degradado que separa los controles del mapa para que se lean limpios */}
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-black/45 via-black/20 to-transparent" aria-hidden="true" />
          {/* Row 1: logo pill + mode toggle */}
          <div className="flex items-center gap-2">
            <div className="ov-panel pointer-events-auto inline-flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-[0_4px_24px_rgba(0,0,0,0.18)] backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-lima" aria-hidden="true" />
              <p className="ov-text font-serif-display text-[15px] font-black leading-none tracking-tight">UruGo</p>
              <span className="ov-pill ov-text-muted rounded-full px-1.5 py-0.5 text-[11px] font-medium">
                {visibleRouteCount}
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
              onClick={toggleRoutesMapMode}
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

          {/* Row 3: Buscador (héroe) + A/B controls. La guía paso a paso va dentro
              de renderRouteControls, evitando un hint duplicado. */}
          <div className="pointer-events-auto mt-2 space-y-2">
            {renderRouteControls("mobile", true)}
          </div>
        </section>

        {/* ── Progreso del viaje (vas arriba del camión) ── */}
        {tripProgress && !dropOffAlert && (
          <div className="pointer-events-none absolute inset-x-0 bottom-24 z-40 flex justify-center px-4" aria-live="polite">
            <div className="inline-flex items-center gap-2 rounded-full border border-lima/30 bg-slate-900/90 px-4 py-2 text-[12px] font-semibold text-slate-50 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-lima" aria-hidden="true">
                <path d="M5 17h14M5 17a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2M5 17v2m14-2v2M3 10h18M7.5 13.5h.01M16.5 13.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              En ruta · faltan ~{tripProgress.remainingMin} min para tu bajada
            </div>
          </div>
        )}

        {/* ── Aviso de bajada próxima (modo viaje) ── */}
        {dropOffAlert && (
          <div
            role="alert"
            className="pointer-events-none absolute inset-x-0 bottom-36 z-50 flex justify-center px-4"
          >
            <div className="pointer-events-auto flex max-w-md items-start gap-2.5 rounded-2xl border border-lima/40 bg-slate-900/95 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lima/15">
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-lima" aria-hidden="true">
                  <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </span>
              <p className="flex-1 text-[13px] font-medium leading-5 text-slate-50">{dropOffAlert}</p>
              <button
                type="button"
                onClick={() => setDropOffAlertState(null)}
                aria-label="Cerrar aviso"
                className="shrink-0 rounded-full p-1 text-slate-400 transition hover:text-slate-200 active:scale-[0.95]"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        )}

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
          className="absolute inset-x-4 z-30 flex items-end gap-2 lg:hidden"
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
              <ChatBot />
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

      {/* ── MOBILE ONLY: Result sheet (full) ── */}
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

      <OnboardingOverlay />
    </main>
  );
}

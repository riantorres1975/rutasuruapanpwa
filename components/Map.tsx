"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import {
  DEFAULT_ZOOM,
  SOURCE_ID,
  getBoundsFromCoordinates,
  getBoundsFromRoutes,
  getMapStyle,
  toFeatureCollection,
  URUAPAN_CENTER
} from "@/lib/map";
import type { RouteData } from "@/lib/types";

const LAYER_GLOW_ID = "routes-glow";
const LAYER_LINE_ID = "routes-line";
const LAYER_HIT_ID = "routes-hit";
const CAMERA_DURATION = 1200;
const cameraEasing = (t: number) => 1 - (1 - t) ** 3;

type MapProps = {
  routes: RouteData[];
  selectedRouteId: number | null;
  onSelectRoute: (routeId: number) => void;
};

function lineOpacityExpression(selectedRouteId: number | null) {
  if (selectedRouteId === null) {
    return 0.78;
  }

  return ["case", ["==", ["get", "id"], selectedRouteId], 1, 0.1] as any;
}

function lineWidthExpression(selectedRouteId: number | null) {
  if (selectedRouteId === null) {
    return 3.8;
  }

  return ["case", ["==", ["get", "id"], selectedRouteId], 8.2, 1.9] as any;
}

function glowOpacityExpression(selectedRouteId: number | null) {
  if (selectedRouteId === null) {
    return 0.2;
  }

  return ["case", ["==", ["get", "id"], selectedRouteId], 0.5, 0.05] as any;
}

function glowWidthExpression(selectedRouteId: number | null) {
  if (selectedRouteId === null) {
    return 10;
  }

  return ["case", ["==", ["get", "id"], selectedRouteId], 16, 8] as any;
}

function glowBlurExpression(selectedRouteId: number | null) {
  if (selectedRouteId === null) {
    return 1.2;
  }

  return ["case", ["==", ["get", "id"], selectedRouteId], 1.8, 1] as any;
}

function addRouteLayers(
  map: mapboxgl.Map,
  data: ReturnType<typeof toFeatureCollection>,
  selectedRouteId: number | null
) {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: "geojson",
      data
    });
  }

  if (!map.getLayer(LAYER_GLOW_ID)) {
    map.addLayer({
      id: LAYER_GLOW_ID,
      type: "line",
      source: SOURCE_ID,
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": ["get", "color"],
        "line-width": glowWidthExpression(selectedRouteId),
        "line-blur": glowBlurExpression(selectedRouteId),
        "line-opacity": glowOpacityExpression(selectedRouteId),
        "line-opacity-transition": { duration: 560 },
        "line-width-transition": { duration: 560 },
        "line-blur-transition": { duration: 560 }
      }
    });
  }

  if (!map.getLayer(LAYER_LINE_ID)) {
    map.addLayer({
      id: LAYER_LINE_ID,
      type: "line",
      source: SOURCE_ID,
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": ["get", "color"],
        "line-width": lineWidthExpression(selectedRouteId),
        "line-opacity": lineOpacityExpression(selectedRouteId),
        "line-opacity-transition": { duration: 560 },
        "line-width-transition": { duration: 560 }
      }
    });
  }

  if (!map.getLayer(LAYER_HIT_ID)) {
    map.addLayer({
      id: LAYER_HIT_ID,
      type: "line",
      source: SOURCE_ID,
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": "#000000",
        "line-width": 20,
        "line-opacity": 0
      }
    });
  }
}

function applyRouteLayerStyles(map: mapboxgl.Map, selectedRouteId: number | null) {
  if (!map.getLayer(LAYER_LINE_ID) || !map.getLayer(LAYER_GLOW_ID)) {
    return;
  }

  map.setPaintProperty(LAYER_LINE_ID, "line-opacity", lineOpacityExpression(selectedRouteId));
  map.setPaintProperty(LAYER_LINE_ID, "line-width", lineWidthExpression(selectedRouteId));
  map.setPaintProperty(LAYER_GLOW_ID, "line-opacity", glowOpacityExpression(selectedRouteId));
  map.setPaintProperty(LAYER_GLOW_ID, "line-width", glowWidthExpression(selectedRouteId));
  map.setPaintProperty(LAYER_GLOW_ID, "line-blur", glowBlurExpression(selectedRouteId));
}

function fitBoundsAnimated(
  map: mapboxgl.Map,
  bounds: [[number, number], [number, number]],
  options: {
    top: number;
    right: number;
    bottom: number;
    left: number;
    maxZoom: number;
    duration: number;
  }
) {
  map.fitBounds(bounds, {
    padding: {
      top: options.top,
      right: options.right,
      bottom: options.bottom,
      left: options.left
    },
    maxZoom: options.maxZoom,
    duration: options.duration,
    essential: true,
    easing: cameraEasing
  });
}

export default function Map({ routes, selectedRouteId, onSelectRoute }: MapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const routesRef = useRef(routes);
  const selectedRouteIdRef = useRef(selectedRouteId);
  const routeFeaturesRef = useRef(toFeatureCollection(routes));
  const isMapReadyRef = useRef(false);
  const onSelectRouteRef = useRef(onSelectRoute);

  const [isLoading, setIsLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);

  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const routeFeatures = useMemo(() => toFeatureCollection(routes), [routes]);

  useEffect(() => {
    onSelectRouteRef.current = onSelectRoute;
  }, [onSelectRoute]);

  useEffect(() => {
    routesRef.current = routes;
  }, [routes]);

  useEffect(() => {
    selectedRouteIdRef.current = selectedRouteId;
  }, [selectedRouteId]);

  useEffect(() => {
    routeFeaturesRef.current = routeFeatures;
  }, [routeFeatures]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !mapToken) {
      return;
    }

    const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;

    mapboxgl.accessToken = mapToken;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: getMapStyle(isDarkMode),
      center: URUAPAN_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
      antialias: true
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    const onRouteClick = (event: mapboxgl.MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const routeId = Number(feature?.properties?.id);

      if (!Number.isNaN(routeId)) {
        onSelectRouteRef.current(routeId);
      }
    };

    const onRouteEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };

    const onRouteLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    const bindRouteInteraction = () => {
      if (!map.getLayer(LAYER_HIT_ID)) {
        return;
      }

      map.off("click", LAYER_HIT_ID, onRouteClick);
      map.off("mouseenter", LAYER_HIT_ID, onRouteEnter);
      map.off("mouseleave", LAYER_HIT_ID, onRouteLeave);

      map.on("click", LAYER_HIT_ID, onRouteClick);
      map.on("mouseenter", LAYER_HIT_ID, onRouteEnter);
      map.on("mouseleave", LAYER_HIT_ID, onRouteLeave);
    };

    const ensureRouteLayers = () => {
      addRouteLayers(map, routeFeaturesRef.current, selectedRouteIdRef.current);
      applyRouteLayerStyles(map, selectedRouteIdRef.current);
      bindRouteInteraction();
    };

    const onLoad = () => {
      ensureRouteLayers();

      const bounds = getBoundsFromRoutes(routesRef.current);
      if (bounds) {
        fitBoundsAnimated(map, bounds, {
          top: 88,
          right: 28,
          bottom: 146,
          left: 28,
          duration: CAMERA_DURATION,
          maxZoom: 14.6
        });
      }

      isMapReadyRef.current = true;
      setIsLoading(false);
    };

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onColorSchemeChange = (event: MediaQueryListEvent) => {
      const nextStyle = getMapStyle(event.matches);
      map.setStyle(nextStyle);
      map.once("style.load", ensureRouteLayers);
    };

    map.on("load", onLoad);
    media.addEventListener("change", onColorSchemeChange);

    mapRef.current = map;

    return () => {
      media.removeEventListener("change", onColorSchemeChange);
      map.off("load", onLoad);
      if (map.getLayer(LAYER_HIT_ID)) {
        map.off("click", LAYER_HIT_ID, onRouteClick);
        map.off("mouseenter", LAYER_HIT_ID, onRouteEnter);
        map.off("mouseleave", LAYER_HIT_ID, onRouteLeave);
      }
      map.remove();
      isMapReadyRef.current = false;
      mapRef.current = null;
    };
  }, [mapToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReadyRef.current) {
      return;
    }

    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(routeFeatures);
    }
  }, [routeFeatures]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReadyRef.current) {
      return;
    }

    applyRouteLayerStyles(map, selectedRouteId);
    map.stop();

    if (selectedRouteId !== null) {
      const route = routes.find((item) => item.id === selectedRouteId);
      if (route) {
        const bounds = getBoundsFromCoordinates(route.coordenadas);
        fitBoundsAnimated(map, bounds, {
          top: 116,
          right: 32,
          bottom: 154,
          left: 32,
          duration: CAMERA_DURATION,
          maxZoom: 15
        });
      }
      return;
    }

    const allBounds = getBoundsFromRoutes(routes);
    if (allBounds) {
      fitBoundsAnimated(map, allBounds, {
        top: 88,
        right: 28,
        bottom: 146,
        left: 28,
        duration: 900,
        maxZoom: 14.6
      });
    }
  }, [routes, selectedRouteId]);

  const handleLocateMe = () => {
    const map = mapRef.current;
    if (!map || !navigator.geolocation) {
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        map.flyTo({
          center: [coords.longitude, coords.latitude],
          zoom: 15.5,
          duration: 1200,
          essential: true
        });
        setLocationLoading(false);
      },
      () => {
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 9000,
        maximumAge: 0
      }
    );
  };

  if (!mapToken) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-100">
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 text-center shadow-soft">
          <p className="text-base font-semibold">Falta configurar Mapbox</p>
          <p className="mt-1 text-sm text-slate-300">
            Crea un archivo <code>.env.local</code> con <code>NEXT_PUBLIC_MAPBOX_TOKEN</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {isLoading && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-slate-950/35 backdrop-blur-[2px]">
          <div className="rounded-full border border-white/20 bg-slate-900/70 px-4 py-2 text-sm font-medium text-slate-100">
            Cargando mapa...
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleLocateMe}
        disabled={locationLoading}
        className="absolute bottom-24 left-4 z-20 grid h-12 w-12 place-items-center rounded-full border border-white/35 bg-[var(--surface-strong)] text-slate-900 shadow-soft transition hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 dark:text-slate-100"
        aria-label="Ir a mi ubicacion"
      >
        {locationLoading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path
              d="M12 8.5V4M15.5 12H20M12 15.5V20M8.5 12H4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </section>
  );
}

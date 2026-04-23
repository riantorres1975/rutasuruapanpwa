"use client";

import { memo, type MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { Coordinates, RouteData } from "@/lib/types";

const LAYER_GLOW_ID = "routes-glow";
const LAYER_LINE_ID = "routes-line";
const LAYER_HIT_ID = "routes-hit";
const CAMERA_DURATION = 1200;
const MIN_DRAW_DURATION = 1200;
const MAX_DRAW_DURATION = 1800;
const SHORT_ROUTE_THRESHOLD = 24;
const cameraEasing = (t: number) => 1 - (1 - t) ** 3;

type MapProps = {
  routes: RouteData[];
  selectedRouteId: number | null;
  suggestedRouteIds: number[];
  bestSuggestedRouteId: number | null;
  selectedRouteSegment: Coordinates[] | null;
  originPoint: [number, number] | null;
  destinationPoint: [number, number] | null;
  onMapPick: (point: [number, number]) => void;
  onSelectRoute: (routeId: number) => void;
};

function lineOpacityExpression(
  selectedRouteId: number | null,
  suggestedRouteIds: number[],
  bestSuggestedRouteId: number | null,
  selectedSegmentActive: boolean
) {
  const suggestedExpression = ["in", ["get", "id"], ["literal", suggestedRouteIds]] as any;

  if (selectedRouteId === null) {
    if (suggestedRouteIds.length === 0) {
      return 0.82;
    }

    if (bestSuggestedRouteId !== null) {
      return ["case", ["==", ["get", "id"], bestSuggestedRouteId], 1, suggestedExpression, 0.82, 0.14] as any;
    }

    return ["case", suggestedExpression, 0.82, 0.14] as any;
  }

  if (selectedSegmentActive) {
    return ["case", ["==", ["get", "id"], selectedRouteId], 1, 0.12] as any;
  }

  return ["case", ["==", ["get", "id"], selectedRouteId], 1, suggestedExpression, 0.72, 0.14] as any;
}

function lineWidthExpression(
  selectedRouteId: number | null,
  suggestedRouteIds: number[],
  bestSuggestedRouteId: number | null,
  selectedSegmentActive: boolean
) {
  const suggestedExpression = ["in", ["get", "id"], ["literal", suggestedRouteIds]] as any;

  if (selectedRouteId === null) {
    if (suggestedRouteIds.length === 0) {
      return 3.4;
    }

    if (bestSuggestedRouteId !== null) {
      return ["case", ["==", ["get", "id"], bestSuggestedRouteId], 5.8, suggestedExpression, 4.8, 2] as any;
    }

    return ["case", suggestedExpression, 4.8, 2] as any;
  }

  if (selectedSegmentActive) {
    return ["case", ["==", ["get", "id"], selectedRouteId], 5.8, 1.8] as any;
  }

  return ["case", ["==", ["get", "id"], selectedRouteId], 5.8, suggestedExpression, 4.8, 2] as any;
}

function glowOpacityExpression(
  selectedRouteId: number | null,
  suggestedRouteIds: number[],
  bestSuggestedRouteId: number | null,
  selectedSegmentActive: boolean
) {
  const suggestedExpression = ["in", ["get", "id"], ["literal", suggestedRouteIds]] as any;

  if (selectedRouteId === null) {
    if (suggestedRouteIds.length === 0) {
      return 0.22;
    }

    if (bestSuggestedRouteId !== null) {
      return ["case", ["==", ["get", "id"], bestSuggestedRouteId], 0.3, suggestedExpression, 0.2, 0.1] as any;
    }

    return ["case", suggestedExpression, 0.2, 0.1] as any;
  }

  if (selectedSegmentActive) {
    return ["case", ["==", ["get", "id"], selectedRouteId], 0.3, 0.08] as any;
  }

  return ["case", ["==", ["get", "id"], selectedRouteId], 0.3, suggestedExpression, 0.2, 0.1] as any;
}

function glowWidthExpression(
  selectedRouteId: number | null,
  suggestedRouteIds: number[],
  bestSuggestedRouteId: number | null,
  selectedSegmentActive: boolean
) {
  const suggestedExpression = ["in", ["get", "id"], ["literal", suggestedRouteIds]] as any;

  if (selectedRouteId === null) {
    if (suggestedRouteIds.length === 0) {
      return 10.5;
    }

    if (bestSuggestedRouteId !== null) {
      return ["case", ["==", ["get", "id"], bestSuggestedRouteId], 13, suggestedExpression, 11, 6] as any;
    }

    return ["case", suggestedExpression, 11, 6] as any;
  }

  if (selectedSegmentActive) {
    return ["case", ["==", ["get", "id"], selectedRouteId], 13, 5.5] as any;
  }

  return ["case", ["==", ["get", "id"], selectedRouteId], 13, suggestedExpression, 11, 6] as any;
}

function glowBlurExpression(
  selectedRouteId: number | null,
  suggestedRouteIds: number[],
  bestSuggestedRouteId: number | null,
  selectedSegmentActive: boolean
) {
  const suggestedExpression = ["in", ["get", "id"], ["literal", suggestedRouteIds]] as any;

  if (selectedRouteId === null) {
    if (suggestedRouteIds.length === 0) {
      return 2.2;
    }

    if (bestSuggestedRouteId !== null) {
      return ["case", ["==", ["get", "id"], bestSuggestedRouteId], 3.2, suggestedExpression, 2.4, 2] as any;
    }

    return ["case", suggestedExpression, 2.4, 2] as any;
  }

  if (selectedSegmentActive) {
    return ["case", ["==", ["get", "id"], selectedRouteId], 3.2, 1.8] as any;
  }

  return ["case", ["==", ["get", "id"], selectedRouteId], 3.2, suggestedExpression, 2.4, 2] as any;
}

function addRouteLayers(
  map: mapboxgl.Map,
  data: ReturnType<typeof toFeatureCollection>,
  selectedRouteId: number | null,
  suggestedRouteIds: number[],
  bestSuggestedRouteId: number | null,
  selectedSegmentActive: boolean
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
        "line-width": glowWidthExpression(selectedRouteId, suggestedRouteIds, bestSuggestedRouteId, selectedSegmentActive),
        "line-blur": glowBlurExpression(selectedRouteId, suggestedRouteIds, bestSuggestedRouteId, selectedSegmentActive),
        "line-opacity": glowOpacityExpression(selectedRouteId, suggestedRouteIds, bestSuggestedRouteId, selectedSegmentActive),
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
        "line-width": lineWidthExpression(selectedRouteId, suggestedRouteIds, bestSuggestedRouteId, selectedSegmentActive),
        "line-opacity": lineOpacityExpression(selectedRouteId, suggestedRouteIds, bestSuggestedRouteId, selectedSegmentActive),
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

function applyRouteLayerStyles(
  map: mapboxgl.Map,
  selectedRouteId: number | null,
  suggestedRouteIds: number[],
  bestSuggestedRouteId: number | null,
  selectedSegmentActive: boolean
) {
  if (!map.getLayer(LAYER_LINE_ID) || !map.getLayer(LAYER_GLOW_ID)) {
    return;
  }

  map.setPaintProperty(
    LAYER_LINE_ID,
    "line-opacity",
    lineOpacityExpression(selectedRouteId, suggestedRouteIds, bestSuggestedRouteId, selectedSegmentActive)
  );
  map.setPaintProperty(
    LAYER_LINE_ID,
    "line-width",
    lineWidthExpression(selectedRouteId, suggestedRouteIds, bestSuggestedRouteId, selectedSegmentActive)
  );
  map.setPaintProperty(
    LAYER_GLOW_ID,
    "line-opacity",
    glowOpacityExpression(selectedRouteId, suggestedRouteIds, bestSuggestedRouteId, selectedSegmentActive)
  );
  map.setPaintProperty(
    LAYER_GLOW_ID,
    "line-width",
    glowWidthExpression(selectedRouteId, suggestedRouteIds, bestSuggestedRouteId, selectedSegmentActive)
  );
  map.setPaintProperty(
    LAYER_GLOW_ID,
    "line-blur",
    glowBlurExpression(selectedRouteId, suggestedRouteIds, bestSuggestedRouteId, selectedSegmentActive)
  );
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

function interpolatePoint(start: [number, number], end: [number, number], ratio: number): [number, number] {
  return [start[0] + (end[0] - start[0]) * ratio, start[1] + (end[1] - start[1]) * ratio];
}

function getDrawDuration(totalPoints: number) {
  const normalized = Math.max(0, Math.min(1, (totalPoints - SHORT_ROUTE_THRESHOLD) / 400));
  return Math.round(MIN_DRAW_DURATION + (MAX_DRAW_DURATION - MIN_DRAW_DURATION) * normalized);
}

function withSelectedSegment(
  features: GeoJSON.Feature<GeoJSON.LineString>[],
  featureIndex: number,
  coordinates: Coordinates[]
) {
  return {
    type: "FeatureCollection",
    features: [
      ...features.slice(0, featureIndex),
      {
        ...features[featureIndex],
        geometry: {
          ...features[featureIndex].geometry,
          coordinates
        }
      },
      ...features.slice(featureIndex + 1)
    ]
  } as GeoJSON.FeatureCollection<GeoJSON.LineString>;
}

function isSegmentSelection(selectedRouteId: number | null, selectedRouteSegment: Coordinates[] | null) {
  return selectedRouteId !== null && Array.isArray(selectedRouteSegment) && selectedRouteSegment.length > 1;
}

function MapComponent({
  routes,
  selectedRouteId,
  suggestedRouteIds,
  bestSuggestedRouteId,
  selectedRouteSegment,
  originPoint,
  destinationPoint,
  onMapPick,
  onSelectRoute
}: MapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const routesRef = useRef(routes);
  const selectedRouteIdRef = useRef(selectedRouteId);
  const suggestedRouteIdsRef = useRef(suggestedRouteIds);
  const bestSuggestedRouteIdRef = useRef(bestSuggestedRouteId);
  const selectedRouteSegmentRef = useRef(selectedRouteSegment);
  const routeFeaturesRef = useRef(toFeatureCollection(routes));
  const isMapReadyRef = useRef(false);
  const onSelectRouteRef = useRef(onSelectRoute);
  const onMapPickRef = useRef(onMapPick);
  const animationFrameRef = useRef<number | null>(null);
  const animationTokenRef = useRef(0);
  const originMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);

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
    suggestedRouteIdsRef.current = suggestedRouteIds;
  }, [suggestedRouteIds]);

  useEffect(() => {
    bestSuggestedRouteIdRef.current = bestSuggestedRouteId;
  }, [bestSuggestedRouteId]);

  useEffect(() => {
    selectedRouteSegmentRef.current = selectedRouteSegment;
  }, [selectedRouteSegment]);

  useEffect(() => {
    routeFeaturesRef.current = routeFeatures;
  }, [routeFeatures]);

  useEffect(() => {
    onMapPickRef.current = onMapPick;
  }, [onMapPick]);

  const stopRouteAnimation = useCallback(() => {
    animationTokenRef.current += 1;
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

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

    const onMapClick = (event: mapboxgl.MapMouseEvent) => {
      const hitFeature = map.queryRenderedFeatures(event.point, { layers: [LAYER_HIT_ID] });
      if (hitFeature.length > 0) {
        return;
      }

      onMapPickRef.current([Number(event.lngLat.lng.toFixed(6)), Number(event.lngLat.lat.toFixed(6))]);
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
      addRouteLayers(
        map,
        routeFeaturesRef.current,
        selectedRouteIdRef.current,
        suggestedRouteIdsRef.current,
        bestSuggestedRouteIdRef.current,
        isSegmentSelection(selectedRouteIdRef.current, selectedRouteSegmentRef.current)
      );
      applyRouteLayerStyles(
        map,
        selectedRouteIdRef.current,
        suggestedRouteIdsRef.current,
        bestSuggestedRouteIdRef.current,
        isSegmentSelection(selectedRouteIdRef.current, selectedRouteSegmentRef.current)
      );
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
    map.on("click", onMapClick);
    media.addEventListener("change", onColorSchemeChange);

    mapRef.current = map;

    return () => {
      stopRouteAnimation();
      originMarkerRef.current?.remove();
      destinationMarkerRef.current?.remove();
      originMarkerRef.current = null;
      destinationMarkerRef.current = null;
      media.removeEventListener("change", onColorSchemeChange);
      map.off("load", onLoad);
      map.off("click", onMapClick);
      if (map.getLayer(LAYER_HIT_ID)) {
        map.off("click", LAYER_HIT_ID, onRouteClick);
        map.off("mouseenter", LAYER_HIT_ID, onRouteEnter);
        map.off("mouseleave", LAYER_HIT_ID, onRouteLeave);
      }
      map.remove();
      isMapReadyRef.current = false;
      mapRef.current = null;
    };
  }, [mapToken, stopRouteAnimation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReadyRef.current) {
      return;
    }

    const updateMarker = (
      markerRef: MutableRefObject<mapboxgl.Marker | null>,
      point: [number, number] | null,
      color: string,
      label: string
    ) => {
      if (!point) {
        markerRef.current?.remove();
        markerRef.current = null;
        return;
      }

      if (!markerRef.current) {
        const element = document.createElement("div");
        element.className = "grid h-8 w-8 place-items-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-soft";
        element.style.backgroundColor = color;
        element.textContent = label;
        markerRef.current = new mapboxgl.Marker({ element, anchor: "center" });
      }

      markerRef.current.setLngLat(point).addTo(map);
    };

    const segmentStart = selectedRouteSegment?.[0] ?? null;
    const segmentEnd = selectedRouteSegment ? selectedRouteSegment[selectedRouteSegment.length - 1] ?? null : null;

    updateMarker(originMarkerRef, segmentStart ?? originPoint, "#16a34a", "A");
    updateMarker(destinationMarkerRef, segmentEnd ?? destinationPoint, "#dc2626", "B");
  }, [destinationPoint, originPoint, selectedRouteSegment]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReadyRef.current) {
      return;
    }

    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (!source) {
      return;
    }

    stopRouteAnimation();

    const selectedSegmentActive = isSegmentSelection(selectedRouteId, selectedRouteSegment);

    applyRouteLayerStyles(
      map,
      selectedRouteId,
      suggestedRouteIdsRef.current,
      bestSuggestedRouteIdRef.current,
      selectedSegmentActive
    );
    map.stop();

    if (selectedRouteId !== null) {
      const route = routes.find((item) => item.id === selectedRouteId);
      if (route) {
        const selectedCoordinates = selectedSegmentActive && selectedRouteSegment ? selectedRouteSegment : route.coordenadas;
        const bounds = getBoundsFromCoordinates(selectedCoordinates);
        fitBoundsAnimated(map, bounds, {
          top: 116,
          right: 32,
          bottom: 154,
          left: 32,
          duration: CAMERA_DURATION,
          maxZoom: 15
        });

        const featureIndex = routeFeatures.features.findIndex(
          (feature) => Number((feature.properties as { id?: number })?.id) === selectedRouteId
        );

        if (featureIndex !== -1 && selectedCoordinates.length > SHORT_ROUTE_THRESHOLD) {
          const duration = getDrawDuration(selectedCoordinates.length);
          const token = animationTokenRef.current + 1;
          animationTokenRef.current = token;
          let startTime: number | null = null;
          let drawIndex = 1;

          const maxIndex = selectedCoordinates.length - 1;
          const baseFeatures = routeFeatures.features;

          source.setData(withSelectedSegment(baseFeatures, featureIndex, selectedCoordinates.slice(0, 2)));

          const animate = (timestamp: number) => {
            if (animationTokenRef.current !== token) {
              return;
            }

            if (startTime === null) {
              startTime = timestamp;
            }

            const elapsed = timestamp - startTime;
            const progress = Math.min(1, elapsed / duration);
            const eased = 1 - (1 - progress) ** 3;

            const pointer = 1 + eased * (maxIndex - 1);
            const targetIndex = Math.max(1, Math.floor(pointer));
            drawIndex = Math.max(drawIndex, targetIndex);
            const nextIndex = Math.min(maxIndex, drawIndex + 1);
            const stepProgress = Math.max(0, Math.min(1, pointer - drawIndex));

            const animatedCoordinates = selectedCoordinates.slice(0, drawIndex + 1);

            if (drawIndex < maxIndex) {
              animatedCoordinates.push(
                interpolatePoint(selectedCoordinates[drawIndex], selectedCoordinates[nextIndex], stepProgress)
              );
            }

            source.setData(withSelectedSegment(baseFeatures, featureIndex, animatedCoordinates));

            if (progress < 1) {
              animationFrameRef.current = window.requestAnimationFrame(animate);
            } else {
              animationFrameRef.current = null;
            }
          };

          animationFrameRef.current = window.requestAnimationFrame(animate);
        } else if (featureIndex !== -1) {
          source.setData(withSelectedSegment(routeFeatures.features, featureIndex, selectedCoordinates));
        } else {
          source.setData(routeFeatures);
        }
      } else {
        source.setData(routeFeatures);
      }
      return;
    }

    source.setData(routeFeatures);

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
  }, [routeFeatures, routes, selectedRouteId, selectedRouteSegment, stopRouteAnimation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReadyRef.current) {
      return;
    }

    applyRouteLayerStyles(
      map,
      selectedRouteId,
      suggestedRouteIds,
      bestSuggestedRouteId,
      isSegmentSelection(selectedRouteId, selectedRouteSegment)
    );
  }, [bestSuggestedRouteId, selectedRouteId, selectedRouteSegment, suggestedRouteIds]);

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

export default memo(MapComponent);

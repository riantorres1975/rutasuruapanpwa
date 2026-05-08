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

type ArrowSegment = { coords: Coordinates[]; color: string; showLine?: boolean };
import type { TransferOption } from "@/lib/transfers";
import { isDebugMode, getClosestPoint, buildDebugPointsGeoJSON, exportRouteCoords, replaceSegment } from "@/lib/map-debug";

const LAYER_GLOW_ID = "routes-glow";
const LAYER_LINE_ID = "routes-line";
const LAYER_HIT_ID = "routes-hit";
const ARROWS_SOURCE = "arrows-source";
const ARROWS_LINE_LAYER = "arrows-line";
const ARROWS_LAYER = "arrows-layer";
const USER_LOC_SOURCE = "user-location-source";
const USER_LOC_ACCURACY_LAYER = "user-location-accuracy";
const USER_LOC_DOT_LAYER = "user-location-dot";
const TELEFERICO_SOURCE = "teleferico-source";
const TELEFERICO_LINE_LAYER = "teleferico-line";
const TELEFERICO_GLOW_LAYER = "teleferico-glow";
const TELEFERICO_STATIONS_LAYER = "teleferico-stations";
const TELEFERICO_COLOR = "#00D4AA";
const TELEFERICO_ROUTE_NAME = "Teleférico Uruapan";
const TRANSFER_SOURCE = "transfer-source";
const TRANSFER_SEG_A_LAYER = "transfer-seg-a";
const TRANSFER_SEG_B_LAYER = "transfer-seg-b";
const TRANSFER_WALK_LAYER = "transfer-walk";
const TRANSFER_PIN_LAYER = "transfer-pin";
const CAMERA_DURATION = 1200;
const MIN_DRAW_DURATION = 1200;
const MAX_DRAW_DURATION = 1800;
const SHORT_ROUTE_THRESHOLD = 24;
const IDLE_ROUTE_OPACITY = 0.35;
const DEBUG_POINTS_SOURCE = "debug-points-source";
const DEBUG_POINTS_CIRCLE = "debug-points-circle";
const DEBUG_POINTS_LABEL = "debug-points-label";
const DEBUG_SEGMENT_SOURCE = "debug-segment-source";
const DEBUG_SEGMENT_LINE = "debug-segment-line";
const DEBUG_DRAW_SOURCE = "debug-draw-source";
const DEBUG_DRAW_LINE = "debug-draw-line";
type RoutesMapMode = "all-visible" | "all-highlighted";
const cameraEasing = (t: number) => 1 - (1 - t) ** 3;

function createEndpointMarkerElement(color: string, label: string) {
  const element = document.createElement("div");
  element.className = "endpoint-marker";
  element.style.color = color;
  element.setAttribute("aria-label", label === "A" ? "Punto de origen" : "Punto de destino");
  element.innerHTML = `
    <svg width="38" height="48" viewBox="0 0 38 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g filter="url(#endpoint-shadow-${label})">
        <path d="M19 3.5C10.44 3.5 3.5 10.35 3.5 18.8C3.5 30.55 19 44.5 19 44.5C19 44.5 34.5 30.55 34.5 18.8C34.5 10.35 27.56 3.5 19 3.5Z" fill="currentColor" stroke="white" stroke-width="3" stroke-linejoin="round" />
        <circle cx="19" cy="18.8" r="9.2" fill="rgba(255,255,255,0.95)" />
        <text x="19" y="22.2" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="900" fill="currentColor">${label}</text>
      </g>
      <defs>
        <filter id="endpoint-shadow-${label}" x="0" y="0" width="38" height="48" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.32" />
        </filter>
      </defs>
    </svg>
  `;
  return element;
}

function applyComfortLightMapPalette(map: mapboxgl.Map) {
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id.toLowerCase();

    try {
      if (layer.type === "background") {
        map.setPaintProperty(layer.id, "background-color", "#cfd4ce");
      } else if (layer.type === "fill") {
        const color = id.includes("water")
          ? "#aebdc0"
          : id.includes("park") || id.includes("landuse") || id.includes("landcover") || id.includes("national-park")
            ? "#b9c4b2"
            : id.includes("building")
              ? "#b2b8b0"
              : "#cbd1c8";
        map.setPaintProperty(layer.id, "fill-color", color);
        map.setPaintProperty(layer.id, "fill-opacity", id.includes("building") ? 0.45 : 1);
      } else if (layer.type === "line") {
        const color = id.includes("road")
          ? "#e7e9e2"
          : id.includes("water")
            ? "#96a8aa"
            : "#9ba39a";
        map.setPaintProperty(layer.id, "line-color", color);
      } else if (layer.type === "symbol") {
        map.setPaintProperty(layer.id, "text-color", "#30382f");
        map.setPaintProperty(layer.id, "text-halo-color", "#cfd4ce");
        map.setPaintProperty(layer.id, "text-halo-width", 1.2);
      }
    } catch {
      // Some Mapbox base layers do not expose every paint property consistently.
    }
  }
}

type MapProps = {
  routes: RouteData[];
  selectedRouteId: number | null;
  suggestedRouteIds: number[];
  allRoutesMode: RoutesMapMode;
  bestSuggestedRouteId: number | null;
  selectedRouteSegment: Coordinates[] | null;
  arrowSegments?: ArrowSegment[];
  originPoint: [number, number] | null;
  destinationPoint: [number, number] | null;
  showTeleferico?: boolean;
  selectedTransfer?: TransferOption | null;
  awaitingPick?: "origin" | "destination" | null;
  onMapPick: (point: [number, number]) => void;
  onSelectRoute: (routeId: number) => void;
  onNearbyRoutesFound: (routeIds: number[]) => void;
};

function telefericoRouteExpression() {
  return ["==", ["get", "nombre"], TELEFERICO_ROUTE_NAME] as any;
}

function lineDashArrayExpression() {
  return ["case", telefericoRouteExpression(), ["literal", [2, 2]], ["literal", [1, 0.0001]]] as any;
}

function glowColorExpression(selectedRouteId: number | null) {
  if (selectedRouteId === null) {
    return ["get", "color"] as any;
  }

  return [
    "case",
    ["all", ["==", ["get", "id"], selectedRouteId], telefericoRouteExpression()],
    "#00D4AA",
    ["get", "color"]
  ] as any;
}

function lineOpacityExpression(
  selectedRouteId: number | null,
  suggestedRouteIds: number[],
  bestSuggestedRouteId: number | null,
  selectedSegmentActive: boolean,
  hoveredRouteId: number | null,
  allRoutesMode: RoutesMapMode,
  transferRouteIds: number[],
  debugActive = false
) {
  if (debugActive && selectedRouteId !== null) {
    return ["case", ["==", ["get", "id"], selectedRouteId], 1, 0] as any;
  }

  if (transferRouteIds.length > 0) {
    return 0.06 as any;
  }

  if (selectedRouteId === null && selectedSegmentActive) {
    return 0 as any;
  }

  const suggestedExpression = ["in", ["get", "id"], ["literal", suggestedRouteIds.length > 0 ? suggestedRouteIds : [-1]]] as any;
  const isTeleferico = telefericoRouteExpression();

  let baseExpression: any;

  if (selectedRouteId === null) {
    if (suggestedRouteIds.length === 0) {
      const regularOpacity = allRoutesMode === "all-highlighted" ? 0.82 : IDLE_ROUTE_OPACITY;
      const telefericoOpacity = allRoutesMode === "all-highlighted" ? 0.9 : 0.45;
      baseExpression = ["case", isTeleferico, telefericoOpacity, regularOpacity] as any;
    } else if (bestSuggestedRouteId !== null) {
      baseExpression = ["case", ["==", ["get", "id"], bestSuggestedRouteId], 1, suggestedExpression, 0.82, 0.14] as any;
    } else {
      baseExpression = ["case", suggestedExpression, 0.82, 0.14] as any;
    }
  } else if (selectedSegmentActive) {
    baseExpression = ["case", ["==", ["get", "id"], selectedRouteId], 1, 0] as any;
  } else {
    baseExpression = ["case", ["==", ["get", "id"], selectedRouteId], 1, 0] as any;
  }

  if (hoveredRouteId !== null) {
    return ["case", ["==", ["get", "id"], hoveredRouteId], 1, baseExpression] as any;
  }

  return baseExpression;
}

function lineWidthExpression(
  selectedRouteId: number | null,
  suggestedRouteIds: number[],
  bestSuggestedRouteId: number | null,
  selectedSegmentActive: boolean,
  hoveredRouteId: number | null,
  allRoutesMode: RoutesMapMode,
  transferRouteIds: number[]
) {
  if (transferRouteIds.length > 0) {
    return 1.5 as any;
  }

  if (selectedRouteId === null && selectedSegmentActive) {
    return 0 as any;
  }

  const suggestedExpression = ["in", ["get", "id"], ["literal", suggestedRouteIds.length > 0 ? suggestedRouteIds : [-1]]] as any;
  const isTeleferico = telefericoRouteExpression();

  void allRoutesMode;

  let baseExpression: any;

  if (selectedRouteId === null) {
    if (suggestedRouteIds.length === 0) {
      baseExpression = ["case", isTeleferico, 4, 3] as any;
    } else if (bestSuggestedRouteId !== null) {
      baseExpression = ["case", ["==", ["get", "id"], bestSuggestedRouteId], 5.8, suggestedExpression, 4.8, 2] as any;
    } else {
      baseExpression = ["case", suggestedExpression, 4.8, 2] as any;
    }
  } else if (selectedSegmentActive) {
    baseExpression = ["case", ["==", ["get", "id"], selectedRouteId], 5.8, 0] as any;
  } else {
    baseExpression = ["case", ["==", ["get", "id"], selectedRouteId], 5.8, 0] as any;
  }

  if (hoveredRouteId !== null) {
    const hoveredWidth = selectedRouteId !== null && hoveredRouteId === selectedRouteId ? 5.8 : 4.5;
    return ["case", ["==", ["get", "id"], hoveredRouteId], hoveredWidth, baseExpression] as any;
  }

  return baseExpression;
}

function glowOpacityExpression(
  selectedRouteId: number | null,
  suggestedRouteIds: number[],
  bestSuggestedRouteId: number | null,
  selectedSegmentActive: boolean,
  hoveredRouteId: number | null,
  allRoutesMode: RoutesMapMode,
  transferRouteIds: number[]
) {
  if (transferRouteIds.length > 0) {
    return 0.0 as any;
  }

  if (selectedRouteId === null && selectedSegmentActive) {
    return 0 as any;
  }

  const suggestedExpression = ["in", ["get", "id"], ["literal", suggestedRouteIds.length > 0 ? suggestedRouteIds : [-1]]] as any;
  const isTeleferico = telefericoRouteExpression();

  let baseExpression: any;

  if (selectedRouteId === null) {
    if (suggestedRouteIds.length === 0) {
      baseExpression = allRoutesMode === "all-highlighted" ? 0.22 : 0.08;
    } else if (bestSuggestedRouteId !== null) {
      baseExpression = ["case", ["==", ["get", "id"], bestSuggestedRouteId], 0.3, suggestedExpression, 0.2, 0.1] as any;
    } else {
      baseExpression = ["case", suggestedExpression, 0.2, 0.1] as any;
    }
  } else if (selectedSegmentActive) {
    baseExpression = [
      "case",
      ["==", ["get", "id"], selectedRouteId],
      ["case", isTeleferico, 0.48, 0.3],
      0
    ] as any;
  } else {
    baseExpression = [
      "case",
      ["==", ["get", "id"], selectedRouteId],
      ["case", isTeleferico, 0.48, 0.3],
      0
    ] as any;
  }

  if (hoveredRouteId !== null) {
    return ["case", ["==", ["get", "id"], hoveredRouteId], 0.34, baseExpression] as any;
  }

  return baseExpression;
}

function glowWidthExpression(
  selectedRouteId: number | null,
  suggestedRouteIds: number[],
  bestSuggestedRouteId: number | null,
  selectedSegmentActive: boolean,
  hoveredRouteId: number | null,
  allRoutesMode: RoutesMapMode,
  transferRouteIds: number[]
) {
  if (transferRouteIds.length > 0) {
    return 0 as any;
  }

  if (selectedRouteId === null && selectedSegmentActive) {
    return 0 as any;
  }

  const suggestedExpression = ["in", ["get", "id"], ["literal", suggestedRouteIds.length > 0 ? suggestedRouteIds : [-1]]] as any;
  const isTeleferico = telefericoRouteExpression();

  let baseExpression: any;

  if (selectedRouteId === null) {
    if (suggestedRouteIds.length === 0) {
      baseExpression = allRoutesMode === "all-highlighted" ? 10.5 : 6;
    } else if (bestSuggestedRouteId !== null) {
      baseExpression = ["case", ["==", ["get", "id"], bestSuggestedRouteId], 13, suggestedExpression, 11, 6] as any;
    } else {
      baseExpression = ["case", suggestedExpression, 11, 6] as any;
    }
  } else if (selectedSegmentActive) {
    baseExpression = [
      "case",
      ["==", ["get", "id"], selectedRouteId],
      ["case", isTeleferico, 16, 13],
      0
    ] as any;
  } else {
    baseExpression = [
      "case",
      ["==", ["get", "id"], selectedRouteId],
      ["case", isTeleferico, 16, 13],
      0
    ] as any;
  }

  if (hoveredRouteId !== null) {
    const hoveredWidth = selectedRouteId !== null && hoveredRouteId === selectedRouteId ? 13 : 11;
    return ["case", ["==", ["get", "id"], hoveredRouteId], hoveredWidth, baseExpression] as any;
  }

  return baseExpression;
}

function glowBlurExpression(
  selectedRouteId: number | null,
  suggestedRouteIds: number[],
  bestSuggestedRouteId: number | null,
  selectedSegmentActive: boolean,
  hoveredRouteId: number | null,
  allRoutesMode: RoutesMapMode,
  transferRouteIds: number[]
) {
  if (transferRouteIds.length > 0) {
    return 0 as any;
  }

  if (selectedRouteId === null && selectedSegmentActive) {
    return 0 as any;
  }

  const suggestedExpression = ["in", ["get", "id"], ["literal", suggestedRouteIds.length > 0 ? suggestedRouteIds : [-1]]] as any;
  const isTeleferico = telefericoRouteExpression();

  let baseExpression: any;

  if (selectedRouteId === null) {
    if (suggestedRouteIds.length === 0) {
      baseExpression = allRoutesMode === "all-highlighted" ? 2.2 : 1.8;
    } else if (bestSuggestedRouteId !== null) {
      baseExpression = ["case", ["==", ["get", "id"], bestSuggestedRouteId], 3.2, suggestedExpression, 2.4, 2] as any;
    } else {
      baseExpression = ["case", suggestedExpression, 2.4, 2] as any;
    }
  } else if (selectedSegmentActive) {
    baseExpression = [
      "case",
      ["==", ["get", "id"], selectedRouteId],
      ["case", isTeleferico, 4.2, 3.2],
      0
    ] as any;
  } else {
    baseExpression = [
      "case",
      ["==", ["get", "id"], selectedRouteId],
      ["case", isTeleferico, 4.2, 3.2],
      0
    ] as any;
  }

  if (hoveredRouteId !== null) {
    const hoveredBlur = selectedRouteId !== null && hoveredRouteId === selectedRouteId ? 3.2 : 2.8;
    return ["case", ["==", ["get", "id"], hoveredRouteId], hoveredBlur, baseExpression] as any;
  }

  return baseExpression;
}

function addRouteLayers(
  map: mapboxgl.Map,
  data: ReturnType<typeof toFeatureCollection>,
  selectedRouteId: number | null,
  suggestedRouteIds: number[],
  bestSuggestedRouteId: number | null,
  selectedSegmentActive: boolean,
  allRoutesMode: RoutesMapMode,
  hoveredRouteId: number | null,
  transferRouteIds: number[] = []
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
        "line-color": glowColorExpression(selectedRouteId),
        "line-width": glowWidthExpression(
          selectedRouteId,
          suggestedRouteIds,
          bestSuggestedRouteId,
          selectedSegmentActive,
          hoveredRouteId,
          allRoutesMode,
          transferRouteIds
        ),
        "line-blur": glowBlurExpression(
          selectedRouteId,
          suggestedRouteIds,
          bestSuggestedRouteId,
          selectedSegmentActive,
          hoveredRouteId,
          allRoutesMode,
          transferRouteIds
        ),
        "line-opacity": glowOpacityExpression(
          selectedRouteId,
          suggestedRouteIds,
          bestSuggestedRouteId,
          selectedSegmentActive,
          hoveredRouteId,
          allRoutesMode,
          transferRouteIds
        ),
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
        "line-dasharray": lineDashArrayExpression(),
        "line-width": lineWidthExpression(
          selectedRouteId,
          suggestedRouteIds,
          bestSuggestedRouteId,
          selectedSegmentActive,
          hoveredRouteId,
          allRoutesMode,
          transferRouteIds
        ),
        "line-opacity": lineOpacityExpression(
          selectedRouteId,
          suggestedRouteIds,
          bestSuggestedRouteId,
          selectedSegmentActive,
          hoveredRouteId,
          allRoutesMode,
          transferRouteIds
        ),
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
  selectedSegmentActive: boolean,
  allRoutesMode: RoutesMapMode,
  hoveredRouteId: number | null,
  transferRouteIds: number[] = [],
  debugActive = false
) {
  if (!map.getLayer(LAYER_LINE_ID) || !map.getLayer(LAYER_GLOW_ID)) {
    return;
  }

  map.setPaintProperty(
    LAYER_LINE_ID,
    "line-opacity",
    lineOpacityExpression(
      selectedRouteId,
      suggestedRouteIds,
      bestSuggestedRouteId,
      selectedSegmentActive,
      hoveredRouteId,
      allRoutesMode,
      transferRouteIds,
      debugActive
    )
  );
  map.setPaintProperty(
    LAYER_LINE_ID,
    "line-width",
    lineWidthExpression(
      selectedRouteId,
      suggestedRouteIds,
      bestSuggestedRouteId,
      selectedSegmentActive,
      hoveredRouteId,
      allRoutesMode,
      transferRouteIds
    )
  );
  map.setPaintProperty(LAYER_LINE_ID, "line-dasharray", lineDashArrayExpression());
  map.setPaintProperty(LAYER_GLOW_ID, "line-color", glowColorExpression(selectedRouteId));
  map.setPaintProperty(
    LAYER_GLOW_ID,
    "line-opacity",
    glowOpacityExpression(
      selectedRouteId,
      suggestedRouteIds,
      bestSuggestedRouteId,
      selectedSegmentActive,
      hoveredRouteId,
      allRoutesMode,
      transferRouteIds
    )
  );
  map.setPaintProperty(
    LAYER_GLOW_ID,
    "line-width",
    glowWidthExpression(
      selectedRouteId,
      suggestedRouteIds,
      bestSuggestedRouteId,
      selectedSegmentActive,
      hoveredRouteId,
      allRoutesMode,
      transferRouteIds
    )
  );
  map.setPaintProperty(
    LAYER_GLOW_ID,
    "line-blur",
    glowBlurExpression(
      selectedRouteId,
      suggestedRouteIds,
      bestSuggestedRouteId,
      selectedSegmentActive,
      hoveredRouteId,
      allRoutesMode,
      transferRouteIds
    )
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
  void selectedRouteId;
  return Array.isArray(selectedRouteSegment) && selectedRouteSegment.length > 1;
}

function shouldAnimateRouteDraw() {
  if (typeof window === "undefined") {
    return false;
  }

  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return !coarsePointer && !reducedMotion;
}

function buildArrowsGeoJSON(segments: ArrowSegment[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: segments.map((seg) => ({
      type: "Feature",
      properties: { color: seg.color, showLine: seg.showLine ? 1 : 0 },
      geometry: { type: "LineString", coordinates: seg.coords }
    }))
  };
}

function renderDebugPointLayer(map: mapboxgl.Map, coordinates: Coordinates[], step: number) {
  const geojson = buildDebugPointsGeoJSON(coordinates, step);
  const source = map.getSource(DEBUG_POINTS_SOURCE) as mapboxgl.GeoJSONSource | undefined;
  if (source) {
    source.setData(geojson);
  } else {
    map.addSource(DEBUG_POINTS_SOURCE, { type: "geojson", data: geojson });
  }
  if (!map.getLayer(DEBUG_POINTS_CIRCLE)) {
    map.addLayer({
      id: DEBUG_POINTS_CIRCLE,
      type: "circle",
      source: DEBUG_POINTS_SOURCE,
      paint: {
        "circle-radius": 5,
        "circle-color": "#f59e0b",
        "circle-stroke-color": "#1a1a1a",
        "circle-stroke-width": 1.5,
        "circle-opacity": 0.9
      }
    });
  }
  if (!map.getLayer(DEBUG_POINTS_LABEL)) {
    map.addLayer({
      id: DEBUG_POINTS_LABEL,
      type: "symbol",
      source: DEBUG_POINTS_SOURCE,
      layout: {
        "text-field": ["get", "label"],
        "text-size": 10,
        "text-offset": [0, -1.2],
        "text-anchor": "bottom",
        "text-allow-overlap": true,
        "text-ignore-placement": true
      },
      paint: {
        "text-color": "#f59e0b",
        "text-halo-color": "#000",
        "text-halo-width": 1.5
      }
    });
  }
}

function clearDebugPointLayers(map: mapboxgl.Map) {
  for (const layer of [DEBUG_POINTS_CIRCLE, DEBUG_POINTS_LABEL]) {
    if (map.getLayer(layer)) map.removeLayer(layer);
  }
  if (map.getSource(DEBUG_POINTS_SOURCE)) map.removeSource(DEBUG_POINTS_SOURCE);
}

function renderDebugSegment(map: mapboxgl.Map, coordinates: Coordinates[], startIdx: number, endIdx: number) {
  const s = Math.min(startIdx, endIdx);
  const e = Math.max(startIdx, endIdx);
  const geojson: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { start: s, end: e },
      geometry: { type: "LineString", coordinates: coordinates.slice(s, e + 1) }
    }]
  };
  const source = map.getSource(DEBUG_SEGMENT_SOURCE) as mapboxgl.GeoJSONSource | undefined;
  if (source) {
    source.setData(geojson);
  } else {
    map.addSource(DEBUG_SEGMENT_SOURCE, { type: "geojson", data: geojson });
  }
  if (!map.getLayer(DEBUG_SEGMENT_LINE)) {
    map.addLayer({
      id: DEBUG_SEGMENT_LINE,
      type: "line",
      source: DEBUG_SEGMENT_SOURCE,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#ef4444", "line-width": 6, "line-opacity": 0.95 }
    });
  }
}

function clearDebugSegmentLayer(map: mapboxgl.Map) {
  if (map.getLayer(DEBUG_SEGMENT_LINE)) map.removeLayer(DEBUG_SEGMENT_LINE);
  if (map.getSource(DEBUG_SEGMENT_SOURCE)) map.removeSource(DEBUG_SEGMENT_SOURCE);
}

function updateDrawLayer(map: mapboxgl.Map, segment: Coordinates[]) {
  const geojson: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: segment }
    }]
  };
  const source = map.getSource(DEBUG_DRAW_SOURCE) as mapboxgl.GeoJSONSource | undefined;
  if (source) {
    source.setData(geojson);
  } else {
    map.addSource(DEBUG_DRAW_SOURCE, { type: "geojson", data: geojson });
  }
  if (!map.getLayer(DEBUG_DRAW_LINE)) {
    map.addLayer({
      id: DEBUG_DRAW_LINE,
      type: "line",
      source: DEBUG_DRAW_SOURCE,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#22c55e", "line-width": 5, "line-opacity": 0.95 }
    });
  }
}

function clearDrawLayer(map: mapboxgl.Map) {
  if (map.getLayer(DEBUG_DRAW_LINE)) map.removeLayer(DEBUG_DRAW_LINE);
  if (map.getSource(DEBUG_DRAW_SOURCE)) map.removeSource(DEBUG_DRAW_SOURCE);
}

function clearAllDebugLayers(map: mapboxgl.Map) {
  clearDebugPointLayers(map);
  clearDebugSegmentLayer(map);
  clearDrawLayer(map);
}

function MapComponent({
  routes,
  selectedRouteId,
  suggestedRouteIds,
  allRoutesMode = "all-visible",
  bestSuggestedRouteId,
  selectedRouteSegment,
  arrowSegments = [],
  originPoint,
  destinationPoint,
  showTeleferico = false,
  selectedTransfer = null,
  awaitingPick = null,
  onMapPick,
  onSelectRoute,
  onNearbyRoutesFound
}: MapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const routesRef = useRef(routes);
  const selectedRouteIdRef = useRef(selectedRouteId);
  const suggestedRouteIdsRef = useRef(suggestedRouteIds);
  const bestSuggestedRouteIdRef = useRef(bestSuggestedRouteId);
  const selectedRouteSegmentRef = useRef(selectedRouteSegment);
  const allRoutesModeRef = useRef<RoutesMapMode>(allRoutesMode);
  const hoveredRouteIdRef = useRef<number | null>(null);
  const routeFeaturesRef = useRef<GeoJSON.FeatureCollection<GeoJSON.LineString> | null>(null);
  const isMapReadyRef = useRef(false);
  const onSelectRouteRef = useRef(onSelectRoute);
  const onMapPickRef = useRef(onMapPick);
  const animationFrameRef = useRef<number | null>(null);
  const animationTokenRef = useRef(0);
  const originMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const onNearbyRoutesFoundRef = useRef(onNearbyRoutesFound);
  const showTelefericoRef = useRef(showTeleferico);
  const telefericoGeoJSONRef = useRef<any>(null);
  const arrowSegmentsRef = useRef(arrowSegments);
  const selectedTransferRef = useRef(selectedTransfer);
  const transferRouteIdsRef = useRef<number[]>(
    selectedTransfer ? [selectedTransfer.routeAId, selectedTransfer.routeBId] : []
  );
  const debugCoordsRef = useRef<Coordinates[]>([]);
  const debugStartIdxRef = useRef<number | null>(null);
  const debugStepRef = useRef(10);
  const debugPhaseRef = useRef<"idle" | "awaiting-end" | "drawing" | "preview">("idle");
  const debugDrawSegmentRef = useRef<Coordinates[]>([]);
  const debugLoadedRouteIdRef = useRef<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [debugActive] = useState(isDebugMode);
  const [debugStep, setDebugStep] = useState(10);
  const [debugClickInfo, setDebugClickInfo] = useState<string | null>(null);
  const [debugSelection, setDebugSelection] = useState<[number, number] | null>(null);
  const [debugPhase, setDebugPhase] = useState<"idle" | "awaiting-end" | "drawing" | "preview">("idle");
  const [debugTotalPoints, setDebugTotalPoints] = useState(0);
  const [debugDrawCount, setDebugDrawCount] = useState(0);
  const [debugSaveStatus, setDebugSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [debugSaveError, setDebugSaveError] = useState<string | null>(null);
  const [debugDir, setDebugDir] = useState<"ida" | "vuelta">("ida");

  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const routeFeatures = useMemo(() => toFeatureCollection(routes), [routes]);
  if (routeFeaturesRef.current === null) {
    routeFeaturesRef.current = routeFeatures;
  }

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
    allRoutesModeRef.current = allRoutesMode;
  }, [allRoutesMode]);

  useEffect(() => {
    routeFeaturesRef.current = routeFeatures;
  }, [routeFeatures]);

  useEffect(() => {
    onMapPickRef.current = onMapPick;
  }, [onMapPick]);

  useEffect(() => {
    onNearbyRoutesFoundRef.current = onNearbyRoutesFound;
  }, [onNearbyRoutesFound]);

  useEffect(() => {
    showTelefericoRef.current = showTeleferico;
  }, [showTeleferico]);

  useEffect(() => {
    arrowSegmentsRef.current = arrowSegments;
  }, [arrowSegments]);

  useEffect(() => {
    debugStepRef.current = debugStep;
  }, [debugStep]);

  useEffect(() => {
    debugPhaseRef.current = debugPhase;
  }, [debugPhase]);

  // Update direction arrows whenever arrowSegments changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Wait for map to be ready; if not yet, the onLoad callback will call ensureRouteLayers
    // which sets up the source — but arrows are added separately so we just queue via setTimeout
    if (!isMapReadyRef.current) return;

    const geojson = buildArrowsGeoJSON(arrowSegments);
    const source = map.getSource(ARROWS_SOURCE) as mapboxgl.GeoJSONSource | undefined;

    if (source) {
      source.setData(geojson);
    } else {
      map.addSource(ARROWS_SOURCE, { type: "geojson", data: geojson });
    }

    if (!map.getLayer(ARROWS_LINE_LAYER)) {
      map.addLayer({
        id: ARROWS_LINE_LAYER,
        type: "line",
        source: ARROWS_SOURCE,
        filter: ["==", ["get", "showLine"], 1],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 5,
          "line-opacity": 0.92
        }
      });
    }

    if (!map.getLayer(ARROWS_LAYER)) {
      map.addLayer({
        id: ARROWS_LAYER,
        type: "symbol",
        source: ARROWS_SOURCE,
        layout: {
          "symbol-placement": "line",
          "symbol-spacing": 100,
          "symbol-avoid-edges": false,
          "text-field": "›",
          "text-size": 26,
          "text-keep-upright": false,
          "text-rotation-alignment": "map",
          "text-pitch-alignment": "map",
          "text-allow-overlap": true,
          "text-ignore-placement": true,
          "text-offset": [0, 0.05]
        },
        paint: {
          "text-color": "#ffffff",
          "text-opacity": 0.9,
          "text-halo-color": ["get", "color"],
          "text-halo-width": 1.5
        }
      });
    }
  }, [arrowSegments, isLoading]);

  // Toggle teleférico layer visibility + camera
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReadyRef.current) return;

    const lineVis = showTeleferico ? "visible" : "none";
    for (const layer of [TELEFERICO_GLOW_LAYER, TELEFERICO_LINE_LAYER]) {
      if (map.getLayer(layer)) map.setLayoutProperty(layer, "visibility", lineVis);
    }
    if (map.getLayer(TELEFERICO_STATIONS_LAYER)) {
      map.setLayoutProperty(TELEFERICO_STATIONS_LAYER, "visibility", "visible");
    }

    if (showTeleferico) {
      // Fly to encompass all stations: E6 (west) → E1 (east)
      map.fitBounds(
        [[-102.0769769, 19.396299], [-102.02093, 19.4306165]],
        { padding: { top: 100, right: 32, bottom: 180, left: 32 }, duration: 1200, maxZoom: 14 }
      );
    }
  }, [showTeleferico]);

  useEffect(() => {
    selectedTransferRef.current = selectedTransfer;
    transferRouteIdsRef.current = selectedTransfer
      ? [selectedTransfer.routeAId, selectedTransfer.routeBId]
      : [];
    const map = mapRef.current;
    if (!map || !isMapReadyRef.current) return;

    applyRouteLayerStyles(
      map,
      selectedRouteIdRef.current,
      suggestedRouteIdsRef.current,
      bestSuggestedRouteIdRef.current,
      isSegmentSelection(selectedRouteIdRef.current, selectedRouteSegmentRef.current),
      allRoutesModeRef.current,
      hoveredRouteIdRef.current,
      transferRouteIdsRef.current,
      debugActive
    );

    const clearTransferLayers = () => {
      for (const layer of [TRANSFER_SEG_A_LAYER, TRANSFER_SEG_B_LAYER, TRANSFER_WALK_LAYER, TRANSFER_PIN_LAYER]) {
        if (map.getLayer(layer)) map.removeLayer(layer);
      }
      if (map.getSource(TRANSFER_SOURCE)) map.removeSource(TRANSFER_SOURCE);
    };

    clearTransferLayers();

    if (!selectedTransfer) return;

    // Walk segment: from route A transfer point to route B boarding point
    const walkCoords: number[][] = [
      selectedTransfer.transferPoint as number[],
      selectedTransfer.segmentB[0] as number[]
    ];

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { type: "segA" },
          geometry: { type: "LineString", coordinates: selectedTransfer.segmentA as number[][] }
        },
        {
          type: "Feature",
          properties: { type: "segB" },
          geometry: { type: "LineString", coordinates: selectedTransfer.segmentB as number[][] }
        },
        {
          type: "Feature",
          properties: { type: "walk", walkMeters: selectedTransfer.walkMeters },
          geometry: { type: "LineString", coordinates: walkCoords }
        },
        {
          type: "Feature",
          properties: { type: "pin" },
          geometry: { type: "Point", coordinates: selectedTransfer.transferPoint as number[] }
        }
      ]
    };

    map.addSource(TRANSFER_SOURCE, { type: "geojson", data: geojson });

    map.addLayer({
      id: TRANSFER_SEG_A_LAYER,
      type: "line",
      source: TRANSFER_SOURCE,
      filter: ["==", ["get", "type"], "segA"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#60a5fa", "line-width": 5, "line-opacity": 0.95 }
    });

    map.addLayer({
      id: TRANSFER_SEG_B_LAYER,
      type: "line",
      source: TRANSFER_SOURCE,
      filter: ["==", ["get", "type"], "segB"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#34d399", "line-width": 5, "line-opacity": 0.95 }
    });

    map.addLayer({
      id: TRANSFER_WALK_LAYER,
      type: "line",
      source: TRANSFER_SOURCE,
      filter: ["==", ["get", "type"], "walk"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#ffffff",
        "line-width": 2.5,
        "line-opacity": 0.7,
        "line-dasharray": [2, 2.5]
      }
    });

    map.addLayer({
      id: TRANSFER_PIN_LAYER,
      type: "circle",
      source: TRANSFER_SOURCE,
      filter: ["==", ["get", "type"], "pin"],
      paint: {
        "circle-radius": 9,
        "circle-color": "#f59e0b",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2.5
      }
    });

    const allCoords = [...selectedTransfer.segmentA, ...selectedTransfer.segmentB];
    const bounds = getBoundsFromCoordinates(allCoords);
    if (bounds) {
      fitBoundsAnimated(map, bounds, { top: 120, right: 32, bottom: 160, left: 32, duration: 1200, maxZoom: 15 });
    }
  }, [debugActive, isLoading, selectedTransfer]);

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

    const getThemeIsDark = () => document.documentElement.getAttribute("data-theme") !== "light";
    const isDarkMode = getThemeIsDark();

    mapboxgl.accessToken = mapToken;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: getMapStyle(isDarkMode),
      center: URUAPAN_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
      antialias: true
    });


    const onRouteClick = (event: mapboxgl.MapLayerMouseEvent) => {
      // In debug mode with a route already loaded, block map-click switching to prevent
      // accidentally losing applied (unsaved) edits. Use the route list panel to switch.
      if (debugActive && debugLoadedRouteIdRef.current !== null) {
        return;
      }

      const feature = event.features?.[0];
      const routeId = Number(feature?.properties?.id);

      if (!Number.isNaN(routeId)) {
        onSelectRouteRef.current(routeId);
      }
    };

    const setHoveredRoute = (routeId: number | null) => {
      if (hoveredRouteIdRef.current === routeId) {
        return;
      }

      hoveredRouteIdRef.current = routeId;
      applyRouteLayerStyles(
        map,
        selectedRouteIdRef.current,
        suggestedRouteIdsRef.current,
        bestSuggestedRouteIdRef.current,
        isSegmentSelection(selectedRouteIdRef.current, selectedRouteSegmentRef.current),
        allRoutesModeRef.current,
        hoveredRouteIdRef.current,
        transferRouteIdsRef.current,
        debugActive
      );
    };

    const onRouteEnter = (event: mapboxgl.MapLayerMouseEvent) => {
      map.getCanvas().style.cursor = "pointer";

      const routeId = Number(event.features?.[0]?.properties?.id);
      if (!Number.isNaN(routeId)) {
        setHoveredRoute(routeId);
      }
    };

    const onRouteMove = (event: mapboxgl.MapLayerMouseEvent) => {
      const routeId = Number(event.features?.[0]?.properties?.id);
      if (!Number.isNaN(routeId)) {
        setHoveredRoute(routeId);
      }
    };

    const onRouteLeave = () => {
      map.getCanvas().style.cursor = "";
      setHoveredRoute(null);
    };

    const onMapClick = (event: mapboxgl.MapMouseEvent) => {
      if (debugActive && debugPhaseRef.current === "drawing") {
        const pt: Coordinates = [event.lngLat.lng, event.lngLat.lat];
        debugDrawSegmentRef.current = [...debugDrawSegmentRef.current, pt];
        setDebugDrawCount(debugDrawSegmentRef.current.length);
        if (debugDrawSegmentRef.current.length >= 2) {
          updateDrawLayer(map, debugDrawSegmentRef.current);
        }
        return;
      }

      if (debugActive && debugCoordsRef.current.length > 0) {
        const lngLat: [number, number] = [event.lngLat.lng, event.lngLat.lat];
        const result = getClosestPoint(lngLat, debugCoordsRef.current);
        if (!result) return;

        if (debugStartIdxRef.current === null) {
          debugStartIdxRef.current = result.index;
          setDebugClickInfo(
            `#${result.index}  [${result.coord[0].toFixed(5)}, ${result.coord[1].toFixed(5)}]  ${Math.round(result.distanceM)} m`
          );
          setDebugPhase("awaiting-end");
          setDebugSelection(null);
          clearDebugSegmentLayer(map);
        } else {
          const startIdx = debugStartIdxRef.current;
          const endIdx = result.index;
          debugStartIdxRef.current = null;
          setDebugPhase("idle");
          if (startIdx === endIdx) {
            setDebugClickInfo(null);
            setDebugSelection(null);
            return;
          }
          renderDebugSegment(map, debugCoordsRef.current, startIdx, endIdx);
          const s = Math.min(startIdx, endIdx);
          const e = Math.max(startIdx, endIdx);
          setDebugSelection([s, e]);
          setDebugClickInfo(`Segmento ${s}→${e}  (${e - s + 1} puntos)`);
        }
        return;
      }

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
      map.off("mousemove", LAYER_HIT_ID, onRouteMove);
      map.off("mouseleave", LAYER_HIT_ID, onRouteLeave);

      map.on("click", LAYER_HIT_ID, onRouteClick);
      map.on("mouseenter", LAYER_HIT_ID, onRouteEnter);
      map.on("mousemove", LAYER_HIT_ID, onRouteMove);
      map.on("mouseleave", LAYER_HIT_ID, onRouteLeave);
    };

    const ensureRouteLayers = () => {
      addRouteLayers(
        map,
        routeFeaturesRef.current ?? routeFeatures,
        selectedRouteIdRef.current,
        suggestedRouteIdsRef.current,
        bestSuggestedRouteIdRef.current,
        isSegmentSelection(selectedRouteIdRef.current, selectedRouteSegmentRef.current),
        allRoutesModeRef.current,
        hoveredRouteIdRef.current,
        transferRouteIdsRef.current
      );
      applyRouteLayerStyles(
        map,
        selectedRouteIdRef.current,
        suggestedRouteIdsRef.current,
        bestSuggestedRouteIdRef.current,
        isSegmentSelection(selectedRouteIdRef.current, selectedRouteSegmentRef.current),
        allRoutesModeRef.current,
        hoveredRouteIdRef.current,
        transferRouteIdsRef.current,
        debugActive
      );
      bindRouteInteraction();
    };

    const addTelefericoLayers = (geojson: GeoJSON.FeatureCollection) => {
      if (!map.getSource(TELEFERICO_SOURCE)) {
        map.addSource(TELEFERICO_SOURCE, { type: "geojson", data: geojson });
      }

      // Glow layer
      if (!map.getLayer(TELEFERICO_GLOW_LAYER)) {
        map.addLayer(
          {
            id: TELEFERICO_GLOW_LAYER,
            type: "line",
            source: TELEFERICO_SOURCE,
            filter: ["==", ["geometry-type"], "LineString"],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": TELEFERICO_COLOR,
              "line-width": 10,
              "line-blur": 6,
              "line-opacity": 0.35,
            },
          },
          LAYER_GLOW_ID
        );
      }

      // Dashed line layer
      if (!map.getLayer(TELEFERICO_LINE_LAYER)) {
        map.addLayer(
          {
            id: TELEFERICO_LINE_LAYER,
            type: "line",
            source: TELEFERICO_SOURCE,
            filter: ["==", ["geometry-type"], "LineString"],
            layout: { "line-cap": "butt", "line-join": "round" },
            paint: {
              "line-color": TELEFERICO_COLOR,
              "line-width": 3.5,
              "line-dasharray": [2, 2.5],
              "line-opacity": 0.95,
            },
          },
          LAYER_GLOW_ID
        );
      }

      // Station circles
      if (!map.getLayer(TELEFERICO_STATIONS_LAYER)) {
        map.addLayer({
          id: TELEFERICO_STATIONS_LAYER,
          type: "circle",
          source: TELEFERICO_SOURCE,
          filter: ["==", ["geometry-type"], "Point"],
          paint: {
            "circle-radius": 7,
            "circle-color": TELEFERICO_COLOR,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2.5,
          },
        });
      }

      // Sync visibility
      const lineVis = showTelefericoRef.current ? "visible" : "none";
      for (const layer of [TELEFERICO_GLOW_LAYER, TELEFERICO_LINE_LAYER]) {
        if (map.getLayer(layer)) map.setLayoutProperty(layer, "visibility", lineVis);
      }
      if (map.getLayer(TELEFERICO_STATIONS_LAYER)) {
        map.setLayoutProperty(TELEFERICO_STATIONS_LAYER, "visibility", lineVis);
      }
    };

    const onLoad = async () => {
      if (!getThemeIsDark()) {
        applyComfortLightMapPalette(map);
      }
      ensureRouteLayers();

      // Load teleférico GeoJSON
      try {
        const res = await fetch("/teleferico.geojson");
        if (res.ok) {
          const geojson = await res.json();
          telefericoGeoJSONRef.current = geojson;
          addTelefericoLayers(geojson);
        }
      } catch {
        // non-fatal — teleférico layer is optional
      }

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

    let lastThemeIsDark = getThemeIsDark();
    const themeObserver = new MutationObserver(() => {
      const nowDark = getThemeIsDark();
      if (nowDark === lastThemeIsDark) return;
      lastThemeIsDark = nowDark;
      const nextStyle = getMapStyle(nowDark);
      map.setStyle(nextStyle);
      map.once("style.load", () => {
        if (!nowDark) {
          applyComfortLightMapPalette(map);
        }
        ensureRouteLayers();
        if (telefericoGeoJSONRef.current) {
          addTelefericoLayers(telefericoGeoJSONRef.current);
        }
        if (selectedTransferRef.current) {
          const t = selectedTransferRef.current;
          selectedTransferRef.current = null;
          setTimeout(() => { selectedTransferRef.current = t; }, 0);
        }
        // Restore arrow layer after style reload
        const arrowGeojson = buildArrowsGeoJSON(arrowSegmentsRef.current);
        if (!map.getSource(ARROWS_SOURCE)) {
          map.addSource(ARROWS_SOURCE, { type: "geojson", data: arrowGeojson });
        }
        if (!map.getLayer(ARROWS_LINE_LAYER)) {
          map.addLayer({
            id: ARROWS_LINE_LAYER,
            type: "line",
            source: ARROWS_SOURCE,
            filter: ["==", ["get", "showLine"], 1],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": ["get", "color"], "line-width": 5, "line-opacity": 0.92 }
          });
        }
        if (!map.getLayer(ARROWS_LAYER)) {
          map.addLayer({
            id: ARROWS_LAYER,
            type: "symbol",
            source: ARROWS_SOURCE,
            layout: {
              "symbol-placement": "line",
              "symbol-spacing": 80,
              "symbol-avoid-edges": false,
              "text-field": "▶",
              "text-size": 22,
              "text-keep-upright": false,
              "text-rotation-alignment": "map",
              "text-pitch-alignment": "map",
              "text-allow-overlap": true,
              "text-ignore-placement": true,
              "text-offset": [0, 0]
            },
            paint: {
              "text-color": "#ffffff",
              "text-opacity": 1,
              "text-halo-color": ["get", "color"],
              "text-halo-width": 2.5
            }
          });
        }
        if (debugActive && debugCoordsRef.current.length > 0) {
          renderDebugPointLayer(map, debugCoordsRef.current, debugStepRef.current);
        }
      });
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    map.on("load", onLoad);
    map.on("click", onMapClick);

    mapRef.current = map;

    return () => {
      stopRouteAnimation();
      originMarkerRef.current?.remove();
      destinationMarkerRef.current?.remove();
      originMarkerRef.current = null;
      destinationMarkerRef.current = null;
      themeObserver.disconnect();
      map.off("load", onLoad);
      map.off("click", onMapClick);
      if (map.getLayer(LAYER_HIT_ID)) {
        map.off("click", LAYER_HIT_ID, onRouteClick);
        map.off("mouseenter", LAYER_HIT_ID, onRouteEnter);
        map.off("mousemove", LAYER_HIT_ID, onRouteMove);
        map.off("mouseleave", LAYER_HIT_ID, onRouteLeave);
      }
      clearAllDebugLayers(map);
      map.remove();
      isMapReadyRef.current = false;
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const element = createEndpointMarkerElement(color, label);
        markerRef.current = new mapboxgl.Marker({ element, anchor: "bottom", offset: [0, -2] });
      }

      markerRef.current.setLngLat(point).addTo(map);
    };

    const segmentStart = selectedRouteSegment?.[0] ?? null;
    const segmentEnd = selectedRouteSegment ? selectedRouteSegment[selectedRouteSegment.length - 1] ?? null : null;

    const effectiveOrigin = originPoint ?? segmentStart;
    const effectiveDestination = destinationPoint ?? segmentEnd;

    updateMarker(originMarkerRef, effectiveOrigin, "#16a34a", "A");
    updateMarker(destinationMarkerRef, effectiveDestination, "#dc2626", "B");

    // Asegurar que los pines marcados queden visibles en el viewport.
    // No interrumpir si hay una ruta seleccionada (ese effect maneja su propia cámara).
    if (selectedRouteIdRef.current === null) {
      if (effectiveOrigin && effectiveDestination) {
        const bounds = getBoundsFromCoordinates([effectiveOrigin, effectiveDestination]);
        if (bounds) {
          fitBoundsAnimated(map, bounds, {
            top: 220,
            right: 48,
            bottom: 200,
            left: 48,
            duration: 700,
            maxZoom: 15
          });
        }
      } else if (effectiveOrigin || effectiveDestination) {
        const target = (effectiveOrigin ?? effectiveDestination) as [number, number];
        const currentZoom = map.getZoom();
        map.easeTo({
          center: target,
          zoom: Math.max(currentZoom, 14),
          duration: 600,
          padding: { top: 220, right: 32, bottom: 200, left: 32 },
          essential: true
        });
      }
    }
  }, [destinationPoint, isLoading, originPoint, selectedRouteSegment]);

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
      selectedSegmentActive,
      allRoutesModeRef.current,
      hoveredRouteIdRef.current,
      transferRouteIdsRef.current,
      debugActive
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

        // Skip draw animation when arrow segments are providing the visual lines (ida+vuelta mode)
        const hasArrowLines = arrowSegmentsRef.current.some((s) => s.showLine);

        if (!hasArrowLines && featureIndex !== -1 && selectedCoordinates.length > SHORT_ROUTE_THRESHOLD && shouldAnimateRouteDraw()) {
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
  }, [debugActive, routeFeatures, routes, selectedRouteId, selectedRouteSegment, stopRouteAnimation]);

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
      isSegmentSelection(selectedRouteId, selectedRouteSegment),
      allRoutesMode,
      hoveredRouteIdRef.current,
      transferRouteIdsRef.current,
      debugActive
    );
  }, [allRoutesMode, bestSuggestedRouteId, debugActive, selectedRouteId, selectedRouteSegment, suggestedRouteIds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const canvas = map.getCanvas();
    if (awaitingPick) {
      canvas.classList.add("map-awaiting-pick");
    } else {
      canvas.classList.remove("map-awaiting-pick");
    }
  }, [awaitingPick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !debugActive) return;
    map.getCanvas().style.cursor = debugPhase === "drawing" ? "crosshair" : "";
  }, [debugActive, debugPhase]);

  useEffect(() => {
    if (!debugActive) return;
    const map = mapRef.current;
    if (!map || !isMapReadyRef.current) return;

    if (selectedRouteId === null) {
      clearAllDebugLayers(map);
      debugCoordsRef.current = [];
      debugLoadedRouteIdRef.current = null;
      debugStartIdxRef.current = null;
      setDebugClickInfo(null);
      setDebugSelection(null);
      setDebugPhase("idle");
      setDebugTotalPoints(0);
      return;
    }

    const route = routes.find((r) => r.id === selectedRouteId);
    if (!route) return;

    const resolvedCoords: Coordinates[] = route.coordenadas;

    const cacheKey = `${selectedRouteId}-${debugDir}`;
    const routeChanged = debugLoadedRouteIdRef.current !== cacheKey;
    if (routeChanged) {
      // Switched route or direction — reset all edit state and load fresh coords
      debugLoadedRouteIdRef.current = cacheKey;
      debugCoordsRef.current = resolvedCoords;
      debugStartIdxRef.current = null;
      setDebugClickInfo(null);
      setDebugSelection(null);
      setDebugPhase("idle");
      debugPhaseRef.current = "idle";
      setDebugSaveStatus("idle");
      setDebugSaveError(null);
      clearDebugSegmentLayer(map);
    } else if (debugCoordsRef.current.length === 0) {
      debugCoordsRef.current = resolvedCoords;
    }

    setDebugTotalPoints(debugCoordsRef.current.length);
    renderDebugPointLayer(map, debugCoordsRef.current, debugStep);
  }, [debugActive, debugDir, debugStep, isLoading, routes, selectedRouteId]);

  const handleLocateMe = () => {
    const map = mapRef.current;
    if (!map || !navigator.geolocation) {
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const userLng = coords.longitude;
        const userLat = coords.latitude;
        const accuracyM = coords.accuracy; // metres

        setLocationAccuracy(accuracyM);

        // ── Fly to user position ──────────────────────────────────────────
        map.flyTo({
          center: [userLng, userLat],
          zoom: 15.5,
          duration: 1200,
          essential: true
        });

        // ── Draw blue dot + accuracy circle as GeoJSON layers ────────────
        const pointGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Point> = {
          type: "FeatureCollection",
          features: [{
            type: "Feature",
            properties: { accuracy: accuracyM },
            geometry: { type: "Point", coordinates: [userLng, userLat] }
          }]
        };

        if (map.getSource(USER_LOC_SOURCE)) {
          (map.getSource(USER_LOC_SOURCE) as mapboxgl.GeoJSONSource).setData(pointGeoJSON);
        } else {
          map.addSource(USER_LOC_SOURCE, { type: "geojson", data: pointGeoJSON });

          // Accuracy circle — radius in pixels approximated via circle-radius
          // We use a fixed pixel radius and note it's approximate at zoom 15.5
          // For a proper meter-based circle, Turf or a polygon would be needed;
          // this gives a clear visual cue without a dependency.
          map.addLayer({
            id: USER_LOC_ACCURACY_LAYER,
            type: "circle",
            source: USER_LOC_SOURCE,
            paint: {
              "circle-radius": [
                "interpolate", ["linear"], ["zoom"],
                10, 4,
                15, ["max", 12, ["*", 0.08, ["get", "accuracy"]]],
                18, ["max", 24, ["*", 0.5, ["get", "accuracy"]]]
              ],
              "circle-color": "#3b82f6",
              "circle-opacity": 0.15,
              "circle-stroke-color": "#3b82f6",
              "circle-stroke-width": 1,
              "circle-stroke-opacity": 0.4
            }
          }, LAYER_GLOW_ID); // insert below route layers

          // Blue dot
          map.addLayer({
            id: USER_LOC_DOT_LAYER,
            type: "circle",
            source: USER_LOC_SOURCE,
            paint: {
              "circle-radius": 8,
              "circle-color": "#3b82f6",
              "circle-opacity": 1,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2.5
            }
          });
        }

        // ── Haversine proximity search (400 m threshold) ──────────────────
        const NEARBY_METERS = 400;
        const toRad = (v: number) => (v * Math.PI) / 180;

        const haversine = (lng1: number, lat1: number, lng2: number, lat2: number) => {
          const dLat = toRad(lat2 - lat1);
          const dLng = toRad(lng2 - lng1);
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
          return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };

        const nearbyRoutes: { id: number; minDist: number }[] = [];

        for (const route of routesRef.current) {
          let minDist = Infinity;
          for (const [lng, lat] of route.coordenadas) {
            const d = haversine(userLng, userLat, lng, lat);
            if (d < minDist) minDist = d;
            if (minDist === 0) break;
          }
          if (minDist <= NEARBY_METERS) {
            nearbyRoutes.push({ id: route.id, minDist });
          }
        }

        nearbyRoutes.sort((a, b) => a.minDist - b.minDist);
        const nearbyIds = nearbyRoutes.map((r) => r.id);

        onNearbyRoutesFoundRef.current(nearbyIds);
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
    <section className="map-routes-fade-in relative h-full w-full">
      {/* role="application" permite a lectores de pantalla navegar el mapa como widget interactivo */}
      <div
        ref={containerRef}
        className="h-full w-full"
        role="application"
        aria-label="Mapa interactivo de rutas de transporte de Uruapan. Toca para marcar puntos de origen y destino."
      />

      {isLoading && (
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-slate-950/20 to-transparent" aria-hidden="true" />
      )}

      {/* Locate-me button + accuracy warning — top-right, debajo del NavigationControl */}
      <div className="absolute right-2.5 top-[10px] z-20 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locationLoading}
          className="ov-panel ov-border grid h-10 w-10 place-items-center rounded-xl border text-lima shadow-[0_4px_16px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:opacity-90 active:scale-95 disabled:opacity-60"
          aria-label="Ir a mi ubicación"
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

        {/* Accuracy chip — shown after a fix is received */}
        {locationAccuracy !== null && (
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-soft backdrop-blur-xl transition-all duration-300 ${
              locationAccuracy > 1200
                ? "border-amber-400/50 bg-amber-900/70 text-amber-200"
                : "border-emerald-400/40 bg-emerald-900/70 text-emerald-200"
            }`}
          >
            {locationAccuracy > 1200 ? (
              <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 shrink-0" aria-hidden="true">
                <path d="M12 8v4m0 4h.01M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
            )}
            {locationAccuracy > 1200
              ? `GPS impreciso ±${Math.round(locationAccuracy / 1000 * 10) / 10} km`
              : `±${Math.round(locationAccuracy)} m`
            }
          </div>
        )}
      </div>

      {debugActive && (
        <aside className="absolute bottom-20 left-2.5 z-20 w-64 rounded-xl border border-amber-500/40 bg-slate-950/90 p-3 text-xs text-white shadow-soft backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-bold text-amber-400">⬡ DEBUG</span>
            {debugTotalPoints > 0 && (
              <span className="text-slate-400">{debugTotalPoints} pts</span>
            )}
          </div>

          {selectedRouteId !== null && (
            <div className="mb-2 flex gap-1">
              {(["ida", "vuelta"] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => setDebugDir(dir)}
                  className={`flex-1 rounded px-2 py-0.5 text-xs font-semibold transition ${debugDir === dir ? "bg-amber-500 text-black" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
                >
                  {dir}
                </button>
              ))}
            </div>
          )}

          {selectedRouteId === null ? (
            <p className="text-slate-400">Selecciona una ruta para depurar</p>
          ) : debugPhase === "drawing" ? (
            /* ── Modo dibujo ── */
            <>
              <div className="mb-2 flex items-center gap-1.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                <span className="font-semibold text-green-400">Dibujando</span>
                <span className="ml-auto text-slate-400">{debugDrawCount} pts</span>
              </div>
              <p className="mb-2 text-slate-400">
                Click en el mapa para agregar puntos al nuevo tramo
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled={debugDrawCount === 0}
                  onClick={() => {
                    debugDrawSegmentRef.current = debugDrawSegmentRef.current.slice(0, -1);
                    setDebugDrawCount(debugDrawSegmentRef.current.length);
                    const map = mapRef.current;
                    if (!map) return;
                    if (debugDrawSegmentRef.current.length >= 2) {
                      updateDrawLayer(map, debugDrawSegmentRef.current);
                    } else {
                      clearDrawLayer(map);
                    }
                  }}
                  className="rounded bg-slate-700 px-2 py-1 transition hover:bg-slate-600 disabled:opacity-40"
                >
                  ↩ Deshacer
                </button>
                <button
                  type="button"
                  disabled={debugDrawCount < 2}
                  onClick={() => {
                    setDebugPhase("preview");
                    debugPhaseRef.current = "preview";
                  }}
                  className="rounded bg-green-700 px-2 py-1 transition hover:bg-green-600 disabled:opacity-40"
                >
                  Finalizar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const map = mapRef.current;
                    if (map) clearDrawLayer(map);
                    debugDrawSegmentRef.current = [];
                    setDebugDrawCount(0);
                    setDebugPhase("idle");
                    debugPhaseRef.current = "idle";
                  }}
                  className="rounded bg-slate-700 px-2 py-1 transition hover:bg-slate-600"
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : debugPhase === "preview" ? (
            /* ── Vista previa ── */
            <>
              <div className="mb-2 rounded bg-slate-800/80 px-2 py-1.5 leading-snug">
                <span className="text-red-400">Rojo</span>
                {" → "}
                <span className="text-green-400">Verde</span>
                {" (nuevo tramo)"}
              </div>
              <p className="mb-2 text-slate-400">
                Segmento original reemplazado por <span className="text-green-400">{debugDrawCount} puntos</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (!debugSelection) return;
                    const map = mapRef.current;
                    if (!map || selectedRouteId === null) return;
                    const [s, e] = debugSelection;
                    const newCoords = replaceSegment(debugCoordsRef.current, s, e, debugDrawSegmentRef.current);
                    debugCoordsRef.current = newCoords;
                    setDebugTotalPoints(newCoords.length);
                    const currentFeatures = routeFeaturesRef.current;
                    if (!currentFeatures) return;
                    const featureIndex = currentFeatures.features.findIndex(
                      (f) => Number((f.properties as { id?: number })?.id) === selectedRouteId
                    );
                    if (featureIndex !== -1) {
                      const updatedFeatures = currentFeatures.features.map((f, i) =>
                        i === featureIndex
                          ? { ...f, geometry: { type: "LineString" as const, coordinates: newCoords } }
                          : f
                      ) as GeoJSON.Feature<GeoJSON.LineString>[];
                      routeFeaturesRef.current = { type: "FeatureCollection", features: updatedFeatures };
                      (map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined)
                        ?.setData(routeFeaturesRef.current);
                    }
                    clearDrawLayer(map);
                    clearDebugSegmentLayer(map);
                    debugDrawSegmentRef.current = [];
                    debugStartIdxRef.current = null;
                    setDebugDrawCount(0);
                    setDebugSelection(null);
                    setDebugClickInfo(null);
                    setDebugPhase("idle");
                    debugPhaseRef.current = "idle";
                    renderDebugPointLayer(map, newCoords, debugStepRef.current);
                  }}
                  className="rounded bg-green-700 px-2 py-1 font-semibold transition hover:bg-green-600"
                >
                  ✓ Aplicar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDebugPhase("drawing");
                    debugPhaseRef.current = "drawing";
                  }}
                  className="rounded bg-slate-700 px-2 py-1 transition hover:bg-slate-600"
                >
                  ← Seguir dibujando
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const map = mapRef.current;
                    if (map) clearDrawLayer(map);
                    debugDrawSegmentRef.current = [];
                    setDebugDrawCount(0);
                    setDebugPhase("idle");
                    debugPhaseRef.current = "idle";
                  }}
                  className="rounded bg-slate-700 px-2 py-1 transition hover:bg-slate-600"
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            /* ── Modo selección (idle / awaiting-end) ── */
            <>
              <div className="mb-2 flex items-center gap-2">
                <label className="shrink-0 text-slate-400">Paso</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={debugStep}
                  onChange={(e) => setDebugStep(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                  className="w-14 rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-white"
                />
              </div>

              {debugClickInfo && (
                <div className="mb-2 rounded bg-slate-800/80 px-2 py-1.5 font-mono leading-snug text-slate-200">
                  {debugClickInfo}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {debugSelection && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        debugDrawSegmentRef.current = [];
                        setDebugDrawCount(0);
                        setDebugPhase("drawing");
                        debugPhaseRef.current = "drawing";
                      }}
                      className="rounded bg-green-800 px-2 py-1 transition hover:bg-green-700"
                    >
                      ✏ Editar segmento
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const map = mapRef.current;
                        if (map) clearDebugSegmentLayer(map);
                        debugStartIdxRef.current = null;
                        setDebugSelection(null);
                        setDebugClickInfo(null);
                        setDebugPhase("idle");
                        debugPhaseRef.current = "idle";
                      }}
                      className="rounded bg-slate-700 px-2 py-1 transition hover:bg-slate-600"
                    >
                      Limpiar
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => exportRouteCoords(debugCoordsRef.current)}
                  disabled={debugTotalPoints === 0}
                  className="rounded bg-amber-700 px-2 py-1 transition hover:bg-amber-600 disabled:opacity-40"
                >
                  Exportar
                </button>
                <button
                  type="button"
                  disabled={debugTotalPoints === 0 || debugSaveStatus === "saving"}
                  onClick={async () => {
                    const route = routes.find((r) => r.id === selectedRouteId) as (typeof routes[0] & { ruta?: string; direccion?: string }) | undefined;
                    if (!route) return;
                    const payload = {
                      ruta: (route as any).ruta ?? route.nombre,
                      direccion: debugDir,
                      coordenadas: debugCoordsRef.current
                    };
                    console.log("[debug save]", payload.ruta, payload.direccion, payload.coordenadas.length, "pts");
                    setDebugSaveStatus("saving");
                    setDebugSaveError(null);
                    try {
                      const res = await fetch("/api/debug/save-route", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                      });
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
                        const msg = typeof err.error === "string" ? err.error : `HTTP ${res.status}`;
                        console.error("[debug save] error", res.status, msg);
                        setDebugSaveError(msg);
                      }
                      setDebugSaveStatus(res.ok ? "saved" : "error");
                    } catch (e) {
                      console.error("[debug save] fetch error", e);
                      setDebugSaveStatus("error");
                      setDebugSaveError(String(e));
                    }
                    setTimeout(() => setDebugSaveStatus("idle"), 3000);
                  }}
                  className={`rounded px-2 py-1 transition disabled:opacity-40 ${
                    debugSaveStatus === "saved"
                      ? "bg-green-700"
                      : debugSaveStatus === "error"
                        ? "bg-red-700"
                        : "bg-blue-700 hover:bg-blue-600"
                  }`}
                >
                  {debugSaveStatus === "saving" ? "..." : debugSaveStatus === "saved" ? "✓ Guardado" : debugSaveStatus === "error" ? "✗ Error" : "Guardar"}
                </button>
              </div>

              {debugSaveError && (
                <p className="mt-1.5 break-all rounded bg-red-900/60 px-2 py-1 text-[10px] text-red-300">
                  {debugSaveError}
                </p>
              )}

              <p className="mt-2 text-slate-500">
                {debugPhase === "awaiting-end" ? "▶ Click para punto fin" : "▷ Click para punto inicio"}
              </p>
            </>
          )}
        </aside>
      )}
    </section>
  );
}

export default memo(MapComponent);

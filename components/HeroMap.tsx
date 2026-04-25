"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { URUAPAN_CENTER } from "@/lib/map";

type GroupedRoute = {
  ruta: string;
  color: string;
  ida: [number, number][];
  vuelta?: [number, number][];
};

const FEATURED_ROUTE_NAMES = ["Ruta 11", "Ruta 1", "Ruta 5"];
const TELEFERICO_NAME = "Teleférico Uruapan";

const ROUTE_COLORS = ["#E85D2F", "#7BA05B", "#F4EBD9"];
const TELEFERICO_COLOR = "#FBF5E8";

export default function HeroMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: URUAPAN_CENTER,
      zoom: 12.4,
      interactive: false,
      attributionControl: false,
      pitch: 35,
      bearing: -8
    });

    mapRef.current = map;

    map.on("load", async () => {
      try {
        const res = await fetch("/api/rutas");
        if (!res.ok) return;
        const all: GroupedRoute[] = await res.json();

        const pickCoords = (g: GroupedRoute) =>
          (g.ida?.length ? g.ida : g.vuelta ?? []) as [number, number][];

        let featured = FEATURED_ROUTE_NAMES
          .map((name) => all.find((r) => r.ruta === name))
          .filter((r): r is GroupedRoute => Boolean(r));

        if (featured.length === 0) {
          featured = all
            .filter((r) => r.ruta !== TELEFERICO_NAME && pickCoords(r).length > 1)
            .slice(0, 3);
        }

        featured.forEach((route, idx) => {
          const coords = pickCoords(route);
          if (coords.length < 2) return;
          const sourceId = `hero-route-${idx}`;
          map.addSource(sourceId, {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: coords }
            }
          });
          map.addLayer({
            id: `${sourceId}-glow`,
            type: "line",
            source: sourceId,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": ROUTE_COLORS[idx % ROUTE_COLORS.length],
              "line-width": 8,
              "line-opacity": 0.18,
              "line-blur": 6
            }
          });
          map.addLayer({
            id: `${sourceId}-line`,
            type: "line",
            source: sourceId,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": ROUTE_COLORS[idx % ROUTE_COLORS.length],
              "line-width": 3.2,
              "line-opacity": 0.95
            }
          });
        });

        const teleferico = all.find((r) => r.ruta === TELEFERICO_NAME);
        if (teleferico) {
          const tCoords = pickCoords(teleferico);
          if (tCoords.length > 1) {
            map.addSource("hero-teleferico", {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: tCoords }
              }
            });
            map.addLayer({
              id: "hero-teleferico-line",
              type: "line",
              source: "hero-teleferico",
              paint: {
                "line-color": TELEFERICO_COLOR,
                "line-width": 2.4,
                "line-dasharray": [2, 2],
                "line-opacity": 0.9
              }
            });

            map.addSource("hero-stations", {
              type: "geojson",
              data: {
                type: "FeatureCollection",
                features: tCoords.map((c) => ({
                  type: "Feature",
                  properties: {},
                  geometry: { type: "Point", coordinates: c }
                }))
              }
            });
            map.addLayer({
              id: "hero-stations-dot",
              type: "circle",
              source: "hero-stations",
              paint: {
                "circle-radius": 4,
                "circle-color": TELEFERICO_COLOR,
                "circle-stroke-width": 1.5,
                "circle-stroke-color": "#1F2F14"
              }
            });
          }
        }

        setReady(true);
      } catch (err) {
        console.error("[HeroMap] load failed", err);
      }
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Rotación lenta del bearing — pausada cuando sale de viewport o si el usuario prefiere reduced motion
  useEffect(() => {
    if (!ready || !mapRef.current || !containerRef.current) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const map = mapRef.current;
    let raf = 0;
    let bearing = -8;
    let visible = true;

    const tick = () => {
      if (visible) {
        bearing = (bearing + 0.04) % 360;
        map.setBearing(bearing);
      }
      raf = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => { visible = entry.isIntersecting; },
      { threshold: 0.1 }
    );
    observer.observe(containerRef.current);

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [ready]);

  return (
    <div className="hero-map-frame aspect-[4/5] w-full max-w-md lg:aspect-[3/4]">
      <div ref={containerRef} className="absolute inset-0" />

      {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
        <div className="absolute inset-0 grid place-items-center bg-ink-900 text-cream-100 text-center text-sm">
          Configura NEXT_PUBLIC_MAPBOX_TOKEN para ver el mapa
        </div>
      )}

      {/* Pin de origen pulsante */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        <span className="absolute -inset-4 animate-ping rounded-full bg-terracota-400/40" />
        <span className="relative grid h-7 w-7 place-items-center rounded-full bg-terracota-400 shadow-[0_0_20px_rgba(232,93,47,0.7)]">
          <span className="h-2 w-2 rounded-full bg-cream-50" />
        </span>
      </div>

      <div className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full bg-cream-100/95 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-900 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-terracota-400" />
          En vivo · Uruapan
        </span>
        <span className="rounded-full bg-ink-900/80 px-2.5 py-1 text-[10px] font-bold text-cream-100 backdrop-blur">
          41 rutas
        </span>
      </div>

      <div className="absolute bottom-4 left-4 right-4 z-10 rounded-2xl border border-cream-100/15 bg-ink-900/85 p-4 backdrop-blur-xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-terracota-400">
          Ruta sugerida
        </p>
        <p className="mt-1 font-serif-display text-xl font-bold text-cream-50">
          Camión + Teleférico
        </p>
        <p className="mt-2 text-xs text-cream-100/70">
          Costo estimado por abordaje: $11.00 MXN
        </p>
      </div>
    </div>
  );
}

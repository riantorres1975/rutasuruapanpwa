"use client";

import { useEffect, useRef, useState } from "react";
import { URUAPAN_CENTER } from "@/lib/map";

const SUGGESTIONS = [
  { kicker: "Ruta sugerida", title: "Camión + Teleférico", meta: "Costo estimado por abordaje: $11.00 MXN" },
  { kicker: "Ruta popular", title: "Ruta 11 · Centro", meta: "La más consultada · ~14 min" },
  { kicker: "Conexión rápida", title: "Mercado ↔ Hospital", meta: "Camión urbano + Teleférico" },
  { kicker: "Turismo", title: "Parque Nacional", meta: "Llega caminando desde el Centro" }
] as const;

const ROUTES = [
  { d: "M-20 220 C 60 150, 90 145, 130 175 S 205 235, 260 150 S 355 75, 440 120", color: "#E85D2F" },
  { d: "M-30 70 C 55 115, 110 130, 155 112 S 235 48, 285 96 S 365 190, 450 170", color: "#7BA05B" },
  { d: "M 30 265 C 80 220, 130 218, 185 250 S 285 310, 330 245 S 395 150, 455 150", color: "#F4EBD9" },
  { d: "M 45 20 C 105 70, 125 95, 195 75 S 280 30, 340 82 S 400 122, 455 90", color: "#F4EBD9" }
] as const;

const ROTATE_MS = 4500;
const MAP_LOAD_DELAY_MS = 1400;

export default function HeroMap() {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const [liveReady, setLiveReady] = useState(false);
  const [suggestionIdx, setSuggestionIdx] = useState(0);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const staticMapUrl = mapboxToken
    ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${URUAPAN_CENTER[0]},${URUAPAN_CENTER[1]},12.4,-8,35/430x520@2x?access_token=${encodeURIComponent(mapboxToken)}&logo=false&attribution=false`
    : null;

  useEffect(() => {
    const id = window.setInterval(() => {
      setSuggestionIdx((i) => (i + 1) % SUGGESTIONS.length);
    }, ROTATE_MS);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const token = mapboxToken;
    if (!token || !frameRef.current) {
      return;
    }

    let cancelled = false;
    let timer = 0;
    let raf = 0;

    const loadMap = () => {
      if (timer || mapRef.current) {
        return;
      }

      timer = window.setTimeout(async () => {
        if (cancelled || !mapContainerRef.current || mapRef.current) {
          return;
        }

        const mapboxgl = (await import("mapbox-gl")).default;
        if (cancelled || !mapContainerRef.current) {
          return;
        }

        mapboxgl.accessToken = token;
        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: URUAPAN_CENTER,
          zoom: 12.4,
          interactive: false,
          attributionControl: false,
          pitch: 35,
          bearing: -8
        });

        mapRef.current = map;
        map.on("load", () => {
          if (!cancelled) {
            setLiveReady(true);
          }
        });

        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!prefersReducedMotion) {
          let bearing = -8;
          const tick = () => {
            bearing = (bearing + 0.04) % 360;
            map.setBearing(bearing);
            raf = window.requestAnimationFrame(tick);
          };
          raf = window.requestAnimationFrame(tick);
        }
      }, MAP_LOAD_DELAY_MS);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMap();
          observer.disconnect();
        }
      },
      { rootMargin: "160px" }
    );

    observer.observe(frameRef.current);

    return () => {
      cancelled = true;
      observer.disconnect();
      window.clearTimeout(timer);
      if (raf) {
        window.cancelAnimationFrame(raf);
      }
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [mapboxToken]);

  const suggestion = SUGGESTIONS[suggestionIdx];

  return (
    <div ref={frameRef} className="hero-map-frame aspect-[4/5] w-full max-w-md lg:aspect-[3/4]" aria-label="Vista previa de rutas de transporte en Uruapan">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,rgba(232,93,47,0.22),transparent_32%),radial-gradient(circle_at_70%_60%,rgba(123,160,91,0.16),transparent_34%),linear-gradient(145deg,#101509,#07111a_55%,#0e1208)]" />

      {staticMapUrl ? (
        <div
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ${liveReady ? "opacity-0" : "opacity-100"}`}
          style={{ backgroundImage: `url(${staticMapUrl})` }}
          aria-hidden="true"
        />
      ) : (
        <svg className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${liveReady ? "opacity-0" : "opacity-100"}`} viewBox="0 0 430 520" fill="none" aria-hidden="true">
          <defs>
            <pattern id="hero-grid" width="42" height="42" patternUnits="userSpaceOnUse">
              <path d="M 42 0 L 0 0 0 42" stroke="rgba(244,235,217,0.08)" strokeWidth="1" />
            </pattern>
            <filter id="route-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect width="430" height="520" fill="url(#hero-grid)" />
          {ROUTES.map((route) => (
            <g key={route.d} filter="url(#route-glow)">
              <path d={route.d} stroke={route.color} strokeOpacity="0.2" strokeWidth="14" strokeLinecap="round" />
              <path d={route.d} stroke={route.color} strokeWidth="4" strokeLinecap="round" strokeDasharray={route.color === "#F4EBD9" ? "10 10" : undefined} />
            </g>
          ))}
          <circle cx="215" cy="255" r="12" fill="#E85D2F" stroke="#FBF5E8" strokeWidth="4" />
          <circle cx="300" cy="120" r="8" fill="#E85D2F" stroke="#FBF5E8" strokeWidth="3" />
          <circle cx="132" cy="178" r="8" fill="#7BA05B" stroke="#FBF5E8" strokeWidth="3" />
        </svg>
      )}

      <div
        ref={mapContainerRef}
        className={`absolute inset-0 transition-opacity duration-700 ${liveReady ? "opacity-100" : "opacity-0"}`}
        aria-hidden="true"
      />

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        <span className="absolute -inset-4 animate-ping rounded-full bg-terracota-400/40" />
        <span className="relative grid h-7 w-7 place-items-center rounded-full bg-terracota-400 shadow-[0_0_20px_rgba(232,93,47,0.7)]">
          <span className="h-2 w-2 rounded-full bg-cream-50" />
        </span>
      </div>

      <div className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full bg-cream-100/95 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-900 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-terracota-400" />
          {liveReady ? "En vivo · Uruapan" : "Uruapan"}
        </span>
        <span className="rounded-full bg-ink-900/80 px-2.5 py-1 text-[10px] font-bold text-cream-100 backdrop-blur">
          40 rutas + Teleférico
        </span>
      </div>

      <div className="absolute bottom-4 left-4 right-4 z-10 rounded-2xl border border-cream-100/15 bg-ink-900/85 p-4 backdrop-blur-xl">
        <div key={suggestionIdx} className="suggestion-fade">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-terracota-400">
            {suggestion.kicker}
          </p>
          <p className="mt-1 font-serif-display text-xl font-bold text-cream-50">
            {suggestion.title}
          </p>
          <p className="mt-2 text-xs text-cream-100/70">
            {suggestion.meta}
          </p>
        </div>
        <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
          {SUGGESTIONS.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === suggestionIdx ? "w-6 bg-terracota-400" : "w-1 bg-cream-100/20"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

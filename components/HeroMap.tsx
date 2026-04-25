"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { URUAPAN_CENTER } from "@/lib/map";

const SUGGESTIONS = [
  { kicker: "Ruta sugerida", title: "Camión + Teleférico", meta: "Costo estimado por abordaje: $11.00 MXN" },
  { kicker: "Ruta popular", title: "Ruta 11 · Centro", meta: "La más consultada · ~14 min" },
  { kicker: "Conexión rápida", title: "Mercado ↔ Hospital", meta: "Combina urbano con Teleférico" },
  { kicker: "Turismo", title: "Parque Nacional", meta: "Llega caminando desde el Centro" }
] as const;

const ROTATE_MS = 4500;

export default function HeroMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [suggestionIdx, setSuggestionIdx] = useState(0);

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

    map.on("load", () => setReady(true));

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Rotación de la card de sugerencia
  useEffect(() => {
    const id = setInterval(() => {
      setSuggestionIdx((i) => (i + 1) % SUGGESTIONS.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  // Rotación lenta del bearing — pausada fuera de viewport y si prefiere reduced motion
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

      {/* Pin de origen pulsante en el centro */}
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
        <div key={suggestionIdx} className="suggestion-fade">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-terracota-400">
            {SUGGESTIONS[suggestionIdx].kicker}
          </p>
          <p className="mt-1 font-serif-display text-xl font-bold text-cream-50">
            {SUGGESTIONS[suggestionIdx].title}
          </p>
          <p className="mt-2 text-xs text-cream-100/70">
            {SUGGESTIONS[suggestionIdx].meta}
          </p>
        </div>
        {/* Dots indicator */}
        <div className="mt-3 flex items-center gap-1.5">
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

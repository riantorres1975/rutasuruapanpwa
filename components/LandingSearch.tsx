"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchLocalPlaces, searchPlaces, type PlaceResult } from "@/lib/geocode";

const DEBOUNCE_MS = 280;

function mapHref(result: PlaceResult): string {
  const [lng, lat] = result.center;
  return `/mapa?b=${lng.toFixed(6)},${lat.toFixed(6)}&destino=${encodeURIComponent(result.label)}`;
}

export default function LandingSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setResults(searchLocalPlaces(trimmed));
    setActiveIndex(-1);

    const controller = new AbortController();
    setIsSearching(true);
    const timer = window.setTimeout(() => {
      searchPlaces(trimmed, { signal: controller.signal })
        .then(setResults)
        .finally(() => setIsSearching(false));
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const goTo = (result: PlaceResult) => {
    setIsOpen(false);
    router.push(mapHref(result));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const target = activeIndex >= 0 ? results[activeIndex] : results[0];
    if (target) {
      goTo(target);
      return;
    }
    // Sin sugerencia: deja que el mapa geocodifique el texto libre.
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/mapa?destino=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/mapa");
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative mt-6 max-w-xl">
      {/* action/method reales → la búsqueda funciona incluso sin JavaScript */}
      <form
        action="/mapa"
        method="get"
        onSubmit={handleSubmit}
        className="rounded-3xl border p-2 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        style={{ borderColor: "var(--ov-border)", background: "rgba(12,17,10,0.85)" }}
      >
        <label className="sr-only" htmlFor="destino">¿A dónde vas?</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
              style={{ color: "var(--muted)" }}
              aria-hidden="true"
            >
              <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="10" r="2" fill="currentColor" />
            </svg>
            <input
              id="destino"
              name="destino"
              value={query}
              autoComplete="off"
              onChange={(event) => { setQuery(event.target.value); setIsOpen(true); }}
              onFocus={() => { if (results.length > 0) setIsOpen(true); }}
              onKeyDown={handleKeyDown}
              placeholder="¿A dónde vas? Ej. Parque Nacional"
              role="combobox"
              aria-expanded={isOpen}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
              className="h-12 w-full rounded-2xl border pl-12 pr-4 text-sm font-medium outline-none transition"
              style={{
                background: "rgba(106,171,72,0.06)",
                borderColor: "rgba(140,200,80,0.15)",
                color: "var(--ink)",
              }}
            />
            {isSearching && (
              <span
                className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-t-transparent"
                style={{ borderColor: "var(--lima)", borderTopColor: "transparent" }}
                aria-hidden="true"
              />
            )}
          </div>
          <button
            className="cta-shine h-12 rounded-2xl px-6 text-sm font-black text-white transition hover:opacity-90"
            type="submit"
            style={{ background: "var(--verde)" }}
          >
            Buscar ruta
          </button>
        </div>
      </form>

      {isOpen && results.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-2 max-h-72 overflow-y-auto overscroll-contain rounded-2xl border p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          style={{ background: "var(--card, #141c10)", borderColor: "var(--ov-border)" }}
        >
          {results.map((result, index) => (
            <li key={`${result.label}-${result.center.join(",")}`} role="presentation">
              <button
                id={`${listboxId}-opt-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onClick={() => goTo(result)}
                onMouseEnter={() => setActiveIndex(index)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition"
                style={index === activeIndex ? { background: "var(--verde-l)" } : undefined}
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" style={{ color: "var(--lima)" }} aria-hidden="true">
                  <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="10" r="2" fill="currentColor" />
                </svg>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold" style={{ color: "var(--ink)" }}>{result.label}</span>
                  <span className="block text-[11px]" style={{ color: "var(--muted)" }}>
                    {result.source === "local" ? "Lugar conocido" : "Uruapan, Mich."}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import { searchLocalPlaces, searchPlaces, type PlaceResult } from "@/lib/geocode";
import { addRecentPlace, getRecentPlaces } from "@/lib/recent-places";
import { getSavedPlaces, setSavedPlace, SAVED_SLOT_LABELS, type SavedSlot } from "@/lib/saved-places";

const DEBOUNCE_MS = 280;

function mapHref(result: PlaceResult): string {
  const [lng, lat] = result.center;
  return `/mapa?b=${lng.toFixed(6)},${lat.toFixed(6)}&destino=${encodeURIComponent(result.label)}`;
}

export default function LandingSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [recents, setRecents] = useState<PlaceResult[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<ReturnType<typeof getSavedPlaces>>({});
  const [savingSlot, setSavingSlot] = useState<SavedSlot | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastTrackedQueryRef = useRef("");
  const listboxId = useId();

  // Con el input casi vacío mostramos los destinos recientes.
  const showingRecents = query.trim().length < 2;
  const displayResults = showingRecents ? recents : results;

  // Telemetría: búsquedas sin resultados → candidatos para el índice local.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3 || isSearching || results.length > 0) return;
    if (lastTrackedQueryRef.current === trimmed) return;
    const timer = window.setTimeout(() => {
      lastTrackedQueryRef.current = trimmed;
      try {
        track("busqueda_sin_resultados", {
          longitud: Math.min(trimmed.length, 100),
          origen: "landing",
        });
      } catch {
        // analytics no disponible: ignorar
      }
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [query, isSearching, results]);

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
      setActiveIndex(-1);
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
    if (savingSlot) {
      setSavedPlace(savingSlot, result);
      setSavedPlaces(getSavedPlaces());
      setSavingSlot(null);
    }
    addRecentPlace(result);
    setIsOpen(false);
    router.push(mapHref(result));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const target = activeIndex >= 0 ? displayResults[activeIndex] : results[0];
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
    if (displayResults.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((i) => (i + 1) % displayResults.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? displayResults.length - 1 : i - 1));
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
              onFocus={() => {
                setRecents(getRecentPlaces());
                setSavedPlaces(getSavedPlaces());
                if (results.length > 0 || query.trim().length < 2) {
                  setIsOpen(true);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="¿A dónde vas? Ej. Parque Nacional"
              aria-label="Buscar destino"
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

      {isOpen && (showingRecents || displayResults.length > 0) && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-2 max-h-72 overflow-y-auto overscroll-contain rounded-2xl border p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          style={{ background: "var(--card, #141c10)", borderColor: "var(--ov-border)" }}
        >
          {savingSlot && (
            <li
              role="presentation"
              className="mb-1 flex items-center gap-2 rounded-xl border px-3 py-2"
              style={{ borderColor: "rgba(184,232,64,0.3)", background: "rgba(184,232,64,0.08)" }}
            >
              <span className="flex-1 text-[12px] font-medium" style={{ color: "var(--ink)" }}>
                Busca un lugar y selecciónalo para guardarlo como{" "}
                <span className="font-bold" style={{ color: "var(--lima)" }}>{SAVED_SLOT_LABELS[savingSlot]}</span>
              </span>
              <button
                type="button"
                onClick={() => setSavingSlot(null)}
                className="shrink-0 text-[11px] font-semibold underline-offset-2 hover:underline"
                style={{ color: "var(--muted)" }}
              >
                Cancelar
              </button>
            </li>
          )}
          {showingRecents && !savingSlot &&
            (["casa", "trabajo"] as const).map((slot) => {
              const saved = savedPlaces[slot];
              return (
                <li key={slot} role="presentation">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => (saved ? goTo(saved) : setSavingSlot(slot))}
                      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:opacity-90"
                    >
                      {slot === "casa" ? (
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" style={{ color: "var(--lima)" }} aria-hidden="true">
                          <path d="M3 11.5 12 4l9 7.5M5.5 9.8V20h13V9.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M10 20v-5h4v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" style={{ color: "var(--lima)" }} aria-hidden="true">
                          <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
                          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
                          {SAVED_SLOT_LABELS[slot]}
                        </span>
                        <span className="block truncate text-[11px]" style={{ color: "var(--muted)" }}>
                          {saved ? saved.label : "Toca para configurar"}
                        </span>
                      </span>
                    </button>
                    {saved && (
                      <button
                        type="button"
                        onClick={() => setSavingSlot(slot)}
                        aria-label={`Cambiar ${SAVED_SLOT_LABELS[slot]}`}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full transition hover:opacity-80"
                        style={{ background: "rgba(106,171,72,0.12)", color: "var(--muted)" }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                          <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3ZM14 6.5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          {showingRecents && displayResults.length > 0 && (
            <li
              role="presentation"
              className="px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "var(--muted)" }}
            >
              Recientes
            </li>
          )}
          {displayResults.map((result, index) => (
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
                {showingRecents ? (
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" style={{ color: "var(--muted)" }} aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" style={{ color: "var(--lima)" }} aria-hidden="true">
                    <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="10" r="2" fill="currentColor" />
                  </svg>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold" style={{ color: "var(--ink)" }}>{result.label}</span>
                  <span className="block text-[11px]" style={{ color: "var(--muted)" }}>
                    {showingRecents ? "Búsqueda reciente" : result.source === "local" ? "Lugar conocido" : "Uruapan, Mich."}
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

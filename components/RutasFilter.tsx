"use client";

import { useEffect, useRef, useState } from "react";

type RutasFilterProps = {
  total: number;
  /** id del contenedor con las tarjetas (cada una con data-search) */
  gridId?: string;
  /** id del elemento "sin resultados" a mostrar/ocultar */
  emptyId?: string;
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function RutasFilter({ total, gridId = "rutas-grid", emptyId = "rutas-empty" }: RutasFilterProps) {
  const [query, setQuery] = useState("");
  const [count, setCount] = useState(total);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtra las tarjetas (renderizadas en el servidor) alternando su visibilidad.
  useEffect(() => {
    const grid = document.getElementById(gridId);
    if (!grid) return;

    const q = normalize(query);
    const cards = grid.querySelectorAll<HTMLElement>("[data-search]");
    let visible = 0;

    cards.forEach((el) => {
      const hay = el.getAttribute("data-search") ?? "";
      const match = q === "" || hay.includes(q);
      el.style.display = match ? "" : "none";
      if (match) visible += 1;
    });

    setCount(visible);

    const empty = document.getElementById(emptyId);
    if (empty) empty.style.display = visible === 0 ? "" : "none";
  }, [query, gridId, emptyId]);

  return (
    <div
      className="sticky top-[68px] z-30 -mx-1 mb-6 rounded-2xl border p-3 backdrop-blur-xl"
      style={{ borderColor: "rgba(140,200,80,0.12)", background: "rgba(12,17,10,0.92)" }}
    >
      <label className="block">
        <span className="sr-only">Buscar ruta por número, colonia o destino</span>
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: "#6aab48" }}
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="m20 20-3.8-3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busca por número, colonia o destino…"
            className="h-12 w-full rounded-xl border pl-11 pr-11 text-sm font-medium outline-none transition [&::placeholder]:opacity-50"
            style={{ background: "rgba(106,171,72,0.06)", borderColor: "rgba(140,200,80,0.15)", color: "#e8f2d8" }}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="absolute right-2 top-2.5 grid h-7 w-7 place-items-center rounded-full transition hover:opacity-80"
              style={{ background: "rgba(106,171,72,0.12)", color: "#a8c888" }}
              aria-label="Limpiar búsqueda"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </label>
      <p className="mt-2 px-1 text-[12px] font-semibold" style={{ color: "#6aab48" }} aria-live="polite">
        {count} {count === 1 ? "ruta" : "rutas"}
        {query && ` para “${query.trim()}”`}
      </p>
    </div>
  );
}

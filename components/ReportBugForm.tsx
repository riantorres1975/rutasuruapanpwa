"use client";

import { useEffect, useMemo, useState } from "react";

const ISSUE_URL = "https://github.com/riantorres1975/rutasuruapanpwa/issues/new";

const REPORT_TYPES = [
  "Ruta incorrecta",
  "Ruta faltante",
  "Error en el mapa",
  "Problema de ubicación",
  "Error visual o de uso",
  "Otro"
] as const;

export default function ReportBugForm() {
  const [reportType, setReportType] = useState<(typeof REPORT_TYPES)[number]>("Ruta incorrecta");
  const [routeName, setRouteName] = useState("");
  const [place, setPlace] = useState("");
  const [description, setDescription] = useState("");
  const [expected, setExpected] = useState("");
  const [contact, setContact] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [userAgent, setUserAgent] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");
    setSourceUrl(from ? `${window.location.origin}/${from.replace(/^\/+/, "")}` : window.location.href);
    setUserAgent(window.navigator.userAgent);
  }, []);

  const issueHref = useMemo(() => {
    const titleSubject = routeName || place || reportType;
    const title = `[Reporte] ${titleSubject}`;
    const body = [
      "## Tipo de problema",
      reportType,
      "",
      "## Ruta, colonia o lugar relacionado",
      routeName || "No especificado",
      "",
      "## Ubicación aproximada",
      place || "No especificada",
      "",
      "## Qué pasó",
      description || "No especificado",
      "",
      "## Qué debería pasar",
      expected || "No especificado",
      "",
      "## Contacto opcional",
      contact || "No proporcionado",
      "",
      "## Contexto técnico",
      `Página: ${sourceUrl || "No disponible"}`,
      `Navegador: ${userAgent || "No disponible"}`
    ].join("\n");

    const params = new URLSearchParams({
      title,
      body,
      labels: "bug"
    });

    return `${ISSUE_URL}?${params.toString()}`;
  }, [contact, description, expected, place, reportType, routeName, sourceUrl, userAgent]);

  const canSubmit = description.trim().length >= 10;

  return (
    <form
      className="rounded-[2rem] border p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl md:p-7"
      style={{ borderColor: "rgba(140,200,80,0.14)", background: "rgba(20,28,16,0.72)" }}
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) {
          window.open(issueHref, "_blank", "noopener,noreferrer");
        }
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "#b8e840" }}>Tipo</span>
          <select
            value={reportType}
            onChange={(event) => setReportType(event.target.value as (typeof REPORT_TYPES)[number])}
            className="mt-2 h-12 w-full rounded-2xl border px-4 text-sm outline-none"
            style={{ borderColor: "rgba(140,200,80,0.18)", background: "rgba(12,17,10,0.9)", color: "#e8f2d8" }}
          >
            {REPORT_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "#b8e840" }}>Ruta o lugar</span>
          <input
            value={routeName}
            onChange={(event) => setRouteName(event.target.value)}
            placeholder="Ej. Ruta 11, Jucutacato, Centro"
            className="mt-2 h-12 w-full rounded-2xl border px-4 text-sm outline-none placeholder:text-white/30"
            style={{ borderColor: "rgba(140,200,80,0.18)", background: "rgba(12,17,10,0.9)", color: "#e8f2d8" }}
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "#b8e840" }}>Ubicación aproximada</span>
        <input
          value={place}
          onChange={(event) => setPlace(event.target.value)}
          placeholder="Ej. cerca del Mercado, Hospital Regional, colonia..."
          className="mt-2 h-12 w-full rounded-2xl border px-4 text-sm outline-none placeholder:text-white/30"
          style={{ borderColor: "rgba(140,200,80,0.18)", background: "rgba(12,17,10,0.9)", color: "#e8f2d8" }}
        />
      </label>

      <label className="mt-4 block">
        <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "#b8e840" }}>Qué pasó</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
          minLength={10}
          rows={5}
          placeholder="Describe el error con el mayor detalle posible."
          className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm leading-6 outline-none placeholder:text-white/30"
          style={{ borderColor: "rgba(140,200,80,0.18)", background: "rgba(12,17,10,0.9)", color: "#e8f2d8" }}
        />
      </label>

      <label className="mt-4 block">
        <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "#b8e840" }}>Qué debería pasar</span>
        <textarea
          value={expected}
          onChange={(event) => setExpected(event.target.value)}
          rows={3}
          placeholder="Ej. la ruta debería pasar por tal calle, el botón debería abrir..."
          className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm leading-6 outline-none placeholder:text-white/30"
          style={{ borderColor: "rgba(140,200,80,0.18)", background: "rgba(12,17,10,0.9)", color: "#e8f2d8" }}
        />
      </label>

      <label className="mt-4 block">
        <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "#b8e840" }}>Contacto opcional</span>
        <input
          value={contact}
          onChange={(event) => setContact(event.target.value)}
          placeholder="Email, X, GitHub o teléfono si quieres seguimiento"
          className="mt-2 h-12 w-full rounded-2xl border px-4 text-sm outline-none placeholder:text-white/30"
          style={{ borderColor: "rgba(140,200,80,0.18)", background: "rgba(12,17,10,0.9)", color: "#e8f2d8" }}
        />
      </label>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5" style={{ color: "rgba(232,242,216,0.52)" }}>
          Se abrirá GitHub con el reporte prellenado. Revisa el texto antes de enviarlo.
        </p>
        <button
          type="submit"
          disabled={!canSubmit}
          className="cta-shine inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-45"
          style={{ background: "#6aab48", color: "#e8f2d8" }}
        >
          Crear reporte
        </button>
      </div>
    </form>
  );
}

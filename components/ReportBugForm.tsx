"use client";

import { CheckCircle2, LoaderCircle, Mail, Send } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import RouteProposalMap from "@/components/RouteProposalMap";
import type { CommunityReportType } from "@/lib/community-report";
import type { Coordinates } from "@/lib/types";

const ISSUE_URL = "https://github.com/riantorres1975/rutasuruapanpwa/issues/new";
const REPORT_EMAIL = "contacto@urugo.app";
const subscribeBrowserContext = () => () => {};

function getSourceUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("from");
  const safePath = raw ? `/${raw.replace(/^\/+/, "").replace(/\.\.\//g, "")}` : null;
  const from = safePath && /^[\w/-]+$/.test(safePath) ? safePath : null;
  return from ? `${window.location.origin}${from}` : window.location.href;
}

const REPORT_TYPES: ReadonlyArray<{ value: CommunityReportType; label: string }> = [
  { value: "route_incorrect", label: "Ruta incorrecta" },
  { value: "route_missing", label: "Ruta faltante" },
  { value: "route_inactive", label: "La ruta ya no circula" },
  { value: "route_changed", label: "Cambió el recorrido" },
  { value: "schedule_changed", label: "Cambió el horario" },
  { value: "landmark_changed", label: "Referencia incorrecta" },
  { value: "map_error", label: "Error en el mapa" },
  { value: "location_problem", label: "Problema de ubicación" },
  { value: "usability_problem", label: "Error visual o de uso" },
  { value: "other", label: "Otro" },
];

type ReportBugFormProps = {
  initialRoute?: string;
  initialRouteKey?: string;
  initialLandmark?: string;
};

type SubmitState = "idle" | "submitting" | "success" | "error";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .5A11.5 11.5 0 0 0 8.36 22.9c.58.1.79-.25.79-.56v-2.02c-3.22.7-3.9-1.38-3.9-1.38-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.7.08-.7 1.17.08 1.79 1.2 1.79 1.2 1.04 1.78 2.73 1.27 3.4.97.1-.75.4-1.27.74-1.56-2.57-.29-5.28-1.29-5.28-5.73 0-1.27.45-2.3 1.2-3.12-.12-.29-.52-1.47.11-3.07 0 0 .98-.31 3.2 1.2a11.1 11.1 0 0 1 5.82 0c2.22-1.51 3.2-1.2 3.2-1.2.63 1.6.23 2.78.11 3.07.75.82 1.2 1.85 1.2 3.12 0 4.46-2.72 5.43-5.3 5.72.42.36.8 1.08.8 2.18v3.23c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

export default function ReportBugForm({ initialRoute = "", initialRouteKey, initialLandmark = "" }: ReportBugFormProps) {
  const [reportType, setReportType] = useState<CommunityReportType>("route_incorrect");
  const [routeName, setRouteName] = useState(initialRoute);
  const [place, setPlace] = useState(initialLandmark ? `Cerca de ${initialLandmark}` : "");
  const [description, setDescription] = useState("");
  const [expected, setExpected] = useState("");
  const [contact, setContact] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [proposedPath, setProposedPath] = useState<Coordinates[]>([]);
  const [website, setWebsite] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState("");
  const sourceUrl = useSyncExternalStore(subscribeBrowserContext, getSourceUrl, () => "");

  const reportLabel = REPORT_TYPES.find((item) => item.value === reportType)?.label ?? "Reporte";
  const canProposePath = Boolean(initialRouteKey) && (reportType === "route_incorrect" || reportType === "route_changed");
  const reportSubject = useMemo(() => {
    const reportTarget = routeName.trim() || place.trim();
    return reportTarget ? `Reporte ${reportLabel}: ${reportTarget}` : `Reporte ${reportLabel}`;
  }, [place, reportLabel, routeName]);

  const reportBody = useMemo(() => {
    return [
      `Tipo de problema: ${reportLabel}`,
      `Ruta o lugar: ${routeName || "No especificado"}`,
      `Ubicación aproximada: ${place || "No especificada"}`,
      "",
      "Qué pasó:",
      description || "No especificado",
      "",
      "Qué debería pasar:",
      expected || "No especificado",
      "",
      `Contacto opcional: ${contact || "No proporcionado"}`,
      `Evidencia: ${evidenceUrl || "No proporcionada"}`,
      `Recorrido propuesto: ${proposedPath.length >= 2 ? `${proposedPath.length} puntos` : "No proporcionado"}`,
      `Página: ${sourceUrl || "No disponible"}`,
    ].join("\n");
  }, [contact, description, evidenceUrl, expected, place, proposedPath.length, reportLabel, routeName, sourceUrl]);

  const emailHref = `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(reportSubject)}&body=${encodeURIComponent(reportBody)}`;
  const issueHref = `${ISSUE_URL}?${new URLSearchParams({
    title: `[Reporte] ${routeName || place || reportLabel}`,
    body: reportBody,
    labels: "bug",
  }).toString()}`;
  const canSubmit = description.trim().length >= 10 && proposedPath.length !== 1 && submitState !== "submitting";

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitState("submitting");
    setSubmitError("");

    try {
      const response = await fetch("/api/community/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType,
          routeKey: initialRouteKey && routeName.trim() === initialRoute.trim() ? initialRouteKey : null,
          routeName,
          place,
          description,
          expectedResult: expected,
          contact,
          evidenceUrl,
          proposedPath: canProposePath && proposedPath.length >= 2 ? proposedPath : null,
          sourcePath: sourceUrl ? new URL(sourceUrl).pathname : window.location.pathname,
          website,
        }),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error || "No pudimos enviar el reporte.");
      setSubmitState("success");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No pudimos enviar el reporte.");
      setSubmitState("error");
    }
  }

  if (submitState === "success") {
    return (
      <section className="border border-[#6aab48]/30 bg-[#111a0d] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:p-10" aria-live="polite">
        <CheckCircle2 className="h-9 w-9 text-[#b8e840]" aria-hidden="true" />
        <p className="mt-6 text-xs font-black uppercase text-[#89aa70]">Reporte recibido</p>
        <h2 className="mt-2 font-serif text-3xl font-black text-[#e8f2d8]">Gracias por ayudar a mejorar la ruta.</h2>
        <p className="mt-4 max-w-lg text-sm leading-7 text-[#a8c888]">
          Quedó pendiente de revisión. Ningún dato cambia en el mapa hasta que un administrador compruebe la información.
        </p>
        <button
          type="button"
          onClick={() => {
            setDescription("");
            setExpected("");
            setEvidenceUrl("");
            setProposedPath([]);
            setSubmitState("idle");
          }}
          className="mt-7 inline-flex h-11 items-center justify-center bg-[#6aab48] px-5 text-sm font-black text-[#0c110a] transition hover:bg-[#79bd55]"
        >
          Enviar otro reporte
        </button>
      </section>
    );
  }

  const fieldClass = "mt-2 w-full border border-[#6aab48]/20 bg-[#0c110a] px-4 text-sm text-[#e8f2d8] outline-none placeholder:text-white/30 focus:border-[#b8e840]/60 focus:ring-2 focus:ring-[#b8e840]/10";

  return (
    <form className="border border-[#6aab48]/20 bg-[#111a0d]/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:p-7" onSubmit={submitReport}>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold uppercase text-[#b8e840]">Tipo de reporte</span>
          <select value={reportType} onChange={(event) => setReportType(event.target.value as CommunityReportType)} className={`${fieldClass} h-12`}>
            {REPORT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase text-[#b8e840]">Ruta o lugar</span>
          <input value={routeName} onChange={(event) => setRouteName(event.target.value)} maxLength={120} placeholder="Ej. Ruta 11, Jucutacato, Centro" className={`${fieldClass} h-12`} />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase text-[#b8e840]">Ubicación aproximada</span>
          <input value={place} onChange={(event) => setPlace(event.target.value)} maxLength={180} placeholder="Mercado, calle, colonia o referencia" className={`${fieldClass} h-12`} />
        </label>

        <label className="block md:row-span-2">
          <span className="text-xs font-bold uppercase text-[#b8e840]">Qué pasó</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} required minLength={10} maxLength={2000} rows={6} placeholder="Describe lo que viste y, si puedes, cuándo ocurrió." className={`${fieldClass} py-3 leading-6`} />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase text-[#b8e840]">Qué debería mostrar</span>
          <textarea value={expected} onChange={(event) => setExpected(event.target.value)} maxLength={1500} rows={3} placeholder="Ej. ahora gira en otra calle o ya no circula." className={`${fieldClass} py-3 leading-6`} />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase text-[#b8e840]">Contacto opcional</span>
          <input value={contact} onChange={(event) => setContact(event.target.value)} maxLength={180} placeholder="Email o red social para dar seguimiento" className={`${fieldClass} h-12`} />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase text-[#b8e840]">Fuente o evidencia opcional</span>
          <input type="url" inputMode="url" value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} maxLength={500} pattern="https://.*" placeholder="https://publicación, foto o aviso" className={`${fieldClass} h-12`} />
          <span className="mt-2 block text-[11px] leading-5 text-[#60784f]">Sólo enlaces HTTPS. Se mantiene privado para revisión.</span>
        </label>
      </div>

      {canProposePath && initialRouteKey && (
        <div className="mt-6">
          <RouteProposalMap routeKey={initialRouteKey} points={proposedPath} onChange={setProposedPath} />
          {proposedPath.length === 1 && <p className="mt-2 text-xs text-[#f4df98]">Marca al menos un segundo punto o borra la propuesta.</p>}
        </div>
      )}

      <label className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        Sitio web
        <input name="website" value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" />
      </label>

      {submitState === "error" && (
        <div className="mt-5 border-l-2 border-[#f4c84a] bg-[#f4c84a]/[0.07] px-4 py-3" role="alert">
          <p className="text-sm font-bold text-[#f4df98]">{submitError}</p>
          <p className="mt-1 text-xs leading-5 text-[#a8c888]">Puedes enviarlo por correo o GitHub mientras tanto.</p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4 border-t border-white/[0.08] pt-5 lg:flex-row lg:items-center lg:justify-between">
        <p className="max-w-lg text-xs leading-5 text-[#78965f]">
          El reporte queda privado hasta ser revisado. No publicamos tu contacto ni modificamos una ruta automáticamente.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <a href={emailHref} aria-label="Enviar reporte por correo" title="Enviar por correo" className="grid h-11 w-11 place-items-center border border-white/15 text-[#a8c888] transition hover:border-[#6aab48]/60 hover:text-[#e8f2d8]"><Mail className="h-4 w-4" /></a>
          <a href={issueHref} target="_blank" rel="noreferrer" aria-label="Crear reporte en GitHub" title="Usar GitHub" className="grid h-11 w-11 place-items-center border border-white/15 text-[#a8c888] transition hover:border-[#6aab48]/60 hover:text-[#e8f2d8]"><GithubIcon className="h-4 w-4" /></a>
          <button type="submit" disabled={!canSubmit} className="inline-flex h-11 min-w-44 items-center justify-center gap-2 bg-[#b8e840] px-5 text-sm font-black text-[#0c110a] transition hover:bg-[#c7f35c] disabled:cursor-not-allowed disabled:opacity-45">
            {submitState === "submitting" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            {submitState === "submitting" ? "Enviando" : "Enviar a revisión"}
          </button>
        </div>
      </div>
    </form>
  );
}

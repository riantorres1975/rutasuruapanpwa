"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BusFront,
  CableCar,
  CircleDot,
  Clock3,
  Footprints,
  MapPin,
  Pause,
  Play,
} from "lucide-react";
import LandingSearch from "@/components/LandingSearch";
import { rememberNearbyRoutesRequest } from "@/lib/nearby-request";

type TripStepKind = "start" | "walk" | "bus" | "transfer" | "cable" | "finish";

type TripStep = {
  kind: TripStepKind;
  label: string;
  detail: string;
};

type PreviewTrip = {
  id: string;
  destination: string;
  routeLabel: string;
  duration: string;
  fare: string;
  color: string;
  steps: TripStep[];
};

const PREVIEW_TRIPS: PreviewTrip[] = [
  {
    id: "centro-historico",
    destination: "Centro Histórico",
    routeLabel: "Viaje directo",
    duration: "~18 min",
    fare: "$12 total",
    color: "#57d6e8",
    steps: [
      { kind: "start", label: "Central de Autobuses", detail: "Punto de partida del ejemplo" },
      { kind: "walk", label: "Camina 2 min", detail: "A la parada más cercana" },
      { kind: "bus", label: "Ruta 11", detail: "Baja cerca del Centro" },
      { kind: "finish", label: "Centro Histórico", detail: "Destino" },
    ],
  },
  {
    id: "mercado-poniente",
    destination: "Mercado Poniente",
    routeLabel: "Camión + Teleférico",
    duration: "~32 min",
    fare: "$24 total",
    color: "#ffd84d",
    steps: [
      { kind: "start", label: "Central de Autobuses", detail: "Punto de partida del ejemplo" },
      { kind: "bus", label: "Ruta 11", detail: "Baja en Presidencia" },
      { kind: "transfer", label: "Transbordo", detail: "Estación Presidencia" },
      { kind: "cable", label: "Teleférico", detail: "Dirección Mercado Poniente" },
      { kind: "finish", label: "Mercado Poniente", detail: "Destino" },
    ],
  },
  {
    id: "hospital-regional",
    destination: "Hospital Regional",
    routeLabel: "Camión + Teleférico",
    duration: "~35 min",
    fare: "$24 total",
    color: "#ffd84d",
    steps: [
      { kind: "start", label: "Central de Autobuses", detail: "Punto de partida del ejemplo" },
      { kind: "bus", label: "Ruta 11", detail: "Baja en Presidencia" },
      { kind: "transfer", label: "Transbordo", detail: "Estación Presidencia" },
      { kind: "cable", label: "Teleférico", detail: "Dirección Hospital Regional" },
      { kind: "finish", label: "Hospital Regional", detail: "Destino" },
    ],
  },
] as const;

const ROTATE_MS = 10_000;

function StepIcon({ kind }: { kind: TripStepKind }) {
  const className = "h-4 w-4";
  if (kind === "walk") return <Footprints className={className} aria-hidden="true" />;
  if (kind === "bus") return <BusFront className={className} aria-hidden="true" />;
  if (kind === "cable") return <CableCar className={className} aria-hidden="true" />;
  if (kind === "transfer") return <CircleDot className={className} aria-hidden="true" />;
  return <MapPin className={className} aria-hidden="true" />;
}

export default function LandingHeroPlanner() {
  const simulatorRef = useRef<HTMLDivElement | null>(null);
  const [activeTripIndex, setActiveTripIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReduceMotion(query.matches);
    syncPreference();
    query.addEventListener("change", syncPreference);
    return () => query.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    const element = simulatorRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.08 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isPlaying || !isVisible || reduceMotion) return;
    const timer = window.setInterval(() => {
      setActiveTripIndex((index) => (index + 1) % PREVIEW_TRIPS.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [isPlaying, isVisible, reduceMotion]);

  const trip = PREVIEW_TRIPS[activeTripIndex];
  const mapHref = `/mapa?destino=${encodeURIComponent(trip.destination)}`;
  const isMultimodal = trip.routeLabel.includes("Teleférico");
  const journeyMode = activeTripIndex === 1 ? "walking" : isMultimodal ? "cable" : "bus";
  const journeyImage = journeyMode === "walking"
    ? "/readme/modo-viaje-caminando.webp"
    : journeyMode === "cable"
      ? "/readme/modo-viaje-teleferico.webp"
      : "/readme/modo-viaje.webp";
  const journeyModeLabel = journeyMode === "walking"
    ? "Último tramo a pie"
    : journeyMode === "cable"
      ? "Teleférico Uruapan"
      : "Ruta 11";

  const handleTripSelection = (index: number) => {
    setActiveTripIndex(index);
  };

  return (
    <div className="mt-7 sm:mt-9">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <LandingSearch />
        <div className="flex gap-2 lg:pt-6">
          <Link
            href="/mapa?cerca=1"
            onClick={rememberNearbyRoutesRequest}
            className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-md bg-[#b8e840] px-5 text-sm font-black text-[#0c110a] transition hover:bg-[#c8f25b] lg:flex-none"
          >
            <CircleDot className="h-4 w-4" aria-hidden="true" />
            Rutas cerca de mí
          </Link>
          <a
            href="#como-funciona"
            className="inline-flex min-h-14 items-center justify-center rounded-md border border-white/15 px-4 text-sm font-bold text-[#dceaca] transition hover:border-white/30 hover:bg-white/5"
          >
            Cómo funciona
          </a>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Destinos populares">
        <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#6f895a]">
          Populares
        </span>
        {PREVIEW_TRIPS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleTripSelection(index)}
            className="animated-chip min-h-9 rounded-md border px-3 py-1.5 text-xs font-bold transition"
            style={
              index === activeTripIndex
                ? { borderColor: "rgba(184,232,64,0.6)", background: "#b8e840", color: "#0c110a" }
                : { borderColor: "rgba(232,242,216,0.14)", background: "rgba(232,242,216,0.03)", color: "#a8c888" }
            }
            aria-pressed={index === activeTripIndex}
          >
            {item.destination}
          </button>
        ))}
      </div>

      <div
        ref={simulatorRef}
        className="mt-8 border-t border-white/10 pt-5 sm:mt-10 sm:pt-7"
        data-testid="landing-trip-simulator"
      >
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#b8e840]">
              <span className="h-2 w-2 rounded-full bg-[#b8e840] shadow-[0_0_0_5px_rgba(184,232,64,0.1)]" aria-hidden="true" />
              Modo viaje
            </p>
            <h2 className="mt-2 font-serif text-2xl font-black text-[#e8f2d8] sm:text-3xl">
              Mira cómo te acompaña UruGo.
            </h2>
          </div>
          {!reduceMotion ? (
            <button
              type="button"
              onClick={() => setIsPlaying((playing) => !playing)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-white/15 bg-[#0c110a] text-[#dceaca] transition hover:border-[#b8e840]/60"
              aria-label={isPlaying ? "Pausar ejemplos de viaje" : "Reproducir ejemplos de viaje"}
              title={isPlaying ? "Pausar" : "Reproducir"}
            >
              {isPlaying ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
            </button>
          ) : null}
        </div>

        <div
          key={trip.id}
          id={`trip-panel-${trip.id}`}
          className="overflow-hidden rounded-lg border border-white/15 bg-[#10170e] lg:grid lg:grid-cols-[minmax(0,1fr)_320px]"
          role="region"
          aria-label={`Ejemplo de viaje a ${trip.destination}`}
        >
          <div className="landing-map-stage relative h-[280px] overflow-hidden bg-[#dfe4d8] sm:h-[360px] lg:h-[440px]">
            <Image
              src={journeyImage}
              alt={journeyMode === "walking"
                ? "Modo viaje de UruGo mostrando el último tramo caminando"
                : journeyMode === "cable"
                  ? "Modo viaje de UruGo siguiendo el recorrido del Teleférico"
                  : "Modo viaje de UruGo siguiendo el recorrido de un camión"}
              className="landing-journey-image object-cover"
              fill
              priority
              sizes="(min-width: 1240px) 860px, 100vw"
            />

            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md border border-white/20 bg-[#0c110a]/95 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#e8f2d8] sm:left-5 sm:top-5">
              <span className="h-2 w-2 rounded-full" style={{ background: trip.color }} aria-hidden="true" />
              {trip.routeLabel}
            </div>

            <div className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-md border border-white/15 bg-[#0c110a]/95 p-3 text-[#e8f2d8] shadow-[0_12px_35px_rgba(0,0,0,0.3)] sm:inset-x-auto sm:bottom-5 sm:left-5 sm:min-w-[310px] sm:p-4">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${journeyMode === "walking" ? "bg-[#4f8ee8] text-white" : journeyMode === "cable" ? "bg-[#00c9a7] text-[#061713]" : "bg-[#57d6e8] text-[#071114]"}`}>
                {journeyMode === "walking"
                  ? <Footprints className="h-5 w-5" aria-hidden="true" />
                  : journeyMode === "cable"
                    ? <CableCar className="h-5 w-5" aria-hidden="true" />
                    : <BusFront className="h-5 w-5" aria-hidden="true" />}
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-[#b8e840]">{journeyMode === "walking" ? "Último tramo" : "En camino"}</span>
                <strong className="mt-0.5 block truncate text-sm">{journeyModeLabel}</strong>
                <span className="mt-0.5 block truncate text-xs text-[#8daa74]">Siguiente: {trip.destination}</span>
              </span>
            </div>
          </div>

          <aside className="flex flex-col border-t border-white/10 p-5 sm:p-6 lg:border-l lg:border-t-0 lg:p-7">
            <p className="text-xs font-black uppercase tracking-[0.17em] text-[#b8e840]">Ruta sugerida</p>
            <h3 className="mt-3 font-serif text-2xl font-black leading-tight text-[#e8f2d8]">
              Central de Autobuses <span className="font-sans text-base font-normal text-[#6f895a]">→</span> {trip.destination}
            </h3>

            <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-white/10 bg-white/10">
              <div className="bg-[#10170e] p-4">
                <span className="block text-xs text-[#6f895a]">Tiempo estimado</span>
                <strong className="mt-1.5 flex items-center gap-1.5 text-sm text-[#e8f2d8]"><Clock3 className="h-4 w-4 text-[#b8e840]" aria-hidden="true" />{trip.duration}</strong>
              </div>
              <div className="bg-[#10170e] p-4">
                <span className="block text-xs text-[#6f895a]">Tarifa total</span>
                <strong className="mt-1.5 block text-sm text-[#e8f2d8]">{trip.fare}</strong>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-5" aria-label="Transportes del recorrido">
              <span className="inline-flex min-h-9 items-center gap-2 rounded-md bg-[#57d6e8] px-3 text-xs font-black text-[#071114]">
                <BusFront className="h-4 w-4" aria-hidden="true" /> Ruta 11
              </span>
              {isMultimodal ? (
                <>
                  <ArrowRight className="h-4 w-4 text-[#6f895a]" aria-hidden="true" />
                  <span className="inline-flex min-h-9 items-center gap-2 rounded-md bg-[#ffd84d] px-3 text-xs font-black text-[#171303]">
                    <CableCar className="h-4 w-4" aria-hidden="true" /> Teleférico
                  </span>
                </>
              ) : null}
            </div>

            <Link
              href={mapHref}
              className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#6aab48] px-5 text-sm font-black text-[#0c110a] transition hover:bg-[#b8e840] lg:mt-auto"
            >
              Ver recorrido completo
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </aside>
        </div>

        <ol className="hero-trip-steps border-b border-white/10 py-6" aria-label={`Pasos para llegar a ${trip.destination}`}>
          {trip.steps.map((step, index) => (
            <li
              key={`${step.kind}-${step.label}`}
              className={`hero-trip-step hero-trip-step-${step.kind}`}
              style={{ "--step-delay": `${index * 130}ms` } as CSSProperties}
            >
              <span className="hero-trip-connector" aria-hidden="true">
                {step.kind === "bus" || step.kind === "cable" ? (
                  <span className="hero-trip-moving-vehicle"><StepIcon kind={step.kind} /></span>
                ) : null}
              </span>
              <span className="hero-trip-node" aria-hidden="true"><StepIcon kind={step.kind} /></span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-tight text-[#e8f2d8]">{step.label}</span>
                <span className="mt-1 block text-xs leading-snug text-[#6f895a]">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="pt-5">
          <p className="max-w-md text-xs leading-5 text-[#6f895a]">
            Ejemplo desde la Central de Autobuses. En el mapa real, el cálculo comienza desde tu origen.
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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
  steps: TripStep[];
};

const PREVIEW_TRIPS: PreviewTrip[] = [
  {
    id: "centro-historico",
    destination: "Centro Histórico",
    routeLabel: "Viaje directo",
    duration: "~18 min",
    fare: "$12 total",
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
    steps: [
      { kind: "start", label: "Central de Autobuses", detail: "Punto de partida del ejemplo" },
      { kind: "bus", label: "Ruta 11", detail: "Baja en Presidencia" },
      { kind: "transfer", label: "Transbordo", detail: "Estación Presidencia" },
      { kind: "cable", label: "Teleférico", detail: "Dirección Hospital Regional" },
      { kind: "finish", label: "Hospital Regional", detail: "Destino" },
    ],
  },
] as const;

const ROTATE_MS = 6_500;

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

  const handleTripSelection = (index: number) => {
    setActiveTripIndex(index);
    setIsPlaying(false);
  };

  return (
    <div className="mt-7">
      <div className="lg:[&>div]:mx-auto">
        <LandingSearch />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 lg:justify-center" aria-label="Destinos populares">
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          Populares
        </span>
        {PREVIEW_TRIPS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleTripSelection(index)}
            className="animated-chip min-h-9 rounded-md border px-3.5 py-1.5 text-xs font-semibold transition"
            style={
              index === activeTripIndex
                ? { borderColor: "rgba(184,232,64,0.5)", background: "rgba(184,232,64,0.12)", color: "var(--lima)" }
                : { borderColor: "rgba(140,200,80,0.15)", background: "rgba(106,171,72,0.06)", color: "var(--ink2)" }
            }
            aria-pressed={index === activeTripIndex}
          >
            {item.destination}
          </button>
        ))}
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-3 lg:justify-center">
        <Link
          href="/mapa?cerca=1"
          className="inline-flex min-h-12 items-center gap-2 rounded-md px-6 text-sm font-semibold text-ink-900 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(106,171,72,0.28)]"
          style={{ background: "var(--verde)" }}
        >
          <CircleDot className="h-4 w-4" aria-hidden="true" />
          Rutas cerca de mí
        </Link>
        <a
          href="#como-funciona"
          className="inline-flex min-h-12 items-center gap-1.5 px-2 text-sm font-semibold underline-offset-4 transition hover:underline"
          style={{ color: "var(--ink2)" }}
        >
          Cómo funciona
          <span aria-hidden="true">↓</span>
        </a>
      </div>

      <div
        ref={simulatorRef}
        className="mt-10 border-y py-6 sm:py-8"
        style={{ borderColor: "rgba(140,200,80,0.16)" }}
        data-testid="landing-trip-simulator"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--verde)" }}>
              <span className="h-2 w-2 rounded-full bg-[#b8e840]" aria-hidden="true" />
              Viaje en vivo
            </p>
            <h2 className="mt-2 font-serif text-2xl font-black sm:text-3xl" style={{ color: "var(--ink)" }}>
              Así se vería tu recorrido.
            </h2>
            <p className="mt-1 text-xs sm:text-sm" style={{ color: "var(--muted)" }}>
              Ejemplo desde la Central de Autobuses · el cálculo real usa tu origen.
            </p>
          </div>
          {!reduceMotion ? (
            <button
              type="button"
              onClick={() => setIsPlaying((playing) => !playing)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-md border transition hover:border-[#b8e840]/50"
              style={{ borderColor: "var(--ov-border)", color: "var(--ink2)" }}
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
          className="mt-7"
          role="region"
          aria-label={`Ejemplo de viaje a ${trip.destination}`}
        >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
                {trip.routeLabel}
              </p>
              <p className="mt-1 font-serif text-xl font-black" style={{ color: "var(--ink)" }}>
                Central de Autobuses <span className="font-sans text-base font-normal" style={{ color: "var(--muted)" }}>→</span> {trip.destination}
              </p>
            </div>
            <div
              className="flex items-center gap-1.5"
              role="img"
              aria-label={`Ejemplo ${activeTripIndex + 1} de ${PREVIEW_TRIPS.length}`}
            >
              {PREVIEW_TRIPS.map((item, index) => (
                <span
                  key={item.id}
                  className={`h-1.5 rounded-full transition-all ${index === activeTripIndex ? "w-7 bg-[#b8e840]" : "w-1.5 bg-[#e8f2d8]/20"}`}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>

          <ol className="hero-trip-steps" aria-label={`Pasos para llegar a ${trip.destination}`}>
            {trip.steps.map((step, index) => (
              <li
                key={`${step.kind}-${step.label}`}
                className={`hero-trip-step hero-trip-step-${step.kind}`}
                style={{ "--step-delay": `${index * 130}ms` } as CSSProperties}
              >
                <span className="hero-trip-connector" aria-hidden="true">
                  {step.kind === "bus" || step.kind === "cable" ? (
                    <span className="hero-trip-moving-vehicle">
                      <StepIcon kind={step.kind} />
                    </span>
                  ) : null}
                </span>
                <span className="hero-trip-node" aria-hidden="true">
                  <StepIcon kind={step.kind} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold leading-tight" style={{ color: "var(--ink)" }}>{step.label}</span>
                  <span className="mt-1 block text-xs leading-snug" style={{ color: "var(--muted)" }}>{step.detail}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-7 grid gap-4 border-t pt-5 sm:grid-cols-[auto_auto_1fr] sm:items-center" style={{ borderColor: "var(--ov-border)" }}>
          <div className="flex min-w-32 items-center gap-3">
            <Clock3 className="h-5 w-5 text-[#b8e840]" aria-hidden="true" />
            <span>
              <strong className="block text-base" style={{ color: "var(--ink)" }}>{trip.duration}</strong>
              <span className="block text-[11px]" style={{ color: "var(--muted)" }}>Tiempo aproximado</span>
            </span>
          </div>
          <div className="min-w-32 sm:border-l sm:pl-5" style={{ borderColor: "var(--ov-border)" }}>
            <strong className="block font-sans text-base" style={{ color: "var(--ink)" }}>{trip.fare}</strong>
            <span className="block text-[11px]" style={{ color: "var(--muted)" }}>$12 por abordaje</span>
          </div>
          <Link
            href={mapHref}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 text-sm font-black text-ink-900 transition hover:bg-[#b8e840] sm:justify-self-end"
            style={{ background: "var(--verde)" }}
          >
            Ver recorrido completo
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BusFront, CableCar, MapPin } from "lucide-react";
import HeroMap from "@/components/HeroMap";
import LandingSearch from "@/components/LandingSearch";
import StatsAnimados from "@/components/StatsAnimados";
import ForceDark from "@/components/ForceDark";
import FareUpdateNotice from "@/components/FareUpdateNotice";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import {
  APP_BRAND,
  FARES_2026,
  LANDING_FAQS,
  LANDING_SEARCH_SUGGESTIONS,
  TELEFERICO_URUAPAN
} from "@/lib/mobility-config";
import { getPlaceSeoItems, getRoutesNearPlace, walkMinutesFor } from "@/lib/como-llegar";
import { SITE_URL } from "@/lib/site-url";

const HOW_IT_WORKS_STEPS = [
  { n: "01", title: "Abre el mapa", desc: "Todas las rutas ya cargadas, sin instalación ni cuenta." },
  { n: "02", title: "Marca tu origen", desc: "Toca el mapa o usa tu ubicación automática." },
  { n: "03", title: "Marca tu destino", desc: "El mapa detecta las rutas más cercanas." },
  { n: "04", title: "Compara opciones", desc: "Ve la ruta recomendada, tiempo y alternativas." },
] as const;

const HOW_IT_WORKS_BORDERS = [
  "border-b border-r lg:border-b-0",
  "border-b lg:border-b-0 lg:border-r",
  "border-r",
  "",
] as const;

const DEFERRED_SECTION = "[content-visibility:auto] [contain-intrinsic-size:auto_560px]";
const URBAN_FARE_DISPLAY = FARES_2026.urbanBus.price.replace(/\.00$/, "");
const TELEFERICO_FARE_DISPLAY = FARES_2026.teleferico.price.replace(/\.00$/, "");

const FEATURED_PLACE_LABELS = [
  "Centro",
  "Hospital Regional",
  "Central de Autobuses",
  "IMSS Hospital General de Zona 8",
  "Mercado Poniente",
  "Presidencia Municipal",
  "Unidad Deportiva",
  "Parque Lineal Cupatitzio",
] as const;

// Calculado en build: cuántas rutas dejan cerca de cada lugar destacado.
const allSeoPlaces = getPlaceSeoItems();
const featuredPlaces = FEATURED_PLACE_LABELS.map((label) => {
  const place = allSeoPlaces.find((p) => p.label === label);
  if (!place) return null;
  const routes = getRoutesNearPlace(place.center);
  if (routes.length === 0) return null;
  return {
    slug: place.slug,
    label: place.label,
    routeCount: routes.length,
    nearestWalkMin: walkMinutesFor(routes[0].distanceM),
  };
}).filter((p): p is NonNullable<typeof p> => p !== null);

export const metadata: Metadata = {
  // Título orientado a CTR: palabra clave + beneficio al frente, marca al final.
  // La búsqueda "rutas uruapan" escanea el inicio del título, no la marca.
  title: {
    absolute: "Rutas de camiones en Uruapan: mapa y horarios | UruGo"
  },
  description:
    "Encuentra qué camión tomar en Uruapan en segundos. Las 40 rutas y el Teleférico en un mapa interactivo, con horarios y tarifas 2026. Gratis, sin registro.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "UruGo | Encuentra tu ruta en Uruapan",
    description: "Rutas de camiones urbanos y Teleférico en un solo mapa para Uruapan, Michoacán.",
    url: SITE_URL,
    siteName: "UruGo",
    images: [{ url: `${SITE_URL}/api/og`, width: 1200, height: 630, alt: "UruGo — rutas de camiones y Teleférico en Uruapan" }],
    locale: "es_MX",
    type: "website"
  }
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: LANDING_FAQS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer }
  }))
};

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: APP_BRAND.name,
  url: SITE_URL,
  applicationCategory: "TravelApplication",
  operatingSystem: "Web, Android, iOS",
  description: APP_BRAND.description,
  offers: { "@type": "Offer", price: "0", priceCurrency: "MXN" },
  areaServed: { "@type": "City", name: "Uruapan, Michoacán" }
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: APP_BRAND.name,
  url: SITE_URL,
  logo: `${SITE_URL}/icons/icon-512.png`,
  areaServed: { "@type": "City", name: "Uruapan, Michoacán" }
};

export default function LandingPage() {
  return (
    <main
        className="greca-bg min-h-dvh overflow-hidden"
        data-theme="dark"
        style={{
          background: "#0c110a",
          color: "#e8f2d8",
          "--background": "#0c110a",
          "--foreground": "#e8f2d8",
          "--ov-border": "rgba(140,200,80,0.10)",
          "--ov-bg": "rgba(12,17,10,0.97)",
          "--ov-text": "#e8f2d8",
          "--ink": "#e8f2d8",
          "--ink2": "#a8c888",
          "--muted": "#729260",
          "--card": "#141c10",
          "--verde": "#6aab48",
          "--verde-l": "rgba(106,171,72,0.12)",
          "--verde-d": "#3d6828",
          "--lima": "#b8e840",
          "--agua": "#48a878",
          "--agua-l": "rgba(72,168,120,0.12)",
        } as React.CSSProperties}
      >
      <ForceDark />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />

      <PublicHeader />
      <FareUpdateNotice />

      {/* ── HERO ── */}
      <section className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-8 px-5 pb-12 pt-28 lg:grid-cols-2 lg:gap-16 lg:pb-16 lg:pt-32">
        <div className="relative z-10">
          {/* Eyebrow */}
          <div
            className="animate-fade-up mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest"
            style={{
              background: "var(--verde-l)",
              border: "1px solid rgba(140,200,80,0.2)",
              color: "var(--verde)",
            }}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--lima)" }} />
            Uruapan, Michoacán
          </div>

          {/* H1 */}
          <h1
            className="animate-fade-up animate-delay-100 font-serif text-5xl font-black leading-[1.02] sm:text-6xl lg:text-7xl"
          >
            Encuentra qué camión tomar en{" "}
            <em style={{ fontStyle: "italic", color: "var(--lima)" }}>Uruapan.</em>
          </h1>

          <p className="animate-fade-up animate-delay-200 mt-5 max-w-sm text-base leading-relaxed" style={{ color: "var(--ink2)" }}>
            Busca tu destino, compara rutas y combina camión con Teleférico en un mapa hecho aquí. Sin cuentas ni anuncios.
          </p>

          {/* Search form con autocompletado (mejora progresiva: funciona sin JS) */}
          <div className="animate-fade-up animate-delay-300">
            <LandingSearch />
          </div>

          {/* Chips */}
          <div className="animate-fade-up animate-delay-400 mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              Populares
            </span>
            {LANDING_SEARCH_SUGGESTIONS.slice(0, 3).map((item) => (
              <Link
                key={item}
                href={`/mapa?destino=${encodeURIComponent(item)}`}
                className="animated-chip inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold transition"
                style={{
                  borderColor: "rgba(140,200,80,0.15)",
                  background: "rgba(106,171,72,0.06)",
                  color: "var(--ink2)",
                }}
              >
                {item}
              </Link>
            ))}
          </div>

          {/* CTAs */}
          <div className="animate-fade-up animate-delay-500 mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/mapa?cerca=1"
              className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-ink-900 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(106,171,72,0.35)]"
              style={{ background: "var(--verde)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                <circle cx="12" cy="12" r="4" fill="currentColor" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Rutas cerca de mí
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex items-center gap-1.5 px-2 py-3.5 text-sm font-semibold underline-offset-4 transition hover:underline"
              style={{ color: "var(--ink2)" }}
            >
              Cómo funciona
              <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>

        {/* Columna derecha: mapa animado */}
        <div className="animate-fade-up animate-delay-200 relative mx-auto w-full max-w-sm lg:max-w-none">
          <div className="absolute -inset-8 rounded-[3rem] blur-3xl" style={{ background: "rgba(106,171,72,0.08)" }} />
          <HeroMap />
        </div>
      </section>

      {/* ── STATS ── */}
      <StatsAnimados />

      {/* ── TRANSPORTE ── */}
      <section id="transporte" className="mx-auto max-w-[1200px] px-5 py-14 lg:py-24">
        <div
          className="mb-8 flex items-baseline justify-between border-b pb-4"
          style={{ borderColor: "var(--ov-border)" }}
        >
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              Cómo moverte
            </p>
            <h2 className="font-serif text-3xl font-black">
              Dos formas de cruzar{" "}
              <em style={{ fontStyle: "italic", color: "var(--lima)" }}>la ciudad.</em>
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Card Camión */}
          <Link
            href="/rutas"
            className="group flex min-h-[300px] flex-col rounded-lg border border-[var(--ov-border)] p-5 transition-all hover:-translate-y-1 hover:border-[#6aab48]/40 hover:shadow-[0_24px_50px_rgba(0,0,0,0.4)] sm:min-h-[330px] sm:p-7"
            style={{ background: "var(--card, #141c10)" }}
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-[#b8e840]" style={{ background: "var(--verde-l)" }} aria-hidden="true">
                <BusFront className="h-6 w-6" strokeWidth={1.8} />
              </span>
              <span
                className="rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider"
                style={{ background: "rgba(23,32,18,0.8)", color: "var(--muted)", border: "1px solid var(--ov-border)" }}
              >{URBAN_FARE_DISPLAY} · Efectivo</span>
            </div>
            <h3 className="text-base font-bold" style={{ color: "var(--ink2)" }}>Camión urbano</h3>
            <div className="mt-2 font-serif text-4xl font-black leading-none sm:text-5xl" style={{ color: "var(--ink)" }}>
              40 <span className="text-sm font-sans font-semibold" style={{ color: "var(--muted)" }}>rutas</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              Cubren toda la ciudad, de las colonias al Centro. La mayoría se pagan en efectivo al subir.
            </p>
            <span className="mt-auto inline-flex min-h-10 items-center gap-2 pt-4 text-xs font-bold" style={{ color: "var(--lima)" }}>
              Ver las 40 rutas
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </Link>

          {/* Card Teleférico */}
          <Link
            href="/teleferico-uruapan-horario"
            className="group flex min-h-[300px] flex-col rounded-lg border border-[var(--ov-border)] p-5 transition-all hover:-translate-y-1 hover:border-[#48a878]/45 hover:shadow-[0_24px_50px_rgba(0,0,0,0.4)] sm:min-h-[330px] sm:p-7"
            style={{ background: "var(--card, #141c10)" }}
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-[#70c9a0]" style={{ background: "var(--agua-l)" }} aria-hidden="true">
                <CableCar className="h-6 w-6" strokeWidth={1.8} />
              </span>
              <span
                className="rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider"
                style={{ background: "rgba(23,32,18,0.8)", color: "var(--muted)", border: "1px solid var(--ov-border)" }}
              >{TELEFERICO_FARE_DISPLAY} · Tarjeta</span>
            </div>
            <h3 className="text-base font-bold" style={{ color: "var(--ink2)" }}>Teleférico Uruapan</h3>
            <div className="mt-2 font-serif text-4xl font-black leading-none sm:text-5xl" style={{ color: "var(--ink)" }}>
              6 <span className="text-sm font-sans font-semibold" style={{ color: "var(--muted)" }}>estaciones</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              Único en Michoacán. Cruza la ciudad de oriente a poniente. Opera {TELEFERICO_URUAPAN.hours}.
            </p>
            <span className="mt-auto inline-flex min-h-10 items-center gap-2 pt-4 text-xs font-bold" style={{ color: "var(--lima)" }}>
              Guía del Teleférico
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </Link>
        </div>
      </section>

      {/* ── CUATRO PASOS ── */}
      <section id="como-funciona" className={`mx-auto max-w-[1200px] scroll-mt-20 px-5 pb-16 lg:pb-24 ${DEFERRED_SECTION}`}>
        <div className="mb-8 border-b pb-4" style={{ borderColor: "var(--ov-border)" }}>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
            Cómo se usa
          </p>
          <h2 className="font-serif text-3xl font-black">
            Cuatro pasos.{" "}
            <em style={{ fontStyle: "italic", color: "var(--lima)" }}>Sin más.</em>
          </h2>
        </div>
        <div
          className="grid grid-cols-2 overflow-hidden rounded-lg lg:grid-cols-4"
          style={{ background: "var(--card, #141c10)", border: "1px solid var(--ov-border)" }}
        >
          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <div
              key={step.n}
              className={`border-[var(--ov-border)] p-5 transition-colors hover:bg-[rgba(23,32,18,0.8)] sm:p-6 ${HOW_IT_WORKS_BORDERS[i]}`}
            >
              <div className="mb-4 font-serif text-3xl font-bold leading-none" style={{ color: "var(--lima)", opacity: 0.55 }}>
                {step.n}
              </div>
              <p className="mb-1.5 text-sm font-semibold" style={{ color: "var(--ink)" }}>{step.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CÓMO LLEGAR (SEO interno + utilidad) ── */}
      <section className={`mx-auto max-w-[1200px] px-5 pb-16 lg:pb-24 ${DEFERRED_SECTION}`}>
        <div
          className="mb-8 flex flex-wrap items-end justify-between gap-3 border-b pb-4"
          style={{ borderColor: "var(--ov-border)" }}
        >
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              Lugares frecuentes
            </p>
            <h2 className="font-serif text-3xl font-black">
              ¿Cómo llegar{" "}
              <em style={{ fontStyle: "italic", color: "var(--lima)" }}>a...?</em>
            </h2>
          </div>
          <Link
            href="/como-llegar"
            className="inline-flex items-center gap-1.5 text-sm font-semibold transition hover:opacity-80"
            style={{ color: "var(--lima)" }}
          >
            Ver todos los lugares →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {featuredPlaces.map((place) => (
            <Link
              key={place.slug}
              href={`/como-llegar/${place.slug}`}
              className="card-lift group grid min-h-[88px] grid-cols-[36px_1fr_auto] items-center gap-3 rounded-lg border p-4 sm:min-h-[132px] sm:grid-cols-[36px_1fr] sm:items-start"
              style={{ background: "var(--card, #141c10)", borderColor: "var(--ov-border)" }}
            >
              <span className="grid h-9 w-9 place-items-center rounded-md bg-[#6aab48]/10 text-[#b8e840]" aria-hidden="true">
                <MapPin className="h-4 w-4" strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-snug" style={{ color: "var(--ink)" }}>{place.label}</span>
                <span className="mt-1 block text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                  {place.routeCount} {place.routeCount === 1 ? "ruta te deja" : "rutas te dejan"} cerca · {place.nearestWalkMin} min a pie
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-[#b8e840] transition-transform group-hover:translate-x-1 sm:col-start-2 sm:mt-1" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className={`mx-auto max-w-[1200px] px-5 pb-16 lg:pb-24 ${DEFERRED_SECTION}`}>
        <div className="mb-8 border-b pb-4" style={{ borderColor: "var(--ov-border)" }}>
          <h2 className="font-serif text-3xl font-black" style={{ color: "var(--ink)" }}>
            Preguntas frecuentes
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {LANDING_FAQS.slice(0, 4).map((item) => (
            <details
              key={item.question}
              className="card-lift group rounded-lg border backdrop-blur open:border-verde-400/30"
              style={{ background: "var(--card, #141c10)", borderColor: "var(--ov-border)" }}
            >
              <summary className="font-serif-display flex cursor-pointer list-none items-center justify-between gap-3 p-5 text-base font-black [&::-webkit-details-marker]:hidden" style={{ color: "var(--ink)" }}>
                {item.question}
                <span className="shrink-0 text-lg transition-transform duration-200 group-open:rotate-45" style={{ color: "var(--lima)" }} aria-hidden="true">+</span>
              </summary>
              <p className="px-5 pb-5 text-sm leading-6" style={{ color: "var(--ink2)" }}>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <div className={`mx-auto max-w-[1200px] px-5 pb-16 lg:pb-24 ${DEFERRED_SECTION}`}>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            background: "linear-gradient(135deg, #3d6828 0%, #2a4a1a 50%, #1a3a28 100%)",
            borderRadius: "8px",
            padding: "clamp(3rem, 8vw, 4.5rem) clamp(1.25rem, 5vw, 2.5rem)",
            textAlign: "center",
            border: "1px solid rgba(106,171,72,0.2)",
          }}
        >
          {/* Hoja izquierda */}
          <svg
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: 0,
              left: "1.5rem",
              width: "80px",
              opacity: 0.18,
              pointerEvents: "none",
            }}
            viewBox="0 0 80 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M40 120 C40 120 38 80 35 55 C32 30 20 10 20 10" stroke="#b8e840" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M35 55 C20 45 5 30 8 15 C11 0 30 5 38 20 C42 30 40 45 35 55Z" fill="#b8e840" />
            <path d="M37 75 C50 65 62 55 58 42 C54 29 40 35 37 48 C35 58 36 68 37 75Z" fill="#b8e840" />
            <path d="M33 38 C22 28 18 15 25 8 C32 1 42 12 38 25 C36 32 34 36 33 38Z" fill="#b8e840" opacity="0.7" />
          </svg>

          {/* Hoja derecha — espejada */}
          <svg
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: 0,
              right: "1.5rem",
              width: "80px",
              opacity: 0.18,
              pointerEvents: "none",
              transform: "scaleX(-1)",
            }}
            viewBox="0 0 80 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M40 120 C40 120 38 80 35 55 C32 30 20 10 20 10" stroke="#b8e840" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M35 55 C20 45 5 30 8 15 C11 0 30 5 38 20 C42 30 40 45 35 55Z" fill="#b8e840" />
            <path d="M37 75 C50 65 62 55 58 42 C54 29 40 35 37 48 C35 58 36 68 37 75Z" fill="#b8e840" />
            <path d="M33 38 C22 28 18 15 25 8 C32 1 42 12 38 25 C36 32 34 36 33 38Z" fill="#b8e840" opacity="0.7" />
          </svg>

          <div className="relative z-10">
            <h2
              className="font-serif text-5xl font-black sm:text-6xl"
              style={{ color: "#e8f2d8" }}
            >
              ¿A dónde vas<br />
              <em style={{ fontStyle: "italic", color: "#b8e840" }}>hoy?</em>
            </h2>
            <p className="mx-auto mt-4 max-w-xs text-sm" style={{ color: "rgba(232,242,216,0.55)" }}>
              Abre el mapa ahora mismo. Sin registro, sin pago, sin anuncios.
            </p>
            <Link
              href="/mapa"
              className="mt-8 inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-bold transition-all hover:scale-[1.04] hover:shadow-[0_0_40px_rgba(184,232,64,0.3)]"
              style={{ background: "#b8e840", color: "#0c110a" }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2.2" fill="currentColor" />
              </svg>
              Abrir mapa gratis
            </Link>
          </div>
        </div>
      </div>

      <PublicFooter />
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import MadeByFooter from "@/components/MadeByFooter";
import HeroMap from "@/components/HeroMap";
import FareTicket from "@/components/FareTicket";
import NotGovernmentNotice from "@/components/NotGovernmentNotice";
import Logo from "@/components/Logo";
import StatsAnimados from "@/components/StatsAnimados";
import FallingLeaves from "@/components/FallingLeaves";
import ForceDark from "@/components/ForceDark";
import {
  APP_BRAND,
  FARES_2026,
  LANDING_FAQS,
  LANDING_SEARCH_SUGGESTIONS,
  TELEFERICO_URUAPAN
} from "@/lib/mobility-config";

const HOW_IT_WORKS_STEPS = [
  { n: "01", title: "Abre el mapa", desc: "Todas las rutas ya cargadas, sin instalación ni cuenta." },
  { n: "02", title: "Marca tu origen", desc: "Toca el mapa o usa tu ubicación automática." },
  { n: "03", title: "Marca tu destino", desc: "El mapa detecta las rutas más cercanas." },
  { n: "04", title: "Compara opciones", desc: "Ve la ruta recomendada, tiempo y alternativas." },
] as const;

export const metadata: Metadata = {
  title: {
    absolute: "VoyUruapan | Rutas de camiones y Teleférico en Uruapan"
  },
  description:
    "Consulta rutas de camiones Uruapan, horario del Teleférico Uruapan, tarifas 2026 y opciones para moverte en transporte público.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "VoyUruapan | Encuentra tu ruta en Uruapan",
    description: "Rutas de camiones urbanos y Teleférico en un solo mapa para Uruapan, Michoacán.",
    url: "/",
    siteName: "VoyUruapan",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "VoyUruapan — rutas de camiones y Teleférico en Uruapan" }],
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
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://rutasuruapanpwa.vercel.app",
  logo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://rutasuruapanpwa.vercel.app"}/icons/icon-512.png`,
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
          "--muted": "#5a7848",
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
      <FallingLeaves />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />

      {/* ── NAV ── */}
      <nav
        className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-5 py-4"
        style={{
          background: "rgba(12,17,10,0.88)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(140,200,80,0.08)",
        }}
      >
        <Logo size={28} showName showSub />
        <Link
          href="/mapa"
          className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.03]"
          style={{ background: "var(--verde)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="10" r="2.2" fill="currentColor" />
          </svg>
          Abrir mapa
        </Link>
      </nav>

      {/* ── HERO ── */}
      <section className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-8 px-5 pb-12 pt-28 lg:grid-cols-2 lg:gap-12">
        <div className="relative z-10">
          {/* Eyebrow */}
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest"
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
            className="font-serif text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
            style={{ letterSpacing: "-0.025em" }}
          >
            Moverse por{" "}
            <em style={{ fontStyle: "italic", color: "var(--verde)" }}>Uruapan,</em>
            <br />
            tan fácil<br />
            <span style={{ color: "var(--lima)" }}>como respirar.</span>
          </h1>

          <p className="mt-5 max-w-sm text-base leading-relaxed" style={{ color: "var(--ink2)" }}>
            Camiones urbanos y el único Teleférico de Michoacán en un mapa
            hecho aquí, para Uruapan. Sin cuentas, sin anuncios.
          </p>

          {/* Badge Parque Nacional */}
          <div
            className="mt-4 inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium"
            style={{
              background: "var(--agua-l)",
              border: "1px solid rgba(72,168,120,0.25)",
              color: "var(--agua)",
            }}
          >
            🌲 Cerca del Parque Nacional Eduardo Ruiz
          </div>

          {/* Search form */}
          <form action="/mapa" className="mt-6 max-w-xl rounded-3xl border p-2 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl"
            style={{ borderColor: "var(--ov-border)", background: "rgba(12,17,10,0.85)" }}
          >
            <label className="sr-only" htmlFor="destino">¿A dónde vas?</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <svg viewBox="0 0 24 24" fill="none" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" style={{ color: "var(--muted)" }} aria-hidden="true">
                  <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="10" r="2" fill="currentColor" />
                </svg>
                <input
                  id="destino"
                  name="destino"
                  placeholder="¿A dónde vas? Ej. Parque Nacional"
                  className="h-12 w-full rounded-2xl border pl-12 pr-4 text-sm font-medium outline-none transition"
                  style={{
                    background: "rgba(106,171,72,0.06)",
                    borderColor: "rgba(140,200,80,0.15)",
                    color: "var(--ink)",
                  }}
                />
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

          {/* Chips */}
          <div className="mt-4 flex flex-wrap gap-2">
            {LANDING_SEARCH_SUGGESTIONS.slice(0, 6).map((item) => (
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
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/mapa"
              className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(106,171,72,0.35)]"
              style={{ background: "var(--verde)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2.2" fill="currentColor" />
              </svg>
              Ver el mapa
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex items-center gap-2 rounded-full border px-7 py-3.5 text-sm font-medium transition-all"
              style={{ borderColor: "rgba(140,200,80,0.2)", color: "var(--ink2)" }}
            >
              Cómo funciona
            </a>
          </div>
        </div>

        {/* Columna derecha: mapa animado */}
        <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
          <div className="absolute -inset-8 rounded-[3rem] blur-3xl" style={{ background: "rgba(106,171,72,0.08)" }} />
          <HeroMap />
        </div>
      </section>

      {/* ── STATS ── */}
      <StatsAnimados />

      {/* ── TRANSPORTE ── */}
      <section id="como-funciona" className="mx-auto max-w-[1200px] px-5 py-16">
        <div
          className="mb-8 flex items-baseline justify-between border-b pb-4"
          style={{ borderColor: "var(--ov-border)" }}
        >
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              Cómo moverte
            </p>
            <h2 className="font-serif text-3xl font-black tracking-tight" style={{ letterSpacing: "-0.02em" }}>
              Dos formas de cruzar{" "}
              <em style={{ fontStyle: "italic", color: "var(--lima)" }}>la ciudad.</em>
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Card Camión */}
          <div
            className="group rounded-2xl p-7 transition-all hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(0,0,0,0.4)]"
            style={{ background: "var(--card, #141c10)", border: "1px solid var(--ov-border)" }}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl text-xl" style={{ background: "var(--verde-l)" }}>🚌</div>
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
                style={{ background: "rgba(23,32,18,0.8)", color: "var(--muted)", border: "1px solid var(--ov-border)" }}
              >Efectivo</span>
            </div>
            <div className="font-serif text-5xl font-black leading-none tracking-tight" style={{ color: "var(--ink)" }}>
              {FARES_2026.urbanBus.price} <span className="text-base font-sans font-normal" style={{ color: "var(--muted)" }}>MXN</span>
            </div>
            <p className="mt-1.5 text-sm font-semibold" style={{ color: "var(--ink2)" }}>Camión urbano</p>
            <p className="mt-2.5 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              41 rutas para moverte por toda la ciudad. La mayoría se pagan en efectivo al subir.
            </p>
          </div>

          {/* Card Teleférico */}
          <div
            className="group rounded-2xl p-7 transition-all hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(0,0,0,0.4)]"
            style={{ background: "var(--card, #141c10)", border: "1px solid var(--ov-border)" }}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl text-xl" style={{ background: "var(--agua-l)" }}>🚡</div>
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
                style={{ background: "rgba(23,32,18,0.8)", color: "var(--muted)", border: "1px solid var(--ov-border)" }}
              >Tarjeta movilidad</span>
            </div>
            <div className="font-serif text-5xl font-black leading-none tracking-tight" style={{ color: "var(--ink)" }}>
              {FARES_2026.teleferico.price} <span className="text-base font-sans font-normal" style={{ color: "var(--muted)" }}>MXN</span>
            </div>
            <p className="mt-1.5 text-sm font-semibold" style={{ color: "var(--ink2)" }}>Teleférico Uruapan</p>
            <p className="mt-2.5 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              Único en Michoacán. Conecta oriente-poniente con 6 estaciones. Opera {TELEFERICO_URUAPAN.hours}.
            </p>
          </div>
        </div>
      </section>

      {/* ── TARIFAS ── */}
      <section id="tarifas" className="mx-auto max-w-[1200px] px-5 pb-16">
        <div className="mb-8 border-b pb-4" style={{ borderColor: "var(--ov-border)" }}>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
            Tarifas 2026
          </p>
          <h2 className="font-serif text-3xl font-black tracking-tight" style={{ letterSpacing: "-0.02em" }}>
            Lo que cuesta{" "}
            <em style={{ fontStyle: "italic", color: "var(--lima)" }}>moverte.</em>
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {(["urban", "teleferico", "card"] as const).map((variant, index) => {
            const key = variant === "urban" ? "urbanBus" : variant === "teleferico" ? "teleferico" : "mobilityCard";
            const fare = FARES_2026[key];
            const serial = `BOLETO 0${index + 1}`;
            return (
              <div key={key} className="animate-fade-up" style={{ animationDelay: `${index * 100}ms` }}>
                <FareTicket label={fare.label} price={fare.price} payment={fare.payment} serial={serial} variant={variant} />
              </div>
            );
          })}
        </div>
      </section>

      {/* ── ESTACIONES TELEFÉRICO ── */}
      <section className="mx-auto max-w-[1200px] px-5 pb-16">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              Único en Michoacán
            </p>
            <h2 className="mt-2 font-serif text-3xl font-black tracking-tight" style={{ letterSpacing: "-0.02em" }}>
              Seis estaciones{" "}
              <em style={{ fontStyle: "italic", color: "var(--lima)" }}>de oriente a poniente.</em>
            </h2>
            <p className="mt-4 text-sm leading-7" style={{ color: "var(--ink2)" }}>
              El Teleférico opera todos los días de {TELEFERICO_URUAPAN.hours}. Cuesta {TELEFERICO_URUAPAN.fare} y se valida con tarjeta electrónica de movilidad.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/teleferico-uruapan-horario"
                className="cta-shine inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-black text-white hover:opacity-90"
                style={{ background: "var(--verde)" }}
              >
                Guía del Teleférico
              </Link>
              <Link
                href="/mapa?destino=Teleferico%20Uruapan"
                className="inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-bold transition"
                style={{ borderColor: "rgba(140,200,80,0.2)", color: "var(--ink2)" }}
              >
                Ver en el mapa
              </Link>
            </div>
          </div>
          <div className="relative">
            <div
              className="absolute left-[18px] top-2 bottom-2 w-px"
              style={{ background: "linear-gradient(to bottom, transparent, rgba(106,171,72,0.4), transparent)" }}
              aria-hidden="true"
            />
            <ol className="space-y-3">
              {TELEFERICO_URUAPAN.stations.map((station, index) => (
                <li
                  key={station}
                  className="animated-chip relative flex items-center gap-4 rounded-2xl border p-3"
                  style={{ background: "var(--card, #141c10)", borderColor: "var(--ov-border)" }}
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border font-serif text-xs font-black"
                    style={{ borderColor: "rgba(184,232,64,0.4)", background: "rgba(184,232,64,0.08)", color: "var(--lima)" }}
                  >
                    E{index + 1}
                  </span>
                  <span className="text-sm font-bold" style={{ color: "var(--ink)" }}>{station}</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--muted)" }}>
                    Estación
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── CUATRO PASOS ── */}
      <section className="mx-auto max-w-[1200px] px-5 pb-16">
        <div className="mb-8 border-b pb-4" style={{ borderColor: "var(--ov-border)" }}>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
            Cómo se usa
          </p>
          <h2 className="font-serif text-3xl font-black tracking-tight" style={{ letterSpacing: "-0.02em" }}>
            Cuatro pasos.{" "}
            <em style={{ fontStyle: "italic", color: "var(--lima)" }}>Sin más.</em>
          </h2>
        </div>
        <div
          className="grid grid-cols-2 overflow-hidden rounded-2xl lg:grid-cols-4"
          style={{ background: "var(--card, #141c10)", border: "1px solid var(--ov-border)" }}
        >
          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <div
              key={step.n}
              className="p-6 transition-colors hover:bg-[rgba(23,32,18,0.8)]"
              style={{ borderRight: i < 3 ? "1px solid var(--ov-border)" : "none" }}
            >
              <div className="mb-4 font-serif text-3xl font-bold leading-none" style={{ color: "var(--lima)", opacity: 0.3 }}>
                {step.n}
              </div>
              <p className="mb-1.5 text-sm font-semibold" style={{ color: "var(--ink)" }}>{step.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── RUTAS POPULARES ── */}
      <section className="mx-auto max-w-[1200px] px-5 pb-16">
        <div
          className="rounded-2xl border p-6 md:p-8"
          style={{ background: "rgba(20,28,16,0.6)", borderColor: "var(--ov-border)" }}
        >
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-serif text-2xl font-black" style={{ color: "var(--ink)" }}>
                Rutas y conexiones populares
              </h2>
              <p className="mt-3 text-sm leading-7" style={{ color: "var(--ink2)" }}>
                Busca rutas como Ruta 11 Uruapan, Ruta 1 o Ruta 5, además de estaciones clave del Teleférico.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Ruta 11 Uruapan", "Ruta 1", "Ruta 5", "Hospital Regional", "Centro Histórico", "Mercado Poniente"].map((item) => (
                <Link
                  key={item}
                  href={`/mapa?destino=${encodeURIComponent(item)}`}
                  className="animated-chip inline-flex items-center rounded-full border px-4 py-2 text-xs font-bold transition"
                  style={{ borderColor: "rgba(140,200,80,0.15)", background: "rgba(106,171,72,0.06)", color: "var(--ink2)" }}
                >
                  {item}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mx-auto max-w-[1200px] px-5 pb-16">
        <div className="mb-8 border-b pb-4" style={{ borderColor: "var(--ov-border)" }}>
          <h2 className="font-serif text-3xl font-black tracking-tight" style={{ letterSpacing: "-0.02em", color: "var(--ink)" }}>
            Preguntas frecuentes
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {LANDING_FAQS.map((item) => (
            <details
              key={item.question}
              className="card-lift group rounded-2xl border backdrop-blur open:border-verde-400/30"
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
      <div className="mx-auto max-w-[1200px] px-5 pb-16">
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            background: "linear-gradient(135deg, #3d6828 0%, #2a4a1a 50%, #1a3a28 100%)",
            borderRadius: "24px",
            padding: "4.5rem 2.5rem",
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
              className="font-serif text-5xl font-black tracking-tight sm:text-6xl"
              style={{ color: "#e8f2d8", letterSpacing: "-0.025em" }}
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

      {/* ── FOOTER ── */}
      <footer className="border-t px-5 py-10 sm:px-8 lg:px-10" style={{ borderColor: "var(--ov-border)" }}>
        <div className="mx-auto max-w-6xl">
          <NotGovernmentNotice variant="full" />
        </div>
        <div
          className="mx-auto mt-8 flex max-w-6xl flex-col gap-4 text-sm md:flex-row md:items-center md:justify-between"
          style={{ color: "var(--muted)" }}
        >
          <p className="inline-flex items-center gap-2">
            <Logo size={22} showName href="" />
            <span>· Rutas de transporte en Uruapan, Michoacán.</span>
          </p>
          <div className="flex gap-4">
            <Link href="/mapa" className="font-semibold transition hover:opacity-80" style={{ color: "var(--ink2)" }}>Mapa</Link>
            <Link href="/blog" className="font-semibold transition hover:opacity-80" style={{ color: "var(--ink2)" }}>Blog</Link>
            <Link href="/privacidad" className="font-semibold transition hover:opacity-80" style={{ color: "var(--ink2)" }}>Privacidad</Link>
          </div>
        </div>
        <div className="mx-auto max-w-6xl">
          <MadeByFooter />
        </div>
      </footer>
    </main>
  );
}

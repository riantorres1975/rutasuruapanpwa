import type { Metadata } from "next";
import Link from "next/link";
import MadeByFooter from "@/components/MadeByFooter";
import HeroMap from "@/components/HeroMap";
import FareTicket from "@/components/FareTicket";
import NotGovernmentNotice from "@/components/NotGovernmentNotice";
import {
  APP_BRAND,
  FARES_2026,
  LANDING_FAQS,
  LANDING_SEARCH_SUGGESTIONS,
  TELEFERICO_URUAPAN
} from "@/lib/mobility-config";

const HOW_IT_WORKS_STEPS = [
  {
    title: "Abre el mapa",
    description: "Entra al mapa interactivo con todas las rutas de Uruapan ya cargadas."
  },
  {
    title: "Marca tu origen",
    description: "Toca el punto del mapa donde estás o usa el botón de ubicación automática."
  },
  {
    title: "Marca tu destino",
    description: "Toca a dónde quieres llegar. El mapa detecta las rutas más cercanas."
  },
  {
    title: "Compara opciones",
    description: "VoyUruapan te muestra la ruta recomendada con tiempo estimado y alternativas disponibles."
  }
] as const;

export const metadata: Metadata = {
  title: {
    absolute: "VoyUruapan | Rutas de camiones y Teleférico en Uruapan"
  },
  description:
    "Consulta rutas de camiones Uruapan, horario del Teleférico Uruapan, tarifas 2026 y opciones para moverte en transporte público.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "VoyUruapan | Encuentra tu ruta en Uruapan",
    description:
      "Rutas de camiones urbanos y Teleférico en un solo mapa para Uruapan, Michoacán.",
    url: "/",
    siteName: "VoyUruapan",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "VoyUruapan — rutas de camiones y Teleférico en Uruapan"
      }
    ],
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
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer
    }
  }))
};

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: APP_BRAND.name,
  applicationCategory: "TravelApplication",
  operatingSystem: "Web, Android, iOS",
  description: APP_BRAND.description,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "MXN"
  },
  areaServed: {
    "@type": "City",
    name: "Uruapan, Michoacán"
  }
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: APP_BRAND.name,
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://rutasuruapanpwa.vercel.app",
  logo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://rutasuruapanpwa.vercel.app"}/icons/icon-512.png`,
  areaServed: {
    "@type": "City",
    name: "Uruapan, Michoacán"
  }
};

const routeModes = [
  {
    title: "Camiones urbanos",
    text: "Consulta rutas de camiones Uruapan y compara opciones cercanas para moverte dentro de la ciudad.",
    meta: `${FARES_2026.urbanBus.price} · ${FARES_2026.urbanBus.payment}`
  },
  {
    title: "Teleférico",
    text: "Visualiza las estaciones y conecta el eje oriente-poniente con rutas terrestres.",
    meta: `${TELEFERICO_URUAPAN.hours} · ${TELEFERICO_URUAPAN.fare}`
  }
];

export default function LandingPage() {
  return (
    <main className="greca-bg greca-bg-animated min-h-dvh overflow-hidden text-cream-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />

      <section className="relative isolate px-5 pb-16 pt-5 sm:px-8 lg:px-10">
        <div className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-cream-100/15 bg-ink-900/70 px-3.5 py-2 backdrop-blur-xl">
            <span className="h-2.5 w-2.5 rounded-full bg-terracota-400 shadow-[0_0_18px_rgba(232,93,47,0.9)]" />
            <span className="font-serif-display text-sm font-bold tracking-tight text-cream-50">{APP_BRAND.name}</span>
          </Link>
          <Link
            href="/mapa"
            className="cta-shine animate-fade-up animate-delay-100 group relative inline-flex h-11 items-center gap-2 overflow-hidden rounded-full bg-terracota-400 px-5 text-sm font-black text-cream-50 shadow-[0_10px_30px_-8px_rgba(232,93,47,0.55)] transition hover:bg-terracota-500 hover:shadow-[0_14px_36px_-8px_rgba(232,93,47,0.7)] active:scale-[0.97]"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="10" r="2.2" fill="currentColor" />
            </svg>
            Abrir mapa
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>

        {/* Banda de greca decorativa */}
        <div className="greca-band absolute left-0 right-0 top-[68px] -z-0 h-3 opacity-40" aria-hidden="true" />

        <div className="relative z-10 mx-auto grid max-w-6xl gap-10 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-20">
          <div>
            <p className="animate-fade-up mb-5 inline-flex items-center gap-2 rounded-full border border-terracota-400/30 bg-terracota-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-terracota-400">
              <span className="h-1 w-1 rounded-full bg-terracota-400" />
              Transporte multimodal · Uruapan, Michoacán
            </p>

            <h1 className="animate-fade-up animate-delay-100 font-serif-display text-5xl font-black leading-[0.95] tracking-tight text-cream-50 sm:text-6xl lg:text-[5.25rem]">
              Moverse por <span className="italic text-terracota-400">Uruapan</span>,
              <br />
              tan fácil como respirar.
            </h1>

            <p className="text-purepecha animate-fade-up animate-delay-200 mt-3 text-sm">
              Iretarhu jásï · en la ciudad
            </p>

            <p className="animate-fade-up animate-delay-200 mt-5 max-w-2xl text-base leading-7 text-cream-100/75 sm:text-lg">
              Camiones urbanos y el único Teleférico de Michoacán en un mapa hecho aquí, para Uruapan. Ligero, sin cuentas, sin anuncios.
            </p>

            <form action="/mapa" className="animate-fade-up animate-delay-300 mt-7 max-w-xl rounded-3xl border border-cream-100/10 bg-ink-900/85 p-2 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
              <label className="sr-only" htmlFor="destino">¿A dónde vas?</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <svg viewBox="0 0 24 24" fill="none" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-cream-100/40" aria-hidden="true">
                    <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="10" r="2" fill="currentColor" />
                  </svg>
                  <input
                    id="destino"
                    name="destino"
                    placeholder="¿A dónde vas? Ej. Parque Nacional"
                    className="h-12 w-full rounded-2xl border border-cream-100/10 bg-cream-100/5 pl-12 pr-4 text-sm font-medium text-cream-50 outline-none transition placeholder:text-cream-100/35 focus:border-terracota-400/60 focus:ring-1 focus:ring-terracota-400/30"
                  />
                </div>
                <button className="cta-shine h-12 rounded-2xl bg-terracota-400 px-6 text-sm font-black text-cream-50 transition hover:bg-terracota-500" type="submit">
                  Buscar ruta
                </button>
              </div>
            </form>

            <div className="animate-fade-up animate-delay-400 mt-4 flex flex-wrap gap-2">
              {LANDING_SEARCH_SUGGESTIONS.slice(0, 6).map((item) => (
                <Link key={item} href={`/mapa?destino=${encodeURIComponent(item)}`} className="animated-chip inline-flex items-center rounded-full border border-cream-100/15 bg-cream-100/5 px-3.5 py-1.5 text-xs font-semibold text-cream-50 transition hover:border-terracota-400/60 hover:bg-terracota-400/10 hover:text-terracota-400">
                  {item}
                </Link>
              ))}
            </div>

            <div className="animate-fade-up animate-delay-500 mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-serif-display text-2xl font-black text-cream-50">41</span>
                <span className="text-cream-100/60">rutas urbanas</span>
              </div>
              <span className="h-4 w-px bg-cream-100/15" />
              <div className="flex items-center gap-2">
                <span className="font-serif-display text-2xl font-black text-cream-50">6</span>
                <span className="text-cream-100/60">estaciones de Teleférico</span>
              </div>
              <span className="h-4 w-px bg-cream-100/15" />
              <div className="flex items-center gap-2">
                <span className="font-serif-display text-2xl font-black text-cream-50">$11</span>
                <span className="text-cream-100/60">tarifa base 2026</span>
              </div>
            </div>
          </div>

          <div className="animate-fade-up animate-delay-300 relative mx-auto w-full max-w-sm lg:max-w-md">
            <div className="animate-glow-breathe absolute -inset-8 rounded-[3rem] bg-terracota-400/15 blur-3xl" />
            <HeroMap />
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {routeModes.map((mode, index) => (
            <article key={mode.title} className="animate-fade-up card-lift rounded-2xl border border-cream-100/10 bg-ink-900/60 p-5 backdrop-blur" style={{ animationDelay: `${index * 100}ms` }}>
              <h2 className="font-serif-display text-xl font-black text-cream-50">{mode.title}</h2>
              <p className="mt-3 text-sm leading-6 text-cream-100/75">{mode.text}</p>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-avocado-400">{mode.meta}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="tarifas" className="px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-purepecha text-sm">Janhachakua · pasaje</p>
            <h2 className="mt-2 font-serif-display text-4xl font-black text-cream-50 md:text-5xl">
              Lo que cuesta <span className="italic text-terracota-400">moverte en Uruapan.</span>
            </h2>
            <p className="mt-4 text-sm leading-6 text-cream-100/70">
              Lo que cuesta moverte en Uruapan, sin letra chica. Tarifas base para combinar camión urbano y Teleférico.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {(["urban", "teleferico", "card"] as const).map((variant, index) => {
              const key = variant === "urban" ? "urbanBus" : variant === "teleferico" ? "teleferico" : "mobilityCard";
              const fare = FARES_2026[key];
              const serial = `BOLETO 0${index + 1}`;
              return (
                <div key={key} className="animate-fade-up" style={{ animationDelay: `${index * 100}ms` }}>
                  <FareTicket
                    label={fare.label}
                    price={fare.price}
                    payment={fare.payment}
                    serial={serial}
                    variant={variant}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-purepecha text-sm">Único en Michoacán</p>
            <h2 className="mt-2 font-serif-display text-4xl font-black text-cream-50 md:text-5xl">
              Seis estaciones <span className="italic text-terracota-400">de oriente a poniente.</span>
            </h2>
            <p className="mt-4 text-sm leading-7 text-cream-100/75">
              El Teleférico opera todos los días de {TELEFERICO_URUAPAN.hours}. Cuesta {TELEFERICO_URUAPAN.fare} y se valida con tarjeta electrónica de movilidad.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/teleferico-uruapan-horario" className="cta-shine inline-flex h-11 items-center justify-center rounded-full bg-terracota-400 px-5 text-sm font-black text-cream-50 hover:bg-terracota-500">
                Guía del Teleférico
              </Link>
              <Link href="/mapa?destino=Teleferico%20Uruapan" className="inline-flex h-11 items-center justify-center rounded-full border border-cream-100/15 bg-cream-100/5 px-5 text-sm font-bold text-cream-50 hover:border-avocado-400/50">
                Ver en el mapa
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute left-[18px] top-2 bottom-2 w-px bg-gradient-to-b from-transparent via-avocado-400/40 to-transparent" aria-hidden="true" />
            <ol className="space-y-3">
              {TELEFERICO_URUAPAN.stations.map((station, index) => (
                <li key={station} className="animated-chip relative flex items-center gap-4 rounded-2xl border border-cream-100/10 bg-ink-900/60 p-3 backdrop-blur">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-terracota-400/40 bg-terracota-400/10 font-serif-display text-xs font-black text-terracota-400">
                    E{index + 1}
                  </span>
                  <span className="text-sm font-bold text-cream-50">{station}</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-[0.18em] text-cream-100/40">
                    Estación
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <p className="text-purepecha text-sm">Néshu úni · cómo se hace</p>
          <h2 className="mt-2 font-serif-display text-3xl font-black text-cream-50 md:text-4xl">
            Cuatro pasos. <span className="italic text-terracota-400">Sin más.</span>
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {HOW_IT_WORKS_STEPS.map((step, index) => (
              <div key={step.title} className="animate-fade-up card-lift rounded-2xl border border-cream-100/10 bg-ink-900/60 p-5 backdrop-blur" style={{ animationDelay: `${index * 90}ms` }}>
                <span className="font-serif-display text-3xl font-black text-terracota-400">0{index + 1}</span>
                <h3 className="mt-2 font-serif-display text-lg font-black text-cream-50">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-cream-100/65">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-cream-100/10 bg-cream-100/[0.03] p-6 backdrop-blur md:p-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-serif-display text-3xl font-black text-cream-50">Rutas y conexiones populares</h2>
              <p className="mt-3 text-sm leading-7 text-cream-100/70">Busca rutas como Ruta 11 Uruapan, Ruta 1 o Ruta 5, además de estaciones clave del Teleférico.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Ruta 11 Uruapan", "Ruta 1", "Ruta 5", "Hospital Regional", "Centro Histórico", "Mercado Poniente"].map((item) => (
                <Link key={item} href={`/mapa?destino=${encodeURIComponent(item)}`} className="animated-chip inline-flex items-center rounded-full border border-cream-100/15 bg-ink-900/80 px-4 py-2 text-xs font-bold text-cream-50 transition hover:border-terracota-400/60 hover:bg-terracota-400/10 hover:text-terracota-400">
                  {item}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-serif-display text-3xl font-black text-cream-50 md:text-4xl">Preguntas frecuentes</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {LANDING_FAQS.map((item) => (
              <article key={item.question} className="card-lift rounded-2xl border border-cream-100/10 bg-ink-900/60 p-5 backdrop-blur">
                <h3 className="font-serif-display text-base font-black text-cream-50">{item.question}</h3>
                <p className="mt-3 text-sm leading-6 text-cream-100/70">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-cream-100/10 px-5 py-10 sm:px-8 lg:px-10">
        <div className="greca-band mx-auto mb-8 h-3 max-w-6xl opacity-50" aria-hidden="true" />
        <div className="mx-auto max-w-6xl">
          <NotGovernmentNotice variant="full" />
        </div>
        <div className="mx-auto mt-8 flex max-w-6xl flex-col gap-4 text-sm text-cream-100/60 md:flex-row md:items-center md:justify-between">
          <p><span className="font-serif-display font-bold text-cream-50">{APP_BRAND.name}</span> · Rutas de transporte en Uruapan, Michoacán.</p>
          <div className="flex gap-4">
            <Link href="/mapa" className="font-semibold text-cream-100 hover:text-terracota-400">Mapa</Link>
            <Link href="/blog" className="font-semibold text-cream-100 hover:text-terracota-400">Blog</Link>
            <Link href="/privacidad" className="font-semibold text-cream-100 hover:text-terracota-400">Privacidad</Link>
          </div>
        </div>
        <div className="mx-auto max-w-6xl">
          <MadeByFooter />
        </div>
      </footer>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import {
  APP_BRAND,
  FARES_2026,
  LANDING_FAQS,
  LANDING_SEARCH_SUGGESTIONS,
  SEO_KEYWORDS,
  SUBURBAN_CONNECTIONS,
  TELEFERICO_URUAPAN
} from "@/lib/mobility-config";

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
      "Rutas de camiones, combis suburbanas y Teleferico en un solo mapa para Uruapan, Michoacan.",
    url: "/",
    siteName: "VoyUruapan",
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
  },
  {
    title: "Combis suburbanas",
    text: "Base preparada para conexiones hacia pueblos y zonas cercanas de la región.",
    meta: SUBURBAN_CONNECTIONS.join(" · ")
  }
];

export default function LandingPage() {
  return (
    <main className="min-h-dvh overflow-hidden bg-[#080C18] text-slate-100">
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

      <section className="relative px-5 pb-16 pt-5 sm:px-8 lg:px-10">
        <div className="absolute inset-0 -z-0 bg-[radial-gradient(circle_at_10%_0%,rgba(0,212,170,0.18),transparent_30%),radial-gradient(circle_at_90%_15%,rgba(100,210,255,0.12),transparent_32%)]" />
        <div className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 rounded-2xl border border-[#00D4AA]/20 bg-[#0E1526]/90 px-3.5 py-2 backdrop-blur-xl">
            <span className="h-2.5 w-2.5 rounded-full bg-[#00D4AA] shadow-[0_0_18px_rgba(0,212,170,0.9)]" />
            <span className="font-display text-sm font-bold tracking-tight text-white">{APP_BRAND.name}</span>
          </Link>
          <Link
            href="/mapa"
            className="inline-flex h-10 items-center rounded-full border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-[#00D4AA]/50 hover:bg-[#00D4AA]/10"
          >
            Abrir mapa
          </Link>
        </div>

        <div className="relative z-10 mx-auto grid max-w-6xl gap-10 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-20">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-[#00D4AA]/25 bg-[#00D4AA]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-[#00D4AA]">
              Transporte multimodal en Uruapan
            </p>
            <h1 className="font-display text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Rutas de camiones y Teleférico en Uruapan
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              {APP_BRAND.tagline}. Busca rutas urbanas, conexiones suburbanas y estaciones del Teleférico de Uruapan desde una PWA rápida y ligera.
            </p>

            <form action="/mapa" className="mt-7 max-w-xl rounded-3xl border border-white/10 bg-[#0E1526]/90 p-2 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <label className="sr-only" htmlFor="destino">¿A donde vas?</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <svg viewBox="0 0 24 24" fill="none" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" aria-hidden="true">
                    <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="10" r="2" fill="currentColor" />
                  </svg>
                  <input
                    id="destino"
                    name="destino"
                    placeholder="¿A donde vas? Ej. Parque Nacional"
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-12 pr-4 text-sm font-medium text-white outline-none transition placeholder:text-white/30 focus:border-[#00D4AA]/50 focus:ring-1 focus:ring-[#00D4AA]/20"
                  />
                </div>
                <button className="h-12 rounded-2xl bg-[#00D4AA] px-6 text-sm font-black text-gray-950 transition hover:bg-[#12e7bd]" type="submit">
                  Buscar ruta
                </button>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              {LANDING_SEARCH_SUGGESTIONS.slice(0, 6).map((item) => (
                <Link key={item} href={`/mapa?destino=${encodeURIComponent(item)}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-[#00D4AA]/40 hover:text-[#00D4AA]">
                  {item}
                </Link>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3 text-xs font-semibold text-slate-400">
              {SEO_KEYWORDS.map((keyword) => (
                <span key={keyword} className="rounded-full bg-white/[0.03] px-3 py-1">{keyword}</span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm lg:max-w-md">
            <div className="absolute -inset-8 rounded-[3rem] bg-[#00D4AA]/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-[#0B1224] p-4 shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
              <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-[#0E1526] px-3 py-2">
                <span className="inline-flex items-center gap-2 text-sm font-bold"><span className="h-2.5 w-2.5 rounded-full bg-[#00D4AA]" />VoyUruapan</span>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">41 rutas</span>
              </div>
              <div className="relative h-[430px] overflow-hidden rounded-[1.5rem] bg-[radial-gradient(circle_at_30%_20%,rgba(0,212,170,0.18),transparent_18%),linear-gradient(135deg,#111827,#060913)]">
                <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:28px_28px]" />
                <svg viewBox="0 0 320 430" className="absolute inset-0 h-full w-full" aria-hidden="true">
                  <path d="M-20 250 C60 190 95 260 160 215 C225 170 250 230 340 180" fill="none" stroke="#00D4AA" strokeWidth="7" strokeLinecap="round" strokeDasharray="18 12" />
                  <path d="M20 85 C105 115 120 190 185 170 C250 150 270 95 330 120" fill="none" stroke="#64D2FF" strokeWidth="3" opacity="0.75" />
                  <path d="M25 360 C70 280 95 250 135 245 C210 235 220 290 295 260" fill="none" stroke="#FFD60A" strokeWidth="3" opacity="0.75" />
                  <path d="M70 15 C60 100 100 160 80 230 C65 290 70 350 35 430" fill="none" stroke="#AF52DE" strokeWidth="3" opacity="0.75" />
                  {[42, 95, 150, 205, 260, 305].map((x, index) => (
                    <circle key={x} cx={x} cy={index < 2 ? 228 - index * 20 : 212 - index * 7} r="7" fill="#00D4AA" stroke="white" strokeWidth="2" />
                  ))}
                </svg>
                <div className="absolute left-4 right-4 top-4 rounded-2xl border border-white/10 bg-[#0E1526]/95 p-2 backdrop-blur-xl">
                  <div className="flex gap-2">
                    <span className="flex-1 rounded-xl border border-[#00D4AA]/40 bg-[#00D4AA]/10 py-2 text-center text-[11px] font-bold text-[#00D4AA]">A marcado</span>
                    <span className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-center text-[11px] font-bold text-white/45">Destino</span>
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-[#00D4AA]/20 bg-[#0E1526]/90 p-4 backdrop-blur-xl">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#00D4AA]">Ruta sugerida</p>
                  <p className="mt-1 font-display text-xl font-black text-white">Camión + Teleférico</p>
                  <p className="mt-2 text-xs text-slate-300">Costo estimado por abordaje: $11.00 MXN</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {routeModes.map((mode) => (
            <article key={mode.title} className="card-base p-5">
              <h2 className="font-display text-xl font-black text-white">{mode.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{mode.text}</p>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-[#00D4AA]">{mode.meta}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="tarifas" className="px-5 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-[#0E1526]/80 p-6 backdrop-blur-xl md:p-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#00D4AA]">Tarifas 2026</p>
            <h2 className="mt-2 font-display text-3xl font-black text-white md:text-4xl">Precio del transporte público en Uruapan</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">Datos base para calcular rutas combinadas entre camión urbano, combis y Teleférico.</p>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {Object.values(FARES_2026).map((fare) => (
              <div key={fare.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-bold text-slate-300">{fare.label}</p>
                <p className="mt-2 font-display text-3xl font-black text-white">{fare.price}</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">{fare.payment}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#00D4AA]">Teleférico Uruapan horario</p>
            <h2 className="mt-2 font-display text-3xl font-black text-white md:text-4xl">Seis estaciones de oriente a poniente</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">Opera todos los días de {TELEFERICO_URUAPAN.hours}. El viaje cuesta {TELEFERICO_URUAPAN.fare} y se valida con tarjeta electrónica.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/teleferico-uruapan-horario" className="inline-flex h-11 items-center justify-center rounded-full bg-[#00D4AA] px-5 text-sm font-black text-gray-950">
                Guía del Teleférico
              </Link>
              <Link href="/mapa?destino=Teleferico%20Uruapan" className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-bold text-slate-100">
                Ver en el mapa
              </Link>
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-[#0E1526]/80 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {TELEFERICO_URUAPAN.stations.map((station, index) => (
                <div key={station} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#00D4AA]/40 bg-[#00D4AA]/10 text-xs font-black text-[#00D4AA]">E{index + 1}</span>
                  <span className="text-sm font-bold text-slate-100">{station}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#00D4AA]">Como funciona</p>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            {["Abre el mapa", "Marca origen", "Marca destino", "Compara opciones"].map((step, index) => (
              <div key={step} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-xs font-black text-[#00D4AA]">0{index + 1}</span>
                <h3 className="mt-2 font-display text-lg font-black text-white">{step}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">VoyUruapan calcula alternativas con rutas urbanas, Teleférico y caminata cuando sea necesario.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-black text-white">Rutas y conexiones populares</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">Busca rutas como Ruta 11 Uruapan, Ruta 1 o Ruta 5, además de conexiones hacia comunidades cercanas.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Ruta 11 Uruapan", "Ruta 1", "Ruta 5", ...SUBURBAN_CONNECTIONS].map((item) => (
                <Link key={item} href={`/mapa?destino=${encodeURIComponent(item)}`} className="rounded-full border border-white/10 bg-[#0E1526] px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-[#00D4AA]/50 hover:text-[#00D4AA]">
                  {item}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl font-black text-white">Preguntas frecuentes</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {LANDING_FAQS.map((item) => (
              <article key={item.question} className="rounded-2xl border border-white/10 bg-[#0E1526]/80 p-5">
                <h3 className="font-display text-base font-black text-white">{item.question}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <p><span className="font-bold text-white">{APP_BRAND.name}</span> · Rutas de transporte en Uruapan, Michoacán.</p>
          <div className="flex gap-4">
            <Link href="/mapa" className="font-semibold text-slate-200 hover:text-[#00D4AA]">Mapa</Link>
            <Link href="/blog" className="font-semibold text-slate-200 hover:text-[#00D4AA]">Blog</Link>
            <Link href="/privacidad" className="font-semibold text-slate-200 hover:text-[#00D4AA]">Privacidad</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

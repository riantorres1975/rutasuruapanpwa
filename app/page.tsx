import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BusFront,
  CableCar,
  Crosshair,
  MapPin,
  MapPinned,
  Route,
  ScanSearch,
} from "lucide-react";
import LandingHeroPlanner from "@/components/LandingHeroPlanner";
import StatsAnimados from "@/components/StatsAnimados";
import ForceDark from "@/components/ForceDark";
import FareUpdateNotice from "@/components/FareUpdateNotice";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import {
  APP_BRAND,
  FARES_2026,
  LANDING_FAQS,
  TELEFERICO_URUAPAN,
} from "@/lib/mobility-config";
import { getPlaceSeoItems, getRoutesNearPlace, walkMinutesFor } from "@/lib/como-llegar";
import { SITE_URL } from "@/lib/site-url";

const HOW_IT_WORKS_STEPS = [
  { n: "01", icon: MapPinned, title: "Abre el mapa", desc: "Las 40 rutas ya están listas. No necesitas cuenta." },
  { n: "02", icon: Crosshair, title: "Marca tu origen", desc: "Usa el GPS o elige cualquier punto de forma manual." },
  { n: "03", icon: ScanSearch, title: "Busca tu destino", desc: "Escribe un negocio, hospital, colonia o lugar." },
  { n: "04", icon: Route, title: "Compara y viaja", desc: "Revisa opciones, transbordos, tiempo y costo." },
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

const allSeoPlaces = getPlaceSeoItems();
const featuredPlaces = FEATURED_PLACE_LABELS.map((label) => {
  const place = allSeoPlaces.find((item) => item.label === label);
  if (!place) return null;
  const routes = getRoutesNearPlace(place.center);
  if (routes.length === 0) return null;
  return {
    slug: place.slug,
    label: place.label,
    routeCount: routes.length,
    nearestWalkMin: walkMinutesFor(routes[0].distanceM),
  };
}).filter((place): place is NonNullable<typeof place> => place !== null);

export const metadata: Metadata = {
  title: { absolute: "Rutas de camiones en Uruapan: mapa y horarios | UruGo" },
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
    type: "website",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: LANDING_FAQS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
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
  areaServed: { "@type": "City", name: "Uruapan, Michoacán" },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: APP_BRAND.name,
  url: SITE_URL,
  logo: `${SITE_URL}/icons/icon-512.png`,
  areaServed: { "@type": "City", name: "Uruapan, Michoacán" },
};

export default function LandingPage() {
  return (
    <main
      className="landing-home min-h-dvh overflow-hidden bg-[#0c110a] text-[#e8f2d8]"
      data-theme="dark"
      style={{
        "--background": "#0c110a",
        "--foreground": "#e8f2d8",
        "--ov-border": "rgba(232,242,216,0.12)",
        "--ov-bg": "rgba(12,17,10,0.97)",
        "--ov-text": "#e8f2d8",
        "--ink": "#e8f2d8",
        "--ink2": "#a8c888",
        "--muted": "#729260",
        "--card": "#12190f",
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

      <section className="mx-auto max-w-[1240px] px-5 pb-10 pt-28 sm:px-8 lg:pb-16 lg:pt-36">
        <div className="border-b border-white/10 pb-7 sm:pb-9">
          <div className="animate-fade-up mb-5 flex items-center gap-2.5 text-[11px] font-black uppercase tracking-[0.16em] text-[#8eb16f]">
            <span className="h-2 w-2 rounded-full bg-[#a8ef24]" aria-hidden="true" />
            Uruapan, Michoacán
          </div>

          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
            <div>
              <h1 className="animate-fade-up animate-delay-100 max-w-[900px] font-serif text-[46px] font-black leading-[0.96] sm:text-6xl lg:text-7xl">
                <span className="block">Encuentra qué camión{" "}</span>
                <span className="block">
                  tomar en <em className="font-serif text-[#a8ef24]">Uruapan.</em>
                </span>
              </h1>
              <p className="animate-fade-up animate-delay-200 mt-5 max-w-2xl text-base leading-7 text-[#a8c888] sm:text-lg">
                Busca tu destino, compara rutas y combina camión con Teleférico en un mapa hecho aquí. Sin cuentas ni anuncios.
              </p>
            </div>

            <dl className="animate-fade-up animate-delay-300 grid grid-cols-3 border-y border-white/10 py-4 lg:grid-cols-1 lg:gap-3 lg:border-y-0 lg:border-l lg:py-0 lg:pl-7">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6f895a]">Cobertura</dt>
                <dd className="mt-1 font-serif text-lg font-black text-[#e8f2d8]">40 rutas</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6f895a]">Teleférico</dt>
                <dd className="mt-1 font-serif text-lg font-black text-[#e8f2d8]">6 estaciones</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6f895a]">Acceso</dt>
                <dd className="mt-1 font-serif text-lg font-black text-[#e8f2d8]">Gratis</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="animate-fade-up animate-delay-300">
          <LandingHeroPlanner />
        </div>
      </section>

      <StatsAnimados />

      <section id="transporte" className={`mx-auto max-w-[1240px] px-5 py-16 sm:px-8 lg:py-24 ${DEFERRED_SECTION}`}>
        <div className="mb-8 grid gap-3 border-b border-white/10 pb-5 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#6f895a]">La red</p>
            <h2 className="mt-2 font-serif text-3xl font-black sm:text-4xl">Dos maneras de cruzar la ciudad.</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-[#789660]">Elige una red completa o combínalas en el mismo recorrido.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Link
            href="/rutas"
            className="group grid min-h-[260px] rounded-lg border border-white/10 bg-[#11180e] p-6 transition hover:border-[#57d6e8]/50 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-md bg-[#57d6e8] text-[#071114]" aria-hidden="true">
                <BusFront className="h-6 w-6" strokeWidth={1.8} />
              </span>
              <span className="text-xs font-black uppercase tracking-[0.12em] text-[#8eb16f]">{URBAN_FARE_DISPLAY} · Efectivo</span>
            </div>
            <div className="mt-8 self-end">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#57d6e8]">Camión urbano</p>
              <p className="mt-2 font-serif text-5xl font-black">40 <span className="font-sans text-sm font-bold text-[#6f895a]">rutas</span></p>
              <p className="mt-3 max-w-lg text-sm leading-6 text-[#789660]">Recorridos, horarios y puntos de referencia de todo el rutero urbano.</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#e8f2d8]">Explorar rutas <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" /></span>
            </div>
          </Link>

          <Link
            href="/teleferico-uruapan-horario"
            className="group grid min-h-[260px] rounded-lg border border-white/10 bg-[#11180e] p-6 transition hover:border-[#ffd84d]/50 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-md bg-[#ffd84d] text-[#171303]" aria-hidden="true">
                <CableCar className="h-6 w-6" strokeWidth={1.8} />
              </span>
              <span className="text-xs font-black uppercase tracking-[0.12em] text-[#8eb16f]">{TELEFERICO_FARE_DISPLAY} · Tarjeta</span>
            </div>
            <div className="mt-8 self-end">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#ffd84d]">Teleférico Uruapan</p>
              <p className="mt-2 font-serif text-5xl font-black">6 <span className="font-sans text-sm font-bold text-[#6f895a]">estaciones</span></p>
              <p className="mt-3 max-w-lg text-sm leading-6 text-[#789660]">Cruza de oriente a poniente y opera {TELEFERICO_URUAPAN.hours}.</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#e8f2d8]">Ver guía del Teleférico <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" /></span>
            </div>
          </Link>
        </div>
      </section>

      <section id="como-funciona" className={`border-y border-white/10 bg-[#10160d] ${DEFERRED_SECTION}`}>
        <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#b8e840]">Cómo se usa</p>
              <h2 className="mt-3 font-serif text-4xl font-black">Del punto A al B, sin vueltas.</h2>
              <p className="mt-4 text-sm leading-6 text-[#789660]">El mapa te acompaña desde la búsqueda hasta el modo viaje.</p>
            </div>

            <ol className="grid border-t border-white/10 sm:grid-cols-2 lg:grid-cols-4 lg:border-l lg:border-t-0">
              {HOW_IT_WORKS_STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <li key={step.n} className="relative border-b border-white/10 py-6 sm:px-5 lg:border-b-0 lg:border-r lg:py-2">
                    <span className="font-serif text-3xl font-black text-[#6f895a]">{step.n}</span>
                    <Icon className="mt-8 h-5 w-5 text-[#b8e840]" strokeWidth={1.8} aria-hidden="true" />
                    <h3 className="mt-3 text-sm font-black text-[#e8f2d8]">{step.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-[#6f895a]">{step.desc}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      <section className={`mx-auto max-w-[1240px] px-5 py-16 sm:px-8 lg:py-24 ${DEFERRED_SECTION}`}>
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#6f895a]">Destinos cotidianos</p>
            <h2 className="mt-2 font-serif text-3xl font-black sm:text-4xl">¿Cómo llegar a...?</h2>
          </div>
          <Link href="/como-llegar" className="inline-flex items-center gap-2 text-sm font-black text-[#b8e840]">
            Ver directorio <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid border-t border-white/10 md:grid-cols-2">
          {featuredPlaces.map((place, index) => (
            <Link
              key={place.slug}
              href={`/como-llegar/${place.slug}`}
              className={`group grid min-h-[92px] grid-cols-[34px_1fr_auto] items-center gap-3 border-b border-white/10 py-4 transition hover:bg-white/[0.025] md:px-5 ${index % 2 === 0 ? "md:border-r" : ""}`}
            >
              <MapPin className="h-5 w-5 text-[#b8e840]" strokeWidth={1.8} aria-hidden="true" />
              <span>
                <span className="block text-sm font-black text-[#e8f2d8]">{place.label}</span>
                <span className="mt-1 block text-xs text-[#6f895a]">{place.routeCount} {place.routeCount === 1 ? "ruta" : "rutas"} · desde {place.nearestWalkMin} min a pie</span>
              </span>
              <ArrowRight className="h-4 w-4 text-[#6f895a] transition group-hover:translate-x-1 group-hover:text-[#b8e840]" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section className={`border-t border-white/10 ${DEFERRED_SECTION}`}>
        <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[320px_1fr] lg:py-24">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#6f895a]">Antes de salir</p>
            <h2 className="mt-3 font-serif text-4xl font-black">Preguntas frecuentes</h2>
          </div>
          <div className="border-t border-white/10">
            {LANDING_FAQS.slice(0, 4).map((item) => (
              <details key={item.question} className="group border-b border-white/10">
                <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-4 py-5 text-base font-black text-[#e8f2d8] [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/15 text-lg text-[#b8e840] transition group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="max-w-2xl pb-6 text-sm leading-6 text-[#8eaa76]">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className={`bg-[#b8e840] text-[#0c110a] ${DEFERRED_SECTION}`}>
        <div className="mx-auto flex max-w-[1240px] flex-col gap-7 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between lg:py-16">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#3d6828]">Listo para moverte</p>
            <h2 className="mt-2 max-w-2xl font-serif text-4xl font-black sm:text-5xl">Abre el mapa. Elige tu destino. Vámonos.</h2>
          </div>
          <Link href="/mapa" className="inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-md bg-[#0c110a] px-7 text-sm font-black text-[#e8f2d8] transition hover:bg-[#172012]">
            <MapPinned className="h-4 w-4" aria-hidden="true" />
            Abrir mapa gratis
          </Link>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}

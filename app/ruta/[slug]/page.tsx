import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Logo from "@/components/Logo";
import RoutePreviewFromData from "@/components/RoutePreviewFromData";
import { APP_BRAND, DATA_LAST_UPDATED, FARES_2026 } from "@/lib/mobility-config";
import { findRouteSeoItem, getRouteSeoItems } from "@/lib/route-seo";
import { getSchedule } from "@/lib/schedules";
import { buildRouteStaticMapUrl } from "@/lib/static-map";

type RoutePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  // El teleférico no es ruta de camión: /ruta/teleferico-uruapan redirige a su
  // guía dedicada (ver next.config.mjs), así que no se construye con esta plantilla.
  return getRouteSeoItems()
    .filter((route) => route.slug !== "teleferico-uruapan")
    .map((route) => ({ slug: route.slug }));
}

export async function generateMetadata({ params }: RoutePageProps): Promise<Metadata> {
  const { slug } = await params;
  const route = findRouteSeoItem(slug);

  if (!route) {
    return {};
  }

  const label = route.destination ? `${route.name} a ${route.destination}` : route.name;
  const kmText = route.distanceKm > 0 ? `, recorrido de ${route.distanceKm} km` : "";
  const lmText = route.landmarks.length > 0 ? `, pasa por ${route.landmarks.slice(0, 2).join(" y ")}` : "";

  return {
    title: `${label} en Uruapan — horario y mapa`,
    description: `${route.name} de camión urbano en Uruapan${kmText}${lmText}. Tarifa ${FARES_2026.urbanBus.price}. Consulta el mapa interactivo, paradas y transbordos.`,
    alternates: {
      canonical: `https://www.urugo.app/ruta/${route.slug}`
    },
    openGraph: {
      title: `${label} en Uruapan`,
      description: `Información de la ${route.name}${kmText}. Tarifa y mapa de transporte público en Uruapan.`,
      url: `https://www.urugo.app/ruta/${route.slug}`,
      type: "article"
    }
  };
}

export default async function RoutePage({ params }: RoutePageProps) {
  const { slug } = await params;
  const route = findRouteSeoItem(slug);

  if (!route) {
    notFound();
  }

  const title = route.destination ? `${route.name}: ${route.destination}` : route.name;
  const directions = route.hasIda && route.hasVuelta ? "Ida y vuelta" : route.hasIda ? "Solo ida" : "Solo vuelta";
  const staticMapUrl = buildRouteStaticMapUrl(route.name, route.color);
  const compactDesktopStaticMapUrl = buildRouteStaticMapUrl(route.name, route.color, 640, 560);
  const desktopStaticMapUrl = buildRouteStaticMapUrl(route.name, route.color, 900, 560);
  const estimatedMinutes = route.distanceKm > 0 ? Math.round((route.distanceKm / 18) * 60) : null;
  const schedule = getSchedule(route.name);
  const frequencyLabel = schedule
    ? schedule.continuous
      ? "Servicio continuo"
      : schedule.freqMin === schedule.freqMax
        ? `Cada ${schedule.freqMin} min`
        : `Cada ${schedule.freqMin}–${schedule.freqMax} min`
    : null;

  const faqs = [
    {
      question: `¿Cuánto cuesta la ${route.name}?`,
      answer: `La tarifa base de la ${route.name} es de ${FARES_2026.urbanBus.price} por viaje, pagadera al abordar.`
    },
    {
      question: `¿A dónde va la ${route.name}?`,
      answer: route.destination
        ? `La ${route.name} conecta distintos puntos de Uruapan con ${route.destination}${route.landmarks.length > 0 ? `, pasando por ${route.landmarks.slice(0, 3).join(", ")}` : ""}.`
        : `La ${route.name} recorre colonias y zonas de Uruapan${route.landmarks.length > 0 ? `, pasando por ${route.landmarks.slice(0, 3).join(", ")}` : ""}.`
    },
    {
      question: `¿Cuánto tiempo tarda la ${route.name}?`,
      answer: estimatedMinutes
        ? `El recorrido completo de la ${route.name} es de aproximadamente ${route.distanceKm} km, lo que equivale a unos ${estimatedMinutes} minutos de viaje en condiciones normales de tráfico.`
        : `El tiempo varía según el tráfico y la hora del día. Usa el mapa interactivo de UruGo para estimar el tiempo desde tu punto de origen.`
    },
    ...(schedule
      ? [
          {
            question: `¿Cuál es el horario de la ${route.name}?`,
            answer: schedule.continuous
              ? `La ${route.name} opera en servicio continuo de ${schedule.first} a ${schedule.last} horas.`
              : `La ${route.name} opera aproximadamente de ${schedule.first} a ${schedule.last} horas, con unidades ${frequencyLabel?.toLowerCase()}. Los horarios pueden variar según el día y el tráfico.`
          }
        ]
      : []),
    {
      question: `¿Dónde paro la ${route.name}?`,
      answer: `Los camiones urbanos en Uruapan no tienen paradas fijas: paran casi en cualquier esquina del recorrido. Colócate sobre la calle por donde pasa la ${route.name} y haz la parada con la mano. Para bajar, avisa al chofer o toca el timbre.`
    },
    {
      question: `¿Cómo saber si la ${route.name} pasa cerca de mi destino?`,
      answer: `Abre el mapa de UruGo, marca tu origen y destino, y el sistema calculará si la ${route.name} u otra ruta es la mejor opción, incluyendo caminatas y transbordos.`
    }
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: "https://www.urugo.app/" },
          { "@type": "ListItem", position: 2, name: "Rutas", item: "https://www.urugo.app/rutas" },
          { "@type": "ListItem", position: 3, name: route.name, item: `https://www.urugo.app/ruta/${route.slug}` }
        ]
      },
      {
        "@type": "BusTrip",
        name: `${route.name} Uruapan`,
        description: `Ruta de camión urbano en Uruapan${route.destination ? ` hacia ${route.destination}` : ""}${route.distanceKm > 0 ? `. Recorrido de ${route.distanceKm} km` : ""}.`,
        provider: {
          "@type": "Organization",
          name: APP_BRAND.name
        },
        offers: {
          "@type": "Offer",
          price: FARES_2026.urbanBus.price.replace(/[^0-9.]/g, ""),
          priceCurrency: "MXN"
        }
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer
          }
        }))
      }
    ]
  };

  return (
    <main style={{ background: "#0c110a", color: "#e8f2d8", minHeight: "100dvh" }}>
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-4"
        style={{
          background: "rgba(12,17,10,0.9)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(140,200,80,0.08)",
        }}
      >
        <Logo size={28} showName showSub />
        <Link
          href="/mapa"
          className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: "#6aab48" }}
        >
          Abrir mapa
        </Link>
      </nav>

      <div className="px-5 pb-28 pt-28 sm:px-8 lg:px-10 lg:pb-16 lg:pt-32">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        <div className="mx-auto max-w-7xl">
          <div className="mb-5">
            <Link
              href="/rutas"
              className="text-xs font-semibold uppercase tracking-widest transition hover:opacity-80"
              style={{ color: "#6aab48" }}
            >
              ← Todas las rutas
            </Link>
          </div>
          <article
            className="overflow-hidden rounded-[2rem] border shadow-[0_20px_80px_rgba(0,0,0,0.35)] lg:rounded-lg"
            style={{ borderColor: "rgba(140,200,80,0.12)", background: "rgba(20,28,16,0.8)" }}
          >
            <div className="h-2" style={{ backgroundColor: route.color }} />

            <div className="lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(390px,0.85fr)]">
              {/* Route map preview */}
              <div
                className="w-full overflow-hidden lg:min-h-[440px]"
                style={{
                  borderBottom: "1px solid rgba(140,200,80,0.08)",
                  background: "rgba(0,0,0,0.3)",
                  lineHeight: 0,
                }}
              >
                {staticMapUrl ? (
                  <picture>
                    {desktopStaticMapUrl && <source media="(min-width: 1280px)" srcSet={desktopStaticMapUrl} />}
                    {compactDesktopStaticMapUrl && <source media="(min-width: 1024px)" srcSet={compactDesktopStaticMapUrl} />}
                    <img
                      src={staticMapUrl}
                      alt={`Mapa del recorrido de la ${route.name} en Uruapan`}
                      width={800}
                      height={220}
                      className="block h-auto w-full lg:h-full lg:min-h-[440px] lg:object-contain"
                    />
                  </picture>
                ) : (
                  <div className="flex h-full min-h-[180px] items-center lg:min-h-[440px]">
                    <RoutePreviewFromData
                      routeName={route.name}
                      color={route.color}
                      width={800}
                      height={560}
                      strokeWidth={3}
                      className="h-auto w-full"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-center p-6 md:p-8 lg:p-10 xl:p-12">
                <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: "#b8e840" }}>
                  Ruta de camión · Uruapan
                </p>
                <h1
                  className="mt-3 font-serif text-4xl font-black leading-[1.02] tracking-tight md:text-5xl lg:text-[2.35rem] xl:text-[3.4rem]"
                  style={{ color: "#e8f2d8" }}
                >
                  {title}
                </h1>
                <p className="mt-5 text-sm leading-7 lg:text-base" style={{ color: "#a8c888" }}>
                  {route.destination
                    ? `La ${route.name} conecta distintas zonas de Uruapan con ${route.destination}${route.distanceKm > 0 ? `, con un recorrido total de ${route.distanceKm} km` : ""}. Consulta el mapa para ver paradas y transbordos disponibles.`
                    : `La ${route.name} recorre colonias de Uruapan${route.distanceKm > 0 ? ` en un trayecto de ${route.distanceKm} km` : ""}. Usa el mapa para encontrar la parada más cercana a tu origen y destino.`
                  }
                </p>
                <div className="mt-8 hidden flex-wrap gap-3 lg:flex">
                  <Link
                    href={`/mapa?r=${encodeURIComponent(route.name)}`}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-black text-white transition hover:opacity-90"
                    style={{ background: "#6aab48" }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                      <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="10" r="2.2" fill="currentColor" />
                    </svg>
                    Ver esta ruta
                  </Link>
                  <Link
                    href="/horarios"
                    className="inline-flex h-12 items-center justify-center rounded-full border px-6 text-sm font-bold transition hover:bg-white/5"
                    style={{ borderColor: "rgba(140,200,80,0.22)", color: "#e8f2d8" }}
                  >
                    Consultar horarios
                  </Link>
                </div>
              </div>
            </div>

            <dl
              className="grid grid-cols-2 gap-2.5 border-t p-6 sm:grid-cols-3 sm:gap-3 md:p-8 lg:grid-cols-6 lg:gap-0 lg:p-0 lg:[&>div]:rounded-none lg:[&>div]:border-y-0 lg:[&>div]:border-l-0 lg:[&>div]:bg-transparent lg:[&>div]:px-6 lg:[&>div]:py-5 lg:[&>div:last-child]:border-r-0"
              style={{ borderColor: "rgba(140,200,80,0.10)" }}
            >
                <div
                  className="rounded-2xl border p-4 lg:border-r"
                  style={{ borderColor: "rgba(140,200,80,0.12)", background: "rgba(106,171,72,0.06)" }}
                >
                  <dt className="text-xs font-bold uppercase tracking-widest" style={{ color: "#a8c888" }}>Destino</dt>
                  <dd className="mt-2 text-sm font-bold" style={{ color: "#e8f2d8" }}>{route.destination ?? "Ruta local"}</dd>
                </div>
                <div
                  className="rounded-2xl border p-4 lg:border-r"
                  style={{ borderColor: "rgba(140,200,80,0.12)", background: "rgba(106,171,72,0.06)" }}
                >
                  <dt className="text-xs font-bold uppercase tracking-widest" style={{ color: "#a8c888" }}>Tarifa</dt>
                  <dd className="mt-2 text-sm font-bold" style={{ color: "#e8f2d8" }}>{FARES_2026.urbanBus.price}</dd>
                </div>
                {route.distanceKm > 0 && (
                  <div
                    className="rounded-2xl border p-4 lg:border-r"
                    style={{ borderColor: "rgba(140,200,80,0.12)", background: "rgba(106,171,72,0.06)" }}
                  >
                    <dt className="text-xs font-bold uppercase tracking-widest" style={{ color: "#a8c888" }}>Recorrido</dt>
                    <dd className="mt-2 text-sm font-bold" style={{ color: "#e8f2d8" }}>{route.distanceKm} km</dd>
                  </div>
                )}
                <div
                  className="rounded-2xl border p-4 lg:border-r"
                  style={{ borderColor: "rgba(140,200,80,0.12)", background: "rgba(106,171,72,0.06)" }}
                >
                  <dt className="text-xs font-bold uppercase tracking-widest" style={{ color: "#a8c888" }}>Sentido</dt>
                  <dd className="mt-2 text-sm font-bold" style={{ color: "#e8f2d8" }}>{directions}</dd>
                </div>
                {schedule && (
                  <div
                    className="rounded-2xl border p-4 lg:border-r"
                    style={{ borderColor: "rgba(140,200,80,0.12)", background: "rgba(106,171,72,0.06)" }}
                  >
                    <dt className="text-xs font-bold uppercase tracking-widest" style={{ color: "#a8c888" }}>Horario</dt>
                    <dd className="mt-2 text-sm font-bold" style={{ color: "#e8f2d8" }}>{schedule.first} – {schedule.last}</dd>
                  </div>
                )}
                {frequencyLabel && (
                  <div
                    className="rounded-2xl border p-4 lg:border-r"
                    style={{ borderColor: "rgba(140,200,80,0.12)", background: "rgba(106,171,72,0.06)" }}
                  >
                    <dt className="text-xs font-bold uppercase tracking-widest" style={{ color: "#a8c888" }}>Frecuencia</dt>
                    <dd className="mt-2 text-sm font-bold" style={{ color: "#e8f2d8" }}>{frequencyLabel}</dd>
                  </div>
                )}
            </dl>

            <div className="p-6 md:p-8 lg:p-10 xl:p-12">
              <div className="lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)] lg:gap-12">

              {route.landmarks.length > 0 && (
                <section>
                  <h2 className="mb-4 font-serif text-xl font-black lg:text-2xl" style={{ color: "#e8f2d8" }}>
                    Puntos de referencia en la ruta
                  </h2>
                  <ul className="grid gap-2 sm:grid-cols-2 lg:gap-3">
                    {route.landmarks.map((lm) => (
                      <li
                        key={lm}
                        className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm lg:rounded-lg"
                        style={{ borderColor: "rgba(140,200,80,0.12)", background: "rgba(106,171,72,0.06)", color: "#e8f2d8" }}
                      >
                        <span style={{ color: "#6aab48" }}>▸</span> {lm}
                      </li>
                    ))}
                  </ul>
                  {route.name !== "Ruta 1 - San José" && (
                    <p className="mt-3 text-[11px]" style={{ color: "#78965f" }}>
                      Referencias con datos de{" "}
                      <a
                        href="https://www.openstreetmap.org/copyright"
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2 transition hover:opacity-80"
                      >
                        OpenStreetMap contributors
                      </a>
                      . Verifica el punto exacto antes de viajar.
                    </p>
                  )}
                </section>
              )}

              <section
                className="mt-8 rounded-2xl border bg-[rgba(184,232,64,0.06)] p-5 lg:mt-0 lg:rounded-none lg:border-y-0 lg:border-r-0 lg:bg-transparent lg:pl-10"
                style={{ borderColor: "rgba(184,232,64,0.2)" }}
              >
                <h2 className="font-serif text-xl font-black lg:text-2xl" style={{ color: "#e8f2d8" }}>Cómo planear tu viaje</h2>
                <p className="mt-3 text-sm leading-7" style={{ color: "#a8c888" }}>
                  Abre el mapa de UruGo y marca tu punto de origen y tu destino. El sistema calcula si la {route.name} cubre tu trayecto, qué tan lejos están las paradas y si necesitas caminar o hacer transbordo con otra ruta o el Teleférico de Uruapan.
                  {estimatedMinutes && ` El recorrido completo toma aproximadamente ${estimatedMinutes} minutos.`}
                </p>
                <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "#a8c888" }}>
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0" style={{ color: "#b8e840" }} aria-hidden="true">
                    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                  Recorrido verificado en campo · actualizado {DATA_LAST_UPDATED}
                </p>
              </section>
              </div>

              <section className="mt-10 border-t pt-9" style={{ borderColor: "rgba(140,200,80,0.10)" }}>
                <h2 className="mb-5 font-serif text-xl font-black lg:text-2xl" style={{ color: "#e8f2d8" }}>
                  Preguntas frecuentes
                </h2>
                <div className="grid gap-4 lg:grid-cols-2">
                  {faqs.map((faq) => (
                    <div
                      key={faq.question}
                      className="rounded-2xl border p-5 lg:rounded-lg"
                      style={{ borderColor: "rgba(140,200,80,0.10)", background: "rgba(20,28,16,0.6)" }}
                    >
                      <h3 className="text-sm font-bold mb-2" style={{ color: "#b8e840" }}>{faq.question}</h3>
                      <p className="text-sm leading-6" style={{ color: "#a8c888" }}>{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="mt-10 flex flex-col gap-3 border-t pt-8 sm:flex-row lg:justify-end" style={{ borderColor: "rgba(140,200,80,0.10)" }}>
                <Link
                  href={`/mapa?r=${encodeURIComponent(route.name)}`}
                  className="inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-black text-white transition hover:opacity-90"
                  style={{ background: "#6aab48" }}
                >
                  Ver en el mapa
                </Link>
                <Link
                  href="/horarios"
                  className="inline-flex h-12 items-center justify-center rounded-full border px-6 text-sm font-bold transition"
                  style={{
                    borderColor: "rgba(140,200,80,0.15)",
                    background: "rgba(106,171,72,0.06)",
                    color: "#e8f2d8",
                  }}
                >
                  Horarios de todas las rutas
                </Link>
                <Link
                  href="/rutas"
                  className="inline-flex h-12 items-center justify-center rounded-full border px-6 text-sm font-bold transition"
                  style={{
                    borderColor: "rgba(140,200,80,0.15)",
                    background: "rgba(106,171,72,0.06)",
                    color: "#e8f2d8",
                  }}
                >
                  Ver todas las rutas
                </Link>
              </div>
            </div>
          </article>
        </div>
      </div>

      {/* CTA fijo inferior — acceso rápido al mapa en móvil/tablet */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t px-4 py-3 backdrop-blur-xl lg:hidden"
        style={{
          borderColor: "rgba(140,200,80,0.14)",
          background: "rgba(12,17,10,0.92)",
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <Link
          href={`/mapa?r=${encodeURIComponent(route.name)}`}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-black text-white transition active:scale-[0.98]"
          style={{ background: "#6aab48" }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="10" r="2.2" fill="currentColor" />
          </svg>
          Ver {route.name} en el mapa
        </Link>
      </div>
    </main>
  );
}

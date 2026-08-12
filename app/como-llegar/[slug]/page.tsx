import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ForceDark from "@/components/ForceDark";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import { findPlaceSeoItem, getPlaceSeoItems, getRoutesNearPlace, walkMinutesFor } from "@/lib/como-llegar";
import { DATA_LAST_UPDATED, FARES_2026 } from "@/lib/mobility-config";
import { getSchedule } from "@/lib/schedules";
import { SITE_URL } from "@/lib/site-url";

type PlacePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getPlaceSeoItems().map((place) => ({ slug: place.slug }));
}

export async function generateMetadata({ params }: PlacePageProps): Promise<Metadata> {
  const { slug } = await params;
  const place = findPlaceSeoItem(slug);
  if (!place) return {};

  const routes = getRoutesNearPlace(place.center);
  const routeNames = routes.slice(0, 3).map((r) => r.name).join(", ");

  return {
    title: `Cómo llegar a ${place.label} en camión — Uruapan`,
    description: `Rutas de camión que te dejan en ${place.label}, Uruapan${routeNames ? `: ${routeNames}` : ""}. Tarifa ${FARES_2026.urbanBus.price}, distancias a pie y mapa interactivo.`,
    alternates: { canonical: `${SITE_URL}/como-llegar/${place.slug}` },
    openGraph: {
      title: `Cómo llegar a ${place.label} en camión`,
      description: `Qué rutas de transporte público te dejan en ${place.label}, Uruapan, y a cuántos minutos caminando.`,
      url: `${SITE_URL}/como-llegar/${place.slug}`,
      type: "article"
    }
  };
}

export default async function ComoLlegarPage({ params }: PlacePageProps) {
  const { slug } = await params;
  const place = findPlaceSeoItem(slug);
  if (!place) notFound();

  const routes = getRoutesNearPlace(place.center);
  const [lng, lat] = place.center;
  const mapHref = `/mapa?b=${lng.toFixed(6)},${lat.toFixed(6)}&destino=${encodeURIComponent(place.label)}`;

  const faqs = [
    {
      question: `¿Qué rutas de camión pasan por ${place.label}?`,
      answer:
        routes.length > 0
          ? `Las rutas que te dejan a menos de 500 m de ${place.label} son: ${routes.map((r) => r.name).join(", ")}. La más cercana pasa a ~${routes[0].distanceM} m (${walkMinutesFor(routes[0].distanceM)} min caminando).`
          : `Ninguna ruta urbana pasa a menos de 500 m de ${place.label}. Usa el mapa de UruGo para encontrar la combinación con transbordo más corta.`
    },
    {
      question: `¿Cuánto cuesta llegar a ${place.label} en camión?`,
      answer: `La tarifa del camión urbano en Uruapan es de ${FARES_2026.urbanBus.price} por viaje, pagadera en efectivo al abordar. Si necesitas transbordo, pagas un pasaje por cada camión.`
    },
    {
      question: `¿Dónde me bajo para ir a ${place.label}?`,
      answer: `Los camiones en Uruapan paran casi en cualquier esquina del recorrido. Avisa al chofer o toca el timbre cuando te acerques a ${place.label}. En el mapa de UruGo puedes ver el punto exacto del recorrido más cercano.`
    }
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Cómo llegar", item: `${SITE_URL}/como-llegar` },
          { "@type": "ListItem", position: 3, name: place.label, item: `${SITE_URL}/como-llegar/${place.slug}` }
        ]
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer }
        }))
      }
    ]
  };

  return (
    <main style={{ background: "#0c110a", color: "#e8f2d8", minHeight: "100dvh" }}>
      <ForceDark />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PublicHeader active="como-llegar" mapHref={mapHref} />

      <div className="px-5 pt-28 pb-28 sm:px-8 lg:px-10 lg:pb-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-3">
            <Link
              href="/como-llegar"
              className="text-xs font-semibold uppercase tracking-widest transition hover:opacity-80"
              style={{ color: "#6aab48" }}
            >
              ← Todos los lugares
            </Link>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.22em]" style={{ color: "#b8e840" }}>
            Cómo llegar en camión · Uruapan
          </p>
          <h1
            className="mt-2 font-serif text-4xl font-black tracking-tight md:text-5xl"
            style={{ color: "#e8f2d8", letterSpacing: "-0.025em" }}
          >
            {place.label}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7" style={{ color: "#a8c888" }}>
            {routes.length > 0
              ? `${routes.length} ruta${routes.length === 1 ? "" : "s"} de camión te ${routes.length === 1 ? "deja" : "dejan"} cerca de ${place.label}. Tarifa ${FARES_2026.urbanBus.price} en efectivo.`
              : `Ninguna ruta pasa directamente por ${place.label}; usa el mapa para planear un viaje con transbordo.`}
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "#a8c888" }}>
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0" style={{ color: "#b8e840" }} aria-hidden="true">
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            Recorridos verificados en campo · actualizado {DATA_LAST_UPDATED}
          </p>

          {/* Rutas cercanas */}
          {routes.length > 0 && (
            <div className="mt-8 flex flex-col gap-2.5">
              {routes.map((route) => {
                const schedule = getSchedule(route.name);
                return (
                  <div
                    key={route.name}
                    className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center"
                    style={{ borderColor: "rgba(140,200,80,0.12)", background: "rgba(20,28,16,0.6)" }}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: route.color }} />
                      <div className="min-w-0">
                        <p className="font-serif text-base font-black" style={{ color: "#e8f2d8" }}>
                          {route.name}
                          {route.destination && (
                            <span className="ml-2 text-xs font-normal" style={{ color: "#6aab48" }}>
                              → {route.destination}
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-[12px]" style={{ color: "#a8c888" }}>
                          Te deja a ~{route.distanceM} m ({walkMinutesFor(route.distanceM)} min caminando)
                          {schedule && ` · ${schedule.first}–${schedule.last}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {route.routeSlug && (
                        <Link
                          href={`/ruta/${route.routeSlug}`}
                          prefetch={false}
                          className="inline-flex h-9 items-center rounded-full border px-4 text-xs font-bold transition hover:opacity-80"
                          style={{ borderColor: "rgba(140,200,80,0.15)", color: "#e8f2d8" }}
                        >
                          Detalles
                        </Link>
                      )}
                      <Link
                        href={`/mapa?r=${encodeURIComponent(route.name)}`}
                        prefetch={false}
                        className="inline-flex h-9 items-center gap-1 rounded-full px-4 text-xs font-bold transition hover:opacity-90"
                        style={{ background: "rgba(106,171,72,0.15)", color: "#b8e840" }}
                      >
                        Ver en mapa
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* CTA principal */}
          <div
            className="mt-8 rounded-2xl border p-5"
            style={{ borderColor: "rgba(184,232,64,0.2)", background: "rgba(184,232,64,0.06)" }}
          >
            <h2 className="font-serif text-xl font-black" style={{ color: "#e8f2d8" }}>
              Planea tu viaje exacto
            </h2>
            <p className="mt-2 text-sm leading-7" style={{ color: "#a8c888" }}>
              Abre el mapa con {place.label} como destino: marca tu origen (o usa tu ubicación) y UruGo
              te dirá qué ruta tomar, dónde subir, dónde bajar y si necesitas transbordo.
            </p>
            <Link
              href={mapHref}
              className="mt-4 inline-flex h-11 items-center rounded-full px-6 text-sm font-black text-white transition hover:opacity-90"
              style={{ background: "#6aab48" }}
            >
              Cómo llegar desde mi ubicación →
            </Link>
          </div>

          {/* FAQs */}
          <section className="mt-10">
            <h2 className="font-serif text-2xl font-black mb-5" style={{ color: "#e8f2d8" }}>
              Preguntas frecuentes
            </h2>
            <div className="flex flex-col gap-4">
              {faqs.map((faq) => (
                <div
                  key={faq.question}
                  className="rounded-2xl border p-5"
                  style={{ borderColor: "rgba(140,200,80,0.10)", background: "rgba(20,28,16,0.6)" }}
                >
                  <h3 className="text-sm font-bold mb-2" style={{ color: "#b8e840" }}>{faq.question}</h3>
                  <p className="text-sm leading-6" style={{ color: "#a8c888" }}>{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <PublicFooter />

      {/* CTA fijo inferior en móvil */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t px-4 py-3 backdrop-blur-xl lg:hidden"
        style={{
          borderColor: "rgba(140,200,80,0.14)",
          background: "rgba(12,17,10,0.92)",
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <Link
          href={mapHref}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-black text-white transition active:scale-[0.98]"
          style={{ background: "#6aab48" }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="10" r="2.2" fill="currentColor" />
          </svg>
          Cómo llegar a {place.label}
        </Link>
      </div>
    </main>
  );
}

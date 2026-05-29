import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Logo from "@/components/Logo";
import RoutePreviewSVG from "@/components/RoutePreviewSVG";
import { APP_BRAND, FARES_2026 } from "@/lib/mobility-config";
import { findRouteSeoItem, getRouteSeoItems } from "@/lib/route-seo";

type RoutePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return getRouteSeoItems().map((route) => ({ slug: route.slug }));
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
  const estimatedMinutes = route.distanceKm > 0 ? Math.round((route.distanceKm / 18) * 60) : null;

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

      <div className="px-5 pt-28 pb-8 sm:px-8 lg:px-10">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        <div className="mx-auto max-w-3xl">
          <div className="mb-4">
            <Link
              href="/rutas"
              className="text-xs font-semibold uppercase tracking-widest transition hover:opacity-80"
              style={{ color: "#6aab48" }}
            >
              ← Todas las rutas
            </Link>
          </div>
          <article
            className="overflow-hidden rounded-[2rem] border shadow-[0_20px_80px_rgba(0,0,0,0.35)]"
            style={{ borderColor: "rgba(140,200,80,0.12)", background: "rgba(20,28,16,0.8)" }}
          >
            <div className="h-2" style={{ backgroundColor: route.color }} />

            {/* Route path preview */}
            <div
              className="w-full overflow-hidden"
              style={{ background: "rgba(0,0,0,0.3)", borderBottom: "1px solid rgba(140,200,80,0.08)" }}
            >
              <RoutePreviewSVG
                routeName={route.name}
                color={route.color}
                width={800}
                height={180}
                strokeWidth={3}
                className="w-full h-auto"
              />
            </div>

            <div className="p-6 md:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: "#b8e840" }}>
                Ruta de camión · Uruapan
              </p>
              <h1
                className="mt-3 font-serif text-4xl font-black tracking-tight md:text-5xl"
                style={{ color: "#e8f2d8" }}
              >
                {title}
              </h1>
              <p className="mt-4 text-sm leading-7" style={{ color: "#a8c888" }}>
                {route.destination
                  ? `La ${route.name} conecta distintas zonas de Uruapan con ${route.destination}${route.distanceKm > 0 ? `, con un recorrido total de ${route.distanceKm} km` : ""}. Consulta el mapa para ver paradas y transbordos disponibles.`
                  : `La ${route.name} recorre colonias de Uruapan${route.distanceKm > 0 ? ` en un trayecto de ${route.distanceKm} km` : ""}. Usa el mapa para encontrar la parada más cercana a tu origen y destino.`
                }
              </p>

              <dl className="mt-8 grid gap-3 sm:grid-cols-4">
                <div
                  className="rounded-2xl border p-4"
                  style={{ borderColor: "rgba(140,200,80,0.12)", background: "rgba(106,171,72,0.06)" }}
                >
                  <dt className="text-xs font-bold uppercase tracking-widest" style={{ color: "#a8c888" }}>Destino</dt>
                  <dd className="mt-2 text-sm font-bold" style={{ color: "#e8f2d8" }}>{route.destination ?? "Ruta local"}</dd>
                </div>
                <div
                  className="rounded-2xl border p-4"
                  style={{ borderColor: "rgba(140,200,80,0.12)", background: "rgba(106,171,72,0.06)" }}
                >
                  <dt className="text-xs font-bold uppercase tracking-widest" style={{ color: "#a8c888" }}>Tarifa</dt>
                  <dd className="mt-2 text-sm font-bold" style={{ color: "#e8f2d8" }}>{FARES_2026.urbanBus.price}</dd>
                </div>
                {route.distanceKm > 0 && (
                  <div
                    className="rounded-2xl border p-4"
                    style={{ borderColor: "rgba(140,200,80,0.12)", background: "rgba(106,171,72,0.06)" }}
                  >
                    <dt className="text-xs font-bold uppercase tracking-widest" style={{ color: "#a8c888" }}>Recorrido</dt>
                    <dd className="mt-2 text-sm font-bold" style={{ color: "#e8f2d8" }}>{route.distanceKm} km</dd>
                  </div>
                )}
                <div
                  className="rounded-2xl border p-4"
                  style={{ borderColor: "rgba(140,200,80,0.12)", background: "rgba(106,171,72,0.06)" }}
                >
                  <dt className="text-xs font-bold uppercase tracking-widest" style={{ color: "#a8c888" }}>Sentido</dt>
                  <dd className="mt-2 text-sm font-bold" style={{ color: "#e8f2d8" }}>{directions}</dd>
                </div>
              </dl>

              {route.landmarks.length > 0 && (
                <section className="mt-8">
                  <h2 className="font-serif text-xl font-black mb-4" style={{ color: "#e8f2d8" }}>
                    Puntos de referencia en la ruta
                  </h2>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {route.landmarks.map((lm) => (
                      <li
                        key={lm}
                        className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"
                        style={{ borderColor: "rgba(140,200,80,0.12)", background: "rgba(106,171,72,0.06)", color: "#e8f2d8" }}
                      >
                        <span style={{ color: "#6aab48" }}>▸</span> {lm}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section
                className="mt-8 rounded-2xl border p-5"
                style={{ borderColor: "rgba(184,232,64,0.2)", background: "rgba(184,232,64,0.06)" }}
              >
                <h2 className="font-serif text-xl font-black" style={{ color: "#e8f2d8" }}>Cómo planear tu viaje</h2>
                <p className="mt-3 text-sm leading-7" style={{ color: "#a8c888" }}>
                  Abre el mapa de UruGo y marca tu punto de origen y tu destino. El sistema calcula si la {route.name} cubre tu trayecto, qué tan lejos están las paradas y si necesitas caminar o hacer transbordo con otra ruta o el Teleférico de Uruapan.
                  {estimatedMinutes && ` El recorrido completo toma aproximadamente ${estimatedMinutes} minutos.`}
                </p>
              </section>

              <section className="mt-8">
                <h2 className="font-serif text-xl font-black mb-5" style={{ color: "#e8f2d8" }}>
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

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/mapa?destino=${encodeURIComponent(route.destination ?? route.name)}`}
                  className="inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-black text-white transition hover:opacity-90"
                  style={{ background: "#6aab48" }}
                >
                  Ver en el mapa
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
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import ForceDark from "@/components/ForceDark";
import { DATA_LAST_UPDATED, FARES_2026, TELEFERICO_URUAPAN } from "@/lib/mobility-config";
import { getRouteSeoItems } from "@/lib/route-seo";
import { getSchedule } from "@/lib/schedules";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Horarios de camiones en Uruapan 2026 — Todas las rutas",
  description:
    "Horarios y frecuencia de las 40 rutas de camión urbano en Uruapan, Michoacán. Primer y último camión, cada cuántos minutos pasa y horario del Teleférico.",
  alternates: { canonical: `${SITE_URL}/horarios` },
  openGraph: {
    title: "Horarios de camiones en Uruapan — Todas las rutas",
    description:
      "Primer y último camión, frecuencia de paso y horario del Teleférico de Uruapan, en una sola tabla.",
    url: `${SITE_URL}/horarios`,
    type: "website"
  }
};

function frequencyLabel(freqMin: number, freqMax: number, continuous?: boolean): string {
  if (continuous) return "Continuo";
  return freqMin === freqMax ? `Cada ${freqMin} min` : `Cada ${freqMin}–${freqMax} min`;
}

export default function HorariosPage() {
  const routes = getRouteSeoItems().filter((r) => !r.name.toLowerCase().includes("teleférico"));

  const rows = routes
    .map((route) => {
      const schedule = getSchedule(route.name);
      if (!schedule) return null;
      return { route, schedule };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const faqs = [
    {
      question: "¿A qué hora pasa el primer camión en Uruapan?",
      answer:
        "La mayoría de las rutas urbanas inician entre 5:15 y 6:00 de la mañana. Las rutas con servicio más temprano son la Ruta 2 (5:15) y las rutas 1, 1A, 20 y 176 (5:30)."
    },
    {
      question: "¿Hasta qué hora hay camiones en Uruapan?",
      answer:
        "El servicio termina entre 21:00 y 22:30 según la ruta. La Ruta 176 es de las que más tarde circulan (hasta 23:30). El Teleférico opera hasta las 23:00."
    },
    {
      question: "¿Cada cuánto pasa el camión?",
      answer:
        "En horas pico la mayoría de las rutas pasan cada 8 a 15 minutos. En horarios de baja demanda la frecuencia puede llegar a 20 minutos."
    },
    {
      question: "¿Los horarios son exactos?",
      answer:
        "Los camiones urbanos en Uruapan no operan con horario fijo por parada: los rangos son aproximados y pueden variar por tráfico y día de la semana. Los datos se verificaron en campo y se actualizaron en " + DATA_LAST_UPDATED + "."
    }
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Horarios", item: `${SITE_URL}/horarios` }
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

  const cellBorder = { borderColor: "rgba(140,200,80,0.1)" };

  return (
    <main style={{ background: "#0c110a", color: "#e8f2d8", minHeight: "100dvh" }}>
      <ForceDark />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

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

      <div className="px-5 pt-28 pb-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-3">
            <Link
              href="/rutas"
              className="text-xs font-semibold uppercase tracking-widest transition hover:opacity-80"
              style={{ color: "#6aab48" }}
            >
              ← Todas las rutas
            </Link>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.22em]" style={{ color: "#b8e840" }}>
            Uruapan, Michoacán · 2026
          </p>
          <h1
            className="mt-2 font-serif text-4xl font-black tracking-tight md:text-5xl"
            style={{ color: "#e8f2d8", letterSpacing: "-0.025em" }}
          >
            Horarios de <em style={{ fontStyle: "italic", color: "#b8e840" }}>camiones</em> en Uruapan
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7" style={{ color: "#a8c888" }}>
            Primer y último camión de cada ruta y cada cuántos minutos pasa. Los camiones no tienen
            horario fijo por parada: los rangos son aproximados y pueden variar por tráfico.
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "#a8c888" }}>
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0" style={{ color: "#b8e840" }} aria-hidden="true">
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            Datos verificados en campo · actualizado {DATA_LAST_UPDATED}
          </p>

          {/* Teleférico destacado */}
          <div
            className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border p-4"
            style={{ borderColor: "rgba(0,212,170,0.2)", background: "rgba(0,212,170,0.04)" }}
          >
            <p className="font-serif text-lg font-black" style={{ color: "#e8f2d8" }}>Teleférico Uruapan</p>
            <p className="text-sm font-semibold" style={{ color: "#00D4AA" }}>{TELEFERICO_URUAPAN.hours}</p>
            <p className="text-sm" style={{ color: "#a8c888" }}>{TELEFERICO_URUAPAN.frequency} · {TELEFERICO_URUAPAN.fare} con tarjeta</p>
            <Link
              href="/teleferico-uruapan-horario"
              className="text-xs font-bold transition hover:opacity-80"
              style={{ color: "#00D4AA" }}
            >
              Ver guía completa →
            </Link>
          </div>

          {/* Tabla de horarios */}
          <div
            className="mt-6 overflow-x-auto rounded-2xl border"
            style={{ borderColor: "rgba(140,200,80,0.12)", background: "rgba(20,28,16,0.6)" }}
          >
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <caption className="sr-only">
                Horarios y frecuencia de las rutas de camión urbano en Uruapan
              </caption>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(140,200,80,0.15)" }}>
                  <th scope="col" className="px-4 py-3 text-xs font-bold uppercase tracking-widest" style={{ color: "#6aab48" }}>Ruta</th>
                  <th scope="col" className="px-4 py-3 text-xs font-bold uppercase tracking-widest" style={{ color: "#6aab48" }}>Primer camión</th>
                  <th scope="col" className="px-4 py-3 text-xs font-bold uppercase tracking-widest" style={{ color: "#6aab48" }}>Último camión</th>
                  <th scope="col" className="px-4 py-3 text-xs font-bold uppercase tracking-widest" style={{ color: "#6aab48" }}>Frecuencia</th>
                  <th scope="col" className="px-4 py-3 text-xs font-bold uppercase tracking-widest" style={{ color: "#6aab48" }}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ route, schedule }) => (
                  <tr key={route.slug} className="border-b last:border-b-0" style={cellBorder}>
                    <th scope="row" className="px-4 py-3 font-semibold" style={{ color: "#e8f2d8" }}>
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: route.color }} />
                        <span>
                          {route.name}
                          {route.destination && (
                            <span className="block text-[11px] font-normal" style={{ color: "#6aab48" }}>
                              → {route.destination}
                            </span>
                          )}
                        </span>
                      </span>
                    </th>
                    <td className="px-4 py-3 font-semibold" style={{ color: "#e8f2d8" }}>{schedule.first}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: "#e8f2d8" }}>{schedule.last}</td>
                    <td className="px-4 py-3" style={{ color: "#a8c888" }}>
                      {frequencyLabel(schedule.freqMin, schedule.freqMax, schedule.continuous)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/ruta/${route.slug}`}
                        className="text-xs font-bold whitespace-nowrap transition hover:opacity-80"
                        style={{ color: "#b8e840" }}
                        aria-label={`Ver detalles de la ${route.name}`}
                      >
                        Ver ruta →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-[11px]" style={{ color: "rgba(232,242,216,0.45)" }}>
            Tarifa única: {FARES_2026.urbanBus.price} en efectivo. Los horarios marcados como estimación
            siguen los patrones típicos de operación en Uruapan y pueden variar.
          </p>

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

          {/* CTA */}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/mapa"
              className="inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-black text-white transition hover:opacity-90"
              style={{ background: "#6aab48" }}
            >
              Planear mi viaje en el mapa
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
              Ver directorio de rutas
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

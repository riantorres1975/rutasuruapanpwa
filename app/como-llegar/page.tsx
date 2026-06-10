import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import ForceDark from "@/components/ForceDark";
import { getPlaceSeoItems, getRoutesNearPlace } from "@/lib/como-llegar";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Cómo llegar en camión a los lugares de Uruapan",
  description:
    "Guías para llegar en transporte público a los lugares más visitados de Uruapan: hospitales, centro, central de autobuses, plazas y más. Rutas, distancias a pie y mapa.",
  alternates: { canonical: `${SITE_URL}/como-llegar` },
  openGraph: {
    title: "Cómo llegar en camión a los lugares de Uruapan",
    description: "Qué rutas de camión te dejan en cada lugar importante de Uruapan.",
    url: `${SITE_URL}/como-llegar`,
    type: "website"
  }
};

export default function ComoLlegarIndexPage() {
  const places = getPlaceSeoItems().map((place) => ({
    ...place,
    routeCount: getRoutesNearPlace(place.center).length,
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Cómo llegar", item: `${SITE_URL}/como-llegar` }
        ]
      },
      {
        "@type": "ItemList",
        name: "Cómo llegar en camión a lugares de Uruapan",
        numberOfItems: places.length,
        itemListElement: places.map((place, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: place.label,
          url: `${SITE_URL}/como-llegar/${place.slug}`
        }))
      }
    ]
  };

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
        <div className="mx-auto max-w-4xl">
          <div className="mb-3">
            <Link
              href="/"
              className="text-xs font-semibold uppercase tracking-widest transition hover:opacity-80"
              style={{ color: "#6aab48" }}
            >
              ← Inicio
            </Link>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.22em]" style={{ color: "#b8e840" }}>
            Uruapan, Michoacán
          </p>
          <h1
            className="mt-2 font-serif text-4xl font-black tracking-tight md:text-5xl"
            style={{ color: "#e8f2d8", letterSpacing: "-0.025em" }}
          >
            ¿Cómo <em style={{ fontStyle: "italic", color: "#b8e840" }}>llegar</em> en camión?
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7" style={{ color: "#a8c888" }}>
            Elige a dónde vas y te decimos qué rutas de camión te dejan ahí, a cuántos minutos
            caminando y cómo planear el viaje desde tu ubicación.
          </p>

          <div className="mt-8 grid gap-2.5 sm:grid-cols-2">
            {places.map((place) => (
              <Link
                key={place.slug}
                href={`/como-llegar/${place.slug}`}
                className="group flex items-center justify-between gap-3 rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:border-lima/30"
                style={{ borderColor: "rgba(140,200,80,0.1)", background: "rgba(20,28,16,0.6)" }}
              >
                <div className="min-w-0">
                  <p className="truncate font-serif text-base font-black" style={{ color: "#e8f2d8" }}>
                    {place.label}
                  </p>
                  <p className="mt-1 text-[12px]" style={{ color: "#6aab48" }}>
                    {place.routeCount > 0
                      ? `${place.routeCount} ruta${place.routeCount === 1 ? "" : "s"} te dejan cerca`
                      : "Llega con transbordo"}
                  </p>
                </div>
                <span className="shrink-0 text-sm transition-transform group-hover:translate-x-0.5" style={{ color: "#b8e840" }}>
                  →
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/mapa"
              className="inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-black text-white transition hover:opacity-90"
              style={{ background: "#6aab48" }}
            >
              Abrir el mapa interactivo
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
              Ver horarios de rutas
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

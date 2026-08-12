import type { Metadata } from "next";
import Link from "next/link";
import ForceDark from "@/components/ForceDark";
import PlaceDirectory from "@/components/PlaceDirectory";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
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
  const places = getPlaceSeoItems().map((place) => {
    const label = place.label.toLowerCase();
    const category = /hospital|imss|clínica|clinica|salud/.test(label)
      ? "Salud"
      : /universidad|unid|escuela|esfu|tecnol|colegio|facultad/.test(label)
        ? "Educación"
        : /mercado|plaza|coppel|aurrera|comercial|tienda/.test(label)
          ? "Compras"
          : /presidencia|ine|gobierno|trámites|tramites/.test(label)
            ? "Gobierno"
            : /parque|unidad deportiva|estadio|centro histórico|centro historico/.test(label)
              ? "Recreación"
              : "Todos";
    return { slug: place.slug, label: place.label, routeCount: getRoutesNearPlace(place.center).length, category };
  });

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

      <PublicHeader active="como-llegar" />

      <div className="px-5 pt-28 pb-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-5xl min-w-0">
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

          <PlaceDirectory places={places} />

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
      <PublicFooter />
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Logo from "@/components/Logo";
import { APP_BRAND, FARES_2026 } from "@/lib/mobility-config";
import { findRouteSeoItem, getRouteSeoItems } from "@/lib/route-seo";

type RoutePageProps = {
  params: {
    slug: string;
  };
};

export function generateStaticParams() {
  return getRouteSeoItems().map((route) => ({ slug: route.slug }));
}

export function generateMetadata({ params }: RoutePageProps): Metadata {
  const route = findRouteSeoItem(params.slug);

  if (!route) {
    return {};
  }

  const label = route.destination ? `${route.name} a ${route.destination}` : route.name;

  return {
    title: `${label} en Uruapan`,
    description: `Consulta la ${route.name} de camión urbano en Uruapan, destino ${route.destination ?? "local"}, tarifa base y acceso al mapa interactivo.`,
    alternates: {
      canonical: `/ruta/${route.slug}`
    },
    openGraph: {
      title: `${label} en Uruapan`,
      description: `Información de la ${route.name}, tarifa y mapa de transporte público en Uruapan.`,
      url: `/ruta/${route.slug}`,
      type: "article"
    }
  };
}

export default function RoutePage({ params }: RoutePageProps) {
  const route = findRouteSeoItem(params.slug);

  if (!route) {
    notFound();
  }

  const title = route.destination ? `${route.name}: ${route.destination}` : route.name;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: "/" },
          { "@type": "ListItem", position: 2, name: "Rutas", item: "/mapa" },
          { "@type": "ListItem", position: 3, name: route.name, item: `/ruta/${route.slug}` }
        ]
      },
      {
        "@type": "BusTrip",
        name: `${route.name} Uruapan`,
        description: `Ruta de camión urbano en Uruapan${route.destination ? ` hacia ${route.destination}` : ""}.`,
        provider: {
          "@type": "Organization",
          name: APP_BRAND.name
        },
        offers: {
          "@type": "Offer",
          price: FARES_2026.urbanBus.price.replace(/[^0-9.]/g, ""),
          priceCurrency: "MXN"
        }
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
          <article
            className="overflow-hidden rounded-[2rem] border shadow-[0_20px_80px_rgba(0,0,0,0.35)]"
            style={{ borderColor: "rgba(140,200,80,0.12)", background: "rgba(20,28,16,0.8)" }}
          >
            <div className="h-2" style={{ backgroundColor: route.color }} />
            <div className="p-6 md:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: "#b8e840" }}>
                Ruta de camión Uruapan
              </p>
              <h1
                className="mt-3 font-serif text-4xl font-black tracking-tight md:text-5xl"
                style={{ color: "#e8f2d8" }}
              >
                {title}
              </h1>
              <p className="mt-4 text-sm leading-7" style={{ color: "#5a7848" }}>
                Consulta información básica de la {route.name} en Uruapan y abre el mapa interactivo para marcar origen, destino, paradas cercanas y posibles transbordos.
              </p>

              <dl className="mt-8 grid gap-3 sm:grid-cols-3">
                <div
                  className="rounded-2xl border p-4"
                  style={{ borderColor: "rgba(140,200,80,0.12)", background: "rgba(106,171,72,0.06)" }}
                >
                  <dt className="text-xs font-bold uppercase tracking-widest" style={{ color: "#5a7848" }}>Destino</dt>
                  <dd className="mt-2 text-sm font-bold" style={{ color: "#e8f2d8" }}>{route.destination ?? "Ruta local"}</dd>
                </div>
                <div
                  className="rounded-2xl border p-4"
                  style={{ borderColor: "rgba(140,200,80,0.12)", background: "rgba(106,171,72,0.06)" }}
                >
                  <dt className="text-xs font-bold uppercase tracking-widest" style={{ color: "#5a7848" }}>Tarifa base</dt>
                  <dd className="mt-2 text-sm font-bold" style={{ color: "#e8f2d8" }}>{FARES_2026.urbanBus.price}</dd>
                </div>
                <div
                  className="rounded-2xl border p-4"
                  style={{ borderColor: "rgba(140,200,80,0.12)", background: "rgba(106,171,72,0.06)" }}
                >
                  <dt className="text-xs font-bold uppercase tracking-widest" style={{ color: "#5a7848" }}>Sentidos</dt>
                  <dd className="mt-2 text-sm font-bold" style={{ color: "#e8f2d8" }}>
                    {route.hasIda && route.hasVuelta ? "Ida y vuelta" : route.hasIda ? "Ida" : "Vuelta"}
                  </dd>
                </div>
              </dl>

              <section
                className="mt-8 rounded-2xl border p-5"
                style={{ borderColor: "rgba(184,232,64,0.2)", background: "rgba(184,232,64,0.06)" }}
              >
                <h2 className="font-serif text-xl font-black" style={{ color: "#e8f2d8" }}>Cómo usar esta ruta</h2>
                <p className="mt-3 text-sm leading-7" style={{ color: "#5a7848" }}>
                  Abre el mapa, marca tu punto de origen y destino, y VoyUruapan calculará si esta ruta es conveniente o si necesitas caminar o transbordar con otra ruta o el Teleférico.
                </p>
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
                  href="/"
                  className="inline-flex h-12 items-center justify-center rounded-full border px-6 text-sm font-bold transition"
                  style={{
                    borderColor: "rgba(140,200,80,0.15)",
                    background: "rgba(106,171,72,0.06)",
                    color: "#e8f2d8",
                  }}
                >
                  Volver al inicio
                </Link>
              </div>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}

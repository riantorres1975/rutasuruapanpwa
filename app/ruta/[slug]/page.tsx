import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
    <main className="min-h-dvh bg-[#080C18] px-5 py-8 text-slate-100 sm:px-8 lg:px-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 rounded-2xl border border-[#00D4AA]/20 bg-[#0E1526] px-3.5 py-2 text-sm font-bold text-white">
          <span className="h-2.5 w-2.5 rounded-full bg-[#00D4AA]" />
          {APP_BRAND.name}
        </Link>

        <article className="mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-[#0E1526]/80 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <div className="h-2" style={{ backgroundColor: route.color }} />
          <div className="p-6 md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#00D4AA]">Ruta de camión Uruapan</p>
            <h1 className="mt-3 font-display text-4xl font-black tracking-tight text-white md:text-5xl">{title}</h1>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Consulta información básica de la {route.name} en Uruapan y abre el mapa interactivo para marcar origen, destino, paradas cercanas y posibles transbordos.
            </p>

            <dl className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">Destino</dt>
                <dd className="mt-2 text-sm font-bold text-white">{route.destination ?? "Ruta local"}</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">Tarifa base</dt>
                <dd className="mt-2 text-sm font-bold text-white">{FARES_2026.urbanBus.price}</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">Sentidos</dt>
                <dd className="mt-2 text-sm font-bold text-white">{route.hasIda && route.hasVuelta ? "Ida y vuelta" : route.hasIda ? "Ida" : "Vuelta"}</dd>
              </div>
            </dl>

            <section className="mt-8 rounded-2xl border border-[#00D4AA]/20 bg-[#00D4AA]/10 p-5">
              <h2 className="font-display text-xl font-black text-white">Cómo usar esta ruta</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Abre el mapa, marca tu punto de origen y destino, y VoyUruapan calculará si esta ruta es conveniente o si necesitas caminar o transbordar con otra ruta o el Teleférico.
              </p>
            </section>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={`/mapa?destino=${encodeURIComponent(route.destination ?? route.name)}`} className="inline-flex h-12 items-center justify-center rounded-full bg-[#00D4AA] px-6 text-sm font-black text-gray-950">
                Ver en el mapa
              </Link>
              <Link href="/" className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 text-sm font-bold text-slate-200">
                Volver al inicio
              </Link>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}

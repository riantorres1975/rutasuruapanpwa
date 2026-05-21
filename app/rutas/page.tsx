import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import ForceDark from "@/components/ForceDark";
import { getRouteSeoItems } from "@/lib/route-seo";
import { FARES_2026 } from "@/lib/mobility-config";

export const metadata: Metadata = {
  title: "Rutas de camión en Uruapan — Las 40 rutas urbanas",
  description: "Consulta las 40 rutas de camión urbano en Uruapan, Michoacán. Destinos, tarifa y mapa interactivo para cada ruta.",
  alternates: { canonical: "https://www.urugo.app/rutas" },
  openGraph: {
    title: "Rutas de camión en Uruapan — Las 40 rutas urbanas",
    description: "Directorio completo de rutas de camión urbano en Uruapan, Michoacán.",
    url: "https://www.urugo.app/rutas",
    type: "website"
  }
};

export default function RutasPage() {
  const routes = getRouteSeoItems();
  const busRoutes = routes.filter((r) => !r.name.toLowerCase().includes("teleférico"));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: "https://www.urugo.app/" },
          { "@type": "ListItem", position: 2, name: "Rutas", item: "https://www.urugo.app/rutas" }
        ]
      },
      {
        "@type": "ItemList",
        name: "Rutas de camión urbano en Uruapan",
        description: "Directorio de las 40 rutas de transporte público urbano en Uruapan, Michoacán.",
        numberOfItems: busRoutes.length,
        itemListElement: busRoutes.map((route, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: route.destination ? `${route.name} — ${route.destination}` : route.name,
          url: `https://www.urugo.app/ruta/${route.slug}`
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

      <div className="greca-bg greca-bg-animated px-5 pt-28 pb-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-5xl">

          {/* Header */}
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
            Las <em style={{ fontStyle: "italic", color: "#b8e840" }}>40 rutas</em> de camión en Uruapan
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7" style={{ color: "#a8c888" }}>
            Directorio completo de rutas de camión urbano. Toca cualquier ruta para ver destino, tarifa y abrirla en el mapa interactivo.
          </p>

          {/* Stats bar */}
          <div
            className="mt-8 flex flex-wrap gap-4 rounded-2xl border p-4"
            style={{ borderColor: "rgba(140,200,80,0.12)", background: "rgba(20,28,16,0.6)" }}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#6aab48" }}>Rutas</p>
              <p className="font-serif text-2xl font-black" style={{ color: "#e8f2d8" }}>40</p>
            </div>
            <div style={{ borderLeft: "1px solid rgba(140,200,80,0.12)", paddingLeft: "1rem" }}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#6aab48" }}>Tarifa</p>
              <p className="font-serif text-2xl font-black" style={{ color: "#e8f2d8" }}>{FARES_2026.urbanBus.price}</p>
            </div>
            <div style={{ borderLeft: "1px solid rgba(140,200,80,0.12)", paddingLeft: "1rem" }}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#6aab48" }}>Pago</p>
              <p className="font-serif text-2xl font-black" style={{ color: "#e8f2d8" }}>Efectivo</p>
            </div>
          </div>

          {/* Grid de rutas */}
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {busRoutes.map((route) => (
              <Link
                key={route.slug}
                href={`/ruta/${route.slug}`}
                className="group rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
                style={{ borderColor: "rgba(140,200,80,0.1)", background: "rgba(20,28,16,0.6)" }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: route.color }}
                  />
                  <span className="font-serif text-base font-black" style={{ color: "#e8f2d8" }}>
                    {route.name}
                  </span>
                </div>
                {route.destination && (
                  <p className="mt-2 text-xs leading-snug" style={{ color: "#6aab48" }}>
                    → {route.destination}
                  </p>
                )}
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgba(232,242,216,0.3)" }}>
                  Ver ruta →
                </p>
              </Link>
            ))}
          </div>

          {/* CTA teleférico */}
          <div
            className="mt-10 rounded-2xl border p-6"
            style={{ borderColor: "rgba(0,212,170,0.2)", background: "rgba(0,212,170,0.04)" }}
          >
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#00D4AA" }}>
              También en Uruapan
            </p>
            <h2 className="mt-2 font-serif text-2xl font-black" style={{ color: "#e8f2d8" }}>
              Teleférico Uruapan
            </h2>
            <p className="mt-2 text-sm leading-7" style={{ color: "#a8c888" }}>
              6 estaciones de oriente a poniente. Opera de 05:00 a 23:00. Tarifa {FARES_2026.teleferico.price} con tarjeta de movilidad.
            </p>
            <Link
              href="/teleferico-uruapan-horario"
              className="mt-4 inline-flex h-10 items-center rounded-full px-5 text-sm font-black transition hover:opacity-90"
              style={{ background: "#00D4AA", color: "#0c110a" }}
            >
              Ver guía del Teleférico →
            </Link>
          </div>

        </div>
      </div>
    </main>
  );
}

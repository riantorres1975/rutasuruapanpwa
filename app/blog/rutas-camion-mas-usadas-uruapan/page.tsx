import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import NotGovernmentNotice from "@/components/NotGovernmentNotice";
import ForceDark from "@/components/ForceDark";

export const metadata: Metadata = {
  title: "Las rutas de camiÃ³n mÃ¡s usadas en Uruapan",
  description: "Estamos preparando un ranking detallado de las rutas mÃ¡s consultadas, sus destinos principales y cÃ³mo conectan con el TelefÃ©rico.",
  alternates: {
    canonical: "https://www.urugo.app/blog/rutas-camion-mas-usadas-uruapan"
  },
  openGraph: {
    title: "Las rutas de camiÃ³n mÃ¡s usadas en Uruapan",
    description: "Rutas de camiÃ³n mÃ¡s consultadas en Uruapan: destinos, conexiones con TelefÃ©rico y mapa interactivo.",
    url: "https://www.urugo.app/blog/rutas-camion-mas-usadas-uruapan",
    type: "article",
    publishedTime: "2026-01-15T00:00:00-06:00",
    modifiedTime: "2026-04-27T00:00:00-06:00"
  }
};

const blogPostingJsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "Las rutas de camiÃ³n mÃ¡s usadas en Uruapan y para quÃ© sirven",
  description: "Resumen de las rutas de camiÃ³n mÃ¡s consultadas en Uruapan, sus destinos principales y cÃ³mo conectan con el TelefÃ©rico.",
  datePublished: "2026-01-15",
  dateModified: "2026-04-27",
  author: { "@type": "Organization", name: "UruGo" },
  publisher: { "@type": "Organization", name: "UruGo" },
  mainEntityOfPage: { "@type": "WebPage", "@id": "/blog/rutas-camion-mas-usadas-uruapan" },
  inLanguage: "es-MX",
  keywords: "rutas de camiÃ³n Uruapan, ruta 11 Uruapan, transporte pÃºblico Uruapan, camiones urbanos Uruapan"
};

export default function RutasCamionMasUsadasPage() {
  return (
    <main className="greca-bg greca-bg-animated min-h-dvh px-5 py-8 sm:px-8 lg:px-10" style={{ background: "#0c110a", color: "#e8f2d8" }}>
      <ForceDark />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingJsonLd) }} />
      <article className="relative z-10 mx-auto max-w-3xl">
        <PageHeader
          backHref="/blog"
          backLabel="Blog"
          eyebrow="En preparaciÃ³n"
          title={
            <>
              Las rutas de <span className="italic text-lima">camiÃ³n</span> mÃ¡s usadas en Uruapan.
            </>
          }
          intro="Estamos preparando un ranking detallado de las rutas mÃ¡s consultadas, sus destinos principales y cÃ³mo conectan con el TelefÃ©rico."
        />

        {/* Rutas destacadas */}
        <section className="mt-12 grid gap-4 sm:grid-cols-2">
          {[
            {
              id: "Ruta 11 Uruapan",
              nombre: "Ramal Tamayo â€“ Fovissste",
              detalle: "70 paradas Â· ~48 min Â· lunâ€“dom 06:00â€“22:00",
              desc: "Una de las mÃ¡s extensas. Transita por 5 Sur y HÃ©roes de la Independencia."
            },
            {
              id: "Ruta 1",
              nombre: "Unidad â€“ Palito Verde",
              detalle: "Ramales a JucutÃ¡cato, Manantiales y San JosÃ© Mina",
              desc: "LÃ­nea troncal con alta cobertura de colonias populares al oriente."
            },
            {
              id: "Ruta 5",
              nombre: "Caltzontzin",
              detalle: "Corredor industrial",
              desc: "Mueve gran parte de la fuerza laboral hacia la comunidad de Caltzontzin."
            },
            {
              id: "Ruta 7",
              nombre: "Pemex â€“ Centro",
              detalle: "LÃ­nea directa al primer cuadro",
              desc: "Conecta la colonia Pemex con el Centro HistÃ³rico sin transbordo."
            }
          ].map((r) => (
            <Link
              key={r.id}
              href={`/mapa?destino=${encodeURIComponent(r.id)}`}
              className="card-lift group rounded-2xl border border-foreground/10 bg-ink-900/60 p-5 backdrop-blur transition"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-lima">{r.id}</p>
              <h3 className="mt-1 font-serif-display text-lg font-black text-white">{r.nombre}</h3>
              <p className="mt-1 text-[11px] font-semibold text-avocado-400">{r.detalle}</p>
              <p className="mt-3 text-sm leading-6 text-foreground/70">{r.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-lima transition group-hover:gap-2">
                Ver en el mapa â†’
              </span>
            </Link>
          ))}
        </section>

        <section className="mt-6 rounded-[1.75rem] border border-foreground/12 bg-ink-900/65 p-8 backdrop-blur">
          <h2 className="font-serif-display text-2xl font-black text-white">
            PrÃ³ximamente
          </h2>
          <p className="mt-3 text-sm leading-7 text-foreground/75">
            Mientras terminamos esta guÃ­a, puedes explorar todas las rutas en el mapa interactivo. Son 40 rutas de camiÃ³n urbano y el TelefÃ©rico que cubren toda la ciudad.
          </p>
          <Link
            href="/mapa"
            className="cta-shine mt-6 inline-flex h-11 items-center rounded-full bg-verde px-6 py-2 text-sm font-black text-white hover:opacity-90"
          >
            Explorar el mapa â†’
          </Link>
        </section>

        <div className="mt-12">
          <NotGovernmentNotice variant="compact" />
        </div>
      </article>
    </main>
  );
}

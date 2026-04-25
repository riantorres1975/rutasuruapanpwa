import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import NotGovernmentNotice from "@/components/NotGovernmentNotice";

export const metadata: Metadata = {
  title: "Las rutas de camión más usadas en Uruapan",
  description: "Artículo en preparación sobre las rutas de camión más usadas en Uruapan y para qué sirven.",
  alternates: {
    canonical: "/blog/rutas-camion-mas-usadas-uruapan"
  }
};

export default function RutasCamionMasUsadasPage() {
  return (
    <main className="greca-bg greca-bg-animated min-h-dvh px-5 py-8 text-cream-100 sm:px-8 lg:px-10">
      <article className="relative z-10 mx-auto max-w-3xl">
        <PageHeader
          backHref="/blog"
          backLabel="Blog"
          eyebrow="En preparación"
          title={
            <>
              Las rutas de <span className="italic text-terracota-400">camión</span> más usadas en Uruapan.
            </>
          }
          intro="Estamos preparando un ranking detallado de las rutas más consultadas, sus destinos principales y para qué sirve cada una."
        />

        <section className="mt-12 rounded-[1.75rem] border border-cream-100/12 bg-ink-900/65 p-8 backdrop-blur">
          <p className="font-serif-display text-5xl font-black text-terracota-400">📝</p>
          <h2 className="mt-3 font-serif-display text-2xl font-black text-cream-50">
            Próximamente
          </h2>
          <p className="mt-3 text-sm leading-7 text-cream-100/75">
            Mientras terminamos esta guía, puedes explorar todas las rutas en el mapa interactivo. Son 41 rutas urbanas que cubren toda la ciudad.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {["Ruta 11 Uruapan", "Ruta 1", "Ruta 5", "Ruta 7"].map((r) => (
              <Link
                key={r}
                href={`/mapa?destino=${encodeURIComponent(r)}`}
                className="animated-chip inline-flex items-center rounded-full border border-cream-100/15 bg-cream-100/5 px-3.5 py-1.5 text-xs font-bold text-cream-50 transition hover:border-terracota-400/60 hover:text-terracota-400"
              >
                {r}
              </Link>
            ))}
          </div>

          <Link
            href="/mapa"
            className="cta-shine mt-7 inline-flex h-11 items-center rounded-full bg-terracota-400 px-5 text-sm font-black text-cream-50 hover:bg-terracota-500"
          >
            Explorar el mapa →
          </Link>
        </section>

        <div className="mt-12">
          <NotGovernmentNotice variant="compact" />
        </div>
      </article>
    </main>
  );
}

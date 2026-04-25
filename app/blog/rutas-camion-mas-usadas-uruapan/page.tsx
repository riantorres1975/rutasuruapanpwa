import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import NotGovernmentNotice from "@/components/NotGovernmentNotice";

export const metadata: Metadata = {
  title: "Las rutas de camión más usadas en Uruapan",
  description: "Estamos preparando un ranking detallado de los derroteros más consultados, sus destinos principales y cómo conectan con el Teleférico.",
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
          intro="Estamos preparando un ranking detallado de los derroteros más consultados, sus destinos principales y cómo conectan con el Teleférico."
        />

        {/* Rutas destacadas */}
        <section className="mt-12 grid gap-4 sm:grid-cols-2">
          {[
            {
              id: "Ruta 11 Uruapan",
              nombre: "Ramal Tamayo – Fovissste",
              detalle: "70 paradas · ~48 min · lun–dom 06:00–22:00",
              desc: "Una de las más extensas. Transita por 5 Sur y Héroes de la Independencia."
            },
            {
              id: "Ruta 1",
              nombre: "Unidad – Palito Verde",
              detalle: "Ramales a Jucutácato, Manantiales y San José Mina",
              desc: "Línea troncal con alta cobertura de colonias populares al oriente."
            },
            {
              id: "Ruta 5",
              nombre: "Caltzontzin",
              detalle: "Corredor industrial",
              desc: "Mueve gran parte de la fuerza laboral hacia la comunidad de Caltzontzin."
            },
            {
              id: "Ruta 7",
              nombre: "Pemex – Centro",
              detalle: "Línea directa al primer cuadro",
              desc: "Conecta la colonia Pemex con el Centro Histórico sin transbordo."
            }
          ].map((r) => (
            <Link
              key={r.id}
              href={`/mapa?destino=${encodeURIComponent(r.id)}`}
              className="card-lift group rounded-2xl border border-cream-100/10 bg-ink-900/60 p-5 backdrop-blur transition"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-terracota-400">{r.id}</p>
              <h3 className="mt-1 font-serif-display text-lg font-black text-cream-50">{r.nombre}</h3>
              <p className="mt-1 text-[11px] font-semibold text-avocado-400">{r.detalle}</p>
              <p className="mt-3 text-sm leading-6 text-cream-100/70">{r.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-terracota-400 transition group-hover:gap-2">
                Ver en el mapa →
              </span>
            </Link>
          ))}
        </section>

        <section className="mt-6 rounded-[1.75rem] border border-cream-100/12 bg-ink-900/65 p-8 backdrop-blur">
          <h2 className="font-serif-display text-2xl font-black text-cream-50">
            Próximamente
          </h2>
          <p className="mt-3 text-sm leading-7 text-cream-100/75">
            Mientras terminamos esta guía, puedes explorar las 36 rutas urbanas oficiales en el mapa interactivo.
          </p>
          <Link
            href="/mapa"
            className="cta-shine mt-6 inline-flex h-11 items-center rounded-full bg-terracota-400 px-5 text-sm font-black text-cream-50 hover:bg-terracota-500"
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

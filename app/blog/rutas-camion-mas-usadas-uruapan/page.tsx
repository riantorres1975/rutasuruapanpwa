import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import NotGovernmentNotice from "@/components/NotGovernmentNotice";
import ForceDark from "@/components/ForceDark";

export const metadata: Metadata = {
  title: "Las rutas de camión más usadas en Uruapan",
  description: "Estamos preparando un ranking detallado de las rutas más consultadas, sus destinos principales y cómo conectan con el Teleférico.",
  alternates: {
    canonical: "/blog/rutas-camion-mas-usadas-uruapan"
  }
};

export default function RutasCamionMasUsadasPage() {
  return (
    <main className="greca-bg greca-bg-animated min-h-dvh px-5 py-8 sm:px-8 lg:px-10" style={{ background: "#0c110a", color: "#e8f2d8" }}>
      <ForceDark />
      <article className="relative z-10 mx-auto max-w-3xl">
        <PageHeader
          backHref="/blog"
          backLabel="Blog"
          eyebrow="En preparación"
          title={
            <>
              Las rutas de <span className="italic text-lima">camión</span> más usadas en Uruapan.
            </>
          }
          intro="Estamos preparando un ranking detallado de las rutas más consultadas, sus destinos principales y cómo conectan con el Teleférico."
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
              className="card-lift group rounded-2xl border border-foreground/10 bg-ink-900/60 p-5 backdrop-blur transition"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-lima">{r.id}</p>
              <h3 className="mt-1 font-serif-display text-lg font-black text-white">{r.nombre}</h3>
              <p className="mt-1 text-[11px] font-semibold text-avocado-400">{r.detalle}</p>
              <p className="mt-3 text-sm leading-6 text-foreground/70">{r.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-lima transition group-hover:gap-2">
                Ver en el mapa →
              </span>
            </Link>
          ))}
        </section>

        <section className="mt-6 rounded-[1.75rem] border border-foreground/12 bg-ink-900/65 p-8 backdrop-blur">
          <h2 className="font-serif-display text-2xl font-black text-white">
            Próximamente
          </h2>
          <p className="mt-3 text-sm leading-7 text-foreground/75">
            Mientras terminamos esta guía, puedes explorar todas las rutas en el mapa interactivo. Son 41 rutas urbanas (40 terrestres y la línea del Teleférico) que cubren toda la ciudad.
          </p>
          <Link
            href="/mapa"
            className="cta-shine mt-6 inline-flex h-11 items-center rounded-full bg-verde px-6 py-2 text-sm font-black text-white hover:opacity-90"
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

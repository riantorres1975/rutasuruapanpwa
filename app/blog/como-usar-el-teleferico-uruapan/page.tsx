import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import NotGovernmentNotice from "@/components/NotGovernmentNotice";
import ForceDark from "@/components/ForceDark";
import { FARES_2026, TELEFERICO_URUAPAN } from "@/lib/mobility-config";

export const metadata: Metadata = {
  title: "Cómo usar el Teleférico de Uruapan paso a paso",
  description:
    "Guía completa para usar el Teleférico de Uruapan: tarjeta de movilidad, tarifa por viaje, estaciones, horario y combinación con camiones urbanos.",
  alternates: {
    canonical: "/blog/como-usar-el-teleferico-uruapan"
  },
  openGraph: {
    title: "Cómo usar el Teleférico de Uruapan paso a paso",
    description: "Tarjeta de movilidad, tarifa, estaciones, horario y tips para combinar el Teleférico con camiones urbanos.",
    url: "/blog/como-usar-el-teleferico-uruapan",
    type: "article"
  }
};

const stationDescriptions = [
  "Principal acceso al Hospital General IMSS y Hospital Regional. Zona de alta demanda en horarios de mañana.",
  "Acceso noreste de la ciudad. Conexión hacia el Libramiento de Uruapan y zonas industriales.",
  "Centro cultural y comercial. Cerca del Centro Cultural Ágora de Uruapan y zona de servicios.",
  "Corazón administrativo de la ciudad. Frente a la Presidencia Municipal de Uruapan.",
  "Acceso al Parque Nacional Eduardo Ruiz y zona comercial del centro. La estación más transitada.",
  "Terminal poniente. Conexión con el mercado y colonias del lado oeste de la ciudad."
] as const;

const SECTIONS = [
  {
    n: "01",
    title: "Qué es el Teleférico",
    body: "El Teleférico de Uruapan es un sistema de transporte urbano que conecta zonas clave de la ciudad mediante estaciones elevadas. En VoyUruapan aparece integrado con rutas de camión para planear viajes multimodales."
  },
  {
    n: "02",
    title: "Cómo obtener la tarjeta de movilidad",
    body: `Para usar el Teleférico necesitas una tarjeta electrónica de movilidad. Como referencia se muestra un costo de ${FARES_2026.mobilityCard.price}. Conserva la tarjeta para recargarla y validar futuros accesos.`
  },
  {
    n: "03",
    title: "Cómo validar el acceso",
    body: `Al entrar a la estación, acerca tu tarjeta al validador. Cada viaje cuesta ${TELEFERICO_URUAPAN.fare}. Si también usas camión urbano, considera cada abordaje por separado al calcular tu presupuesto.`
  },
  {
    n: "04",
    title: "Horario",
    body: `Opera de ${TELEFERICO_URUAPAN.hours} todos los días. Revisa avisos oficiales antes de viajar, especialmente en días festivos o por mantenimiento programado.`
  },
  {
    n: "05",
    title: "Tips para combinarlo con camión",
    body: "Marca tu origen y destino en el mapa para ver si te conviene llegar a una estación caminando, en camión o con transbordo. El Teleférico puede ser útil para cruzar de oriente a poniente y después completar el trayecto en ruta urbana."
  }
] as const;

export default function TelefericoBlogArticlePage() {
  return (
    <main className="greca-bg greca-bg-animated min-h-dvh px-5 py-8 sm:px-8 lg:px-10" style={{ background: "#0c110a", color: "#e8f2d8" }}>
      <ForceDark />
      <article className="relative z-10 mx-auto max-w-3xl">
        <PageHeader
          backHref="/blog"
          backLabel="Blog"
          kicker="Únicо en Michoacán"
          eyebrow="Guía 2026"
          title={
            <>
              Cómo usar el <span className="italic text-lima">Teleférico</span> de Uruapan paso a paso.
            </>
          }
          intro="Aprende cómo abordar, pagar y combinar el Teleférico de Uruapan con rutas de camión urbano desde VoyUruapan."
        />

        <div className="mt-12 space-y-8">
          {SECTIONS.map((section) => (
            <section
              key={section.n}
              className="rounded-2xl border border-foreground/10 bg-ink-900/55 p-6 backdrop-blur"
            >
              <p className="font-serif-display text-3xl font-black text-lima">
                {section.n}
              </p>
              <h2 className="mt-2 font-serif-display text-2xl font-black text-white">
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-foreground/75">
                {section.body}
              </p>
            </section>
          ))}

          <section>
            <p className="font-serif-display text-3xl font-black text-lima">06</p>
            <h2 className="mt-2 font-serif-display text-2xl font-black text-white">
              Las 6 estaciones, de oriente a poniente
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {TELEFERICO_URUAPAN.stations.map((station, index) => (
                <article
                  key={station}
                  className="card-lift rounded-2xl border border-foreground/10 bg-ink-900/65 p-4 backdrop-blur"
                >
                  <p className="font-serif-display text-xs font-black text-lima">
                    E{index + 1}
                  </p>
                  <h3 className="mt-2 font-serif-display text-lg font-black text-white">
                    {station}
                  </h3>
                  <p className="mt-2 text-xs leading-6 text-foreground/65">
                    {stationDescriptions[index]}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <Link
          href="/mapa"
          className="cta-shine mt-10 inline-flex h-12 items-center rounded-full bg-verde px-6 py-2 text-sm font-black text-white hover:opacity-90"
        >
          Ver el mapa de rutas →
        </Link>

        <div className="mt-12">
          <NotGovernmentNotice variant="compact" />
        </div>
      </article>
    </main>
  );
}

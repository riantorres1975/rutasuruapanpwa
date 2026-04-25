import type { Metadata } from "next";
import Link from "next/link";
import MadeByFooter from "@/components/MadeByFooter";
import PageHeader from "@/components/PageHeader";
import NotGovernmentNotice from "@/components/NotGovernmentNotice";
import { FARES_2026, TELEFERICO_URUAPAN } from "@/lib/mobility-config";

export const metadata: Metadata = {
  title: {
    absolute: "Teleférico Uruapan horario, estaciones y tarifa 2026"
  },
  description:
    "Consulta el horario del Teleférico Uruapan, estaciones, tarifa, forma de pago y conexiones con rutas de camiones urbanos.",
  alternates: {
    canonical: "/teleferico-uruapan-horario"
  },
  openGraph: {
    title: "Teleférico Uruapan: horario, estaciones y tarifa",
    description: "Guía rápida del Teleférico de Uruapan con estaciones, costo, pago y mapa de conexión.",
    url: "/teleferico-uruapan-horario",
    type: "article"
  }
};

const telefericoFaqs = [
  {
    question: "¿Cuál es el horario del Teleférico de Uruapan?",
    answer: `El Teleférico de Uruapan opera todos los días de ${TELEFERICO_URUAPAN.hours}. Revisa avisos oficiales antes de viajar porque los horarios pueden cambiar por operación o mantenimiento.`
  },
  {
    question: "¿Cuánto cuesta el Teleférico de Uruapan?",
    answer: `El viaje cuesta ${TELEFERICO_URUAPAN.fare}. El proyecto muestra esta tarifa como referencia para planear traslados multimodales dentro de Uruapan.`
  },
  {
    question: "¿Cómo se paga el Teleférico de Uruapan?",
    answer: `El acceso se valida con tarjeta electrónica de movilidad. La tarjeta configurada en VoyUruapan tiene costo de ${FARES_2026.mobilityCard.price}.`
  },
  {
    question: "¿Qué estaciones tiene el Teleférico de Uruapan?",
    answer: `Las estaciones son ${TELEFERICO_URUAPAN.stations.join(", ")}.`
  }
];

const stationDescriptions = [
  "Principal acceso al Hospital General IMSS y Hospital Regional. Zona de alta demanda en horarios de mañana.",
  "Acceso noreste de la ciudad. Conexión hacia el Libramiento de Uruapan y zonas industriales.",
  "Centro cultural y comercial. Cerca del Centro Cultural Ágora de Uruapan y zona de servicios.",
  "Corazón administrativo de la ciudad. Frente a la Presidencia Municipal de Uruapan.",
  "Acceso al Parque Nacional Eduardo Ruiz y zona comercial del centro. La estación más transitada.",
  "Terminal poniente. Conexión con el mercado y colonias del lado oeste de la ciudad."
] as const;

export default function TelefericoHorarioPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rutasuruapanpwa.vercel.app";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: baseUrl },
          { "@type": "ListItem", position: 2, name: "Teleférico Uruapan", item: `${baseUrl}/teleferico-uruapan-horario` }
        ]
      },
      {
        "@type": "FAQPage",
        mainEntity: telefericoFaqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer
          }
        }))
      },
      {
        "@type": "TouristAttraction",
        name: TELEFERICO_URUAPAN.schemaName,
        description: "Sistema de transporte aéreo urbano en Uruapan, Michoacán.",
        areaServed: {
          "@type": "City",
          name: "Uruapan, Michoacán"
        },
        offers: {
          "@type": "Offer",
          price: TELEFERICO_URUAPAN.fare.replace(/[^0-9.]/g, ""),
          priceCurrency: "MXN"
        }
      }
    ]
  };

  return (
    <main className="greca-bg greca-bg-animated min-h-dvh px-5 py-8 text-cream-100 sm:px-8 lg:px-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="relative z-10 mx-auto max-w-5xl">
        <PageHeader
          kicker="Único en Michoacán"
          eyebrow="Teleférico Uruapan · horario 2026"
          title={
            <>
              <span className="italic text-terracota-400">Teleférico</span>: horario, estaciones y tarifa.
            </>
          }
          intro="Guía rápida para moverte en el Teleférico de Uruapan y combinarlo con rutas de camión urbano desde el mapa de VoyUruapan."
        />

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href="/mapa?destino=Teleferico%20Uruapan" className="cta-shine inline-flex h-12 items-center justify-center rounded-full bg-terracota-400 px-6 text-sm font-black text-cream-50 hover:bg-terracota-500">
            Abrir en el mapa →
          </Link>
          <Link href="/#tarifas" className="inline-flex h-12 items-center justify-center rounded-full border border-cream-100/15 bg-cream-100/5 px-6 text-sm font-bold text-cream-50 hover:border-terracota-400/50">
            Ver tarifas
          </Link>
        </div>

        {/* Datos rápidos en grid de 4 */}
        <section className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-terracota-400/30 bg-terracota-400/[0.08] p-4 backdrop-blur">
            <dt className="text-[10px] font-bold uppercase tracking-[0.22em] text-terracota-400">Horario</dt>
            <dd className="mt-2 font-serif-display text-2xl font-black text-cream-50">{TELEFERICO_URUAPAN.hours}</dd>
          </div>
          <div className="rounded-2xl border border-cream-100/10 bg-ink-900/60 p-4 backdrop-blur">
            <dt className="text-[10px] font-bold uppercase tracking-[0.22em] text-avocado-400">Tarifa</dt>
            <dd className="mt-2 font-serif-display text-2xl font-black text-cream-50">{TELEFERICO_URUAPAN.fare}</dd>
          </div>
          <div className="rounded-2xl border border-cream-100/10 bg-ink-900/60 p-4 backdrop-blur">
            <dt className="text-[10px] font-bold uppercase tracking-[0.22em] text-avocado-400">Pago</dt>
            <dd className="mt-2 text-sm font-bold leading-6 text-cream-50">{TELEFERICO_URUAPAN.payment}</dd>
          </div>
          <div className="rounded-2xl border border-cream-100/10 bg-ink-900/60 p-4 backdrop-blur">
            <dt className="text-[10px] font-bold uppercase tracking-[0.22em] text-avocado-400">Frecuencia</dt>
            <dd className="mt-2 text-sm font-bold leading-6 text-cream-50">{TELEFERICO_URUAPAN.frequency}</dd>
          </div>
        </section>

        {/* Estaciones */}
        <section className="mt-12">
          <p className="text-purepecha text-sm">Yáuiri · estaciones</p>
          <h2 className="mt-2 font-serif-display text-3xl font-black text-cream-50 md:text-4xl">
            Las <span className="italic text-terracota-400">6 estaciones</span> de oriente a poniente.
          </h2>

          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {TELEFERICO_URUAPAN.stations.map((station, index) => (
              <article key={station} className="card-lift rounded-2xl border border-cream-100/10 bg-ink-900/60 p-5 backdrop-blur">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-terracota-400/40 bg-terracota-400/10 font-serif-display text-xs font-black text-terracota-400">
                    E{index + 1}
                  </span>
                  <h3 className="font-serif-display text-lg font-black leading-tight text-cream-50">{station}</h3>
                </div>
                <p className="mt-3 text-xs leading-6 text-cream-100/65">{stationDescriptions[index]}</p>
              </article>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section className="mt-12">
          <h2 className="font-serif-display text-3xl font-black text-cream-50 md:text-4xl">Preguntas frecuentes</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {telefericoFaqs.map((faq) => (
              <article key={faq.question} className="card-lift rounded-2xl border border-cream-100/10 bg-ink-900/60 p-5 backdrop-blur">
                <h3 className="font-serif-display text-base font-black text-cream-50">{faq.question}</h3>
                <p className="mt-3 text-sm leading-7 text-cream-100/75">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <aside role="note" className="mt-10 rounded-2xl border border-amber-400/30 bg-amber-500/[0.07] p-5 backdrop-blur">
          <p className="text-sm leading-7 text-amber-100/90">
            <span className="font-bold text-amber-100">Aviso.</span> La información de horarios y tarifas puede cambiar por operación. Usa esta página como guía de planeación y confirma avisos oficiales antes de abordar.
          </p>
        </aside>

        <div className="mt-10">
          <NotGovernmentNotice variant="compact" />
        </div>

        <MadeByFooter />
      </div>
    </main>
  );
}

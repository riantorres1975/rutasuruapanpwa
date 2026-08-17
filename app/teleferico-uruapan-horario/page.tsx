import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import NotGovernmentNotice from "@/components/NotGovernmentNotice";
import ForceDark from "@/components/ForceDark";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import { FARES_2026, TELEFERICO_URUAPAN } from "@/lib/mobility-config";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: {
    absolute: "Teleférico de Uruapan: horario, precio y estaciones"
  },
  description:
    "Horario 05:00 a 23:00, tarifa de $12 MXN y las 6 estaciones del Teleférico de Uruapan. Consulta cómo pagar y combinarlo con rutas de camión.",
  alternates: {
    canonical: "https://www.urugo.app/teleferico-uruapan-horario"
  },
  openGraph: {
    title: "Teleférico de Uruapan: horario, precio y estaciones",
    description: "Consulta el horario, la tarifa de $12 MXN, las 6 estaciones y las conexiones con camiones urbanos.",
    url: "https://www.urugo.app/teleferico-uruapan-horario",
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
    answer: `El acceso se valida con tarjeta electrónica de movilidad. La tarjeta configurada en UruGo tiene costo de ${FARES_2026.mobilityCard.price}.`
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

const stationPlaceSlugs = [
  "hospital-regional",
  "libramiento-aeropuerto",
  "boulevard-industrial-plaza-agora",
  "presidencia-municipal",
  "centro-historico",
  "mercado-poniente"
] as const;

export default function TelefericoHorarioPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Teleférico Uruapan", item: `${SITE_URL}/teleferico-uruapan-horario` }
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
    <main style={{ background: "#0c110a", color: "#e8f2d8", minHeight: "100dvh" }}>
      <ForceDark />
      <PublicHeader />
      <div className="greca-bg greca-bg-animated px-5 pt-28 pb-8 sm:px-8 lg:px-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="relative z-10 mx-auto max-w-5xl">
        <PageHeader
          kicker="Único en Michoacán"
          eyebrow="Teleférico de Uruapan · información 2026"
          title={
            <>
              <span className="italic" style={{ color: "#b8e840" }}>Teleférico de Uruapan</span>: horario, precio y estaciones.
            </>
          }
          intro={`Opera de ${TELEFERICO_URUAPAN.hours}, cuesta ${TELEFERICO_URUAPAN.fare} y conecta seis estaciones. Revisa cómo pagar y combinar tu trayecto con rutas de camión urbano.`}
        />

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/mapa?destino=Teleferico%20Uruapan"
            className="cta-shine inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-black transition hover:opacity-90"
            style={{ background: "#6aab48", color: "#e8f2d8" }}
          >
            Abrir en el mapa →
          </Link>
          <Link
            href="#estaciones"
            className="inline-flex h-12 items-center justify-center rounded-full border px-6 text-sm font-bold transition"
            style={{ borderColor: "rgba(140,200,80,0.15)", background: "rgba(106,171,72,0.06)", color: "#e8f2d8" }}
          >
            Ver estaciones
          </Link>
        </div>

        {/* Datos rápidos en grid de 4 */}
        <section className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border p-4 backdrop-blur" style={{ borderColor: "rgba(184,232,64,0.2)", background: "rgba(184,232,64,0.06)" }}>
            <dt className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "#b8e840" }}>Horario</dt>
            <dd className="mt-2 font-serif text-2xl font-black" style={{ color: "#e8f2d8" }}>{TELEFERICO_URUAPAN.hours}</dd>
          </div>
          <div className="rounded-2xl border p-4 backdrop-blur" style={{ borderColor: "rgba(140,200,80,0.1)", background: "rgba(20,28,16,0.6)" }}>
            <dt className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "#6aab48" }}>Tarifa</dt>
            <dd className="mt-2 font-serif text-2xl font-black" style={{ color: "#e8f2d8" }}>
              <span className="font-sans">$</span>{TELEFERICO_URUAPAN.fare.replace(/^\$/, "")}
            </dd>
          </div>
          <div className="rounded-2xl border p-4 backdrop-blur" style={{ borderColor: "rgba(140,200,80,0.1)", background: "rgba(20,28,16,0.6)" }}>
            <dt className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "#6aab48" }}>Pago</dt>
            <dd className="mt-2 text-sm font-bold leading-6" style={{ color: "#e8f2d8" }}>{TELEFERICO_URUAPAN.payment}</dd>
          </div>
          <div className="rounded-2xl border p-4 backdrop-blur" style={{ borderColor: "rgba(140,200,80,0.1)", background: "rgba(20,28,16,0.6)" }}>
            <dt className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "#6aab48" }}>Frecuencia</dt>
            <dd className="mt-2 text-sm font-bold leading-6" style={{ color: "#e8f2d8" }}>{TELEFERICO_URUAPAN.frequency}</dd>
          </div>
        </section>

        {/* Estaciones */}
        <section id="estaciones" className="mt-12 scroll-mt-24">
          <p className="text-purepecha text-sm">Yáuiri · estaciones</p>
          <h2 className="mt-2 font-serif text-3xl font-black md:text-4xl" style={{ color: "#e8f2d8" }}>
            Las <span className="italic" style={{ color: "#b8e840" }}>6 estaciones</span> de oriente a poniente.
          </h2>

          <div className="mt-7 overflow-x-auto rounded-lg border border-[#00d4aa]/20 bg-[#071512] px-5 py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ol className="relative flex min-w-[760px] items-start justify-between gap-3" aria-label="Recorrido del Teleférico de oriente a poniente">
              <span className="absolute left-10 right-10 top-5 h-1 rounded-full bg-[#00d4aa]/25" aria-hidden="true" />
              {TELEFERICO_URUAPAN.stations.map((station, index) => (
                <li key={station} className="relative z-10 flex w-28 flex-col items-center text-center">
                  <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-[#00d4aa] bg-[#071512] font-black text-[#00d4aa]">
                    {index + 1}
                  </span>
                  <span className="mt-3 text-xs font-bold leading-4 text-[#e8f2d8]">{station}</span>
                  <span className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#48a878]">E{index + 1}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {TELEFERICO_URUAPAN.stations.map((station, index) => (
              <article
                key={station}
                className="card-lift rounded-2xl border p-5 backdrop-blur"
                style={{ borderColor: "rgba(140,200,80,0.1)", background: "rgba(20,28,16,0.6)" }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border font-serif text-xs font-black"
                    style={{ borderColor: "rgba(184,232,64,0.3)", background: "rgba(184,232,64,0.08)", color: "#b8e840" }}
                  >
                    E{index + 1}
                  </span>
                  <h3 className="font-serif text-lg font-black leading-tight" style={{ color: "#e8f2d8" }}>{station}</h3>
                </div>
                <p className="mt-3 text-xs leading-6" style={{ color: "rgba(232,242,216,0.55)" }}>{stationDescriptions[index]}</p>
                <Link
                  href={`/como-llegar/${stationPlaceSlugs[index]}`}
                  className="mt-4 inline-flex text-xs font-bold transition hover:opacity-80"
                  style={{ color: "#b8e840" }}
                >
                  Cómo llegar a esta estación →
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section className="mt-12">
          <h2 className="font-serif text-3xl font-black md:text-4xl" style={{ color: "#e8f2d8" }}>Preguntas frecuentes</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {telefericoFaqs.map((faq) => (
              <article
                key={faq.question}
                className="card-lift rounded-2xl border p-5 backdrop-blur"
                style={{ borderColor: "rgba(140,200,80,0.1)", background: "rgba(20,28,16,0.6)" }}
              >
                <h3 className="font-serif text-base font-black" style={{ color: "#e8f2d8" }}>{faq.question}</h3>
                <p className="mt-3 text-sm leading-7" style={{ color: "rgba(232,242,216,0.65)" }}>{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <aside
          role="note"
          className="mt-10 rounded-2xl border p-5 backdrop-blur"
          style={{ borderColor: "rgba(184,232,64,0.2)", background: "rgba(184,232,64,0.04)" }}
        >
          <p className="text-sm leading-7" style={{ color: "rgba(232,242,216,0.75)" }}>
            <span className="font-bold" style={{ color: "#e8f2d8" }}>Aviso.</span> La información de horarios y tarifas puede cambiar por operación. Usa esta página como guía de planeación y confirma avisos oficiales antes de abordar.
          </p>
        </aside>

        <div className="mt-10">
          <NotGovernmentNotice variant="compact" />
        </div>

      </div>
      </div>
      <PublicFooter />
    </main>
  );
}

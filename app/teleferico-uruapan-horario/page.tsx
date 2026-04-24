import type { Metadata } from "next";
import Link from "next/link";
import { APP_BRAND, FARES_2026, TELEFERICO_URUAPAN } from "@/lib/mobility-config";

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
    <main className="min-h-dvh bg-[#080C18] px-5 py-8 text-slate-100 sm:px-8 lg:px-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-2 rounded-2xl border border-[#00D4AA]/20 bg-[#0E1526] px-3.5 py-2 text-sm font-bold text-white">
          <span className="h-2.5 w-2.5 rounded-full bg-[#00D4AA]" />
          {APP_BRAND.name}
        </Link>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#00D4AA]">Teleférico Uruapan horario</p>
            <h1 className="mt-3 font-display text-5xl font-black leading-tight tracking-tight text-white md:text-6xl">
              Teleférico Uruapan: horario, estaciones y tarifa
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
              Guía rápida para moverte en el Teleférico de Uruapan y combinarlo con rutas de camión urbano desde el mapa de VoyUruapan.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/mapa?destino=Teleferico%20Uruapan" className="inline-flex h-12 items-center justify-center rounded-full bg-[#00D4AA] px-6 text-sm font-black text-gray-950">
                Abrir en el mapa
              </Link>
              <Link href="/#tarifas" className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 text-sm font-bold text-slate-100">
                Ver tarifas
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[#0E1526]/80 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#00D4AA]/20 bg-[#00D4AA]/10 p-4">
                <dt className="text-xs font-bold uppercase tracking-widest text-[#00D4AA]">Horario</dt>
                <dd className="mt-2 font-display text-2xl font-black text-white">{TELEFERICO_URUAPAN.hours}</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">Tarifa</dt>
                <dd className="mt-2 font-display text-2xl font-black text-white">{TELEFERICO_URUAPAN.fare}</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">Pago</dt>
                <dd className="mt-2 text-sm font-bold leading-6 text-white">{TELEFERICO_URUAPAN.payment}</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">Frecuencia</dt>
                <dd className="mt-2 text-sm font-bold leading-6 text-white">{TELEFERICO_URUAPAN.frequency}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="mt-12 rounded-[2rem] border border-white/10 bg-[#0E1526]/80 p-6 md:p-8">
          <h2 className="font-display text-3xl font-black text-white">Estaciones del Teleférico Uruapan</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {TELEFERICO_URUAPAN.stations.map((station, index) => (
              <article key={station} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-black text-[#00D4AA]">E{index + 1}</p>
                <h3 className="mt-2 font-display text-lg font-black text-white">{station}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">Conexión potencial con rutas urbanas y puntos cercanos de Uruapan.</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 grid gap-4 md:grid-cols-2">
          {telefericoFaqs.map((faq) => (
            <article key={faq.question} className="rounded-2xl border border-white/10 bg-[#0E1526]/80 p-5">
              <h2 className="font-display text-lg font-black text-white">{faq.question}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{faq.answer}</p>
            </article>
          ))}
        </section>

        <p className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-7 text-amber-100">
          La información de horarios y tarifas puede cambiar por operación. Usa esta página como guía de planeación y confirma avisos oficiales antes de abordar.
        </p>
      </div>
    </main>
  );
}

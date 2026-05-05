import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import NotGovernmentNotice from "@/components/NotGovernmentNotice";
import ForceDark from "@/components/ForceDark";

export const metadata: Metadata = {
  title: "GuÃ­a de transporte pÃºblico para estudiantes en Uruapan",
  description: "37 escuelas conectadas al sistema, horarios que cubren todos los turnos, Wi-Fi en el TelefÃ©rico y cÃ¡maras en los camiones. Todo lo que necesitas saber.",
  alternates: {
    canonical: "https://www.urugo.app/blog/guia-transporte-publico-estudiantes-uruapan"
  },
  openGraph: {
    title: "GuÃ­a de transporte pÃºblico para estudiantes en Uruapan",
    description: "37 escuelas conectadas, todos los turnos cubiertos y tips para moverte en camiÃ³n y TelefÃ©rico siendo estudiante en Uruapan.",
    url: "https://www.urugo.app/blog/guia-transporte-publico-estudiantes-uruapan",
    type: "article",
    publishedTime: "2026-01-20T00:00:00-06:00",
    modifiedTime: "2026-04-27T00:00:00-06:00"
  }
};

const blogPostingJsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "GuÃ­a de transporte pÃºblico para estudiantes en Uruapan",
  description: "GuÃ­a para estudiantes que se mueven en camiÃ³n urbano, TelefÃ©rico y rutas cercanas a escuelas en Uruapan.",
  datePublished: "2026-01-20",
  dateModified: "2026-04-27",
  author: { "@type": "Organization", name: "UruGo" },
  publisher: { "@type": "Organization", name: "UruGo" },
  mainEntityOfPage: { "@type": "WebPage", "@id": "/blog/guia-transporte-publico-estudiantes-uruapan" },
  inLanguage: "es-MX",
  keywords: "transporte escolar Uruapan, camiÃ³n estudiantes Uruapan, telefÃ©rico estudiantes, rutas camiÃ³n escuelas Uruapan"
};

const CARDS = [
  {
    eyebrow: "Cobertura escolar",
    title: "37 escuelas conectadas",
    body: "El sistema estÃ¡ diseÃ±ado para la comunidad escolar: 37 escuelas de distintos niveles se encuentran en las inmediaciones de las estaciones del TelefÃ©rico y sus conexiones terrestres."
  },
  {
    eyebrow: "Horarios",
    title: "Todos los turnos cubiertos",
    body: "TelefÃ©rico de 5:00 a.m. a 11:00 p.m. sin interrupciÃ³n. Camiones troncales (Ruta 11 y similares) de 06:00 a 22:00 h. Ideal para prepa temprana o universidad nocturna."
  },
  {
    eyebrow: "Seguridad",
    title: "5 cÃ¡maras + botÃ³n de pÃ¡nico",
    body: "Cada camiÃ³n nuevo lleva cinco cÃ¡maras de videovigilancia y un botÃ³n de pÃ¡nico. AdemÃ¡s, los sistemas detectan si el chofer usa el celular o excede la velocidad."
  },
  {
    eyebrow: "Conectividad",
    title: "Wi-Fi gratis en el TelefÃ©rico",
    body: "Las cabinas tienen Wi-Fi de alta velocidad e iluminaciÃ³n LED. Ãšsalo para leer, mandar tareas o estudiar durante los hasta 27 minutos de trayecto."
  },
  {
    eyebrow: "Costo y pago",
    title: "$11.00 MXN Â· tarjeta electrÃ³nica",
    body: "La misma tarifa aplica para camiÃ³n y TelefÃ©rico. Con la tarjeta electrÃ³nica de movilidad no necesitas efectivo, abordas mÃ¡s rÃ¡pido y reduces el riesgo de asalto."
  }
] as const;

export default function GuiaEstudiantesPage() {
  return (
    <main className="greca-bg greca-bg-animated min-h-dvh px-5 py-8 sm:px-8 lg:px-10" style={{ background: "#0c110a", color: "#e8f2d8" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingJsonLd) }} />
      <ForceDark />
      <article className="relative z-10 mx-auto max-w-3xl">
        <PageHeader
          backHref="/blog"
          backLabel="Blog"
          eyebrow="En preparaciÃ³n"
          title={
            <>
              GuÃ­a para <span className="italic text-lima">estudiantes</span> en Uruapan.
            </>
          }
          intro="37 escuelas conectadas, Wi-Fi en el TelefÃ©rico y cÃ¡maras en los camiones. Todo lo que necesitas para moverte entre prepa, uni y casa."
        />

        <section className="mt-12 grid gap-4 sm:grid-cols-2">
          {CARDS.map((card) => (
            <div
              key={card.title}
              className="card-lift rounded-2xl border border-foreground/10 bg-ink-900/60 p-5 backdrop-blur"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-lima">{card.eyebrow}</p>
              <h3 className="mt-1 font-serif-display text-lg font-black text-white">{card.title}</h3>
              <p className="mt-3 text-sm leading-6 text-foreground/70">{card.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-[1.75rem] border border-foreground/12 bg-ink-900/65 p-8 backdrop-blur">
          <h2 className="font-serif-display text-2xl font-black text-white">PrÃ³ximamente</h2>
          <p className="mt-3 text-sm leading-7 text-foreground/75">
            Estamos armando esta guÃ­a con la ubicaciÃ³n de las 37 escuelas conectadas al sistema, horarios pico, rutas terrestres recomendadas y cÃ³mo aprovechar el Wi-Fi gratuito y las cÃ¡maras de seguridad en tus trayectos de prepa o universidad. Mientras tanto, planea tu viaje en el mapa.
          </p>
          <Link
            href="/mapa"
            className="cta-shine mt-6 inline-flex h-11 items-center rounded-full bg-verde px-6 py-2 text-sm font-black text-white hover:opacity-90"
          >
            Planear mi trayecto â†’
          </Link>
        </section>

        <div className="mt-12">
          <NotGovernmentNotice variant="compact" />
        </div>
      </article>
    </main>
  );
}

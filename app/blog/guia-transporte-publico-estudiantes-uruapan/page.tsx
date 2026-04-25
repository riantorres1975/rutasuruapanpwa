import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import NotGovernmentNotice from "@/components/NotGovernmentNotice";

export const metadata: Metadata = {
  title: "Guía de transporte público para estudiantes en Uruapan",
  description: "37 escuelas conectadas al sistema, horarios que cubren todos los turnos, Wi-Fi en el Teleférico y cámaras en los camiones. Todo lo que necesitas saber.",
  alternates: {
    canonical: "/blog/guia-transporte-publico-estudiantes-uruapan"
  }
};

const CARDS = [
  {
    eyebrow: "Cobertura escolar",
    title: "37 escuelas conectadas",
    body: "El sistema está diseñado para la comunidad escolar: 37 escuelas de distintos niveles se encuentran en las inmediaciones de las estaciones del Teleférico y sus conexiones terrestres."
  },
  {
    eyebrow: "Horarios",
    title: "Todos los turnos cubiertos",
    body: "Teleférico de 5:00 a.m. a 11:00 p.m. sin interrupción. Camiones troncales (Ruta 11 y similares) de 06:00 a 22:00 h. Ideal para prepa temprana o universidad nocturna."
  },
  {
    eyebrow: "Seguridad",
    title: "5 cámaras + botón de pánico",
    body: "Cada camión nuevo lleva cinco cámaras de videovigilancia y un botón de pánico. Además, los sistemas detectan si el chofer usa el celular o excede la velocidad."
  },
  {
    eyebrow: "Conectividad",
    title: "Wi-Fi gratis en el Teleférico",
    body: "Las cabinas tienen Wi-Fi de alta velocidad e iluminación LED. Úsalo para leer, mandar tareas o estudiar durante los hasta 27 minutos de trayecto."
  },
  {
    eyebrow: "Costo y pago",
    title: "$11.00 MXN · tarjeta electrónica",
    body: "La misma tarifa aplica para camión y Teleférico. Con la tarjeta electrónica de movilidad no necesitas efectivo, abordas más rápido y reduces el riesgo de asalto."
  }
] as const;

export default function GuiaEstudiantesPage() {
  return (
    <main className="greca-bg greca-bg-animated min-h-dvh px-5 py-8 text-cream-100 sm:px-8 lg:px-10">
      <article className="relative z-10 mx-auto max-w-3xl">
        <PageHeader
          backHref="/blog"
          backLabel="Blog"
          eyebrow="En preparación"
          title={
            <>
              Guía para <span className="italic text-terracota-400">estudiantes</span> en Uruapan.
            </>
          }
          intro="37 escuelas conectadas, Wi-Fi en el Teleférico y cámaras en los camiones. Todo lo que necesitas para moverte entre prepa, uni y casa."
        />

        <section className="mt-12 grid gap-4 sm:grid-cols-2">
          {CARDS.map((card) => (
            <div
              key={card.title}
              className="card-lift rounded-2xl border border-cream-100/10 bg-ink-900/60 p-5 backdrop-blur"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-terracota-400">{card.eyebrow}</p>
              <h3 className="mt-1 font-serif-display text-lg font-black text-cream-50">{card.title}</h3>
              <p className="mt-3 text-sm leading-6 text-cream-100/70">{card.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-[1.75rem] border border-cream-100/12 bg-ink-900/65 p-8 backdrop-blur">
          <h2 className="font-serif-display text-2xl font-black text-cream-50">Próximamente</h2>
          <p className="mt-3 text-sm leading-7 text-cream-100/75">
            Estamos armando esta guía con la ubicación de las 37 escuelas conectadas al sistema, horarios pico, rutas terrestres recomendadas y cómo aprovechar el Wi-Fi gratuito y las cámaras de seguridad en tus trayectos de prepa o universidad. Mientras tanto, planea tu viaje en el mapa.
          </p>
          <Link
            href="/mapa"
            className="cta-shine mt-6 inline-flex h-11 items-center rounded-full bg-terracota-400 px-5 text-sm font-black text-cream-50 hover:bg-terracota-500"
          >
            Planear mi trayecto →
          </Link>
        </section>

        <div className="mt-12">
          <NotGovernmentNotice variant="compact" />
        </div>
      </article>
    </main>
  );
}

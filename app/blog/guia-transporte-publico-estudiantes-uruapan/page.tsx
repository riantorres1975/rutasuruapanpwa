import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import NotGovernmentNotice from "@/components/NotGovernmentNotice";

export const metadata: Metadata = {
  title: "Guía de transporte público para estudiantes en Uruapan",
  description: "Artículo en preparación para estudiantes que usan camión urbano y Teleférico en Uruapan.",
  alternates: {
    canonical: "/blog/guia-transporte-publico-estudiantes-uruapan"
  }
};

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
          intro="Una guía pensada para quienes se mueven entre la prepa, la uni y casa todos los días en camión urbano y Teleférico."
        />

        <section className="mt-12 rounded-[1.75rem] border border-cream-100/12 bg-ink-900/65 p-8 backdrop-blur">
          <p className="font-serif-display text-5xl font-black text-terracota-400">🎒</p>
          <h2 className="mt-3 font-serif-display text-2xl font-black text-cream-50">
            Próximamente
          </h2>
          <p className="mt-3 text-sm leading-7 text-cream-100/75">
            Estamos armando esta guía con escuelas, horarios pico, rutas recomendadas, costos y tips de seguridad para estudiantes. Mientras tanto, planea tu trayecto en el mapa.
          </p>

          <Link
            href="/mapa"
            className="cta-shine mt-7 inline-flex h-11 items-center rounded-full bg-terracota-400 px-5 text-sm font-black text-cream-50 hover:bg-terracota-500"
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

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Guía de transporte público para estudiantes en Uruapan",
  description: "Artículo en preparación para estudiantes que usan camión urbano y Teleférico en Uruapan.",
  alternates: {
    canonical: "/blog/guia-transporte-publico-estudiantes-uruapan"
  }
};

export default function GuiaEstudiantesPage() {
  return (
    <main className="min-h-dvh bg-[#080C18] px-5 py-8 text-slate-100 sm:px-8 lg:px-10">
      <article className="mx-auto max-w-3xl">
        <Link href="/blog" className="text-sm font-bold text-[#00D4AA]">← Volver al blog</Link>
        <h1 className="mt-8 font-display text-4xl font-black text-white">Guía de transporte público para estudiantes en Uruapan</h1>
        <p className="mt-5 rounded-2xl border border-white/10 bg-[#0E1526]/80 p-5 text-sm leading-7 text-slate-300">
          {"// TODO: Completar esta guía con escuelas, horarios de mayor demanda, rutas recomendadas, costos y tips de seguridad para estudiantes."}
        </p>
      </article>
    </main>
  );
}

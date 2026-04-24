import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Las rutas de camión más usadas en Uruapan",
  description: "Artículo en preparación sobre las rutas de camión más usadas en Uruapan y para qué sirven.",
  alternates: {
    canonical: "/blog/rutas-camion-mas-usadas-uruapan"
  }
};

export default function RutasCamionMasUsadasPage() {
  return (
    <main className="min-h-dvh bg-[#080C18] px-5 py-8 text-slate-100 sm:px-8 lg:px-10">
      <article className="mx-auto max-w-3xl">
        <Link href="/blog" className="text-sm font-bold text-[#00D4AA]">← Volver al blog</Link>
        <h1 className="mt-8 font-display text-4xl font-black text-white">Las rutas de camión más usadas en Uruapan y para qué sirven</h1>
        <p className="mt-5 rounded-2xl border border-white/10 bg-[#0E1526]/80 p-5 text-sm leading-7 text-slate-300">
          {"// TODO: Completar este artículo con ranking de rutas, destinos principales, colonias atendidas y casos de uso reales."}
        </p>
      </article>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import NotGovernmentNotice from "@/components/NotGovernmentNotice";
import { BLOG_ARTICLES } from "@/lib/blog-content";

export const metadata: Metadata = {
  title: "Blog de transporte público en Uruapan",
  description: "Guías locales sobre rutas de camiones, Teleférico, tarifas y movilidad en Uruapan.",
  alternates: {
    canonical: "/blog"
  },
  openGraph: {
    title: "Blog de transporte público en Uruapan",
    description: "Guías locales para moverte en camión, Teleférico y rutas urbanas de Uruapan.",
    url: "/blog"
  }
};

const READING_TIME = ["6 min", "5 min", "7 min"] as const;

export default function BlogIndexPage() {
  return (
    <main className="greca-bg greca-bg-animated min-h-dvh px-5 py-8 text-cream-100 sm:px-8 lg:px-10">
      <div className="relative z-10 mx-auto max-w-5xl">
        <PageHeader
          kicker="Uandakuecha · palabras"
          eyebrow="Guías locales"
          title={
            <>
              Cómo se mueve <span className="italic text-terracota-400">Uruapan</span>.
            </>
          }
          intro="Artículos prácticos para saber cómo llegar, cuánto cuesta y cómo combinar camión urbano con Teleférico. Escritos desde aquí, para aquí."
        />

        <section className="mt-12 grid gap-5 md:grid-cols-2">
          {BLOG_ARTICLES.map((article, index) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="card-lift group relative overflow-hidden rounded-[1.75rem] border border-cream-100/12 bg-ink-900/65 p-6 backdrop-blur transition hover:border-terracota-400/40"
            >
              {/* Número grande decorativo */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-4 -top-6 font-serif-display text-[8rem] font-black leading-none text-cream-100/[0.04] transition group-hover:text-terracota-400/10"
              >
                0{index + 1}
              </span>

              <div className="relative">
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.22em]">
                  <span className="text-terracota-400">{article.date}</span>
                  <span className="h-1 w-1 rounded-full bg-cream-100/30" />
                  <span className="text-cream-100/60">{READING_TIME[index] ?? "5 min"} de lectura</span>
                </div>

                <h2 className="mt-4 font-serif-display text-2xl font-black leading-tight text-cream-50 group-hover:text-cream-50">
                  {article.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-cream-100/70">
                  {article.description}
                </p>

                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-black text-terracota-400">
                  Leer guía
                  <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span>
                </span>
              </div>
            </Link>
          ))}
        </section>

        <div className="mt-12">
          <NotGovernmentNotice variant="compact" />
        </div>
      </div>
    </main>
  );
}

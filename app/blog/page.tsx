import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import NotGovernmentNotice from "@/components/NotGovernmentNotice";
import Logo from "@/components/Logo";
import ForceDark from "@/components/ForceDark";
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
    <main style={{ background: "#0c110a", color: "#e8f2d8", minHeight: "100dvh" }}>
      <ForceDark />
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-4"
        style={{
          background: "rgba(12,17,10,0.9)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(140,200,80,0.08)",
        }}
      >
        <Logo size={28} showName showSub />
        <Link
          href="/mapa"
          className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: "#6aab48" }}
        >
          Abrir mapa
        </Link>
      </nav>
      <div className="greca-bg greca-bg-animated px-5 pt-28 pb-8 sm:px-8 lg:px-10">
      <div className="relative z-10 mx-auto max-w-5xl">
        <PageHeader
          kicker="Uandakuecha · palabras"
          eyebrow="Guías locales"
          title={
            <>
              Cómo se mueve <span className="italic" style={{ color: "#b8e840" }}>Uruapan</span>.
            </>
          }
          intro="Artículos prácticos para saber cómo llegar, cuánto cuesta y cómo combinar camión urbano con Teleférico. Escritos desde aquí, para aquí."
        />

        <section className="mt-12 grid gap-5 md:grid-cols-2">
          {BLOG_ARTICLES.map((article, index) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="card-lift group relative overflow-hidden rounded-[1.75rem] border p-6 backdrop-blur transition"
              style={{
                borderColor: "rgba(140,200,80,0.12)",
                background: "rgba(20,28,16,0.65)",
              }}
            >
              {/* Número grande decorativo */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-4 -top-6 font-serif text-[8rem] font-black leading-none"
                style={{ color: "rgba(232,242,216,0.04)" }}
              >
                0{index + 1}
              </span>

              <div className="relative">
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.22em]">
                  <span style={{ color: "#b8e840" }}>{article.date}</span>
                  <span className="h-1 w-1 rounded-full" style={{ background: "rgba(232,242,216,0.2)" }} />
                  <span style={{ color: "rgba(232,242,216,0.5)" }}>{READING_TIME[index] ?? "5 min"} de lectura</span>
                </div>

                <h2 className="mt-4 font-serif text-2xl font-black leading-tight" style={{ color: "#e8f2d8" }}>
                  {article.title}
                </h2>
                <p className="mt-3 text-sm leading-7" style={{ color: "rgba(232,242,216,0.6)" }}>
                  {article.description}
                </p>

                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-black" style={{ color: "#b8e840" }}>
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
      </div>
    </main>
  );
}

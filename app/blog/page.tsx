import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_ARTICLES } from "@/lib/blog-content";
import { APP_BRAND } from "@/lib/mobility-config";

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

export default function BlogIndexPage() {
  return (
    <main className="min-h-dvh bg-[#080C18] px-5 py-8 text-slate-100 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-2 rounded-2xl border border-[#00D4AA]/20 bg-[#0E1526] px-3.5 py-2 text-sm font-bold text-white">
          <span className="h-2.5 w-2.5 rounded-full bg-[#00D4AA]" />
          {APP_BRAND.name}
        </Link>

        <header className="mt-10 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#00D4AA]">Guías locales</p>
          <h1 className="mt-3 font-display text-5xl font-black tracking-tight text-white md:text-6xl">Blog de transporte público en Uruapan</h1>
          <p className="mt-5 text-base leading-8 text-slate-300">Artículos prácticos para saber cómo llegar, cuánto cuesta y cómo combinar camión urbano con Teleférico en Uruapan.</p>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {BLOG_ARTICLES.map((article) => (
            <article key={article.slug} className="rounded-[2rem] border border-white/10 bg-[#0E1526]/80 p-6 transition hover:border-[#00D4AA]/35">
              <p className="text-xs font-bold uppercase tracking-widest text-[#00D4AA]">{article.keyword}</p>
              <h2 className="mt-3 font-display text-2xl font-black text-white">{article.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{article.description}</p>
              <Link href={`/blog/${article.slug}`} className="mt-5 inline-flex text-sm font-black text-[#00D4AA]">
                Leer guía
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

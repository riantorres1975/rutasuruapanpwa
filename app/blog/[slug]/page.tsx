import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_ARTICLES, getBlogArticle } from "@/lib/blog-content";
import { APP_BRAND } from "@/lib/mobility-config";

type BlogArticlePageProps = {
  params: {
    slug: string;
  };
};

export function generateStaticParams() {
  return BLOG_ARTICLES.map((article) => ({ slug: article.slug }));
}

export function generateMetadata({ params }: BlogArticlePageProps): Metadata {
  const article = getBlogArticle(params.slug);

  if (!article) {
    return {};
  }

  return {
    title: article.title,
    description: article.description,
    alternates: {
      canonical: `/blog/${article.slug}`
    },
    openGraph: {
      title: article.title,
      description: article.description,
      url: `/blog/${article.slug}`,
      type: "article",
      publishedTime: article.updatedAt,
      modifiedTime: article.updatedAt
    }
  };
}

export default function BlogArticlePage({ params }: BlogArticlePageProps) {
  const article = getBlogArticle(params.slug);

  if (!article) {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rutasuruapanpwa.vercel.app";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: baseUrl },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${baseUrl}/blog` },
          { "@type": "ListItem", position: 3, name: article.title, item: `${baseUrl}/blog/${article.slug}` }
        ]
      },
      {
        "@type": "Article",
        headline: article.title,
        description: article.description,
        datePublished: article.updatedAt,
        dateModified: article.updatedAt,
        inLanguage: "es-MX",
        author: {
          "@type": "Organization",
          name: APP_BRAND.name
        },
        publisher: {
          "@type": "Organization",
          name: APP_BRAND.name,
          logo: {
            "@type": "ImageObject",
            url: `${baseUrl}/icons/icon-512.png`
          }
        },
        mainEntityOfPage: `${baseUrl}/blog/${article.slug}`
      }
    ]
  };

  return (
    <main className="min-h-dvh bg-[#080C18] px-5 py-8 text-slate-100 sm:px-8 lg:px-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="mx-auto max-w-3xl">
        <Link href="/blog" className="inline-flex items-center gap-2 rounded-2xl border border-[#00D4AA]/20 bg-[#0E1526] px-3.5 py-2 text-sm font-bold text-white">
          <span className="h-2.5 w-2.5 rounded-full bg-[#00D4AA]" />
          Blog
        </Link>

        <header className="mt-10">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#00D4AA]">{article.keyword}</p>
          <h1 className="mt-3 font-display text-4xl font-black leading-tight tracking-tight text-white md:text-5xl">{article.title}</h1>
          <p className="mt-5 text-base leading-8 text-slate-300">{article.description}</p>
        </header>

        <section className="mt-8 rounded-2xl border border-[#00D4AA]/20 bg-[#00D4AA]/10 p-5">
          <h2 className="font-display text-xl font-black text-white">Respuesta rápida</h2>
          <p className="mt-3 text-sm leading-7 text-slate-200">{article.snippet}</p>
        </section>

        <div className="mt-8 space-y-8">
          {article.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-2xl font-black text-white">{section.heading}</h2>
              <p className="mt-3 text-sm leading-8 text-slate-300">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] border border-white/10 bg-[#0E1526]/80 p-6">
          <h2 className="font-display text-2xl font-black text-white">Calcula tu ruta en el mapa</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">Abre VoyUruapan, marca origen y destino, y compara rutas urbanas, Teleférico y transbordos posibles.</p>
          <Link href="/mapa" className="mt-5 inline-flex h-11 items-center rounded-full bg-[#00D4AA] px-5 text-sm font-black text-gray-950">
            Abrir mapa
          </Link>
        </div>
      </article>
    </main>
  );
}

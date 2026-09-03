import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Braces,
  Database,
  ExternalLink,
  GitPullRequest,
  Route,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import ForceDark from "@/components/ForceDark";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import { SITE_CONTENT_LAST_UPDATED_ISO } from "@/lib/mobility-config";
import { PROJECT } from "@/lib/project";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Datos y API de rutas",
  description: "Consulta la API pública de recorridos de UruGo y conoce cómo se revisan las correcciones comunitarias antes de publicarse.",
  alternates: { canonical: `${SITE_URL}/datos-api` },
  openGraph: {
    title: "Datos y API de UruGo",
    description: "Recorridos de transporte de Uruapan en JSON, con versiones, caché y revisión comunitaria.",
    url: `${SITE_URL}/datos-api`,
    siteName: "UruGo",
    type: "website",
  },
};

const endpoint = `${SITE_URL}/api/v1/routes`;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebAPI",
  name: "API de rutas UruGo",
  url: endpoint,
  documentation: `${SITE_URL}/datos-api`,
  provider: { "@id": `${SITE_URL}/#organization` },
  dateModified: SITE_CONTENT_LAST_UPDATED_ISO,
  areaServed: { "@type": "City", name: "Uruapan" },
};

const responseExample = `{
  "meta": {
    "version": "supabase-…-81",
    "source": "supabase",
    "count": 81
  },
  "routes": [
    {
      "id": 1,
      "name": "Ruta 1 - San José",
      "original_name": "Ruta 1 - San José (Ida)",
      "color": "#…",
      "path": [[-102.0, 19.4]],
      "landmarks": []
    }
  ]
}`;

export default function DataApiPage() {
  return (
    <main className="min-h-dvh bg-[#0c110a] text-[#e8f2d8]" data-theme="dark">
      <ForceDark />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PublicHeader />

      <article>
        <header className="border-b border-white/10 px-5 pb-16 pt-28 sm:px-8 lg:pb-24 lg:pt-36">
          <div className="mx-auto max-w-[1240px]">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#57d6e8]">Consulta pública · Escritura moderada</p>
                <h1 className="mt-5 max-w-4xl font-serif text-5xl font-black leading-[0.98] sm:text-6xl lg:text-7xl">
                  Datos y API <span className="text-[#b8e840]">de UruGo.</span>
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-7 text-[#a8c888] sm:text-lg">
                  Los recorridos que alimentan el mapa se pueden consultar en JSON. Las propuestas de cambio pasan por revisión humana antes de llegar a esta respuesta.
                </p>
              </div>

              <dl className="grid grid-cols-3 border-y border-white/10 py-5 lg:grid-cols-1 lg:gap-4 lg:border-y-0 lg:border-l lg:py-0 lg:pl-8">
                <div><dt className="text-[10px] font-bold uppercase text-[#6f895a]">Versión</dt><dd className="mt-1 font-serif text-xl font-black">v1</dd></div>
                <div><dt className="text-[10px] font-bold uppercase text-[#6f895a]">Formato</dt><dd className="mt-1 font-serif text-xl font-black">JSON</dd></div>
                <div><dt className="text-[10px] font-bold uppercase text-[#6f895a]">Lectura</dt><dd className="mt-1 font-serif text-xl font-black">Pública</dd></div>
              </dl>
            </div>
          </div>
        </header>

        <section className="px-5 py-16 sm:px-8 lg:py-24" aria-labelledby="endpoint-title">
          <div className="mx-auto max-w-[1240px]">
            <div className="grid gap-10 lg:grid-cols-[300px_minmax(0,1fr)]">
              <div>
                <Database className="h-8 w-8 text-[#57d6e8]" strokeWidth={1.6} aria-hidden="true" />
                <h2 id="endpoint-title" className="mt-5 font-serif text-4xl font-black">Un punto de entrada.</h2>
                <p className="mt-4 text-sm leading-7 text-[#8eaa76]">Devuelve únicamente recorridos activos y publicados. Si la base remota falla, UruGo conserva un respaldo estático.</p>
              </div>

              <div className="min-w-0 border-y border-white/10">
                <div className="flex flex-col gap-3 border-b border-white/10 py-5 sm:flex-row sm:items-center">
                  <span className="w-fit bg-[#b8e840] px-2 py-1 text-[11px] font-black text-[#0c110a]">GET</span>
                  <code className="min-w-0 break-all text-sm text-[#dceaca]">{endpoint}</code>
                  <a href={endpoint} target="_blank" rel="noreferrer" aria-label="Abrir respuesta de la API" title="Abrir respuesta" className="grid h-9 w-9 shrink-0 place-items-center border border-white/10 text-[#a8c888] transition hover:border-[#57d6e8]/60 hover:text-[#e8f2d8] sm:ml-auto">
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
                <pre className="overflow-x-auto py-6 text-xs leading-6 text-[#9fc083]"><code>{`curl -H "Accept: application/json" \\\n+  ${endpoint}`}</code></pre>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-[#10160d] px-5 py-16 sm:px-8 lg:py-24" aria-labelledby="contract-title">
          <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#6f895a]">Contrato de respuesta</p>
              <h2 id="contract-title" className="mt-3 font-serif text-4xl font-black sm:text-5xl">Lo necesario para dibujar una ruta.</h2>
              <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
                <div className="grid gap-3 py-5 sm:grid-cols-[160px_1fr]"><p className="text-sm font-black">Identidad</p><p className="text-sm leading-6 text-[#8eaa76]"><code>id</code>, nombre público y nombre de dirección.</p></div>
                <div className="grid gap-3 py-5 sm:grid-cols-[160px_1fr]"><p className="text-sm font-black">Geometría</p><p className="text-sm leading-6 text-[#8eaa76]">Coordenadas <code>[longitud, latitud]</code>, ancho de corredor y color.</p></div>
                <div className="grid gap-3 py-5 sm:grid-cols-[160px_1fr]"><p className="text-sm font-black">Referencias</p><p className="text-sm leading-6 text-[#8eaa76]">Lugares revisados que ayudan a reconocer el recorrido.</p></div>
              </div>
            </div>

            <div className="min-w-0 border border-white/10 bg-[#090d08]">
              <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4 text-xs font-black text-[#a8c888]"><Braces className="h-4 w-4 text-[#57d6e8]" /> Respuesta abreviada</div>
              <pre className="max-h-[440px] overflow-auto p-5 text-[11px] leading-6 text-[#9fc083]"><code>{responseExample}</code></pre>
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-8 lg:py-24" aria-labelledby="rules-title">
          <div className="mx-auto max-w-[1240px]">
            <h2 id="rules-title" className="max-w-3xl font-serif text-4xl font-black sm:text-5xl">Reglas pequeñas, datos más confiables.</h2>
            <div className="mt-10 grid border-y border-white/10 md:grid-cols-3">
              <div className="border-b border-white/10 py-7 md:border-b-0 md:border-r md:pr-8"><TimerReset className="h-6 w-6 text-[#b8e840]" /><h3 className="mt-6 font-serif text-2xl font-black">Caché consciente</h3><p className="mt-3 text-sm leading-7 text-[#8eaa76]">La respuesta puede almacenarse una hora y publica <code>ETag</code> para evitar descargas repetidas.</p></div>
              <div className="border-b border-white/10 py-7 md:border-b-0 md:border-r md:px-8"><Route className="h-6 w-6 text-[#57d6e8]" /><h3 className="mt-6 font-serif text-2xl font-black">Lectura desde otras apps</h3><p className="mt-3 text-sm leading-7 text-[#8eaa76]">El endpoint admite CORS para solicitudes <code>GET</code>. No expone contactos, reportes ni identificadores comunitarios.</p></div>
              <div className="py-7 md:pl-8"><ShieldCheck className="h-6 w-6 text-[#f4c84a]" /><h3 className="mt-6 font-serif text-2xl font-black">Sin escritura directa</h3><p className="mt-3 text-sm leading-7 text-[#8eaa76]">Ninguna aplicación externa puede editar rutas mediante esta API. Cada corrección se modera y publica como una versión nueva.</p></div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 px-5 py-16 sm:px-8 lg:py-20">
          <div className="mx-auto grid max-w-[1240px] gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
            <div>
              <GitPullRequest className="h-7 w-7 text-[#b8e840]" strokeWidth={1.6} aria-hidden="true" />
              <h2 className="mt-5 font-serif text-4xl font-black">¿El dato ya cambió?</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#8eaa76]">Envía la ruta, una referencia y, cuando sea posible, evidencia o un trazo aproximado. Dos aportes independientes ayudan a confirmar actividad; un administrador decide qué se publica.</p>
              <Link href="/reportar-error" className="mt-7 inline-flex min-h-12 items-center gap-2 bg-[#6aab48] px-5 text-sm font-black text-[#0c110a] transition hover:bg-[#7cbd59]">Proponer una corrección <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="border-l border-white/10 pl-6 text-sm leading-7 text-[#78965f] sm:pl-8">
              <p className="font-black text-[#dceaca]">Reutilización</p>
              <p className="mt-3">La consulta es pública, pero el conjunto completo todavía no tiene una licencia general de redistribución. Algunas referencias derivan de OpenStreetMap y conservan su atribución ODbL.</p>
              <Link href={PROJECT.repositoryUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 font-bold text-[#b8e840]">Revisar código y fuentes <ExternalLink className="h-3.5 w-3.5" /></Link>
            </div>
          </div>
        </section>
      </article>

      <PublicFooter />
    </main>
  );
}

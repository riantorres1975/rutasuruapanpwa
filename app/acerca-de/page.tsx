import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Database,
  FileCode2,
  Heart,
  MapPinned,
  MessageSquareWarning,
  Route,
  SearchCheck,
} from "lucide-react";
import ForceDark from "@/components/ForceDark";
import NotGovernmentNotice from "@/components/NotGovernmentNotice";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import {
  DATA_LAST_UPDATED,
  DATA_LAST_UPDATED_ISO,
  SITE_CONTENT_LAST_UPDATED_ISO,
} from "@/lib/mobility-config";
import { PROJECT, PROJECT_SOCIAL_PROFILES } from "@/lib/project";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Cómo se hace UruGo",
  description:
    "Conoce cómo UruGo documenta, verifica y actualiza las rutas de camiones, horarios y puntos de referencia de Uruapan.",
  alternates: { canonical: `${SITE_URL}/acerca-de` },
  openGraph: {
    title: "Cómo se hace UruGo",
    description: "Metodología, fuentes y responsable del mapa independiente de transporte público de Uruapan.",
    url: `${SITE_URL}/acerca-de`,
    siteName: "UruGo",
    type: "article",
  },
};

const methodology = [
  {
    icon: Route,
    number: "01",
    title: "Trazar los recorridos",
    description:
      "Cada ruta se guarda como una polilínea GPS. Se revisan ambos sentidos para que el mapa siga las calles por las que circula el camión.",
  },
  {
    icon: MapPinned,
    number: "02",
    title: "Ubicar referencias útiles",
    description:
      "Se cruzan los recorridos con lugares reconocibles. La Ruta 1 y las estaciones del Teleférico se verificaron manualmente; las demás referencias parten de OpenStreetMap y se revisan antes de publicarse.",
  },
  {
    icon: SearchCheck,
    number: "03",
    title: "Comprobar en campo",
    description:
      "Los trazos, destinos, horarios aproximados y cambios reportados se contrastan con observación local. La última revisión general fue en junio de 2026.",
  },
  {
    icon: MessageSquareWarning,
    number: "04",
    title: "Corregir con la comunidad",
    description:
      "Cuando una calle, horario o referencia cambia, cualquier persona puede enviar un reporte. Se revisa antes de incorporarlo a los datos públicos.",
  },
] as const;

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": `${SITE_URL}/acerca-de#page`,
  name: "Cómo se hace UruGo",
  url: `${SITE_URL}/acerca-de`,
  description: "Metodología, fuentes y responsable de UruGo.",
  inLanguage: "es-MX",
  dateModified: SITE_CONTENT_LAST_UPDATED_ISO,
  isPartOf: { "@id": `${SITE_URL}/#website` },
  about: {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "UruGo",
    url: SITE_URL,
    founder: {
      "@type": "Person",
      name: PROJECT.author,
      sameAs: [...PROJECT_SOCIAL_PROFILES],
    },
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-dvh bg-[#0c110a] text-[#e8f2d8]" data-theme="dark">
      <ForceDark />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }} />
      <PublicHeader />

      <article>
        <header className="border-b border-white/10 px-5 pb-16 pt-28 sm:px-8 lg:pb-24 lg:pt-36">
          <div className="mx-auto max-w-[1240px]">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#b8e840]">
                  Datos locales, proyecto abierto
                </p>
                <h1 className="mt-5 max-w-4xl font-serif text-5xl font-black leading-[0.98] sm:text-6xl lg:text-7xl">
                  El mapa se construye <span className="text-[#a8ef24]">recorriendo Uruapan.</span>
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-7 text-[#a8c888] sm:text-lg">
                  UruGo reúne recorridos GPS, puntos de referencia y horarios aproximados para que encontrar un camión no dependa de preguntar en cada esquina.
                </p>
              </div>

              <dl className="grid grid-cols-3 border-y border-white/10 py-5 lg:grid-cols-1 lg:gap-4 lg:border-y-0 lg:border-l lg:py-0 lg:pl-8">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6f895a]">Recorridos</dt>
                  <dd className="mt-1 font-serif text-xl font-black">40 rutas</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6f895a]">Teleférico</dt>
                  <dd className="mt-1 font-serif text-xl font-black">6 estaciones</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6f895a]">Revisión</dt>
                  <dd className="mt-1 font-serif text-xl font-black">{DATA_LAST_UPDATED}</dd>
                </div>
              </dl>
            </div>
          </div>
        </header>

        <section className="px-5 py-16 sm:px-8 lg:py-24" aria-labelledby="metodologia-title">
          <div className="mx-auto max-w-[1240px]">
            <div className="grid gap-8 border-b border-white/10 pb-7 md:grid-cols-[1fr_440px] md:items-end">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#6f895a]">Metodología</p>
                <h2 id="metodologia-title" className="mt-3 font-serif text-4xl font-black sm:text-5xl">
                  Del recorrido real al mapa.
                </h2>
              </div>
              <p className="text-sm leading-7 text-[#8eaa76]">
                El objetivo no es acumular lugares, sino conservar referencias que ayuden a reconocer por dónde pasa una ruta y dónde conviene abordarla.
              </p>
            </div>

            <ol className="grid border-b border-white/10 md:grid-cols-2">
              {methodology.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li
                    key={step.number}
                    className={`border-b border-white/10 py-8 md:px-8 ${index % 2 === 0 ? "md:border-r md:pl-0" : "md:pr-0"} ${index > 1 ? "md:border-b-0" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-5">
                      <Icon className="h-6 w-6 text-[#b8e840]" strokeWidth={1.7} aria-hidden="true" />
                      <span className="font-serif text-3xl font-black text-[#789660]">{step.number}</span>
                    </div>
                    <h3 className="mt-8 font-serif text-2xl font-black">{step.title}</h3>
                    <p className="mt-3 max-w-xl text-sm leading-7 text-[#8eaa76]">{step.description}</p>
                  </li>
                );
              })}
            </ol>

            <p className="mt-5 text-xs leading-6 text-[#6f895a]">
              Fecha de datos de rutas: <time dateTime={DATA_LAST_UPDATED_ISO}>{DATA_LAST_UPDATED}</time>. Los puntos generados con OpenStreetMap conservan su atribución y se publican después de una revisión.
            </p>
          </div>
        </section>

        <section className="border-y border-white/10 bg-[#10160d] px-5 py-16 sm:px-8 lg:py-24" aria-labelledby="transparencia-title">
          <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[340px_1fr]">
            <div>
              <BadgeCheck className="h-8 w-8 text-[#b8e840]" strokeWidth={1.6} aria-hidden="true" />
              <h2 id="transparencia-title" className="mt-5 font-serif text-4xl font-black">Qué puedes esperar de los datos.</h2>
            </div>

            <div className="divide-y divide-white/10 border-y border-white/10">
              <div className="grid gap-3 py-6 sm:grid-cols-[190px_1fr]">
                <p className="text-sm font-black text-[#e8f2d8]">Útiles, no oficiales</p>
                <p className="text-sm leading-7 text-[#8eaa76]">Las rutas cambian por tráfico, obras o decisiones de los transportistas. UruGo orienta el viaje, pero no sustituye un aviso oficial.</p>
              </div>
              <div className="grid gap-3 py-6 sm:grid-cols-[190px_1fr]">
                <p className="text-sm font-black text-[#e8f2d8]">Sin vender ubicación</p>
                <p className="text-sm leading-7 text-[#8eaa76]">La ubicación se usa en el dispositivo para calcular rutas cercanas. No necesitas crear una cuenta para consultar el mapa.</p>
              </div>
              <div className="grid gap-3 py-6 sm:grid-cols-[190px_1fr]">
                <p className="text-sm font-black text-[#e8f2d8]">Código consultable</p>
                <p className="text-sm leading-7 text-[#8eaa76]">El repositorio del proyecto está disponible para revisar cómo funciona la aplicación y cómo se organizan sus datos.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-8 lg:py-24">
          <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#6f895a]">Responsable del proyecto</p>
              <h2 className="mt-3 font-serif text-4xl font-black sm:text-5xl">Hecho en Uruapan por {PROJECT.author}.</h2>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-[#8eaa76]">
                UruGo es un proyecto independiente mantenido con tiempo propio y apoyo de la comunidad. Las visitas y recomendaciones ayudan a que más personas encuentren el mapa; los reportes ayudan a mantenerlo correcto.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href={PROJECT.repositoryUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-md border border-white/15 px-5 text-sm font-black transition hover:border-[#b8e840]/50 hover:bg-white/[0.04]">
                  <FileCode2 className="h-4 w-4" aria-hidden="true" />
                  Ver repositorio
                </Link>
                <Link href={PROJECT.donationUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-md bg-[#6aab48] px-5 text-sm font-black text-[#0c110a] transition hover:bg-[#7cbd59]">
                  <Heart className="h-4 w-4" aria-hidden="true" />
                  Apoyar el proyecto
                </Link>
              </div>
            </div>

            <div className="border-l border-white/10 pl-6 sm:pl-8">
              <Database className="h-7 w-7 text-[#57d6e8]" strokeWidth={1.6} aria-hidden="true" />
              <p className="mt-5 font-serif text-2xl font-black">¿Encontraste un cambio?</p>
              <p className="mt-3 text-sm leading-7 text-[#8eaa76]">Indica la ruta, la calle o el horario. Un reporte concreto es la forma más rápida de mejorar el dato para todos.</p>
              <Link href="/reportar-error" className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#b8e840]">
                Reportar una corrección <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className="px-5 pb-16 sm:px-8 lg:pb-24">
          <div className="mx-auto max-w-[1240px]">
            <NotGovernmentNotice variant="full" />
          </div>
        </section>
      </article>

      <section className="bg-[#b8e840] px-5 py-12 text-[#0c110a] sm:px-8 lg:py-16">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#3d6828]">Consulta los datos</p>
            <h2 className="mt-2 font-serif text-4xl font-black">Encuentra tu ruta en el mapa.</h2>
          </div>
          <Link href="/mapa" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-[#0c110a] px-7 text-sm font-black text-[#e8f2d8]">
            <MapPinned className="h-4 w-4" aria-hidden="true" />
            Abrir UruGo
          </Link>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}

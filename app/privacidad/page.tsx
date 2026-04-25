import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import NotGovernmentNotice from "@/components/NotGovernmentNotice";
import { APP_BRAND } from "@/lib/mobility-config";

export const metadata: Metadata = {
  title: "Privacidad | VoyUruapan",
  description: "Aviso de privacidad de VoyUruapan sobre uso de ubicación, datos locales y soporte PWA."
};

const SECTIONS = [
  {
    title: "Uso de ubicación",
    body: `Si usas el botón de ubicación, el navegador solicita permiso para estimar tu posición. Esa ubicación se usa en tu dispositivo para encontrar rutas cercanas y no se almacena en una base de datos de ${APP_BRAND.name}.`
  },
  {
    title: "Datos offline",
    body: "Como PWA, la app puede guardar archivos de la aplicación y datos de rutas en el caché del navegador para mejorar velocidad y permitir uso parcial sin conexión."
  },
  {
    title: "Servicios de terceros",
    body: "El mapa usa Mapbox para mostrar cartografía. Los tiles del mapa pueden requerir conexión y están sujetos a las políticas del proveedor."
  },
  {
    title: "Información referencial",
    body: "Las rutas, tarifas y horarios se muestran como guía para usuarios. Pueden existir cambios operativos que todavía no estén reflejados en la app."
  }
] as const;

export default function PrivacyPage() {
  return (
    <main className="greca-bg greca-bg-animated min-h-dvh px-5 py-8 text-cream-100 sm:px-8 lg:px-10">
      <div className="relative z-10 mx-auto max-w-3xl">
        <PageHeader
          eyebrow="Privacidad"
          kicker="Sin trucos, sin letra chica"
          title={
            <>
              Aviso de <span className="italic text-terracota-400">privacidad</span>.
            </>
          }
          intro={`${APP_BRAND.name} es una PWA de consulta de rutas para Uruapan. No requiere cuenta, no solicita datos personales y no guarda tu ubicación en servidores propios.`}
        />

        <div className="mt-10">
          <NotGovernmentNotice variant="full" />
        </div>

        <section className="mt-10 space-y-6">
          {SECTIONS.map((s, i) => (
            <article
              key={s.title}
              className="rounded-2xl border border-cream-100/10 bg-ink-900/60 p-6 backdrop-blur"
            >
              <div className="flex items-baseline gap-3">
                <span className="font-serif-display text-xl font-black text-terracota-400">
                  0{i + 1}
                </span>
                <h2 className="font-serif-display text-xl font-black text-cream-50">
                  {s.title}
                </h2>
              </div>
              <p className="mt-3 text-sm leading-7 text-cream-100/75">{s.body}</p>
            </article>
          ))}
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/mapa"
            className="cta-shine inline-flex h-11 items-center rounded-full bg-terracota-400 px-5 text-sm font-black text-cream-50 hover:bg-terracota-500"
          >
            Volver al mapa →
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-full border border-cream-100/15 bg-cream-100/5 px-5 text-sm font-bold text-cream-50 hover:border-terracota-400/50"
          >
            Inicio
          </Link>
        </div>
      </div>
    </main>
  );
}

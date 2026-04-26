import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import NotGovernmentNotice from "@/components/NotGovernmentNotice";
import Logo from "@/components/Logo";
import ForceDark from "@/components/ForceDark";
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
      <div className="relative z-10 mx-auto max-w-3xl">
        <PageHeader
          eyebrow="Privacidad"
          kicker="Sin trucos, sin letra chica"
          title={
            <>
              Aviso de <span className="italic" style={{ color: "#b8e840" }}>privacidad</span>.
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
              className="rounded-2xl border p-6 backdrop-blur"
              style={{ borderColor: "rgba(140,200,80,0.1)", background: "rgba(20,28,16,0.6)" }}
            >
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-xl font-black" style={{ color: "#b8e840" }}>
                  0{i + 1}
                </span>
                <h2 className="font-serif text-xl font-black" style={{ color: "#e8f2d8" }}>
                  {s.title}
                </h2>
              </div>
              <p className="mt-3 text-sm leading-7" style={{ color: "rgba(232,242,216,0.65)" }}>{s.body}</p>
            </article>
          ))}
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/mapa"
            className="cta-shine inline-flex h-11 items-center rounded-full px-5 text-sm font-black transition hover:opacity-90"
            style={{ background: "#6aab48", color: "#e8f2d8" }}
          >
            Volver al mapa →
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-full border px-5 text-sm font-bold transition"
            style={{ borderColor: "rgba(140,200,80,0.15)", background: "rgba(106,171,72,0.06)", color: "#e8f2d8" }}
          >
            Inicio
          </Link>
        </div>
      </div>
      </div>
    </main>
  );
}

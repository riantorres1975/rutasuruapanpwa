import type { Metadata } from "next";
import Link from "next/link";
import ForceDark from "@/components/ForceDark";
import Logo from "@/components/Logo";
import NotGovernmentNotice from "@/components/NotGovernmentNotice";
import PageHeader from "@/components/PageHeader";
import ReportBugForm from "@/components/ReportBugForm";

export const metadata: Metadata = {
  title: "Reportar error | UruGo",
  description: "Reporta errores de rutas, mapa, ubicación o funcionamiento de UruGo."
};

const REPORT_TIPS = [
  "Nombre o número de la ruta afectada.",
  "Colonia, calle o punto de referencia donde ocurre el problema.",
  "Qué viste en la app y qué debería mostrarse.",
  "Captura de pantalla si el reporte en GitHub te permite adjuntarla."
] as const;

export default function ReportErrorPage() {
  return (
    <main style={{ background: "#0c110a", color: "#e8f2d8", minHeight: "100dvh" }}>
      <ForceDark />
      <nav
        className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-5 py-4"
        style={{
          background: "rgba(12,17,10,0.9)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(140,200,80,0.08)"
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

      <div className="greca-bg greca-bg-animated px-5 pb-10 pt-28 sm:px-8 lg:px-10">
        <div className="relative z-10 mx-auto max-w-5xl">
          <PageHeader
            eyebrow="Reportes"
            kicker="Ayuda a corregir el mapa"
            title={
              <>
                Reportar un <span className="italic" style={{ color: "#b8e840" }}>error</span>.
              </>
            }
            intro="Si una ruta no aparece, una calle está mal, una estación no coincide o algo falla en la app, envía un reporte para revisarlo."
          />

          <div className="mt-10 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <aside
              className="rounded-[2rem] border p-6 backdrop-blur-xl"
              style={{ borderColor: "rgba(140,200,80,0.14)", background: "rgba(20,28,16,0.62)" }}
            >
              <h2 className="font-serif text-2xl font-black" style={{ color: "#e8f2d8" }}>
                Qué incluir
              </h2>
              <ol className="mt-5 space-y-3">
                {REPORT_TIPS.map((tip, index) => (
                  <li key={tip} className="flex gap-3 text-sm leading-6" style={{ color: "rgba(232,242,216,0.68)" }}>
                    <span className="font-serif text-lg font-black" style={{ color: "#b8e840" }}>0{index + 1}</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-6">
                <NotGovernmentNotice variant="compact" />
              </div>
            </aside>

            <ReportBugForm />
          </div>
        </div>
      </div>
    </main>
  );
}

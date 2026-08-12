import type { Metadata } from "next";
import ForceDark from "@/components/ForceDark";
import NotGovernmentNotice from "@/components/NotGovernmentNotice";
import PageHeader from "@/components/PageHeader";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import ReportBugForm from "@/components/ReportBugForm";

export const metadata: Metadata = {
  title: "Reportar un error",
  description: "Reporta errores de rutas, mapa, ubicación o funcionamiento de UruGo.",
  alternates: {
    canonical: "https://www.urugo.app/reportar-error"
  },
  openGraph: {
    title: "Reportar error | UruGo",
    description: "Reporta errores de rutas, mapa, ubicación o funcionamiento de UruGo.",
    url: "https://www.urugo.app/reportar-error",
    type: "website"
  }
};

const REPORT_TIPS = [
  "Nombre o número de la ruta afectada.",
  "Colonia, calle o punto de referencia donde ocurre el problema.",
  "Qué viste en la app y qué debería mostrarse.",
  "Captura de pantalla si tu app de correo te permite adjuntarla."
] as const;

type ReportErrorPageProps = {
  searchParams: Promise<{ ruta?: string; referencia?: string }>;
};

export default async function ReportErrorPage({ searchParams }: ReportErrorPageProps) {
  const params = await searchParams;
  const initialRoute = params.ruta?.trim().slice(0, 100) ?? "";
  const initialLandmark = params.referencia?.trim().slice(0, 120) ?? "";
  return (
    <main style={{ background: "#0c110a", color: "#e8f2d8", minHeight: "100dvh" }}>
      <ForceDark />
      <PublicHeader />

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

            <ReportBugForm initialRoute={initialRoute} initialLandmark={initialLandmark} />
          </div>
        </div>
      </div>
      <PublicFooter />
    </main>
  );
}

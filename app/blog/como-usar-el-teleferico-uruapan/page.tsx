import type { Metadata } from "next";
import Link from "next/link";
import { FARES_2026, TELEFERICO_URUAPAN } from "@/lib/mobility-config";

export const metadata: Metadata = {
  title: "Cómo usar el Teleférico de Uruapan paso a paso",
  description:
    "Guía completa para usar el Teleférico de Uruapan: tarjeta de movilidad, tarifa por viaje, estaciones, horario y combinación con camiones urbanos.",
  alternates: {
    canonical: "/blog/como-usar-el-teleferico-uruapan"
  },
  openGraph: {
    title: "Cómo usar el Teleférico de Uruapan paso a paso",
    description: "Tarjeta de movilidad, tarifa, estaciones, horario y tips para combinar el Teleférico con camiones urbanos.",
    url: "/blog/como-usar-el-teleferico-uruapan",
    type: "article"
  }
};

const stationDescriptions = [
  "Principal acceso al Hospital General IMSS y Hospital Regional. Zona de alta demanda en horarios de mañana.",
  "Acceso noreste de la ciudad. Conexión hacia el Libramiento de Uruapan y zonas industriales.",
  "Centro cultural y comercial. Cerca del Centro Cultural Ágora de Uruapan y zona de servicios.",
  "Corazón administrativo de la ciudad. Frente a la Presidencia Municipal de Uruapan.",
  "Acceso al Parque Nacional Eduardo Ruiz y zona comercial del centro. La estación más transitada.",
  "Terminal poniente. Conexión con el mercado y colonias del lado oeste de la ciudad."
] as const;

export default function TelefericoBlogArticlePage() {
  return (
    <main className="min-h-dvh bg-[#080C18] px-5 py-8 text-slate-100 sm:px-8 lg:px-10">
      <article className="mx-auto max-w-3xl">
        <Link href="/blog" className="inline-flex items-center gap-2 rounded-2xl border border-[#00D4AA]/20 bg-[#0E1526] px-3.5 py-2 text-sm font-bold text-white">
          <span className="h-2.5 w-2.5 rounded-full bg-[#00D4AA]" />
          Blog
        </Link>

        <header className="mt-10">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#00D4AA]">Guía 2025</p>
          <h1 className="mt-3 font-display text-4xl font-black leading-tight tracking-tight text-white md:text-5xl">
            Cómo usar el Teleférico de Uruapan paso a paso
          </h1>
          <p className="mt-5 text-base leading-8 text-slate-300">
            Aprende cómo abordar, pagar y combinar el Teleférico de Uruapan con rutas de camión urbano desde VoyUruapan.
          </p>
        </header>

        <div className="mt-10 space-y-9">
          <section>
            <h2 className="font-display text-2xl font-black text-white">Qué es el teleférico</h2>
            <p className="mt-3 text-sm leading-8 text-slate-300">
              El Teleférico de Uruapan es un sistema de transporte urbano que conecta zonas clave de la ciudad mediante estaciones elevadas. En VoyUruapan aparece integrado con rutas de camión para planear viajes multimodales.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-black text-white">Cómo obtener la tarjeta de movilidad</h2>
            <p className="mt-3 text-sm leading-8 text-slate-300">
              Para usar el Teleférico necesitas una tarjeta electrónica de movilidad. En la app se muestra como referencia un costo de {FARES_2026.mobilityCard.price}. Conserva la tarjeta para recargarla y validar futuros accesos.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-black text-white">Cómo validar el acceso</h2>
            <p className="mt-3 text-sm leading-8 text-slate-300">
              Al entrar a la estación, acerca tu tarjeta al validador. Cada viaje cuesta {TELEFERICO_URUAPAN.fare}. Si también usas camión urbano, considera cada abordaje por separado al calcular tu presupuesto.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-black text-white">Las 6 estaciones</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {TELEFERICO_URUAPAN.stations.map((station, index) => (
                <article key={station} className="rounded-2xl border border-white/10 bg-[#0E1526]/80 p-4">
                  <p className="text-xs font-black text-[#00D4AA]">E{index + 1}</p>
                  <h3 className="mt-2 font-display text-lg font-black text-white">{station}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{stationDescriptions[index]}</p>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl font-black text-white">Horario</h2>
            <p className="mt-3 text-sm leading-8 text-slate-300">
              El horario configurado en VoyUruapan es de 5am a 11pm todos los días. Revisa avisos oficiales antes de viajar, especialmente en días festivos o por mantenimiento.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-black text-white">Tips para combinarlo con camión</h2>
            <p className="mt-3 text-sm leading-8 text-slate-300">
              Marca tu origen y destino en el mapa para ver si te conviene llegar a una estación caminando, en camión o con transbordo. El Teleférico puede ser útil para cruzar de oriente a poniente y después completar el trayecto en ruta urbana.
            </p>
          </section>
        </div>

        <Link href="/mapa" className="mt-10 inline-flex h-12 items-center rounded-full bg-[#00D4AA] px-6 text-sm font-black text-gray-950">
          Ver el mapa de rutas →
        </Link>
      </article>
    </main>
  );
}

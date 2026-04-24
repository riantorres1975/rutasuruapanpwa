import type { Metadata } from "next";
import Link from "next/link";
import { APP_BRAND } from "@/lib/mobility-config";

export const metadata: Metadata = {
  title: "Privacidad | VoyUruapan",
  description: "Aviso de privacidad de VoyUruapan sobre uso de ubicacion, datos locales y soporte PWA."
};

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-[#080C18] px-5 py-8 text-slate-100 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 rounded-2xl border border-[#00D4AA]/20 bg-[#0E1526] px-3.5 py-2 text-sm font-bold text-white">
          <span className="h-2.5 w-2.5 rounded-full bg-[#00D4AA]" />
          {APP_BRAND.name}
        </Link>

        <section className="mt-10 rounded-[2rem] border border-white/10 bg-[#0E1526]/80 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#00D4AA]">Privacidad</p>
          <h1 className="mt-3 font-display text-4xl font-black text-white">Aviso de privacidad</h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            {APP_BRAND.name} es una PWA de consulta de rutas de transporte para Uruapan. La app no requiere cuenta, no solicita datos personales y no guarda tu ubicacion en servidores propios.
          </p>

          <div className="mt-8 space-y-6">
            <article>
              <h2 className="font-display text-xl font-black text-white">Uso de ubicacion</h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Si usas el boton de ubicacion, el navegador solicita permiso para estimar tu posicion. Esa ubicacion se usa en tu dispositivo para encontrar rutas cercanas y no se almacena en una base de datos de {APP_BRAND.name}.
              </p>
            </article>

            <article>
              <h2 className="font-display text-xl font-black text-white">Datos offline</h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Como PWA, la app puede guardar archivos de la aplicacion y datos de rutas en cache del navegador para mejorar velocidad y permitir uso parcial sin conexion.
              </p>
            </article>

            <article>
              <h2 className="font-display text-xl font-black text-white">Servicios de terceros</h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                El mapa usa Mapbox para mostrar cartografia. Los tiles del mapa pueden requerir conexion y estan sujetos a las politicas del proveedor de mapas.
              </p>
            </article>

            <article>
              <h2 className="font-display text-xl font-black text-white">Informacion referencial</h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Las rutas, tarifas y horarios se muestran como guia para usuarios. Pueden existir cambios operativos que todavia no esten reflejados en la app.
              </p>
            </article>
          </div>

          <Link href="/mapa" className="mt-8 inline-flex h-11 items-center rounded-full bg-[#00D4AA] px-5 text-sm font-black text-gray-950">
            Volver al mapa
          </Link>
        </section>
      </div>
    </main>
  );
}

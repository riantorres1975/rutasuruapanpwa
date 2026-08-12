import Link from "next/link";
import Logo from "@/components/Logo";

export default function PublicFooter() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#090d08] px-5 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1fr_auto_auto] md:items-start">
        <div>
          <Logo size={24} showName href="/" />
          <p className="mt-3 max-w-sm text-sm leading-6 text-[#78965f]">
            Transporte público de Uruapan explicado con datos locales, mapas claros y herramientas gratuitas.
          </p>
        </div>
        <nav aria-label="Explorar" className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm font-semibold text-[#a8c888]">
          <Link href="/rutas">Rutas</Link>
          <Link href="/horarios">Horarios</Link>
          <Link href="/como-llegar">Cómo llegar</Link>
          <Link href="/teleferico-uruapan-horario">Teleférico</Link>
          <Link href="/guia">Guía</Link>
          <Link href="/blog">Guías locales</Link>
        </nav>
        <nav aria-label="Ayuda" className="flex flex-col gap-2 text-sm font-semibold text-[#78965f]">
          <Link href="/reportar-error">Reportar un error</Link>
          <Link href="/privacidad">Privacidad</Link>
          <span className="mt-2 text-xs font-normal">Proyecto independiente de Uruapan.</span>
        </nav>
      </div>
    </footer>
  );
}

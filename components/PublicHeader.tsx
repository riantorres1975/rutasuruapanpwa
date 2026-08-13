import Link from "next/link";
import Logo from "@/components/Logo";
import PublicMobileMenu from "@/components/PublicMobileMenu";

const links = [
  { href: "/rutas", label: "Rutas" },
  { href: "/horarios", label: "Horarios" },
  { href: "/como-llegar", label: "Cómo llegar" },
  { href: "/guia", label: "Guía" },
] as const;

type Props = {
  active?: "rutas" | "horarios" | "como-llegar" | "guia";
  mapHref?: string;
};

export default function PublicHeader({ active, mapHref = "/mapa" }: Props) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-[#0c110a]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        <Logo size={28} showName showSub />

        <nav aria-label="Navegación principal" className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const isActive = active === link.href.slice(1);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className="rounded-md px-3 py-2 text-sm font-semibold transition hover:bg-white/[0.05] hover:text-[#e8f2d8]"
                style={{ color: isActive ? "#b8e840" : "#a8c888" }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <PublicMobileMenu />

          <Link
            href={mapHref}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#6aab48] px-4 text-xs font-black text-[#0c110a] transition hover:bg-[#77bc52] sm:px-5 sm:text-sm"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="10" r="2.2" fill="currentColor" />
            </svg>
            Abrir mapa
          </Link>
        </div>
      </div>
    </header>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";

const links = [
  { href: "/rutas", label: "Rutas" },
  { href: "/horarios", label: "Horarios" },
  { href: "/como-llegar", label: "Cómo llegar" },
  { href: "/guia", label: "Guía" },
  { href: "/blog", label: "Guías locales" },
] as const;

export default function PublicMobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="grid h-10 w-10 place-items-center rounded-md border border-white/10 text-[#e8f2d8]"
        aria-label="Abrir navegación"
        aria-expanded={open}
        aria-controls="public-mobile-navigation"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {open ? (
        <nav
          id="public-mobile-navigation"
          aria-label="Navegación móvil"
          className="absolute right-0 top-12 w-52 overflow-hidden rounded-lg border border-white/10 bg-[#111a0d] p-1.5 shadow-2xl"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-3 text-sm font-semibold text-[#d2dfc4] transition hover:bg-white/[0.06]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

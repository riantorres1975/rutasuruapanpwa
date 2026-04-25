import Link from "next/link";
import { APP_BRAND } from "@/lib/mobility-config";

type Props = {
  /** Texto pequeño en cursiva (purépecha o categoría) */
  kicker?: string;
  /** Categoría / etiqueta uppercase chica */
  eyebrow?: string;
  /** H1 — soporta JSX para acentuar palabras */
  title: React.ReactNode;
  /** Párrafo de subtítulo */
  intro?: React.ReactNode;
  /** Ruta y label del back link (default: home) */
  backHref?: string;
  backLabel?: string;
};

export default function PageHeader({
  kicker,
  eyebrow,
  title,
  intro,
  backHref = "/",
  backLabel = APP_BRAND.name
}: Props) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-full border border-cream-100/15 bg-ink-900/70 px-3.5 py-2 text-sm font-bold text-cream-50 backdrop-blur-xl transition hover:border-terracota-400/50"
        >
          <span aria-hidden="true">←</span>
          <span className="h-2 w-2 rounded-full bg-terracota-400" />
          {backLabel}
        </Link>
        <Link
          href="/mapa"
          className="inline-flex h-9 items-center rounded-full border border-cream-100/15 bg-cream-100/5 px-4 text-xs font-semibold text-cream-50 transition hover:border-terracota-400/60 hover:text-terracota-400"
        >
          Abrir mapa →
        </Link>
      </div>

      {/* Banda de greca decorativa */}
      <div
        className="greca-band mt-8 h-3 max-w-[120px] opacity-60"
        aria-hidden="true"
      />

      <header className="mt-5 max-w-3xl">
        {kicker && <p className="text-purepecha text-sm">{kicker}</p>}
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-terracota-400">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-3 font-serif-display text-4xl font-black leading-[1.05] tracking-tight text-cream-50 md:text-5xl lg:text-6xl">
          {title}
        </h1>
        {intro && (
          <p className="mt-5 text-base leading-7 text-cream-100/75 md:text-lg">
            {intro}
          </p>
        )}
      </header>
    </div>
  );
}

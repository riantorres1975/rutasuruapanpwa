import Link from "next/link";

const AUTHOR_NAME = "José Antonio Rivera Torres";
const GITHUB_URL = "https://github.com/riantorres1975";
const X_URL = "https://x.com/rian_1975";
const LINKEDIN_URL = "https://www.linkedin.com/in/josé-antonio-rivera-torres-b44559244?utm_source=share_via&utm_content=profile&utm_medium=member_android";
const REPO_URL = "https://github.com/riantorres1975/rutasuruapanpwa";
const DONATION_URL = "https://example.com/tu-link-de-donacion";

const socialLinks = [
  {
    label: "GitHub",
    href: GITHUB_URL,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d="M12 .5A11.5 11.5 0 0 0 8.36 22.9c.58.1.79-.25.79-.56v-2.02c-3.22.7-3.9-1.38-3.9-1.38-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.7.08-.7 1.17.08 1.79 1.2 1.79 1.2 1.04 1.78 2.73 1.27 3.4.97.1-.75.4-1.27.74-1.56-2.57-.29-5.28-1.29-5.28-5.73 0-1.27.45-2.3 1.2-3.12-.12-.29-.52-1.47.11-3.07 0 0 .98-.31 3.2 1.2a11.1 11.1 0 0 1 5.82 0c2.22-1.51 3.2-1.2 3.2-1.2.63 1.6.23 2.78.11 3.07.75.82 1.2 1.85 1.2 3.12 0 4.46-2.72 5.43-5.3 5.72.42.36.8 1.08.8 2.18v3.23c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
      </svg>
    )
  },
  {
    label: "Twitter / X",
    href: X_URL,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d="M18.9 2h3.4l-7.5 8.56L23.6 22h-6.9l-5.4-7.06L5.1 22H1.7l8-9.15L1.2 2h7.1l4.88 6.45L18.9 2Zm-1.2 17.98h1.88L7.28 3.91H5.26l12.44 16.07Z" />
      </svg>
    )
  },
  {
    label: "LinkedIn",
    href: LINKEDIN_URL,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.61 0 4.27 2.37 4.27 5.46v6.28ZM5.32 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13Zm1.78 13.02H3.54V9H7.1v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
      </svg>
    )
  },
  {
    label: "Repositorio",
    href: REPO_URL,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
        <path d="M6 4h8l4 4v12H6V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 4v4h4M9 13h6M9 16h6M9 10h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
] as const;

const HeartIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M12 20.5S4.5 16.1 4.5 9.7A4.2 4.2 0 0 1 12 7.1a4.2 4.2 0 0 1 7.5 2.6c0 6.4-7.5 10.8-7.5 10.8Z"
      fill="currentColor"
      opacity="0.32"
    />
    <path
      d="M12 20.5S4.5 16.1 4.5 9.7A4.2 4.2 0 0 1 12 7.1a4.2 4.2 0 0 1 7.5 2.6c0 6.4-7.5 10.8-7.5 10.8Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function MadeByFooter() {
  return (
    <div className="mt-8">
      {/* ── Tarjeta de apoyo ── */}
      <div className="relative overflow-hidden rounded-[1.75rem] border border-terracota-400/30 bg-gradient-to-br from-terracota-400/[0.08] via-ink-900/70 to-avocado-700/[0.12] p-6 backdrop-blur-xl md:p-7">
        {/* Greca decorativa esquina */}
        <div
          className="greca-band absolute right-0 top-0 h-3 w-32 opacity-40"
          aria-hidden="true"
        />
        <div
          className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-terracota-400/15 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-8">
          <div className="flex items-start gap-4 md:items-center">
            <span
              aria-hidden="true"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-terracota-400/15 text-terracota-400"
            >
              <HeartIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="font-serif-display text-xl font-black text-cream-50 md:text-2xl">
                ¿Te ayuda <span className="italic text-terracota-400">VoyUruapan</span>?
              </p>
              <p className="mt-1 max-w-md text-sm leading-6 text-cream-100/70">
                Esta app es independiente y se mantiene con esfuerzo propio. Una propina ayuda a pagar el mapa, el dominio y mejoras futuras.
              </p>
            </div>
          </div>

          <Link
            href={DONATION_URL}
            target="_blank"
            rel="noreferrer"
            className="cta-shine group inline-flex h-12 items-center justify-center gap-2 self-start rounded-full bg-terracota-400 px-6 text-sm font-black text-cream-50 shadow-[0_14px_40px_rgba(232,93,47,0.35)] transition hover:bg-terracota-500 active:scale-[0.98] md:self-auto"
          >
            <HeartIcon className="h-4 w-4 transition group-hover:scale-110" />
            Invitar un café
          </Link>
        </div>
      </div>

      {/* ── Línea de autoría + socials ── */}
      <div className="mt-6 flex flex-col gap-4 border-t border-cream-100/10 pt-6 text-xs text-cream-100/55 sm:flex-row sm:items-center sm:justify-between">
        <p className="inline-flex flex-wrap items-center gap-1.5">
          <span>Hecho con</span>
          <span className="text-terracota-400 drop-shadow-[0_0_10px_rgba(232,93,47,0.4)]">
            <HeartIcon className="h-3.5 w-3.5" />
          </span>
          <span>en Uruapan por</span>
          <span className="font-serif-display font-bold text-cream-50">{AUTHOR_NAME}</span>
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {socialLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              aria-label={link.label}
              className="group inline-flex h-9 items-center gap-2 rounded-full border border-cream-100/10 bg-cream-100/5 px-3 text-cream-100/70 transition hover:border-terracota-400/50 hover:bg-terracota-400/10 hover:text-terracota-400"
            >
              {link.icon}
              <span className="text-xs font-semibold">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

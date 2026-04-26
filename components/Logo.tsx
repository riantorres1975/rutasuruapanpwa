import Link from "next/link";

interface LogoProps {
  size?: number;
  showName?: boolean;
  showSub?: boolean;
  href?: string;
}

export default function Logo({
  size = 28,
  showName = true,
  showSub = false,
  href = "/",
}: LogoProps) {
  const w = Math.round(size * 48 / 62);

  const icon = (
    <svg
      width={w}
      height={size}
      viewBox="0 0 48 62"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="logo-sk" cx="38%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#7aba54" />
          <stop offset="100%" stopColor="#3a6425" />
        </radialGradient>
        <radialGradient id="logo-pu" cx="42%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#518c3a" />
          <stop offset="100%" stopColor="#243d18" />
        </radialGradient>
        <filter id="logo-glow">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="logo-sh">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Cáscara exterior del aguacate (forma de pin) */}
      <path
        d="M24 2C14.5 2 6 10 6 20C6 31 24 60 24 60C24 60 42 31 42 20C42 10 33.5 2 24 2Z"
        fill="url(#logo-sk)"
        filter="url(#logo-sh)"
      />

      {/* Pulpa interior */}
      <path
        d="M24 7C16.5 7 10 13.5 10 20C10 30 24 54 24 54C24 54 38 30 38 20C38 13.5 31.5 7 24 7Z"
        fill="url(#logo-pu)"
      />

      {/* Highlight lateral sutil */}
      <path
        d="M14 10C11.5 13 10 16.5 10 20C10 24 11 29 13 34C11 28 10 23 11 18C12 14 13 11.5 14 10Z"
        fill="#fff"
        opacity="0.07"
      />

      {/* Cable del Teleférico — línea lima que cruza el pin de lado a lado */}
      <line x1="-2" y1="20" x2="50" y2="20"
        stroke="#b8e840" strokeWidth="2.2" strokeLinecap="round"
        filter="url(#logo-glow)"
      />

      {/* Postes del cable */}
      <line x1="8" y1="20" x2="8" y2="25" stroke="#b8e840" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <line x1="40" y1="20" x2="40" y2="25" stroke="#b8e840" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />

      {/* Góndola del Teleférico — cuerpo */}
      <rect x="15" y="20" width="18" height="11" rx="3" fill="#b8e840" />

      {/* Gancho que conecta góndola al cable */}
      <rect x="22.5" y="16.5" width="3" height="4.5" rx="1.2" fill="#b8e840" />

      {/* Ventanas de la góndola */}
      <rect x="17" y="22" width="4.5" height="3.5" rx="1" fill="#1c3612" opacity="0.45" />
      <rect x="24" y="22" width="4.5" height="3.5" rx="1" fill="#1c3612" opacity="0.45" />

      {/* Brillo inferior góndola */}
      <rect x="15" y="29.5" width="18" height="1.2" rx="0.6" fill="#fff" opacity="0.1" />
    </svg>
  );

  const content = (
    <span className="inline-flex items-center gap-2.5">
      {icon}
      {showName && (
        <span className="flex flex-col">
          <span
            style={{
              fontFamily: "var(--font-playfair), Georgia, serif",
              fontWeight: 900,
              fontSize: "1.05rem",
              letterSpacing: "-0.01em",
              lineHeight: 1,
              color: "var(--ov-text, #e8f2d8)",
            }}
          >
            VoyUruapan
          </span>
          {showSub && (
            <span
              style={{
                fontSize: "0.57rem",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#5a7848",
                marginTop: "2px",
              }}
            >
              Uruapan, Mich.
            </span>
          )}
        </span>
      )}
    </span>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
